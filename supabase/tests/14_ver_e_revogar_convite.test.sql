begin;
create extension if not exists pgtap with schema extensions;

select plan(69);

-- Família 1: 1 e 2 responsáveis ativos, 3 cuidador, 4 observador, 5 responsável revogado,
-- 6 responsável que saiu, 7 responsável com validade vencida. Família 2: 8 responsável.
-- Família 3 (sem bebê): 8 também. 9 existe só em auth.users. 10 tem conta e nenhuma família.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r1@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'r2@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'c3@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'o4@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'rv5@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'sa6@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 've7@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'x8@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000009', 'n9@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000010', 'm10@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R1'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'R2'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'C3'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'O4'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'Rv5'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'Sa6'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'Ve7'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'X8'),
  ('aaaaaaaa-0000-4000-8000-000000000010', 'M10');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000008'),
  ('ffffffff-0000-4000-8000-000000000003', 'Família 3', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000008');

insert into public.vinculos (familia_id, conta_id, papel, estado, valido_ate) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'cuidador', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'observador', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', 'responsavel', 'revogado', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006', 'responsavel', 'saiu', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000007', 'responsavel', 'ativo', now() - interval '1 day'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000008', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000008', 'responsavel', 'ativo', null);

-- Na ordem de criação: Teo, Lia. Arquivado e o bebê da família 2 não aparecem na prévia.
insert into public.bebes (id, familia_id, nome, nascimento, estado, criado_por, criado_em) values
  ('bebe0000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Lia', '2026-08-05', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '1 day'),
  ('bebe0000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'Teo', '2026-07-01', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '2 days'),
  ('bebe0000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'Arquivado', '2025-01-01', 'arquivado',
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '3 days'),
  ('bebe0000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000002', 'Outra família', '2026-01-01', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000008', now());

-- Família 4: dois bebês ativos com o mesmo criado_em; o id menor tem o nome que vem depois no alfabeto
-- e é inserido por último, para provar que a ordem é por id e não por nome nem por inserção.
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000004', 'Família 4', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000008');

insert into public.bebes (id, familia_id, nome, nascimento, estado, criado_por, criado_em) values
  ('bebe0000-0000-4000-8000-0000000000b2', 'ffffffff-0000-4000-8000-000000000004', 'Abe', '2026-03-01', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000008', now() - interval '5 days'),
  ('bebe0000-0000-4000-8000-0000000000b1', 'ffffffff-0000-4000-8000-000000000004', 'Zed', '2026-03-02', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000008', now() - interval '5 days');

-- Código de cada convite: o hexadecimal de dois caracteres da coluna cod repetido 32 vezes.
insert into public.convites (id, familia_id, papel, vinculo_valido_ate, criado_por, codigo_hash,
                             expira_em, estado, aceito_por, aceito_em)
select v.id::uuid, v.familia::uuid, v.papel::public.papel_familia, v.valido::timestamptz,
       'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
       encode(extensions.digest(repeat(v.cod, 32), 'sha256'), 'hex'),
       v.expira::timestamptz, v.estado::public.estado_convite, v.aceito_por::uuid, v.aceito_em::timestamptz
from (values
  -- a1 pendente (observador), a2 pendente com validade de vínculo, a3 revogado, a4 aceito,
  -- a5 pendente vencido, a6 pendente com validade de vínculo já passada, a7 revogado e vencido,
  -- a8 aceito e vencido, a9 pendente na família 3 (sem bebê), b1 pendente na família 2.
  ('c0000000-0000-4000-8000-0000000000a1', 'ffffffff-0000-4000-8000-000000000001', 'observador',
   null::timestamptz, 'a1', now() + interval '3 days', 'pendente', null, null::timestamptz),
  ('c0000000-0000-4000-8000-0000000000a2', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   now() + interval '30 days', 'a2', now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000a3', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   null, 'a3', now() + interval '3 days', 'revogado', null, null),
  ('c0000000-0000-4000-8000-0000000000a4', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   null, 'a4', now() + interval '3 days', 'aceito', 'aaaaaaaa-0000-4000-8000-000000000003', now()),
  ('c0000000-0000-4000-8000-0000000000a5', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   null, 'a5', now() - interval '1 day', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000a6', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   now() - interval '1 hour', 'a6', now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000a7', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   null, 'a7', now() - interval '1 day', 'revogado', null, null),
  ('c0000000-0000-4000-8000-0000000000a8', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   null, 'a8', now() - interval '1 day', 'aceito', 'aaaaaaaa-0000-4000-8000-000000000003', now()),
  ('c0000000-0000-4000-8000-0000000000a9', 'ffffffff-0000-4000-8000-000000000003', 'observador',
   null, 'a9', now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000b1', 'ffffffff-0000-4000-8000-000000000002', 'observador',
   null, 'b1', now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-0000000000d4', 'ffffffff-0000-4000-8000-000000000004', 'observador',
   null, 'd4', now() + interval '3 days', 'pendente', null, null)
) as v(id, familia, papel, valido, cod, expira, estado, aceito_por, aceito_em);

select set_config('teste.antes', (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c), true);

-- Valores esperados, lidos como dono antes de trocar de papel (quem tem conta e nenhuma família não lê convites).
select set_config('teste.expira_a1',
  (select to_char(c.expira_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
     from public.convites c where c.id = 'c0000000-0000-4000-8000-0000000000a1'), true);
select set_config('teste.valido_a2',
  (select to_char(c.vinculo_valido_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
     from public.convites c where c.id = 'c0000000-0000-4000-8000-0000000000a2'), true);
select set_config('teste.hash_a1',
  (select c.codigo_hash from public.convites c where c.id = 'c0000000-0000-4000-8000-0000000000a1'), true);

-- ver_convite, por quem tem conta e nenhuma família.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';

select lives_ok(
  $$select set_config('teste.prev', public.ver_convite(repeat('a1', 32))::text, true)$$,
  'conta sem família vê a prévia de um convite pendente'
);

select is(
  (select array_agg(k order by k) from jsonb_object_keys(current_setting('teste.prev')::jsonb) k),
  array['bebes', 'expira_em', 'familia_nome', 'papel', 'vinculo_valido_ate'],
  'a prévia tem exatamente as cinco chaves'
);

select is(
  current_setting('teste.prev')::jsonb ->> 'familia_nome', 'Família 1', 'a prévia traz o nome da família'
);
select is(current_setting('teste.prev')::jsonb ->> 'papel', 'observador', 'a prévia traz o papel proposto');
select is(
  jsonb_typeof(current_setting('teste.prev')::jsonb -> 'vinculo_valido_ate'),
  'null',
  'sem validade de vínculo, a chave sai como null do JSON'
);
select is(
  current_setting('teste.prev')::jsonb ->> 'expira_em',
  current_setting('teste.expira_a1'),
  'expira_em sai em UTC no formato do JSON'
);
select is(
  current_setting('teste.prev')::jsonb -> 'bebes',
  '["Teo", "Lia"]'::jsonb,
  'bebes lista os nomes dos bebês ativos por criado_em, sem arquivado nem bebê de outra família'
);
select is(
  (select count(*)::int from jsonb_object_keys(current_setting('teste.prev')::jsonb)) = 5
    and current_setting('teste.prev') !~ '(bebe0000|2026-08-05|2026-07-01|R1|R2|C3|O4)',
  true,
  'a prévia não traz ids, datas de nascimento nem nomes de membros'
);

select is(
  public.ver_convite(repeat('a9', 32)) -> 'bebes',
  '[]'::jsonb,
  'família sem bebê devolve bebes vazio'
);

select is(
  public.ver_convite(repeat('d4', 32)) -> 'bebes',
  '["Zed", "Abe"]'::jsonb,
  'bebês ativos com o mesmo criado_em saem em ordem de id'
);

select is(
  (public.ver_convite(repeat('a2', 32)) ->> 'vinculo_valido_ate'),
  current_setting('teste.valido_a2'),
  'a validade do vínculo sai em UTC no formato do JSON'
);

-- Normalização do código.
select is(
  public.ver_convite('  ' || upper(repeat('a1', 32)) || ' '),
  current_setting('teste.prev')::jsonb,
  'espaços nas pontas e maiúsculas são normalizados'
);

select throws_ok($$select public.ver_convite(repeat('a1', 31))$$, 'P0001', 'convite invalido', 'código curto demais');
select throws_ok(
  $$select public.ver_convite(repeat('a1', 31) || 'a')$$,
  'P0001', 'convite invalido', 'código com exatamente 63 caracteres hexadecimais'
);
select throws_ok(
  $$select public.ver_convite(repeat('a1', 32) || 'a')$$,
  'P0001', 'convite invalido', 'código com exatamente 65 caracteres hexadecimais'
);
select throws_ok($$select public.ver_convite(repeat('a1', 33))$$, 'P0001', 'convite invalido', 'código longo demais');
select throws_ok($$select public.ver_convite(repeat('g1', 32))$$, 'P0001', 'convite invalido', 'código fora do hexadecimal');
select throws_ok($$select public.ver_convite('')$$, 'P0001', 'convite invalido', 'código vazio');
select throws_ok(
  $$select public.ver_convite(repeat('a1', 16) || ' ' || repeat('a1', 15) || 'a')$$,
  'P0001', 'convite invalido', 'espaço no meio do código'
);
select throws_ok(
  $$select public.ver_convite(repeat('f0', 32))$$, 'P0001', 'convite invalido', 'código bem formado de nenhum convite'
);
select throws_ok(
  $$select public.ver_convite(current_setting('teste.hash_a1'))$$,
  'P0001', 'convite invalido', 'o hash guardado não funciona como código'
);

-- Estados do convite, na ordem do catálogo.
select throws_ok($$select public.ver_convite(repeat('a3', 32))$$, 'P0001', 'convite revogado', 'convite revogado');
select throws_ok($$select public.ver_convite(repeat('a4', 32))$$, 'P0001', 'convite usado', 'convite aceito');
select throws_ok($$select public.ver_convite(repeat('a5', 32))$$, 'P0001', 'convite vencido', 'convite pendente vencido');
select throws_ok(
  $$select public.ver_convite(repeat('a6', 32))$$, 'P0001', 'convite vencido',
  'convite com validade de vínculo já passada está vencido (D17)'
);
select throws_ok(
  $$select public.ver_convite(repeat('a7', 32))$$, 'P0001', 'convite revogado', 'revogado e vencido dá revogado'
);
select throws_ok(
  $$select public.ver_convite(repeat('a8', 32))$$, 'P0001', 'convite usado', 'aceito e vencido dá usado'
);

-- Parâmetro nulo e conta sem linha.
select throws_ok($$select public.ver_convite(null)$$, 'P0001', 'parametro obrigatorio', 'código nulo');

-- Quem já é membro, ou já foi, também vê a prévia: ver_convite não confere ja e membro.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$select public.ver_convite(repeat('a1', 32))$$, 'responsável da própria família vê a prévia sem erro de membro'
);
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select lives_ok($$select public.ver_convite(repeat('a1', 32))$$, 'observador vê a prévia');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select lives_ok($$select public.ver_convite(repeat('a1', 32))$$, 'ex-membro revogado vê a prévia');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select lives_ok($$select public.ver_convite(repeat('a1', 32))$$, 'conta de outra família vê a prévia');

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';
select throws_ok(
  $$select public.ver_convite(repeat('a1', 32))$$, 'P0001', 'conta inexistente', 'conta sem linha em contas'
);
select throws_ok(
  $$select public.ver_convite(repeat('g1', 32))$$, 'P0001', 'conta inexistente',
  'conta inexistente vem antes de convite invalido'
);
select throws_ok(
  $$select public.ver_convite(null)$$, 'P0001', 'parametro obrigatorio',
  'parametro obrigatorio vem antes de conta inexistente'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select public.ver_convite(repeat('a1', 32))$$, '42501', null, 'anon não executa ver_convite');

reset role;

select is(
  (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c),
  current_setting('teste.antes'),
  'ver_convite não mudou nenhum convite'
);

select doesnt_match(
  (select p.prosrc from pg_proc p where p.oid = 'public.ver_convite(text)'::regprocedure),
  '(for update|insert into|update public|delete from)',
  'ver_convite não trava nem escreve'
);

-- revogar_convite.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a1')$$,
  'responsável ativo revoga convite pendente'
);
select lives_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a5')$$,
  'responsável ativo revoga convite pendente já vencido'
);
select lives_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a6')$$,
  'responsável ativo revoga convite vencido pela validade do vínculo'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a2')$$,
  'outro responsável ativo revoga convite criado por quem já era responsável'
);

reset role;

select is(
  (select array_agg(c.id::text order by c.id)
     from public.convites c where c.estado = 'revogado' and c.familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  array[
    'c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2',
    'c0000000-0000-4000-8000-0000000000a3', 'c0000000-0000-4000-8000-0000000000a5',
    'c0000000-0000-4000-8000-0000000000a6', 'c0000000-0000-4000-8000-0000000000a7'
  ],
  'os quatro convites revogados agora se somam aos dois que já estavam revogados'
);

select is(
  (select count(*)::int from public.convites
    where estado = 'pendente' and id in ('c0000000-0000-4000-8000-0000000000a9', 'c0000000-0000-4000-8000-0000000000b1')),
  2,
  'convites de outras famílias não foram tocados'
);

-- Depois de revogado, o código já não serve para aceitar, e nenhum vínculo é criado.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';

select throws_ok(
  $$select public.aceitar_convite(repeat('a1', 32))$$,
  'P0001', 'convite revogado', 'o convite revogado por revogar_convite não pode ser aceito'
);
select throws_ok(
  $$select public.aceitar_convite(repeat('a5', 32))$$,
  'P0001', 'convite revogado', 'o convite vencido e depois revogado também dá convite revogado no aceite'
);

reset role;

select is(
  (select count(*)::int from public.vinculos where conta_id = 'aaaaaaaa-0000-4000-8000-000000000010'),
  0,
  'o aceite recusado não criou vínculo'
);

select set_config('teste.antes', (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c), true);

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a4')$$,
  'P0001', 'convite nao pendente', 'convite aceito não pode ser revogado'
);
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a3')$$,
  'P0001', 'convite nao pendente', 'convite revogado não pode ser revogado de novo'
);
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a7')$$,
  'P0001', 'convite nao pendente', 'convite revogado e vencido dá convite nao pendente'
);
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a8')$$,
  'P0001', 'convite nao pendente', 'convite aceito e vencido dá convite nao pendente'
);

-- Quem não é responsável ativo da família do convite. O convite fica pendente (a9 e b1) ou como estava.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a4')$$,
  'P0002', 'convite inexistente', 'responsável de outra família não revoga convite alheio (sem visibilidade: P0002)'
);
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000ee')$$,
  'P0002', 'convite inexistente', 'convite inexistente dá o mesmo erro de convite alheio (P0002)'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a4')$$,
  '42501', 'sem permissao', 'cuidador não revoga convite (sem permissao vem antes de convite nao pendente)'
);
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a4')$$,
  '42501', 'sem permissao', 'observador não revoga convite'
);
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a4')$$,
  'P0002', 'convite inexistente', 'responsável revogado não revoga convite (sem visibilidade: P0002)'
);
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a4')$$,
  'P0002', 'convite inexistente', 'responsável que saiu não revoga convite (sem visibilidade: P0002)'
);
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a4')$$,
  'P0002', 'convite inexistente', 'responsável com vínculo vencido não revoga convite (sem visibilidade: P0002)'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a9')$$,
  'P0001', 'conta inexistente', 'conta sem linha em contas'
);
select throws_ok(
  $$select public.revogar_convite(null)$$, 'P0001', 'parametro obrigatorio',
  'convite nulo é recusado antes de conferir a conta'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000a9')$$, '42501', null,
  'anon não executa revogar_convite'
);

reset role;

select is(
  (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c),
  current_setting('teste.antes'),
  'as chamadas recusadas não mudaram nenhum convite'
);

-- Conversões por falha simulada.
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

create trigger falha_simulada before update on public.convites
  for each row execute function teste_falhas.impasse();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000b1')$$,
  'P0001', 'tente de novo', '40P01 vira tente de novo em revogar_convite'
);

reset role;
drop trigger falha_simulada on public.convites;
create trigger falha_simulada before update on public.convites
  for each row execute function teste_falhas.nula();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000b1')$$,
  'P0001', 'parametro obrigatorio', '23502 vira parametro obrigatorio em revogar_convite'
);

reset role;
drop trigger falha_simulada on public.convites;

select is(
  (select estado::text from public.convites where id = 'c0000000-0000-4000-8000-0000000000b1'),
  'pendente',
  'as falhas simuladas deixaram o convite pendente'
);

-- Conferência final da C3 (regra 3) em revogar_convite: um gatilho depois do update derruba os
-- responsáveis da família 2 (X8, o único), como faria uma chamada simultânea.
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

create trigger falha_simulada after update on public.convites
  for each row execute function teste_falhas.derruba_responsaveis();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000b1')$$,
  'P0001', 'ultimo responsavel',
  'a conferência final recusa revogar_convite que deixaria a família sem responsável'
);

reset role;
drop trigger falha_simulada on public.convites;

select is(
  pg_temp.foto(), current_setting('teste.foto'),
  'depois da recusa, o convite segue pendente e vínculos e épocas estão intactos'
);

-- Controle sem gatilho: um convite pendente novo é revogado normalmente pelo responsável 01.
insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em)
values ('c0000000-0000-4000-8000-0000000000c1', 'ffffffff-0000-4000-8000-000000000001', 'observador',
        'aaaaaaaa-0000-4000-8000-000000000001', 'hash-controle', now() + interval '3 days');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000c1')$$,
  'controle sem gatilho: revogar_convite dá certo e a família segue com responsável'
);

reset role;

select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.revogar_convite(uuid)'::regprocedure),
  'public\.familias f where f\.id = v_familia for update(.|\n)*public\.convites c(.|\n)*for update',
  'revogar_convite trava a família e depois o convite'
);

select * from finish();
rollback;
