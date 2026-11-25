import { describe, expect, it } from 'vitest'
import * as medidas from './medidas.ts'
import { alturaMinimaDoFixo, bordaDaNoite, ladoDaLegenda, passoDaVez, pinoDoPalco, temposDaLegenda } from './medidas.ts'

describe('troca medidas: moments 2 and 3 read the catalogue', () => {
  // U1 (ARQUITETURA_STAGE §7.1): D is one rule of the window's height, 80svh clamped to 600-900 px; no table by width.
  it('the pin is 80 svh of the window clamped to 600 and 900 px (pinoDoPalco)', () => {
    expect(pinoDoPalco(900)).toBe(720)
    expect(pinoDoPalco(700)).toBe(600)
    expect(pinoDoPalco(1440)).toBe(900)
    expect(pinoDoPalco(768)).toBeCloseTo(614.4, 6)
    expect(pinoDoPalco(1080)).toBeCloseTo(864, 6)
    expect(pinoDoPalco(800)).toBeCloseTo(640, 6)
  })

  it('distanciaDoFixo is gone: D comes from CSS and is measured from the rects', () => {
    expect('distanciaDoFixo' in medidas).toBe(false)
  })

  it('the edge holds at the seam to p 0.10, runs linearly to the left edge at p 0.70 and holds there (no centre hold)', () => {
    expect(bordaDaNoite(0, 553)).toBe(553)
    expect(bordaDaNoite(0.1, 553)).toBe(553)
    expect(bordaDaNoite(0.25, 553)).toBeCloseTo(553 * (1 - 0.15 / 0.6), 6)
    expect(bordaDaNoite(0.4, 553)).toBeCloseTo(276.5, 6)
    expect(bordaDaNoite(0.5, 553)).toBeCloseTo(553 * (1 - 0.4 / 0.6), 6)
    expect(bordaDaNoite(0.7, 553)).toBe(0)
    expect(bordaDaNoite(0.85, 553)).toBe(0)
    expect(bordaDaNoite(1, 553)).toBe(0)
    // Linear between the stops: equal steps in p are equal steps in x.
    const a = bordaDaNoite(0.2, 553)
    const b = bordaDaNoite(0.3, 553)
    const c = bordaDaNoite(0.4, 553)
    expect(a - b).toBeCloseTo(b - c, 6)
    // A bad p is p 0: the seam.
    expect(bordaDaNoite(Number.NaN, 553)).toBe(553)
    expect(bordaDaNoite(-3, 553)).toBe(553)
    expect(bordaDaNoite(9, 553)).toBe(0)
  })

  it('the marker steps one row between p 0.485 and p 0.515 (passoDaVez 0 to 1, 0.5 at p 0.5)', () => {
    expect(passoDaVez(0)).toBe(0)
    expect(passoDaVez(0.485)).toBe(0)
    expect(passoDaVez(0.5)).toBeCloseTo(0.5, 6)
    expect(passoDaVez(0.515)).toBe(1)
    expect(passoDaVez(1)).toBe(1)
    expect(passoDaVez(Number.NaN)).toBe(0)
  })

  it('the caption side is unchanged: 1 under 0.5, 2 from it', () => {
    expect(ladoDaLegenda(0.499)).toBe(1)
    expect(ladoDaLegenda(0.5)).toBe(2)
  })

  it('the smallest pinned window height is the measured gate (M16 alturaMinimaPx)', () => {
    expect(alturaMinimaDoFixo()).toBeGreaterThanOrEqual(640)
    expect(alturaMinimaDoFixo()).toBeLessThanOrEqual(760)
  })

  it('the caption swap is 160 ms out, 220 ms in, 6 px, on the standard curve', () => {
    expect(temposDaLegenda()).toEqual({ saidaMs: 160, entradaMs: 220, deslocamentoPx: 6, curva: [0.4, 0, 0.2, 1] })
  })
})
