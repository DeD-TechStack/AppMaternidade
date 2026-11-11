import { describe, expect, it, vi } from 'vitest'
import { diaDaFamilia, ehDiaValido, formatarIdade, inicioDoDia, janelaDoDia, lerAparelho } from './rotina.dia.ts'

describe('dia da família', () => {
  it('o dia é a data do instante no fuso da família, não no do aparelho', () => {
    // 02:30 UTC de 5/11 ainda é 4/11 em São Paulo (23:30).
    const instante = Date.parse('2026-11-05T02:30:00Z')
    expect(diaDaFamilia(instante, 'America/Sao_Paulo')).toBe('2026-11-04')
    expect(diaDaFamilia(instante, 'UTC')).toBe('2026-11-05')
  })

  it('a janela de um dia em São Paulo vai de 03:00 UTC a 03:00 UTC do dia seguinte', () => {
    expect(janelaDoDia('2026-11-05', 'America/Sao_Paulo')).toEqual({
      de: '2026-11-05T03:00:00.000Z',
      ate: '2026-11-06T03:00:00.000Z',
    })
  })

  it('a janela acompanha o horário de verão: o dia da mudança tem 23 horas', () => {
    const { de, ate } = janelaDoDia('2026-03-08', 'America/New_York')
    expect(de).toBe('2026-03-08T05:00:00.000Z')
    expect(ate).toBe('2026-03-09T04:00:00.000Z')
    expect((Date.parse(ate) - Date.parse(de)) / 3_600_000).toBe(23)
  })

  it('o instante de 23:59 e o de 00:00 caem em dias diferentes da janela', () => {
    const { de, ate } = janelaDoDia('2026-11-05', 'America/Sao_Paulo')
    expect(diaDaFamilia(Date.parse(de), 'America/Sao_Paulo')).toBe('2026-11-05')
    expect(diaDaFamilia(Date.parse(de) - 1, 'America/Sao_Paulo')).toBe('2026-11-04')
    expect(diaDaFamilia(Date.parse(ate), 'America/Sao_Paulo')).toBe('2026-11-06')
  })

  it('dia impossível não tem janela', () => {
    expect(ehDiaValido('2026-02-30')).toBe(false)
    expect(ehDiaValido('2026-02-28')).toBe(true)
    expect(Number.isNaN(inicioDoDia('2026-13-01', 'UTC'))).toBe(true)
    expect(() => janelaDoDia('2026-02-30', 'UTC')).toThrow()
  })
})

describe('fuso e deslocamento do aparelho', () => {
  it('o deslocamento é o oposto de getTimezoneOffset (São Paulo = -180)', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(180)
    expect(lerAparelho().deslocamentoMin).toBe(-180)
  })

  it('a leste de UTC o deslocamento é positivo, e em UTC é 0 (nunca -0)', () => {
    const espiao = vi.spyOn(Date.prototype, 'getTimezoneOffset')
    espiao.mockReturnValue(-330)
    expect(lerAparelho().deslocamentoMin).toBe(330)
    espiao.mockReturnValue(0)
    expect(Object.is(lerAparelho().deslocamentoMin, 0)).toBe(true)
  })

  it('o fuso vem do Intl do aparelho', () => {
    expect(lerAparelho().fuso).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })
})

describe('idade do bebê por unidades completas de calendário', () => {
  const idade = (nascimento: string, hoje: string) => formatarIdade(nascimento, hoje)

  it('antes de 1 mês completo, em dias', () => {
    expect(idade('2026-11-05', '2026-11-05')).toBe('0 dias')
    expect(idade('2026-11-04', '2026-11-05')).toBe('1 dia')
    expect(idade('2026-10-06', '2026-11-05')).toBe('30 dias')
  })

  it('um mês se completa no mesmo dia do mês seguinte', () => {
    expect(idade('2026-10-05', '2026-11-05')).toBe('1 mês')
    expect(idade('2026-08-05', '2026-11-05')).toBe('3 meses')
    expect(idade('2026-08-06', '2026-11-05')).toBe('2 meses')
  })

  it('nascida em 31/01 completa 1 mês em 28/02 (ou 29/02 no ano bissexto)', () => {
    expect(idade('2026-01-31', '2026-02-27')).toBe('27 dias')
    expect(idade('2026-01-31', '2026-02-28')).toBe('1 mês')
    expect(idade('2024-01-31', '2024-02-28')).toBe('28 dias')
    expect(idade('2024-01-31', '2024-02-29')).toBe('1 mês')
  })

  it('de 1 a 23 meses em meses e, com 24 meses ou mais, em anos completos', () => {
    expect(idade('2025-11-05', '2026-11-05')).toBe('12 meses')
    expect(idade('2024-12-05', '2026-11-05')).toBe('23 meses')
    expect(idade('2024-11-05', '2026-11-05')).toBe('2 anos')
    expect(idade('2024-11-06', '2026-11-05')).toBe('23 meses')
    expect(idade('2023-11-06', '2026-11-05')).toBe('2 anos')
  })

  it('29/02 completa o aniversário em 28/02 nos anos comuns', () => {
    expect(idade('2024-02-29', '2026-02-27')).toBe('23 meses')
    expect(idade('2024-02-29', '2026-02-28')).toBe('2 anos')
  })
})
