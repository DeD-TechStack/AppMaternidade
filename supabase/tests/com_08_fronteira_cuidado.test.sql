begin;
create extension if not exists pgtap with schema extensions;

select plan(40);

-- Prova por comportamento da fronteira com os dados de cuidado (COM-08, caso 8).
-- A prova por catálogo (COM-07) está no com_01.
--
-- 47-M8 (adendo R-B): a sonda lê o catálogo (toda tabela de public fora das 10 da comunidade e de contas) e
-- a fixture precisa ter criado pelo menos 1 linha em CADA uma delas antes da sonda. Se uma tabela de cuidado
-- ficar sem linha da fixture, o teste falha (não passa em silêncio). Além disso, moderador e admin com vínculo
-- de família REVOGADO tentam escrever em dados de cuidado: a escrita é negada e o dado fica intacto.
-- Ids novos desta tarefa começam com 47 (47e0...); os ids c047... abaixo são os da MAT-47 já integrada.

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('c0470000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Ids novos desta tarefa (começam com 47). O número 100 ou mais, nos helpers abaixo, pede esta família de ids.
create function pg_temp.n(k int) returns uuid language sql immutable as $$
  select ('47e00000-0000-4000-8000-' || lpad(k::text, 12, '0'))::uuid
$$;

-- Id no formato uuidv7 que registros e notas_cuidado exigem, também começando com 47.
create function pg_temp.v7(k int) returns uuid language sql immutable as $$
  select ('47e00000-0000-7000-8000-' || lpad(k::text, 12, '0'))::uuid
$$;

create function pg_temp.conta(p_n int) returns uuid language sql immutable as $$
  select case when p_n >= 100 then pg_temp.n(p_n) else pg_temp.i(p_n) end
$$;

create function pg_temp.exec(p_n int, p_sql text) returns text
language plpgsql as $$
declare n int;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.conta(p_n), 'role', 'authenticated')::text, true);
  execute p_sql;
  get diagnostics n = row_count;
  return n::text;
exception when others then
  return 'ERRO:' || sqlstate;
end;
$$;

create function pg_temp.ler(p_n int, p_sql text) returns text
language plpgsql as $$
declare r text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.conta(p_n), 'role', 'authenticated')::text, true);
  execute p_sql into r;
  return r;
exception when others then
  return 'ERRO:' || sqlstate;
end;
$$;

-- Lê, como a conta pedida, toda tabela de cuidado do esquema public (tudo que não é uma das 10 tabelas
-- da comunidade nem contas), lida do catálogo na hora. Devolve os nomes das tabelas em que a conta
-- leu pelo menos uma linha; permissão negada conta como zero linhas lidas.
create function pg_temp.cuidado_lido(p_n int) returns text
language plpgsql as $$
declare
  t record;
  k bigint;
  lidas text[] := '{}';
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.conta(p_n), 'role', 'authenticated')::text, true);
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
       and c.relname not in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                             'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma',
                             'auditoria_moderacao', 'contas')
     order by c.relname
  loop
    begin
      execute format('select count(*) from public.%I', t.relname) into k;
    exception when insufficient_privilege then
      k := 0;
    end;
    if k > 0 then
      lidas := lidas || t.relname::text;
    end if;
  end loop;
  return array_to_string(lidas, ',');
end;
$$;

-- Linhas de cada tabela de cuidado, lidas como o dono (postgres), pelo mesmo critério do catálogo.
create function pg_temp.contagens() returns table (tabela text, linhas bigint)
language plpgsql as $$
declare
  t record;
begin
  for t in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
       and c.relname not in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                             'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma',
                             'auditoria_moderacao', 'contas')
     order by c.relname
  loop
    tabela := t.relname::text;
    execute format('select count(*) from public.%I', t.relname) into linhas;
    return next;
  end loop;
end;
$$;

-- Foto das contagens ANTES de a fixture criar as linhas de cuidado deste teste.
create temp table t_antes as select * from pg_temp.contagens();

-- O Outro (2) é responsável de uma família com bebê. O Moderador (7) e o Admin (8) não têm vínculo nenhum.
insert into auth.users (id, email) values
  (pg_temp.i(1), 'c047-autor@exemplo.invalid'),
  (pg_temp.i(2), 'c047-outro@exemplo.invalid'),
  (pg_temp.i(7), 'c047-moderador@exemplo.invalid'),
  (pg_temp.i(8), 'c047-admin@exemplo.invalid'),
  (pg_temp.n(171), 'c47e-modrevogado@exemplo.invalid'),
  (pg_temp.n(181), 'c47e-adminrevogado@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  (pg_temp.i(1), 'Autor'), (pg_temp.i(2), 'Outro'), (pg_temp.i(7), 'Moderador'), (pg_temp.i(8), 'Admin'),
  (pg_temp.n(171), 'Moderador com vínculo revogado'), (pg_temp.n(181), 'Admin com vínculo revogado');

insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(1), '2026-11-05'), (pg_temp.i(7), '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(11), pg_temp.i(1), 't_autor'), (pg_temp.i(17), pg_temp.i(7), 't_moderador');

insert into public.papeis_plataforma (conta_id, papel, valido_ate) values
  (pg_temp.i(7), 'moderador', null), (pg_temp.i(8), 'admin', null),
  (pg_temp.n(171), 'moderador', null), (pg_temp.n(181), 'admin', null);

insert into public.familias (id, nome, fuso, criada_por) values
  (pg_temp.i(60), 'Família do teste', 'America/Sao_Paulo', pg_temp.i(2));
insert into public.vinculos (familia_id, conta_id, papel) values
  (pg_temp.i(60), pg_temp.i(2), 'responsavel');
-- Moderador e Admin com vínculo de responsável REVOGADO nessa família: a moderação não herda acesso nenhum.
insert into public.vinculos (familia_id, conta_id, papel, estado) values
  (pg_temp.i(60), pg_temp.n(171), 'responsavel', 'revogado'),
  (pg_temp.i(60), pg_temp.n(181), 'responsavel', 'revogado');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  (pg_temp.i(61), pg_temp.i(60), 'Bebê do teste', '2026-01-01', pg_temp.i(2));

-- Uma linha em cada uma das outras tabelas de cuidado (a de histórico nasce pelo gatilho do registro).
insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em) values
  (pg_temp.n(62), pg_temp.i(60), 'cuidador', pg_temp.i(2), 'hash-fixture-47e0-62', now() + interval '1 day');
insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min, criado_por) values
  (pg_temp.v7(63), pg_temp.i(60), pg_temp.i(61), 'sono', now(), 'America/Sao_Paulo', -180, pg_temp.i(2));
insert into public.notas_cuidado (id, familia_id, bebe_id, texto, criado_por) values
  (pg_temp.v7(64), pg_temp.i(60), pg_temp.i(61), 'Nota de cuidado da fixture', pg_temp.i(2));

-- A fixture cobre cada tabela de cuidado que existe: se alguma ficou sem linha nova, o nome dela sai aqui.
select is(
  (select string_agg(d.tabela, ',' order by d.tabela)
     from pg_temp.contagens() d join t_antes a on a.tabela = d.tabela
    where d.linhas <= a.linhas),
  null,
  'a fixture criou pelo menos 1 linha em cada tabela de cuidado (lista lida do catálogo na hora)'
);

select is(
  (select count(*)::int from t_antes
    where tabela in ('familias', 'vinculos', 'bebes', 'convites', 'registros', 'registro_alteracoes',
                     'notas_cuidado')),
  7,
  'controle: o catálogo tem as 7 tabelas de cuidado de hoje (MAT-43, MAT-45 e MAT-46), todas cobertas acima'
);

set local role authenticated;

select is(pg_temp.cuidado_lido(7), '', 'o Moderador lê 0 linhas de toda tabela de cuidado');
select is(pg_temp.cuidado_lido(8), '', 'o Admin lê 0 linhas de toda tabela de cuidado');
select is(pg_temp.cuidado_lido(171), '',
  'o Moderador com vínculo revogado lê 0 linhas de toda tabela de cuidado');
select is(pg_temp.cuidado_lido(181), '',
  'o Admin com vínculo revogado lê 0 linhas de toda tabela de cuidado');

select ok(
  pg_temp.cuidado_lido(2) like '%bebes%' and pg_temp.cuidado_lido(2) like '%familias%'
    and pg_temp.cuidado_lido(2) like '%vinculos%',
  'controle: o responsável da família lê as linhas de cuidado (a leitura zero da moderação não é por tabela vazia)'
);

select is(
  (select count(*)::int
     from unnest(string_to_array(pg_temp.cuidado_lido(2), ',')) as x(tabela)
    where x.tabela in ('familias', 'vinculos', 'bebes', 'convites', 'registros', 'registro_alteracoes',
                       'notas_cuidado')),
  7,
  'controle: o responsável lê linhas de cada uma das 7 tabelas de cuidado (nenhuma está vazia para quem tem acesso)'
);

-- contas guarda o nome privado: a moderação lê só a própria linha, nunca a de outra pessoa
select is(
  pg_temp.ler(v.n, v.sql), v.esperado, v.descricao
) from (values
  (7, $q$select count(*) from public.contas where id <> pg_temp.i(7)$q$, '0',
   'o Moderador lê 0 linhas de contas com id diferente do próprio'),
  (7, $q$select count(*) from public.contas where id = pg_temp.i(7)$q$, '1',
   'o Moderador lê a própria linha de contas'),
  (7, $q$select count(*) from (select nome_privado from public.contas where id = pg_temp.i(1)) x$q$, '0',
   'o Moderador não lê o nome privado do Autor'),
  (8, $q$select count(*) from public.contas where id <> pg_temp.i(8)$q$, '0',
   'o Admin lê 0 linhas de contas com id diferente do próprio'),
  (8, $q$select count(*) from public.contas where id = pg_temp.i(8)$q$, '1',
   'o Admin lê a própria linha de contas'),
  (8, $q$select count(*) from (select nome_privado from public.contas where id = pg_temp.i(1)) x$q$, '0',
   'o Admin não lê o nome privado do Autor'),
  (1, $q$select count(*) from public.contas where id <> pg_temp.i(1)$q$, '0',
   'o Autor lê 0 linhas de contas com id diferente do próprio'),
  (1, $q$select count(*) from public.contas where id = pg_temp.i(1)$q$, '1',
   'o Autor lê a própria linha de contas')
) as v(n, sql, esperado, descricao);

-- Moderador e Admin com vínculo REVOGADO tentam escrever em dado de cuidado: negado, sem efeito.
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.papel || ' com vínculo revogado: ' || v.descricao
) from (values
  (171, 'o Moderador',
   $s$insert into public.bebes (familia_id, nome, nascimento, criado_por)
      values (pg_temp.i(60), 'Bebê invasor', '2026-02-02', pg_temp.n(171))$s$,
   'ERRO:42501', 'não cria bebê na família'),
  (171, 'o Moderador',
   $s$update public.bebes set nome = 'Bebê invadido' where id = pg_temp.i(61)$s$,
   '0', 'não altera o bebê (0 linhas)'),
  (171, 'o Moderador', $s$delete from public.bebes where id = pg_temp.i(61)$s$,
   'ERRO:42501', 'não apaga o bebê'),
  (171, 'o Moderador',
   $s$update public.familias set nome = 'Família invadida' where id = pg_temp.i(60)$s$,
   '0', 'não altera a família (0 linhas)'),
  (171, 'o Moderador', $s$delete from public.familias where id = pg_temp.i(60)$s$,
   'ERRO:42501', 'não apaga a família'),
  (171, 'o Moderador',
   $s$update public.vinculos set estado = 'ativo' where familia_id = pg_temp.i(60) and conta_id = pg_temp.n(171)$s$,
   'ERRO:42501', 'não reativa o próprio vínculo'),
  (171, 'o Moderador',
   $s$insert into public.notas_cuidado (id, familia_id, texto)
      values (pg_temp.v7(65), pg_temp.i(60), 'Nota invasora')$s$,
   'ERRO:42501', 'não escreve nota de cuidado'),
  (171, 'o Moderador',
   $s$insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min)
      values (pg_temp.v7(66), pg_temp.i(60), pg_temp.i(61), 'sono', now(), 'America/Sao_Paulo', -180)$s$,
   'ERRO:42501', 'não escreve registro de rotina'),
  (181, 'o Admin',
   $s$insert into public.bebes (familia_id, nome, nascimento, criado_por)
      values (pg_temp.i(60), 'Bebê invasor', '2026-02-02', pg_temp.n(181))$s$,
   'ERRO:42501', 'não cria bebê na família'),
  (181, 'o Admin',
   $s$update public.bebes set nome = 'Bebê invadido' where id = pg_temp.i(61)$s$,
   '0', 'não altera o bebê (0 linhas)'),
  (181, 'o Admin', $s$delete from public.bebes where id = pg_temp.i(61)$s$,
   'ERRO:42501', 'não apaga o bebê'),
  (181, 'o Admin',
   $s$update public.familias set nome = 'Família invadida' where id = pg_temp.i(60)$s$,
   '0', 'não altera a família (0 linhas)'),
  (181, 'o Admin', $s$delete from public.familias where id = pg_temp.i(60)$s$,
   'ERRO:42501', 'não apaga a família'),
  (181, 'o Admin',
   $s$update public.vinculos set estado = 'ativo' where familia_id = pg_temp.i(60) and conta_id = pg_temp.n(181)$s$,
   'ERRO:42501', 'não reativa o próprio vínculo'),
  (181, 'o Admin',
   $s$insert into public.notas_cuidado (id, familia_id, texto)
      values (pg_temp.v7(67), pg_temp.i(60), 'Nota invasora')$s$,
   'ERRO:42501', 'não escreve nota de cuidado'),
  (181, 'o Admin',
   $s$insert into public.registros (id, familia_id, bebe_id, tipo, inicio, fuso, deslocamento_min)
      values (pg_temp.v7(68), pg_temp.i(60), pg_temp.i(61), 'sono', now(), 'America/Sao_Paulo', -180)$s$,
   'ERRO:42501', 'não escreve registro de rotina')
) as v(n, papel, sql, esperado, descricao);

reset role;

select is(
  (select b.nome || '|' || (select count(*) from public.bebes where familia_id = pg_temp.i(60))
          || '|' || f.nome
          || '|' || (select string_agg(estado::text, ',' order by conta_id::text) from public.vinculos
                      where conta_id in (pg_temp.n(171), pg_temp.n(181)))
          || '|' || (select count(*) from public.notas_cuidado where familia_id = pg_temp.i(60))
          || '|' || (select count(*) from public.registros where familia_id = pg_temp.i(60))
     from public.bebes b join public.familias f on f.id = b.familia_id
    where b.id = pg_temp.i(61)),
  'Bebê do teste|1|Família do teste|revogado,revogado|1|1',
  'depois das tentativas, o bebê, a família, os vínculos, as notas e os registros seguem intactos'
);

-- Controle da escrita: quem tem vínculo ativo de responsável altera o bebê. A negativa acima é pelo vínculo
-- revogado, não por falta de permissão de coluna ou de política.
savepoint controle_escrita;
set local role authenticated;

select is(
  pg_temp.exec(2, $s$update public.bebes set nome = 'Bebê renomeado' where id = pg_temp.i(61)$s$),
  '1',
  'controle: o responsável com vínculo ativo altera o bebê (1 linha)'
);

reset role;

select is(
  (select nome from public.bebes where id = pg_temp.i(61)),
  'Bebê renomeado',
  'controle: a alteração do responsável foi gravada'
);

rollback to savepoint controle_escrita;

select is(
  (select nome from public.bebes where id = pg_temp.i(61)),
  'Bebê do teste',
  'o controle foi desfeito: o bebê voltou ao nome da fixture'
);

-- RF-12: o resumo da rotina é só texto no corpo do tópico; nada de cuidado entra ou sai
set local role authenticated;

select is(
  pg_temp.exec(1, $s$insert into public.topicos (espaco_id, autor_id, titulo, corpo)
    values ((select id from public.espacos where slug = 'organizacao-da-rotina'), pg_temp.i(11),
            'Resumo da semana de teste',
            'Resumo que eu mesma escrevi: 5 sonecas por dia, a mais longa de 1h20.')$s$),
  '1',
  'a pessoa publica o resumo da rotina como texto no corpo do tópico'
);

reset role;

select is(
  (select corpo from public.topicos where titulo = 'Resumo da semana de teste'),
  'Resumo que eu mesma escrevi: 5 sonecas por dia, a mais longa de 1h20.',
  'o resumo fica gravado exatamente como foi escrito'
);

-- Independência: apagar dado de cuidado não mexe na comunidade
delete from public.familias where id = pg_temp.i(60);

select is(
  (select count(*)::int from public.bebes where id = pg_temp.i(61)),
  0,
  'apagar a família apagou o bebê em cascata'
);

select is(
  (select count(*)::int from public.topicos where titulo = 'Resumo da semana de teste'),
  1,
  'apagar a família e o bebê não altera nenhum tópico'
);

select * from finish();
rollback;
