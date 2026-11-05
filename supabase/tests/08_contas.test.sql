begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

create function pg_temp.afetadas(consulta text) returns int
language plpgsql as $$
declare n int;
begin
  execute consulta;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- A (...01) e B (...02) têm conta. C (...03) e D (...04) existem só em auth.users.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'b@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'c@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'd@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'A'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'B');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0,
  'A não lê a conta de B'
);

select is(
  (select count(*)::int from public.contas
    where id in (
      'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002',
      'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000004'
    )),
  1,
  'A lê só a própria conta'
);

select is(
  pg_temp.afetadas($$update public.contas set nome_privado = 'Invadida' where id = 'aaaaaaaa-0000-4000-8000-000000000002'$$),
  0,
  'A não altera a conta de B (0 linhas)'
);

select throws_ok(
  $$insert into public.contas (id, nome_privado) values ('aaaaaaaa-0000-4000-8000-000000000003', 'Em nome de C')$$,
  '42501',
  null,
  'A não insere conta com o id de outra pessoa'
);

select throws_ok(
  $$delete from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'A não apaga a própria conta'
);

select throws_ok(
  $$delete from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000002'$$,
  '42501',
  null,
  'A não apaga a conta de B'
);

select is(
  pg_temp.afetadas($$update public.contas set nome_privado = 'A editada' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$),
  1,
  'A altera o próprio nome privado'
);

reset role;

select is(
  (select nome_privado from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  'B',
  'a conta de B segue intacta'
);

select is(
  (select nome_privado from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'A editada',
  'a edição de A foi gravada'
);

-- D cria a própria conta.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select lives_ok(
  $$insert into public.contas (id, nome_privado) values ('aaaaaaaa-0000-4000-8000-000000000004', 'D')$$,
  'D insere a própria conta'
);

reset role;

select is(
  (select count(*)::int from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000004'),
  1,
  'a conta de D foi gravada'
);

select * from finish();
rollback;
