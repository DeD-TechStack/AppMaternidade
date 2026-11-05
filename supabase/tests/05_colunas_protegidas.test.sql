begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

create function pg_temp.afetadas(consulta text) returns int
language plpgsql as $$
declare n int;
begin
  execute consulta;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- R (...01) é responsável da família 1; Q (...02) é responsável da família 2.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'q@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Q');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000002');

insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel');

insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$update public.familias set criada_por = 'aaaaaaaa-0000-4000-8000-000000000002' where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'familias.criada_por não é alterável'
);

select throws_ok(
  $$update public.familias set criada_em = now() where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'familias.criada_em não é alterável'
);

select throws_ok(
  $$update public.bebes set familia_id = 'ffffffff-0000-4000-8000-000000000002' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'bebes.familia_id não é alterável'
);

select throws_ok(
  $$update public.bebes set criado_por = 'aaaaaaaa-0000-4000-8000-000000000002' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'bebes.criado_por não é alterável'
);

select throws_ok(
  $$update public.bebes set criado_em = now() where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'bebes.criado_em não é alterável'
);

select throws_ok(
  $$update public.contas set id = 'aaaaaaaa-0000-4000-8000-0000000000ff' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'contas.id não é alterável'
);

select throws_ok(
  $$update public.contas set criada_em = now() where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'contas.criada_em não é alterável'
);

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Falsa autoria', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000002')$$,
  '42501',
  null,
  'insert de bebê com criado_por de outra conta é negado'
);

-- Controles: as colunas liberadas continuam alteráveis.
select is(
  pg_temp.afetadas($$update public.familias set nome = 'Família 1 editada' where id = 'ffffffff-0000-4000-8000-000000000001'$$),
  1,
  'controle: familias.nome é alterável pelo responsável'
);

select is(
  pg_temp.afetadas($$update public.bebes set nome = 'Bebê 1 editado' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$),
  1,
  'controle: bebes.nome é alterável pelo responsável'
);

select is(
  pg_temp.afetadas($$update public.contas set nome_privado = 'R editada' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$),
  1,
  'controle: contas.nome_privado é alterável pela dona'
);

reset role;

select is(
  (select criada_por from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
  'familias.criada_por segue intacta'
);

select is(
  (select familia_id from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'ffffffff-0000-4000-8000-000000000001'::uuid,
  'bebes.familia_id segue intacta'
);

select is(
  (select criado_por from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
  'bebes.criado_por segue intacta'
);

select is(
  (select count(*)::int from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  1,
  'contas.id segue intacta'
);

select * from finish();
rollback;
