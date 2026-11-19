-- SEC-06 (SEC-09 e SEC-10 da revisão de segurança, ameaça T7): a exportação deixa de ler o que outros
-- fizeram depois que o vínculo da conta acabou, e passa a levar os dados de comunidade da conta.
--
-- Decisão (b), do líder em 14/11 (ordens-vigentes D2, cartão t_a0dfb38a): "For families without an active
-- link, export only the caller's own authored snapshot from registro_alteracoes (autor = caller, last
-- version written by the caller); no reads of other members' data after a revoked link; include the
-- caller's community data."
--
-- Formato appmaternidade-exportacao-v1, só com chave acrescentada:
--   * `registros` do topo: (1) nas famílias onde a conta tem vínculo ativo sem ser responsável ativa, as
--     linhas atuais que ela criou, como antes; (2) nas famílias onde ela não tem vínculo ativo (saiu, foi
--     revogada ou venceu), a última versão que ela mesma escreveu, tirada de registro_alteracoes (autor =
--     conta, criação ou edição): inicio, fim, detalhes, nota, fuso e deslocamento_min dessa versão; versao e
--     atualizado_em da última alteração feita pela conta; excluido_em/excluido_por só quando essa última
--     alteração da conta foi a exclusão; encerrado_por só quando foi a conta que encerrou e a versão dela
--     tem fim. As colunas que não mudam depois da criação (id, familia_id, bebe_id, tipo, origem,
--     criado_por, recebido_em) vêm da linha. Mesmas dezoito chaves de antes.
--   * `notas` do topo: só o caso (1). Notas não têm histórico, então numa família sem vínculo ativo
--     nenhuma nota sai (a linha atual pode ter edição de outra pessoa).
--   * `comunidade` (novo): perfil (ou null), topicos, respostas, denuncias, bloqueios e aceites_termos da
--     conta. Denúncia sem decidida_por nem denunciante_id; bloqueio só o que a conta fez. Listas sempre [].
-- Data e hora: UTC, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'.
--
-- Trava e rollback: create or replace function não trava tabela (só a linha de pg_proc). Segurança e
-- permissões idênticas às da definição anterior (security definer, search_path vazio, execute só para
-- authenticated). Sem mudança de tabela, índice nem RLS. A busca da versão própria parte de
-- registro_alteracoes pelo autor, sem índice nele (varredura da tabela, uma vez por exportação; não medido),
-- e usa registro_alteracoes_registro_id_idx por registro. Rollback: recriar a função com a definição de
-- 20261114120000_exportacao_registros_e_notas.sql.
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
    )
  );
end;
$$;

revoke execute on function public.exportar_dados() from public, anon;
grant execute on function public.exportar_dados() to authenticated;
