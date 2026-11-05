-- Funções de vínculo: verificação usada pelas políticas e criação de família.
-- Ambas são security definer e usam só auth.uid() como conta; nenhuma recebe a conta por parâmetro.

-- Vínculo ativo: estado 'ativo' e valido_ate nulo ou no futuro, com um dos papéis pedidos.
create function public.tem_vinculo_ativo(familia uuid, papeis public.papel_familia[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vinculos v
    where v.familia_id = familia
      and v.conta_id = (select auth.uid())
      and v.papel = any (papeis)
      and v.estado = 'ativo'
      and (v.valido_ate is null or v.valido_ate > now())
  );
$$;

revoke execute on function public.tem_vinculo_ativo(uuid, public.papel_familia[]) from public, anon;
grant execute on function public.tem_vinculo_ativo(uuid, public.papel_familia[]) to authenticated;

-- Cria a família e o vínculo de responsável da conta chamadora na mesma transação.
create function public.criar_familia(nome text, fuso text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid := auth.uid();
  v_familia uuid;
begin
  if not exists (select 1 from public.contas c where c.id = v_conta) then
    raise exception 'conta inexistente';
  end if;

  if criar_familia.nome is null or btrim(criar_familia.nome) = '' then
    raise exception 'nome vazio';
  end if;

  insert into public.familias (nome, fuso, criada_por)
  values (criar_familia.nome, criar_familia.fuso, v_conta)
  returning id into v_familia;

  insert into public.vinculos (familia_id, conta_id, papel, estado)
  values (v_familia, v_conta, 'responsavel', 'ativo');

  return v_familia;
end;
$$;

revoke execute on function public.criar_familia(text, text) from public, anon;
grant execute on function public.criar_familia(text, text) to authenticated;
