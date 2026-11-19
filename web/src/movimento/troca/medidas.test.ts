import { describe, expect, it } from 'vitest'
import { distanciaDoFixo, temposDaLegenda } from './medidas.ts'

describe('troca medidas: moments 2 and 3 read the catalogue', () => {
  it('the pin distance is 600 from 1280 wide, 480 from 1024 to 1279 and 360 below 1024', () => {
    expect(distanciaDoFixo(1440)).toBe(600)
    expect(distanciaDoFixo(1280)).toBe(600)
    expect(distanciaDoFixo(1279)).toBe(480)
    expect(distanciaDoFixo(1024)).toBe(480)
    expect(distanciaDoFixo(1023)).toBe(360)
    expect(distanciaDoFixo(390)).toBe(360)
  })

  it('the caption swap is 160 ms out, 220 ms in, 6 px, on the standard curve', () => {
    expect(temposDaLegenda()).toEqual({ saidaMs: 160, entradaMs: 220, deslocamentoPx: 6, curva: [0.4, 0, 0.2, 1] })
  })
})
