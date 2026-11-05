begin;
create extension if not exists pgtap with schema extensions;

select plan(2);

-- Tabela nova de public sem RLS reprova este teste sozinha.
select is(
  (
    select count(*)::int
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ),
  0,
  'toda tabela de public tem RLS ligada'
);

select is(
  (
    select count(*)::int
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('contas', 'familias', 'vinculos', 'bebes')
      and c.relrowsecurity
  ),
  4,
  'contas, familias, vinculos e bebes existem com RLS ligada'
);

select * from finish();
rollback;
