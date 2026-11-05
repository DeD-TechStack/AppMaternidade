begin;
create extension if not exists pgtap with schema extensions;

select plan(46);

-- 1 (...01) responsável da família 1. 2 (...02) só concedeu um papel e criou um bebê, sem vínculo.
-- 3 (...03) cuidador, com o papel concedido por 2. 4 e 5 existem só em auth.users.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r1@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'g2@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'c3@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'u4@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'u5@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R1'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'G2'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'C3');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');

insert into public.vinculos (id, familia_id, conta_id, papel, concedido_por) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', null),
  ('bb000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'cuidador', 'aaaaaaaa-0000-4000-8000-000000000002');

insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bebe0000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000002');

-- Campos novos.
select has_column('public', 'vinculos', 'concedido_por', 'vinculos tem concedido_por');
select col_is_null('public', 'vinculos', 'concedido_por', 'concedido_por aceita nulo');
select has_column('public', 'vinculos', 'encerrado_em', 'vinculos tem encerrado_em');
select col_is_null('public', 'vinculos', 'encerrado_em', 'encerrado_em aceita nulo');
select col_is_null('public', 'bebes', 'criado_por', 'bebes.criado_por aceita nulo');

select is(
  (select c.confdeltype::text
     from pg_constraint c
     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.vinculos'::regclass and c.contype = 'f' and a.attname = 'concedido_por'),
  'n',
  'vinculos.concedido_por aponta para contas com on delete set null'
);

select is(
  (select c.confdeltype::text
     from pg_constraint c
     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.bebes'::regclass and c.contype = 'f' and a.attname = 'criado_por'),
  'n',
  'bebes.criado_por aponta para contas com on delete set null'
);

select is(
  (select concedido_por is null and encerrado_em is null
     from public.vinculos where id = 'bb000000-0000-4000-8000-000000000001'),
  true,
  'vínculo criado sem os campos novos fica com os dois nulos'
);

select lives_ok(
  $$delete from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000002'$$,
  'apagar a conta que concedeu o papel e criou o bebê não falha'
);

select is(
  (select concedido_por is null and papel = 'cuidador' and estado = 'ativo' and epoca = 1
     from public.vinculos where id = 'bb000000-0000-4000-8000-000000000003'),
  true,
  'concedido_por vira nulo e o resto do vínculo fica intacto'
);

select is(
  (select criado_por is null and nome = 'Bebê 1'
     from public.bebes where id = 'bebe0000-0000-4000-8000-000000000001'),
  true,
  'criado_por do bebê vira nulo e o bebê continua'
);

-- Fuso em contas.
select throws_ok(
  $$insert into public.contas (id, nome_privado, fuso)
    values ('aaaaaaaa-0000-4000-8000-000000000004', 'U4', 'Marte/Olympus')$$,
  '23514', 'fuso invalido',
  'conta com fuso fora de pg_timezone_names é recusada no insert'
);

select is(
  (select count(*)::int from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000004'),
  0,
  'a conta recusada não foi gravada'
);

select lives_ok(
  $$insert into public.contas (id, nome_privado, fuso)
    values ('aaaaaaaa-0000-4000-8000-000000000005', 'U5', 'America/Recife')$$,
  'conta com fuso válido é aceita no insert'
);

select throws_ok(
  $$update public.contas set fuso = 'Marte/Olympus' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '23514', 'fuso invalido',
  'conta com fuso fora de pg_timezone_names é recusada no update'
);

select is(
  (select fuso from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'America/Sao_Paulo',
  'o fuso da conta segue intacto depois do update recusado'
);

select lives_ok(
  $$update public.contas set fuso = 'Europe/Lisbon' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  'fuso válido é aceito no update da conta'
);

-- Fuso em famílias.
select throws_ok(
  $$insert into public.familias (nome, fuso, criada_por)
    values ('Inválida', 'Marte/Olympus', 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '23514', 'fuso invalido',
  'família com fuso inválido é recusada no insert'
);

select throws_ok(
  $$update public.familias set fuso = 'Marte/Olympus' where id = 'ffffffff-0000-4000-8000-000000000001'$$,
  '23514', 'fuso invalido',
  'família com fuso inválido é recusada no update'
);

select is(
  (select fuso from public.familias where id = 'ffffffff-0000-4000-8000-000000000001'),
  'America/Sao_Paulo',
  'o fuso da família segue intacto depois do update recusado'
);

select throws_ok(
  $$insert into public.familias (nome, fuso, criada_por)
    values ('Sem fuso', null, 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '23502', null,
  'fuso nulo em família passa pelo gatilho e é barrado pelo not null'
);

-- criar_familia passa pelo mesmo gatilho.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_familia('Casa inválida', 'Marte/Olympus')$$,
  '23514', 'fuso invalido',
  'criar_familia recusa fuso inválido'
);

select lives_ok(
  $$select public.criar_familia('Casa válida', 'America/Manaus')$$,
  'criar_familia aceita fuso válido'
);

reset role;

select is(
  (select count(*)::int from public.familias where nome in ('Casa inválida', 'Casa válida')),
  1,
  'só a chamada com fuso válido criou família'
);

-- Nascimento: o hoje da família não depende do TimeZone da sessão.
-- K (...0a1) fica em Kiritimati (UTC+14) e P (...0a2) em Pago Pago (UTC-11): 25 horas de diferença.
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-0000000000a1', 'Família K', 'Pacific/Kiritimati', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-0000000000a2', 'Família P', 'Pacific/Pago_Pago', 'aaaaaaaa-0000-4000-8000-000000000001');

select set_config('teste.hoje_k', ((now() at time zone 'Pacific/Kiritimati')::date)::text, true);
select set_config('teste.hoje_p', ((now() at time zone 'Pacific/Pago_Pago')::date)::text, true);

select ok(
  current_setting('teste.hoje_k')::date > current_setting('teste.hoje_p')::date,
  'premissa: o hoje de Kiritimati é posterior ao de Pago Pago'
);

select lives_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a1', 'Hoje K', %L)$$, current_setting('teste.hoje_k')),
  'nascimento igual ao hoje da família é aceito'
);

select throws_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a1', 'Amanhã K', %L)$$,
         (current_setting('teste.hoje_k')::date + 1)::text),
  '23514', 'nascimento no futuro',
  'nascimento depois do hoje da família é recusado'
);

select lives_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a1', 'Ontem K', %L)$$,
         (current_setting('teste.hoje_k')::date - 1)::text),
  'nascimento no passado é aceito'
);

-- Com o TimeZone da sessão em Pago Pago, o hoje de K ainda é o de K.
set local timezone = 'Pacific/Pago_Pago';

select lives_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a1', 'Sessão P', %L)$$, current_setting('teste.hoje_k')),
  'o hoje da família vale mesmo com a sessão em fuso atrasado'
);

-- Com o TimeZone da sessão em Kiritimati, o amanhã de P continua no futuro.
set local timezone = 'Pacific/Kiritimati';

select throws_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a2', 'Amanhã P', %L)$$,
         (current_setting('teste.hoje_p')::date + 1)::text),
  '23514', 'nascimento no futuro',
  'data que já é hoje na sessão mas é futuro na família é recusada'
);

reset timezone;

select is(
  (select count(*)::int from public.bebes where familia_id = 'ffffffff-0000-4000-8000-0000000000a2'),
  0,
  'nenhum bebê da família P foi gravado'
);

-- O mesmo resultado com a sessão em UTC e em Kiritimati, para as duas famílias: o hoje da família
-- é aceito e o hoje + 1 é recusado.
set local timezone = 'UTC';

select lives_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a1', 'UTC K hoje', %L)$$, current_setting('teste.hoje_k')),
  'sessão em UTC: o hoje de K é aceito'
);
select throws_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a1', 'UTC K amanhã', %L)$$,
         (current_setting('teste.hoje_k')::date + 1)::text),
  '23514', 'nascimento no futuro',
  'sessão em UTC: o hoje + 1 de K é recusado'
);
select lives_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a2', 'UTC P hoje', %L)$$, current_setting('teste.hoje_p')),
  'sessão em UTC: o hoje de P é aceito'
);
select throws_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a2', 'UTC P amanhã', %L)$$,
         (current_setting('teste.hoje_p')::date + 1)::text),
  '23514', 'nascimento no futuro',
  'sessão em UTC: o hoje + 1 de P é recusado'
);

set local timezone = 'Pacific/Kiritimati';

select lives_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a1', 'Kiri K hoje', %L)$$, current_setting('teste.hoje_k')),
  'sessão em Kiritimati: o hoje de K é aceito'
);
select throws_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a1', 'Kiri K amanhã', %L)$$,
         (current_setting('teste.hoje_k')::date + 1)::text),
  '23514', 'nascimento no futuro',
  'sessão em Kiritimati: o hoje + 1 de K é recusado'
);
select lives_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a2', 'Kiri P hoje', %L)$$, current_setting('teste.hoje_p')),
  'sessão em Kiritimati: o hoje de P é aceito'
);
select throws_ok(
  format($$insert into public.bebes (familia_id, nome, nascimento)
           values ('ffffffff-0000-4000-8000-0000000000a2', 'Kiri P amanhã', %L)$$,
         (current_setting('teste.hoje_p')::date + 1)::text),
  '23514', 'nascimento no futuro',
  'sessão em Kiritimati: o hoje + 1 de P é recusado'
);

reset timezone;

-- Update de nascimento.
select throws_ok(
  format($$update public.bebes set nascimento = %L where nome = 'Hoje K'$$,
         (current_setting('teste.hoje_k')::date + 1)::text),
  '23514', 'nascimento no futuro',
  'update de nascimento para o futuro é recusado'
);

select is(
  (select nascimento::text from public.bebes where nome = 'Hoje K'),
  current_setting('teste.hoje_k'),
  'o nascimento segue intacto depois do update recusado'
);

-- Mudar o fuso da família não reconfere os bebês; só o update de nascimento reconfere.
select lives_ok(
  $$update public.familias set fuso = 'Pacific/Pago_Pago' where id = 'ffffffff-0000-4000-8000-0000000000a1'$$,
  'mudar o fuso da família com bebê nascido "hoje" não falha'
);

select lives_ok(
  $$update public.bebes set nome = 'Hoje K renomeado' where nome = 'Hoje K'$$,
  'update de outra coluna não reconfere o nascimento'
);

select throws_ok(
  $$update public.bebes set nascimento = nascimento where nome = 'Hoje K renomeado'$$,
  '23514', 'nascimento no futuro',
  'update de nascimento reconfere contra o fuso novo da família'
);

-- Responsável autenticado.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Futuro',
            ((now() at time zone 'America/Sao_Paulo')::date + 1), 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '23514', 'nascimento no futuro',
  'responsável autenticado também não cadastra nascimento no futuro'
);

select lives_ok(
  $$insert into public.bebes (familia_id, nome, nascimento, criado_por)
    values ('ffffffff-0000-4000-8000-000000000001', 'Hoje',
            ((now() at time zone 'America/Sao_Paulo')::date), 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  'responsável autenticado cadastra nascimento igual ao hoje da família'
);

reset role;

select * from finish();
rollback;
