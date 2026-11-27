import { describe, expect, it } from 'vitest'
import { codigoDoFragmento, normalizarCodigo } from './codigoConvite.ts'

const CODIGO = '45a1'.repeat(16)

describe('codigoDoFragmento (estrito)', () => {
  it('aceita o fragmento inteiro com 64 hexadecimais, em maiúsculas e com espaços nas pontas', () => {
    expect(codigoDoFragmento(CODIGO)).toBe(CODIGO)
    expect(codigoDoFragmento(`  ${CODIGO.toUpperCase()}  `)).toBe(CODIGO)
  })

  it('recusa um código embutido em texto maior, antes ou depois', () => {
    for (const valor of [`x${CODIGO}`, `${CODIGO}z`, `x${CODIGO}z`, `abc ${CODIGO}`, `${CODIGO} abc`, `http://x/convite#${CODIGO}`]) {
      expect(codigoDoFragmento(valor), valor).toBeNull()
    }
  })

  it('recusa tamanho errado, caractere fora do hexadecimal e vazio', () => {
    for (const valor of ['', '   ', CODIGO.slice(1), `${CODIGO}a`, 'g'.repeat(64)]) {
      expect(codigoDoFragmento(valor), valor).toBeNull()
    }
  })

  it('o campo de colar o link segue permissivo: extrai o código de um texto maior', () => {
    expect(normalizarCodigo(`x ${CODIGO} z`)).toBe(CODIGO)
    expect(normalizarCodigo(`http://x/convite#${CODIGO}`)).toBe(CODIGO)
  })
})
