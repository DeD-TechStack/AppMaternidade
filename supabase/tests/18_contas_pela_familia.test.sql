begin;
create extension if not exists pgtap with schema extensions;

select plan(33);

create function pg_temp.afetadas(consulta text) returns int
language plpgsql as $$
declare n int;
begin
  execute consulta;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Família 1: 01 A responsável, 02 B cuidador, 03 C observador, 04 D revogado, 05 E que saiu,
-- 06 F ativo com validade vencida, 07 G ativo com validade futura.
-- Família 2: 08 X responsável e 02 B cuidador (B está nas duas famílias).
-- 09 H tem conta e nenhuma família. 10 N existe só em auth.users, sem linha em contas.
insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || n || '@exemplo.invalid'
from generate_series(1, 10) as n;

insert into public.contas (id, nome_privado, fuso)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       (array['A', 'B', 'C', 'D', 'E', 'F', 'G', 'X', 'H'])[n], 'America/Sao_Paulo'
from generate_series(1, 9) as n;

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000008');

insert into public.vinculos (id, familia_id, conta_id, papel, estado, valido_ate) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo', null),
  ('bb000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador', 'ativo', null),
  ('bb000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador', 'ativo', null),
  ('bb000000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'cuidador', 'revogado', null),
  ('bb000000-0000-4000-8000-000000000005', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', 'cuidador', 'saiu', null),
  ('bb000000-0000-4000-8000-000000000006', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006', 'cuidador', 'ativo', now() - interval '1 day'),
  ('bb000000-0000-4000-8000-000000000007', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000007', 'cuidador', 'ativo', now() + interval '1 day'),
  ('bb000000-0000-4000-8000-000000000008', 'ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000008', 'responsavel', 'ativo', null),
  ('bb000000-0000-4000-8000-0000000000b2', 'ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador', 'ativo', null);

insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em) values
  ('c0000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000001', encode(extensions.digest(repeat('a1', 32), 'sha256'), 'hex'),
   now() + interval '3 days');

-- Cada pessoa lê as contas de quem tem vínculo ativo numa família em comum, e a própria.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  array(select nome_privado from public.contas order by nome_privado),
  array['A', 'B', 'C', 'G'],
  'responsável lê os membros ativos da família, e não ex-membros, vencidos nem a outra família'
);

select is(
  (select count(*)::int from (select id, nome_privado, fuso, criada_em from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000002') t),
  1,
  'todas as colunas de contas são legíveis nas contas da família'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  array(select nome_privado from public.contas order by nome_privado),
  array['A', 'B', 'C', 'G', 'X'],
  'cuidador das duas famílias lê os membros das duas'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select is(
  array(select nome_privado from public.contas order by nome_privado),
  array['A', 'B', 'C', 'G'],
  'observador também lê os membros da família'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';

select is(
  array(select nome_privado from public.contas order by nome_privado),
  array['A', 'B', 'C', 'G'],
  'vínculo ativo com validade futura lê e é lido'
);

-- A relação não é transitiva.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';

select is(
  array(select nome_privado from public.contas order by nome_privado),
  array['B', 'X'],
  'quem está só na família 2 lê B (que está nas duas), mas não A, C nem G'
);

-- Ex-membros e sem família leem só a própria linha.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(array(select nome_privado from public.contas order by nome_privado), array['D'],
  'vínculo revogado lê só a própria conta');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(array(select nome_privado from public.contas order by nome_privado), array['E'],
  'quem saiu lê só a própria conta');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(array(select nome_privado from public.contas order by nome_privado), array['F'],
  'vínculo vencido lê só a própria conta');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';
select is(array(select nome_privado from public.contas order by nome_privado), array['H'],
  'conta sem família lê só a própria conta');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select is((select count(*)::int from public.contas), 0, 'conta sem linha em contas não lê nada');

-- contas_visiveis().
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  array(select c::text from public.contas_visiveis() c order by 1),
  array['aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002',
        'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000007'],
  'contas_visiveis devolve as contas com vínculo ativo nas famílias em comum'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';
select is((select count(*)::int from public.contas_visiveis()), 0, 'contas_visiveis devolve vazio para conta sem família');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select is((select count(*)::int from public.contas_visiveis()), 0, 'contas_visiveis devolve vazio para vínculo revogado');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select is((select count(*)::int from public.contas_visiveis()), 0, 'contas_visiveis devolve vazio para conta sem linha em contas');

-- Escrita: cada pessoa só altera a própria linha.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  pg_temp.afetadas($$update public.contas set nome_privado = 'Invadida' where id = 'aaaaaaaa-0000-4000-8000-000000000002'$$),
  0,
  'ler a conta de um membro não dá o direito de alterá-la (0 linhas)'
);
select throws_ok(
  $$delete from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000002'$$,
  '42501', null, 'ninguém apaga contas direto'
);
select throws_ok(
  $$insert into public.contas (id, nome_privado) values ('aaaaaaaa-0000-4000-8000-000000000010', 'Em nome de N')$$,
  '42501', null, 'ninguém insere conta com o id de outra pessoa'
);
select is(
  pg_temp.afetadas($$update public.contas set nome_privado = 'A editada' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$),
  1,
  'cada pessoa altera a própria conta'
);

reset role;

select is(
  (select nome_privado from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  'B',
  'a conta de B segue intacta depois das tentativas negadas'
);

-- Efeito imediato: revogar tira a leitura na mesma transação; aceitar convite dá a leitura.
update public.vinculos set estado = 'revogado' where id = 'bb000000-0000-4000-8000-000000000003';

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  array(select nome_privado from public.contas order by nome_privado),
  array['A editada', 'B', 'G'],
  'quem foi revogado deixa de ser lido na mesma transação'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  array(select nome_privado from public.contas order by nome_privado),
  array['C'],
  'quem foi revogado deixa de ler os outros na mesma transação'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';
select lives_ok($$select public.aceitar_convite(repeat('a1', 32))$$, 'H aceita o convite e entra na família 1');
select is(
  array(select nome_privado from public.contas order by nome_privado),
  array['A editada', 'B', 'G', 'H'],
  'quem acaba de entrar já lê os membros na mesma transação'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  (select count(*)::int from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000009'),
  1,
  'e já é lido pelos outros membros na mesma transação'
);

-- sair_da_familia tira a leitura nos dois sentidos.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';
select lives_ok($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$, 'G sai da família');
select is(array(select nome_privado from public.contas order by nome_privado), array['G'],
  'quem saiu lê só a própria conta');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is((select count(*)::int from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000007'), 0,
  'e deixa de ser lido');

-- Anônimo.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select * from public.contas$$, '42501', null, 'anon não lê contas');
select throws_ok($$select public.contas_visiveis()$$, '42501', null, 'anon não executa contas_visiveis');

reset role;

-- Estrutura: a política de select usa contas_visiveis; insert e update seguem como na MAT-43.
select matches(
  (select p.qual from pg_policies p where p.schemaname = 'public' and p.tablename = 'contas' and p.policyname = 'contas_select'),
  'contas_visiveis',
  'a política contas_select usa contas_visiveis'
);
select is(
  (select array_agg(p.policyname::text order by p.policyname) from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'contas'),
  array['contas_insert', 'contas_select', 'contas_update'],
  'contas segue com as três políticas'
);
select ok(
  (select p.prosecdef and p.provolatile = 's' and p.proconfig @> array['search_path=""'] and p.pronargs = 0
     from pg_proc p where p.oid = 'public.contas_visiveis()'::regprocedure),
  'contas_visiveis é stable, security definer, com search_path vazio e sem parâmetro'
);

select * from finish();
rollback;
