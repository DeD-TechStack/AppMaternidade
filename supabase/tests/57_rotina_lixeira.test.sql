begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

-- Adendo R-B, 46-N1: a lixeira só mostra o que ainda se restaura. registros_na_lixeira(id_bebe)
-- devolve os registros excluídos do bebê há menos de 30 dias, do mais recente para o mais antigo
-- (empate pelo id), com a RLS de quem chama.
--
-- Família 1: R (...01) responsável, C (...02) cuidador, O (...03) observador, V (...22) com vínculo
-- revogado e Z (...21) sem vínculo nenhum. Família 2: X (...11) responsável.
-- Bebês: b1 e b3 (família 1) e b2 (família 2).
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'c@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'o@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'x@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000021', 'z@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000022', 'v@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'C'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'O'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'X'),
  ('aaaaaaaa-0000-4000-8000-000000000021', 'Z'),
  ('aaaaaaaa-0000-4000-8000-000000000022', 'V');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000011');
insert into public.vinculos (familia_id, conta_id, papel, estado) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000022', 'cuidador', 'revogado'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000011', 'responsavel', 'ativo');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 3', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'Bebê 2', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000011');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;

-- Registros do bebê 1 (família 1), fraldas do R:
--   1 ativo; 2 e 3 excluídos agora (mesmo excluido_em); 6 excluído há 10 dias; 4 há 29 dias; 5 há 31 dias.
-- 7: excluído agora, do bebê 3 (família 1). 8: excluído agora, do bebê 2 (família 2).
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, detalhes, fuso, deslocamento_min, criado_por)
select pg_temp.rid(n), 'ffffffff-0000-4000-8000-000000000001',
       case when n = 7 then 'bbbbbbbb-0000-4000-8000-000000000003' else 'bbbbbbbb-0000-4000-8000-000000000001' end::uuid,
       'fralda', '2026-11-01 10:00+00', '{"conteudo": "xixi"}', 'America/Sao_Paulo', -180,
       'aaaaaaaa-0000-4000-8000-000000000001'
from unnest(array[1, 3, 2, 6, 4, 5, 7]) as n;
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, detalhes, fuso, deslocamento_min, criado_por) values
  (pg_temp.rid(8), 'ffffffff-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'fralda',
   '2026-11-01 10:00+00', '{"conteudo": "xixi"}', 'America/Sao_Paulo', -180, 'aaaaaaaa-0000-4000-8000-000000000011');
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001"}', true);
update public.registros set excluido_em = now() where id in (pg_temp.rid(2), pg_temp.rid(3), pg_temp.rid(4), pg_temp.rid(5), pg_temp.rid(6), pg_temp.rid(7), pg_temp.rid(8));
-- excluído de um valor para outro: o dono recua a data de exclusão (o gatilho só a força na primeira exclusão).
update public.registros set excluido_em = now() - interval '29 days' where id = pg_temp.rid(4);
update public.registros set excluido_em = now() - interval '31 days' where id = pg_temp.rid(5);
update public.registros set excluido_em = now() - interval '10 days' where id = pg_temp.rid(6);

-- Últimos 2 dígitos dos ids devolvidos pela lixeira do bebê, na ordem em que saem ("02,03,06,04" ou "-").
create function pg_temp.lixeira(bebe int) returns text language plpgsql as $$
begin
  return (
    select coalesce(string_agg(right(t.id::text, 2), ',' order by t.ordinality), '-')
    from public.registros_na_lixeira(('bbbbbbbb-0000-4000-8000-' || lpad(bebe::text, 12, '0'))::uuid) with ordinality as t
  );
end;
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(pg_temp.lixeira(1), '02,03,06,04',
  'responsável: a lixeira do bebê 1 sai do excluído mais recente ao mais antigo, com empate pelo id');
select is(
  (select count(*)::int from public.registros_na_lixeira('bbbbbbbb-0000-4000-8000-000000000001') where id = pg_temp.rid(4)),
  1, 'excluído há 29 dias aparece');
select is(
  (select count(*)::int from public.registros_na_lixeira('bbbbbbbb-0000-4000-8000-000000000001') where id = pg_temp.rid(5)),
  0, 'excluído há 31 dias não aparece');
select is(
  (select count(*)::int from public.registros_na_lixeira('bbbbbbbb-0000-4000-8000-000000000001') where id = pg_temp.rid(1)),
  0, 'registro ativo não aparece');
select is(
  (select count(*)::int from public.registros_na_lixeira('bbbbbbbb-0000-4000-8000-000000000001') where excluido_em is null or bebe_id <> 'bbbbbbbb-0000-4000-8000-000000000001'),
  0, 'só saem excluídos do bebê pedido');
select is(pg_temp.lixeira(3), '07', 'a lixeira de outro bebê da mesma família é só a dele');

-- Quem lê: pela RLS de quem chama.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(pg_temp.lixeira(1), '02,03,06,04', 'o observador da família lê a lixeira');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(pg_temp.lixeira(1), '02,03,06,04', 'o cuidador da família lê a lixeira');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select is(pg_temp.lixeira(1), '-', 'conta de outra família recebe 0 linhas');
select is(pg_temp.lixeira(2), '08', 'e lê a lixeira do bebê da própria família');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000021", "role": "authenticated"}';
select is(pg_temp.lixeira(1), '-', 'conta sem vínculo recebe 0 linhas');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000022", "role": "authenticated"}';
select is(pg_temp.lixeira(1), '-', 'conta com vínculo revogado recebe 0 linhas');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  (select count(*)::int from public.registros_na_lixeira('bbbbbbbb-0000-4000-8000-0000000000ff')),
  0, 'bebê inexistente: 0 linhas, sem erro');

-- Parâmetro obrigatório (R6).
select throws_ok($$select * from public.registros_na_lixeira(null)$$,
  '23502', 'parametro obrigatorio', 'id_bebe nulo dá 23502 "parametro obrigatorio"');

-- anon não executa.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select * from public.registros_na_lixeira('bbbbbbbb-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon não executa registros_na_lixeira');
reset role;

select is(has_function_privilege('anon', 'public.registros_na_lixeira(uuid)', 'execute'), false,
  'has_function_privilege: anon não executa registros_na_lixeira');
select is(has_function_privilege('authenticated', 'public.registros_na_lixeira(uuid)', 'execute'), true,
  'has_function_privilege: authenticated executa registros_na_lixeira');
select is(
  (select p.provolatile::text || ' ' || p.prosecdef::text || ' ' || p.proretset::text || ' ' || p.prorettype::regtype::text || ' ' || (p.proconfig = array['search_path=""'])::text
     from pg_proc p where p.oid = 'public.registros_na_lixeira(uuid)'::regprocedure),
  's false true registros true',
  'registros_na_lixeira é stable, security invoker, devolve setof registros e tem search_path vazio');
select is(
  (select p.proargnames::text from pg_proc p where p.oid = 'public.registros_na_lixeira(uuid)'::regprocedure),
  '{id_bebe}', 'o parâmetro se chama id_bebe');

select * from finish();
rollback;
