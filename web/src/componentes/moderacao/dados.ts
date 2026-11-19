import { useContext, useLayoutEffect, useMemo } from 'react'
import {
  ContextoDadosModeracao,
  OPERACOES_MODERACAO,
  criarDadosModeracao,
  informarContaDaSessaoModeracao,
  type DadosModeracao,
} from '../../dados/moderacao.ts'
import { useSessao } from '../conta/sessao.tsx'
import { envolverOperacoes } from '../envolverOperacoes.ts'

/** Os dados do painel da página (ou os que o teste injetou), ligados à sessão da MAT-37. */
export function useDadosModeracao(): DadosModeracao {
  const injetados = useContext(ContextoDadosModeracao)
  const { usuario, recarregarConta } = useSessao()
  const idDaConta = usuario?.id ?? null

  // No modo memória, a conta entrada é a que a MAT-37 leu. No modo Supabase, quem manda é o cliente.
  useLayoutEffect(() => {
    informarContaDaSessaoModeracao(idDaConta)
  }, [idDaConta])

  return useMemo(
    // Qualquer operação que devolva `sessao_encerrada` avisa o provedor de sessão da MAT-37 (leva a `/entrar`).
    () => envolverOperacoes(injetados ?? criarDadosModeracao(), OPERACOES_MODERACAO, () => void recarregarConta()),
    [injetados, recarregarConta],
  )
}
