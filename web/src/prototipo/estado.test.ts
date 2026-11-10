import { describe, expect, it } from 'vitest'
import { criarEstadoInicial, ehConfirmacaoDeFralda, reduzir, textoDaFralda } from './estado.ts'

const AGORA = Date.parse('2026-11-05T10:00:00')

const fraldaRegistrada = () =>
  reduzir(criarEstadoInicial(AGORA), {
    tipo: 'registrar',
    chave: 'fralda',
    rotulo: 'Fralda',
    confirmacao: 'Fralda registrada',
  })

// E5: a fralda se registra com 1 toque; o tipo (Xixi, Cocô, Ambos) é um ajuste opcional do texto da
// confirmação e nunca cria um segundo registro.
describe('ajustarConfirmacao', () => {
  it('troca só o texto da confirmação e mantém o instantâneo do Desfazer', () => {
    const antes = fraldaRegistrada()

    const depois = reduzir(antes, { tipo: 'ajustarConfirmacao', texto: 'Fralda registrada: Xixi' })

    expect(depois).toMatchObject({ confirmacao: { texto: 'Fralda registrada: Xixi' } })
    expect(depois.confirmacao?.anterior).toBe(antes.confirmacao?.anterior)
  })

  it('não muda Últimos, a sessão, a nota nem o tema: não cria um segundo registro', () => {
    const antes = fraldaRegistrada()

    const depois = reduzir(antes, { tipo: 'ajustarConfirmacao', texto: 'Fralda registrada: Cocô' })

    expect(depois).toMatchObject({ confirmacao: { texto: 'Fralda registrada: Cocô' } })
    expect(depois.ultimos).toBe(antes.ultimos)
    expect(depois.ultimos.filter((item) => item.chave === 'fralda')).toHaveLength(1)
    expect(depois.sessao).toBe(antes.sessao)
    expect(depois.nota).toBe(antes.nota)
    expect(depois.madrugada).toBe(antes.madrugada)
  })

  it('sem confirmação, o estado não muda (é o mesmo objeto)', () => {
    const base = criarEstadoInicial(AGORA)
    expect(base.confirmacao).toBeNull()

    expect(reduzir(base, { tipo: 'ajustarConfirmacao', texto: 'Fralda registrada: Xixi' })).toBe(base)
  })

  it('"Desfazer" depois do ajuste volta ao estado anterior à fralda', () => {
    const inicial = criarEstadoInicial(AGORA)
    const ajustado = reduzir(fraldaRegistrada(), { tipo: 'ajustarConfirmacao', texto: 'Fralda registrada: Ambos' })

    expect(ajustado).toMatchObject({ confirmacao: { texto: 'Fralda registrada: Ambos' } })
    const desfeito = reduzir(ajustado, { tipo: 'desfazer' })

    expect(desfeito.ultimos).toEqual(inicial.ultimos)
    expect(desfeito.sessao).toEqual(inicial.sessao)
    expect(desfeito.confirmacao).toBeNull()
  })

  it('ajustar de novo troca o texto outra vez, sem acumular nada', () => {
    const primeiro = reduzir(fraldaRegistrada(), { tipo: 'ajustarConfirmacao', texto: 'Fralda registrada: Xixi' })

    const segundo = reduzir(primeiro, { tipo: 'ajustarConfirmacao', texto: 'Fralda registrada: Cocô' })

    expect(segundo).toMatchObject({ confirmacao: { texto: 'Fralda registrada: Cocô' } })
    expect(segundo.confirmacao?.anterior).toBe(primeiro.confirmacao?.anterior)
    expect(segundo.ultimos).toBe(primeiro.ultimos)
  })

  it('as outras ações seguem como estavam: registrar guarda o texto dado e fechar apaga a confirmação', () => {
    const registrada = fraldaRegistrada()
    expect(registrada.confirmacao?.texto).toBe('Fralda registrada')
    expect(registrada.ultimos[0]).toEqual({ chave: 'fralda', rotulo: 'Fralda', quando: 'agora' })

    expect(reduzir(registrada, { tipo: 'fecharConfirmacao' }).confirmacao).toBeNull()
  })
})

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
