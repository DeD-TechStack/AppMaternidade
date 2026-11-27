import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PESSOAS_DEMONSTRACAO, SENHA_DEMONSTRACAO, criarFixtureDemonstracao } from './conta.demonstracao.ts'

// MED-AUTH:RF-02: o moderador fictício da demonstração (Diego) entra no modo memória com os mesmos
// id e e-mail do seed da comunidade, e nada mais da fixture muda.

const AGORA = Date.parse('2026-11-14T12:00:00.000Z')
const DIA = 86_400_000
const ler = (relativo: string) => readFileSync(new URL(relativo, import.meta.url), 'utf8')

describe('MED-AUTH:RF-02 o moderador da demonstração', () => {
  it('PESSOAS_DEMONSTRACAO.moderador é o Diego, com o id e o e-mail do seed da comunidade', () => {
    expect(PESSOAS_DEMONSTRACAO).toHaveProperty('moderador')
    const moderador = (PESSOAS_DEMONSTRACAO as Record<string, { id: string; email: string; nome: string }>).moderador
    expect(moderador).toEqual({
      id: '47000000-0000-4000-8000-000000000001',
      email: 'diego.moderador@exemplo.invalid',
      nome: 'Diego',
    })
    expect(ler('./comunidade.demonstracao.ts')).toMatch(new RegExp(`diego:\\s*'${moderador.id}'`))
    const seed = ler('../../../supabase/seeds/47_comunidade.sql')
    expect(seed).toMatch(new RegExp(`'${moderador.id}',[^)]*'${moderador.email.replace(/\./g, '\\.')}'`))
  })

  it('a fixture ganha a linha de usuário (senha da demonstração) e a de conta do moderador, sem família, vínculo nem convite', () => {
    const fixture = criarFixtureDemonstracao(AGORA)
    const id = '47000000-0000-4000-8000-000000000001'
    expect(fixture.usuarios.filter((u) => u.id === id)).toEqual([
      { id, email: 'diego.moderador@exemplo.invalid', senha: SENHA_DEMONSTRACAO, nomeMetadados: null },
    ])
    expect(fixture.contas.filter((c) => c.id === id)).toEqual([
      { id, nome: 'Diego', fuso: 'America/Sao_Paulo', criadaEm: new Date(AGORA - 30 * DIA).toISOString() },
    ])
    // Nem família, nem vínculo, nem convite: só a conta.
    expect(fixture.familias.some((f) => f.criadaPor === id)).toBe(false)
    expect(fixture.vinculos.some((v) => v.contaId === id || v.concedidoPor === id)).toBe(false)
    expect(fixture.convites.some((c) => c.criadoPor === id)).toBe(false)
    expect(fixture.familias).toHaveLength(2)
    expect(fixture.vinculos).toHaveLength(3)
    expect(fixture.convites).toHaveLength(2)
    expect(fixture.bebes).toHaveLength(1)
  })

  it('as linhas de Juliana, Ícaro, Carla e Davi ficam iguais, e o moderador vem depois delas', () => {
    const fixture = criarFixtureDemonstracao(AGORA)
    const criadaEm = new Date(AGORA - 30 * DIA).toISOString()
    const pessoas = [
      ['11111111-1111-4111-8111-111111111111', 'juliana@exemplo.invalid', 'Juliana'],
      ['22222222-2222-4222-8222-222222222222', 'icaro@exemplo.invalid', 'Ícaro'],
      ['33333333-3333-4333-8333-333333333333', 'carla@exemplo.invalid', 'Carla'],
      ['45444444-4444-4444-8444-444444444444', 'davi@exemplo.invalid', 'Davi'],
    ]
    expect(fixture.usuarios.slice(0, 4)).toEqual(pessoas.map(([id, email]) => ({ id, email, senha: SENHA_DEMONSTRACAO, nomeMetadados: null })))
    expect(fixture.contas.slice(0, 4)).toEqual(pessoas.map(([id, , nome]) => ({ id, nome, fuso: 'America/Sao_Paulo', criadaEm })))
    expect(fixture.usuarios.map((u) => u.id)).toEqual([...pessoas.map(([id]) => id), '47000000-0000-4000-8000-000000000001'])
    expect(fixture.contas.map((c) => c.id)).toEqual([...pessoas.map(([id]) => id), '47000000-0000-4000-8000-000000000001'])
    const { responsavel, icaro, carla, davi } = PESSOAS_DEMONSTRACAO
    expect([responsavel, icaro, carla, davi].map((p) => [p.id, p.email, p.nome])).toEqual(pessoas)
  })
})
