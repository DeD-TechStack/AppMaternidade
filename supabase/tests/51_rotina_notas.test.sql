begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

-- Família 1: R (...01) responsável, C (...02) cuidador, O (...03) observador. Bebê b1.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'c@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'o@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'C'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'O');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

create function pg_temp.nid(n int) returns uuid language sql immutable as $$
  select ('019b0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

create temp table snap (id uuid primary key, h text);
create function pg_temp.guarda() returns void language sql security definer as $$
  delete from pg_temp.snap;
  insert into pg_temp.snap select n.id, md5(n::text) from public.notas_cuidado n;
$$;
create function pg_temp.intacta(n int) returns boolean language sql security definer as $$
  select s.h = (select md5(x::text) from public.notas_cuidado x where x.id = pg_temp.nid(n))
  from pg_temp.snap s where s.id = pg_temp.nid(n);
$$;
create function pg_temp.existe(n int) returns boolean language sql security definer as $$
  select exists (select 1 from public.notas_cuidado where id = pg_temp.nid(n));
$$;

-- Fixture: 1 em destaque, 2 com destaque vencido, 3 sem destaque, 4 em destaque e depois excluída.
insert into public.notas_cuidado (id, familia_id, bebe_id, texto, destaque_ate, criado_por) values
  (pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'Em destaque', now() + interval '1 day', 'aaaaaaaa-0000-4000-8000-000000000001'),
  (pg_temp.nid(2), 'ffffffff-0000-4000-8000-000000000001', null, 'Destaque vencido', now() - interval '1 day', 'aaaaaaaa-0000-4000-8000-000000000002'),
  (pg_temp.nid(3), 'ffffffff-0000-4000-8000-000000000001', null, 'Sem destaque', null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  (pg_temp.nid(4), 'ffffffff-0000-4000-8000-000000000001', null, 'Excluída', now() + interval '1 day', 'aaaaaaaa-0000-4000-8000-000000000002');
update public.notas_cuidado set atualizado_em = '2026-01-01 00:00+00';

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.excluir_nota(pg_temp.nid(4))$$, 'cuidador exclui a própria nota');

-- Para você saber: destaque_ate > now() e não excluída (ROT-04). ---------------------------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  (select string_agg(right(id::text, 1), ',' order by id) from public.notas_cuidado
    where destaque_ate > now() and excluida_em is null),
  '1', '"Para você saber": só a nota com destaque futuro e não excluída');
select is(
  (select string_agg(right(id::text, 1), ',' order by id) from public.notas_cuidado),
  '1,2,3,4', 'o observador lê todas as notas: a vencida e a sem destaque continuam legíveis, a excluída traz a marca');
select is(
  (select (excluida_em is not null)::text || ' ' || excluida_por::text from public.notas_cuidado where id = pg_temp.nid(4)),
  'true aaaaaaaa-0000-4000-8000-000000000002', 'a nota excluída guarda excluida_em e excluida_por');

-- gravar_nota --------------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  (select coalesce(bebe_id::text, '-') || ' ' || versao::text || ' ' || criado_por::text || ' ' || coalesce(destaque_ate::text, '-') || ' ' || coalesce(excluida_em::text, '-')
     from public.gravar_nota(pg_temp.nid(10), 'ffffffff-0000-4000-8000-000000000001', 'Nota da família')),
  '- 1 aaaaaaaa-0000-4000-8000-000000000001 - -', 'nota da família: sem bebê, versão 1, autor = quem chamou, sem destaque');
select is(
  (select bebe_id::text || ' ' || (destaque_ate = now() + interval '2 days')::text
     from public.gravar_nota(pg_temp.nid(11), 'ffffffff-0000-4000-8000-000000000001', 'Nota do bebê', 'bbbbbbbb-0000-4000-8000-000000000001', now() + interval '2 days')),
  'bbbbbbbb-0000-4000-8000-000000000001 true', 'nota do bebê com destaque');
select is(
  (select (criada_em = now())::text || ' ' || (atualizado_em = now())::text from public.notas_cuidado where id = pg_temp.nid(10)),
  'true true', 'criada_em e atualizado_em são do servidor');

-- Texto e id inválidos ------------------------------------------------------------------------------
select pg_temp.guarda();
select throws_ok($$select public.gravar_nota(pg_temp.nid(20), 'ffffffff-0000-4000-8000-000000000001', '')$$, '23514',
  'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_texto_check"', 'texto vazio é recusado');
select throws_ok($$select public.gravar_nota(pg_temp.nid(21), 'ffffffff-0000-4000-8000-000000000001', '    ')$$, '23514',
  'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_texto_check"', 'texto só com espaços é recusado');
select throws_ok($$select public.gravar_nota(pg_temp.nid(22), 'ffffffff-0000-4000-8000-000000000001', repeat('a', 501))$$, '23514',
  'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_texto_check"', 'texto de 501 caracteres é recusado');
select throws_ok($$select public.gravar_nota(pg_temp.nid(23), 'ffffffff-0000-4000-8000-000000000001', null)$$, '23502',
  'parametro obrigatorio', 'texto nulo dá 23502 "parametro obrigatorio" (adendo R-B, R6)');
select throws_ok($$select public.gravar_nota('019b0000-0000-4000-8000-000000000024', 'ffffffff-0000-4000-8000-000000000001', 'Texto')$$, '23514',
  'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_id_uuidv7_check"', 'id que não é UUID v7 é recusado');
select ok(not (pg_temp.existe(20) or pg_temp.existe(21) or pg_temp.existe(22) or pg_temp.existe(23)), 'nenhuma nota inválida foi criada');
select lives_ok($$select public.gravar_nota(pg_temp.nid(25), 'ffffffff-0000-4000-8000-000000000001', repeat('a', 500))$$, 'texto de 500 caracteres é aceito');

-- editar_nota ---------------------------------------------------------------------------------------
select is(
  (select versao::text || ' ' || texto || ' ' || (atualizado_em = now())::text from public.editar_nota(pg_temp.nid(1), 'Texto novo', now() + interval '1 day')),
  '2 Texto novo true', 'editar o texto sobe a versão e marca atualizado_em');
select is(
  (select bebe_id::text || ' ' || criado_por::text from public.notas_cuidado where id = pg_temp.nid(1)),
  'bbbbbbbb-0000-4000-8000-000000000001 aaaaaaaa-0000-4000-8000-000000000001', 'editar não muda o bebê nem o autor');
select is(
  (select versao::text from public.editar_nota(pg_temp.nid(1), 'Texto novo', now() + interval '3 days')),
  '3', 'mudar só o destaque também sobe a versão');
select is(
  (select coalesce(destaque_ate::text, '-') || ' ' || versao::text from public.editar_nota(pg_temp.nid(1), 'Texto novo', null)),
  '- 4', 'tirar o destaque (nulo) também sobe a versão');
select pg_temp.guarda();
select is(
  (select versao::text from public.editar_nota(pg_temp.nid(1), 'Texto novo', null)),
  '4', 'repetir a edição com os mesmos valores não sobe a versão');
select ok(pg_temp.intacta(1), 'repetir a edição não muda nada');
select throws_ok($$select public.editar_nota(pg_temp.nid(1), '', null)$$, '23514',
  'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_texto_check"', 'editar com texto vazio é recusado');
select ok(pg_temp.intacta(1), 'a nota seguiu intacta (texto vazio)');
select throws_ok($$select public.editar_nota(pg_temp.nid(4), 'Ressuscitar', null)$$, 'P0001', 'nota excluida', 'nota excluída não se edita');
select ok(pg_temp.intacta(4), 'a nota excluída seguiu intacta');
select throws_ok($$select public.editar_nota(pg_temp.nid(99), 'Texto', null)$$, 'P0002', 'nota inexistente', 'editar nota que não existe');

-- excluir_nota --------------------------------------------------------------------------------------
select lives_ok($$select public.excluir_nota(pg_temp.nid(3))$$, 'responsável exclui nota de outro');
select is(
  (select (excluida_em = now())::text || ' ' || excluida_por::text || ' ' || versao::text || ' ' || (atualizado_em = now())::text
     from public.notas_cuidado where id = pg_temp.nid(3)),
  'true aaaaaaaa-0000-4000-8000-000000000001 2 true', 'exclusão grava excluida_em, excluida_por, sobe a versão e marca atualizado_em');
select pg_temp.guarda();
select lives_ok($$select public.excluir_nota(pg_temp.nid(3))$$, 'excluir de novo não dá erro');
select ok(pg_temp.intacta(3), 'excluir de novo não muda nada');
select throws_ok($$select public.excluir_nota(pg_temp.nid(99))$$, 'P0002', 'nota inexistente', 'excluir nota que não existe');

-- Sem restauração e sem histórico de nota (DR-15) ---------------------------------------------------
reset role;
select hasnt_function('public', 'restaurar_nota', 'não existe restauração de nota');
select is(
  (select count(*)::int from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and c.relname like '%nota%'),
  1, 'não existe tabela de histórico de notas (só notas_cuidado)');

select * from finish();
rollback;
