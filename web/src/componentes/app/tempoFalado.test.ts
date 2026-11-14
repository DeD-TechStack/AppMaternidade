import { describe, expect, it } from 'vitest'
import { tempoFalado } from './tempoFalado.ts'

// A forma falada do cronômetro (A11Y-010): "1:12:07" lido como "1 hora, 12 minutos e 7 segundos". Zero à
// esquerda não se lê: abaixo de 1 hora não há parte de horas, e abaixo de 1 minuto só os segundos.

describe('tempoFalado: o texto do leitor de tela para o cronômetro', () => {
  it.each([
    ['0:00:59', '59 segundos'],
    ['00:59', '59 segundos'],
    ['0:12:07', '12 minutos e 7 segundos'],
    ['12:07', '12 minutos e 7 segundos'],
    ['1:12:07', '1 hora, 12 minutos e 7 segundos'],
    ['0:00:00', '0 segundos'],
    ['00:00', '0 segundos'],
    ['2:01:01', '2 horas, 1 minuto e 1 segundo'],
    ['1:00:00', '1 hora'],
    ['0:01:00', '1 minuto'],
    ['0:00:01', '1 segundo'],
    ['1:00:07', '1 hora e 7 segundos'],
    ['10:00:01', '10 horas e 1 segundo'],
    ['216:00:00', '216 horas'],
  ])('"%s" fala "%s"', (cronometro, falado) => {
    expect(tempoFalado(cronometro)).toBe(falado)
  })

  it('aceita os milissegundos: 4 327 000 ms é 1 hora, 12 minutos e 7 segundos', () => {
    expect(tempoFalado(4_327_000)).toBe('1 hora, 12 minutos e 7 segundos')
    expect(tempoFalado(59_999)).toBe('59 segundos')
    expect(tempoFalado(0)).toBe('0 segundos')
  })

  it('um valor negativo ou sem forma de tempo fala 0 segundos, nunca "NaN"', () => {
    expect(tempoFalado(-5_000)).toBe('0 segundos')
    expect(tempoFalado('')).toBe('0 segundos')
    expect(tempoFalado('abc')).toBe('0 segundos')
  })
})
