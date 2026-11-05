begin;
create extension if not exists pgtap with schema extensions;

-- Único teste que depende do seed (supabase/seeds/46_rotina.sql): só precisa rodar depois de um
-- db:reset. Não depende do dia em que roda: os dias saem dos dados do seed, não do now() do teste.
-- Lê como Ana (responsável da Família Exemplo); só a Família Teste é conferida como dono.
select plan(26);

-- Mesma regra de id do seed: ('46' || n em 6 dígitos hex || '-0000-7000-8000-000000000000').
create function pg_temp.id_registro(n int) returns uuid language sql immutable as $$
  select ('46' || lpad(to_hex(n), 6, '0') || '-0000-7000-8000-000000000000')::uuid;
$$;

select is(
  (select count(*)::int from public.registros where familia_id = 'f2222222-2222-4222-8222-222222222222')
  + (select count(*)::int from public.notas_cuidado where familia_id = 'f2222222-2222-4222-8222-222222222222'),
  0,
  'a Família Teste não tem registro nem nota (o seed só usa a Família Exemplo)'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.registros where bebe_id = 'c1111111-1111-4111-8111-111111111111'),
  115,
  'Ana lê 115 registros da Lia (114 da semana e a sessão de hoje)'
);

select is(
  (select count(*)::int from public.registros
    where bebe_id = 'c1111111-1111-4111-8111-111111111111' and excluido_em is null),
  114,
  '114 deles não estão excluídos'
);

select is(
  (select count(*)::int from public.registros
    where id::text like '46%' and familia_id = 'f1111111-1111-4111-8111-111111111111'
      and bebe_id = 'c1111111-1111-4111-8111-111111111111'),
  115,
  'todos os registros são da Lia, na Família Exemplo, com ids que começam com 46'
);

-- Os dias da semana saem dos dados (sem a sessão de hoje, que pode cair em qualquer dia perto da meia-noite).
select is(
  (select count(distinct q.d)::text || ' ' || (max(q.d) - min(q.d))::text
     from (
       select (r.inicio at time zone f.fuso)::date as d
       from public.registros r join public.familias f on f.id = r.familia_id
       where r.bebe_id = 'c1111111-1111-4111-8111-111111111111' and r.excluido_em is null
         and r.id <> '46000073-0000-7000-8000-000000000000'
     ) q),
  '7 6',
  'os registros não excluídos (sem a sessão de hoje) caem em exatamente 7 dias consecutivos'
);

select is(
  (select string_agg(z.c::text, ',' order by z.d)
     from (
       select q.d,
              (select count(*) from public.registros_do_dia('c1111111-1111-4111-8111-111111111111', q.d) x
                where x.id <> '46000073-0000-7000-8000-000000000000') as c
       from (
         select distinct (r.inicio at time zone f.fuso)::date as d
         from public.registros r join public.familias f on f.id = r.familia_id
         where r.bebe_id = 'c1111111-1111-4111-8111-111111111111' and r.excluido_em is null
           and r.id <> '46000073-0000-7000-8000-000000000000'
       ) q
     ) z),
  '16,16,16,17,16,16,16',
  'registros_do_dia, dia a dia: 16 por dia, 17 em D-4 (a observação); a fralda excluída de D-2 não conta'
);

select is(
  (select string_agg(tipo::text || ':' || c, ',' order by tipo)
     from (select tipo, count(*) as c from public.registros group by tipo) q),
  'sono:43,mamada:21,mamadeira:14,fralda:29,tummy:7,observacao:1',
  'registros por tipo (sem sólido, DR-18)'
);

select is(
  (select count(*)::int from public.registros
    where fuso = 'America/Sao_Paulo' and deslocamento_min = -180),
  115,
  'todo registro grava o fuso de São Paulo e deslocamento -180'
);

select is(
  (select array_agg(id::text order by id) from public.registros where origem = 'ao_vivo'),
  array['4600006c-0000-7000-8000-000000000000', '46000073-0000-7000-8000-000000000000'],
  'só dois registros são ao vivo: o sono de D-1 e a sessão de hoje'
);

select is(
  (select count(*)::int from public.registros where origem = 'retroativo'),
  113,
  'os outros 113 são retroativos'
);

select is(
  (select to_char(inicio at time zone 'America/Sao_Paulo', 'HH24:MI') || '-' ||
          to_char(fim at time zone 'America/Sao_Paulo', 'HH24:MI') || ' ' || tipo::text
     from public.registros where id = pg_temp.id_registro(108)),
  '13:00-14:40 sono',
  'o sono de D-1 das 13:00 foi encerrado às 14:40'
);

select is(
  (select criado_por::text || ' ' || encerrado_por::text from public.registros where id = pg_temp.id_registro(108)),
  '11111111-1111-4111-8111-111111111111 22222222-2222-4222-8222-222222222222',
  'o sono de D-1 nasceu por Ana e foi encerrado por Bruno'
);

select is(
  (select to_char(inicio at time zone 'America/Sao_Paulo', 'HH24:MI') || '-' ||
          to_char(fim at time zone 'America/Sao_Paulo', 'HH24:MI') || ' +' ||
          ((fim at time zone 'America/Sao_Paulo')::date - (inicio at time zone 'America/Sao_Paulo')::date)::text
     from public.registros where id = pg_temp.id_registro(81)),
  '20:30-00:20 +1',
  'o sono de D-3 das 20:30 atravessa a meia-noite e termina às 00:20 do dia seguinte'
);

select is(
  (select nota || ' ' || criado_por::text from public.registros where id = pg_temp.id_registro(59)),
  'Arrotou pouco depois da mamada. 11111111-1111-4111-8111-111111111111',
  'a observação de D-4 é de Ana, com a nota pedida'
);

select is(
  (select to_char(inicio at time zone 'America/Sao_Paulo', 'HH24:MI') || ' ' || tipo::text
     from public.registros where id = pg_temp.id_registro(59)),
  '14:50 observacao',
  'a observação de D-4 é às 14:50'
);

select is(
  (select detalhes::text || ' ' || versao::text from public.registros where id = pg_temp.id_registro(106)),
  '{"ml": 100, "conteudo": "leite_materno"} 2',
  'a mamadeira de D-1 foi editada de 90 para 100 ml (versão 2)'
);

select is(
  (select string_agg(operacao::text || ':' || versao::text, ',' order by versao)
     from public.registro_alteracoes where registro_id = pg_temp.id_registro(106)),
  'criacao:1,edicao:2',
  'a mamadeira editada tem criação e edição no histórico'
);

select is(
  (select array_agg(id::text) from public.registros where excluido_em is not null),
  array['4600005b-0000-7000-8000-000000000000'],
  'só a fralda de D-2 está excluída'
);

select is(
  (select tipo::text || ' ' || criado_por::text || ' ' || excluido_por::text || ' ' || versao::text
     from public.registros where id = pg_temp.id_registro(91)),
  'fralda 22222222-2222-4222-8222-222222222222 11111111-1111-4111-8111-111111111111 2',
  'a fralda de D-2 é de Bruno e foi excluída por Ana'
);

select is(
  (select string_agg(operacao::text || ':' || c, ',' order by operacao)
     from (select operacao, count(*) as c from public.registro_alteracoes group by operacao) q),
  'criacao:115,edicao:2,exclusao:1',
  'o histórico tem 115 criações, 2 edições (edição e encerramento) e 1 exclusão'
);

select is(
  (select criado_por::text || ' ' || coalesce(fim::text, 'aberta') || ' ' || origem::text
     from public.registros where id = pg_temp.id_registro(115)),
  '22222222-2222-4222-8222-222222222222 aberta ao_vivo',
  'a sessão de hoje é de Bruno, está em andamento e é ao vivo'
);

select ok(
  (select recebido_em - inicio between interval '72 minutes' and interval '73 minutes'
     from public.registros where id = pg_temp.id_registro(115)),
  'a sessão de hoje começou 72 minutos antes do momento do seed'
);

select is(
  (select count(*)::text || ' ' || count(*) filter (where versao = 1)::text || ' ' || count(*) filter (where excluida_em is null)::text
     from public.notas_cuidado where familia_id = 'f1111111-1111-4111-8111-111111111111'),
  '2 2 2',
  'a Família Exemplo tem 2 notas, ambas com versão 1 e sem exclusão'
);

select is(
  (select count(*)::int from public.notas_cuidado
    where familia_id = 'f1111111-1111-4111-8111-111111111111' and destaque_ate is not null),
  1,
  'uma das 2 notas está em destaque'
);

select is(
  (select string_agg(id::text || '|' || texto || '|' || criado_por::text || '|' || coalesce(bebe_id::text, '-')
                     || '|' || (destaque_ate is not null)::text, ';' order by id)
     from public.notas_cuidado),
  '460000c9-0000-7000-8000-000000000000|Pomada só à noite.|11111111-1111-4111-8111-111111111111|c1111111-1111-4111-8111-111111111111|true;'
  || '460000ca-0000-7000-8000-000000000000|Fraldas P no armário de cima.|22222222-2222-4222-8222-222222222222|-|false',
  'as duas notas do seed: a da Lia com destaque (Ana) e a da família sem bebê nem destaque (Bruno)'
);

reset role;

select hasnt_function('public', 'id46', 'o seed não deixa função em public');

select * from finish();
rollback;
