-- MAT-46, adendo R-B (R3 e R6): ordem das conferências e catálogo de erros das funções da rotina.
--
-- Ordem das conferências em toda função (R3):
--   1. parâmetro obrigatório nulo            -> 23502 "parametro obrigatorio" (antes de qualquer leitura);
--   2. existência e visibilidade             -> P0002 com a mensagem do catálogo (id sem visibilidade,
--      seja inexistente, de outra família ou sem vínculo ativo do chamador, responde igual);
--   3. permissão de escrita (papel)          -> 42501 "sem permissao";
--   4. regras de valor (horário no futuro, prazo, estado, checks da tabela).
-- Nenhuma validação de valor roda antes da visibilidade. A migração 20261106120200 já seguia 2 a 4;
-- o que muda aqui é o passo 1 e o tratamento de deadlock.
--
-- Catálogo (R6):
--   * 23502 "parametro obrigatorio": cada função confere os obrigatórios no começo. Opcionais seguem
--     aceitando nulo: fim e nota (gravar_registro, editar_registro); detalhes e origem (nulo vira '{}'
--     e 'ao_vivo'); momento (nulo vira now()); id_bebe e destaque_ate (notas).
--   * 40P01 "tente de novo": as 8 funções de escrita convertem deadlock_detected nele. Quem chama
--     repete a chamada inteira (todas são idempotentes pelo id, C6).
--   * Fuso inválido na família, numa função de leitura (registros_do_dia): o 22023 nativo do Postgres,
--     sem conversão.
--
-- Edições: vale a última gravação (46-M1). A trava `for update` da linha só serializa as chamadas;
-- quem chega depois sobrescreve e a versão sobe a cada edição. O "vale o primeiro" é só do
-- encerramento de sessão (encerrar_sessao), que é outra regra (Offline 7.2).
--
-- Trava e rollback: create or replace function troca só a linha da função no catálogo (sem trava em
-- tabela). Um bloco `exception` do plpgsql abre uma subtransação por chamada, custo desprezível aqui.
-- Rollback: create or replace com os corpos de 20261106120200_funcoes_da_rotina.sql (as assinaturas
-- não mudam, então grants e dependências seguem).

create or replace function public.gravar_registro(
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
  if gravar_registro.id_registro is null
     or gravar_registro.id_bebe is null
     or gravar_registro.tipo is null
     or gravar_registro.inicio is null
     or gravar_registro.fuso is null
     or gravar_registro.deslocamento_min is null then
    raise exception 'parametro obrigatorio' using errcode = '23502';
  end if;

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
exception
  when deadlock_detected then
    raise exception 'tente de novo' using errcode = '40P01';
end;
$$;

revoke execute on function public.gravar_registro(
  uuid, uuid, public.tipo_registro, timestamptz, text, int, timestamptz, jsonb, text, public.origem_registro
) from public, anon;
grant execute on function public.gravar_registro(
  uuid, uuid, public.tipo_registro, timestamptz, text, int, timestamptz, jsonb, text, public.origem_registro
) to authenticated;

create or replace function public.editar_registro(
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
  if editar_registro.id_registro is null
     or editar_registro.inicio is null
     or editar_registro.detalhes is null
     or editar_registro.fuso is null
     or editar_registro.deslocamento_min is null then
    raise exception 'parametro obrigatorio' using errcode = '23502';
  end if;

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

  -- Vale a última gravação: a trava acima só serializa; esta edição sobrescreve a anterior.
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
exception
  when deadlock_detected then
    raise exception 'tente de novo' using errcode = '40P01';
end;
$$;

revoke execute on function public.editar_registro(uuid, timestamptz, timestamptz, jsonb, text, text, int)
  from public, anon;
grant execute on function public.editar_registro(uuid, timestamptz, timestamptz, jsonb, text, text, int)
  to authenticated;

-- Encerrar não recebe texto (46-M7): "encerrar e anotar" são duas chamadas, encerrar_sessao e
-- gravar_nota. Quem encerra a sessão de outro não ganha o direito de editar o registro dele.
create or replace function public.encerrar_sessao(id_registro uuid, momento timestamptz default now())
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_momento timestamptz := coalesce(encerrar_sessao.momento, now());
  v_linha public.registros;
begin
  if encerrar_sessao.id_registro is null then
    raise exception 'parametro obrigatorio' using errcode = '23502';
  end if;

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

  -- Vale o primeiro encerramento (Offline 7.2). Só do encerramento: edições valem a última gravação.
  if v_linha.fim is not null then
    return v_linha.fim;
  end if;

  if v_momento > now() + interval '5 minutes' then
    raise exception 'horario no futuro' using errcode = '23514';
  end if;

  update public.registros r set fim = v_momento where r.id = encerrar_sessao.id_registro;

  return v_momento;
exception
  when deadlock_detected then
    raise exception 'tente de novo' using errcode = '40P01';
end;
$$;

revoke execute on function public.encerrar_sessao(uuid, timestamptz) from public, anon;
grant execute on function public.encerrar_sessao(uuid, timestamptz) to authenticated;

create or replace function public.excluir_registro(id_registro uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linha public.registros;
begin
  if excluir_registro.id_registro is null then
    raise exception 'parametro obrigatorio' using errcode = '23502';
  end if;

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
exception
  when deadlock_detected then
    raise exception 'tente de novo' using errcode = '40P01';
end;
$$;

revoke execute on function public.excluir_registro(uuid) from public, anon;
grant execute on function public.excluir_registro(uuid) to authenticated;

create or replace function public.restaurar_registro(id_registro uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linha public.registros;
begin
  if restaurar_registro.id_registro is null then
    raise exception 'parametro obrigatorio' using errcode = '23502';
  end if;

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
exception
  when deadlock_detected then
    raise exception 'tente de novo' using errcode = '40P01';
end;
$$;

revoke execute on function public.restaurar_registro(uuid) from public, anon;
grant execute on function public.restaurar_registro(uuid) to authenticated;

-- Leitura, com a RLS de quem chama: bebê de outra família ou sem vínculo ativo dá 0 linhas.
-- Vira plpgsql só para conferir os obrigatórios; segue stable, security invoker e search_path vazio.
-- Fuso inválido na família não é convertido: o `at time zone` responde o 22023 nativo.
create or replace function public.registros_do_dia(id_bebe uuid, dia date)
returns setof public.registros
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if registros_do_dia.id_bebe is null or registros_do_dia.dia is null then
    raise exception 'parametro obrigatorio' using errcode = '23502';
  end if;

  return query
    select r.*
    from public.registros r
    join public.familias f on f.id = r.familia_id
    where r.bebe_id = registros_do_dia.id_bebe
      and r.excluido_em is null
      and (r.inicio at time zone f.fuso)::date = registros_do_dia.dia
    order by r.inicio, r.id;
end;
$$;

revoke execute on function public.registros_do_dia(uuid, date) from public, anon;
grant execute on function public.registros_do_dia(uuid, date) to authenticated;

create or replace function public.gravar_nota(
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
  if gravar_nota.id_nota is null
     or gravar_nota.id_familia is null
     or gravar_nota.texto is null then
    raise exception 'parametro obrigatorio' using errcode = '23502';
  end if;

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
exception
  when deadlock_detected then
    raise exception 'tente de novo' using errcode = '40P01';
end;
$$;

revoke execute on function public.gravar_nota(uuid, uuid, text, uuid, timestamptz) from public, anon;
grant execute on function public.gravar_nota(uuid, uuid, text, uuid, timestamptz) to authenticated;

create or replace function public.editar_nota(id_nota uuid, texto text, destaque_ate timestamptz)
returns public.notas_cuidado
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nota public.notas_cuidado;
begin
  if editar_nota.id_nota is null or editar_nota.texto is null then
    raise exception 'parametro obrigatorio' using errcode = '23502';
  end if;

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

  -- Vale a última gravação, como em editar_registro.
  update public.notas_cuidado n
  set texto = editar_nota.texto, destaque_ate = editar_nota.destaque_ate
  where n.id = editar_nota.id_nota
  returning n.* into v_nota;

  return v_nota;
exception
  when deadlock_detected then
    raise exception 'tente de novo' using errcode = '40P01';
end;
$$;

revoke execute on function public.editar_nota(uuid, text, timestamptz) from public, anon;
grant execute on function public.editar_nota(uuid, text, timestamptz) to authenticated;

create or replace function public.excluir_nota(id_nota uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nota public.notas_cuidado;
begin
  if excluir_nota.id_nota is null then
    raise exception 'parametro obrigatorio' using errcode = '23502';
  end if;

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
exception
  when deadlock_detected then
    raise exception 'tente de novo' using errcode = '40P01';
end;
$$;

revoke execute on function public.excluir_nota(uuid) from public, anon;
grant execute on function public.excluir_nota(uuid) to authenticated;
