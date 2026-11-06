-- Dados iniciais do projeto da nuvem (MAT-48b): versão vigente dos termos e primeiro admin.
-- Nada do banco local, sem senha e sem dado pessoal. Um bloco só: falhou, nada muda.
do $$
declare
  v_conta uuid := __CONTA_ADMIN__;
begin
  if not exists (select 1 from public.versoes_termos v where v.vigente) then
    insert into public.versoes_termos (versao, vigente)
    values ('2026-11-05', true)
    on conflict (versao) do update set vigente = true;
  end if;

  if v_conta is not null then
    if not exists (select 1 from public.contas c where c.id = v_conta) then
      raise exception using errcode = 'P0001', message = 'conta inexistente';
    end if;

    insert into public.papeis_plataforma (conta_id, papel, concedido_por, valido_ate)
    values (v_conta, 'admin', null, null)
    on conflict (conta_id, papel) do update set valido_ate = null;
  end if;

  if (select count(*) from public.versoes_termos v where v.vigente) <> 1 then
    raise exception using errcode = 'P0001', message = 'termos sem versao vigente';
  end if;

  if v_conta is not null and not exists (
    select 1 from public.papeis_plataforma p
    where p.conta_id = v_conta and p.papel = 'admin' and p.valido_ate is null
  ) then
    raise exception using errcode = 'P0001', message = 'admin nao concedido';
  end if;
end
$$;
