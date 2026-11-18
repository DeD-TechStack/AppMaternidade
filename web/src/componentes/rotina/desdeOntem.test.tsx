import { render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DesdeUltimoRegistro } from './BlocosDoHoje.tsx'

// QH-07: o título "Desde o seu último registro" diz QUANDO foi o marco, e não só a hora: o dia de ontem leva `ontem`,
// um dia mais antigo leva a data `DD/MM`, e o mesmo dia fica só com a hora. O calendário é o do aparelho (o mesmo de
// `formatarHora`): o fuso do aparelho é fixado em America/Sao_Paulo com `process.env.TZ` e restaurado no fim, e o
// relógio é fixo com `vi.setSystemTime` (só `Date`); o instante atual também vai pela prop `agora`. O fuso entra em
// `beforeAll`, então `AGORA` e os marcos são montados dentro de funções, depois que o `TZ` já valeu, e não na carga do módulo.

const FUSO = 'America/Sao_Paulo'
const TZ_ORIGINAL = process.env.TZ

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** Hoje, no calendário do aparelho: 18/11/2026, 12:47. */
const agora = (): Date => new Date(2026, 10, 18, 12, 47, 0, 0)

/** `hora:minuto` de `diasAtras` dias antes de hoje, no calendário do aparelho. */
function marco(diasAtras: number, hora: number, minuto: number): Date {
  const hoje = agora()
  return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diasAtras, hora, minuto, 0, 0)
}

/** Desenha o bloco com o relógio e a prop `agora` em `agoraEm` (padrão: hoje às 12:47). */
function desenhar(marcoEm: Date, agoraEm: Date = agora()) {
  vi.setSystemTime(agoraEm)
  render(<DesdeUltimoRegistro marcoEm={marcoEm.getTime()} registros={[]} fuso={FUSO} autorDe={() => 'Bruno'} agora={agoraEm.getTime()} />)
  return screen.getByRole('heading', { level: 2 })
}

describe('QH-07: o título de "Desde o seu último registro" diz o dia do marco', () => {
  beforeAll(() => {
    process.env.TZ = FUSO
  })
  // O `setup.ts` volta ao relógio real depois de cada teste: o relógio falso é ligado a cada teste, o fuso uma vez.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(agora())
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  afterAll(() => {
    if (TZ_ORIGINAL === undefined) delete process.env.TZ
    else process.env.TZ = TZ_ORIGINAL
  })

  it('ontem: um marco de ontem às 16:20 leva "ontem" antes da hora', () => {
    const titulo = desenhar(marco(1, 16, 20))
    expect(titulo.textContent).toBe('Desde o seu último registro, ontem às 16:20')
  })

  it('dois dias: um marco de dois dias atrás às 16:20 leva a data DD/MM antes da hora', () => {
    const dia = marco(2, 16, 20)
    const titulo = desenhar(dia)
    const data = `${doisDigitos(dia.getDate())}/${doisDigitos(dia.getMonth() + 1)}`
    expect(data).toBe('16/11')
    expect(titulo.textContent).toBe(`Desde o seu último registro, em ${data} às 16:20`)
  })

  it('mesmo dia: um marco de hoje às 07:50 fica só com a hora', () => {
    const titulo = desenhar(marco(0, 7, 50))
    expect(titulo.textContent).toBe('Desde o seu último registro, às 07:50')
  })

  it('virada da meia-noite: às 00:10 de 18/11, um marco de 17/11 às 23:50 é "ontem"', () => {
    const meiaNoiteEDez = new Date(2026, 10, 18, 0, 10, 0, 0)
    const titulo = desenhar(new Date(2026, 10, 17, 23, 50, 0, 0), meiaNoiteEDez)
    expect(titulo.textContent).toBe('Desde o seu último registro, ontem às 23:50')
  })
})
