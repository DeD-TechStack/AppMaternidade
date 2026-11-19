-- RF14 (I-RF14-1): avisos dentro do site entre cuidadores, ligáveis na Conta, sem lembretes nem push.
--
-- Uma linha por conta (preferência, visto-até e atualizado-em), apagada em cascata com a conta (a exclusão
-- da conta apaga auth.users, que apaga contas, que apaga esta linha). RLS ligada e nenhum grant a anon nem
-- a authenticated: a tabela só é lida e escrita pelas três funções abaixo, todas security definer, com
-- search_path vazio, que agem sobre auth.uid() e não recebem conta como parâmetro. Só authenticated executa.
--
--   * public.avisos_ler_estado(): a preferência, até 50 avisos e a marca "mais de 50", num só jsonb. Um
--     aviso (RF14:RF-05) é uma nota de uma família onde a conta tem vínculo ativo (qualquer papel), que não é
--     dela (autor nulo, conta apagada, conta), fora da lixeira, criada nos últimos 7 dias
--     (agora - 168 h < criada_em <= agora) e depois do visto-até. O bebê da nota (qualquer, arquivado
--     inclusive, ou nenhum) não importa. O nome do autor só sai para quem tem vínculo ativo na mesma família.
--   * public.avisos_definir_ligados(p_ligados): grava a preferência; desligar mantém o visto-até.
--   * public.avisos_marcar_vistos(p_ate): visto-até = o maior entre o guardado e o enviado, e um valor depois
--     de agora é guardado como agora (sem erro). Funciona com a preferência ligada ou desligada.
--
-- Esta migração também recria public.exportar_dados() sobre a definição de
-- 20261115090200_exportacao_escopo_e_comunidade.sql (SEC-06), copiada sem mudança (mesma assinatura, security
-- definer, search_path vazio e execute só para authenticated) com UMA chave a mais no topo: `avisos` =
-- {"ligados": boolean, "vistos_ate": texto UTC YYYY-MM-DDTHH:MI:SS.USZ ou null}.
--
-- Trava e rollback: create table e create function em objetos novos não travam tabela em uso; create or
-- replace function só toca a linha de pg_proc. As leituras de notas usam notas_cuidado_familia_id_atualizado_em_idx
-- (por família) e vinculos_conta_id_idx (por conta); sem índice novo (não medido). Rollback, nesta ordem:
-- (1) recriar exportar_dados() com a definição de 20261115090200_exportacao_escopo_e_comunidade.sql (SEC-06);
-- (2) drop function public.avisos_marcar_vistos(timestamptz), public.avisos_definir_ligados(boolean),
--     public.avisos_ler_estado(); (3) drop table public.avisos_entre_cuidadores.

create table public.avisos_entre_cuidadores (
  conta_id uuid primary key references public.contas (id) on delete cascade,
  ligados boolean not null default false,
  vistos_ate timestamptz,
  atualizado_em timestamptz not null default now()
);

alter table public.avisos_entre_cuidadores enable row level security;

-- O Supabase local concede tudo a anon e authenticated em tabela nova de public; o revoke explícito vence
-- esses grants. Sem política e sem grant: nenhum papel do cliente toca a tabela (42501).
revoke all on table public.avisos_entre_cuidadores from anon, authenticated;

create function public.avisos_ler_estado()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_agora timestamptz := now();
  v_ligados boolean := false;
  v_vistos timestamptz;
  v_itens jsonb := '[]'::jsonb;
  v_mais boolean := false;
begin
  select a.ligados, a.vistos_ate
    into v_ligados, v_vistos
    from public.avisos_entre_cuidadores a
   where a.conta_id = v_conta;
  v_ligados := coalesce(v_ligados, false);

  if v_ligados then
    select coalesce(jsonb_agg(l.item order by l.ordem) filter (where l.ordem <= 50), '[]'::jsonb),
           coalesce(max(l.ordem) > 50, false)
      into v_itens, v_mais
      from (
        select row_number() over (order by c.criada_em desc, c.id desc) as ordem,
               jsonb_build_object(
                 'id', c.id,
                 'texto', c.texto,
                 'criada_em', to_char(c.criada_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                 'destaque_ate', to_char(c.destaque_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                 'autor', case
                   when c.criado_por is null then 'removido'
                   when exists (
                     select 1 from public.vinculos x
                     where x.familia_id = c.familia_id
                       and x.conta_id = c.criado_por
                       and x.estado = 'ativo'
                       and (x.valido_ate is null or x.valido_ate > v_agora)
                   ) then 'nome'
                   else 'saiu'
                 end,
                 'autor_nome', (
                   select a.nome_privado
                   from public.contas a
                   where a.id = c.criado_por
                     and exists (
                       select 1 from public.vinculos x
                       where x.familia_id = c.familia_id
                         and x.conta_id = c.criado_por
                         and x.estado = 'ativo'
                         and (x.valido_ate is null or x.valido_ate > v_agora)
                     )
                 ),
                 'familia_nome', f.nome,
                 'familia_fuso', f.fuso
               ) as item
          from (
            select n.id, n.familia_id, n.texto, n.criada_em, n.destaque_ate, n.criado_por
            from public.notas_cuidado n
            where n.excluida_em is null
              and n.criada_em <= v_agora
              and n.criada_em > v_agora - interval '168 hours'
              and (v_vistos is null or n.criada_em > v_vistos)
              and (n.criado_por is null or n.criado_por <> v_conta)
              and exists (
                select 1 from public.vinculos m
                where m.familia_id = n.familia_id
                  and m.conta_id = v_conta
                  and m.estado = 'ativo'
                  and (m.valido_ate is null or m.valido_ate > v_agora)
              )
            order by n.criada_em desc, n.id desc
            limit 51
          ) c
          join public.familias f on f.id = c.familia_id
      ) l;
  end if;

  return jsonb_build_object('ligados', v_ligados, 'mais_de_50', v_mais, 'avisos', v_itens);
end;
$$;

create function public.avisos_definir_ligados(p_ligados boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
begin
  if p_ligados is null then
    raise exception 'parametro obrigatorio';
  end if;
  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  insert into public.avisos_entre_cuidadores as a (conta_id, ligados, atualizado_em)
  values (v_conta, p_ligados, now())
  on conflict (conta_id) do update
    set ligados = excluded.ligados,
        atualizado_em = excluded.atualizado_em;
end;
$$;

create function public.avisos_marcar_vistos(p_ate timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_agora timestamptz := now();
begin
  if p_ate is null then
    raise exception 'parametro obrigatorio';
  end if;
  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  -- Nunca depois de agora, e nunca para trás: o maior entre o guardado e o enviado (greatest ignora o nulo).
  insert into public.avisos_entre_cuidadores as a (conta_id, vistos_ate, atualizado_em)
  values (v_conta, least(p_ate, v_agora), v_agora)
  on conflict (conta_id) do update
    set vistos_ate = greatest(a.vistos_ate, excluded.vistos_ate),
        atualizado_em = excluded.atualizado_em;
end;
$$;

revoke execute on function public.avisos_ler_estado() from public, anon;
revoke execute on function public.avisos_definir_ligados(boolean) from public, anon;
revoke execute on function public.avisos_marcar_vistos(timestamptz) from public, anon;
grant execute on function public.avisos_ler_estado() to authenticated;
grant execute on function public.avisos_definir_ligados(boolean) to authenticated;
grant execute on function public.avisos_marcar_vistos(timestamptz) to authenticated;

-- exportar_dados(): a definição de 20261115090200 (SEC-06), sem mudança, mais a chave `avisos` no fim.
create or replace function public.exportar_dados()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
begin
  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  return jsonb_build_object(
    'formato', 'appmaternidade-exportacao-v1',
    'gerado_em', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'conta', (
      select jsonb_build_object(
        'id', c.id,
        'email', u.email,
        'nome_privado', c.nome_privado,
        'fuso', c.fuso,
        'criada_em', to_char(c.criada_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
      )
      from public.contas c
      left join auth.users u on u.id = c.id
      where c.id = v_conta
    ),
    'vinculos', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'familia_id', v.familia_id,
          'papel', v.papel,
          'estado', v.estado,
          'valido_ate', to_char(v.valido_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'epoca', v.epoca,
          'criado_em', to_char(v.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'encerrado_em', to_char(v.encerrado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
        ) order by v.criado_em, v.id
      ), '[]'::jsonb)
      from public.vinculos v
      where v.conta_id = v_conta
    ),
    'familias', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'nome', f.nome,
          'fuso', f.fuso,
          'criada_em', to_char(f.criada_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'membros', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'conta_id', m.conta_id,
                'nome_privado', mc.nome_privado,
                'papel', m.papel,
                'valido_ate', to_char(m.valido_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
              ) order by m.criado_em, m.conta_id
            ), '[]'::jsonb)
            from public.vinculos m
            join public.contas mc on mc.id = m.conta_id
            where m.familia_id = f.id
              and m.estado = 'ativo'
              and (m.valido_ate is null or m.valido_ate > now())
          ),
          'bebes', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', b.id,
                'nome', b.nome,
                'nascimento', to_char(b.nascimento, 'YYYY-MM-DD'),
                'estado', b.estado,
                'criado_em', to_char(b.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
              ) order by b.criado_em, b.id
            ), '[]'::jsonb)
            from public.bebes b
            where b.familia_id = f.id
          ),
          'convites', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', cv.id,
                'papel', cv.papel,
                'estado', cv.estado,
                'vinculo_valido_ate',
                  to_char(cv.vinculo_valido_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'expira_em', to_char(cv.expira_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'criado_em', to_char(cv.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'aceito_em', to_char(cv.aceito_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
              ) order by cv.criado_em, cv.id
            ), '[]'::jsonb)
            from public.convites cv
            where cv.familia_id = f.id
          ),
          'registros', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', r.id,
                'familia_id', r.familia_id,
                'bebe_id', r.bebe_id,
                'tipo', r.tipo,
                'inicio', to_char(r.inicio at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'fim', to_char(r.fim at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'detalhes', r.detalhes,
                'nota', r.nota,
                'origem', r.origem,
                'fuso', r.fuso,
                'deslocamento_min', r.deslocamento_min,
                'criado_por', r.criado_por,
                'encerrado_por', r.encerrado_por,
                'versao', r.versao,
                'recebido_em', to_char(r.recebido_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'atualizado_em', to_char(r.atualizado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'excluido_em', to_char(r.excluido_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'excluido_por', r.excluido_por
              ) order by r.recebido_em, r.id
            ), '[]'::jsonb)
            from public.registros r
            where r.familia_id = f.id
          ),
          'notas', (
            select coalesce(jsonb_agg(
              jsonb_build_object(
                'id', n.id,
                'familia_id', n.familia_id,
                'bebe_id', n.bebe_id,
                'texto', n.texto,
                'destaque_ate', to_char(n.destaque_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'criado_por', n.criado_por,
                'criada_em', to_char(n.criada_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'versao', n.versao,
                'atualizado_em', to_char(n.atualizado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'excluida_em', to_char(n.excluida_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                'excluida_por', n.excluida_por
              ) order by n.criada_em, n.id
            ), '[]'::jsonb)
            from public.notas_cuidado n
            where n.familia_id = f.id
          )
        ) order by f.criada_em, f.id
      ), '[]'::jsonb)
      from public.familias f
      where exists (
        select 1 from public.vinculos r
        where r.familia_id = f.id
          and r.conta_id = v_conta
          and r.papel = 'responsavel'
          and r.estado = 'ativo'
          and (r.valido_ate is null or r.valido_ate > now())
      )
    ),
    'registros', (
      select coalesce(jsonb_agg(i.item order by i.recebido_em, i.id), '[]'::jsonb)
      from (
        -- (1) Vínculo ativo sem ser responsável ativa: a linha atual do que a conta criou.
        select r.id, r.recebido_em, jsonb_build_object(
          'id', r.id,
          'familia_id', r.familia_id,
          'bebe_id', r.bebe_id,
          'tipo', r.tipo,
          'inicio', to_char(r.inicio at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'fim', to_char(r.fim at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'detalhes', r.detalhes,
          'nota', r.nota,
          'origem', r.origem,
          'fuso', r.fuso,
          'deslocamento_min', r.deslocamento_min,
          'criado_por', r.criado_por,
          'encerrado_por', r.encerrado_por,
          'versao', r.versao,
          'recebido_em', to_char(r.recebido_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'atualizado_em', to_char(r.atualizado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'excluido_em', to_char(r.excluido_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'excluido_por', r.excluido_por
        ) as item
        from public.registros r
        where r.criado_por = v_conta
          and exists (
            select 1 from public.vinculos x
            where x.familia_id = r.familia_id
              and x.conta_id = v_conta
              and x.estado = 'ativo'
              and (x.valido_ate is null or x.valido_ate > now())
          )
          and not exists (
            select 1 from public.vinculos x
            where x.familia_id = r.familia_id
              and x.conta_id = v_conta
              and x.papel = 'responsavel'
              and x.estado = 'ativo'
              and (x.valido_ate is null or x.valido_ate > now())
          )
        union all
        -- (2) Sem vínculo ativo (decisão b): a última versão que a própria conta escreveu.
        select r.id, r.recebido_em, jsonb_build_object(
          'id', r.id,
          'familia_id', r.familia_id,
          'bebe_id', r.bebe_id,
          'tipo', r.tipo,
          'inicio', to_char((s.depois ->> 'inicio')::timestamptz at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'fim', to_char((s.depois ->> 'fim')::timestamptz at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'detalhes', s.depois -> 'detalhes',
          'nota', s.depois ->> 'nota',
          'origem', r.origem,
          'fuso', s.depois ->> 'fuso',
          'deslocamento_min', s.depois -> 'deslocamento_min',
          'criado_por', r.criado_por,
          'encerrado_por',
            case when s.depois ->> 'fim' is not null and r.encerrado_por = v_conta then v_conta end,
          'versao', ult.versao,
          'recebido_em', to_char(r.recebido_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'atualizado_em', to_char(ult.recebida_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'excluido_em',
            case when ult.operacao = 'exclusao' then to_char((ult.depois ->> 'excluido_em')::timestamptz at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end,
          'excluido_por', case when ult.operacao = 'exclusao' then v_conta end
        ) as item
        from (
          select distinct a.registro_id
          from public.registro_alteracoes a
          where a.autor = v_conta
            and a.operacao in ('criacao', 'edicao')
        ) proprios
        join public.registros r on r.id = proprios.registro_id
        cross join lateral (
          select a.depois
          from public.registro_alteracoes a
          where a.registro_id = r.id
            and a.autor = v_conta
            and a.operacao in ('criacao', 'edicao')
          order by a.versao desc, a.recebida_em desc, a.id desc
          limit 1
        ) s
        cross join lateral (
          select a.operacao, a.depois, a.versao, a.recebida_em
          from public.registro_alteracoes a
          where a.registro_id = r.id
            and a.autor = v_conta
          order by a.versao desc, a.recebida_em desc, a.id desc
          limit 1
        ) ult
        where not exists (
          select 1 from public.vinculos x
          where x.familia_id = r.familia_id
            and x.conta_id = v_conta
            and x.estado = 'ativo'
            and (x.valido_ate is null or x.valido_ate > now())
        )
      ) i
    ),
    'comunidade', jsonb_build_object(
      'perfil', (
        select jsonb_build_object(
          'id', p.id,
          'apelido', p.apelido,
          'bio', p.bio,
          'faixa_bebe', p.faixa_bebe,
          'criado_em', to_char(p.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
        )
        from public.perfis_publicos p
        where p.conta_id = v_conta
      ),
      'topicos', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'espaco_id', t.espaco_id,
            'titulo', t.titulo,
            'corpo', t.corpo,
            'faixa_etaria', t.faixa_etaria,
            'estado', t.estado,
            'motivo_moderacao', t.motivo_moderacao,
            'criado_em', to_char(t.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
            'editado_em', to_char(t.editado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
          ) order by t.criado_em, t.id
        ), '[]'::jsonb)
        from public.topicos t
        join public.perfis_publicos p on p.id = t.autor_id
        where p.conta_id = v_conta
      ),
      'respostas', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', rp.id,
            'topico_id', rp.topico_id,
            'resposta_a', rp.resposta_a,
            'corpo', rp.corpo,
            'estado', rp.estado,
            'motivo_moderacao', rp.motivo_moderacao,
            'criado_em', to_char(rp.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
            'editado_em', to_char(rp.editado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
          ) order by rp.criado_em, rp.id
        ), '[]'::jsonb)
        from public.respostas rp
        join public.perfis_publicos p on p.id = rp.autor_id
        where p.conta_id = v_conta
      ),
      'denuncias', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', d.id,
            'topico_id', d.topico_id,
            'resposta_id', d.resposta_id,
            'perfil_id', d.perfil_id,
            'motivo', d.motivo,
            'texto', d.texto,
            'estado', d.estado,
            'decidida_em', to_char(d.decidida_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
            'criada_em', to_char(d.criada_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
          ) order by d.criada_em, d.id
        ), '[]'::jsonb)
        from public.denuncias d
        where d.denunciante_id = v_conta
      ),
      'bloqueios', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'bloqueado_id', b.bloqueado_id,
            'criado_em', to_char(b.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
          ) order by b.criado_em, b.bloqueado_id
        ), '[]'::jsonb)
        from public.bloqueios b
        join public.perfis_publicos p on p.id = b.bloqueador_id
        where p.conta_id = v_conta
      ),
      'aceites_termos', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'versao', a.versao,
            'aceito_em', to_char(a.aceito_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
          ) order by a.aceito_em, a.versao
        ), '[]'::jsonb)
        from public.aceites_termos a
        where a.conta_id = v_conta
      )
    ),
    'notas', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'familia_id', n.familia_id,
          'bebe_id', n.bebe_id,
          'texto', n.texto,
          'destaque_ate', to_char(n.destaque_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'criado_por', n.criado_por,
          'criada_em', to_char(n.criada_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'versao', n.versao,
          'atualizado_em', to_char(n.atualizado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'excluida_em', to_char(n.excluida_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'excluida_por', n.excluida_por
        ) order by n.criada_em, n.id
      ), '[]'::jsonb)
      from public.notas_cuidado n
      where n.criado_por = v_conta
        and exists (
          select 1 from public.vinculos x
          where x.familia_id = n.familia_id
            and x.conta_id = v_conta
            and x.estado = 'ativo'
            and (x.valido_ate is null or x.valido_ate > now())
        )
        and not exists (
          select 1 from public.vinculos x
          where x.familia_id = n.familia_id
            and x.conta_id = v_conta
            and x.papel = 'responsavel'
            and x.estado = 'ativo'
            and (x.valido_ate is null or x.valido_ate > now())
        )
    ),
    'avisos', jsonb_build_object(
      'ligados', coalesce((select a.ligados from public.avisos_entre_cuidadores a where a.conta_id = v_conta), false),
      'vistos_ate', (
        select to_char(a.vistos_ate at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
        from public.avisos_entre_cuidadores a
        where a.conta_id = v_conta
      )
    )
  );
end;
$$;

revoke execute on function public.exportar_dados() from public, anon;
grant execute on function public.exportar_dados() to authenticated;
