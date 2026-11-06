begin;
create extension if not exists pgtap with schema extensions;

select plan(95);

-- 47-M1 (adendo R-B, R2 e R7, com a correção da revisão 1): as quatro funções que agem por papel de plataforma
-- decidem pela situação DEPOIS de toda espera. A concorrência de verdade fica fora do teste (R7: sem dblink,
-- sem segunda sessão); a prova é sequencial, em sete frentes:
--   1. conceder (papel-alvo ausente e presente), revogar, moderar e decidir: depois da chamada, a trava consultiva
--      da chave fixa da comunidade está em poder deste backend (conceder e revogar) e a linha de papel do
--      chamador foi lida com trava compartilhada (xmax diferente de 0 e a linha intacta);
--   2. papel revogado ou vencido antes da chamada segue negado, com alvo ausente e presente, sem gravar nada;
--   3. a ordem no corpo: trava consultiva, travas de linha, reconferência da linha do chamador, ação;
--   4. o controle: com o papel vigente as quatro chamadas passam;
--   5. a situação que muda entre a conferência inicial e a reconferência (o papel do chamador some ou vence
--      quando a conferência inicial acaba, que é o que uma revogação confirmada durante a espera produz em
--      READ COMMITTED) derruba a ação, com alvo ausente e presente;
--   6. 40P01 e 23502 dentro das funções viram o erro do catálogo;
--   7. os erros próprios do catálogo seguem iguais.
-- Chave fixa: 201863462913 = (47::bigint << 32) | 1, isto é, classid 47 e objid 1 em pg_locks.
-- Ids novos desta tarefa começam com 47 (47e0...); as contas e os dados abaixo só existem dentro da transação.

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('47e00000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Como a conta pedida (sessão já authenticated): linhas afetadas ou 'ERRO:<sqlstate>:<mensagem>'.
-- Zera o contador da troca de tem_papel_plataforma a cada chamada.
create function pg_temp.exec(p_n int, p_sql text) returns text
language plpgsql as $$
declare n int;
begin
  perform set_config('teste.n_papel', '0', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.i(p_n), 'role', 'authenticated')::text, true);
  execute p_sql;
  get diagnostics n = row_count;
  return n::text;
exception when others then
  return 'ERRO:' || sqlstate || ':' || sqlerrm;
end;
$$;

-- A trava consultiva da chave fixa da comunidade está em poder deste backend?
create function pg_temp.trava_presa() returns boolean language sql as $$
  select exists (
    select 1 from pg_locks
     where locktype = 'advisory' and pid = pg_backend_pid() and granted
       and classid::bigint = (201863462913::bigint >> 32)
       and objid::bigint = (201863462913::bigint & 4294967295)
       and objsubid = 1
  )
$$;

-- xmax da linha de papel (0 enquanto ninguém travou a linha), e a linha inteira em texto (sem xmax).
create function pg_temp.xmax_de(p_conta int, p_papel text) returns text language sql as $$
  select pp.xmax::text from public.papeis_plataforma pp
   where pp.conta_id = pg_temp.i(p_conta) and pp.papel = p_papel::public.papel_plataforma
$$;
create function pg_temp.linha_de(p_conta int, p_papel text) returns text language sql as $$
  select to_jsonb(pp)::text from public.papeis_plataforma pp
   where pp.conta_id = pg_temp.i(p_conta) and pp.papel = p_papel::public.papel_plataforma
$$;

-- Foto de todos os papéis das contas deste teste.
create function pg_temp.papeis_foto() returns text language sql as $$
  select coalesce(md5(string_agg(to_jsonb(pp)::text, ',' order by pp.conta_id::text, pp.papel::text)), '-')
    from public.papeis_plataforma pp where pp.conta_id::text like '47e0%'
$$;

create function pg_temp.auditorias() returns int language sql as $$
  select count(*)::int from public.auditoria_moderacao where ator_id::text like '47e0%'
$$;

-- Resumo do que as quatro funções mexem: tópico | denúncia | papel do Outro | papel do Moderador | auditorias.
create function pg_temp.estado() returns text language sql as $$
  select (select estado::text from public.topicos where id = pg_temp.i(21))
    || '|' || (select estado::text from public.denuncias where id = pg_temp.i(41))
    || '|' || exists (select 1 from public.papeis_plataforma where conta_id = pg_temp.i(2))::text
    || '|' || exists (select 1 from public.papeis_plataforma where conta_id = pg_temp.i(7))::text
    || '|' || pg_temp.auditorias()::text
$$;

-- Só os efeitos, sem olhar as linhas dos chamadores (a simulação de perda do papel mexe nelas):
-- tópico | denúncia | papel do Outro (alvo ausente) | papel do Xis (alvo presente) | papel do Alvo | auditorias.
create function pg_temp.efeitos() returns text language sql as $$
  select (select estado::text from public.topicos where id = pg_temp.i(21))
    || '|' || (select estado::text from public.denuncias where id = pg_temp.i(41))
    || '|' || exists (select 1 from public.papeis_plataforma where conta_id = pg_temp.i(2))::text
    || '|' || exists (select 1 from public.papeis_plataforma where conta_id = pg_temp.i(3))::text
    || '|' || exists (select 1 from public.papeis_plataforma where conta_id = pg_temp.i(13))::text
    || '|' || pg_temp.auditorias()::text
$$;

-- As chamadas, uma por função. Os alvos: Outro (2) sem papel; Xis (3) com moderador; Alvo (13) com moderador.
create function pg_temp.moderar() returns text language sql as $$
  select $s$select public.moderar_conteudo('topico', pg_temp.i(21), 'oculto', 'Motivo M1')$s$
$$;
create function pg_temp.decidir() returns text language sql as $$
  select $s$select public.decidir_denuncia(pg_temp.i(41), 'procedente', 'Motivo M1')$s$
$$;
create function pg_temp.conceder() returns text language sql as $$
  select $s$select public.conceder_papel_plataforma(pg_temp.i(2), 'moderador', 'Motivo M1')$s$
$$;
create function pg_temp.conceder_presente() returns text language sql as $$
  select $s$select public.conceder_papel_plataforma(pg_temp.i(3), 'moderador', 'Renovacao M1')$s$
$$;
create function pg_temp.revogar() returns text language sql as $$
  select $s$select public.revogar_papel_plataforma(pg_temp.i(7), 'moderador', 'Motivo M1')$s$
$$;
create function pg_temp.revogar_alvo() returns text language sql as $$
  select $s$select public.revogar_papel_plataforma(pg_temp.i(13), 'moderador', 'Motivo M1')$s$
$$;

-- Contas: Autor (1) e Outro (2) com perfil e aceite; Xis (3) e Alvo (13) moderadores; Moderador (7) e (12);
-- Admin (8), (9) e (16); chamadores de uma só prova de trava: admins 21, 22, 23 e moderadores 24, 25.
insert into auth.users (id, email)
select pg_temp.i(n), 'c47e-' || n || '@exemplo.invalid'
  from unnest(array[1, 2, 3, 7, 8, 9, 12, 13, 16, 21, 22, 23, 24, 25]) as n;

insert into public.contas (id, nome_privado)
select pg_temp.i(n), 'Conta M1 ' || n
  from unnest(array[1, 2, 3, 7, 8, 9, 12, 13, 16, 21, 22, 23, 24, 25]) as n;

insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(1), '2026-11-05'), (pg_temp.i(2), '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(101), pg_temp.i(1), 't_m1_autor'), (pg_temp.i(102), pg_temp.i(2), 't_m1_outro');

insert into public.papeis_plataforma (conta_id, papel, valido_ate)
select pg_temp.i(n), p::public.papel_plataforma, null
  from (values (3, 'moderador'), (7, 'moderador'), (12, 'moderador'), (13, 'moderador'),
               (24, 'moderador'), (25, 'moderador'),
               (8, 'admin'), (9, 'admin'), (16, 'admin'), (21, 'admin'), (22, 'admin'), (23, 'admin')
       ) as v(n, p);

insert into public.topicos (id, espaco_id, autor_id, titulo, corpo) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(101), 'Tópico M1', 'Corpo M1');

insert into public.respostas (id, topico_id, autor_id, corpo) values
  (pg_temp.i(31), pg_temp.i(21), pg_temp.i(102), 'Resposta M1');

insert into public.denuncias (id, denunciante_id, topico_id, motivo) values
  (pg_temp.i(41), pg_temp.i(2), pg_temp.i(21), 'outro');

select is(pg_temp.estado(), 'visivel|aberta|false|true|0', 'ponto de partida: nada decidido, nenhuma auditoria');

-- 1. Prova de trava, um caso por savepoint. Cada chamador de prova é usado uma única vez, para que o xmax da
-- linha dele comece em 0; e a trava consultiva sai com o rollback to savepoint.
-- conceder, alvo ausente (Outro não tem papel): primeira concessão, estado_anterior nulo.
savepoint trava_conceder_ausente;
select set_config('teste.foto', pg_temp.linha_de(21, 'admin'), true);
select is(pg_temp.trava_presa(), false, 'conceder, alvo ausente: antes da chamada a trava consultiva não está presa');
select is(pg_temp.xmax_de(21, 'admin'), '0', 'conceder, alvo ausente: a linha de papel do chamador começa sem trava');
set local role authenticated;
select is(
  pg_temp.exec(21, 'select public.conceder_papel_plataforma(pg_temp.i(2), ''moderador'', ''Primeira concessao'')'),
  '1', 'conceder, alvo ausente: a concessão passa'
);
reset role;
select is(pg_temp.trava_presa(), true, 'conceder, alvo ausente: a trava consultiva da chave fixa está presa depois da chamada');
select isnt(pg_temp.xmax_de(21, 'admin'), '0', 'conceder, alvo ausente: a linha de papel do chamador foi travada em modo compartilhado');
select is(pg_temp.linha_de(21, 'admin'), current_setting('teste.foto'), 'conceder, alvo ausente: a linha do chamador segue intacta');
select is(
  (select estado_anterior from public.auditoria_moderacao where ator_id = pg_temp.i(21) and alvo_id = pg_temp.i(2)),
  null, 'conceder, alvo ausente: a primeira concessão grava estado_anterior nulo'
);
rollback to savepoint trava_conceder_ausente;
select is(pg_temp.trava_presa(), false, 'conceder, alvo ausente: a trava saiu com o savepoint (não vale como prova de outro caso)');

-- conceder, alvo presente (Xis já tem moderador): renovação, estado_anterior = papel.
savepoint trava_conceder_presente;
select set_config('teste.foto', pg_temp.linha_de(22, 'admin'), true);
select is(pg_temp.trava_presa(), false, 'conceder, alvo presente: antes da chamada a trava consultiva não está presa');
select is(pg_temp.xmax_de(22, 'admin'), '0', 'conceder, alvo presente: a linha de papel do chamador começa sem trava');
set local role authenticated;
select is(
  pg_temp.exec(22, 'select public.conceder_papel_plataforma(pg_temp.i(3), ''moderador'', ''Renovacao'')'),
  '1', 'conceder, alvo presente: a renovação passa'
);
reset role;
select is(pg_temp.trava_presa(), true, 'conceder, alvo presente: a trava consultiva da chave fixa está presa depois da chamada');
select isnt(pg_temp.xmax_de(22, 'admin'), '0', 'conceder, alvo presente: a linha de papel do chamador foi travada em modo compartilhado');
select is(pg_temp.linha_de(22, 'admin'), current_setting('teste.foto'), 'conceder, alvo presente: a linha do chamador segue intacta');
select is(
  (select estado_anterior from public.auditoria_moderacao where ator_id = pg_temp.i(22) and alvo_id = pg_temp.i(3)),
  'moderador', 'conceder, alvo presente: a renovação grava estado_anterior igual ao papel'
);
rollback to savepoint trava_conceder_presente;
select is(pg_temp.trava_presa(), false, 'conceder, alvo presente: a trava saiu com o savepoint');

-- revogar (Alvo tem moderador).
savepoint trava_revogar;
select set_config('teste.foto', pg_temp.linha_de(23, 'admin'), true);
select is(pg_temp.trava_presa(), false, 'revogar: antes da chamada a trava consultiva não está presa');
select is(pg_temp.xmax_de(23, 'admin'), '0', 'revogar: a linha de papel do chamador começa sem trava');
set local role authenticated;
select is(
  pg_temp.exec(23, 'select public.revogar_papel_plataforma(pg_temp.i(13), ''moderador'', ''Fim do papel'')'),
  '1', 'revogar: a revogação passa'
);
reset role;
select is(pg_temp.trava_presa(), true, 'revogar: a trava consultiva da chave fixa está presa depois da chamada');
select isnt(pg_temp.xmax_de(23, 'admin'), '0', 'revogar: a linha de papel do chamador foi travada em modo compartilhado');
select is(pg_temp.linha_de(23, 'admin'), current_setting('teste.foto'), 'revogar: a linha do chamador segue intacta');
select is(
  (select estado_anterior from public.auditoria_moderacao where ator_id = pg_temp.i(23) and alvo_id = pg_temp.i(13)),
  'moderador', 'revogar: a auditoria grava o papel anterior'
);
select is(
  (select count(*)::int from public.papeis_plataforma where conta_id = pg_temp.i(13)),
  0, 'revogar: a linha do alvo foi apagada'
);
rollback to savepoint trava_revogar;
select is(pg_temp.trava_presa(), false, 'revogar: a trava saiu com o savepoint');

-- moderar e decidir: sem trava consultiva (não mudam papel), mas a linha de papel do chamador é lida com trava compartilhada.
savepoint trava_moderar;
select set_config('teste.foto', pg_temp.linha_de(24, 'moderador'), true);
select is(pg_temp.xmax_de(24, 'moderador'), '0', 'moderar: a linha de papel do chamador começa sem trava');
set local role authenticated;
select is(pg_temp.exec(24, pg_temp.moderar()), '1', 'moderar: a moderação passa');
reset role;
select isnt(pg_temp.xmax_de(24, 'moderador'), '0', 'moderar: a linha de papel do chamador foi travada em modo compartilhado');
select is(pg_temp.linha_de(24, 'moderador'), current_setting('teste.foto'), 'moderar: a linha do chamador segue intacta');
select is(pg_temp.trava_presa(), false, 'moderar não pega a trava consultiva (não muda papel)');
rollback to savepoint trava_moderar;

savepoint trava_decidir;
select set_config('teste.foto', pg_temp.linha_de(25, 'moderador'), true);
select is(pg_temp.xmax_de(25, 'moderador'), '0', 'decidir: a linha de papel do chamador começa sem trava');
set local role authenticated;
select is(pg_temp.exec(25, pg_temp.decidir()), '1', 'decidir: a decisão passa');
reset role;
select isnt(pg_temp.xmax_de(25, 'moderador'), '0', 'decidir: a linha de papel do chamador foi travada em modo compartilhado');
select is(pg_temp.linha_de(25, 'moderador'), current_setting('teste.foto'), 'decidir: a linha do chamador segue intacta');
select is(pg_temp.trava_presa(), false, 'decidir não pega a trava consultiva (não muda papel)');
rollback to savepoint trava_decidir;

-- 2. Papel revogado ou vencido ANTES da chamada segue negado, com papel-alvo ausente e presente, sem gravar nada.
savepoint antes_revogado;
set local role authenticated;

select is(
  pg_temp.exec(8, 'select public.revogar_papel_plataforma(pg_temp.i(7), ''moderador'', ''Fim do moderador'')'),
  '1', 'o Admin revoga o papel do Moderador antes da chamada'
);
select is(
  pg_temp.exec(8, 'select public.revogar_papel_plataforma(pg_temp.i(9), ''admin'', ''Fim do admin dois'')'),
  '1', 'o Admin revoga o papel do outro Admin antes da chamada'
);

reset role;
select set_config('teste.foto', pg_temp.papeis_foto(), true);
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501:sem papel de plataforma', v.descricao
) from (values
  (7, pg_temp.moderar(), 'papel revogado: moderar_conteudo segue negado'),
  (7, pg_temp.decidir(), 'papel revogado: decidir_denuncia segue negado'),
  (9, pg_temp.conceder(), 'admin revogado: conceder_papel_plataforma segue negado, alvo ausente'),
  (9, pg_temp.conceder_presente(), 'admin revogado: conceder_papel_plataforma segue negado, alvo presente (renovação)'),
  (9, pg_temp.revogar_alvo(), 'admin revogado: revogar_papel_plataforma segue negado, alvo presente'),
  (9, 'select public.revogar_papel_plataforma(pg_temp.i(2), ''moderador'', ''x'')',
   'admin revogado: revogar_papel_plataforma segue negado, alvo ausente')
) as v(n, sql, descricao);

reset role;
select is(pg_temp.papeis_foto(), current_setting('teste.foto'), 'admin revogado: nenhuma linha de papel mudou nas chamadas negadas');
select is(pg_temp.auditorias(), 2, 'admin revogado: só as 2 revogações gravaram auditoria; as chamadas negadas não gravaram nada');
rollback to savepoint antes_revogado;

savepoint antes_vencido;
update public.papeis_plataforma set valido_ate = now() - interval '1 hour'
 where conta_id in (pg_temp.i(7), pg_temp.i(9));
select set_config('teste.foto', pg_temp.papeis_foto(), true);
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501:sem papel de plataforma', v.descricao
) from (values
  (7, pg_temp.moderar(), 'papel vencido: moderar_conteudo segue negado'),
  (7, pg_temp.decidir(), 'papel vencido: decidir_denuncia segue negado'),
  (9, pg_temp.conceder(), 'admin vencido: conceder_papel_plataforma segue negado, alvo ausente'),
  (9, pg_temp.conceder_presente(), 'admin vencido: conceder_papel_plataforma segue negado, alvo presente (renovação)'),
  (9, pg_temp.revogar_alvo(), 'admin vencido: revogar_papel_plataforma segue negado, alvo presente'),
  (9, 'select public.revogar_papel_plataforma(pg_temp.i(2), ''moderador'', ''x'')',
   'admin vencido: revogar_papel_plataforma segue negado, alvo ausente')
) as v(n, sql, descricao);

reset role;
select is(pg_temp.papeis_foto(), current_setting('teste.foto'), 'admin vencido: nenhuma linha de papel mudou nas chamadas negadas');
select is(pg_temp.auditorias(), 0, 'admin vencido: nenhuma auditoria foi gravada');
select is(pg_temp.trava_presa(), false, 'admin vencido: a negativa vem antes da trava consultiva (a trava não ficou presa)');
rollback to savepoint antes_vencido;

-- 3. A ordem no corpo: trava consultiva (só conceder e revogar), travas de linha, reconferência da linha do
-- chamador (a última trava compartilhada), ação. A chave fixa é a mesma nas duas funções que mudam papel.
select is(
  (select case
            when n_adv = v.adv
                 and achou_marca > 0
                 and (n_chave > 0) = (v.adv = 1)
                 and (v.adv = 0 or pos_adv < pos_lock_primeira)
                 and pos_lock_ultima < pos_recheck
                 and pos_recheck < pos_acao then 'ok'
            else format('n_adv=%s chave=%s adv=%s lock1=%s lockN=%s reconferencia=%s acao=%s',
                        n_adv, n_chave, pos_adv, pos_lock_primeira, pos_lock_ultima, pos_recheck, pos_acao)
          end
     from (
       -- A reconferência é a leitura da linha de papel do próprio chamador (pp.conta_id = v_conta) e o primeiro
       -- "for share" depois dela; o "for share" da denúncia, em moderar_conteudo, não conta.
       select y.*,
              y.pos_marca + strpos(substr(y.src, y.pos_marca), 'for share') - 1 as pos_recheck
         from (
           select lower(p.prosrc) as src,
                  (select count(*)::int from regexp_matches(lower(p.prosrc), 'pg_advisory_xact_lock', 'g')) as n_adv,
                  strpos(p.prosrc, '201863462913') as n_chave,
                  strpos(lower(p.prosrc), 'pg_advisory_xact_lock') as pos_adv,
                  strpos(lower(p.prosrc), 'for update') as pos_lock_primeira,
                  length(p.prosrc) - strpos(reverse(lower(p.prosrc)), reverse('for update')) - length('for update') + 2
                    as pos_lock_ultima,
                  greatest(strpos(lower(p.prosrc), 'pp.conta_id = v_conta'), 1) as pos_marca,
                  strpos(lower(p.prosrc), 'pp.conta_id = v_conta') as achou_marca,
                  strpos(lower(p.prosrc), v.acao) as pos_acao
             from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.proname = v.funcao
         ) y
     ) x),
  'ok',
  v.funcao || ': trava consultiva (se muda papel), travas de linha, reconferência da linha do chamador, ação'
) from (values
  ('moderar_conteudo', 'update public.topicos', 0),
  ('decidir_denuncia', 'update public.denuncias', 0),
  ('conceder_papel_plataforma', 'insert into public.papeis_plataforma', 1),
  ('revogar_papel_plataforma', 'delete from public.papeis_plataforma', 1)
) as v(funcao, acao, adv);

-- 4. Controle: com a função de verdade, as quatro chamadas passam; com a perda do papel (próxima frente),
-- as mesmas chamadas, nas mesmas entradas e no mesmo estado, são negadas.
savepoint rodada_controle;
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), '1', v.descricao
) from (values
  (7, pg_temp.moderar(), 'controle: moderar_conteudo passa com o papel vigente'),
  (7, pg_temp.decidir(), 'controle: decidir_denuncia passa com o papel vigente'),
  (8, pg_temp.conceder(), 'controle: conceder_papel_plataforma passa com o papel vigente'),
  (8, pg_temp.revogar(), 'controle: revogar_papel_plataforma passa com o papel vigente')
) as v(n, sql, descricao);

reset role;
select is(pg_temp.estado(), 'oculto|procedente|true|false|4', 'controle: as quatro chamadas gravaram');
rollback to savepoint rodada_controle;

-- 5. O papel do chamador some ('perde') ou vence ('vence') quando a conferência inicial termina: é o que uma
-- revogação confirmada durante a espera da trava produz. A troca de tem_papel_plataforma devolve "sim" e,
-- no mesmo instante, tira o papel do chamador; a reconferência, que lê a linha do chamador depois de toda
-- espera, tem de negar. Cinco chamadas: moderar, decidir, conceder (alvo ausente), conceder (alvo presente) e revogar.
savepoint rodada_perde;

create or replace function public.tem_papel_plataforma(p_papeis public.papel_plataforma[])
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $f$
declare
  n int := coalesce(nullif(current_setting('teste.n_papel', true), ''), '0')::int + 1;
  v_real boolean;
begin
  perform set_config('teste.n_papel', n::text, true);
  select exists (
    select 1 from public.papeis_plataforma pp
    where pp.conta_id = (select auth.uid()) and pp.papel = any (p_papeis)
      and (pp.valido_ate is null or pp.valido_ate > now())
  ) into v_real;
  if n = 1 and current_setting('teste.modo', true) = 'perde' then
    delete from public.papeis_plataforma where conta_id = (select auth.uid());
  elsif n = 1 and current_setting('teste.modo', true) = 'vence' then
    update public.papeis_plataforma set valido_ate = now() - interval '1 hour' where conta_id = (select auth.uid());
  end if;
  return v_real;
end;
$f$;

select set_config('teste.modo', 'perde', true);
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501:sem papel de plataforma', v.descricao
) from (values
  (7, pg_temp.moderar(), 'papel removido durante a espera: moderar_conteudo nega'),
  (12, pg_temp.decidir(), 'papel removido durante a espera: decidir_denuncia nega'),
  (8, pg_temp.conceder(), 'papel removido durante a espera: conceder_papel_plataforma nega, alvo ausente'),
  (9, pg_temp.conceder_presente(), 'papel removido durante a espera: conceder_papel_plataforma nega, alvo presente (renovação)'),
  (16, pg_temp.revogar_alvo(), 'papel removido durante a espera: revogar_papel_plataforma nega')
) as v(n, sql, descricao);

reset role;
select is(pg_temp.efeitos(), 'visivel|aberta|false|true|true|0',
  'papel removido durante a espera: nada foi gravado (tópico, denúncia, papéis-alvo e auditoria intactos)');
rollback to savepoint rodada_perde;

savepoint rodada_vence;

create or replace function public.tem_papel_plataforma(p_papeis public.papel_plataforma[])
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $f$
declare
  n int := coalesce(nullif(current_setting('teste.n_papel', true), ''), '0')::int + 1;
  v_real boolean;
begin
  perform set_config('teste.n_papel', n::text, true);
  select exists (
    select 1 from public.papeis_plataforma pp
    where pp.conta_id = (select auth.uid()) and pp.papel = any (p_papeis)
      and (pp.valido_ate is null or pp.valido_ate > now())
  ) into v_real;
  if n = 1 and current_setting('teste.modo', true) = 'perde' then
    delete from public.papeis_plataforma where conta_id = (select auth.uid());
  elsif n = 1 and current_setting('teste.modo', true) = 'vence' then
    update public.papeis_plataforma set valido_ate = now() - interval '1 hour' where conta_id = (select auth.uid());
  end if;
  return v_real;
end;
$f$;

select set_config('teste.modo', 'vence', true);
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501:sem papel de plataforma', v.descricao
) from (values
  (7, pg_temp.moderar(), 'papel vencido durante a espera: moderar_conteudo nega'),
  (12, pg_temp.decidir(), 'papel vencido durante a espera: decidir_denuncia nega'),
  (8, pg_temp.conceder(), 'papel vencido durante a espera: conceder_papel_plataforma nega, alvo ausente'),
  (9, pg_temp.conceder_presente(), 'papel vencido durante a espera: conceder_papel_plataforma nega, alvo presente (renovação)'),
  (16, pg_temp.revogar_alvo(), 'papel vencido durante a espera: revogar_papel_plataforma nega')
) as v(n, sql, descricao);

reset role;
select is(pg_temp.efeitos(), 'visivel|aberta|false|true|true|0',
  'papel vencido durante a espera: nada foi gravado (tópico, denúncia, papéis-alvo e auditoria intactos)');
rollback to savepoint rodada_vence;

select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'tem_papel_plataforma'
      and p.prosrc like '%teste.n_papel%'),
  0,
  'a troca de tem_papel_plataforma foi desfeita com o savepoint'
);

-- 6. 40P01 (deadlock) e 23502 dentro das funções viram o erro do catálogo (R6), e nada fica gravado.
create schema teste_falhas;

create function teste_falhas.impasse() returns trigger language plpgsql as $$
begin
  raise deadlock_detected;
end;
$$;

create function teste_falhas.nula() returns trigger language plpgsql as $$
begin
  raise not_null_violation;
end;
$$;

savepoint falha_impasse;

do $$
declare t record;
begin
  for t in
    select * from (values
      ('topicos', 'update'), ('respostas', 'update'), ('denuncias', 'update'),
      ('papeis_plataforma', 'insert or update or delete')
    ) v(tabela, evento)
  loop
    execute format(
      'create trigger falha_simulada before %s on public.%I for each row execute function teste_falhas.impasse()',
      t.evento, t.tabela);
  end loop;
end;
$$;

set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:P0001:tente de novo', v.descricao
) from (values
  (7, pg_temp.moderar(), '40P01 vira "tente de novo" em moderar_conteudo (tópico)'),
  (7, 'select public.moderar_conteudo(''resposta'', pg_temp.i(31), ''oculto'', ''Motivo M1'')',
   '40P01 vira "tente de novo" em moderar_conteudo (resposta)'),
  (7, pg_temp.decidir(), '40P01 vira "tente de novo" em decidir_denuncia'),
  (8, pg_temp.conceder(), '40P01 vira "tente de novo" em conceder_papel_plataforma'),
  (8, pg_temp.revogar(), '40P01 vira "tente de novo" em revogar_papel_plataforma')
) as v(n, sql, descricao);

reset role;
select is(pg_temp.estado(), 'visivel|aberta|false|true|0', '40P01: nenhuma das chamadas gravou algo');
rollback to savepoint falha_impasse;

savepoint falha_nula;

do $$
declare t record;
begin
  for t in
    select * from (values
      ('topicos', 'update'), ('respostas', 'update'), ('denuncias', 'update'),
      ('papeis_plataforma', 'insert or update or delete')
    ) v(tabela, evento)
  loop
    execute format(
      'create trigger falha_simulada before %s on public.%I for each row execute function teste_falhas.nula()',
      t.evento, t.tabela);
  end loop;
end;
$$;

set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:P0001:parametro obrigatorio', v.descricao
) from (values
  (7, pg_temp.moderar(), '23502 vira "parametro obrigatorio" em moderar_conteudo (tópico)'),
  (7, 'select public.moderar_conteudo(''resposta'', pg_temp.i(31), ''oculto'', ''Motivo M1'')',
   '23502 vira "parametro obrigatorio" em moderar_conteudo (resposta)'),
  (7, pg_temp.decidir(), '23502 vira "parametro obrigatorio" em decidir_denuncia'),
  (8, pg_temp.conceder(), '23502 vira "parametro obrigatorio" em conceder_papel_plataforma'),
  (8, pg_temp.revogar(), '23502 vira "parametro obrigatorio" em revogar_papel_plataforma')
) as v(n, sql, descricao);

reset role;
select is(pg_temp.estado(), 'visivel|aberta|false|true|0', '23502: nenhuma das chamadas gravou algo');
rollback to savepoint falha_nula;

-- 7. Os erros próprios do catálogo continuam passando pelo bloco de erros sem mudar (a conversão é só de 40P01 e 23502).
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (7, 'select public.moderar_conteudo(''topico'', pg_temp.i(21), ''visivel'', ''x'')',
   'ERRO:P0001:estado igual', 'estado igual continua P0001 em moderar_conteudo'),
  (7, 'select public.decidir_denuncia(pg_temp.i(41), ''aberta'', ''x'')',
   'ERRO:P0001:decisao invalida', 'decisão inválida continua P0001 em decidir_denuncia'),
  (8, 'select public.conceder_papel_plataforma(pg_temp.i(2), ''moderador'', ''x'', now() - interval ''1 day'')',
   'ERRO:P0001:validade no passado', 'validade no passado continua P0001 em conceder_papel_plataforma'),
  (8, 'select public.revogar_papel_plataforma(pg_temp.i(2), ''moderador'', ''x'')',
   'ERRO:P0002:papel inexistente', 'papel inexistente continua P0002 em revogar_papel_plataforma'),
  (1, pg_temp.moderar(), 'ERRO:42501:sem papel de plataforma', 'sem papel continua 42501 em moderar_conteudo')
) as v(n, sql, esperado, descricao);

reset role;

select is(pg_temp.estado(), 'visivel|aberta|false|true|0', 'as recusas do catálogo também não gravaram nada');

select * from finish();
rollback;
