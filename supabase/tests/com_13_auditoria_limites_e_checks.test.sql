begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- 47-M3 e 47-N2 (adendo R-B) e R6 (catálogo de checks):
--   * os limites de auditoria_moderacao.motivo (1 a 300) valem pelo insert; o update nunca chega ao check,
--     porque o gatilho de imutabilidade responde antes (P0001 auditoria imutavel), qualquer que seja o valor;
--   * o P0001 vale para quem alcança a operação (postgres, service_role); quem não tem grant
--     (authenticated, anon) recebe 42501;
--   * a lista dos checks das tabelas da comunidade é fechada.
-- Ids novos desta tarefa começam com 47 (47e0...); tudo só existe dentro da transação.

create function pg_temp.i(n int) returns uuid language sql immutable as $$
  select ('47e00000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- 'ok' ou 'ERRO:<sqlstate>:<mensagem do P0001 | nome da constraint | ->', no papel dado (null = o atual).
create function pg_temp.tenta(p_papel text, p_sql text) returns text
language plpgsql as $$
declare c text;
begin
  if p_papel is not null then
    execute 'set local role ' || p_papel;
  end if;
  execute p_sql;
  return 'ok';
exception when others then
  get stacked diagnostics c = constraint_name;
  return 'ERRO:' || sqlstate || ':'
    || case when sqlstate = 'P0001' then sqlerrm
            when sqlstate in ('23502', '42501') then '-'
            else coalesce(c, '-') end;
end;
$$;

insert into auth.users (id, email) values (pg_temp.i(1), 'c47e-auditor@exemplo.invalid');
insert into public.contas (id, nome_privado) values (pg_temp.i(1), 'Auditor');

insert into public.auditoria_moderacao (id, ator_id, acao, alvo_tipo, alvo_id, motivo) values
  (pg_temp.i(51), pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), 'Motivo original');

-- O dono: o update de motivo responde P0001 com qualquer valor (inclusive os que feririam o check ou o not null).
select is(
  pg_temp.tenta(null, format('update public.auditoria_moderacao set motivo = %s where id = pg_temp.i(51)', v.valor)),
  'ERRO:P0001:auditoria imutavel',
  'dono: update de motivo ' || v.rotulo || ' responde P0001 auditoria imutavel'
) from (values
  ('vazio', $v$''$v$),
  ('com 1 caractere', $v$'x'$v$),
  ('com 300 caracteres', $v$repeat('a', 300)$v$),
  ('com 301 caracteres', $v$repeat('a', 301)$v$),
  ('nulo', 'null')
) as v(rotulo, valor);

-- Os limites valem pelo insert: o check recusa o inválido e aceita os extremos.
select is(
  pg_temp.tenta(null, format($i$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
    values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), %s)$i$, v.valor)),
  v.esperado,
  'dono: insert com motivo ' || v.rotulo
) from (values
  ('vazio', $v$''$v$, 'ERRO:23514:auditoria_moderacao_motivo_tamanho'),
  ('com 301 caracteres', $v$repeat('a', 301)$v$, 'ERRO:23514:auditoria_moderacao_motivo_tamanho'),
  ('nulo', 'null', 'ERRO:23502:-'),
  ('com 1 caractere', $v$'x'$v$, 'ok'),
  ('com 300 caracteres', $v$repeat('a', 300)$v$, 'ok')
) as v(rotulo, valor, esperado);

-- service_role alcança a tabela: update, delete e truncate respondem P0001; o limite segue valendo no insert.
select is(
  pg_temp.tenta('service_role', v.sql), v.esperado, v.descricao
) from (values
  ($s$update public.auditoria_moderacao set motivo = '' where id = pg_temp.i(51)$s$,
   'ERRO:P0001:auditoria imutavel', 'service_role: update de motivo responde P0001'),
  ($s$delete from public.auditoria_moderacao where id = pg_temp.i(51)$s$,
   'ERRO:P0001:auditoria imutavel', 'service_role: delete responde P0001'),
  ($s$truncate public.auditoria_moderacao$s$,
   'ERRO:P0001:auditoria imutavel', 'service_role: truncate responde P0001'),
  ($s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
      values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), repeat('a', 301))$s$,
   'ERRO:23514:auditoria_moderacao_motivo_tamanho', 'service_role: insert com 301 caracteres fere o check')
) as v(sql, esperado, descricao);

reset role;

-- authenticated e anon não têm grant de update, delete, truncate nem insert: 42501, sem chegar ao gatilho.
select is(
  pg_temp.tenta(v.papel, v.sql), 'ERRO:42501:-', v.papel || ': ' || v.descricao
) from (values
  ('authenticated', $s$update public.auditoria_moderacao set motivo = 'adulterado' where id = pg_temp.i(51)$s$,
   'update de motivo recebe 42501'),
  ('authenticated', $s$delete from public.auditoria_moderacao where id = pg_temp.i(51)$s$,
   'delete recebe 42501'),
  ('authenticated', $s$truncate public.auditoria_moderacao$s$,
   'truncate recebe 42501'),
  ('authenticated', $s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
      values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), 'forjado')$s$,
   'insert recebe 42501'),
  ('anon', $s$update public.auditoria_moderacao set motivo = 'adulterado' where id = pg_temp.i(51)$s$,
   'update de motivo recebe 42501'),
  ('anon', $s$delete from public.auditoria_moderacao where id = pg_temp.i(51)$s$,
   'delete recebe 42501'),
  ('anon', $s$truncate public.auditoria_moderacao$s$,
   'truncate recebe 42501'),
  ('anon', $s$insert into public.auditoria_moderacao (ator_id, acao, alvo_tipo, alvo_id, motivo)
      values (pg_temp.i(1), 'ocultar', 'topico', pg_temp.i(21), 'forjado')$s$,
   'insert recebe 42501')
) as v(papel, sql, descricao);

reset role;

select is(
  (select motivo from public.auditoria_moderacao where id = pg_temp.i(51)),
  'Motivo original',
  'depois de todas as tentativas, a linha de auditoria segue como foi gravada'
);

-- R6: a lista fechada dos checks das tabelas da comunidade (lida de pg_constraint na hora).
select is(
  (select string_agg(c.conname, ',' order by c.conname collate "C")
     from pg_constraint c
     join pg_class o on o.oid = c.conrelid
    where c.contype = 'c' and o.relnamespace = 'public'::regnamespace
      and o.relname in ('perfis_publicos', 'versoes_termos', 'aceites_termos', 'espacos', 'topicos',
                        'respostas', 'denuncias', 'bloqueios', 'papeis_plataforma', 'auditoria_moderacao')),
  'auditoria_moderacao_motivo_tamanho,bloqueios_nao_a_si_mesmo,denuncias_alvo_unico,denuncias_decisao_data,'
    || 'denuncias_texto_tamanho,perfis_publicos_apelido_tamanho,perfis_publicos_bio_tamanho,'
    || 'respostas_corpo_tamanho,respostas_motivo_estado,respostas_motivo_tamanho,topicos_corpo_tamanho,'
    || 'topicos_motivo_estado,topicos_motivo_tamanho,topicos_titulo_tamanho',
  'os 14 checks da comunidade são exatamente os previstos'
);

select * from finish();
rollback;
