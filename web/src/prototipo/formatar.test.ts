import { describe, expect, it } from 'vitest'
import { formatarCronometro, formatarDuracao, formatarHora } from './formatar.ts'

const MIN = 60_000

describe('formatarDuracao', () => {
  it('usa "h min" a partir de 1 hora e só "min" abaixo', () => {
    expect(formatarDuracao(72 * MIN)).toBe('1 h 12 min')
    expect(formatarDuracao(12 * MIN)).toBe('12 min')
    expect(formatarDuracao(30_000)).toBe('0 min')
  })

  it('com zero minutos acima de 1 hora escreve "2 h 0 min"', () => {
    expect(formatarDuracao(120 * MIN)).toBe('2 h 0 min')
  })

  it('não passa de zero para tempos negativos', () => {
    expect(formatarDuracao(-5_000)).toBe('0 min')
  })
})

describe('formatarCronometro', () => {
  it('mostra mm:ss abaixo de 1 hora', () => {
    expect(formatarCronometro(0)).toBe('00:00')
    expect(formatarCronometro(59_000)).toBe('00:59')
    expect(formatarCronometro(275_000)).toBe('04:35')
  })

  it('mostra h:mm:ss a partir de 1 hora', () => {
    expect(formatarCronometro(3_600_000)).toBe('1:00:00')
    expect(formatarCronometro(61 * MIN)).toBe('1:01:00')
    expect(formatarCronometro(61 * MIN + 10_000)).toBe('1:01:10')
  })

  it('descarta o resto de milissegundos', () => {
    expect(formatarCronometro(59_999)).toBe('00:59')
  })
})

describe('formatarHora', () => {
  it('usa 24 h e dois dígitos', () => {
    expect(formatarHora(new Date(2026, 10, 5, 9, 5).getTime())).toBe('09:05')
    expect(formatarHora(new Date(2026, 10, 5, 17, 2).getTime())).toBe('17:02')
    expect(formatarHora(new Date(2026, 10, 5, 0, 0).getTime())).toBe('00:00')
  })
})
