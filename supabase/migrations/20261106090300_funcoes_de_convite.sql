-- MAT-45, migração 4: funções de convite (D1, D2, D4, D5, D12, D17, C3).
-- Todas security definer, com search_path vazio, e só auth.uid() como conta chamadora.
-- Erros do catálogo fechado: a mensagem é o texto exato, sem acento. As funções que escrevem
-- travam a família antes de qualquer conferência e conferem de novo depois da trava.
-- Data e hora no JSON: texto em UTC, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'.

-- Cria o convite e devolve o código em claro uma única vez; o banco guarda só o hash.
create function public.criar_convite(
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
begin
  if criar_convite.familia is null or criar_convite.papel is null then
    raise exception 'parametro obrigatorio';
  end if;

  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  -- Trava a família e só então confere o chamador (C3).
  perform 1 from public.familias f where f.id = criar_convite.familia for update;
  if not found
    or not public.tem_vinculo_ativo(criar_convite.familia, array['responsavel']::public.papel_familia[])
  then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

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

-- Prévia do convite, só com login (D12). Não trava nada, não muda nada e não confere "ja e membro".
create function public.ver_convite(codigo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_codigo text;
  v_conv record;
begin
  if ver_convite.codigo is null then
    raise exception 'parametro obrigatorio';
  end if;

  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  v_codigo := lower(btrim(ver_convite.codigo));
  if v_codigo !~ '^[0-9a-f]{64}$' then
    raise exception 'convite invalido';
  end if;

  select c.familia_id, c.papel, c.vinculo_valido_ate, c.expira_em, c.estado
    into v_conv
    from public.convites c
   where c.codigo_hash = encode(extensions.digest(v_codigo, 'sha256'), 'hex');
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

  return jsonb_build_object(
    'familia_nome', (select f.nome from public.familias f where f.id = v_conv.familia_id),
    'papel', v_conv.papel,
    'vinculo_valido_ate',
      to_char(v_conv.vinculo_valido_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'expira_em', to_char(v_conv.expira_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'bebes', (
      select coalesce(jsonb_agg(b.nome order by b.criado_em, b.id), '[]'::jsonb)
      from public.bebes b
      where b.familia_id = v_conv.familia_id and b.estado = 'ativo'
    )
  );
end;
$$;

revoke execute on function public.ver_convite(text) from public, anon;
grant execute on function public.ver_convite(text) to authenticated;

-- Aceita o convite e cria (ou reativa) o vínculo; devolve o id da família (D6).
create function public.aceitar_convite(codigo text)
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
begin
  if aceitar_convite.codigo is null then
    raise exception 'parametro obrigatorio';
  end if;

  if not exists (select 1 from public.contas c where c.id = v_conta) then
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

-- Revoga um convite pendente, vencido ou não.
create function public.revogar_convite(convite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_familia uuid;
  v_estado public.estado_convite;
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
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  perform 1 from public.familias f where f.id = v_familia for update;
  if not found
    or not public.tem_vinculo_ativo(v_familia, array['responsavel']::public.papel_familia[])
  then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  select c.estado into v_estado
    from public.convites c
   where c.id = revogar_convite.convite
   for update;
  if not found then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if v_estado <> 'pendente' then
    raise exception 'convite nao pendente';
  end if;

  update public.convites set estado = 'revogado' where id = revogar_convite.convite;
exception
  when deadlock_detected then
    raise exception 'tente de novo';
  when not_null_violation then
    raise exception 'parametro obrigatorio';
end;
$$;

revoke execute on function public.revogar_convite(uuid) from public, anon;
grant execute on function public.revogar_convite(uuid) to authenticated;
