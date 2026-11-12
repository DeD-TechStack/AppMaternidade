import { describe, expect, it } from 'vitest'
import { arrumarRespostas, type RespostaComAutor } from './respostas.ts'
import { voltaDaComunidade, caminhoDeEntrada } from './volta.ts'
import { LIMITES, apelidoValido, conferirLimite, contarCaracteres, ehUuid } from '../../dados/comunidade.regras.ts'
import { formatarDataHora } from '../../dados/comunidade.ts'

const resposta = (id: string, respostaA: string | null = null): RespostaComAutor => ({
  id,
  topicoId: 't',
  autorId: null,
  respostaA,
  corpo: id,
  estado: 'visivel',
  motivoModeracao: null,
  criadoEm: '2026-11-05T10:00:00.000Z',
  editadoEm: null,
  autor: null,
})

describe('arrumar as respostas (PR-37)', () => {
  it('as de primeiro nível na ordem da leitura, com as filhas logo abaixo, também na ordem da leitura', () => {
    const arranjo = arrumarRespostas([resposta('a'), resposta('b'), resposta('a1', 'a'), resposta('c'), resposta('a2', 'a'), resposta('b1', 'b')])
    expect(arranjo.map((g) => [g.resposta.id, g.filhas.map((f) => f.id)])).toEqual([
      ['a', ['a1', 'a2']],
      ['b', ['b1']],
      ['c', []],
    ])
    expect(arranjo.every((g) => !g.semMae)).toBe(true)
  })

  it('a filha cuja mãe não está entre as carregadas fica no primeiro nível, na posição da própria data, marcada', () => {
    const arranjo = arrumarRespostas([resposta('a'), resposta('f', 'ausente'), resposta('b')])
    expect(arranjo.map((g) => [g.resposta.id, g.semMae])).toEqual([['a', false], ['f', true], ['b', false]])
  })

  it('quando a mãe chega numa página seguinte, a filha passa para baixo dela', () => {
    const primeira = [resposta('a'), resposta('f', 'm')]
    expect(arrumarRespostas(primeira).map((g) => g.resposta.id)).toEqual(['a', 'f'])
    const depois = arrumarRespostas([...primeira, resposta('m')])
    expect(depois.map((g) => [g.resposta.id, g.filhas.map((f) => f.id)])).toEqual([['a', []], ['m', ['f']]])
  })

  it('uma resposta que cita outra de segundo nível não some: vai ao primeiro nível', () => {
    const arranjo = arrumarRespostas([resposta('a'), resposta('f', 'a'), resposta('n', 'f')])
    expect(arranjo.map((g) => g.resposta.id)).toEqual(['a', 'n'])
  })
})

describe('o `volta` da entrada na comunidade (MAT-40:RF-03)', () => {
  it('aceita só caminho interno da Comunidade, que não seja a própria entrada', () => {
    expect(voltaDaComunidade('/app/comunidade')).toBe('/app/comunidade')
    expect(voltaDaComunidade('/app/comunidade/sono/novo')).toBe('/app/comunidade/sono/novo')
    expect(voltaDaComunidade('/app/comunidade/topico/abc')).toBe('/app/comunidade/topico/abc')
    expect(voltaDaComunidade('/app/comunidade/perfil?x=1#y')).toBe('/app/comunidade/perfil?x=1#y')
  })

  it('recusa `//x`, esquema, outra área, a própria C5, contrabarra e controle', () => {
    for (const invalido of ['//x', 'https://x', '/moderacao', '/app/hoje', '/app/comunidadeX', '/app/comunidade/entrar', '/app/comunidade/entrar?volta=/app/comunidade', '/app/comunidade//x', '/app/comunidade\\x', '/app/comunidade/\u0000', 'app/comunidade', '', null, undefined]) {
      expect(voltaDaComunidade(invalido), String(invalido)).toBeNull()
    }
  })

  it('o link para a C5 leva o destino da ação codificado', () => {
    expect(caminhoDeEntrada('/app/comunidade/sono/novo')).toBe('/app/comunidade/entrar?volta=%2Fapp%2Fcomunidade%2Fsono%2Fnovo')
  })
})

describe('as regras puras (MAT-40:RN-02)', () => {
  it('conta caracteres como o banco: o mínimo sem as pontas, o máximo no texto inteiro', () => {
    expect(contarCaracteres('😀😀')).toBe(2)
    expect(conferirLimite('  ab  ', LIMITES.titulo)).toBe('curto')
    expect(conferirLimite('abc', LIMITES.titulo)).toBe('ok')
    expect(conferirLimite(`  ${'a'.repeat(119)}`, LIMITES.titulo)).toBe('longo')
    expect(conferirLimite('', LIMITES.corpoTopico)).toBe('curto')
    expect(conferirLimite('x'.repeat(5000), LIMITES.corpoTopico)).toBe('ok')
    expect(conferirLimite('x'.repeat(2001), LIMITES.resposta)).toBe('longo')
  })

  it('o apelido recusa espaço nas pontas em vez de cortar', () => {
    expect(apelidoValido('abc')).toBe(true)
    expect(apelidoValido('a b')).toBe(true)
    for (const invalido of [' abc', 'abc ', 'ab', 'a'.repeat(31)]) expect(apelidoValido(invalido), invalido).toBe(false)
  })

  it('o id da rota só vale se for UUID', () => {
    expect(ehUuid('47000000-0000-4000-8000-000000000021')).toBe(true)
    for (const invalido of ['', '123', 'nao-e-uuid', '47000000-0000-4000-8000-00000000002z', undefined]) expect(ehUuid(invalido)).toBe(false)
  })

  it('a data sai como DD/MM/AAAA HH:MM, e a ilegível sai vazia', () => {
    expect(formatarDataHora('2026-11-05T14:30:00Z')).toMatch(/^05\/11\/2026 \d{2}:30$/)
    expect(formatarDataHora('ontem')).toBe('')
  })
})
