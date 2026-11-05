-- MAT-46: campos do servidor, histórico de alterações e imutabilidade do histórico.
-- Invariante 6: versão, "recebido em", "atualizado em" e autoria confirmada são do servidor.
--
-- Trava e rollback: create function e create trigger em tabelas novas e vazias (a trava de
-- create trigger é SHARE ROW EXCLUSIVE, sem efeito em tabela sem uso). Rollback: drop trigger
-- nas três tabelas e drop function das funções desta migração.

-- Foto de uma linha: as 6 colunas editáveis de editar_registro. Pura e sem acesso a tabela.
create function public.registro_foto(r public.registros)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'inicio', r.inicio,
    'fim', r.fim,
    'detalhes', r.detalhes,
    'nota', r.nota,
    'fuso', r.fuso,
    'deslocamento_min', r.deslocamento_min
  );
$$;

revoke execute on function public.registro_foto(public.registros) from public, anon;

-- Gatilho before de registros: acerta os campos do servidor (ROT-03).
create function public.registros_campos_do_servidor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_edicao boolean;
  v_exclusao boolean;
  v_restauracao boolean;
begin
  if tg_op = 'INSERT' then
    new.versao := 1;
    new.recebido_em := now();
    new.atualizado_em := now();
    new.excluido_em := null;
    new.excluido_por := null;
    new.encerrado_por := case when new.fim is not null then new.criado_por else null end;
    return new;
  end if;

  -- 1. Sessão encerrada não reabre (DR-24).
  if old.fim is not null and new.fim is null then
    raise exception 'sessao encerrada';
  end if;

  v_edicao := public.registro_foto(old) is distinct from public.registro_foto(new);
  v_exclusao := old.excluido_em is null and new.excluido_em is not null;
  v_restauracao := old.excluido_em is not null and new.excluido_em is null;

  -- 8. Mudança que exige histórico precisa de autor.
  if (v_edicao or v_exclusao or v_restauracao) and v_conta is null then
    raise exception 'autor desconhecido';
  end if;

  -- 2, 4 e 5. A versão sobe 1 por edição e 1 por exclusão ou restauração.
  new.versao := old.versao
    + case when v_edicao then 1 else 0 end
    + case when v_exclusao or v_restauracao then 1 else 0 end;
  new.recebido_em := old.recebido_em;

  -- 3. Encerramento: quem preenche o fim pela primeira vez encerra.
  if old.fim is null and new.fim is not null then
    new.encerrado_por := v_conta;
  end if;

  if v_exclusao then
    new.excluido_em := now();
    new.excluido_por := v_conta;
  elsif v_restauracao then
    new.excluido_por := null;
  end if;

  -- 7. Qualquer mudança além de atualizado_em marca a sincronização (DR-16).
  if (to_jsonb(new) - 'atualizado_em') is distinct from (to_jsonb(old) - 'atualizado_em') then
    new.atualizado_em := now();
  end if;

  return new;
end;
$$;

revoke execute on function public.registros_campos_do_servidor() from public, anon;

-- Gatilho after de registros: grava a linha do histórico. No insert, a chave estrangeira do
-- histórico só acha o registro depois que ele existe.
create function public.registros_historico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.registro_alteracoes (registro_id, familia_id, operacao, autor, antes, depois, versao)
    values (new.id, new.familia_id, 'criacao', new.criado_por, null, public.registro_foto(new), 1);
    return null;
  end if;

  if public.registro_foto(old) is distinct from public.registro_foto(new) then
    insert into public.registro_alteracoes (registro_id, familia_id, operacao, autor, antes, depois, versao)
    values (
      new.id, new.familia_id, 'edicao', v_conta,
      public.registro_foto(old), public.registro_foto(new), old.versao + 1
    );
  end if;

  if old.excluido_em is null and new.excluido_em is not null then
    insert into public.registro_alteracoes (registro_id, familia_id, operacao, autor, antes, depois, versao)
    values (
      new.id, new.familia_id, 'exclusao', v_conta,
      pg_catalog.jsonb_build_object('excluido_em', null::timestamptz),
      pg_catalog.jsonb_build_object('excluido_em', new.excluido_em),
      new.versao
    );
  elsif old.excluido_em is not null and new.excluido_em is null then
    insert into public.registro_alteracoes (registro_id, familia_id, operacao, autor, antes, depois, versao)
    values (
      new.id, new.familia_id, 'restauracao', v_conta,
      pg_catalog.jsonb_build_object('excluido_em', old.excluido_em),
      pg_catalog.jsonb_build_object('excluido_em', null::timestamptz),
      new.versao
    );
  end if;

  return null;
end;
$$;

revoke execute on function public.registros_historico() from public, anon;

create trigger registros_campos_do_servidor
  before insert or update on public.registros
  for each row execute function public.registros_campos_do_servidor();

create trigger registros_historico
  after insert or update on public.registros
  for each row execute function public.registros_historico();

-- Imutabilidade (C5): o histórico é só de acréscimo para todo papel. Exceções: a anulação de
-- autoria (DR-19) e a cascata da exclusão de registro, bebê ou família (DR-21).
create function public.registro_alteracoes_imutavel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.autor is not null and new.autor is null
       and (to_jsonb(new) - 'autor') = (to_jsonb(old) - 'autor') then
      return new;
    end if;
  elsif tg_op = 'DELETE' then
    if not exists (select 1 from public.registros r where r.id = old.registro_id)
       or not exists (select 1 from public.familias f where f.id = old.familia_id) then
      return old;
    end if;
  end if;

  raise exception 'historico imutavel';
end;
$$;

revoke execute on function public.registro_alteracoes_imutavel() from public, anon;

create trigger registro_alteracoes_imutavel
  before update or delete on public.registro_alteracoes
  for each row execute function public.registro_alteracoes_imutavel();

create trigger registro_alteracoes_sem_truncate
  before truncate on public.registro_alteracoes
  for each statement execute function public.registro_alteracoes_imutavel();

-- Gatilho before de notas_cuidado (ROT-04).
create function public.notas_campos_do_servidor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edicao boolean;
  v_exclusao boolean;
begin
  if tg_op = 'INSERT' then
    new.versao := 1;
    new.criada_em := now();
    new.atualizado_em := now();
    new.excluida_em := null;
    new.excluida_por := null;
    return new;
  end if;

  v_edicao := old.texto is distinct from new.texto or old.destaque_ate is distinct from new.destaque_ate;
  v_exclusao := old.excluida_em is null and new.excluida_em is not null;

  new.versao := old.versao
    + case when v_edicao then 1 else 0 end
    + case when v_exclusao then 1 else 0 end;
  new.criada_em := old.criada_em;

  if v_exclusao then
    new.excluida_em := now();
    new.excluida_por := auth.uid();
  end if;

  if (to_jsonb(new) - 'atualizado_em') is distinct from (to_jsonb(old) - 'atualizado_em') then
    new.atualizado_em := now();
  end if;

  return new;
end;
$$;

revoke execute on function public.notas_campos_do_servidor() from public, anon;

create trigger notas_campos_do_servidor
  before insert or update on public.notas_cuidado
  for each row execute function public.notas_campos_do_servidor();
