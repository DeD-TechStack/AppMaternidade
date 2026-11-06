-- MAT-45, adendo R-B, R3 (DECISOES_BANCO_RB_20261105.md, linha 32), decisão do líder: não há exceção
-- que mantenha o catálogo antigo, que juntava no mesmo 42501 "sem permissao" o objeto inexistente, o
-- objeto sem visibilidade e o objeto visível sem o papel exigido. Agora, nas 6 funções que agem como
-- membro (R2): criar_convite, revogar_convite, mudar_papel, revogar_vinculo, sair_da_familia e
-- excluir_familia:
--   * id inexistente, ou objeto numa família em que o chamador não tem vínculo ativo (sem visibilidade,
--     inclusive vínculo revogado, que saiu ou vencido), responde P0002, igual ao inexistente:
--       familia inexistente (parâmetro é a família), convite inexistente (revogar_convite) ou
--       vinculo inexistente (mudar_papel e revogar_vinculo);
--   * objeto visível (vínculo ativo, qualquer papel) mas sem o papel exigido responde
--     42501 sem permissao;
--   * ordem em cada função: 1) parâmetro obrigatório; 2) conta (conta inexistente, P0001, inalterado);
--     3) existência e visibilidade (P0002); 4) papel de escrita (42501); 5) regras de valor.
-- A reconferência depois da trava (for update da família) segue a mesma separação: se depois da trava o
-- chamador já não tem vínculo ativo → P0002; se tem vínculo ativo mas não o papel → 42501.
-- sair_da_familia só exige vínculo ativo (qualquer papel), então nela só existe o P0002.
-- Não mudam: aceitar_convite e excluir_conta (regras próprias do R2; as travas do 45-M5 ficam em
-- 20261106097100), conta inexistente, grants, RLS, security definer e search_path.
--
-- Versão de partida de cada função: criar_convite e revogar_convite de 20261106090300; mudar_papel,
-- revogar_vinculo e sair_da_familia de 20261106090400; excluir_familia de 20261106090600. Nenhuma
-- migração 097* as substituía antes desta (a 097100 troca só excluir_conta e aceitar_convite).
--
-- Trava e rollback: create or replace function não trava tabela nem reescreve linha; a assinatura, o
-- tipo de retorno e os grants não mudam. Em uso, cada chamada segue travando as mesmas linhas, na mesma
-- ordem. Rollback: recriar as 6 funções com o texto das migrações de partida acima.

create or replace function public.criar_convite(
  familia uuid,
  papel public.papel_familia,
  vinculo_valido_ate timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_codigo text;
  v_id uuid;
  v_expira timestamptz := now() + interval '7 days';
  v_antes boolean;
begin
  if criar_convite.familia is null or criar_convite.papel is null then
    raise exception 'parametro obrigatorio';
  end if;

  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  -- Trava a família e só então confere o chamador (C3): visibilidade (P0002) e depois papel (42501).
  perform 1 from public.familias f where f.id = criar_convite.familia for update;
  if not found
    or not public.tem_vinculo_ativo(criar_convite.familia, enum_range(null::public.papel_familia))
  then
    raise exception 'familia inexistente' using errcode = 'P0002';
  end if;
  if not public.tem_vinculo_ativo(criar_convite.familia, array['responsavel']::public.papel_familia[]) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  -- Estado da família antes de escrever, para a conferência final da C3.
  select exists (
    select 1 from public.vinculos o
    where o.familia_id = criar_convite.familia
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) into v_antes;

  if criar_convite.papel = 'responsavel' and criar_convite.vinculo_valido_ate is not null then
    raise exception 'responsavel sem validade';
  end if;

  if criar_convite.vinculo_valido_ate is not null
    and criar_convite.vinculo_valido_ate <= now() + interval '7 days'
  then
    raise exception 'validade menor que o convite';
  end if;

  v_codigo := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.convites (familia_id, papel, vinculo_valido_ate, criado_por, codigo_hash, expira_em)
  values (
    criar_convite.familia, criar_convite.papel, criar_convite.vinculo_valido_ate, v_conta,
    encode(extensions.digest(v_codigo, 'sha256'), 'hex'), v_expira
  )
  returning id into v_id;

  -- Rede de proteção da C3: a família continua com pelo menos um responsável ativo.
  if v_antes and not exists (
    select 1 from public.vinculos o
    where o.familia_id = criar_convite.familia
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) then
    raise exception 'ultimo responsavel';
  end if;

  return jsonb_build_object(
    'id', v_id,
    'codigo', v_codigo,
    'expira_em', to_char(v_expira at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  );
exception
  when deadlock_detected then
    raise exception 'tente de novo';
  when unique_violation then
    raise exception 'tente de novo';
  when not_null_violation then
    raise exception 'parametro obrigatorio';
end;
$$;

revoke execute on function public.criar_convite(uuid, public.papel_familia, timestamptz) from public, anon;
grant execute on function public.criar_convite(uuid, public.papel_familia, timestamptz) to authenticated;

-- Revoga um convite pendente, vencido ou não.
create or replace function public.revogar_convite(convite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_familia uuid;
  v_estado public.estado_convite;
  v_antes boolean;
begin
  if revogar_convite.convite is null then
    raise exception 'parametro obrigatorio';
  end if;

  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  select c.familia_id into v_familia
    from public.convites c
   where c.id = revogar_convite.convite;
  if not found then
    raise exception 'convite inexistente' using errcode = 'P0002';
  end if;

  -- Trava a família e reconfere depois da trava: visibilidade (P0002) e depois papel (42501).
  perform 1 from public.familias f where f.id = v_familia for update;
  if not found
    or not public.tem_vinculo_ativo(v_familia, enum_range(null::public.papel_familia))
  then
    raise exception 'convite inexistente' using errcode = 'P0002';
  end if;
  if not public.tem_vinculo_ativo(v_familia, array['responsavel']::public.papel_familia[]) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  select c.estado into v_estado
    from public.convites c
   where c.id = revogar_convite.convite
   for update;
  if not found then
    raise exception 'convite inexistente' using errcode = 'P0002';
  end if;

  if v_estado <> 'pendente' then
    raise exception 'convite nao pendente';
  end if;

  -- Estado da família antes de escrever, para a conferência final da C3.
  select exists (
    select 1 from public.vinculos o
    where o.familia_id = v_familia
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) into v_antes;

  update public.convites set estado = 'revogado' where id = revogar_convite.convite;

  -- Rede de proteção da C3: a família continua com pelo menos um responsável ativo.
  if v_antes and not exists (
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

revoke execute on function public.revogar_convite(uuid) from public, anon;
grant execute on function public.revogar_convite(uuid) to authenticated;

create or replace function public.mudar_papel(vinculo uuid, novo_papel public.papel_familia)
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
    raise exception 'vinculo inexistente' using errcode = 'P0002';
  end if;

  -- Trava a família e reconfere depois da trava: visibilidade (P0002) e depois papel (42501).
  perform 1 from public.familias f where f.id = v_familia for update;
  if not found
    or not public.tem_vinculo_ativo(v_familia, enum_range(null::public.papel_familia))
  then
    raise exception 'vinculo inexistente' using errcode = 'P0002';
  end if;
  if not public.tem_vinculo_ativo(v_familia, array['responsavel']::public.papel_familia[]) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  select v.id, v.conta_id, v.papel, v.estado, v.valido_ate into v_alvo
    from public.vinculos v
   where v.id = mudar_papel.vinculo
   for update;
  if not found then
    raise exception 'vinculo inexistente' using errcode = 'P0002';
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

create or replace function public.revogar_vinculo(vinculo uuid)
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
    raise exception 'vinculo inexistente' using errcode = 'P0002';
  end if;

  -- Trava a família e reconfere depois da trava: visibilidade (P0002) e depois papel (42501).
  perform 1 from public.familias f where f.id = v_familia for update;
  if not found
    or not public.tem_vinculo_ativo(v_familia, enum_range(null::public.papel_familia))
  then
    raise exception 'vinculo inexistente' using errcode = 'P0002';
  end if;
  if not public.tem_vinculo_ativo(v_familia, array['responsavel']::public.papel_familia[]) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  select v.id, v.conta_id, v.papel, v.estado, v.valido_ate into v_alvo
    from public.vinculos v
   where v.id = revogar_vinculo.vinculo
   for update;
  if not found then
    raise exception 'vinculo inexistente' using errcode = 'P0002';
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

-- Saída de qualquer papel. Não apaga dado pessoal nem muda autoria (D18). Só exige vínculo ativo:
-- sem ele (inexistente, alheia, revogado, que saiu ou vencido) a família não existe para o chamador.
create or replace function public.sair_da_familia(familia uuid)
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
    raise exception 'familia inexistente' using errcode = 'P0002';
  end if;

  select v.id, v.papel, v.estado, v.valido_ate into v_meu
    from public.vinculos v
   where v.familia_id = sair_da_familia.familia and v.conta_id = v_conta
   for update;
  if not found
    or v_meu.estado <> 'ativo'
    or (v_meu.valido_ate is not null and v_meu.valido_ate <= now())
  then
    raise exception 'familia inexistente' using errcode = 'P0002';
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

-- Exclui a família (D10): qualquer responsável ativo. Bebês, vínculos e convites somem em cascata.
create or replace function public.excluir_familia(familia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
begin
  if excluir_familia.familia is null then
    raise exception 'parametro obrigatorio';
  end if;

  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  -- Trava a família e reconfere depois da trava: visibilidade (P0002) e depois papel (42501).
  perform 1 from public.familias f where f.id = excluir_familia.familia for update;
  if not found
    or not public.tem_vinculo_ativo(excluir_familia.familia, enum_range(null::public.papel_familia))
  then
    raise exception 'familia inexistente' using errcode = 'P0002';
  end if;
  if not public.tem_vinculo_ativo(excluir_familia.familia, array['responsavel']::public.papel_familia[]) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  delete from public.familias where id = excluir_familia.familia;
exception
  when deadlock_detected then
    raise exception 'tente de novo';
  when not_null_violation then
    raise exception 'parametro obrigatorio';
end;
$$;

revoke execute on function public.excluir_familia(uuid) from public, anon;
grant execute on function public.excluir_familia(uuid) to authenticated;
