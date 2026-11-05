-- MAT-45, migração 2: validações de fuso IANA e de nascimento (D13).
-- A MAT-43 adiou as duas regras; pela D19 elas entram aqui, no banco.

-- Fuso fora de pg_timezone_names → 23514. Fuso nulo passa: quem o recusa é o not null.
create function public.validar_fuso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create trigger contas_validar_fuso
  before insert or update of fuso on public.contas
  for each row execute function public.validar_fuso();

create trigger familias_validar_fuso
  before insert or update of fuso on public.familias
  for each row execute function public.validar_fuso();

-- Nascimento maior que o hoje da família (data de agora no fuso da família) → 23514.
-- A regra não depende do TimeZone da sessão. Mudar o fuso da família não reconfere os bebês.
create function public.validar_nascimento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoje date;
begin
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

create trigger bebes_validar_nascimento
  before insert or update of nascimento on public.bebes
  for each row execute function public.validar_nascimento();
