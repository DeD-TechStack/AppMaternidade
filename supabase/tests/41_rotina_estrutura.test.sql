begin;
create extension if not exists pgtap with schema extensions;

select plan(130);

-- Fixture: uma família, um responsável (...01) e um bebê.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'resp@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Responsável');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

create temp sequence seq_id;

-- Insert direto como dono, para provar os checks da tabela (a função só repassa o erro).
create function pg_temp.grava(
  tipo public.tipo_registro, detalhes jsonb default '{}', nota text default null,
  fim timestamptz default null, desloc int default -180, id uuid default null,
  fuso text default 'America/Sao_Paulo'
) returns void language sql as $$
  insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fim, detalhes, nota, fuso, deslocamento_min)
  values (
    coalesce(id, ('019a0000-0000-7000-8000-' || lpad(to_hex(nextval('pg_temp.seq_id')), 12, '0'))::uuid),
    'ffffffff-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001',
    tipo, '2026-11-01 10:00+00', fim, detalhes, nota, fuso, desloc
  );
$$;

-- Grava pelo gravar_registro, como a tela faria (n em hexadecimal compõe o id v7).
create function pg_temp.via_funcao(n int, tipo public.tipo_registro, detalhes jsonb, nota text default null)
returns void language plpgsql as $$
begin
  perform public.gravar_registro(
    ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid,
    'bbbbbbbb-0000-4000-8000-000000000001', tipo, '2026-11-01 10:00+00', 'America/Sao_Paulo', -180,
    null, detalhes, nota);
end;
$$;

-- Enums.
select enum_has_labels('public', 'tipo_registro',
  array['sono', 'mamada', 'mamadeira', 'fralda', 'tummy', 'solido', 'observacao'],
  'tipo_registro tem os 7 tipos');
select enum_has_labels('public', 'origem_registro', array['ao_vivo', 'retroativo'], 'origem_registro');
select enum_has_labels('public', 'operacao_registro',
  array['criacao', 'edicao', 'exclusao', 'restauracao'], 'operacao_registro');

-- Colunas.
select columns_are('public', 'registros', array[
  'id', 'familia_id', 'bebe_id', 'tipo', 'inicio', 'fim', 'detalhes', 'nota', 'origem', 'fuso',
  'deslocamento_min', 'criado_por', 'encerrado_por', 'versao', 'recebido_em', 'atualizado_em',
  'excluido_em', 'excluido_por'], 'colunas de registros');
select columns_are('public', 'registro_alteracoes', array[
  'id', 'registro_id', 'familia_id', 'operacao', 'autor', 'antes', 'depois', 'versao', 'recebida_em'],
  'colunas de registro_alteracoes');
select columns_are('public', 'notas_cuidado', array[
  'id', 'familia_id', 'bebe_id', 'texto', 'destaque_ate', 'criado_por', 'criada_em', 'versao',
  'atualizado_em', 'excluida_em', 'excluida_por'], 'colunas de notas_cuidado');

-- Só as colunas do texto aceitam nulo.
select is(
  (select array_agg(attname::text order by attname) from pg_attribute
    where attrelid = 'public.registros'::regclass and attnum > 0 and not attisdropped and not attnotnull),
  array['criado_por', 'encerrado_por', 'excluido_em', 'excluido_por', 'fim', 'nota'],
  'registros: só fim, nota e as colunas de autoria e exclusão aceitam nulo');
select is(
  (select array_agg(attname::text order by attname) from pg_attribute
    where attrelid = 'public.registro_alteracoes'::regclass and attnum > 0 and not attisdropped and not attnotnull),
  array['antes', 'autor', 'depois'],
  'registro_alteracoes: só antes, depois e autor aceitam nulo');
select is(
  (select array_agg(attname::text order by attname) from pg_attribute
    where attrelid = 'public.notas_cuidado'::regclass and attnum > 0 and not attisdropped and not attnotnull),
  array['bebe_id', 'criado_por', 'destaque_ate', 'excluida_em', 'excluida_por'],
  'notas_cuidado: só bebe, autoria, destaque e exclusão aceitam nulo');

-- Chaves e ids.
select col_is_pk('public', 'registros', 'id', 'registros: id é a chave primária');
select col_is_pk('public', 'registro_alteracoes', 'id', 'registro_alteracoes: id é a chave primária');
select col_is_pk('public', 'notas_cuidado', 'id', 'notas_cuidado: id é a chave primária');
select col_hasnt_default('public', 'registros', 'id', 'registros.id vem do cliente, sem default (DR-13)');
select col_hasnt_default('public', 'notas_cuidado', 'id', 'notas_cuidado.id vem do cliente, sem default (DR-13)');
select col_has_default('public', 'registro_alteracoes', 'id', 'registro_alteracoes.id nasce no servidor');
select is(
  (select count(*)::int from pg_attribute a
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid in ('public.registros'::regclass, 'public.registro_alteracoes'::regclass, 'public.notas_cuidado'::regclass)
      and a.attnum > 0 and not a.attisdropped
      and (a.attidentity <> '' or pg_get_expr(d.adbin, d.adrelid) like 'nextval%')),
  0,
  'nenhuma coluna serial ou identity');

-- Chaves estrangeiras: cascata na família e no bebê, set null nas contas (DR-19 e DR-21).
select is(
  (select string_agg(x, ',' order by x)
     from (select (select relname from pg_class where oid = confrelid) || ':' || confdeltype::text as x
             from pg_constraint where conrelid = 'public.registros'::regclass and contype = 'f') q),
  'bebes:c,contas:n,contas:n,contas:n,familias:c',
  'registros: cascata em bebê e família, set null nas 3 colunas de conta');
select is(
  (select string_agg(x, ',' order by x)
     from (select (select relname from pg_class where oid = confrelid) || ':' || confdeltype::text as x
             from pg_constraint where conrelid = 'public.registro_alteracoes'::regclass and contype = 'f') q),
  'contas:n,familias:c,registros:c',
  'registro_alteracoes: cascata em registro e família, set null no autor');
select is(
  (select string_agg(x, ',' order by x)
     from (select (select relname from pg_class where oid = confrelid) || ':' || confdeltype::text as x
             from pg_constraint where conrelid = 'public.notas_cuidado'::regclass and contype = 'f') q),
  'bebes:c,contas:n,contas:n,familias:c',
  'notas_cuidado: cascata em bebê e família, set null nas 2 colunas de conta');
select is(
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'bebes_id_familia_key'),
  'UNIQUE (id, familia_id)',
  'bebes tem unique (id, familia_id) para a chave composta (DR-14)');

-- Índices.
select has_index('public', 'registros', 'registros_bebe_id_inicio_idx', array['bebe_id', 'inicio'], 'índice registros (bebe_id, inicio)');
select has_index('public', 'registros', 'registros_familia_id_atualizado_em_idx', array['familia_id', 'atualizado_em'], 'índice registros (familia_id, atualizado_em)');
select has_index('public', 'registro_alteracoes', 'registro_alteracoes_registro_id_idx', array['registro_id'], 'índice registro_alteracoes (registro_id)');
select has_index('public', 'notas_cuidado', 'notas_cuidado_familia_id_atualizado_em_idx', array['familia_id', 'atualizado_em'], 'índice notas_cuidado (familia_id, atualizado_em)');

-- RLS ligada, sem force.
select ok((select relrowsecurity and not relforcerowsecurity from pg_class where oid = 'public.registros'::regclass), 'registros: RLS ligada sem force');
select ok((select relrowsecurity and not relforcerowsecurity from pg_class where oid = 'public.registro_alteracoes'::regclass), 'registro_alteracoes: RLS ligada sem force');
select ok((select relrowsecurity and not relforcerowsecurity from pg_class where oid = 'public.notas_cuidado'::regclass), 'notas_cuidado: RLS ligada sem force');

-- Grants: o cliente só lê; anon não tem nada (DR-11).
select table_privs_are('public', 'registros', 'authenticated', array['SELECT'], 'registros: authenticated só tem select');
select table_privs_are('public', 'registro_alteracoes', 'authenticated', array['SELECT'], 'registro_alteracoes: authenticated só tem select');
select table_privs_are('public', 'notas_cuidado', 'authenticated', array['SELECT'], 'notas_cuidado: authenticated só tem select');
select table_privs_are('public', 'registros', 'anon', array[]::text[], 'registros: anon sem grant');
select table_privs_are('public', 'registro_alteracoes', 'anon', array[]::text[], 'registro_alteracoes: anon sem grant');
select table_privs_are('public', 'notas_cuidado', 'anon', array[]::text[], 'notas_cuidado: anon sem grant');

-- UUID versão 7 com variante RFC (invariante 8).
select throws_ok(
  $$select pg_temp.grava('sono', '{}', null, null, -180, '019a0000-0000-6000-8000-000000000901')$$,
  '23514', 'new row for relation "registros" violates check constraint "registros_id_uuidv7_check"',
  'registro: id com versão 6 é recusado');
select throws_ok(
  $$select pg_temp.grava('sono', '{}', null, null, -180, '019a0000-0000-7000-c000-000000000902')$$,
  '23514', 'new row for relation "registros" violates check constraint "registros_id_uuidv7_check"',
  'registro: id com variante c é recusado');
select lives_ok(
  $$select pg_temp.grava('sono', '{}', null, null, -180, '019a0000-0000-7000-b000-000000000903')$$,
  'registro: id v7 com variante b é aceito');
select lives_ok(
  $$select pg_temp.grava('sono', '{}', null, null, -180, '019a0000-0000-7000-8000-000000000904')$$,
  'registro: id v7 com variante 8 é aceito');
select throws_ok(
  $$insert into public.notas_cuidado (id, familia_id, texto)
    values ('019b0000-0000-4000-8000-000000000901', 'ffffffff-0000-4000-8000-000000000001', 'x')$$,
  '23514', 'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_id_uuidv7_check"',
  'nota: id com versão 4 é recusado');
select throws_ok(
  $$insert into public.notas_cuidado (id, familia_id, texto)
    values ('019b0000-0000-7000-0000-000000000902', 'ffffffff-0000-4000-8000-000000000001', 'x')$$,
  '23514', 'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_id_uuidv7_check"',
  'nota: id com variante 0 é recusado');

-- Detalhes por tipo (DR-02 e DR-03). Todos recusados dão o mesmo check.
-- sono
select lives_ok($$select pg_temp.grava('sono', '{}')$$, 'sono: {} é aceito');
select throws_ok($$select pg_temp.grava('sono', '{"x": 1}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'sono: chave extra é recusada');
-- detalhes que não é objeto
select throws_ok($$select pg_temp.grava('sono', '[]')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'detalhes: array é recusado');
select throws_ok($$select pg_temp.grava('sono', '"x"')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'detalhes: string é recusada');
select throws_ok($$select pg_temp.grava('sono', 'null')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'detalhes: JSON null é recusado');
-- mamada
select lives_ok($$select pg_temp.grava('mamada', '{}')$$, 'mamada: {} é aceito');
select lives_ok($$select pg_temp.grava('mamada', '{"lado": "ambos"}')$$, 'mamada: lado ambos é aceito');
select throws_ok($$select pg_temp.grava('mamada', '{"lado": "cima"}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamada: lado fora da lista é recusado');
select throws_ok($$select pg_temp.grava('mamada', '{"lado": 1}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamada: lado numérico é recusado');
select throws_ok($$select pg_temp.grava('mamada', '{"lado": null}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamada: lado nulo é recusado');
select throws_ok($$select pg_temp.grava('mamada', '{"ml": 90}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamada: chave de outro tipo é recusada');
-- mamadeira
select lives_ok($$select pg_temp.grava('mamadeira', '{}')$$, 'mamadeira: {} é aceito');
select lives_ok($$select pg_temp.grava('mamadeira', '{"ml": 1}')$$, 'mamadeira: ml 1 é aceito');
select lives_ok($$select pg_temp.grava('mamadeira', '{"ml": 500, "conteudo": "formula"}')$$, 'mamadeira: ml 500 e fórmula são aceitos');
select lives_ok($$select pg_temp.grava('mamadeira', '{"conteudo": "leite_materno"}')$$, 'mamadeira: só o conteúdo é aceito');
select throws_ok($$select pg_temp.grava('mamadeira', '{"ml": 0}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamadeira: ml 0 é recusado');
select throws_ok($$select pg_temp.grava('mamadeira', '{"ml": 501}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamadeira: ml 501 é recusado');
select throws_ok($$select pg_temp.grava('mamadeira', '{"ml": 90.0}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamadeira: ml 90.0 é recusado');
select throws_ok($$select pg_temp.grava('mamadeira', '{"ml": "90"}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamadeira: ml em texto é recusado');
select throws_ok($$select pg_temp.grava('mamadeira', '{"ml": 1.5}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamadeira: ml 1.5 é recusado');
select throws_ok($$select pg_temp.grava('mamadeira', '{"ml": -5}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamadeira: ml negativo é recusado');
select throws_ok($$select pg_temp.grava('mamadeira', '{"ml": 1000}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamadeira: ml de 4 dígitos é recusado');
select throws_ok($$select pg_temp.grava('mamadeira', '{"ml": 99999999999}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamadeira: ml enorme é recusado sem estourar o inteiro');
select throws_ok($$select pg_temp.grava('mamadeira', '{"conteudo": "leite"}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamadeira: conteúdo fora da lista é recusado');
select throws_ok($$select pg_temp.grava('mamadeira', '{"lado": "esquerdo"}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'mamadeira: chave de outro tipo é recusada');
-- fralda
select lives_ok($$select pg_temp.grava('fralda', '{"conteudo": "xixi"}')$$, 'fralda: xixi é aceito');
select lives_ok($$select pg_temp.grava('fralda', '{"conteudo": "ambos"}')$$, 'fralda: ambos é aceito');
select throws_ok($$select pg_temp.grava('fralda', '{}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'fralda: o conteúdo é obrigatório');
select throws_ok($$select pg_temp.grava('fralda', '{"conteudo": "outro"}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'fralda: conteúdo fora da lista é recusado');
select throws_ok($$select pg_temp.grava('fralda', '{"conteudo": null}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'fralda: conteúdo nulo é recusado');
select throws_ok($$select pg_temp.grava('fralda', '{"conteudo": "xixi", "x": 1}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'fralda: chave extra é recusada');
-- tummy
select lives_ok($$select pg_temp.grava('tummy', '{}')$$, 'tummy: {} é aceito');
select throws_ok($$select pg_temp.grava('tummy', '{"x": 1}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'tummy: chave extra é recusada');
-- solido
select lives_ok($$select pg_temp.grava('solido', '{}')$$, 'solido: {} é aceito');
select lives_ok($$select pg_temp.grava('solido', '{"alimento": "papinha de banana"}')$$, 'solido: alimento é aceito');
select lives_ok($$select pg_temp.grava('solido', jsonb_build_object('alimento', repeat('a', 100)))$$, 'solido: alimento de 100 caracteres é aceito');
select throws_ok($$select pg_temp.grava('solido', '{"alimento": ""}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'solido: alimento vazio é recusado');
select throws_ok($$select pg_temp.grava('solido', '{"alimento": "   "}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'solido: alimento só com espaços é recusado');
select throws_ok($$select pg_temp.grava('solido', jsonb_build_object('alimento', repeat('a', 101)))$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'solido: alimento de 101 caracteres é recusado');
select throws_ok($$select pg_temp.grava('solido', '{"alimento": 5}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'solido: alimento numérico é recusado');
select throws_ok($$select pg_temp.grava('solido', '{"x": "y"}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'solido: chave extra é recusada');
-- observacao
select lives_ok($$select pg_temp.grava('observacao', '{}', 'Dormiu bem.')$$, 'observacao: {} com nota é aceita');
select throws_ok($$select pg_temp.grava('observacao', '{}', null)$$, '23514',
  'new row for relation "registros" violates check constraint "registros_nota_check"', 'observacao: a nota é obrigatória');
select throws_ok($$select pg_temp.grava('observacao', '{"x": 1}', 'Dormiu bem.')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'observacao: chave extra é recusada');

-- Fim.
select lives_ok($$select pg_temp.grava('sono', '{}', null, '2026-11-01 10:00+00')$$, 'sessão com fim igual ao início é aceita');
select throws_ok($$select pg_temp.grava('sono', '{}', null, '2026-11-01 09:59+00')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_fim_check"', 'sessão com fim antes do início é recusada');
select throws_ok($$select pg_temp.grava('fralda', '{"conteudo": "xixi"}', null, '2026-11-01 11:00+00')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_fim_check"', 'pontual (fralda) com fim é recusado');
select throws_ok($$select pg_temp.grava('mamadeira', '{}', null, '2026-11-01 11:00+00')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_fim_check"', 'pontual (mamadeira) com fim é recusado');

-- Nota do registro: de 1 a 500 caracteres depois do btrim.
select throws_ok($$select pg_temp.grava('sono', '{}', '')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_nota_check"', 'nota vazia é recusada');
select throws_ok($$select pg_temp.grava('sono', '{}', '   ')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_nota_check"', 'nota só com espaços é recusada');
select throws_ok($$select pg_temp.grava('sono', '{}', repeat('a', 501))$$, '23514',
  'new row for relation "registros" violates check constraint "registros_nota_check"', 'nota de 501 caracteres é recusada');
select lives_ok($$select pg_temp.grava('sono', '{}', repeat('a', 500))$$, 'nota de 500 caracteres é aceita');

-- Deslocamento de -720 a 840 minutos; o fuso não é validado contra a lista IANA.
select throws_ok($$select pg_temp.grava('sono', '{}', null, null, -721)$$, '23514',
  'new row for relation "registros" violates check constraint "registros_deslocamento_check"', 'deslocamento -721 é recusado');
select throws_ok($$select pg_temp.grava('sono', '{}', null, null, 841)$$, '23514',
  'new row for relation "registros" violates check constraint "registros_deslocamento_check"', 'deslocamento 841 é recusado');
select lives_ok($$select pg_temp.grava('sono', '{}', null, null, -720)$$, 'deslocamento -720 é aceito');
select lives_ok($$select pg_temp.grava('sono', '{}', null, null, 840)$$, 'deslocamento 840 é aceito');
select lives_ok($$select pg_temp.grava('sono', '{}', null, null, -180, null, 'Marte/Olimpo')$$, 'fuso fora da lista IANA é aceito (não é validado)');

-- Texto da nota "Para você saber": de 1 a 500 caracteres depois do btrim.
select throws_ok(
  $$insert into public.notas_cuidado (id, familia_id, texto)
    values ('019b0000-0000-7000-8000-000000000911', 'ffffffff-0000-4000-8000-000000000001', '')$$,
  '23514', 'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_texto_check"',
  'nota: texto vazio é recusado');
select throws_ok(
  $$insert into public.notas_cuidado (id, familia_id, texto)
    values ('019b0000-0000-7000-8000-000000000912', 'ffffffff-0000-4000-8000-000000000001', '   ')$$,
  '23514', 'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_texto_check"',
  'nota: texto só com espaços é recusado');
select throws_ok(
  $$insert into public.notas_cuidado (id, familia_id, texto)
    values ('019b0000-0000-7000-8000-000000000913', 'ffffffff-0000-4000-8000-000000000001', repeat('a', 501))$$,
  '23514', 'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_texto_check"',
  'nota: texto de 501 caracteres é recusado');
select lives_ok(
  $$insert into public.notas_cuidado (id, familia_id, texto)
    values ('019b0000-0000-7000-8000-000000000914', 'ffffffff-0000-4000-8000-000000000001', repeat('a', 500))$$,
  'nota: texto de 500 caracteres é aceito');

-- Horário no futuro (DR-23): a conferência fica nas funções, não em check.
select lives_ok($$select pg_temp.grava('sono', '{}', null, now() + interval '1 day')$$,
  'o check da tabela não compara com now() (a conferência é das funções)');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$select public.gravar_registro('019a0000-0000-7000-8000-000000000f01', 'bbbbbbbb-0000-4000-8000-000000000001',
      'sono', now() + interval '6 minutes', 'America/Sao_Paulo', -180)$$,
  '23514', 'horario no futuro', 'gravar_registro: início 6 minutos no futuro é recusado');
select throws_ok(
  $$select public.gravar_registro('019a0000-0000-7000-8000-000000000f02', 'bbbbbbbb-0000-4000-8000-000000000001',
      'sono', now() - interval '1 hour', 'America/Sao_Paulo', -180, now() + interval '6 minutes')$$,
  '23514', 'horario no futuro', 'gravar_registro: fim 6 minutos no futuro é recusado');
select lives_ok(
  $$select public.gravar_registro('019a0000-0000-7000-8000-000000000f03', 'bbbbbbbb-0000-4000-8000-000000000001',
      'sono', now() + interval '4 minutes', 'America/Sao_Paulo', -180)$$,
  'gravar_registro: início 4 minutos no futuro é tolerado (relógio adiantado)');

-- Padrões com nulo explícito valem o padrão (ROT-05).
select lives_ok(
  $$select public.gravar_registro('019a0000-0000-7000-8000-000000000f04', 'bbbbbbbb-0000-4000-8000-000000000001',
      'sono', now() - interval '1 hour', 'America/Sao_Paulo', -180, null, null, null, null)$$,
  'gravar_registro: detalhes e origem nulos explícitos');

reset role;

select is(
  (select detalhes::text || ' ' || origem::text from public.registros where id = '019a0000-0000-7000-8000-000000000f04'),
  '{} ao_vivo',
  'nulo explícito em detalhes e origem vale o padrão ({} e ao_vivo)');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  public.encerrar_sessao('019a0000-0000-7000-8000-000000000f04', null),
  now(),
  'encerrar_sessao: momento nulo explícito vale now()');

select throws_ok(
  $$select public.gravar_registro('019a0000-0000-7000-8000-000000000f05', 'bbbbbbbb-0000-4000-8000-000000000001',
      null, now() - interval '1 hour', 'America/Sao_Paulo', -180)$$,
  '23502', 'null value in column "tipo" of relation "registros" violates not-null constraint',
  'gravar_registro: tipo nulo dá o 23502 do Postgres');
select throws_ok(
  $$select public.gravar_registro('019a0000-0000-7000-8000-000000000f06', 'bbbbbbbb-0000-4000-8000-000000000001',
      'sono', null, 'America/Sao_Paulo', -180)$$,
  '23502', 'null value in column "inicio" of relation "registros" violates not-null constraint',
  'gravar_registro: início nulo dá o 23502 do Postgres');
select throws_ok(
  $$select public.gravar_registro('019a0000-0000-7000-8000-000000000f07', 'bbbbbbbb-0000-4000-8000-000000000001',
      'sono', now() - interval '1 hour', null, -180)$$,
  '23502', 'null value in column "fuso" of relation "registros" violates not-null constraint',
  'gravar_registro: fuso nulo dá o 23502 do Postgres');

-- UUID pelas funções, como responsável (id v7 entra; v4 e o uuid nulo são Inválidos).
select throws_ok(
  $$select public.gravar_registro('019a0000-0000-4000-8000-000000000a01', 'bbbbbbbb-0000-4000-8000-000000000001',
      'sono', now() - interval '1 hour', 'America/Sao_Paulo', -180)$$,
  '23514', 'new row for relation "registros" violates check constraint "registros_id_uuidv7_check"',
  'gravar_registro: id v4 é recusado');
select throws_ok(
  $$select public.gravar_registro('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000001',
      'sono', now() - interval '1 hour', 'America/Sao_Paulo', -180)$$,
  '23514', 'new row for relation "registros" violates check constraint "registros_id_uuidv7_check"',
  'gravar_registro: id 00000000-0000-0000-0000-000000000000 é recusado');
select lives_ok(
  $$select public.gravar_registro('019a0000-0000-7000-8000-000000000a03', 'bbbbbbbb-0000-4000-8000-000000000001',
      'sono', now() - interval '1 hour', 'America/Sao_Paulo', -180)$$,
  'gravar_registro: id v7 entra');
select throws_ok(
  $$select public.gravar_nota('019b0000-0000-4000-8000-000000000a01', 'ffffffff-0000-4000-8000-000000000001', 'Texto')$$,
  '23514', 'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_id_uuidv7_check"',
  'gravar_nota: id v4 é recusado');
select throws_ok(
  $$select public.gravar_nota('00000000-0000-0000-0000-000000000000', 'ffffffff-0000-4000-8000-000000000001', 'Texto')$$,
  '23514', 'new row for relation "notas_cuidado" violates check constraint "notas_cuidado_id_uuidv7_check"',
  'gravar_nota: id 00000000-0000-0000-0000-000000000000 é recusado');
select lives_ok(
  $$select public.gravar_nota('019b0000-0000-7000-8000-000000000a03', 'ffffffff-0000-4000-8000-000000000001', 'Texto')$$,
  'gravar_nota: id v7 entra');

-- Os 7 tipos pelo gravar_registro, como responsável: o registro válido entra e uma chave a mais é Inválida.
select lives_ok($$select pg_temp.via_funcao(513, 'sono', '{}')$$, 'gravar_registro: sono válido entra');
select throws_ok($$select pg_temp.via_funcao(514, 'sono', '{"x": 1}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'gravar_registro: sono com chave a mais é recusado');
select lives_ok($$select pg_temp.via_funcao(515, 'mamada', '{"lado": "direito"}')$$, 'gravar_registro: mamada válida entra');
select throws_ok($$select pg_temp.via_funcao(516, 'mamada', '{"lado": "direito", "x": 1}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'gravar_registro: mamada com chave a mais é recusada');
select lives_ok($$select pg_temp.via_funcao(517, 'mamadeira', '{"ml": 90, "conteudo": "formula"}')$$, 'gravar_registro: mamadeira válida entra');
select throws_ok($$select pg_temp.via_funcao(518, 'mamadeira', '{"ml": 90, "conteudo": "formula", "x": 1}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'gravar_registro: mamadeira com chave a mais é recusada');
select lives_ok($$select pg_temp.via_funcao(519, 'fralda', '{"conteudo": "xixi"}')$$, 'gravar_registro: fralda válida entra');
select throws_ok($$select pg_temp.via_funcao(520, 'fralda', '{"conteudo": "xixi", "x": 1}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'gravar_registro: fralda com chave a mais é recusada');
select lives_ok($$select pg_temp.via_funcao(521, 'tummy', '{}')$$, 'gravar_registro: tummy válido entra');
select throws_ok($$select pg_temp.via_funcao(522, 'tummy', '{"x": 1}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'gravar_registro: tummy com chave a mais é recusado');
select lives_ok($$select pg_temp.via_funcao(523, 'solido', '{"alimento": "papinha"}')$$, 'gravar_registro: sólido válido entra');
select throws_ok($$select pg_temp.via_funcao(524, 'solido', '{"alimento": "papinha", "x": 1}')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'gravar_registro: sólido com chave a mais é recusado');
select lives_ok($$select pg_temp.via_funcao(525, 'observacao', '{}', 'Dormiu bem.')$$, 'gravar_registro: observação válida entra');
select throws_ok($$select pg_temp.via_funcao(526, 'observacao', '{"x": 1}', 'Dormiu bem.')$$, '23514',
  'new row for relation "registros" violates check constraint "registros_detalhes_check"', 'gravar_registro: observação com chave a mais é recusada');

reset role;

select * from finish();
rollback;
