-- RF-13: a exportação dos dados da conta passa a levar os registros e as notas da rotina.
-- Formato appmaternidade-exportacao-v1, só com chaves acrescentadas:
--   * cada item de familias[] ganha `registros` e `notas`: todas as linhas da família, a lixeira inclusive
--     (excluido_em e excluida_em preenchidos), por recebido_em (registros) ou criada_em (notas) e depois id;
--   * o topo ganha `registros` e `notas`: o que a conta criou (criado_por = conta) em famílias onde ela NÃO é
--     responsável ativa. Quem é responsável ativa recebe o resto dentro de familias[], sem repetir no topo;
--     quem nunca foi responsável recebe aqui tudo o que criou.
-- As listas saem sempre como [], nunca nulas. Data e hora: UTC, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'.
--
-- Trava e rollback: create or replace function não trava tabela. Segurança e permissões idênticas às da
-- definição anterior (security definer, search_path vazio, execute só para authenticated). Sem mudança de
-- tabela nem de RLS. Rollback: recriar a função com a definição de 20261106090600_exportacao_e_exclusao.sql.
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
      where r.criado_por = v_conta
        and not exists (
          select 1 from public.vinculos x
          where x.familia_id = r.familia_id
            and x.conta_id = v_conta
            and x.papel = 'responsavel'
            and x.estado = 'ativo'
            and (x.valido_ate is null or x.valido_ate > now())
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
