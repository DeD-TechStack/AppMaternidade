-- MAT-47: comunidade e moderação. Tipos, tabelas, checks, índices e linhas iniciais.
-- Funções, gatilhos, RLS e grants vêm nas migrações seguintes (194710, 194720 e 194730).
-- Nenhuma tabela daqui aponta para dado de cuidado: as únicas chaves para fora do grupo
-- vão para contas(id) (seis ao todo) e nenhuma é em cascata a partir de conteúdo de outra pessoa.

create type public.faixa_bebe as enum ('0_3_meses', '3_6_meses', '6_12_meses');
create type public.estado_moderacao as enum ('visivel', 'oculto', 'removido');
create type public.motivo_denuncia as enum (
  'ataque_assedio', 'saude_perigosa', 'conteudo_sexual', 'exposicao_crianca',
  'dados_pessoais', 'spam_venda', 'risco_autolesao', 'outro'
);
create type public.estado_denuncia as enum ('aberta', 'em_analise', 'procedente', 'improcedente');
create type public.papel_plataforma as enum ('moderador', 'admin');
create type public.alvo_conteudo as enum ('topico', 'resposta');
create type public.acao_moderacao as enum (
  'ocultar', 'remover', 'restaurar', 'decidir_denuncia', 'conceder_papel', 'revogar_papel'
);
create type public.alvo_auditoria as enum ('topico', 'resposta', 'denuncia', 'papel_plataforma');

-- Perfil público: apelido separado do nome privado da conta.
create table public.perfis_publicos (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas (id) on delete cascade,
  apelido text not null,
  bio text,
  faixa_bebe public.faixa_bebe,
  criado_em timestamptz not null default now(),
  constraint perfis_publicos_conta_unica unique (conta_id),
  constraint perfis_publicos_apelido_tamanho check (
    char_length(btrim(apelido)) >= 3
    and char_length(apelido) <= 30
    and btrim(apelido) = apelido
  ),
  constraint perfis_publicos_bio_tamanho check (
    bio is null or (char_length(btrim(bio)) >= 1 and char_length(bio) <= 160)
  )
);

create unique index perfis_publicos_apelido_idx on public.perfis_publicos (lower(apelido));

-- Versões dos termos: no máximo uma vigente (D8).
create table public.versoes_termos (
  versao text primary key,
  vigente boolean not null default false,
  publicada_em timestamptz not null default now()
);

create unique index versoes_termos_vigente_idx on public.versoes_termos ((true)) where vigente;

insert into public.versoes_termos (versao, vigente) values ('2026-11-05', true);

-- Aceites ficam em tabela própria para não alterar contas (D1).
create table public.aceites_termos (
  conta_id uuid not null references public.contas (id) on delete cascade,
  versao text not null references public.versoes_termos (versao) on delete restrict,
  aceito_em timestamptz not null default now(),
  primary key (conta_id, versao)
);

create index aceites_termos_versao_idx on public.aceites_termos (versao);

create table public.espacos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  ordem int not null unique
);

insert into public.espacos (slug, nome, ordem) values
  ('sono', 'Sono', 1),
  ('alimentacao', 'Alimentação', 2),
  ('banho', 'Banho', 3),
  ('tummy-time', 'Tummy time', 4),
  ('organizacao-da-rotina', 'Organização da rotina', 5),
  ('divisao-dos-cuidados', 'Divisão dos cuidados', 6),
  ('dificuldades-do-dia-a-dia', 'Dificuldades do dia a dia', 7);

-- Tópicos e respostas sobrevivem à exclusão da conta do autor: autor_id vira nulo (D11).
create table public.topicos (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid not null references public.espacos (id) on delete restrict,
  autor_id uuid references public.perfis_publicos (id) on delete set null,
  titulo text not null,
  corpo text not null,
  faixa_etaria public.faixa_bebe,
  estado public.estado_moderacao not null default 'visivel',
  motivo_moderacao text,
  criado_em timestamptz not null default now(),
  editado_em timestamptz,
  constraint topicos_titulo_tamanho check (char_length(btrim(titulo)) >= 3 and char_length(titulo) <= 120),
  constraint topicos_corpo_tamanho check (char_length(btrim(corpo)) >= 1 and char_length(corpo) <= 5000),
  constraint topicos_motivo_tamanho check (
    motivo_moderacao is null
    or (char_length(btrim(motivo_moderacao)) >= 1 and char_length(motivo_moderacao) <= 300)
  ),
  constraint topicos_motivo_estado check ((estado = 'visivel') = (motivo_moderacao is null))
);

create index topicos_espaco_id_idx on public.topicos (espaco_id);
create index topicos_autor_id_idx on public.topicos (autor_id);

create table public.respostas (
  id uuid primary key default gen_random_uuid(),
  topico_id uuid not null references public.topicos (id) on delete restrict,
  autor_id uuid references public.perfis_publicos (id) on delete set null,
  resposta_a uuid references public.respostas (id) on delete restrict,
  corpo text not null,
  estado public.estado_moderacao not null default 'visivel',
  motivo_moderacao text,
  criado_em timestamptz not null default now(),
  editado_em timestamptz,
  constraint respostas_corpo_tamanho check (char_length(btrim(corpo)) >= 1 and char_length(corpo) <= 2000),
  constraint respostas_motivo_tamanho check (
    motivo_moderacao is null
    or (char_length(btrim(motivo_moderacao)) >= 1 and char_length(motivo_moderacao) <= 300)
  ),
  constraint respostas_motivo_estado check ((estado = 'visivel') = (motivo_moderacao is null))
);

create index respostas_topico_id_idx on public.respostas (topico_id);
create index respostas_autor_id_idx on public.respostas (autor_id);
create index respostas_resposta_a_idx on public.respostas (resposta_a);

-- Denúncia: só nasce pela função denunciar. Relatórios de abuso são retidos (Pesquisa 8).
create table public.denuncias (
  id uuid primary key default gen_random_uuid(),
  denunciante_id uuid references public.contas (id) on delete set null,
  topico_id uuid references public.topicos (id) on delete restrict,
  resposta_id uuid references public.respostas (id) on delete restrict,
  perfil_id uuid references public.perfis_publicos (id) on delete set null,
  motivo public.motivo_denuncia not null,
  texto text,
  estado public.estado_denuncia not null default 'aberta',
  decidida_por uuid references public.contas (id) on delete set null,
  decidida_em timestamptz,
  criada_em timestamptz not null default now(),
  constraint denuncias_alvo_unico check (num_nonnulls(topico_id, resposta_id, perfil_id) <= 1),
  constraint denuncias_texto_tamanho check (
    texto is null or (char_length(btrim(texto)) >= 1 and char_length(texto) <= 500)
  ),
  constraint denuncias_decisao_data check (
    (decidida_em is not null) = (estado in ('procedente', 'improcedente'))
  )
);

create index denuncias_denunciante_id_idx on public.denuncias (denunciante_id);
create index denuncias_topico_id_idx on public.denuncias (topico_id);
create index denuncias_resposta_id_idx on public.denuncias (resposta_id);
create index denuncias_perfil_id_idx on public.denuncias (perfil_id);

create table public.bloqueios (
  bloqueador_id uuid not null references public.perfis_publicos (id) on delete cascade,
  bloqueado_id uuid not null references public.perfis_publicos (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id),
  constraint bloqueios_nao_a_si_mesmo check (bloqueador_id <> bloqueado_id)
);

create index bloqueios_bloqueado_id_idx on public.bloqueios (bloqueado_id);

-- Papéis de plataforma ficam fora das famílias (Modelo 5.2).
create table public.papeis_plataforma (
  conta_id uuid not null references public.contas (id) on delete cascade,
  papel public.papel_plataforma not null,
  concedido_por uuid references public.contas (id) on delete set null,
  concedido_em timestamptz not null default now(),
  valido_ate timestamptz,
  primary key (conta_id, papel)
);

create index papeis_plataforma_concedido_por_idx on public.papeis_plataforma (concedido_por);

-- Auditoria da moderação: sem chave estrangeira, para sobreviver ao conteúdo, à denúncia e à conta (D12).
create table public.auditoria_moderacao (
  id uuid primary key default gen_random_uuid(),
  ator_id uuid not null,
  acao public.acao_moderacao not null,
  alvo_tipo public.alvo_auditoria not null,
  alvo_id uuid not null,
  estado_anterior text,
  estado_novo text,
  motivo text not null,
  denuncia_id uuid,
  conteudo text,
  valido_ate timestamptz,
  criado_em timestamptz not null default now(),
  constraint auditoria_moderacao_motivo_tamanho check (
    char_length(btrim(motivo)) >= 1 and char_length(motivo) <= 300
  )
);
