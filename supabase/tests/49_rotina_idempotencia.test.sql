begin;
create extension if not exists pgtap with schema extensions;

select plan(52);

-- Família 1: R (...01) responsável, C (...02) cuidador, O (...03) observador. Bebês b1 (ativo) e b3 (arquivado).
-- Família 2: X (...11) responsável. Reenvio é a gravação repetida pelo mesmo id (C6): nada muda.
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
insert into public.bebes (id, familia_id, nome, nascimento, criado_por, estado) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001', 'ativo'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 3', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001', 'ativo');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
create function pg_temp.nid(n int) returns uuid language sql immutable as $$
  select ('019b0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

create temp table snap (id uuid primary key, h text);
create function pg_temp.guarda() returns void language sql security definer as $$
  delete from pg_temp.snap;
  insert into pg_temp.snap select r.id, md5(r::text) from public.registros r;
  insert into pg_temp.snap select n.id, md5(n::text) from public.notas_cuidado n;
$$;
create function pg_temp.intacto_id(alvo uuid) returns boolean language sql security definer as $$
  select s.h = coalesce(
    (select md5(r::text) from public.registros r where r.id = alvo),
    (select md5(n::text) from public.notas_cuidado n where n.id = alvo))
  from pg_temp.snap s where s.id = alvo;
$$;
create function pg_temp.hist(n int) returns text language sql security definer as $$
  select coalesce(string_agg(operacao::text || ':' || versao::text, ',' order by versao, operacao), '-')
  from public.registro_alteracoes where registro_id = pg_temp.rid(n);
$$;
-- SQLSTATE e mensagem de uma consulta, em texto ("sem erro" se passar).
create function pg_temp.erro(consulta text) returns text language plpgsql as $$
begin
  execute consulta;
  return 'sem erro';
exception when others then
  return sqlstate || ':' || sqlerrm;
end;
$$;
-- Chamadas repetidas da tela: sessão de sono e nota.
create function pg_temp.grava_sono(n int, tipo public.tipo_registro default 'sono', nota text default null, bebe uuid default 'bbbbbbbb-0000-4000-8000-000000000001')
returns public.registros language sql as $$
  select * from public.gravar_registro(pg_temp.rid(n), bebe, tipo, '2026-11-01 10:00+00', 'America/Sao_Paulo', -180,
    case when tipo = 'sono' then '2026-11-01 11:00+00'::timestamptz end,
    case when tipo = 'fralda' then '{"conteudo": "coco"}'::jsonb else '{}'::jsonb end, nota);
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

-- gravar_registro -------------------------------------------------------------------------------
select set_config('teste.primeira', (select r::text from pg_temp.grava_sono(1) r), true);
select is(
  (select r::text from pg_temp.grava_sono(1) r), current_setting('teste.primeira'),
  'reenvio com os mesmos dados devolve a mesma linha');
select pg_temp.guarda();
select is(
  (select tipo::text || ' ' || coalesce(nota, '-') from pg_temp.grava_sono(1, 'fralda', 'outra nota') ),
  'sono -', 'reenvio com dados diferentes devolve a linha como está (tipo e nota originais)');
select ok(pg_temp.intacto_id(pg_temp.rid(1)), 'reenvio com dados diferentes não muda nada (versão e atualizado_em)');
select lives_ok($$select pg_temp.grava_sono(1)$$, 'terceiro reenvio');
select lives_ok($$select pg_temp.grava_sono(1)$$, 'quarto reenvio');
select lives_ok($$select pg_temp.grava_sono(1)$$, 'quinto reenvio');
select is(
  (select count(*)::int from public.registros where id = pg_temp.rid(1)), 1, 'cinco gravações do mesmo id deixam uma linha só');
select is((select pg_temp.hist(1)), 'criacao:1', 'cinco gravações do mesmo id deixam uma linha de criação só');

-- Reenvio não escreve: não confere papel nem bebê. -----------------------------------------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select lives_ok($$select pg_temp.grava_sono(1)$$, 'o observador reenvia sem erro (a função não escreve)');
select ok(pg_temp.intacto_id(pg_temp.rid(1)), 'o reenvio do observador não mudou nada');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select pg_temp.grava_sono(1)$$, 'o cuidador reenvia o registro do responsável sem erro');
select ok(pg_temp.intacto_id(pg_temp.rid(1)), 'o reenvio do cuidador não mudou nada');

-- Reenvio em bebê arquivado devolve a linha (não escreve). ---------------------------------------
select lives_ok($$select pg_temp.grava_sono(2, 'sono', null, 'bbbbbbbb-0000-4000-8000-000000000003')$$, 'cuidador grava no bebê 3 (ainda ativo)');
reset role;
update public.bebes set estado = 'arquivado' where id = 'bbbbbbbb-0000-4000-8000-000000000003';
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select pg_temp.grava_sono(2, 'sono', null, 'bbbbbbbb-0000-4000-8000-000000000003')$$, 'reenvio em bebê arquivado devolve a linha, sem erro');
select ok(pg_temp.intacto_id(pg_temp.rid(2)), 'o reenvio em bebê arquivado não mudou nada');

-- Reenvio de id de outra família (C6) -----------------------------------------------------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select pg_temp.guarda();
select throws_ok($$select pg_temp.grava_sono(1)$$, 'P0002', 'registro inexistente', 'id de registro de outra família responde registro inexistente');
select ok(pg_temp.intacto_id(pg_temp.rid(1)), 'o registro da outra família seguiu intacto');
select throws_ok($$select public.encerrar_sessao(pg_temp.rid(999), '2026-11-01 11:00+00')$$, 'P0002', 'registro inexistente',
  'id que não existe responde registro inexistente');
select is(
  pg_temp.erro($$select pg_temp.grava_sono(1)$$),
  pg_temp.erro($$select public.encerrar_sessao(pg_temp.rid(999), '2026-11-01 11:00+00')$$),
  'id de outra família e id inexistente dão o mesmo SQLSTATE e a mesma mensagem (não se distingue)');

-- editar_registro: repetir com os mesmos valores não muda a versão nem grava histórico. -------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  (select versao::text from public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', '2026-11-01 11:00+00', '{}', 'primeira', 'America/Sao_Paulo', -180)),
  '2', 'editar_registro com valor novo sobe a versão para 2');
select pg_temp.guarda();
select is(
  (select versao::text from public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', '2026-11-01 11:00+00', '{}', 'primeira', 'America/Sao_Paulo', -180)),
  '2', 'repetir a edição com os mesmos valores não sobe a versão');
select ok(pg_temp.intacto_id(pg_temp.rid(1)), 'repetir a edição não muda nada (nem atualizado_em)');
select is((select pg_temp.hist(1)), 'criacao:1,edicao:2', 'repetir a edição não grava histórico');
select is(
  (select versao::text from public.editar_registro(pg_temp.rid(1), '2026-11-01 10:00+00', '2026-11-01 11:00+00', '{}', 'segunda', 'America/Sao_Paulo', -180)),
  '3', 'uma edição realmente nova sobe a versão para 3');

-- excluir, restaurar e encerrar repetidos ----------------------------------------------------------
select public.excluir_registro(pg_temp.rid(1));
select pg_temp.guarda();
select public.excluir_registro(pg_temp.rid(1));
select ok(pg_temp.intacto_id(pg_temp.rid(1)), 'excluir duas vezes: a segunda não muda nada');
select public.restaurar_registro(pg_temp.rid(1));
select pg_temp.guarda();
select public.restaurar_registro(pg_temp.rid(1));
select ok(pg_temp.intacto_id(pg_temp.rid(1)), 'restaurar duas vezes: a segunda não muda nada');
select is((select pg_temp.hist(1)), 'criacao:1,edicao:2,edicao:3,exclusao:4,restauracao:5', 'o histórico tem um passo para cada mudança real');

-- gravar_nota e editar_nota ------------------------------------------------------------------------
select set_config('teste.nota', (select n::text from public.gravar_nota(pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000001', 'Texto original') n), true);
select pg_temp.guarda();
select is(
  (select n::text from public.gravar_nota(pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000001', 'Texto original') n),
  current_setting('teste.nota'), 'reenvio de nota com os mesmos dados devolve a mesma linha');
select is(
  (select texto from public.gravar_nota(pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000001', 'Texto diferente')),
  'Texto original', 'reenvio de nota com outro texto devolve a nota como está');
select ok(pg_temp.intacto_id(pg_temp.nid(1)), 'o reenvio de nota não mudou nada');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select lives_ok($$select public.gravar_nota(pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000001', 'Texto original')$$, 'o observador reenvia nota sem erro');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select throws_ok($$select public.gravar_nota(pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000002', 'Texto original')$$, 'P0002', 'nota inexistente',
  'id de nota de outra família responde nota inexistente');
select ok(pg_temp.intacto_id(pg_temp.nid(1)), 'a nota da outra família seguiu intacta');
select throws_ok($$select public.editar_nota(pg_temp.nid(999), 'Texto', null)$$, 'P0002', 'nota inexistente',
  'id de nota que não existe responde nota inexistente');
select is(
  pg_temp.erro($$select public.gravar_nota(pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000002', 'Texto original')$$),
  pg_temp.erro($$select public.editar_nota(pg_temp.nid(999), 'Texto', null)$$),
  'id de nota de outra família e id de nota inexistente dão o mesmo SQLSTATE e a mesma mensagem');
reset role;
select is(
  (select count(*)::int from public.registros where familia_id = 'ffffffff-0000-4000-8000-000000000002')
  + (select count(*)::int from public.notas_cuidado where familia_id = 'ffffffff-0000-4000-8000-000000000002'),
  0, 'depois das tentativas de X com ids da família 1, nada entrou na família 2');
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.editar_nota(pg_temp.nid(1), 'Texto editado', null);
select pg_temp.guarda();
select is(
  (select versao::text from public.editar_nota(pg_temp.nid(1), 'Texto editado', null)),
  '2', 'repetir editar_nota com os mesmos valores não sobe a versão');
select ok(pg_temp.intacto_id(pg_temp.nid(1)), 'repetir editar_nota não muda nada');

-- Reenvio da criação por quem perdeu o vínculo depois de gravar (revogado, saiu, vencido): inexistente.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select pg_temp.grava_sono(40)$$, 'cuidador grava um sono (antes de perder o vínculo)');
select lives_ok($$select public.gravar_nota(pg_temp.nid(40), 'ffffffff-0000-4000-8000-000000000001', 'Nota do cuidador')$$, 'cuidador grava uma nota (antes de perder o vínculo)');
reset role;
select pg_temp.guarda();

update public.vinculos set estado = 'revogado' where conta_id = 'aaaaaaaa-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$select pg_temp.grava_sono(40)$$, 'P0002', 'registro inexistente', 'vínculo revogado: reenvio da criação do sono responde registro inexistente');
select ok(pg_temp.intacto_id(pg_temp.rid(40)), 'vínculo revogado: o sono seguiu intacto');
select throws_ok($$select public.gravar_nota(pg_temp.nid(40), 'ffffffff-0000-4000-8000-000000000001', 'Nota do cuidador')$$, 'P0002', 'nota inexistente', 'vínculo revogado: reenvio da criação da nota responde nota inexistente');
select ok(pg_temp.intacto_id(pg_temp.nid(40)), 'vínculo revogado: a nota seguiu intacta');
reset role;

update public.vinculos set estado = 'saiu' where conta_id = 'aaaaaaaa-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$select pg_temp.grava_sono(40)$$, 'P0002', 'registro inexistente', 'vínculo que saiu: reenvio da criação do sono responde registro inexistente');
select ok(pg_temp.intacto_id(pg_temp.rid(40)), 'vínculo que saiu: o sono seguiu intacto');
select throws_ok($$select public.gravar_nota(pg_temp.nid(40), 'ffffffff-0000-4000-8000-000000000001', 'Nota do cuidador')$$, 'P0002', 'nota inexistente', 'vínculo que saiu: reenvio da criação da nota responde nota inexistente');
select ok(pg_temp.intacto_id(pg_temp.nid(40)), 'vínculo que saiu: a nota seguiu intacta');
reset role;

update public.vinculos set estado = 'ativo', valido_ate = now() - interval '1 day' where conta_id = 'aaaaaaaa-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$select pg_temp.grava_sono(40)$$, 'P0002', 'registro inexistente', 'vínculo vencido: reenvio da criação do sono responde registro inexistente');
select ok(pg_temp.intacto_id(pg_temp.rid(40)), 'vínculo vencido: o sono seguiu intacto');
select throws_ok($$select public.gravar_nota(pg_temp.nid(40), 'ffffffff-0000-4000-8000-000000000001', 'Nota do cuidador')$$, 'P0002', 'nota inexistente', 'vínculo vencido: reenvio da criação da nota responde nota inexistente');
select ok(pg_temp.intacto_id(pg_temp.nid(40)), 'vínculo vencido: a nota seguiu intacta');

reset role;

select * from finish();
rollback;
