begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

create function pg_temp.afetadas(consulta text) returns int
language plpgsql as $$
declare n int;
begin
  execute consulta;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Família 1: ...01 responsável, ...02 cuidador, ...03 observador.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'responsavel@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'cuidador@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'observador@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Responsável'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Cuidador'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Observador');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');

insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador');

set local role authenticated;

-- Insert direto: negado (a criação passa por criar_familia).
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$insert into public.familias (nome, fuso, criada_por)
    values ('Direta', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '42501', null, 'responsável não insere família direto'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$insert into public.familias (nome, fuso, criada_por)
    values ('Direta', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000002')$$,
  '42501', null, 'cuidador não insere família direto'
);

-- Delete direto: negado.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$delete from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  '42501', null, 'responsável não apaga a família'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$delete from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  '42501', null, 'cuidador não apaga a família'
);

-- Update do nome: cuidador e observador não alteram.
select is(
  pg_temp.afetadas($$update public.familias set nome = 'Do cuidador' where id = 'ffffffff-0000-4000-8000-000000000001'$$),
  0,
  'cuidador não altera o nome da família (0 linhas)'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  pg_temp.afetadas($$update public.familias set nome = 'Do observador' where id = 'ffffffff-0000-4000-8000-000000000001'$$),
  0,
  'observador não altera o nome da família (0 linhas)'
);

reset role;
select is(
  (select nome from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  'Família 1',
  'o nome da família segue intacto'
);

-- Responsável altera.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  pg_temp.afetadas($$update public.familias set nome = 'Família editada' where id = 'ffffffff-0000-4000-8000-000000000001'$$),
  1,
  'responsável altera o nome da família'
);

reset role;
select is(
  (select nome from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  'Família editada',
  'a edição do responsável foi gravada'
);

-- Leitura pelo cuidador.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  1,
  'cuidador lê a família'
);

reset role;

select * from finish();
rollback;
