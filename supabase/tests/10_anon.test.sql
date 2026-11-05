begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'A');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');

insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel');

insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

-- select
select throws_ok($$select * from public.contas$$, '42501', null, 'anon não lê contas');
select throws_ok($$select * from public.familias$$, '42501', null, 'anon não lê familias');
select throws_ok($$select * from public.vinculos$$, '42501', null, 'anon não lê vinculos');
select throws_ok($$select * from public.bebes$$, '42501', null, 'anon não lê bebes');

-- insert
select throws_ok(
  $$insert into public.contas (id, nome_privado) values ('aaaaaaaa-0000-4000-8000-000000000002', 'Anon')$$,
  '42501', null, 'anon não insere em contas'
);
select throws_ok(
  $$insert into public.familias (nome, fuso, criada_por)
    values ('Anon', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon não insere em familias'
);
select throws_ok(
  $$insert into public.vinculos (familia_id, conta_id, papel)
    values ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'observador')$$,
  '42501', null, 'anon não insere em vinculos'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Anon', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon não insere em bebes'
);

-- update
select throws_ok($$update public.contas set nome_privado = 'Anon'$$, '42501', null, 'anon não altera contas');
select throws_ok($$update public.familias set nome = 'Anon'$$, '42501', null, 'anon não altera familias');
select throws_ok($$update public.vinculos set papel = 'observador'$$, '42501', null, 'anon não altera vinculos');
select throws_ok($$update public.bebes set nome = 'Anon'$$, '42501', null, 'anon não altera bebes');

-- delete
select throws_ok($$delete from public.contas$$, '42501', null, 'anon não apaga contas');
select throws_ok($$delete from public.familias$$, '42501', null, 'anon não apaga familias');
select throws_ok($$delete from public.vinculos$$, '42501', null, 'anon não apaga vinculos');
select throws_ok($$delete from public.bebes$$, '42501', null, 'anon não apaga bebes');

-- função auxiliar das políticas
select throws_ok(
  $$select public.tem_vinculo_ativo(
      'ffffffff-0000-4000-8000-000000000001',
      array['responsavel']::public.papel_familia[]
    )$$,
  '42501', null, 'anon não executa tem_vinculo_ativo'
);

reset role;

select * from finish();
rollback;
