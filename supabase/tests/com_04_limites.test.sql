begin;
create extension if not exists pgtap with schema extensions;

select plan(149);

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('c0470000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Executa como dono do teste (postgres): 'ok' ou 'ERRO:<sqlstate>'. Os checks valem para qualquer papel.
create function pg_temp.tenta(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return 'ERRO:' || sqlstate;
end;
$$;

-- Executa como a conta pedida (sessão authenticated): linhas afetadas ou 'ERRO:<sqlstate>'.
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
  return 'ERRO:' || sqlstate;
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

-- Como postgres: 'ok' ou 'sqlstate:nome da constraint violada' (para provar de qual constraint veio o erro).
create function pg_temp.restricao(p_sql text) returns text
language plpgsql as $$
declare c text;
begin
  execute p_sql;
  return 'ok';
exception when others then
  get stacked diagnostics c = constraint_name;
  return sqlstate || ':' || coalesce(c, '-');
end;
$$;

-- Autor (1), Outro (2) com perfil e aceite; Sem perfil (5) com aceite e sem perfil, que nunca ganha perfil
-- neste arquivo (só tenta). As contas 51 a 55 também são Sem perfil, uma para cada insert positivo de perfil,
-- porque cada conta tem no máximo um perfil.
insert into auth.users (id, email) values
  (pg_temp.i(1), 'c047-autor@exemplo.invalid'),
  (pg_temp.i(2), 'c047-outro@exemplo.invalid'),
  (pg_temp.i(5), 'c047-semperfil@exemplo.invalid'),
  (pg_temp.i(51), 'c047-semperfil51@exemplo.invalid'),
  (pg_temp.i(52), 'c047-semperfil52@exemplo.invalid'),
  (pg_temp.i(53), 'c047-semperfil53@exemplo.invalid'),
  (pg_temp.i(54), 'c047-semperfil54@exemplo.invalid'),
  (pg_temp.i(55), 'c047-semperfil55@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  (pg_temp.i(1), 'Autor'), (pg_temp.i(2), 'Outro'), (pg_temp.i(5), 'Sem perfil'),
  (pg_temp.i(51), 'Sem perfil 51'), (pg_temp.i(52), 'Sem perfil 52'), (pg_temp.i(53), 'Sem perfil 53'),
  (pg_temp.i(54), 'Sem perfil 54'), (pg_temp.i(55), 'Sem perfil 55');

insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(1), '2026-11-05'), (pg_temp.i(2), '2026-11-05'), (pg_temp.i(5), '2026-11-05'),
  (pg_temp.i(51), '2026-11-05'), (pg_temp.i(52), '2026-11-05'), (pg_temp.i(53), '2026-11-05'),
  (pg_temp.i(54), '2026-11-05'), (pg_temp.i(55), '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(11), pg_temp.i(1), 'teste_autor'), (pg_temp.i(12), pg_temp.i(2), 'teste_outro');

insert into public.topicos (id, espaco_id, autor_id, titulo, corpo) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T1', 'Corpo T1');

-- T4 é do Outro; a resposta 31 é do Outro em T1; a resposta 32 é do Autor em T4 (a política deixa o Autor gravar).
insert into public.topicos (id, espaco_id, autor_id, titulo, corpo) values
  (pg_temp.i(24), (select id from public.espacos where slug = 'banho'), pg_temp.i(12), 'Tópico T4', 'Corpo T4');

insert into public.respostas (id, topico_id, autor_id, corpo) values
  (pg_temp.i(31), pg_temp.i(21), pg_temp.i(12), 'Resposta R1'),
  (pg_temp.i(32), pg_temp.i(24), pg_temp.i(11), 'Resposta R2');

-- Pelo caminho exigido pela spec (COM-08 caso 4): cada coluna é gravada por quem a grava, como authenticated.
-- Para cada coluna: no mínimo passa, no máximo passa, abaixo do mínimo, só espaços e um acima do máximo dão 23514.
set local role authenticated;

select is(
  pg_temp.ler(5, 'select public.meu_perfil_id()::text'), null,
  'Sem perfil (conta 5): meu_perfil_id() é NULL antes das tentativas de criar perfil'
);

-- perfis_publicos.apelido, criado pelo Sem perfil (insert)
select is(
  pg_temp.exec(v.n, format($t$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(%s), %s)$t$,
                           v.n, v.valor)),
  v.esperado,
  'Sem perfil cria perfil, apelido ' || v.rotulo
) from (values
  (5, 'abaixo do mínimo (2 caracteres)', $v$'ab'$v$, 'ERRO:23514'),
  (5, 'só espaços', $v$'   '$v$, 'ERRO:23514'),
  (5, 'com espaço no começo', $v$' abc'$v$, 'ERRO:23514'),
  (5, 'com espaço no fim', $v$'abc '$v$, 'ERRO:23514'),
  (5, 'de 1 caractere com espaços', $v$'a  '$v$, 'ERRO:23514'),
  (5, 'um acima do máximo (31 caracteres)', $v$repeat('c', 31)$v$, 'ERRO:23514'),
  (51, 'no mínimo (3 caracteres)', $v$'cba'$v$, '1'),
  (52, 'no máximo (30 caracteres)', $v$repeat('c', 30)$v$, '1')
) as v(n, rotulo, valor, esperado);

-- perfis_publicos.bio, criada pelo Sem perfil (insert); o apelido é válido
select is(
  pg_temp.exec(v.n, format($t$insert into public.perfis_publicos (conta_id, apelido, bio) values (pg_temp.i(%s), %L, %s)$t$,
                           v.n, v.apelido, v.valor)),
  v.esperado,
  'Sem perfil cria perfil, bio ' || v.rotulo
) from (values
  (5, 'teste_bio_neg', 'vazia (abaixo do mínimo)', $v$''$v$, 'ERRO:23514'),
  (5, 'teste_bio_neg', 'só espaços', $v$'   '$v$, 'ERRO:23514'),
  (5, 'teste_bio_neg', 'um acima do máximo (161 caracteres)', $v$repeat('b', 161)$v$, 'ERRO:23514'),
  (53, 'teste_bio_min', 'no mínimo (1 caractere)', $v$'x'$v$, '1'),
  (54, 'teste_bio_max', 'no máximo (160 caracteres)', $v$repeat('b', 160)$v$, '1'),
  (55, 'teste_bio_nulo', 'nula', 'null', '1')
) as v(n, apelido, rotulo, valor, esperado);

-- perfis_publicos.apelido, editado pelo Autor (update)
select is(
  pg_temp.exec(1, format($t$update public.perfis_publicos set apelido = %s where id = pg_temp.i(11)$t$, v.valor)),
  v.esperado,
  'Autor edita o apelido: ' || v.rotulo
) from (values
  ('abaixo do mínimo (2 caracteres)', $v$'ab'$v$, 'ERRO:23514'),
  ('só espaços', $v$'   '$v$, 'ERRO:23514'),
  ('com espaço no começo', $v$' xyz'$v$, 'ERRO:23514'),
  ('com espaço no fim', $v$'xyz '$v$, 'ERRO:23514'),
  ('de 1 caractere com espaços', $v$'a  '$v$, 'ERRO:23514'),
  ('um acima do máximo (31 caracteres)', $v$repeat('z', 31)$v$, 'ERRO:23514'),
  ('no mínimo (3 caracteres)', $v$'xyz'$v$, '1'),
  ('no máximo (30 caracteres)', $v$repeat('z', 30)$v$, '1')
) as v(rotulo, valor, esperado);

-- perfis_publicos.bio, editada pelo Autor (update)
select is(
  pg_temp.exec(1, format($t$update public.perfis_publicos set bio = %s where id = pg_temp.i(11)$t$, v.valor)),
  v.esperado,
  'Autor edita a bio: ' || v.rotulo
) from (values
  ('vazia (abaixo do mínimo)', $v$''$v$, 'ERRO:23514'),
  ('só espaços', $v$'   '$v$, 'ERRO:23514'),
  ('um acima do máximo (161 caracteres)', $v$repeat('b', 161)$v$, 'ERRO:23514'),
  ('no mínimo (1 caractere)', $v$'x'$v$, '1'),
  ('no máximo (160 caracteres)', $v$repeat('b', 160)$v$, '1'),
  ('nula', 'null', '1')
) as v(rotulo, valor, esperado);

-- topicos.titulo, pelo Autor (insert e update)
select is(
  pg_temp.exec(1, format($t$insert into public.topicos (espaco_id, autor_id, titulo, corpo)
      values ((select id from public.espacos where slug = 'sono'), pg_temp.i(11), %s, 'Corpo válido')$t$, v.valor)),
  v.esperado,
  'Autor cria tópico, título ' || v.rotulo
) from (values
  ('abaixo do mínimo (2 caracteres)', $v$'ab'$v$, 'ERRO:23514'),
  ('só espaços', $v$'   '$v$, 'ERRO:23514'),
  ('com 1 caractere útil entre espaços', $v$' a '$v$, 'ERRO:23514'),
  ('no mínimo (3 caracteres)', $v$'abc'$v$, '1'),
  ('no máximo (120 caracteres)', $v$repeat('t', 120)$v$, '1'),
  ('um acima do máximo (121 caracteres)', $v$repeat('t', 121)$v$, 'ERRO:23514')
) as v(rotulo, valor, esperado);

select is(
  pg_temp.exec(1, format($t$update public.topicos set titulo = %s where id = pg_temp.i(21)$t$, v.valor)),
  v.esperado,
  'Autor edita o tópico, título ' || v.rotulo
) from (values
  ('abaixo do mínimo (2 caracteres)', $v$'ab'$v$, 'ERRO:23514'),
  ('só espaços', $v$'   '$v$, 'ERRO:23514'),
  ('com 1 caractere útil entre espaços', $v$' a '$v$, 'ERRO:23514'),
  ('no mínimo (3 caracteres)', $v$'abc'$v$, '1'),
  ('no máximo (120 caracteres)', $v$repeat('t', 120)$v$, '1'),
  ('um acima do máximo (121 caracteres)', $v$repeat('t', 121)$v$, 'ERRO:23514')
) as v(rotulo, valor, esperado);

-- topicos.corpo, pelo Autor (insert e update)
select is(
  pg_temp.exec(1, format($t$insert into public.topicos (espaco_id, autor_id, titulo, corpo)
      values ((select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Título válido', %s)$t$, v.valor)),
  v.esperado,
  'Autor cria tópico, corpo ' || v.rotulo
) from (values
  ('vazio (abaixo do mínimo)', $v$''$v$, 'ERRO:23514'),
  ('só espaços', $v$'   '$v$, 'ERRO:23514'),
  ('no mínimo (1 caractere)', $v$'x'$v$, '1'),
  ('no máximo (5000 caracteres)', $v$repeat('c', 5000)$v$, '1'),
  ('um acima do máximo (5001 caracteres)', $v$repeat('c', 5001)$v$, 'ERRO:23514')
) as v(rotulo, valor, esperado);

select is(
  pg_temp.exec(1, format($t$update public.topicos set corpo = %s where id = pg_temp.i(21)$t$, v.valor)),
  v.esperado,
  'Autor edita o tópico, corpo ' || v.rotulo
) from (values
  ('vazio (abaixo do mínimo)', $v$''$v$, 'ERRO:23514'),
  ('só espaços', $v$'   '$v$, 'ERRO:23514'),
  ('no mínimo (1 caractere)', $v$'x'$v$, '1'),
  ('no máximo (5000 caracteres)', $v$repeat('c', 5000)$v$, '1'),
  ('um acima do máximo (5001 caracteres)', $v$repeat('c', 5001)$v$, 'ERRO:23514')
) as v(rotulo, valor, esperado);

-- respostas.corpo, pelo Autor (insert em T4, que a política deixa; update na própria resposta 32)
select is(
  pg_temp.exec(1, format($t$insert into public.respostas (topico_id, autor_id, corpo)
      values (pg_temp.i(24), pg_temp.i(11), %s)$t$, v.valor)),
  v.esperado,
  'Autor responde, corpo ' || v.rotulo
) from (values
  ('vazio (abaixo do mínimo)', $v$''$v$, 'ERRO:23514'),
  ('só espaços', $v$'   '$v$, 'ERRO:23514'),
  ('no mínimo (1 caractere)', $v$'x'$v$, '1'),
  ('no máximo (2000 caracteres)', $v$repeat('r', 2000)$v$, '1'),
  ('um acima do máximo (2001 caracteres)', $v$repeat('r', 2001)$v$, 'ERRO:23514')
) as v(rotulo, valor, esperado);

select is(
  pg_temp.exec(1, format($t$update public.respostas set corpo = %s where id = pg_temp.i(32)$t$, v.valor)),
  v.esperado,
  'Autor edita a resposta, corpo ' || v.rotulo
) from (values
  ('vazio (abaixo do mínimo)', $v$''$v$, 'ERRO:23514'),
  ('só espaços', $v$'   '$v$, 'ERRO:23514'),
  ('no mínimo (1 caractere)', $v$'x'$v$, '1'),
  ('no máximo (2000 caracteres)', $v$repeat('r', 2000)$v$, '1'),
  ('um acima do máximo (2001 caracteres)', $v$repeat('r', 2001)$v$, 'ERRO:23514')
) as v(rotulo, valor, esperado);

-- denuncias.texto, pelo Outro, pela função denunciar (nunca insert direto); texto nulo também passa
select is(
  pg_temp.exec(2, format($t$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(21), p_texto => %s)$t$,
                         v.valor)),
  v.esperado,
  'Outro denuncia, texto ' || v.rotulo
) from (values
  ('vazio (abaixo do mínimo)', $v$''$v$, 'ERRO:23514'),
  ('só espaços', $v$'   '$v$, 'ERRO:23514'),
  ('no mínimo (1 caractere)', $v$'x'$v$, '1'),
  ('no máximo (500 caracteres)', $v$repeat('d', 500)$v$, '1'),
  ('um acima do máximo (501 caracteres)', $v$repeat('d', 501)$v$, 'ERRO:23514'),
  ('nulo', 'null', '1')
) as v(rotulo, valor, esperado);

reset role;

-- Cada insert positivo criou o único perfil da conta; a conta 5 só tentou e nunca ganhou perfil
select is(
  (select count(*)::int from public.perfis_publicos
    where conta_id in (pg_temp.i(51), pg_temp.i(52), pg_temp.i(53), pg_temp.i(54), pg_temp.i(55))),
  5,
  'cada conta Sem perfil dos casos positivos (51 a 55) criou exatamente um perfil'
);

select is(
  (select count(*)::int from public.perfis_publicos where conta_id = pg_temp.i(5)),
  0,
  'a conta 5, que só tentou criar perfil com valores inválidos, segue sem perfil'
);

-- Negativas diretas de denuncias, como postgres: cada uma com a constraint certa e um controle válido ao lado
select is(
  pg_temp.restricao(v.sql), v.esperado, v.descricao
) from (values
  ($s$insert into public.denuncias (denunciante_id, topico_id, resposta_id, motivo)
      values (pg_temp.i(2), pg_temp.i(21), pg_temp.i(31), 'outro')$s$,
   '23514:denuncias_alvo_unico', 'denúncia com tópico e resposta fere denuncias_alvo_unico'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, perfil_id, motivo)
      values (pg_temp.i(2), pg_temp.i(21), pg_temp.i(11), 'outro')$s$,
   '23514:denuncias_alvo_unico', 'denúncia com tópico e perfil fere denuncias_alvo_unico'),
  ($s$insert into public.denuncias (denunciante_id, resposta_id, perfil_id, motivo)
      values (pg_temp.i(2), pg_temp.i(31), pg_temp.i(11), 'outro')$s$,
   '23514:denuncias_alvo_unico', 'denúncia com resposta e perfil fere denuncias_alvo_unico'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, resposta_id, perfil_id, motivo)
      values (pg_temp.i(2), pg_temp.i(21), pg_temp.i(31), pg_temp.i(11), 'outro')$s$,
   '23514:denuncias_alvo_unico', 'denúncia com os três alvos fere denuncias_alvo_unico'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo)
      values (pg_temp.i(2), pg_temp.i(21), 'outro')$s$,
   'ok', 'controle: denúncia com um só alvo (tópico) passa'),
  ($s$insert into public.denuncias (denunciante_id, resposta_id, motivo)
      values (pg_temp.i(2), pg_temp.i(31), 'outro')$s$,
   'ok', 'controle: denúncia com um só alvo (resposta) passa'),
  ($s$insert into public.denuncias (denunciante_id, perfil_id, motivo)
      values (pg_temp.i(2), pg_temp.i(11), 'outro')$s$,
   'ok', 'controle: denúncia com um só alvo (perfil) passa'),
  ($s$insert into public.denuncias (denunciante_id, motivo)
      values (pg_temp.i(2), 'outro')$s$,
   'ok', 'controle: denúncia sem alvo (o alvo pode virar nulo) passa'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, estado, decidida_por)
      values (pg_temp.i(2), pg_temp.i(21), 'outro', 'procedente', pg_temp.i(1))$s$,
   '23514:denuncias_decisao_data', 'denúncia procedente sem decidida_em fere denuncias_decisao_data'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, estado, decidida_por)
      values (pg_temp.i(2), pg_temp.i(21), 'outro', 'improcedente', pg_temp.i(1))$s$,
   '23514:denuncias_decisao_data', 'denúncia improcedente sem decidida_em fere denuncias_decisao_data'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, estado, decidida_em)
      values (pg_temp.i(2), pg_temp.i(21), 'outro', 'aberta', now())$s$,
   '23514:denuncias_decisao_data', 'denúncia aberta com decidida_em fere denuncias_decisao_data'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, estado, decidida_em)
      values (pg_temp.i(2), pg_temp.i(21), 'outro', 'em_analise', now())$s$,
   '23514:denuncias_decisao_data', 'denúncia em análise com decidida_em fere denuncias_decisao_data'),
  ($s$update public.denuncias set estado = 'procedente'
      where id = (select id from public.denuncias where denunciante_id = pg_temp.i(2) and topico_id = pg_temp.i(21) limit 1)$s$,
   '23514:denuncias_decisao_data', 'update para procedente sem decidida_em fere denuncias_decisao_data'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, estado, decidida_por, decidida_em)
      values (pg_temp.i(2), pg_temp.i(21), 'outro', 'procedente', pg_temp.i(1), now())$s$,
   'ok', 'controle: denúncia procedente com decidida_em e decidida_por passa'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, estado, decidida_por, decidida_em)
      values (pg_temp.i(2), pg_temp.i(21), 'outro', 'improcedente', pg_temp.i(1), now())$s$,
   'ok', 'controle: denúncia improcedente com decidida_em e decidida_por passa')
) as v(sql, esperado, descricao);

-- Os limites contam: mínimo em btrim(valor), máximo em valor. A violação é um check (23514).
select is(
  pg_temp.tenta(v.sql), v.esperado, v.descricao
) from (values
  -- perfis_publicos.apelido: 3 a 30, sem espaço no começo nem no fim; único sem diferenciar caixa
  ($s$update public.perfis_publicos set apelido = 'ab' where id = pg_temp.i(11)$s$, 'ERRO:23514', 'apelido com 2 caracteres é recusado'),
  ($s$update public.perfis_publicos set apelido = '   ' where id = pg_temp.i(11)$s$, 'ERRO:23514', 'apelido só com espaços é recusado'),
  ($s$update public.perfis_publicos set apelido = ' abc' where id = pg_temp.i(11)$s$, 'ERRO:23514', 'apelido com espaço no começo é recusado'),
  ($s$update public.perfis_publicos set apelido = 'abc ' where id = pg_temp.i(11)$s$, 'ERRO:23514', 'apelido com espaço no fim é recusado'),
  ($s$update public.perfis_publicos set apelido = 'a  ' where id = pg_temp.i(11)$s$, 'ERRO:23514', 'apelido de 1 caractere com espaços é recusado'),
  ($s$update public.perfis_publicos set apelido = 'abc' where id = pg_temp.i(11)$s$, 'ok', 'apelido com 3 caracteres passa'),
  ($s$update public.perfis_publicos set apelido = repeat('a', 30) where id = pg_temp.i(11)$s$, 'ok', 'apelido com 30 caracteres passa'),
  ($s$update public.perfis_publicos set apelido = repeat('a', 31) where id = pg_temp.i(11)$s$, 'ERRO:23514', 'apelido com 31 caracteres é recusado'),
  ($s$update public.perfis_publicos set apelido = 'TESTE_OUTRO' where id = pg_temp.i(11)$s$, 'ERRO:23505', 'apelido repetido com outra caixa é recusado'),
  -- perfis_publicos.bio: 1 a 160, ou nulo
  ($s$update public.perfis_publicos set bio = '' where id = pg_temp.i(11)$s$, 'ERRO:23514', 'bio vazia é recusada'),
  ($s$update public.perfis_publicos set bio = '   ' where id = pg_temp.i(11)$s$, 'ERRO:23514', 'bio só com espaços é recusada'),
  ($s$update public.perfis_publicos set bio = 'x' where id = pg_temp.i(11)$s$, 'ok', 'bio com 1 caractere passa'),
  ($s$update public.perfis_publicos set bio = repeat('b', 160) where id = pg_temp.i(11)$s$, 'ok', 'bio com 160 caracteres passa'),
  ($s$update public.perfis_publicos set bio = repeat('b', 161) where id = pg_temp.i(11)$s$, 'ERRO:23514', 'bio com 161 caracteres é recusada'),
  ($s$update public.perfis_publicos set bio = null where id = pg_temp.i(11)$s$, 'ok', 'bio nula passa'),
  -- topicos.titulo: 3 a 120
  ($s$update public.topicos set titulo = 'ab' where id = pg_temp.i(21)$s$, 'ERRO:23514', 'título com 2 caracteres é recusado'),
  ($s$update public.topicos set titulo = '   ' where id = pg_temp.i(21)$s$, 'ERRO:23514', 'título só com espaços é recusado'),
  ($s$update public.topicos set titulo = ' a ' where id = pg_temp.i(21)$s$, 'ERRO:23514', 'título com 1 caractere útil é recusado'),
  ($s$update public.topicos set titulo = 'abc' where id = pg_temp.i(21)$s$, 'ok', 'título com 3 caracteres passa'),
  ($s$update public.topicos set titulo = repeat('t', 120) where id = pg_temp.i(21)$s$, 'ok', 'título com 120 caracteres passa'),
  ($s$update public.topicos set titulo = repeat('t', 121) where id = pg_temp.i(21)$s$, 'ERRO:23514', 'título com 121 caracteres é recusado'),
  -- topicos.corpo: 1 a 5000
  ($s$update public.topicos set corpo = '' where id = pg_temp.i(21)$s$, 'ERRO:23514', 'corpo de tópico vazio é recusado'),
  ($s$update public.topicos set corpo = '   ' where id = pg_temp.i(21)$s$, 'ERRO:23514', 'corpo de tópico só com espaços é recusado'),
  ($s$update public.topicos set corpo = 'x' where id = pg_temp.i(21)$s$, 'ok', 'corpo de tópico com 1 caractere passa'),
  ($s$update public.topicos set corpo = repeat('c', 5000) where id = pg_temp.i(21)$s$, 'ok', 'corpo de tópico com 5000 caracteres passa'),
  ($s$update public.topicos set corpo = repeat('c', 5001) where id = pg_temp.i(21)$s$, 'ERRO:23514', 'corpo de tópico com 5001 caracteres é recusado'),
  -- respostas.corpo: 1 a 2000
  ($s$update public.respostas set corpo = '' where id = pg_temp.i(31)$s$, 'ERRO:23514', 'corpo de resposta vazio é recusado'),
  ($s$update public.respostas set corpo = '   ' where id = pg_temp.i(31)$s$, 'ERRO:23514', 'corpo de resposta só com espaços é recusado'),
  ($s$update public.respostas set corpo = 'x' where id = pg_temp.i(31)$s$, 'ok', 'corpo de resposta com 1 caractere passa'),
  ($s$update public.respostas set corpo = repeat('r', 2000) where id = pg_temp.i(31)$s$, 'ok', 'corpo de resposta com 2000 caracteres passa'),
  ($s$update public.respostas set corpo = repeat('r', 2001) where id = pg_temp.i(31)$s$, 'ERRO:23514', 'corpo de resposta com 2001 caracteres é recusado'),
  -- o texto da exclusão de conta cabe nos limites
  ($s$update public.topicos set titulo = '[removido]', corpo = '[removido]' where id = pg_temp.i(21)$s$, 'ok', '[removido] cabe no título e no corpo de tópico'),
  ($s$update public.respostas set corpo = '[removido]' where id = pg_temp.i(31)$s$, 'ok', '[removido] cabe no corpo de resposta'),
  -- denuncias.texto: 1 a 500, ou nulo
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, texto)
      values (pg_temp.i(1), pg_temp.i(21), 'outro', '')$s$, 'ERRO:23514', 'texto de denúncia vazio é recusado'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, texto)
      values (pg_temp.i(1), pg_temp.i(21), 'outro', '   ')$s$, 'ERRO:23514', 'texto de denúncia só com espaços é recusado'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, texto)
      values (pg_temp.i(1), pg_temp.i(21), 'outro', 'x')$s$, 'ok', 'texto de denúncia com 1 caractere passa'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, texto)
      values (pg_temp.i(1), pg_temp.i(21), 'outro', repeat('d', 500))$s$, 'ok', 'texto de denúncia com 500 caracteres passa'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, texto)
      values (pg_temp.i(1), pg_temp.i(21), 'outro', repeat('d', 501))$s$, 'ERRO:23514', 'texto de denúncia com 501 caracteres é recusado'),
  ($s$insert into public.denuncias (denunciante_id, topico_id, motivo, texto)
      values (pg_temp.i(1), pg_temp.i(21), 'outro', null)$s$, 'ok', 'denúncia sem texto passa'),
  -- topicos.motivo_moderacao: 1 a 300, nulo se e só se visível
  ($s$update public.topicos set estado = 'oculto', motivo_moderacao = '' where id = pg_temp.i(21)$s$, 'ERRO:23514', 'motivo de moderação vazio no tópico é recusado'),
  ($s$update public.topicos set estado = 'oculto', motivo_moderacao = 'x' where id = pg_temp.i(21)$s$, 'ok', 'motivo de moderação com 1 caractere passa no tópico'),
  ($s$update public.topicos set estado = 'oculto', motivo_moderacao = repeat('m', 300) where id = pg_temp.i(21)$s$, 'ok', 'motivo de moderação com 300 caracteres passa no tópico'),
  ($s$update public.topicos set estado = 'oculto', motivo_moderacao = repeat('m', 301) where id = pg_temp.i(21)$s$, 'ERRO:23514', 'motivo de moderação com 301 caracteres é recusado no tópico'),
  ($s$update public.topicos set estado = 'oculto', motivo_moderacao = '   ' where id = pg_temp.i(21)$s$, 'ERRO:23514', 'motivo de moderação só com espaços é recusado no tópico'),
  ($s$update public.topicos set estado = 'visivel', motivo_moderacao = 'x' where id = pg_temp.i(21)$s$, 'ERRO:23514', 'tópico visível com motivo é recusado'),
  ($s$update public.topicos set estado = 'oculto', motivo_moderacao = null where id = pg_temp.i(21)$s$, 'ERRO:23514', 'tópico oculto sem motivo é recusado'),
  ($s$update public.topicos set estado = 'visivel', motivo_moderacao = null where id = pg_temp.i(21)$s$, 'ok', 'tópico volta a visível sem motivo'),
  -- respostas.motivo_moderacao: as mesmas regras
  ($s$update public.respostas set estado = 'removido', motivo_moderacao = '' where id = pg_temp.i(31)$s$, 'ERRO:23514', 'motivo de moderação vazio na resposta é recusado'),
  ($s$update public.respostas set estado = 'removido', motivo_moderacao = 'x' where id = pg_temp.i(31)$s$, 'ok', 'motivo de moderação com 1 caractere passa na resposta'),
  ($s$update public.respostas set estado = 'removido', motivo_moderacao = repeat('m', 300) where id = pg_temp.i(31)$s$, 'ok', 'motivo de moderação com 300 caracteres passa na resposta'),
  ($s$update public.respostas set estado = 'removido', motivo_moderacao = repeat('m', 301) where id = pg_temp.i(31)$s$, 'ERRO:23514', 'motivo de moderação com 301 caracteres é recusado na resposta'),
  ($s$update public.respostas set estado = 'removido', motivo_moderacao = '   ' where id = pg_temp.i(31)$s$, 'ERRO:23514', 'motivo de moderação só com espaços é recusado na resposta'),
  ($s$update public.respostas set estado = 'visivel', motivo_moderacao = 'x' where id = pg_temp.i(31)$s$, 'ERRO:23514', 'resposta visível com motivo é recusada'),
  ($s$update public.respostas set estado = 'removido', motivo_moderacao = null where id = pg_temp.i(31)$s$, 'ERRO:23514', 'resposta removida sem motivo é recusada'),
  ($s$update public.respostas set estado = 'visivel', motivo_moderacao = null where id = pg_temp.i(31)$s$, 'ok', 'resposta volta a visível sem motivo'),
  -- auditoria_moderacao.motivo: 1 a 300
  ($s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
      values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), '')$s$, 'ERRO:23514', 'motivo de auditoria vazio é recusado'),
  ($s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
      values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), '   ')$s$, 'ERRO:23514', 'motivo de auditoria só com espaços é recusado'),
  ($s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
      values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), 'x')$s$, 'ok', 'motivo de auditoria com 1 caractere passa'),
  ($s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
      values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), repeat('a', 300))$s$, 'ok', 'motivo de auditoria com 300 caracteres passa'),
  ($s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
      values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), repeat('a', 301))$s$, 'ERRO:23514', 'motivo de auditoria com 301 caracteres é recusado'),
  ($s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
      values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), null)$s$, 'ERRO:23502', 'motivo de auditoria nulo é recusado')
) as v(sql, esperado, descricao);

-- Os mesmos limites valem pelo caminho do cliente: a política passa e o check recusa
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, $s$insert into public.topicos (espaco_id, autor_id, titulo, corpo)
         values ((select id from public.espacos where slug = 'sono'), pg_temp.i(11), repeat('t', 121), 'Corpo')$s$,
   'ERRO:23514', 'Autor não cria tópico com título de 121 caracteres'),
  (1, $s$insert into public.topicos (espaco_id, autor_id, titulo, corpo)
         values ((select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Título', repeat('c', 5001))$s$,
   'ERRO:23514', 'Autor não cria tópico com corpo de 5001 caracteres'),
  (2, $s$insert into public.respostas (topico_id, autor_id, corpo)
         values (pg_temp.i(21), pg_temp.i(12), repeat('r', 2001))$s$,
   'ERRO:23514', 'Outro não responde com corpo de 2001 caracteres'),
  (5, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(5), 'ab')$s$,
   'ERRO:23514', 'Sem perfil não cria perfil com apelido de 2 caracteres')
) as v(n, sql, esperado, descricao);

reset role;

select * from finish();
rollback;
