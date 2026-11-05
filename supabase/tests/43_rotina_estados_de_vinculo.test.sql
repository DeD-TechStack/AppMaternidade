begin;
create extension if not exists pgtap with schema extensions;

select plan(302);

-- Família 1 com um responsável ativo (...01) e um cuidador ativo com validade futura (...02).
-- Contas sem vínculo ativo, uma por papel e por estado (revogado, saiu, vencido):
--   revogado ...11 responsável, ...12 cuidador, ...13 observador;
--   saiu     ...21 responsável, ...22 cuidador, ...23 observador;
--   vencido  ...31 responsável, ...32 cuidador, ...33 observador.
-- Cada conta é autora de um registro (sessão aberta, rid(n)) e de uma nota (nid(n)), então a recusa
-- vem do vínculo e não da autoria.
create function pg_temp.conta(n int) returns uuid language sql immutable as $$
  select ('aaaaaaaa-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;
create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
create function pg_temp.nid(n int) returns uuid language sql immutable as $$
  select ('019b0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

insert into auth.users (id, email)
select pg_temp.conta(n), 'conta' || n || '@exemplo.invalid'
from unnest(array[1, 2, 11, 12, 13, 21, 22, 23, 31, 32, 33]) as n;
insert into public.contas (id, nome_privado)
select pg_temp.conta(n), 'Conta ' || n from unnest(array[1, 2, 11, 12, 13, 21, 22, 23, 31, 32, 33]) as n;
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', pg_temp.conta(1));
insert into public.vinculos (familia_id, conta_id, papel, estado, valido_ate) values
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(1), 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(2), 'cuidador', 'ativo', now() + interval '1 day'),
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(11), 'responsavel', 'revogado', null),
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(12), 'cuidador', 'revogado', null),
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(13), 'observador', 'revogado', null),
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(21), 'responsavel', 'saiu', null),
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(22), 'cuidador', 'saiu', null),
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(23), 'observador', 'saiu', null),
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(31), 'responsavel', 'ativo', now() - interval '1 day'),
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(32), 'cuidador', 'ativo', now() - interval '1 day'),
  ('ffffffff-0000-4000-8000-000000000001', pg_temp.conta(33), 'observador', 'ativo', now() - interval '1 day');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', pg_temp.conta(1));

-- Sessão aberta e nota de cada conta sem vínculo ativo; atualizado_em antigo para denunciar qualquer toque.
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min, criado_por)
select pg_temp.rid(n), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001',
       'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, pg_temp.conta(n)
from unnest(array[11, 12, 13, 21, 22, 23, 31, 32, 33]) as n;
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, detalhes, fuso, deslocamento_min, criado_por)
select pg_temp.rid(n + 100), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001',
       'fralda', '2026-11-01 10:00+00', '{"conteudo": "xixi"}', 'America/Sao_Paulo', -180, pg_temp.conta(n)
from unnest(array[11, 12, 13, 21, 22, 23, 31, 32, 33]) as n;
insert into public.notas_cuidado (id, familia_id, bebe_id, texto, criado_por)
select pg_temp.nid(n), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001',
       'Nota ' || n, pg_temp.conta(n)
from unnest(array[11, 12, 13, 21, 22, 23, 31, 32, 33]) as n;
update public.registros set atualizado_em = '2026-11-01 12:00+00';
update public.notas_cuidado set atualizado_em = '2026-11-01 12:00+00';

-- Instantâneo (md5 da linha inteira, com versao e atualizado_em) para provar que o negado não tocou nada.
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
create function pg_temp.nao_existe_id(alvo uuid) returns boolean language sql security definer as $$
  select not exists (select 1 from public.registros where id = alvo)
     and not exists (select 1 from public.notas_cuidado where id = alvo);
$$;

-- Bateria: tudo o que uma conta sem vínculo ativo tenta, com o erro exato e a linha intacta.
-- O vínculo decide antes do papel e da autoria: a resposta é a de "inexistente".
create function pg_temp.bateria(n int, rotulo text) returns setof text language plpgsql as $$
begin
  return next is(
    (select count(*)::int from public.registros) + (select count(*)::int from public.notas_cuidado)
      + (select count(*)::int from public.registro_alteracoes),
    0, rotulo || ': não lê registros, notas nem histórico');
  return next is(
    (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-01')),
    0, rotulo || ': registros_do_dia devolve 0 linhas');

  return next throws_ok(
    format($q$select public.gravar_registro(%L, 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(n + 200)),
    'P0002', 'bebe inexistente', rotulo || ': gravar_registro responde bebê inexistente');
  return next ok(pg_temp.nao_existe_id(pg_temp.rid(n + 200)), rotulo || ': nenhum registro foi criado');

  return next throws_ok(
    format($q$select public.gravar_registro(%L, 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(n)),
    'P0002', 'registro inexistente', rotulo || ': reenvio de id existente responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(n)), rotulo || ': o registro do reenvio seguiu intacto');

  return next throws_ok(
    format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(n)),
    'P0002', 'registro inexistente', rotulo || ': editar_registro responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(n)), rotulo || ': editar_registro não tocou o registro');

  return next throws_ok(
    format($q$select public.encerrar_sessao(%L, '2026-11-01 11:00+00')$q$, pg_temp.rid(n)),
    'P0002', 'registro inexistente', rotulo || ': encerrar_sessao responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(n)), rotulo || ': a sessão seguiu aberta e intacta');

  return next throws_ok(
    format($q$select public.excluir_registro(%L)$q$, pg_temp.rid(n)),
    'P0002', 'registro inexistente', rotulo || ': excluir_registro responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(n)), rotulo || ': excluir_registro não tocou o registro');

  return next throws_ok(
    format($q$select public.restaurar_registro(%L)$q$, pg_temp.rid(n)),
    'P0002', 'registro inexistente', rotulo || ': restaurar_registro responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(n)), rotulo || ': restaurar_registro não tocou o registro');

  -- Mesmas operações com uma fralda (pontual): rid(n + 100) é a fralda da conta.
  return next throws_ok(
    format($q$select public.gravar_registro(%L, 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}')$q$, pg_temp.rid(n + 300)),
    'P0002', 'bebe inexistente', rotulo || ': gravar_registro de fralda responde bebê inexistente');
  return next ok(pg_temp.nao_existe_id(pg_temp.rid(n + 300)), rotulo || ': nenhuma fralda foi criada');

  return next throws_ok(
    format($q$select public.gravar_registro(%L, 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}')$q$, pg_temp.rid(n + 100)),
    'P0002', 'registro inexistente', rotulo || ': reenvio de fralda existente responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(n + 100)), rotulo || ': a fralda do reenvio seguiu intacta');

  return next throws_ok(
    format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(n + 100)),
    'P0002', 'registro inexistente', rotulo || ': editar_registro de fralda responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(n + 100)), rotulo || ': editar_registro não tocou a fralda');

  return next throws_ok(
    format($q$select public.excluir_registro(%L)$q$, pg_temp.rid(n + 100)),
    'P0002', 'registro inexistente', rotulo || ': excluir_registro de fralda responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(n + 100)), rotulo || ': excluir_registro não tocou a fralda');

  return next throws_ok(
    format($q$select public.restaurar_registro(%L)$q$, pg_temp.rid(n + 100)),
    'P0002', 'registro inexistente', rotulo || ': restaurar_registro de fralda responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(n + 100)), rotulo || ': restaurar_registro não tocou a fralda');

  return next throws_ok(
    format($q$select public.gravar_nota(%L, 'ffffffff-0000-4000-8000-000000000001', 'Texto')$q$, pg_temp.nid(n + 200)),
    'P0002', 'familia inexistente', rotulo || ': gravar_nota responde família inexistente');
  return next ok(pg_temp.nao_existe_id(pg_temp.nid(n + 200)), rotulo || ': nenhuma nota foi criada');

  return next throws_ok(
    format($q$select public.gravar_nota(%L, 'ffffffff-0000-4000-8000-000000000001', 'Texto')$q$, pg_temp.nid(n)),
    'P0002', 'nota inexistente', rotulo || ': reenvio de nota existente responde nota inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.nid(n)), rotulo || ': a nota do reenvio seguiu intacta');

  return next throws_ok(
    format($q$select public.editar_nota(%L, 'Invasão', null)$q$, pg_temp.nid(n)),
    'P0002', 'nota inexistente', rotulo || ': editar_nota responde nota inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.nid(n)), rotulo || ': editar_nota não tocou a nota');

  return next throws_ok(
    format($q$select public.excluir_nota(%L)$q$, pg_temp.nid(n)),
    'P0002', 'nota inexistente', rotulo || ': excluir_nota responde nota inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.nid(n)), rotulo || ': excluir_nota não tocou a nota');
end;
$$;

select pg_temp.guarda();

set local role authenticated;

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select * from pg_temp.bateria(11, 'responsável revogado');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000012", "role": "authenticated"}';
select * from pg_temp.bateria(12, 'cuidador revogado');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select * from pg_temp.bateria(13, 'observador revogado');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000021", "role": "authenticated"}';
select * from pg_temp.bateria(21, 'responsável que saiu');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000022", "role": "authenticated"}';
select * from pg_temp.bateria(22, 'cuidador que saiu');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000023", "role": "authenticated"}';
select * from pg_temp.bateria(23, 'observador que saiu');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000031", "role": "authenticated"}';
select * from pg_temp.bateria(31, 'responsável vencido');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000032", "role": "authenticated"}';
select * from pg_temp.bateria(32, 'cuidador vencido');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000033", "role": "authenticated"}';
select * from pg_temp.bateria(33, 'observador vencido');

-- Controles: vínculo ativo sem validade e ativo com validade futura gravam normalmente.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select cmp_ok((select count(*)::int from public.registros), '>', 0, 'controle: responsável ativo sem validade lê registros');
select cmp_ok((select count(*)::int from public.registro_alteracoes), '>', 0, 'controle: responsável ativo sem validade lê o histórico');
select cmp_ok((select count(*)::int from public.notas_cuidado), '>', 0, 'controle: responsável ativo sem validade lê notas');
select lives_ok(
  $$select public.gravar_registro(pg_temp.rid(301), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$,
  'controle: responsável ativo sem validade grava sono');
select lives_ok(
  $$select public.gravar_registro(pg_temp.rid(303), 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}')$$,
  'controle: responsável ativo sem validade grava fralda');
select is(public.encerrar_sessao(pg_temp.rid(301), '2026-11-01 12:00+00'), '2026-11-01 12:00+00'::timestamptz,
  'controle: responsável ativo sem validade encerra o sono');
select lives_ok(
  $$select public.gravar_nota(pg_temp.nid(301), 'ffffffff-0000-4000-8000-000000000001', 'Nota do controle')$$,
  'controle: responsável ativo sem validade grava nota');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select cmp_ok((select count(*)::int from public.registros), '>', 0, 'controle: cuidador ativo com validade futura lê registros');
select cmp_ok((select count(*)::int from public.registro_alteracoes), '>', 0, 'controle: cuidador ativo com validade futura lê o histórico');
select cmp_ok((select count(*)::int from public.notas_cuidado), '>', 0, 'controle: cuidador ativo com validade futura lê notas');
select lives_ok(
  $$select public.gravar_registro(pg_temp.rid(302), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$,
  'controle: cuidador ativo com validade futura grava sono');
select lives_ok(
  $$select public.gravar_registro(pg_temp.rid(304), 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}')$$,
  'controle: cuidador ativo com validade futura grava fralda');
select is(public.encerrar_sessao(pg_temp.rid(302), '2026-11-01 12:00+00'), '2026-11-01 12:00+00'::timestamptz,
  'controle: cuidador ativo com validade futura encerra o sono');
select lives_ok(
  $$select public.gravar_nota(pg_temp.nid(302), 'ffffffff-0000-4000-8000-000000000001', 'Nota do controle')$$,
  'controle: cuidador ativo com validade futura grava nota');

reset role;

select * from finish();
rollback;
