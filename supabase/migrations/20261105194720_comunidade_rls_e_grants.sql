-- MAT-47: RLS, grants por coluna e políticas das dez tabelas da comunidade.
-- RLS ligada sem force, como na MAT-43: o dono das tabelas (papel das migrações) fica fora dela,
-- e as funções security definer dependem disso para ler as tabelas sem recursão.

alter table public.perfis_publicos enable row level security;
alter table public.versoes_termos enable row level security;
alter table public.aceites_termos enable row level security;
alter table public.espacos enable row level security;
alter table public.topicos enable row level security;
alter table public.respostas enable row level security;
alter table public.denuncias enable row level security;
alter table public.bloqueios enable row level security;
alter table public.papeis_plataforma enable row level security;
alter table public.auditoria_moderacao enable row level security;

-- O Supabase local concede tudo a anon e authenticated em tabelas novas de public
-- (default privileges); o revoke explícito vence esses grants. O service_role fica fora.
revoke all on table
  public.perfis_publicos, public.versoes_termos, public.aceites_termos, public.espacos,
  public.topicos, public.respostas, public.denuncias, public.bloqueios,
  public.papeis_plataforma, public.auditoria_moderacao
  from anon, authenticated;

-- perfis_publicos: nunca conta_id no select (o perfil público não revela a conta).
grant select (id, apelido, bio, faixa_bebe, criado_em) on public.perfis_publicos to authenticated;
grant insert (conta_id, apelido, bio, faixa_bebe) on public.perfis_publicos to authenticated;
grant update (apelido, bio, faixa_bebe) on public.perfis_publicos to authenticated;

grant select on public.versoes_termos to authenticated;
grant select on public.aceites_termos to authenticated;
grant select on public.espacos to authenticated;

-- topicos e respostas: estado e motivo_moderacao só mudam pelas funções de moderação.
grant select on public.topicos to authenticated;
grant insert (espaco_id, autor_id, titulo, corpo, faixa_etaria) on public.topicos to authenticated;
grant update (titulo, corpo, faixa_etaria) on public.topicos to authenticated;

grant select on public.respostas to authenticated;
grant insert (topico_id, autor_id, resposta_a, corpo) on public.respostas to authenticated;
grant update (corpo) on public.respostas to authenticated;

-- denuncias: nunca denunciante_id nem decidida_por (D17). Só nasce por denunciar.
grant select (id, topico_id, resposta_id, perfil_id, motivo, texto, estado, decidida_em, criada_em)
  on public.denuncias to authenticated;

grant select on public.bloqueios to authenticated;
grant insert (bloqueador_id, bloqueado_id) on public.bloqueios to authenticated;
grant delete on public.bloqueios to authenticated;

grant select on public.papeis_plataforma to authenticated;
grant select on public.auditoria_moderacao to authenticated;

-- perfis_publicos
create policy perfis_publicos_select on public.perfis_publicos
  for select to authenticated
  using (public.pode_ler_perfil(id));

create policy perfis_publicos_insert on public.perfis_publicos
  for insert to authenticated
  with check (conta_id = (select auth.uid()) and public.aceite_vigente());

create policy perfis_publicos_update on public.perfis_publicos
  for update to authenticated
  using (conta_id = (select auth.uid()) and public.escritor_habilitado())
  with check (conta_id = (select auth.uid()) and public.escritor_habilitado());

-- tabelas de consulta: toda conta lê
create policy versoes_termos_select on public.versoes_termos
  for select to authenticated
  using (true);

create policy aceites_termos_select on public.aceites_termos
  for select to authenticated
  using (conta_id = (select auth.uid()));

create policy espacos_select on public.espacos
  for select to authenticated
  using (true);

-- topicos
create policy topicos_select on public.topicos
  for select to authenticated
  using (public.pode_ler_topico(id));

create policy topicos_insert on public.topicos
  for insert to authenticated
  with check (
    autor_id = (select public.meu_perfil_id())
    and public.escritor_habilitado()
  );

create policy topicos_update on public.topicos
  for update to authenticated
  using (
    autor_id = (select public.meu_perfil_id())
    and estado = 'visivel'
    and public.escritor_habilitado()
  )
  with check (
    autor_id = (select public.meu_perfil_id())
    and estado = 'visivel'
    and public.escritor_habilitado()
  );

-- respostas
create policy respostas_select on public.respostas
  for select to authenticated
  using (public.pode_ler_resposta(id));

create policy respostas_insert on public.respostas
  for insert to authenticated
  with check (
    autor_id = (select public.meu_perfil_id())
    and public.escritor_habilitado()
    and public.pode_responder(topico_id, resposta_a)
  );

create policy respostas_update on public.respostas
  for update to authenticated
  using (
    autor_id = (select public.meu_perfil_id())
    and estado = 'visivel'
    and public.pode_ler_resposta(id)
    and public.escritor_habilitado()
  )
  with check (
    autor_id = (select public.meu_perfil_id())
    and estado = 'visivel'
    and public.pode_ler_resposta(id)
    and public.escritor_habilitado()
  );

-- denuncias: só a moderação lê
create policy denuncias_select on public.denuncias
  for select to authenticated
  using (public.tem_papel_plataforma(array['moderador', 'admin']::public.papel_plataforma[]));

-- bloqueios: quem bloqueou vê, cria e remove; o bloqueado não vê a linha nem é avisado
create policy bloqueios_select on public.bloqueios
  for select to authenticated
  using (bloqueador_id = (select public.meu_perfil_id()));

create policy bloqueios_insert on public.bloqueios
  for insert to authenticated
  with check (bloqueador_id = (select public.meu_perfil_id()));

create policy bloqueios_delete on public.bloqueios
  for delete to authenticated
  using (bloqueador_id = (select public.meu_perfil_id()));

-- papeis_plataforma: cada conta vê os próprios; o admin vê todos
create policy papeis_plataforma_select on public.papeis_plataforma
  for select to authenticated
  using (
    conta_id = (select auth.uid())
    or public.tem_papel_plataforma(array['admin']::public.papel_plataforma[])
  );

-- auditoria_moderacao: só a moderação lê
create policy auditoria_moderacao_select on public.auditoria_moderacao
  for select to authenticated
  using (public.tem_papel_plataforma(array['moderador', 'admin']::public.papel_plataforma[]));
