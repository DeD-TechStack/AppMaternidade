import { describe, expect, it } from 'vitest'
import { TEXTOS_ERRO, textoDoErro } from '../conteudo/conta.ts'
import { classificarErro } from './comum.ts'
import { CHAVES_ERRO, classificarErroConta, erroDaChave } from './conta.erros.ts'

// O código de erro que o catálogo não conhece é `desconhecido`: a tela mostra a frase fixa e nunca
// a mensagem do banco, e a classificação nunca lança, venha o que vier.

const SEGREDO = 'relation "contas_privadas" does not exist'

const DESCONHECIDOS: Array<[string, unknown]> = [
  ['código do Postgres fora do catálogo', { code: 'XX999', message: SEGREDO }],
  ['código novo do Auth', { name: 'AuthApiError', code: 'weak_password_novo', status: 422, message: SEGREDO }],
  ['P0001 com uma mensagem nova', { code: 'P0001', message: 'regra nova do banco' }],
  ['23514 com uma mensagem nova', { code: '23514', message: 'restricao nova' }],
  ['22023 e 23505, que a tela só trata pela conferência', { code: '22023', message: SEGREDO }],
  ['erro sem code e sem message', { name: 'AuthApiError', status: 422 }],
  ['objeto vazio', {}],
  ['lista vazia', []],
  ['null', null],
  ['undefined', undefined],
  ['string', 'algo que ninguém previu'],
  ['string vazia', ''],
  ['número', 42],
  ['booleano', true],
  ['um Error comum', new Error(SEGREDO)],
  ['um RangeError', new RangeError('Invalid time value')],
  ['code que não é texto', { code: 500, message: SEGREDO }],
  ['message que não é texto', { code: 'XX999', message: { dentro: SEGREDO } }],
]

describe('código de erro fora do catálogo', () => {
  for (const [nome, origem] of DESCONHECIDOS) {
    it(`${nome}: classificarErroConta dá desconhecido, com o texto fixo e sem expor a mensagem`, () => {
      const erro = classificarErroConta(origem)

      expect(erro.classe).toBe('desconhecido')
      expect(erro.chave).toBe('desconhecido')
      expect(textoDoErro(erro)).toBe(TEXTOS_ERRO.desconhecido)
      if (erro.mensagemOriginal) expect(textoDoErro(erro)).not.toContain(erro.mensagemOriginal)
      expect(textoDoErro(erro)).not.toContain('contas_privadas')
    })

    it(`${nome}: classificarErro (a parte comum) dá desconhecido`, () => {
      const erro = classificarErro(origem)

      expect(erro.classe).toBe('desconhecido')
      expect(erro.chave).toBe('desconhecido')
      expect(textoDoErro(erro)).toBe(TEXTOS_ERRO.desconhecido)
    })
  }

  it('o resultado é sempre um ErroDados completo, com texto nos quatro campos', () => {
    for (const [, origem] of DESCONHECIDOS) {
      const erro = classificarErroConta(origem)
      expect(Object.keys(erro).sort()).toEqual(['chave', 'classe', 'codigo', 'mensagemOriginal'])
      for (const campo of Object.values(erro)) expect(typeof campo).toBe('string')
    }
  })

  it('o que já é um ErroDados passa sem mudar', () => {
    const erro = erroDaChave('convite_vencido')
    expect(classificarErroConta(erro)).toBe(erro)
    expect(classificarErro(erro)).toBe(erro)
  })

  it('o 22023 da linha desconhecido do catálogo é, de fato, desconhecido', () => {
    expect(erroDaChave('desconhecido').chave).toBe('desconhecido')
  })

  it('toda chave do catálogo, menos conta_inexistente, tem texto', () => {
    for (const chave of CHAVES_ERRO) {
      if (chave === 'conta_inexistente') continue
      expect(TEXTOS_ERRO[chave], chave).toBeTruthy()
    }
  })

  it('o que o catálogo conhece não cai em desconhecido: cada chave volta a si mesma', () => {
    for (const chave of CHAVES_ERRO) {
      if (chave === 'desconhecido') continue
      expect(erroDaChave(chave).chave, chave).toBe(chave)
    }
  })

  it('uma mensagem de rede dentro de um objeto de erro continua sendo rede, não desconhecido', () => {
    expect(classificarErroConta({ message: 'Failed to fetch' }).classe).toBe('rede')
    expect(classificarErroConta(new TypeError('x')).classe).toBe('rede')
  })
})
