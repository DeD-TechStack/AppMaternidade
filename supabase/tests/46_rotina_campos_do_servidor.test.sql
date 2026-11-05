begin;
create extension if not exists pgtap with schema extensions;

select plan(78);

-- Contas: R (...01) responsável, C (...02) e D (...03) cuidadores da família 1.
-- Z (...04) é responsável da família 2 (usada na cascata).
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'c@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'd@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'z@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'C'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'D'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Z');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000004');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'cuidador'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000004', 'responsavel');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'Bebê 2', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000004');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
create function pg_temp.nid(n int) returns uuid language sql immutable as $$
  select ('019b0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
-- Identidade lida por auth.uid() (vale também para o dono, que é quem executa os updates).
create function pg_temp.eu(conta int) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', ('aaaaaaaa-0000-4000-8000-' || lpad(conta::text, 12, '0')))::text, true);
$$;
create function pg_temp.ninguem() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;
-- Insert direto de fixture (sessão ou pontual) com o autor dado.
create function pg_temp.reg(n int, autor int, fim timestamptz default null, tipo public.tipo_registro default 'sono')
returns void language sql as $$
  insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, detalhes, fuso, deslocamento_min, criado_por)
  values (pg_temp.rid(n), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', tipo,
          '2026-11-01 10:00+00', fim, case when tipo = 'fralda' then '{"conteudo": "xixi"}'::jsonb else '{}'::jsonb end,
          'America/Sao_Paulo', -180, ('aaaaaaaa-0000-4000-8000-' || lpad(autor::text, 12, '0'))::uuid);
$$;
-- Histórico de um registro em texto: operacao:versao, em ordem.
create function pg_temp.hist(n int) returns text language sql as $$
  select coalesce(string_agg(operacao::text || ':' || versao::text, ',' order by versao, operacao), '-')
  from public.registro_alteracoes where registro_id = pg_temp.rid(n);
$$;
-- Guarda o histórico inteiro para provar que uma tentativa negada não mexeu nele.
create function pg_temp.hist_total() returns text language sql as $$
  select md5(coalesce(string_agg(h::text, ',' order by id), '')) from public.registro_alteracoes h;
$$;
create function pg_temp.antigo(n int) returns void language sql as $$
  update public.registros set atualizado_em = '2026-01-01 00:00+00' where id = pg_temp.rid(n);
$$;
create temp table guarda (chave text primary key, valor text);

-- INSERT ----------------------------------------------------------------------------------------
select pg_temp.eu(3);
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, detalhes, fuso, deslocamento_min,
  criado_por, encerrado_por, versao, recebido_em, atualizado_em, excluido_em, excluido_por)
values (pg_temp.rid(1), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono',
  '2026-11-01 10:00+00', '2026-11-01 11:00+00', '{}', 'America/Sao_Paulo', -180,
  'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 9, '2020-01-01 00:00+00',
  '2020-01-01 00:00+00', '2020-01-01 00:00+00', 'aaaaaaaa-0000-4000-8000-000000000003');
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, detalhes, fuso, deslocamento_min,
  criado_por, encerrado_por)
values (pg_temp.rid(2), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono',
  '2026-11-01 10:00+00', null, '{}', 'America/Sao_Paulo', -180,
  'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003');

select is(
  (select versao::text || ' ' || (recebido_em = now())::text || ' ' || (atualizado_em = now())::text
     from public.registros where id = pg_temp.rid(1)),
  '1 true true', 'insert: versão 1, recebido_em e atualizado_em são do servidor (valores do cliente ignorados)');
select is(
  (select coalesce(excluido_em::text, '-') || ' ' || coalesce(excluido_por::text, '-') from public.registros where id = pg_temp.rid(1)),
  '- -', 'insert: excluido_em e excluido_por entram nulos');
select is(
  (select encerrado_por::text from public.registros where id = pg_temp.rid(1)),
  'aaaaaaaa-0000-4000-8000-000000000001', 'insert com fim: encerrado_por é o criado_por');
select is(
  (select coalesce(encerrado_por::text, '-') from public.registros where id = pg_temp.rid(2)),
  '-', 'insert sem fim: encerrado_por entra nulo mesmo que o cliente mande valor');
select is(
  (select operacao::text || ' ' || coalesce(autor::text, '-') || ' ' || coalesce(antes::text, '-') || ' ' || versao::text
          || ' ' || (familia_id = 'ffffffff-0000-4000-8000-000000000001')::text
     from public.registro_alteracoes where registro_id = pg_temp.rid(1)),
  'criacao aaaaaaaa-0000-4000-8000-000000000001 - 1 true',
  'insert: linha de criação com autor = criado_por, antes nulo, versão 1 e a família do registro');
select is(
  (select depois = public.registro_foto(r) and (select count(*) from jsonb_object_keys(depois)) = 6
     from public.registro_alteracoes a join public.registros r on r.id = a.registro_id
    where a.registro_id = pg_temp.rid(1)),
  true, 'insert: depois é a foto com as 6 colunas editáveis');
select is(pg_temp.hist(2), 'criacao:1', 'insert sem fim: só a linha de criação');

select pg_temp.ninguem();
select lives_ok($$select pg_temp.reg(3, 2)$$, 'insert não exige auth.uid() (o autor é o criado_por)');

-- UPDATE: não reabre ----------------------------------------------------------------------------
select pg_temp.eu(1);
select pg_temp.antigo(1);
insert into guarda select 'r1', md5(r::text) from public.registros r where id = pg_temp.rid(1);
select throws_ok($$update public.registros set fim = null where id = pg_temp.rid(1)$$, 'P0001', 'sessao encerrada',
  'update: fim não volta a nulo');
select is((select md5(r::text) from public.registros r where id = pg_temp.rid(1)), (select valor from guarda where chave = 'r1'),
  'update recusado: a sessão encerrada seguiu intacta (versão e atualizado_em)');

-- UPDATE: edição --------------------------------------------------------------------------------
update public.registros set nota = 'x' where id = pg_temp.rid(1);
select is((select versao from public.registros where id = pg_temp.rid(1)), 2, 'edição: a versão sobe 1');
select is((select atualizado_em = now() from public.registros where id = pg_temp.rid(1)), true, 'edição: atualizado_em marca a mudança');
select is(
  (select operacao::text || ' ' || autor::text || ' ' || versao::text || ' ' || (antes ->> 'nota' is null)::text || ' ' || (depois ->> 'nota')
     from public.registro_alteracoes where registro_id = pg_temp.rid(1) and operacao = 'edicao'),
  'edicao aaaaaaaa-0000-4000-8000-000000000001 2 true x',
  'edição: linha com autor = auth.uid(), versão nova e antes/depois da nota');
select is(
  (select antes = (public.registro_foto(r) || '{"nota": null}'::jsonb) and (select count(*) from jsonb_object_keys(antes)) = 6
     from public.registro_alteracoes a join public.registros r on r.id = a.registro_id
    where a.registro_id = pg_temp.rid(1) and a.operacao = 'edicao'),
  true, 'edição: antes é a foto completa (6 chaves) do estado anterior');

-- UPDATE: nada mudou ----------------------------------------------------------------------------
select pg_temp.antigo(1);
insert into guarda select 'r1b', md5(r::text) from public.registros r where id = pg_temp.rid(1);
update public.registros set nota = nota, detalhes = detalhes, fim = fim where id = pg_temp.rid(1);
select is((select md5(r::text) from public.registros r where id = pg_temp.rid(1)), (select valor from guarda where chave = 'r1b'),
  'update sem mudança: versão e atualizado_em ficam como estavam');
select is(pg_temp.hist(1), 'criacao:1,edicao:2', 'update sem mudança: nenhuma linha nova no histórico');

-- UPDATE: versão e recebido_em do cliente são ignorados -----------------------------------------
update public.registros set versao = 99, recebido_em = '2020-01-01 00:00+00' where id = pg_temp.rid(1);
select is(
  (select versao::text || ' ' || (recebido_em = now())::text from public.registros where id = pg_temp.rid(1)),
  '2 true', 'update: versão e recebido_em enviados pelo cliente são ignorados');
select is((select atualizado_em from public.registros where id = pg_temp.rid(1)), '2026-01-01 00:00+00'::timestamptz,
  'update que não muda nada de verdade não mexe em atualizado_em');

-- UPDATE: só atualizado_em ----------------------------------------------------------------------
update public.registros set atualizado_em = '2021-05-05 00:00+00' where id = pg_temp.rid(1);
select is((select atualizado_em from public.registros where id = pg_temp.rid(1)), '2021-05-05 00:00+00'::timestamptz,
  'mudança só de atualizado_em fica como veio (só o dono consegue)');
select is((select versao from public.registros where id = pg_temp.rid(1)), 2, 'mudança só de atualizado_em não sobe a versão');

-- UPDATE: encerramento --------------------------------------------------------------------------
select pg_temp.eu(2);
update public.registros set fim = '2026-11-01 11:00+00' where id = pg_temp.rid(2);
select is(
  (select encerrado_por::text || ' ' || versao::text from public.registros where id = pg_temp.rid(2)),
  'aaaaaaaa-0000-4000-8000-000000000002 2', 'encerramento: encerrado_por = auth.uid() e a versão sobe');
select is(pg_temp.hist(2), 'criacao:1,edicao:2', 'encerramento: grava uma linha de edição');
select pg_temp.eu(1);
update public.registros set fim = '2026-11-01 12:00+00' where id = pg_temp.rid(2);
select is(
  (select encerrado_por::text || ' ' || versao::text from public.registros where id = pg_temp.rid(2)),
  'aaaaaaaa-0000-4000-8000-000000000002 3', 'correção do fim: encerrado_por segue o de quem encerrou primeiro');

-- UPDATE: exclusão e restauração ----------------------------------------------------------------
select pg_temp.antigo(1);
update public.registros set excluido_em = '2020-01-01 00:00+00' where id = pg_temp.rid(1);
select is(
  (select (excluido_em = now())::text || ' ' || excluido_por::text || ' ' || versao::text || ' ' || (atualizado_em = now())::text
     from public.registros where id = pg_temp.rid(1)),
  'true aaaaaaaa-0000-4000-8000-000000000001 3 true',
  'exclusão: excluido_em vira now(), excluido_por = auth.uid(), versão sobe e atualizado_em marca');
select is(
  (select operacao::text || ' ' || autor::text || ' ' || versao::text || ' ' || antes::text || ' ' || ((depois ->> 'excluido_em')::timestamptz = now())::text
     from public.registro_alteracoes where registro_id = pg_temp.rid(1) and operacao = 'exclusao'),
  'exclusao aaaaaaaa-0000-4000-8000-000000000001 3 {"excluido_em": null} true',
  'exclusão: linha com antes {"excluido_em": null} e depois com o novo valor');
select is((select count(*)::int from jsonb_object_keys((select depois from public.registro_alteracoes where registro_id = pg_temp.rid(1) and operacao = 'exclusao'))),
  1, 'exclusão: o depois tem só a chave excluido_em');

select pg_temp.eu(2);
update public.registros set excluido_em = null where id = pg_temp.rid(1);
select is(
  (select coalesce(excluido_em::text, '-') || ' ' || coalesce(excluido_por::text, '-') || ' ' || versao::text
     from public.registros where id = pg_temp.rid(1)),
  '- - 4', 'restauração: excluido_em e excluido_por voltam a nulo e a versão sobe');
select is(
  (select operacao::text || ' ' || autor::text || ' ' || versao::text || ' ' || ((antes ->> 'excluido_em')::timestamptz = now())::text || ' ' || coalesce(depois ->> 'excluido_em', 'nulo')
     from public.registro_alteracoes where registro_id = pg_temp.rid(1) and operacao = 'restauracao'),
  'restauracao aaaaaaaa-0000-4000-8000-000000000002 4 true nulo',
  'restauração: linha com antes {"excluido_em": <valor>} e depois {"excluido_em": null}, autor = auth.uid()');

-- UPDATE: excluído de um valor para outro não é exclusão ----------------------------------------
select pg_temp.eu(1);
select pg_temp.reg(4, 2);
update public.registros set excluido_em = now() where id = pg_temp.rid(4);
select pg_temp.antigo(4);
update public.registros set excluido_em = '2020-02-02 00:00+00' where id = pg_temp.rid(4);
select is(
  (select excluido_em::text || ' ' || versao::text || ' ' || (atualizado_em = now())::text from public.registros where id = pg_temp.rid(4)),
  '2020-02-02 00:00:00+00 2 true',
  'excluído de um valor para outro: fica como veio, sem subir a versão (mas atualizado_em marca)');
select is(pg_temp.hist(4), 'criacao:1,exclusao:2', 'excluído de um valor para outro: nenhuma linha nova no histórico');

-- UPDATE: edição e exclusão no mesmo update -----------------------------------------------------
select pg_temp.reg(5, 2);
update public.registros set nota = 'duas coisas', excluido_em = now() where id = pg_temp.rid(5);
select is((select versao from public.registros where id = pg_temp.rid(5)), 3, 'edição e exclusão juntas: a versão sobe 2');
select is(pg_temp.hist(5), 'criacao:1,edicao:2,exclusao:3', 'edição e exclusão juntas: uma linha para cada, com a versão certa');

-- UPDATE: sem auth.uid() não há como registrar o autor ------------------------------------------
select pg_temp.reg(6, 2);
select pg_temp.reg(7, 2);
update public.registros set excluido_em = now() where id = pg_temp.rid(7);
select pg_temp.antigo(6);
select pg_temp.antigo(7);
insert into guarda select 'r6', md5(r::text) from public.registros r where id = pg_temp.rid(6);
insert into guarda select 'r7', md5(r::text) from public.registros r where id = pg_temp.rid(7);
select pg_temp.ninguem();
select throws_ok($$update public.registros set nota = 'sem autor' where id = pg_temp.rid(6)$$, 'P0001', 'autor desconhecido',
  'edição sem auth.uid() é recusada');
select throws_ok($$update public.registros set excluido_em = now() where id = pg_temp.rid(6)$$, 'P0001', 'autor desconhecido',
  'exclusão sem auth.uid() é recusada');
select throws_ok($$update public.registros set excluido_em = null where id = pg_temp.rid(7)$$, 'P0001', 'autor desconhecido',
  'restauração sem auth.uid() é recusada');
select throws_ok($$update public.registros set fim = '2026-11-01 11:00+00' where id = pg_temp.rid(6)$$, 'P0001', 'autor desconhecido',
  'encerramento sem auth.uid() é recusado');
select is(
  (select md5(r::text) from public.registros r where id = pg_temp.rid(6)), (select valor from guarda where chave = 'r6'),
  'tentativas sem autor: o registro 6 seguiu intacto');
select is(
  (select md5(r::text) from public.registros r where id = pg_temp.rid(7)), (select valor from guarda where chave = 'r7'),
  'tentativas sem autor: o registro 7 seguiu excluído e intacto');
select is(pg_temp.hist(6) || ' ' || pg_temp.hist(7), 'criacao:1 criacao:1,exclusao:2', 'tentativas sem autor: o histórico não ganhou linhas');

-- IMUTABILIDADE DO HISTÓRICO --------------------------------------------------------------------
select pg_temp.eu(1);
insert into guarda select 'hist', pg_temp.hist_total();
select throws_ok($$update public.registro_alteracoes set versao = 50$$, 'P0001', 'historico imutavel', 'dono: update no histórico é recusado');
select throws_ok($$delete from public.registro_alteracoes where registro_id = pg_temp.rid(1)$$, 'P0001', 'historico imutavel',
  'dono: delete de histórico de registro que existe é recusado');
select throws_ok($$truncate public.registro_alteracoes$$, 'P0001', 'historico imutavel', 'dono: truncate do histórico é recusado');
select throws_ok($$update public.registro_alteracoes set autor = 'aaaaaaaa-0000-4000-8000-000000000003' where registro_id = pg_temp.rid(1)$$,
  'P0001', 'historico imutavel', 'dono: trocar o autor por outra conta é recusado');
select throws_ok($$update public.registro_alteracoes set autor = null, versao = 77 where registro_id = pg_temp.rid(1)$$,
  'P0001', 'historico imutavel', 'dono: anular o autor junto com outra mudança é recusado');
select throws_ok($$update public.registro_alteracoes set depois = '{}'::jsonb where registro_id = pg_temp.rid(1)$$,
  'P0001', 'historico imutavel', 'dono: reescrever o depois é recusado');
select is(pg_temp.hist_total(), (select valor from guarda where chave = 'hist'), 'o histórico seguiu intacto depois das 6 tentativas do dono');

set local role service_role;
select throws_ok($$update public.registro_alteracoes set versao = 50$$, 'P0001', 'historico imutavel', 'service_role: update no histórico é recusado');
select throws_ok($$delete from public.registro_alteracoes where registro_id = '019a0000-0000-7000-8000-000000000001'$$, 'P0001', 'historico imutavel',
  'service_role: delete no histórico é recusado');
select throws_ok($$truncate public.registro_alteracoes$$, 'P0001', 'historico imutavel', 'service_role: truncate do histórico é recusado');
reset role;
select is(pg_temp.hist_total(), (select valor from guarda where chave = 'hist'), 'o histórico seguiu intacto depois das tentativas do service_role');

-- AUTORIA ANULADA (DR-19) -----------------------------------------------------------------------
-- D cria um registro, encerra a sessão de outro e escreve uma nota; depois sai da família e a conta é removida.
select pg_temp.eu(3);
select pg_temp.reg(10, 3);
select pg_temp.reg(11, 1);
update public.registros set fim = '2026-11-01 11:00+00' where id = pg_temp.rid(11);
-- D também exclui um registro dele antes de sair (excluido_por = D).
select pg_temp.reg(12, 3);
update public.registros set excluido_em = now() where id = pg_temp.rid(12);
insert into public.notas_cuidado (id, familia_id, texto, criado_por, atualizado_em) values
  (pg_temp.nid(10), 'ffffffff-0000-4000-8000-000000000001', 'Nota do D', 'aaaaaaaa-0000-4000-8000-000000000003', '2026-01-01 00:00+00');
update public.registros set atualizado_em = '2026-01-01 00:00+00' where id in (pg_temp.rid(10), pg_temp.rid(11), pg_temp.rid(12));
insert into guarda select 'hist_d', pg_temp.hist_total();
insert into guarda select 'v10', versao::text from public.registros where id = pg_temp.rid(10);
select pg_temp.ninguem();
delete from public.vinculos where conta_id = 'aaaaaaaa-0000-4000-8000-000000000003';
select lives_ok($$delete from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000003'$$,
  'a conta do D é removida (o histórico não a impede)');
select is(
  (select coalesce(criado_por::text, '-') || ' ' || coalesce(encerrado_por::text, '-') from public.registros where id = pg_temp.rid(10)) || ' ' ||
  (select coalesce(encerrado_por::text, '-') from public.registros where id = pg_temp.rid(11)),
  '- - -', 'conta removida: criado_por e encerrado_por viram nulos');
select is(
  (select versao::text || ' ' || (atualizado_em = now())::text from public.registros where id = pg_temp.rid(10)),
  (select valor from guarda where chave = 'v10') || ' true',
  'autoria anulada: a versão não sobe e atualizado_em marca a mudança (DR-16)');
select is(pg_temp.hist(10) || ' ' || pg_temp.hist(11), 'criacao:1 criacao:1,edicao:2',
  'autoria anulada: nenhuma linha nova no histórico');
select is(
  (select count(*)::int from public.registro_alteracoes where registro_id in (pg_temp.rid(10), pg_temp.rid(11), pg_temp.rid(12)) and autor is null),
  4, 'conta removida: o autor das 4 linhas do histórico dela (2 criações, encerramento e exclusão) vira nulo');
select is(
  (select coalesce(excluido_por::text, '-') || ' ' || versao::text || ' ' || (excluido_em is not null)::text || ' ' || (atualizado_em = now())::text
     from public.registros where id = pg_temp.rid(12)),
  '- 2 true true',
  'conta removida: excluido_por do registro que ela excluiu vira nulo, a versão não muda e a exclusão continua');
select is(pg_temp.hist(12), 'criacao:1,exclusao:2', 'conta removida: a anulação de excluido_por não grava histórico');
select is(
  (select count(*)::int from public.registro_alteracoes where registro_id = pg_temp.rid(1) and autor is null),
  0, 'o histórico de outras contas não foi tocado');
select is(
  (select coalesce(criado_por::text, '-') || ' ' || versao::text || ' ' || (atualizado_em = now())::text from public.notas_cuidado where id = pg_temp.nid(10)),
  '- 1 true', 'conta removida: a nota fica com autor nulo, mesma versão e atualizado_em marcado');

-- Autor nulo não é de ninguém (cuidador não edita nem exclui; responsável sim) -------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$select public.excluir_registro(pg_temp.rid(10))$$, '42501', 'sem permissao', 'cuidador não exclui registro de autor removido');
select throws_ok($$select public.excluir_nota(pg_temp.nid(10))$$, '42501', 'sem permissao', 'cuidador não exclui nota de autor removido');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.excluir_registro(pg_temp.rid(10))$$, 'responsável exclui registro de autor removido');
reset role;

-- CASCATA (DR-21) -------------------------------------------------------------------------------
-- Família 2: dois registros no bebê 2 e uma nota sem bebê. Apagar o registro leva o histórico dele.
select pg_temp.eu(4);
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min, criado_por) values
  (pg_temp.rid(20), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000004'),
  (pg_temp.rid(21), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000004'),
  (pg_temp.rid(22), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000004');
update public.registros set nota = 'editado' where id = pg_temp.rid(20);
insert into public.notas_cuidado (id, familia_id, bebe_id, texto) values
  (pg_temp.nid(20), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'Nota do bebê 2'),
  (pg_temp.nid(21), 'ffffffff-0000-4000-8000-000000000002', null, 'Nota da família 2');
select lives_ok($$delete from public.registros where id = pg_temp.rid(22)$$, 'dono apaga um registro (cascata do registro)');
select is((select count(*)::int from public.registro_alteracoes where registro_id = pg_temp.rid(22)), 0,
  'apagar o registro leva o histórico dele (a cascata passa pelo gatilho de imutabilidade)');
select lives_ok($$delete from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000002'$$, 'dono apaga o bebê 2');
select is(
  (select count(*)::int from public.registros where bebe_id = 'bbbbbbbb-0000-4000-8000-000000000002')
  + (select count(*)::int from public.registro_alteracoes where registro_id in (pg_temp.rid(20), pg_temp.rid(21)))
  + (select count(*)::int from public.notas_cuidado where id = pg_temp.nid(20)),
  0, 'apagar o bebê leva registros, histórico e as notas dele');
select is((select count(*)::int from public.notas_cuidado where id = pg_temp.nid(21)), 1, 'a nota da família (sem bebê) fica');
select lives_ok($$delete from public.familias where id = 'ffffffff-0000-4000-8000-000000000002'$$, 'dono apaga a família 2');
select is(
  (select count(*)::int from public.notas_cuidado where familia_id = 'ffffffff-0000-4000-8000-000000000002')
  + (select count(*)::int from public.registro_alteracoes where familia_id = 'ffffffff-0000-4000-8000-000000000002'),
  0, 'apagar a família leva as notas e o histórico');
select pg_temp.reg(30, 1);
select pg_temp.eu(1);
update public.registros set nota = 'x' where id = pg_temp.rid(30);
select lives_ok($$delete from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  'apagar a família 1 com histórico de várias contas passa pela cascata');
select is((select count(*)::int from public.registro_alteracoes where familia_id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'a família 1 não deixa histórico para trás');

-- NOTAS: campos do servidor (ROT-04) ------------------------------------------------------------
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000003', 'Família 3', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.eu(1);
insert into public.notas_cuidado (id, familia_id, texto, versao, criada_em, atualizado_em, excluida_em, excluida_por)
values (pg_temp.nid(40), 'ffffffff-0000-4000-8000-000000000003', 'Texto', 9, '2020-01-01 00:00+00', '2020-01-01 00:00+00',
        '2020-01-01 00:00+00', 'aaaaaaaa-0000-4000-8000-000000000001');
select is(
  (select versao::text || ' ' || (criada_em = now())::text || ' ' || (atualizado_em = now())::text || ' ' || coalesce(excluida_em::text, '-') || ' ' || coalesce(excluida_por::text, '-')
     from public.notas_cuidado where id = pg_temp.nid(40)),
  '1 true true - -', 'nota, insert: versão 1, criada_em e atualizado_em do servidor, exclusão nula');
update public.notas_cuidado set atualizado_em = '2026-01-01 00:00+00' where id = pg_temp.nid(40);
update public.notas_cuidado set texto = 'Texto', destaque_ate = null where id = pg_temp.nid(40);
select is(
  (select versao::text || ' ' || atualizado_em::text from public.notas_cuidado where id = pg_temp.nid(40)),
  '1 2026-01-01 00:00:00+00', 'nota: update sem mudança mantém versão e atualizado_em');
update public.notas_cuidado set texto = 'Texto novo' where id = pg_temp.nid(40);
select is(
  (select versao::text || ' ' || (atualizado_em = now())::text from public.notas_cuidado where id = pg_temp.nid(40)),
  '2 true', 'nota: mudar o texto sobe a versão e marca atualizado_em');
update public.notas_cuidado set destaque_ate = now() + interval '1 day', atualizado_em = '2026-01-01 00:00+00' where id = pg_temp.nid(40);
select is(
  (select versao::text || ' ' || (atualizado_em = '2026-01-01 00:00+00')::text from public.notas_cuidado where id = pg_temp.nid(40)),
  '3 false', 'nota: mudar o destaque sobe a versão e o gatilho marca atualizado_em');
update public.notas_cuidado set versao = 50, criada_em = '2020-01-01 00:00+00' where id = pg_temp.nid(40);
select is(
  (select versao::text || ' ' || (criada_em = now())::text from public.notas_cuidado where id = pg_temp.nid(40)),
  '3 true', 'nota: versão e criada_em enviadas pelo cliente num update são ignoradas');
update public.notas_cuidado set excluida_em = '2020-01-01 00:00+00', atualizado_em = '2026-01-01 00:00+00' where id = pg_temp.nid(40);
select is(
  (select versao::text || ' ' || (excluida_em = now())::text || ' ' || excluida_por::text || ' ' || (atualizado_em = now())::text
     from public.notas_cuidado where id = pg_temp.nid(40)),
  '4 true aaaaaaaa-0000-4000-8000-000000000001 true',
  'nota: exclusão força excluida_em = now() e excluida_por = auth.uid(), sobe a versão e marca atualizado_em');
update public.notas_cuidado set atualizado_em = '2021-05-05 00:00+00' where id = pg_temp.nid(40);
select is(
  (select atualizado_em::text || ' ' || versao::text from public.notas_cuidado where id = pg_temp.nid(40)),
  '2021-05-05 00:00:00+00 4', 'nota: mudança só de atualizado_em fica como veio');

select * from finish();
rollback;
