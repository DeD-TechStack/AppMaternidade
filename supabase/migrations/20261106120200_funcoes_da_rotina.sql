-- MAT-46: funções da rotina (ROT-05). O cliente só escreve por elas (DR-11).
-- Ordem das conferências em toda função: existência e vínculo (P0002), papel (42501),
-- bebê arquivado (P0001), estado do registro ou da nota (P0001).
--
-- Trava e rollback: create function não trava tabela. Rollback: drop function de cada uma.

-- Auxiliar: responsável ativo altera qualquer item; cuidador ativo, só o que ele mesmo criou.
-- Autor nulo (conta removida, DR-19) não é de ninguém.
create function public.pode_alterar_item(familia uuid, autor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.tem_vinculo_ativo(familia, array['responsavel']::public.papel_familia[])
    or (
      public.tem_vinculo_ativo(familia, array['cuidador']::public.papel_familia[])
      and autor is not null
      and autor = (select auth.uid())
    );
$$;

revoke execute on function public.pode_alterar_item(uuid, uuid) from public, anon;
grant execute on function public.pode_alterar_item(uuid, uuid) to authenticated;

create function public.gravar_registro(
  id_registro uuid,
  id_bebe uuid,
  tipo public.tipo_registro,
  inicio timestamptz,
  fuso text,
  deslocamento_min int,
  fim timestamptz default null,
  detalhes jsonb default '{}',
  nota text default null,
  origem public.origem_registro default 'ao_vivo'
)
returns public.registros
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite timestamptz := now() + interval '5 minutes';
  v_linha public.registros;
  v_bebe public.bebes;
begin
  -- Reenvio (C6): id que já existe. A linha é travada antes das conferências, como nas outras
  -- funções de escrita, para que dois envios simultâneos do mesmo id sigam em fila.
  select r.* into v_linha from public.registros r
  where r.id = gravar_registro.id_registro for update;
  if found then
    if public.tem_vinculo_ativo(v_linha.familia_id, enum_range(null::public.papel_familia)) then
      return v_linha;
    end if;
    raise exception 'registro inexistente' using errcode = 'P0002';
  end if;

  select b.* into v_bebe from public.bebes b where b.id = gravar_registro.id_bebe;
  if not found
     or not public.tem_vinculo_ativo(v_bebe.familia_id, enum_range(null::public.papel_familia)) then
    raise exception 'bebe inexistente' using errcode = 'P0002';
  end if;

  if not public.tem_vinculo_ativo(v_bebe.familia_id, array['responsavel', 'cuidador']::public.papel_familia[]) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if v_bebe.estado = 'arquivado' then
    raise exception 'bebe arquivado';
  end if;

  if gravar_registro.inicio > v_limite or gravar_registro.fim > v_limite then
    raise exception 'horario no futuro' using errcode = '23514';
  end if;

  insert into public.registros (
    id, familia_id, bebe_id, tipo, inicio, fim, detalhes, nota, origem,
    fuso, deslocamento_min, criado_por
  )
  values (
    gravar_registro.id_registro, v_bebe.familia_id, v_bebe.id, gravar_registro.tipo,
    gravar_registro.inicio, gravar_registro.fim,
    coalesce(gravar_registro.detalhes, '{}'::jsonb), gravar_registro.nota,
    coalesce(gravar_registro.origem, 'ao_vivo'),
    gravar_registro.fuso, gravar_registro.deslocamento_min, auth.uid()
  )
  on conflict (id) do nothing;

  -- Gravação simultânea com o mesmo id pode ter ganho a corrida: segue os passos de reenvio.
  select r.* into v_linha from public.registros r where r.id = gravar_registro.id_registro;
  if not public.tem_vinculo_ativo(v_linha.familia_id, enum_range(null::public.papel_familia)) then
    raise exception 'registro inexistente' using errcode = 'P0002';
  end if;

  return v_linha;
end;
$$;

revoke execute on function public.gravar_registro(
  uuid, uuid, public.tipo_registro, timestamptz, text, int, timestamptz, jsonb, text, public.origem_registro
) from public, anon;
grant execute on function public.gravar_registro(
  uuid, uuid, public.tipo_registro, timestamptz, text, int, timestamptz, jsonb, text, public.origem_registro
) to authenticated;

create function public.editar_registro(
  id_registro uuid,
  inicio timestamptz,
  fim timestamptz,
  detalhes jsonb,
  nota text,
  fuso text,
  deslocamento_min int
)
returns public.registros
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite timestamptz := now() + interval '5 minutes';
  v_linha public.registros;
begin
  select r.* into v_linha from public.registros r
  where r.id = editar_registro.id_registro for update;
  if not found
     or not public.tem_vinculo_ativo(v_linha.familia_id, enum_range(null::public.papel_familia)) then
    raise exception 'registro inexistente' using errcode = 'P0002';
  end if;

  if not public.pode_alterar_item(v_linha.familia_id, v_linha.criado_por) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if exists (select 1 from public.bebes b where b.id = v_linha.bebe_id and b.estado = 'arquivado') then
    raise exception 'bebe arquivado';
  end if;

  if v_linha.excluido_em is not null then
    raise exception 'registro excluido';
  end if;

  if editar_registro.inicio > v_limite or editar_registro.fim > v_limite then
    raise exception 'horario no futuro' using errcode = '23514';
  end if;

  if v_linha.fim is not null and editar_registro.fim is null then
    raise exception 'sessao encerrada';
  end if;

  update public.registros r
  set inicio = editar_registro.inicio,
      fim = editar_registro.fim,
      detalhes = editar_registro.detalhes,
      nota = editar_registro.nota,
      fuso = editar_registro.fuso,
      deslocamento_min = editar_registro.deslocamento_min
  where r.id = editar_registro.id_registro
  returning r.* into v_linha;

  return v_linha;
end;
$$;

revoke execute on function public.editar_registro(uuid, timestamptz, timestamptz, jsonb, text, text, int)
  from public, anon;
grant execute on function public.editar_registro(uuid, timestamptz, timestamptz, jsonb, text, text, int)
  to authenticated;

create function public.encerrar_sessao(id_registro uuid, momento timestamptz default now())
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_momento timestamptz := coalesce(encerrar_sessao.momento, now());
  v_linha public.registros;
begin
  select r.* into v_linha from public.registros r
  where r.id = encerrar_sessao.id_registro for update;
  if not found
     or not public.tem_vinculo_ativo(v_linha.familia_id, enum_range(null::public.papel_familia)) then
    raise exception 'registro inexistente' using errcode = 'P0002';
  end if;

  if not public.tem_vinculo_ativo(v_linha.familia_id, array['responsavel', 'cuidador']::public.papel_familia[]) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if exists (select 1 from public.bebes b where b.id = v_linha.bebe_id and b.estado = 'arquivado') then
    raise exception 'bebe arquivado';
  end if;

  if v_linha.excluido_em is not null then
    raise exception 'registro excluido';
  end if;

  if v_linha.tipo not in ('sono', 'mamada', 'tummy') then
    raise exception 'nao e sessao';
  end if;

  -- Vale o primeiro encerramento (Offline 7.2).
  if v_linha.fim is not null then
    return v_linha.fim;
  end if;

  if v_momento > now() + interval '5 minutes' then
    raise exception 'horario no futuro' using errcode = '23514';
  end if;

  update public.registros r set fim = v_momento where r.id = encerrar_sessao.id_registro;

  return v_momento;
end;
$$;

revoke execute on function public.encerrar_sessao(uuid, timestamptz) from public, anon;
grant execute on function public.encerrar_sessao(uuid, timestamptz) to authenticated;

create function public.excluir_registro(id_registro uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linha public.registros;
begin
  select r.* into v_linha from public.registros r
  where r.id = excluir_registro.id_registro for update;
  if not found
     or not public.tem_vinculo_ativo(v_linha.familia_id, enum_range(null::public.papel_familia)) then
    raise exception 'registro inexistente' using errcode = 'P0002';
  end if;

  if not public.pode_alterar_item(v_linha.familia_id, v_linha.criado_por) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if exists (select 1 from public.bebes b where b.id = v_linha.bebe_id and b.estado = 'arquivado') then
    raise exception 'bebe arquivado';
  end if;

  -- Reenvio: já excluído, nada muda.
  if v_linha.excluido_em is not null then
    return;
  end if;

  update public.registros r set excluido_em = now() where r.id = excluir_registro.id_registro;
end;
$$;

revoke execute on function public.excluir_registro(uuid) from public, anon;
grant execute on function public.excluir_registro(uuid) to authenticated;

create function public.restaurar_registro(id_registro uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linha public.registros;
begin
  select r.* into v_linha from public.registros r
  where r.id = restaurar_registro.id_registro for update;
  if not found
     or not public.tem_vinculo_ativo(v_linha.familia_id, enum_range(null::public.papel_familia)) then
    raise exception 'registro inexistente' using errcode = 'P0002';
  end if;

  if not public.pode_alterar_item(v_linha.familia_id, v_linha.criado_por) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if exists (select 1 from public.bebes b where b.id = v_linha.bebe_id and b.estado = 'arquivado') then
    raise exception 'bebe arquivado';
  end if;

  if v_linha.excluido_em is null then
    return;
  end if;

  -- DR-08: 30 dias contados de excluido_em.
  if now() - v_linha.excluido_em > interval '30 days' then
    raise exception 'prazo de restauracao encerrado';
  end if;

  update public.registros r set excluido_em = null where r.id = restaurar_registro.id_registro;
end;
$$;

revoke execute on function public.restaurar_registro(uuid) from public, anon;
grant execute on function public.restaurar_registro(uuid) to authenticated;

-- Roda com a RLS de quem chama: bebê de outra família ou sem vínculo ativo dá 0 linhas.
create function public.registros_do_dia(id_bebe uuid, dia date)
returns setof public.registros
language sql
stable
security invoker
set search_path = ''
as $$
  select r.*
  from public.registros r
  join public.familias f on f.id = r.familia_id
  where r.bebe_id = registros_do_dia.id_bebe
    and r.excluido_em is null
    and (r.inicio at time zone f.fuso)::date = registros_do_dia.dia
  order by r.inicio, r.id;
$$;

revoke execute on function public.registros_do_dia(uuid, date) from public, anon;
grant execute on function public.registros_do_dia(uuid, date) to authenticated;

create function public.gravar_nota(
  id_nota uuid,
  id_familia uuid,
  texto text,
  id_bebe uuid default null,
  destaque_ate timestamptz default null
)
returns public.notas_cuidado
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nota public.notas_cuidado;
begin
  -- Reenvio (C6): a linha existente é travada antes das conferências.
  select n.* into v_nota from public.notas_cuidado n
  where n.id = gravar_nota.id_nota for update;
  if found then
    if public.tem_vinculo_ativo(v_nota.familia_id, enum_range(null::public.papel_familia)) then
      return v_nota;
    end if;
    raise exception 'nota inexistente' using errcode = 'P0002';
  end if;

  if not public.tem_vinculo_ativo(gravar_nota.id_familia, enum_range(null::public.papel_familia)) then
    raise exception 'familia inexistente' using errcode = 'P0002';
  end if;

  if gravar_nota.id_bebe is not null
     and not exists (
       select 1 from public.bebes b
       where b.id = gravar_nota.id_bebe and b.familia_id = gravar_nota.id_familia
     ) then
    raise exception 'bebe inexistente' using errcode = 'P0002';
  end if;

  if not public.tem_vinculo_ativo(gravar_nota.id_familia, array['responsavel', 'cuidador']::public.papel_familia[]) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.bebes b
    where b.id = gravar_nota.id_bebe and b.estado = 'arquivado'
  ) then
    raise exception 'bebe arquivado';
  end if;

  insert into public.notas_cuidado (id, familia_id, bebe_id, texto, destaque_ate, criado_por)
  values (
    gravar_nota.id_nota, gravar_nota.id_familia, gravar_nota.id_bebe,
    gravar_nota.texto, gravar_nota.destaque_ate, auth.uid()
  )
  on conflict (id) do nothing;

  select n.* into v_nota from public.notas_cuidado n where n.id = gravar_nota.id_nota;
  if not public.tem_vinculo_ativo(v_nota.familia_id, enum_range(null::public.papel_familia)) then
    raise exception 'nota inexistente' using errcode = 'P0002';
  end if;

  return v_nota;
end;
$$;

revoke execute on function public.gravar_nota(uuid, uuid, text, uuid, timestamptz) from public, anon;
grant execute on function public.gravar_nota(uuid, uuid, text, uuid, timestamptz) to authenticated;

create function public.editar_nota(id_nota uuid, texto text, destaque_ate timestamptz)
returns public.notas_cuidado
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nota public.notas_cuidado;
begin
  select n.* into v_nota from public.notas_cuidado n
  where n.id = editar_nota.id_nota for update;
  if not found
     or not public.tem_vinculo_ativo(v_nota.familia_id, enum_range(null::public.papel_familia)) then
    raise exception 'nota inexistente' using errcode = 'P0002';
  end if;

  if not public.pode_alterar_item(v_nota.familia_id, v_nota.criado_por) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if exists (select 1 from public.bebes b where b.id = v_nota.bebe_id and b.estado = 'arquivado') then
    raise exception 'bebe arquivado';
  end if;

  if v_nota.excluida_em is not null then
    raise exception 'nota excluida';
  end if;

  update public.notas_cuidado n
  set texto = editar_nota.texto, destaque_ate = editar_nota.destaque_ate
  where n.id = editar_nota.id_nota
  returning n.* into v_nota;

  return v_nota;
end;
$$;

revoke execute on function public.editar_nota(uuid, text, timestamptz) from public, anon;
grant execute on function public.editar_nota(uuid, text, timestamptz) to authenticated;

create function public.excluir_nota(id_nota uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nota public.notas_cuidado;
begin
  select n.* into v_nota from public.notas_cuidado n
  where n.id = excluir_nota.id_nota for update;
  if not found
     or not public.tem_vinculo_ativo(v_nota.familia_id, enum_range(null::public.papel_familia)) then
    raise exception 'nota inexistente' using errcode = 'P0002';
  end if;

  if not public.pode_alterar_item(v_nota.familia_id, v_nota.criado_por) then
    raise exception 'sem permissao' using errcode = '42501';
  end if;

  if exists (select 1 from public.bebes b where b.id = v_nota.bebe_id and b.estado = 'arquivado') then
    raise exception 'bebe arquivado';
  end if;

  if v_nota.excluida_em is not null then
    return;
  end if;

  update public.notas_cuidado n set excluida_em = now() where n.id = excluir_nota.id_nota;
end;
$$;

revoke execute on function public.excluir_nota(uuid) from public, anon;
grant execute on function public.excluir_nota(uuid) to authenticated;
