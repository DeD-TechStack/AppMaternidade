begin;
create extension if not exists pgtap with schema extensions;

select plan(82);

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('c0470000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Executa um comando como a conta pedida (sessão já authenticated): linhas afetadas ou 'ERRO:<sqlstate>'
-- (com a mensagem nos erros P0001, P0002 e 'alvo invalido').
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
  return 'ERRO:' || sqlstate
    || case when sqlstate in ('P0001', 'P0002') or sqlerrm = 'alvo invalido' then ':' || sqlerrm else '' end;
end;
$$;

-- Consulta de uma linha e uma coluna como a conta pedida: valor em texto ou 'ERRO:<sqlstate>'.
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

insert into auth.users (id, email) values
  (pg_temp.i(1), 'c047-autor@exemplo.invalid'),
  (pg_temp.i(2), 'c047-outro@exemplo.invalid'),
  (pg_temp.i(3), 'c047-bloqueado@exemplo.invalid'),
  (pg_temp.i(4), 'c047-semaceite@exemplo.invalid'),
  (pg_temp.i(5), 'c047-semperfil@exemplo.invalid'),
  (pg_temp.i(6), 'c047-semconta@exemplo.invalid'),
  (pg_temp.i(7), 'c047-moderador@exemplo.invalid'),
  (pg_temp.i(8), 'c047-admin@exemplo.invalid'),
  (pg_temp.i(9), 'c047-modvencido@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  (pg_temp.i(1), 'Autor'), (pg_temp.i(2), 'Outro'), (pg_temp.i(3), 'Bloqueado'), (pg_temp.i(4), 'Sem aceite'),
  (pg_temp.i(5), 'Sem perfil'), (pg_temp.i(7), 'Moderador'), (pg_temp.i(8), 'Admin'), (pg_temp.i(9), 'Moderador vencido');

insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(1), '2026-11-05'), (pg_temp.i(2), '2026-11-05'), (pg_temp.i(3), '2026-11-05'),
  (pg_temp.i(5), '2026-11-05'), (pg_temp.i(7), '2026-11-05'), (pg_temp.i(9), '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(11), pg_temp.i(1), 'teste_autor'), (pg_temp.i(12), pg_temp.i(2), 'teste_outro'),
  (pg_temp.i(13), pg_temp.i(3), 'teste_bloqueado'), (pg_temp.i(14), pg_temp.i(4), 'teste_semaceite'),
  (pg_temp.i(17), pg_temp.i(7), 'teste_moderador'), (pg_temp.i(19), pg_temp.i(9), 'teste_modvencido');

-- O Autor bloqueou o Bloqueado.
insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(11), pg_temp.i(13));

insert into public.papeis_plataforma (conta_id, papel, valido_ate) values
  (pg_temp.i(7), 'moderador', null), (pg_temp.i(8), 'admin', null),
  (pg_temp.i(9), 'moderador', now() - interval '1 day');

-- T1 visível, T2 oculto, T3 removido (Autor); T4 Outro; T5 Bloqueado.
insert into public.topicos (id, espaco_id, autor_id, titulo, corpo, estado, motivo_moderacao) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T1', 'Corpo T1', 'visivel', null),
  (pg_temp.i(22), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T2', 'Corpo T2', 'oculto', 'oculto no teste'),
  (pg_temp.i(23), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T3', 'Corpo T3', 'removido', 'removido no teste'),
  (pg_temp.i(24), (select id from public.espacos where slug = 'banho'), pg_temp.i(12), 'Tópico T4', 'Corpo T4', 'visivel', null),
  (pg_temp.i(25), (select id from public.espacos where slug = 'banho'), pg_temp.i(13), 'Tópico T5', 'Corpo T5', 'visivel', null);

-- Dados de cuidado (MAT-43) só para provar que o id de uma família ou de um bebê não é alvo de denúncia.
insert into public.familias (id, nome, fuso, criada_por) values
  (pg_temp.i(60), 'Família do teste', 'America/Sao_Paulo', pg_temp.i(2));
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  (pg_temp.i(61), pg_temp.i(60), 'Bebê do teste', '2026-01-01', pg_temp.i(2));

-- R1 Outro/T1 (visível); R4 Outro/T1 (oculta); R5 Outro/T3 (tópico removido).
insert into public.respostas (id, topico_id, autor_id, corpo, estado, motivo_moderacao) values
  (pg_temp.i(31), pg_temp.i(21), pg_temp.i(12), 'Resposta R1', 'visivel', null),
  (pg_temp.i(34), pg_temp.i(21), pg_temp.i(12), 'Resposta R4', 'oculto', 'oculta no teste'),
  (pg_temp.i(35), pg_temp.i(23), pg_temp.i(12), 'Resposta R5', 'visivel', null);

-- Denúncias prontas para a ordem de minhas_denuncias: 41 mais antiga; 42 e 44 empatam em criada_em.
insert into public.denuncias (id, denunciante_id, topico_id, resposta_id, motivo, criada_em) values
  (pg_temp.i(41), pg_temp.i(2), pg_temp.i(21), null, 'outro', now() - interval '2 hours'),
  (pg_temp.i(42), pg_temp.i(2), pg_temp.i(24), null, 'outro', now() - interval '1 hour'),
  (pg_temp.i(43), pg_temp.i(1), pg_temp.i(24), null, 'outro', now() - interval '1 hour'),
  (pg_temp.i(44), pg_temp.i(2), null, pg_temp.i(31), 'outro', now() - interval '1 hour');

-- minhas_denuncias: só as da conta chamadora, da mais nova para a mais antiga, desempate por id
select is(proargnames,
  array['id', 'topico_id', 'resposta_id', 'perfil_id', 'motivo', 'texto', 'estado', 'criada_em', 'decidida_em'],
  'minhas_denuncias devolve 9 colunas, sem denunciante_id nem decidida_por')
from pg_proc where oid = 'public.minhas_denuncias()'::regprocedure;

set local role authenticated;

select is(
  pg_temp.ler(v.n, $q$select coalesce(string_agg(right(id::text, 2), ','), '') from public.minhas_denuncias()$q$),
  v.esperado, v.descricao
) from (values
  (2, '42,44,41', 'Outro vê as próprias denúncias, da mais nova para a mais antiga, empate por id'),
  (1, '43', 'Autor vê só a própria denúncia'),
  (7, '', 'Moderador não vê denúncia de outra conta em minhas_denuncias'),
  (8, '', 'Admin não vê denúncia de outra conta em minhas_denuncias'),
  (6, '', 'conta sem linha em contas recebe 0 linhas de minhas_denuncias')
) as v(n, esperado, descricao);

-- denunciar: erros na ordem do catálogo, um por asserção
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (6, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21))$s$,
   'ERRO:P0001:sem conta', 'sem conta não denuncia'),
  (4, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21))$s$,
   'ERRO:P0001:sem aceite', 'sem aceite não denuncia'),
  (8, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21))$s$,
   'ERRO:P0001:sem aceite', 'Admin sem aceite não denuncia'),
  (5, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21))$s$,
   'ERRO:P0001:sem perfil', 'sem perfil não denuncia'),
  (1, $s$select public.denunciar(null::public.motivo_denuncia, p_topico_id => pg_temp.i(21))$s$,
   'ERRO:P0001:parametro obrigatorio', 'motivo nulo é recusado'),
  (1, $s$select public.denunciar(p_motivo => 'outro')$s$,
   'ERRO:23514:alvo invalido', 'denúncia sem alvo é recusada'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21), p_resposta_id => pg_temp.i(31))$s$,
   'ERRO:23514:alvo invalido', 'denúncia com tópico e resposta é recusada'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21), p_perfil_id => pg_temp.i(12))$s$,
   'ERRO:23514:alvo invalido', 'denúncia com tópico e perfil é recusada'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_resposta_id => pg_temp.i(31), p_perfil_id => pg_temp.i(12))$s$,
   'ERRO:23514:alvo invalido', 'denúncia com resposta e perfil é recusada'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21), p_resposta_id => pg_temp.i(31), p_perfil_id => pg_temp.i(12))$s$,
   'ERRO:23514:alvo invalido', 'denúncia com os três alvos é recusada'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(99))$s$,
   'ERRO:P0002:alvo inexistente', 'tópico inexistente'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(22))$s$,
   'ERRO:P0002:alvo inexistente', 'tópico oculto não é denunciável'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(23))$s$,
   'ERRO:P0002:alvo inexistente', 'tópico removido não é denunciável'),
  (2, $s$select public.denunciar(p_motivo => 'outro', p_resposta_id => pg_temp.i(99))$s$,
   'ERRO:P0002:alvo inexistente', 'resposta inexistente'),
  (2, $s$select public.denunciar(p_motivo => 'outro', p_resposta_id => pg_temp.i(34))$s$,
   'ERRO:P0002:alvo inexistente', 'resposta oculta não é denunciável'),
  (2, $s$select public.denunciar(p_motivo => 'outro', p_resposta_id => pg_temp.i(35))$s$,
   'ERRO:P0002:alvo inexistente', 'resposta visível de tópico removido não é denunciável'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_perfil_id => pg_temp.i(99))$s$,
   'ERRO:P0002:alvo inexistente', 'perfil inexistente'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(61))$s$,
   'ERRO:P0002:alvo inexistente', 'id de bebê usado como tópico não é alvo de denúncia'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_resposta_id => pg_temp.i(61))$s$,
   'ERRO:P0002:alvo inexistente', 'id de bebê usado como resposta não é alvo de denúncia'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_perfil_id => pg_temp.i(61))$s$,
   'ERRO:P0002:alvo inexistente', 'id de bebê usado como perfil não é alvo de denúncia'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(60))$s$,
   'ERRO:P0002:alvo inexistente', 'id de família usado como tópico não é alvo de denúncia'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_resposta_id => pg_temp.i(60))$s$,
   'ERRO:P0002:alvo inexistente', 'id de família usado como resposta não é alvo de denúncia'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_perfil_id => pg_temp.i(60))$s$,
   'ERRO:P0002:alvo inexistente', 'id de família usado como perfil não é alvo de denúncia'),
  (2, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21), p_texto => repeat('d', 501))$s$,
   'ERRO:23514', 'texto de denúncia acima de 500 sai do check'),
  (2, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21), p_texto => '')$s$,
   'ERRO:23514', 'texto de denúncia vazio sai do check')
) as v(n, sql, esperado, descricao);

-- Sem versão vigente: termos indisponíveis (o erro de conta vem antes)
reset role;
update public.versoes_termos set vigente = false where vigente;
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (6, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21))$s$,
   'ERRO:P0001:sem conta', 'sem versão vigente, sem conta ainda dá sem conta'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21))$s$,
   'ERRO:P0001:termos indisponiveis', 'sem versão vigente, ninguém denuncia')
) as v(n, sql, esperado, descricao);

reset role;
update public.versoes_termos set vigente = true where versao = '2026-11-05';
set local role authenticated;

-- denunciar: acertos. Bloqueio e autoria não impedem (D16).
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (2, $s$select set_config('teste.den', public.denunciar(p_motivo => 'spam_venda', p_topico_id => pg_temp.i(21), p_texto => 'Texto da denuncia')::text, true)$s$,
   '1', 'Outro denuncia um tópico visível'),
  (2, $s$select public.denunciar(p_motivo => 'outro', p_resposta_id => pg_temp.i(31))$s$,
   '1', 'Outro denuncia uma resposta visível (a própria também, D16)'),
  (2, $s$select public.denunciar(p_motivo => 'dados_pessoais', p_perfil_id => pg_temp.i(11))$s$,
   '1', 'Outro denuncia o perfil do Autor'),
  (3, $s$select public.denunciar(p_motivo => 'ataque_assedio', p_topico_id => pg_temp.i(21))$s$,
   '1', 'Bloqueado denuncia o tópico de quem o bloqueou'),
  (3, $s$select public.denunciar(p_motivo => 'ataque_assedio', p_perfil_id => pg_temp.i(11))$s$,
   '1', 'Bloqueado denuncia o perfil de quem o bloqueou'),
  (1, $s$select public.denunciar(p_motivo => 'spam_venda', p_perfil_id => pg_temp.i(13))$s$,
   '1', 'Autor denuncia o perfil de quem bloqueou'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21))$s$,
   '1', 'Autor denuncia o próprio tópico'),
  (7, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21))$s$,
   '1', 'Moderador denuncia como usuário comum'),
  (9, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21))$s$,
   '1', 'Moderador vencido denuncia como usuário comum')
) as v(n, sql, esperado, descricao);

-- Denúncia só por função: nenhum comando direto
select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501', v.descricao
) from (values
  (2, $s$insert into public.denuncias (denunciante_id, topico_id, motivo) values (pg_temp.i(2), pg_temp.i(21), 'outro')$s$,
   'Outro não insere denúncia direto'),
  (7, $s$insert into public.denuncias (denunciante_id, topico_id, motivo) values (pg_temp.i(7), pg_temp.i(21), 'outro')$s$,
   'Moderador não insere denúncia direto'),
  (8, $s$insert into public.denuncias (denunciante_id, topico_id, motivo) values (pg_temp.i(8), pg_temp.i(21), 'outro')$s$,
   'Admin não insere denúncia direto'),
  (7, $s$update public.denuncias set estado = 'procedente' where id = pg_temp.i(41)$s$,
   'Moderador não muda o estado da denúncia direto'),
  (2, $s$update public.denuncias set texto = 'mudei' where id = pg_temp.i(41)$s$,
   'o denunciante não edita a denúncia'),
  (2, $s$select decidida_por::text from public.denuncias limit 1$s$,
   'o denunciante não lê denuncias.decidida_por'),
  (7, $s$select decidida_por::text from public.denuncias limit 1$s$,
   'Moderador não lê denuncias.decidida_por'),
  (2, $s$select denunciante_id::text from public.denuncias limit 1$s$,
   'o denunciante não lê denuncias.denunciante_id'),
  (7, $s$select denunciante_id::text from public.denuncias limit 1$s$,
   'Moderador não lê denuncias.denunciante_id'),
  (7, $s$delete from public.denuncias where id = pg_temp.i(41)$s$,
   'Moderador não apaga denúncia'),
  (2, $s$delete from public.denuncias where id = pg_temp.i(41)$s$,
   'o denunciante não apaga denúncia')
) as v(n, sql, descricao);

reset role;

select is(
  (select count(*)::int from public.denuncias
    where id = current_setting('teste.den')::uuid
      and denunciante_id = pg_temp.i(2) and topico_id = pg_temp.i(21)
      and resposta_id is null and perfil_id is null
      and motivo = 'spam_venda' and texto = 'Texto da denuncia'
      and estado = 'aberta' and decidida_por is null and decidida_em is null),
  1,
  'denunciar grava a denúncia aberta e devolve o id dela'
);

select is(
  (select count(*)::int from public.denuncias where denunciante_id = pg_temp.i(2)),
  6,
  'Outro tem as 3 denúncias prontas e as 3 que abriu (tópico, resposta e perfil do Autor): as chamadas negadas não gravaram nada'
);

-- Bloqueios: criar, remover e efeito nos dois sentidos
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(11), pg_temp.i(12))$s$,
   '1', 'Autor bloqueia o Outro'),
  (4, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(14), pg_temp.i(12))$s$,
   '1', 'quem não aceitou os termos ainda pode bloquear (D7)'),
  (7, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(17), pg_temp.i(12))$s$,
   '1', 'Moderador bloqueia como usuário comum'),
  (9, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(19), pg_temp.i(12))$s$,
   '1', 'Moderador vencido bloqueia como usuário comum'),
  (5, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (null, pg_temp.i(12))$s$,
   'ERRO:42501', 'sem perfil não bloqueia'),
  (6, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(12), pg_temp.i(13))$s$,
   'ERRO:42501', 'sem conta não bloqueia em nome de outro perfil'),
  (8, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(17), pg_temp.i(13))$s$,
   'ERRO:42501', 'Admin não bloqueia em nome de outro perfil'),
  (2, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(11), pg_temp.i(14))$s$,
   'ERRO:42501', 'Outro não bloqueia em nome do Autor'),
  (1, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(11), pg_temp.i(11))$s$,
   'ERRO:23514', 'ninguém bloqueia a si mesmo'),
  (1, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(11), pg_temp.i(13))$s$,
   'ERRO:23505', 'o mesmo bloqueio não se repete'),
  (1, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(11), pg_temp.i(99))$s$,
   'ERRO:23503', 'bloqueio de perfil inexistente é recusado'),
  (1, $s$update public.bloqueios set bloqueado_id = pg_temp.i(14) where bloqueador_id = pg_temp.i(11)$s$,
   'ERRO:42501', 'bloqueio não se altera'),
  (2, $s$delete from public.bloqueios where bloqueador_id = pg_temp.i(11) and bloqueado_id = pg_temp.i(13)$s$,
   '0', 'Outro não remove bloqueio do Autor (0 linhas)'),
  (3, $s$delete from public.bloqueios where bloqueador_id = pg_temp.i(11) and bloqueado_id = pg_temp.i(13)$s$,
   '0', 'o Bloqueado não remove o bloqueio (0 linhas)'),
  (7, $s$delete from public.bloqueios where bloqueador_id = pg_temp.i(11) and bloqueado_id = pg_temp.i(13)$s$,
   '0', 'Moderador não remove bloqueio alheio (0 linhas)'),
  (8, $s$delete from public.bloqueios where bloqueador_id = pg_temp.i(11) and bloqueado_id = pg_temp.i(13)$s$,
   '0', 'Admin não remove bloqueio alheio (0 linhas)'),
  (6, $s$delete from public.bloqueios where bloqueador_id = pg_temp.i(11) and bloqueado_id = pg_temp.i(13)$s$,
   '0', 'sem conta não remove bloqueio (0 linhas)')
) as v(n, sql, esperado, descricao);

reset role;

select is(
  (select count(*)::int from public.bloqueios
    where bloqueador_id = pg_temp.i(11) and bloqueado_id = pg_temp.i(13)),
  1,
  'o bloqueio do Autor ao Bloqueado segue intacto depois das tentativas alheias'
);

set local role authenticated;

-- Efeito nos dois sentidos, e desfeito ao desbloquear
select is(
  pg_temp.ler(v.n, v.sql), v.esperado, v.descricao
) from (values
  (3, $s$select count(*) from public.topicos where id = pg_temp.i(21)$s$, '0', 'o Bloqueado não vê o tópico de quem o bloqueou'),
  (1, $s$select count(*) from public.topicos where id = pg_temp.i(25)$s$, '0', 'o Autor não vê o tópico de quem bloqueou'),
  (1, $s$select count(*) from public.perfis_publicos where id = pg_temp.i(13)$s$, '0', 'o Autor não vê o perfil de quem bloqueou'),
  (3, $s$select count(*) from public.perfis_publicos where id = pg_temp.i(11)$s$, '0', 'o Bloqueado não vê o perfil de quem o bloqueou'),
  (3, $s$select count(*) from public.bloqueios where bloqueado_id = pg_temp.i(13)$s$, '0', 'o Bloqueado não vê a linha do bloqueio')
) as v(n, sql, esperado, descricao);

select is(
  pg_temp.exec(1, $s$delete from public.bloqueios where bloqueador_id = pg_temp.i(11) and bloqueado_id = pg_temp.i(13)$s$),
  '1',
  'Autor desbloqueia o Bloqueado'
);

select is(
  pg_temp.ler(v.n, v.sql), v.esperado, v.descricao
) from (values
  (3, $s$select count(*) from public.topicos where id = pg_temp.i(21)$s$, '1', 'desbloqueado, o Bloqueado volta a ver o tópico do Autor'),
  (1, $s$select count(*) from public.topicos where id = pg_temp.i(25)$s$, '1', 'desbloqueado, o Autor volta a ver o tópico do Bloqueado')
) as v(n, sql, esperado, descricao);

select is(
  pg_temp.exec(3, $s$insert into public.respostas (topico_id, autor_id, corpo)
    values (pg_temp.i(21), pg_temp.i(13), 'Resposta depois do desbloqueio')$s$),
  '1',
  'desbloqueado, o Bloqueado volta a responder o tópico do Autor'
);

reset role;

select * from finish();
rollback;
