import { useContext, useLayoutEffect, useMemo } from 'react'
import type { Resultado } from '../../dados/comum.ts'
import {
  ContextoDadosModeracao,
  OPERACOES_MODERACAO,
  criarDadosModeracao,
  informarContaDaSessaoModeracao,
  type DadosModeracao,
} from '../../dados/moderacao.ts'
import { useSessao } from '../conta/sessao.tsx'

type Operacao = (...argumentos: unknown[]) => Promise<Resultado<unknown>>

/** Qualquer operação que devolva `sessao_encerrada` avisa o provedor de sessão da MAT-37 (leva a `/entrar`). */
function envolver(dados: DadosModeracao, aoEncerrar: () => void): DadosModeracao {
  const copia: Record<string, unknown> = {}
  for (const nome of OPERACOES_MODERACAO) {
    copia[nome] = async (...argumentos: unknown[]) => {
      const operacao = (dados as unknown as Record<string, Operacao>)[nome]
      const resultado = await operacao.apply(dados, argumentos)
      if (!resultado.ok && resultado.erro.classe === 'sessao_encerrada') aoEncerrar()
      return resultado
    }
  }
  return copia as unknown as DadosModeracao
}

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
    () => envolver(injetados ?? criarDadosModeracao(), () => void recarregarConta()),
    [injetados, recarregarConta],
  )
}
