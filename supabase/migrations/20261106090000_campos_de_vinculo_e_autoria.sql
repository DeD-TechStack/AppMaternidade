-- MAT-45, migração 1: campos de vínculo e autoria (D11, C1, D20).
-- Toda coluna de autoria aponta para contas(id) com on delete set null; assim a exclusão de conta
-- não precisa conhecer quem escreveu o quê. Nenhuma restrição nova liga estado a encerrado_em
-- nem papel a validade: os testes da MAT-43 inserem linhas que a violariam (D4).
--
-- Plano das etapas (tabelas pequenas no banco local; em produção, cada etapa abaixo):
--   add column nula sem default: lock ACCESS EXCLUSIVE só no catálogo, instantâneo.
--     Reversão: drop column.
--   drop not null: lock ACCESS EXCLUSIVE no catálogo, instantâneo. Reversão: set not null (exige
--     que nenhuma linha tenha criado_por nulo).
--   troca da chave estrangeira: valida a tabela inteira com lock SHARE ROW EXCLUSIVE. Reversão:
--     recriar a chave com on delete restrict.

alter table public.vinculos
  add column concedido_por uuid references public.contas (id) on delete set null,
  add column encerrado_em timestamptz;

alter table public.bebes
  alter column criado_por drop not null;

alter table public.bebes
  drop constraint bebes_criado_por_fkey;

alter table public.bebes
  add constraint bebes_criado_por_fkey
  foreign key (criado_por) references public.contas (id) on delete set null;

-- Índices dos lados das chaves de autoria: o set null da exclusão de conta procura por eles.
create index vinculos_concedido_por_idx on public.vinculos (concedido_por);
create index bebes_criado_por_idx on public.bebes (criado_por);
