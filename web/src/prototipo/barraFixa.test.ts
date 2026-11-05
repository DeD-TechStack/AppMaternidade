import { describe, expect, it } from 'vitest'
import { barraDeveFicarFixa } from './barraFixa.ts'

// R2: a barra de baixo fica fixa se e só se a janela tem pelo menos 40 rem de altura.
// A altura da barra não entra na decisão: confirmação e painéis a fazem crescer no uso normal.
describe('R2: barraDeveFicarFixa(alturaJanelaPx, fonteRaizPx)', () => {
  it.each([
    ['celular 390 × 844 com fonte de 100%', 844, 16, true],
    ['desktop 1440 × 900 com fonte de 100%', 900, 16, true],
    ['fonte de 200% (32 px) numa janela de 844 px', 844, 32, false],
    ['fonte de 200% (32 px) numa janela de 900 px', 900, 32, false],
    ['zoom de 200% em 1440 × 900 (janela de 450 px, fonte de 16 px)', 450, 16, false],
  ])('%s → fixa = %s', (_caso, janela, fonte, esperado) => {
    expect(barraDeveFicarFixa(janela, fonte)).toBe(esperado)
  })

  it('o limite exato é 40 vezes a fonte raiz: com 16 px, 640 é fixa e 639 não', () => {
    expect(barraDeveFicarFixa(640, 16)).toBe(true)
    expect(barraDeveFicarFixa(639, 16)).toBe(false)
  })

  it('o limite acompanha a fonte: com 32 px, 1280 é fixa e 1279 não', () => {
    expect(barraDeveFicarFixa(1280, 32)).toBe(true)
    expect(barraDeveFicarFixa(1279, 32)).toBe(false)
  })

  it('sem medida da janela ou sem fonte, não fixa', () => {
    expect(barraDeveFicarFixa(0, 16)).toBe(false)
    expect(barraDeveFicarFixa(844, 0)).toBe(false)
  })
})
