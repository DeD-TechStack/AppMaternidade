begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- MAT-45, adendo R-B, R5: o histórico da rotina (MAT-46) é só de acréscimo, com duas exceções que a
-- exclusão da MAT-45 usa: anular o autor (on delete set null) e apagar em cascata com a família.
-- Os registros nascem e mudam pelas funções da MAT-46 (gravar_registro e editar_registro).
-- Contas: 01 R e 02 A são responsáveis da família 1. 03 Z é o único responsável da família 2.
-- 04 W é o criador da família 3, que ficará sem responsável ativo (caso 4 da exclusão de conta).
create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || n || '@exemplo.invalid'
from generate_series(1, 4) as n;

insert into public.contas (id, nome_privado)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'U' || n
from generate_series(1, 4) as n;

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000003'),
  ('ffffffff-0000-4000-8000-000000000003', 'Família 3', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000004');

insert into public.vinculos (familia_id, conta_id, papel, estado) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000004', 'responsavel', 'ativo');

insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'Bebê 2', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000003'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000003', 'Bebê 3', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000004');

-- Histórico de um registro sem a coluna autor, para provar que o resto das linhas não mudou.
create function pg_temp.sem_autor(n int) returns text language sql as $$
  select coalesce(md5(string_agg((to_jsonb(h) - 'autor')::text, '|' order by h.id)), '-')
    from public.registro_alteracoes h where h.registro_id = pg_temp.rid(n);
$$;
create function pg_temp.completo(n int) returns text language sql as $$
  select coalesce(md5(string_agg(h::text, '|' order by h.id)), '-')
    from public.registro_alteracoes h where h.registro_id = pg_temp.rid(n);
$$;

-- Registros e histórico pelas funções da MAT-46.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$select public.gravar_registro(pg_temp.rid(1), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono',
                                  now() - interval '1 hour', 'America/Sao_Paulo', -180)$$,
  'R grava o registro 1 pelo gravar_registro'
);
select lives_ok(
  $$select public.editar_registro(pg_temp.rid(1), now() - interval '1 hour', null, '{}'::jsonb, 'nota do R',
                                  'America/Sao_Paulo', -180)$$,
  'R edita o registro 1 pelo editar_registro'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select lives_ok(
  $$select public.gravar_registro(pg_temp.rid(2), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono',
                                  now() - interval '1 hour', 'America/Sao_Paulo', -180)$$,
  'A grava o registro 2'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select lives_ok(
  $$select public.gravar_registro(pg_temp.rid(3), 'bbbbbbbb-0000-4000-8000-000000000002', 'sono',
                                  now() - interval '1 hour', 'America/Sao_Paulo', -180)$$,
  'Z grava o registro 3 da família 2'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select lives_ok(
  $$select public.gravar_registro(pg_temp.rid(4), 'bbbbbbbb-0000-4000-8000-000000000003', 'sono',
                                  now() - interval '1 hour', 'America/Sao_Paulo', -180)$$,
  'W grava o registro 4 da família 3'
);

reset role;

select is(
  (select array_agg(h.operacao::text order by h.versao) from public.registro_alteracoes h where h.registro_id = pg_temp.rid(1)),
  array['criacao', 'edicao'],
  'o registro 1 tem as linhas de criação e edição no histórico'
);
select is(
  (select count(*)::int from public.registro_alteracoes h
    where h.registro_id = pg_temp.rid(1) and h.autor = 'aaaaaaaa-0000-4000-8000-000000000001'),
  2,
  'as duas linhas do registro 1 têm R como autor'
);

select set_config('teste.sem_autor_1', pg_temp.sem_autor(1), true);
select set_config('teste.completo_2', pg_temp.completo(2), true);

-- A família 3 perde o único membro ativo: W segue criador, com vínculo revogado.
update public.vinculos set estado = 'revogado'
 where familia_id = 'ffffffff-0000-4000-8000-000000000003' and conta_id = 'aaaaaaaa-0000-4000-8000-000000000004';

-- Exceção 1: excluir a conta do autor anula o autor no histórico e o resto das linhas fica como estava.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok($$select public.excluir_conta()$$, 'R, que escreveu histórico, exclui a conta');

reset role;

select is(
  (select count(*)::text || '|' || count(*) filter (where h.autor is null)::text
     from public.registro_alteracoes h where h.registro_id = pg_temp.rid(1)),
  '2|2',
  'o histórico do registro 1 segue com as 2 linhas, agora com autor nulo'
);
select is(
  pg_temp.sem_autor(1), current_setting('teste.sem_autor_1'),
  'nada além do autor mudou nas linhas do histórico do registro 1'
);
select is(
  (select r.criado_por is null from public.registros r where r.id = pg_temp.rid(1)),
  true,
  'o registro 1 continua, com criado_por nulo'
);
select is(
  pg_temp.completo(2), current_setting('teste.completo_2'),
  'o histórico do registro 2, de outro autor, ficou intacto'
);

-- Caso barrado: fora das duas exceções o histórico segue só de acréscimo, inclusive para service_role.
set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);

select throws_ok(
  $$update public.registro_alteracoes set versao = 99 where registro_id = pg_temp.rid(2)$$,
  'P0001', 'historico imutavel',
  'service_role não altera outra coluna do histórico'
);
select throws_ok(
  $$delete from public.registro_alteracoes where registro_id = pg_temp.rid(2)$$,
  'P0001', 'historico imutavel',
  'service_role não apaga histórico de registro que existe'
);

reset role;

select is(
  pg_temp.completo(2), current_setting('teste.completo_2'),
  'depois das tentativas barradas, o histórico do registro 2 segue intacto'
);

-- Exceção 2: excluir a família apaga o histórico dela em cascata.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select lives_ok(
  $$select public.excluir_familia('ffffffff-0000-4000-8000-000000000002')$$,
  'Z exclui a família 2, que tem registro e histórico'
);

reset role;

select is(
  (select count(*)::int from public.registros where familia_id = 'ffffffff-0000-4000-8000-000000000002')
  + (select count(*)::int from public.registro_alteracoes where familia_id = 'ffffffff-0000-4000-8000-000000000002'),
  0,
  'registros e histórico da família 2 sumiram em cascata'
);

-- Exceção 2 pelo caminho da conta: a família órfã apagada por excluir_conta leva o histórico junto.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select lives_ok($$select public.excluir_conta()$$, 'W, criador de família órfã com histórico, exclui a conta');

reset role;

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000003')
  + (select count(*)::int from public.registros where familia_id = 'ffffffff-0000-4000-8000-000000000003')
  + (select count(*)::int from public.registro_alteracoes where familia_id = 'ffffffff-0000-4000-8000-000000000003'),
  0,
  'a família 3, seus registros e o histórico dela sumiram'
);
select is(
  (select count(*)::int from auth.users where id = 'aaaaaaaa-0000-4000-8000-000000000004'),
  0,
  'a conta de W sumiu de auth.users'
);

select * from finish();
rollback;
