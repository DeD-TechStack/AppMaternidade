begin;
create extension if not exists pgtap with schema extensions;

select plan(60);

create function pg_temp.u(n int) returns uuid language sql immutable as $$
  select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid;
$$;

create function pg_temp.f(n int) returns uuid language sql immutable as $$
  select ('ffffffff-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid;
$$;

create function pg_temp.foto() returns text language sql as $$
  select (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
      || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c) || '/'
      || (select md5(string_agg(b::text, '|' order by b.id)) from public.bebes b) || '/'
      || (select md5(string_agg(f::text, '|' order by f.id)) from public.familias f) || '/'
      || (select md5(string_agg(t::text, '|' order by t.id)) from public.contas t) || '/'
      || (select count(*)::text from auth.users);
$$;

-- Contas 01 a 39; a 30 (N) existe só em auth.users, sem linha em contas.
insert into auth.users (id, email)
select pg_temp.u(n), 'u' || n || '@exemplo.invalid' from generate_series(1, 39) as n;

insert into public.contas (id, nome_privado)
select pg_temp.u(n), 'U' || n from generate_series(1, 39) as n where n <> 30;

-- Famílias (o número da família é o da lista abaixo; criada_por entre parênteses):
--   1 (01), 2 (02), 3 (25), 4 (03), 5 (04), 6 (27), 7 (12), 8 (28), 9 (14), 10 (17), 11 (22), 12 (32),
--   13 (33: saída do caso 1), 14 (34) e 15 (37: antiguidade no reingresso).
insert into public.familias (id, nome, fuso, criada_por)
select pg_temp.f(v.n), 'Família ' || v.n, 'America/Sao_Paulo', pg_temp.u(v.criador)
from (values (1, 1), (2, 2), (3, 25), (4, 3), (5, 4), (6, 27), (7, 12), (8, 28), (9, 14), (10, 17), (11, 22), (12, 32),
             (13, 33), (14, 34), (15, 37))
  as v(n, criador);

-- (família, conta, papel, estado, validade, época, dias de antiguidade)
insert into public.vinculos (familia_id, conta_id, papel, estado, valido_ate, epoca, criado_em)
select pg_temp.f(v.fam), pg_temp.u(v.conta), v.papel::public.papel_familia, v.estado::public.estado_vinculo,
       v.valido::timestamptz, v.epoca, now() - v.dias * interval '1 day'
from (values
  -- Caso 1: única responsável sozinha (família 1), com outro membro (2), e em duas famílias (3 e 4).
  (1,  1,  'responsavel', 'ativo',    null::timestamptz, 1, 10),
  (2,  2,  'responsavel', 'ativo',    null, 1, 10),
  (2,  24, 'cuidador',    'ativo',    null, 1, 9),
  (3,  3,  'responsavel', 'ativo',    null, 1, 10),
  (3,  25, 'responsavel', 'ativo',    null, 1, 11),
  (4,  3,  'responsavel', 'ativo',    null, 1, 10),
  (4,  26, 'observador',  'ativo',    null, 1, 9),
  -- Caso 2: 04 é criador e responsável da família 5, com vários candidatos a titular.
  (5,  4,  'responsavel', 'ativo',    null, 1, 80),
  (5,  5,  'responsavel', 'ativo',    null, 1, 5),
  (5,  6,  'responsavel', 'ativo',    null, 1, 9),
  (5,  7,  'responsavel', 'ativo',    null, 1, 9),
  (5,  8,  'responsavel', 'revogado', null, 1, 50),
  (5,  9,  'responsavel', 'saiu',     null, 1, 45),
  (5,  10, 'responsavel', 'ativo',    now() - interval '1 day', 1, 40),
  (5,  11, 'cuidador',    'ativo',    null, 1, 60),
  (6,  27, 'responsavel', 'ativo',    null, 1, 30),
  (6,  4,  'cuidador',    'ativo',    null, 1, 20),
  -- Caso 2 com o vínculo do criador já inativo (família 7) e saída em família alheia (8).
  (7,  12, 'responsavel', 'revogado', null, 1, 50),
  (7,  13, 'responsavel', 'ativo',    null, 1, 3),
  (8,  28, 'responsavel', 'ativo',    null, 1, 30),
  (8,  12, 'cuidador',    'saiu',     null, 1, 20),
  -- Caso 3 (família 9): criador que saiu, nenhum responsável ativo, dois membros ativos.
  (9,  14, 'responsavel', 'saiu',     null, 1, 100),
  (9,  15, 'cuidador',    'ativo',    now() + interval '30 days', 2, 30),
  (9,  16, 'observador',  'ativo',    null, 1, 20),
  (9,  29, 'cuidador',    'revogado', null, 1, 90),
  -- Caso 4 (família 10): criador revogado e mais ninguém ativo.
  (10, 17, 'responsavel', 'revogado', null, 1, 50),
  (10, 18, 'responsavel', 'revogado', null, 1, 40),
  (10, 19, 'responsavel', 'saiu',     null, 1, 30),
  (10, 20, 'cuidador',    'ativo',    now() - interval '1 day', 1, 20),
  -- Caso 5 (família 11): cuidador que não é o criador.
  (11, 22, 'responsavel', 'ativo',    null, 1, 30),
  (11, 21, 'cuidador',    'ativo',    null, 1, 20),
  (11, 23, 'observador',  'ativo',    null, 1, 20),
  -- Falhas simuladas (família 12): 32 é responsável e 31 é cuidador.
  (12, 32, 'responsavel', 'ativo',    null, 1, 30),
  (12, 31, 'cuidador',    'ativo',    null, 1, 20),
  -- Saída do caso 1 (família 13): 33 é a única responsável, sozinha.
  (13, 33, 'responsavel', 'ativo',    null, 1, 30),
  -- Antiguidade no reingresso: em cada família, o criador (34 e 37), um responsável antigo que saiu (35) ou foi
  -- revogado (38) e volta por aceitar_convite, e um responsável mais novo que nunca saiu (36 e 39).
  (14, 34, 'responsavel', 'ativo',    null, 1, 200),
  (14, 35, 'responsavel', 'saiu',     null, 1, 150),
  (14, 36, 'responsavel', 'ativo',    null, 1, 50),
  (15, 37, 'responsavel', 'ativo',    null, 1, 200),
  (15, 38, 'responsavel', 'revogado', null, 1, 150),
  (15, 39, 'responsavel', 'ativo',    null, 1, 50)
) as v(fam, conta, papel, estado, valido, epoca, dias);

-- Convites de responsável para os reingressos: 35 usa o código 'e1' e 38 usa o 'e2' (repetidos 32 vezes).
insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em) values
  ('c0000000-0000-4000-8000-0000000000e1', pg_temp.f(14), 'responsavel', pg_temp.u(34),
   encode(extensions.digest(repeat('e1', 32), 'sha256'), 'hex'), now() + interval '3 days'),
  ('c0000000-0000-4000-8000-0000000000e2', pg_temp.f(15), 'responsavel', pg_temp.u(37),
   encode(extensions.digest(repeat('e2', 32), 'sha256'), 'hex'), now() + interval '3 days');

-- 05 foi promovido por 04.
update public.vinculos set concedido_por = pg_temp.u(4)
 where familia_id = pg_temp.f(5) and conta_id = pg_temp.u(5);

insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bebe0000-0000-4000-8000-000000000001', pg_temp.f(5), 'Do 04', '2026-01-01', pg_temp.u(4)),
  ('bebe0000-0000-4000-8000-000000000002', pg_temp.f(5), 'Do 05', '2026-01-01', pg_temp.u(5)),
  ('bebe0000-0000-4000-8000-000000000003', pg_temp.f(10), 'Da família 10', '2026-01-01', pg_temp.u(17));

-- Convites: c1 e c2 pendentes de 04 (família 5), c3 aceito de 04, c4 revogado de 04, c5 pendente de 04 na
-- família 6 (criado pelo dono da tabela, de cuidador), c6 pendente da família 10, c7 pendente de 21 (cuidador).
insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em, estado, aceito_por, aceito_em)
select ('c0000000-0000-4000-8000-00000000000' || v.n)::uuid, pg_temp.f(v.fam), 'observador', pg_temp.u(v.criador),
       'hash-' || v.n, now() + interval '3 days', v.estado::public.estado_convite,
       case when v.estado = 'aceito' then pg_temp.u(5) end,
       case when v.estado = 'aceito' then now() end
from (values
  (1, 5, 4, 'pendente'), (2, 5, 4, 'pendente'), (3, 5, 4, 'aceito'), (4, 5, 4, 'revogado'),
  (5, 6, 4, 'pendente'), (6, 10, 18, 'pendente'), (7, 11, 21, 'pendente')
) as v(n, fam, criador, estado);

select set_config('teste.foto', pg_temp.foto(), true);

-- Caso 1: a conta é a única responsável ativa de alguma família → recusa inteira.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$select public.excluir_conta()$$, 'P0001', 'ultimo responsavel',
  'única responsável ativa e sozinha na família não exclui a conta');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok($$select public.excluir_conta()$$, 'P0001', 'ultimo responsavel',
  'única responsável ativa com outros membros não exclui a conta');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select public.excluir_conta()$$, 'P0001', 'ultimo responsavel',
  'se uma das famílias cai no caso 1, a exclusão é recusada inteira');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000030", "role": "authenticated"}';
select throws_ok($$select public.excluir_conta()$$, 'P0001', 'conta inexistente',
  'conta sem linha em contas');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select public.excluir_conta()$$, '42501', null, 'anon não executa excluir_conta');

reset role;

select is(pg_temp.foto(), current_setting('teste.foto'),
  'as chamadas recusadas não mudaram nada: contas, famílias, vínculos, convites, bebês e usuários iguais');

-- Caso 2: criador e responsável com outros responsáveis ativos (família 5); cuidador em outra (6).
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'responsável com outros responsáveis ativos exclui a conta');
reset role;

select is(
  (select count(*)::int from auth.users where id = pg_temp.u(4))
  + (select count(*)::int from public.contas where id = pg_temp.u(4))
  + (select count(*)::int from public.vinculos where conta_id = pg_temp.u(4)),
  0,
  'a conta some de auth.users, de contas e de vinculos (em qualquer estado)'
);
select is(
  (select criada_por from public.familias where id = pg_temp.f(5)),
  pg_temp.u(6),
  'a titularidade passa ao responsável ativo mais antigo; no empate, ao menor conta_id'
);
select is(
  (select criada_por from public.familias where id = pg_temp.f(6)),
  pg_temp.u(27),
  'na família onde a conta era só cuidadora, a titularidade não muda (caso 5)'
);
select is(
  (select array_agg(v.conta_id::text || ':' || v.papel || ':' || v.estado || ':' || v.epoca order by v.conta_id)
     from public.vinculos v where v.familia_id = pg_temp.f(5)),
  array[
    pg_temp.u(5)::text || ':responsavel:ativo:1', pg_temp.u(6)::text || ':responsavel:ativo:1',
    pg_temp.u(7)::text || ':responsavel:ativo:1', pg_temp.u(8)::text || ':responsavel:revogado:1',
    pg_temp.u(9)::text || ':responsavel:saiu:1', pg_temp.u(10)::text || ':responsavel:ativo:1',
    pg_temp.u(11)::text || ':cuidador:ativo:1'
  ],
  'os outros vínculos da família 5 seguem como estavam, sem mudança de época'
);
select is(
  (select array_agg(c.estado::text || ':' || (c.criado_por is null)::text order by c.id) from public.convites c
    where c.id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
                   'c0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000004',
                   'c0000000-0000-4000-8000-000000000005')),
  array['revogado:true', 'revogado:true', 'aceito:true', 'revogado:true', 'revogado:true'],
  'convites pendentes da conta, em qualquer família, viram revogado; todos ficam com criado_por nulo'
);
select is(
  (select c.aceito_por from public.convites c where c.id = 'c0000000-0000-4000-8000-000000000003'),
  pg_temp.u(5),
  'o convite aceito sobrevive, com quem aceitou e quando (D21)'
);
select is(
  (select b.nome || ':' || coalesce(b.criado_por::text, 'nulo') from public.bebes b where b.id = 'bebe0000-0000-4000-8000-000000000001'),
  'Do 04:nulo',
  'bebes.criado_por da conta excluída vira nulo e o bebê continua'
);
select is(
  (select coalesce(b.criado_por::text, 'nulo') from public.bebes b where b.id = 'bebe0000-0000-4000-8000-000000000002'),
  pg_temp.u(5)::text,
  'o bebê criado por outra pessoa fica intacto'
);
select is(
  (select v.concedido_por is null from public.vinculos v where v.familia_id = pg_temp.f(5) and v.conta_id = pg_temp.u(5)),
  true,
  'vinculos.concedido_por que apontava para a conta excluída vira nulo'
);

-- Caso 2 com o vínculo do criador inativo; vínculo que saiu em família alheia.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000012", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'criador com vínculo revogado exclui a conta');
reset role;

select is(
  (select criada_por from public.familias where id = pg_temp.f(7)),
  pg_temp.u(13),
  'a titularidade passa mesmo quando o vínculo do criador já estava inativo'
);
select is(
  (select criada_por from public.familias where id = pg_temp.f(8)),
  pg_temp.u(28),
  'o vínculo que saiu em família alheia só é apagado; a titularidade não muda'
);
select is(
  (select count(*)::int from public.vinculos where conta_id = pg_temp.u(12)), 0,
  'os vínculos da conta, revogado e que saiu, foram apagados'
);

-- Caso 3: criador que saiu, nenhum responsável ativo, membros ativos → o mais antigo é promovido.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000014", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'criador que saiu exclui a conta');
reset role;

select is(
  (select criada_por from public.familias where id = pg_temp.f(9)),
  pg_temp.u(15),
  'caso 3: a titularidade passa ao membro ativo mais antigo'
);
select is(
  (select v.papel::text || '|' || v.estado::text || '|' || coalesce(v.valido_ate::text, '-') || '|' || v.epoca::text
          || '|' || coalesce(v.concedido_por::text, '-')
     from public.vinculos v where v.familia_id = pg_temp.f(9) and v.conta_id = pg_temp.u(15)),
  'responsavel|ativo|-|3|-',
  'caso 3: o promovido vira responsável, sem validade, com época +1 e concedido_por nulo'
);
select is(
  (select array_agg(v.conta_id::text || ':' || v.papel || ':' || v.estado || ':' || v.epoca order by v.conta_id)
     from public.vinculos v where v.familia_id = pg_temp.f(9) and v.conta_id <> pg_temp.u(15)),
  array[pg_temp.u(16)::text || ':observador:ativo:1', pg_temp.u(29)::text || ':cuidador:revogado:1'],
  'caso 3: os outros vínculos não mudam'
);

-- Caso 4: criador sem nenhum outro membro ativo → a família é apagada com tudo.
select is(
  (select count(*)::int from public.familias where id = pg_temp.f(10)), 1, 'antes: a família órfã existe'
);
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000017", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'criador revogado de família órfã exclui a conta');
reset role;

select is(
  (select count(*)::int from public.familias where id = pg_temp.f(10))
  + (select count(*)::int from public.vinculos where familia_id = pg_temp.f(10))
  + (select count(*)::int from public.bebes where familia_id = pg_temp.f(10))
  + (select count(*)::int from public.convites where familia_id = pg_temp.f(10)),
  0,
  'caso 4: a família órfã é apagada com bebês, vínculos e convites'
);
select is(
  (select count(*)::int from public.contas where id in (pg_temp.u(18), pg_temp.u(19), pg_temp.u(20))), 3,
  'as contas dos outros ex-membros continuam'
);

-- Caso 5: cuidador que não é o criador.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000021", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'cuidador exclui a conta');
reset role;

select is(
  (select criada_por from public.familias where id = pg_temp.f(11)), pg_temp.u(22),
  'caso 5: a titularidade não muda'
);
select is(
  (select array_agg(v.conta_id::text || ':' || v.papel || ':' || v.epoca order by v.conta_id)
     from public.vinculos v where v.familia_id = pg_temp.f(11)),
  array[pg_temp.u(22)::text || ':responsavel:1', pg_temp.u(23)::text || ':observador:1'],
  'caso 5: só o vínculo da conta some, sem mudança de época nos outros'
);
select is(
  (select c.estado::text || ':' || (c.criado_por is null)::text from public.convites c
    where c.id = 'c0000000-0000-4000-8000-000000000007'),
  'revogado:true',
  'o convite pendente criado por cuidador também vira revogado'
);

-- Observador também exclui a conta (todo papel), em família sem outro vínculo alterado.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000023", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'observador exclui a conta');
reset role;
select is(
  (select count(*)::int from auth.users where id = pg_temp.u(23)), 0, 'a conta do observador some de auth.users'
);

-- Responsável com outro responsável que exclui, sem ser o criador, em família alheia.
select is(
  (select count(*)::int from public.vinculos where familia_id = pg_temp.f(3)), 2,
  'antes: a família 3 tem dois responsáveis'
);
update public.vinculos set papel = 'cuidador' where familia_id = pg_temp.f(4) and conta_id = pg_temp.u(3);
-- 03 deixa de ser responsável da família 4 (que fica sem responsável: estado impossível, só para o teste).
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$,
  'responsável com outro responsável na família 3 e cuidador na 4 exclui a conta');
reset role;
select is(
  (select criada_por from public.familias where id = pg_temp.f(4)), pg_temp.u(26),
  'família 4: criador sem responsável ativo (caso 3) passa a titularidade ao único membro ativo'
);
select is(
  (select v.papel::text || '|' || v.epoca::text from public.vinculos v
    where v.familia_id = pg_temp.f(4) and v.conta_id = pg_temp.u(26)),
  'responsavel|2',
  'família 4: o observador 26 foi promovido a responsável'
);
select is(
  (select criada_por from public.familias where id = pg_temp.f(3)), pg_temp.u(25),
  'família 3: a titularidade já era de outro responsável e segue'
);

-- Caminho de saída do caso 1: a única responsável, sozinha, só exclui a conta depois de excluir a família.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000033", "role": "authenticated"}';
select throws_ok($$select public.excluir_conta()$$, 'P0001', 'ultimo responsavel',
  'a única responsável, sozinha na família 13, recebe ultimo responsavel');
reset role;
select is(
  (select count(*)::int from auth.users where id = pg_temp.u(33))
  + (select count(*)::int from public.contas where id = pg_temp.u(33))
  + (select count(*)::int from public.vinculos where conta_id = pg_temp.u(33)),
  3,
  'depois da recusa, conta, usuário e vínculo seguem de pé'
);
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000033", "role": "authenticated"}';
select lives_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000013')$$,
  'ela exclui a família 13 com excluir_familia');
select lives_ok($$select public.excluir_conta()$$, 'e então a exclusão da conta dá certo');
reset role;
select is(
  (select count(*)::int from auth.users where id = pg_temp.u(33))
  + (select count(*)::int from public.contas where id = pg_temp.u(33))
  + (select count(*)::int from public.vinculos where conta_id = pg_temp.u(33))
  + (select count(*)::int from public.familias where id = pg_temp.f(13)),
  0,
  'vínculos, linha de contas, linha de auth.users e a família sumiram'
);

-- Antiguidade no reingresso (D6): o criado_em do vínculo recomeça no aceite, então quem voltou perde a
-- titularidade para o responsável mais novo que nunca saiu. Família 14: 35 saiu e voltou.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000035", "role": "authenticated"}';
select lives_ok($$select public.aceitar_convite(repeat('e1', 32))$$, 'quem saiu volta pelo aceitar_convite');
reset role;
select is(
  (select v.estado::text || '|' || (v.criado_em = now())::text || '|' || v.epoca::text
     from public.vinculos v where v.familia_id = pg_temp.f(14) and v.conta_id = pg_temp.u(35)),
  'ativo|true|2',
  'o reingresso renova o criado_em do vínculo e soma 1 à época'
);
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000034", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'o criador da família 14 exclui a conta');
reset role;
select is(
  (select criada_por from public.familias where id = pg_temp.f(14)),
  pg_temp.u(36),
  'a titularidade vai para o responsável que nunca saiu, não para o que voltou (mais antigo antes da saída)'
);

-- Família 15: 38 foi revogado e voltou.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000038", "role": "authenticated"}';
select lives_ok($$select public.aceitar_convite(repeat('e2', 32))$$, 'quem foi revogado volta pelo aceitar_convite');
reset role;
select is(
  (select v.estado::text || '|' || (v.criado_em = now())::text || '|' || v.epoca::text
     from public.vinculos v where v.familia_id = pg_temp.f(15) and v.conta_id = pg_temp.u(38)),
  'ativo|true|2',
  'o reingresso do revogado também renova o criado_em e soma 1 à época'
);
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000037", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'o criador da família 15 exclui a conta');
reset role;
select is(
  (select criada_por from public.familias where id = pg_temp.f(15)),
  pg_temp.u(39),
  'a titularidade vai para o responsável que nunca saiu também quando o outro foi revogado e voltou'
);

-- Falhas simuladas (C3) e rede de proteção: 31 é cuidador da família 12, onde 32 é responsável.
select set_config('teste.foto', pg_temp.foto(), true);

create schema teste_falhas;

create function teste_falhas.impasse() returns trigger language plpgsql as $$
begin
  raise deadlock_detected;
end;
$$;

create function teste_falhas.nula() returns trigger language plpgsql as $$
begin
  raise not_null_violation;
end;
$$;

create function teste_falhas.derruba_responsaveis() returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() = 1 then
    update public.vinculos set estado = 'saiu' where familia_id = old.familia_id and papel = 'responsavel';
  end if;
  return null;
end;
$$;

create trigger falha_simulada before delete on public.vinculos
  for each row execute function teste_falhas.impasse();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000031", "role": "authenticated"}';
select throws_ok($$select public.excluir_conta()$$, 'P0001', 'tente de novo', '40P01 vira tente de novo em excluir_conta');

reset role;
drop trigger falha_simulada on public.vinculos;
create trigger falha_simulada before delete on public.vinculos
  for each row execute function teste_falhas.nula();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000031", "role": "authenticated"}';
select throws_ok($$select public.excluir_conta()$$, 'P0001', 'parametro obrigatorio',
  '23502 vira parametro obrigatorio em excluir_conta');

reset role;
drop trigger falha_simulada on public.vinculos;
create trigger falha_simulada after delete on public.vinculos
  for each row execute function teste_falhas.derruba_responsaveis();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000031", "role": "authenticated"}';
select throws_ok($$select public.excluir_conta()$$, 'P0001', 'ultimo responsavel',
  'a conferência final recusa a exclusão que deixaria a família sem responsável');

reset role;
drop trigger falha_simulada on public.vinculos;

select is(pg_temp.foto(), current_setting('teste.foto'),
  'as falhas simuladas desfizeram tudo: a conta, os vínculos e os convites continuam');

-- Sem falha, a mesma conta exclui normalmente.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000031", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'sem a falha simulada, a exclusão funciona');
reset role;
select is(
  (select count(*)::int from public.vinculos where familia_id = pg_temp.f(12) and papel = 'responsavel' and estado = 'ativo'),
  1,
  'a família 12 segue com seu responsável'
);

-- Estrutura.
select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.excluir_conta()'::regprocedure),
  'order by f\.id\s+for update',
  'excluir_conta trava as famílias da conta em ordem crescente de id'
);
select ok(
  (select p.prosecdef and p.proconfig @> array['search_path=""'] and p.pronargs = 0
     from pg_proc p where p.oid = 'public.excluir_conta()'::regprocedure),
  'excluir_conta é security definer, com search_path vazio e sem parâmetros'
);

select * from finish();
rollback;
