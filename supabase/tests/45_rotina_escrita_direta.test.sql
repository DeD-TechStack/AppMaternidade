begin;
create extension if not exists pgtap with schema extensions;

select plan(98);

-- Família 1: R (...01) responsável, C (...02) cuidador, O (...03) observador.
-- X (...11) é responsável de outra família (sem vínculo na família 1).
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
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
create function pg_temp.nid(n int) returns uuid language sql immutable as $$
  select ('019b0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min, criado_por) values
  (pg_temp.rid(1), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000002');
insert into public.notas_cuidado (id, familia_id, texto, criado_por) values
  (pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000001', 'Nota 1', 'aaaaaaaa-0000-4000-8000-000000000002');
update public.registros set atualizado_em = '2026-11-01 12:00+00';
update public.notas_cuidado set atualizado_em = '2026-11-01 12:00+00';

-- Instantâneo (md5 da linha inteira, com versao e atualizado_em) e contagens das 3 tabelas.
create temp table snap (id uuid primary key, h text);
create function pg_temp.guarda() returns void language sql security definer as $$
  delete from pg_temp.snap;
  insert into pg_temp.snap select r.id, md5(r::text) from public.registros r;
  insert into pg_temp.snap select n.id, md5(n::text) from public.notas_cuidado n;
  select set_config('teste.contagem', (
    (select count(*) from public.registros) || ',' || (select count(*) from public.notas_cuidado) || ','
    || (select count(*) from public.registro_alteracoes))::text, true);
$$;
create function pg_temp.intacto_id(alvo uuid) returns boolean language sql security definer as $$
  select s.h = coalesce(
    (select md5(r::text) from public.registros r where r.id = alvo),
    (select md5(n::text) from public.notas_cuidado n where n.id = alvo))
  from pg_temp.snap s where s.id = alvo;
$$;
create function pg_temp.contagem_igual() returns boolean language sql security definer as $$
  select current_setting('teste.contagem') = (
    (select count(*) from public.registros) || ',' || (select count(*) from public.notas_cuidado) || ','
    || (select count(*) from public.registro_alteracoes))::text;
$$;

-- Bateria: insert, update e delete diretos nas 3 tabelas dão 42501 para o papel, sem alterar nada.
create function pg_temp.bateria_direta(conta uuid, rotulo text) returns setof text language plpgsql as $$
begin
  return next throws_ok(
    format($q$insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min, criado_por)
      values (%L, 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, %L)$q$, pg_temp.rid(900), conta),
    '42501', 'permission denied for table registros', rotulo || ': insert direto em registros');
  return next throws_ok(
    $q$update public.registros set nota = 'x' where id = '019a0000-0000-7000-8000-000000000001'$q$,
    '42501', 'permission denied for table registros', rotulo || ': update direto em registros');
  return next throws_ok(
    $q$delete from public.registros where id = '019a0000-0000-7000-8000-000000000001'$q$,
    '42501', 'permission denied for table registros', rotulo || ': delete direto em registros');
  return next throws_ok(
    format($q$insert into public.registro_alteracoes (registro_id, familia_id, operacao, autor, versao)
      values (%L, 'ffffffff-0000-4000-8000-000000000001', 'edicao', %L, 2)$q$, pg_temp.rid(1), conta),
    '42501', 'permission denied for table registro_alteracoes', rotulo || ': insert direto em registro_alteracoes');
  return next throws_ok(
    $q$update public.registro_alteracoes set versao = 9$q$,
    '42501', 'permission denied for table registro_alteracoes', rotulo || ': update direto em registro_alteracoes');
  return next throws_ok(
    $q$delete from public.registro_alteracoes$q$,
    '42501', 'permission denied for table registro_alteracoes', rotulo || ': delete direto em registro_alteracoes');
  return next throws_ok(
    format($q$insert into public.notas_cuidado (id, familia_id, texto, criado_por)
      values (%L, 'ffffffff-0000-4000-8000-000000000001', 'Texto', %L)$q$, pg_temp.nid(900), conta),
    '42501', 'permission denied for table notas_cuidado', rotulo || ': insert direto em notas_cuidado');
  return next throws_ok(
    $q$update public.notas_cuidado set texto = 'x' where id = '019b0000-0000-7000-8000-000000000001'$q$,
    '42501', 'permission denied for table notas_cuidado', rotulo || ': update direto em notas_cuidado');
  return next throws_ok(
    $q$delete from public.notas_cuidado where id = '019b0000-0000-7000-8000-000000000001'$q$,
    '42501', 'permission denied for table notas_cuidado', rotulo || ': delete direto em notas_cuidado');
  -- Colunas do servidor (invariante 6): nem no insert, nem no update.
  return next throws_ok(
    format($q$insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min, criado_por,
        versao, recebido_em, atualizado_em, excluido_em)
      values (%L, 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00',
        'America/Sao_Paulo', -180, %L, 5, now(), now(), now())$q$, pg_temp.rid(901), conta),
    '42501', 'permission denied for table registros', rotulo || ': insert direto em registros com versao, recebido_em, atualizado_em e excluido_em');
  return next throws_ok(
    format($q$insert into public.notas_cuidado (id, familia_id, texto, criado_por, criada_em, versao)
      values (%L, 'ffffffff-0000-4000-8000-000000000001', 'Texto', %L, now(), 5)$q$, pg_temp.nid(901), conta),
    '42501', 'permission denied for table notas_cuidado', rotulo || ': insert direto em notas_cuidado com criada_em e versao');
  return next throws_ok(
    $q$update public.registros set versao = 9$q$,
    '42501', 'permission denied for table registros', rotulo || ': update direto de versao em registros');
  return next throws_ok(
    $q$update public.registros set atualizado_em = now()$q$,
    '42501', 'permission denied for table registros', rotulo || ': update direto de atualizado_em em registros');
  return next throws_ok(
    $q$update public.notas_cuidado set versao = 9$q$,
    '42501', 'permission denied for table notas_cuidado', rotulo || ': update direto de versao em notas_cuidado');
  return next throws_ok(
    $q$update public.notas_cuidado set atualizado_em = now()$q$,
    '42501', 'permission denied for table notas_cuidado', rotulo || ': update direto de atualizado_em em notas_cuidado');
  -- insert ... on conflict (id) do nothing também exige o privilégio de insert.
  return next throws_ok(
    format($q$insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min, criado_por)
      values (%L, 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, %L)
      on conflict (id) do nothing$q$, pg_temp.rid(1), conta),
    '42501', 'permission denied for table registros', rotulo || ': insert ... on conflict do nothing em registros');
  return next throws_ok(
    format($q$insert into public.registro_alteracoes (id, registro_id, familia_id, operacao, autor, versao)
      values (gen_random_uuid(), %L, 'ffffffff-0000-4000-8000-000000000001', 'edicao', %L, 2)
      on conflict (id) do nothing$q$, pg_temp.rid(1), conta),
    '42501', 'permission denied for table registro_alteracoes', rotulo || ': insert ... on conflict do nothing em registro_alteracoes');
  return next throws_ok(
    format($q$insert into public.notas_cuidado (id, familia_id, texto, criado_por)
      values (%L, 'ffffffff-0000-4000-8000-000000000001', 'Texto', %L)
      on conflict (id) do nothing$q$, pg_temp.nid(1), conta),
    '42501', 'permission denied for table notas_cuidado', rotulo || ': insert ... on conflict do nothing em notas_cuidado');
  return next ok(pg_temp.intacto_id(pg_temp.rid(1)), rotulo || ': o registro seguiu intacto');
  return next ok(pg_temp.intacto_id(pg_temp.nid(1)), rotulo || ': a nota seguiu intacta');
  return next ok(pg_temp.contagem_igual(), rotulo || ': nenhuma linha foi criada nem apagada nas 3 tabelas');
end;
$$;

select pg_temp.guarda();

set local role authenticated;

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select * from pg_temp.bateria_direta('aaaaaaaa-0000-4000-8000-000000000001', 'responsável');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select * from pg_temp.bateria_direta('aaaaaaaa-0000-4000-8000-000000000002', 'cuidador');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select * from pg_temp.bateria_direta('aaaaaaaa-0000-4000-8000-000000000003', 'observador');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select * from pg_temp.bateria_direta('aaaaaaaa-0000-4000-8000-000000000011', 'conta de outra família');

-- Autoria: o servidor grava auth.uid(); nenhuma função recebe a conta por parâmetro (DR-06).
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.gravar_registro(pg_temp.rid(2), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$, 'responsável grava uma sessão aberta');
select lives_ok($$select public.gravar_nota(pg_temp.nid(2), 'ffffffff-0000-4000-8000-000000000001', 'Nota do R')$$, 'responsável grava uma nota');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.gravar_registro(pg_temp.rid(3), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$, 'cuidador grava uma sessão aberta');
select lives_ok($$select public.encerrar_sessao(pg_temp.rid(2), '2026-11-01 11:00+00')$$, 'cuidador encerra a sessão do responsável');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.excluir_registro(pg_temp.rid(3))$$, 'responsável exclui o registro do cuidador');

reset role;

select is(
  (select criado_por::text from public.registros where id = pg_temp.rid(2)),
  'aaaaaaaa-0000-4000-8000-000000000001', 'criado_por é o responsável que chamou');
select is(
  (select criado_por::text from public.registros where id = pg_temp.rid(3)),
  'aaaaaaaa-0000-4000-8000-000000000002', 'criado_por é o cuidador que chamou');
select is(
  (select encerrado_por::text from public.registros where id = pg_temp.rid(2)),
  'aaaaaaaa-0000-4000-8000-000000000002', 'encerrado_por é o cuidador que encerrou, não o autor');
select is(
  (select excluido_por::text from public.registros where id = pg_temp.rid(3)),
  'aaaaaaaa-0000-4000-8000-000000000001', 'excluido_por é o responsável que excluiu');
select is(
  (select criado_por::text from public.notas_cuidado where id = pg_temp.nid(2)),
  'aaaaaaaa-0000-4000-8000-000000000001', 'a nota gravada leva o autor que chamou');
select is(
  (select string_agg(operacao::text || ':' || autor::text, ',' order by versao, operacao)
     from public.registro_alteracoes where registro_id = pg_temp.rid(2)),
  'criacao:aaaaaaaa-0000-4000-8000-000000000001,edicao:aaaaaaaa-0000-4000-8000-000000000002',
  'o histórico guarda o autor de cada passo (criação pelo responsável, encerramento pelo cuidador)');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('gravar_registro', 'editar_registro', 'encerrar_sessao', 'excluir_registro',
                        'restaurar_registro', 'registros_do_dia', 'gravar_nota', 'editar_nota', 'excluir_nota')
      and p.proargnames && array['conta', 'conta_id', 'autor', 'usuario', 'criado_por', 'encerrado_por', 'excluido_por']),
  0, 'nenhuma das 9 funções recebe a conta por parâmetro');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('gravar_registro', 'editar_registro', 'encerrar_sessao', 'excluir_registro',
                        'restaurar_registro', 'gravar_nota', 'editar_nota', 'excluir_nota')
      and p.prosecdef and p.proconfig = array['search_path=""']),
  8, 'as 8 funções de escrita são security definer com search_path vazio');
select is(
  (select prosecdef from pg_proc where oid = 'public.registros_do_dia(uuid, date)'::regprocedure),
  false, 'registros_do_dia roda com os direitos de quem chama (security invoker)');

select * from finish();
rollback;
