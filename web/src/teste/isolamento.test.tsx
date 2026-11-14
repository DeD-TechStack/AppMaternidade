import { render } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'
import { rodarAxe } from './axe.ts'
import { iniciarTeste, relogioDoTeste } from './relogio.ts'

// O isolamento entre testes quando um teste estoura o tempo e o corpo dele ("zumbi") segue vivo: o relógio e o axe
// não podem vazar para o teste seguinte. Aqui nada espera tempo de verdade.

describe('o relógio de um teste que já terminou', () => {
  it('o setter de um teste encerrado lança e não mexe no relógio; o de um teste novo funciona', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const hoje = new Date(2026, 10, 12, 15, 0, 0)
    vi.setSystemTime(hoje)
    const mudar = relogioDoTeste()

    // O teste seguinte começa: a geração muda.
    iniciarTeste()

    expect(() => mudar(new Date(2026, 10, 12, 19, 35, 0))).toThrow('relógio de um teste já encerrado')
    expect(Date.now()).toBe(hoje.getTime())

    const novo = relogioDoTeste()
    const depois = new Date(2026, 10, 12, 16, 0, 0)
    novo(depois)
    expect(Date.now()).toBe(depois.getTime())
  })

  it('o setter vale enquanto o teste é o mesmo, com Date ou com número', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const mudar = relogioDoTeste()
    mudar(new Date(2026, 10, 12, 8, 0, 0))
    expect(Date.now()).toBe(new Date(2026, 10, 12, 8, 0, 0).getTime())
    mudar(new Date(2026, 10, 12, 9, 0, 0).getTime())
    expect(Date.now()).toBe(new Date(2026, 10, 12, 9, 0, 0).getTime())
  })
})

describe('o axe em execuções sobrepostas', () => {
  const opcoes = { rules: { 'color-contrast': { enabled: false } } }

  it('`rodarAxe` enfileira: duas execuções ao mesmo tempo terminam, sem "already running"', async () => {
    const { container } = render(
      <main>
        <h1>x</h1>
      </main>,
    )

    const [primeira, segunda] = await Promise.all([rodarAxe(container, opcoes), rodarAxe(container, opcoes)])

    expect(Array.isArray(primeira.violations)).toBe(true)
    expect(Array.isArray(segunda.violations)).toBe(true)
  })

  it('uma execução que falha não trava a fila', async () => {
    const { container } = render(
      <main>
        <h1>x</h1>
      </main>,
    )

    // Um contexto que não acha nenhum elemento faz a execução recusar; a seguinte tem de rodar do mesmo jeito.
    const falha = rodarAxe('#elemento-que-nao-existe', opcoes)
    const seguinte = rodarAxe(container, opcoes)

    await expect(falha).rejects.toBeInstanceOf(Error)
    const resultado = await seguinte
    expect(Array.isArray(resultado.violations)).toBe(true)
  })

  it('o defeito: duas chamadas diretas de `axe.run` ao mesmo tempo, uma delas recusa com "already running"', async () => {
    const { container } = render(
      <main>
        <h1>x</h1>
      </main>,
    )

    const resultados = await Promise.allSettled([
      (async () => axe.run(container, opcoes))(),
      (async () => axe.run(container, opcoes))(),
    ])

    const recusadas = resultados.filter((resultado): resultado is PromiseRejectedResult => resultado.status === 'rejected')
    expect(recusadas.length).toBeGreaterThanOrEqual(1)
    expect(recusadas.some((recusa) => /already running/.test(String((recusa.reason as Error)?.message ?? recusa.reason)))).toBe(true)
  })
})
