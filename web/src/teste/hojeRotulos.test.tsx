import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import type { FixtureRotina } from '../dados/rotina.memoria.ts'
import type { Registro, TipoRegistro } from '../dados/rotina.tipos.ts'
import { renderizarRotaPronta } from './renderizarRota.tsx'
import { PESSOAS } from './renderizarComDados.tsx'

// HOJE-ROT-1 (RF-04): o número do sono em "Hoje até agora" é só o sono concluído, e o tempo de uma sessão
// em "Últimos" é o fim dela. Só os rótulos mudam; os números, não. Relógio parado às 19:54:02 de 17/11/2026
// (hora do aparelho), como no hoje.test.tsx.

const AGORA = new Date('2026-11-17T19:54:02')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(AGORA)
})

const regiao = (nome: string) => screen.getByRole('region', { name: nome })

/** Um registro com o mínimo que a tela lê; `modelo` dá o bebê, a família e o fuso da fixture. */
function registro(modelo: Registro, numero: number, tipo: TipoRegistro, inicio: string, fim: string | null): Registro {
  const marco = new Date(fim ?? inicio).toISOString()
  return {
    ...modelo,
    id: `a0000000-0000-7000-8000-${String(900 + numero).padStart(12, '0')}`,
    tipo,
    inicio: new Date(inicio).toISOString(),
    fim: fim === null ? null : new Date(fim).toISOString(),
    detalhes: {},
    nota: null,
    criadoPor: PESSOAS.juliana.id,
    encerradoPor: fim === null ? null : PESSOAS.juliana.id,
    recebidoEm: marco,
    atualizadoEm: marco,
  }
}

type Linha = [tipo: TipoRegistro, inicio: string, fim: string | null]

/** A fixture só com os registros dados (nenhum outro, nem nota). */
const so =
  (...linhas: Linha[]) =>
  (fixture: FixtureRotina): FixtureRotina => ({
    notas: [],
    registros: linhas.map(([tipo, inicio, fim], i) => registro(fixture.registros[0], i + 1, tipo, inicio, fim)),
  })

const SONO_DE_ONTEM_E_ABERTO = so(
  ['sono', '2026-11-16T20:30:00', '2026-11-16T23:50:00'],
  ['sono', '2026-11-17T18:42:00', null],
)

const colunas = () =>
  [...document.querySelectorAll<HTMLElement>('main #ultimos .sb-numeros-item')].map((item) =>
    [...item.querySelectorAll('p')].map((p) => p.textContent),
  )

describe('Hoje: o que os rótulos dizem que os números contam', () => {
  it('(a) "Hoje até agora" chama o sono de "Sono concluído", e o valor continua 0 h 00 com só um sono em andamento', async () => {
    await renderizarRotaPronta('/app/hoje', { ajustarRotina: SONO_DE_ONTEM_E_ABERTO })

    const itens = within(regiao('Hoje até agora')).getAllByRole('listitem')
    const spans = itens.map((li) => [...li.querySelectorAll('span')].map((s) => s.textContent))
    expect(spans.map((s) => s[1])).toEqual(['Mamadas', 'Mamadeiras', 'Fraldas', 'Sono concluído'])
    expect(spans[3][0]).toBe('0 h 00')
  })

  it('(b) em "Últimos", a hora do sono de ontem diz que é o fim: "Sono, fim ontem"', async () => {
    await renderizarRotaPronta('/app/hoje', { ajustarRotina: SONO_DE_ONTEM_E_ABERTO })

    const coluna = colunas().find((c) => c[0] === '23:50')
    expect(coluna).toEqual(['23:50', 'Sono, fim ontem'])
  })

  it('(c) sessões de agora e de dias atrás: "Mamada, fim" e "Tummy time, fim"', async () => {
    await renderizarRotaPronta('/app/hoje', {
      ajustarRotina: so(
        ['mamada', '2026-11-17T19:20:00', '2026-11-17T19:53:32'],
        ['tummy', '2026-11-14T10:00:00', '2026-11-14T10:15:00'],
      ),
    })

    const todas = colunas()
    expect(todas.find((c) => c[1]?.startsWith('Mamada'))).toEqual(['agora', 'Mamada, fim'])
    expect(todas.find((c) => c[1]?.startsWith('Tummy'))).toEqual(['14/11 10:15', 'Tummy time, fim'])
  })

  it('(d) tipos pontuais seguem como eram: "Fralda, ontem" e "Mamadeira, tempo desde o registro"', async () => {
    await renderizarRotaPronta('/app/hoje', {
      ajustarRotina: so(['fralda', '2026-11-16T21:10:00', null], ['mamadeira', '2026-11-17T17:30:00', null]),
    })

    const todas = colunas()
    expect(todas.find((c) => c[1]?.startsWith('Fralda'))).toEqual(['21:10', 'Fralda, ontem'])
    expect(todas.find((c) => c[1]?.startsWith('Mamadeira'))).toEqual(['2 h 24', 'Mamadeira, tempo desde o registro'])
  })
})
