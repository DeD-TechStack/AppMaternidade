import { render } from '@testing-library/react'
import axe from 'axe-core'
import { afterAll, describe, expect, it, vi } from 'vitest'
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

// A fila do `rodarAxe` tira o "already running", mas o axe não cancela uma execução: a do teste que estourou o tempo
// seguia viva e o teste seguinte gastava o orçamento dele esperando na fila. O `afterEach` do `setup.ts` espera a
// execução velha terminar antes de o teste seguinte começar. Os dois testes abaixo rodam na ordem do arquivo.
describe('o axe de um teste que estourou o tempo', () => {
  let terminou = false

  afterAll(() => {
    // Devolve as regras e as verificações do axe ao padrão: a regra lenta não vaza para outros testes.
    axe.reset()
  })

  it.fails('A estoura o tempo com um axe real pendente', { timeout: 100 }, async () => {
    render(
      <main>
        <h1>x</h1>
      </main>,
    )
    axe.configure({
      checks: [
        {
          id: 'lento',
          evaluate() {
            const terminar = this.async()
            setTimeout(() => terminar(true), 600)
          },
        },
      ],
      rules: [{ id: 'regra-lenta', selector: 'h1', any: ['lento'], enabled: true }],
    })

    // A execução leva ~600 ms, e o teste só tem 100 ms: estoura o tempo com o axe ainda rodando.
    await rodarAxe(document.body, { runOnly: { type: 'rule', values: ['regra-lenta'] } }).finally(() => {
      terminou = true
    })
  })

  it('B roda um axe comum dentro do mesmo orçamento de 100 ms, com o axe do A já encerrado', { timeout: 100 }, async () => {
    expect(terminou).toBe(true)

    const { container } = render(
      <main>
        <h1>x</h1>
      </main>,
    )
    const resultado = await rodarAxe(container, { runOnly: { type: 'rule', values: ['region'] } })

    expect(resultado.violations).toEqual([])
  })
})
