-- MAT-45, migração 3: tabela de convites (D1 a D3, D21).
-- O banco guarda só o hash do código. O uso único vem da troca pendente → aceito, feita com a
-- linha travada. Vencido é calculado na hora, por isso o enum não tem "expirado".

create type public.estado_convite as enum ('pendente', 'aceito', 'revogado');

create table public.convites (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias (id) on delete cascade,
  papel public.papel_familia not null,
  vinculo_valido_ate timestamptz,
  criado_por uuid references public.contas (id) on delete set null,
  codigo_hash text not null unique,
  expira_em timestamptz not null,
  estado public.estado_convite not null default 'pendente',
  aceito_por uuid references public.contas (id) on delete set null,
  aceito_em timestamptz,
  criado_em timestamptz not null default now(),
  check ((estado = 'aceito') = (aceito_em is not null))
);

create index convites_familia_id_idx on public.convites (familia_id);
create index convites_criado_por_idx on public.convites (criado_por);
create index convites_aceito_por_idx on public.convites (aceito_por);

alter table public.convites enable row level security;

-- Nenhum insert, update ou delete direto: tudo passa pelas funções. O hash nunca sai por select.
revoke all on table public.convites from anon, authenticated;

grant select (
  id, familia_id, papel, vinculo_valido_ate, criado_por, expira_em, estado,
  aceito_por, aceito_em, criado_em
) on public.convites to authenticated;

-- Só responsável ativo da família vê os convites. Cuidador e observador não.
create policy convites_select on public.convites
  for select to authenticated
  using (public.tem_vinculo_ativo(familia_id, array['responsavel']::public.papel_familia[]));
