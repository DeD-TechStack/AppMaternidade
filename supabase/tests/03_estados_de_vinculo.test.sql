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

-- Contas da família 1, todas com papel responsável:
--   ...01 ativo sem validade (controle), ...02 revogado, ...03 saiu,
--   ...04 ativo com validade vencida, ...05 ativo com validade futura (controle).
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'ativo@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'revogado@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'saiu@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'vencido@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'futuro@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Ativo'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Revogado'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Saiu'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Vencido'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'Futuro');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');

insert into public.vinculos (familia_id, conta_id, papel, estado, valido_ate) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel', 'revogado', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'responsavel', 'saiu', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'responsavel', 'ativo', now() - interval '1 day'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', 'responsavel', 'ativo', now() + interval '1 day');

insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

-- Controles: vínculo ativo lê e escreve; validade futura ainda vale.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  1,
  'controle: vínculo ativo lê a família'
);

select lives_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Controle', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  'controle: vínculo ativo insere bebê'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  1,
  'controle: vínculo ativo com validade futura lê a família'
);

-- Revogado.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  0,
  'vínculo revogado não lê a família'
);

select is(
  (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001')
  + (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  0,
  'vínculo revogado não lê vínculos nem bebês'
);

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Revogado', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000002')$$,
  '42501',
  null,
  'vínculo revogado não insere bebê'
);

select is(
  pg_temp.afetadas($$update public.bebes set nome = 'Revogado' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$),
  0,
  'vínculo revogado não altera bebê (0 linhas)'
);

-- Saiu.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  0,
  'vínculo que saiu não lê a família'
);

select is(
  (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001')
  + (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  0,
  'vínculo que saiu não lê vínculos nem bebês'
);

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Saiu', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000003')$$,
  '42501',
  null,
  'vínculo que saiu não insere bebê'
);

select is(
  pg_temp.afetadas($$update public.bebes set nome = 'Saiu' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$),
  0,
  'vínculo que saiu não altera bebê (0 linhas)'
);

-- Vencido.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  0,
  'vínculo vencido não lê a família'
);

select is(
  (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001')
  + (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  0,
  'vínculo vencido não lê vínculos nem bebês'
);

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Vencido', '2026-02-01', 'aaaaaaaa-0000-4000-8000-000000000004')$$,
  '42501',
  null,
  'vínculo vencido não insere bebê'
);

select is(
  pg_temp.afetadas($$update public.bebes set nome = 'Vencido' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$),
  0,
  'vínculo vencido não altera bebê (0 linhas)'
);

reset role;

select is(
  (select nome from public.bebes where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'Bebê 1',
  'o bebê segue intacto depois das tentativas negadas'
);

select is(
  (select count(*)::int from public.bebes
    where familia_id = 'ffffffff-0000-4000-8000-000000000001'
      and nome in ('Revogado', 'Saiu', 'Vencido')),
  0,
  'nenhum bebê foi criado pelas tentativas negadas'
);

select * from finish();
rollback;
