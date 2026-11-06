begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- Adendo R-B, R5: o histórico é só de acréscimo também para o service_role. As duas exceções
-- (anular a autoria, DR-19; a cascata de apagar a família, DR-21) passam; todo o resto dá
-- P0001 "historico imutavel".
--
-- Família 1: R (...01) responsável. Família 2: X (...11) responsável.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'x@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'X');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000011');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000011', 'responsavel');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'Bebê 2', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000011');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

-- Cada família ganha um registro e uma edição: duas linhas de histórico (criação e edição), autor = a conta da família.
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001"}', true);
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, detalhes, fuso, deslocamento_min, criado_por) values
  (pg_temp.rid(1), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', '{}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000001');
update public.registros set nota = 'editado' where id = pg_temp.rid(1);
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000011"}', true);
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, detalhes, fuso, deslocamento_min, criado_por) values
  (pg_temp.rid(2), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'sono', '2026-11-01 10:00+00', '{}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000011');
update public.registros set nota = 'editado' where id = pg_temp.rid(2);

-- A linha de criação do registro 1, sem a coluna autor, e o hash do histórico inteiro.
create function pg_temp.criacao_sem_autor() returns text language sql as $$
  select md5((to_jsonb(a) - 'autor')::text) from public.registro_alteracoes a
  where a.registro_id = pg_temp.rid(1) and a.operacao = 'criacao';
$$;
create function pg_temp.hist_total() returns text language sql as $$
  select md5(coalesce(string_agg(h::text, ',' order by id), '')) from public.registro_alteracoes h;
$$;
select set_config('teste.criacao', pg_temp.criacao_sem_autor(), true);

-- (a) A anulação de autoria passa: só o autor muda, de um valor para nulo. -------------------------------
set local role service_role;
select lives_ok(
  $$update public.registro_alteracoes set autor = null
     where registro_id = '019a0000-0000-7000-8000-000000000001' and operacao = 'criacao'$$,
  'service_role: o update que só troca o autor de um valor para nulo passa');
reset role;
select is(
  (select (autor is null)::text || ' ' || (pg_temp.criacao_sem_autor() = current_setting('teste.criacao'))::text
     from public.registro_alteracoes where registro_id = pg_temp.rid(1) and operacao = 'criacao'),
  'true true', 'anulação de autoria: autor nulo e o resto da linha igual');
select is(
  (select count(*)::int from public.registro_alteracoes where registro_id = pg_temp.rid(1) and autor is not null),
  1, 'anulação de autoria: a outra linha do mesmo registro manteve o autor');

-- (b) A cascata de apagar a família passa e leva o histórico. ---------------------------------------------
select is(
  (select count(*)::int from public.registro_alteracoes where familia_id = 'ffffffff-0000-4000-8000-000000000002'),
  2, 'antes de apagar a família 2, o histórico dela tem 2 linhas');
set local role service_role;
select lives_ok($$delete from public.familias where id = 'ffffffff-0000-4000-8000-000000000002'$$,
  'service_role: apagar a família passa pela cascata');
reset role;
select is(
  (select count(*)::int from public.registro_alteracoes where familia_id = 'ffffffff-0000-4000-8000-000000000002')
  + (select count(*)::int from public.registros where familia_id = 'ffffffff-0000-4000-8000-000000000002'),
  0, 'apagar a família leva os registros e o histórico dela');
select is(
  (select count(*)::int from public.registro_alteracoes where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  2, 'o histórico da família 1 não foi tocado pela cascata da família 2');

-- (c) O resto segue barrado, também para o service_role. ----------------------------------------------------
select set_config('teste.hist', pg_temp.hist_total(), true);
set local role service_role;
select throws_ok(
  $$update public.registro_alteracoes set operacao = 'exclusao' where registro_id = '019a0000-0000-7000-8000-000000000001'$$,
  'P0001', 'historico imutavel', 'service_role: trocar a operação é recusado');
select throws_ok(
  $$update public.registro_alteracoes set autor = 'aaaaaaaa-0000-4000-8000-000000000011' where registro_id = '019a0000-0000-7000-8000-000000000001' and operacao = 'edicao'$$,
  'P0001', 'historico imutavel', 'service_role: trocar o autor por outra conta é recusado');
select throws_ok(
  $$update public.registro_alteracoes set autor = null, versao = 77 where registro_id = '019a0000-0000-7000-8000-000000000001' and operacao = 'edicao'$$,
  'P0001', 'historico imutavel', 'service_role: anular o autor junto com outra mudança é recusado');
select throws_ok(
  $$update public.registro_alteracoes set autor = 'aaaaaaaa-0000-4000-8000-000000000001' where registro_id = '019a0000-0000-7000-8000-000000000001' and operacao = 'criacao'$$,
  'P0001', 'historico imutavel', 'service_role: devolver um autor a uma linha anulada é recusado');
select throws_ok(
  $$delete from public.registro_alteracoes where registro_id = '019a0000-0000-7000-8000-000000000001'$$,
  'P0001', 'historico imutavel', 'service_role: apagar o histórico de um registro que existe é recusado');
select throws_ok($$truncate public.registro_alteracoes$$,
  'P0001', 'historico imutavel', 'service_role: truncate do histórico é recusado');
reset role;
select is(pg_temp.hist_total(), current_setting('teste.hist'),
  'depois das 6 tentativas barradas, o histórico seguiu intacto');

select * from finish();
rollback;
