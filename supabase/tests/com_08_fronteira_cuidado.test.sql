begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

-- Prova por comportamento da fronteira com os dados de cuidado (COM-08, caso 8).
-- A prova por catálogo (COM-07) está no com_01.

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('c0470000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

create function pg_temp.exec(p_n int, p_sql text) returns text
language plpgsql as $$
declare n int;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.i(p_n), 'role', 'authenticated')::text, true);
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
    json_build_object('sub', pg_temp.i(p_n), 'role', 'authenticated')::text, true);
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
    json_build_object('sub', pg_temp.i(p_n), 'role', 'authenticated')::text, true);
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

-- O Outro (2) é responsável de uma família com bebê. O Moderador (7) e o Admin (8) não têm vínculo nenhum.
insert into auth.users (id, email) values
  (pg_temp.i(1), 'c047-autor@exemplo.invalid'),
  (pg_temp.i(2), 'c047-outro@exemplo.invalid'),
  (pg_temp.i(7), 'c047-moderador@exemplo.invalid'),
  (pg_temp.i(8), 'c047-admin@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  (pg_temp.i(1), 'Autor'), (pg_temp.i(2), 'Outro'), (pg_temp.i(7), 'Moderador'), (pg_temp.i(8), 'Admin');

insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(1), '2026-11-05'), (pg_temp.i(7), '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(11), pg_temp.i(1), 'teste_autor'), (pg_temp.i(17), pg_temp.i(7), 'teste_moderador');

insert into public.papeis_plataforma (conta_id, papel, valido_ate) values
  (pg_temp.i(7), 'moderador', null), (pg_temp.i(8), 'admin', null);

insert into public.familias (id, nome, fuso, criada_por) values
  (pg_temp.i(60), 'Família do teste', 'America/Sao_Paulo', pg_temp.i(2));
insert into public.vinculos (familia_id, conta_id, papel) values
  (pg_temp.i(60), pg_temp.i(2), 'responsavel');
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  (pg_temp.i(61), pg_temp.i(60), 'Bebê do teste', '2026-01-01', pg_temp.i(2));

set local role authenticated;

select is(pg_temp.cuidado_lido(7), '', 'o Moderador lê 0 linhas de toda tabela de cuidado');
select is(pg_temp.cuidado_lido(8), '', 'o Admin lê 0 linhas de toda tabela de cuidado');

select ok(
  pg_temp.cuidado_lido(2) like '%bebes%' and pg_temp.cuidado_lido(2) like '%familias%'
    and pg_temp.cuidado_lido(2) like '%vinculos%',
  'controle: o responsável da família lê as linhas de cuidado (a leitura zero da moderação não é por tabela vazia)'
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

-- RF-12: o resumo da rotina é só texto no corpo do tópico; nada de cuidado entra ou sai
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
