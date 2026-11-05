begin;
create extension if not exists pgtap with schema extensions;

select plan(62);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

-- select, insert, update e delete nas 10 tabelas: sem grant nenhum, o erro é 42501
select throws_ok(
  format('select * from public.%I', v.tabela), '42501', null, 'anon não lê ' || v.tabela
) from (values
  ('perfis_publicos'), ('versoes_termos'), ('aceites_termos'), ('espacos'), ('topicos'),
  ('respostas'), ('denuncias'), ('bloqueios'), ('papeis_plataforma'), ('auditoria_moderacao')
) as v(tabela);

select throws_ok(
  format('insert into public.%I default values', v.tabela), '42501', null, 'anon não insere em ' || v.tabela
) from (values
  ('perfis_publicos'), ('versoes_termos'), ('aceites_termos'), ('espacos'), ('topicos'),
  ('respostas'), ('denuncias'), ('bloqueios'), ('papeis_plataforma'), ('auditoria_moderacao')
) as v(tabela);

select throws_ok(
  format('update public.%I set %I = %I', v.tabela, v.coluna, v.coluna), '42501', null,
  'anon não altera ' || v.tabela
) from (values
  ('perfis_publicos', 'apelido'), ('versoes_termos', 'vigente'), ('aceites_termos', 'aceito_em'),
  ('espacos', 'nome'), ('topicos', 'titulo'), ('respostas', 'corpo'), ('denuncias', 'texto'),
  ('bloqueios', 'criado_em'), ('papeis_plataforma', 'valido_ate'), ('auditoria_moderacao', 'motivo')
) as v(tabela, coluna);

select throws_ok(
  format('delete from public.%I', v.tabela), '42501', null, 'anon não apaga ' || v.tabela
) from (values
  ('perfis_publicos'), ('versoes_termos'), ('aceites_termos'), ('espacos'), ('topicos'),
  ('respostas'), ('denuncias'), ('bloqueios'), ('papeis_plataforma'), ('auditoria_moderacao')
) as v(tabela);

-- As 21 funções da comunidade: nenhuma é executável por anon (as de gatilho e ha_bloqueio nem por authenticated)
select throws_ok(
  v.chamada, '42501', null, 'anon não executa ' || v.nome
) from (values
  ('meu_perfil_id', 'select public.meu_perfil_id()'),
  ('conta_habilitada', 'select public.conta_habilitada()'),
  ('aceite_vigente', 'select public.aceite_vigente()'),
  ('escritor_habilitado', 'select public.escritor_habilitado()'),
  ('tem_papel_plataforma', $c$select public.tem_papel_plataforma(array['admin']::public.papel_plataforma[])$c$),
  ('pode_ler_perfil', $c$select public.pode_ler_perfil('c0470000-0000-4000-8000-000000000011')$c$),
  ('pode_ler_topico', $c$select public.pode_ler_topico('c0470000-0000-4000-8000-000000000021')$c$),
  ('pode_ler_resposta', $c$select public.pode_ler_resposta('c0470000-0000-4000-8000-000000000031')$c$),
  ('pode_responder', $c$select public.pode_responder('c0470000-0000-4000-8000-000000000021', null)$c$),
  ('ha_bloqueio', $c$select public.ha_bloqueio('c0470000-0000-4000-8000-000000000011')$c$),
  ('aceitar_termos', $c$select public.aceitar_termos('2026-11-05')$c$),
  ('denunciar', $c$select public.denunciar(p_motivo => 'outro', p_topico_id => 'c0470000-0000-4000-8000-000000000021')$c$),
  ('minhas_denuncias', 'select * from public.minhas_denuncias()'),
  ('moderar_conteudo', $c$select public.moderar_conteudo('topico', 'c0470000-0000-4000-8000-000000000021', 'oculto', 'x')$c$),
  ('decidir_denuncia', $c$select public.decidir_denuncia('c0470000-0000-4000-8000-000000000041', 'procedente', 'x')$c$),
  ('conceder_papel_plataforma', $c$select public.conceder_papel_plataforma('c0470000-0000-4000-8000-000000000001', 'admin', 'x')$c$),
  ('revogar_papel_plataforma', $c$select public.revogar_papel_plataforma('c0470000-0000-4000-8000-000000000001', 'admin', 'x')$c$),
  ('tg_comunidade_editado_em', 'select public.tg_comunidade_editado_em()'),
  ('tg_comunidade_removido', 'select public.tg_comunidade_removido()'),
  ('tg_respostas_nivel', 'select public.tg_respostas_nivel()'),
  ('tg_auditoria_imutavel', 'select public.tg_auditoria_imutavel()')
) as v(nome, chamada);

reset role;

-- Pelo catálogo: anon não tem privilégio nenhum, nem de tabela nem de coluna
select is(
  (select count(*)::int
     from unnest(array['perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                       'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao']) t(nome)
    where has_table_privilege('anon', format('public.%I', t.nome),
                              'select, insert, update, delete, truncate, references, trigger')
       or has_any_column_privilege('anon', format('public.%I', t.nome), 'select, insert, update, references')),
  0,
  'anon não tem privilégio de tabela nem de coluna nas 10 tabelas'
);

select * from finish();
rollback;
