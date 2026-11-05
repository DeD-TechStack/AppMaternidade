begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Família 1 (fuso America/Sao_Paulo): R (...01) responsável, O (...03) observador; bebês b1 e b3 (arquivado).
-- Família 2 (fuso Asia/Tokyo): X (...11) responsável; bebê b2.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'o@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'x@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000021', 'sem@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'O'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'X'),
  ('aaaaaaaa-0000-4000-8000-000000000021', 'Sem vínculo');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'Asia/Tokyo', 'aaaaaaaa-0000-4000-8000-000000000011');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000011', 'responsavel');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por, estado) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001', 'ativo'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'Bebê 2', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000011', 'ativo'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 3', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001', 'arquivado');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
-- Registro de fixture. `fuso` é o do registro (que registros_do_dia deve ignorar); a família decide o dia.
create function pg_temp.reg(n int, bebe int, familia int, inicio timestamptz, fim timestamptz default null, fuso text default 'America/Sao_Paulo')
returns void language sql as $$
  insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, fuso, deslocamento_min, criado_por)
  values (pg_temp.rid(n), ('ffffffff-0000-4000-8000-' || lpad(familia::text, 12, '0'))::uuid,
          ('bbbbbbbb-0000-4000-8000-' || lpad(bebe::text, 12, '0'))::uuid, 'sono', inicio, fim, fuso, -180,
          'aaaaaaaa-0000-4000-8000-000000000001');
$$;
-- Ids dos registros devolvidos, em ordem, como "05,07,...".
create function pg_temp.dia(bebe int, dia date) returns text language sql as $$
  select coalesce(string_agg(right(t.id::text, 2), ',' order by t.ordinality), '-')
  from public.registros_do_dia(('bbbbbbbb-0000-4000-8000-' || lpad(bebe::text, 12, '0'))::uuid, dia) with ordinality as t;
$$;

select pg_temp.reg(1, 1, 1, '2026-11-02 01:30+00', null, 'Asia/Tokyo');            -- 22:30 de 01/11 em SP
select pg_temp.reg(2, 1, 1, '2026-11-02 02:59:59+00');                              -- 23:59:59 de 01/11
select pg_temp.reg(3, 1, 1, '2026-11-02 03:00:00+00');                              -- 00:00 de 02/11
select pg_temp.reg(4, 1, 1, '2026-11-02 02:00+00', '2026-11-02 04:00+00');          -- 23:00 a 01:00, atravessa a meia-noite
select pg_temp.reg(5, 1, 1, '2026-11-01 11:00+00');                                 -- em andamento
select pg_temp.reg(6, 1, 1, '2026-11-01 12:00+00', '2026-11-01 12:30+00');          -- será excluído
select pg_temp.reg(8, 1, 1, '2026-11-01 13:00+00', '2026-11-01 13:30+00');          -- mesmo início do 7, id maior (gravado antes)
select pg_temp.reg(7, 1, 1, '2026-11-01 13:00+00', '2026-11-01 13:30+00');
select pg_temp.reg(9, 3, 1, '2026-11-01 14:00+00', '2026-11-01 14:30+00');          -- bebê arquivado
select pg_temp.reg(10, 2, 2, '2026-11-01 16:00+00', '2026-11-01 16:30+00', 'America/Sao_Paulo'); -- 01:00 de 02/11 em Tóquio
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001"}', true);
update public.registros set excluido_em = now() where id = pg_temp.rid(6);

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(pg_temp.dia(1, '2026-11-01'), '05,07,08,01,04,02',
  'dia 01/11 (fuso da família): em andamento, depois por início e id, com 23:59:59 ainda dentro do dia');
select is(pg_temp.dia(1, '2026-11-02'), '03', 'dia 02/11: o registro das 00:00 abre o dia, a sessão da meia-noite não repete');
select is(pg_temp.dia(1, '2026-10-31'), '-', 'dia sem registros devolve 0 linhas');
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-02') where id = pg_temp.rid(4)),
  0, 'a sessão que atravessa a meia-noite aparece só no dia em que começou');
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-02') where id = pg_temp.rid(1)),
  0, 'o dia vem do fuso da família: o fuso Asia/Tokyo gravado no registro não o move para 02/11');
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-01') where id = pg_temp.rid(5) and fim is null),
  1, 'a sessão em andamento (sem fim) é devolvida');
select is(
  (select count(*)::int from public.registros where id = pg_temp.rid(6) and excluido_em is not null),
  1, 'o registro 6 está excluído e legível pelo select');
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-01') where id = pg_temp.rid(6)),
  0, 'o excluído não é devolvido por registros_do_dia');
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-01')
    where bebe_id <> 'bbbbbbbb-0000-4000-8000-000000000001'),
  0, 'só devolve registros do bebê pedido');
select is(pg_temp.dia(3, '2026-11-01'), '09', 'bebê arquivado: os registros continuam saindo (DR-14)');
select is(pg_temp.dia(2, '2026-11-02'), '-', 'bebê de outra família: 0 linhas');
select is(
  (select count(*)::int from public.registros_do_dia('bbbbbbbb-0000-4000-8000-0000000000ff', '2026-11-01')),
  0, 'bebê inexistente: 0 linhas, sem erro');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(pg_temp.dia(1, '2026-11-01'), '05,07,08,01,04,02', 'o observador lê o mesmo dia');
select is(pg_temp.dia(3, '2026-11-01'), '09', 'o observador lê o bebê arquivado');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select is(pg_temp.dia(2, '2026-11-02'), '0a', 'família de Tóquio: 16:00 UTC é 01:00 de 02/11 e o dia segue o fuso da família');
select is(pg_temp.dia(2, '2026-11-01'), '-', 'família de Tóquio: nada em 01/11');
select is(pg_temp.dia(1, '2026-11-01'), '-', 'conta de outra família não lê o dia do bebê 1');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000021", "role": "authenticated"}';
select is(pg_temp.dia(1, '2026-11-01'), '-', 'conta sem vínculo: 0 linhas');

reset role;

select is(
  (select provolatile::text || ' ' || prosecdef::text from pg_proc where oid = 'public.registros_do_dia(uuid, date)'::regprocedure),
  's false', 'registros_do_dia é stable e security invoker');
select is(
  (select string_agg(attname::text, ',' order by attnum) from pg_attribute
    where attrelid = (select typrelid from pg_type where oid = (select prorettype from pg_proc where oid = 'public.registros_do_dia(uuid, date)'::regprocedure))
      and attnum in (1, 2, 3)),
  'id,familia_id,bebe_id', 'registros_do_dia devolve a linha completa de registros');

select * from finish();
rollback;
