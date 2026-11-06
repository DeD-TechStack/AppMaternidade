begin;
create extension if not exists pgtap with schema extensions;

select plan(53);

-- MAT-45, adendo R-B, R3: a ordem de conferência é parâmetro obrigatório, existência e visibilidade,
-- permissão de escrita e só então as regras de valor. Quem não vê o objeto, ou o vê sem o papel de
-- escrita, recebe o mesmo erro com valor válido e com valor inválido; nada de valor vaza antes.
--
-- Contas: 01 responsável da família 1, 02 cuidador, 03 observador, 06 responsável revogado.
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

insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || n || '@exemplo.invalid'
from generate_series(1, 7) as n;

insert into public.contas (id, nome_privado)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'U' || n
from generate_series(1, 6) as n;

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000004');

insert into public.vinculos (id, familia_id, conta_id, papel, estado) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo'),
  ('bb000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador', 'ativo'),
  ('bb000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador', 'ativo'),
  ('bb000000-0000-4000-8000-000000000006', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006', 'responsavel', 'revogado'),
  ('bb000000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000004', 'responsavel', 'ativo');

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

-- D) funções da MAT-45: o valor só é conferido depois da visibilidade e da permissão.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'responsavel', now() + interval '30 days')$$,
  '42501', 'sem permissao', 'criar_convite: família alheia com responsavel sem validade dá sem permissao'
);
select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-0000000000ee', 'cuidador', now() + interval '1 hour')$$,
  '42501', 'sem permissao', 'criar_convite: família inexistente com validade menor que o convite dá sem permissao'
);
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-000000000002')$$,
  '42501', 'sem permissao', 'revogar_convite: convite alheio já aceito dá sem permissao, não convite nao pendente'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'cuidador')$$,
  '42501', 'sem permissao', 'mudar_papel: vínculo alheio com papel igual dá sem permissao'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000006', 'cuidador')$$,
  '42501', 'sem permissao', 'mudar_papel: vínculo alheio inativo dá sem permissao, não vinculo inativo'
);
select throws_ok(
  $$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000006')$$,
  '42501', 'sem permissao', 'revogar_vinculo: vínculo alheio inativo dá sem permissao, não vinculo inativo'
);
select throws_ok(
  $$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  '42501', 'sem permissao', 'sair_da_familia: família alheia dá sem permissao'
);
select throws_ok(
  $$select public.sair_da_familia('ffffffff-0000-4000-8000-0000000000ee')$$,
  '42501', 'sem permissao', 'sair_da_familia: família inexistente dá o mesmo erro'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '1 hour')$$,
  '42501', 'sem permissao', 'criar_convite: conta sem família com validade inválida dá sem permissao'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'cuidador')$$,
  '42501', 'sem permissao', 'mudar_papel: conta sem família com papel igual dá sem permissao'
);
select throws_ok(
  $$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000003')$$,
  '42501', 'sem permissao', 'revogar_vinculo: conta sem família dá sem permissao'
);

-- Quem enxerga mas não tem o papel recebe 42501, também diante de regra de valor.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-000000000003')$$,
  '42501', 'sem permissao', 'revogar_convite: cuidador com convite já revogado dá sem permissao'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000001', 'cuidador')$$,
  '42501', 'sem permissao', 'mudar_papel: cuidador rebaixando o único responsável dá sem permissao, não ultimo responsavel'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000001')$$,
  '42501', 'sem permissao', 'revogar_vinculo: observador revogando o único responsável dá sem permissao'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';

select throws_ok(
  $$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  '42501', 'sem permissao', 'sair_da_familia: responsável revogado dá sem permissao'
);

reset role;

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
