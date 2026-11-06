begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

-- MAT-45, adendo R-B: 45-M5 (exclusão de conta contra aceite de convite) e 45-N3 (contas_visiveis sem repetição).
-- Contas: 01 R é responsável da família 1 e 02 X é cuidador dela. 03 S é responsável da família 2, que tem o
-- convite d1 pendente. 06 A e 07 B são responsáveis das famílias 3 e 4; 06 A e 08 E estão na família 5.
insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || n || '@exemplo.invalid'
from generate_series(1, 8) as n;

insert into public.contas (id, nome_privado)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'U' || n
from generate_series(1, 8) as n;

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000003'),
  ('ffffffff-0000-4000-8000-000000000003', 'Família 3', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000006'),
  ('ffffffff-0000-4000-8000-000000000004', 'Família 4', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000006'),
  ('ffffffff-0000-4000-8000-000000000005', 'Família 5', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000006');

insert into public.vinculos (familia_id, conta_id, papel, estado) values
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'cuidador', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000006', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000007', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000006', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000007', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000006', 'responsavel', 'ativo'),
  ('ffffffff-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000008', 'cuidador', 'ativo');

insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em) values
  ('c0000000-0000-4000-8000-0000000000d1', 'ffffffff-0000-4000-8000-000000000002', 'cuidador',
   'aaaaaaaa-0000-4000-8000-000000000003', encode(extensions.digest(repeat('d1', 32), 'sha256'), 'hex'),
   now() + interval '3 days');

-- 45-M5, parte sequencial (R7): na mesma transação, a conta se exclui e, com o mesmo auth.uid(), tenta
-- aceitar um convite válido de outra família. Encontra a conta inexistente e não cria vínculo.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select lives_ok($$select public.excluir_conta()$$, 'X, cuidador, exclui a conta');

select throws_ok(
  $$select public.aceitar_convite(repeat('d1', 32))$$,
  'P0001', 'conta inexistente',
  'o aceite que chega depois da exclusão encontra a conta inexistente'
);
select throws_ok(
  $$select public.excluir_conta()$$,
  'P0001', 'conta inexistente',
  'excluir a conta de novo também dá conta inexistente'
);
select throws_ok(
  $$select public.aceitar_convite(null)$$,
  'P0001', 'parametro obrigatorio',
  'parametro obrigatorio vem antes de conta inexistente'
);
select throws_ok(
  $$select public.aceitar_convite(repeat('g1', 32))$$,
  'P0001', 'conta inexistente',
  'conta inexistente vem antes de convite invalido'
);

reset role;

select is(
  (select c.estado::text || '|' || coalesce(c.aceito_por::text, '-') || '|' || (c.aceito_em is null)::text
     from public.convites c where c.id = 'c0000000-0000-4000-8000-0000000000d1'),
  'pendente|-|true',
  'o convite não foi consumido'
);
select is(
  (select count(*)::int from public.vinculos where conta_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0,
  'nenhum vínculo foi criado para a conta excluída'
);

-- 45-M5, parte estrutural: as duas funções travam primeiro a linha da conta do chamador.
select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.excluir_conta()'::regprocedure),
  'from public\.contas c\s+where c\.id = v_conta\s+for update;\s+if not found then\s+raise exception ''conta inexistente''',
  'excluir_conta trava a linha da própria conta e, se não achar, dá conta inexistente'
);
select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.excluir_conta()'::regprocedure),
  'from public\.contas c\s+where c\.id = v_conta\s+for update(.|\n)*from public\.familias f(.|\n)*order by f\.id\s+for update',
  'excluir_conta trava a conta primeiro e só depois as famílias, em ordem crescente de id'
);
select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.aceitar_convite(text)'::regprocedure),
  'from public\.contas c\s+where c\.id = v_conta\s+for update;\s+if not found then\s+raise exception ''conta inexistente''',
  'aceitar_convite trava a linha da conta do chamador e, se não achar, dá conta inexistente'
);
select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.aceitar_convite(text)'::regprocedure),
  'parametro obrigatorio(.|\n)*from public\.contas c\s+where c\.id = v_conta\s+for update(.|\n)*from public\.convites c',
  'aceitar_convite confere o parâmetro, trava a conta e só depois olha o convite e a família'
);

-- 45-N3: contas_visiveis devolve cada conta uma vez, mesmo com duas famílias em comum.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000006", "role": "authenticated"}';

select is(
  array(select c::text from public.contas_visiveis() c order by 1),
  array['aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000007',
        'aaaaaaaa-0000-4000-8000-000000000008'],
  'A, que divide as famílias 3 e 4 com B e a 5 com E, vê A, B e E, cada um uma vez'
);
select is(
  (select count(*)::int from public.contas_visiveis()),
  (select count(distinct c)::int from public.contas_visiveis() c),
  'contas_visiveis não repete conta'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000007", "role": "authenticated"}';

select is(
  array(select c::text from public.contas_visiveis() c order by 1),
  array['aaaaaaaa-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000007'],
  'B, que divide duas famílias com A, vê A e B uma vez cada'
);

reset role;

select matches(
  (select p.prosrc from pg_proc p where p.oid = 'public.contas_visiveis()'::regprocedure),
  'select distinct o\.conta_id',
  'contas_visiveis usa select distinct'
);

select * from finish();
rollback;
