begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- SEC-05: nome_privado (80), familias.nome (80) e bebes.nome (60) recusam vazio, só espaços e
-- texto acima do limite com 23514, no update e insert diretos de quem tem permissão e em criar_familia.
-- A (...01) é responsável ativa da família 1, que tem um bebê. C (...03) existe só em auth.users.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'c@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'A');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');

insert into public.vinculos (id, familia_id, conta_id, papel) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel');

insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bebe0000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

-- As três regras existem como check validado (não ficam not valid).
select is(
  (select convalidated from pg_constraint
    where conrelid = 'public.contas'::regclass and conname = 'contas_nome_tamanho' and contype = 'c'),
  true,
  'contas tem o check contas_nome_tamanho validado'
);
select is(
  (select convalidated from pg_constraint
    where conrelid = 'public.familias'::regclass and conname = 'familias_nome_tamanho' and contype = 'c'),
  true,
  'familias tem o check familias_nome_tamanho validado'
);
select is(
  (select convalidated from pg_constraint
    where conrelid = 'public.bebes'::regclass and conname = 'bebes_nome_tamanho' and contype = 'c'),
  true,
  'bebes tem o check bebes_nome_tamanho validado'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

-- contas.nome_privado: update da própria conta.
select throws_ok(
  $$update public.contas set nome_privado = repeat('x', 81) where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '23514', null, 'nome_privado com 81 caracteres é recusado no update'
);
select throws_ok(
  $$update public.contas set nome_privado = '   ' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '23514', null, 'nome_privado só com espaços é recusado no update'
);
select lives_ok(
  $$update public.contas set nome_privado = repeat('x', 80) where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  'nome_privado com 80 caracteres passa no update'
);

-- familias.nome: update de responsável ativa. O limite conta caracteres, não bytes.
select throws_ok(
  $$update public.familias set nome = repeat('x', 81) where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  '23514', null, 'nome da família com 81 caracteres é recusado no update'
);
select throws_ok(
  $$update public.familias set nome = '   ' where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  '23514', null, 'nome da família só com espaços é recusado no update'
);
select lives_ok(
  $$update public.familias set nome = repeat('x', 80) where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  'nome da família com 80 caracteres passa no update'
);
select lives_ok(
  $$update public.familias set nome = repeat('é', 80) where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  'nome da família com 80 caracteres acentuados passa no update'
);

-- criar_familia.
select throws_ok(
  $$select public.criar_familia(repeat('x', 81), 'America/Sao_Paulo')$$,
  '23514', null, 'criar_familia com nome de 81 caracteres é recusado'
);
select lives_ok(
  $$select public.criar_familia(repeat('x', 80), 'America/Sao_Paulo')$$,
  'criar_familia com nome de 80 caracteres passa'
);

-- bebes.nome: update e insert de responsável ativa.
select throws_ok(
  $$update public.bebes set nome = repeat('x', 61) where id = 'bebe0000-0000-4000-8000-000000000001'$$,
  '23514', null, 'nome do bebê com 61 caracteres é recusado no update'
);
select throws_ok(
  $$update public.bebes set nome = '   ' where id = 'bebe0000-0000-4000-8000-000000000001'$$,
  '23514', null, 'nome do bebê só com espaços é recusado no update'
);
select lives_ok(
  $$update public.bebes set nome = repeat('x', 60) where id = 'bebe0000-0000-4000-8000-000000000001'$$,
  'nome do bebê com 60 caracteres passa no update'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', repeat('x', 61), '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '23514', null, 'nome do bebê com 61 caracteres é recusado no insert'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', '   ', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '23514', null, 'nome do bebê só com espaços é recusado no insert'
);
select lives_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', repeat('x', 60), '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  'nome do bebê com 60 caracteres passa no insert'
);

-- contas.nome_privado: insert da própria conta, por C.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$insert into public.contas (id, nome_privado) values ('aaaaaaaa-0000-4000-8000-000000000003', repeat('x', 81))$$,
  '23514', null, 'nome_privado com 81 caracteres é recusado no insert'
);
select throws_ok(
  $$insert into public.contas (id, nome_privado) values ('aaaaaaaa-0000-4000-8000-000000000003', '   ')$$,
  '23514', null, 'nome_privado só com espaços é recusado no insert'
);
select lives_ok(
  $$insert into public.contas (id, nome_privado) values ('aaaaaaaa-0000-4000-8000-000000000003', repeat('x', 80))$$,
  'nome_privado com 80 caracteres passa no insert'
);

reset role;

-- Insert direto em conta alheia com nome inválido continua recebendo o 42501 da RLS, não o 23514.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$insert into public.contas (id, nome_privado) values (gen_random_uuid(), repeat('x', 81))$$,
  '42501', null, 'insert de conta alheia com nome longo responde 42501, não 23514'
);
reset role;

select * from finish();
rollback;
