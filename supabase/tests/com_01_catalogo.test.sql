begin;
create extension if not exists pgtap with schema extensions;

select plan(113);

-- Lista fechada das 10 tabelas e das 21 funções da comunidade (COM-07).
-- Meta-testes valem para todo o esquema public; funções de extensão ficam de fora (pg_depend deptype 'e').

-- RLS
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  0,
  'toda tabela de public tem RLS ligada'
);

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relrowsecurity
      and c.relname in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                        'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')),
  10,
  'as 10 tabelas da comunidade existem com RLS ligada'
);

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relforcerowsecurity
      and c.relname in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                        'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')),
  0,
  'as tabelas da comunidade não usam force row level security (como na MAT-43)'
);

-- Funções de public (fora as de extensão)
-- Toda função security definer de public tem search_path vazio. Funções security invoker de outras
-- tarefas não entram na regra.
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not coalesce('search_path=""' = any (p.proconfig), false)
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass
                        and d.objid = p.oid and d.deptype = 'e')),
  0,
  'toda função security definer de public fixa search_path vazio'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass
                        and d.objid = p.oid and d.deptype = 'e')),
  0,
  'anon não executa nenhuma função de public'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('meu_perfil_id', 'conta_habilitada', 'aceite_vigente', 'escritor_habilitado',
        'tem_papel_plataforma', 'pode_ler_perfil', 'pode_ler_topico', 'pode_ler_resposta', 'pode_responder',
        'ha_bloqueio', 'aceitar_termos', 'denunciar', 'minhas_denuncias', 'moderar_conteudo',
        'decidir_denuncia', 'conceder_papel_plataforma', 'revogar_papel_plataforma',
        'tg_comunidade_editado_em', 'tg_comunidade_removido', 'tg_respostas_nivel', 'tg_auditoria_imutavel')),
  21,
  'as 21 funções da comunidade existem, uma de cada nome'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and coalesce('search_path=""' = any (p.proconfig), false)
      and p.proname in ('meu_perfil_id', 'conta_habilitada', 'aceite_vigente', 'escritor_habilitado',
        'tem_papel_plataforma', 'pode_ler_perfil', 'pode_ler_topico', 'pode_ler_resposta', 'pode_responder',
        'ha_bloqueio', 'aceitar_termos', 'denunciar', 'minhas_denuncias', 'moderar_conteudo',
        'decidir_denuncia', 'conceder_papel_plataforma', 'revogar_papel_plataforma',
        'tg_comunidade_editado_em', 'tg_comunidade_removido', 'tg_respostas_nivel', 'tg_auditoria_imutavel')),
  21,
  'as 21 funções da comunidade são security definer com search_path vazio'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
      and p.proname in ('meu_perfil_id', 'conta_habilitada', 'aceite_vigente', 'escritor_habilitado',
        'tem_papel_plataforma', 'pode_ler_perfil', 'pode_ler_topico', 'pode_ler_resposta', 'pode_responder',
        'aceitar_termos', 'denunciar', 'minhas_denuncias', 'moderar_conteudo',
        'decidir_denuncia', 'conceder_papel_plataforma', 'revogar_papel_plataforma')),
  16,
  'authenticated executa as 16 funções que o cliente chama'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
      and p.proname in ('ha_bloqueio', 'tg_comunidade_editado_em', 'tg_comunidade_removido',
                        'tg_respostas_nivel', 'tg_auditoria_imutavel')),
  0,
  'authenticated não executa ha_bloqueio nem as 4 funções de gatilho'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
      and p.proname in ('tg_comunidade_editado_em', 'tg_comunidade_removido', 'tg_respostas_nivel',
                        'tg_auditoria_imutavel')),
  4,
  'as 4 funções de gatilho devolvem trigger'
);

-- Enums, na ordem
select enum_has_labels('public', 'faixa_bebe', array['0_3_meses', '3_6_meses', '6_12_meses'], 'enum faixa_bebe');
select enum_has_labels('public', 'estado_moderacao', array['visivel', 'oculto', 'removido'], 'enum estado_moderacao');
select enum_has_labels('public', 'motivo_denuncia',
  array['ataque_assedio', 'saude_perigosa', 'conteudo_sexual', 'exposicao_crianca', 'dados_pessoais',
        'spam_venda', 'risco_autolesao', 'outro'], 'enum motivo_denuncia');
select enum_has_labels('public', 'estado_denuncia', array['aberta', 'em_analise', 'procedente', 'improcedente'],
  'enum estado_denuncia');
select enum_has_labels('public', 'papel_plataforma', array['moderador', 'admin'], 'enum papel_plataforma');
select enum_has_labels('public', 'alvo_conteudo', array['topico', 'resposta'], 'enum alvo_conteudo');
select enum_has_labels('public', 'acao_moderacao',
  array['ocultar', 'remover', 'restaurar', 'decidir_denuncia', 'conceder_papel', 'revogar_papel'],
  'enum acao_moderacao');
select enum_has_labels('public', 'alvo_auditoria', array['topico', 'resposta', 'denuncia', 'papel_plataforma'],
  'enum alvo_auditoria');

-- Colunas de cada tabela (nenhuma a mais, nenhuma a menos)
select columns_are('public', 'perfis_publicos',
  array['id', 'conta_id', 'apelido', 'bio', 'faixa_bebe', 'criado_em'], 'colunas de perfis_publicos');
select columns_are('public', 'versoes_termos', array['versao', 'vigente', 'publicada_em'], 'colunas de versoes_termos');
select columns_are('public', 'aceites_termos', array['conta_id', 'versao', 'aceito_em'], 'colunas de aceites_termos');
select columns_are('public', 'espacos', array['id', 'slug', 'nome', 'ordem'], 'colunas de espacos');
select columns_are('public', 'topicos',
  array['id', 'espaco_id', 'autor_id', 'titulo', 'corpo', 'faixa_etaria', 'estado', 'motivo_moderacao',
        'criado_em', 'editado_em'], 'colunas de topicos');
select columns_are('public', 'respostas',
  array['id', 'topico_id', 'autor_id', 'resposta_a', 'corpo', 'estado', 'motivo_moderacao', 'criado_em',
        'editado_em'], 'colunas de respostas');
select columns_are('public', 'denuncias',
  array['id', 'denunciante_id', 'topico_id', 'resposta_id', 'perfil_id', 'motivo', 'texto', 'estado',
        'decidida_por', 'decidida_em', 'criada_em'], 'colunas de denuncias');
select columns_are('public', 'bloqueios', array['bloqueador_id', 'bloqueado_id', 'criado_em'], 'colunas de bloqueios');
select columns_are('public', 'papeis_plataforma',
  array['conta_id', 'papel', 'concedido_por', 'concedido_em', 'valido_ate'], 'colunas de papeis_plataforma');
select columns_are('public', 'auditoria_moderacao',
  array['id', 'ator_id', 'acao', 'alvo_tipo', 'alvo_id', 'estado_anterior', 'estado_novo', 'motivo',
        'denuncia_id', 'conteudo', 'valido_ate', 'criado_em'], 'colunas de auditoria_moderacao');

-- Chaves primárias
select col_is_pk('public', 'perfis_publicos', array['id'], 'chave primária de perfis_publicos');
select col_is_pk('public', 'versoes_termos', array['versao'], 'chave primária de versoes_termos');
select col_is_pk('public', 'aceites_termos', array['conta_id', 'versao'], 'chave primária de aceites_termos');
select col_is_pk('public', 'espacos', array['id'], 'chave primária de espacos');
select col_is_pk('public', 'topicos', array['id'], 'chave primária de topicos');
select col_is_pk('public', 'respostas', array['id'], 'chave primária de respostas');
select col_is_pk('public', 'denuncias', array['id'], 'chave primária de denuncias');
select col_is_pk('public', 'bloqueios', array['bloqueador_id', 'bloqueado_id'], 'chave primária de bloqueios');
select col_is_pk('public', 'papeis_plataforma', array['conta_id', 'papel'], 'chave primária de papeis_plataforma');
select col_is_pk('public', 'auditoria_moderacao', array['id'], 'chave primária de auditoria_moderacao');

-- Grants por coluna de authenticated: select, insert e update, tabela por tabela
select is(
  (select coalesce(string_agg(a.attname, ',' order by a.attname collate "C"), '')
     from pg_attribute a
    where a.attrelid = format('public.%I', v.tabela)::regclass
      and a.attnum > 0 and not a.attisdropped
      and has_column_privilege('authenticated', a.attrelid, a.attnum, v.priv)),
  v.colunas,
  format('authenticated tem %s em %s só em: %s', v.priv, v.tabela, v.colunas)
)
from (values
  ('perfis_publicos', 'select', 'apelido,bio,criado_em,faixa_bebe,id'),
  ('perfis_publicos', 'insert', 'apelido,bio,conta_id,faixa_bebe'),
  ('perfis_publicos', 'update', 'apelido,bio,faixa_bebe'),
  ('versoes_termos', 'select', 'publicada_em,versao,vigente'),
  ('versoes_termos', 'insert', ''),
  ('versoes_termos', 'update', ''),
  ('aceites_termos', 'select', 'aceito_em,conta_id,versao'),
  ('aceites_termos', 'insert', ''),
  ('aceites_termos', 'update', ''),
  ('espacos', 'select', 'id,nome,ordem,slug'),
  ('espacos', 'insert', ''),
  ('espacos', 'update', ''),
  ('topicos', 'select', 'autor_id,corpo,criado_em,editado_em,espaco_id,estado,faixa_etaria,id,motivo_moderacao,titulo'),
  ('topicos', 'insert', 'autor_id,corpo,espaco_id,faixa_etaria,titulo'),
  ('topicos', 'update', 'corpo,faixa_etaria,titulo'),
  ('respostas', 'select', 'autor_id,corpo,criado_em,editado_em,estado,id,motivo_moderacao,resposta_a,topico_id'),
  ('respostas', 'insert', 'autor_id,corpo,resposta_a,topico_id'),
  ('respostas', 'update', 'corpo'),
  ('denuncias', 'select', 'criada_em,decidida_em,estado,id,motivo,perfil_id,resposta_id,texto,topico_id'),
  ('denuncias', 'insert', ''),
  ('denuncias', 'update', ''),
  ('bloqueios', 'select', 'bloqueado_id,bloqueador_id,criado_em'),
  ('bloqueios', 'insert', 'bloqueado_id,bloqueador_id'),
  ('bloqueios', 'update', ''),
  ('papeis_plataforma', 'select', 'concedido_em,concedido_por,conta_id,papel,valido_ate'),
  ('papeis_plataforma', 'insert', ''),
  ('papeis_plataforma', 'update', ''),
  ('auditoria_moderacao', 'select',
    'acao,alvo_id,alvo_tipo,ator_id,conteudo,criado_em,denuncia_id,estado_anterior,estado_novo,id,motivo,valido_ate'),
  ('auditoria_moderacao', 'insert', ''),
  ('auditoria_moderacao', 'update', '')
) as v(tabela, priv, colunas);

-- Delete: só bloqueios
select is(
  has_table_privilege('authenticated', format('public.%I', v.tabela), 'delete'),
  v.esperado,
  format('authenticated %s delete em %s', case when v.esperado then 'tem' else 'não tem' end, v.tabela)
)
from (values
  ('perfis_publicos', false), ('versoes_termos', false), ('aceites_termos', false), ('espacos', false),
  ('topicos', false), ('respostas', false), ('denuncias', false), ('bloqueios', true),
  ('papeis_plataforma', false), ('auditoria_moderacao', false)
) as v(tabela, esperado);

select is(
  (select count(*)::int
     from unnest(array['perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                       'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao']) t(nome)
     cross join unnest(array['truncate', 'references', 'trigger']) p(priv)
    where has_table_privilege('authenticated', format('public.%I', t.nome), p.priv)),
  0,
  'authenticated não tem truncate, references nem trigger nas 10 tabelas'
);

-- Gatilhos
select has_trigger('public', 'topicos', 'topicos_editado_em', 'gatilho editado_em em topicos');
select has_trigger('public', 'topicos', 'topicos_removido', 'gatilho [removido] em topicos');
select has_trigger('public', 'respostas', 'respostas_editado_em', 'gatilho editado_em em respostas');
select has_trigger('public', 'respostas', 'respostas_removido', 'gatilho [removido] em respostas');
select has_trigger('public', 'respostas', 'respostas_nivel', 'gatilho de nível e de tópico em respostas');
select has_trigger('public', 'auditoria_moderacao', 'auditoria_imutavel_linha', 'gatilho de imutabilidade por linha');
select has_trigger('public', 'auditoria_moderacao', 'auditoria_imutavel_truncate',
  'gatilho de imutabilidade para truncate');

-- Linhas iniciais
select is(
  (select count(*)::int from public.versoes_termos where vigente),
  1,
  'há exatamente uma versão vigente dos termos'
);

select is(
  (select string_agg(slug, ',' order by ordem) from public.espacos where ordem between 1 and 7),
  'sono,alimentacao,banho,tummy-time,organizacao-da-rotina,divisao-dos-cuidados,dificuldades-do-dia-a-dia',
  'os 7 espaços, em ordem'
);

select is(
  (select string_agg(nome, ',' order by ordem) from public.espacos where ordem between 1 and 7),
  'Sono,Alimentação,Banho,Tummy time,Organização da rotina,Divisão dos cuidados,Dificuldades do dia a dia',
  'os nomes dos 7 espaços, em ordem'
);

-- Políticas: nomes exatos por tabela e só para authenticated
select policies_are('public', 'perfis_publicos',
  array['perfis_publicos_select', 'perfis_publicos_insert', 'perfis_publicos_update'], 'políticas de perfis_publicos');
select policies_are('public', 'versoes_termos', array['versoes_termos_select'], 'políticas de versoes_termos');
select policies_are('public', 'aceites_termos', array['aceites_termos_select'], 'políticas de aceites_termos');
select policies_are('public', 'espacos', array['espacos_select'], 'políticas de espacos');
select policies_are('public', 'topicos',
  array['topicos_select', 'topicos_insert', 'topicos_update'], 'políticas de topicos');
select policies_are('public', 'respostas',
  array['respostas_select', 'respostas_insert', 'respostas_update'], 'políticas de respostas');
select policies_are('public', 'denuncias', array['denuncias_select'], 'políticas de denuncias');
select policies_are('public', 'bloqueios',
  array['bloqueios_select', 'bloqueios_insert', 'bloqueios_delete'], 'políticas de bloqueios');
select policies_are('public', 'papeis_plataforma', array['papeis_plataforma_select'], 'políticas de papeis_plataforma');
select policies_are('public', 'auditoria_moderacao', array['auditoria_moderacao_select'],
  'políticas de auditoria_moderacao');

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public'
      and tablename in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                        'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')
      and roles <> array['authenticated']::name[]),
  0,
  'toda política das 10 tabelas é só para authenticated'
);

-- Prova por catálogo da fronteira com os dados de cuidado (COM-07). A prova por comportamento está no com_08.

-- (a) Chaves estrangeiras
select is(
  (select count(*)::int
     from pg_constraint c
     join pg_class o on o.oid = c.conrelid
     join pg_class d on d.oid = c.confrelid
    where c.contype = 'f'
      and o.relnamespace = 'public'::regnamespace
      and o.relname in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                        'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')
      and d.relname not in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                            'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma',
                            'auditoria_moderacao', 'contas')),
  0,
  'nenhuma chave estrangeira das 10 tabelas aponta para fora das 10 e de contas'
);

select is(
  (select string_agg(o.relname || '.' || a.attname, ',' order by o.relname collate "C", a.attname collate "C")
     from pg_constraint c
     join pg_class o on o.oid = c.conrelid
     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.confrelid = 'public.contas'::regclass
      and o.relname in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                        'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')),
  'aceites_termos.conta_id,denuncias.decidida_por,denuncias.denunciante_id,papeis_plataforma.concedido_por,'
    || 'papeis_plataforma.conta_id,perfis_publicos.conta_id',
  'as chaves para contas(id) são exatamente as 6 previstas'
);

select is(
  (select count(*)::int
     from pg_constraint c
     join pg_class o on o.oid = c.conrelid
     join pg_class d on d.oid = c.confrelid
    where c.contype = 'f'
      and o.relnamespace = 'public'::regnamespace
      and o.relname not in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                            'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')
      and d.relname in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                        'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')),
  0,
  'nenhuma tabela de cuidado aponta por chave estrangeira para a comunidade'
);

-- (b) As 21 funções da comunidade
select is(
  (select count(*)::int
     from pg_depend d
     join pg_proc p on p.oid = d.objid
     join pg_class c on c.oid = d.refobjid
    where d.classid = 'pg_proc'::regclass and d.refclassid = 'pg_class'::regclass
      and p.pronamespace = 'public'::regnamespace
      and p.proname in ('meu_perfil_id', 'conta_habilitada', 'aceite_vigente', 'escritor_habilitado',
        'tem_papel_plataforma', 'pode_ler_perfil', 'pode_ler_topico', 'pode_ler_resposta', 'pode_responder',
        'ha_bloqueio', 'aceitar_termos', 'denunciar', 'minhas_denuncias', 'moderar_conteudo',
        'decidir_denuncia', 'conceder_papel_plataforma', 'revogar_papel_plataforma',
        'tg_comunidade_editado_em', 'tg_comunidade_removido', 'tg_respostas_nivel', 'tg_auditoria_imutavel')
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and c.relname not in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                            'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma',
                            'auditoria_moderacao', 'contas')),
  0,
  'pg_depend: nenhuma função da comunidade depende de tabela fora das 10 e de contas'
);

select is(
  (select count(*)::int
     from pg_proc p
    cross join lateral regexp_matches(lower(p.prosrc), 'public\.([a-z_0-9]+)', 'g') m(g)
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('meu_perfil_id', 'conta_habilitada', 'aceite_vigente', 'escritor_habilitado',
        'tem_papel_plataforma', 'pode_ler_perfil', 'pode_ler_topico', 'pode_ler_resposta', 'pode_responder',
        'ha_bloqueio', 'aceitar_termos', 'denunciar', 'minhas_denuncias', 'moderar_conteudo',
        'decidir_denuncia', 'conceder_papel_plataforma', 'revogar_papel_plataforma',
        'tg_comunidade_editado_em', 'tg_comunidade_removido', 'tg_respostas_nivel', 'tg_auditoria_imutavel')
      and m.g[1] <> all (array[
        'perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos', 'respostas', 'denuncias',
        'bloqueios', 'papeis_plataforma', 'auditoria_moderacao', 'contas',
        'faixa_bebe', 'estado_moderacao', 'motivo_denuncia', 'estado_denuncia', 'papel_plataforma',
        'alvo_conteudo', 'acao_moderacao', 'alvo_auditoria',
        'meu_perfil_id', 'conta_habilitada', 'aceite_vigente', 'escritor_habilitado', 'tem_papel_plataforma',
        'pode_ler_perfil', 'pode_ler_topico', 'pode_ler_resposta', 'pode_responder', 'ha_bloqueio',
        'aceitar_termos', 'denunciar', 'minhas_denuncias', 'moderar_conteudo', 'decidir_denuncia',
        'conceder_papel_plataforma', 'revogar_papel_plataforma', 'tg_comunidade_editado_em',
        'tg_comunidade_removido', 'tg_respostas_nivel', 'tg_auditoria_imutavel'])),
  0,
  'prosrc: todo trecho public.<nome> é uma das 10 tabelas, contas, um dos 8 enums ou uma das 21 funções'
);

select cmp_ok(
  (select count(*)::int
     from pg_proc p
    cross join lateral regexp_matches(lower(p.prosrc), 'public\.([a-z_0-9]+)', 'g') m(g)
    where p.pronamespace = 'public'::regnamespace and p.proname in ('moderar_conteudo', 'denunciar', 'pode_ler_resposta')),
  '>',
  10,
  'controle: a busca por public.<nome> acha referências de verdade (a prova acima não é vazia)'
);

select is(
  (select count(*)::int
     from pg_proc p
    cross join lateral regexp_matches(lower(p.prosrc), 'auth\.([a-z_0-9]+)', 'g') m(g)
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('meu_perfil_id', 'conta_habilitada', 'aceite_vigente', 'escritor_habilitado',
        'tem_papel_plataforma', 'pode_ler_perfil', 'pode_ler_topico', 'pode_ler_resposta', 'pode_responder',
        'ha_bloqueio', 'aceitar_termos', 'denunciar', 'minhas_denuncias', 'moderar_conteudo',
        'decidir_denuncia', 'conceder_papel_plataforma', 'revogar_papel_plataforma',
        'tg_comunidade_editado_em', 'tg_comunidade_removido', 'tg_respostas_nivel', 'tg_auditoria_imutavel')
      and m.g[1] <> 'uid'),
  0,
  'prosrc: todo trecho auth.<nome> é auth.uid'
);

select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('meu_perfil_id', 'conta_habilitada', 'aceite_vigente', 'escritor_habilitado',
        'tem_papel_plataforma', 'pode_ler_perfil', 'pode_ler_topico', 'pode_ler_resposta', 'pode_responder',
        'ha_bloqueio', 'aceitar_termos', 'denunciar', 'minhas_denuncias', 'moderar_conteudo',
        'decidir_denuncia', 'conceder_papel_plataforma', 'revogar_papel_plataforma',
        'tg_comunidade_editado_em', 'tg_comunidade_removido', 'tg_respostas_nivel', 'tg_auditoria_imutavel')
      and lower(p.prosrc) ~ 'nome_privado'),
  0,
  'prosrc: nenhuma função da comunidade cita nome_privado'
);

select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('meu_perfil_id', 'conta_habilitada', 'aceite_vigente', 'escritor_habilitado',
        'tem_papel_plataforma', 'pode_ler_perfil', 'pode_ler_topico', 'pode_ler_resposta', 'pode_responder',
        'ha_bloqueio', 'aceitar_termos', 'denunciar', 'minhas_denuncias', 'moderar_conteudo',
        'decidir_denuncia', 'conceder_papel_plataforma', 'revogar_papel_plataforma',
        'tg_comunidade_editado_em', 'tg_comunidade_removido', 'tg_respostas_nivel', 'tg_auditoria_imutavel')
      and lower(p.prosrc) ~ '\mexecute\M'),
  0,
  'prosrc: nenhuma função da comunidade usa SQL dinâmico (execute)'
);

-- Nomes de coluna proibidos e políticas
select is(
  (select count(*)::int
     from pg_attribute a
     join pg_class c on c.oid = a.attrelid
    where c.relnamespace = 'public'::regnamespace
      and c.relname in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                        'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')
      and a.attnum > 0 and not a.attisdropped
      and a.attname in ('familia_id', 'bebe_id', 'registro_id', 'nascimento', 'nome_privado')),
  0,
  'nenhuma coluna das 10 tabelas é familia_id, bebe_id, registro_id, nascimento ou nome_privado'
);

select is(
  (select count(*)::int from pg_policies p
    where p.schemaname = 'public'
      and p.tablename not in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                              'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')
      and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~* '(papeis_plataforma|tem_papel_plataforma)'),
  0,
  'nenhuma política de tabela fora das 10 cita papeis_plataforma nem tem_papel_plataforma'
);

select is(
  (select count(*)::int from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                          'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')
      and exists (
        select 1
          from pg_class c
         where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
           and c.relname not in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                                 'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma',
                                 'auditoria_moderacao', 'contas')
           and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~ ('\m' || c.relname || '\M'))),
  0,
  'nenhuma política das 10 tabelas cita uma tabela de cuidado (lista lida do catálogo na hora)'
);

select cmp_ok(
  (select count(*)::int from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
      and c.relname not in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                            'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma',
                            'auditoria_moderacao', 'contas')),
  '>=',
  3,
  'controle: há pelo menos as 3 tabelas de cuidado da MAT-43 (familias, vinculos, bebes)'
);

select * from finish();
rollback;
