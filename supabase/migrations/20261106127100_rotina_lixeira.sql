-- MAT-46, adendo R-B (46-N1): a lixeira só mostra o que ainda se restaura.
--
-- registros_na_lixeira(id_bebe) devolve os registros do bebê excluídos há menos de 30 dias (o prazo
-- de restauração, DR-08), do excluído mais recente ao mais antigo, com empate pelo id. Roda com a
-- RLS de quem chama: bebê de outra família, sem vínculo ativo ou inexistente dá 0 linhas. Qualquer
-- papel com vínculo ativo lê (a política de select de registros já é essa).
-- id_bebe nulo é 23502 "parametro obrigatorio" (R6).
--
-- Trava e rollback: create function não trava tabela. Rollback: drop function public.registros_na_lixeira(uuid).

create function public.registros_na_lixeira(id_bebe uuid)
returns setof public.registros
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if registros_na_lixeira.id_bebe is null then
    raise exception 'parametro obrigatorio' using errcode = '23502';
  end if;

  return query
    select r.*
    from public.registros r
    where r.bebe_id = registros_na_lixeira.id_bebe
      and r.excluido_em is not null
      and r.excluido_em > now() - interval '30 days'
    order by r.excluido_em desc, r.id;
end;
$$;

revoke execute on function public.registros_na_lixeira(uuid) from public, anon;
grant execute on function public.registros_na_lixeira(uuid) to authenticated;
