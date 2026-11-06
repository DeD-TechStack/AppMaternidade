begin;
create extension if not exists pgtap with schema extensions;

select plan(317);

-- Família 1: R1 (...01) responsável, C1 (...02) cuidador, O1 (...03) observador.
-- Família 2: R2 (...11) responsável, C2 (...12) cuidador, O2 (...13) observador.
-- Bebês: b1 (f1), b2 (f2) e b3 (f1, arquivado).
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r1@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'c1@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'o1@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'r2@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000012', 'c2@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000013', 'o2@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R1'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'C1'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'O1'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'R2'),
  ('aaaaaaaa-0000-4000-8000-000000000012', 'C2'),
  ('aaaaaaaa-0000-4000-8000-000000000013', 'O2');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000011');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000011', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000012', 'cuidador'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000013', 'observador');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por, estado) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001', 'ativo'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'Bebê 2', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000011', 'ativo'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 3', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001', 'arquivado');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
create function pg_temp.nid(n int) returns uuid language sql immutable as $$
  select ('019b0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

-- Fixture dos bebês 1 e 2: sessões abertas (1 e 2) e fraldas (101 e 102), notas 1 e 2.
-- Fixture do bebê 3 (arquivado): sono em andamento (10), sono encerrado (11), fralda (14),
-- fralda excluída (15), nota com o bebê (10) e nota sem bebê (11). Tudo do C1 (ou do C2).
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, detalhes, fuso, deslocamento_min, criado_por)
values
  (pg_temp.rid(1), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', null, '{}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000002'),
  (pg_temp.rid(101), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda', '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000002'),
  (pg_temp.rid(2), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'sono', '2026-11-01 10:00+00', null, '{}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000012'),
  (pg_temp.rid(102), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'fralda', '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000012'),
  (pg_temp.rid(10), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000003', 'sono', '2026-11-01 10:00+00', null, '{}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000002'),
  (pg_temp.rid(11), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000003', 'sono', '2026-11-01 10:00+00', '2026-11-01 11:00+00', '{}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000002'),
  (pg_temp.rid(14), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000003', 'fralda', '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000002'),
  (pg_temp.rid(15), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000003', 'fralda', '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000002');
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000002"}', true);
update public.registros set excluido_em = now() where id = pg_temp.rid(15);
insert into public.notas_cuidado (id, familia_id, bebe_id, texto, criado_por) values
  (pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'Nota 1', 'aaaaaaaa-0000-4000-8000-000000000002'),
  (pg_temp.nid(2), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'Nota 2', 'aaaaaaaa-0000-4000-8000-000000000012'),
  (pg_temp.nid(10), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000003', 'Nota 10', 'aaaaaaaa-0000-4000-8000-000000000002');
update public.registros set atualizado_em = '2026-11-01 12:00+00';
update public.notas_cuidado set atualizado_em = '2026-11-01 12:00+00';

-- Chave estrangeira composta (bebe_id, familia_id): vale também para o dono, fora das funções (DR-14).
select throws_ok(
  $$insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min)
    values (pg_temp.rid(500), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002',
            'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$,
  '23503',
  'insert or update on table "registros" violates foreign key constraint "registros_bebe_id_familia_id_fkey"',
  'registro com bebê de outra família é recusado pela chave composta');
select throws_ok(
  $$insert into public.notas_cuidado (id, familia_id, bebe_id, texto)
    values (pg_temp.nid(500), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', 'x')$$,
  '23503',
  'insert or update on table "notas_cuidado" violates foreign key constraint "notas_cuidado_bebe_id_familia_id_fkey"',
  'nota com bebê de outra família é recusada pela chave composta');
select lives_ok(
  $$insert into public.notas_cuidado (id, familia_id, bebe_id, texto, criado_por, atualizado_em)
    values (pg_temp.nid(11), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota da família', 'aaaaaaaa-0000-4000-8000-000000000002', '2026-11-01 12:00+00')$$,
  'nota sem bebê (bebe_id nulo) não depende da chave composta');

-- Instantâneo (md5 da linha inteira, com versao e atualizado_em) para provar que o negado não tocou nada.
-- Hash do conteúdo das 3 tabelas e as contagens delas: guarda() grava, nada_mudou() confere (como dono).
create function pg_temp.hash_tudo() returns text language sql security definer as $$
  select md5(
    (select coalesce(string_agg(r::text, ',' order by id), '') from public.registros r) || '|' ||
    (select coalesce(string_agg(n::text, ',' order by id), '') from public.notas_cuidado n) || '|' ||
    (select coalesce(string_agg(a::text, ',' order by id), '') from public.registro_alteracoes a))
  || ' ' || (select count(*) from public.registros) || ',' || (select count(*) from public.notas_cuidado)
  || ',' || (select count(*) from public.registro_alteracoes);
$$;
create temp table snap (id uuid primary key, h text);
create function pg_temp.guarda() returns void language sql security definer as $$
  delete from pg_temp.snap;
  insert into pg_temp.snap select r.id, md5(r::text) from public.registros r;
  insert into pg_temp.snap select n.id, md5(n::text) from public.notas_cuidado n;
  select set_config('teste.tudo', pg_temp.hash_tudo(), true);
$$;
create function pg_temp.nada_mudou() returns boolean language sql security definer as $$
  select pg_temp.hash_tudo() = current_setting('teste.tudo');
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

-- Bateria entre famílias: a conta tem vínculo ativo na família própria e tenta mexer na outra
-- (sono `r`, fralda `r + 100`, nota `n`, bebê `b`, família `f`). A resposta é "inexistente" e a linha fica intacta.
create function pg_temp.bateria_cruzada(r int, n int, b uuid, f uuid, f_propria uuid, b_proprio uuid, rotulo text)
returns setof text language plpgsql as $$
begin
  return next is(
    (select count(*)::int from public.registros where familia_id = f)
      + (select count(*)::int from public.notas_cuidado where familia_id = f)
      + (select count(*)::int from public.registro_alteracoes where familia_id = f),
    0, rotulo || ': não lê registros, notas nem histórico da outra família');
  return next is(
    (select count(*)::int from public.registros_do_dia(b, '2026-11-01')),
    0, rotulo || ': registros_do_dia do bebê da outra família devolve 0 linhas');

  return next throws_ok(
    format($q$select public.gravar_registro(%L, %L, 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(r + 200), b),
    'P0002', 'bebe inexistente', rotulo || ': gravar_registro (sono) no bebê da outra família responde bebê inexistente');
  return next ok(pg_temp.nao_existe_id(pg_temp.rid(r + 200)), rotulo || ': nenhum sono foi criado');

  return next throws_ok(
    format($q$select public.gravar_registro(%L, %L, 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}')$q$, pg_temp.rid(r + 300), b),
    'P0002', 'bebe inexistente', rotulo || ': gravar_registro (fralda) no bebê da outra família responde bebê inexistente');
  return next ok(pg_temp.nao_existe_id(pg_temp.rid(r + 300)), rotulo || ': nenhuma fralda foi criada');

  return next throws_ok(
    format($q$select public.gravar_registro(%L, %L, 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(r), b),
    'P0002', 'registro inexistente', rotulo || ': reenvio de sono de outra família responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r)), rotulo || ': o sono do reenvio seguiu intacto');

  return next throws_ok(
    format($q$select public.gravar_registro(%L, %L, 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}')$q$, pg_temp.rid(r + 100), b),
    'P0002', 'registro inexistente', rotulo || ': reenvio de fralda de outra família responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r + 100)), rotulo || ': a fralda do reenvio seguiu intacta');

  return next throws_ok(
    format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(r)),
    'P0002', 'registro inexistente', rotulo || ': editar_registro (sono) responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r)), rotulo || ': editar_registro não tocou o sono');

  return next throws_ok(
    format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(r + 100)),
    'P0002', 'registro inexistente', rotulo || ': editar_registro (fralda) responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r + 100)), rotulo || ': editar_registro não tocou a fralda');

  return next throws_ok(
    format($q$select public.encerrar_sessao(%L, '2026-11-01 11:00+00')$q$, pg_temp.rid(r)),
    'P0002', 'registro inexistente', rotulo || ': encerrar_sessao responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r)), rotulo || ': a sessão seguiu aberta e intacta');

  return next throws_ok(
    format($q$select public.excluir_registro(%L)$q$, pg_temp.rid(r)),
    'P0002', 'registro inexistente', rotulo || ': excluir_registro (sono) responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r)), rotulo || ': excluir_registro não tocou o sono');

  return next throws_ok(
    format($q$select public.excluir_registro(%L)$q$, pg_temp.rid(r + 100)),
    'P0002', 'registro inexistente', rotulo || ': excluir_registro (fralda) responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r + 100)), rotulo || ': excluir_registro não tocou a fralda');

  return next throws_ok(
    format($q$select public.restaurar_registro(%L)$q$, pg_temp.rid(r)),
    'P0002', 'registro inexistente', rotulo || ': restaurar_registro (sono) responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r)), rotulo || ': restaurar_registro não tocou o sono');

  return next throws_ok(
    format($q$select public.restaurar_registro(%L)$q$, pg_temp.rid(r + 100)),
    'P0002', 'registro inexistente', rotulo || ': restaurar_registro (fralda) responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r + 100)), rotulo || ': restaurar_registro não tocou a fralda');

  return next throws_ok(
    format($q$select public.gravar_nota(%L, %L, 'Texto')$q$, pg_temp.nid(n + 200), f),
    'P0002', 'familia inexistente', rotulo || ': gravar_nota na outra família responde família inexistente');
  return next ok(pg_temp.nao_existe_id(pg_temp.nid(n + 200)), rotulo || ': nenhuma nota foi criada na outra família');

  return next throws_ok(
    format($q$select public.gravar_nota(%L, %L, 'Texto', %L)$q$, pg_temp.nid(n + 300), f_propria, b),
    'P0002', 'bebe inexistente', rotulo || ': gravar_nota com bebê da outra família responde bebê inexistente');
  return next ok(pg_temp.nao_existe_id(pg_temp.nid(n + 300)), rotulo || ': nenhuma nota foi criada com bebê alheio');

  return next throws_ok(
    format($q$select public.gravar_nota(%L, %L, 'Texto')$q$, pg_temp.nid(n), f_propria),
    'P0002', 'nota inexistente', rotulo || ': reenvio de nota de outra família responde nota inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.nid(n)), rotulo || ': a nota do reenvio seguiu intacta');

  return next throws_ok(
    format($q$select public.editar_nota(%L, 'Invasão', null)$q$, pg_temp.nid(n)),
    'P0002', 'nota inexistente', rotulo || ': editar_nota responde nota inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.nid(n)), rotulo || ': editar_nota não tocou a nota');

  return next throws_ok(
    format($q$select public.excluir_nota(%L)$q$, pg_temp.nid(n)),
    'P0002', 'nota inexistente', rotulo || ': excluir_nota responde nota inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.nid(n)), rotulo || ': excluir_nota não tocou a nota');

  -- Variação: id de registro alheio com o bebê VÁLIDO da própria família (colisão de id, C6).
  return next throws_ok(
    format($q$select public.gravar_registro(%L, %L, 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(r), b_proprio),
    'P0002', 'registro inexistente', rotulo || ': id de sono alheio com o bebê da própria família responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r)), rotulo || ': o sono alheio seguiu intacto (colisão com bebê próprio)');
  return next ok(pg_temp.nada_mudou(), rotulo || ': nada foi criado na família própria (colisão de sono)');
  return next throws_ok(
    format($q$select public.gravar_registro(%L, %L, 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}')$q$, pg_temp.rid(r + 100), b_proprio),
    'P0002', 'registro inexistente', rotulo || ': id de fralda alheia com o bebê da própria família responde registro inexistente');
  return next ok(pg_temp.intacto_id(pg_temp.rid(r + 100)), rotulo || ': a fralda alheia seguiu intacta (colisão com bebê próprio)');
  return next ok(pg_temp.nada_mudou(), rotulo || ': nada foi criado na família própria (colisão de fralda)');
end;
$$;

-- Equivalência com o realmente inexistente: como A (R1, família 1), cada operação com o recurso da família 2
-- e com um uuid v7 que não existe em nenhuma tabela dá o MESMO "SQLSTATE:mensagem", igual ao esperado.
create function pg_temp.bateria_inexistente() returns setof text language plpgsql as $$
declare
  c_b2 constant text := 'bbbbbbbb-0000-4000-8000-000000000002';
  c_f2 constant text := 'ffffffff-0000-4000-8000-000000000002';
  c_f1 constant text := 'ffffffff-0000-4000-8000-000000000001';
  c_inex constant text := '019c0000-0000-7000-8000-000000000001';
  e_alheio text;
  e_inex text;
begin
  -- gravar_registro com id_bebe
  e_alheio := pg_temp.erro(format($q$select public.gravar_registro(%L, %L, 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(9101), c_b2));
  e_inex := pg_temp.erro(format($q$select public.gravar_registro(%L, %L, 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(9102), c_inex));
  return next is(e_alheio, e_inex, 'gravar_registro (sono): bebê da família 2 e bebê inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:bebe inexistente', 'gravar_registro (sono): o erro é P0002 bebe inexistente');
  e_alheio := pg_temp.erro(format($q$select public.gravar_registro(%L, %L, 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}')$q$, pg_temp.rid(9103), c_b2));
  e_inex := pg_temp.erro(format($q$select public.gravar_registro(%L, %L, 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}')$q$, pg_temp.rid(9104), c_inex));
  return next is(e_alheio, e_inex, 'gravar_registro (fralda): bebê da família 2 e bebê inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:bebe inexistente', 'gravar_registro (fralda): o erro é P0002 bebe inexistente');
  return next ok(pg_temp.nada_mudou(), 'gravar_registro: nenhuma linha mudou e as contagens das 3 tabelas são as mesmas');

  -- editar_registro
  e_alheio := pg_temp.erro(format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(2)));
  e_inex := pg_temp.erro(format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(9001)));
  return next is(e_alheio, e_inex, 'editar_registro (valores de sono): id da família 2 e id inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:registro inexistente', 'editar_registro (sono): o erro é P0002 registro inexistente');
  e_alheio := pg_temp.erro(format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(102)));
  e_inex := pg_temp.erro(format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(9001)));
  return next is(e_alheio, e_inex, 'editar_registro (valores de fralda): id da família 2 e id inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:registro inexistente', 'editar_registro (fralda): o erro é P0002 registro inexistente');
  return next ok(pg_temp.nada_mudou(), 'editar_registro: nenhuma linha mudou e as contagens das 3 tabelas são as mesmas');

  -- encerrar_sessao, excluir_registro, restaurar_registro
  e_alheio := pg_temp.erro(format($q$select public.encerrar_sessao(%L, '2026-11-01 11:00+00')$q$, pg_temp.rid(2)));
  e_inex := pg_temp.erro(format($q$select public.encerrar_sessao(%L, '2026-11-01 11:00+00')$q$, pg_temp.rid(9001)));
  return next is(e_alheio, e_inex, 'encerrar_sessao: id da família 2 e id inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:registro inexistente', 'encerrar_sessao: o erro é P0002 registro inexistente');
  e_alheio := pg_temp.erro(format($q$select public.excluir_registro(%L)$q$, pg_temp.rid(102)));
  e_inex := pg_temp.erro(format($q$select public.excluir_registro(%L)$q$, pg_temp.rid(9001)));
  return next is(e_alheio, e_inex, 'excluir_registro: id da família 2 e id inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:registro inexistente', 'excluir_registro: o erro é P0002 registro inexistente');
  e_alheio := pg_temp.erro(format($q$select public.restaurar_registro(%L)$q$, pg_temp.rid(102)));
  e_inex := pg_temp.erro(format($q$select public.restaurar_registro(%L)$q$, pg_temp.rid(9001)));
  return next is(e_alheio, e_inex, 'restaurar_registro: id da família 2 e id inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:registro inexistente', 'restaurar_registro: o erro é P0002 registro inexistente');
  return next ok(pg_temp.nada_mudou(), 'encerrar, excluir e restaurar: nenhuma linha mudou e as contagens são as mesmas');

  -- gravar_nota, editar_nota, excluir_nota
  e_alheio := pg_temp.erro(format($q$select public.gravar_nota(%L, %L, 'Texto')$q$, pg_temp.nid(9101), c_f2));
  e_inex := pg_temp.erro(format($q$select public.gravar_nota(%L, %L, 'Texto')$q$, pg_temp.nid(9102), c_inex));
  return next is(e_alheio, e_inex, 'gravar_nota: família 2 e família inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:familia inexistente', 'gravar_nota: o erro é P0002 familia inexistente');
  e_alheio := pg_temp.erro(format($q$select public.gravar_nota(%L, %L, 'Texto', %L)$q$, pg_temp.nid(9103), c_f1, c_b2));
  e_inex := pg_temp.erro(format($q$select public.gravar_nota(%L, %L, 'Texto', %L)$q$, pg_temp.nid(9104), c_f1, c_inex));
  return next is(e_alheio, e_inex, 'gravar_nota (família 1): bebê da família 2 e bebê inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:bebe inexistente', 'gravar_nota (família 1): o erro é P0002 bebe inexistente');
  e_alheio := pg_temp.erro(format($q$select public.editar_nota(%L, 'Invasão', null)$q$, pg_temp.nid(2)));
  e_inex := pg_temp.erro(format($q$select public.editar_nota(%L, 'Invasão', null)$q$, pg_temp.nid(9001)));
  return next is(e_alheio, e_inex, 'editar_nota: nota da família 2 e nota inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:nota inexistente', 'editar_nota: o erro é P0002 nota inexistente');
  e_alheio := pg_temp.erro(format($q$select public.excluir_nota(%L)$q$, pg_temp.nid(2)));
  e_inex := pg_temp.erro(format($q$select public.excluir_nota(%L)$q$, pg_temp.nid(9001)));
  return next is(e_alheio, e_inex, 'excluir_nota: nota da família 2 e nota inexistente dão o mesmo erro');
  return next is(e_alheio, 'P0002:nota inexistente', 'excluir_nota: o erro é P0002 nota inexistente');
  return next ok(pg_temp.nada_mudou(), 'notas: nenhuma linha mudou e as contagens das 3 tabelas são as mesmas');

  -- registros_do_dia
  return next is(
    (select count(*)::int from public.registros_do_dia(c_b2::uuid, '2026-11-01')), 0,
    'registros_do_dia: bebê da família 2 devolve 0 linhas');
  return next is(
    (select count(*)::int from public.registros_do_dia(c_inex::uuid, '2026-11-01')), 0,
    'registros_do_dia: bebê inexistente devolve 0 linhas, como o da família 2');
  return next ok(pg_temp.nada_mudou(), 'registros_do_dia: nenhuma linha mudou e as contagens são as mesmas');
end;
$$;

-- Bateria no bebê arquivado (b3): toda escrita ligada a ele dá o erro esperado (`cod`, `msg`).
-- O papel decide antes do arquivamento; o arquivamento, antes do estado do registro ou da nota.
create function pg_temp.bateria_arquivado(cod text, msg text, rotulo text)
returns setof text language plpgsql as $$
begin
  return next throws_ok(
    format($q$select public.gravar_registro(%L, 'bbbbbbbb-0000-4000-8000-000000000003', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(600)),
    cod, msg, rotulo || ': gravar_registro (sono) no bebê arquivado');
  return next ok(pg_temp.nao_existe_id(pg_temp.rid(600)), rotulo || ': nenhum sono foi criado');

  return next throws_ok(
    format($q$select public.gravar_registro(%L, 'bbbbbbbb-0000-4000-8000-000000000003', 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}')$q$, pg_temp.rid(602)),
    cod, msg, rotulo || ': gravar_registro (fralda) no bebê arquivado');
  return next ok(pg_temp.nao_existe_id(pg_temp.rid(602)), rotulo || ': nenhuma fralda foi criada');

  return next throws_ok(
    format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(10)),
    cod, msg, rotulo || ': editar_registro (sono) de bebê arquivado');
  return next ok(pg_temp.intacto_id(pg_temp.rid(10)), rotulo || ': editar_registro não tocou o sono');

  return next throws_ok(
    format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(14)),
    cod, msg, rotulo || ': editar_registro (fralda) de bebê arquivado');
  return next ok(pg_temp.intacto_id(pg_temp.rid(14)), rotulo || ': editar_registro não tocou a fralda');

  return next throws_ok(
    format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(15)),
    cod, msg, rotulo || ': editar fralda excluída de bebê arquivado (o arquivamento vem antes de "registro excluido")');
  return next ok(pg_temp.intacto_id(pg_temp.rid(15)), rotulo || ': a fralda excluída seguiu intacta (edição)');

  return next throws_ok(
    format($q$select public.encerrar_sessao(%L, '2026-11-01 11:00+00')$q$, pg_temp.rid(10)),
    cod, msg, rotulo || ': encerrar_sessao de bebê arquivado');
  return next ok(pg_temp.intacto_id(pg_temp.rid(10)), rotulo || ': a sessão seguiu aberta');

  return next throws_ok(
    format($q$select public.excluir_registro(%L)$q$, pg_temp.rid(11)),
    cod, msg, rotulo || ': excluir_registro (sono) de bebê arquivado');
  return next ok(pg_temp.intacto_id(pg_temp.rid(11)), rotulo || ': excluir_registro não tocou o sono');

  return next throws_ok(
    format($q$select public.excluir_registro(%L)$q$, pg_temp.rid(14)),
    cod, msg, rotulo || ': excluir_registro (fralda) de bebê arquivado');
  return next ok(pg_temp.intacto_id(pg_temp.rid(14)), rotulo || ': excluir_registro não tocou a fralda');

  return next throws_ok(
    format($q$select public.excluir_registro(%L)$q$, pg_temp.rid(15)),
    cod, msg, rotulo || ': excluir de novo, em bebê arquivado, também dá o erro (não é reenvio silencioso)');
  return next ok(pg_temp.intacto_id(pg_temp.rid(15)), rotulo || ': a fralda excluída seguiu intacta (exclusão)');

  return next throws_ok(
    format($q$select public.restaurar_registro(%L)$q$, pg_temp.rid(15)),
    cod, msg, rotulo || ': restaurar_registro (fralda excluída) de bebê arquivado');
  return next ok(pg_temp.intacto_id(pg_temp.rid(15)), rotulo || ': a fralda seguiu excluída (restauração)');

  return next throws_ok(
    format($q$select public.restaurar_registro(%L)$q$, pg_temp.rid(11)),
    cod, msg, rotulo || ': restaurar registro não excluído de bebê arquivado (o arquivamento vem antes do "nada a fazer")');
  return next ok(pg_temp.intacto_id(pg_temp.rid(11)), rotulo || ': o sono seguiu intacto (restauração)');

  return next throws_ok(
    format($q$select public.gravar_nota(%L, 'ffffffff-0000-4000-8000-000000000001', 'Texto', 'bbbbbbbb-0000-4000-8000-000000000003')$q$, pg_temp.nid(600)),
    cod, msg, rotulo || ': gravar_nota com bebê arquivado');
  return next ok(pg_temp.nao_existe_id(pg_temp.nid(600)), rotulo || ': nenhuma nota foi criada');

  return next throws_ok(
    format($q$select public.editar_nota(%L, 'Invasão', null)$q$, pg_temp.nid(10)),
    cod, msg, rotulo || ': editar_nota de bebê arquivado');
  return next ok(pg_temp.intacto_id(pg_temp.nid(10)), rotulo || ': editar_nota não tocou a nota');

  return next throws_ok(
    format($q$select public.excluir_nota(%L)$q$, pg_temp.nid(10)),
    cod, msg, rotulo || ': excluir_nota de bebê arquivado');
  return next ok(pg_temp.intacto_id(pg_temp.nid(10)), rotulo || ': excluir_nota não tocou a nota');
end;
$$;

select pg_temp.guarda();

set local role authenticated;

-- Outra família, para cada papel dela (R2, C2, O2 tentam mexer na família 1; R1 tenta a família 2).
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select * from pg_temp.bateria_cruzada(1, 1, 'bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'responsável da outra família');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000012", "role": "authenticated"}';
select * from pg_temp.bateria_cruzada(1, 1, 'bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'cuidador da outra família');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select * from pg_temp.bateria_cruzada(1, 1, 'bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'observador da outra família');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select * from pg_temp.bateria_cruzada(2, 2, 'bbbbbbbb-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'responsável da família 1 diante da família 2');
-- Equivalência com o realmente inexistente (como R1).
select * from pg_temp.bateria_inexistente();

-- Bebê arquivado: responsável e cuidador (dono dos registros) recebem "bebe arquivado".
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select * from pg_temp.bateria_arquivado('P0001', 'bebe arquivado', 'responsável');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select * from pg_temp.bateria_arquivado('P0001', 'bebe arquivado', 'cuidador');
-- O observador não tem papel de escrita: "sem permissao" vem antes de "bebe arquivado".
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select * from pg_temp.bateria_arquivado('42501', 'sem permissao', 'observador');

-- A leitura continua para o bebê arquivado: 4 registros e 2 notas (a do bebê e a sem bebê).
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  (select count(*)::int from public.registros where bebe_id = 'bbbbbbbb-0000-4000-8000-000000000003'),
  4, 'bebê arquivado: o select devolve os 4 registros (com a fralda excluída)');
select is(
  (select count(*)::int from public.notas_cuidado
    where familia_id = 'ffffffff-0000-4000-8000-000000000001'
      and (bebe_id = 'bbbbbbbb-0000-4000-8000-000000000003' or bebe_id is null)),
  2, 'bebê arquivado: o select devolve as 2 notas (a do bebê e a sem bebê)');
select is(
  (select count(*)::int from public.notas_cuidado where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  3, 'o responsável lê as 3 notas da família 1');
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000003', '2026-11-01')),
  3, 'bebê arquivado: registros_do_dia devolve os 3 não excluídos');

-- O cuidador não altera o registro do responsável, nem em bebê arquivado: o papel vem primeiro.
reset role;
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, detalhes, fuso, deslocamento_min, criado_por, atualizado_em)
values (pg_temp.rid(13), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000003', 'sono', '2026-11-01 10:00+00', '2026-11-01 11:00+00', '{}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000001', '2026-11-01 12:00+00');
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$select public.editar_registro(pg_temp.rid(13), '2026-11-01 10:00+00', '2026-11-01 11:00+00', '{}', 'x', 'America/Sao_Paulo', -180)$$,
  '42501', 'sem permissao', 'cuidador não edita registro de outro em bebê arquivado (papel antes do arquivamento)');
select ok(pg_temp.intacto_id(pg_temp.rid(13)), 'o registro do responsável seguiu intacto');

-- A nota sem bebê continua editável com o bebê arquivado; gravar nota sem bebê também.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.editar_nota(pg_temp.nid(11), 'Nota da família editada pelo R1', null)$$, 'responsável edita a nota sem bebê (bebê da família arquivado)');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.editar_nota(pg_temp.nid(11), 'Nota da família editada pelo C1', null)$$, 'cuidador edita a própria nota sem bebê');
select lives_ok($$select public.gravar_nota(pg_temp.nid(601), 'ffffffff-0000-4000-8000-000000000001', 'Outra nota da família')$$, 'cuidador grava nota sem bebê com o bebê arquivado na família');

-- Desarquivar libera a escrita: a sessão que ficou aberta pode ser encerrada (DR-14).
reset role;
update public.bebes set estado = 'ativo' where id = 'bbbbbbbb-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  public.encerrar_sessao(pg_temp.rid(10), '2026-11-01 12:00+00'),
  '2026-11-01 12:00+00'::timestamptz,
  'depois de desarquivar, a sessão que ficou aberta é encerrada');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok(
  $$select public.gravar_registro(pg_temp.rid(701), 'bbbbbbbb-0000-4000-8000-000000000003', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180)$$,
  'depois de desarquivar, o cuidador volta a gravar no bebê');

reset role;

-- Adendo R-B, 46-M6 (2º caso): isolamento de um OBSERVADOR e de um CUIDADOR da família 2 contra objetos da
-- família 1 em estados que a bateria cruzada não cobre: sessão encerrada, registro excluído fora do prazo
-- e nota excluída. Se o registro fosse visível, cada operação daria outro erro ("sessao encerrada", "registro
-- excluido", "prazo de restauracao encerrado", "nota excluida", "sem permissao") ou passaria calada
-- (encerrar de novo, excluir de novo); o isolamento exige P0002, nunca 42501, e a linha intacta.
-- 21 sono encerrado, 22 fralda excluída há 40 dias, nota 21 excluída; todos do C1, no bebê 1 (família 1).
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, detalhes, fuso, deslocamento_min, criado_por)
values
  (pg_temp.rid(21), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', '2026-11-01 11:00+00', '{}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000002'),
  (pg_temp.rid(22), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda', '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000002');
insert into public.notas_cuidado (id, familia_id, bebe_id, texto, criado_por) values
  (pg_temp.nid(21), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'Nota 21', 'aaaaaaaa-0000-4000-8000-000000000002');
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000002"}', true);
update public.registros set excluido_em = now() where id = pg_temp.rid(22);
update public.registros set excluido_em = now() - interval '40 days' where id = pg_temp.rid(22);
update public.notas_cuidado set excluida_em = now() where id = pg_temp.nid(21);
update public.registros set atualizado_em = '2026-11-01 12:00+00' where id in (pg_temp.rid(21), pg_temp.rid(22));
update public.notas_cuidado set atualizado_em = '2026-11-01 12:00+00' where id = pg_temp.nid(21);
select pg_temp.guarda();

create function pg_temp.bateria_outra_familia_estados(rotulo text) returns setof text language plpgsql as $$
begin
  return next is(
    (select count(*)::int from public.registros where familia_id = 'ffffffff-0000-4000-8000-000000000001')
      + (select count(*)::int from public.notas_cuidado where familia_id = 'ffffffff-0000-4000-8000-000000000001')
      + (select count(*)::int from public.registro_alteracoes where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
    0, rotulo || ': não lê registros, notas nem histórico da família 1');

  return next throws_ok(
    format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(21)),
    'P0002', 'registro inexistente', rotulo || ': editar sessão encerrada de outra família responde registro inexistente, não "sessao encerrada"');
  return next ok(pg_temp.intacto_id(pg_temp.rid(21)), rotulo || ': a sessão encerrada seguiu intacta (edição)');

  return next throws_ok(
    format($q$select public.encerrar_sessao(%L, '2026-11-01 12:00+00')$q$, pg_temp.rid(21)),
    'P0002', 'registro inexistente', rotulo || ': encerrar de novo sessão de outra família responde registro inexistente, não o fim do primeiro');
  return next ok(pg_temp.intacto_id(pg_temp.rid(21)), rotulo || ': a sessão encerrada seguiu intacta (encerramento)');

  return next throws_ok(
    format($q$select public.editar_registro(%L, '2026-11-01 10:00+00', null, '{"conteudo": "xixi"}', 'x', 'America/Sao_Paulo', -180)$q$, pg_temp.rid(22)),
    'P0002', 'registro inexistente', rotulo || ': editar excluído de outra família responde registro inexistente, não "registro excluido"');
  return next ok(pg_temp.intacto_id(pg_temp.rid(22)), rotulo || ': o excluído seguiu intacto (edição)');

  return next throws_ok(
    format($q$select public.restaurar_registro(%L)$q$, pg_temp.rid(22)),
    'P0002', 'registro inexistente', rotulo || ': restaurar excluído de outra família fora do prazo responde registro inexistente, não o prazo');
  return next ok(pg_temp.intacto_id(pg_temp.rid(22)), rotulo || ': o excluído seguiu excluído e intacto (restauração)');

  return next throws_ok(
    format($q$select public.excluir_registro(%L)$q$, pg_temp.rid(22)),
    'P0002', 'registro inexistente', rotulo || ': excluir de novo registro de outra família responde registro inexistente, não silêncio');
  return next ok(pg_temp.intacto_id(pg_temp.rid(22)), rotulo || ': o excluído seguiu intacto (exclusão)');

  return next throws_ok(
    format($q$select public.editar_nota(%L, 'Invasão', null)$q$, pg_temp.nid(21)),
    'P0002', 'nota inexistente', rotulo || ': editar nota excluída de outra família responde nota inexistente, não "nota excluida"');
  return next ok(pg_temp.intacto_id(pg_temp.nid(21)), rotulo || ': a nota excluída seguiu intacta (edição)');

  return next throws_ok(
    format($q$select public.excluir_nota(%L)$q$, pg_temp.nid(21)),
    'P0002', 'nota inexistente', rotulo || ': excluir de novo nota de outra família responde nota inexistente, não silêncio');
  return next ok(pg_temp.intacto_id(pg_temp.nid(21)), rotulo || ': a nota excluída seguiu intacta (exclusão)');
end;
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select * from pg_temp.bateria_outra_familia_estados('observador da família 2');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000012", "role": "authenticated"}';
select * from pg_temp.bateria_outra_familia_estados('cuidador da família 2');

reset role;

select * from finish();
rollback;
