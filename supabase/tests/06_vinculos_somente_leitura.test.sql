begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- Família 1: ...01 responsável, ...02 cuidador, ...03 observador. ...04 não tem vínculo.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'responsavel@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'cuidador@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'observador@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'externo@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Responsável'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Cuidador'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Observador'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Externo');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');

insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador');

set local role authenticated;

-- Leitura: quem tem vínculo ativo vê os vínculos da família.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  3,
  'responsável lê os vínculos da família'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  3,
  'cuidador lê os vínculos da família'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  3,
  'observador lê os vínculos da família'
);

-- Responsável: nada de escrita em vinculos.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$update public.vinculos set papel = 'observador' where conta_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501', null, 'responsável não altera vínculo'
);
select throws_ok(
  $$insert into public.vinculos (familia_id, conta_id, papel)
    values ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'responsavel')$$,
  '42501', null, 'responsável não insere vínculo'
);
select throws_ok(
  $$delete from public.vinculos where conta_id = 'aaaaaaaa-0000-4000-8000-000000000002'$$,
  '42501', null, 'responsável não apaga vínculo'
);

-- Cuidador: não se promove nem mexe em vínculos.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$update public.vinculos set papel = 'responsavel' where conta_id = 'aaaaaaaa-0000-4000-8000-000000000002'$$,
  '42501', null, 'cuidador não se promove a responsável'
);
select throws_ok(
  $$insert into public.vinculos (familia_id, conta_id, papel)
    values ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'responsavel')$$,
  '42501', null, 'cuidador não insere vínculo'
);
select throws_ok(
  $$delete from public.vinculos where conta_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501', null, 'cuidador não apaga vínculo'
);

-- Observador.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok(
  $$update public.vinculos set papel = 'responsavel' where conta_id = 'aaaaaaaa-0000-4000-8000-000000000003'$$,
  '42501', null, 'observador não se promove a responsável'
);
select throws_ok(
  $$insert into public.vinculos (familia_id, conta_id, papel)
    values ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'observador')$$,
  '42501', null, 'observador não insere vínculo'
);
select throws_ok(
  $$delete from public.vinculos where conta_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501', null, 'observador não apaga vínculo'
);

reset role;

select is(
  (select papel::text from public.vinculos
    where familia_id = 'ffffffff-0000-4000-8000-000000000001'
      and conta_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  'cuidador',
  'o papel do cuidador segue intacto'
);

select is(
  (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  3,
  'a família segue com os mesmos três vínculos'
);

select * from finish();
rollback;
