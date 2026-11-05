begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

-- Fixture: uma conta, uma família, um bebê, um registro e uma nota (como dono).
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'A');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min, criado_por) values
  ('019a0000-0000-7000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000001');
insert into public.notas_cuidado (id, familia_id, texto, criado_por) values
  ('019b0000-0000-7000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Nota', 'aaaaaaaa-0000-4000-8000-000000000001');

create temp table snap (chave text primary key, h text);
create function pg_temp.hash_tudo() returns text language sql security definer as $$
  select md5(
    (select coalesce(string_agg(r::text, ',' order by id), '') from public.registros r) ||
    (select coalesce(string_agg(n::text, ',' order by id), '') from public.notas_cuidado n) ||
    (select coalesce(string_agg(a::text, ',' order by id), '') from public.registro_alteracoes a));
$$;
insert into snap values ('tudo', pg_temp.hash_tudo());

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

-- Tabelas: select, insert, update, delete e truncate -----------------------------------------------
select throws_ok($$select * from public.registros$$, '42501', 'permission denied for table registros', 'anon não lê registros');
select throws_ok($$select * from public.registro_alteracoes$$, '42501', 'permission denied for table registro_alteracoes', 'anon não lê registro_alteracoes');
select throws_ok($$select * from public.notas_cuidado$$, '42501', 'permission denied for table notas_cuidado', 'anon não lê notas_cuidado');
select throws_ok(
  $$insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min)
    values ('019a0000-0000-7000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$,
  '42501', 'permission denied for table registros', 'anon não insere em registros');
select throws_ok(
  $$insert into public.registro_alteracoes (registro_id, familia_id, operacao, versao)
    values ('019a0000-0000-7000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'edicao', 2)$$,
  '42501', 'permission denied for table registro_alteracoes', 'anon não insere em registro_alteracoes');
select throws_ok(
  $$insert into public.notas_cuidado (id, familia_id, texto)
    values ('019b0000-0000-7000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'Anon')$$,
  '42501', 'permission denied for table notas_cuidado', 'anon não insere em notas_cuidado');
select throws_ok($$update public.registros set nota = 'x'$$, '42501', 'permission denied for table registros', 'anon não altera registros');
select throws_ok($$update public.registro_alteracoes set versao = 9$$, '42501', 'permission denied for table registro_alteracoes', 'anon não altera registro_alteracoes');
select throws_ok($$update public.notas_cuidado set texto = 'x'$$, '42501', 'permission denied for table notas_cuidado', 'anon não altera notas_cuidado');
select throws_ok($$delete from public.registros$$, '42501', 'permission denied for table registros', 'anon não apaga registros');
select throws_ok($$delete from public.registro_alteracoes$$, '42501', 'permission denied for table registro_alteracoes', 'anon não apaga registro_alteracoes');
select throws_ok($$delete from public.notas_cuidado$$, '42501', 'permission denied for table notas_cuidado', 'anon não apaga notas_cuidado');
select throws_ok($$truncate public.registros$$, '42501', 'permission denied for table registros', 'anon não faz truncate em registros');
select throws_ok($$truncate public.registro_alteracoes$$, '42501', 'permission denied for table registro_alteracoes', 'anon não faz truncate em registro_alteracoes');
select throws_ok($$truncate public.notas_cuidado$$, '42501', 'permission denied for table notas_cuidado', 'anon não faz truncate em notas_cuidado');

-- Funções ---------------------------------------------------------------------------------------------
select throws_ok(
  $$select public.gravar_registro('019a0000-0000-7000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$,
  '42501', null, 'anon não executa gravar_registro');
select throws_ok(
  $$select public.editar_registro('019a0000-0000-7000-8000-000000000001', '2026-11-01 10:00+00', null, '{}', 'x', 'America/Sao_Paulo', -180)$$,
  '42501', null, 'anon não executa editar_registro');
select throws_ok($$select public.encerrar_sessao('019a0000-0000-7000-8000-000000000001', '2026-11-01 11:00+00')$$,
  '42501', null, 'anon não executa encerrar_sessao');
select throws_ok($$select public.excluir_registro('019a0000-0000-7000-8000-000000000001')$$,
  '42501', null, 'anon não executa excluir_registro');
select throws_ok($$select public.restaurar_registro('019a0000-0000-7000-8000-000000000001')$$,
  '42501', null, 'anon não executa restaurar_registro');
select throws_ok($$select * from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-01')$$,
  '42501', null, 'anon não executa registros_do_dia');
select throws_ok($$select public.gravar_nota('019b0000-0000-7000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'Anon')$$,
  '42501', null, 'anon não executa gravar_nota');
select throws_ok($$select public.editar_nota('019b0000-0000-7000-8000-000000000001', 'x', null)$$,
  '42501', null, 'anon não executa editar_nota');
select throws_ok($$select public.excluir_nota('019b0000-0000-7000-8000-000000000001')$$,
  '42501', null, 'anon não executa excluir_nota');
select throws_ok($$select public.pode_alterar_item('ffffffff-0000-4000-8000-000000000001', null)$$,
  '42501', null, 'anon não executa a função auxiliar pode_alterar_item');
select throws_ok(
  $$select public.detalhes_do_registro_validos('sono', '{}')$$,
  '42501', null, 'anon não executa a função de validação dos detalhes');
select throws_ok($$select public.registro_foto(null::public.registros)$$,
  '42501', null, 'anon não executa registro_foto');

reset role;

select is(pg_temp.hash_tudo(), (select h from snap where chave = 'tudo'), 'depois de tudo, registros, notas e histórico seguem intactos');

-- Meta-testes de catálogo (valem para todo o esquema public; funções de extensão ficam de fora) --------
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and has_function_privilege('anon', p.oid, 'execute')),
  0, 'nenhuma função de public é executável por anon');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and p.prosecdef
      and p.proconfig is distinct from array['search_path=""']),
  0, 'toda função security definer de public tem search_path vazio');
select is(
  (select count(*)::int from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity),
  0, 'nenhuma tabela de public está sem RLS');
select is(
  (select string_agg(p.proname::text, ',' order by p.proname) from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef
      and p.proname in ('registros_campos_do_servidor', 'registros_historico', 'registro_alteracoes_imutavel', 'notas_campos_do_servidor')),
  'notas_campos_do_servidor,registro_alteracoes_imutavel,registros_campos_do_servidor,registros_historico',
  'as 4 funções de gatilho são security definer');

select * from finish();
rollback;
