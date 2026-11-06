begin;
create extension if not exists pgtap with schema extensions;

select plan(50);

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('c0470000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

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

create function pg_temp.tenta(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return 'ERRO:' || sqlstate;
end;
$$;

-- insert de tópico; p_autor é uma expressão SQL
create function pg_temp.t(p_autor text) returns text language sql as $$
  select format($f$insert into public.topicos (espaco_id, autor_id, titulo, corpo)
    values ((select id from public.espacos where slug = 'sono'), %s, 'Titulo novo', 'Corpo novo')$f$, p_autor)
$$;

-- Autor (1) e Outro (2): aceite e perfil. Sem aceite (4): conta e perfil. Sem perfil (5): conta e aceite.
-- Sem conta (6): só em auth.users. Admin (8): conta, sem aceite e sem perfil.
insert into auth.users (id, email) values
  (pg_temp.i(1), 'c047-autor@exemplo.invalid'),
  (pg_temp.i(2), 'c047-outro@exemplo.invalid'),
  (pg_temp.i(4), 'c047-semaceite@exemplo.invalid'),
  (pg_temp.i(5), 'c047-semperfil@exemplo.invalid'),
  (pg_temp.i(6), 'c047-semconta@exemplo.invalid'),
  (pg_temp.i(8), 'c047-admin@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  (pg_temp.i(1), 'Autor'), (pg_temp.i(2), 'Outro'), (pg_temp.i(4), 'Sem aceite'),
  (pg_temp.i(5), 'Sem perfil'), (pg_temp.i(8), 'Admin');

insert into public.aceites_termos (conta_id, versao) values
  (pg_temp.i(1), '2026-11-05'), (pg_temp.i(2), '2026-11-05'), (pg_temp.i(5), '2026-11-05');

insert into public.perfis_publicos (id, conta_id, apelido) values
  (pg_temp.i(11), pg_temp.i(1), 't_autor'), (pg_temp.i(12), pg_temp.i(2), 't_outro'),
  (pg_temp.i(14), pg_temp.i(4), 't_semaceite');

insert into public.topicos (id, espaco_id, autor_id, titulo, corpo) values
  (pg_temp.i(21), (select id from public.espacos where slug = 'sono'), pg_temp.i(11), 'Tópico T1', 'Corpo T1'),
  (pg_temp.i(24), (select id from public.espacos where slug = 'banho'), pg_temp.i(12), 'Tópico T4', 'Corpo T4');

-- Uma versão antiga, já fora de vigência.
insert into public.versoes_termos (versao, vigente) values ('2026-01-01', false);

set local role authenticated;

-- aceitar_termos: erros na ordem do catálogo
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (6, $s$select public.aceitar_termos('2026-11-05')$s$, 'ERRO:P0001:sem conta', 'sem linha em contas não aceita'),
  (4, $s$select public.aceitar_termos(null)$s$, 'ERRO:P0001:parametro obrigatorio', 'versão nula é recusada'),
  (4, $s$select public.aceitar_termos('1999-01-01')$s$, 'ERRO:P0001:versao nao vigente', 'versão inexistente é recusada'),
  (4, $s$select public.aceitar_termos('2026-01-01')$s$, 'ERRO:P0001:versao nao vigente', 'versão antiga, que existe mas não vigora, é recusada')
) as v(n, sql, esperado, descricao);

reset role;
update public.versoes_termos set vigente = false where vigente;
set local role authenticated;

select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (6, $s$select public.aceitar_termos('2026-11-05')$s$, 'ERRO:P0001:sem conta', 'sem versão vigente, sem conta ainda dá sem conta'),
  (4, $s$select public.aceitar_termos('2026-11-05')$s$, 'ERRO:P0001:termos indisponiveis', 'sem versão vigente, ninguém aceita'),
  (1, pg_temp.t('pg_temp.i(11)'), 'ERRO:42501', 'sem versão vigente, nem quem aceitou antes escreve')
) as v(n, sql, esperado, descricao);

reset role;
update public.versoes_termos set vigente = true where versao = '2026-11-05';
set local role authenticated;

-- aceitar_termos: acertos. O aceite vem antes da primeira publicação.
select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (4, pg_temp.t('pg_temp.i(14)'), 'ERRO:42501', 'sem aceite não publica'),
  (4, $s$select public.aceitar_termos('2026-11-05')$s$, '1', 'sem aceite aceita a versão vigente'),
  (4, pg_temp.t('pg_temp.i(14)'), '1', 'depois do aceite, quem tem perfil publica'),
  (4, $s$select public.aceitar_termos('2026-11-05')$s$, '1', 'aceitar de novo a mesma versão não dá erro'),
  (5, $s$select public.aceitar_termos('2026-11-05')$s$, '1', 'quem já aceitou aceita de novo sem erro'),
  (8, $s$select public.aceitar_termos('2026-11-05')$s$, '1', 'Admin aceita a versão vigente'),
  (8, pg_temp.t('null'), 'ERRO:42501', 'aceitar não basta: sem perfil não publica'),
  (8, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(8), 't_admin')$s$, '1',
   'com o aceite, o Admin cria o próprio perfil'),
  (8, pg_temp.t('public.meu_perfil_id()'), '1',
   'com aceite e perfil, o Admin publica como usuário comum')
) as v(n, sql, esperado, descricao);

reset role;

select is(
  (select count(*)::int from public.aceites_termos where conta_id = pg_temp.i(4)),
  1,
  'aceitar duas vezes a mesma versão não duplica a linha'
);

select is(
  (select count(*)::int from public.aceites_termos where conta_id = pg_temp.i(6)),
  0,
  'a conta sem linha em contas não gravou aceite'
);

set local role authenticated;

-- Aceite e versões só pela função
select is(
  pg_temp.exec(v.n, v.sql), 'ERRO:42501', v.descricao
) from (values
  (1, $s$insert into public.aceites_termos (conta_id, versao) values (pg_temp.i(1), '2026-01-01')$s$,
   'ninguém grava aceite direto'),
  (2, $s$insert into public.aceites_termos (conta_id, versao) values (pg_temp.i(1), '2026-11-05')$s$,
   'ninguém grava aceite em nome de outra conta'),
  (1, $s$update public.aceites_termos set aceito_em = now() where conta_id = pg_temp.i(1)$s$,
   'ninguém altera aceite'),
  (1, $s$delete from public.aceites_termos where conta_id = pg_temp.i(1)$s$,
   'ninguém apaga aceite'),
  (1, $s$insert into public.versoes_termos (versao, vigente) values ('2027-01-01', false)$s$,
   'o site não publica versão dos termos'),
  (1, $s$update public.versoes_termos set vigente = false where versao = '2026-11-05'$s$,
   'o site não muda a versão vigente'),
  (1, $s$delete from public.versoes_termos where versao = '2026-01-01'$s$,
   'o site não apaga versão dos termos'),
  (1, $s$insert into public.espacos (slug, nome, ordem) values ('novo', 'Novo', 99)$s$,
   'o site não cria espaço'),
  (1, $s$update public.espacos set nome = 'Outro nome' where slug = 'sono'$s$,
   'o site não altera espaço'),
  (1, $s$delete from public.espacos where slug = 'sono'$s$,
   'o site não apaga espaço')
) as v(n, sql, descricao);

-- Publicar uma versão nova é do time (migração ou seed): quem aceitou a antiga continua lendo e não escreve
reset role;
update public.versoes_termos set vigente = false where vigente;
insert into public.versoes_termos (versao, vigente) values ('2026-12-01', true);
set local role authenticated;

select is(
  pg_temp.ler(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, 'select public.aceite_vigente()::text', 'false', 'com a versão nova, o aceite antigo não vale'),
  (1, 'select public.escritor_habilitado()::text', 'false', 'com a versão nova, o Autor deixa de ser escritor habilitado'),
  (1, $q$select count(*) from public.topicos where id = pg_temp.i(21)$q$, '1', 'quem não aceitou a versão nova continua lendo'),
  (1, $q$select count(*) from public.perfis_publicos where id = pg_temp.i(12)$q$, '1', 'e continua lendo os perfis')
) as v(n, sql, esperado, descricao);

select is(
  pg_temp.exec(v.n, v.sql), v.esperado, v.descricao
) from (values
  (1, pg_temp.t('pg_temp.i(11)'), 'ERRO:42501', 'sem aceitar a versão nova, não cria tópico'),
  (1, $s$update public.topicos set titulo = 'Editado' where id = pg_temp.i(21)$s$, '0',
   'sem aceitar a versão nova, não edita nem o que já publicou (0 linhas)'),
  (1, $s$update public.perfis_publicos set bio = 'nova' where id = pg_temp.i(11)$s$, '0',
   'sem aceitar a versão nova, não edita o perfil (0 linhas)'),
  (1, $s$insert into public.respostas (topico_id, autor_id, corpo)
         values (pg_temp.i(24), pg_temp.i(11), 'Resposta sem aceite')$s$, 'ERRO:42501',
   'sem aceitar a versão nova, não responde'),
  (1, $s$select public.denunciar(p_motivo => 'outro', p_topico_id => pg_temp.i(24))$s$, 'ERRO:P0001:sem aceite',
   'sem aceitar a versão nova, não denuncia'),
  (1, $s$insert into public.bloqueios (bloqueador_id, bloqueado_id) values (pg_temp.i(11), pg_temp.i(12))$s$, '1',
   'sem aceitar a versão nova, ainda se protege bloqueando (D7)'),
  (1, $s$select public.aceitar_termos('2026-11-05')$s$, 'ERRO:P0001:versao nao vigente',
   'a versão antiga não é mais aceitável'),
  (5, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(5), 't_semperfil')$s$, 'ERRO:42501',
   'com aceite antigo, não se cria perfil'),
  (5, $s$select public.aceitar_termos('2026-12-01')$s$, '1', 'Sem perfil aceita a versão nova'),
  (5, $s$insert into public.perfis_publicos (conta_id, apelido) values (pg_temp.i(5), 't_semperfil')$s$, '1',
   'com a versão nova aceita, cria o perfil'),
  (1, $s$select public.aceitar_termos('2026-12-01')$s$, '1', 'o Autor aceita a versão nova'),
  (1, pg_temp.t('pg_temp.i(11)'), '1', 'depois de aceitar, o Autor volta a criar tópico'),
  (1, $s$update public.topicos set titulo = 'Editado' where id = pg_temp.i(21)$s$, '1',
   'depois de aceitar, o Autor volta a editar o que publicou'),
  (1, $s$update public.perfis_publicos set bio = 'nova' where id = pg_temp.i(11)$s$, '1',
   'depois de aceitar, o Autor volta a editar o perfil')
) as v(n, sql, esperado, descricao);

reset role;

select is(
  (select count(*)::int from public.aceites_termos where conta_id = pg_temp.i(1)),
  2,
  'o aceite antigo fica guardado ao lado do novo'
);

-- Unicidade da versão vigente e proteção das versões já aceitas
select is(
  pg_temp.tenta($s$insert into public.versoes_termos (versao, vigente) values ('2027-01-01', true)$s$),
  'ERRO:23505',
  'não pode haver duas versões vigentes'
);

select is(
  pg_temp.tenta($s$update public.versoes_termos set vigente = true where versao = '2026-11-05'$s$),
  'ERRO:23505',
  'reativar uma versão antiga com outra vigente também é recusado'
);

select is(
  pg_temp.tenta($s$delete from public.versoes_termos where versao = '2026-11-05'$s$),
  'ERRO:23503',
  'uma versão já aceita não pode ser apagada'
);

select * from finish();
rollback;
