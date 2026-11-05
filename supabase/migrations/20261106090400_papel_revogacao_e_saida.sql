-- MAT-45, migração 5: troca de papel, revogação e saída (D4, D5, D18, C2, C3).
-- Nas três funções a família é travada primeiro; o chamador e o alvo são conferidos depois da
-- trava. A época sobe 1 a cada mudança. Uma chamada que falha desfaz tudo e não muda nada.

create function public.mudar_papel(vinculo uuid, novo_papel public.papel_familia)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_familia uuid;
  v_alvo record;
begin
  if mudar_papel.vinculo is null or mudar_papel.novo_papel is null then
    raise exception 'parametro obrigatorio';
  end if;

  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  select v.familia_id into v_familia
    from public.vinculos v
   where v.id = mudar_papel.vinculo;
  if not found then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  perform 1 from public.familias f where f.id = v_familia for update;
  if not found
    or not public.tem_vinculo_ativo(v_familia, array['responsavel']::public.papel_familia[])
  then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  select v.id, v.conta_id, v.papel, v.estado, v.valido_ate into v_alvo
    from public.vinculos v
   where v.id = mudar_papel.vinculo
   for update;
  if not found then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if v_alvo.estado <> 'ativo' or (v_alvo.valido_ate is not null and v_alvo.valido_ate <= now()) then
    raise exception 'vinculo inativo';
  end if;

  if v_alvo.papel = mudar_papel.novo_papel then
    raise exception 'papel igual';
  end if;

  -- Rebaixar o único responsável ativo (inclusive a si mesmo) deixaria a família sem responsável.
  if v_alvo.papel = 'responsavel' and not exists (
    select 1 from public.vinculos o
    where o.familia_id = v_familia
      and o.id <> v_alvo.id
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) then
    raise exception 'ultimo responsavel';
  end if;

  update public.vinculos
     set papel = mudar_papel.novo_papel,
         epoca = epoca + 1,
         concedido_por = v_conta,
         valido_ate = case when mudar_papel.novo_papel = 'responsavel' then null else valido_ate end
   where id = v_alvo.id;

  -- Quem deixa de ser responsável perde os convites pendentes que criou nessa família (D5).
  if v_alvo.papel = 'responsavel' then
    update public.convites
       set estado = 'revogado'
     where familia_id = v_familia and criado_por = v_alvo.conta_id and estado = 'pendente';
  end if;

  -- Rede de proteção da C3: a família continua com pelo menos um responsável ativo.
  if not exists (
    select 1 from public.vinculos o
    where o.familia_id = v_familia
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) then
    raise exception 'ultimo responsavel';
  end if;
exception
  when deadlock_detected then
    raise exception 'tente de novo';
  when not_null_violation then
    raise exception 'parametro obrigatorio';
end;
$$;

revoke execute on function public.mudar_papel(uuid, public.papel_familia) from public, anon;
grant execute on function public.mudar_papel(uuid, public.papel_familia) to authenticated;

create function public.revogar_vinculo(vinculo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_familia uuid;
  v_alvo record;
begin
  if revogar_vinculo.vinculo is null then
    raise exception 'parametro obrigatorio';
  end if;

  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  select v.familia_id into v_familia
    from public.vinculos v
   where v.id = revogar_vinculo.vinculo;
  if not found then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  perform 1 from public.familias f where f.id = v_familia for update;
  if not found
    or not public.tem_vinculo_ativo(v_familia, array['responsavel']::public.papel_familia[])
  then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  select v.id, v.conta_id, v.papel, v.estado, v.valido_ate into v_alvo
    from public.vinculos v
   where v.id = revogar_vinculo.vinculo
   for update;
  if not found then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if v_alvo.conta_id = v_conta then
    raise exception 'use sair da familia';
  end if;

  if v_alvo.estado <> 'ativo' or (v_alvo.valido_ate is not null and v_alvo.valido_ate <= now()) then
    raise exception 'vinculo inativo';
  end if;

  update public.vinculos
     set estado = 'revogado', encerrado_em = now(), epoca = epoca + 1
   where id = v_alvo.id;

  if v_alvo.papel = 'responsavel' then
    update public.convites
       set estado = 'revogado'
     where familia_id = v_familia and criado_por = v_alvo.conta_id and estado = 'pendente';
  end if;

  if not exists (
    select 1 from public.vinculos o
    where o.familia_id = v_familia
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) then
    raise exception 'ultimo responsavel';
  end if;
exception
  when deadlock_detected then
    raise exception 'tente de novo';
  when not_null_violation then
    raise exception 'parametro obrigatorio';
end;
$$;

revoke execute on function public.revogar_vinculo(uuid) from public, anon;
grant execute on function public.revogar_vinculo(uuid) to authenticated;

-- Saída de qualquer papel. Não apaga dado pessoal nem muda autoria (D18).
create function public.sair_da_familia(familia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_meu record;
  v_antes boolean;
begin
  if sair_da_familia.familia is null then
    raise exception 'parametro obrigatorio';
  end if;

  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  perform 1 from public.familias f where f.id = sair_da_familia.familia for update;
  if not found then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  select v.id, v.papel, v.estado, v.valido_ate into v_meu
    from public.vinculos v
   where v.familia_id = sair_da_familia.familia and v.conta_id = v_conta
   for update;
  if not found
    or v_meu.estado <> 'ativo'
    or (v_meu.valido_ate is not null and v_meu.valido_ate <= now())
  then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.vinculos o
    where o.familia_id = sair_da_familia.familia
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) into v_antes;

  if v_meu.papel = 'responsavel' and not exists (
    select 1 from public.vinculos o
    where o.familia_id = sair_da_familia.familia
      and o.id <> v_meu.id
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) then
    raise exception 'ultimo responsavel';
  end if;

  update public.vinculos
     set estado = 'saiu', encerrado_em = now(), epoca = epoca + 1
   where id = v_meu.id;

  update public.convites
     set estado = 'revogado'
   where familia_id = sair_da_familia.familia and criado_por = v_conta and estado = 'pendente';

  if v_antes and not exists (
    select 1 from public.vinculos o
    where o.familia_id = sair_da_familia.familia
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) then
    raise exception 'ultimo responsavel';
  end if;
exception
  when deadlock_detected then
    raise exception 'tente de novo';
  when not_null_violation then
    raise exception 'parametro obrigatorio';
end;
$$;

revoke execute on function public.sair_da_familia(uuid) from public, anon;
grant execute on function public.sair_da_familia(uuid) to authenticated;
