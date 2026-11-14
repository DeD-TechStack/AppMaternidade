import type { Resultado } from '../dados/comum.ts'
import { OPERACOES_ROTINA, type DadosRotina, type OperacaoRotina } from '../dados/rotina.tipos.ts'

// O envoltório "adiado" dos testes da rotina (RF12, RF-19: "leitura atrasada ignorada"): a operação adiada começa na
// hora, como uma leitura de verdade, mas só devolve o resultado quando o teste manda. Assim o teste solta a leitura
// antiga depois da nova, e confere que a resposta atrasada não vale. Também guarda as chamadas feitas, com os
// argumentos, para a contagem de leituras (RN-03). As falhas simuladas (`simularFalhaRotina`) valem sobre a
// instância de base, antes de ela ser envolvida.

type Operacao = (...argumentos: unknown[]) => Promise<Resultado<unknown>>

export interface RotinaAdiada {
  /** Os dados para o teste injetar: os de `base`, com as chamadas contadas e as adiadas presas. */
  dados: DadosRotina
  /** As próximas chamadas dessas operações ficam presas até `liberar`. */
  adiar(...operacoes: OperacaoRotina[]): void
  /** As próximas chamadas dessas operações voltam ao normal (as já presas continuam presas). */
  deixarDeAdiar(...operacoes: OperacaoRotina[]): void
  /** Quantas chamadas da operação estão presas. */
  presas(operacao: OperacaoRotina): number
  /** Solta a chamada presa de ordem `indice` (0 é a mais antiga ainda presa). */
  liberar(operacao: OperacaoRotina, indice?: number): void
  /** Solta todas as presas da operação, da mais antiga à mais nova. */
  liberarTodas(operacao: OperacaoRotina): void
  /** Os argumentos de cada chamada da operação, em ordem. */
  chamadas(operacao: OperacaoRotina): readonly (readonly unknown[])[]
  /** Quantas vezes a operação foi chamada. */
  contagem(operacao: OperacaoRotina): number
}

export function adiarRotina(base: DadosRotina): RotinaAdiada {
  const adiadas = new Set<OperacaoRotina>()
  const presas = new Map<OperacaoRotina, Array<() => void>>()
  const registro = new Map<OperacaoRotina, unknown[][]>()

  const copia: Record<string, unknown> = {}
  for (const nome of OPERACOES_ROTINA) {
    copia[nome] = async (...argumentos: unknown[]) => {
      registro.set(nome, [...(registro.get(nome) ?? []), argumentos])
      // A operação de base começa agora; o resultado é que fica preso, se a operação está adiada.
      const resultado = (base as unknown as Record<string, Operacao>)[nome].apply(base, argumentos)
      if (!adiadas.has(nome)) return resultado
      await new Promise<void>((soltar) => {
        presas.set(nome, [...(presas.get(nome) ?? []), soltar])
      })
      return resultado
    }
  }

  return {
    dados: copia as unknown as DadosRotina,
    adiar: (...operacoes) => operacoes.forEach((operacao) => adiadas.add(operacao)),
    deixarDeAdiar: (...operacoes) => operacoes.forEach((operacao) => adiadas.delete(operacao)),
    presas: (operacao) => presas.get(operacao)?.length ?? 0,
    liberar(operacao, indice = 0) {
      const fila = presas.get(operacao) ?? []
      const soltar = fila[indice]
      if (soltar === undefined) throw new Error(`Não há a chamada presa ${indice} de ${operacao}.`)
      presas.set(
        operacao,
        fila.filter((_, posicao) => posicao !== indice),
      )
      soltar()
    },
    liberarTodas(operacao) {
      const fila = presas.get(operacao) ?? []
      presas.set(operacao, [])
      for (const soltar of fila) soltar()
    },
    chamadas: (operacao) => registro.get(operacao) ?? [],
    contagem: (operacao) => registro.get(operacao)?.length ?? 0,
  }
}
