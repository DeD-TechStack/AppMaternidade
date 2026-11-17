begin;
create extension if not exists pgtap with schema extensions;

-- SEC-01: os poderes de moderador e de admin exigem sessão aal2 no banco, não só na tela.
-- Sessão só com senha (aal1, ou sem o claim aal) não modera, não decide denúncia, não concede nem revoga
-- papel e não lê denúncias nem a auditoria; a mesma conta em aal2 continua podendo tudo.
select plan(19);

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('c0140000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Troca a sessão para a conta pedida, com o nível de autenticação pedido (nulo = sem o claim aal).
create function pg_temp.como(p_n int, p_aal text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    (jsonb_build_object('sub', pg_temp.i(p_n), 'role', 'authenticated')
      || case when p_aal is null then '{}'::jsonb else jsonb_build_object('aal', p_aal) end)::text, true);
end;
$$;

insert into auth.users (id, email) values
  (pg_temp.i(1), 'c014-moderador@exemplo.invalid'),
  (pg_temp.i(2), 'c014-admin@exemplo.invalid'),
  (pg_temp.i(3), 'c014-autor@exemplo.invalid'),
  (pg_temp.i(4), 'c014-denunciante@exemplo.invalid'),
  (pg_temp.i(5), 'c014-outro-moderador@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  (pg_temp.i(1), 'Moderador'), (pg_temp.i(2), 'Admin'), (pg_temp.i(3), 'Autor'), (pg_temp.i(4), 'Denunciante'),
  (pg_temp.i(5), 'Outro moderador');

insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(3), '2026-11-05'), (pg_temp.i(4), '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(13), pg_temp.i(3), 't14_autor'), (pg_temp.i(14), pg_temp.i(4), 't14_denunciante');

insert into public.papeis_plataforma (conta_id, papel, valido_ate) values
  (pg_temp.i(1), 'moderador', null), (pg_temp.i(2), 'admin', null), (pg_temp.i(5), 'moderador', null);

insert into public.topicos (id, espaco_id, autor_id, titulo, corpo, estado, motivo_moderacao) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(13), 'Tópico 14', 'Corpo 14', 'visivel', null),
  (pg_temp.i(22), (select id from public.espacos where slug = 'sono'), pg_temp.i(13), 'Tópico 14b', 'Corpo 14b', 'visivel', null),
  (pg_temp.i(23), (select id from public.espacos where slug = 'sono'), pg_temp.i(13), 'Tópico 14c', 'Corpo 14c', 'visivel', null);

insert into public.denuncias (id, denunciante_id, topico_id, motivo, estado) values
  (pg_temp.i(41), pg_temp.i(4), pg_temp.i(21), 'outro', 'aberta'),
  (pg_temp.i(42), pg_temp.i(4), pg_temp.i(21), 'outro', 'aberta'),
  (pg_temp.i(43), pg_temp.i(4), pg_temp.i(22), 'outro', 'aberta');

insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, estado_anterior, estado_novo, motivo) values
  (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), 'visivel', 'oculto', 'linha de auditoria do teste');

set local role authenticated;

-- Cada chamada em aal1 tem alvo próprio (tópicos 22 e 23, denúncia 43, conta 5): se a regra faltar e a
-- chamada passar, o estado que ela muda não afeta as chamadas em aal2.

-- (1) moderador aal1: não modera nem decide
select pg_temp.como(1, 'aal1');
select throws_ok(
  $q$select public.moderar_conteudo('topico'::public.alvo_conteudo, pg_temp.i(22), 'oculto'::public.estado_moderacao, 'motivo')$q$,
  '42501', 'sem papel de plataforma', 'moderador em aal1 não modera conteúdo');
select throws_ok(
  $q$select public.decidir_denuncia(pg_temp.i(43), 'procedente'::public.estado_denuncia, 'motivo')$q$,
  '42501', 'sem papel de plataforma', 'moderador em aal1 não decide denúncia');

-- (2) moderador aal1: não lê denúncias nem auditoria
select is((select count(*)::int from public.denuncias), 0, 'moderador em aal1 não lê denúncias');
select is((select count(*)::int from public.auditoria_moderacao), 0, 'moderador em aal1 não lê a auditoria');
select is(public.tem_papel_plataforma(array['moderador']::public.papel_plataforma[]), false,
  'tem_papel_plataforma devolve false para moderador em aal1');

-- sem o claim aal vale como aal1
select pg_temp.como(1, null);
select throws_ok(
  $q$select public.moderar_conteudo('topico'::public.alvo_conteudo, pg_temp.i(23), 'oculto'::public.estado_moderacao, 'motivo')$q$,
  '42501', 'sem papel de plataforma', 'moderador sem claim aal não modera conteúdo');
select is((select count(*)::int from public.denuncias), 0, 'moderador sem claim aal não lê denúncias');

-- (3) admin aal1: não concede nem revoga papel, não lê denúncias nem auditoria
select pg_temp.como(2, 'aal1');
select throws_ok(
  $q$select public.conceder_papel_plataforma(pg_temp.i(4), 'moderador'::public.papel_plataforma, 'motivo')$q$,
  '42501', 'sem papel de plataforma', 'admin em aal1 não concede papel');
select throws_ok(
  $q$select public.revogar_papel_plataforma(pg_temp.i(5), 'moderador'::public.papel_plataforma, 'motivo')$q$,
  '42501', 'sem papel de plataforma', 'admin em aal1 não revoga papel');
select is((select count(*)::int from public.denuncias), 0, 'admin em aal1 não lê denúncias');
select is((select count(*)::int from public.auditoria_moderacao), 0, 'admin em aal1 não lê a auditoria');

-- (4) as mesmas contas em aal2 continuam podendo
select pg_temp.como(1, 'aal2');
select ok((select count(*) from public.denuncias) > 0, 'moderador em aal2 lê denúncias');
select ok((select count(*) from public.auditoria_moderacao) > 0, 'moderador em aal2 lê a auditoria');
select lives_ok(
  $q$select public.moderar_conteudo('topico'::public.alvo_conteudo, pg_temp.i(21), 'oculto'::public.estado_moderacao, 'motivo')$q$,
  'moderador em aal2 modera conteúdo');
select lives_ok(
  $q$select public.decidir_denuncia(pg_temp.i(42), 'procedente'::public.estado_denuncia, 'motivo')$q$,
  'moderador em aal2 decide denúncia');

select pg_temp.como(2, 'aal2');
select lives_ok(
  $q$select public.conceder_papel_plataforma(pg_temp.i(3), 'moderador'::public.papel_plataforma, 'motivo')$q$,
  'admin em aal2 concede papel');
select lives_ok(
  $q$select public.revogar_papel_plataforma(pg_temp.i(3), 'moderador'::public.papel_plataforma, 'motivo')$q$,
  'admin em aal2 revoga papel');

reset role;

-- (5) catálogo: a porta única continua security definer, com search_path vazio e sem execute para anon
select ok(
  (select p.prosecdef and p.proconfig = array['search_path=""']
     from pg_proc p
    where p.oid = 'public.tem_papel_plataforma(public.papel_plataforma[])'::regprocedure),
  'tem_papel_plataforma segue security definer com search_path vazio');
select ok(
  not has_function_privilege('anon', 'public.tem_papel_plataforma(public.papel_plataforma[])', 'execute'),
  'anon não executa tem_papel_plataforma');

select * from finish();
rollback;
