import { describe, expect, it } from 'vitest'
import { anexarBloco, separadorAntesDoBloco } from './bloco.ts'

// RF12:RF-11, o separador: a conta pura de quantas quebras de linha entram antes do bloco no fim do corpo.

const BLOCO = 'Resumo da rotina de hoje até agora:\n- Sono: 9 h 20'

describe('RF12:RF-11 o separador antes do bloco', () => {
  it('separador: corpo vazio entra só o bloco', () => {
    expect(separadorAntesDoBloco('')).toBe('')
    expect(anexarBloco('', BLOCO)).toBe(BLOCO)
  })

  it('separador: os 7 exemplos de fim de corpo da spec (corpo → fim do resultado antes do bloco)', () => {
    const exemplos: Array<[string, string]> = [
      ['abc', 'abc\n\n'],
      ['abc\n', 'abc\n\n'],
      ['abc\n\n', 'abc\n\n'],
      ['abc\n ', 'abc\n \n'],
      ['abc \n', 'abc \n\n'],
      ['abc\n \n', 'abc\n \n'],
      ['  ', '  \n\n'],
    ]
    for (const [corpo, esperado] of exemplos) {
      expect(`${corpo}${separadorAntesDoBloco(corpo)}`, JSON.stringify(corpo)).toBe(esperado)
      expect(anexarBloco(corpo, BLOCO), JSON.stringify(corpo)).toBe(`${esperado}${BLOCO}`)
    }
  })

  it('separador: tabs são pulados como espaços, mais de 2 quebras não tiram nada, e nada do corpo é removido', () => {
    expect(separadorAntesDoBloco('abc\n\t')).toBe('\n')
    expect(separadorAntesDoBloco('abc\t\n\n\n')).toBe('')
    expect(separadorAntesDoBloco('\n')).toBe('\n')
    expect(separadorAntesDoBloco('\n\n\n\n')).toBe('')
    // `\r` não é espaço nem tab: conta como outro caractere.
    expect(separadorAntesDoBloco('abc\r\n')).toBe('\n')
    expect(separadorAntesDoBloco('abc\n\r')).toBe('\n\n')
    const corpo = 'primeira linha\n\nsegunda linha 😀   '
    expect(anexarBloco(corpo, BLOCO).startsWith(corpo)).toBe(true)
  })

  it('separador: duas inserções seguidas dão dois blocos, cada um separado do que veio antes', () => {
    const uma = anexarBloco('abc', BLOCO)
    const duas = anexarBloco(uma, BLOCO)
    expect(duas).toBe(`abc\n\n${BLOCO}\n\n${BLOCO}`)
  })
})
