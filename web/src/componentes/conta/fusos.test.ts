import { describe, expect, it } from 'vitest'
import { listaDeFusos, rotuloDoFuso } from './fusos.ts'

// FUSO-1: rótulos curtos, para toda opção caber na caixa fechada do seletor a 390 e a 1440 px.

describe('rotuloDoFuso: fusos do Brasil', () => {
  it.each([
    ['America/Sao_Paulo', 'Brasília (UTC−3)'],
    ['America/Manaus', 'Amazonas (UTC−4)'],
    ['America/Rio_Branco', 'Acre (UTC−5)'],
    ['America/Noronha', 'Fernando de Noronha (UTC−2)'],
  ])('%s é o horário principal, pelo nome de uso: %s', (fuso, rotulo) => {
    expect(rotuloDoFuso(fuso)).toBe(rotulo)
  })

  it.each([
    ['America/Fortaleza', 'Fortaleza (UTC−3)'],
    ['America/Cuiaba', 'Cuiabá (UTC−4)'],
    ['America/Porto_Velho', 'Porto Velho (UTC−4)'],
    ['America/Campo_Grande', 'Campo Grande (UTC−4)'],
    ['America/Boa_Vista', 'Boa Vista (UTC−4)'],
    ['America/Belem', 'Belém (UTC−3)'],
    ['America/Recife', 'Recife (UTC−3)'],
    ['America/Maceio', 'Maceió (UTC−3)'],
    ['America/Bahia', 'Bahia (UTC−3)'],
    ['America/Araguaina', 'Araguaína (UTC−3)'],
    ['America/Santarem', 'Santarém (UTC−3)'],
    ['America/Eirunepe', 'Eirunepé (UTC−5)'],
  ])('%s leva o nome da cidade, com acento: %s', (fuso, rotulo) => {
    expect(rotuloDoFuso(fuso)).toBe(rotulo)
  })
})

describe('rotuloDoFuso: fora do Brasil e sem nome', () => {
  it('fora do Brasil: a cidade (último trecho, sem sublinhado) e a diferença para o UTC', () => {
    expect(rotuloDoFuso('America/Argentina/Buenos_Aires')).toBe('Buenos Aires (UTC−3)')
    expect(rotuloDoFuso('Asia/Kolkata')).toBe('Kolkata (UTC+5:30)')
  })

  it('UTC e fuso sem nome próprio mostram só a diferença', () => {
    expect(rotuloDoFuso('UTC')).toBe('UTC')
    expect(rotuloDoFuso('Etc/GMT+3')).toBe('UTC−3')
  })

  it('identificador inválido volta como veio', () => {
    expect(rotuloDoFuso('Nao/Existe')).toBe('Nao/Existe')
  })
})

describe('listaDeFusos: rótulos', () => {
  const rotulos = listaDeFusos().map(rotuloDoFuso)

  it('cada opção tem um rótulo único', () => {
    const repetidos = rotulos.filter((r, i) => rotulos.indexOf(r) !== i)
    expect(repetidos).toEqual([])
  })

  it('nenhum rótulo traz "Horário", "Padrão", barra ou sublinhado', () => {
    expect(rotulos.filter((r) => /Horário|Padrão|[/_]/.test(r))).toEqual([])
  })
})
