begin;
create extension if not exists pgtap with schema extensions;

select plan(98);

-- Contas da família 1: R (...01) responsável, C (...02) cuidador, O (...03) observador,
-- C2 (...04) outro cuidador (dono dos registros "alheios" ao C).
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'c@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'o@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'c2@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'C'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'O'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'C2');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'cuidador');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
create function pg_temp.nid(n int) returns uuid language sql immutable as $$
  select ('019b0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

-- Registro de fixture, criado por `autor` (a identidade fica no claim para o gatilho). Sessão
-- fechada (10:00 a 11:00), aberta ou excluída; atualizado_em antigo para denunciar qualquer toque.
create function pg_temp.reg(n int, tipo public.tipo_registro, autor uuid, aberta boolean default false, excluida boolean default false)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', autor)::text, true);
  insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, detalhes, fuso, deslocamento_min, criado_por)
  values (
    pg_temp.rid(n), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', tipo,
    '2026-11-01 10:00+00',
    case when tipo = 'sono' and not aberta then '2026-11-01 11:00+00'::timestamptz end,
    case when tipo = 'fralda' then '{"conteudo": "xixi"}'::jsonb else '{}'::jsonb end,
    'America/Sao_Paulo', -180, autor
  );
  if excluida then
    update public.registros set excluido_em = now() where id = pg_temp.rid(n);
  end if;
  update public.registros set atualizado_em = '2026-11-01 12:00+00' where id = pg_temp.rid(n);
end;
$$;

create function pg_temp.nota(n int, autor uuid) returns void language sql as $$
  insert into public.notas_cuidado (id, familia_id, bebe_id, texto, criado_por, atualizado_em)
  values (pg_temp.nid(n), 'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001',
          'Nota ' || n, autor, '2026-11-01 12:00+00');
$$;

-- Edita só a nota; as outras 5 colunas editáveis seguem iguais às do fixture.
create function pg_temp.edita(n int, tipo public.tipo_registro) returns void language plpgsql as $$
begin
  perform public.editar_registro(
    pg_temp.rid(n), '2026-11-01 10:00+00',
    case when tipo = 'sono' then '2026-11-01 11:00+00'::timestamptz end,
    case when tipo = 'fralda' then '{"conteudo": "xixi"}'::jsonb else '{}'::jsonb end,
    'editada', 'America/Sao_Paulo', -180);
end;
$$;

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
create function pg_temp.intacto(n int) returns boolean language sql as $$ select pg_temp.intacto_id(pg_temp.rid(n)); $$;
create function pg_temp.nota_intacta(n int) returns boolean language sql as $$ select pg_temp.intacto_id(pg_temp.nid(n)); $$;

-- Registros: 11-13 editar sono, 21-23 editar fralda, 31-33 excluir sono, 41-43 excluir fralda,
-- 51-53 restaurar sono (excluídos), 61-63 restaurar fralda (excluídos), 71-73 sessões abertas.
-- Em cada trio, o 1º e o 3º são do C2 e o 2º é do C.
select pg_temp.reg(11, 'sono', 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.reg(12, 'sono', 'aaaaaaaa-0000-4000-8000-000000000002');
select pg_temp.reg(13, 'sono', 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.reg(21, 'fralda', 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.reg(22, 'fralda', 'aaaaaaaa-0000-4000-8000-000000000002');
select pg_temp.reg(23, 'fralda', 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.reg(31, 'sono', 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.reg(32, 'sono', 'aaaaaaaa-0000-4000-8000-000000000002');
select pg_temp.reg(33, 'sono', 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.reg(41, 'fralda', 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.reg(42, 'fralda', 'aaaaaaaa-0000-4000-8000-000000000002');
select pg_temp.reg(43, 'fralda', 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.reg(51, 'sono', 'aaaaaaaa-0000-4000-8000-000000000004', false, true);
select pg_temp.reg(52, 'sono', 'aaaaaaaa-0000-4000-8000-000000000002', false, true);
select pg_temp.reg(53, 'sono', 'aaaaaaaa-0000-4000-8000-000000000004', false, true);
select pg_temp.reg(61, 'fralda', 'aaaaaaaa-0000-4000-8000-000000000004', false, true);
select pg_temp.reg(62, 'fralda', 'aaaaaaaa-0000-4000-8000-000000000002', false, true);
select pg_temp.reg(63, 'fralda', 'aaaaaaaa-0000-4000-8000-000000000004', false, true);
select pg_temp.reg(71, 'sono', 'aaaaaaaa-0000-4000-8000-000000000004', true);
select pg_temp.reg(72, 'sono', 'aaaaaaaa-0000-4000-8000-000000000004', true);
select pg_temp.reg(73, 'sono', 'aaaaaaaa-0000-4000-8000-000000000004', true);
-- 74 e 75: sessões abertas do responsável e do cuidador (um encerra a do outro).
select pg_temp.reg(74, 'sono', 'aaaaaaaa-0000-4000-8000-000000000001', true);
select pg_temp.reg(75, 'sono', 'aaaaaaaa-0000-4000-8000-000000000002', true);
-- 76 (sono) e 77 (fralda) do cuidador, depois com a autoria anulada pelo dono (criado_por nulo).
select pg_temp.reg(76, 'sono', 'aaaaaaaa-0000-4000-8000-000000000002');
select pg_temp.reg(77, 'fralda', 'aaaaaaaa-0000-4000-8000-000000000002');
update public.registros set criado_por = null where id in (pg_temp.rid(76), pg_temp.rid(77));

-- Notas: 1-3 editar, 4-6 excluir (1º e 3º do C2, 2º do C).
select pg_temp.nota(1, 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.nota(2, 'aaaaaaaa-0000-4000-8000-000000000002');
select pg_temp.nota(3, 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.nota(4, 'aaaaaaaa-0000-4000-8000-000000000004');
select pg_temp.nota(5, 'aaaaaaaa-0000-4000-8000-000000000002');
select pg_temp.nota(6, 'aaaaaaaa-0000-4000-8000-000000000004');

select set_config('teste.alteracoes', (select count(*)::text from public.registro_alteracoes where familia_id = 'ffffffff-0000-4000-8000-000000000001'), true);

-- Leitura: todo papel com vínculo ativo lê registros (inclusive excluídos) e notas; o observador
-- não vê o histórico.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is((select count(*)::int from public.registros), 25, 'responsável lê os 25 registros (com os excluídos)');
select is((select count(*)::int from public.notas_cuidado), 6, 'responsável lê as 6 notas');
select is((select count(*)::int from public.registro_alteracoes), current_setting('teste.alteracoes')::int, 'responsável lê todo o histórico');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from public.registros), 25, 'cuidador lê os 25 registros');
select is((select count(*)::int from public.notas_cuidado), 6, 'cuidador lê as 6 notas');
select is((select count(*)::int from public.registro_alteracoes), current_setting('teste.alteracoes')::int, 'cuidador lê todo o histórico');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is((select count(*)::int from public.registros), 25, 'observador lê os 25 registros');
select is((select count(*)::int from public.notas_cuidado), 6, 'observador lê as 6 notas');
select is((select count(*)::int from public.registro_alteracoes), 0, 'observador não vê o histórico de alterações');
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-01')),
  19,
  'observador lê o dia pela função (25 menos 6 excluídos)');

-- gravar_registro e gravar_nota.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.gravar_registro(pg_temp.rid(81), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, '2026-11-01 11:00+00')$$, 'responsável grava sono');
select lives_ok($$select public.gravar_registro(pg_temp.rid(82), 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "coco"}')$$, 'responsável grava fralda');
select lives_ok($$select public.gravar_nota(pg_temp.nid(11), 'ffffffff-0000-4000-8000-000000000001', 'Nota do R')$$, 'responsável grava nota');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.gravar_registro(pg_temp.rid(83), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, '2026-11-01 11:00+00')$$, 'cuidador grava sono');
select lives_ok($$select public.gravar_registro(pg_temp.rid(84), 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "coco"}')$$, 'cuidador grava fralda');
select lives_ok($$select public.gravar_nota(pg_temp.nid(12), 'ffffffff-0000-4000-8000-000000000001', 'Nota do C')$$, 'cuidador grava nota');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select public.gravar_registro(pg_temp.rid(85), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, '2026-11-01 11:00+00')$$, '42501', 'sem permissao', 'observador não grava sono');
select throws_ok($$select public.gravar_registro(pg_temp.rid(86), 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda', '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "coco"}')$$, '42501', 'sem permissao', 'observador não grava fralda');
select throws_ok($$select public.gravar_nota(pg_temp.nid(13), 'ffffffff-0000-4000-8000-000000000001', 'Nota do O')$$, '42501', 'sem permissao', 'observador não grava nota');

reset role;
select is((select count(*)::int from public.registros where id in (pg_temp.rid(85), pg_temp.rid(86))), 0, 'o observador não criou registro');
select is((select count(*)::int from public.notas_cuidado where id = pg_temp.nid(13)), 0, 'o observador não criou nota');
select is(
  (select string_agg(id::text || ':' || criado_por::text, ',' order by id) from public.registros where id in (pg_temp.rid(81), pg_temp.rid(83))),
  '019a0000-0000-7000-8000-000000000051:aaaaaaaa-0000-4000-8000-000000000001,019a0000-0000-7000-8000-000000000053:aaaaaaaa-0000-4000-8000-000000000002',
  'a autoria dos registros gravados é de quem chamou');

-- editar_registro: R edita o do C2 (11, 21); C edita o próprio (12, 22); C não edita o do C2 (13, 23); O nunca.
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select pg_temp.edita(11, 'sono')$$, 'responsável edita sono de outro');
select lives_ok($$select pg_temp.edita(21, 'fralda')$$, 'responsável edita fralda de outro');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select pg_temp.edita(12, 'sono')$$, 'cuidador edita o próprio sono');
select lives_ok($$select pg_temp.edita(22, 'fralda')$$, 'cuidador edita a própria fralda');
select throws_ok($$select pg_temp.edita(13, 'sono')$$, '42501', 'sem permissao', 'cuidador não edita sono de outro');
select ok(pg_temp.intacto(13), 'sono de outro seguiu intacto (cuidador)');
select throws_ok($$select pg_temp.edita(23, 'fralda')$$, '42501', 'sem permissao', 'cuidador não edita fralda de outro');
select ok(pg_temp.intacto(23), 'fralda de outro seguiu intacta (cuidador)');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select pg_temp.edita(13, 'sono')$$, '42501', 'sem permissao', 'observador não edita sono');
select ok(pg_temp.intacto(13), 'sono seguiu intacto (observador)');
select throws_ok($$select pg_temp.edita(23, 'fralda')$$, '42501', 'sem permissao', 'observador não edita fralda');
select ok(pg_temp.intacto(23), 'fralda seguiu intacta (observador)');
reset role;
select is((select count(*)::int from public.registros where id in (pg_temp.rid(11), pg_temp.rid(12), pg_temp.rid(21), pg_temp.rid(22)) and nota = 'editada' and versao = 2), 4, 'as 4 edições permitidas gravaram a nota e subiram a versão');

-- excluir_registro: mesma matriz (31-33 sono, 41-43 fralda).
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.excluir_registro(pg_temp.rid(31))$$, 'responsável exclui sono de outro');
select lives_ok($$select public.excluir_registro(pg_temp.rid(41))$$, 'responsável exclui fralda de outro');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.excluir_registro(pg_temp.rid(32))$$, 'cuidador exclui o próprio sono');
select lives_ok($$select public.excluir_registro(pg_temp.rid(42))$$, 'cuidador exclui a própria fralda');
select throws_ok($$select public.excluir_registro(pg_temp.rid(33))$$, '42501', 'sem permissao', 'cuidador não exclui sono de outro');
select ok(pg_temp.intacto(33), 'sono de outro seguiu intacto (cuidador)');
select throws_ok($$select public.excluir_registro(pg_temp.rid(43))$$, '42501', 'sem permissao', 'cuidador não exclui fralda de outro');
select ok(pg_temp.intacto(43), 'fralda de outro seguiu intacta (cuidador)');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select public.excluir_registro(pg_temp.rid(33))$$, '42501', 'sem permissao', 'observador não exclui sono');
select ok(pg_temp.intacto(33), 'sono seguiu intacto (observador)');
select throws_ok($$select public.excluir_registro(pg_temp.rid(43))$$, '42501', 'sem permissao', 'observador não exclui fralda');
select ok(pg_temp.intacto(43), 'fralda seguiu intacta (observador)');
reset role;
select is((select count(*)::int from public.registros where id in (pg_temp.rid(31), pg_temp.rid(32), pg_temp.rid(41), pg_temp.rid(42)) and excluido_em is not null), 4, 'as 4 exclusões permitidas marcaram excluido_em');

-- restaurar_registro: mesma matriz (51-53 sono, 61-63 fralda, todos excluídos).
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.restaurar_registro(pg_temp.rid(51))$$, 'responsável restaura sono de outro');
select lives_ok($$select public.restaurar_registro(pg_temp.rid(61))$$, 'responsável restaura fralda de outro');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.restaurar_registro(pg_temp.rid(52))$$, 'cuidador restaura o próprio sono');
select lives_ok($$select public.restaurar_registro(pg_temp.rid(62))$$, 'cuidador restaura a própria fralda');
select throws_ok($$select public.restaurar_registro(pg_temp.rid(53))$$, '42501', 'sem permissao', 'cuidador não restaura sono de outro');
select ok(pg_temp.intacto(53), 'sono de outro seguiu excluído e intacto (cuidador)');
select throws_ok($$select public.restaurar_registro(pg_temp.rid(63))$$, '42501', 'sem permissao', 'cuidador não restaura fralda de outro');
select ok(pg_temp.intacto(63), 'fralda de outro seguiu excluída e intacta (cuidador)');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select public.restaurar_registro(pg_temp.rid(53))$$, '42501', 'sem permissao', 'observador não restaura sono');
select ok(pg_temp.intacto(53), 'sono seguiu excluído e intacto (observador)');
select throws_ok($$select public.restaurar_registro(pg_temp.rid(63))$$, '42501', 'sem permissao', 'observador não restaura fralda');
select ok(pg_temp.intacto(63), 'fralda seguiu excluída e intacta (observador)');
reset role;
select is((select count(*)::int from public.registros where id in (pg_temp.rid(51), pg_temp.rid(52), pg_temp.rid(61), pg_temp.rid(62)) and excluido_em is null), 4, 'as 4 restaurações permitidas limparam excluido_em');

-- encerrar_sessao: responsável e cuidador encerram qualquer sessão; observador não; fralda não é sessão.
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.encerrar_sessao(pg_temp.rid(71), '2026-11-01 12:00+00'), '2026-11-01 12:00+00'::timestamptz, 'responsável encerra sessão de outro');
select throws_ok($$select public.encerrar_sessao(pg_temp.rid(23), '2026-11-01 12:00+00')$$, 'P0001', 'nao e sessao', 'responsável não encerra fralda (pontual)');
select ok(pg_temp.intacto(23), 'fralda seguiu intacta depois do encerramento recusado');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.encerrar_sessao(pg_temp.rid(72), '2026-11-01 12:00+00'), '2026-11-01 12:00+00'::timestamptz, 'cuidador encerra sessão de outro');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select public.encerrar_sessao(pg_temp.rid(73), '2026-11-01 12:00+00')$$, '42501', 'sem permissao', 'observador não encerra sessão');
select ok(pg_temp.intacto(73), 'sessão seguiu aberta e intacta (observador)');
select throws_ok($$select public.encerrar_sessao(pg_temp.rid(23), '2026-11-01 12:00+00')$$, '42501', 'sem permissao', 'observador não encerra fralda (o papel vem antes do tipo)');
select ok(pg_temp.intacto(23), 'fralda seguiu intacta (observador)');
reset role;
select is((select count(*)::int from public.registros where id in (pg_temp.rid(71), pg_temp.rid(72)) and fim = '2026-11-01 12:00+00'), 2, 'as 2 sessões encerradas ganharam o fim');

-- Encerramento cruzado: o cuidador encerra o sono criado pelo responsável e vice-versa.
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.encerrar_sessao(pg_temp.rid(74), '2026-11-01 12:00+00'), '2026-11-01 12:00+00'::timestamptz, 'cuidador encerra o sono criado pelo responsável');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.encerrar_sessao(pg_temp.rid(75), '2026-11-01 12:00+00'), '2026-11-01 12:00+00'::timestamptz, 'responsável encerra o sono criado pelo cuidador');
reset role;
select is(
  (select string_agg(right(id::text, 2) || ':' || encerrado_por::text, ',' order by id) from public.registros where id in (pg_temp.rid(74), pg_temp.rid(75))),
  '4a:aaaaaaaa-0000-4000-8000-000000000002,4b:aaaaaaaa-0000-4000-8000-000000000001',
  'encerrado_por é quem encerrou, não o autor da sessão');

-- Autoria anulada (criado_por nulo, DR-19): autor nulo não é de ninguém. O cuidador não edita nem
-- exclui o sono (76) e a fralda (77); o responsável edita os dois.
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$select pg_temp.edita(76, 'sono')$$, '42501', 'sem permissao', 'cuidador não edita sono de autor removido');
select ok(pg_temp.intacto(76), 'sono de autor removido seguiu intacto (edição)');
select throws_ok($$select pg_temp.edita(77, 'fralda')$$, '42501', 'sem permissao', 'cuidador não edita fralda de autor removido');
select ok(pg_temp.intacto(77), 'fralda de autor removido seguiu intacta (edição)');
select throws_ok($$select public.excluir_registro(pg_temp.rid(76))$$, '42501', 'sem permissao', 'cuidador não exclui sono de autor removido');
select ok(pg_temp.intacto(76), 'sono de autor removido seguiu intacto (exclusão)');
select throws_ok($$select public.excluir_registro(pg_temp.rid(77))$$, '42501', 'sem permissao', 'cuidador não exclui fralda de autor removido');
select ok(pg_temp.intacto(77), 'fralda de autor removido seguiu intacta (exclusão)');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select pg_temp.edita(76, 'sono')$$, 'responsável edita sono de autor removido');
select lives_ok($$select pg_temp.edita(77, 'fralda')$$, 'responsável edita fralda de autor removido');
reset role;
select is((select count(*)::int from public.registros where id in (pg_temp.rid(76), pg_temp.rid(77)) and nota = 'editada' and versao = 2 and criado_por is null), 2, 'as 2 edições do responsável gravaram a nota e subiram a versão');

-- editar_nota: R edita a do C2 (1); C edita a própria (2); C não edita a do C2 (3); O nunca.
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.editar_nota(pg_temp.nid(1), 'Editada pelo R', null)$$, 'responsável edita nota de outro');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.editar_nota(pg_temp.nid(2), 'Editada pelo C', null)$$, 'cuidador edita a própria nota');
select throws_ok($$select public.editar_nota(pg_temp.nid(3), 'Invasão', null)$$, '42501', 'sem permissao', 'cuidador não edita nota de outro');
select ok(pg_temp.nota_intacta(3), 'nota de outro seguiu intacta (cuidador)');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select public.editar_nota(pg_temp.nid(3), 'Invasão', null)$$, '42501', 'sem permissao', 'observador não edita nota');
select ok(pg_temp.nota_intacta(3), 'nota seguiu intacta (observador)');
reset role;
select is((select count(*)::int from public.notas_cuidado where id in (pg_temp.nid(1), pg_temp.nid(2)) and texto like 'Editada%' and versao = 2), 2, 'as 2 edições de nota permitidas gravaram o texto e subiram a versão');

-- excluir_nota: mesma matriz (4, 5, 6).
select pg_temp.guarda();
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.excluir_nota(pg_temp.nid(4))$$, 'responsável exclui nota de outro');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.excluir_nota(pg_temp.nid(5))$$, 'cuidador exclui a própria nota');
select throws_ok($$select public.excluir_nota(pg_temp.nid(6))$$, '42501', 'sem permissao', 'cuidador não exclui nota de outro');
select ok(pg_temp.nota_intacta(6), 'nota de outro seguiu intacta (cuidador)');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select public.excluir_nota(pg_temp.nid(6))$$, '42501', 'sem permissao', 'observador não exclui nota');
select ok(pg_temp.nota_intacta(6), 'nota seguiu intacta (observador)');
reset role;
select is((select count(*)::int from public.notas_cuidado where id in (pg_temp.nid(4), pg_temp.nid(5)) and excluida_em is not null), 2, 'as 2 exclusões de nota permitidas marcaram excluida_em');

select * from finish();
rollback;
