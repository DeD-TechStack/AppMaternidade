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

-- A é responsável da família 1; B é responsável da família 2.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'b@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'A'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'B');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000002');

insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel');

insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'Bebê 2', '2026-01-02', 'aaaaaaaa-0000-4000-8000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  1,
  'A vê a própria família'
);

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000002'),
  0,
  'A não vê a família 2'
);

select is(
  (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000002'),
  0,
  'A não vê os vínculos da família 2'
);

select is(
  (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000002'),
  0,
  'A não vê os bebês da família 2'
);

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000002', 'Intruso', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'A não insere bebê na família 2'
);

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-0000000000ff', 'Fantasma', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'A não insere bebê em família inexistente'
);

select is(
  pg_temp.afetadas($$update public.familias set nome = 'Invadida' where id = 'ffffffff-0000-4000-8000-000000000002'$$),
  0,
  'A não altera o nome da família 2 (0 linhas)'
);

select is(
  pg_temp.afetadas($$update public.bebes set nome = 'Invadido' where id = 'bbbbbbbb-0000-4000-8000-000000000002'$$),
  0,
  'A não altera o bebê da família 2 (0 linhas)'
);

reset role;

select is(
  (select nome from public.familias where id = 'ffffffff-0000-4000-8000-000000000002'),
  'Família 2',
  'o nome da família 2 segue intacto'
);

select is(
  (select nome from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  'Bebê 2',
  'o bebê da família 2 segue intacto'
);

select is(
  (select count(*)::int from public.bebes where nome in ('Intruso', 'Fantasma')),
  0,
  'nenhum bebê foi criado pelas tentativas negadas'
);

select * from finish();
rollback;
