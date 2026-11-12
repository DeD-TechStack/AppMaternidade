import { describe, expect, it } from 'vitest'
import { ehConfirmacaoDeFralda, ehTipoSessao, textoDaFralda } from './estado.ts'

// O que sobrou do protótipo (MAT-38a): o texto da confirmação da fralda e o tipo de sessão.
describe('texto da confirmação da fralda', () => {
  it('textoDaFralda junta "Fralda registrada" e o tipo escolhido', () => {
    expect(textoDaFralda('Xixi')).toBe('Fralda registrada: Xixi')
    expect(textoDaFralda('Cocô')).toBe('Fralda registrada: Cocô')
    expect(textoDaFralda('Ambos')).toBe('Fralda registrada: Ambos')
  })

  it('ehConfirmacaoDeFralda reconhece a confirmação com e sem tipo, e só ela', () => {
    expect(ehConfirmacaoDeFralda('Fralda registrada')).toBe(true)
    expect(ehConfirmacaoDeFralda('Fralda registrada: Xixi')).toBe(true)
    expect(ehConfirmacaoDeFralda(null)).toBe(false)
    expect(ehConfirmacaoDeFralda('')).toBe(false)
    expect(ehConfirmacaoDeFralda('Mamadeira registrada')).toBe(false)
    expect(ehConfirmacaoDeFralda('Sessão encerrada: 1 h 12 min')).toBe(false)
    expect(ehConfirmacaoDeFralda('Fralda registrada às 10h')).toBe(false)
  })
})

describe('tipo de sessão', () => {
  it('só sono, mamada e tummy são sessões', () => {
    expect(['sono', 'mamada', 'tummy'].every(ehTipoSessao)).toBe(true)
    expect(ehTipoSessao('fralda')).toBe(false)
    expect(ehTipoSessao(null)).toBe(false)
  })
})
