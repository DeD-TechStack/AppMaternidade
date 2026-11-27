import { describe, expect, it } from 'vitest'
import { camposDoRegistro, camposVazios, temCampoDeFim, validarRegistro, type CamposDoRegistro } from './validacaoRegistro.ts'
import type { Registro } from '../../dados/rotina.tipos.ts'

const AGORA = new Date('2026-11-05T10:00:00').getTime()
const MIN = 60_000

const base = (parcial: Partial<CamposDoRegistro>): CamposDoRegistro => ({ ...camposVazios(AGORA), ...parcial })
const novo = { modo: 'novo', emAndamento: false, agora: AGORA } as const
const horario = (instante: number) => {
  const d = new Date(instante)
  const p = (n: number) => String(n).padStart(2, '0')
  return { data: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, hora: `${p(d.getHours())}:${p(d.getMinutes())}` }
}

describe('validarRegistro (R38-10)', () => {
  it('sem tipo, o erro é do tipo', () => {
    expect(validarRegistro(base({}), novo).erros.tipo).toBeTruthy()
  })

  it('horário: até 5 minutos no futuro passa; mais que isso, não; vazio, não', () => {
    expect(validarRegistro(base({ tipo: 'fralda', conteudoDaFralda: 'xixi', inicio: horario(AGORA + 5 * MIN) }), novo).erros.inicio).toBeUndefined()
    expect(validarRegistro(base({ tipo: 'fralda', conteudoDaFralda: 'xixi', inicio: horario(AGORA + 6 * MIN) }), novo).erros.inicio).toMatch(/futuro/)
    expect(validarRegistro(base({ tipo: 'fralda', conteudoDaFralda: 'xixi', inicio: { data: '', hora: '' } }), novo).erros.inicio).toBeTruthy()
  })

  it('fim: opcional no novo; antes do início não passa; no futuro não passa; meio preenchido não passa', () => {
    const sono = { tipo: 'sono' as const, inicio: horario(AGORA - 60 * MIN) }
    expect(validarRegistro(base({ ...sono }), novo).entrada?.fim).toBeNull()
    expect(validarRegistro(base({ ...sono, fim: horario(AGORA - 30 * MIN) }), novo).entrada?.fim).not.toBeNull()
    expect(validarRegistro(base({ ...sono, fim: horario(AGORA - 90 * MIN) }), novo).erros.fim).toMatch(/antes do início/)
    expect(validarRegistro(base({ ...sono, fim: horario(AGORA + 10 * MIN) }), novo).erros.fim).toMatch(/futuro/)
    expect(validarRegistro(base({ ...sono, fim: { data: '2026-11-05', hora: '' } }), novo).erros.fim).toBeTruthy()
  })

  it('pontual não tem campo de fim', () => {
    expect(temCampoDeFim('fralda', novo)).toBe(false)
    expect(temCampoDeFim('mamadeira', novo)).toBe(false)
    expect(temCampoDeFim('mamada', novo)).toBe(true)
  })

  it('edição: o fim da sessão encerrada é obrigatório; sessão em andamento não tem o campo', () => {
    const encerrada = { modo: 'editar', emAndamento: false, agora: AGORA } as const
    const aberta = { modo: 'editar', emAndamento: true, agora: AGORA } as const
    expect(validarRegistro(base({ tipo: 'sono', inicio: horario(AGORA - 60 * MIN) }), encerrada).erros.fim).toBe(
      'Uma sessão encerrada não pode voltar a ficar em andamento.',
    )
    expect(temCampoDeFim('sono', aberta)).toBe(false)
    expect(validarRegistro(base({ tipo: 'sono', inicio: horario(AGORA - 60 * MIN) }), aberta).entrada?.fim).toBeNull()
  })

  it('ml: inteiro de 1 a 500, opcional', () => {
    const com = (ml: string) => validarRegistro(base({ tipo: 'mamadeira', ml }), novo)
    for (const valor of ['0', '501', '90.5', 'abc', '-3']) expect(com(valor).erros.ml, valor).toBeTruthy()
    for (const valor of ['1', '500', ' 90 ', '']) expect(com(valor).erros.ml, valor).toBeUndefined()
    expect(com('90').entrada?.detalhes.ml).toBe(90)
    expect(com('').entrada?.detalhes.ml).toBeUndefined()
  })

  it('fralda: o conteúdo é obrigatório', () => {
    expect(validarRegistro(base({ tipo: 'fralda' }), novo).erros.conteudoDaFralda).toBeTruthy()
    expect(validarRegistro(base({ tipo: 'fralda', conteudoDaFralda: 'coco' }), novo).entrada?.detalhes).toEqual({ conteudo: 'coco' })
  })

  it('alimento: 100 passa, 101 não; textos são cortados nas pontas antes de contar', () => {
    expect(validarRegistro(base({ tipo: 'solido', alimento: 'a'.repeat(100) }), novo).erros.alimento).toBeUndefined()
    expect(validarRegistro(base({ tipo: 'solido', alimento: 'a'.repeat(101) }), novo).erros.alimento).toBeTruthy()
    expect(validarRegistro(base({ tipo: 'solido', alimento: `  ${'a'.repeat(100)}  ` }), novo).erros.alimento).toBeUndefined()
    expect(validarRegistro(base({ tipo: 'solido', alimento: '   ' }), novo).entrada?.detalhes.alimento).toBeUndefined()
  })

  it('observação: o texto é obrigatório (500 passa, 501 não, só espaços não) e vira a nota', () => {
    const com = (texto: string) => validarRegistro(base({ tipo: 'observacao', texto }), novo)
    expect(com('').erros.texto).toBeTruthy()
    expect(com('   ').erros.texto).toBeTruthy()
    expect(com('a'.repeat(501)).erros.texto).toBeTruthy()
    expect(com('a'.repeat(500)).erros.texto).toBeUndefined()
    expect(com('  oi  ').entrada?.nota).toBe('oi')
  })

  it('nota dos outros tipos: opcional, até 500 depois de cortar as pontas', () => {
    const com = (nota: string) => validarRegistro(base({ tipo: 'sono', nota }), novo)
    expect(com('a'.repeat(501)).erros.nota).toBeTruthy()
    expect(com(`  ${'a'.repeat(500)}  `).erros.nota).toBeUndefined()
    expect(com('   ').entrada?.nota).toBeNull()
  })

  it('o primeiro erro é de qual campo? todos aparecem de uma vez, para o foco ir ao primeiro', () => {
    const { erros } = validarRegistro(base({ tipo: 'mamadeira', ml: '999', inicio: horario(AGORA + 30 * MIN) }), novo)
    expect(Object.keys(erros)).toEqual(['inicio', 'ml'])
  })
})

describe('camposDoRegistro (edição)', () => {
  it('traz o estado completo das colunas editáveis, e a observação põe a nota no texto', () => {
    const registro = {
      tipo: 'observacao',
      inicio: new Date(AGORA).toISOString(),
      fim: null,
      detalhes: {},
      nota: 'Tossiu à noite',
    } as unknown as Registro
    const campos = camposDoRegistro(registro)
    expect(campos.texto).toBe('Tossiu à noite')
    expect(campos.nota).toBe('')
    expect(campos.inicio).toEqual({ data: '2026-11-05', hora: '10:00' })
    expect(campos.fim).toEqual({ data: '', hora: '' })
  })
})
