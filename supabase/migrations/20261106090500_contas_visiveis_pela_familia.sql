-- MAT-45, migração 6: leitura do nome privado pelos membros da família (D7).
-- Uma conta lê a linha de contas de outra quando as duas têm vínculo ativo numa mesma família.
-- Ex-membros não são lidos e não leem. A relação não é transitiva.

-- Contas com vínculo ativo em alguma família onde auth.uid() também tem vínculo ativo.
-- Conta sem família: vazio. Inclui a própria conta quando ela tem família.
create function public.contas_visiveis()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct o.conta_id
  from public.vinculos m
  join public.vinculos o on o.familia_id = m.familia_id
  where m.conta_id = (select auth.uid())
    and m.estado = 'ativo'
    and (m.valido_ate is null or m.valido_ate > now())
    and o.estado = 'ativo'
    and (o.valido_ate is null or o.valido_ate > now());
$$;

revoke execute on function public.contas_visiveis() from public, anon;
grant execute on function public.contas_visiveis() to authenticated;

-- Insert e update de contas não mudam: cada pessoa só altera a própria linha.
drop policy contas_select on public.contas;

create policy contas_select on public.contas
  for select to authenticated
  using (
    id = (select auth.uid())
    or id in (select public.contas_visiveis())
  );
