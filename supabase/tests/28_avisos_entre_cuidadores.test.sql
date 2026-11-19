begin;
create extension if not exists pgtap with schema extensions;

select plan(92);

create function pg_temp.utc(t timestamptz) returns text language sql as $$
  select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
$$;

create function pg_temp.ids(j jsonb) returns text[] language sql as $$
  select array(select e ->> 'id' from jsonb_array_elements(j -> 'avisos') with ordinality as t(e, o) order by o);
$$;

create function pg_temp.chaves(j jsonb) returns text[] language sql as $$
  select array(select k from jsonb_object_keys(j) k order by k);
$$;

create function pg_temp.nid(n int) returns text language sql as $$
  select 'a2000000-0000-7000-8000-' || lpad(n::text, 12, '0');
$$;

create function pg_temp.nu(n int) returns uuid language sql as $$
  select pg_temp.nid(n)::uuid;
$$;

-- RF14 (I-RF14-1). Contas: 01 R leitora (responsável da família 1, cuidadora da 2), 02 W cuidador da 1 e
-- responsável da 2 (autor), 03 O observador da 1, 04 Z responsável da 3, 05 L ex-membro da 1 (saiu, autor),
-- 06 M cuidador da 1 e moderador da plataforma, 07 P vínculo revogado na 1, 08 Q saiu da 1, 09 V vínculo vencido
-- na 1, 10 X só em auth.users, 11 D cuidador da 1 (a conta será excluída), 12 G responsável da 1,
-- 13 S responsável da 4, 14 T cuidador da 4 (51 notas), 15 Y conta sem vínculo e sem linha de avisos.
insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || n || '@exemplo.invalid'
from generate_series(1, 15) as n;

insert into public.contas (id, nome_privado, fuso)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       (array['R', 'W', 'O', 'Z', 'L', 'M', 'P', 'Q', 'V', 'X', 'D', 'G', 'S', 'T', 'Y'])[n],
       'America/Sao_Paulo'
from generate_series(1, 15) as n
where n <> 10;

insert into public.papeis_plataforma (conta_id, papel)
values ('aaaaaaaa-0000-4000-8000-000000000006', 'moderador');

insert into public.familias (id, nome, fuso, criada_por, criada_em) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '60 days'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Manaus', 'aaaaaaaa-0000-4000-8000-000000000002', now() - interval '60 days'),
  ('ffffffff-0000-4000-8000-000000000003', 'Família 3', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000004', now() - interval '60 days'),
  ('ffffffff-0000-4000-8000-000000000004', 'Família 4', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000013', now() - interval '60 days');

insert into public.vinculos (id, familia_id, conta_id, papel, estado, valido_ate, epoca, criado_em, encerrado_em) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo', null, 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador', 'ativo', null, 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'observador', 'ativo', null, 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000005', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', 'cuidador', 'saiu', null, 2, now() - interval '50 days', now() - interval '1 day'),
  ('bb000000-0000-4000-8000-000000000006', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006', 'cuidador', 'ativo', null, 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000007', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000007', 'cuidador', 'revogado', null, 2, now() - interval '50 days', now() - interval '1 day'),
  ('bb000000-0000-4000-8000-000000000008', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000008', 'observador', 'saiu', null, 2, now() - interval '50 days', now() - interval '1 day'),
  ('bb000000-0000-4000-8000-000000000009', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000009', 'cuidador', 'ativo', now() - interval '1 day', 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000011', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000011', 'cuidador', 'ativo', null, 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000012', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000012', 'responsavel', 'ativo', null, 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000021', 'ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel', 'ativo', null, 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000022', 'ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'cuidador', 'ativo', null, 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000031', 'ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000004', 'responsavel', 'ativo', null, 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000041', 'ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000013', 'responsavel', 'ativo', null, 1, now() - interval '50 days', null),
  ('bb000000-0000-4000-8000-000000000042', 'ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000014', 'cuidador', 'ativo', null, 1, now() - interval '50 days', null);

insert into public.bebes (id, familia_id, nome, nascimento, estado, criado_por, criado_em) values
  ('bebe0000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Teo', '2026-07-01', 'ativo', 'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '40 days'),
  ('bebe0000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'Arquivado', '2025-01-31', 'arquivado', 'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '40 days');

-- Notas com a criação fixada: o gatilho do servidor reescreve criada_em no insert e fica desligado só aqui.
-- 01 W (com destaque), 02 W (bebê), 03 W (bebê arquivado), 04 R (própria), 05 D (a conta será excluída), 06 W (lixeira),
-- 07 W (167 h 59 min 59 s), 08 W (exatamente 168 h), 09 W (168 h e 1 s), 10 W (agora), 11 W (família 2), 12 Z (família 3),
-- 13 L (saiu), 14 W (no futuro).
alter table public.notas_cuidado disable trigger notas_campos_do_servidor;

insert into public.notas_cuidado (id, familia_id, bebe_id, texto, destaque_ate, criado_por, criada_em, atualizado_em, excluida_em, excluida_por) values
  (pg_temp.nu(1), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota 01', now() + interval '1 day', 'aaaaaaaa-0000-4000-8000-000000000002', now() - interval '1 hour', now() - interval '1 hour', null, null),
  (pg_temp.nu(2), 'ffffffff-0000-4000-8000-000000000001', 'bebe0000-0000-4000-8000-000000000001', 'Nota 02', null, 'aaaaaaaa-0000-4000-8000-000000000002', now() - interval '2 hours', now() - interval '2 hours', null, null),
  (pg_temp.nu(3), 'ffffffff-0000-4000-8000-000000000001', 'bebe0000-0000-4000-8000-000000000002', 'Nota 03', null, 'aaaaaaaa-0000-4000-8000-000000000002', now() - interval '3 hours', now() - interval '3 hours', null, null),
  (pg_temp.nu(4), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota 04 da própria R', null, 'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '1 hour', now() - interval '1 hour', null, null),
  (pg_temp.nu(5), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota 05 de D', null, 'aaaaaaaa-0000-4000-8000-000000000011', now() - interval '7 hours', now() - interval '7 hours', null, null),
  (pg_temp.nu(6), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota 06 na lixeira', null, 'aaaaaaaa-0000-4000-8000-000000000002', now() - interval '4 hours', now() - interval '4 hours', now() - interval '1 hour', 'aaaaaaaa-0000-4000-8000-000000000002'),
  (pg_temp.nu(7), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota 07 por um segundo dentro', null, 'aaaaaaaa-0000-4000-8000-000000000002', now() - interval '168 hours' + interval '1 second', now(), null, null),
  (pg_temp.nu(8), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota 08 exatamente 168 h', null, 'aaaaaaaa-0000-4000-8000-000000000002', now() - interval '168 hours', now(), null, null),
  (pg_temp.nu(9), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota 09 por um segundo fora', null, 'aaaaaaaa-0000-4000-8000-000000000002', now() - interval '168 hours' - interval '1 second', now(), null, null),
  (pg_temp.nu(10), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota 10 agora', null, 'aaaaaaaa-0000-4000-8000-000000000002', now(), now(), null, null),
  (pg_temp.nu(11), 'ffffffff-0000-4000-8000-000000000002', null, 'Nota 11 da família 2', null, 'aaaaaaaa-0000-4000-8000-000000000002', now() - interval '5 hours', now() - interval '5 hours', null, null),
  (pg_temp.nu(12), 'ffffffff-0000-4000-8000-000000000003', null, 'Nota 12 de outra família', null, 'aaaaaaaa-0000-4000-8000-000000000004', now() - interval '1 hour', now() - interval '1 hour', null, null),
  (pg_temp.nu(13), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota 13 de quem saiu', null, 'aaaaaaaa-0000-4000-8000-000000000005', now() - interval '6 hours', now() - interval '6 hours', null, null),
  (pg_temp.nu(14), 'ffffffff-0000-4000-8000-000000000001', null, 'Nota 14 no futuro', null, 'aaaaaaaa-0000-4000-8000-000000000002', now() + interval '1 hour', now(), null, null);

-- 51 notas de T na família 4, uma por minuto.
insert into public.notas_cuidado (id, familia_id, bebe_id, texto, destaque_ate, criado_por, criada_em, atualizado_em)
select ('a3000000-0000-7000-8000-' || lpad(n::text, 12, '0'))::uuid, 'ffffffff-0000-4000-8000-000000000004', null,
       'Nota da família 4 número ' || n, null, 'aaaaaaaa-0000-4000-8000-000000000014', now() - n * interval '1 minute', now()
from generate_series(1, 51) as n;

alter table public.notas_cuidado enable trigger notas_campos_do_servidor;

-- Quem já tem linha de avisos: O, P, Q e V ligados (os três últimos sem vínculo ativo), D com visto-até.
insert into public.avisos_entre_cuidadores (conta_id, ligados, vistos_ate) values
  ('aaaaaaaa-0000-4000-8000-000000000003', true, null),
  ('aaaaaaaa-0000-4000-8000-000000000007', true, null),
  ('aaaaaaaa-0000-4000-8000-000000000008', true, null),
  ('aaaaaaaa-0000-4000-8000-000000000009', true, null),
  ('aaaaaaaa-0000-4000-8000-000000000011', false, now() - interval '30 days');

-- A tabela e as funções: nenhum grant a anon nem a authenticated; só authenticated executa.
select ok(
  not has_table_privilege('anon', 'public.avisos_entre_cuidadores', 'select, insert, update, delete, truncate, references, trigger')
  and not has_table_privilege('authenticated', 'public.avisos_entre_cuidadores', 'select, insert, update, delete, truncate, references, trigger'),
  'a tabela não concede nenhum privilégio a anon nem a authenticated'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.avisos_entre_cuidadores'::regclass), true,
  'a tabela tem RLS ligada'
);
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname like 'avisos\_%'
      and p.prosecdef and p.proconfig = array['search_path=""']),
  array['avisos_definir_ligados', 'avisos_ler_estado', 'avisos_marcar_vistos'],
  'as três funções são security definer com search_path vazio'
);
select is(
  (select p.pronargs::int from pg_proc p where p.oid = 'public.avisos_ler_estado()'::regprocedure), 0,
  'a leitura do estado não recebe parâmetro (nenhuma conta)'
);
select is(
  (select array[p.proargnames::text, pg_get_function_identity_arguments(p.oid)] from pg_proc p where p.oid = 'public.avisos_definir_ligados(boolean)'::regprocedure),
  array['{p_ligados}', 'p_ligados boolean'],
  'definir só recebe o valor da preferência (nenhuma conta)'
);
select is(
  (select array[p.proargnames::text, pg_get_function_identity_arguments(p.oid)] from pg_proc p where p.oid = 'public.avisos_marcar_vistos(timestamp with time zone)'::regprocedure),
  array['{p_ate}', 'p_ate timestamp with time zone'],
  'marcar vistos só recebe o instante (nenhuma conta)'
);
select ok(
  has_function_privilege('authenticated', 'public.avisos_ler_estado()', 'execute')
  and has_function_privilege('authenticated', 'public.avisos_definir_ligados(boolean)', 'execute')
  and has_function_privilege('authenticated', 'public.avisos_marcar_vistos(timestamptz)', 'execute')
  and not has_function_privilege('anon', 'public.avisos_ler_estado()', 'execute')
  and not has_function_privilege('anon', 'public.avisos_definir_ligados(boolean)', 'execute')
  and not has_function_privilege('anon', 'public.avisos_marcar_vistos(timestamptz)', 'execute'),
  'só authenticated executa as três funções'
);

-- anon e authenticated: acesso direto à tabela, 42501.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select * from public.avisos_entre_cuidadores$$, '42501', null, 'anon não lê a tabela');
select throws_ok($$insert into public.avisos_entre_cuidadores (conta_id) values ('aaaaaaaa-0000-4000-8000-000000000015')$$, '42501', null, 'anon não insere na tabela');
select throws_ok($$update public.avisos_entre_cuidadores set ligados = true$$, '42501', null, 'anon não altera a tabela');
select throws_ok($$delete from public.avisos_entre_cuidadores$$, '42501', null, 'anon não apaga da tabela');
select throws_ok($$select public.avisos_ler_estado()$$, '42501', null, 'anon não executa avisos_ler_estado');
select throws_ok($$select public.avisos_definir_ligados(true)$$, '42501', null, 'anon não executa avisos_definir_ligados');
select throws_ok($$select public.avisos_marcar_vistos(now())$$, '42501', null, 'anon não executa avisos_marcar_vistos');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok($$select * from public.avisos_entre_cuidadores$$, '42501', null, 'authenticated não lê a tabela');
select throws_ok($$insert into public.avisos_entre_cuidadores (conta_id) values ('aaaaaaaa-0000-4000-8000-000000000001')$$, '42501', null, 'authenticated não insere na tabela');
select throws_ok($$update public.avisos_entre_cuidadores set ligados = true$$, '42501', null, 'authenticated não altera a tabela');
select throws_ok($$delete from public.avisos_entre_cuidadores$$, '42501', null, 'authenticated não apaga da tabela');

-- R: sem linha, a preferência está desligada e não há avisos.
select lives_ok($$select set_config('teste.r0', public.avisos_ler_estado()::text, true)$$, 'R lê o estado sem ter linha');
select lives_ok($$select public.avisos_definir_ligados(true)$$, 'R liga os avisos');
select lives_ok($$select set_config('teste.r1', public.avisos_ler_estado()::text, true)$$, 'R lê o estado ligado');
reset role;

select is(
  current_setting('teste.r0')::jsonb, '{"ligados": false, "mais_de_50": false, "avisos": []}'::jsonb,
  'desligado por padrão: ligados falso, zero avisos e sem a marca de mais de 50'
);
-- (a) outra família fora (12), (b) a própria nota fora (04) e a de autor com conta ainda viva dentro (05), (c) a lixeira
-- fora (06), (d) as bordas de 168 h (07 dentro, 08 e 09 fora) e agora (10 dentro), o futuro (14) fora.
select is(
  pg_temp.ids(current_setting('teste.r1')::jsonb),
  array[pg_temp.nid(10), pg_temp.nid(1), pg_temp.nid(2), pg_temp.nid(3), pg_temp.nid(11), pg_temp.nid(13), pg_temp.nid(5), pg_temp.nid(7)],
  'R recebe as notas das duas famílias, de qualquer bebê e do que não tem bebê, da mais nova à mais antiga (RF-05 a-d)'
);
select is(
  pg_temp.chaves(current_setting('teste.r1')::jsonb), array['avisos', 'ligados', 'mais_de_50'],
  'o estado tem só preferência, avisos e a marca de mais de 50'
);
select is(
  pg_temp.chaves(current_setting('teste.r1')::jsonb -> 'avisos' -> 0),
  array['autor', 'autor_nome', 'criada_em', 'destaque_ate', 'familia_fuso', 'familia_nome', 'id', 'texto'],
  'cada aviso tem só os campos do contrato'
);
select is(
  current_setting('teste.r1')::jsonb -> 'avisos' -> 1,
  jsonb_build_object('id', pg_temp.nid(1), 'texto', 'Nota 01', 'criada_em', pg_temp.utc(now() - interval '1 hour'),
                     'destaque_ate', pg_temp.utc(now() + interval '1 day'), 'autor', 'nome', 'autor_nome', 'W',
                     'familia_nome', 'Família 1', 'familia_fuso', 'America/Sao_Paulo'),
  'aviso de autor com vínculo ativo: nome, instante e destaque em UTC com microssegundos'
);
select is(
  current_setting('teste.r1')::jsonb -> 'avisos' -> 4,
  jsonb_build_object('id', pg_temp.nid(11), 'texto', 'Nota 11 da família 2', 'criada_em', pg_temp.utc(now() - interval '5 hours'),
                     'destaque_ate', null, 'autor', 'nome', 'autor_nome', 'W',
                     'familia_nome', 'Família 2', 'familia_fuso', 'America/Manaus'),
  'aviso da outra família de R: nome e fuso da família 2, destaque nulo como null do JSON'
);
select is(
  current_setting('teste.r1')::jsonb -> 'avisos' -> 5,
  jsonb_build_object('id', pg_temp.nid(13), 'texto', 'Nota 13 de quem saiu', 'criada_em', pg_temp.utc(now() - interval '6 hours'),
                     'destaque_ate', null, 'autor', 'saiu', 'autor_nome', null,
                     'familia_nome', 'Família 1', 'familia_fuso', 'America/Sao_Paulo'),
  'autor com o vínculo encerrado: tipo "saiu" e sem nome (RF-05, RF-14)'
);
select ok(
  current_setting('teste.r1') !~ '(Nota 04|Nota 06|Nota 08|Nota 09|Nota 12|Nota 14|Família 3)',
  'nada da própria R, da lixeira, fora de 168 h, de outra família nem do futuro'
);

-- (c) a nota na lixeira, restaurada, passa a valer.
update public.notas_cuidado set excluida_em = null, excluida_por = null where id = pg_temp.nu(6);

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select set_config('teste.r2', public.avisos_ler_estado()::text, true)$$, 'R lê o estado com a nota restaurada');
-- O, observador da família 1, com a preferência ligada.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select lives_ok($$select set_config('teste.o', public.avisos_ler_estado()::text, true)$$, 'o observador lê o estado');
-- P (revogado), Q (saiu) e V (vencido), todos ligados.
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';
select lives_ok($$select set_config('teste.p', public.avisos_ler_estado()::text, true)$$, 'quem teve o vínculo revogado lê o estado');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select lives_ok($$select set_config('teste.q', public.avisos_ler_estado()::text, true)$$, 'quem saiu da família lê o estado');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';
select lives_ok($$select set_config('teste.v', public.avisos_ler_estado()::text, true)$$, 'quem tem o vínculo vencido lê o estado');
reset role;

select is(
  pg_temp.ids(current_setting('teste.r2')::jsonb),
  array[pg_temp.nid(10), pg_temp.nid(1), pg_temp.nid(2), pg_temp.nid(3), pg_temp.nid(6), pg_temp.nid(11), pg_temp.nid(13), pg_temp.nid(5), pg_temp.nid(7)],
  'a nota restaurada da lixeira volta a ser aviso, na sua posição'
);
select is(
  pg_temp.ids(current_setting('teste.o')::jsonb),
  array[pg_temp.nid(10), pg_temp.nid(4), pg_temp.nid(1), pg_temp.nid(2), pg_temp.nid(3), pg_temp.nid(6), pg_temp.nid(13), pg_temp.nid(5), pg_temp.nid(7)],
  'o observador recebe os avisos da família 1, a nota de R inclusive, e nenhum da família 2, onde não tem vínculo'
);
select is(
  (select jsonb_build_array(current_setting('teste.p')::jsonb -> 'avisos', current_setting('teste.q')::jsonb -> 'avisos',
                            current_setting('teste.v')::jsonb -> 'avisos')),
  '[[], [], []]'::jsonb,
  'vínculo revogado, que saiu ou vencido: zero avisos daquela família'
);
select is(
  (select jsonb_build_array(current_setting('teste.p')::jsonb -> 'ligados', current_setting('teste.q')::jsonb -> 'ligados',
                            current_setting('teste.v')::jsonb -> 'ligados')),
  '[true, true, true]'::jsonb,
  'esses três continuam com a preferência ligada, só não têm família'
);

-- (e) visto-até: igual ao instante da nota não é aviso; um instante mais velho não volta atrás; desligar mantém.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select public.avisos_marcar_vistos(now() - interval '2 hours')$$, 'R marca como visto até o instante da nota 02');
select lives_ok($$select set_config('teste.r3', public.avisos_ler_estado()::text, true)$$, 'R lê depois de marcar');
select lives_ok($$select public.avisos_marcar_vistos(now() - interval '3 hours')$$, 'R envia um instante mais velho');
select lives_ok($$select set_config('teste.r4', public.avisos_ler_estado()::text, true)$$, 'R lê depois do instante mais velho');
select lives_ok($$select set_config('teste.e4', public.exportar_dados()::text, true)$$, 'R exporta com o visto-até guardado');
select lives_ok($$select public.avisos_definir_ligados(false)$$, 'R desliga os avisos');
select lives_ok($$select set_config('teste.r5', public.avisos_ler_estado()::text, true)$$, 'R lê desligado');
select lives_ok($$select public.avisos_definir_ligados(true)$$, 'R liga de novo');
select lives_ok($$select set_config('teste.r6', public.avisos_ler_estado()::text, true)$$, 'R lê ligado de novo');
select lives_ok($$select public.avisos_marcar_vistos(now() + interval '1 day')$$, 'R envia um instante no futuro, sem erro');
select lives_ok($$select set_config('teste.r7', public.avisos_ler_estado()::text, true)$$, 'R lê depois do futuro');
select lives_ok($$select set_config('teste.e7', public.exportar_dados()::text, true)$$, 'R exporta depois do futuro');
reset role;

select is(
  pg_temp.ids(current_setting('teste.r3')::jsonb), array[pg_temp.nid(10), pg_temp.nid(1)],
  'a nota no instante exato do visto-até não é aviso; as criadas depois continuam sendo (RF-10)'
);
select is(
  pg_temp.ids(current_setting('teste.r4')::jsonb), array[pg_temp.nid(10), pg_temp.nid(1)],
  'um instante mais velho não move o visto-até para trás'
);
select is(
  current_setting('teste.e4')::jsonb -> 'avisos' ->> 'vistos_ate', pg_temp.utc(now() - interval '2 hours'),
  'o guardado é o maior dos dois, em UTC com microssegundos'
);
select is(
  current_setting('teste.r5')::jsonb, '{"ligados": false, "mais_de_50": false, "avisos": []}'::jsonb,
  'desligada: a leitura devolve desligado e zero avisos (RF-13)'
);
select is(
  pg_temp.ids(current_setting('teste.r6')::jsonb), array[pg_temp.nid(10), pg_temp.nid(1)],
  'desligar e ligar de novo mantém o visto-até (RF-13)'
);
select is(
  current_setting('teste.e7')::jsonb -> 'avisos',
  jsonb_build_object('ligados', true, 'vistos_ate', pg_temp.utc(now())),
  'um valor no futuro é guardado como agora, sem erro'
);
select is(
  current_setting('teste.r7')::jsonb, '{"ligados": true, "mais_de_50": false, "avisos": []}'::jsonb,
  'com o visto-até em agora, a nota criada agora também deixa de ser aviso'
);

-- Marcar funciona com a preferência desligada: W nunca ligou.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.avisos_marcar_vistos(now() - interval '1 day')$$, 'W marca como visto com a preferência desligada');
select lives_ok($$select set_config('teste.ew', public.exportar_dados()::text, true)$$, 'W exporta');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000015", "role": "authenticated"}';
select lives_ok($$select set_config('teste.ey', public.exportar_dados()::text, true)$$, 'Y, sem linha de avisos, exporta');
reset role;

select is(
  current_setting('teste.ew')::jsonb -> 'avisos',
  jsonb_build_object('ligados', false, 'vistos_ate', pg_temp.utc(now() - interval '1 day')),
  'marcar com a preferência desligada guarda o visto-até e não liga'
);
select is(
  current_setting('teste.ey')::jsonb -> 'avisos', '{"ligados": false, "vistos_ate": null}'::jsonb,
  'a exportação de uma conta nova traz avisos desligado e sem visto-até (RF-15)'
);
select is(
  pg_temp.chaves(current_setting('teste.e7')::jsonb),
  array['avisos', 'comunidade', 'conta', 'familias', 'formato', 'gerado_em', 'notas', 'registros', 'vinculos'],
  'a exportação tem as oito chaves de antes mais avisos (RF-15)'
);
select is(
  (current_setting('teste.e7')::jsonb - 'avisos' - 'gerado_em') #> '{conta}',
  jsonb_build_object('id', 'aaaaaaaa-0000-4000-8000-000000000001', 'email', 'u1@exemplo.invalid', 'nome_privado', 'R',
                     'fuso', 'America/Sao_Paulo', 'criada_em', pg_temp.utc((select criada_em from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000001'))),
  'as chaves de antes seguem como estavam (a conta, por exemplo)'
);

-- 51 notas: 50 linhas e a marca; com 50, sem a marca.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select lives_ok($$select public.avisos_definir_ligados(true)$$, 'S liga os avisos');
select lives_ok($$select set_config('teste.s51', public.avisos_ler_estado()::text, true)$$, 'S lê com 51 avisos');
reset role;
delete from public.notas_cuidado where id = 'a3000000-0000-7000-8000-000000000051';
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}';
select lives_ok($$select set_config('teste.s50', public.avisos_ler_estado()::text, true)$$, 'S lê com 50 avisos');
reset role;

select is(
  (select array[jsonb_array_length(current_setting('teste.s51')::jsonb -> 'avisos')::text, (current_setting('teste.s51')::jsonb ->> 'mais_de_50')]),
  array['50', 'true'],
  '51 avisos: 50 linhas e a marca de mais de 50'
);
select is(
  current_setting('teste.s51')::jsonb -> 'avisos' -> 49 ->> 'id', 'a3000000-0000-7000-8000-000000000050',
  'a linha 50 é a nota 50 (a 51, a mais antiga, fica de fora)'
);
select is(
  (select array[jsonb_array_length(current_setting('teste.s50')::jsonb -> 'avisos')::text, (current_setting('teste.s50')::jsonb ->> 'mais_de_50')]),
  array['50', 'false'],
  '50 avisos: 50 linhas e sem a marca'
);

-- RF-14: cada conta lê e muda só a própria linha (cuidador W, observador O, responsável G, moderador M).
select set_config('teste.linha_r', (select row_to_json(a)::text from public.avisos_entre_cuidadores a where a.conta_id = 'aaaaaaaa-0000-4000-8000-000000000001'), true);
select set_config('teste.linha_o', (select row_to_json(a)::text from public.avisos_entre_cuidadores a where a.conta_id = 'aaaaaaaa-0000-4000-8000-000000000003'), true);

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000012", "role": "authenticated"}';
select lives_ok($$select set_config('teste.g0', public.avisos_ler_estado()::text, true)$$, 'G, responsável da mesma família de R, lê o estado');
select lives_ok($$select public.avisos_definir_ligados(true)$$, 'G liga os avisos');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select lives_ok($$select public.avisos_definir_ligados(true)$$, 'M, moderador da plataforma, liga os avisos');
select lives_ok($$select public.avisos_marcar_vistos(now() - interval '2 days')$$, 'M marca como visto');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.avisos_definir_ligados(true)$$, 'W, cuidador, liga os avisos');
reset role;

select is(
  current_setting('teste.g0')::jsonb, '{"ligados": false, "mais_de_50": false, "avisos": []}'::jsonb,
  'G não vê a preferência de R: lê o próprio estado, desligado'
);
select is(
  (select row_to_json(a)::text from public.avisos_entre_cuidadores a where a.conta_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  current_setting('teste.linha_r'),
  'a linha de R não mudou com o que G, M e W fizeram'
);
select is(
  (select row_to_json(a)::text from public.avisos_entre_cuidadores a where a.conta_id = 'aaaaaaaa-0000-4000-8000-000000000003'),
  current_setting('teste.linha_o'),
  'a linha de O (observador) não mudou'
);
select is(
  (select array_agg(a.conta_id::text || ':' || a.ligados::text order by a.conta_id) from public.avisos_entre_cuidadores a
    where a.conta_id in ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000012')),
  array['aaaaaaaa-0000-4000-8000-000000000002:true', 'aaaaaaaa-0000-4000-8000-000000000006:true', 'aaaaaaaa-0000-4000-8000-000000000012:true'],
  'cada um ligou só a própria linha'
);
select is(
  (select count(*)::int from public.avisos_entre_cuidadores), 10,
  'uma linha por conta, sem linhas a mais: O, P, Q, V e D do início e R, W, S, G e M, que mexeram'
);

-- Erros: conta sem linha em contas e parâmetro nulo.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000010", "role": "authenticated"}';
select throws_ok($$select public.avisos_definir_ligados(true)$$, 'P0001', 'conta inexistente', 'conta sem linha em contas não liga');
select throws_ok($$select public.avisos_marcar_vistos(now())$$, 'P0001', 'conta inexistente', 'conta sem linha em contas não marca');
select lives_ok($$select set_config('teste.x', public.avisos_ler_estado()::text, true)$$, 'conta sem linha em contas lê o estado');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000015", "role": "authenticated"}';
select throws_ok($$select public.avisos_definir_ligados(null)$$, 'P0001', 'parametro obrigatorio', 'definir exige o valor');
select throws_ok($$select public.avisos_marcar_vistos(null)$$, 'P0001', 'parametro obrigatorio', 'marcar exige o instante');
select lives_ok($$select set_config('teste.y', public.avisos_ler_estado()::text, true)$$, 'Y, sem família e sem linha, lê o estado');
reset role;

select is(
  current_setting('teste.x')::jsonb, '{"ligados": false, "mais_de_50": false, "avisos": []}'::jsonb,
  'sem linha em contas: desligado e zero avisos'
);

-- RF-16: a exclusão da conta apaga a linha, e a nota de D fica com autor nulo, aviso de "pessoa removida".
select is(
  (select count(*)::int from public.avisos_entre_cuidadores where conta_id = 'aaaaaaaa-0000-4000-8000-000000000011'), 1,
  'antes da exclusão, D tem a linha'
);
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'D exclui a conta');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select lives_ok($$select set_config('teste.o2', public.avisos_ler_estado()::text, true)$$, 'O lê depois da exclusão da conta de D');
reset role;

select is(
  (select count(*)::int from public.avisos_entre_cuidadores where conta_id = 'aaaaaaaa-0000-4000-8000-000000000011'), 0,
  'depois da exclusão da conta, nenhuma linha dela fica'
);
select is(
  (select e from jsonb_array_elements(current_setting('teste.o2')::jsonb -> 'avisos') e where e ->> 'id' = pg_temp.nid(5)),
  jsonb_build_object('id', pg_temp.nid(5), 'texto', 'Nota 05 de D', 'criada_em', pg_temp.utc(now() - interval '7 hours'),
                     'destaque_ate', null, 'autor', 'removido', 'autor_nome', null,
                     'familia_nome', 'Família 1', 'familia_fuso', 'America/Sao_Paulo'),
  'a nota de quem teve a conta excluída (autor nulo) continua sendo aviso, de "pessoa removida", sem nome (RF-05 b)'
);

select * from finish();
rollback;
