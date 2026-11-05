begin;
create extension if not exists pgtap with schema extensions;

select plan(46);

-- Família 1: 1 responsável ativo, 2 cuidador, 3 observador, 4 responsável revogado,
-- 5 responsável que saiu, 6 responsável com validade vencida.
-- Família 2: 7 responsável. 8 existe só em auth.users. 9 criou convite e não tem vínculo.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r1@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'c2@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'o3@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'rv4@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'sa5@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 've6@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'x7@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'n8@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000009', 'g9@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R1'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'C2'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'O3'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Rv4'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'Sa5'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'Ve6'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'X7'),
  ('aaaaaaaa-0000-4000-8000-000000000009', 'G9');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000007');

insert into public.vinculos (familia_id, conta_id, papel, estado, valido_ate) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'responsavel', 'revogado', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', 'responsavel', 'saiu', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006', 'responsavel', 'ativo', now() - interval '1 day'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000007', 'responsavel', 'ativo', null);

insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em) values
  ('c0000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000001', encode(extensions.digest(repeat('a1', 32), 'sha256'), 'hex'), now() + interval '7 days'),
  ('c0000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'cuidador',
   'aaaaaaaa-0000-4000-8000-000000000007', encode(extensions.digest(repeat('b2', 32), 'sha256'), 'hex'), now() + interval '7 days'),
  ('c0000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   'aaaaaaaa-0000-4000-8000-000000000009', encode(extensions.digest(repeat('c3', 32), 'sha256'), 'hex'), now() + interval '7 days');

-- Estrutura.
select has_type('public', 'estado_convite', 'o enum estado_convite existe');

select enum_has_labels(
  'public', 'estado_convite', array['pendente', 'aceito', 'revogado'],
  'estado_convite tem pendente, aceito e revogado (sem expirado)'
);

select is(
  (select array_agg(column_name::text order by column_name)
     from information_schema.columns
    where table_schema = 'public' and table_name = 'convites' and is_nullable = 'YES'),
  array['aceito_em', 'aceito_por', 'criado_por', 'vinculo_valido_ate'],
  'só aceito_em, aceito_por, criado_por e vinculo_valido_ate aceitam nulo'
);

select is(
  (select array_agg(column_name::text order by column_name)
     from information_schema.columns
    where table_schema = 'public' and table_name = 'convites'),
  array['aceito_em', 'aceito_por', 'codigo_hash', 'criado_em', 'criado_por', 'estado',
        'expira_em', 'familia_id', 'id', 'papel', 'vinculo_valido_ate'],
  'a tabela tem exatamente as colunas do modelo, sem usos_restantes nem código em claro'
);

select is(
  (select c.relrowsecurity and not c.relforcerowsecurity
     from pg_class c where c.oid = 'public.convites'::regclass),
  true,
  'RLS ligada, sem force'
);

select is(
  (select c.confdeltype::text
     from pg_constraint c
     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.convites'::regclass and c.contype = 'f' and a.attname = 'criado_por'),
  'n',
  'criado_por usa on delete set null (D21)'
);

select is(
  (select c.confdeltype::text
     from pg_constraint c
     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.convites'::regclass and c.contype = 'f' and a.attname = 'aceito_por'),
  'n',
  'aceito_por usa on delete set null'
);

select is(
  (select c.confdeltype::text
     from pg_constraint c
     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.convites'::regclass and c.contype = 'f' and a.attname = 'familia_id'),
  'c',
  'familia_id usa on delete cascade'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'convites' and indexdef ~ '\(familia_id\)'
  ),
  'há índice em familia_id'
);

-- Restrições.
select throws_ok(
  $$insert into public.convites (familia_id, papel, codigo_hash, expira_em)
    values ('ffffffff-0000-4000-8000-000000000001', 'observador',
            encode(extensions.digest(repeat('a1', 32), 'sha256'), 'hex'), now() + interval '7 days')$$,
  '23505', null,
  'codigo_hash é único'
);

select throws_ok(
  $$insert into public.convites (familia_id, papel, codigo_hash, expira_em, estado)
    values ('ffffffff-0000-4000-8000-000000000001', 'observador', 'hash-aceito-sem-data',
            now() + interval '7 days', 'aceito')$$,
  '23514', null,
  'convite aceito sem aceito_em é recusado'
);

select throws_ok(
  $$insert into public.convites (familia_id, papel, codigo_hash, expira_em, estado, aceito_em)
    values ('ffffffff-0000-4000-8000-000000000001', 'observador', 'hash-pendente-com-data',
            now() + interval '7 days', 'pendente', now())$$,
  '23514', null,
  'convite pendente com aceito_em é recusado'
);

select throws_ok(
  $$insert into public.convites (familia_id, papel, codigo_hash, expira_em, estado, aceito_em)
    values ('ffffffff-0000-4000-8000-000000000001', 'observador', 'hash-revogado-com-data',
            now() + interval '7 days', 'revogado', now())$$,
  '23514', null,
  'convite revogado com aceito_em é recusado'
);

select lives_ok(
  $$insert into public.convites (familia_id, papel, codigo_hash, expira_em, estado, aceito_em, aceito_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'observador', 'hash-aceito-ok',
            now() + interval '7 days', 'aceito', now(), 'aaaaaaaa-0000-4000-8000-000000000003')$$,
  'convite aceito com aceito_em é aceito pela tabela'
);

select is(
  (select estado::text from public.convites where id = 'c0000000-0000-4000-8000-000000000001'),
  'pendente',
  'o estado padrão é pendente'
);

-- Grants.
select is(
  (select count(*)::int
     from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'convites'
      and c.column_name <> 'codigo_hash'
      and has_column_privilege('authenticated', 'public.convites', c.column_name, 'select')),
  10,
  'authenticated lê as 10 colunas que não são codigo_hash'
);

select is(
  has_column_privilege('authenticated', 'public.convites', 'codigo_hash', 'select'),
  false,
  'authenticated não lê codigo_hash'
);

select is(
  has_table_privilege('authenticated', 'public.convites', 'insert')
  or has_table_privilege('authenticated', 'public.convites', 'update')
  or has_table_privilege('authenticated', 'public.convites', 'delete')
  or has_any_column_privilege('authenticated', 'public.convites', 'insert')
  or has_any_column_privilege('authenticated', 'public.convites', 'update'),
  false,
  'authenticated não tem insert, update nem delete na tabela'
);

select is(
  has_table_privilege('anon', 'public.convites', 'select')
  or has_any_column_privilege('anon', 'public.convites', 'select')
  or has_any_column_privilege('anon', 'public.convites', 'insert')
  or has_any_column_privilege('anon', 'public.convites', 'update')
  or has_table_privilege('anon', 'public.convites', 'delete'),
  false,
  'anon não tem nenhum privilégio na tabela'
);

-- Política de select.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from (select id, familia_id, papel, estado, expira_em from public.convites) t),
  3,
  'responsável ativo lê os convites da própria família (pendentes e aceito)'
);

select is(
  (select count(*)::int from public.convites where familia_id = 'ffffffff-0000-4000-8000-000000000002'),
  0,
  'responsável ativo não lê convite de outra família'
);

select throws_ok(
  $$select codigo_hash from public.convites$$,
  '42501', null,
  'responsável ativo não lê codigo_hash'
);

select throws_ok(
  $$select * from public.convites$$,
  '42501', null,
  'select * em convites é negado por causa de codigo_hash'
);

select throws_ok(
  $$insert into public.convites (familia_id, papel, codigo_hash, expira_em)
    values ('ffffffff-0000-4000-8000-000000000001', 'observador', 'hash-direto', now() + interval '7 days')$$,
  '42501', null,
  'responsável ativo não insere convite direto'
);

select throws_ok(
  $$update public.convites set estado = 'revogado' where id = 'c0000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'responsável ativo não altera convite direto'
);

select throws_ok(
  $$delete from public.convites where id = 'c0000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'responsável ativo não apaga convite direto'
);

-- Quem não é responsável ativo da família não lê nada.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  (select count(*)::int from (select id from public.convites) t), 0, 'cuidador não lê convites'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  (select count(*)::int from (select id from public.convites) t), 0, 'observador não lê convites'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select is(
  (select count(*)::int from (select id from public.convites) t), 0, 'responsável revogado não lê convites'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(
  (select count(*)::int from (select id from public.convites) t), 0, 'responsável que saiu não lê convites'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(
  (select count(*)::int from (select id from public.convites) t), 0, 'responsável vencido não lê convites'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select is(
  (select count(*)::int from (select id from public.convites) t), 0, 'conta sem linha em contas não lê convites'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';
select is(
  (select count(*)::int from (select id from public.convites) t),
  1,
  'responsável da outra família lê só o convite dela'
);

reset role;

select is(
  (select count(*)::int from public.convites
    where estado = 'pendente' and familia_id in ('ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000002')),
  3,
  'os convites seguem intactos depois das tentativas negadas'
);

-- Insert, update e delete diretos negados também para cuidador e observador; a linha segue intacta.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$insert into public.convites (familia_id, papel, codigo_hash, expira_em)
    values ('ffffffff-0000-4000-8000-000000000001', 'observador', 'hash-cuidador', now() + interval '7 days')$$,
  '42501', null, 'cuidador não insere convite direto'
);
select throws_ok(
  $$update public.convites set estado = 'revogado' where id = 'c0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'cuidador não altera convite direto'
);
select throws_ok(
  $$delete from public.convites where id = 'c0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'cuidador não apaga convite direto'
);

reset role;

select is(
  (select c.estado::text || '|' || c.papel::text || '|' || c.criado_por::text
     from public.convites c where c.id = 'c0000000-0000-4000-8000-000000000001'),
  'pendente|observador|aaaaaaaa-0000-4000-8000-000000000001',
  'a linha segue intacta depois das tentativas do cuidador'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$insert into public.convites (familia_id, papel, codigo_hash, expira_em)
    values ('ffffffff-0000-4000-8000-000000000001', 'observador', 'hash-observador', now() + interval '7 days')$$,
  '42501', null, 'observador não insere convite direto'
);
select throws_ok(
  $$update public.convites set estado = 'revogado' where id = 'c0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'observador não altera convite direto'
);
select throws_ok(
  $$delete from public.convites where id = 'c0000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'observador não apaga convite direto'
);

reset role;

select is(
  (select c.estado::text || '|' || c.papel::text || '|' || c.criado_por::text
     from public.convites c where c.id = 'c0000000-0000-4000-8000-000000000001')
  || '|' || (select count(*)::text from public.convites
              where familia_id in ('ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000002')),
  'pendente|observador|aaaaaaaa-0000-4000-8000-000000000001|4',
  'a linha e o total de convites seguem intactos depois das tentativas do observador'
);

-- Chaves estrangeiras em ação.
select lives_ok(
  $$delete from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000009'$$,
  'apagar a conta de quem criou o convite não falha'
);

select is(
  (select criado_por is null and estado = 'pendente'
     from public.convites where id = 'c0000000-0000-4000-8000-000000000003'),
  true,
  'o convite sobrevive com criado_por nulo'
);

select lives_ok(
  $$delete from public.familias where id = 'ffffffff-0000-4000-8000-000000000002'$$,
  'apagar a família não falha por causa dos convites'
);

select is(
  (select count(*)::int from public.convites where familia_id = 'ffffffff-0000-4000-8000-000000000002'),
  0,
  'os convites da família apagada somem em cascata'
);

select * from finish();
rollback;
