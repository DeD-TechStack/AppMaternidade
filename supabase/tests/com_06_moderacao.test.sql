begin;
create extension if not exists pgtap with schema extensions;

select plan(83);

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('c0470000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Executa um comando como a conta pedida (sessão já authenticated): linhas afetadas ou 'ERRO:<sqlstate>'
-- (com a mensagem nos erros do catálogo da comunidade).
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
    || case when sqlstate in ('P0001', 'P0002') or sqlerrm = 'sem papel de plataforma'
            then ':' || sqlerrm else '' end;
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

-- Chamada de moderar_conteudo como expressão SQL (alvo e denúncia pelo número do id de teste).
create function pg_temp.m(p_tipo text, p_alvo int, p_novo text, p_motivo text, p_den int default null)
returns text language sql as $$
  select format('public.moderar_conteudo(%L::public.alvo_conteudo, pg_temp.i(%L), %L::public.estado_moderacao, %L, pg_temp.i(%L))',
                p_tipo, p_alvo, p_novo, p_motivo, p_den)
$$;

create function pg_temp.d(p_den int, p_decisao text, p_motivo text)
returns text language sql as $$
  select format('public.decidir_denuncia(pg_temp.i(%L), %L::public.estado_denuncia, %L)', p_den, p_decisao, p_motivo)
$$;

create function pg_temp.d_sel(p_den int, p_decisao text, p_motivo text)
returns text language sql as $$
  select 'select ' || pg_temp.d(p_den, p_decisao, p_motivo)
$$;

-- Guarda o id devolvido pela função, para conferir a linha de auditoria depois.
create function pg_temp.guarda(p_chave text, p_expr text)
returns text language sql as $$
  select format('select set_config(%L, %s::text, true)', p_chave, p_expr)
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
  (pg_temp.i(11), pg_temp.i(1), 't_autor'), (pg_temp.i(12), pg_temp.i(2), 't_outro'),
  (pg_temp.i(13), pg_temp.i(3), 't_bloqueado'), (pg_temp.i(14), pg_temp.i(4), 't_semaceite'),
  (pg_temp.i(17), pg_temp.i(7), 't_moderador'), (pg_temp.i(19), pg_temp.i(9), 't_modvencido');

insert into public.papeis_plataforma (conta_id, papel, valido_ate) values
  (pg_temp.i(7), 'moderador', null), (pg_temp.i(8), 'admin', null),
  (pg_temp.i(9), 'moderador', now() - interval '1 day');

-- Dados de cuidado só para provar que o id de uma família ou de um bebê não é alvo de moderação.
insert into public.familias (id, nome, fuso, criada_por) values
  (pg_temp.i(60), 'Família do teste', 'America/Sao_Paulo', pg_temp.i(2));
insert into public.bebes (id, familia_id, nome, nascimento, criado_por) values
  (pg_temp.i(61), pg_temp.i(60), 'Bebê do teste', '2026-01-01', pg_temp.i(2));

-- T1 visível e T2 oculto (Autor); T4 (Outro); TM (Moderador); T8 sem autor (conta excluída).
insert into public.topicos (id, espaco_id, autor_id, titulo, corpo, estado, motivo_moderacao) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T1', 'Corpo T1', 'visivel', null),
  (pg_temp.i(22), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T2', 'Corpo T2', 'oculto', 'oculto no teste'),
  (pg_temp.i(24), (select id from public.espacos where slug = 'banho'), pg_temp.i(12), 'Tópico T4', 'Corpo T4', 'visivel', null),
  (pg_temp.i(26), (select id from public.espacos where slug = 'banho'), pg_temp.i(17), 'Tópico TM', 'Corpo TM', 'visivel', null),
  (pg_temp.i(28), (select id from public.espacos where slug = 'banho'), null, '[removido]', '[removido]', 'visivel', null);

-- R1 do Outro e RM do Moderador, ambas em T1.
insert into public.respostas (id, topico_id, autor_id, corpo) values
  (pg_temp.i(31), pg_temp.i(21), pg_temp.i(12), 'Resposta R1'),
  (pg_temp.i(39), pg_temp.i(21), pg_temp.i(17), 'Resposta RM');

insert into public.denuncias (id, denunciante_id, topico_id, resposta_id, perfil_id, motivo, estado, decidida_por, decidida_em) values
  (pg_temp.i(41), pg_temp.i(2), pg_temp.i(21), null, null, 'outro', 'aberta', null, null),
  (pg_temp.i(42), pg_temp.i(7), pg_temp.i(21), null, null, 'outro', 'aberta', null, null),
  (pg_temp.i(43), pg_temp.i(2), pg_temp.i(24), null, null, 'outro', 'aberta', null, null),
  (pg_temp.i(44), pg_temp.i(2), null, pg_temp.i(31), null, 'outro', 'aberta', null, null),
  (pg_temp.i(45), pg_temp.i(2), pg_temp.i(26), null, null, 'outro', 'aberta', null, null),
  (pg_temp.i(46), pg_temp.i(2), null, null, pg_temp.i(17), 'outro', 'aberta', null, null),
  (pg_temp.i(47), pg_temp.i(2), null, pg_temp.i(39), null, 'outro', 'aberta', null, null),
  (pg_temp.i(48), pg_temp.i(2), pg_temp.i(24), null, null, 'outro', 'aberta', null, null),
  (pg_temp.i(49), pg_temp.i(2), pg_temp.i(24), null, null, 'outro', 'procedente', pg_temp.i(8), now()),
  (pg_temp.i(50), pg_temp.i(2), pg_temp.i(24), null, null, 'outro', 'em_analise', null, null),
  (pg_temp.i(51), pg_temp.i(8), pg_temp.i(24), null, null, 'outro', 'aberta', null, null);

set local role authenticated;

-- moderar_conteudo: erros na ordem do catálogo, um por asserção
select is(
  pg_temp.exec(v.n, 'select ' || v.chamada), v.esperado, v.descricao
) from (values
  (1, pg_temp.m('topico', 21, 'oculto', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Autor não modera'),
  (2, pg_temp.m('topico', 21, 'oculto', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Outro não modera'),
  (3, pg_temp.m('topico', 21, 'oculto', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Bloqueado não modera'),
  (4, pg_temp.m('topico', 21, 'oculto', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Sem aceite não modera'),
  (5, pg_temp.m('topico', 21, 'oculto', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Sem perfil não modera'),
  (6, pg_temp.m('topico', 21, 'oculto', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Sem conta não modera'),
  (9, pg_temp.m('topico', 21, 'oculto', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Moderador com papel vencido não modera'),
  (7, pg_temp.m(null, 21, 'oculto', 'motivo'), 'ERRO:P0001:parametro obrigatorio', 'tipo de alvo nulo é recusado'),
  (7, pg_temp.m('topico', null, 'oculto', 'motivo'), 'ERRO:P0001:parametro obrigatorio', 'id de alvo nulo é recusado'),
  (7, pg_temp.m('topico', 21, null, 'motivo'), 'ERRO:P0001:parametro obrigatorio', 'novo estado nulo é recusado'),
  (7, pg_temp.m('topico', 21, 'oculto', null), 'ERRO:P0001:motivo vazio', 'motivo nulo é recusado'),
  (7, pg_temp.m('topico', 21, 'oculto', ''), 'ERRO:P0001:motivo vazio', 'motivo vazio é recusado'),
  (7, pg_temp.m('topico', 21, 'oculto', '   '), 'ERRO:P0001:motivo vazio', 'motivo só com espaços é recusado'),
  (7, pg_temp.m('topico', 99, 'oculto', 'motivo'), 'ERRO:P0002:alvo inexistente', 'tópico inexistente'),
  (7, pg_temp.m('topico', 31, 'oculto', 'motivo'), 'ERRO:P0002:alvo inexistente', 'id de resposta pedido como tópico'),
  (7, pg_temp.m('resposta', 21, 'oculto', 'motivo'), 'ERRO:P0002:alvo inexistente', 'id de tópico pedido como resposta'),
  (7, pg_temp.m('topico', 61, 'oculto', 'motivo'), 'ERRO:P0002:alvo inexistente', 'id de bebê não é alvo de moderação'),
  (7, pg_temp.m('resposta', 61, 'oculto', 'motivo'), 'ERRO:P0002:alvo inexistente', 'id de bebê pedido como resposta'),
  (7, pg_temp.m('topico', 60, 'oculto', 'motivo'), 'ERRO:P0002:alvo inexistente', 'id de família não é alvo de moderação'),
  (7, pg_temp.m('topico', 21, 'oculto', 'motivo', 99), 'ERRO:P0002:denuncia inexistente', 'denúncia inexistente'),
  (7, pg_temp.m('topico', 21, 'oculto', 'motivo', 43), 'ERRO:P0001:denuncia de outro alvo', 'denúncia de outro tópico'),
  (7, pg_temp.m('resposta', 31, 'oculto', 'motivo', 41), 'ERRO:P0001:denuncia de outro alvo', 'denúncia de tópico usada para resposta'),
  (7, pg_temp.m('topico', 26, 'oculto', 'motivo'), 'ERRO:P0001:conflito de interesse', 'Moderador não modera tópico próprio'),
  (7, pg_temp.m('resposta', 39, 'oculto', 'motivo'), 'ERRO:P0001:conflito de interesse', 'Moderador não modera resposta própria'),
  (7, pg_temp.m('topico', 21, 'oculto', 'motivo', 42), 'ERRO:P0001:conflito de interesse', 'Moderador não usa denúncia que ele abriu'),
  (8, pg_temp.m('topico', 24, 'oculto', 'motivo', 51), 'ERRO:P0001:conflito de interesse', 'Admin não usa denúncia que ele abriu'),
  (7, pg_temp.m('topico', 21, 'visivel', 'motivo'), 'ERRO:P0001:estado igual', 'tópico visível não vira visível'),
  (7, pg_temp.m('topico', 22, 'oculto', 'motivo'), 'ERRO:P0001:estado igual', 'tópico oculto não vira oculto'),
  (7, pg_temp.m('topico', 21, 'oculto', repeat('m', 301)), 'ERRO:23514', 'motivo acima de 300 sai do check')
) as v(n, chamada, esperado, descricao);

-- moderar_conteudo: acertos em sequência (oculta, remove, restaura; resposta pelo Admin; autor removido)
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (7, pg_temp.guarda('teste.a1', pg_temp.m('topico', 21, 'oculto', 'Motivo oculta', 41)), '1', 'Moderador oculta o tópico do Autor'),
  (7, pg_temp.guarda('teste.a2', pg_temp.m('topico', 21, 'removido', 'Motivo remove', 41)), '1', 'Moderador remove o tópico do Autor'),
  (7, pg_temp.guarda('teste.a3', pg_temp.m('topico', 21, 'visivel', 'Motivo restaura')), '1', 'Moderador restaura o tópico do Autor'),
  (8, pg_temp.guarda('teste.a4', pg_temp.m('resposta', 31, 'oculto', 'Motivo resposta', 44)), '1', 'Admin oculta a resposta do Outro'),
  (8, pg_temp.guarda('teste.a5', pg_temp.m('topico', 24, 'oculto', 'Motivo admin')), '1', 'Admin modera como moderador'),
  (7, 'select ' || pg_temp.m('topico', 28, 'oculto', 'Autor removido'), '1', 'Moderador modera tópico sem autor (conta excluída)')
) as v(n, sql, esperado, descricao);

reset role;

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.a1')::uuid
      and ator_id = pg_temp.i(7) and acao = 'ocultar' and alvo_tipo = 'topico' and alvo_id = pg_temp.i(21)
      and estado_anterior = 'visivel' and estado_novo = 'oculto' and motivo = 'Motivo oculta'
      and denuncia_id = pg_temp.i(41) and conteudo = E'Tópico T1\n\nCorpo T1' and valido_ate is null),
  1,
  'ocultar grava a auditoria com estados, motivo, denúncia e cópia do texto do tópico'
);

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.a2')::uuid
      and ator_id = pg_temp.i(7) and acao = 'remover' and alvo_tipo = 'topico' and alvo_id = pg_temp.i(21)
      and estado_anterior = 'oculto' and estado_novo = 'removido' and motivo = 'Motivo remove'
      and denuncia_id = pg_temp.i(41) and conteudo = E'Tópico T1\n\nCorpo T1'),
  1,
  'remover grava a auditoria (oculto para removido)'
);

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.a3')::uuid
      and acao = 'restaurar' and alvo_tipo = 'topico' and alvo_id = pg_temp.i(21)
      and estado_anterior = 'removido' and estado_novo = 'visivel' and motivo = 'Motivo restaura'
      and denuncia_id is null),
  1,
  'restaurar grava a auditoria (removido para visível)'
);

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.a4')::uuid
      and ator_id = pg_temp.i(8) and acao = 'ocultar' and alvo_tipo = 'resposta' and alvo_id = pg_temp.i(31)
      and estado_anterior = 'visivel' and estado_novo = 'oculto' and motivo = 'Motivo resposta'
      and denuncia_id = pg_temp.i(44) and conteudo = 'Resposta R1' and valido_ate is null),
  1,
  'moderar resposta grava a auditoria com a cópia do corpo'
);

select is(
  (select count(*)::int from public.auditoria_moderacao
    where ator_id in (pg_temp.i(1), pg_temp.i(2), pg_temp.i(7), pg_temp.i(8), pg_temp.i(9))),
  6,
  'só as 6 chamadas bem-sucedidas gravaram auditoria; as recusadas não gravaram nada'
);

select is(
  (select estado::text || '|' || coalesce(motivo_moderacao, '-') || '|' || coalesce(editado_em::text, '-')
     from public.topicos where id = pg_temp.i(21)),
  'visivel|-|-',
  'restaurar volta o estado a visível, com motivo nulo, sem mexer em editado_em'
);

select is(
  (select estado::text || '|' || motivo_moderacao from public.respostas where id = pg_temp.i(31)),
  'oculto|Motivo resposta',
  'a resposta ficou oculta com o motivo'
);

select is(
  (select estado::text from public.denuncias where id = pg_temp.i(41)),
  'aberta',
  'moderar o conteúdo não muda o estado da denúncia'
);

set local role authenticated;

-- Efeito nas telas: o oculto some para os outros, mas o autor ainda vê
select is(
  pg_temp.ler(v.n, $q$select count(*) from public.topicos where id = pg_temp.i(24)$q$), v.esperado, v.descricao
) from (values
  (2, '1', 'o autor ainda lê o próprio tópico oculto'),
  (1, '0', 'outra conta não lê o tópico oculto'),
  (7, '1', 'a moderação lê o tópico oculto')
) as v(n, esperado, descricao);

-- decidir_denuncia: erros na ordem do catálogo
select is(
  pg_temp.exec(v.n, 'select ' || v.chamada), v.esperado, v.descricao
) from (values
  (1, pg_temp.d(41, 'procedente', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Autor não decide denúncia'),
  (2, pg_temp.d(41, 'procedente', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'o denunciante não decide a própria denúncia'),
  (6, pg_temp.d(41, 'procedente', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Sem conta não decide denúncia'),
  (9, pg_temp.d(41, 'procedente', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Moderador com papel vencido não decide denúncia'),
  (7, pg_temp.d(null, 'procedente', 'motivo'), 'ERRO:P0001:parametro obrigatorio', 'denúncia nula é recusada'),
  (7, pg_temp.d(41, null, 'motivo'), 'ERRO:P0001:parametro obrigatorio', 'decisão nula é recusada'),
  (7, pg_temp.d(41, 'procedente', null), 'ERRO:P0001:motivo vazio', 'motivo nulo é recusado'),
  (7, pg_temp.d(41, 'procedente', '   '), 'ERRO:P0001:motivo vazio', 'motivo só com espaços é recusado'),
  (7, pg_temp.d(99, 'procedente', 'motivo'), 'ERRO:P0002:denuncia inexistente', 'denúncia inexistente'),
  (7, pg_temp.d(60, 'procedente', 'motivo'), 'ERRO:P0002:denuncia inexistente', 'id de família não é denúncia'),
  (7, pg_temp.d(61, 'procedente', 'motivo'), 'ERRO:P0002:denuncia inexistente', 'id de bebê não é denúncia'),
  (7, pg_temp.d(41, 'aberta', 'motivo'), 'ERRO:P0001:decisao invalida', 'decidir "aberta" é recusado'),
  (7, pg_temp.d(42, 'procedente', 'motivo'), 'ERRO:P0001:conflito de interesse', 'Moderador não decide denúncia que ele abriu'),
  (7, pg_temp.d(45, 'procedente', 'motivo'), 'ERRO:P0001:conflito de interesse', 'Moderador não decide denúncia contra tópico próprio'),
  (7, pg_temp.d(46, 'procedente', 'motivo'), 'ERRO:P0001:conflito de interesse', 'Moderador não decide denúncia contra o próprio perfil'),
  (7, pg_temp.d(47, 'procedente', 'motivo'), 'ERRO:P0001:conflito de interesse', 'Moderador não decide denúncia contra resposta própria'),
  (8, pg_temp.d(51, 'procedente', 'motivo'), 'ERRO:P0001:conflito de interesse', 'Admin não decide denúncia que ele abriu'),
  (7, pg_temp.d(49, 'procedente', 'motivo'), 'ERRO:P0001:denuncia ja decidida', 'denúncia procedente não se decide de novo'),
  (7, pg_temp.d(49, 'improcedente', 'motivo'), 'ERRO:P0001:denuncia ja decidida', 'denúncia procedente não vira improcedente'),
  (7, pg_temp.d(50, 'em_analise', 'motivo'), 'ERRO:P0001:estado igual', 'denúncia em análise não vira em análise')
) as v(n, chamada, esperado, descricao);

-- decidir_denuncia: acertos
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (7, pg_temp.guarda('teste.d1', pg_temp.d(41, 'em_analise', 'Em análise')), '1', 'Moderador põe a denúncia em análise')
) as v(n, sql, esperado, descricao);

reset role;

select is(
  (select estado::text || '|' || (decidida_por is null)::text || '|' || (decidida_em is null)::text
     from public.denuncias where id = pg_temp.i(41)),
  'em_analise|true|true',
  'em análise deixa decidida_por e decidida_em nulos'
);

set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (7, pg_temp.guarda('teste.d2', pg_temp.d(41, 'procedente', 'Procede')), '1', 'Moderador decide a denúncia como procedente'),
  (8, pg_temp.guarda('teste.d3', pg_temp.d(48, 'improcedente', 'Nao procede')), '1', 'Admin decide a denúncia como improcedente'),
  (8, pg_temp.d_sel(45, 'procedente', 'Procede contra o moderador'), '1', 'Admin decide a denúncia contra tópico do Moderador'),
  (8, pg_temp.d_sel(46, 'improcedente', 'Nao procede contra o perfil'), '1', 'Admin decide a denúncia contra o perfil do Moderador'),
  (8, pg_temp.d_sel(47, 'procedente', 'Procede contra a resposta'), '1', 'Admin decide a denúncia contra resposta do Moderador')
) as v(n, sql, esperado, descricao);

reset role;

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.d1')::uuid
      and ator_id = pg_temp.i(7) and acao = 'decidir_denuncia' and alvo_tipo = 'denuncia' and alvo_id = pg_temp.i(41)
      and estado_anterior = 'aberta' and estado_novo = 'em_analise' and motivo = 'Em análise'
      and denuncia_id = pg_temp.i(41) and conteudo is null and valido_ate is null),
  1,
  'decidir em análise grava a auditoria'
);

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.d2')::uuid
      and ator_id = pg_temp.i(7) and acao = 'decidir_denuncia' and alvo_tipo = 'denuncia' and alvo_id = pg_temp.i(41)
      and estado_anterior = 'em_analise' and estado_novo = 'procedente' and motivo = 'Procede'
      and denuncia_id = pg_temp.i(41) and conteudo is null and valido_ate is null),
  1,
  'decidir procedente grava a auditoria (em análise para procedente)'
);

select is(
  (select estado::text || '|' || (decidida_por = pg_temp.i(7))::text || '|' || (decidida_em is not null)::text
     from public.denuncias where id = pg_temp.i(41)),
  'procedente|true|true',
  'a decisão final grava decidida_por e decidida_em'
);

select is(
  (select estado::text || '|' || (decidida_por = pg_temp.i(8))::text
     from public.denuncias where id = pg_temp.i(48)),
  'improcedente|true',
  'o Admin decide como moderador e fica como quem decidiu'
);

select is(
  (select count(*)::int from public.denuncias
    where decidida_por = pg_temp.i(8) and decidida_em is not null
      and ((id in (pg_temp.i(45), pg_temp.i(47)) and estado = 'procedente')
           or (id = pg_temp.i(46) and estado = 'improcedente'))),
  3,
  'o Admin decidiu as 3 denúncias contra conteúdo do Moderador, que ele não podia decidir'
);

select is(
  (select count(*)::int from public.auditoria_moderacao where id = current_setting('teste.d3')::uuid
     and ator_id = pg_temp.i(8) and estado_anterior = 'aberta' and estado_novo = 'improcedente'),
  1,
  'a decisão do Admin grava a auditoria'
);

select is(
  (select estado::text from public.topicos where id = pg_temp.i(21)),
  'visivel',
  'decidir a denúncia não muda o estado do conteúdo'
);

-- Só a decisão final grava decidida_por: a passagem por "em análise" deixou os dois nulos
select is(
  (select count(*)::int from public.auditoria_moderacao where acao = 'decidir_denuncia' and denuncia_id = pg_temp.i(41)),
  2,
  'a denúncia 41 tem duas linhas de auditoria de decisão'
);

set local role authenticated;

select is(
  pg_temp.ler(2, $q$select estado::text || '/' || (decidida_em is not null)::text from public.minhas_denuncias()
                     where id = pg_temp.i(41)$q$),
  'procedente/true',
  'o denunciante vê o resultado da denúncia em minhas_denuncias'
);

select is(
  pg_temp.ler(1, $q$select count(*) from public.minhas_denuncias() where id = pg_temp.i(41)$q$),
  '0',
  'outra conta não vê a denúncia em minhas_denuncias'
);

reset role;

select * from finish();
rollback;
