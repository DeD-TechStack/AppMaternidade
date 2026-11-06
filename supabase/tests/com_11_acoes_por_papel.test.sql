begin;
create extension if not exists pgtap with schema extensions;

select plan(46);

-- 47-M1 (adendo R-B, R2 e R7): as quatro funções que agem por papel de plataforma decidem pela situação
-- DEPOIS da trava do alvo. A concorrência de verdade fica fora do teste (R7: sem dblink, sem segunda sessão);
-- a prova é sequencial, em quatro frentes:
--   1. papel revogado ou vencido antes da chamada segue negado;
--   2. a ordem no corpo da função: trava do alvo, depois a reconferência, depois a ação (lida em pg_proc);
--   3. uma troca de tem_papel_plataforma que diz "sim" na conferência inicial e "não" na seguinte (a situação
--      que mudou entre as duas) derruba a ação: a decisão vale pela segunda resposta;
--   4. 40P01 (e 23502) dentro da função vira o erro do catálogo.
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

-- Resumo do que as quatro funções mexem: tópico | denúncia | papel do Outro | papel do Moderador | auditorias.
create function pg_temp.estado() returns text language sql as $$
  select (select estado::text from public.topicos where id = pg_temp.i(21))
    || '|' || (select estado::text from public.denuncias where id = pg_temp.i(41))
    || '|' || exists (select 1 from public.papeis_plataforma where conta_id = pg_temp.i(2))::text
    || '|' || exists (select 1 from public.papeis_plataforma where conta_id = pg_temp.i(7))::text
    || '|' || (select count(*) from public.auditoria_moderacao
                where ator_id in (pg_temp.i(7), pg_temp.i(8), pg_temp.i(9)))::text
$$;

-- As quatro chamadas, uma por função. Moderador (7) e Admin (8); a chamada de papel usa o Admin (8) ou (9).
create function pg_temp.moderar() returns text language sql as $$
  select $s$select public.moderar_conteudo('topico', pg_temp.i(21), 'oculto', 'Motivo M1')$s$
$$;
create function pg_temp.decidir() returns text language sql as $$
  select $s$select public.decidir_denuncia(pg_temp.i(41), 'procedente', 'Motivo M1')$s$
$$;
create function pg_temp.conceder() returns text language sql as $$
  select $s$select public.conceder_papel_plataforma(pg_temp.i(2), 'moderador', 'Motivo M1')$s$
$$;
create function pg_temp.revogar() returns text language sql as $$
  select $s$select public.revogar_papel_plataforma(pg_temp.i(7), 'moderador', 'Motivo M1')$s$
$$;

-- Autor (1) e Outro (2) com perfil e aceite; Moderador (7); Admin (8) e outro Admin (9).
insert into auth.users (id, email) values
  (pg_temp.i(1), 'c47e-autor@exemplo.invalid'),
  (pg_temp.i(2), 'c47e-outro@exemplo.invalid'),
  (pg_temp.i(7), 'c47e-moderador@exemplo.invalid'),
  (pg_temp.i(8), 'c47e-admin@exemplo.invalid'),
  (pg_temp.i(9), 'c47e-admin2@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  (pg_temp.i(1), 'Autor M1'), (pg_temp.i(2), 'Outro M1'), (pg_temp.i(7), 'Moderador M1'),
  (pg_temp.i(8), 'Admin M1'), (pg_temp.i(9), 'Admin dois M1');

insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(1), '2026-11-05'), (pg_temp.i(2), '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(11), pg_temp.i(1), 't_m1_autor'), (pg_temp.i(12), pg_temp.i(2), 't_m1_outro');

insert into public.papeis_plataforma (conta_id, papel, valido_ate) values
  (pg_temp.i(7), 'moderador', null), (pg_temp.i(8), 'admin', null), (pg_temp.i(9), 'admin', null);

insert into public.topicos (id, espaco_id, autor_id, titulo, corpo) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico M1', 'Corpo M1');

insert into public.respostas (id, topico_id, autor_id, corpo) values
  (pg_temp.i(31), pg_temp.i(21), pg_temp.i(12), 'Resposta M1');

insert into public.denuncias (id, denunciante_id, topico_id, motivo) values
  (pg_temp.i(41), pg_temp.i(2), pg_temp.i(21), 'outro');

select is(pg_temp.estado(), 'visivel|aberta|false|true|0', 'ponto de partida: nada decidido, nenhuma auditoria');

-- 1. Papel revogado ou vencido ANTES da chamada segue negado, nas quatro funções.
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

select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501:sem papel de plataforma', v.descricao
) from (values
  (7, pg_temp.moderar(), 'papel revogado: moderar_conteudo segue negado'),
  (7, pg_temp.decidir(), 'papel revogado: decidir_denuncia segue negado'),
  (9, pg_temp.conceder(), 'admin revogado: conceder_papel_plataforma segue negado'),
  (9, 'select public.revogar_papel_plataforma(pg_temp.i(8), ''admin'', ''x'')',
   'admin revogado: revogar_papel_plataforma segue negado')
) as v(n, sql, descricao);

reset role;
select is(pg_temp.estado(), 'visivel|aberta|false|false|2',
  'papel revogado: só as 2 revogações gravaram; as chamadas negadas não mexeram em nada');
rollback to savepoint antes_revogado;

savepoint antes_vencido;
update public.papeis_plataforma set valido_ate = now() - interval '1 hour'
 where conta_id in (pg_temp.i(7), pg_temp.i(9));
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501:sem papel de plataforma', v.descricao
) from (values
  (7, pg_temp.moderar(), 'papel vencido: moderar_conteudo segue negado'),
  (7, pg_temp.decidir(), 'papel vencido: decidir_denuncia segue negado'),
  (9, pg_temp.conceder(), 'admin vencido: conceder_papel_plataforma segue negado'),
  (9, 'select public.revogar_papel_plataforma(pg_temp.i(8), ''admin'', ''x'')',
   'admin vencido: revogar_papel_plataforma segue negado')
) as v(n, sql, descricao);

reset role;
select is(pg_temp.estado(), 'visivel|aberta|false|true|0', 'papel vencido: nenhuma das chamadas negadas mexeu em nada');
rollback to savepoint antes_vencido;

-- 2. A ordem no corpo: a última trava do alvo, depois a reconferência do papel, depois a ação.
select is(
  (select case
            when n_papel >= 2 and pos_recheck > pos_lock and pos_recheck < pos_acao then 'ok'
            else format('n_papel=%s trava=%s reconferencia=%s acao=%s', n_papel, pos_lock, pos_recheck, pos_acao)
          end
     from (
       select (select count(*)::int from regexp_matches(lower(p.prosrc), 'tem_papel_plataforma', 'g')) as n_papel,
              length(p.prosrc) - strpos(reverse(lower(p.prosrc)), reverse('for update')) - length('for update') + 2 as pos_lock,
              length(p.prosrc) - strpos(reverse(lower(p.prosrc)), reverse('tem_papel_plataforma'))
                - length('tem_papel_plataforma') + 2 as pos_recheck,
              strpos(lower(p.prosrc), v.acao) as pos_acao
         from pg_proc p
        where p.pronamespace = 'public'::regnamespace and p.proname = v.funcao
     ) x),
  'ok',
  v.funcao || ': trava do alvo, depois a reconferência do papel, depois a ação'
) from (values
  ('moderar_conteudo', 'update public.topicos'),
  ('decidir_denuncia', 'update public.denuncias'),
  ('conceder_papel_plataforma', 'insert into public.papeis_plataforma'),
  ('revogar_papel_plataforma', 'delete from public.papeis_plataforma')
) as v(funcao, acao);

-- 3. A situação que muda entre a conferência inicial e a reconferência. Primeiro o controle: com a função
-- de verdade, as quatro chamadas passam. Depois, com a troca (sim na primeira conferência, não nas seguintes),
-- as mesmas quatro chamadas, nas mesmas entradas e no mesmo estado, são negadas e não gravam nada.
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

savepoint rodada_troca;

create or replace function public.tem_papel_plataforma(p_papeis public.papel_plataforma[])
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $f$
declare
  n int := coalesce(nullif(current_setting('teste.n_papel', true), ''), '0')::int + 1;
begin
  perform set_config('teste.n_papel', n::text, true);
  return n = 1 and exists (
    select 1 from public.papeis_plataforma pp
    where pp.conta_id = (select auth.uid()) and pp.papel = any (p_papeis)
      and (pp.valido_ate is null or pp.valido_ate > now())
  );
end;
$f$;

set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501:sem papel de plataforma', v.descricao
) from (values
  (7, pg_temp.moderar(), 'papel perdido entre a conferência inicial e a reconferência: moderar_conteudo nega'),
  (7, pg_temp.decidir(), 'papel perdido entre a conferência inicial e a reconferência: decidir_denuncia nega'),
  (8, pg_temp.conceder(), 'papel perdido entre a conferência inicial e a reconferência: conceder_papel_plataforma nega'),
  (8, pg_temp.revogar(), 'papel perdido entre a conferência inicial e a reconferência: revogar_papel_plataforma nega')
) as v(n, sql, descricao);

reset role;
select is(pg_temp.estado(), 'visivel|aberta|false|true|0',
  'papel perdido entre as conferências: nada foi gravado, nem tópico, nem denúncia, nem papel, nem auditoria');
rollback to savepoint rodada_troca;

select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'tem_papel_plataforma'
      and p.prosrc like '%teste.n_papel%'),
  0,
  'a troca de tem_papel_plataforma foi desfeita com o savepoint'
);

-- 4. 40P01 (deadlock) e 23502 dentro das funções viram o erro do catálogo (R6), e nada fica gravado.
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

-- Os erros próprios do catálogo continuam passando pelo bloco de erros sem mudar (a conversão é só de 40P01 e 23502).
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
