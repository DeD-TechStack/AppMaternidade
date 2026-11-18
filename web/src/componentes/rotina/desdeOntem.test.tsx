import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DesdeUltimoRegistro } from './BlocosDoHoje.tsx'

// QH-07: o título "Desde o seu último registro" diz QUANDO foi o marco, e não só a hora: o dia de ontem leva `ontem`,
// um dia mais antigo leva a data `DD/MM`, e o mesmo dia fica só com a hora. O calendário é o do aparelho (o mesmo de
// `formatarHora`): o instante é montado com `new Date(ano, mês, dia, hora, minuto)` e a data esperada é lida do mesmo
// calendário, então a expectativa não muda com o fuso da máquina que roda o teste (nenhum teste do web fixa `TZ`;
// o relógio é fixo com `vi.setSystemTime`, e o instante atual também vai pela prop `agora`).

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** Hoje, no calendário do aparelho: 18/11/2026, 12:47. */
const AGORA = new Date(2026, 10, 18, 12, 47, 0, 0)

/** `hora:minuto` de `diasAtras` dias antes de hoje, no calendário do aparelho. */
function marco(diasAtras: number, hora: number, minuto: number): Date {
  return new Date(AGORA.getFullYear(), AGORA.getMonth(), AGORA.getDate() - diasAtras, hora, minuto, 0, 0)
}

function desenhar(marcoEm: Date) {
  render(<DesdeUltimoRegistro marcoEm={marcoEm.getTime()} registros={[]} fuso="America/Sao_Paulo" autorDe={() => 'Bruno'} agora={AGORA.getTime()} />)
  return screen.getByRole('heading', { level: 2 })
}

describe('QH-07: o título de "Desde o seu último registro" diz o dia do marco', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AGORA)
  })
  afterEach(() => {
    vi.useRealTimers()
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
})
