begin;
create extension if not exists pgtap with schema extensions;

select plan(62);

-- Família 1: 1 responsável, 5 cuidador ativo, 6 observador ativo; 7 revogado (época 3), 8 saiu (época 2),
-- 9 ativo com validade vencida, 10 revogado (usado nas falhas simuladas). Família 2: 12 responsável.
-- 2, 3, 4 e 13 têm conta e nenhuma família. 11 existe só em auth.users, sem linha em contas.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r1@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'd2@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'e3@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'z4@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'c5@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'o6@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'rv7@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'sa8@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000009', 've9@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000010', 'rg10@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'n11@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000012', 'x12@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000013', 'w13@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000014', 'y14@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000015', 'k15@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000016', 'j16@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000017', 'r17@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R1'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'D2'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'E3'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Z4'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'C5'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'O6'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'Rv7'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'Sa8'),
  ('aaaaaaaa-0000-4000-8000-000000000009', 'Ve9'),
  ('aaaaaaaa-0000-4000-8000-000000000010', 'Rg10'),
  ('aaaaaaaa-0000-4000-8000-000000000012', 'X12'),
  ('aaaaaaaa-0000-4000-8000-000000000013', 'W13'),
  ('aaaaaaaa-0000-4000-8000-000000000014', 'Y14'),
  ('aaaaaaaa-0000-4000-8000-000000000015', 'K15'),
  ('aaaaaaaa-0000-4000-8000-000000000016', 'J16'),
  ('aaaaaaaa-0000-4000-8000-000000000017', 'R17');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000012');

insert into public.vinculos (id, familia_id, conta_id, papel, estado, valido_ate, epoca, criado_em, encerrado_em, concedido_por) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'responsavel', 'ativo', null, 1, now() - interval '60 days', null, null),
  ('bb000000-0000-4000-8000-000000000005', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005',
   'cuidador', 'ativo', now() + interval '1 day', 1, now() - interval '50 days', null, null),
  ('bb000000-0000-4000-8000-000000000006', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006',
   'observador', 'ativo', null, 1, now() - interval '50 days', null, null),
  ('bb000000-0000-4000-8000-000000000007', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000007',
   'responsavel', 'revogado', now() - interval '1 day', 3, now() - interval '30 days', now() - interval '5 days',
   'aaaaaaaa-0000-4000-8000-000000000012'),
  ('bb000000-0000-4000-8000-000000000008', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000008',
   'observador', 'saiu', null, 2, now() - interval '20 days', now() - interval '2 days', null),
  ('bb000000-0000-4000-8000-000000000009', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000009',
   'cuidador', 'ativo', now() - interval '1 day', 1, now() - interval '10 days', null, null),
  ('bb000000-0000-4000-8000-000000000010', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000010',
   'cuidador', 'revogado', null, 5, now() - interval '40 days', now() - interval '3 days', null),
  ('bb000000-0000-4000-8000-000000000012', 'ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000012',
   'responsavel', 'ativo', null, 1, now() - interval '60 days', null, null);

-- Código de cada convite: o hexadecimal de dois caracteres da coluna cod repetido 32 vezes.
--   a1 observador (D novo), a2 cuidador com validade (E novo), a3 responsável (Z novo),
--   a4 cuidador (7 reingressa), a5 observador (8 reingressa), a6 cuidador com validade (9 reingressa),
--   b1 revogado, b2 aceito, b3 pendente vencido, b4 pendente com validade de vínculo já passada,
--   b5 revogado e vencido, b6 aceito e vencido, c1 pendente para quem já é membro,
--   c2 pendente de criador removido, c3 pendente criado por quem já não é responsável,
--   d1 e d2 pendentes para as falhas simuladas.
insert into public.convites (id, familia_id, papel, vinculo_valido_ate, criado_por, codigo_hash,
                             expira_em, estado, aceito_por, aceito_em)
select v.id::uuid, 'ffffffff-0000-4000-8000-000000000001', v.papel::public.papel_familia, v.valido::timestamptz,
       v.criador::uuid, encode(extensions.digest(repeat(v.cod, 32), 'sha256'), 'hex'),
       v.expira::timestamptz, v.estado::public.estado_convite, v.aceito_por::uuid, v.aceito_em::timestamptz
from (values
  ('c0000000-0000-4000-8000-0000000000a1', 'observador', null::timestamptz, 'aaaaaaaa-0000-4000-8000-000000000001', 'a1',
   now() + interval '3 days', 'pendente', null, null::timestamptz),
  ('c0000000-0000-4000-8000-0000000000a2', 'cuidador', now() + interval '30 days', 'aaaaaaaa-0000-4000-8000-000000000001', 'a2',
   now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000a3', 'responsavel', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'a3',
   now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000a4', 'cuidador', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'a4',
   now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000a5', 'observador', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'a5',
   now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000a6', 'cuidador', now() + interval '30 days', 'aaaaaaaa-0000-4000-8000-000000000001', 'a6',
   now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000b1', 'cuidador', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'b1',
   now() + interval '3 days', 'revogado', null, null),
  ('c0000000-0000-4000-8000-0000000000b2', 'cuidador', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'b2',
   now() + interval '3 days', 'aceito', 'aaaaaaaa-0000-4000-8000-000000000006', now()),
  ('c0000000-0000-4000-8000-0000000000b3', 'cuidador', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'b3',
   now() - interval '1 day', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000b4', 'cuidador', now() - interval '1 hour', 'aaaaaaaa-0000-4000-8000-000000000001', 'b4',
   now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000b5', 'cuidador', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'b5',
   now() - interval '1 day', 'revogado', null, null),
  ('c0000000-0000-4000-8000-0000000000b6', 'cuidador', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'b6',
   now() - interval '1 day', 'aceito', 'aaaaaaaa-0000-4000-8000-000000000006', now()),
  ('c0000000-0000-4000-8000-0000000000c1', 'observador', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'c1',
   now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000c2', 'observador', null, null, 'c2',
   now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000c3', 'observador', null, 'aaaaaaaa-0000-4000-8000-000000000007', 'c3',
   now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000d1', 'cuidador', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'd1',
   now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000d2', 'observador', null, 'aaaaaaaa-0000-4000-8000-000000000001', 'd2',
   now() + interval '3 days', 'pendente', null, null)
) as v(id, papel, valido, criador, cod, expira, estado, aceito_por, aceito_em);

-- d3: pendente de cuidador na família 1, para o controle sem falha (convidada 15).
-- Família 9, montada como dono sem nenhum responsável ativo (estado de defesa): 17 é responsável revogado
-- e criou o convite f1 (pendente, de cuidador), que 16 aceita no controle de "sem responsável antes".
insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em) values
  ('c0000000-0000-4000-8000-0000000000d3', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   'aaaaaaaa-0000-4000-8000-000000000001', encode(extensions.digest(repeat('d3', 32), 'sha256'), 'hex'),
   now() + interval '3 days');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000009', 'Família 9', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000017');

insert into public.vinculos (id, familia_id, conta_id, papel, estado) values
  ('bb000000-0000-4000-8000-000000000017', 'ffffffff-0000-4000-8000-000000000009', 'aaaaaaaa-0000-4000-8000-000000000017',
   'responsavel', 'revogado');

insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em) values
  ('c0000000-0000-4000-8000-0000000000f1', 'ffffffff-0000-4000-8000-000000000009', 'cuidador',
   'aaaaaaaa-0000-4000-8000-000000000017', encode(extensions.digest(repeat('f1', 32), 'sha256'), 'hex'),
   now() + interval '3 days');

-- Novo membro: D aceita o convite de observador.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  0,
  'antes do aceite, D não lê a família'
);

select is(
  public.aceitar_convite(repeat('a1', 32)),
  'ffffffff-0000-4000-8000-000000000001'::uuid,
  'aceitar_convite devolve o id da família'
);

select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  1,
  'o novo membro já lê a família na mesma transação (invariante 1)'
);

reset role;

select is(
  (select v.estado::text || '|' || v.papel::text || '|' || coalesce(v.valido_ate::text, '-') || '|'
          || coalesce(v.concedido_por::text, '-') || '|' || (v.encerrado_em is null)::text || '|' || v.epoca::text
     from public.vinculos v
    where v.familia_id = 'ffffffff-0000-4000-8000-000000000001' and v.conta_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  'ativo|observador|-|aaaaaaaa-0000-4000-8000-000000000001|true|1',
  'vínculo novo: ativo, papel do convite, sem validade, concedido pelo criador, época 1'
);

select is(
  (select c.estado::text || '|' || (c.aceito_por = 'aaaaaaaa-0000-4000-8000-000000000002')::text || '|'
          || (c.aceito_em = now())::text
     from public.convites c where c.id = 'c0000000-0000-4000-8000-0000000000a1'),
  'aceito|true|true',
  'o convite fica aceito, com quem aceitou e quando'
);

-- Uso único: o mesmo código não vale duas vezes, nem para quem já aceitou.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$select public.aceitar_convite(repeat('a1', 32))$$,
  'P0001', 'convite usado', 'outro aceite do mesmo código dá convite usado'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$select public.aceitar_convite(repeat('a1', 32))$$,
  'P0001', 'convite usado', 'quem já aceitou recebe convite usado, que vem antes de ja e membro'
);

-- Novo membro com validade, com o código em maiúsculas e com espaços nas pontas.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select is(
  public.aceitar_convite('  ' || upper(repeat('a2', 32)) || '  '),
  'ffffffff-0000-4000-8000-000000000001'::uuid,
  'o código é normalizado antes do hash'
);

-- Novo membro responsável.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select lives_ok($$select public.aceitar_convite(repeat('a3', 32))$$, 'convite de responsável é aceito');

reset role;

select is(
  (select v.estado::text || '|' || v.papel::text || '|' || (v.valido_ate = now() + interval '30 days')::text || '|' || v.epoca::text
     from public.vinculos v
    where v.familia_id = 'ffffffff-0000-4000-8000-000000000001' and v.conta_id = 'aaaaaaaa-0000-4000-8000-000000000003'),
  'ativo|cuidador|true|1',
  'o vínculo novo herda a validade do convite'
);

select is(
  (select v.estado::text || '|' || v.papel::text || '|' || coalesce(v.valido_ate::text, '-') || '|' || v.epoca::text
     from public.vinculos v
    where v.familia_id = 'ffffffff-0000-4000-8000-000000000001' and v.conta_id = 'aaaaaaaa-0000-4000-8000-000000000004'),
  'ativo|responsavel|-|1',
  'o vínculo de responsável nasce sem validade'
);

-- Reingresso: a mesma linha volta a valer, com época +1 e antiguidade nova.
select set_config('teste.vinculo_7',
  (select v.id::text from public.vinculos v
    where v.familia_id = 'ffffffff-0000-4000-8000-000000000001' and v.conta_id = 'aaaaaaaa-0000-4000-8000-000000000007'), true);

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';

select lives_ok($$select public.aceitar_convite(repeat('a4', 32))$$, 'ex-membro revogado aceita convite novo');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';

select lives_ok($$select public.aceitar_convite(repeat('a5', 32))$$, 'ex-membro que saiu aceita convite novo');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';

select lives_ok($$select public.aceitar_convite(repeat('a6', 32))$$, 'membro com vínculo vencido aceita convite novo');

reset role;

select is(
  (select count(*)::int from public.vinculos
    where familia_id = 'ffffffff-0000-4000-8000-000000000001' and conta_id = 'aaaaaaaa-0000-4000-8000-000000000007'),
  1,
  'o reingresso reaproveita a linha: continua só um vínculo por conta e família'
);

select is(
  (select (v.id::text = current_setting('teste.vinculo_7'))::text || '|' || v.estado::text || '|' || v.papel::text || '|'
          || coalesce(v.valido_ate::text, '-') || '|' || coalesce(v.concedido_por::text, '-') || '|'
          || (v.encerrado_em is null)::text || '|' || (v.criado_em = now())::text || '|' || v.epoca::text
     from public.vinculos v
    where v.familia_id = 'ffffffff-0000-4000-8000-000000000001' and v.conta_id = 'aaaaaaaa-0000-4000-8000-000000000007'),
  'true|ativo|cuidador|-|aaaaaaaa-0000-4000-8000-000000000001|true|true|4',
  'revogado reingressa: papel e validade do convite, concedido_por do criador, encerrado_em nulo, criado_em agora, época 3 → 4'
);

select is(
  (select v.estado::text || '|' || v.papel::text || '|' || coalesce(v.valido_ate::text, '-') || '|'
          || (v.encerrado_em is null)::text || '|' || (v.criado_em = now())::text || '|' || v.epoca::text
     from public.vinculos v
    where v.familia_id = 'ffffffff-0000-4000-8000-000000000001' and v.conta_id = 'aaaaaaaa-0000-4000-8000-000000000008'),
  'ativo|observador|-|true|true|3',
  'quem saiu reingressa: encerrado_em volta a nulo, criado_em agora, época 2 → 3'
);

select is(
  (select v.estado::text || '|' || v.papel::text || '|' || (v.valido_ate = now() + interval '30 days')::text || '|'
          || (v.criado_em = now())::text || '|' || v.epoca::text
     from public.vinculos v
    where v.familia_id = 'ffffffff-0000-4000-8000-000000000001' and v.conta_id = 'aaaaaaaa-0000-4000-8000-000000000009'),
  'ativo|cuidador|true|true|2',
  'vínculo vencido é reativado com a validade nova, criado_em agora, época 1 → 2'
);

select is(
  (select v.epoca from public.vinculos v where v.id = 'bb000000-0000-4000-8000-000000000001'),
  1,
  'o aceite não mexe na época de outros vínculos'
);

-- Aceite não reconfere quem convidou (D5 cuida de revogar os convites de quem deixa de ser responsável).
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000012", "role": "authenticated"}';

select lives_ok(
  $$select public.aceitar_convite(repeat('c3', 32))$$,
  'convite criado por quem já não é responsável ainda pode ser aceito se segue pendente'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000014", "role": "authenticated"}';

select lives_ok(
  $$select public.aceitar_convite(repeat('c2', 32))$$,
  'convite de criador removido (criado_por nulo) pode ser aceito'
);

reset role;

select is(
  (select coalesce(v.concedido_por::text, '-') || '|' || v.papel::text
     from public.vinculos v
    where v.familia_id = 'ffffffff-0000-4000-8000-000000000001' and v.conta_id = 'aaaaaaaa-0000-4000-8000-000000000014'),
  '-|observador',
  'criado_por nulo no convite dá concedido_por nulo no vínculo'
);

-- Quem já é membro ativo recebe ja e membro e o convite fica pendente.
select set_config('teste.antes',
  (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c) || '/'
  || (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v), true);

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('c1', 32))$$,
  'P0001', 'ja e membro', 'responsável ativo recebe ja e membro'
);
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('c1', 32))$$,
  'P0001', 'ja e membro', 'cuidador ativo com validade futura recebe ja e membro'
);
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('c1', 32))$$,
  'P0001', 'ja e membro', 'observador ativo recebe ja e membro'
);

-- Estados do convite, na ordem do catálogo, inclusive para quem já é membro.
select throws_ok($$select public.aceitar_convite(repeat('b1', 32))$$, 'P0001', 'convite revogado', 'convite revogado');
select throws_ok($$select public.aceitar_convite(repeat('b2', 32))$$, 'P0001', 'convite usado', 'convite aceito');
select throws_ok(
  $$select public.aceitar_convite(repeat('b3', 32))$$, 'P0001', 'convite vencido',
  'convite pendente vencido vem antes de ja e membro'
);
select throws_ok(
  $$select public.aceitar_convite(repeat('b4', 32))$$, 'P0001', 'convite vencido',
  'validade do vínculo já passada: convite vencido (D17)'
);
select throws_ok($$select public.aceitar_convite(repeat('b5', 32))$$, 'P0001', 'convite revogado', 'revogado e vencido dá revogado');
select throws_ok($$select public.aceitar_convite(repeat('b6', 32))$$, 'P0001', 'convite usado', 'aceito e vencido dá usado');

-- Identidade e formato do código.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok($$select public.aceitar_convite(repeat('a1', 31))$$, 'P0001', 'convite invalido', 'código curto demais');
select throws_ok(
  $$select public.aceitar_convite(repeat('a1', 31) || 'a')$$,
  'P0001', 'convite invalido', 'código com exatamente 63 caracteres hexadecimais'
);
select throws_ok(
  $$select public.aceitar_convite(repeat('a1', 32) || 'a')$$,
  'P0001', 'convite invalido', 'código com exatamente 65 caracteres hexadecimais'
);
select throws_ok($$select public.aceitar_convite(repeat('a1', 33))$$, 'P0001', 'convite invalido', 'código longo demais');
select throws_ok($$select public.aceitar_convite(repeat('g1', 32))$$, 'P0001', 'convite invalido', 'código fora do hexadecimal');
select throws_ok($$select public.aceitar_convite('')$$, 'P0001', 'convite invalido', 'código vazio');
select throws_ok($$select public.aceitar_convite(repeat('f0', 32))$$, 'P0001', 'convite invalido', 'código de nenhum convite');
select throws_ok($$select public.aceitar_convite(null)$$, 'P0001', 'parametro obrigatorio', 'código nulo');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d1', 32))$$, 'P0001', 'conta inexistente', 'conta sem linha em contas'
);
select throws_ok(
  $$select public.aceitar_convite(repeat('g1', 32))$$, 'P0001', 'conta inexistente',
  'conta inexistente vem antes de convite invalido'
);
select throws_ok(
  $$select public.aceitar_convite(null)$$, 'P0001', 'parametro obrigatorio',
  'parametro obrigatorio vem antes de conta inexistente'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select public.aceitar_convite(repeat('d1', 32))$$, '42501', null, 'anon não executa aceitar_convite');

reset role;

select is(
  (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c) || '/'
  || (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v),
  current_setting('teste.antes'),
  'as chamadas recusadas não mudaram convites nem vínculos (inclusive a época)'
);

-- Convite vencido pela validade do vínculo continua pendente e não cria vínculo.
select is(
  (select c.estado::text from public.convites c where c.id = 'c0000000-0000-4000-8000-0000000000b4'),
  'pendente',
  'o convite recusado por validade vencida não foi consumido'
);

-- Conversões de erro por falha simulada (C3). Nada fica gravado.
create schema teste_falhas;

create function teste_falhas.unica() returns trigger language plpgsql as $$
begin
  raise unique_violation;
end;
$$;

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

-- 23505 no insert de vínculos → ja e membro.
create trigger falha_simulada before insert on public.vinculos
  for each row execute function teste_falhas.unica();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d1', 32))$$,
  'P0001', 'ja e membro', '23505 no insert de vinculos vira ja e membro'
);

reset role;
drop trigger falha_simulada on public.vinculos;

-- 40P01 no insert de vínculos → tente de novo.
create trigger falha_simulada before insert on public.vinculos
  for each row execute function teste_falhas.impasse();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d1', 32))$$,
  'P0001', 'tente de novo', '40P01 no insert de vinculos vira tente de novo'
);

reset role;
drop trigger falha_simulada on public.vinculos;

-- 23502 no insert de vínculos → parametro obrigatorio.
create trigger falha_simulada before insert on public.vinculos
  for each row execute function teste_falhas.nula();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d1', 32))$$,
  'P0001', 'parametro obrigatorio', '23502 no insert de vinculos vira parametro obrigatorio'
);

reset role;
drop trigger falha_simulada on public.vinculos;

-- 23505 no update de vínculos (reingresso) → ja e membro.
create trigger falha_simulada before update on public.vinculos
  for each row execute function teste_falhas.unica();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d2', 32))$$,
  'P0001', 'ja e membro', '23505 no update de vinculos vira ja e membro'
);

reset role;
drop trigger falha_simulada on public.vinculos;

-- 40P01 no update de vínculos (reingresso) → tente de novo.
create trigger falha_simulada before update on public.vinculos
  for each row execute function teste_falhas.impasse();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d2', 32))$$,
  'P0001', 'tente de novo', '40P01 no update de vinculos vira tente de novo'
);

reset role;
drop trigger falha_simulada on public.vinculos;

-- 23505 no update de convites → convite usado.
create trigger falha_simulada before update on public.convites
  for each row execute function teste_falhas.unica();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d1', 32))$$,
  'P0001', 'convite usado', '23505 no update de convites vira convite usado'
);

reset role;
drop trigger falha_simulada on public.convites;

-- 40P01 no update de convites → tente de novo.
create trigger falha_simulada before update on public.convites
  for each row execute function teste_falhas.impasse();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d1', 32))$$,
  'P0001', 'tente de novo', '40P01 no update de convites vira tente de novo'
);

reset role;
drop trigger falha_simulada on public.convites;

-- 23502 no update de convites → parametro obrigatorio.
create trigger falha_simulada before update on public.convites
  for each row execute function teste_falhas.nula();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d1', 32))$$,
  'P0001', 'parametro obrigatorio', '23502 no update de convites vira parametro obrigatorio'
);

reset role;
drop trigger falha_simulada on public.convites;

select is(
  (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c) || '/'
  || (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v),
  current_setting('teste.antes'),
  'as falhas simuladas desfizeram tudo: convites, vínculos e épocas iguais'
);

-- Conferência final da C3 (regra 3) em aceitar_convite: um gatilho depois do insert ou update de vínculos
-- derruba os responsáveis da família, como faria uma chamada simultânea. d1 (13, vínculo novo) e
-- d2 (10, reingresso) são cuidador e observador; a família 1 tem responsável ativo antes (01).
create function pg_temp.foto() returns text language sql as $$
  select (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
      || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c);
$$;

select set_config('teste.foto', pg_temp.foto(), true);

create function teste_falhas.derruba_responsaveis() returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() = 1 then
    update public.vinculos set estado = 'saiu'
     where familia_id = new.familia_id and papel = 'responsavel';
  end if;
  return null;
end;
$$;

create trigger falha_simulada after insert or update on public.vinculos
  for each row execute function teste_falhas.derruba_responsaveis();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d1', 32))$$,
  'P0001', 'ultimo responsavel',
  'a conferência final recusa aceitar_convite (vínculo novo) que deixaria a família sem responsável'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select throws_ok(
  $$select public.aceitar_convite(repeat('d2', 32))$$,
  'P0001', 'ultimo responsavel',
  'a conferência final recusa aceitar_convite (reingresso) que deixaria a família sem responsável'
);

reset role;
drop trigger falha_simulada on public.vinculos;

select is(
  pg_temp.foto(), current_setting('teste.foto'),
  'depois das recusas, os convites seguem pendentes, nenhum vínculo foi criado ou mudado e as épocas estão intactas'
);

-- Controle sem gatilho: a operação normal dá certo (convite d3, convidada 15, família 1 com responsável).
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000015", "role": "authenticated"}';
select is(
  public.aceitar_convite(repeat('d3', 32)),
  'ffffffff-0000-4000-8000-000000000001'::uuid,
  'controle sem gatilho: aceitar_convite dá certo e devolve a família'
);

-- Família montada sem nenhum responsável ativo antes (estado de defesa): a regra só vale quando havia
-- responsável antes, então o aceite de cuidador dá certo.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000016", "role": "authenticated"}';
select is(
  public.aceitar_convite(repeat('f1', 32)),
  'ffffffff-0000-4000-8000-000000000009'::uuid,
  'família sem responsável ativo antes: aceitar_convite de cuidador dá certo'
);

reset role;

select is(
  (select v.estado::text || '|' || v.papel::text || '|' || v.epoca::text
     from public.vinculos v
    where v.familia_id = 'ffffffff-0000-4000-8000-000000000009' and v.conta_id = 'aaaaaaaa-0000-4000-8000-000000000016'),
  'ativo|cuidador|1',
  'o vínculo da família sem responsável foi criado, como cuidador, época 1'
);

select is(
  (select count(*)::int from public.vinculos
    where familia_id = 'ffffffff-0000-4000-8000-000000000009' and papel = 'responsavel' and estado = 'ativo'),
  0,
  'a família segue sem responsável ativo: o aceite não inventou proibição nem promoveu ninguém'
);

select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.aceitar_convite(text)'::regprocedure),
  'public\.familias f where f\.id = v_familia for update(.|\n)*public\.convites c(.|\n)*for update',
  'aceitar_convite trava a família e depois o convite'
);

select * from finish();
rollback;
