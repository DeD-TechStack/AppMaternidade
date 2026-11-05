begin;
create extension if not exists pgtap with schema extensions;

select plan(61);

-- Família 1: 01 responsável (a mais antiga), 02 e 03 responsáveis, 04 e 05 cuidadores com validade futura,
-- 06 e 07 observadores (06 com validade futura), 08 cuidador revogado, 09 observador que saiu,
-- 10 cuidador ativo com validade vencida, 19 responsável revogado, 20 responsável que saiu,
-- 21 responsável com validade vencida. 02 também é responsável da família 4.
-- Família 2: 11 responsável e 12 cuidador. 13 existe só em auth.users, sem linha em contas.
-- Família 3: 14 é o único responsável ativo, com 15 cuidador e três ex-responsáveis (16 revogado, 17 saiu,
-- 18 com validade vencida).
insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || n || '@exemplo.invalid'
from generate_series(1, 21) as n;

insert into public.contas (id, nome_privado)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'U' || n
from generate_series(1, 21) as n
where n <> 13;

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000011'),
  ('ffffffff-0000-4000-8000-000000000003', 'Família 3', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000014'),
  ('ffffffff-0000-4000-8000-000000000004', 'Família 4', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000002');

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
  (5,  'ffffffff-0000-4000-8000-000000000001', 'cuidador',    'ativo',    now() + interval '2 days'),
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
  (18, 'ffffffff-0000-4000-8000-000000000003', 'responsavel', 'ativo',    now() - interval '1 day')
) as v(n, familia, papel, estado, valido);

-- O vínculo de 02 na família 4 tem id próprio.
insert into public.vinculos (id, familia_id, conta_id, papel) values
  ('bb000000-0000-4000-8000-0000000000f4', 'ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel');

-- Convites: 02 tem dois pendentes, um aceito e um revogado na família 1 e um pendente na família 4;
-- 03 tem dois pendentes; 01 tem um; 04 (cuidador) tem um pendente.
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
  ('41', 'ffffffff-0000-4000-8000-000000000001', '04', 'pendente')
) as v(n, familia, criador, estado);

-- Resumo de um vínculo da família 1: estado|papel|valido_ate|época|final do concedido_por.
create function pg_temp.v(n int) returns text language sql as $$
  select v.estado::text || '|' || v.papel::text || '|' || coalesce(v.valido_ate::text, '-') || '|'
         || v.epoca::text || '|' || coalesce(right(v.concedido_por::text, 2), '-')
    from public.vinculos v
   where v.familia_id = 'ffffffff-0000-4000-8000-000000000001'
     and v.conta_id = ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid;
$$;

create function pg_temp.foto() returns text language sql as $$
  select (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
      || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c);
$$;

select set_config('teste.foto', pg_temp.foto(), true);

-- Sem permissão: quem não é responsável ativo da família do vínculo, e vínculo inexistente.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', 'observador')$$,
  '42501', 'sem permissao', 'cuidador não muda papel'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000004', 'responsavel')$$,
  '42501', 'sem permissao', 'cuidador não se promove'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000008', 'observador')$$,
  '42501', 'sem permissao', 'sem permissao vem antes de vinculo inativo'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', 'observador')$$,
  '42501', 'sem permissao', 'observador não muda papel'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000019", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', 'observador')$$,
  '42501', 'sem permissao', 'responsável revogado não muda papel'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000020", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', 'observador')$$,
  '42501', 'sem permissao', 'responsável que saiu não muda papel'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000021", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', 'observador')$$,
  '42501', 'sem permissao', 'responsável com validade vencida não muda papel'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', 'observador')$$,
  '42501', 'sem permissao', 'responsável de outra família não muda papel na família 1'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-0000000000ee', 'observador')$$,
  '42501', 'sem permissao', 'vínculo inexistente dá o mesmo erro de vínculo alheio'
);

-- Vínculo alvo inativo (revogado, saiu e vencido), com qualquer papel pedido.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000008', 'responsavel')$$,
  'P0001', 'vinculo inativo', 'vínculo revogado não muda de papel'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000008', 'cuidador')$$,
  'P0001', 'vinculo inativo', 'vinculo inativo vem antes de papel igual (revogado)'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000009', 'cuidador')$$,
  'P0001', 'vinculo inativo', 'vínculo de quem saiu não muda de papel'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000010', 'observador')$$,
  'P0001', 'vinculo inativo', 'vínculo vencido não muda de papel'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000021', 'cuidador')$$,
  'P0001', 'vinculo inativo', 'responsável com validade vencida é vínculo inativo'
);

-- Papel igual, em todo papel.
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'responsavel')$$,
  'P0001', 'papel igual', 'responsável para responsável'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', 'cuidador')$$,
  'P0001', 'papel igual', 'cuidador para cuidador'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000007', 'observador')$$,
  'P0001', 'papel igual', 'observador para observador'
);

-- Último responsável: família 3 tem um responsável ativo e três ex-responsáveis inativos.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000014", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000014', 'cuidador')$$,
  'P0001', 'ultimo responsavel', 'o único responsável não se rebaixa a cuidador, mesmo com outros membros'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000014', 'observador')$$,
  'P0001', 'ultimo responsavel', 'o único responsável não se rebaixa a observador'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000014', 'responsavel')$$,
  'P0001', 'papel igual', 'o único responsável trocando para responsavel dá papel igual'
);

-- Parâmetros nulos, conta sem linha em contas e anônimo.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel(null, 'observador')$$,
  'P0001', 'parametro obrigatorio', 'vínculo nulo'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', null)$$,
  'P0001', 'parametro obrigatorio', 'novo papel nulo'
);
select throws_ok(
  $$select public.mudar_papel(null, null)$$,
  'P0001', 'parametro obrigatorio', 'vínculo e papel nulos'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', 'observador')$$,
  'P0001', 'conta inexistente', 'conta sem linha em contas'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-0000000000ee', 'observador')$$,
  'P0001', 'conta inexistente', 'conta inexistente vem antes de sem permissao'
);
select throws_ok(
  $$select public.mudar_papel(null, 'observador')$$,
  'P0001', 'parametro obrigatorio', 'parametro obrigatorio vem antes de conta inexistente'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', 'observador')$$,
  '42501', null, 'anon não executa mudar_papel'
);

reset role;

select is(pg_temp.foto(), current_setting('teste.foto'), 'as chamadas recusadas não mudaram vínculos nem convites');

-- Efeitos: as seis trocas de papel, feitas pelo responsável 01.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok($$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'cuidador')$$,
  'responsável vira cuidador');
select lives_ok($$select public.mudar_papel('bb000000-0000-4000-8000-000000000003', 'observador')$$,
  'responsável vira observador');
select lives_ok($$select public.mudar_papel('bb000000-0000-4000-8000-000000000004', 'responsavel')$$,
  'cuidador vira responsável');
select lives_ok($$select public.mudar_papel('bb000000-0000-4000-8000-000000000005', 'observador')$$,
  'cuidador vira observador');
select lives_ok($$select public.mudar_papel('bb000000-0000-4000-8000-000000000006', 'responsavel')$$,
  'observador vira responsável');
select lives_ok($$select public.mudar_papel('bb000000-0000-4000-8000-000000000007', 'cuidador')$$,
  'observador vira cuidador');

reset role;

select is(pg_temp.v(2), 'ativo|cuidador|-|2|01', 'responsável rebaixado a cuidador: época 2, concedido por 01');
select is(pg_temp.v(3), 'ativo|observador|-|2|01', 'responsável rebaixado a observador: época 2, concedido por 01');
select is(pg_temp.v(4), 'ativo|responsavel|-|2|01', 'cuidador promovido perde a validade (D4): época 2');
select is(
  pg_temp.v(5), 'ativo|observador|' || (now() + interval '2 days')::text || '|2|01',
  'cuidador rebaixado a observador mantém a validade: época 2'
);
select is(pg_temp.v(6), 'ativo|responsavel|-|2|01', 'observador promovido perde a validade (D4): época 2');
select is(pg_temp.v(7), 'ativo|cuidador|-|2|01', 'observador vira cuidador: época 2');
select is(pg_temp.v(1), 'ativo|responsavel|-|1|-', 'o chamador não teve a época mexida');
select is(
  (select v.estado::text || '|' || (v.encerrado_em is null)::text from public.vinculos v
    where v.id = 'bb000000-0000-4000-8000-000000000002'),
  'ativo|true',
  'trocar papel não encerra o vínculo'
);

-- Convites de quem deixa de ser responsável (D5).
select is(
  (select array_agg(c.estado::text order by c.id) from public.convites c
    where c.criado_por = 'aaaaaaaa-0000-4000-8000-000000000002' and c.familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  array['revogado', 'revogado', 'aceito', 'revogado'],
  'os pendentes de 02 na família 1 viram revogado; o aceito e o revogado ficam como estavam'
);
select is(
  (select array_agg(c.estado::text order by c.id) from public.convites c
    where c.criado_por = 'aaaaaaaa-0000-4000-8000-000000000003'),
  array['revogado', 'revogado'],
  'os pendentes de 03 também viram revogado'
);
select is(
  (select c.estado::text from public.convites c where c.id = 'c0000000-0000-4000-8000-000000000025'),
  'pendente',
  'o convite de 02 na família 4 (onde segue responsável) continua pendente'
);
select is(
  (select array_agg(c.estado::text order by c.id) from public.convites c
    where c.id in ('c0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000041')),
  array['pendente', 'pendente'],
  'convites de quem não foi rebaixado, ou de promovido, seguem pendentes'
);

-- Invariante 1: o efeito vale na mesma transação.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Rebaixado', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000002')$$,
  '42501', null, 'quem foi rebaixado já não insere bebê'
);
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select lives_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Promovido observador', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000006')$$,
  'o observador promovido a responsável já insere bebê'
);
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select lives_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Promovido', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000004')$$,
  'quem foi promovido já insere bebê'
);

-- O promovido (04) já pode trocar papéis: rebaixa o responsável 01, que não era o único (04 e 06 também são).
select lives_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000001', 'cuidador')$$,
  'o promovido rebaixa outro responsável quando sobra pelo menos um'
);

reset role;

select is(pg_temp.v(1), 'ativo|cuidador|-|2|04', 'o rebaixado tem época 2 e foi concedido por 04');

-- Autorrebaixamento com dois responsáveis: 22 e 23 são responsáveis ativos da família 5; 22 criou dois
-- convites pendentes e 23 criou um.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000022', 'u22@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000023', 'u23@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000022', 'U22'),
  ('aaaaaaaa-0000-4000-8000-000000000023', 'U23');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000005', 'Família 5', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000022');

insert into public.vinculos (id, familia_id, conta_id, papel) values
  ('bb000000-0000-4000-8000-000000000022', 'ffffffff-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000022', 'responsavel'),
  ('bb000000-0000-4000-8000-000000000023', 'ffffffff-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000023', 'responsavel');

insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em) values
  ('c0000000-0000-4000-8000-000000000051', 'ffffffff-0000-4000-8000-000000000005', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000022', 'hash-51', now() + interval '3 days'),
  ('c0000000-0000-4000-8000-000000000052', 'ffffffff-0000-4000-8000-000000000005', 'cuidador',
   'aaaaaaaa-0000-4000-8000-000000000022', 'hash-52', now() + interval '3 days'),
  ('c0000000-0000-4000-8000-000000000053', 'ffffffff-0000-4000-8000-000000000005', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000023', 'hash-53', now() + interval '3 days');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000022", "role": "authenticated"}';
select lives_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000022', 'cuidador')$$,
  'o responsável se rebaixa a cuidador quando há outro responsável ativo'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000005', 'Autorrebaixado', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000022')$$,
  '42501', null, 'quem se rebaixou já não insere bebê na mesma transação'
);

reset role;

select is(
  (select v.estado::text || '|' || v.papel::text || '|' || v.epoca::text || '|' || right(v.concedido_por::text, 2)
     from public.vinculos v where v.id = 'bb000000-0000-4000-8000-000000000022'),
  'ativo|cuidador|2|22',
  'o autorrebaixado fica cuidador ativo, com época 2 e concedido por ele mesmo'
);
select is(
  (select array_agg(c.estado::text order by c.id) from public.convites c
    where c.criado_por = 'aaaaaaaa-0000-4000-8000-000000000022'),
  array['revogado', 'revogado'],
  'os convites pendentes que o autorrebaixado criou viram revogado'
);
select is(
  (select v.papel::text || '|' || v.epoca::text || '|' || (select c.estado::text from public.convites c
                                                          where c.id = 'c0000000-0000-4000-8000-000000000053')
     from public.vinculos v where v.id = 'bb000000-0000-4000-8000-000000000023'),
  'responsavel|1|pendente',
  'o outro responsável e o convite dele seguem intactos'
);

-- Conversões de erro por falha simulada (C3): 04 é responsável, 07 é cuidador.
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
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000007', 'observador')$$,
  'P0001', 'tente de novo', '40P01 vira tente de novo em mudar_papel'
);

reset role;
drop trigger falha_simulada on public.vinculos;
create trigger falha_simulada before update on public.vinculos
  for each row execute function teste_falhas.nula();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000007', 'observador')$$,
  'P0001', 'parametro obrigatorio', '23502 vira parametro obrigatorio em mudar_papel'
);

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
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000007', 'observador')$$,
  'P0001', 'ultimo responsavel', 'a conferência final recusa troca que deixaria a família sem responsável'
);

reset role;
drop trigger falha_simulada on public.vinculos;

select is(pg_temp.foto(), current_setting('teste.foto'), 'as falhas simuladas não mudaram vínculos, épocas nem convites');

-- Estrutura.
select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.mudar_papel(uuid, public.papel_familia)'::regprocedure),
  'public\.familias f where f\.id = v_familia for update(.|\n)*tem_vinculo_ativo(.|\n)*public\.vinculos v(.|\n)*for update',
  'mudar_papel trava a família, confere o chamador e só então trava o vínculo alvo'
);

select * from finish();
rollback;
