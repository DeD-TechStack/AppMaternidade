begin;
create extension if not exists pgtap with schema extensions;

select plan(47);

-- Família 1: R (...01) responsável, C (...02) cuidador. Bebê b1.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'c@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'C');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

-- Instantâneo (md5 da linha inteira, com versao e atualizado_em) para provar que o negado não tocou nada.
create temp table snap (id uuid primary key, h text);
create function pg_temp.guarda() returns void language sql security definer as $$
  delete from pg_temp.snap;
  insert into pg_temp.snap select r.id, md5(r::text) from public.registros r;
$$;
create function pg_temp.intacto(n int) returns boolean language sql security definer as $$
  select s.h = (select md5(r::text) from public.registros r where r.id = pg_temp.rid(n))
  from pg_temp.snap s where s.id = pg_temp.rid(n);
$$;
create function pg_temp.hist(n int) returns text language sql security definer as $$
  select coalesce(string_agg(operacao::text || ':' || versao::text, ',' order by versao, operacao), '-')
  from public.registro_alteracoes where registro_id = pg_temp.rid(n);
$$;
-- Grava como a tela faria: sessão do bebê 1, início às 10:00 UTC de 01/11/2026.
create function pg_temp.grava(n int, tipo public.tipo_registro, fim timestamptz default null) returns void language plpgsql as $$
begin
  perform public.gravar_registro(pg_temp.rid(n), 'bbbbbbbb-0000-4000-8000-000000000001', tipo,
    '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, fim);
end;
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

-- Início de sessão: registro sem fim, derivado do horário (DR-04). ------------------------------
select lives_ok($$select pg_temp.grava(1, 'sono')$$, 'cuidador inicia uma sessão de sono (sem fim)');
select lives_ok($$select pg_temp.grava(2, 'sono')$$, 'cuidador inicia uma segunda sessão de sono ao mesmo tempo (DR-05)');
select lives_ok($$select pg_temp.grava(3, 'mamada')$$, 'cuidador inicia uma mamada');
select lives_ok($$select pg_temp.grava(4, 'tummy')$$, 'cuidador inicia um tummy time');
select is(
  (select count(*)::int from public.registros where fim is null and excluido_em is null),
  4, 'as 4 sessões estão em andamento (fim nulo e não excluídas): duas do mesmo tipo convivem');
select is(
  (select coalesce(encerrado_por::text, '-') || ' ' || versao::text || ' ' || origem::text from public.registros where id = pg_temp.rid(1)),
  '- 1 ao_vivo', 'sessão em andamento: sem encerrado_por, versão 1 e origem padrão ao_vivo');

-- Encerramento por outra pessoa (troca de turno). -----------------------------------------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.encerrar_sessao(pg_temp.rid(1), '2026-11-01 11:00+00'), '2026-11-01 11:00+00'::timestamptz,
  'responsável encerra a sessão do cuidador e recebe o fim gravado');
select is(
  (select fim::text || ' ' || encerrado_por::text || ' ' || versao::text from public.registros where id = pg_temp.rid(1)),
  '2026-11-01 11:00:00+00 aaaaaaaa-0000-4000-8000-000000000001 2',
  'encerrar_sessao grava fim, encerrado_por = quem encerrou e sobe a versão');
select is(pg_temp.hist(1), 'criacao:1,edicao:2', 'o encerramento entra no histórico como edição');
select is(public.encerrar_sessao(pg_temp.rid(3), '2026-11-01 10:20+00'), '2026-11-01 10:20+00'::timestamptz, 'a mamada também se encerra');
select is(public.encerrar_sessao(pg_temp.rid(4), '2026-11-01 10:08+00'), '2026-11-01 10:08+00'::timestamptz, 'o tummy também se encerra');
select is(
  (select count(*)::int from public.registros where fim is null and excluido_em is null),
  1, 'sobra uma sessão em andamento');

-- Vale o primeiro encerramento (Offline 7.2). ---------------------------------------------------
select pg_temp.guarda();
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.encerrar_sessao(pg_temp.rid(1), '2026-11-01 12:00+00'), '2026-11-01 11:00+00'::timestamptz,
  'segundo encerramento devolve o fim do primeiro');
select ok(pg_temp.intacto(1), 'segundo encerramento não muda nada (nem versão nem atualizado_em)');
select is(pg_temp.hist(1), 'criacao:1,edicao:2', 'segundo encerramento não grava histórico');
select is(public.encerrar_sessao(pg_temp.rid(1), null), '2026-11-01 11:00+00'::timestamptz,
  'encerrar sessão já encerrada com momento nulo também devolve o primeiro fim');

-- Encerramento recusado. ------------------------------------------------------------------------
select pg_temp.guarda();
select throws_ok($$select public.encerrar_sessao(pg_temp.rid(2), '2026-11-01 09:59+00')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_fim_check"',
  'momento antes do início é inválido (check do fim)');
select ok(pg_temp.intacto(2), 'a sessão seguiu aberta e intacta (momento antes do início)');
select throws_ok($$select public.encerrar_sessao(pg_temp.rid(2), now() + interval '6 minutes')$$, '23514', 'horario no futuro',
  'momento 6 minutos no futuro é inválido');
select ok(pg_temp.intacto(2), 'a sessão seguiu aberta e intacta (momento no futuro)');
select lives_ok($$select pg_temp.grava(5, 'mamadeira')$$, 'cuidador grava uma mamadeira (pontual)');
select pg_temp.guarda();
select throws_ok($$select public.encerrar_sessao(pg_temp.rid(5), '2026-11-01 11:00+00')$$, 'P0001', 'nao e sessao',
  'registro pontual não se encerra');
select ok(pg_temp.intacto(5), 'o pontual seguiu intacto');

-- Sessão que atravessa a meia-noite (Fluxos 3.3). -----------------------------------------------
select lives_ok($$select pg_temp.grava(6, 'sono', '2026-11-02 01:00+00')$$, 'sessão com fim no dia seguinte é aceita');

-- Edição de sessão. -----------------------------------------------------------------------------
select pg_temp.guarda();
select throws_ok(
  $$select public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', null, '{}', null, 'America/Sao_Paulo', -180)$$,
  'P0001', 'sessao encerrada', 'editar não reabre a sessão encerrada (fim de volta a nulo)');
select ok(pg_temp.intacto(1), 'a sessão encerrada seguiu intacta');
select throws_ok(
  $$select public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', '2026-11-01 09:00+00', '{}', null, 'America/Sao_Paulo', -180)$$,
  '23514', 'new row for relation "registros" violates check constraint "registros_fim_check"',
  'editar com fim antes do início é inválido');
select ok(pg_temp.intacto(1), 'a sessão seguiu intacta (fim antes do início)');
select throws_ok(
  $$select public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', '2026-11-01 11:00+00', '{"x": 1}', null, 'America/Sao_Paulo', -180)$$,
  '23514', 'new row for relation "registros" violates check constraint "registros_detalhes_check"',
  'editar com detalhes inválidos para o tipo é recusado');
select ok(pg_temp.intacto(1), 'a sessão seguiu intacta (detalhes inválidos)');
select throws_ok(
  $$select public.editar_registro(pg_temp.rid(1), now() + interval '6 minutes', null, '{}', null, 'America/Sao_Paulo', -180)$$,
  '23514', 'horario no futuro', 'editar com início no futuro é inválido');
select throws_ok(
  $$select public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', now() + interval '6 minutes', '{}', null, 'America/Sao_Paulo', -180)$$,
  '23514', 'horario no futuro', 'editar com fim no futuro é inválido');
select ok(pg_temp.intacto(1), 'a sessão seguiu intacta (horário no futuro)');

-- Correção do fim: edição comum, quem encerrou primeiro continua como encerrado_por.
select is(
  (select fim::text || ' ' || encerrado_por::text || ' ' || versao::text
     from public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', '2026-11-01 11:30+00', '{}', null, 'America/Sao_Paulo', -180)),
  '2026-11-01 11:30:00+00 aaaaaaaa-0000-4000-8000-000000000001 3',
  'corrigir o fim é edição comum: versão 3 e encerrado_por segue o do primeiro encerramento');

-- Preencher o fim pela edição também encerra (encerrado_por = quem editou).
select is(
  (select fim::text || ' ' || encerrado_por::text || ' ' || versao::text
     from public.editar_registro(pg_temp.rid(2), '2026-11-01 10:00+00', '2026-11-01 10:45+00', '{}', null, 'America/Sao_Paulo', -180)),
  '2026-11-01 10:45:00+00 aaaaaaaa-0000-4000-8000-000000000002 2',
  'preencher o fim na edição encerra a sessão: encerrado_por = quem editou');
select is(pg_temp.hist(2), 'criacao:1,edicao:2', 'a edição que encerra grava uma linha de edição');

-- Sem `momento`, encerrar grava o now() da transação (padrão do parâmetro). -------------------------
select lives_ok($$select pg_temp.grava(8, 'sono')$$, 'cuidador inicia uma sessão para encerrar sem momento');
select is(public.encerrar_sessao(pg_temp.rid(8)), now(), 'encerrar_sessao sem momento devolve o now() da transação');
select is(
  (select (fim = now())::text || ' ' || encerrado_por::text from public.registros where id = pg_temp.rid(8)),
  'true aaaaaaaa-0000-4000-8000-000000000002', 'encerrar_sessao sem momento grava fim = now() e encerrado_por');

-- Descartar uma sessão em andamento é excluí-la (Fluxos 3.2). -----------------------------------
select lives_ok($$select pg_temp.grava(7, 'sono')$$, 'cuidador inicia outra sessão');
select lives_ok($$select public.excluir_registro(pg_temp.rid(7))$$, 'cuidador descarta a sessão em andamento');
select is(
  (select coalesce(fim::text, 'aberta') || ' ' || (excluido_em is not null)::text from public.registros where id = pg_temp.rid(7)),
  'aberta true', 'a sessão descartada fica sem fim e excluída');
select pg_temp.guarda();
select throws_ok($$select public.encerrar_sessao(pg_temp.rid(7), '2026-11-01 11:00+00')$$, 'P0001', 'registro excluido',
  'sessão descartada não se encerra');
select ok(pg_temp.intacto(7), 'a sessão descartada seguiu intacta');
select throws_ok(
  $$select public.editar_registro(pg_temp.rid(7), '2026-11-01 10:00+00', null, '{}', null, 'America/Sao_Paulo', -180)$$,
  'P0001', 'registro excluido', 'sessão descartada não se edita');
select ok(pg_temp.intacto(7), 'a sessão descartada seguiu intacta (edição)');
select is(
  (select count(*)::int from public.registros
    where fim is null and excluido_em is null and tipo in ('sono', 'mamada', 'tummy')),
  0, 'depois de tudo, nenhuma sessão em andamento');

reset role;

select * from finish();
rollback;
