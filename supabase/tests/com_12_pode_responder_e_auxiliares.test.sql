begin;
create extension if not exists pgtap with schema extensions;

select plan(42);

-- 47-M2 e 47-M6 (adendo R-B): pode_responder respeita a fronteira da leitura (conta habilitada) e aceita
-- resposta direta com null ou com um só argumento; ha_bloqueio(null) é false.
-- Ids novos desta tarefa começam com 47 (47e0...); tudo só existe dentro da transação.

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('47e00000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Consulta de uma linha e uma coluna como a conta pedida, no papel atual da sessão:
-- valor em texto ou 'ERRO:<sqlstate>'.
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

-- Autor (1) e Outro (2): conta, aceite e perfil. Bloqueado (3): conta e perfil, bloqueado pelo Autor.
-- Sem perfil (5): conta e aceite. Sem conta (6): só em auth.users.
insert into auth.users (id, email) values
  (pg_temp.i(1), 'c47e-autor@exemplo.invalid'),
  (pg_temp.i(2), 'c47e-outro@exemplo.invalid'),
  (pg_temp.i(3), 'c47e-bloqueado@exemplo.invalid'),
  (pg_temp.i(5), 'c47e-semperfil@exemplo.invalid'),
  (pg_temp.i(6), 'c47e-semconta@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  (pg_temp.i(1), 'Autor R'), (pg_temp.i(2), 'Outro R'), (pg_temp.i(3), 'Bloqueado R'), (pg_temp.i(5), 'Sem perfil R');

insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(1), '2026-11-05'), (pg_temp.i(2), '2026-11-05'), (pg_temp.i(3), '2026-11-05'),
  (pg_temp.i(5), '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(11), pg_temp.i(1), 't_r_autor'), (pg_temp.i(12), pg_temp.i(2), 't_r_outro'),
  (pg_temp.i(13), pg_temp.i(3), 't_r_bloqueado');

insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(11), pg_temp.i(13));

-- T21 visível e T22 oculto (Autor); R31 visível e R34 oculta (Outro), ambas em T21.
insert into public.topicos (id, espaco_id, autor_id, titulo, corpo, estado, motivo_moderacao) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico R21', 'Corpo R21', 'visivel', null),
  (pg_temp.i(22), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico R22', 'Corpo R22', 'oculto', 'oculto no teste');

insert into public.respostas (id, topico_id, autor_id, corpo, estado, motivo_moderacao) values
  (pg_temp.i(31), pg_temp.i(21), pg_temp.i(12), 'Resposta R31', 'visivel', null),
  (pg_temp.i(34), pg_temp.i(21), pg_temp.i(12), 'Resposta R34', 'oculto', 'oculta no teste');

set local role authenticated;

-- 47-M2: sem conta habilitada, pode_responder devolve false (o select dela não vê o tópico, a auxiliar não revela).
select is(
  pg_temp.ler(v.n, v.sql), v.esperado, v.descricao
) from (values
  (6, $q$select public.pode_responder(pg_temp.i(21), null)::text$q$, 'false',
   'Sem conta: pode_responder de tópico visível é false'),
  (6, $q$select public.pode_responder(pg_temp.i(21), pg_temp.i(31))::text$q$, 'false',
   'Sem conta: pode_responder de tópico visível com resposta-mãe visível é false'),
  (6, $q$select public.pode_responder(pg_temp.i(22), null)::text$q$, 'false',
   'Sem conta: pode_responder de tópico oculto é false'),
  (6, $q$select public.pode_responder(pg_temp.i(99), null)::text$q$, 'false',
   'Sem conta: pode_responder de tópico inexistente é false (igual ao visível: nada se revela)'),
  (2, $q$select public.pode_responder(pg_temp.i(21), null)::text$q$, 'true',
   'controle: Outro (conta habilitada) pode responder o mesmo tópico visível'),
  (2, $q$select public.pode_responder(pg_temp.i(21), pg_temp.i(31))::text$q$, 'true',
   'controle: Outro pode responder à mesma resposta-mãe visível'),
  (2, $q$select public.pode_responder(pg_temp.i(21), pg_temp.i(34))::text$q$, 'false',
   'controle: ninguém responde a resposta oculta'),
  (5, $q$select public.pode_responder(pg_temp.i(21), null)::text$q$, 'true',
   'controle: Sem perfil tem conta habilitada e lê o tópico: a auxiliar diz true (o perfil é exigido pela política)')
) as v(n, sql, esperado, descricao);

-- A mesma fronteira da leitura, para cada conta: pode_responder do tópico visível é true se e só se o select vê o tópico.
select is(
  pg_temp.ler(e.n, $q$select public.pode_responder(pg_temp.i(21), null)::text$q$),
  case pg_temp.ler(e.n, $q$select count(*) from public.topicos where id = pg_temp.i(21)$q$)
    when '1' then 'true' else 'false' end,
  e.nome || ': pode_responder do tópico visível acompanha o que o select dela vê'
) from (values
  (1, 'Autor'), (2, 'Outro'), (3, 'Bloqueado'), (5, 'Sem perfil'), (6, 'Sem conta')
) as e(n, nome);

-- Para cada conta, o contraponto: o que o select não vê (tópico oculto de outra pessoa), a auxiliar não libera.
select is(
  pg_temp.ler(e.n, $q$select public.pode_responder(pg_temp.i(22), null)::text$q$), 'false',
  e.nome || ': pode_responder do tópico oculto é false'
) from (values
  (1, 'Autor'), (2, 'Outro'), (3, 'Bloqueado'), (5, 'Sem perfil'), (6, 'Sem conta')
) as e(n, nome);

-- 47-M6: resposta direta com null ou com um só argumento.
select is(
  pg_temp.ler(v.n, v.sql), v.esperado, v.descricao
) from (values
  (2, $q$select public.pode_responder(pg_temp.i(21))::text$q$, 'true',
   'chamada com 1 argumento: resposta direta a tópico visível'),
  (2, $q$select public.pode_responder(pg_temp.i(21), null::uuid)::text$q$, 'true',
   'resposta-mãe null explícita: resposta direta a tópico visível'),
  (2, $q$select public.pode_responder(p_topico_id => pg_temp.i(21))::text$q$, 'true',
   'chamada nomeada só com p_topico_id: resposta direta'),
  (2, $q$select public.pode_responder(p_topico_id => pg_temp.i(21), p_resposta_a => pg_temp.i(31))::text$q$, 'true',
   'chamada nomeada com os dois parâmetros'),
  (2, $q$select public.pode_responder(pg_temp.i(22))::text$q$, 'false',
   'chamada com 1 argumento: tópico oculto é false'),
  (3, $q$select public.pode_responder(pg_temp.i(21))::text$q$, 'false',
   'chamada com 1 argumento: Bloqueado não responde tópico de quem o bloqueou'),
  (6, $q$select public.pode_responder(pg_temp.i(21))::text$q$, 'false',
   'chamada com 1 argumento: Sem conta é false'),
  (2, $q$select public.pode_responder(null::uuid)::text$q$, 'false',
   'tópico null com 1 argumento é false, sem erro'),
  (2, $q$select public.pode_responder(null::uuid, null::uuid)::text$q$, 'false',
   'tópico null e resposta-mãe null é false, sem erro'),
  (2, $q$select public.pode_responder(pg_temp.i(21), pg_temp.i(99))::text$q$, 'false',
   'resposta-mãe inexistente é false')
) as v(n, sql, esperado, descricao);

reset role;

-- A assinatura: nomes dos parâmetros intactos, só o segundo ganhou default; grants e revokes mantidos.
select is(
  (select p.proargnames from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'pode_responder'),
  array['p_topico_id', 'p_resposta_a'],
  'pode_responder mantém os nomes p_topico_id e p_resposta_a'
);

select is(
  (select pg_get_function_arguments(p.oid) from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'pode_responder'),
  'p_topico_id uuid, p_resposta_a uuid DEFAULT NULL::uuid',
  'só p_resposta_a tem default (null)'
);

select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'pode_responder'),
  1,
  'continua existindo uma única função pode_responder (nada de sobrecarga)'
);

select is(
  (select p.prosecdef and coalesce('search_path=""' = any (p.proconfig), false) from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'pode_responder'),
  true,
  'pode_responder segue security definer com search_path vazio'
);

select is(
  (select array[has_function_privilege('authenticated', p.oid, 'execute'),
                has_function_privilege('anon', p.oid, 'execute')]
     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'pode_responder'),
  array[true, false],
  'pode_responder: authenticated executa, anon não'
);

select is(
  (select count(*)::int from pg_proc p, aclexplode(p.proacl) a
    where p.pronamespace = 'public'::regnamespace and p.proname = 'pode_responder' and a.grantee = 0),
  0,
  'pode_responder: public (grantee 0) não executa'
);

-- ha_bloqueio(null) é false (interna: só o dono a chama; authenticated e anon não executam).
create function pg_temp.dono(p_n int, p_sql text) returns text
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

select is(
  pg_temp.dono(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, $q$select public.ha_bloqueio(null)::text$q$, 'false', 'ha_bloqueio(null) é false para quem bloqueou'),
  (3, $q$select public.ha_bloqueio(null)::text$q$, 'false', 'ha_bloqueio(null) é false para o bloqueado'),
  (2, $q$select public.ha_bloqueio(null)::text$q$, 'false', 'ha_bloqueio(null) é false sem nenhum bloqueio'),
  (6, $q$select public.ha_bloqueio(null)::text$q$, 'false', 'ha_bloqueio(null) é false sem conta'),
  (1, $q$select public.ha_bloqueio(pg_temp.i(13))::text$q$, 'true', 'controle: quem bloqueou tem bloqueio com o bloqueado'),
  (3, $q$select public.ha_bloqueio(pg_temp.i(11))::text$q$, 'true', 'controle: o bloqueado tem bloqueio com quem o bloqueou'),
  (2, $q$select public.ha_bloqueio(pg_temp.i(13))::text$q$, 'false', 'controle: sem bloqueio, ha_bloqueio é false')
) as v(n, sql, esperado, descricao);

select is(
  (select array[has_function_privilege('authenticated', p.oid, 'execute'),
                has_function_privilege('anon', p.oid, 'execute')]
     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'ha_bloqueio'),
  array[false, false],
  'ha_bloqueio segue sem execute para authenticated e anon'
);

select * from finish();
rollback;
