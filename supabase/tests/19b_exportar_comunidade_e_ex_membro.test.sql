begin;
create extension if not exists pgtap with schema extensions;

select plan(25);

-- SEC-06 (SEC-09 e SEC-10 da revisão de segurança, ameaça T7). Decisão (b) do líder, 14/11:
-- numa família sem vínculo ativo, a exportação leva só a última versão que a própria conta escreveu,
-- tirada de registro_alteracoes; nada do que outros fizeram depois. E a exportação leva os dados da
-- comunidade da conta (perfil, tópicos, respostas, denúncias, bloqueios e aceites), nada de outra conta.

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('a19b0000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

create function pg_temp.como(n int) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.i(n), 'role', 'authenticated')::text, true);
$$;

create function pg_temp.chaves(j jsonb) returns text[] language sql as $$
  select array(select k from jsonb_object_keys(j) k order by k);
$$;

-- 01 R responsável da família, 02 C cuidador (revogado no meio do teste),
-- 05 K com dados de comunidade, 06 O outra conta da comunidade, 07 M moderador que decidiu a denúncia.
insert into auth.users (id, email)
select pg_temp.i(n), 'c19b-' || n || '@exemplo.invalid' from unnest(array[1, 2, 5, 6, 7]) n;
insert into public.contas (id, nome_privado)
select pg_temp.i(n), 'Conta ' || n from unnest(array[1, 2, 5, 6, 7]) n;

insert into public.familias (id, nome, fuso, criada_por) values
  (pg_temp.i(100), 'Família 19b', 'America/Sao_Paulo', pg_temp.i(1));
insert into public.vinculos (id, familia_id, conta_id, papel, estado) values
  (pg_temp.i(201), pg_temp.i(100), pg_temp.i(1), 'responsavel', 'ativo'),
  (pg_temp.i(202), pg_temp.i(100), pg_temp.i(2), 'cuidador', 'ativo');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  (pg_temp.i(300), pg_temp.i(100), 'Bebê 19b', '2026-09-01', pg_temp.i(1));

-- (1) C cria um registro e uma nota pelas funções da rotina, é revogado, e R edita os dois.
set local role authenticated;
select pg_temp.como(2);
select lives_ok($$select public.gravar_registro('019b0000-0000-7000-8000-000000000001', pg_temp.i(300),
  'observacao', timestamptz '2026-11-10 12:00:00+00', 'America/Sao_Paulo', -180, null, '{}', 'Versão do C')$$,
  'C, cuidador ativo, grava o registro');
select lives_ok($$select public.gravar_nota('019b0000-0000-7000-8000-000000000002', pg_temp.i(100), 'Nota do C')$$,
  'C, cuidador ativo, grava a nota');
select pg_temp.como(1);
select lives_ok($$select public.gravar_registro('019b0000-0000-7000-8000-000000000003', pg_temp.i(300),
  'observacao', timestamptz '2026-11-10 13:00:00+00', 'America/Sao_Paulo', -180, null, '{}', 'Registro do R')$$,
  'R grava um registro dele');
select lives_ok($$select public.revogar_vinculo(pg_temp.i(202))$$, 'R revoga o vínculo de C');
select lives_ok($$select public.editar_registro('019b0000-0000-7000-8000-000000000001',
  timestamptz '2026-11-10 12:00:00+00', null, '{}', 'MARCADOR-REGISTRO-DEPOIS-DA-REVOGACAO', 'America/Sao_Paulo', -180)$$,
  'R edita depois da revogação o registro que C criou');
select lives_ok($$select public.editar_nota('019b0000-0000-7000-8000-000000000002', 'MARCADOR-NOTA-DEPOIS-DA-REVOGACAO', null)$$,
  'R edita depois da revogação a nota que C criou');
select set_config('teste.r', public.exportar_dados()::text, true);
select pg_temp.como(2);
select lives_ok($$select set_config('teste.c', public.exportar_dados()::text, true)$$, 'C, revogado, exporta os dados');
reset role;

select ok(position('MARCADOR-REGISTRO-DEPOIS-DA-REVOGACAO' in current_setting('teste.r')) > 0
      and position('MARCADOR-NOTA-DEPOIS-DA-REVOGACAO' in current_setting('teste.r')) > 0,
  'controle: R, responsável ativo, vê as duas edições (os marcadores existem)');
select is(position('MARCADOR-REGISTRO-DEPOIS-DA-REVOGACAO' in current_setting('teste.c')), 0,
  'C revogado não recebe a edição que R fez no registro depois da revogação');
select is(position('MARCADOR-NOTA-DEPOIS-DA-REVOGACAO' in current_setting('teste.c')), 0,
  'C revogado não recebe a edição que R fez na nota depois da revogação');
select is(
  (select array_agg(e ->> 'id' order by o) from jsonb_array_elements(current_setting('teste.c')::jsonb -> 'registros')
     with ordinality as t(e, o)),
  array['019b0000-0000-7000-8000-000000000001'],
  'C recebe no topo só o registro que ele escreveu, nada do de R');
select is(
  (current_setting('teste.c')::jsonb -> 'registros' -> 0) ->> 'nota', 'Versão do C',
  'o registro de C sai na última versão que C escreveu');
select is(
  ((current_setting('teste.c')::jsonb -> 'registros' -> 0) ->> 'versao')::int, 1,
  'a versão exportada é a da última escrita de C, não a atual');

-- (2) e (3) Comunidade: K e O têm perfil, aceite, tópico, resposta, denúncia e bloqueio; M decidiu a denúncia de K.
insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(5), '2026-11-05'), (pg_temp.i(6), '2026-11-05');
insert into public.perfis_publicos (id, conta_id, apelido, bio) values
  (pg_temp.i(15), pg_temp.i(5), 'k_apelido', 'Bio do K'),
  (pg_temp.i(16), pg_temp.i(6), 'o_apelido', 'Bio do O');
insert into public.topicos (id, espaco_id, autor_id, titulo, corpo) values
  (pg_temp.i(25), (select id from public.espacos where slug = 'sono'), pg_temp.i(15), 'Tópico do K', 'Corpo do K'),
  (pg_temp.i(26), (select id from public.espacos where slug = 'sono'), pg_temp.i(16), 'Tópico do O', 'Corpo do O');
insert into public.respostas (id, topico_id, autor_id, corpo) values
  (pg_temp.i(35), pg_temp.i(26), pg_temp.i(15), 'Resposta do K'),
  (pg_temp.i(36), pg_temp.i(25), pg_temp.i(16), 'Resposta do O');
insert into public.denuncias (id, denunciante_id, topico_id, motivo, texto, estado, decidida_por, decidida_em) values
  (pg_temp.i(45), pg_temp.i(5), pg_temp.i(26), 'spam_venda', 'Denúncia do K', 'procedente', pg_temp.i(7), now()),
  (pg_temp.i(46), pg_temp.i(6), pg_temp.i(25), 'outro', 'Denúncia do O', 'aberta', null, null);
insert into public.bloqueios (bloqueador_id, bloqueado_id) values
  (pg_temp.i(15), pg_temp.i(16)),
  (pg_temp.i(16), pg_temp.i(15));

set local role authenticated;
select pg_temp.como(5);
select lives_ok($$select set_config('teste.k', public.exportar_dados()::text, true)$$, 'K exporta os dados');
select pg_temp.como(2);
select set_config('teste.c2', public.exportar_dados()::text, true);
reset role;

select is(
  pg_temp.chaves(current_setting('teste.k')::jsonb -> 'comunidade'),
  array['aceites_termos', 'bloqueios', 'denuncias', 'perfil', 'respostas', 'topicos'],
  'comunidade tem exatamente perfil, topicos, respostas, denuncias, bloqueios e aceites_termos');
select is(
  (current_setting('teste.k')::jsonb -> 'comunidade' -> 'perfil') - 'criado_em',
  jsonb_build_object('id', pg_temp.i(15), 'apelido', 'k_apelido', 'bio', 'Bio do K', 'faixa_bebe', null),
  'comunidade.perfil é o perfil público de K');
select is(
  (select array_agg(e ->> 'titulo') from jsonb_array_elements(current_setting('teste.k')::jsonb -> 'comunidade' -> 'topicos') e),
  array['Tópico do K'],
  'comunidade.topicos traz só o tópico de K');
select is(
  pg_temp.chaves(current_setting('teste.k')::jsonb -> 'comunidade' -> 'topicos' -> 0),
  array['corpo', 'criado_em', 'editado_em', 'espaco_id', 'estado', 'faixa_etaria', 'id', 'motivo_moderacao', 'titulo'],
  'cada tópico tem exatamente as nove chaves');
select is(
  (select array_agg(e ->> 'corpo') from jsonb_array_elements(current_setting('teste.k')::jsonb -> 'comunidade' -> 'respostas') e),
  array['Resposta do K'],
  'comunidade.respostas traz só a resposta de K');
select is(
  (select array_agg(e ->> 'texto') from jsonb_array_elements(current_setting('teste.k')::jsonb -> 'comunidade' -> 'denuncias') e),
  array['Denúncia do K'],
  'comunidade.denuncias traz só a denúncia que K fez');
select is(
  pg_temp.chaves(current_setting('teste.k')::jsonb -> 'comunidade' -> 'denuncias' -> 0),
  array['criada_em', 'decidida_em', 'estado', 'id', 'motivo', 'perfil_id', 'resposta_id', 'texto', 'topico_id'],
  'a denúncia sai sem decidida_por nem denunciante_id');
select is(
  (select array_agg(e ->> 'bloqueado_id') from jsonb_array_elements(current_setting('teste.k')::jsonb -> 'comunidade' -> 'bloqueios') e),
  array[pg_temp.i(16)::text],
  'comunidade.bloqueios traz só o bloqueio que K fez, não o que O fez contra K');
select is(
  (select array_agg(e ->> 'versao') from jsonb_array_elements(current_setting('teste.k')::jsonb -> 'comunidade' -> 'aceites_termos') e),
  array['2026-11-05'],
  'comunidade.aceites_termos traz o aceite de K');
select ok(
  current_setting('teste.k') !~ '(Tópico do O|Corpo do O|Resposta do O|Denúncia do O|o_apelido|Bio do O)'
  and position(pg_temp.i(6)::text in current_setting('teste.k')) = 0
  and position(pg_temp.i(7)::text in current_setting('teste.k')) = 0
  and position(pg_temp.i(36)::text in current_setting('teste.k')) = 0
  and position(pg_temp.i(46)::text in current_setting('teste.k')) = 0,
  'nada das linhas de comunidade de O nem o id do moderador aparece na exportação de K');
select is(
  current_setting('teste.c2')::jsonb -> 'comunidade',
  jsonb_build_object('perfil', null, 'topicos', '[]'::jsonb, 'respostas', '[]'::jsonb, 'denuncias', '[]'::jsonb,
                     'bloqueios', '[]'::jsonb, 'aceites_termos', '[]'::jsonb),
  'conta sem dados de comunidade recebe perfil nulo e listas [] (nunca nulas)');

select * from finish();
rollback;
