-- MAT-47: funções de ação da comunidade e da moderação.
-- Todas são security definer, com search_path vazio, e usam só auth.uid() como conta chamadora.
-- Cada função trava a linha que confere (select ... for update) antes de olhar o estado dela.
-- Erros: SQLSTATE e mensagem exatos do catálogo da tarefa (sem acento, D22).

-- Grava o aceite da versão vigente dos termos. Repetir a chamada não duplica nem dá erro.
create function public.aceitar_termos(p_versao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := (select auth.uid());
  v_vigente text;
begin
  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception using errcode = 'P0001', message = 'sem conta';
  end if;

  if p_versao is null then
    raise exception using errcode = 'P0001', message = 'parametro obrigatorio';
  end if;

  select v.versao into v_vigente
  from public.versoes_termos v
  where v.vigente
  for share;

  if v_vigente is null then
    raise exception using errcode = 'P0001', message = 'termos indisponiveis';
  end if;

  if p_versao <> v_vigente then
    raise exception using errcode = 'P0001', message = 'versao nao vigente';
  end if;

  insert into public.aceites_termos (conta_id, versao)
  values (v_conta, p_versao)
  on conflict do nothing;
end;
$$;

-- Abre uma denúncia contra um tópico, uma resposta ou um perfil. Bloqueio e autoria não impedem (D16).
create function public.denunciar(
  p_motivo public.motivo_denuncia,
  p_topico_id uuid default null,
  p_resposta_id uuid default null,
  p_perfil_id uuid default null,
  p_texto text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := (select auth.uid());
  v_id uuid;
begin
  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception using errcode = 'P0001', message = 'sem conta';
  end if;

  if not exists (select 1 from public.versoes_termos v where v.vigente) then
    raise exception using errcode = 'P0001', message = 'termos indisponiveis';
  end if;

  if not public.aceite_vigente() then
    raise exception using errcode = 'P0001', message = 'sem aceite';
  end if;

  if public.meu_perfil_id() is null then
    raise exception using errcode = 'P0001', message = 'sem perfil';
  end if;

  if p_motivo is null then
    raise exception using errcode = 'P0001', message = 'parametro obrigatorio';
  end if;

  if num_nonnulls(p_topico_id, p_resposta_id, p_perfil_id) <> 1 then
    raise exception using errcode = '23514', message = 'alvo invalido';
  end if;

  if p_topico_id is not null then
    perform 1
    from public.topicos t
    where t.id = p_topico_id
      and t.estado = 'visivel'
    for update;
  elsif p_resposta_id is not null then
    perform 1
    from public.respostas r
    join public.topicos t on t.id = r.topico_id
    where r.id = p_resposta_id
      and r.estado = 'visivel'
      and t.estado = 'visivel'
    for update of r
    for share of t;
  else
    perform 1
    from public.perfis_publicos pp
    where pp.id = p_perfil_id
    for share;
  end if;

  if not found then
    raise exception using errcode = 'P0002', message = 'alvo inexistente';
  end if;

  insert into public.denuncias (denunciante_id, topico_id, resposta_id, perfil_id, motivo, texto)
  values (v_conta, p_topico_id, p_resposta_id, p_perfil_id, p_motivo, p_texto)
  returning id into v_id;

  return v_id;
end;
$$;

-- As denúncias da conta chamadora, sem denunciante_id nem decidida_por (D17).
create function public.minhas_denuncias()
returns table (
  id uuid,
  topico_id uuid,
  resposta_id uuid,
  perfil_id uuid,
  motivo public.motivo_denuncia,
  texto text,
  estado public.estado_denuncia,
  criada_em timestamptz,
  decidida_em timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.topico_id, d.resposta_id, d.perfil_id, d.motivo, d.texto, d.estado,
         d.criada_em, d.decidida_em
  from public.denuncias d
  where d.denunciante_id = (select auth.uid())
  order by d.criada_em desc, d.id;
$$;

-- Muda o estado de um tópico ou de uma resposta e grava a auditoria. Não muda o estado da denúncia.
create function public.moderar_conteudo(
  p_alvo_tipo public.alvo_conteudo,
  p_alvo_id uuid,
  p_novo_estado public.estado_moderacao,
  p_motivo text,
  p_denuncia_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := (select auth.uid());
  v_proprio uuid;
  v_estado public.estado_moderacao;
  v_autor uuid;
  v_conteudo text;
  v_den public.denuncias%rowtype;
  v_acao public.acao_moderacao;
  v_id uuid;
begin
  if not public.tem_papel_plataforma(array['moderador', 'admin']::public.papel_plataforma[]) then
    raise exception using errcode = '42501', message = 'sem papel de plataforma';
  end if;

  if p_alvo_tipo is null or p_alvo_id is null or p_novo_estado is null then
    raise exception using errcode = 'P0001', message = 'parametro obrigatorio';
  end if;

  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception using errcode = 'P0001', message = 'motivo vazio';
  end if;

  if p_alvo_tipo = 'topico' then
    select t.estado, t.autor_id, t.titulo || E'\n\n' || t.corpo
      into v_estado, v_autor, v_conteudo
    from public.topicos t
    where t.id = p_alvo_id
    for update;
  else
    select r.estado, r.autor_id, r.corpo
      into v_estado, v_autor, v_conteudo
    from public.respostas r
    where r.id = p_alvo_id
    for update;
  end if;

  if not found then
    raise exception using errcode = 'P0002', message = 'alvo inexistente';
  end if;

  if p_denuncia_id is not null then
    select * into v_den
    from public.denuncias d
    where d.id = p_denuncia_id
    for share;

    if not found then
      raise exception using errcode = 'P0002', message = 'denuncia inexistente';
    end if;

    if (p_alvo_tipo = 'topico' and v_den.topico_id is distinct from p_alvo_id)
       or (p_alvo_tipo = 'resposta' and v_den.resposta_id is distinct from p_alvo_id) then
      raise exception using errcode = 'P0001', message = 'denuncia de outro alvo';
    end if;
  end if;

  v_proprio := public.meu_perfil_id();

  if (v_autor is not null and v_autor = v_proprio)
     or (p_denuncia_id is not null and v_den.denunciante_id = v_conta) then
    raise exception using errcode = 'P0001', message = 'conflito de interesse';
  end if;

  if v_estado = p_novo_estado then
    raise exception using errcode = 'P0001', message = 'estado igual';
  end if;

  if p_alvo_tipo = 'topico' then
    update public.topicos
    set estado = p_novo_estado,
        motivo_moderacao = case when p_novo_estado = 'visivel' then null else p_motivo end
    where id = p_alvo_id;
  else
    update public.respostas
    set estado = p_novo_estado,
        motivo_moderacao = case when p_novo_estado = 'visivel' then null else p_motivo end
    where id = p_alvo_id;
  end if;

  v_acao := case p_novo_estado
    when 'oculto' then 'ocultar'::public.acao_moderacao
    when 'removido' then 'remover'::public.acao_moderacao
    else 'restaurar'::public.acao_moderacao
  end;

  insert into public.auditoria_moderacao (
    ator_id, acao, alvo_tipo, alvo_id, estado_anterior, estado_novo, motivo, denuncia_id, conteudo
  )
  values (
    v_conta, v_acao, p_alvo_tipo::text::public.alvo_auditoria, p_alvo_id,
    v_estado::text, p_novo_estado::text, p_motivo, p_denuncia_id, v_conteudo
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Decide uma denúncia. Só a decisão final grava decidida_por e decidida_em.
create function public.decidir_denuncia(
  p_denuncia_id uuid,
  p_decisao public.estado_denuncia,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := (select auth.uid());
  v_proprio uuid;
  v_den public.denuncias%rowtype;
  v_id uuid;
begin
  if not public.tem_papel_plataforma(array['moderador', 'admin']::public.papel_plataforma[]) then
    raise exception using errcode = '42501', message = 'sem papel de plataforma';
  end if;

  if p_denuncia_id is null or p_decisao is null then
    raise exception using errcode = 'P0001', message = 'parametro obrigatorio';
  end if;

  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception using errcode = 'P0001', message = 'motivo vazio';
  end if;

  select * into v_den
  from public.denuncias d
  where d.id = p_denuncia_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'denuncia inexistente';
  end if;

  if p_decisao = 'aberta' then
    raise exception using errcode = 'P0001', message = 'decisao invalida';
  end if;

  v_proprio := public.meu_perfil_id();

  if v_den.denunciante_id = v_conta
     or (
       v_proprio is not null
       and (
         v_den.perfil_id = v_proprio
         or exists (
           select 1 from public.topicos t
           where t.id = v_den.topico_id and t.autor_id = v_proprio
         )
         or exists (
           select 1 from public.respostas r
           where r.id = v_den.resposta_id and r.autor_id = v_proprio
         )
       )
     ) then
    raise exception using errcode = 'P0001', message = 'conflito de interesse';
  end if;

  if v_den.estado in ('procedente', 'improcedente') then
    raise exception using errcode = 'P0001', message = 'denuncia ja decidida';
  end if;

  if v_den.estado = p_decisao then
    raise exception using errcode = 'P0001', message = 'estado igual';
  end if;

  update public.denuncias
  set estado = p_decisao,
      decidida_por = case when p_decisao in ('procedente', 'improcedente') then v_conta end,
      decidida_em = case when p_decisao in ('procedente', 'improcedente') then now() end
  where id = p_denuncia_id;

  insert into public.auditoria_moderacao (
    ator_id, acao, alvo_tipo, alvo_id, estado_anterior, estado_novo, motivo, denuncia_id
  )
  values (
    v_conta, 'decidir_denuncia', 'denuncia', p_denuncia_id,
    v_den.estado::text, p_decisao::text, p_motivo, p_denuncia_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Concede um papel de plataforma, ou renova se a conta já o tem (D19). Só o admin concede.
create function public.conceder_papel_plataforma(
  p_conta uuid,
  p_papel public.papel_plataforma,
  p_motivo text,
  p_valido_ate timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := (select auth.uid());
  v_nova boolean;
  v_id uuid;
begin
  if not public.tem_papel_plataforma(array['admin']::public.papel_plataforma[]) then
    raise exception using errcode = '42501', message = 'sem papel de plataforma';
  end if;

  if p_conta is null or p_papel is null then
    raise exception using errcode = 'P0001', message = 'parametro obrigatorio';
  end if;

  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception using errcode = 'P0001', message = 'motivo vazio';
  end if;

  if p_valido_ate is not null and p_valido_ate <= now() then
    raise exception using errcode = 'P0001', message = 'validade no passado';
  end if;

  if not exists (select 1 from public.contas c where c.id = p_conta) then
    raise exception using errcode = 'P0002', message = 'conta inexistente';
  end if;

  insert into public.papeis_plataforma (conta_id, papel, concedido_por, valido_ate)
  values (p_conta, p_papel, v_conta, p_valido_ate)
  on conflict (conta_id, papel) do update
    set valido_ate = excluded.valido_ate,
        concedido_por = excluded.concedido_por,
        concedido_em = now()
  returning (xmax = 0) into v_nova;

  insert into public.auditoria_moderacao (
    ator_id, acao, alvo_tipo, alvo_id, estado_anterior, estado_novo, motivo, valido_ate
  )
  values (
    v_conta, 'conceder_papel', 'papel_plataforma', p_conta,
    case when v_nova then null else p_papel::text end, p_papel::text, p_motivo, p_valido_ate
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Revoga um papel de plataforma. Nunca deixa o sistema sem admin vigente. Só o admin revoga.
create function public.revogar_papel_plataforma(
  p_conta uuid,
  p_papel public.papel_plataforma,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := (select auth.uid());
  v_vigente boolean;
  v_id uuid;
begin
  if not public.tem_papel_plataforma(array['admin']::public.papel_plataforma[]) then
    raise exception using errcode = '42501', message = 'sem papel de plataforma';
  end if;

  if p_conta is null or p_papel is null then
    raise exception using errcode = 'P0001', message = 'parametro obrigatorio';
  end if;

  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception using errcode = 'P0001', message = 'motivo vazio';
  end if;

  -- Trava todas as linhas de admin, em ordem fixa, antes de contar: duas revogações
  -- ao mesmo tempo não zeram os admins nem se travam uma à outra.
  if p_papel = 'admin' then
    perform 1
    from public.papeis_plataforma pp
    where pp.papel = 'admin'
    order by pp.conta_id
    for update;
  end if;

  select (pp.valido_ate is null or pp.valido_ate > now())
    into v_vigente
  from public.papeis_plataforma pp
  where pp.conta_id = p_conta
    and pp.papel = p_papel
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'papel inexistente';
  end if;

  if p_papel = 'admin'
     and v_vigente
     and not exists (
       select 1
       from public.papeis_plataforma pp
       where pp.papel = 'admin'
         and pp.conta_id <> p_conta
         and (pp.valido_ate is null or pp.valido_ate > now())
     ) then
    raise exception using errcode = 'P0001', message = 'ultimo admin';
  end if;

  delete from public.papeis_plataforma
  where conta_id = p_conta
    and papel = p_papel;

  insert into public.auditoria_moderacao (
    ator_id, acao, alvo_tipo, alvo_id, estado_anterior, estado_novo, motivo
  )
  values (
    v_conta, 'revogar_papel', 'papel_plataforma', p_conta, p_papel::text, null, p_motivo
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.aceitar_termos(text) from public, anon;
revoke execute on function public.denunciar(public.motivo_denuncia, uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.minhas_denuncias() from public, anon;
revoke execute on function public.moderar_conteudo(public.alvo_conteudo, uuid, public.estado_moderacao, text, uuid)
  from public, anon;
revoke execute on function public.decidir_denuncia(uuid, public.estado_denuncia, text) from public, anon;
revoke execute on function public.conceder_papel_plataforma(uuid, public.papel_plataforma, text, timestamptz)
  from public, anon;
revoke execute on function public.revogar_papel_plataforma(uuid, public.papel_plataforma, text)
  from public, anon;

grant execute on function public.aceitar_termos(text) to authenticated;
grant execute on function public.denunciar(public.motivo_denuncia, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.minhas_denuncias() to authenticated;
grant execute on function public.moderar_conteudo(public.alvo_conteudo, uuid, public.estado_moderacao, text, uuid)
  to authenticated;
grant execute on function public.decidir_denuncia(uuid, public.estado_denuncia, text) to authenticated;
grant execute on function public.conceder_papel_plataforma(uuid, public.papel_plataforma, text, timestamptz)
  to authenticated;
grant execute on function public.revogar_papel_plataforma(uuid, public.papel_plataforma, text)
  to authenticated;
