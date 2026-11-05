begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@exemplo.invalid');

insert into public.contas (id, nome_privado) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'A');

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001');

insert into public.vinculos (id, familia_id, conta_id, papel) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel');

insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em) values
  ('c0000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000001', encode(extensions.digest(repeat('a1', 32), 'sha256'), 'hex'),
   now() + interval '7 days');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

-- A tabela convites.
select throws_ok($$select * from public.convites$$, '42501', null, 'anon não lê convites');
select throws_ok(
  $$insert into public.convites (familia_id, papel, codigo_hash, expira_em)
    values ('ffffffff-0000-4000-8000-000000000001', 'observador', 'hash-anon', now() + interval '7 days')$$,
  '42501', null, 'anon não insere em convites'
);
select throws_ok($$update public.convites set estado = 'revogado'$$, '42501', null, 'anon não altera convites');
select throws_ok($$delete from public.convites$$, '42501', null, 'anon não apaga convites');

-- As 11 funções novas.
select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  '42501', null, 'anon não executa criar_convite'
);
select throws_ok($$select public.ver_convite(repeat('a1', 32))$$, '42501', null, 'anon não executa ver_convite');
select throws_ok($$select public.aceitar_convite(repeat('a1', 32))$$, '42501', null, 'anon não executa aceitar_convite');
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon não executa revogar_convite'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000001', 'cuidador')$$,
  '42501', null, 'anon não executa mudar_papel'
);
select throws_ok(
  $$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon não executa revogar_vinculo'
);
select throws_ok(
  $$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon não executa sair_da_familia'
);
select throws_ok($$select public.contas_visiveis()$$, '42501', null, 'anon não executa contas_visiveis');
select throws_ok($$select public.exportar_dados()$$, '42501', null, 'anon não executa exportar_dados');
select throws_ok($$select public.excluir_conta()$$, '42501', null, 'anon não executa excluir_conta');
select throws_ok(
  $$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon não executa excluir_familia'
);

reset role;

select is(
  (select count(*)::int from public.convites where estado = 'pendente'
     and id = 'c0000000-0000-4000-8000-000000000001')
  + (select count(*)::int from public.vinculos where id = 'bb000000-0000-4000-8000-000000000001' and epoca = 1)
  + (select count(*)::int from public.familias where id = 'ffffffff-0000-4000-8000-000000000001')
  + (select count(*)::int from public.contas where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  4,
  'as tentativas de anon não mudaram nada: convite, vínculo (época 1), família e conta intactos'
);

-- Meta-testes de catálogo: valem para todo o esquema public, sem as funções de extensão.
select is(
  (select count(*)::int
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
      and has_function_privilege('anon', p.oid, 'execute')),
  0,
  'nenhuma função de public é executável por anon'
);

select is(
  (select count(*)::int
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
      and p.proacl is null),
  0,
  'nenhuma função de public mantém o execute padrão de PUBLIC (todas têm ACL explícita)'
);

select is(
  (select count(*)::int
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
      and p.prosecdef
      and not coalesce(p.proconfig @> array['search_path=""'], false)),
  0,
  'toda função security definer de public tem search_path vazio em proconfig'
);

select is(
  (select count(*)::int
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  0,
  'nenhuma tabela de public está sem RLS'
);

select is(
  (select count(*)::int
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and (has_table_privilege('anon', c.oid, 'select') or has_any_column_privilege('anon', c.oid, 'select')
           or has_any_column_privilege('anon', c.oid, 'insert') or has_any_column_privilege('anon', c.oid, 'update')
           or has_table_privilege('anon', c.oid, 'delete'))),
  0,
  'anon não tem privilégio em nenhuma tabela de public'
);

select is(
  (select count(*)::int
     from pg_proc p
    where p.oid in (
      'public.criar_convite(uuid, public.papel_familia, timestamptz)'::regprocedure,
      'public.ver_convite(text)'::regprocedure,
      'public.aceitar_convite(text)'::regprocedure,
      'public.revogar_convite(uuid)'::regprocedure,
      'public.mudar_papel(uuid, public.papel_familia)'::regprocedure,
      'public.revogar_vinculo(uuid)'::regprocedure,
      'public.sair_da_familia(uuid)'::regprocedure,
      'public.contas_visiveis()'::regprocedure,
      'public.exportar_dados()'::regprocedure,
      'public.excluir_conta()'::regprocedure,
      'public.excluir_familia(uuid)'::regprocedure,
      'public.validar_fuso()'::regprocedure,
      'public.validar_nascimento()'::regprocedure
    )
    and p.prosecdef
    and p.proconfig @> array['search_path=""']
    and has_function_privilege('authenticated', p.oid, 'execute')
    and not has_function_privilege('anon', p.oid, 'execute')),
  13,
  'as 11 funções novas e as 2 de gatilho são security definer, com search_path vazio, executáveis só por authenticated'
);

select is(
  (select count(*)::int
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('criar_convite', 'ver_convite', 'aceitar_convite', 'revogar_convite',
            'mudar_papel', 'revogar_vinculo', 'sair_da_familia', 'exportar_dados', 'excluir_conta', 'excluir_familia',
            'contas_visiveis')),
  11,
  'existem exatamente as 11 funções novas, sem sobrecargas'
);

select is(
  (select count(*)::int
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('criar_convite', 'ver_convite', 'aceitar_convite', 'revogar_convite',
            'mudar_papel', 'revogar_vinculo', 'sair_da_familia', 'exportar_dados', 'excluir_conta', 'excluir_familia',
            'contas_visiveis')
      and exists (select 1 from unnest(coalesce(p.proargnames, array[]::text[])) a
                   where a in ('conta', 'chamador', 'usuario', 'user_id', 'auth_uid'))),
  0,
  'nenhuma função nova recebe a conta chamadora por parâmetro (a conta é sempre auth.uid())'
);

select * from finish();
rollback;
