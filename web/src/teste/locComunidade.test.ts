import { describe, expect, it } from 'vitest'
import { COMUM_COMUNIDADE, FORMULARIO_TOPICO, TOPICO, TX } from '../conteudo/comunidade.ts'
import * as moderacao from '../conteudo/moderacao.ts'
import { formatarDataHora } from '../dados/comunidade.ts'

// LOC-05: o texto de Comunidade e Moderação em pt-BR correto. "Samu" como o gov.br escreve, milhar com ponto,
// data como `DD/MM/AAAA às HH:MM` e nenhuma palavra de bastidor (UUID, migração, Id, admin) na tela.

/** Toda frase alcançável de um export: texto, objeto, lista e função (chamada com um argumento de exemplo). */
function frases(valor: unknown, fundo = 0): string[] {
  if (fundo > 8) return []
  if (typeof valor === 'string') return [valor]
  if (typeof valor === 'function') {
    try {
      return frases((valor as (arg: unknown, outro: unknown) => unknown)('exemplo', true), fundo + 1)
    } catch {
      return []
    }
  }
  if (valor === null || typeof valor !== 'object') return []
  return Object.values(valor).flatMap((v) => frases(v, fundo + 1))
}

describe('LOC-05: Comunidade', () => {
  it('tx08 escreve Samu como o gov.br, no 192', () => {
    expect(TX.tx08).toContain('Samu, no 192')
    expect(TX.tx08).not.toContain('SAMU')
  })

  it('os limites de texto levam o ponto de milhar', () => {
    expect(TOPICO.erroLimiteResposta).toContain('2.000')
    expect(FORMULARIO_TOPICO.erroCorpo).toContain('5.000')
  })

  it('o contador usa o separador de milhar pt-BR', () => {
    expect(COMUM_COMUNIDADE.contador(5001, 5000)).toBe('5.001 de 5.000')
    expect(COMUM_COMUNIDADE.contador(14, 2000)).toBe('14 de 2.000')
  })

  it('formatarDataHora devolve DD/MM/AAAA às HH:MM e vazio para data ilegível', () => {
    expect(formatarDataHora('2026-11-05T14:30:00Z')).toMatch(/^05\/11\/2026 às \d{2}:30$/)
    expect(formatarDataHora('ontem')).toBe('')
  })
})

describe('LOC-05: Moderação', () => {
  const todas = Object.values(moderacao).flatMap((v) => frases(v))

  it('alcança as frases do painel', () => {
    expect(todas.length).toBeGreaterThan(100)
  })

  it('nenhuma frase usa UUID nem migração', () => {
    expect(todas.filter((f) => /UUID|migra[çc][ãa]o/i.test(f))).toEqual([])
  })

  it('nenhuma frase escreve Id em vez de ID', () => {
    expect(todas.filter((f) => /\bId\b/.test(f))).toEqual([])
  })

  it('nenhuma frase mostra a palavra admin (administrador e administradora podem)', () => {
    expect(todas.filter((f) => /\badmin\b/i.test(f))).toEqual([])
  })
})
