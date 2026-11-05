begin;
create extension if not exists pgtap with schema extensions;

select plan(65);

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

-- Autor (1), Outro (2) com perfil e aceite; Sem perfil (5) com aceite.
insert into auth.users (id, email) values
  (pg_temp.i(1), 'c047-autor@exemplo.invalid'),
  (pg_temp.i(2), 'c047-outro@exemplo.invalid'),
  (pg_temp.i(5), 'c047-semperfil@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  (pg_temp.i(1), 'Autor'), (pg_temp.i(2), 'Outro'), (pg_temp.i(5), 'Sem perfil');

insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(1), '2026-11-05'), (pg_temp.i(2), '2026-11-05'), (pg_temp.i(5), '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(11), pg_temp.i(1), 'teste_autor'), (pg_temp.i(12), pg_temp.i(2), 'teste_outro');

insert into public.topicos (id, espaco_id, autor_id, titulo, corpo) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T1', 'Corpo T1');

insert into public.respostas (id, topico_id, autor_id, corpo) values
  (pg_temp.i(31), pg_temp.i(21), pg_temp.i(12), 'Resposta R1');

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
