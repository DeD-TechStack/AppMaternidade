begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- A (...01) tem conta. N (...02) existe só em auth.users, sem linha em contas.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'n@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'A');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$select set_config('teste.familia', public.criar_familia('Casa da Ana', 'America/Sao_Paulo')::text, true)$$,
  'conta com linha em contas cria família'
);

select matches(
  current_setting('teste.familia'),
  '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  'criar_familia devolve um uuid'
);

select is(
  (select count(*)::int from public.vinculos
    where familia_id = current_setting('teste.familia')::uuid
      and conta_id = 'aaaaaaaa-0000-4000-8000-000000000001'
      and papel = 'responsavel'
      and estado = 'ativo'),
  1,
  'a chamadora é responsável ativa da família criada'
);

select is(
  (select nome from public.familias where id = current_setting('teste.familia')::uuid),
  'Casa da Ana',
  'a família criada tem o nome pedido'
);

select throws_ok(
  $$select public.criar_familia('', 'America/Sao_Paulo')$$,
  'P0001',
  'nome vazio',
  'nome vazio é recusado'
);

select throws_ok(
  $$select public.criar_familia(null, 'America/Sao_Paulo')$$,
  'P0001',
  'nome vazio',
  'nome nulo é recusado'
);

-- Conta sem linha em contas.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_familia('Casa de N', 'America/Sao_Paulo')$$,
  'P0001',
  'conta inexistente',
  'conta sem linha em contas é recusada'
);

-- Anônimo.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$select public.criar_familia('Casa anônima', 'America/Sao_Paulo')$$,
  '42501',
  null,
  'anon não executa criar_familia'
);

reset role;

select is(
  (select count(*)::int from public.familias
    where criada_por in ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002')),
  1,
  'só a chamada válida criou família'
);

select * from finish();
rollback;
