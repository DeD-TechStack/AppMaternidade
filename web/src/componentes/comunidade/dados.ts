import { useContext, useLayoutEffect, useMemo } from 'react'
import {
  ContextoDadosComunidade,
  OPERACOES_COMUNIDADE,
  criarDadosComunidade,
  informarContaDaSessao,
  type DadosComunidade,
} from '../../dados/comunidade.ts'
import { useSessao } from '../conta/sessao.tsx'
import { envolverOperacoes } from '../envolverOperacoes.ts'

/** Os dados da Comunidade da página (ou os que o teste injetou), ligados à sessão da MAT-37. */
export function useDadosComunidade(): DadosComunidade {
  const injetados = useContext(ContextoDadosComunidade)
  const { usuario, recarregarConta } = useSessao()
  const idDaConta = usuario?.id ?? null

  // No modo memória, a conta entrada é a que a MAT-37 leu. No modo Supabase, quem manda é o cliente.
  useLayoutEffect(() => {
    informarContaDaSessao(idDaConta)
  }, [idDaConta])

  return useMemo(
    // Qualquer operação que devolva `sessao_encerrada` avisa o provedor de sessão da MAT-37, que leva a
    // pessoa a `/entrar?volta=...`.
    () => envolverOperacoes(injetados ?? criarDadosComunidade(), OPERACOES_COMUNIDADE, () => void recarregarConta()),
    [injetados, recarregarConta],
  )
}
