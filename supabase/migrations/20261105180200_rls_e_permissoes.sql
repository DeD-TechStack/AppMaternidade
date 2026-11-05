-- RLS, permissões por coluna e políticas das quatro tabelas.
-- RLS ligada sem force: os donos das tabelas (papel das migrações) ficam fora dela, e as
-- funções security definer dependem disso para ler vinculos sem recursão.

alter table public.contas enable row level security;
alter table public.familias enable row level security;
alter table public.vinculos enable row level security;
alter table public.bebes enable row level security;

-- O Supabase local concede tudo a anon e authenticated em tabelas novas de public
-- (default privileges); o revoke explícito vence esses grants.
revoke all on table public.contas, public.familias, public.vinculos, public.bebes
  from anon, authenticated;

grant select on public.contas, public.familias, public.vinculos, public.bebes to authenticated;

grant insert (id, nome_privado, fuso) on public.contas to authenticated;
grant update (nome_privado, fuso) on public.contas to authenticated;

grant update (nome, fuso) on public.familias to authenticated;

grant insert (familia_id, nome, nascimento, criado_por) on public.bebes to authenticated;
grant update (nome, nascimento, estado) on public.bebes to authenticated;

-- contas: cada pessoa vê e altera só a própria linha.
create policy contas_select on public.contas
  for select to authenticated
  using (id = (select auth.uid()));

create policy contas_insert on public.contas
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy contas_update on public.contas
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- familias: lê quem tem vínculo ativo; edita só responsável ativo. Criação é por criar_familia.
create policy familias_select on public.familias
  for select to authenticated
  using (public.tem_vinculo_ativo(id, enum_range(null::public.papel_familia)));

create policy familias_update on public.familias
  for update to authenticated
  using (public.tem_vinculo_ativo(id, array['responsavel']::public.papel_familia[]))
  with check (public.tem_vinculo_ativo(id, array['responsavel']::public.papel_familia[]));

-- vinculos: só leitura para quem tem vínculo ativo na família.
create policy vinculos_select on public.vinculos
  for select to authenticated
  using (public.tem_vinculo_ativo(familia_id, enum_range(null::public.papel_familia)));

-- bebes: lê quem tem vínculo ativo; cria e edita só responsável ativo.
create policy bebes_select on public.bebes
  for select to authenticated
  using (public.tem_vinculo_ativo(familia_id, enum_range(null::public.papel_familia)));

create policy bebes_insert on public.bebes
  for insert to authenticated
  with check (
    public.tem_vinculo_ativo(familia_id, array['responsavel']::public.papel_familia[])
    and criado_por = (select auth.uid())
  );

create policy bebes_update on public.bebes
  for update to authenticated
  using (public.tem_vinculo_ativo(familia_id, array['responsavel']::public.papel_familia[]))
  with check (public.tem_vinculo_ativo(familia_id, array['responsavel']::public.papel_familia[]));
