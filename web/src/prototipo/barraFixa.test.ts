import { describe, expect, it } from 'vitest'
import { barraDeveFicarFixa } from './barraFixa.ts'

// G3-2: a barra de baixo só pode ficar fixa se sobrar tela para o conteúdo (no máximo 35%).
describe('barraDeveFicarFixa', () => {
  it.each([
    ['100% de fonte, celular 390 × 844', 170, 844, true],
    ['200% de fonte, desktop 1440 × 900', 370, 900, false],
    ['200% de fonte, celular 390 × 844', 766, 844, false],
    ['zoom alto, janela baixa de 450 px', 300, 450, false],
  ])('%s: barra %i px em janela %i px → fixa = %s', (_caso, barra, janela, esperado) => {
    expect(barraDeveFicarFixa(barra, janela)).toBe(esperado)
  })

  it('o limite é 35% da janela', () => {
    expect(barraDeveFicarFixa(295, 844)).toBe(true) // 295 ≤ 295,4
    expect(barraDeveFicarFixa(296, 844)).toBe(false)
  })

  it('sem medida da janela, não fixa', () => {
    expect(barraDeveFicarFixa(100, 0)).toBe(false)
  })
})
