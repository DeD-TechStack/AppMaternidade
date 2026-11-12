import { useContext, useLayoutEffect, useMemo } from 'react'
import type { Resultado } from '../../dados/comum.ts'
import {
  ContextoDadosComunidade,
  OPERACOES_COMUNIDADE,
  criarDadosComunidade,
  informarContaDaSessao,
  type DadosComunidade,
} from '../../dados/comunidade.ts'
import { useSessao } from '../conta/sessao.tsx'

type Operacao = (...argumentos: unknown[]) => Promise<Resultado<unknown>>

/**
 * Qualquer operação que devolva `sessao_encerrada` avisa o provedor de sessão da MAT-37, que leva a
 * pessoa a `/entrar?volta=...`. A operação é procurada na hora da chamada, para o teste poder trocá-la.
 */
function envolver(dados: DadosComunidade, aoEncerrar: () => void): DadosComunidade {
  const copia: Record<string, unknown> = {}
  for (const nome of OPERACOES_COMUNIDADE) {
    copia[nome] = async (...argumentos: unknown[]) => {
      const operacao = (dados as unknown as Record<string, Operacao>)[nome]
      const resultado = await operacao.apply(dados, argumentos)
      if (!resultado.ok && resultado.erro.classe === 'sessao_encerrada') aoEncerrar()
      return resultado
    }
  }
  return copia as unknown as DadosComunidade
}

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
    () => envolver(injetados ?? criarDadosComunidade(), () => void recarregarConta()),
    [injetados, recarregarConta],
  )
}
