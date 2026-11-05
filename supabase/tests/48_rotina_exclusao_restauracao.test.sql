begin;
create extension if not exists pgtap with schema extensions;

select plan(44);

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

-- Registro de fixture (sono fechado das 10:00 às 11:00 UTC, ou aberto), criado por `autor`.
-- atualizado_em antigo para denunciar qualquer toque.
create function pg_temp.reg(n int, autor int, aberta boolean default false, tipo public.tipo_registro default 'sono')
returns void language sql as $$
  insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, detalhes, fuso, deslocamento_min, criado_por, atualizado_em)
  values (pg_temp.rid(n), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', tipo,
          '2026-11-01 10:00+00', case when tipo = 'sono' and not aberta then '2026-11-01 11:00+00'::timestamptz end,
          case when tipo = 'fralda' then '{"conteudo": "xixi"}'::jsonb else '{}'::jsonb end,
          'America/Sao_Paulo', -180, ('aaaaaaaa-0000-4000-8000-' || lpad(autor::text, 12, '0'))::uuid, '2026-11-01 12:00+00');
$$;

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

select pg_temp.reg(1, 2);                       -- C: excluído e restaurado pelo R
select pg_temp.reg(2, 2, false, 'fralda');      -- C: excluído pelo R, restaurado pelo próprio C
select pg_temp.reg(3, 1, false, 'fralda');      -- R: excluído pelo R, o C não restaura
select pg_temp.reg(4, 2);                       -- C: 30 dias exatos
select pg_temp.reg(5, 2);                       -- C: 30 dias e 1 segundo
select pg_temp.reg(6, 2);                       -- C: nunca excluído
select pg_temp.reg(7, 2, true);                 -- C: sessão em andamento, descartada
select pg_temp.reg(8, 2);                       -- C: excluir, restaurar, excluir
select pg_temp.reg(9, 2);                       -- C: 29 dias e 23 horas
select pg_temp.reg(10, 2);                      -- C: 29 dias
select pg_temp.reg(11, 2);                      -- C: 31 dias

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Exclusão lógica ---------------------------------------------------------------------------------
select lives_ok($$select public.excluir_registro(pg_temp.rid(1))$$, 'responsável exclui o registro do cuidador');
select is(
  (select (excluido_em = now())::text || ' ' || excluido_por::text || ' ' || versao::text || ' ' || (atualizado_em = now())::text
     from public.registros where id = pg_temp.rid(1)),
  'true aaaaaaaa-0000-4000-8000-000000000001 2 true',
  'exclusão grava excluido_em = now(), excluido_por, sobe a versão e marca atualizado_em (DR-16)');
select is(pg_temp.hist(1), 'criacao:1,exclusao:2', 'a exclusão entra no histórico');

select pg_temp.guarda();
select lives_ok($$select public.excluir_registro(pg_temp.rid(1))$$, 'excluir de novo não dá erro (reenvio)');
select ok(pg_temp.intacto(1), 'excluir de novo não muda nada (versão, excluido_em e atualizado_em)');
select is(pg_temp.hist(1), 'criacao:1,exclusao:2', 'excluir de novo não grava histórico');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  (select count(*)::int from public.registros where id = pg_temp.rid(1) and excluido_em is not null),
  1, 'o excluído continua legível pelo select (a fila offline e a lixeira leem a marca)');
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-01') where id = pg_temp.rid(1)),
  0, 'o excluído não aparece em registros_do_dia');

-- Restauração -------------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.restaurar_registro(pg_temp.rid(1))$$, 'responsável restaura o registro do cuidador');
select is(
  (select coalesce(excluido_em::text, '-') || ' ' || coalesce(excluido_por::text, '-') || ' ' || versao::text || ' ' || (atualizado_em = now())::text
     from public.registros where id = pg_temp.rid(1)),
  '- - 3 true', 'restauração limpa excluido_em e excluido_por, sobe a versão e marca atualizado_em');
select is(pg_temp.hist(1), 'criacao:1,exclusao:2,restauracao:3', 'a restauração entra no histórico');
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-01') where id = pg_temp.rid(1)),
  1, 'o restaurado volta a aparecer em registros_do_dia');

select pg_temp.guarda();
select lives_ok($$select public.restaurar_registro(pg_temp.rid(1))$$, 'restaurar um registro que não está excluído não dá erro');
select ok(pg_temp.intacto(1), 'restaurar o que não está excluído não muda nada');
select lives_ok($$select public.restaurar_registro(pg_temp.rid(6))$$, 'restaurar um registro nunca excluído não dá erro');
select ok(pg_temp.intacto(6), 'o registro nunca excluído seguiu intacto');

-- "Próprio" é quem criou, inclusive na restauração ------------------------------------------------
select lives_ok($$select public.excluir_registro(pg_temp.rid(2))$$, 'responsável exclui a fralda do cuidador');
select lives_ok($$select public.excluir_registro(pg_temp.rid(3))$$, 'responsável exclui a própria fralda');
select pg_temp.guarda();
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.restaurar_registro(pg_temp.rid(2))$$, 'cuidador restaura o próprio registro, mesmo excluído pelo responsável');
select throws_ok($$select public.restaurar_registro(pg_temp.rid(3))$$, '42501', 'sem permissao', 'cuidador não restaura o registro do responsável');
select ok(pg_temp.intacto(3), 'o registro do responsável seguiu excluído e intacto');
select throws_ok(
  $$select public.editar_registro(pg_temp.rid(3), '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'x', 'America/Sao_Paulo', -180)$$,
  '42501', 'sem permissao', 'cuidador não edita o registro do responsável (o papel vem antes de "registro excluido")');

-- Prazo de restauração: 30 dias contados de excluido_em (DR-08) -----------------------------------
select lives_ok($$select public.excluir_registro(pg_temp.rid(4))$$, 'cuidador exclui o registro 4');
select lives_ok($$select public.excluir_registro(pg_temp.rid(5))$$, 'cuidador exclui o registro 5');
select lives_ok($$select public.excluir_registro(pg_temp.rid(9))$$, 'cuidador exclui o registro 9');
select lives_ok($$select public.excluir_registro(pg_temp.rid(10))$$, 'cuidador exclui o registro 10');
select lives_ok($$select public.excluir_registro(pg_temp.rid(11))$$, 'cuidador exclui o registro 11');
reset role;
-- excluído de um valor para outro: o dono recua a data de exclusão (ROT-03, passo 6).
update public.registros set excluido_em = now() - interval '30 days' where id = pg_temp.rid(4);
update public.registros set excluido_em = now() - interval '30 days 1 second' where id = pg_temp.rid(5);
update public.registros set excluido_em = now() - interval '29 days 23 hours' where id = pg_temp.rid(9);
update public.registros set excluido_em = now() - interval '29 days' where id = pg_temp.rid(10);
update public.registros set excluido_em = now() - interval '31 days' where id = pg_temp.rid(11);
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.restaurar_registro(pg_temp.rid(4))$$, 'exatamente 30 dias depois ainda se restaura');
select lives_ok($$select public.restaurar_registro(pg_temp.rid(9))$$, '29 dias e 23 horas depois se restaura');
select lives_ok($$select public.restaurar_registro(pg_temp.rid(10))$$, '29 dias depois se restaura');
select throws_ok($$select public.restaurar_registro(pg_temp.rid(5))$$, 'P0001', 'prazo de restauracao encerrado',
  '30 dias e 1 segundo depois não se restaura mais');
select ok(pg_temp.intacto(5), 'o registro fora do prazo seguiu excluído e intacto');
select throws_ok($$select public.restaurar_registro(pg_temp.rid(11))$$, 'P0001', 'prazo de restauracao encerrado',
  '31 dias depois não se restaura mais');
select ok(pg_temp.intacto(11), 'o registro de 31 dias seguiu excluído e intacto');
select is(
  (select count(*)::int from public.registros
    where id in (pg_temp.rid(4), pg_temp.rid(5), pg_temp.rid(9), pg_temp.rid(10), pg_temp.rid(11)) and excluido_em is null),
  3, 'só os três dentro do prazo (29 dias, 29d23h e 30 dias) voltaram');
select is(
  (select string_agg(right(id::text, 2), ',' order by id) from public.registros
    where excluido_em is not null and now() - excluido_em <= interval '30 days' and id in (pg_temp.rid(3), pg_temp.rid(5))),
  '03', 'a lixeira (excluídos dentro do prazo) é um select comum: só o 3 está nela, o 5 já passou do prazo');

-- Descartar uma sessão em andamento e voltar atrás -------------------------------------------------
select lives_ok($$select public.excluir_registro(pg_temp.rid(7))$$, 'cuidador descarta a sessão em andamento');
select lives_ok($$select public.restaurar_registro(pg_temp.rid(7))$$, 'cuidador restaura a sessão descartada');
select is(
  (select coalesce(fim::text, 'aberta') || ' ' || (excluido_em is null)::text || ' ' || versao::text from public.registros where id = pg_temp.rid(7)),
  'aberta true 3', 'a sessão restaurada volta em andamento (sem fim)');

-- Vários ciclos ------------------------------------------------------------------------------------
select public.excluir_registro(pg_temp.rid(8));
select public.restaurar_registro(pg_temp.rid(8));
select public.excluir_registro(pg_temp.rid(8));
select is(pg_temp.hist(8), 'criacao:1,exclusao:2,restauracao:3,exclusao:4', 'excluir, restaurar e excluir de novo: 4 versões no histórico');
select is((select versao from public.registros where id = pg_temp.rid(8)), 4, 'a versão acompanha os ciclos');

-- Registro inexistente e registro excluído ----------------------------------------------------------
select throws_ok($$select public.excluir_registro(pg_temp.rid(999))$$, 'P0002', 'registro inexistente', 'excluir id que não existe');
select throws_ok($$select public.restaurar_registro(pg_temp.rid(999))$$, 'P0002', 'registro inexistente', 'restaurar id que não existe');
select is(
  (select excluido_em is not null from public.gravar_registro(pg_temp.rid(8), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)),
  true, 'reenviar a gravação de um registro excluído devolve a linha como está (excluída)');

reset role;

select * from finish();
rollback;
