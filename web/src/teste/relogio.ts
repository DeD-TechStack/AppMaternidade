import { vi } from 'vitest'

// Um teste que estoura o tempo deixa o corpo assíncrono vivo ("zumbi"): o Vitest não o aborta, e o que ele escreve
// depois cai dentro do teste seguinte. O relógio é o caso pior: um `vi.setSystemTime` tardio muda a hora do outro teste.
// Cada teste tem uma geração; o setter devolvido por `relogioDoTeste()` só vale na geração em que foi pedido.

let geracao = 0

/** Abre a geração de um teste novo. O `setup.ts` chama no `beforeEach` e no `afterEach`. */
export function iniciarTeste(): void {
  geracao += 1
}

/** Pede o setter do relógio do teste atual. Chame no começo do teste, com o relógio falso já ligado. */
export function relogioDoTeste(): (data: Date | number) => void {
  const minha = geracao
  return (data) => {
    if (minha !== geracao) throw new Error('relógio de um teste já encerrado')
    vi.setSystemTime(data)
  }
}
