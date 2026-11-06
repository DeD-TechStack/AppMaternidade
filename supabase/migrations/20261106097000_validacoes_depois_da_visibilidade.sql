-- MAT-45, adendo R-B, R3: nenhuma validação de valor roda antes de conferir visibilidade e escrita.
-- Os WITH CHECK da RLS rodam depois dos gatilhos BEFORE; sem esta correção, um insert direto de bebê
-- com nascimento no futuro, em família alheia ou inexistente, respondia 23514 (ou um erro que depende
-- do fuso da família) em vez do 42501 da RLS, e isso vaza a existência da família. O mesmo vale para
-- o insert de conta com id alheio e fuso inválido.
--
-- Regra: quando a escrita vem do papel authenticated (o único que passa pela RLS) com sessão
-- (auth.uid() não nulo) e a linha não passaria na política de escrita da RLS (papel exigido e, no
-- insert de bebê, criado_por = auth.uid()), o gatilho não valida o valor e devolve a linha; a RLS nega
-- logo depois, com o mesmo erro de um valor válido. Sem auth.uid() ou fora do papel
-- authenticated (seed, dono do banco, service_role) a validação segue como antes; um claim que sobrou
-- na sessão do dono depois de um reset role não conta.
-- Isso só vale porque a RLS barra todo insert e update direto de quem não é responsável da família:
-- função security definer nova que grave bebê em nome de quem não é responsável precisa validar sozinha.
--
-- Trava e rollback: create or replace function não trava tabela nem reescreve linha; os gatilhos
-- continuam os mesmos. Rollback: recriar as duas funções com o texto de 20261106090100.

-- Fuso fora de pg_timezone_names → 23514. Fuso nulo passa: quem o recusa é o not null.
-- Em contas, o insert com id que não é o do chamador fica para a RLS (contas_insert, que é só
-- id = auth.uid(), então este pulo espelha a política inteira).
-- Em famílias, o insert direto não tem privilégio (42501) e o update só alcança linhas que a RLS deixa;
-- criar_familia insere como o próprio chamador e segue validada.
create or replace function public.validar_fuso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'contas'
     and tg_op = 'INSERT'
     and current_setting('role', true) = 'authenticated'
     and (select auth.uid()) is not null
     and new.id is distinct from (select auth.uid())
  then
    return new;
  end if;

  if new.fuso is not null and not exists (
    select 1 from pg_catalog.pg_timezone_names z where z.name = new.fuso
  ) then
    raise exception 'fuso invalido' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.validar_fuso() from public, anon;
grant execute on function public.validar_fuso() to authenticated;

-- Nascimento maior que o hoje da família (data de agora no fuso da família) → 23514.
-- A regra não depende do TimeZone da sessão. Mudar o fuso da família não reconfere os bebês.
-- Com sessão authenticated, o gatilho espelha a política da RLS inteira: no insert, só chega à regra
-- de valor quem é responsável ativo da família E grava criado_por = auth.uid() (bebes_insert); no
-- update, só quem é responsável ativo (bebes_update não olha criado_por). Os demais (família alheia
-- ou inexistente, cuidador, observador, vínculo inativo, criado_por de outra conta ou nulo) recebem o
-- 42501 da RLS, com qualquer nascimento.
create or replace function public.validar_nascimento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoje date;
begin
  if current_setting('role', true) = 'authenticated' and (select auth.uid()) is not null then
    -- Espelha a política da RLS: bebes_insert = responsável ativo E criado_por = auth.uid();
    -- bebes_update = só responsável ativo (não olha criado_por).
    if not public.tem_vinculo_ativo(new.familia_id, array['responsavel']::public.papel_familia[])
       or (tg_op = 'INSERT' and new.criado_por is distinct from (select auth.uid()))
    then
      return new;
    end if;
  end if;

  select (now() at time zone f.fuso)::date
    into v_hoje
    from public.familias f
   where f.id = new.familia_id;

  if found and new.nascimento > v_hoje then
    raise exception 'nascimento no futuro' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.validar_nascimento() from public, anon;
grant execute on function public.validar_nascimento() to authenticated;
