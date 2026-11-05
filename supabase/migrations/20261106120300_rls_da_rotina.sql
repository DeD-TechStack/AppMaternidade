-- MAT-46: RLS, grants e políticas de select da rotina (ROT-06).
-- RLS ligada sem force, como na MAT-43: o dono das tabelas (papel das migrações) fica fora dela,
-- e as funções security definer da rotina dependem disso para gravar.
--
-- Trava e rollback: alter table enable row level security e create policy em tabelas novas;
-- sem efeito em tabela em uso. Rollback: drop policy, alter table ... disable row level security
-- e grant dos privilégios anteriores (o padrão do Supabase local concede tudo a anon e
-- authenticated).

alter table public.registros enable row level security;
alter table public.registro_alteracoes enable row level security;
alter table public.notas_cuidado enable row level security;

-- O Supabase local concede tudo a anon e authenticated em tabela nova de public; o revoke
-- explícito vence esses grants. O cliente só lê: toda escrita passa pelas funções (DR-11).
revoke all on table public.registros, public.registro_alteracoes, public.notas_cuidado
  from anon, authenticated;

grant select on public.registros, public.registro_alteracoes, public.notas_cuidado to authenticated;

-- Qualquer papel com vínculo ativo lê os registros, inclusive os excluídos (a fila offline e a
-- lixeira dependem da marca de exclusão).
create policy registros_select on public.registros
  for select to authenticated
  using (public.tem_vinculo_ativo(familia_id, enum_range(null::public.papel_familia)));

-- O observador não vê o histórico de alterações.
create policy registro_alteracoes_select on public.registro_alteracoes
  for select to authenticated
  using (public.tem_vinculo_ativo(familia_id, array['responsavel', 'cuidador']::public.papel_familia[]));

create policy notas_cuidado_select on public.notas_cuidado
  for select to authenticated
  using (public.tem_vinculo_ativo(familia_id, enum_range(null::public.papel_familia)));
