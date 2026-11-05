-- MAT-46: rotina do bebê. Enums, tabelas, validação dos detalhes e índices.
-- Modelo de Dados e Permissões 3.6; Offline, Sincronização e Temporizadores 4 a 9 e 12.
--
-- Trava e rollback desta migração (Postgres 17, tabelas novas e vazias):
--   * create type / create table / create index em tabela nova: sem trava em tabela existente.
--   * alter table public.bebes add constraint ... unique: ACCESS EXCLUSIVE em bebes durante a
--     construção do índice. Tabela pequena (base da MAT-43), trava de milissegundos.
--     Rollback: alter table public.bebes drop constraint bebes_id_familia_key (só depois de
--     derrubar as chaves estrangeiras compostas das duas tabelas novas).
--   * Rollback do resto: drop table notas_cuidado, registro_alteracoes, registros; drop function
--     detalhes_do_registro_validos; drop type operacao_registro, origem_registro, tipo_registro.

create type public.tipo_registro as enum (
  'sono', 'mamada', 'mamadeira', 'fralda', 'tummy', 'solido', 'observacao'
);
create type public.origem_registro as enum ('ao_vivo', 'retroativo');
create type public.operacao_registro as enum ('criacao', 'edicao', 'exclusao', 'restauracao');

-- DR-14: chave que permite a chave estrangeira composta (bebe_id, familia_id).
alter table public.bebes add constraint bebes_id_familia_key unique (id, familia_id);

-- DR-02 e DR-03: detalhes por tipo. Pura: sem acesso a tabela, só olha os dois argumentos.
-- Devolve sempre true ou false (nunca nulo), porque um check com resultado nulo passaria.
create function public.detalhes_do_registro_validos(tipo public.tipo_registro, detalhes jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    case
      when detalhes is null or jsonb_typeof(detalhes) <> 'object' then false
      when tipo in ('sono', 'tummy', 'observacao') then detalhes = '{}'::jsonb
      when tipo = 'mamada' then
        (detalhes - 'lado') = '{}'::jsonb
        and (
          (detalhes -> 'lado') is null
          or (detalhes -> 'lado') in ('"esquerdo"'::jsonb, '"direito"'::jsonb, '"ambos"'::jsonb)
        )
      when tipo = 'mamadeira' then
        ((detalhes - 'ml') - 'conteudo') = '{}'::jsonb
        and (
          (detalhes -> 'conteudo') is null
          or (detalhes -> 'conteudo') in ('"leite_materno"'::jsonb, '"formula"'::jsonb)
        )
        and case
          when (detalhes -> 'ml') is null then true
          when jsonb_typeof(detalhes -> 'ml') <> 'number' then false
          when (detalhes ->> 'ml') !~ '^[0-9]{1,3}$' then false
          else (detalhes ->> 'ml')::int between 1 and 500
        end
      when tipo = 'fralda' then
        (detalhes - 'conteudo') = '{}'::jsonb
        and (detalhes -> 'conteudo') in ('"xixi"'::jsonb, '"coco"'::jsonb, '"ambos"'::jsonb)
      when tipo = 'solido' then
        (detalhes - 'alimento') = '{}'::jsonb
        and case
          when (detalhes -> 'alimento') is null then true
          when jsonb_typeof(detalhes -> 'alimento') <> 'string' then false
          else char_length(detalhes ->> 'alimento') between 1 and 100
            and btrim(detalhes ->> 'alimento') <> ''
        end
      else false
    end,
    false
  );
$$;

revoke execute on function public.detalhes_do_registro_validos(public.tipo_registro, jsonb)
  from public, anon;

create table public.registros (
  id uuid primary key,
  familia_id uuid not null references public.familias (id) on delete cascade,
  bebe_id uuid not null,
  tipo public.tipo_registro not null,
  inicio timestamptz not null,
  fim timestamptz,
  detalhes jsonb not null default '{}',
  nota text,
  origem public.origem_registro not null default 'ao_vivo',
  fuso text not null,
  deslocamento_min int not null,
  criado_por uuid references public.contas (id) on delete set null,
  encerrado_por uuid references public.contas (id) on delete set null,
  versao int not null default 1,
  recebido_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz,
  excluido_por uuid references public.contas (id) on delete set null,
  foreign key (bebe_id, familia_id) references public.bebes (id, familia_id) on delete cascade,
  constraint registros_id_uuidv7_check check (
    substr(id::text, 15, 1) = '7' and substr(id::text, 20, 1) in ('8', '9', 'a', 'b')
  ),
  constraint registros_detalhes_check check (
    public.detalhes_do_registro_validos(tipo, detalhes)
  ),
  constraint registros_fim_check check (
    case
      when tipo in ('sono', 'mamada', 'tummy') then fim is null or fim >= inicio
      else fim is null
    end
  ),
  constraint registros_nota_check check (
    (nota is null or char_length(btrim(nota)) between 1 and 500)
    and (tipo <> 'observacao' or nota is not null)
  ),
  constraint registros_deslocamento_check check (deslocamento_min between -720 and 840)
);

create table public.registro_alteracoes (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references public.registros (id) on delete cascade,
  familia_id uuid not null references public.familias (id) on delete cascade,
  operacao public.operacao_registro not null,
  autor uuid references public.contas (id) on delete set null,
  antes jsonb,
  depois jsonb,
  versao int not null,
  recebida_em timestamptz not null default now()
);

create table public.notas_cuidado (
  id uuid primary key,
  familia_id uuid not null references public.familias (id) on delete cascade,
  bebe_id uuid,
  texto text not null,
  destaque_ate timestamptz,
  criado_por uuid references public.contas (id) on delete set null,
  criada_em timestamptz not null default now(),
  versao int not null default 1,
  atualizado_em timestamptz not null default now(),
  excluida_em timestamptz,
  excluida_por uuid references public.contas (id) on delete set null,
  foreign key (bebe_id, familia_id) references public.bebes (id, familia_id) on delete cascade,
  constraint notas_cuidado_id_uuidv7_check check (
    substr(id::text, 15, 1) = '7' and substr(id::text, 20, 1) in ('8', '9', 'a', 'b')
  ),
  constraint notas_cuidado_texto_check check (char_length(btrim(texto)) between 1 and 500)
);

create index registros_bebe_id_inicio_idx on public.registros (bebe_id, inicio);
create index registros_familia_id_atualizado_em_idx on public.registros (familia_id, atualizado_em);
create index registro_alteracoes_registro_id_idx on public.registro_alteracoes (registro_id);
create index notas_cuidado_familia_id_atualizado_em_idx
  on public.notas_cuidado (familia_id, atualizado_em);
