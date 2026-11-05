begin;
create extension if not exists pgtap with schema extensions;

select plan(87);

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('c0470000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Como a conta pedida (sessão já authenticated): linhas afetadas ou 'ERRO:<sqlstate>' (com a mensagem do catálogo).
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

-- Como postgres: 'ok' ou 'ERRO:<sqlstate>' (com a mensagem nos erros P0001).
create function pg_temp.tenta(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return 'ERRO:' || sqlstate || case when sqlstate = 'P0001' then ':' || sqlerrm else '' end;
end;
$$;

-- conceder_papel_plataforma e revogar_papel_plataforma como expressões SQL (conta pelo número do id de teste).
create function pg_temp.c(p_conta int, p_papel text, p_motivo text, p_valido text default 'null')
returns text language sql as $$
  select format('public.conceder_papel_plataforma(pg_temp.i(%L), %L::public.papel_plataforma, %L, (%s)::timestamptz)',
                p_conta, p_papel, p_motivo, p_valido)
$$;

create function pg_temp.r(p_conta int, p_papel text, p_motivo text)
returns text language sql as $$
  select format('public.revogar_papel_plataforma(pg_temp.i(%L), %L::public.papel_plataforma, %L)',
                p_conta, p_papel, p_motivo)
$$;

create function pg_temp.guarda(p_chave text, p_expr text)
returns text language sql as $$
  select format('select set_config(%L, %s::text, true)', p_chave, p_expr)
$$;

-- Autor (1), Outro (2), Sem conta (6), Moderador (7), Admin (8), Moderador vencido (9).
insert into auth.users (id, email) values
  (pg_temp.i(1), 'c047-autor@exemplo.invalid'),
  (pg_temp.i(2), 'c047-outro@exemplo.invalid'),
  (pg_temp.i(6), 'c047-semconta@exemplo.invalid'),
  (pg_temp.i(7), 'c047-moderador@exemplo.invalid'),
  (pg_temp.i(8), 'c047-admin@exemplo.invalid'),
  (pg_temp.i(9), 'c047-modvencido@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  (pg_temp.i(1), 'Autor'), (pg_temp.i(2), 'Outro'), (pg_temp.i(7), 'Moderador'),
  (pg_temp.i(8), 'Admin'), (pg_temp.i(9), 'Moderador vencido');

insert into public.papeis_plataforma (conta_id, papel, valido_ate) values
  (pg_temp.i(7), 'moderador', null), (pg_temp.i(8), 'admin', null),
  (pg_temp.i(9), 'moderador', now() - interval '1 day');

-- O admin do seed (Elisa) sai da transação de teste: aqui o Admin é o único admin vigente.
delete from public.papeis_plataforma where papel = 'admin' and conta_id <> pg_temp.i(8);

-- Uma denúncia para provar o efeito de um papel recém-concedido.
insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(12), pg_temp.i(2), 'teste_outro');
insert into public.denuncias (id, denunciante_id, perfil_id, motivo) values
  (pg_temp.i(41), pg_temp.i(1), pg_temp.i(12), 'outro');

-- Um tópico oculto de outra pessoa (o Outro), que só a moderação vigente lê.
insert into public.topicos (id, espaco_id, autor_id, titulo, corpo, estado, motivo_moderacao) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(12),
   'Tópico oculto do Outro', 'Corpo oculto', 'oculto', 'oculto no teste');

set local role authenticated;

-- conceder_papel_plataforma: erros na ordem do catálogo
select is(
  pg_temp.exec(v.n, 'select ' || v.chamada), v.esperado, v.descricao
) from (values
  (7, pg_temp.c(2, 'moderador', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Moderador não concede papel'),
  (1, pg_temp.c(2, 'moderador', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Autor não concede papel'),
  (2, pg_temp.c(2, 'admin', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'ninguém se promove a admin'),
  (6, pg_temp.c(2, 'moderador', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Sem conta não concede papel'),
  (9, pg_temp.c(2, 'moderador', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Moderador vencido não concede papel'),
  (8, pg_temp.c(null, 'moderador', 'motivo'), 'ERRO:P0001:parametro obrigatorio', 'conta nula é recusada'),
  (8, pg_temp.c(2, null, 'motivo'), 'ERRO:P0001:parametro obrigatorio', 'papel nulo é recusado'),
  (8, pg_temp.c(2, 'moderador', null), 'ERRO:P0001:motivo vazio', 'motivo nulo é recusado'),
  (8, pg_temp.c(2, 'moderador', '   '), 'ERRO:P0001:motivo vazio', 'motivo só com espaços é recusado'),
  (8, pg_temp.c(2, 'moderador', 'motivo', 'now() - interval ''1 day'''), 'ERRO:P0001:validade no passado', 'validade no passado é recusada'),
  (8, pg_temp.c(2, 'moderador', 'motivo', 'now()'), 'ERRO:P0001:validade no passado', 'validade igual a agora é recusada'),
  (8, pg_temp.c(6, 'moderador', 'motivo'), 'ERRO:P0002:conta inexistente', 'conta só em auth.users não recebe papel'),
  (8, pg_temp.c(99, 'moderador', 'motivo'), 'ERRO:P0002:conta inexistente', 'conta inexistente não recebe papel')
) as v(n, chamada, esperado, descricao);

-- revogar_papel_plataforma: erros na ordem do catálogo
select is(
  pg_temp.exec(v.n, 'select ' || v.chamada), v.esperado, v.descricao
) from (values
  (7, pg_temp.r(9, 'moderador', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Moderador não revoga papel'),
  (1, pg_temp.r(7, 'moderador', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Autor não revoga papel'),
  (9, pg_temp.r(7, 'moderador', 'motivo'), 'ERRO:42501:sem papel de plataforma', 'Moderador vencido não revoga papel'),
  (8, pg_temp.r(null, 'admin', 'motivo'), 'ERRO:P0001:parametro obrigatorio', 'conta nula é recusada na revogação'),
  (8, pg_temp.r(7, null, 'motivo'), 'ERRO:P0001:parametro obrigatorio', 'papel nulo é recusado na revogação'),
  (8, pg_temp.r(7, 'moderador', null), 'ERRO:P0001:motivo vazio', 'motivo nulo é recusado na revogação'),
  (8, pg_temp.r(7, 'moderador', '   '), 'ERRO:P0001:motivo vazio', 'motivo só com espaços é recusado na revogação'),
  (8, pg_temp.r(2, 'moderador', 'motivo'), 'ERRO:P0002:papel inexistente', 'revogar papel que a conta não tem'),
  (8, pg_temp.r(99, 'admin', 'motivo'), 'ERRO:P0002:papel inexistente', 'revogar papel de conta inexistente'),
  (8, pg_temp.r(8, 'admin', 'motivo'), 'ERRO:P0001:ultimo admin', 'não se revoga o último admin')
) as v(n, chamada, esperado, descricao);

-- Outro admin, mas com papel vencido, não conta como admin vigente
reset role;
insert into public.papeis_plataforma (conta_id, papel, valido_ate) values
  (pg_temp.i(9), 'admin', now() - interval '1 day');
set local role authenticated;

select is(
  pg_temp.exec(8, 'select ' || pg_temp.r(8, 'admin', 'motivo')),
  'ERRO:P0001:ultimo admin',
  'um segundo admin com papel vencido não evita o erro de último admin'
);

select is(
  pg_temp.exec(8, pg_temp.guarda('teste.v0', pg_temp.r(9, 'admin', 'Limpeza do papel vencido'))),
  '1',
  'revogar um admin vencido é permitido mesmo sendo o outro o único vigente'
);

-- Papéis só por função: nenhum comando direto
select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501', v.descricao
) from (values
  (8, $s$insert into public.papeis_plataforma (conta_id, papel) values (pg_temp.i(2), 'moderador')$s$,
   'Admin não insere papel direto'),
  (8, $s$update public.papeis_plataforma set valido_ate = null where conta_id = pg_temp.i(9)$s$,
   'Admin não altera papel direto'),
  (8, $s$delete from public.papeis_plataforma where conta_id = pg_temp.i(7)$s$,
   'Admin não apaga papel direto'),
  (7, $s$insert into public.papeis_plataforma (conta_id, papel) values (pg_temp.i(7), 'admin')$s$,
   'Moderador não se promove direto'),
  (2, $s$insert into public.papeis_plataforma (conta_id, papel) values (pg_temp.i(2), 'admin')$s$,
   'Outro não se promove direto')
) as v(n, sql, descricao);

-- conceder: acertos e renovação
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (8, pg_temp.guarda('teste.g1', pg_temp.c(2, 'moderador', 'Primeira concessao')), '1', 'Admin concede moderador ao Outro'),
  (8, pg_temp.guarda('teste.g2', pg_temp.c(2, 'admin', 'Admin temporario', 'now() + interval ''1 day''')), '1',
   'Admin concede admin com validade ao Outro')
) as v(n, sql, esperado, descricao);

reset role;
update public.papeis_plataforma
   set concedido_em = now() - interval '3 days', concedido_por = null
 where conta_id = pg_temp.i(2) and papel = 'moderador';
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (8, pg_temp.guarda('teste.g3', pg_temp.c(2, 'moderador', 'Renovacao', 'now() + interval ''2 days''')), '1',
   'Admin renova o moderador do Outro com nova validade'),
  (8, pg_temp.guarda('teste.g4', pg_temp.c(9, 'moderador', 'Renovacao do vencido')), '1',
   'Admin renova o papel vencido do Moderador vencido'),
  (2, pg_temp.guarda('teste.g5', pg_temp.c(1, 'moderador', 'Concedido por quem virou admin')), '1',
   'quem recebeu admin pode conceder papel')
) as v(n, sql, esperado, descricao);

reset role;

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.g1')::uuid
      and ator_id = pg_temp.i(8) and acao = 'conceder_papel' and alvo_tipo = 'papel_plataforma'
      and alvo_id = pg_temp.i(2) and estado_anterior is null and estado_novo = 'moderador'
      and motivo = 'Primeira concessao' and denuncia_id is null and conteudo is null and valido_ate is null),
  1,
  'conceder grava a auditoria (papel novo: estado anterior nulo)'
);

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.g2')::uuid
      and acao = 'conceder_papel' and alvo_id = pg_temp.i(2) and estado_anterior is null
      and estado_novo = 'admin' and valido_ate = now() + interval '1 day'),
  1,
  'conceder admin grava a validade na auditoria'
);

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.g3')::uuid
      and acao = 'conceder_papel' and alvo_id = pg_temp.i(2) and estado_anterior = 'moderador'
      and estado_novo = 'moderador' and motivo = 'Renovacao' and valido_ate = now() + interval '2 days'),
  1,
  'renovar grava a auditoria com o papel anterior e a nova validade'
);

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.g4')::uuid
      and alvo_id = pg_temp.i(9) and estado_anterior = 'moderador' and estado_novo = 'moderador' and valido_ate is null),
  1,
  'renovar um papel vencido grava a auditoria'
);

select is(
  (select count(*)::int from public.papeis_plataforma where conta_id = pg_temp.i(2)),
  2,
  'renovar não duplica a linha: o Outro tem só moderador e admin'
);

select is(
  (select (concedido_por = pg_temp.i(8))::text || '|' || (valido_ate = now() + interval '2 days')::text
          || '|' || (concedido_em > now() - interval '1 day')::text
     from public.papeis_plataforma where conta_id = pg_temp.i(2) and papel = 'moderador'),
  'true|true|true',
  'a renovação atualiza valido_ate, concedido_por e concedido_em'
);

select is(
  (select valido_ate from public.papeis_plataforma where conta_id = pg_temp.i(9) and papel = 'moderador'),
  null,
  'o papel vencido renovado sem validade fica sem fim'
);

set local role authenticated;

select is(
  pg_temp.ler(v.n, v.sql), v.esperado, v.descricao
) from (values
  (9, $q$select public.tem_papel_plataforma(array['moderador']::public.papel_plataforma[])::text$q$, 'true',
   'o papel renovado volta a valer'),
  (2, $q$select count(*) from public.denuncias where id::text like 'c047%'$q$, '1',
   'o moderador recém-concedido lê as denúncias'),
  (1, $q$select count(*) from public.denuncias where id::text like 'c047%'$q$, '1',
   'quem recebeu o papel por outro admin também lê as denúncias'),
  (7, $q$select count(*) from public.auditoria_moderacao where id = current_setting('teste.g1')::uuid$q$, '1',
   'a moderação lê a auditoria de papéis'),
  -- antes da revogação: o Admin lê o tópico oculto de outra pessoa, as denúncias e a auditoria
  (8, $q$select count(*) from public.topicos where id = pg_temp.i(21)$q$, '1',
   'antes de perder o papel, o Admin lê o tópico oculto de outra pessoa'),
  (8, $q$select count(*) from public.denuncias where id::text like 'c047%'$q$, '1',
   'antes de perder o papel, o Admin lê as denúncias'),
  (8, $q$select count(*) from public.auditoria_moderacao where id = current_setting('teste.g1')::uuid$q$, '1',
   'antes de perder o papel, o Admin lê a auditoria')
) as v(n, sql, esperado, descricao);

-- revogar: acertos, com o Outro agora admin vigente
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (2, pg_temp.guarda('teste.r1', pg_temp.r(8, 'admin', 'Saida do admin original')), '1',
   'um admin revoga outro quando sobra um admin vigente'),
  (8, 'select ' || pg_temp.r(7, 'moderador', 'motivo'), 'ERRO:42501:sem papel de plataforma',
   'quem perdeu o admin não revoga mais'),
  (2, 'select ' || pg_temp.r(2, 'admin', 'motivo'), 'ERRO:P0001:ultimo admin',
   'o último admin vigente não se revoga'),
  (2, pg_temp.guarda('teste.r2', pg_temp.r(2, 'moderador', 'Fim do moderador')), '1',
   'revogar um papel de moderador não depende da contagem de admins')
) as v(n, sql, esperado, descricao);

reset role;

select is(
  (select count(*)::int from public.auditoria_moderacao
    where id = current_setting('teste.r1')::uuid
      and ator_id = pg_temp.i(2) and acao = 'revogar_papel' and alvo_tipo = 'papel_plataforma'
      and alvo_id = pg_temp.i(8) and estado_anterior = 'admin' and estado_novo is null
      and motivo = 'Saida do admin original' and denuncia_id is null and conteudo is null and valido_ate is null),
  1,
  'revogar grava a auditoria (papel anterior para nulo)'
);

select is(
  (select count(*)::int from public.papeis_plataforma
    where (conta_id = pg_temp.i(8) and papel = 'admin') or (conta_id = pg_temp.i(2) and papel = 'moderador')),
  0,
  'as linhas revogadas foram apagadas'
);

select is(
  (select count(*)::int from public.auditoria_moderacao
    where ator_id in (pg_temp.i(1), pg_temp.i(2), pg_temp.i(7), pg_temp.i(8), pg_temp.i(9))),
  8,
  'só as 8 chamadas bem-sucedidas gravaram auditoria; as recusadas não gravaram nada'
);

-- Perder o papel tira a leitura: o Admin (revogado em r1) já não lê nada disso; o Autor, que só tem
-- moderador (concedido em g5), lia os três e deixa de ler quando o papel é revogado.
set local role authenticated;

select is(
  pg_temp.ler(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, $q$select count(*) from public.topicos where id = pg_temp.i(21)$q$, '1',
   'com o papel de moderador, o Autor lê o tópico oculto de outra pessoa'),
  (1, $q$select count(*) from public.denuncias where id::text like 'c047%'$q$, '1',
   'com o papel de moderador, o Autor lê as denúncias'),
  (1, $q$select count(*) from public.auditoria_moderacao where id = current_setting('teste.g1')::uuid$q$, '1',
   'com o papel de moderador, o Autor lê a auditoria'),
  (8, $q$select count(*) from public.topicos where id = pg_temp.i(21)$q$, '0',
   'depois de perder o admin, o Admin não lê o tópico oculto de outra pessoa'),
  (8, $q$select count(*) from public.denuncias where id::text like 'c047%'$q$, '0',
   'depois de perder o admin, o Admin não lê as denúncias'),
  (8, $q$select count(*) from public.auditoria_moderacao where id = current_setting('teste.g1')::uuid$q$, '0',
   'depois de perder o admin, o Admin não lê a auditoria')
) as v(n, sql, esperado, descricao);

select is(
  pg_temp.exec(2, pg_temp.guarda('teste.r3', pg_temp.r(1, 'moderador', 'Fim do papel do Autor'))),
  '1',
  'o admin revoga o moderador do Autor'
);

select is(
  pg_temp.ler(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, $q$select count(*) from public.topicos where id = pg_temp.i(21)$q$, '0',
   'sem o papel, o Autor deixa de ler o tópico oculto de outra pessoa'),
  (1, $q$select count(*) from public.denuncias where id::text like 'c047%'$q$, '0',
   'sem o papel, o Autor deixa de ler as denúncias'),
  (1, $q$select count(*) from public.auditoria_moderacao where id = current_setting('teste.g1')::uuid$q$, '0',
   'sem o papel, o Autor deixa de ler a auditoria')
) as v(n, sql, esperado, descricao);

reset role;

-- Auditoria imutável (D23): nenhum update, delete ou truncate passa, de nenhum papel
select is(
  pg_temp.tenta(v.sql), v.esperado, v.descricao
) from (values
  ($s$update public.auditoria_moderacao set motivo = 'adulterado' where id = current_setting('teste.g1')::uuid$s$,
   'ERRO:P0001:auditoria imutavel', 'nem o dono altera uma linha de auditoria'),
  ($s$update public.auditoria_moderacao set motivo = 'adulterado'$s$,
   'ERRO:P0001:auditoria imutavel', 'nem o dono altera a auditoria inteira'),
  ($s$delete from public.auditoria_moderacao where id = current_setting('teste.g1')::uuid$s$,
   'ERRO:P0001:auditoria imutavel', 'nem o dono apaga uma linha de auditoria'),
  ($s$delete from public.auditoria_moderacao$s$,
   'ERRO:P0001:auditoria imutavel', 'nem o dono apaga a auditoria inteira'),
  ($s$truncate public.auditoria_moderacao$s$,
   'ERRO:P0001:auditoria imutavel', 'nem o dono trunca a auditoria')
) as v(sql, esperado, descricao);

select is(
  pg_temp.tenta($s$set local role service_role; update public.auditoria_moderacao set motivo = 'adulterado'$s$),
  'ERRO:P0001:auditoria imutavel',
  'nem o service_role altera a auditoria'
);

select is(
  pg_temp.tenta($s$set local role service_role; delete from public.auditoria_moderacao$s$),
  'ERRO:P0001:auditoria imutavel',
  'nem o service_role apaga a auditoria'
);

select is(
  pg_temp.tenta($s$set local role service_role; truncate public.auditoria_moderacao$s$),
  'ERRO:P0001:auditoria imutavel',
  'nem o service_role trunca a auditoria'
);

select is(
  (select motivo from public.auditoria_moderacao where id = current_setting('teste.g1')::uuid),
  'Primeira concessao',
  'a linha de auditoria segue como foi gravada'
);

set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501', v.descricao
) from (values
  (7, $s$update public.auditoria_moderacao set motivo = 'adulterado'$s$, 'Moderador não altera a auditoria'),
  (2, $s$update public.auditoria_moderacao set motivo = 'adulterado'$s$, 'Admin não altera a auditoria'),
  (7, $s$delete from public.auditoria_moderacao$s$, 'Moderador não apaga a auditoria'),
  (2, $s$delete from public.auditoria_moderacao$s$, 'Admin não apaga a auditoria'),
  (2, $s$truncate public.auditoria_moderacao$s$, 'Admin não trunca a auditoria'),
  (7, $s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
         values (pg_temp.i(7), 'ocultar', 'topico', pg_temp.i(21), 'forjado')$s$, 'Moderador não grava auditoria direto'),
  (2, $s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
         values (pg_temp.i(2), 'ocultar', 'topico', pg_temp.i(21), 'forjado')$s$, 'Admin não grava auditoria direto'),
  (1, $s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
         values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), 'forjado')$s$, 'Autor não grava auditoria direto'),
  (7, $s$select public.tg_auditoria_imutavel()$s$, 'Moderador não executa tg_auditoria_imutavel'),
  (7, $s$select public.tg_comunidade_editado_em()$s$, 'Moderador não executa tg_comunidade_editado_em'),
  (7, $s$select public.tg_comunidade_removido()$s$, 'Moderador não executa tg_comunidade_removido'),
  (7, $s$select public.tg_respostas_nivel()$s$, 'Moderador não executa tg_respostas_nivel')
) as v(n, sql, descricao);

reset role;

select * from finish();
rollback;
