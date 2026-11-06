begin;
create extension if not exists pgtap with schema extensions;

select plan(62);

-- Adendo R-B, R3 e R6: ordem das conferências e catálogo de erros.
--   R3: (1) parâmetro obrigatório (23502); (2) existência e visibilidade (P0002); (3) papel (42501);
--       (4) regras de valor (23514, P0001). Nenhuma validação de valor roda antes da visibilidade.
--   R6: parâmetro obrigatório nulo é 23502 "parametro obrigatorio"; fuso inválido na leitura é o
--       22023 nativo do Postgres.
--
-- Família 1 (fuso America/Sao_Paulo): R (...01) responsável, C (...02) cuidador, O (...03) observador.
-- Família 2: X (...11) responsável. Bebês b1 (família 1) e b2 (família 2).
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'c@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'o@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'x@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'C'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'O'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'X');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000011');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000011', 'responsavel');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'Bebê 2', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000011');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
create function pg_temp.nid(n int) returns uuid language sql immutable as $$
  select ('019b0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

-- Registros: 1 sono aberto do R (família 1); 2 sono aberto do X (família 2);
-- 3 fralda do X e 4 fralda do R, as duas excluídas há 40 dias (fora do prazo de restauração).
-- Notas: 1 do R (família 1) e 2 do X (família 2).
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, detalhes, fuso, deslocamento_min, criado_por) values
  (pg_temp.rid(1), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', '{}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000001'),
  (pg_temp.rid(2), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'sono', '2026-11-01 10:00+00', '{}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000011'),
  (pg_temp.rid(3), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'fralda', '2026-11-01 10:00+00', '{"conteudo": "xixi"}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000011'),
  (pg_temp.rid(4), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda', '2026-11-01 10:00+00', '{"conteudo": "xixi"}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000001');
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001"}', true);
update public.registros set excluido_em = now() where id in (pg_temp.rid(3), pg_temp.rid(4));
update public.registros set excluido_em = now() - interval '40 days' where id in (pg_temp.rid(3), pg_temp.rid(4));
insert into public.notas_cuidado (id, familia_id, bebe_id, texto, criado_por) values
  (pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'Nota 1', 'aaaaaaaa-0000-4000-8000-000000000001'),
  (pg_temp.nid(2), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'Nota 2', 'aaaaaaaa-0000-4000-8000-000000000011');
update public.registros set atualizado_em = '2026-11-01 12:00+00';
update public.notas_cuidado set atualizado_em = '2026-11-01 12:00+00';

-- Hash do conteúdo das 3 tabelas e as contagens delas: guarda() grava, nada_mudou() confere (como dono).
create function pg_temp.hash_tudo() returns text language sql security definer as $$
  select md5(
    (select coalesce(string_agg(r::text, ',' order by id), '') from public.registros r) || '|' ||
    (select coalesce(string_agg(n::text, ',' order by id), '') from public.notas_cuidado n) || '|' ||
    (select coalesce(string_agg(a::text, ',' order by id), '') from public.registro_alteracoes a))
  || ' ' || (select count(*) from public.registros) || ',' || (select count(*) from public.notas_cuidado)
  || ',' || (select count(*) from public.registro_alteracoes);
$$;
create function pg_temp.guarda() returns void language sql security definer as $$
  select set_config('teste.tudo', pg_temp.hash_tudo(), true);
$$;
create function pg_temp.nada_mudou() returns boolean language sql security definer as $$
  select pg_temp.hash_tudo() = current_setting('teste.tudo');
$$;

select pg_temp.guarda();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

-- R6: parâmetro obrigatório nulo ----------------------------------------------------------------------
-- gravar_registro(id_registro, id_bebe, tipo, inicio, fuso, deslocamento_min)
select throws_ok($$select public.gravar_registro(null, 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'gravar_registro: id_registro nulo');
select throws_ok($$select public.gravar_registro(pg_temp.rid(10), null, 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'gravar_registro: id_bebe nulo');
select throws_ok($$select public.gravar_registro(pg_temp.rid(10), 'bbbbbbbb-0000-4000-8000-000000000001', null, '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'gravar_registro: tipo nulo');
select throws_ok($$select public.gravar_registro(pg_temp.rid(10), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', null, 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'gravar_registro: inicio nulo');
select throws_ok($$select public.gravar_registro(pg_temp.rid(10), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', null, -180)$$,
  '23502', 'parametro obrigatorio', 'gravar_registro: fuso nulo');
select throws_ok($$select public.gravar_registro(pg_temp.rid(10), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', null)$$,
  '23502', 'parametro obrigatorio', 'gravar_registro: deslocamento_min nulo');
-- editar_registro(id_registro, inicio, fim, detalhes, nota, fuso, deslocamento_min)
select throws_ok($$select public.editar_registro(null, '2026-11-01 10:00+00', null, '{}', 'x', 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'editar_registro: id_registro nulo');
select throws_ok($$select public.editar_registro(pg_temp.rid(1), null, null, '{}', 'x', 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'editar_registro: inicio nulo');
select throws_ok($$select public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', null, null, 'x', 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'editar_registro: detalhes nulo');
select throws_ok($$select public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', null, '{}', 'x', null, -180)$$,
  '23502', 'parametro obrigatorio', 'editar_registro: fuso nulo');
select throws_ok($$select public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', null, '{}', 'x', 'America/Sao_Paulo', null)$$,
  '23502', 'parametro obrigatorio', 'editar_registro: deslocamento_min nulo');
-- encerrar_sessao, excluir_registro, restaurar_registro (id_registro)
select throws_ok($$select public.encerrar_sessao(null, '2026-11-01 11:00+00')$$,
  '23502', 'parametro obrigatorio', 'encerrar_sessao: id_registro nulo');
select throws_ok($$select public.excluir_registro(null)$$,
  '23502', 'parametro obrigatorio', 'excluir_registro: id_registro nulo');
select throws_ok($$select public.restaurar_registro(null)$$,
  '23502', 'parametro obrigatorio', 'restaurar_registro: id_registro nulo');
-- gravar_nota(id_nota, id_familia, texto), editar_nota(id_nota, texto), excluir_nota(id_nota)
select throws_ok($$select public.gravar_nota(null, 'ffffffff-0000-4000-8000-000000000001', 'Texto')$$,
  '23502', 'parametro obrigatorio', 'gravar_nota: id_nota nulo');
select throws_ok($$select public.gravar_nota(pg_temp.nid(10), null, 'Texto')$$,
  '23502', 'parametro obrigatorio', 'gravar_nota: id_familia nulo');
select throws_ok($$select public.gravar_nota(pg_temp.nid(10), 'ffffffff-0000-4000-8000-000000000001', null)$$,
  '23502', 'parametro obrigatorio', 'gravar_nota: texto nulo');
select throws_ok($$select public.editar_nota(null, 'Texto', null)$$,
  '23502', 'parametro obrigatorio', 'editar_nota: id_nota nulo');
select throws_ok($$select public.editar_nota(pg_temp.nid(1), null, null)$$,
  '23502', 'parametro obrigatorio', 'editar_nota: texto nulo');
select throws_ok($$select public.excluir_nota(null)$$,
  '23502', 'parametro obrigatorio', 'excluir_nota: id_nota nulo');
-- registros_do_dia(id_bebe, dia)
select throws_ok($$select * from public.registros_do_dia(null, '2026-11-01')$$,
  '23502', 'parametro obrigatorio', 'registros_do_dia: id_bebe nulo');
select throws_ok($$select * from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', null)$$,
  '23502', 'parametro obrigatorio', 'registros_do_dia: dia nulo');

-- Parâmetro nulo vem antes da visibilidade: com id ou bebê sem visibilidade o erro segue sendo 23502.
select throws_ok($$select public.gravar_registro(pg_temp.rid(2), 'bbbbbbbb-0000-4000-8000-000000000002', 'sono', null, 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'gravar_registro: id de registro da outra família com inicio nulo dá 23502, não P0002');
select throws_ok($$select public.gravar_registro(pg_temp.rid(11), 'bbbbbbbb-0000-4000-8000-000000000002', 'sono', null, 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'gravar_registro: bebê da outra família com inicio nulo dá 23502, não P0002');
select throws_ok($$select public.editar_registro(pg_temp.rid(2), null, null, '{}', 'x', 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'editar_registro: registro da outra família com inicio nulo dá 23502, não P0002');
select throws_ok($$select public.gravar_nota(pg_temp.nid(2), 'ffffffff-0000-4000-8000-000000000002', null)$$,
  '23502', 'parametro obrigatorio', 'gravar_nota: id de nota da outra família com texto nulo dá 23502, não P0002');
select throws_ok($$select public.gravar_nota(pg_temp.nid(16), 'ffffffff-0000-4000-8000-000000000002', null)$$,
  '23502', 'parametro obrigatorio', 'gravar_nota: família sem visibilidade com texto nulo dá 23502, não P0002');
select throws_ok($$select public.editar_nota(pg_temp.nid(2), null, null)$$,
  '23502', 'parametro obrigatorio', 'editar_nota: nota da outra família com texto nulo dá 23502, não P0002');

-- ... e antes do papel: o observador com parâmetro nulo recebe 23502, não 42501.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select public.gravar_registro(pg_temp.rid(12), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', null, 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'observador: gravar_registro com inicio nulo dá 23502, não 42501');
select throws_ok($$select public.editar_registro(pg_temp.rid(1), null, null, '{}', 'x', 'America/Sao_Paulo', -180)$$,
  '23502', 'parametro obrigatorio', 'observador: editar_registro com inicio nulo dá 23502, não 42501');
select throws_ok($$select public.gravar_nota(pg_temp.nid(12), 'ffffffff-0000-4000-8000-000000000001', null)$$,
  '23502', 'parametro obrigatorio', 'observador: gravar_nota com texto nulo dá 23502, não 42501');

select ok(pg_temp.nada_mudou(), 'parâmetros nulos: nenhuma linha mudou e as contagens das 3 tabelas são as mesmas');

-- R3: id sem visibilidade com valor inválido dá P0002, não o erro do valor -------------------------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$select public.editar_registro(pg_temp.rid(2), now() + interval '1 hour', null, '{}', 'x', 'America/Sao_Paulo', -180)$$,
  'P0002', 'registro inexistente', 'editar_registro de registro da outra família com inicio no futuro dá P0002, não 23514');
select throws_ok($$select public.editar_registro(pg_temp.rid(2), '2026-11-01 10:00+00', now() + interval '1 hour', '{}', 'x', 'America/Sao_Paulo', -180)$$,
  'P0002', 'registro inexistente', 'editar_registro de registro da outra família com fim no futuro dá P0002, não 23514');
select throws_ok($$select public.editar_registro(pg_temp.rid(2), '2026-11-01 10:00+00', null, '{"x": 1}', 'x', 'America/Sao_Paulo', -180)$$,
  'P0002', 'registro inexistente', 'editar_registro de registro da outra família com detalhes inválidos dá P0002, não 23514');
select throws_ok($$select public.encerrar_sessao(pg_temp.rid(2), now() + interval '1 hour')$$,
  'P0002', 'registro inexistente', 'encerrar_sessao de registro da outra família com momento no futuro dá P0002, não 23514');
select throws_ok($$select public.gravar_registro(pg_temp.rid(13), 'bbbbbbbb-0000-4000-8000-000000000002', 'sono', now() + interval '1 hour', 'America/Sao_Paulo', -180)$$,
  'P0002', 'bebe inexistente', 'gravar_registro com bebê da outra família e inicio no futuro dá P0002, não 23514');
select throws_ok($$select public.gravar_registro(pg_temp.rid(14), 'bbbbbbbb-0000-4000-8000-0000000000ff', 'sono', now() + interval '1 hour', 'America/Sao_Paulo', -180)$$,
  'P0002', 'bebe inexistente', 'gravar_registro com bebê que não existe e inicio no futuro dá P0002, não 23514');
select throws_ok($$select public.gravar_registro(pg_temp.rid(2), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', now() + interval '1 hour', 'America/Sao_Paulo', -180)$$,
  'P0002', 'registro inexistente', 'gravar_registro com id de registro da outra família e inicio no futuro dá P0002, não 23514');
select throws_ok($$select public.restaurar_registro(pg_temp.rid(3))$$,
  'P0002', 'registro inexistente', 'restaurar_registro de registro da outra família fora do prazo dá P0002, não "prazo de restauracao encerrado"');
select throws_ok($$select public.gravar_nota(pg_temp.nid(13), 'ffffffff-0000-4000-8000-000000000002', '')$$,
  'P0002', 'familia inexistente', 'gravar_nota na outra família com texto vazio dá P0002, não 23514');
select throws_ok($$select public.gravar_nota(pg_temp.nid(14), 'ffffffff-0000-4000-8000-000000000001', '', 'bbbbbbbb-0000-4000-8000-000000000002')$$,
  'P0002', 'bebe inexistente', 'gravar_nota com bebê da outra família e texto vazio dá P0002, não 23514');
select throws_ok($$select public.editar_nota(pg_temp.nid(2), '', null)$$,
  'P0002', 'nota inexistente', 'editar_nota de nota da outra família com texto vazio dá P0002, não 23514');
select ok(pg_temp.nada_mudou(), 'id sem visibilidade com valor inválido: nenhuma linha mudou e as contagens são as mesmas');

-- R3: quem enxerga mas não tem o papel recebe 42501, não o erro do valor ---------------------------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select public.editar_registro(pg_temp.rid(1), now() + interval '1 hour', null, '{}', 'x', 'America/Sao_Paulo', -180)$$,
  '42501', 'sem permissao', 'observador: editar_registro com inicio no futuro dá 42501, não 23514');
select throws_ok($$select public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', null, '{"x": 1}', 'x', 'America/Sao_Paulo', -180)$$,
  '42501', 'sem permissao', 'observador: editar_registro com detalhes inválidos dá 42501, não 23514');
select throws_ok($$select public.encerrar_sessao(pg_temp.rid(1), now() + interval '1 hour')$$,
  '42501', 'sem permissao', 'observador: encerrar_sessao com momento no futuro dá 42501, não 23514');
select throws_ok($$select public.gravar_registro(pg_temp.rid(15), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', now() + interval '1 hour', 'America/Sao_Paulo', -180)$$,
  '42501', 'sem permissao', 'observador: gravar_registro com inicio no futuro dá 42501, não 23514');
select throws_ok($$select public.restaurar_registro(pg_temp.rid(4))$$,
  '42501', 'sem permissao', 'observador: restaurar_registro fora do prazo dá 42501, não "prazo de restauracao encerrado"');
select throws_ok($$select public.gravar_nota(pg_temp.nid(15), 'ffffffff-0000-4000-8000-000000000001', '')$$,
  '42501', 'sem permissao', 'observador: gravar_nota com texto vazio dá 42501, não 23514');
select throws_ok($$select public.editar_nota(pg_temp.nid(1), '', null)$$,
  '42501', 'sem permissao', 'observador: editar_nota com texto vazio dá 42501, não 23514');
select ok(pg_temp.nada_mudou(), 'observador com valor inválido: nenhuma linha mudou e as contagens são as mesmas');

-- O cuidador diante do registro e da nota do responsável: o papel (autoria) também vem antes do valor.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$select public.editar_registro(pg_temp.rid(1), now() + interval '1 hour', null, '{}', 'x', 'America/Sao_Paulo', -180)$$,
  '42501', 'sem permissao', 'cuidador: editar registro do responsável com inicio no futuro dá 42501, não 23514');
select throws_ok($$select public.restaurar_registro(pg_temp.rid(4))$$,
  '42501', 'sem permissao', 'cuidador: restaurar registro do responsável fora do prazo dá 42501, não "prazo de restauracao encerrado"');
select throws_ok($$select public.editar_nota(pg_temp.nid(1), '', null)$$,
  '42501', 'sem permissao', 'cuidador: editar nota do responsável com texto vazio dá 42501, não 23514');
select ok(pg_temp.nada_mudou(), 'cuidador com valor inválido: nenhuma linha mudou e as contagens são as mesmas');

-- Campos opcionais continuam aceitando nulo: fim, nota, id_bebe e destaque_ate. -------------------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$select public.gravar_registro(pg_temp.rid(20), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{}', null)$$,
  'gravar_registro aceita fim e nota nulos');
select lives_ok(
  $$select public.editar_registro(pg_temp.rid(20), '2026-11-01 10:00+00', null, '{}', null, 'America/Sao_Paulo', -180)$$,
  'editar_registro aceita fim e nota nulos');
select lives_ok(
  $$select public.gravar_nota(pg_temp.nid(20), 'ffffffff-0000-4000-8000-000000000001', 'Texto', null, null)$$,
  'gravar_nota aceita id_bebe e destaque_ate nulos');

-- R6: fuso inválido numa função de leitura responde o 22023 nativo do Postgres. -------------------------
-- O gatilho de fuso da família é desligado só dentro desta transação para plantar o fuso inválido.
reset role;
alter table public.familias disable trigger familias_validar_fuso;
update public.familias set fuso = 'Marte/Olimpo' where id = 'ffffffff-0000-4000-8000-000000000001';
alter table public.familias enable trigger familias_validar_fuso;
select is(
  (select tgenabled::text from pg_trigger where tgrelid = 'public.familias'::regclass and tgname = 'familias_validar_fuso'),
  'O', 'o gatilho familias_validar_fuso foi reabilitado');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$select * from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-01')$$,
  '22023', 'time zone "Marte/Olimpo" not recognized',
  'registros_do_dia com fuso inválido na família responde o 22023 nativo, sem conversão');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000002', '2026-11-01')),
  1, 'registros_do_dia de uma família com fuso válido segue funcionando');

reset role;

select * from finish();
rollback;
