import type { Resultado } from '../dados/comum.ts'

type Operacao = (...argumentos: unknown[]) => Promise<Resultado<unknown>>

/**
 * Devolve uma cópia de `dados` em que cada operação de `nomes` que devolva `sessao_encerrada` avisa
 * `aoEncerrar` (RF-11), uma vez por chamada, e devolve o resultado sem mudança. A operação é procurada
 * em `dados` na hora da chamada, para o teste poder trocá-la por um espião. `extras` são propriedades
 * copiadas para a cópia como estão (por exemplo, `aoMudarSessao` da conta).
 */
export function envolverOperacoes<T extends object>(
  dados: T,
  nomes: readonly string[],
  aoEncerrar: () => void,
  extras: Record<string, unknown> = {},
): T {
  const copia: Record<string, unknown> = { ...extras }
  for (const nome of nomes) {
    copia[nome] = async (...argumentos: unknown[]) => {
      const operacao = (dados as unknown as Record<string, Operacao>)[nome]
      const resultado = await operacao.apply(dados, argumentos)
      if (!resultado.ok && resultado.erro.classe === 'sessao_encerrada') aoEncerrar()
      return resultado
    }
  }
  return copia as unknown as T
}
