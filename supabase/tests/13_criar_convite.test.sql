begin;
create extension if not exists pgtap with schema extensions;

select plan(55);

-- Família 1: 1 e 2 responsáveis ativos, 3 cuidador, 4 observador, 5 responsável revogado,
-- 6 responsável que saiu, 7 responsável com validade vencida. Família 2: 8 responsável.
-- 9 existe só em auth.users, sem linha em contas.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r1@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'r2@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'c3@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'o4@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'rv5@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'sa6@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 've7@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'x8@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000009', 'n9@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R1'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'R2'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'C3'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'O4'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'Rv5'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 'Sa6'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 'Ve7'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 'X8');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000008');

insert into public.vinculos (familia_id, conta_id, papel, estado, valido_ate) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'cuidador', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'observador', 'ativo', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', 'responsavel', 'revogado', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006', 'responsavel', 'saiu', null),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000007', 'responsavel', 'ativo', now() - interval '1 day'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000008', 'responsavel', 'ativo', null);

-- Responsável ativo cria convites.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$select set_config('teste.conv1',
      public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')::text, true)$$,
  'responsável ativo cria convite sem validade de vínculo'
);

select is(
  (select array_agg(k order by k) from jsonb_object_keys(current_setting('teste.conv1')::jsonb) k),
  array['codigo', 'expira_em', 'id'],
  'o resultado tem exatamente as chaves id, codigo e expira_em'
);

select matches(
  current_setting('teste.conv1')::jsonb ->> 'codigo',
  '^[0-9a-f]{64}$',
  'o código tem 64 caracteres hexadecimais minúsculos'
);

select is(
  current_setting('teste.conv1')::jsonb ->> 'expira_em',
  to_char((now() + interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'expira_em é daqui a 7 dias, em UTC, no formato do JSON'
);

reset role;

select is(
  (select row(c.familia_id, c.papel, c.estado, c.criado_por, c.vinculo_valido_ate, c.expira_em,
              c.aceito_por, c.aceito_em)::text
     from public.convites c
    where c.id = (current_setting('teste.conv1')::jsonb ->> 'id')::uuid),
  row('ffffffff-0000-4000-8000-000000000001'::uuid, 'observador'::public.papel_familia,
      'pendente'::public.estado_convite, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
      null::timestamptz, now() + interval '7 days', null::uuid, null::timestamptz)::text,
  'o convite gravado é pendente, da família e do criador certos, sem validade e sem aceite'
);

select is(
  (select c.codigo_hash from public.convites c
    where c.id = (current_setting('teste.conv1')::jsonb ->> 'id')::uuid),
  encode(extensions.digest(current_setting('teste.conv1')::jsonb ->> 'codigo', 'sha256'), 'hex'),
  'o banco guarda o SHA-256 do código'
);

select is(
  (select count(*)::int from public.convites c
    where c::text like '%' || (current_setting('teste.conv1')::jsonb ->> 'codigo') || '%'),
  0,
  'o código em claro não está em coluna nenhuma'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$select set_config('teste.conv2',
      public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')::text, true)$$,
  'segunda chamada seguida também cria convite'
);

select isnt(
  current_setting('teste.conv2')::jsonb ->> 'codigo',
  current_setting('teste.conv1')::jsonb ->> 'codigo',
  'duas chamadas seguidas geram códigos diferentes'
);

select isnt(
  current_setting('teste.conv2')::jsonb ->> 'id',
  current_setting('teste.conv1')::jsonb ->> 'id',
  'duas chamadas seguidas geram ids diferentes'
);

-- Todo papel proposto, com e sem validade do vínculo.
select lives_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'responsavel')$$,
  'convite de responsável sem validade'
);

select lives_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador')$$,
  'convite de cuidador sem validade'
);

select lives_ok(
  $$select set_config('teste.conv_val',
      public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '30 days')::text, true)$$,
  'convite de cuidador com validade maior que a do convite'
);

select lives_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador',
                                now() + interval '7 days' + interval '1 second')$$,
  'convite de observador com validade um segundo acima do limite'
);

reset role;

select is(
  (select c.vinculo_valido_ate from public.convites c
    where c.id = (current_setting('teste.conv_val')::jsonb ->> 'id')::uuid),
  now() + interval '30 days',
  'a validade do vínculo foi gravada no convite'
);

select is(
  (select count(*)::int from public.convites where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  6,
  'seis convites criados até aqui na família 1'
);

-- Segundo responsável e responsável de outra família.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select lives_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador')$$,
  'outro responsável ativo também cria convite'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';

select lives_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000002', 'observador')$$,
  'responsável da família 2 cria convite na família 2'
);

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  '42501', 'sem permissao',
  'responsável de outra família não cria convite na família 1'
);

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-0000000000ee', 'observador')$$,
  '42501', 'sem permissao',
  'família inexistente dá o mesmo erro de família alheia'
);

-- Papéis sem permissão.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  '42501', 'sem permissao',
  'cuidador não cria convite'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  '42501', 'sem permissao',
  'observador não cria convite'
);

-- Vínculos inativos.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  '42501', 'sem permissao',
  'responsável revogado não cria convite'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  '42501', 'sem permissao',
  'responsável que saiu não cria convite'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  '42501', 'sem permissao',
  'responsável com vínculo vencido não cria convite'
);

-- Conta sem linha em contas e parâmetros nulos.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  'P0001', 'conta inexistente',
  'conta sem linha em contas recebe conta inexistente'
);

select throws_ok(
  $$select public.criar_convite(null, 'observador')$$,
  'P0001', 'parametro obrigatorio',
  'família nula é recusada antes de conferir a conta'
);

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', null)$$,
  'P0001', 'parametro obrigatorio',
  'papel nulo é recusado antes de conferir a conta'
);

select throws_ok(
  $$select public.criar_convite(null, null)$$,
  'P0001', 'parametro obrigatorio',
  'família e papel nulos são recusados'
);

-- Regras de valor e a ordem dos erros.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'responsavel', now() + interval '30 days')$$,
  'P0001', 'responsavel sem validade',
  'convite de responsável com validade futura é recusado'
);

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'responsavel', now() - interval '1 day')$$,
  'P0001', 'responsavel sem validade',
  'convite de responsável com validade no passado dá responsavel sem validade'
);

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'responsavel', now() + interval '1 day')$$,
  'P0001', 'responsavel sem validade',
  'responsavel sem validade vem antes de validade menor que o convite'
);

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '1 hour')$$,
  'P0001', 'validade menor que o convite',
  'validade do vínculo menor que a do convite é recusada'
);

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '7 days')$$,
  'P0001', 'validade menor que o convite',
  'validade igual à do convite também é recusada'
);

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador', now() - interval '1 day')$$,
  'P0001', 'validade menor que o convite',
  'validade no passado é recusada para observador'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'responsavel', now() - interval '1 day')$$,
  '42501', 'sem permissao',
  'sem permissao vem antes de responsavel sem validade'
);

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '1 hour')$$,
  '42501', 'sem permissao',
  'sem permissao vem antes de validade menor que o convite'
);

-- Anônimo.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  '42501', null,
  'anon não executa criar_convite'
);

reset role;

select is(
  (select count(*)::int from public.convites where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  7,
  'as chamadas negadas não criaram convite na família 1'
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

create trigger falha_simulada before insert on public.convites
  for each row execute function teste_falhas.unica();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  'P0001', 'tente de novo',
  '23505 (colisão de hash) vira tente de novo'
);

reset role;
drop trigger falha_simulada on public.convites;
create trigger falha_simulada before insert on public.convites
  for each row execute function teste_falhas.impasse();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  'P0001', 'tente de novo',
  '40P01 (deadlock) vira tente de novo'
);

reset role;
drop trigger falha_simulada on public.convites;
create trigger falha_simulada before insert on public.convites
  for each row execute function teste_falhas.nula();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  'P0001', 'parametro obrigatorio',
  '23502 vira parametro obrigatorio'
);

reset role;
drop trigger falha_simulada on public.convites;

select is(
  (select count(*)::int from public.convites where familia_id = 'ffffffff-0000-4000-8000-000000000001'),
  7,
  'as falhas simuladas não deixaram convite gravado'
);

-- Estrutura da função.
select matches(
  (select p.prosrc from pg_proc p
    where p.oid = 'public.criar_convite(uuid, public.papel_familia, timestamptz)'::regprocedure),
  'public\.familias f where f\.id = criar_convite\.familia for update',
  'criar_convite trava a linha da família com for update'
);

select ok(
  (select p.prosecdef and p.proconfig @> array['search_path=""']
     from pg_proc p
    where p.oid = 'public.criar_convite(uuid, public.papel_familia, timestamptz)'::regprocedure),
  'criar_convite é security definer com search_path vazio'
);

select is(
  (select p.proargnames[1:3]
     from pg_proc p
    where p.oid = 'public.criar_convite(uuid, public.papel_familia, timestamptz)'::regprocedure),
  array['familia', 'papel', 'vinculo_valido_ate'],
  'criar_convite não recebe a conta chamadora por parâmetro'
);

-- Conferência final da C3 (regra 3) em criar_convite: um gatilho depois do insert derruba todos os
-- responsáveis da família do convite, inclusive o chamador, como faria uma chamada simultânea.
-- Família 6: 12 e 13 são responsáveis ativos.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000012', 'r12@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000013', 'r13@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000012', 'R12'),
  ('aaaaaaaa-0000-4000-8000-000000000013', 'R13');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000006', 'Família 6', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000012');

insert into public.vinculos (id, familia_id, conta_id, papel) values
  ('bb000000-0000-4000-8000-000000000012', 'ffffffff-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000012', 'responsavel'),
  ('bb000000-0000-4000-8000-000000000013', 'ffffffff-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000013', 'responsavel');

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

create trigger falha_simulada after insert on public.convites
  for each row execute function teste_falhas.derruba_responsaveis();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000012", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000006', 'cuidador')$$,
  'P0001', 'ultimo responsavel',
  'a conferência final recusa criar_convite que deixaria a família sem responsável'
);

reset role;
drop trigger falha_simulada on public.convites;

select is(
  pg_temp.foto(), current_setting('teste.foto'),
  'depois da recusa, nenhum convite foi gravado e vínculos e épocas estão intactos'
);

-- Controle sem gatilho: a operação normal dá certo na família 6 e na família 1.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador')$$,
  'controle sem gatilho: criar_convite dá certo e a família segue com responsável'
);

reset role;

-- Reconferência depois da trava (C3): A e B são responsáveis ativos da família 5; na mesma transação,
-- A rebaixa B e B já não cria convite. Vale para os dois papéis de destino.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000010', 'a10@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'b11@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000010', 'A10'),
  ('aaaaaaaa-0000-4000-8000-000000000011', 'B11');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000005', 'Família 5', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000010');

insert into public.vinculos (id, familia_id, conta_id, papel) values
  ('bb000000-0000-4000-8000-000000000010', 'ffffffff-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000010', 'responsavel'),
  ('bb000000-0000-4000-8000-000000000011', 'ffffffff-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000011', 'responsavel');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';

select lives_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000011', 'cuidador')$$,
  'A rebaixa B a cuidador'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000005', 'observador')$$,
  '42501', 'sem permissao',
  'B, rebaixado a cuidador na mesma transação, já não cria convite'
);

reset role;

select is(
  (select count(*)::int from public.convites where familia_id = 'ffffffff-0000-4000-8000-000000000005'),
  0,
  'nenhum convite foi gravado depois do rebaixamento a cuidador'
);

-- Segundo caso: B volta a responsável (ajuste do dono da tabela) e A o rebaixa a observador.
update public.vinculos set papel = 'responsavel' where id = 'bb000000-0000-4000-8000-000000000011';

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';

select lives_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000011', 'observador')$$,
  'A rebaixa B a observador'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000005', 'observador')$$,
  '42501', 'sem permissao',
  'B, rebaixado a observador na mesma transação, já não cria convite'
);

reset role;

select is(
  (select count(*)::int from public.convites where familia_id = 'ffffffff-0000-4000-8000-000000000005'),
  0,
  'nenhum convite foi gravado depois do rebaixamento a observador'
);

select * from finish();
rollback;
