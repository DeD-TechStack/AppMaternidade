begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

-- Adendo R-B, 46-M1 e 46-M7.
--   46-M1: em edições vale a última gravação. A trava da linha só serializa; quem chega depois
--          sobrescreve e a versão sobe a cada edição. (O "vale o primeiro" é só do encerramento.)
--   46-M7: "encerrar e anotar" são duas chamadas. encerrar_sessao não recebe texto; a anotação é
--          uma nota_cuidado do bebê criada por gravar_nota, e o registro alheio não muda por ela.
--
-- Família 1: R (...01) responsável, C (...02) cuidador. Bebê b1.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'r@exemplo.invalid'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'c@exemplo.invalid');
insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'R'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'C');
insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');
insert into public.vinculos (familia_id, conta_id, papel) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'Bebê 1', '2026-01-01', 'aaaaaaaa-0000-4000-8000-000000000001');

create function pg_temp.rid(n int) returns uuid language sql immutable as $$
  select ('019a0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
create function pg_temp.nid(n int) returns uuid language sql immutable as $$
  select ('019b0000-0000-7000-8000-' || lpad(to_hex(n), 12, '0'))::uuid;
$$;
create function pg_temp.hist(n int) returns text language sql security definer as $$
  select coalesce(string_agg(operacao::text || ':' || versao::text, ',' order by versao, operacao), '-')
  from public.registro_alteracoes where registro_id = pg_temp.rid(n);
$$;
-- Hash da linha inteira (com versao e atualizado_em) e do registro sem as 4 colunas que o encerramento mexe.
create function pg_temp.hash_registro(n int) returns text language sql security definer as $$
  select md5(r::text) from public.registros r where r.id = pg_temp.rid(n);
$$;
create function pg_temp.hash_sem_encerramento(n int) returns text language sql security definer as $$
  select md5((to_jsonb(r) - array['fim', 'encerrado_por', 'versao', 'atualizado_em'])::text)
  from public.registros r where r.id = pg_temp.rid(n);
$$;

set local role authenticated;

-- 46-M1: duas edições em sequência, com valores diferentes, guardam a segunda. --------------------------
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.gravar_registro(pg_temp.rid(1), 'bbbbbbbb-0000-4000-8000-000000000001', 'fralda',
  '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{"conteudo": "xixi"}');
select public.editar_registro(pg_temp.rid(1), '2026-11-01 10:05+00', null, '{"conteudo": "coco"}', 'primeira', 'America/Sao_Paulo', -180);
select is(
  (select versao::text || ' ' || nota from public.editar_registro(pg_temp.rid(1), '2026-11-01 10:10+00', null, '{"conteudo": "ambos"}', 'segunda', 'America/Manaus', -240)),
  '3 segunda', 'a segunda edição devolve a linha com a versão +2 e a nota da segunda');
select is(
  (select inicio = '2026-11-01 10:10+00' and fim is null and detalhes = '{"conteudo": "ambos"}'::jsonb
          and nota = 'segunda' and fuso = 'America/Manaus' and deslocamento_min = -240 and versao = 3
     from public.registros where id = pg_temp.rid(1)),
  true, 'o registro guarda os 6 valores da segunda edição e a versão 3 (1 + 2)');
select is(pg_temp.hist(1), 'criacao:1,edicao:2,edicao:3', 'o histórico tem a criação e as 2 linhas de edição');
select is(
  (select a.depois = public.registro_foto(r) and (a.antes ->> 'nota') = 'primeira' and (a.depois ->> 'nota') = 'segunda'
     from public.registro_alteracoes a join public.registros r on r.id = a.registro_id
    where a.registro_id = pg_temp.rid(1) and a.operacao = 'edicao' and a.versao = 3),
  true, 'a última linha de edição tem o depois da segunda gravação e o antes da primeira');
select is(
  (select (a.antes ->> 'nota') is null and (a.depois ->> 'nota') = 'primeira' and a.depois -> 'detalhes' = '{"conteudo": "coco"}'::jsonb
     from public.registro_alteracoes a
    where a.registro_id = pg_temp.rid(1) and a.operacao = 'edicao' and a.versao = 2),
  true, 'a primeira linha de edição guardou a primeira gravação');

-- O mesmo para editar_nota. -------------------------------------------------------------------------------
select public.gravar_nota(pg_temp.nid(1), 'ffffffff-0000-4000-8000-000000000001', 'Texto original');
select public.editar_nota(pg_temp.nid(1), 'primeiro texto', now() + interval '1 day');
select is(
  (select versao::text || ' ' || texto || ' ' || coalesce(destaque_ate::text, '-') from public.editar_nota(pg_temp.nid(1), 'segundo texto', null)),
  '3 segundo texto -', 'a segunda edição da nota devolve o texto e o destaque da segunda, com a versão +2');
select is(
  (select texto || ' ' || coalesce(destaque_ate::text, '-') || ' ' || versao::text || ' ' || criado_por::text
     from public.notas_cuidado where id = pg_temp.nid(1)),
  'segundo texto - 3 aaaaaaaa-0000-4000-8000-000000000001', 'a nota guarda os valores da segunda edição, a versão 3 e o autor original');

-- 46-M7: encerrar e anotar. ---------------------------------------------------------------------------------
-- encerrar_sessao não tem parâmetro de texto.
select is(
  (select proargnames::text from pg_proc where oid = 'public.encerrar_sessao(uuid, timestamptz)'::regprocedure),
  '{id_registro,momento}', 'encerrar_sessao recebe só o registro e o momento (a anotação é outra chamada)');

-- R inicia um sono com nota; o cuidador C encerra a sessão do responsável e anota.
select public.gravar_registro(pg_temp.rid(2), 'bbbbbbbb-0000-4000-8000-000000000001', 'sono',
  '2026-11-01 10:00+00', 'America/Sao_Paulo', -180, null, '{}', 'Dormiu no colo');
select set_config('teste.antes', pg_temp.hash_sem_encerramento(2), true);
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
select is(public.encerrar_sessao(pg_temp.rid(2), '2026-11-01 11:00+00'), '2026-11-01 11:00+00'::timestamptz,
  'o cuidador encerra o sono criado pelo responsável');
select is(
  (select fim::text || ' ' || encerrado_por::text || ' ' || versao::text from public.registros where id = pg_temp.rid(2)),
  '2026-11-01 11:00:00+00 aaaaaaaa-0000-4000-8000-000000000002 2', 'o registro ganha fim, encerrado_por = cuidador e a versão 2');
select is(
  (select pg_temp.hash_sem_encerramento(2) = current_setting('teste.antes') and nota = 'Dormiu no colo' and criado_por = 'aaaaaaaa-0000-4000-8000-000000000001'
     from public.registros where id = pg_temp.rid(2)),
  true, 'a nota e o autor do registro alheio ficam iguais: só mudaram fim, encerrado_por, versão e atualizado_em');
select is(pg_temp.hist(2), 'criacao:1,edicao:2', 'o encerramento entra no histórico como uma edição');
select is(
  (select a.autor = 'aaaaaaaa-0000-4000-8000-000000000002' and (a.antes ->> 'fim') is null and (a.depois ->> 'fim') is not null
          and (a.antes - 'fim') = (a.depois - 'fim')
     from public.registro_alteracoes a where a.registro_id = pg_temp.rid(2) and a.operacao = 'edicao'),
  true, 'a linha de edição do encerramento mudou só o fim e tem o cuidador como autor');

select set_config('teste.depois', pg_temp.hash_registro(2), true);
select lives_ok(
  $$select public.gravar_nota(pg_temp.nid(2), 'ffffffff-0000-4000-8000-000000000001', 'Mamou bem antes de dormir', 'bbbbbbbb-0000-4000-8000-000000000001')$$,
  'em seguida o cuidador anota uma nota_cuidado do bebê');
select is(
  (select criado_por::text || ' ' || bebe_id::text || ' ' || familia_id::text || ' ' || texto
     from public.notas_cuidado where id = pg_temp.nid(2)),
  'aaaaaaaa-0000-4000-8000-000000000002 bbbbbbbb-0000-4000-8000-000000000001 ffffffff-0000-4000-8000-000000000001 Mamou bem antes de dormir',
  'a nota existe com criado_por = cuidador, o bebê e a família');
select is(pg_temp.hash_registro(2), current_setting('teste.depois'), 'gravar a nota não mexeu no registro alheio');

-- O encerramento não deu ao cuidador o direito de editar ou excluir o registro do responsável.
select throws_ok(
  $$select public.editar_registro(pg_temp.rid(2), '2026-11-01 10:00+00', '2026-11-01 11:00+00', '{}', 'Dormiu no colo', 'America/Sao_Paulo', -180)$$,
  '42501', 'sem permissao', 'o cuidador não edita o registro alheio que encerrou');
select throws_ok($$select public.excluir_registro(pg_temp.rid(2))$$,
  '42501', 'sem permissao', 'o cuidador não exclui o registro alheio que encerrou');
select is(pg_temp.hash_registro(2), current_setting('teste.depois'), 'o registro alheio seguiu intacto depois das duas recusas');

reset role;

select * from finish();
rollback;
