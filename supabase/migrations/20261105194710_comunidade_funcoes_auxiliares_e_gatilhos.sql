-- MAT-47: funções auxiliares das políticas, ha_bloqueio, funções de gatilho e gatilhos.
-- Todas são security definer com search_path vazio e usam só auth.uid() como conta chamadora.
-- Leem apenas as tabelas da comunidade e a existência de uma linha em contas; nenhuma toca dado de cuidado.

-- O id do perfil próprio, ou nulo.
create function public.meu_perfil_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.perfis_publicos p
  where p.conta_id = (select auth.uid());
$$;

-- Conta habilitada: a conta chamadora tem linha em contas (D20).
create function public.conta_habilitada()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contas c where c.id = (select auth.uid())
  );
$$;

-- Aceite vigente: existe versão vigente e a conta chamadora aceitou essa versão.
create function public.aceite_vigente()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.versoes_termos v
    join public.aceites_termos a on a.versao = v.versao
    where v.vigente
      and a.conta_id = (select auth.uid())
  );
$$;

-- Escritor habilitado: aceite vigente e perfil próprio (D6).
create function public.escritor_habilitado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.aceite_vigente() and public.meu_perfil_id() is not null;
$$;

-- Papel de plataforma vigente entre os pedidos: valido_ate nulo ou no futuro.
create function public.tem_papel_plataforma(p_papeis public.papel_plataforma[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.papeis_plataforma pp
    where pp.conta_id = (select auth.uid())
      and pp.papel = any (p_papeis)
      and (pp.valido_ate is null or pp.valido_ate > now())
  );
$$;

-- Interna (D21): bloqueio entre o perfil próprio e o outro, nos dois sentidos.
create function public.ha_bloqueio(p_outro_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_outro_perfil is not null
    and exists (
      select 1
      from public.bloqueios b
      where (b.bloqueador_id = (select public.meu_perfil_id()) and b.bloqueado_id = p_outro_perfil)
         or (b.bloqueado_id = (select public.meu_perfil_id()) and b.bloqueador_id = p_outro_perfil)
    );
$$;

-- Pode ler o perfil: o próprio; ou conta habilitada sem bloqueio; ou moderação.
create function public.pode_ler_perfil(p_perfil_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis_publicos pp
    where pp.id = p_perfil_id
      and (
        pp.conta_id = (select auth.uid())
        or (public.conta_habilitada() and not public.ha_bloqueio(pp.id))
        or public.tem_papel_plataforma(array['moderador', 'admin']::public.papel_plataforma[])
      )
  );
$$;

-- Pode ler o tópico: moderação; ou visível para conta habilitada sem bloqueio com o autor;
-- ou do perfil próprio, visível ou oculto (D5).
create function public.pode_ler_topico(p_topico_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.topicos t
    where t.id = p_topico_id
      and (
        public.tem_papel_plataforma(array['moderador', 'admin']::public.papel_plataforma[])
        or (
          t.estado = 'visivel'
          and public.conta_habilitada()
          and (t.autor_id is null or not public.ha_bloqueio(t.autor_id))
        )
        or (
          t.autor_id is not null
          and t.autor_id = (select public.meu_perfil_id())
          and t.estado in ('visivel', 'oculto')
        )
      )
  );
$$;

-- Pode ler a resposta: moderação; ou o tópico é legível e a resposta segue a mesma regra do tópico.
-- Respostas de um tópico que o chamador não lê somem, inclusive as dele (D5).
create function public.pode_ler_resposta(p_resposta_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.respostas r
    where r.id = p_resposta_id
      and (
        public.tem_papel_plataforma(array['moderador', 'admin']::public.papel_plataforma[])
        or (
          public.pode_ler_topico(r.topico_id)
          and (
            (
              r.estado = 'visivel'
              and public.conta_habilitada()
              and (r.autor_id is null or not public.ha_bloqueio(r.autor_id))
            )
            or (
              r.autor_id is not null
              and r.autor_id = (select public.meu_perfil_id())
              and r.estado in ('visivel', 'oculto')
            )
          )
        )
      )
  );
$$;

-- Pode responder: tópico visível e, se houver, resposta-mãe visível, ambos sem autor bloqueado.
-- Sem atalho para a moderação: responder é escrever como usuária.
create function public.pode_responder(p_topico_id uuid, p_resposta_a uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.topicos t
      where t.id = p_topico_id
        and t.estado = 'visivel'
        and (t.autor_id is null or not public.ha_bloqueio(t.autor_id))
    )
    and (
      p_resposta_a is null
      or exists (
        select 1
        from public.respostas m
        where m.id = p_resposta_a
          and m.estado = 'visivel'
          and (m.autor_id is null or not public.ha_bloqueio(m.autor_id))
      )
    );
$$;

-- editado_em: o autor muda título, corpo ou faixa (tópico) ou corpo (resposta).
-- A troca por [removido] (exclusão de conta) e a mudança de estado não contam.
create function public.tg_comunidade_editado_em()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.autor_id is not null and new.autor_id is null then
    return new;
  end if;

  if to_jsonb(new) -> 'titulo' is distinct from to_jsonb(old) -> 'titulo'
     or to_jsonb(new) -> 'corpo' is distinct from to_jsonb(old) -> 'corpo'
     or to_jsonb(new) -> 'faixa_etaria' is distinct from to_jsonb(old) -> 'faixa_etaria' then
    new.editado_em := now();
  end if;

  return new;
end;
$$;

-- [removido]: quando autor_id passa de não nulo a nulo (exclusão de conta, D11).
create function public.tg_comunidade_removido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.autor_id is not null and new.autor_id is null then
    new.corpo := '[removido]';
    if tg_table_name = 'topicos' then
      new.titulo := '[removido]';
    end if;
  end if;

  return new;
end;
$$;

-- Um nível de resposta e resposta-mãe do mesmo tópico. Roda depois da política (after insert).
create function public.tg_respostas_nivel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mae_topico uuid;
  v_mae_resposta_a uuid;
begin
  if new.resposta_a is not null then
    select m.topico_id, m.resposta_a
      into v_mae_topico, v_mae_resposta_a
    from public.respostas m
    where m.id = new.resposta_a;

    if v_mae_topico <> new.topico_id then
      raise exception using errcode = 'P0001', message = 'resposta de outro topico';
    end if;

    if v_mae_resposta_a is not null then
      raise exception using errcode = 'P0001', message = 'so um nivel de resposta';
    end if;
  end if;

  return new;
end;
$$;

-- Auditoria imutável (D23): nenhum update, delete ou truncate passa, de nenhum papel.
create function public.tg_auditoria_imutavel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = 'auditoria imutavel';
end;
$$;

create trigger topicos_editado_em
  before update on public.topicos
  for each row execute function public.tg_comunidade_editado_em();

create trigger topicos_removido
  before update on public.topicos
  for each row execute function public.tg_comunidade_removido();

create trigger respostas_editado_em
  before update on public.respostas
  for each row execute function public.tg_comunidade_editado_em();

create trigger respostas_removido
  before update on public.respostas
  for each row execute function public.tg_comunidade_removido();

create trigger respostas_nivel
  after insert on public.respostas
  for each row execute function public.tg_respostas_nivel();

create trigger auditoria_imutavel_linha
  before update or delete on public.auditoria_moderacao
  for each row execute function public.tg_auditoria_imutavel();

create trigger auditoria_imutavel_truncate
  before truncate on public.auditoria_moderacao
  for each statement execute function public.tg_auditoria_imutavel();

-- Permissões de execução. anon nunca executa. As nove auxiliares das políticas ficam com authenticated;
-- ha_bloqueio e as quatro funções de gatilho não (o dono as usa dentro das outras funções e dos gatilhos).
revoke execute on function public.meu_perfil_id() from public, anon;
revoke execute on function public.conta_habilitada() from public, anon;
revoke execute on function public.aceite_vigente() from public, anon;
revoke execute on function public.escritor_habilitado() from public, anon;
revoke execute on function public.tem_papel_plataforma(public.papel_plataforma[]) from public, anon;
revoke execute on function public.pode_ler_perfil(uuid) from public, anon;
revoke execute on function public.pode_ler_topico(uuid) from public, anon;
revoke execute on function public.pode_ler_resposta(uuid) from public, anon;
revoke execute on function public.pode_responder(uuid, uuid) from public, anon;

grant execute on function public.meu_perfil_id() to authenticated;
grant execute on function public.conta_habilitada() to authenticated;
grant execute on function public.aceite_vigente() to authenticated;
grant execute on function public.escritor_habilitado() to authenticated;
grant execute on function public.tem_papel_plataforma(public.papel_plataforma[]) to authenticated;
grant execute on function public.pode_ler_perfil(uuid) to authenticated;
grant execute on function public.pode_ler_topico(uuid) to authenticated;
grant execute on function public.pode_ler_resposta(uuid) to authenticated;
grant execute on function public.pode_responder(uuid, uuid) to authenticated;

revoke execute on function public.ha_bloqueio(uuid) from public, anon, authenticated;
revoke execute on function public.tg_comunidade_editado_em() from public, anon, authenticated;
revoke execute on function public.tg_comunidade_removido() from public, anon, authenticated;
revoke execute on function public.tg_respostas_nivel() from public, anon, authenticated;
revoke execute on function public.tg_auditoria_imutavel() from public, anon, authenticated;
