begin;
create extension if not exists pgtap with schema extensions;

select plan(46);

create function pg_temp.chaves(j jsonb) returns text[] language sql as $$
  select array(select k from jsonb_object_keys(j) k order by k);
$$;

create function pg_temp.ids(j jsonb, chave text) returns text[] language sql as $$
  select array(select e ->> chave from jsonb_array_elements(j) with ordinality as t(e, o) order by o);
$$;

create function pg_temp.utc(t timestamptz) returns text language sql as $$
  select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
$$;

-- 01 A: responsável das famílias 1 e 2, cuidador da 3, ex-responsável (saiu) da 4.
-- 02 B cuidador da 1 com validade futura, 03 C observador da 1, 04 D responsável da 1,
-- 05 E cuidador revogado da 1, 06 F responsável da 1 com validade vencida.
-- 07 X responsável da 3, 08 H com conta e nenhum vínculo, 09 N só em auth.users, 10 Y responsável da 4.
insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       (array['a', 'b', 'c', 'd', 'e', 'f', 'x', 'h', 'n', 'y'])[n] || '@exemplo.invalid'
from generate_series(1, 10) as n;

insert into public.contas (id, nome_privado, fuso, criada_em)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       (array['A', 'B', 'C', 'D', 'E', 'F', 'X', 'H', 'N', 'Y'])[n],
       'America/Sao_Paulo', timestamptz '2026-01-02 03:04:05+00'
from generate_series(1, 10) as n
where n <> 9;

insert into public.familias (id, nome, fuso, criada_por, criada_em) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '30 days'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Manaus', 'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '30 days'),
  ('ffffffff-0000-4000-8000-000000000003', 'Família 3', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000007', now() - interval '40 days'),
  ('ffffffff-0000-4000-8000-000000000004', 'Família 4', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000010', now() - interval '50 days');

insert into public.vinculos (id, familia_id, conta_id, papel, estado, valido_ate, epoca, criado_em, encerrado_em) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'responsavel', 'ativo', null, 1, now() - interval '10 days', null),
  ('bb000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001',
   'responsavel', 'ativo', null, 3, now() - interval '10 days', null),
  ('bb000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001',
   'cuidador', 'ativo', now() + interval '60 days', 2, now() - interval '5 days', null),
  ('bb000000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001',
   'responsavel', 'saiu', null, 2, now() - interval '20 days', now() - interval '2 days'),
  ('bb000000-0000-4000-8000-000000000012', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002',
   'cuidador', 'ativo', now() + interval '5 days', 1, now() - interval '9 days', null),
  ('bb000000-0000-4000-8000-000000000013', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003',
   'observador', 'ativo', null, 1, now() - interval '8 days', null),
  ('bb000000-0000-4000-8000-000000000014', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004',
   'responsavel', 'ativo', null, 1, now() - interval '10 days', null),
  ('bb000000-0000-4000-8000-000000000015', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005',
   'cuidador', 'revogado', null, 2, now() - interval '7 days', now() - interval '1 day'),
  ('bb000000-0000-4000-8000-000000000016', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006',
   'responsavel', 'ativo', now() - interval '1 day', 1, now() - interval '6 days', null),
  ('bb000000-0000-4000-8000-000000000027', 'ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000007',
   'responsavel', 'ativo', null, 1, now() - interval '40 days', null),
  ('bb000000-0000-4000-8000-000000000030', 'ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000010',
   'responsavel', 'ativo', null, 1, now() - interval '50 days', null);

-- Bebês da família 1: dois com o mesmo criado_em (desempata pelo id) e um arquivado, mais antigo.
insert into public.bebes (id, familia_id, nome, nascimento, estado, criado_por, criado_em) values
  ('bebe0000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Teo', '2026-07-01', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '3 days'),
  ('bebe0000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'Lia', '2026-08-05', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '3 days'),
  ('bebe0000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'Arquivado', '2025-01-31', 'arquivado',
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '4 days'),
  ('bebe0000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000003', 'Bebê da 3', '2026-02-02', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000007', now() - interval '3 days');

-- Convites da família 1: pendente, aceito (empata em criado_em com o pendente) e revogado.
insert into public.convites (id, familia_id, papel, vinculo_valido_ate, criado_por, codigo_hash, expira_em,
                             estado, aceito_por, aceito_em, criado_em) values
  ('c0000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '60 days',
   'aaaaaaaa-0000-4000-8000-000000000001', 'segredo-hash-pendente', now() + interval '5 days', 'pendente', null, null,
   now() - interval '2 days'),
  ('c0000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'observador', null,
   'aaaaaaaa-0000-4000-8000-000000000001', 'segredo-hash-aceito', now() + interval '5 days', 'aceito',
   'aaaaaaaa-0000-4000-8000-000000000003', now() - interval '1 day', now() - interval '2 days'),
  ('c0000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'observador', null,
   'aaaaaaaa-0000-4000-8000-000000000004', 'segredo-hash-revogado', now() + interval '5 days', 'revogado', null, null,
   now() - interval '1 day'),
  ('c0000000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000003', 'observador', null,
   'aaaaaaaa-0000-4000-8000-000000000007', 'segredo-hash-familia-3', now() + interval '5 days', 'pendente', null, null,
   now() - interval '1 day');

select set_config('teste.foto',
  (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
  || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c) || '/'
  || (select md5(string_agg(b::text, '|' order by b.id)) from public.bebes b) || '/'
  || (select md5(string_agg(f::text, '|' order by f.id)) from public.familias f) || '/'
  || (select md5(string_agg(t::text, '|' order by t.id)) from public.contas t), true);

-- Responsável com várias famílias.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok($$select set_config('teste.a', public.exportar_dados()::text, true)$$, 'responsável exporta os dados');

select is(
  public.exportar_dados()::text,
  current_setting('teste.a'),
  'duas exportações seguidas na mesma transação são idênticas'
);

reset role;

select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb),
  array['conta', 'familias', 'formato', 'gerado_em', 'vinculos'],
  'o resultado tem exatamente as cinco chaves do topo'
);
select is(current_setting('teste.a')::jsonb ->> 'formato', 'appmaternidade-exportacao-v1', 'formato');
select is(current_setting('teste.a')::jsonb ->> 'gerado_em', pg_temp.utc(now()), 'gerado_em é agora, em UTC');

select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'conta'),
  array['criada_em', 'email', 'fuso', 'id', 'nome_privado'],
  'conta tem exatamente id, email, nome_privado, fuso e criada_em'
);
select is(
  current_setting('teste.a')::jsonb -> 'conta',
  jsonb_build_object('id', 'aaaaaaaa-0000-4000-8000-000000000001', 'email', 'a@exemplo.invalid',
                     'nome_privado', 'A', 'fuso', 'America/Sao_Paulo', 'criada_em', '2026-01-02T03:04:05.000000Z'),
  'conta traz o e-mail de auth.users e a data em UTC no formato do JSON'
);

-- Vínculos: todos os do chamador, em qualquer estado, por criado_em e depois id.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'vinculos', 'familia_id'),
  array['ffffffff-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000001',
        'ffffffff-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000003'],
  'vinculos traz os quatro vínculos de A, em qualquer estado, ordenados por criado_em e depois id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'vinculos' -> 0),
  array['criado_em', 'encerrado_em', 'epoca', 'estado', 'familia_id', 'papel', 'valido_ate'],
  'cada vínculo tem exatamente as sete chaves'
);
select is(
  current_setting('teste.a')::jsonb -> 'vinculos' -> 0,
  jsonb_build_object('familia_id', 'ffffffff-0000-4000-8000-000000000004', 'papel', 'responsavel', 'estado', 'saiu',
                     'valido_ate', null, 'epoca', 2, 'criado_em', pg_temp.utc(now() - interval '20 days'),
                     'encerrado_em', pg_temp.utc(now() - interval '2 days')),
  'vínculo de quem saiu: estado, época, encerrado_em e valido_ate nulo como null do JSON'
);
select is(
  current_setting('teste.a')::jsonb -> 'vinculos' -> 3 ->> 'valido_ate',
  pg_temp.utc(now() + interval '60 days'),
  'valido_ate sai em UTC no formato do JSON'
);

-- Famílias: só onde o chamador é responsável ativo.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'familias', 'id'),
  array['ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000002'],
  'familias traz só as famílias onde A é responsável ativo, por criada_em e depois id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'familias' -> 0),
  array['bebes', 'convites', 'criada_em', 'fuso', 'id', 'membros', 'nome'],
  'cada família tem exatamente as sete chaves'
);
select is(
  (current_setting('teste.a')::jsonb -> 'familias' -> 1) - 'criada_em',
  jsonb_build_object('id', 'ffffffff-0000-4000-8000-000000000002', 'nome', 'Família 2', 'fuso', 'America/Manaus',
    'membros', jsonb_build_array(jsonb_build_object('conta_id', 'aaaaaaaa-0000-4000-8000-000000000001',
                                                    'nome_privado', 'A', 'papel', 'responsavel', 'valido_ate', null)),
    'bebes', '[]'::jsonb, 'convites', '[]'::jsonb),
  'a família 2 sai com membros e listas vazias como [] e nunca nulas'
);
select is(
  current_setting('teste.a')::jsonb -> 'familias' -> 0 ->> 'criada_em',
  pg_temp.utc(now() - interval '30 days'),
  'criada_em da família sai em UTC no formato do JSON'
);

-- Membros: só vínculos ativos, por criado_em do vínculo e depois conta_id.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'membros', 'conta_id'),
  array['aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004',
        'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003'],
  'membros traz só os ativos (sem o revogado nem o vencido), por criado_em e depois conta_id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'membros' -> 0),
  array['conta_id', 'nome_privado', 'papel', 'valido_ate'],
  'cada membro tem exatamente conta_id, nome_privado, papel e valido_ate'
);
select is(
  current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'membros' -> 2,
  jsonb_build_object('conta_id', 'aaaaaaaa-0000-4000-8000-000000000002', 'nome_privado', 'B', 'papel', 'cuidador',
                     'valido_ate', pg_temp.utc(now() + interval '5 days')),
  'membro com validade traz o nome privado, o papel e a validade em UTC'
);

-- Bebês: todos, inclusive o arquivado, por criado_em e depois id.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'bebes', 'nome'),
  array['Arquivado', 'Teo', 'Lia'],
  'bebes traz todos os bebês, por criado_em e depois id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'bebes' -> 0),
  array['criado_em', 'estado', 'id', 'nascimento', 'nome'],
  'cada bebê tem exatamente id, nome, nascimento, estado e criado_em'
);
select is(
  current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'bebes' -> 0,
  jsonb_build_object('id', 'bebe0000-0000-4000-8000-000000000003', 'nome', 'Arquivado', 'nascimento', '2025-01-31',
                     'estado', 'arquivado', 'criado_em', pg_temp.utc(now() - interval '4 days')),
  'o nascimento sai como YYYY-MM-DD e o estado do bebê vem junto'
);

-- Convites: todos, sem o hash.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'convites', 'id'),
  array['c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
        'c0000000-0000-4000-8000-000000000003'],
  'convites traz todos, por criado_em e depois id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'convites' -> 0),
  array['aceito_em', 'criado_em', 'estado', 'expira_em', 'id', 'papel', 'vinculo_valido_ate'],
  'cada convite tem exatamente as sete chaves'
);
select is(
  current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'convites' -> 1,
  jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000002', 'papel', 'observador', 'estado', 'aceito',
                     'vinculo_valido_ate', null, 'expira_em', pg_temp.utc(now() + interval '5 days'),
                     'criado_em', pg_temp.utc(now() - interval '2 days'), 'aceito_em', pg_temp.utc(now() - interval '1 day')),
  'convite aceito traz aceito_em e vinculo_valido_ate nulo como null do JSON'
);
select ok(
  current_setting('teste.a') !~ '(codigo_hash|segredo-hash)',
  'nenhuma chave codigo_hash nem valor de hash aparece no resultado'
);
select ok(
  current_setting('teste.a') !~ '(b@exemplo|c@exemplo|d@exemplo|Família 3|Família 4|Bebê da 3)',
  'a exportação não traz e-mail de outros nem dados das famílias 3 e 4, onde A não é responsável ativo'
);

-- Cuidador, observador, ex-membro, vencido e conta sem vínculo: só a conta e os próprios vínculos.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select set_config('teste.b', public.exportar_dados()::text, true)$$, 'cuidador exporta os dados');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select lives_ok($$select set_config('teste.c', public.exportar_dados()::text, true)$$, 'observador exporta os dados');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select lives_ok($$select set_config('teste.e', public.exportar_dados()::text, true)$$, 'ex-membro revogado exporta os dados');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select lives_ok($$select set_config('teste.f', public.exportar_dados()::text, true)$$, 'responsável com validade vencida exporta os dados');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select lives_ok($$select set_config('teste.h', public.exportar_dados()::text, true)$$, 'conta sem vínculo exporta os dados');
reset role;

select is(
  current_setting('teste.b')::jsonb -> 'familias', '[]'::jsonb,
  'cuidador não recebe dados da família'
);
select is(
  pg_temp.ids(current_setting('teste.b')::jsonb -> 'vinculos', 'familia_id'),
  array['ffffffff-0000-4000-8000-000000000001'],
  'cuidador recebe só o próprio vínculo'
);
select is(
  current_setting('teste.b')::jsonb -> 'vinculos' -> 0,
  jsonb_build_object('familia_id', 'ffffffff-0000-4000-8000-000000000001', 'papel', 'cuidador', 'estado', 'ativo',
                     'valido_ate', pg_temp.utc(now() + interval '5 days'), 'epoca', 1,
                     'criado_em', pg_temp.utc(now() - interval '9 days'), 'encerrado_em', null),
  'o vínculo do cuidador traz familia_id, papel, estado e as outras colunas dele'
);
select ok(
  current_setting('teste.b') !~ '(A@|"nome_privado": "A"|Teo|Lia|Família 1|segredo)'
  and current_setting('teste.b')::jsonb -> 'conta' ->> 'email' = 'b@exemplo.invalid',
  'cuidador não recebe nome da família, bebês, convites nem nomes de outros membros'
);
select is(current_setting('teste.c')::jsonb -> 'familias', '[]'::jsonb, 'observador não recebe dados da família');
select is(
  pg_temp.ids(current_setting('teste.c')::jsonb -> 'vinculos', 'papel'), array['observador'],
  'observador recebe só o próprio vínculo'
);
select is(current_setting('teste.e')::jsonb -> 'familias', '[]'::jsonb, 'ex-membro revogado não recebe dados da família');
select is(
  pg_temp.ids(current_setting('teste.e')::jsonb -> 'vinculos', 'estado'), array['revogado'],
  'ex-membro recebe o próprio vínculo revogado'
);
select is(current_setting('teste.f')::jsonb -> 'familias', '[]'::jsonb,
  'responsável com validade vencida não recebe dados da família');
select is(
  pg_temp.ids(current_setting('teste.f')::jsonb -> 'vinculos', 'estado'), array['ativo'],
  'responsável vencido recebe só o próprio vínculo'
);
select is(
  current_setting('teste.h')::jsonb -> 'vinculos', '[]'::jsonb,
  'conta sem vínculo recebe vinculos como [] (nunca nula)'
);
select is(current_setting('teste.h')::jsonb -> 'familias', '[]'::jsonb, 'conta sem vínculo recebe familias como []');

-- Conta sem linha em contas, anônimo e efeito sobre os dados.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';
select throws_ok($$select public.exportar_dados()$$, 'P0001', 'conta inexistente', 'conta sem linha em contas');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select public.exportar_dados()$$, '42501', null, 'anon não executa exportar_dados');

reset role;

select is(
  (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
  || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c) || '/'
  || (select md5(string_agg(b::text, '|' order by b.id)) from public.bebes b) || '/'
  || (select md5(string_agg(f::text, '|' order by f.id)) from public.familias f) || '/'
  || (select md5(string_agg(t::text, '|' order by t.id)) from public.contas t),
  current_setting('teste.foto'),
  'exportar não mudou nenhum dado (nem épocas)'
);

select * from finish();
rollback;
