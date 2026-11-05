begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

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

insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

set local role authenticated;

-- Leitura: os três papéis leem.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  1,
  'responsável lê os bebês da família'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  1,
  'cuidador lê os bebês da família'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  1,
  'observador lê os bebês da família'
);

-- Insert: só o responsável.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Bebê 2', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  'responsável insere bebê'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Do cuidador', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000002')$$,
  '42501',
  null,
  'cuidador não insere bebê'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Do observador', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000003')$$,
  '42501',
  null,
  'observador não insere bebê'
);

-- Update: cuidador e observador não alteram nada.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  pg_temp.afetadas($$update public.bebes set nome = 'Do cuidador' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$),
  0,
  'cuidador não altera bebê (0 linhas)'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  pg_temp.afetadas($$update public.bebes set nome = 'Do observador' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$),
  0,
  'observador não altera bebê (0 linhas)'
);

reset role;
select is(
  (select nome from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'Bebê 1',
  'o bebê segue intacto depois das tentativas negadas'
);

-- Update do responsável: editar, arquivar e desarquivar.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  pg_temp.afetadas($$update public.bebes set nome = 'Bebê 1 editado' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$),
  1,
  'responsável edita o nome do bebê'
);

select is(
  pg_temp.afetadas($$update public.bebes set estado = 'arquivado' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$),
  1,
  'responsável arquiva o bebê'
);

select is(
  pg_temp.afetadas($$update public.bebes set estado = 'ativo' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$),
  1,
  'responsável desarquiva o bebê'
);

reset role;
select is(
  (select nome from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'Bebê 1 editado',
  'a edição do responsável foi gravada'
);

select is(
  (select estado::text from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'ativo',
  'o bebê voltou ao estado ativo'
);

-- Delete: negado para os três.
set local role authenticated;

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$delete from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'responsável não apaga bebê'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$delete from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'cuidador não apaga bebê'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok(
  $$delete from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'observador não apaga bebê'
);

reset role;

select * from finish();
rollback;
