-- MAT-45, migração 7: exportação dos dados da conta e exclusão de conta e de família (D8 a D10, C1, C2).
-- Data e hora no JSON: texto em UTC, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'. Data: 'YYYY-MM-DD'.

-- A conta recebe a própria conta e os próprios vínculos; a família completa (membros, bebês,
-- convites) sai só das famílias onde ela é responsável ativa. Nunca devolve codigo_hash.
create function public.exportar_dados()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
begin
  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  return jsonb_build_object(
    'formato', 'appmaternidade-exportacao-v1',
    'gerado_em', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'conta', (
      select jsonb_build_object(
        'id', c.id,
        'email', u.email,
        'nome_privado', c.nome_privado,
        'fuso', c.fuso,
        'criada_em', to_char(c.criada_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
      )
      from public.contas c
      left join auth.users u on u.id = c.id
      where c.id = v_conta
    ),
    'vinculos', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'familia_id', v.familia_id,
          'papel', v.papel,
          'estado', v.estado,
          'valido_ate', to_char(v.valido_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'epoca', v.epoca,
          'criado_em', to_char(v.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'encerrado_em', to_char(v.encerrado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
        ) order by v.criado_em, v.id
      ), '[]'::jsonb)
      from public.vinculos v
      where v.conta_id = v_conta
    ),
    'familias', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'nome', f.nome,
          'fuso', f.fuso,
          'criada_em', to_char(f.criada_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'membros', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'conta_id', m.conta_id,
                'nome_privado', mc.nome_privado,
                'papel', m.papel,
                'valido_ate', to_char(m.valido_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
              ) order by m.criado_em, m.conta_id
            ), '[]'::jsonb)
            from public.vinculos m
            join public.contas mc on mc.id = m.conta_id
            where m.familia_id = f.id
              and m.estado = 'ativo'
              and (m.valido_ate is null or m.valido_ate > now())
          ),
          'bebes', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', b.id,
                'nome', b.nome,
                'nascimento', to_char(b.nascimento, 'YYYY-MM-DD'),
                'estado', b.estado,
                'criado_em', to_char(b.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
              ) order by b.criado_em, b.id
            ), '[]'::jsonb)
            from public.bebes b
            where b.familia_id = f.id
          ),
          'convites', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', cv.id,
                'papel', cv.papel,
                'estado', cv.estado,
                'vinculo_valido_ate',
                  to_char(cv.vinculo_valido_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'expira_em', to_char(cv.expira_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'criado_em', to_char(cv.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'aceito_em', to_char(cv.aceito_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
              ) order by cv.criado_em, cv.id
            ), '[]'::jsonb)
            from public.convites cv
            where cv.familia_id = f.id
          )
        ) order by f.criada_em, f.id
      ), '[]'::jsonb)
      from public.familias f
      where exists (
        select 1 from public.vinculos r
        where r.familia_id = f.id
          and r.conta_id = v_conta
          and r.papel = 'responsavel'
          and r.estado = 'ativo'
          and (r.valido_ate is null or r.valido_ate > now())
      )
    )
  );
end;
$$;

revoke execute on function public.exportar_dados() from public, anon;
grant execute on function public.exportar_dados() to authenticated;

-- Exclusão imediata da conta (D9). Trava as famílias da conta em ordem crescente de id,
-- recusa tudo se a conta é a única responsável ativa de alguma delas, repassa a titularidade
-- e só então apaga vínculos e a linha de auth.users (a de contas some em cascata).
create function public.excluir_conta()
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
  if not exists (select 1 from public.contas c where c.id = v_conta) then
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

-- Exclui a família (D10): qualquer responsável ativo. Bebês, vínculos e convites somem em cascata.
create function public.excluir_familia(familia uuid)
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

  perform 1 from public.familias f where f.id = excluir_familia.familia for update;
  if not found
    or not public.tem_vinculo_ativo(excluir_familia.familia, array['responsavel']::public.papel_familia[])
  then
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
