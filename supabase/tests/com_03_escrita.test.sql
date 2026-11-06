begin;
create extension if not exists pgtap with schema extensions;

select plan(140);

-- Ids de teste: c047... + número. Contas 1 a 9; perfis 11, 12, 13, 14, 17, 19 (conta + 10);
-- tópicos 21 a 27; respostas 31 a 38.
create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('c0470000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Executa um comando como a conta pedida (a sessão já está como authenticated).
-- Devolve as linhas afetadas, ou 'ERRO:<sqlstate>' (com a mensagem, nos erros P0001 e P0002).
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
  return 'ERRO:' || sqlstate || case when sqlstate in ('P0001', 'P0002') then ':' || sqlerrm else '' end;
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

-- insert de tópico; p_autor é uma expressão SQL (por exemplo 'pg_temp.i(11)' ou 'null')
create function pg_temp.t(p_autor text) returns text language sql as $$
  select format($f$insert into public.topicos (espaco_id, autor_id, titulo, corpo)
    values ((select id from public.espacos where slug = 'sono'), %s, 'Titulo novo', 'Corpo novo')$f$, p_autor)
$$;

-- insert de resposta; p_topico é o número do tópico; p_mae é uma expressão SQL
create function pg_temp.r(p_autor text, p_topico int, p_mae text default 'null') returns text language sql as $$
  select format($f$insert into public.respostas (topico_id, autor_id, resposta_a, corpo)
    values (pg_temp.i(%s), %s, %s, 'Resposta nova')$f$, p_topico, p_autor, p_mae)
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

insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(11), pg_temp.i(13));

insert into public.papeis_plataforma (conta_id, papel, valido_ate) values
  (pg_temp.i(7), 'moderador', null), (pg_temp.i(8), 'admin', null),
  (pg_temp.i(9), 'moderador', now() - interval '1 day');

-- T1 visível, T2 oculto, T3 removido (Autor); T4 Outro; T5 Bloqueado; T6 Moderador; T7 Sem aceite.
insert into public.topicos (id, espaco_id, autor_id, titulo, corpo, estado, motivo_moderacao) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T1', 'Corpo T1', 'visivel', null),
  (pg_temp.i(22), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T2', 'Corpo T2', 'oculto', 'oculto no teste'),
  (pg_temp.i(23), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T3', 'Corpo T3', 'removido', 'removido no teste'),
  (pg_temp.i(24), (select id from public.espacos where slug = 'banho'), pg_temp.i(12), 'Tópico T4', 'Corpo T4', 'visivel', null),
  (pg_temp.i(25), (select id from public.espacos where slug = 'banho'), pg_temp.i(13), 'Tópico T5', 'Corpo T5', 'visivel', null),
  (pg_temp.i(26), (select id from public.espacos where slug = 'banho'), pg_temp.i(17), 'Tópico TM', 'Corpo TM', 'visivel', null),
  (pg_temp.i(27), (select id from public.espacos where slug = 'banho'), pg_temp.i(14), 'Tópico T7', 'Corpo T7', 'visivel', null);

-- R1 Outro/T1; R2 Autor/T4; R3 Bloqueado/T1; R4 Outro/T1 (oculta); R5 Outro/T3; R6 Autor/T1 (removida);
-- R7 Autor/T1 (resposta à R1); R8 Sem aceite/T4.
insert into public.respostas (id, topico_id, autor_id, resposta_a, corpo, estado, motivo_moderacao) values
  (pg_temp.i(31), pg_temp.i(21), pg_temp.i(12), null, 'Resposta R1', 'visivel', null),
  (pg_temp.i(32), pg_temp.i(24), pg_temp.i(11), null, 'Resposta R2', 'visivel', null),
  (pg_temp.i(33), pg_temp.i(21), pg_temp.i(13), null, 'Resposta R3', 'visivel', null),
  (pg_temp.i(34), pg_temp.i(21), pg_temp.i(12), null, 'Resposta R4', 'oculto', 'oculta no teste'),
  (pg_temp.i(35), pg_temp.i(23), pg_temp.i(12), null, 'Resposta R5', 'visivel', null),
  (pg_temp.i(36), pg_temp.i(21), pg_temp.i(11), null, 'Resposta R6', 'removido', 'removida no teste'),
  (pg_temp.i(37), pg_temp.i(21), pg_temp.i(11), pg_temp.i(31), 'Resposta R7', 'visivel', null),
  (pg_temp.i(38), pg_temp.i(24), pg_temp.i(14), null, 'Resposta R8', 'visivel', null);

set local role authenticated;

-- A conta 5 é a "Sem perfil": aceite vigente e nenhum perfil. Ela só cria o perfil depois de todas as
-- recusas rotuladas "Sem perfil" (bloco de controle positivo mais abaixo). Pré-condição, afirmada antes de cada bloco.
select is(
  pg_temp.ler(5, 'select public.meu_perfil_id()::text'), null,
  'Sem perfil (antes dos perfis): meu_perfil_id() é NULL'
);

select is(
  pg_temp.ler(5, 'select public.aceite_vigente()::text'), 'true',
  'Sem perfil (antes dos perfis): há aceite vigente'
);

-- Perfis: insert (aceite vigente, conta própria), update (escritor habilitado), colunas e delete
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (5, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(2), 't_alheio_dois')$s$, 'ERRO:42501',
   'Sem perfil não cria perfil em nome de outra conta'),
  (8, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(8), 't_admin')$s$, 'ERRO:42501',
   'Admin sem aceite não cria perfil'),
  (6, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(6), 't_semconta')$s$, 'ERRO:42501',
   'Sem conta não cria perfil'),
  (4, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(4), 't_outroapelido')$s$, 'ERRO:42501',
   'Sem aceite não cria perfil'),
  (2, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(8), 't_alheio')$s$, 'ERRO:42501',
   'ninguém cria perfil em nome de outra conta'),
  (1, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(1), 't_autor_dois')$s$, 'ERRO:23505',
   'cada conta tem no máximo um perfil'),
  (1, $s$update public.perfis_publicos set bio = 'nova bio' where id = pg_temp.i(11)$s$, '1',
   'Autor altera o próprio perfil'),
  (2, $s$update public.perfis_publicos set bio = 'invadida' where id = pg_temp.i(11)$s$, '0',
   'Outro não altera o perfil do Autor (0 linhas)'),
  (3, $s$update public.perfis_publicos set bio = 'invadida' where id = pg_temp.i(11)$s$, '0',
   'Bloqueado não altera o perfil de quem o bloqueou (0 linhas)'),
  (4, $s$update public.perfis_publicos set bio = 'sem aceite' where id = pg_temp.i(14)$s$, '0',
   'Sem aceite não altera nem o próprio perfil (0 linhas)'),
  (5, $s$update public.perfis_publicos set bio = 'invadida' where id = pg_temp.i(11)$s$, '0',
   'Sem perfil não altera perfil alheio (0 linhas)'),
  (6, $s$update public.perfis_publicos set bio = 'invadida' where id = pg_temp.i(11)$s$, '0',
   'Sem conta não altera perfil (0 linhas)'),
  (8, $s$update public.perfis_publicos set bio = 'invadida' where id = pg_temp.i(11)$s$, '0',
   'Admin não altera perfil alheio (0 linhas)'),
  (7, $s$update public.perfis_publicos set bio = 'do moderador' where id = pg_temp.i(17)$s$, '1',
   'Moderador altera o próprio perfil como usuário comum'),
  (9, $s$update public.perfis_publicos set bio = 'do vencido' where id = pg_temp.i(19)$s$, '1',
   'Moderador vencido altera o próprio perfil como usuário comum'),
  (1, $s$update public.perfis_publicos set conta_id = pg_temp.i(2) where id = pg_temp.i(11)$s$, 'ERRO:42501',
   'conta_id do perfil não é alterável'),
  (1, $s$update public.perfis_publicos set apelido = 't_outro' where id = pg_temp.i(11)$s$, 'ERRO:23505',
   'apelido repetido é recusado'),
  (1, $s$delete from public.perfis_publicos where id = pg_temp.i(11)$s$, 'ERRO:42501',
   'Autor não apaga o perfil'),
  (7, $s$delete from public.perfis_publicos where id = pg_temp.i(11)$s$, 'ERRO:42501',
   'Moderador não apaga perfil')
) as v(n, sql, esperado, descricao);

reset role;

select is(
  (select bio from public.perfis_publicos where id = pg_temp.i(11)),
  'nova bio',
  'o perfil do Autor só mudou pela mão dele'
);

select is(
  (select bio from public.perfis_publicos where id = pg_temp.i(14)),
  null,
  'o perfil do Sem aceite segue intacto'
);

set local role authenticated;

-- Pré-condição da situação "Sem perfil": a conta 5 tem aceite vigente e não tem perfil próprio.
select is(
  pg_temp.ler(5, 'select public.meu_perfil_id()::text'), null,
  'Sem perfil (antes dos tópicos): meu_perfil_id() é NULL'
);

select is(
  pg_temp.ler(5, 'select public.aceite_vigente()::text'), 'true',
  'Sem perfil (antes dos tópicos): há aceite vigente'
);

-- Tópicos: insert
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, pg_temp.t('pg_temp.i(11)'), '1', 'Autor cria tópico'),
  (2, pg_temp.t('pg_temp.i(11)'), 'ERRO:42501', 'Outro não cria tópico em nome do Autor'),
  (4, pg_temp.t('pg_temp.i(14)'), 'ERRO:42501', 'Sem aceite não cria tópico'),
  (5, pg_temp.t('null'), 'ERRO:42501', 'Sem perfil não cria tópico (autor_id NULL, o que a conta tentaria de verdade)'),
  (5, pg_temp.t('pg_temp.i(12)'), 'ERRO:42501', 'Sem perfil não cria tópico com autor_id de outro perfil (tentativa de se passar pelo Outro)'),
  (6, pg_temp.t('pg_temp.i(12)'), 'ERRO:42501', 'Sem conta não cria tópico'),
  (3, pg_temp.t('pg_temp.i(13)'), '1', 'Bloqueado cria tópico'),
  (7, pg_temp.t('pg_temp.i(17)'), '1', 'Moderador cria tópico como usuário comum'),
  (8, pg_temp.t('null'), 'ERRO:42501', 'Admin sem perfil nem aceite não cria tópico'),
  (9, pg_temp.t('pg_temp.i(19)'), '1', 'Moderador vencido cria tópico como usuário comum'),
  (1, $s$insert into public.topicos (espaco_id, autor_id, titulo, corpo, faixa_etaria)
         values ((select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Com faixa', 'Corpo', '3_6_meses')$s$,
   '1', 'Autor cria tópico com a faixa do bebê'),
  (1, $s$insert into public.topicos (espaco_id, autor_id, titulo, corpo, estado)
         values ((select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Oculto', 'Corpo', 'oculto')$s$,
   'ERRO:42501', 'ninguém define estado ao criar tópico'),
  (1, $s$insert into public.topicos (espaco_id, autor_id, titulo, corpo, motivo_moderacao)
         values ((select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Motivo', 'Corpo', 'x')$s$,
   'ERRO:42501', 'ninguém define motivo de moderação ao criar tópico'),
  (1, $s$insert into public.topicos (espaco_id, autor_id, titulo, corpo)
         values (gen_random_uuid(), pg_temp.i(11), 'Sem espaço', 'Corpo')$s$,
   'ERRO:23503', 'tópico em espaço inexistente é recusado')
) as v(n, sql, esperado, descricao);

-- Tópicos: update e delete
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, $s$update public.topicos set titulo = 'Novo título' where id = pg_temp.i(21)$s$, '1', 'Autor edita o título do próprio tópico visível'),
  (1, $s$update public.topicos set titulo = 'Editado' where id = pg_temp.i(22)$s$, '0', 'Autor não edita o próprio tópico oculto (0 linhas)'),
  (1, $s$update public.topicos set titulo = 'Editado' where id = pg_temp.i(23)$s$, '0', 'Autor não edita o próprio tópico removido (0 linhas)'),
  (2, $s$update public.topicos set titulo = 'Invadido' where id = pg_temp.i(21)$s$, '0', 'Outro não edita tópico alheio (0 linhas)'),
  (4, $s$update public.topicos set titulo = 'Sem aceite' where id = pg_temp.i(27)$s$, '0', 'Sem aceite não edita nem o próprio tópico (0 linhas)'),
  (5, $s$update public.topicos set titulo = 'Invadido' where id = pg_temp.i(21)$s$, '0', 'Sem perfil não edita tópico (0 linhas)'),
  (6, $s$update public.topicos set titulo = 'Invadido' where id = pg_temp.i(21)$s$, '0', 'Sem conta não edita tópico (0 linhas)'),
  (3, $s$update public.topicos set titulo = 'Do bloqueado' where id = pg_temp.i(25)$s$, '1', 'Bloqueado edita o próprio tópico'),
  (7, $s$update public.topicos set corpo = 'Corpo novo' where id = pg_temp.i(26)$s$, '1', 'Moderador edita o próprio tópico como usuário comum'),
  (7, $s$update public.topicos set titulo = 'Invadido' where id = pg_temp.i(21)$s$, '0', 'Moderador não edita tópico alheio (0 linhas)'),
  (8, $s$update public.topicos set titulo = 'Invadido' where id = pg_temp.i(21)$s$, '0', 'Admin não edita tópico alheio (0 linhas)'),
  (9, $s$update public.topicos set titulo = 'Invadido' where id = pg_temp.i(21)$s$, '0', 'Moderador vencido não edita tópico alheio (0 linhas)'),
  (2, $s$update public.topicos set faixa_etaria = '0_3_meses' where id = pg_temp.i(24)$s$, '1', 'Outro edita a faixa do próprio tópico'),
  (1, $s$update public.topicos set estado = 'oculto' where id = pg_temp.i(21)$s$, 'ERRO:42501', 'autor não muda o estado do tópico'),
  (1, $s$update public.topicos set motivo_moderacao = 'x' where id = pg_temp.i(21)$s$, 'ERRO:42501', 'autor não muda o motivo de moderação'),
  (1, $s$update public.topicos set autor_id = pg_temp.i(12) where id = pg_temp.i(21)$s$, 'ERRO:42501', 'autor não troca o autor do tópico'),
  (1, $s$update public.topicos set espaco_id = gen_random_uuid() where id = pg_temp.i(21)$s$, 'ERRO:42501', 'autor não troca o espaço do tópico'),
  (7, $s$update public.topicos set estado = 'oculto' where id = pg_temp.i(21)$s$, 'ERRO:42501', 'Moderador não muda o estado do tópico por comando direto'),
  (7, $s$update public.topicos set motivo_moderacao = 'x' where id = pg_temp.i(21)$s$, 'ERRO:42501', 'Moderador não muda o motivo de moderação do tópico por comando direto'),
  (7, $s$update public.topicos set autor_id = pg_temp.i(12) where id = pg_temp.i(21)$s$, 'ERRO:42501', 'Moderador não troca o autor do tópico por comando direto'),
  (8, $s$update public.topicos set estado = 'oculto' where id = pg_temp.i(21)$s$, 'ERRO:42501', 'Admin não muda o estado do tópico por comando direto'),
  (8, $s$update public.topicos set motivo_moderacao = 'x' where id = pg_temp.i(21)$s$, 'ERRO:42501', 'Admin não muda o motivo de moderação do tópico por comando direto'),
  (8, $s$update public.topicos set autor_id = pg_temp.i(12) where id = pg_temp.i(21)$s$, 'ERRO:42501', 'Admin não troca o autor do tópico por comando direto'),
  (1, $s$delete from public.topicos where id = pg_temp.i(21)$s$, 'ERRO:42501', 'Autor não apaga tópico'),
  (7, $s$delete from public.topicos where id = pg_temp.i(21)$s$, 'ERRO:42501', 'Moderador não apaga tópico'),
  (8, $s$delete from public.topicos where id = pg_temp.i(21)$s$, 'ERRO:42501', 'Admin não apaga tópico')
) as v(n, sql, esperado, descricao);

reset role;

select isnt(
  (select editado_em from public.topicos where id = pg_temp.i(21)), null,
  'editar o título preenche editado_em'
);

select isnt(
  (select editado_em from public.topicos where id = pg_temp.i(24)), null,
  'mudar só a faixa preenche editado_em'
);

select isnt(
  (select editado_em from public.topicos where id = pg_temp.i(26)), null,
  'mudar só o corpo preenche editado_em'
);

select is(
  (select editado_em from public.topicos where id = pg_temp.i(22)), null,
  'tópico não editado segue com editado_em nulo'
);

select is(
  (select titulo || '/' || estado::text from public.topicos where id = pg_temp.i(23)),
  'Tópico T3/removido',
  'as tentativas negadas não mudaram o tópico removido'
);

set local role authenticated;

select is(
  pg_temp.ler(5, 'select public.meu_perfil_id()::text'), null,
  'Sem perfil (antes das respostas): meu_perfil_id() é NULL'
);

select is(
  pg_temp.ler(5, 'select public.aceite_vigente()::text'), 'true',
  'Sem perfil (antes das respostas): há aceite vigente'
);

-- Respostas: insert
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (2, pg_temp.r('pg_temp.i(12)', 21), '1', 'Outro responde tópico visível'),
  (3, pg_temp.r('pg_temp.i(13)', 21), 'ERRO:42501', 'Bloqueado não responde tópico de quem o bloqueou'),
  (1, pg_temp.r('pg_temp.i(11)', 25), 'ERRO:42501', 'Autor não responde tópico de quem bloqueou'),
  (2, pg_temp.r('pg_temp.i(12)', 22), 'ERRO:42501', 'ninguém responde tópico oculto'),
  (2, pg_temp.r('pg_temp.i(12)', 23), 'ERRO:42501', 'ninguém responde tópico removido'),
  (4, pg_temp.r('pg_temp.i(14)', 21), 'ERRO:42501', 'Sem aceite não responde'),
  (5, pg_temp.r('null', 21), 'ERRO:42501', 'Sem perfil não responde (autor_id NULL, o que a conta tentaria de verdade)'),
  (5, pg_temp.r('pg_temp.i(12)', 21), 'ERRO:42501', 'Sem perfil não responde com autor_id de outro perfil (tentativa de se passar pelo Outro)'),
  (6, pg_temp.r('pg_temp.i(12)', 21), 'ERRO:42501', 'Sem conta não responde'),
  (8, pg_temp.r('null', 21), 'ERRO:42501', 'Admin sem perfil nem aceite não responde'),
  (7, pg_temp.r('pg_temp.i(17)', 21), '1', 'Moderador responde como usuário comum'),
  (9, pg_temp.r('pg_temp.i(19)', 21), '1', 'Moderador vencido responde como usuário comum'),
  (2, pg_temp.r('pg_temp.i(12)', 99), 'ERRO:42501', 'resposta em tópico inexistente é recusada'),
  (2, pg_temp.r('pg_temp.i(11)', 21), 'ERRO:42501', 'Outro não responde em nome do Autor'),
  (2, pg_temp.r('pg_temp.i(12)', 21, 'pg_temp.i(34)'), 'ERRO:42501', 'não se responde a uma resposta oculta'),
  (1, pg_temp.r('pg_temp.i(11)', 21, 'pg_temp.i(33)'), 'ERRO:42501', 'não se responde a resposta de quem se bloqueou'),
  (2, pg_temp.r('pg_temp.i(12)', 21, 'pg_temp.i(31)'), '1', 'Outro responde a uma resposta de primeiro nível'),
  (2, pg_temp.r('pg_temp.i(12)', 21, 'pg_temp.i(37)'), 'ERRO:P0001:so um nivel de resposta',
   'resposta a uma resposta de segundo nível é recusada'),
  (2, pg_temp.r('pg_temp.i(12)', 21, 'pg_temp.i(32)'), 'ERRO:P0001:resposta de outro topico',
   'resposta-mãe de outro tópico é recusada'),
  -- A política vem antes do gatilho: quem ela nega recebe 42501, não a mensagem do gatilho
  (3, pg_temp.r('pg_temp.i(13)', 21, 'pg_temp.i(37)'), 'ERRO:42501',
   'Bloqueado, em tópico de quem o bloqueou, recebe 42501 (e não a mensagem do gatilho) ao responder a uma resposta de segundo nível'),
  (3, pg_temp.r('pg_temp.i(13)', 21, 'pg_temp.i(32)'), 'ERRO:42501',
   'Bloqueado, em tópico de quem o bloqueou, recebe 42501 (e não a mensagem do gatilho) com resposta-mãe de outro tópico'),
  (2, $s$insert into public.respostas (topico_id, autor_id, corpo, estado)
         values (pg_temp.i(21), pg_temp.i(12), 'Oculta', 'oculto')$s$, 'ERRO:42501', 'ninguém define estado ao criar resposta')
) as v(n, sql, esperado, descricao);

-- Respostas: update e delete
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, $s$update public.respostas set corpo = 'Editada' where id = pg_temp.i(32)$s$, '1', 'Autor edita a própria resposta visível'),
  (1, $s$update public.respostas set corpo = 'Editada' where id = pg_temp.i(36)$s$, '0', 'Autor não edita a própria resposta removida (0 linhas)'),
  (2, $s$update public.respostas set corpo = 'Editada' where id = pg_temp.i(34)$s$, '0', 'Outro não edita a própria resposta oculta (0 linhas)'),
  (2, $s$update public.respostas set corpo = 'Invadida' where id = pg_temp.i(32)$s$, '0', 'Outro não edita resposta alheia (0 linhas)'),
  (3, $s$update public.respostas set corpo = 'Editada' where id = pg_temp.i(33)$s$, '0', 'Bloqueado não edita a própria resposta num tópico que não lê (0 linhas)'),
  (4, $s$update public.respostas set corpo = 'Editada' where id = pg_temp.i(38)$s$, '0', 'Sem aceite não edita nem a própria resposta (0 linhas)'),
  (5, $s$update public.respostas set corpo = 'Invadida' where id = pg_temp.i(32)$s$, '0', 'Sem perfil não edita resposta (0 linhas)'),
  (6, $s$update public.respostas set corpo = 'Invadida' where id = pg_temp.i(32)$s$, '0', 'Sem conta não edita resposta (0 linhas)'),
  (7, $s$update public.respostas set corpo = 'Invadida' where id = pg_temp.i(31)$s$, '0', 'Moderador não edita resposta alheia (0 linhas)'),
  (8, $s$update public.respostas set corpo = 'Invadida' where id = pg_temp.i(31)$s$, '0', 'Admin não edita resposta alheia (0 linhas)'),
  (1, $s$update public.respostas set estado = 'oculto' where id = pg_temp.i(32)$s$, 'ERRO:42501', 'autor não muda o estado da resposta'),
  (1, $s$update public.respostas set motivo_moderacao = 'x' where id = pg_temp.i(32)$s$, 'ERRO:42501', 'autor não muda o motivo de moderação da resposta'),
  (1, $s$update public.respostas set topico_id = pg_temp.i(24) where id = pg_temp.i(32)$s$, 'ERRO:42501', 'autor não muda o tópico da resposta'),
  (1, $s$update public.respostas set autor_id = pg_temp.i(12) where id = pg_temp.i(32)$s$, 'ERRO:42501', 'autor não troca o autor da resposta'),
  (7, $s$update public.respostas set estado = 'oculto' where id = pg_temp.i(32)$s$, 'ERRO:42501', 'Moderador não muda o estado da resposta por comando direto'),
  (7, $s$update public.respostas set motivo_moderacao = 'x' where id = pg_temp.i(32)$s$, 'ERRO:42501', 'Moderador não muda o motivo de moderação da resposta por comando direto'),
  (7, $s$update public.respostas set autor_id = pg_temp.i(12) where id = pg_temp.i(32)$s$, 'ERRO:42501', 'Moderador não troca o autor da resposta por comando direto'),
  (8, $s$update public.respostas set estado = 'oculto' where id = pg_temp.i(32)$s$, 'ERRO:42501', 'Admin não muda o estado da resposta por comando direto'),
  (8, $s$update public.respostas set motivo_moderacao = 'x' where id = pg_temp.i(32)$s$, 'ERRO:42501', 'Admin não muda o motivo de moderação da resposta por comando direto'),
  (8, $s$update public.respostas set autor_id = pg_temp.i(12) where id = pg_temp.i(32)$s$, 'ERRO:42501', 'Admin não troca o autor da resposta por comando direto'),
  (1, $s$delete from public.respostas where id = pg_temp.i(32)$s$, 'ERRO:42501', 'Autor não apaga resposta'),
  (7, $s$delete from public.respostas where id = pg_temp.i(32)$s$, 'ERRO:42501', 'Moderador não apaga resposta'),
  (8, $s$delete from public.respostas where id = pg_temp.i(32)$s$, 'ERRO:42501', 'Admin não apaga resposta')
) as v(n, sql, esperado, descricao);

reset role;

select isnt(
  (select editado_em from public.respostas where id = pg_temp.i(32)), null,
  'editar o corpo da resposta preenche editado_em'
);

select is(
  (select corpo from public.respostas where id = pg_temp.i(34)),
  'Resposta R4',
  'as tentativas negadas não mudaram a resposta oculta'
);

-- Controle positivo: só agora a conta 5 cria o perfil. Com ele, publica e responde. Isso prova que as recusas
-- anteriores, rotuladas "Sem perfil", eram pela falta de perfil.
set local role authenticated;

select is(
  pg_temp.exec(5, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(5), 't_semperfil')$s$),
  '1',
  'Sem perfil (com aceite) cria o próprio perfil'
);

select is(
  pg_temp.ler(5, 'select (public.meu_perfil_id() is not null)::text'), 'true',
  'depois de criar o perfil, a conta 5 passa a ter meu_perfil_id()'
);

select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (5, pg_temp.t('public.meu_perfil_id()'), '1', 'com perfil, a conta 5 cria tópico'),
  (5, pg_temp.r('public.meu_perfil_id()', 21), '1', 'com perfil, a conta 5 responde ao T1')
) as v(n, sql, esperado, descricao);

reset role;

-- [removido] (D11), pelo caminho real: apagar o perfil do autor (on delete set null em autor_id).
-- O Removível (conta 10, perfil 20) tem o tópico 41 (visível, com editado_em), o tópico 42 (oculto, com motivo),
-- a resposta 43 (visível, no 41), a resposta 44 (oculta, com motivo, no T4 do Outro); o Outro (perfil 12)
-- tem a resposta 45 no tópico 41.
insert into auth.users (id, email) values (pg_temp.i(10), 'c047-removivel@exemplo.invalid');
insert into public.contas (id, nome_privado) values (pg_temp.i(10), 'Removível');
insert into public.aceites_termos (conta_id, versao) values (pg_temp.i(10), '2026-11-05');
insert into public.perfis_publicos (id, conta_id, apelido) values (pg_temp.i(20), pg_temp.i(10), 't_removivel');

insert into public.topicos (id, espaco_id, autor_id, titulo, corpo, estado, motivo_moderacao, editado_em) values
  (pg_temp.i(41), (select id from public.espacos where slug = 'sono'), pg_temp.i(20),
   'Título do removível', 'Corpo do removível', 'visivel', null, '2026-01-02 03:04:05+00'),
  (pg_temp.i(42), (select id from public.espacos where slug = 'sono'), pg_temp.i(20),
   'Título oculto do removível', 'Corpo oculto do removível', 'oculto', 'oculto para o teste', null);

insert into public.respostas (id, topico_id, autor_id, corpo, estado, motivo_moderacao, editado_em) values
  (pg_temp.i(43), pg_temp.i(41), pg_temp.i(20), 'Resposta do removível', 'visivel', null, '2026-01-03 04:05:06+00'),
  (pg_temp.i(44), pg_temp.i(24), pg_temp.i(20), 'Resposta oculta do removível', 'oculto', 'oculta para o teste', null),
  (pg_temp.i(45), pg_temp.i(41), pg_temp.i(12), 'Resposta de outra pessoa', 'visivel', null, null);

delete from public.perfis_publicos where id = pg_temp.i(20);

select is(
  (select count(*)::int from public.topicos where id in (pg_temp.i(41), pg_temp.i(42)) and autor_id is null)
  + (select count(*)::int from public.respostas where id in (pg_temp.i(43), pg_temp.i(44)) and autor_id is null),
  4,
  'apagar o perfil deixa autor_id nulo nos 2 tópicos e nas 2 respostas do autor'
);

select is(
  (select titulo || '|' || corpo || '|' || estado::text || '|' || coalesce(motivo_moderacao, '-') || '|'
          || (editado_em = '2026-01-02 03:04:05+00'::timestamptz)::text
     from public.topicos where id = pg_temp.i(41)),
  '[removido]|[removido]|visivel|-|true',
  'tópico visível: título e corpo viram [removido]; estado, motivo e editado_em não mudam'
);

select is(
  (select titulo || '|' || corpo || '|' || estado::text || '|' || coalesce(motivo_moderacao, '-') || '|'
          || (editado_em is null)::text
     from public.topicos where id = pg_temp.i(42)),
  '[removido]|[removido]|oculto|oculto para o teste|true',
  'tópico oculto: título e corpo viram [removido]; estado e motivo ficam como estavam, editado_em segue nulo'
);

select is(
  (select corpo || '|' || estado::text || '|' || coalesce(motivo_moderacao, '-') || '|'
          || (editado_em = '2026-01-03 04:05:06+00'::timestamptz)::text
     from public.respostas where id = pg_temp.i(43)),
  '[removido]|visivel|-|true',
  'resposta visível: corpo vira [removido]; estado, motivo e editado_em não mudam'
);

select is(
  (select corpo || '|' || estado::text || '|' || coalesce(motivo_moderacao, '-') || '|'
          || (editado_em is null)::text
     from public.respostas where id = pg_temp.i(44)),
  '[removido]|oculto|oculta para o teste|true',
  'resposta oculta: corpo vira [removido]; estado e motivo ficam como estavam, editado_em segue nulo'
);

select is(
  (select corpo || '|' || (autor_id = pg_temp.i(12))::text || '|' || estado::text || '|'
          || coalesce(motivo_moderacao, '-') || '|' || (editado_em is null)::text
     from public.respostas where id = pg_temp.i(45)),
  'Resposta de outra pessoa|true|visivel|-|true',
  'a resposta de outra pessoa, no tópico do autor removido, segue intacta'
);

set local role authenticated;

select is(
  pg_temp.ler(v.n, v.sql), v.esperado, v.descricao
) from (values
  (2, $q$select count(*) from public.topicos where id = pg_temp.i(41)$q$, '1',
   'conta habilitada lê o tópico visível de autor removido'),
  (3, $q$select count(*) from public.topicos where id = pg_temp.i(41)$q$, '1',
   'Bloqueado também lê o tópico de autor removido (não há bloqueio com quem não existe mais)'),
  (6, $q$select count(*) from public.topicos where id = pg_temp.i(41)$q$, '0',
   'conta sem linha em contas não lê o tópico de autor removido'),
  (2, $q$select count(*) from public.respostas where id = pg_temp.i(43)$q$, '1',
   'conta habilitada lê a resposta visível de autor removido'),
  (2, $q$select count(*) from public.respostas where id = pg_temp.i(45)$q$, '1',
   'conta habilitada lê a resposta de outra pessoa no tópico de autor removido'),
  (2, $q$select count(*) from public.topicos where id = pg_temp.i(42)$q$, '0',
   'o tópico oculto de autor removido não é lido por conta comum'),
  (7, $q$select count(*) from public.topicos where id = pg_temp.i(42)$q$, '1',
   'a moderação lê o tópico oculto de autor removido')
) as v(n, sql, esperado, descricao);

reset role;

-- Sem versão vigente ninguém escreve (D8): as escritas diretas são negadas pela política
update public.versoes_termos set vigente = false where vigente;

set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, pg_temp.t('pg_temp.i(11)'), 'ERRO:42501', 'sem versão vigente, ninguém cria tópico'),
  (2, pg_temp.r('pg_temp.i(12)', 21), 'ERRO:42501', 'sem versão vigente, ninguém responde'),
  (1, $s$update public.topicos set titulo = 'Sem termos' where id = pg_temp.i(21)$s$, '0',
   'sem versão vigente, ninguém edita tópico (0 linhas)'),
  (1, $s$update public.perfis_publicos set bio = 'sem termos' where id = pg_temp.i(11)$s$, '0',
   'sem versão vigente, ninguém edita o perfil (0 linhas)')
) as v(n, sql, esperado, descricao);

reset role;

select * from finish();
rollback;
