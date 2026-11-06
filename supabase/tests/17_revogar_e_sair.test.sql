begin;
create extension if not exists pgtap with schema extensions;

select plan(89);

-- Família 1: 01, 02 e 03 responsáveis ativos (01 é a mais antiga), 04 cuidador com validade futura, 05 cuidador,
-- 06 observador com validade futura, 07 observador, 08 cuidador revogado, 09 observador que saiu,
-- 10 cuidador ativo com validade vencida, 19 responsável revogado, 20 responsável que saiu,
-- 21 responsável com validade vencida. Família 2: 11 responsável e 12 cuidador.
-- 13 existe só em auth.users, sem linha em contas.
-- Família 3: 14 é o único responsável ativo, com 15 cuidador e três ex-responsáveis (16 revogado, 17 saiu,
-- 18 com validade vencida). Família 6: 22 sozinho. Família 7: 23 e 24 responsáveis e 25 cuidador.
insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || n || '@exemplo.invalid'
from generate_series(1, 25) as n;

insert into public.contas (id, nome_privado)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'U' || n
from generate_series(1, 25) as n
where n <> 13;

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000011'),
  ('ffffffff-0000-4000-8000-000000000003', 'Família 3', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000014'),
  ('ffffffff-0000-4000-8000-000000000004', 'Família 4', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000002'),
  ('ffffffff-0000-4000-8000-000000000006', 'Família 6', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000022'),
  ('ffffffff-0000-4000-8000-000000000007', 'Família 7', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000023');

-- O id do vínculo de cada conta é bb000000-...-0000000000NN, com NN igual ao número da conta.
insert into public.vinculos (id, familia_id, conta_id, papel, estado, valido_ate, criado_em)
select ('bb000000-0000-4000-8000-0000000000' || lpad(v.n::text, 2, '0'))::uuid,
       v.familia::uuid,
       ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(v.n::text, 2, '0'))::uuid,
       v.papel::public.papel_familia, v.estado::public.estado_vinculo, v.valido::timestamptz,
       now() - (100 - v.n) * interval '1 day'
from (values
  (1,  'ffffffff-0000-4000-8000-000000000001', 'responsavel', 'ativo',    null::timestamptz),
  (2,  'ffffffff-0000-4000-8000-000000000001', 'responsavel', 'ativo',    null),
  (3,  'ffffffff-0000-4000-8000-000000000001', 'responsavel', 'ativo',    null),
  (4,  'ffffffff-0000-4000-8000-000000000001', 'cuidador',    'ativo',    now() + interval '1 day'),
  (5,  'ffffffff-0000-4000-8000-000000000001', 'cuidador',    'ativo',    null),
  (6,  'ffffffff-0000-4000-8000-000000000001', 'observador',  'ativo',    now() + interval '1 day'),
  (7,  'ffffffff-0000-4000-8000-000000000001', 'observador',  'ativo',    null),
  (8,  'ffffffff-0000-4000-8000-000000000001', 'cuidador',    'revogado', null),
  (9,  'ffffffff-0000-4000-8000-000000000001', 'observador',  'saiu',     null),
  (10, 'ffffffff-0000-4000-8000-000000000001', 'cuidador',    'ativo',    now() - interval '1 day'),
  (19, 'ffffffff-0000-4000-8000-000000000001', 'responsavel', 'revogado', null),
  (20, 'ffffffff-0000-4000-8000-000000000001', 'responsavel', 'saiu',     null),
  (21, 'ffffffff-0000-4000-8000-000000000001', 'responsavel', 'ativo',    now() - interval '1 day'),
  (11, 'ffffffff-0000-4000-8000-000000000002', 'responsavel', 'ativo',    null),
  (12, 'ffffffff-0000-4000-8000-000000000002', 'cuidador',    'ativo',    null),
  (14, 'ffffffff-0000-4000-8000-000000000003', 'responsavel', 'ativo',    null),
  (15, 'ffffffff-0000-4000-8000-000000000003', 'cuidador',    'ativo',    null),
  (16, 'ffffffff-0000-4000-8000-000000000003', 'responsavel', 'revogado', null),
  (17, 'ffffffff-0000-4000-8000-000000000003', 'responsavel', 'saiu',     null),
  (18, 'ffffffff-0000-4000-8000-000000000003', 'responsavel', 'ativo',    now() - interval '1 day'),
  (22, 'ffffffff-0000-4000-8000-000000000006', 'responsavel', 'ativo',    null),
  (23, 'ffffffff-0000-4000-8000-000000000007', 'responsavel', 'ativo',    null),
  (24, 'ffffffff-0000-4000-8000-000000000007', 'responsavel', 'ativo',    null),
  (25, 'ffffffff-0000-4000-8000-000000000007', 'cuidador',    'ativo',    null)
) as v(n, familia, papel, estado, valido);

insert into public.vinculos (id, familia_id, conta_id, papel) values
  ('bb000000-0000-4000-8000-0000000000f4', 'ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel');

-- Bebê criado por 03 e por 05: a autoria não muda quando eles saem.
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bebe0000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'Do 03', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000003'),
  ('bebe0000-0000-4000-8000-000000000005', 'ffffffff-0000-4000-8000-000000000001', 'Do 05', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000005');

-- Convites pendentes de 02 (duas na família 1 e uma na 4), de 03, de 01, de 04 e de 05 (cuidadores,
-- criados pelo dono da tabela), um aceito e um revogado de 02.
insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em, estado, aceito_por, aceito_em)
select ('c0000000-0000-4000-8000-0000000000' || v.n)::uuid, v.familia::uuid, 'observador',
       ('aaaaaaaa-0000-4000-8000-0000000000' || v.criador)::uuid, 'hash-' || v.n,
       now() + interval '3 days', v.estado::public.estado_convite,
       case when v.estado = 'aceito' then 'aaaaaaaa-0000-4000-8000-000000000012'::uuid end,
       case when v.estado = 'aceito' then now() end
from (values
  ('11', 'ffffffff-0000-4000-8000-000000000001', '01', 'pendente'),
  ('21', 'ffffffff-0000-4000-8000-000000000001', '02', 'pendente'),
  ('22', 'ffffffff-0000-4000-8000-000000000001', '02', 'pendente'),
  ('23', 'ffffffff-0000-4000-8000-000000000001', '02', 'aceito'),
  ('24', 'ffffffff-0000-4000-8000-000000000001', '02', 'revogado'),
  ('25', 'ffffffff-0000-4000-8000-000000000004', '02', 'pendente'),
  ('31', 'ffffffff-0000-4000-8000-000000000001', '03', 'pendente'),
  ('32', 'ffffffff-0000-4000-8000-000000000001', '03', 'pendente'),
  ('41', 'ffffffff-0000-4000-8000-000000000001', '04', 'pendente'),
  ('51', 'ffffffff-0000-4000-8000-000000000001', '05', 'pendente')
) as v(n, familia, criador, estado);

-- Resumo de um vínculo da família 1: estado|papel|valido_ate|época|encerrado agora?|final do concedido_por.
create function pg_temp.v(n int) returns text language sql as $$
  select v.estado::text || '|' || v.papel::text || '|' || coalesce(v.valido_ate::text, '-') || '|'
         || v.epoca::text || '|' || coalesce((v.encerrado_em = now())::text, '-') || '|'
         || coalesce(right(v.concedido_por::text, 2), '-')
    from public.vinculos v
   where v.familia_id = 'ffffffff-0000-4000-8000-000000000001'
     and v.conta_id = ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid;
$$;

create function pg_temp.foto() returns text language sql as $$
  select (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
      || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c) || '/'
      || (select md5(string_agg(b::text, '|' order by b.id)) from public.bebes b);
$$;

select set_config('teste.foto', pg_temp.foto(), true);

-- revogar_vinculo: erros.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000005')$$,
  '42501', 'sem permissao', 'cuidador não revoga vínculo');
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000004')$$,
  '42501', 'sem permissao', 'cuidador revogando o próprio vínculo recebe sem permissao, que vem antes de use sair da familia');
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000008')$$,
  '42501', 'sem permissao', 'sem permissao vem antes de vinculo inativo');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000005')$$,
  '42501', 'sem permissao', 'observador não revoga vínculo');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000019", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000005')$$,
  'P0002', 'vinculo inexistente', 'responsável revogado não revoga vínculo (sem visibilidade: P0002)');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000020", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000005')$$,
  'P0002', 'vinculo inexistente', 'responsável que saiu não revoga vínculo (sem visibilidade: P0002)');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000021", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000005')$$,
  'P0002', 'vinculo inexistente', 'responsável com validade vencida não revoga vínculo (sem visibilidade: P0002)');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000005')$$,
  'P0002', 'vinculo inexistente', 'responsável de outra família não revoga vínculo da família 1 (sem visibilidade: P0002)');
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-0000000000ee')$$,
  'P0002', 'vinculo inexistente', 'vínculo inexistente dá o mesmo erro de vínculo alheio (P0002)');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000001')$$,
  'P0001', 'use sair da familia', 'responsável não revoga o próprio vínculo');
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000008')$$,
  'P0001', 'vinculo inativo', 'vínculo revogado não é revogado de novo');
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000009')$$,
  'P0001', 'vinculo inativo', 'vínculo de quem saiu não é revogado');
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000010')$$,
  'P0001', 'vinculo inativo', 'vínculo vencido não é revogado');
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000021')$$,
  'P0001', 'vinculo inativo', 'responsável com validade vencida é vínculo inativo');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000014", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000014')$$,
  'P0001', 'use sair da familia', 'o único responsável também recebe use sair da familia');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo(null)$$, 'P0001', 'parametro obrigatorio', 'vínculo nulo');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000005')$$,
  'P0001', 'conta inexistente', 'conta sem linha em contas');
select throws_ok($$select public.revogar_vinculo(null)$$,
  'P0001', 'parametro obrigatorio', 'parametro obrigatorio vem antes de conta inexistente');

-- sair_da_familia: erros.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000014", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000003')$$,
  'P0001', 'ultimo responsavel', 'o único responsável não sai, mesmo com outros membros e ex-responsáveis');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000022", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000006')$$,
  'P0001', 'ultimo responsavel', 'o único responsável não sai nem estando sozinho na família');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'vínculo revogado não sai (sem visibilidade: P0002)');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'quem já saiu não sai de novo (sem visibilidade: P0002)');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'vínculo vencido não sai (sem visibilidade: P0002)');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000016", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000003')$$,
  'P0002', 'familia inexistente', 'responsável revogado recebe familia inexistente, que vem antes de ultimo responsavel');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000017", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000003')$$,
  'P0002', 'familia inexistente', 'responsável que saiu recebe familia inexistente');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000018", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000003')$$,
  'P0002', 'familia inexistente', 'responsável com validade vencida recebe familia inexistente');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'conta de outra família não sai da família 1 (sem visibilidade: P0002)');
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-0000000000ee')$$,
  'P0002', 'familia inexistente', 'família inexistente dá o mesmo erro (P0002)');
select throws_ok($$select public.sair_da_familia(null)$$,
  'P0001', 'parametro obrigatorio', 'família nula');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0001', 'conta inexistente', 'conta sem linha em contas');
select throws_ok($$select public.sair_da_familia(null)$$,
  'P0001', 'parametro obrigatorio', 'parametro obrigatorio vem antes de conta inexistente');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000005')$$,
  '42501', null, 'anon não executa revogar_vinculo');
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon não executa sair_da_familia');

reset role;

select is(pg_temp.foto(), current_setting('teste.foto'),
  'as chamadas recusadas não mudaram vínculos, convites, bebês nem épocas');

-- revogar_vinculo: efeitos, feitos pelo responsável 01.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000002')$$,
  'responsável revoga outro responsável');
select lives_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000004')$$,
  'responsável revoga cuidador');
select lives_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000006')$$,
  'responsável revoga observador');

reset role;

select is(pg_temp.v(2), 'revogado|responsavel|-|2|true|-', 'responsável revogado: época 2, encerrado agora, papel mantido');
select is(pg_temp.v(4), 'revogado|cuidador|' || (now() + interval '1 day')::text || '|2|true|-',
  'cuidador revogado: época 2, encerrado agora, validade mantida');
select is(pg_temp.v(6), 'revogado|observador|' || (now() + interval '1 day')::text || '|2|true|-',
  'observador revogado: época 2, encerrado agora');
select is(pg_temp.v(1), 'ativo|responsavel|-|1|-|-', 'o chamador não teve a época mexida');
select is(
  (select array_agg(c.estado::text order by c.id) from public.convites c
    where c.criado_por = 'aaaaaaaa-0000-4000-8000-000000000002' and c.familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  array['revogado', 'revogado', 'aceito', 'revogado'],
  'os pendentes do responsável revogado viram revogado; aceito e revogado ficam como estavam'
);
select is(
  (select c.estado::text from public.convites c where c.id = 'c0000000-0000-4000-8000-000000000025'),
  'pendente', 'o convite do revogado em outra família (4) segue pendente'
);
select is(
  (select array_agg(c.estado::text order by c.id) from public.convites c
    where c.id in ('c0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000041')),
  array['pendente', 'pendente'],
  'convites de quem não era o revogado, ou de cuidador revogado, seguem pendentes'
);

-- Invariante 1 e "o segundo recebe sem permissao".
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'quem foi revogado já não lê a família na mesma transação');
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000001')$$,
  'P0002', 'vinculo inexistente', 'de dois responsáveis que revogam um ao outro, o segundo recebe vinculo inexistente (P0002)');
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000003')$$,
  'P0002', 'vinculo inexistente', 'o revogado já não revoga ninguém (sem visibilidade: P0002)');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000002')$$,
  'P0001', 'vinculo inativo', 'o vínculo recém-revogado é inativo');

-- Efeito imediato da revogação, sob a identidade de cada alvo (responsável 02, cuidador 04, observador 06).
-- A política de vinculos só deixa ler quem tem vínculo ativo na família: o revogado não lê nem o próprio vínculo.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'responsável revogado lê 0 linhas em familias');
select is((select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'responsável revogado lê 0 linhas em vinculos da família, nem o próprio');
select is((select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'responsável revogado lê 0 linhas em bebes');
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Revogado 02', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000002')$$,
  '42501', null, 'responsável revogado não insere bebê');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select is((select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'cuidador revogado lê 0 linhas em familias');
select is((select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'cuidador revogado lê 0 linhas em vinculos da família, nem o próprio');
select is((select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'cuidador revogado lê 0 linhas em bebes');
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Revogado 04', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000004')$$,
  '42501', null, 'cuidador revogado não insere bebê');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select is((select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'observador revogado lê 0 linhas em familias');
select is((select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'observador revogado lê 0 linhas em vinculos da família, nem o próprio');
select is((select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'observador revogado lê 0 linhas em bebes');
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Revogado 06', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000006')$$,
  '42501', null, 'observador revogado não insere bebê');

reset role;
select is(
  (select count(*)::int from public.bebes where nome in ('Revogado 02', 'Revogado 04', 'Revogado 06')), 0,
  'nenhum bebê foi criado pelos revogados'
);

-- sair_da_familia: efeitos. 03 (responsável), 05 (cuidador) e 07 (observador) saem.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select lives_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'responsável sai quando há outro responsável ativo');
select is((select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'quem saiu já não lê a família na mesma transação');
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Saiu', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000003')$$,
  '42501', null, 'quem saiu já não insere bebê');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select lives_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$, 'cuidador sai');
select is((select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'cuidador que saiu lê 0 linhas em familias na mesma transação');
select is((select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'cuidador que saiu lê 0 linhas em bebes na mesma transação');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';
select lives_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$, 'observador sai');
select is((select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'observador que saiu lê 0 linhas em familias na mesma transação');
select is((select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'observador que saiu lê 0 linhas em bebes na mesma transação');
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'quem acabou de sair não sai de novo (sem visibilidade: P0002)');

reset role;

select is(pg_temp.v(3), 'saiu|responsavel|-|2|true|-', 'responsável que saiu: época 2, encerrado agora, papel mantido');
select is(pg_temp.v(5), 'saiu|cuidador|-|2|true|-', 'cuidador que saiu: época 2, encerrado agora');
select is(pg_temp.v(7), 'saiu|observador|-|2|true|-', 'observador que saiu: época 2, encerrado agora');
select is(
  (select array_agg(c.estado::text order by c.id) from public.convites c
    where c.id in ('c0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-000000000032',
                   'c0000000-0000-4000-8000-000000000051')),
  array['revogado', 'revogado', 'revogado'],
  'os convites pendentes de quem saiu viram revogado, mesmo o de cuidador'
);
select is(
  (select c.estado::text from public.convites c where c.id = 'c0000000-0000-4000-8000-000000000011'),
  'pendente', 'o convite de quem não saiu segue pendente'
);
select is(
  (select count(*)::int from public.bebes
    where criado_por in ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000005')),
  2,
  'a saída não muda a autoria dos bebês'
);
select is(
  (select count(*)::int from public.contas
    where id in ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000005',
                 'aaaaaaaa-0000-4000-8000-000000000007')),
  3,
  'a saída não apaga a conta nem dado pessoal'
);

-- Depois das saídas, 01 é o único responsável ativo da família 1, que ainda tem outros vínculos.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0001', 'ultimo responsavel', 'quem virou o único responsável ativo já não sai');
reset role;
select is(pg_temp.v(1), 'ativo|responsavel|-|1|-|-', 'a tentativa recusada não mexeu na época de 01');

-- Conversões de erro por falha simulada (C3): 23 e 24 são responsáveis da família 7 e 25 é cuidador.
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

create trigger falha_simulada before update on public.vinculos
  for each row execute function teste_falhas.impasse();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000023", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000025')$$,
  'P0001', 'tente de novo', '40P01 vira tente de novo em revogar_vinculo');
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000007')$$,
  'P0001', 'tente de novo', '40P01 vira tente de novo em sair_da_familia');

reset role;
drop trigger falha_simulada on public.vinculos;
create trigger falha_simulada before update on public.vinculos
  for each row execute function teste_falhas.nula();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000023", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000025')$$,
  'P0001', 'parametro obrigatorio', '23502 vira parametro obrigatorio em revogar_vinculo');
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000007')$$,
  'P0001', 'parametro obrigatorio', '23502 vira parametro obrigatorio em sair_da_familia');

reset role;
drop trigger falha_simulada on public.vinculos;

-- Rede de proteção da C3: um gatilho depois do update derruba os outros responsáveis, como faria
-- uma chamada simultânea; a conferência final recusa e desfaz tudo.
create function teste_falhas.derruba_responsaveis() returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() = 1 then
    update public.vinculos set estado = 'saiu'
     where familia_id = new.familia_id and papel = 'responsavel' and id <> new.id;
  end if;
  return null;
end;
$$;

create trigger falha_simulada after update on public.vinculos
  for each row execute function teste_falhas.derruba_responsaveis();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000023", "role": "authenticated"}';
select throws_ok($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000025')$$,
  'P0001', 'ultimo responsavel', 'a conferência final recusa revogar_vinculo que deixaria a família sem responsável');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000024", "role": "authenticated"}';
select throws_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000007')$$,
  'P0001', 'ultimo responsavel', 'a conferência final recusa sair_da_familia que deixaria a família sem responsável');

reset role;
drop trigger falha_simulada on public.vinculos;

select is(pg_temp.foto(), current_setting('teste.foto'),
  'as falhas simuladas desfizeram tudo: vínculos, épocas, convites e bebês iguais');

-- Estrutura.
select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.revogar_vinculo(uuid)'::regprocedure),
  'public\.familias f where f\.id = v_familia for update(.|\n)*tem_vinculo_ativo(.|\n)*public\.vinculos v(.|\n)*for update',
  'revogar_vinculo trava a família, confere o chamador e só então trava o vínculo alvo'
);
select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.sair_da_familia(uuid)'::regprocedure),
  'public\.familias f where f\.id = sair_da_familia\.familia for update',
  'sair_da_familia trava a linha da família'
);

select * from finish();
rollback;
