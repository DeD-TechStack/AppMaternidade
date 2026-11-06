begin;
create extension if not exists pgtap with schema extensions;

select plan(102);

-- MAT-45, adendo R-B, R3: a ordem de conferência é parâmetro obrigatório, existência e visibilidade,
-- permissão de escrita e só então as regras de valor. Quem não vê o objeto, ou o vê sem o papel de
-- escrita, recebe o mesmo erro com valor válido e com valor inválido; nada de valor vaza antes.
--
-- Decisão do líder (RB-R3): objeto inexistente, ou numa família em que o chamador não tem vínculo ativo,
-- responde P0002 (familia inexistente, convite inexistente ou vinculo inexistente); objeto visível sem o
-- papel exigido responde 42501 sem permissao; regra de valor só depois dos dois.
--
-- Contas: 01 responsável da família 1 (o único ativo), 02 cuidador, 03 observador, 06 responsável revogado,
-- 10 responsável que saiu e 11 responsável com validade vencida (todos da família 1).
-- 04 responsável da família 2 (alheio). 05 tem conta e nenhuma família.
-- 07 existe só em auth.users (sem linha em contas). 09 é um id sem usuário nenhum.
create function pg_temp.afetadas(consulta text) returns int
language plpgsql as $$
declare n int;
begin
  execute consulta;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Roda a consulta que deve falhar e devolve 'sqlstate:mensagem' ('ok' se não falhou).
create function pg_temp.erro(consulta text) returns text
language plpgsql as $$
begin
  execute consulta;
  return 'ok';
exception when others then
  return sqlstate || ':' || sqlerrm;
end;
$$;

insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || n || '@exemplo.invalid'
from unnest(array[1, 2, 3, 4, 5, 6, 7, 10, 11]) as n;

insert into public.contas (id, nome_privado)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'U' || n
from unnest(array[1, 2, 3, 4, 5, 6, 10, 11]) as n;

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000004');

insert into public.vinculos (id, familia_id, conta_id, papel, estado) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo'),
  ('bb000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador', 'ativo'),
  ('bb000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador', 'ativo'),
  ('bb000000-0000-4000-8000-000000000006', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006', 'responsavel', 'revogado'),
  ('bb000000-0000-4000-8000-000000000010', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000010', 'responsavel', 'saiu'),
  ('bb000000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000004', 'responsavel', 'ativo');

-- 11 é responsável ativo, mas com a validade do vínculo já vencida.
insert into public.vinculos (id, familia_id, conta_id, papel, estado, valido_ate) values
  ('bb000000-0000-4000-8000-000000000011', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000011',
   'responsavel', 'ativo', now() - interval '1 day');

insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bebe0000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01',
   'aaaaaaaa-0000-4000-8000-000000000001');

-- c01 pendente, c02 aceito e c03 revogado, todos da família 1.
insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em, estado, aceito_por, aceito_em) values
  ('c0000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000001', 'hash-1', now() + interval '3 days', 'pendente', null, null),
  ('c0000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000001', 'hash-2', now() + interval '3 days', 'aceito',
   'aaaaaaaa-0000-4000-8000-000000000003', now()),
  ('c0000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000001', 'hash-3', now() + interval '3 days', 'revogado', null, null);

create function pg_temp.foto() returns text language sql as $$
  select (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
      || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c);
$$;

select set_config('teste.foto', pg_temp.foto(), true);

-- A) gatilho validar_nascimento: com sessão, só quem é responsável ativo da família chega à regra de valor.
-- Insert direto de bebê: os WITH CHECK da RLS rodam depois dos gatilhos BEFORE.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Alheio válido',
            ((now() at time zone 'America/Sao_Paulo')::date), 'aaaaaaaa-0000-4000-8000-000000000004')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'família alheia, nascimento válido: a RLS nega'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Alheio futuro',
            ((now() at time zone 'America/Sao_Paulo')::date + 1), 'aaaaaaaa-0000-4000-8000-000000000004')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'família alheia, nascimento no futuro: o mesmo erro, sem validar o valor'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-0000000000ee', 'Fantasma válido', current_date, 'aaaaaaaa-0000-4000-8000-000000000004')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'família inexistente, nascimento válido: a RLS nega'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-0000000000ee', 'Fantasma futuro', current_date + 30, 'aaaaaaaa-0000-4000-8000-000000000004')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'família inexistente, nascimento no futuro: o mesmo erro, sem validar o valor'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Sem família válido',
            ((now() at time zone 'America/Sao_Paulo')::date), 'aaaaaaaa-0000-4000-8000-000000000005')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'conta sem família, nascimento válido: a RLS nega'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Sem família futuro',
            ((now() at time zone 'America/Sao_Paulo')::date + 1), 'aaaaaaaa-0000-4000-8000-000000000005')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'conta sem família, nascimento no futuro: o mesmo erro'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Cuidador válido',
            ((now() at time zone 'America/Sao_Paulo')::date), 'aaaaaaaa-0000-4000-8000-000000000002')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'cuidador (vê a família, sem papel de escrita), nascimento válido: a RLS nega'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Cuidador futuro',
            ((now() at time zone 'America/Sao_Paulo')::date + 1), 'aaaaaaaa-0000-4000-8000-000000000002')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'cuidador, nascimento no futuro: o mesmo erro, sem validar o valor'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Observador válido',
            ((now() at time zone 'America/Sao_Paulo')::date), 'aaaaaaaa-0000-4000-8000-000000000003')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'observador, nascimento válido: a RLS nega'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Observador futuro',
            ((now() at time zone 'America/Sao_Paulo')::date + 1), 'aaaaaaaa-0000-4000-8000-000000000003')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'observador, nascimento no futuro: o mesmo erro, sem validar o valor'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Revogado futuro',
            ((now() at time zone 'America/Sao_Paulo')::date + 1), 'aaaaaaaa-0000-4000-8000-000000000006')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'responsável revogado, nascimento no futuro: o mesmo erro'
);

-- Controle: o responsável ativo segue validado e segue gravando.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Responsável futuro',
            ((now() at time zone 'America/Sao_Paulo')::date + 1), 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '23514', 'nascimento no futuro',
  'responsável ativo com nascimento no futuro continua recebendo nascimento no futuro'
);
select lives_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Responsável válido',
            ((now() at time zone 'America/Sao_Paulo')::date), 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  'responsável ativo com nascimento válido grava'
);

-- A política bebes_insert exige o papel E criado_por = auth.uid(). Quem tem o papel mas não passa na
-- segunda metade também recebe o 42501 da RLS, com qualquer nascimento: a regra de valor vem depois.
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Autoria alheia válido',
            ((now() at time zone 'America/Sao_Paulo')::date), 'aaaaaaaa-0000-4000-8000-000000000002')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'responsável com criado_por de outra conta da família, nascimento válido: a RLS nega'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Autoria alheia futuro',
            ((now() at time zone 'America/Sao_Paulo')::date + 1), 'aaaaaaaa-0000-4000-8000-000000000002')$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'responsável com criado_por de outra conta da família, nascimento no futuro: o mesmo erro'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Autoria nula válido',
            ((now() at time zone 'America/Sao_Paulo')::date), null)$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'responsável com criado_por nulo, nascimento válido: a RLS nega'
);
select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Autoria nula futuro',
            ((now() at time zone 'America/Sao_Paulo')::date + 1), null)$$,
  '42501', 'new row violates row-level security policy for table "bebes"',
  'responsável com criado_por nulo, nascimento no futuro: o mesmo erro'
);

-- Fora do papel authenticated (dono, service_role) a regra de valor segue valendo, até com um claim de
-- quem não é responsável que sobrou na sessão depois do reset role (as chamadas dos testes 11 e 15 fazem isso).
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
reset role;

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento)
    values ('ffffffff-0000-4000-8000-000000000001', 'Dono com claim futuro', ((now() at time zone 'America/Sao_Paulo')::date + 1))$$,
  '23514', 'nascimento no futuro',
  'dono do banco com claim de quem não é responsável sobrando na sessão: a regra de valor segue valendo'
);

select set_config('request.jwt.claims', '', true);

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento)
    values ('ffffffff-0000-4000-8000-000000000001', 'Dono futuro', ((now() at time zone 'America/Sao_Paulo')::date + 1))$$,
  '23514', 'nascimento no futuro',
  'inserção sem auth.uid() (dono do banco) continua validada'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role": "service_role"}', true);

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento)
    values ('ffffffff-0000-4000-8000-000000000001', 'Service futuro', ((now() at time zone 'America/Sao_Paulo')::date + 1))$$,
  '23514', 'nascimento no futuro',
  'inserção como service_role continua validada'
);

reset role;

-- Update de nascimento: a RLS filtra a linha antes do gatilho, então quem não vê lê 0 linhas, com qualquer valor.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select is(
  pg_temp.afetadas($$update public.bebes set nascimento = ((now() at time zone 'America/Sao_Paulo')::date + 1)
                     where id = 'bebe0000-0000-4000-8000-000000000001'$$),
  0, 'família alheia: update de nascimento futuro lê 0 linhas'
);
select is(
  pg_temp.afetadas($$update public.bebes set nascimento = '2026-02-02' where id = 'bebe0000-0000-4000-8000-000000000001'$$),
  0, 'família alheia: update de nascimento válido lê 0 linhas, igual ao futuro'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  pg_temp.afetadas($$update public.bebes set nascimento = ((now() at time zone 'America/Sao_Paulo')::date + 1)
                     where id = 'bebe0000-0000-4000-8000-000000000001'$$),
  0, 'cuidador: update de nascimento futuro lê 0 linhas, sem erro de valor'
);

-- B) gatilho validar_fuso em contas: o insert de conta com id alheio é negado pela RLS antes do valor.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$insert into public.contas (id, nome_privado, fuso)
    values ('aaaaaaaa-0000-4000-8000-000000000009', 'Em nome de outro', 'Marte/Olympus')$$,
  '42501', 'new row violates row-level security policy for table "contas"',
  'conta com id alheio e fuso inválido: a RLS nega'
);
select throws_ok(
  $$insert into public.contas (id, nome_privado, fuso)
    values ('aaaaaaaa-0000-4000-8000-000000000009', 'Em nome de outro', 'America/Recife')$$,
  '42501', 'new row violates row-level security policy for table "contas"',
  'conta com id alheio e fuso válido: o mesmo erro'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';

select throws_ok(
  $$insert into public.contas (id, nome_privado, fuso)
    values ('aaaaaaaa-0000-4000-8000-000000000007', 'Sete', 'Marte/Olympus')$$,
  '23514', 'fuso invalido',
  'a própria conta com fuso inválido continua recebendo fuso invalido'
);
select lives_ok(
  $$insert into public.contas (id, nome_privado, fuso)
    values ('aaaaaaaa-0000-4000-8000-000000000007', 'Sete', 'America/Recife')$$,
  'a própria conta com fuso válido grava'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select is(
  pg_temp.afetadas($$update public.contas set fuso = 'Marte/Olympus' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$),
  0, 'update de fuso inválido em conta alheia lê 0 linhas'
);
select is(
  pg_temp.afetadas($$update public.contas set fuso = 'America/Recife' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$),
  0, 'update de fuso válido em conta alheia lê 0 linhas, igual ao inválido'
);

-- C) gatilho validar_fuso em famílias: insert direto é negado por privilégio; update é filtrado pela RLS.
select throws_ok(
  $$insert into public.familias (nome, fuso, criada_por)
    values ('Direta inválida', 'Marte/Olympus', 'aaaaaaaa-0000-4000-8000-000000000004')$$,
  '42501', 'permission denied for table familias',
  'insert direto em famílias com fuso inválido: sem privilégio'
);
select throws_ok(
  $$insert into public.familias (nome, fuso, criada_por)
    values ('Direta válida', 'America/Recife', 'aaaaaaaa-0000-4000-8000-000000000004')$$,
  '42501', 'permission denied for table familias',
  'insert direto em famílias com fuso válido: o mesmo erro'
);
select is(
  pg_temp.afetadas($$update public.familias set fuso = 'Marte/Olympus'
                     where id = 'ffffffff-0000-4000-8000-000000000001'$$),
  0, 'família alheia: update de fuso inválido lê 0 linhas'
);
select is(
  pg_temp.afetadas($$update public.familias set fuso = 'America/Recife'
                     where id = 'ffffffff-0000-4000-8000-000000000001'$$),
  0, 'família alheia: update de fuso válido lê 0 linhas, igual ao inválido'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  pg_temp.afetadas($$update public.familias set fuso = 'Marte/Olympus'
                     where id = 'ffffffff-0000-4000-8000-000000000001'$$),
  0, 'cuidador: update de fuso inválido lê 0 linhas'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$update public.familias set fuso = 'Marte/Olympus' where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  '23514', 'fuso invalido',
  'responsável ativo com fuso inválido continua recebendo fuso invalido'
);

-- D) funções da MAT-45, decisão do líder (RB-R3). Em cada uma das 6 funções que agem como membro:
-- 1. id inexistente e família alheia (sem vínculo ativo) respondem P0002, igual; vínculo revogado, que saiu
--    ou vencido também é sem visibilidade (P0002);
-- 2. vínculo ativo sem o papel exigido responde 42501 sem permissao;
-- 3. a regra de valor (papel e validade inválidos, papel igual, vínculo inativo, último responsável) não
--    vaza antes: o valor inválido dá o mesmo erro do valor válido, nos dois grupos;
-- 4. depois dos erros, vínculos e convites seguem iguais.
-- Chamadores: 04 alheio, 05 sem família, 06 revogado, 10 saiu, 11 vencido (sem visibilidade na família 1);
-- 02 cuidador e 03 observador (veem a família sem o papel de responsável).

-- D1) criar_convite
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select is(
  pg_temp.erro($$select public.criar_convite('ffffffff-0000-4000-8000-0000000000ee', 'responsavel', now() + interval '30 days')$$),
  'P0002:familia inexistente', 'criar_convite: família inexistente com valor inválido dá P0002'
);
select is(
  pg_temp.erro($$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'responsavel', now() + interval '30 days')$$),
  'P0002:familia inexistente', 'criar_convite: família alheia com responsavel sem validade dá P0002, igual a inexistente'
);
select is(
  pg_temp.erro($$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$),
  'P0002:familia inexistente', 'criar_convite: família alheia com valor válido dá o mesmo P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '1 hour')$$),
  'P0002:familia inexistente', 'criar_convite: conta sem família com validade menor que o convite dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '1 hour')$$),
  'P0002:familia inexistente', 'criar_convite: responsável revogado com valor inválido dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '1 hour')$$),
  'P0002:familia inexistente', 'criar_convite: responsável que saiu com valor inválido dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '1 hour')$$),
  'P0002:familia inexistente', 'criar_convite: responsável com vínculo vencido e valor inválido dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'responsavel', now() + interval '30 days')$$),
  '42501:sem permissao', 'criar_convite: cuidador com responsavel sem validade dá 42501, não o erro de valor'
);
select is(
  pg_temp.erro($$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$),
  '42501:sem permissao', 'criar_convite: cuidador com valor válido dá o mesmo 42501'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '1 hour')$$),
  '42501:sem permissao', 'criar_convite: observador com validade menor que o convite dá 42501'
);

reset role;
select is(pg_temp.foto(), current_setting('teste.foto'), 'criar_convite: as chamadas negadas não criaram convite nem mudaram vínculo');
set local role authenticated;

-- D2) revogar_convite (c01 pendente, c02 aceito, c03 revogado, todos da família 1)
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select is(
  pg_temp.erro($$select public.revogar_convite('c0000000-0000-4000-8000-0000000000ee')$$),
  'P0002:convite inexistente', 'revogar_convite: convite inexistente dá P0002'
);
select is(
  pg_temp.erro($$select public.revogar_convite('c0000000-0000-4000-8000-000000000002')$$),
  'P0002:convite inexistente', 'revogar_convite: convite alheio já aceito dá P0002, não convite nao pendente'
);
select is(
  pg_temp.erro($$select public.revogar_convite('c0000000-0000-4000-8000-000000000001')$$),
  'P0002:convite inexistente', 'revogar_convite: convite alheio pendente dá o mesmo P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_convite('c0000000-0000-4000-8000-000000000002')$$),
  'P0002:convite inexistente', 'revogar_convite: conta sem família dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_convite('c0000000-0000-4000-8000-000000000002')$$),
  'P0002:convite inexistente', 'revogar_convite: responsável revogado dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_convite('c0000000-0000-4000-8000-000000000002')$$),
  'P0002:convite inexistente', 'revogar_convite: responsável que saiu dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_convite('c0000000-0000-4000-8000-000000000002')$$),
  'P0002:convite inexistente', 'revogar_convite: responsável com vínculo vencido dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_convite('c0000000-0000-4000-8000-000000000002')$$),
  '42501:sem permissao', 'revogar_convite: cuidador com convite já aceito dá 42501, não convite nao pendente'
);
select is(
  pg_temp.erro($$select public.revogar_convite('c0000000-0000-4000-8000-000000000001')$$),
  '42501:sem permissao', 'revogar_convite: cuidador com convite pendente dá o mesmo 42501'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_convite('c0000000-0000-4000-8000-000000000003')$$),
  '42501:sem permissao', 'revogar_convite: observador com convite já revogado dá 42501'
);

reset role;
select is(pg_temp.foto(), current_setting('teste.foto'), 'revogar_convite: as chamadas negadas não mudaram o convite alvo');
set local role authenticated;

-- D3) mudar_papel (vínculos: 01 responsável único, 02 cuidador, 03 observador, 06 revogado)
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-0000000000ee', 'cuidador')$$),
  'P0002:vinculo inexistente', 'mudar_papel: vínculo inexistente dá P0002'
);
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'cuidador')$$),
  'P0002:vinculo inexistente', 'mudar_papel: vínculo alheio com papel igual dá P0002, não papel igual'
);
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'observador')$$),
  'P0002:vinculo inexistente', 'mudar_papel: vínculo alheio com papel válido dá o mesmo P0002'
);
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000006', 'cuidador')$$),
  'P0002:vinculo inexistente', 'mudar_papel: vínculo alheio inativo dá P0002, não vinculo inativo'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'cuidador')$$),
  'P0002:vinculo inexistente', 'mudar_papel: conta sem família com papel igual dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'cuidador')$$),
  'P0002:vinculo inexistente', 'mudar_papel: responsável revogado dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'cuidador')$$),
  'P0002:vinculo inexistente', 'mudar_papel: responsável que saiu dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'cuidador')$$),
  'P0002:vinculo inexistente', 'mudar_papel: responsável com vínculo vencido dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'cuidador')$$),
  '42501:sem permissao', 'mudar_papel: cuidador com papel igual dá 42501, não papel igual'
);
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000001', 'cuidador')$$),
  '42501:sem permissao', 'mudar_papel: cuidador rebaixando o único responsável dá 42501, não ultimo responsavel'
);
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000003', 'cuidador')$$),
  '42501:sem permissao', 'mudar_papel: cuidador com papel válido dá o mesmo 42501'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.mudar_papel('bb000000-0000-4000-8000-000000000006', 'cuidador')$$),
  '42501:sem permissao', 'mudar_papel: observador com vínculo alvo inativo dá 42501, não vinculo inativo'
);

reset role;
select is(pg_temp.foto(), current_setting('teste.foto'), 'mudar_papel: as chamadas negadas não mudaram vínculo nem época');
set local role authenticated;

-- D4) revogar_vinculo
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-0000000000ee')$$),
  'P0002:vinculo inexistente', 'revogar_vinculo: vínculo inexistente dá P0002'
);
select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000006')$$),
  'P0002:vinculo inexistente', 'revogar_vinculo: vínculo alheio inativo dá P0002, não vinculo inativo'
);
select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000002')$$),
  'P0002:vinculo inexistente', 'revogar_vinculo: vínculo alheio ativo dá o mesmo P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000003')$$),
  'P0002:vinculo inexistente', 'revogar_vinculo: conta sem família dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000002')$$),
  'P0002:vinculo inexistente', 'revogar_vinculo: responsável revogado dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000002')$$),
  'P0002:vinculo inexistente', 'revogar_vinculo: responsável que saiu dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000002')$$),
  'P0002:vinculo inexistente', 'revogar_vinculo: responsável com vínculo vencido dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000002')$$),
  '42501:sem permissao', 'revogar_vinculo: cuidador revogando o próprio vínculo dá 42501, não use sair da familia'
);
select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000001')$$),
  '42501:sem permissao', 'revogar_vinculo: cuidador revogando o único responsável dá 42501'
);
select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000006')$$),
  '42501:sem permissao', 'revogar_vinculo: cuidador com vínculo alvo inativo dá 42501, não vinculo inativo'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000001')$$),
  '42501:sem permissao', 'revogar_vinculo: observador revogando o único responsável dá 42501'
);

reset role;
select is(pg_temp.foto(), current_setting('teste.foto'), 'revogar_vinculo: as chamadas negadas não mudaram vínculo nem época');
set local role authenticated;

-- D5) sair_da_familia: qualquer papel com vínculo ativo sai, então só há P0002 para quem não tem vínculo ativo.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select is(
  pg_temp.erro($$select public.sair_da_familia('ffffffff-0000-4000-8000-0000000000ee')$$),
  'P0002:familia inexistente', 'sair_da_familia: família inexistente dá P0002'
);
select is(
  pg_temp.erro($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0002:familia inexistente', 'sair_da_familia: família alheia dá o mesmo P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0002:familia inexistente', 'sair_da_familia: conta sem família dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0002:familia inexistente', 'sair_da_familia: responsável revogado dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0002:familia inexistente', 'sair_da_familia: responsável que já saiu dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0002:familia inexistente', 'sair_da_familia: responsável com vínculo vencido dá P0002'
);

-- Com visibilidade, a regra de valor (último responsável) vem depois e continua valendo.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0001:ultimo responsavel', 'sair_da_familia: o único responsável ativo recebe ultimo responsavel, depois da visibilidade'
);

reset role;
select is(pg_temp.foto(), current_setting('teste.foto'), 'sair_da_familia: as chamadas negadas não mudaram vínculo nem época');
set local role authenticated;

-- D6) excluir_familia
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select is(
  pg_temp.erro($$select public.excluir_familia('ffffffff-0000-4000-8000-0000000000ee')$$),
  'P0002:familia inexistente', 'excluir_familia: família inexistente dá P0002'
);
select is(
  pg_temp.erro($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0002:familia inexistente', 'excluir_familia: família alheia dá o mesmo P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0002:familia inexistente', 'excluir_familia: conta sem família dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0002:familia inexistente', 'excluir_familia: responsável revogado dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0002:familia inexistente', 'excluir_familia: responsável que saiu dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$),
  'P0002:familia inexistente', 'excluir_familia: responsável com vínculo vencido dá P0002'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$),
  '42501:sem permissao', 'excluir_familia: cuidador dá 42501 sem permissao'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select is(
  pg_temp.erro($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$),
  '42501:sem permissao', 'excluir_familia: observador dá 42501 sem permissao'
);

reset role;
select is(
  (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'), 1,
  'excluir_familia: a família segue existindo depois das chamadas negadas'
);

-- Nada do que foi negado mudou o banco.
select is(pg_temp.foto(), current_setting('teste.foto'), 'as chamadas negadas não mudaram vínculos nem convites');
select is(
  (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-000000000001'), 2,
  'só o bebê do fixture e o do responsável ativo existem na família 1'
);
select is(
  (select count(*)::int from public.contas where id in ('aaaaaaaa-0000-4000-8000-000000000009')), 0,
  'a conta em nome de outro não foi gravada'
);

select * from finish();
rollback;
