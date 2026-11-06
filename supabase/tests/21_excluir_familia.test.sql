begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

create function pg_temp.foto() returns text language sql as $$
  select (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
      || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c) || '/'
      || (select md5(string_agg(b::text, '|' order by b.id)) from public.bebes b) || '/'
      || (select md5(string_agg(f::text, '|' order by f.id)) from public.familias f) || '/'
      || (select md5(string_agg(t::text, '|' order by t.id)) from public.contas t);
$$;

-- Família 1: 01 e 02 responsáveis ativos, 03 cuidador, 04 observador, 05 responsável revogado,
-- 06 responsável que saiu, 07 responsável com validade vencida. Família 2: 08 responsável.
-- Família 3: 09 e 10 responsáveis. Família 4: 11 sozinho. Família 5: 12 e 13.
-- 14 existe só em auth.users, sem linha em contas.
insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || n || '@exemplo.invalid'
from generate_series(1, 14) as n;

insert into public.contas (id, nome_privado)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'U' || n
from generate_series(1, 13) as n;

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000008'),
  ('ffffffff-0000-4000-8000-000000000003', 'Família 3', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000009'),
  ('ffffffff-0000-4000-8000-000000000004', 'Família 4', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000011'),
  ('ffffffff-0000-4000-8000-000000000005', 'Família 5', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000012');

insert into public.vinculos (familia_id, conta_id, papel, estado, valido_ate) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'cuidador', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'observador', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', 'responsavel', 'revogado', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006', 'responsavel', 'saiu', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000007', 'responsavel', 'ativo', now() - interval '1 day'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000008', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000009', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000010', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000011', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000012', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000013', 'responsavel', 'ativo', null);

insert into public.bebes (id, familia_id, nome, nascimento, estado, criado_por) values
  ('bebe0000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Lia', '2026-08-05', 'ativo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('bebe0000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'Arquivado', '2025-01-01', 'arquivado', 'aaaaaaaa-0000-4000-8000-000000000002'),
  ('bebe0000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000002', 'Da 2', '2026-01-01', 'ativo', 'aaaaaaaa-0000-4000-8000-000000000008'),
  ('bebe0000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000003', 'Da 3', '2026-01-01', 'ativo', 'aaaaaaaa-0000-4000-8000-000000000009');

insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em, estado, aceito_por, aceito_em) values
  ('c0000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000001', 'hash-1', now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   'aaaaaaaa-0000-4000-8000-000000000002', 'hash-2', now() + interval '3 days', 'aceito',
   'aaaaaaaa-0000-4000-8000-000000000003', now()),
  ('c0000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   'aaaaaaaa-0000-4000-8000-000000000001', 'hash-3', now() - interval '1 day', 'revogado', null, null),
  ('c0000000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000002', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000008', 'hash-4', now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-000000000005', 'ffffffff-0000-4000-8000-000000000003', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000009', 'hash-5', now() + interval '3 days', 'pendente', null, null);

select set_config('teste.foto', pg_temp.foto(), true);

-- Quem não é responsável ativo da família não exclui nada, e todos recebem o mesmo erro.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  '42501', 'sem permissao', 'cuidador não exclui a família');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  '42501', 'sem permissao', 'observador não exclui a família');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'responsável revogado não exclui a família (sem visibilidade: P0002)');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'responsável que saiu não exclui a família (sem visibilidade: P0002)');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'responsável com validade vencida não exclui a família (sem visibilidade: P0002)');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'responsável de outra família não exclui a família 1 (sem visibilidade: P0002)');
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-0000000000ee')$$,
  'P0002', 'familia inexistente', 'família inexistente dá o mesmo erro de família alheia (P0002)');

-- Parâmetro nulo, conta sem linha em contas e a ordem dos erros.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$select public.excluir_familia(null)$$, 'P0001', 'parametro obrigatorio', 'família nula');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000014", "role": "authenticated"}';
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0001', 'conta inexistente', 'conta sem linha em contas');
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-0000000000ee')$$,
  'P0001', 'conta inexistente', 'conta inexistente vem antes de sem permissao');
select throws_ok($$select public.excluir_familia(null)$$,
  'P0001', 'parametro obrigatorio', 'parametro obrigatorio vem antes de conta inexistente');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon não executa excluir_familia');

reset role;

select is(pg_temp.foto(), current_setting('teste.foto'),
  'as chamadas recusadas não mudaram nada: famílias, vínculos, épocas, bebês, convites e contas iguais');

-- Falhas simuladas (C3).
create schema teste_falhas;

create function teste_falhas.impasse() returns trigger language plpgsql as $$
begin
  raise deadlock_detected;
end;
$$;

create function teste_falhas.nula() returns trigger language plpgsql as $$
begin
  raise not_null_violation;
end;
$$;

create trigger falha_simulada before delete on public.familias
  for each row execute function teste_falhas.impasse();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0001', 'tente de novo', '40P01 vira tente de novo em excluir_familia');

reset role;
drop trigger falha_simulada on public.familias;
create trigger falha_simulada before delete on public.familias
  for each row execute function teste_falhas.nula();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0001', 'parametro obrigatorio', '23502 vira parametro obrigatorio em excluir_familia');

reset role;
drop trigger falha_simulada on public.familias;

select is(pg_temp.foto(), current_setting('teste.foto'), 'as falhas simuladas desfizeram tudo');

-- Responsável ativo exclui a família 1 (com ex-membros, bebês e convites de vários estados).
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'responsável ativo exclui a família');
select is((select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'), 0,
  'quem excluiu já não lê a família na mesma transação');
select throws_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'excluir a família de novo dá familia inexistente (P0002)');

reset role;

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001')
  + (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000001')
  + (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001')
  + (select count(*)::int from public.convites where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  0,
  'a família some com todos os vínculos (em qualquer estado), bebês (inclusive arquivado) e convites'
);
select is(
  (select count(*)::int from public.contas where id between 'aaaaaaaa-0000-4000-8000-000000000001'
                                                      and 'aaaaaaaa-0000-4000-8000-000000000013'),
  13,
  'nenhuma conta foi apagada: a exclusão da família não toca em auth.users nem em contas'
);
select is(
  (select count(*)::int from auth.users where id between 'aaaaaaaa-0000-4000-8000-000000000001'
                                                    and 'aaaaaaaa-0000-4000-8000-000000000014'),
  14,
  'nenhum usuário de auth.users foi apagado'
);
select is(
  (select count(*)::int from public.familias where id in
    ('ffffffff-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000003',
     'ffffffff-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000005')), 4,
  'as outras quatro famílias seguem'
);
select is(
  (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000002')
  + (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000002')
  + (select count(*)::int from public.convites where familia_id = 'ffffffff-0000-4000-8000-000000000002'),
  3,
  'a família 2 segue com seu vínculo, seu bebê e seu convite'
);
select is(
  (select epoca from public.vinculos
    where familia_id = 'ffffffff-0000-4000-8000-000000000002' and conta_id = 'aaaaaaaa-0000-4000-8000-000000000008'),
  1,
  'a época dos vínculos das outras famílias não mudou'
);

-- Qualquer responsável ativo exclui (D10), com outro responsável na família.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select lives_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000003')$$,
  'outro responsável ativo, que não criou a família, também exclui');

-- Responsável único, sozinho na família, também exclui (a exclusão da família é a saída explícita).
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select lives_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000004')$$,
  'o único responsável, sozinho na família, exclui a família');

reset role;

select is(
  (select count(*)::int from public.familias where id in
    ('ffffffff-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000004')),
  0,
  'as duas famílias foram apagadas'
);
select is(
  (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000003')
  + (select count(*)::int from public.convites where familia_id = 'ffffffff-0000-4000-8000-000000000003'),
  0,
  'bebês e convites da família 3 sumiram em cascata'
);
select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000005')
  + (select count(*)::int from public.vinculos where familia_id = 'ffffffff-0000-4000-8000-000000000005'),
  3,
  'a família 5 e seus vínculos seguem intactos'
);

-- Estrutura.
select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.excluir_familia(uuid)'::regprocedure),
  'public\.familias f where f\.id = excluir_familia\.familia for update(.|\n)*tem_vinculo_ativo',
  'excluir_familia trava a família e só então confere o chamador'
);
select ok(
  (select p.prosecdef and p.proconfig @> array['search_path=""']
     from pg_proc p where p.oid = 'public.excluir_familia(uuid)'::regprocedure),
  'excluir_familia é security definer com search_path vazio'
);

select * from finish();
rollback;
