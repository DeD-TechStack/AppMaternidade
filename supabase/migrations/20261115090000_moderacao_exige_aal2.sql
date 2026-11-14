-- SEC-01 (SEC-REV, ameaça T1): os poderes de moderador e de admin exigem a sessão em aal2 no banco, não só
-- na tela. Decisão do líder em 14/11/2026 (ordens-vigentes D2, escolha técnica; a pergunta A/B do cartão foi
-- lida como decidida): opção A, aal2 sempre, sem interruptor no servidor. O interruptor do cliente
-- (VITE_MODERACAO_MFA) continua só na tela e nunca é a fonte da verdade.
--
-- public.tem_papel_plataforma é a porta única: moderar_conteudo, decidir_denuncia, conceder_papel_plataforma
-- e revogar_papel_plataforma recusam com 42501 'sem papel de plataforma' quando ela devolve false, e as
-- políticas denuncias_select, auditoria_moderacao_select e papeis_plataforma_select (ver todos, do admin)
-- a usam. As auxiliares de leitura (pode_ler_perfil, pode_ler_topico, pode_ler_resposta) também: em aal1,
-- a moderação lê a comunidade como qualquer conta. Agora ela só devolve true quando o claim aal do JWT é
-- 'aal2'; claim ausente ou aal1 valem como sessão só com senha. O claim é lido de request.jwt.claims (o que
-- o PostgREST preenche com o JWT verificado, a mesma fonte de auth.jwt()), porque o catálogo (com_01) só
-- admite auth.uid nos corpos de função.
--
-- Mesma assinatura, security definer, search_path vazio; revoke de public e anon e grant para authenticated
-- repetidos. Nenhuma tabela, política, gatilho ou dado muda.
--
-- Trava e rollback: create or replace function toma só o lock de linha no catálogo (pg_proc), sem tocar
-- tabela de dados; é instantâneo e roda dentro da transação da migração.
--   Rollback: recriar a versão anterior, que é a definição de 20261105194710 (sem a condição do aal).
--   Nada para desfazer em dados. Antes de levar à nuvem, o TOTP precisa estar ligado no Auth (SEC-04).
create or replace function public.tem_papel_plataforma(p_papeis public.papel_plataforma[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal', '') = 'aal2'
    and exists (
      select 1
      from public.papeis_plataforma pp
      where pp.conta_id = (select auth.uid())
        and pp.papel = any (p_papeis)
        and (pp.valido_ate is null or pp.valido_ate > now())
    );
$$;

revoke execute on function public.tem_papel_plataforma(public.papel_plataforma[]) from public, anon;
grant execute on function public.tem_papel_plataforma(public.papel_plataforma[]) to authenticated;
