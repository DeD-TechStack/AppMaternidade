begin;
create extension if not exists pgtap with schema extensions;

select plan(133);

-- Executa uma consulta de uma linha e uma coluna como a conta pedida (a sessão já está como
-- authenticated; só o sub das claims muda). Devolve o valor em texto ou 'ERRO:<sqlstate>'.
create function pg_temp.ler(p_conta uuid, p_sql text) returns text
language plpgsql as $$
declare r text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_conta, 'role', 'authenticated')::text, true);
  execute p_sql into r;
  return r;
exception when others then
  return 'ERRO:' || sqlstate;
end;
$$;

-- Elenco, em ordem fixa: 1 Autor, 2 Outro, 3 Bloqueado, 4 Sem aceite, 5 Sem perfil, 6 Sem conta,
-- 7 Moderador, 8 Admin, 9 Moderador vencido.
create function pg_temp.elenco() returns table (ordem int, nome text, conta uuid)
language sql as $$
  select * from (values
    (1, 'Autor', 'c0470000-0000-4000-8000-000000000001'::uuid),
    (2, 'Outro', 'c0470000-0000-4000-8000-000000000002'::uuid),
    (3, 'Bloqueado', 'c0470000-0000-4000-8000-000000000003'::uuid),
    (4, 'Sem aceite', 'c0470000-0000-4000-8000-000000000004'::uuid),
    (5, 'Sem perfil', 'c0470000-0000-4000-8000-000000000005'::uuid),
    (6, 'Sem conta', 'c0470000-0000-4000-8000-000000000006'::uuid),
    (7, 'Moderador', 'c0470000-0000-4000-8000-000000000007'::uuid),
    (8, 'Admin', 'c0470000-0000-4000-8000-000000000008'::uuid),
    (9, 'Moderador vencido', 'c0470000-0000-4000-8000-000000000009'::uuid)
  ) v(ordem, nome, conta) order by ordem;
$$;

insert into auth.users (id, email) values
  ('c0470000-0000-4000-8000-000000000001', 'c047-autor@exemplo.invalid'),
  ('c0470000-0000-4000-8000-000000000002', 'c047-outro@exemplo.invalid'),
  ('c0470000-0000-4000-8000-000000000003', 'c047-bloqueado@exemplo.invalid'),
  ('c0470000-0000-4000-8000-000000000004', 'c047-semaceite@exemplo.invalid'),
  ('c0470000-0000-4000-8000-000000000005', 'c047-semperfil@exemplo.invalid'),
  ('c0470000-0000-4000-8000-000000000006', 'c047-semconta@exemplo.invalid'),
  ('c0470000-0000-4000-8000-000000000007', 'c047-moderador@exemplo.invalid'),
  ('c0470000-0000-4000-8000-000000000008', 'c047-admin@exemplo.invalid'),
  ('c0470000-0000-4000-8000-000000000009', 'c047-modvencido@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('c0470000-0000-4000-8000-000000000001', 'Autor'),
  ('c0470000-0000-4000-8000-000000000002', 'Outro'),
  ('c0470000-0000-4000-8000-000000000003', 'Bloqueado'),
  ('c0470000-0000-4000-8000-000000000004', 'Sem aceite'),
  ('c0470000-0000-4000-8000-000000000005', 'Sem perfil'),
  ('c0470000-0000-4000-8000-000000000007', 'Moderador'),
  ('c0470000-0000-4000-8000-000000000008', 'Admin'),
  ('c0470000-0000-4000-8000-000000000009', 'Moderador vencido');

insert into public.aceites_termos (conta_id, versao) values
  ('c0470000-0000-4000-8000-000000000001', '2026-11-05'),
  ('c0470000-0000-4000-8000-000000000002', '2026-11-05'),
  ('c0470000-0000-4000-8000-000000000003', '2026-11-05'),
  ('c0470000-0000-4000-8000-000000000005', '2026-11-05'),
  ('c0470000-0000-4000-8000-000000000007', '2026-11-05'),
  ('c0470000-0000-4000-8000-000000000009', '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  ('c0470000-0000-4000-8000-000000000011', 'c0470000-0000-4000-8000-000000000001', 't_autor'),
  ('c0470000-0000-4000-8000-000000000012', 'c0470000-0000-4000-8000-000000000002', 't_outro'),
  ('c0470000-0000-4000-8000-000000000013', 'c0470000-0000-4000-8000-000000000003', 't_bloqueado'),
  ('c0470000-0000-4000-8000-000000000014', 'c0470000-0000-4000-8000-000000000004', 't_semaceite'),
  ('c0470000-0000-4000-8000-000000000017', 'c0470000-0000-4000-8000-000000000007', 't_moderador'),
  ('c0470000-0000-4000-8000-000000000019', 'c0470000-0000-4000-8000-000000000009', 't_modvencido');

-- O Autor bloqueou o Bloqueado.
insert into public.bloqueios (bloqueador_id, bloqueado_id) values
  ('c0470000-0000-4000-8000-000000000011', 'c0470000-0000-4000-8000-000000000013');

insert into public.papeis_plataforma (conta_id, papel, valido_ate) values
  ('c0470000-0000-4000-8000-000000000007', 'moderador', null),
  ('c0470000-0000-4000-8000-000000000008', 'admin', null),
  ('c0470000-0000-4000-8000-000000000009', 'moderador', now() - interval '1 day');

-- T1 visível, T2 oculto, T3 removido (do Autor); T4 do Outro; T5 do Bloqueado; T6 do Moderador (todos visíveis).
insert into public.topicos (id, espaco_id, autor_id, titulo, corpo, estado, motivo_moderacao) values
  ('c0470000-0000-4000-8000-000000000021', (select id from public.espacos where slug = 'sono'),
   'c0470000-0000-4000-8000-000000000011', 'Tópico T1', 'Corpo T1', 'visivel', null),
  ('c0470000-0000-4000-8000-000000000022', (select id from public.espacos where slug = 'sono'),
   'c0470000-0000-4000-8000-000000000011', 'Tópico T2', 'Corpo T2', 'oculto', 'ocultado para o teste'),
  ('c0470000-0000-4000-8000-000000000023', (select id from public.espacos where slug = 'sono'),
   'c0470000-0000-4000-8000-000000000011', 'Tópico T3', 'Corpo T3', 'removido', 'removido para o teste'),
  ('c0470000-0000-4000-8000-000000000024', (select id from public.espacos where slug = 'banho'),
   'c0470000-0000-4000-8000-000000000012', 'Tópico T4', 'Corpo T4', 'visivel', null),
  ('c0470000-0000-4000-8000-000000000025', (select id from public.espacos where slug = 'banho'),
   'c0470000-0000-4000-8000-000000000013', 'Tópico T5', 'Corpo T5', 'visivel', null),
  ('c0470000-0000-4000-8000-000000000026', (select id from public.espacos where slug = 'banho'),
   'c0470000-0000-4000-8000-000000000017', 'Tópico TM', 'Corpo TM', 'visivel', null);

-- R1 Outro em T1; R2 Autor em T4; R3 Bloqueado em T1; R4 Outro em T1 (oculta); R5 Outro em T3;
-- R6 Autor em T1 (removida); R7 Autor em T1, resposta à R1.
insert into public.respostas (id, topico_id, autor_id, resposta_a, corpo, estado, motivo_moderacao) values
  ('c0470000-0000-4000-8000-000000000031', 'c0470000-0000-4000-8000-000000000021',
   'c0470000-0000-4000-8000-000000000012', null, 'Resposta R1', 'visivel', null),
  ('c0470000-0000-4000-8000-000000000032', 'c0470000-0000-4000-8000-000000000024',
   'c0470000-0000-4000-8000-000000000011', null, 'Resposta R2', 'visivel', null),
  ('c0470000-0000-4000-8000-000000000033', 'c0470000-0000-4000-8000-000000000021',
   'c0470000-0000-4000-8000-000000000013', null, 'Resposta R3', 'visivel', null),
  ('c0470000-0000-4000-8000-000000000034', 'c0470000-0000-4000-8000-000000000021',
   'c0470000-0000-4000-8000-000000000012', null, 'Resposta R4', 'oculto', 'oculta para o teste'),
  ('c0470000-0000-4000-8000-000000000035', 'c0470000-0000-4000-8000-000000000023',
   'c0470000-0000-4000-8000-000000000012', null, 'Resposta R5', 'visivel', null),
  ('c0470000-0000-4000-8000-000000000036', 'c0470000-0000-4000-8000-000000000021',
   'c0470000-0000-4000-8000-000000000011', null, 'Resposta R6', 'removido', 'removida para o teste'),
  ('c0470000-0000-4000-8000-000000000037', 'c0470000-0000-4000-8000-000000000021',
   'c0470000-0000-4000-8000-000000000011', 'c0470000-0000-4000-8000-000000000031', 'Resposta R7', 'visivel', null);

insert into public.denuncias (id, denunciante_id, topico_id, motivo) values
  ('c0470000-0000-4000-8000-000000000041', 'c0470000-0000-4000-8000-000000000002',
   'c0470000-0000-4000-8000-000000000021', 'outro');

insert into public.auditoria_moderacao (id, ator_id, acao, alvo_tipo, alvo_id, motivo) values
  ('c0470000-0000-4000-8000-000000000051', 'c0470000-0000-4000-8000-000000000007', 'ocultar', 'topico',
   'c0470000-0000-4000-8000-000000000022', 'registro do teste');

set local role authenticated;

-- Tópicos (D5, D6)
select is(
  pg_temp.ler(e.conta, $q$select coalesce(string_agg(right(id::text, 2), ',' order by id), '') from public.topicos where id::text like 'c047%'$q$),
  (array['21,22,24,26', '21,24,25,26', '24,25,26', '21,24,25,26', '21,24,25,26', '',
         '21,22,23,24,25,26', '21,22,23,24,25,26', '21,24,25,26'])[e.ordem],
  e.nome || ' lê os tópicos que pode ler'
) from pg_temp.elenco() e;

-- Respostas (D5): as de um tópico que o chamador não lê somem, inclusive as dele
select is(
  pg_temp.ler(e.conta, $q$select coalesce(string_agg(right(id::text, 2), ',' order by id), '') from public.respostas where id::text like 'c047%'$q$),
  (array['31,32,37', '31,32,33,34,37', '', '31,32,33,37', '31,32,33,37', '',
         '31,32,33,34,35,36,37', '31,32,33,34,35,36,37', '31,32,33,37'])[e.ordem],
  e.nome || ' lê as respostas que pode ler'
) from pg_temp.elenco() e;

-- Perfis públicos: o dono lê o próprio sempre; bloqueio esconde nos dois sentidos
select is(
  pg_temp.ler(e.conta, $q$select coalesce(string_agg(right(id::text, 2), ',' order by id), '') from public.perfis_publicos where id::text like 'c047%'$q$),
  (array['11,12,14,17,19', '11,12,13,14,17,19', '12,13,14,17,19', '11,12,13,14,17,19',
         '11,12,13,14,17,19', '', '11,12,13,14,17,19', '11,12,13,14,17,19', '11,12,13,14,17,19'])[e.ordem],
  e.nome || ' lê os perfis que pode ler'
) from pg_temp.elenco() e;

-- Tabelas de consulta: qualquer conta lê, mesmo sem linha em contas (a política é "toda linha")
select is(
  pg_temp.ler(e.conta, $q$select count(*) from public.versoes_termos where versao = '2026-11-05'$q$),
  '1',
  e.nome || ' lê a versão vigente dos termos'
) from pg_temp.elenco() e;

select is(
  pg_temp.ler(e.conta, $q$select count(*) from public.espacos where ordem between 1 and 7$q$),
  '7',
  e.nome || ' lê os 7 espaços'
) from pg_temp.elenco() e;

-- Aceites: só os próprios
select is(
  pg_temp.ler(e.conta, $q$select count(*) from public.aceites_termos where conta_id::text like 'c047%'$q$),
  (array['1', '1', '1', '0', '1', '0', '1', '0', '1'])[e.ordem],
  e.nome || ' lê só os próprios aceites'
) from pg_temp.elenco() e;

-- Denúncias: só a moderação (inclusive o denunciante não lê)
select is(
  pg_temp.ler(e.conta, $q$select count(*) from public.denuncias where id::text like 'c047%'$q$),
  (array['0', '0', '0', '0', '0', '0', '1', '1', '0'])[e.ordem],
  e.nome || ' lê denúncias só se for moderação'
) from pg_temp.elenco() e;

-- Bloqueios: só quem bloqueou vê a linha
select is(
  pg_temp.ler(e.conta, $q$select count(*) from public.bloqueios where bloqueador_id::text like 'c047%'$q$),
  (array['1', '0', '0', '0', '0', '0', '0', '0', '0'])[e.ordem],
  e.nome || ' lê só os próprios bloqueios'
) from pg_temp.elenco() e;

-- Papéis: cada conta vê os próprios; o admin vê todos
select is(
  pg_temp.ler(e.conta, $q$select count(*) from public.papeis_plataforma where conta_id::text like 'c047%'$q$),
  (array['0', '0', '0', '0', '0', '0', '1', '3', '1'])[e.ordem],
  e.nome || ' lê os papéis que pode ler'
) from pg_temp.elenco() e;

-- Auditoria: só a moderação
select is(
  pg_temp.ler(e.conta, $q$select count(*) from public.auditoria_moderacao where id::text like 'c047%'$q$),
  (array['0', '0', '0', '0', '0', '0', '1', '1', '0'])[e.ordem],
  e.nome || ' lê a auditoria só se for moderação'
) from pg_temp.elenco() e;

-- Colunas nunca lidas pelo cliente (D17 e COM-04): 42501 para todos, moderação inclusive
select is(
  pg_temp.ler(v.conta, v.consulta), 'ERRO:42501', v.descricao
) from (values
  ('c0470000-0000-4000-8000-000000000001'::uuid, 'select conta_id::text from public.perfis_publicos limit 1',
   'Autor não lê perfis_publicos.conta_id'),
  ('c0470000-0000-4000-8000-000000000007'::uuid, 'select conta_id::text from public.perfis_publicos limit 1',
   'Moderador não lê perfis_publicos.conta_id'),
  ('c0470000-0000-4000-8000-000000000008'::uuid, 'select conta_id::text from public.perfis_publicos limit 1',
   'Admin não lê perfis_publicos.conta_id'),
  ('c0470000-0000-4000-8000-000000000007'::uuid, 'select count(*) from (select * from public.perfis_publicos) x',
   'select * em perfis_publicos dá 42501 até para a moderação'),
  ('c0470000-0000-4000-8000-000000000001'::uuid, 'select count(*) from (select * from public.perfis_publicos) x',
   'select * em perfis_publicos dá 42501 para o Autor'),
  ('c0470000-0000-4000-8000-000000000008'::uuid, 'select count(*) from (select * from public.perfis_publicos) x',
   'select * em perfis_publicos dá 42501 para o Admin'),
  ('c0470000-0000-4000-8000-000000000001'::uuid, 'select count(*) from (select * from public.denuncias) x',
   'select * em denuncias dá 42501 para o Autor'),
  ('c0470000-0000-4000-8000-000000000008'::uuid, 'select count(*) from (select * from public.denuncias) x',
   'select * em denuncias dá 42501 para o Admin'),
  ('c0470000-0000-4000-8000-000000000007'::uuid, 'select denunciante_id::text from public.denuncias limit 1',
   'Moderador não lê denuncias.denunciante_id'),
  ('c0470000-0000-4000-8000-000000000002'::uuid, 'select denunciante_id::text from public.denuncias limit 1',
   'o denunciante não lê denuncias.denunciante_id'),
  ('c0470000-0000-4000-8000-000000000008'::uuid, 'select decidida_por::text from public.denuncias limit 1',
   'Admin não lê denuncias.decidida_por'),
  ('c0470000-0000-4000-8000-000000000007'::uuid, 'select count(*) from (select * from public.denuncias) x',
   'select * em denuncias dá 42501 até para a moderação')
) as v(conta, consulta, descricao);

-- Funções auxiliares, por conta: perfil | conta habilitada | aceite vigente | escritor | moderador | admin
select is(
  pg_temp.ler(e.conta, $q$select concat_ws('|',
      coalesce(right(public.meu_perfil_id()::text, 2), '--'),
      public.conta_habilitada()::text,
      public.aceite_vigente()::text,
      public.escritor_habilitado()::text,
      public.tem_papel_plataforma(array['moderador']::public.papel_plataforma[])::text,
      public.tem_papel_plataforma(array['admin']::public.papel_plataforma[])::text)$q$),
  (array['11|true|true|true|false|false', '12|true|true|true|false|false', '13|true|true|true|false|false',
         '14|true|false|false|false|false', '--|true|true|false|false|false', '--|false|false|false|false|false',
         '17|true|true|true|true|false', '--|true|false|false|false|true', '19|true|true|true|false|false'])[e.ordem],
  e.nome || ': respostas das funções auxiliares de identidade'
) from pg_temp.elenco() e;

-- As funções das políticas respondem "posso ler a linha X", a mesma resposta do select
select is(
  pg_temp.ler(v.conta, v.consulta), v.esperado, v.descricao
) from (values
  ('c0470000-0000-4000-8000-000000000002'::uuid, 'select public.pode_ler_perfil(''c0470000-0000-4000-8000-000000000013'')::text', 'true',
   'Outro pode ler o perfil do Bloqueado'),
  ('c0470000-0000-4000-8000-000000000001'::uuid, 'select public.pode_ler_perfil(''c0470000-0000-4000-8000-000000000013'')::text', 'false',
   'Autor não pode ler o perfil de quem bloqueou'),
  ('c0470000-0000-4000-8000-000000000003'::uuid, 'select public.pode_ler_perfil(''c0470000-0000-4000-8000-000000000011'')::text', 'false',
   'Bloqueado não pode ler o perfil de quem o bloqueou'),
  ('c0470000-0000-4000-8000-000000000007'::uuid, 'select public.pode_ler_perfil(''c0470000-0000-4000-8000-000000000013'')::text', 'true',
   'moderação pode ler qualquer perfil'),
  ('c0470000-0000-4000-8000-000000000006'::uuid, 'select public.pode_ler_perfil(''c0470000-0000-4000-8000-000000000012'')::text', 'false',
   'conta sem linha em contas não pode ler perfil'),
  ('c0470000-0000-4000-8000-000000000001'::uuid, 'select public.pode_ler_topico(''c0470000-0000-4000-8000-000000000022'')::text', 'true',
   'Autor pode ler o próprio tópico oculto'),
  ('c0470000-0000-4000-8000-000000000002'::uuid, 'select public.pode_ler_topico(''c0470000-0000-4000-8000-000000000022'')::text', 'false',
   'Outro não pode ler tópico oculto alheio'),
  ('c0470000-0000-4000-8000-000000000007'::uuid, 'select public.pode_ler_topico(''c0470000-0000-4000-8000-000000000022'')::text', 'true',
   'moderação pode ler tópico oculto'),
  ('c0470000-0000-4000-8000-000000000001'::uuid, 'select public.pode_ler_topico(''c0470000-0000-4000-8000-000000000023'')::text', 'false',
   'Autor não pode ler o próprio tópico removido'),
  ('c0470000-0000-4000-8000-000000000003'::uuid, 'select public.pode_ler_topico(''c0470000-0000-4000-8000-000000000021'')::text', 'false',
   'Bloqueado não pode ler tópico de quem o bloqueou'),
  ('c0470000-0000-4000-8000-000000000002'::uuid, 'select public.pode_ler_resposta(''c0470000-0000-4000-8000-000000000034'')::text', 'true',
   'Outro pode ler a própria resposta oculta'),
  ('c0470000-0000-4000-8000-000000000001'::uuid, 'select public.pode_ler_resposta(''c0470000-0000-4000-8000-000000000034'')::text', 'false',
   'Autor não pode ler resposta oculta alheia'),
  ('c0470000-0000-4000-8000-000000000003'::uuid, 'select public.pode_ler_resposta(''c0470000-0000-4000-8000-000000000033'')::text', 'false',
   'Bloqueado não lê nem a própria resposta num tópico que não lê'),
  ('c0470000-0000-4000-8000-000000000002'::uuid, 'select public.pode_responder(''c0470000-0000-4000-8000-000000000021'', null)::text', 'true',
   'Outro pode responder tópico visível'),
  ('c0470000-0000-4000-8000-000000000003'::uuid, 'select public.pode_responder(''c0470000-0000-4000-8000-000000000021'', null)::text', 'false',
   'Bloqueado não pode responder tópico de quem o bloqueou'),
  ('c0470000-0000-4000-8000-000000000002'::uuid, 'select public.pode_responder(''c0470000-0000-4000-8000-000000000022'', null)::text', 'false',
   'ninguém responde tópico oculto'),
  ('c0470000-0000-4000-8000-000000000007'::uuid, 'select public.pode_responder(''c0470000-0000-4000-8000-000000000022'', null)::text', 'false',
   'moderação não tem atalho para responder'),
  ('c0470000-0000-4000-8000-000000000002'::uuid, 'select public.pode_responder(''c0470000-0000-4000-8000-000000000021'', ''c0470000-0000-4000-8000-000000000037'')::text', 'true',
   'Outro pode responder a uma resposta visível'),
  ('c0470000-0000-4000-8000-000000000002'::uuid, 'select public.pode_responder(''c0470000-0000-4000-8000-000000000021'', ''c0470000-0000-4000-8000-000000000034'')::text', 'false',
   'ninguém responde a uma resposta oculta'),
  ('c0470000-0000-4000-8000-000000000001'::uuid, 'select public.ha_bloqueio(''c0470000-0000-4000-8000-000000000013'')::text', 'ERRO:42501',
   'authenticated não executa ha_bloqueio')
) as v(conta, consulta, esperado, descricao);

-- Sem versão vigente a leitura continua (D8)
reset role;
update public.versoes_termos set vigente = false where vigente;
set local role authenticated;

select is(
  pg_temp.ler('c0470000-0000-4000-8000-000000000002',
    $q$select coalesce(string_agg(right(id::text, 2), ',' order by id), '') from public.topicos where id::text like 'c047%'$q$),
  '21,24,25,26',
  'sem versão vigente, Outro continua lendo os tópicos'
);

select is(
  pg_temp.ler('c0470000-0000-4000-8000-000000000001',
    $q$select coalesce(string_agg(right(id::text, 2), ',' order by id), '') from public.perfis_publicos where id::text like 'c047%'$q$),
  '11,12,14,17,19',
  'sem versão vigente, Autor continua lendo os perfis'
);

reset role;

select * from finish();
rollback;
