-- MAT-45, adendo R-B, 45-M5: exclusão de conta contra aceite de convite simultâneo.
-- excluir_conta passa a travar primeiro a linha da própria conta (for update) e só depois as famílias,
-- em ordem crescente de id. aceitar_convite também trava primeiro a linha da conta do chamador. A
-- trava da conta conflita com o for key share que a chave estrangeira de vinculos.conta_id toma ao
-- inserir o vínculo: um aceite que chega durante a exclusão espera, e depois da exclusão encontra a
-- conta inexistente (conta inexistente), sem criar vínculo nem consumir o convite.
-- A ordem de erros do catálogo não muda: parametro obrigatorio vem antes de conta inexistente.
--
-- Ordem de travas nas duas funções: conta, família, convite. Um impasse com outra chamada da mesma conta
-- vira 40P01 → tente de novo (já convertido nas duas).
--
-- Trava e rollback: create or replace function não trava tabela. Em uso, cada chamada trava uma linha
-- de contas (row lock, solto no commit). Rollback: recriar as duas funções com o texto de
-- 20261106090600 (excluir_conta) e de 20261106090300 (aceitar_convite).

create or replace function public.excluir_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_fam uuid;
  v_novo uuid;
  v_com_responsavel uuid[];
begin
  -- 45-M5: a linha da própria conta é a primeira trava, antes de qualquer família.
  perform 1 from public.contas c where c.id = v_conta for update;
  if not found then
    raise exception 'conta inexistente';
  end if;

  -- Famílias da conta: vínculo em qualquer estado ou criada_por. Trava em ordem crescente de id.
  perform 1
    from public.familias f
   where f.id in (select v.familia_id from public.vinculos v where v.conta_id = v_conta)
      or f.criada_por = v_conta
   order by f.id
   for update;

  -- Caso 1 da D9, em todas as famílias antes de mudar qualquer coisa.
  if exists (
    select 1 from public.vinculos x
    where x.conta_id = v_conta
      and x.papel = 'responsavel'
      and x.estado = 'ativo'
      and (x.valido_ate is null or x.valido_ate > now())
      and not exists (
        select 1 from public.vinculos o
        where o.familia_id = x.familia_id
          and o.conta_id <> v_conta
          and o.papel = 'responsavel'
          and o.estado = 'ativo'
          and (o.valido_ate is null or o.valido_ate > now())
      )
  ) then
    raise exception 'ultimo responsavel';
  end if;

  -- Famílias que têm responsável ativo antes da operação, para a conferência final (C3).
  select coalesce(array_agg(f.id), '{}'::uuid[]) into v_com_responsavel
    from public.familias f
   where (f.id in (select v.familia_id from public.vinculos v where v.conta_id = v_conta)
          or f.criada_por = v_conta)
     and exists (
       select 1 from public.vinculos r
       where r.familia_id = f.id
         and r.papel = 'responsavel'
         and r.estado = 'ativo'
         and (r.valido_ate is null or r.valido_ate > now())
     );

  -- Casos 2 a 4 da D9: titularidade das famílias criadas pela conta.
  for v_fam in
    select f.id from public.familias f where f.criada_por = v_conta order by f.id
  loop
    select o.conta_id into v_novo
      from public.vinculos o
     where o.familia_id = v_fam
       and o.conta_id <> v_conta
       and o.papel = 'responsavel'
       and o.estado = 'ativo'
       and (o.valido_ate is null or o.valido_ate > now())
     order by o.criado_em, o.conta_id
     limit 1;

    if found then
      -- Caso 2: a titularidade passa ao responsável ativo mais antigo.
      update public.familias set criada_por = v_novo where id = v_fam;
    else
      select o.conta_id into v_novo
        from public.vinculos o
       where o.familia_id = v_fam
         and o.conta_id <> v_conta
         and o.estado = 'ativo'
         and (o.valido_ate is null or o.valido_ate > now())
       order by o.criado_em, o.conta_id
       limit 1;

      if found then
        -- Caso 3 (defesa): o membro ativo mais antigo assume e é promovido a responsável.
        update public.familias set criada_por = v_novo where id = v_fam;
        update public.vinculos
           set papel = 'responsavel', valido_ate = null, epoca = epoca + 1, concedido_por = null
         where familia_id = v_fam and conta_id = v_novo;
      else
        -- Caso 4 (defesa): família órfã; ninguém mais a alcança, então é apagada.
        delete from public.familias where id = v_fam;
      end if;
    end if;
  end loop;

  update public.convites
     set estado = 'revogado'
   where criado_por = v_conta and estado = 'pendente';

  delete from public.vinculos where conta_id = v_conta;

  if exists (
    select 1 from public.familias f
    where f.id = any (v_com_responsavel)
      and not exists (
        select 1 from public.vinculos r
        where r.familia_id = f.id
          and r.papel = 'responsavel'
          and r.estado = 'ativo'
          and (r.valido_ate is null or r.valido_ate > now())
      )
  ) then
    raise exception 'ultimo responsavel';
  end if;

  delete from auth.users where id = v_conta;
exception
  when deadlock_detected then
    raise exception 'tente de novo';
  when not_null_violation then
    raise exception 'parametro obrigatorio';
end;
$$;

revoke execute on function public.excluir_conta() from public, anon;
grant execute on function public.excluir_conta() to authenticated;

create or replace function public.aceitar_convite(codigo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_codigo text;
  v_hash text;
  v_convite_id uuid;
  v_familia uuid;
  v_conv record;
  v_vinc record;
  v_etapa text := 'vinculo';
  v_antes boolean;
begin
  if aceitar_convite.codigo is null then
    raise exception 'parametro obrigatorio';
  end if;

  -- 45-M5: a linha da conta do chamador é a primeira trava. Se a conta foi excluída antes deste
  -- aceite, ela não existe mais e o aceite para aqui, sem tocar em convite nem em vínculo.
  perform 1 from public.contas c where c.id = v_conta for update;
  if not found then
    raise exception 'conta inexistente';
  end if;

  v_codigo := lower(btrim(aceitar_convite.codigo));
  if v_codigo !~ '^[0-9a-f]{64}$' then
    raise exception 'convite invalido';
  end if;
  v_hash := encode(extensions.digest(v_codigo, 'sha256'), 'hex');

  -- Acha o convite sem trava só para saber a família; depois trava família e convite, nessa ordem.
  select c.id, c.familia_id into v_convite_id, v_familia
    from public.convites c
   where c.codigo_hash = v_hash;
  if not found then
    raise exception 'convite invalido';
  end if;

  perform 1 from public.familias f where f.id = v_familia for update;
  if not found then
    raise exception 'convite invalido';
  end if;

  select c.id, c.papel, c.vinculo_valido_ate, c.criado_por, c.expira_em, c.estado
    into v_conv
    from public.convites c
   where c.id = v_convite_id
   for update;
  if not found then
    raise exception 'convite invalido';
  end if;

  if v_conv.estado = 'revogado' then
    raise exception 'convite revogado';
  end if;
  if v_conv.estado = 'aceito' then
    raise exception 'convite usado';
  end if;
  if v_conv.expira_em <= now()
    or (v_conv.vinculo_valido_ate is not null and v_conv.vinculo_valido_ate <= now())
  then
    raise exception 'convite vencido';
  end if;

  -- Estado da família antes de escrever, para a conferência final da C3. Se não havia responsável
  -- ativo antes (estado de defesa), a regra não se aplica.
  select exists (
    select 1 from public.vinculos o
    where o.familia_id = v_familia
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) into v_antes;

  select v.id, v.estado, v.valido_ate into v_vinc
    from public.vinculos v
   where v.familia_id = v_familia and v.conta_id = v_conta;

  if found and v_vinc.estado = 'ativo' and (v_vinc.valido_ate is null or v_vinc.valido_ate > now()) then
    raise exception 'ja e membro';
  end if;

  if found then
    -- Reingresso: a mesma linha volta a valer, a época sobe e a antiguidade recomeça (D6).
    update public.vinculos
       set estado = 'ativo',
           papel = v_conv.papel,
           valido_ate = v_conv.vinculo_valido_ate,
           concedido_por = v_conv.criado_por,
           encerrado_em = null,
           criado_em = now(),
           epoca = epoca + 1
     where id = v_vinc.id;
  else
    insert into public.vinculos (familia_id, conta_id, papel, estado, valido_ate, epoca, concedido_por)
    values (v_familia, v_conta, v_conv.papel, 'ativo', v_conv.vinculo_valido_ate, 1, v_conv.criado_por);
  end if;

  v_etapa := 'convite';
  update public.convites
     set estado = 'aceito', aceito_por = v_conta, aceito_em = now()
   where id = v_conv.id;

  -- Rede de proteção da C3: se a família tinha responsável ativo antes, continua com pelo menos um.
  if v_antes and not exists (
    select 1 from public.vinculos o
    where o.familia_id = v_familia
      and o.papel = 'responsavel'
      and o.estado = 'ativo'
      and (o.valido_ate is null or o.valido_ate > now())
  ) then
    raise exception 'ultimo responsavel';
  end if;

  return v_familia;
exception
  when deadlock_detected then
    raise exception 'tente de novo';
  when unique_violation then
    if v_etapa = 'convite' then
      raise exception 'convite usado';
    end if;
    raise exception 'ja e membro';
  when not_null_violation then
    raise exception 'parametro obrigatorio';
end;
$$;

revoke execute on function public.aceitar_convite(text) from public, anon;
grant execute on function public.aceitar_convite(text) to authenticated;
