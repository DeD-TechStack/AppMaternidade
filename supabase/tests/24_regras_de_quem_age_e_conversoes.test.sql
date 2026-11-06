begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- MAT-45, adendo R-B, R2 (quem a C3 obriga), R4 (23505 do código de convite) e R6 (catálogo fechado).
-- Contas: 01 A e 02 B são responsáveis da família 1, 03 D é cuidador. 04 X e 06 S: X aceita convite da
-- família 2, onde S é responsável.
create function pg_temp.foto() returns text language sql as $$
  select (select md5(string_agg(v::text, '|' order by v.id)) from public.vinculos v) || '/'
      || (select md5(string_agg(c::text, '|' order by c.id)) from public.convites c);
$$;

insert into auth.users (id, email)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'u' || n || '@exemplo.invalid'
from generate_series(1, 6) as n;

insert into public.contas (id, nome_privado)
select ('aaaaaaaa-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'U' || n
from generate_series(1, 6) as n;

insert into public.familias (id, nome, fuso, criada_por) values
  ('ffffffff-0000-4000-8000-000000000001', 'Família 1', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Família 2', 'America/Sao_Paulo', 'aaaaaaaa-0000-4000-8000-000000000006');

insert into public.vinculos (id, familia_id, conta_id, papel, estado) values
  ('bb000000-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'responsavel', 'ativo'),
  ('bb000000-0000-4000-8000-000000000002', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'responsavel', 'ativo'),
  ('bb000000-0000-4000-8000-000000000003', 'ffffffff-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'cuidador', 'ativo'),
  ('bb000000-0000-4000-8000-000000000006', 'ffffffff-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000006', 'responsavel', 'ativo');

-- c1 pendente da família 1 (criado por A); c2 de observador para B voltar; d1 de cuidador da família 2.
insert into public.convites (id, familia_id, papel, criado_por, codigo_hash, expira_em) values
  ('c0000000-0000-4000-8000-0000000000c1', 'ffffffff-0000-4000-8000-000000000001', 'cuidador',
   'aaaaaaaa-0000-4000-8000-000000000001', encode(extensions.digest(repeat('c1', 32), 'sha256'), 'hex'),
   now() + interval '3 days'),
  ('c0000000-0000-4000-8000-0000000000c2', 'ffffffff-0000-4000-8000-000000000001', 'observador',
   'aaaaaaaa-0000-4000-8000-000000000001', encode(extensions.digest(repeat('c2', 32), 'sha256'), 'hex'),
   now() + interval '3 days'),
  ('c0000000-0000-4000-8000-0000000000d1', 'ffffffff-0000-4000-8000-000000000002', 'cuidador',
   'aaaaaaaa-0000-4000-8000-000000000006', encode(extensions.digest(repeat('d1', 32), 'sha256'), 'hex'),
   now() + interval '3 days');

-- R2: as seis funções que agem como membro reconferem vínculo e papel depois da trava. A rebaixa B e
-- B já não age; depois A revoga B e B já não sai. aceitar_convite não exige vínculo ativo: B volta.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000002', 'cuidador')$$,
  'A rebaixa B a cuidador'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'observador')$$,
  '42501', 'sem permissao', 'R2: B rebaixado já não cria convite'
);
select throws_ok(
  $$select public.revogar_convite('c0000000-0000-4000-8000-0000000000c1')$$,
  '42501', 'sem permissao', 'R2: B rebaixado já não revoga convite'
);
select throws_ok(
  $$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000003')$$,
  '42501', 'sem permissao', 'R2: B rebaixado já não revoga vínculo'
);
select throws_ok(
  $$select public.mudar_papel('bb000000-0000-4000-8000-000000000003', 'observador')$$,
  '42501', 'sem permissao', 'R2: B rebaixado já não muda papel'
);
select throws_ok(
  $$select public.excluir_familia('ffffffff-0000-4000-8000-000000000001')$$,
  '42501', 'sem permissao', 'R2: B rebaixado já não exclui a família'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$select public.revogar_vinculo('bb000000-0000-4000-8000-000000000002')$$,
  'A revoga o vínculo de B'
);

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$select public.sair_da_familia('ffffffff-0000-4000-8000-000000000001')$$,
  'P0002', 'familia inexistente', 'R2: B revogado já não sai da família (sem visibilidade: P0002)'
);
select is(
  public.aceitar_convite(repeat('c2', 32)),
  'ffffffff-0000-4000-8000-000000000001'::uuid,
  'R2: aceitar_convite não exige vínculo ativo: B, revogado, volta pelo convite'
);

reset role;

select is(
  (select v.estado::text || '|' || v.papel::text || '|' || v.epoca::text
     from public.vinculos v where v.id = 'bb000000-0000-4000-8000-000000000002'),
  'ativo|observador|4',
  'B voltou como observador na mesma linha (época 1, 2 ao rebaixar, 3 ao revogar, 4 ao voltar)'
);

-- R4: colisão real do hash do código (23505 no insert de convites) vira tente de novo. O gatilho grava
-- antes uma cópia da linha com o mesmo hash, e o insert da função bate na chave única de verdade.
select set_config('teste.foto', pg_temp.foto(), true);

create schema teste_falhas;

create function teste_falhas.duplica_hash() returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() = 1 then
    insert into public.convites (familia_id, papel, criado_por, codigo_hash, expira_em)
    values (new.familia_id, new.papel, new.criado_por, new.codigo_hash, new.expira_em);
  end if;
  return new;
end;
$$;

create function teste_falhas.duplica_vinculo() returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() = 1 then
    insert into public.vinculos (familia_id, conta_id, papel, estado)
    values (new.familia_id, new.conta_id, new.papel, new.estado);
  end if;
  return new;
end;
$$;

create trigger colisao_real before insert on public.convites
  for each row execute function teste_falhas.duplica_hash();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$select public.criar_convite('ffffffff-0000-4000-8000-000000000001', 'cuidador')$$,
  'P0001', 'tente de novo',
  'R4: colisão real do código de convite (23505 em codigo_hash) responde tente de novo'
);

reset role;
drop trigger colisao_real on public.convites;

select is(pg_temp.foto(), current_setting('teste.foto'), 'R4: a colisão não deixou convite gravado');

-- R4: vínculo duplicado de verdade (23505 em vinculos) responde ja e membro, e o convite segue pendente.
create trigger colisao_real before insert on public.vinculos
  for each row execute function teste_falhas.duplica_vinculo();

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$select public.aceitar_convite(repeat('d1', 32))$$,
  'P0001', 'ja e membro',
  'R4: vínculo duplicado de verdade (23505 em vinculos) responde ja e membro'
);

reset role;
drop trigger colisao_real on public.vinculos;

select is(
  (select c.estado::text from public.convites c where c.id = 'c0000000-0000-4000-8000-0000000000d1')
  || '|' || (select count(*)::text from public.vinculos where conta_id = 'aaaaaaaa-0000-4000-8000-000000000004'),
  'pendente|0',
  'R4: o convite não foi consumido e nenhum vínculo foi criado'
);

-- R4 e R6, por leitura do código (45-N1): cada função de ação converte 40P01 e 23502; criar_convite
-- converte a colisão de hash.
select matches(
  (select p.prosrc from pg_proc p
    where p.oid = 'public.criar_convite(uuid, public.papel_familia, timestamptz)'::regprocedure),
  'when unique_violation then\s+raise exception ''tente de novo''',
  'R4: criar_convite converte unique_violation em tente de novo'
);

select is(
  (select count(*)::int from pg_proc p
    where p.oid in (
      'public.criar_convite(uuid, public.papel_familia, timestamptz)'::regprocedure,
      'public.aceitar_convite(text)'::regprocedure,
      'public.revogar_convite(uuid)'::regprocedure,
      'public.mudar_papel(uuid, public.papel_familia)'::regprocedure,
      'public.revogar_vinculo(uuid)'::regprocedure,
      'public.sair_da_familia(uuid)'::regprocedure,
      'public.excluir_conta()'::regprocedure,
      'public.excluir_familia(uuid)'::regprocedure
    )
    and p.prosrc ~ 'when deadlock_detected then\s+raise exception ''tente de novo'''
    and p.prosrc ~ 'when not_null_violation then\s+raise exception ''parametro obrigatorio'''),
  8,
  'R6 e 45-N1: as 8 funções de ação convertem 40P01 em tente de novo e 23502 em parametro obrigatorio'
);

-- R6: lista fechada dos check criados pelas migrações da MAT-45 (e pelas correções do adendo).
select is(
  (select array_agg(c.conname::text order by c.conname)
     from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('public.convites'::regclass, 'public.vinculos'::regclass, 'public.contas'::regclass,
                         'public.familias'::regclass, 'public.bebes'::regclass)),
  array['convites_check'],
  'R6: o único check da MAT-45 é convites_check (estado aceito se e só se aceito_em); nenhum das tabelas da MAT-43'
);

-- R6: nenhuma função de leitura da MAT-45 recebe fuso (então não há 22023 a converter).
select is(
  (select count(*)::int from pg_proc p
    where p.oid in (
      'public.ver_convite(text)'::regprocedure,
      'public.contas_visiveis()'::regprocedure,
      'public.exportar_dados()'::regprocedure
    )
    and coalesce(p.proargnames, array[]::text[]) && array['fuso', 'timezone', 'tz']),
  0,
  'R6: nenhuma função de leitura da MAT-45 recebe fuso como parâmetro'
);

select * from finish();
rollback;
