import { describe, expect, it } from 'vitest'
import type { FamiliaDaRotina, Registro } from '../../dados/rotina.tipos.ts'
import { dividirDataEHora, formatarQuando, horaDaNota, juntarDataEHora, nomeDoAutor, resumoDoRegistro, rotuloDoAjuste } from './formatos.ts'

const MIN = 60_000
const HORA = 60 * MIN
// Hora do aparelho: 10:00 de 5/11/2026.
const AGORA = new Date('2026-11-05T10:00:00').getTime()

describe('formatarQuando (hora do aparelho, minutos completos)', () => {
  const quando = (atras: number) => formatarQuando(AGORA - atras, AGORA)

  it('menos de 1 minuto é "agora"; menos de 60 minutos, "há N min"', () => {
    expect(quando(0)).toBe('agora')
    expect(quando(59_000)).toBe('agora')
    expect(quando(MIN)).toBe('há 1 min')
    expect(quando(59 * MIN + 59_000)).toBe('há 59 min')
  })

  it('no mesmo dia: "há H h M min", ou "há H h" com 0 minuto', () => {
    expect(quando(HORA)).toBe('há 1 h')
    expect(quando(2 * HORA + 10 * MIN)).toBe('há 2 h 10 min')
    expect(quando(10 * HORA)).toBe('há 10 h')
  })

  it('no dia anterior, "ontem HH:MM"; antes disso, "DD/MM HH:MM"', () => {
    expect(quando(16 * HORA + 30 * MIN)).toBe('ontem 17:30')
    expect(quando(10 * HORA + MIN)).toBe('ontem 23:59')
    expect(quando(3 * 24 * HORA)).toBe('02/11 10:00')
  })

  it('uma hora de uma hora atrás que cai no dia anterior é "ontem", e não "há 1 h"', () => {
    const meiaNoite30 = new Date('2026-11-05T00:30:00').getTime()
    expect(formatarQuando(meiaNoite30 - HORA, meiaNoite30)).toBe('ontem 23:30')
  })

  it('um momento no futuro (relógio adiantado de outro aparelho) vira "agora"', () => {
    expect(formatarQuando(AGORA + 5 * MIN, AGORA)).toBe('agora')
  })
})

describe('hora da nota', () => {
  it('HH:MM nas últimas 24 horas; DD/MM HH:MM antes disso', () => {
    expect(horaDaNota(AGORA - 3 * HORA - 20 * MIN, AGORA)).toBe('06:40')
    expect(horaDaNota(AGORA - 24 * HORA - MIN, AGORA)).toBe('04/11 09:59')
  })
})

const registro = (extra: Partial<Registro>): Registro => ({
  id: 'd0000000-0000-7000-8000-000000000001',
  familiaId: 'f',
  bebeId: 'b',
  tipo: 'fralda',
  inicio: new Date(AGORA).toISOString(),
  fim: null,
  detalhes: {},
  nota: null,
  origem: 'ao_vivo',
  fuso: 'America/Sao_Paulo',
  deslocamentoMin: -180,
  criadoPor: null,
  encerradoPor: null,
  versao: 1,
  recebidoEm: new Date(AGORA).toISOString(),
  atualizadoEm: new Date(AGORA).toISOString(),
  excluidoEm: null,
  excluidoPor: null,
  ...extra,
})

describe('resumoDoRegistro', () => {
  const resumo = (extra: Partial<Registro>) => resumoDoRegistro(registro(extra), 'America/Sao_Paulo')
  const noInicio = new Date(AGORA - HORA - 12 * MIN).toISOString()
  const noFim = new Date(AGORA).toISOString()

  it('sessão encerrada: a duração; em andamento: "em andamento"', () => {
    expect(resumo({ tipo: 'sono', inicio: noInicio, fim: noFim })).toBe('1 h 12 min')
    expect(resumo({ tipo: 'sono', fim: null })).toBe('em andamento')
  })

  it('sessão que termina no dia seguinte da família diz isso', () => {
    // 23:30 a 00:30 em São Paulo (02:30Z a 03:30Z).
    expect(
      resumo({ tipo: 'sono', inicio: '2026-11-05T02:30:00.000Z', fim: '2026-11-05T03:30:00.000Z' }),
    ).toBe('1 h 0 min · termina no dia seguinte')
  })

  it('mamada com lado, mamadeira com ml e conteúdo, fralda, alimento e observação cortada em 80', () => {
    expect(resumo({ tipo: 'mamada', inicio: noInicio, fim: noFim, detalhes: { lado: 'esquerdo' } })).toBe('1 h 12 min · lado esquerdo')
    expect(resumo({ tipo: 'mamada', fim: null, detalhes: { lado: 'ambos' } })).toBe('em andamento · os dois lados')
    expect(resumo({ tipo: 'mamadeira', detalhes: { ml: 90, conteudo: 'formula' } })).toBe('90 ml · fórmula')
    expect(resumo({ tipo: 'mamadeira', detalhes: { conteudo: 'leite_materno' } })).toBe('leite materno')
    expect(resumo({ tipo: 'mamadeira', detalhes: {} })).toBe('')
    expect(resumo({ tipo: 'fralda', detalhes: { conteudo: 'coco' } })).toBe('Cocô')
    expect(resumo({ tipo: 'solido', detalhes: { alimento: 'banana' } })).toBe('banana')
    const longa = 'a'.repeat(120)
    expect(resumo({ tipo: 'observacao', nota: longa })).toBe(`${'a'.repeat(80)}…`)
    expect(resumo({ tipo: 'observacao', nota: 'curta' })).toBe('curta')
  })
})

describe('nomeDoAutor (D-9)', () => {
  const familia = {
    membros: [{ contaId: 'c1', nome: 'Juliana', vinculoId: 'v', papel: 'responsavel', validoAte: null, souEu: true }],
  } as unknown as FamiliaDaRotina

  it('o nome da conta com vínculo ativo; "pessoa removida" se o autor é nulo; "ex-membro da família" nos outros casos', () => {
    expect(nomeDoAutor(familia, 'c1')).toBe('Juliana')
    expect(nomeDoAutor(familia, null)).toBe('pessoa removida')
    expect(nomeDoAutor(familia, 'c2')).toBe('ex-membro da família')
    expect(nomeDoAutor(undefined, 'c1')).toBe('ex-membro da família')
  })
})

describe('data e hora do aparelho', () => {
  it('dividir e juntar são inversas, e uma data ou hora que não existe é NaN', () => {
    const { data, hora } = dividirDataEHora(AGORA)
    expect([data, hora]).toEqual(['2026-11-05', '10:00'])
    expect(juntarDataEHora(data, hora)).toBe(AGORA)
    expect(Number.isNaN(juntarDataEHora('2026-02-30', '10:00'))).toBe(true)
    expect(Number.isNaN(juntarDataEHora('', '10:00'))).toBe(true)
    expect(Number.isNaN(juntarDataEHora('2026-11-05', ''))).toBe(true)
  })

  it('o nome acessível do ajuste contém o texto visível e o campo', () => {
    expect(rotuloDoAjuste('Início', 'menos')).toBe('−5 min no campo Início')
    expect(rotuloDoAjuste('Início', 'mais')).toBe('+5 min no campo Início')
  })
})
