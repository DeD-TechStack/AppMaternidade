begin;
create extension if not exists pgtap with schema extensions;

select plan(81);

create function pg_temp.chaves(j jsonb) returns text[] language sql as $$
  select array(select k from jsonb_object_keys(j) k order by k);
$$;

create function pg_temp.ids(j jsonb, chave text) returns text[] language sql as $$
  select array(select e ->> chave from jsonb_array_elements(j) with ordinality as t(e, o) order by o);
$$;

create function pg_temp.utc(t timestamptz) returns text language sql as $$
  select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
$$;

-- 01 A: responsável das famílias 1 e 2, cuidador da 3, ex-responsável (saiu) da 4.
-- 02 B cuidador da 1 com validade futura, 03 C observador da 1, 04 D responsável da 1,
-- 05 E cuidador revogado da 1, 06 F responsável da 1 com validade vencida.
-- 07 X responsável da 3, 08 H com conta e nenhum vínculo, 09 N só em auth.users, 10 Y responsável da 4.
insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       (array['a', 'b', 'c', 'd', 'e', 'f', 'x', 'h', 'n', 'y'])[n] || '@exemplo.invalid'
from generate_series(1, 10) as n;

insert into public.contas (id, nome_privado, fuso, criada_em)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       (array['A', 'B', 'C', 'D', 'E', 'F', 'X', 'H', 'N', 'Y'])[n],
       'America/Sao_Paulo', timestamptz '2026-01-02 03:04:05+00'
from generate_series(1, 10) as n
where n <> 9;

insert into public.familias (id, nome, fuso, criada_por, criada_em) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '30 days'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Manaus', 'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '30 days'),
  ('ffffffff-0000-4000-8000-000000000003', 'Família 3', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000007', now() - interval '40 days'),
  ('ffffffff-0000-4000-8000-000000000004', 'Família 4', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000010', now() - interval '50 days');

insert into public.vinculos (id, familia_id, conta_id, papel, estado, valido_ate, epoca, criado_em, encerrado_em) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'responsavel', 'ativo', null, 1, now() - interval '10 days', null),
  ('bb000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001',
   'responsavel', 'ativo', null, 3, now() - interval '10 days', null),
  ('bb000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001',
   'cuidador', 'ativo', now() + interval '60 days', 2, now() - interval '5 days', null),
  ('bb000000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001',
   'responsavel', 'saiu', null, 2, now() - interval '20 days', now() - interval '2 days'),
  ('bb000000-0000-4000-8000-000000000012', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002',
   'cuidador', 'ativo', now() + interval '5 days', 1, now() - interval '9 days', null),
  ('bb000000-0000-4000-8000-000000000013', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003',
   'observador', 'ativo', null, 1, now() - interval '8 days', null),
  ('bb000000-0000-4000-8000-000000000014', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004',
   'responsavel', 'ativo', null, 1, now() - interval '10 days', null),
  ('bb000000-0000-4000-8000-000000000015', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005',
   'cuidador', 'revogado', null, 2, now() - interval '7 days', now() - interval '1 day'),
  ('bb000000-0000-4000-8000-000000000016', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000006',
   'responsavel', 'ativo', now() - interval '1 day', 1, now() - interval '6 days', null),
  ('bb000000-0000-4000-8000-000000000027', 'ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000007',
   'responsavel', 'ativo', null, 1, now() - interval '40 days', null),
  ('bb000000-0000-4000-8000-000000000030', 'ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000010',
   'responsavel', 'ativo', null, 1, now() - interval '50 days', null);

-- Bebês da família 1: dois com o mesmo criado_em (desempata pelo id) e um arquivado, mais antigo.
insert into public.bebes (id, familia_id, nome, nascimento, estado, criado_por, criado_em) values
  ('bebe0000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Teo', '2026-07-01', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '3 days'),
  ('bebe0000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'Lia', '2026-08-05', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '3 days'),
  ('bebe0000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'Arquivado', '2025-01-31', 'arquivado',
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '4 days'),
  ('bebe0000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000003', 'Bebê da 3', '2026-02-02', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000007', now() - interval '3 days'),
  ('bebe0000-0000-4000-8000-000000000005', 'ffffffff-0000-4000-8000-000000000004', 'Bebê da 4', '2026-03-03', 'ativo',
   'aaaaaaaa-0000-4000-8000-000000000010', now() - interval '3 days');

-- Convites da família 1: pendente, aceito (empata em criado_em com o pendente) e revogado.
insert into public.convites (id, familia_id, papel, vinculo_valido_ate, criado_por, codigo_hash, expira_em,
                             estado, aceito_por, aceito_em, criado_em) values
  ('c0000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'cuidador', now() + interval '60 days',
   'aaaaaaaa-0000-4000-8000-000000000001', 'segredo-hash-pendente', now() + interval '5 days', 'pendente', null, null,
   now() - interval '2 days'),
  ('c0000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'observador', null,
   'aaaaaaaa-0000-4000-8000-000000000001', 'segredo-hash-aceito', now() + interval '5 days', 'aceito',
   'aaaaaaaa-0000-4000-8000-000000000003', now() - interval '1 day', now() - interval '2 days'),
  ('c0000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'observador', null,
   'aaaaaaaa-0000-4000-8000-000000000004', 'segredo-hash-revogado', now() + interval '5 days', 'revogado', null, null,
   now() - interval '1 day'),
  ('c0000000-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000003', 'observador', null,
   'aaaaaaaa-0000-4000-8000-000000000007', 'segredo-hash-familia-3', now() + interval '5 days', 'pendente', null, null,
   now() - interval '1 day');

-- Registros e notas (RF-13). Os gatilhos do servidor reescrevem recebido_em, versão e a lixeira no insert;
-- ficam desligados só aqui, para o teste fixar os horários e a lixeira (mesmo recurso do teste 54).
-- Ids UUID v7 (15º caractere 7, 20º em 8, 9, a ou b): registros a1000000-..., notas a2000000-...
-- Família 1 (A e D responsáveis, B cuidador): registro 04 (D, o mais antigo), 01 (A) e 02 (B) empatam em
-- recebido_em entre 01 e 02 (o id desempata), 03 (B, na lixeira, excluído pelo próprio B).
-- Família 3 (A cuidador): 10 do X e 11 do A. Família 4 (A saiu): 20 do A e 21 do Y. A família 2 não tem bebê.
-- Notas da família 1: 03 (D, na lixeira, excluída por A), 01 (A) e 02 (B, com destaque) empatam em criada_em
-- entre 01 e 02; as da família 3 (10 do X, 11 do A) e as da 4 (20 do A, 21 do Y).
alter table public.registros disable trigger registros_campos_do_servidor;
alter table public.notas_cuidado disable trigger notas_campos_do_servidor;

insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, detalhes, nota, origem, fuso, deslocamento_min,
                              criado_por, encerrado_por, versao, recebido_em, atualizado_em, excluido_em, excluido_por) values
  ('a1000000-0000-7000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'bebe0000-0000-4000-8000-000000000001',
   'fralda', now() - interval '2 days 5 minutes', null, '{"conteudo": "xixi"}', null, 'ao_vivo', 'America/Sao_Paulo', -180,
   'aaaaaaaa-0000-4000-8000-000000000001', null, 1, now() - interval '2 days', now() - interval '2 days', null, null),
  ('a1000000-0000-7000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'bebe0000-0000-4000-8000-000000000002',
   'sono', now() - interval '2 days 10 minutes', null, '{}', null, 'ao_vivo', 'America/Sao_Paulo', -180,
   'aaaaaaaa-0000-4000-8000-000000000002', null, 1, now() - interval '2 days', now() - interval '2 days', null, null),
  ('a1000000-0000-7000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'bebe0000-0000-4000-8000-000000000001',
   'observacao', now() - interval '1 day 1 hour', null, '{}', 'Observação do B', 'retroativo', 'America/Manaus', -240,
   'aaaaaaaa-0000-4000-8000-000000000002', null, 3, now() - interval '1 day', now() - interval '12 hours',
   now() - interval '12 hours', 'aaaaaaaa-0000-4000-8000-000000000002'),
  ('a1000000-0000-7000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000001', 'bebe0000-0000-4000-8000-000000000001',
   'mamada', now() - interval '3 days 30 minutes', now() - interval '3 days 10 minutes', '{"lado": "esquerdo"}', null,
   'ao_vivo', 'America/Sao_Paulo', -180,
   'aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000004', 1,
   now() - interval '3 days', now() - interval '3 days', null, null),
  ('a1000000-0000-7000-8000-000000000010', 'ffffffff-0000-4000-8000-000000000003', 'bebe0000-0000-4000-8000-000000000004',
   'fralda', now() - interval '1 day 5 minutes', null, '{"conteudo": "coco"}', null, 'ao_vivo', 'America/Sao_Paulo', -180,
   'aaaaaaaa-0000-4000-8000-000000000007', null, 1, now() - interval '1 day', now() - interval '1 day', null, null),
  ('a1000000-0000-7000-8000-000000000011', 'ffffffff-0000-4000-8000-000000000003', 'bebe0000-0000-4000-8000-000000000004',
   'fralda', now() - interval '1 day 5 minutes', null, '{"conteudo": "ambos"}', null, 'ao_vivo', 'America/Sao_Paulo', -180,
   'aaaaaaaa-0000-4000-8000-000000000001', null, 1, now() - interval '1 day', now() - interval '1 day', null, null),
  ('a1000000-0000-7000-8000-000000000020', 'ffffffff-0000-4000-8000-000000000004', 'bebe0000-0000-4000-8000-000000000005',
   'fralda', now() - interval '5 days 5 minutes', null, '{"conteudo": "xixi"}', null, 'ao_vivo', 'America/Sao_Paulo', -180,
   'aaaaaaaa-0000-4000-8000-000000000001', null, 1, now() - interval '5 days', now() - interval '5 days', null, null),
  ('a1000000-0000-7000-8000-000000000021', 'ffffffff-0000-4000-8000-000000000004', 'bebe0000-0000-4000-8000-000000000005',
   'fralda', now() - interval '5 days 5 minutes', null, '{"conteudo": "coco"}', null, 'ao_vivo', 'America/Sao_Paulo', -180,
   'aaaaaaaa-0000-4000-8000-000000000010', null, 1, now() - interval '5 days', now() - interval '5 days', null, null);

insert into public.notas_cuidado (id, familia_id, bebe_id, texto, destaque_ate, criado_por, criada_em, versao,
                                  atualizado_em, excluida_em, excluida_por) values
  ('a2000000-0000-7000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', null, 'Pomada só à noite', null,
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '2 days', 1, now() - interval '2 days', null, null),
  ('a2000000-0000-7000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'bebe0000-0000-4000-8000-000000000001',
   'Nota do B', now() + interval '1 day',
   'aaaaaaaa-0000-4000-8000-000000000002', now() - interval '2 days', 1, now() - interval '2 days', null, null),
  ('a2000000-0000-7000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', null, 'Nota apagada', null,
   'aaaaaaaa-0000-4000-8000-000000000004', now() - interval '3 days', 2, now() - interval '1 hour',
   now() - interval '1 hour', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('a2000000-0000-7000-8000-000000000010', 'ffffffff-0000-4000-8000-000000000003', null, 'Nota do X', null,
   'aaaaaaaa-0000-4000-8000-000000000007', now() - interval '1 day', 1, now() - interval '1 day', null, null),
  ('a2000000-0000-7000-8000-000000000011', 'ffffffff-0000-4000-8000-000000000003', null, 'Nota do A, cuidador', null,
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '1 day', 1, now() - interval '1 day', null, null),
  ('a2000000-0000-7000-8000-000000000020', 'ffffffff-0000-4000-8000-000000000004', null, 'Nota do A, que saiu', null,
   'aaaaaaaa-0000-4000-8000-000000000001', now() - interval '5 days', 1, now() - interval '5 days', null, null),
  ('a2000000-0000-7000-8000-000000000021', 'ffffffff-0000-4000-8000-000000000004', null, 'Nota do Y', null,
   'aaaaaaaa-0000-4000-8000-000000000010', now() - interval '5 days', 1, now() - interval '5 days', null, null);

alter table public.registros enable trigger registros_campos_do_servidor;
alter table public.notas_cuidado enable trigger notas_campos_do_servidor;

select set_config('teste.foto',
  (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
  || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c) || '/'
  || (select md5(string_agg(b::text, '|' order by b.id)) from public.bebes b) || '/'
  || (select md5(string_agg(f::text, '|' order by f.id)) from public.familias f) || '/'
  || (select md5(string_agg(t::text, '|' order by t.id)) from public.contas t) || '/'
  || (select md5(string_agg(r::text, '|' order by r.id)) from public.registros r) || '/'
  || (select md5(string_agg(n::text, '|' order by n.id)) from public.notas_cuidado n), true);

-- Responsável com várias famílias.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok($$select set_config('teste.a', public.exportar_dados()::text, true)$$, 'responsável exporta os dados');

select is(
  public.exportar_dados()::text,
  current_setting('teste.a'),
  'duas exportações seguidas na mesma transação são idênticas'
);

reset role;

select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb),
  array['conta', 'familias', 'formato', 'gerado_em', 'notas', 'registros', 'vinculos'],
  'o resultado tem exatamente as sete chaves do topo'
);
select is(current_setting('teste.a')::jsonb ->> 'formato', 'appmaternidade-exportacao-v1', 'formato');
select is(current_setting('teste.a')::jsonb ->> 'gerado_em', pg_temp.utc(now()), 'gerado_em é agora, em UTC');

select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'conta'),
  array['criada_em', 'email', 'fuso', 'id', 'nome_privado'],
  'conta tem exatamente id, email, nome_privado, fuso e criada_em'
);
select is(
  current_setting('teste.a')::jsonb -> 'conta',
  jsonb_build_object('id', 'aaaaaaaa-0000-4000-8000-000000000001', 'email', 'a@exemplo.invalid',
                     'nome_privado', 'A', 'fuso', 'America/Sao_Paulo', 'criada_em', '2026-01-02T03:04:05.000000Z'),
  'conta traz o e-mail de auth.users e a data em UTC no formato do JSON'
);

-- Vínculos: todos os do chamador, em qualquer estado, por criado_em e depois id.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'vinculos', 'familia_id'),
  array['ffffffff-0000-4000-8000-000000000004', 'ffffffff-0000-4000-8000-000000000001',
        'ffffffff-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000003'],
  'vinculos traz os quatro vínculos de A, em qualquer estado, ordenados por criado_em e depois id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'vinculos' -> 0),
  array['criado_em', 'encerrado_em', 'epoca', 'estado', 'familia_id', 'papel', 'valido_ate'],
  'cada vínculo tem exatamente as sete chaves'
);
select is(
  current_setting('teste.a')::jsonb -> 'vinculos' -> 0,
  jsonb_build_object('familia_id', 'ffffffff-0000-4000-8000-000000000004', 'papel', 'responsavel', 'estado', 'saiu',
                     'valido_ate', null, 'epoca', 2, 'criado_em', pg_temp.utc(now() - interval '20 days'),
                     'encerrado_em', pg_temp.utc(now() - interval '2 days')),
  'vínculo de quem saiu: estado, época, encerrado_em e valido_ate nulo como null do JSON'
);
select is(
  current_setting('teste.a')::jsonb -> 'vinculos' -> 3 ->> 'valido_ate',
  pg_temp.utc(now() + interval '60 days'),
  'valido_ate sai em UTC no formato do JSON'
);

-- Famílias: só onde o chamador é responsável ativo.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'familias', 'id'),
  array['ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000002'],
  'familias traz só as famílias onde A é responsável ativo, por criada_em e depois id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'familias' -> 0),
  array['bebes', 'convites', 'criada_em', 'fuso', 'id', 'membros', 'nome', 'notas', 'registros'],
  'cada família tem exatamente as nove chaves'
);
select is(
  (current_setting('teste.a')::jsonb -> 'familias' -> 1) - 'criada_em',
  jsonb_build_object('id', 'ffffffff-0000-4000-8000-000000000002', 'nome', 'Família 2', 'fuso', 'America/Manaus',
    'membros', jsonb_build_array(jsonb_build_object('conta_id', 'aaaaaaaa-0000-4000-8000-000000000001',
                                                    'nome_privado', 'A', 'papel', 'responsavel', 'valido_ate', null)),
    'bebes', '[]'::jsonb, 'convites', '[]'::jsonb, 'registros', '[]'::jsonb, 'notas', '[]'::jsonb),
  'a família 2 sai com membros e listas vazias como [] e nunca nulas, registros e notas inclusive'
);
select is(
  current_setting('teste.a')::jsonb -> 'familias' -> 0 ->> 'criada_em',
  pg_temp.utc(now() - interval '30 days'),
  'criada_em da família sai em UTC no formato do JSON'
);

-- Membros: só vínculos ativos, por criado_em do vínculo e depois conta_id.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'membros', 'conta_id'),
  array['aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004',
        'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003'],
  'membros traz só os ativos (sem o revogado nem o vencido), por criado_em e depois conta_id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'membros' -> 0),
  array['conta_id', 'nome_privado', 'papel', 'valido_ate'],
  'cada membro tem exatamente conta_id, nome_privado, papel e valido_ate'
);
select is(
  current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'membros' -> 2,
  jsonb_build_object('conta_id', 'aaaaaaaa-0000-4000-8000-000000000002', 'nome_privado', 'B', 'papel', 'cuidador',
                     'valido_ate', pg_temp.utc(now() + interval '5 days')),
  'membro com validade traz o nome privado, o papel e a validade em UTC'
);

-- Bebês: todos, inclusive o arquivado, por criado_em e depois id.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'bebes', 'nome'),
  array['Arquivado', 'Teo', 'Lia'],
  'bebes traz todos os bebês, por criado_em e depois id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'bebes' -> 0),
  array['criado_em', 'estado', 'id', 'nascimento', 'nome'],
  'cada bebê tem exatamente id, nome, nascimento, estado e criado_em'
);
select is(
  current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'bebes' -> 0,
  jsonb_build_object('id', 'bebe0000-0000-4000-8000-000000000003', 'nome', 'Arquivado', 'nascimento', '2025-01-31',
                     'estado', 'arquivado', 'criado_em', pg_temp.utc(now() - interval '4 days')),
  'o nascimento sai como YYYY-MM-DD e o estado do bebê vem junto'
);

-- Convites: todos, sem o hash.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'convites', 'id'),
  array['c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
        'c0000000-0000-4000-8000-000000000003'],
  'convites traz todos, por criado_em e depois id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'convites' -> 0),
  array['aceito_em', 'criado_em', 'estado', 'expira_em', 'id', 'papel', 'vinculo_valido_ate'],
  'cada convite tem exatamente as sete chaves'
);
select is(
  current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'convites' -> 1,
  jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000002', 'papel', 'observador', 'estado', 'aceito',
                     'vinculo_valido_ate', null, 'expira_em', pg_temp.utc(now() + interval '5 days'),
                     'criado_em', pg_temp.utc(now() - interval '2 days'), 'aceito_em', pg_temp.utc(now() - interval '1 day')),
  'convite aceito traz aceito_em e vinculo_valido_ate nulo como null do JSON'
);
select ok(
  current_setting('teste.a') !~ '(codigo_hash|segredo-hash)',
  'nenhuma chave codigo_hash nem valor de hash aparece no resultado'
);
select ok(
  current_setting('teste.a') !~ '(b@exemplo|c@exemplo|d@exemplo|Família 3|Família 4|Bebê da 3|Bebê da 4)',
  'a exportação não traz e-mail de outros nem dados das famílias 3 e 4, onde A não é responsável ativo'
);

-- Registros e notas (RF-13): a família inteira, lixeira inclusive, por recebido_em (registros) e criada_em
-- (notas) e depois id. O que A criou fora das famílias onde é responsável ativo vai para o topo, sem repetir.
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'registros', 'id'),
  array['a1000000-0000-7000-8000-000000000004', 'a1000000-0000-7000-8000-000000000001',
        'a1000000-0000-7000-8000-000000000002', 'a1000000-0000-7000-8000-000000000003'],
  'registros da família 1: todos os autores, a lixeira inclusive, por recebido_em e depois id'
);
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'notas', 'id'),
  array['a2000000-0000-7000-8000-000000000003', 'a2000000-0000-7000-8000-000000000001',
        'a2000000-0000-7000-8000-000000000002'],
  'notas da família 1: todas, a lixeira inclusive, por criada_em e depois id'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'registros' -> 0),
  array['atualizado_em', 'bebe_id', 'criado_por', 'deslocamento_min', 'detalhes', 'encerrado_por', 'excluido_em',
        'excluido_por', 'familia_id', 'fim', 'fuso', 'id', 'inicio', 'nota', 'origem', 'recebido_em', 'tipo', 'versao'],
  'cada registro tem exatamente as dezoito chaves'
);
select is(
  pg_temp.chaves(current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'notas' -> 0),
  array['atualizado_em', 'bebe_id', 'criada_em', 'criado_por', 'destaque_ate', 'excluida_em', 'excluida_por',
        'familia_id', 'id', 'texto', 'versao'],
  'cada nota tem exatamente as onze chaves'
);
select is(
  current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'notas' -> 0,
  jsonb_build_object('id', 'a2000000-0000-7000-8000-000000000003', 'familia_id', 'ffffffff-0000-4000-8000-000000000001',
                     'bebe_id', null, 'texto', 'Nota apagada', 'destaque_ate', null,
                     'criado_por', 'aaaaaaaa-0000-4000-8000-000000000004', 'criada_em', pg_temp.utc(now() - interval '3 days'),
                     'versao', 2, 'atualizado_em', pg_temp.utc(now() - interval '1 hour'),
                     'excluida_em', pg_temp.utc(now() - interval '1 hour'),
                     'excluida_por', 'aaaaaaaa-0000-4000-8000-000000000001'),
  'a nota na lixeira sai com excluida_em, excluida_por, a versão e as datas em UTC no formato do JSON'
);
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'registros', 'id'),
  array['a1000000-0000-7000-8000-000000000020', 'a1000000-0000-7000-8000-000000000011'],
  'registros do topo: só os que A criou onde não é responsável ativo (famílias 4 e 3), sem repetir os de familias[]'
);
select is(
  pg_temp.ids(current_setting('teste.a')::jsonb -> 'notas', 'id'),
  array['a2000000-0000-7000-8000-000000000020', 'a2000000-0000-7000-8000-000000000011'],
  'notas do topo: só as que A criou onde não é responsável ativo (famílias 4 e 3), sem repetir as de familias[]'
);
select is(
  current_setting('teste.a')::jsonb -> 'registros' -> 0 ->> 'familia_id',
  'ffffffff-0000-4000-8000-000000000004',
  'A, que saiu da família 4, recebe no topo o registro que criou nela'
);
select ok(
  current_setting('teste.a') !~ '(a1000000-0000-7000-8000-0000000000(10|21)|a2000000-0000-7000-8000-0000000000(10|21)|Nota do X|Nota do Y)',
  'itens de outros autores nas famílias 3 e 4 nunca aparecem para A'
);

-- Cuidador, observador, ex-membro, vencido e conta sem vínculo: só a conta e os próprios vínculos.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select set_config('teste.b', public.exportar_dados()::text, true)$$, 'cuidador exporta os dados');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
select lives_ok($$select set_config('teste.c', public.exportar_dados()::text, true)$$, 'observador exporta os dados');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';
select lives_ok($$select set_config('teste.d', public.exportar_dados()::text, true)$$, 'outro responsável da família 1 exporta os dados');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}';
select lives_ok($$select set_config('teste.e', public.exportar_dados()::text, true)$$, 'ex-membro revogado exporta os dados');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';
select lives_ok($$select set_config('teste.f', public.exportar_dados()::text, true)$$, 'responsável com validade vencida exporta os dados');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000008", "role": "authenticated"}';
select lives_ok($$select set_config('teste.h', public.exportar_dados()::text, true)$$, 'conta sem vínculo exporta os dados');
reset role;

select is(
  current_setting('teste.b')::jsonb -> 'familias', '[]'::jsonb,
  'cuidador não recebe dados da família'
);
select is(
  pg_temp.ids(current_setting('teste.b')::jsonb -> 'vinculos', 'familia_id'),
  array['ffffffff-0000-4000-8000-000000000001'],
  'cuidador recebe só o próprio vínculo'
);
select is(
  current_setting('teste.b')::jsonb -> 'vinculos' -> 0,
  jsonb_build_object('familia_id', 'ffffffff-0000-4000-8000-000000000001', 'papel', 'cuidador', 'estado', 'ativo',
                     'valido_ate', pg_temp.utc(now() + interval '5 days'), 'epoca', 1,
                     'criado_em', pg_temp.utc(now() - interval '9 days'), 'encerrado_em', null),
  'o vínculo do cuidador traz familia_id, papel, estado e as outras colunas dele'
);
select ok(
  current_setting('teste.b') !~ '(A@|"nome_privado": "A"|Teo|Lia|Família 1|segredo)'
  and current_setting('teste.b')::jsonb -> 'conta' ->> 'email' = 'b@exemplo.invalid',
  'cuidador não recebe nome da família, bebês, convites nem nomes de outros membros'
);
select is(current_setting('teste.c')::jsonb -> 'familias', '[]'::jsonb, 'observador não recebe dados da família');
select is(
  pg_temp.ids(current_setting('teste.c')::jsonb -> 'vinculos', 'papel'), array['observador'],
  'observador recebe só o próprio vínculo'
);
select is(current_setting('teste.e')::jsonb -> 'familias', '[]'::jsonb, 'ex-membro revogado não recebe dados da família');
select is(
  pg_temp.ids(current_setting('teste.e')::jsonb -> 'vinculos', 'estado'), array['revogado'],
  'ex-membro recebe o próprio vínculo revogado'
);
select is(current_setting('teste.f')::jsonb -> 'familias', '[]'::jsonb,
  'responsável com validade vencida não recebe dados da família');
select is(
  pg_temp.ids(current_setting('teste.f')::jsonb -> 'vinculos', 'estado'), array['ativo'],
  'responsável vencido recebe só o próprio vínculo'
);
select is(
  current_setting('teste.h')::jsonb -> 'vinculos', '[]'::jsonb,
  'conta sem vínculo recebe vinculos como [] (nunca nula)'
);
select is(current_setting('teste.h')::jsonb -> 'familias', '[]'::jsonb, 'conta sem vínculo recebe familias como []');
select is(
  jsonb_build_array(current_setting('teste.h')::jsonb -> 'registros', current_setting('teste.h')::jsonb -> 'notas'),
  '[[], []]'::jsonb,
  'conta sem vínculo recebe registros e notas como [] (nunca nulas)'
);
select is(
  jsonb_build_array(current_setting('teste.f')::jsonb -> 'registros', current_setting('teste.f')::jsonb -> 'notas'),
  '[[], []]'::jsonb,
  'responsável com validade vencida, que não criou itens, recebe registros e notas como []'
);

-- Resultado inteiro de quem não é responsável ativo (cuidador B, observador C, vínculo revogado E):
-- as chaves exatas, familias vazia, só os próprios vínculos, e nenhum dado de família, bebê, convite
-- nem de outra conta no texto. O familia_id do próprio vínculo pode aparecer.
create function pg_temp.vaza(doc text, propria int) returns boolean language sql as $$
  select doc ~ '(Família|bebe0000|c0000000|codigo_hash|segredo|Teo|Lia|Arquivado|Bebê)'
      or exists (
        select 1 from generate_series(1, 10) n
         where n <> propria
           and doc like ('%aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0') || '%')
      );
$$;

-- Itens do próprio autor (RF-13): o texto deles leva o familia_id e o bebe_id dos itens, então o teste de
-- vazamento do texto inteiro (vaza) olha o resto e o dos itens (vaza_itens) não procura o id do bebê.
create function pg_temp.vaza_itens(doc text, propria int) returns boolean language sql as $$
  select doc ~ '(Família|c0000000|codigo_hash|segredo|Teo|Lia|Arquivado|Bebê)'
      or exists (
        select 1 from generate_series(1, 10) n
         where n <> propria
           and doc like ('%aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0') || '%')
      );
$$;

select is(
  current_setting('teste.b')::jsonb - 'gerado_em',
  jsonb_build_object(
    'formato', 'appmaternidade-exportacao-v1',
    'conta', jsonb_build_object('id', 'aaaaaaaa-0000-4000-8000-000000000002', 'email', 'b@exemplo.invalid',
                                'nome_privado', 'B', 'fuso', 'America/Sao_Paulo', 'criada_em', '2026-01-02T03:04:05.000000Z'),
    'vinculos', jsonb_build_array(jsonb_build_object(
      'familia_id', 'ffffffff-0000-4000-8000-000000000001', 'papel', 'cuidador', 'estado', 'ativo',
      'valido_ate', pg_temp.utc(now() + interval '5 days'), 'epoca', 1,
      'criado_em', pg_temp.utc(now() - interval '9 days'), 'encerrado_em', null)),
    'familias', '[]'::jsonb,
    'registros', jsonb_build_array(
      jsonb_build_object(
        'id', 'a1000000-0000-7000-8000-000000000002', 'familia_id', 'ffffffff-0000-4000-8000-000000000001',
        'bebe_id', 'bebe0000-0000-4000-8000-000000000002', 'tipo', 'sono',
        'inicio', pg_temp.utc(now() - interval '2 days 10 minutes'), 'fim', null, 'detalhes', '{}'::jsonb, 'nota', null,
        'origem', 'ao_vivo', 'fuso', 'America/Sao_Paulo', 'deslocamento_min', -180,
        'criado_por', 'aaaaaaaa-0000-4000-8000-000000000002', 'encerrado_por', null, 'versao', 1,
        'recebido_em', pg_temp.utc(now() - interval '2 days'), 'atualizado_em', pg_temp.utc(now() - interval '2 days'),
        'excluido_em', null, 'excluido_por', null),
      jsonb_build_object(
        'id', 'a1000000-0000-7000-8000-000000000003', 'familia_id', 'ffffffff-0000-4000-8000-000000000001',
        'bebe_id', 'bebe0000-0000-4000-8000-000000000001', 'tipo', 'observacao',
        'inicio', pg_temp.utc(now() - interval '1 day 1 hour'), 'fim', null, 'detalhes', '{}'::jsonb,
        'nota', 'Observação do B', 'origem', 'retroativo', 'fuso', 'America/Manaus', 'deslocamento_min', -240,
        'criado_por', 'aaaaaaaa-0000-4000-8000-000000000002', 'encerrado_por', null, 'versao', 3,
        'recebido_em', pg_temp.utc(now() - interval '1 day'), 'atualizado_em', pg_temp.utc(now() - interval '12 hours'),
        'excluido_em', pg_temp.utc(now() - interval '12 hours'), 'excluido_por', 'aaaaaaaa-0000-4000-8000-000000000002')),
    'notas', jsonb_build_array(jsonb_build_object(
      'id', 'a2000000-0000-7000-8000-000000000002', 'familia_id', 'ffffffff-0000-4000-8000-000000000001',
      'bebe_id', 'bebe0000-0000-4000-8000-000000000001', 'texto', 'Nota do B',
      'destaque_ate', pg_temp.utc(now() + interval '1 day'), 'criado_por', 'aaaaaaaa-0000-4000-8000-000000000002',
      'criada_em', pg_temp.utc(now() - interval '2 days'), 'versao', 1,
      'atualizado_em', pg_temp.utc(now() - interval '2 days'), 'excluida_em', null, 'excluida_por', null))),
  'cuidador: o resultado inteiro tem a conta, o próprio vínculo, familias = [] e só os registros e notas que ele criou'
);
select is(
  pg_temp.vaza((current_setting('teste.b')::jsonb - 'registros' - 'notas')::text, 2), false,
  'cuidador: fora dos próprios itens, o texto não traz família, bebê, convite, codigo_hash nem outra conta');
select is(
  pg_temp.vaza_itens(((current_setting('teste.b')::jsonb -> 'registros') || (current_setting('teste.b')::jsonb -> 'notas'))::text, 2),
  false,
  'cuidador: os próprios itens não trazem nome de família ou de bebê, convite, codigo_hash nem outra conta');
select is(
  current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'registros' -> 3,
  current_setting('teste.b')::jsonb -> 'registros' -> 1,
  'o registro do B na lixeira sai igual na família do responsável e no topo do cuidador');

-- Outro responsável da família 1 recebe a mesma família; o que criou nela não se repete no topo.
select is(
  current_setting('teste.d')::jsonb -> 'familias' -> 0 -> 'registros',
  current_setting('teste.a')::jsonb -> 'familias' -> 0 -> 'registros',
  'D, responsável da família 1, recebe os mesmos registros que A, o dele inclusive'
);
select is(
  jsonb_build_array(current_setting('teste.d')::jsonb -> 'registros', current_setting('teste.d')::jsonb -> 'notas'),
  '[[], []]'::jsonb,
  'D criou itens só na família 1, que já vai em familias[]: registros e notas do topo = []'
);

select is(
  current_setting('teste.c')::jsonb - 'gerado_em',
  jsonb_build_object(
    'formato', 'appmaternidade-exportacao-v1',
    'conta', jsonb_build_object('id', 'aaaaaaaa-0000-4000-8000-000000000003', 'email', 'c@exemplo.invalid',
                                'nome_privado', 'C', 'fuso', 'America/Sao_Paulo', 'criada_em', '2026-01-02T03:04:05.000000Z'),
    'vinculos', jsonb_build_array(jsonb_build_object(
      'familia_id', 'ffffffff-0000-4000-8000-000000000001', 'papel', 'observador', 'estado', 'ativo',
      'valido_ate', null, 'epoca', 1,
      'criado_em', pg_temp.utc(now() - interval '8 days'), 'encerrado_em', null)),
    'familias', '[]'::jsonb, 'registros', '[]'::jsonb, 'notas', '[]'::jsonb),
  'observador: o resultado inteiro tem só a conta, o próprio vínculo, familias, registros e notas = []'
);
select is(pg_temp.vaza(current_setting('teste.c'), 3), false,
  'observador: o texto não traz família, bebê, convite, codigo_hash nem outra conta');

select is(
  current_setting('teste.e')::jsonb - 'gerado_em',
  jsonb_build_object(
    'formato', 'appmaternidade-exportacao-v1',
    'conta', jsonb_build_object('id', 'aaaaaaaa-0000-4000-8000-000000000005', 'email', 'e@exemplo.invalid',
                                'nome_privado', 'E', 'fuso', 'America/Sao_Paulo', 'criada_em', '2026-01-02T03:04:05.000000Z'),
    'vinculos', jsonb_build_array(jsonb_build_object(
      'familia_id', 'ffffffff-0000-4000-8000-000000000001', 'papel', 'cuidador', 'estado', 'revogado',
      'valido_ate', null, 'epoca', 2,
      'criado_em', pg_temp.utc(now() - interval '7 days'), 'encerrado_em', pg_temp.utc(now() - interval '1 day'))),
    'familias', '[]'::jsonb, 'registros', '[]'::jsonb, 'notas', '[]'::jsonb),
  'vínculo revogado: o resultado inteiro tem só a conta, o próprio vínculo, familias, registros e notas = []'
);
select is(pg_temp.vaza(current_setting('teste.e'), 5), false,
  'vínculo revogado: o texto não traz família, bebê, convite, codigo_hash nem outra conta');

-- Conta sem linha em contas, anônimo e efeito sobre os dados.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000009", "role": "authenticated"}';
select throws_ok($$select public.exportar_dados()$$, 'P0001', 'conta inexistente', 'conta sem linha em contas');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select public.exportar_dados()$$, '42501', null, 'anon não executa exportar_dados');

reset role;

select is(
  (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
  || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c) || '/'
  || (select md5(string_agg(b::text, '|' order by b.id)) from public.bebes b) || '/'
  || (select md5(string_agg(f::text, '|' order by f.id)) from public.familias f) || '/'
  || (select md5(string_agg(t::text, '|' order by t.id)) from public.contas t) || '/'
  || (select md5(string_agg(r::text, '|' order by r.id)) from public.registros r) || '/'
  || (select md5(string_agg(n::text, '|' order by n.id)) from public.notas_cuidado n),
  current_setting('teste.foto'),
  'exportar não mudou nenhum dado (nem épocas)'
);

-- Exclusão e exportação: o banco apaga em cascata os itens da família excluída e zera a autoria de quem teve a
-- conta excluída (FK set null). Este bloco muda dados, por isso fica depois da conferência da foto.
-- Família 3: X, responsável, a exclui; A, cuidador nela, já não recebe nenhum item dela, nem no topo.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';
select lives_ok($$select public.excluir_familia('ffffffff-0000-4000-8000-000000000003')$$,
  'X, responsável da família 3, exclui a família');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select set_config('teste.a2', public.exportar_dados()::text, true)$$,
  'A exporta os dados depois da exclusão da família 3');
reset role;

select is(
  pg_temp.ids(current_setting('teste.a2')::jsonb -> 'registros', 'id'),
  array['a1000000-0000-7000-8000-000000000020'],
  'depois de excluir a família 3, o topo dos registros de A só tem o da família 4'
);
select is(
  pg_temp.ids(current_setting('teste.a2')::jsonb -> 'notas', 'id'),
  array['a2000000-0000-7000-8000-000000000020'],
  'depois de excluir a família 3, o topo das notas de A só tem a da família 4'
);
select ok(
  current_setting('teste.a2') !~ '(a1000000-0000-7000-8000-0000000000(10|11)|a2000000-0000-7000-8000-0000000000(10|11)|Nota do X|Nota do A, cuidador)',
  'nenhum item da família 3 excluída aparece na exportação'
);

-- Conta do cuidador B excluída: os itens dele ficam na família 1 com a autoria nula, e A (responsável) os recebe.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok($$select public.excluir_conta()$$, 'o cuidador B exclui a conta');
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok($$select set_config('teste.a3', public.exportar_dados()::text, true)$$,
  'A exporta os dados depois da exclusão da conta de B');
reset role;

select is(
  pg_temp.ids(current_setting('teste.a3')::jsonb -> 'familias' -> 0 -> 'registros', 'id'),
  array['a1000000-0000-7000-8000-000000000004', 'a1000000-0000-7000-8000-000000000001',
        'a1000000-0000-7000-8000-000000000002', 'a1000000-0000-7000-8000-000000000003'],
  'os registros da família 1 continuam todos na exportação de A depois da exclusão da conta de B'
);
select is(
  current_setting('teste.a3')::jsonb -> 'familias' -> 0 -> 'registros' -> 2 -> 'criado_por', 'null'::jsonb,
  'o registro que B criou sai com criado_por nulo'
);
select is(
  current_setting('teste.a3')::jsonb -> 'familias' -> 0 -> 'registros' -> 3 -> 'criado_por', 'null'::jsonb,
  'o registro que B criou e excluiu sai com criado_por nulo'
);
select is(
  current_setting('teste.a3')::jsonb -> 'familias' -> 0 -> 'registros' -> 3 -> 'excluido_por', 'null'::jsonb,
  'o registro que B excluiu sai com excluido_por nulo'
);
select is(
  current_setting('teste.a3')::jsonb -> 'familias' -> 0 -> 'notas' -> 2 -> 'criado_por', 'null'::jsonb,
  'a nota que B criou sai com criado_por nulo'
);
select ok(
  current_setting('teste.a3') !~ 'aaaaaaaa-0000-4000-8000-000000000002',
  'o id da conta excluída de B não aparece em lugar nenhum da exportação de A'
);

select * from finish();
rollback;
