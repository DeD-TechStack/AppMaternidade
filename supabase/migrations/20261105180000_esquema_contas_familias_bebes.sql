-- Esquema mínimo de identidade e cuidado: contas, famílias, vínculos e bebês.
-- Modelo de Dados e Permissões, seções 3.1 e 3.2. RLS e permissões vêm na migração seguinte.

create type public.papel_familia as enum ('responsavel', 'cuidador', 'observador');
create type public.estado_vinculo as enum ('ativo', 'revogado', 'saiu');
create type public.estado_bebe as enum ('ativo', 'arquivado');

create table public.contas (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_privado text not null,
  fuso text not null default 'America/Sao_Paulo',
  criada_em timestamptz not null default now()
);

create table public.familias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  fuso text not null,
  criada_por uuid not null references public.contas (id) on delete restrict,
  criada_em timestamptz not null default now()
);

create table public.vinculos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias (id) on delete cascade,
  conta_id uuid not null references public.contas (id) on delete restrict,
  papel public.papel_familia not null,
  estado public.estado_vinculo not null default 'ativo',
  valido_ate timestamptz,
  epoca int not null default 1,
  criado_em timestamptz not null default now(),
  unique (familia_id, conta_id)
);

create table public.bebes (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias (id) on delete cascade,
  nome text not null,
  nascimento date not null,
  estado public.estado_bebe not null default 'ativo',
  criado_por uuid not null references public.contas (id) on delete restrict,
  criado_em timestamptz not null default now()
);

-- A chave única de vinculos já cobre familia_id; faltam os outros lados das consultas.
create index vinculos_conta_id_idx on public.vinculos (conta_id);
create index bebes_familia_id_idx on public.bebes (familia_id);
