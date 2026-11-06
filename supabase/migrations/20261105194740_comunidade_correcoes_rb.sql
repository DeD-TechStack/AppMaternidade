-- MAT-47, correções do adendo R-B: 47-M1 (reconferência depois da trava, 40P01 e 23502),
-- 47-M2 (pode_responder respeita a conta habilitada) e 47-M6 (pode_responder aceita resposta direta).
-- Só create or replace sobre funções da MAT-47; nenhuma tabela, política, gatilho ou dado muda.
-- Os parâmetros mantêm os nomes, os tipos e a ordem; grants e revokes são repetidos no fim de cada bloco.
--
-- Trava e rollback: create or replace function toma só o lock de linha no catálogo (pg_proc), sem tocar
-- tabela de dados; é instantâneo e roda dentro da transação da migração.
--   Rollback: recriar as versões anteriores, que são as definições de
--   20261105194710 (pode_responder) e 20261105194730 (as quatro funções de ação). Nada para desfazer em dados.

-- 47-M2 e 47-M6. pode_responder devolve false para quem não tem conta habilitada (mesma fronteira da leitura:
-- o que o select da pessoa não vê, a auxiliar não revela) e aceita a resposta-mãe omitida ou nula como
-- resposta direta ao tópico. Adicionar o default não renomeia nem reordena parâmetro.
create or replace function public.pode_responder(p_topico_id uuid, p_resposta_a uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.conta_habilitada()
    and exists (
      select 1
      from public.topicos t
      where t.id = p_topico_id
        and t.estado = 'visivel'
        and (t.autor_id is null or not public.ha_bloqueio(t.autor_id))
    )
    and (
      p_resposta_a is null
      or exists (
        select 1
        from public.respostas m
        where m.id = p_resposta_a
          and m.estado = 'visivel'
          and (m.autor_id is null or not public.ha_bloqueio(m.autor_id))
      )
    );
$$;

revoke execute on function public.pode_responder(uuid, uuid) from public, anon;
grant execute on function public.pode_responder(uuid, uuid) to authenticated;

-- 47-M1. As quatro funções que agem por papel de plataforma seguem a mesma ordem:
--   1. conferência inicial do papel (recusa barata, antes de qualquer trava);
--   2. trava da linha-alvo;
--   3. reconferência do papel do chamador, já com a trava na mão: a decisão vale pela situação de agora
--      (cada comando de uma função plpgsql em READ COMMITTED enxerga o que foi confirmado até ali);
--   4. as demais regras e a ação.
-- 40P01 (impasse) vira "tente de novo" e 23502 vira "parametro obrigatorio", como no catálogo da MAT-43;
-- os demais erros, inclusive os do catálogo desta tarefa, passam sem mudança.

-- Muda o estado de um tópico ou de uma resposta e grava a auditoria. Não muda o estado da denúncia.
create or replace function public.moderar_conteudo(
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

  -- Reconferência com as travas na mão: quem perdeu o papel enquanto esperava não decide mais.
  if not public.tem_papel_plataforma(array['moderador', 'admin']::public.papel_plataforma[]) then
    raise exception using errcode = '42501', message = 'sem papel de plataforma';
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
exception
  when deadlock_detected then
    raise exception using errcode = 'P0001', message = 'tente de novo';
  when not_null_violation then
    raise exception using errcode = 'P0001', message = 'parametro obrigatorio';
end;
$$;

-- Decide uma denúncia. Só a decisão final grava decidida_por e decidida_em.
create or replace function public.decidir_denuncia(
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

  -- Reconferência com a trava na mão: quem perdeu o papel enquanto esperava não decide mais.
  if not public.tem_papel_plataforma(array['moderador', 'admin']::public.papel_plataforma[]) then
    raise exception using errcode = '42501', message = 'sem papel de plataforma';
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
exception
  when deadlock_detected then
    raise exception using errcode = 'P0001', message = 'tente de novo';
  when not_null_violation then
    raise exception using errcode = 'P0001', message = 'parametro obrigatorio';
end;
$$;

-- Concede um papel de plataforma, ou renova se a conta já o tem (D19). Só o admin concede.
-- A linha-alvo (conta e papel) é travada se já existir; se ainda não existe, a chave primária
-- serializa duas concessões iguais pelo on conflict.
create or replace function public.conceder_papel_plataforma(
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

  perform 1
  from public.papeis_plataforma pp
  where pp.conta_id = p_conta
    and pp.papel = p_papel
  for update;

  -- Reconferência com a trava na mão: quem perdeu o papel de admin enquanto esperava não concede mais.
  if not public.tem_papel_plataforma(array['admin']::public.papel_plataforma[]) then
    raise exception using errcode = '42501', message = 'sem papel de plataforma';
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
exception
  when deadlock_detected then
    raise exception using errcode = 'P0001', message = 'tente de novo';
  when not_null_violation then
    raise exception using errcode = 'P0001', message = 'parametro obrigatorio';
end;
$$;

-- Revoga um papel de plataforma. Nunca deixa o sistema sem admin vigente. Só o admin revoga.
create or replace function public.revogar_papel_plataforma(
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

  -- Reconferência com as travas na mão: quem perdeu o papel de admin enquanto esperava não revoga mais.
  if not public.tem_papel_plataforma(array['admin']::public.papel_plataforma[]) then
    raise exception using errcode = '42501', message = 'sem papel de plataforma';
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
exception
  when deadlock_detected then
    raise exception using errcode = 'P0001', message = 'tente de novo';
  when not_null_violation then
    raise exception using errcode = 'P0001', message = 'parametro obrigatorio';
end;
$$;

revoke execute on function public.moderar_conteudo(public.alvo_conteudo, uuid, public.estado_moderacao, text, uuid)
  from public, anon;
revoke execute on function public.decidir_denuncia(uuid, public.estado_denuncia, text) from public, anon;
revoke execute on function public.conceder_papel_plataforma(uuid, public.papel_plataforma, text, timestamptz)
  from public, anon;
revoke execute on function public.revogar_papel_plataforma(uuid, public.papel_plataforma, text)
  from public, anon;

grant execute on function public.moderar_conteudo(public.alvo_conteudo, uuid, public.estado_moderacao, text, uuid)
  to authenticated;
grant execute on function public.decidir_denuncia(uuid, public.estado_denuncia, text) to authenticated;
grant execute on function public.conceder_papel_plataforma(uuid, public.papel_plataforma, text, timestamptz)
  to authenticated;
grant execute on function public.revogar_papel_plataforma(uuid, public.papel_plataforma, text)
  to authenticated;
