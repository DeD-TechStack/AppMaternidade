import { describe, expect, it } from 'vitest'
import { TEXTOS_ERRO, textoDoErro } from '../conteudo/conta.ts'
import { classificarErro, dataNoFuso, ehErroDados, fusoValido, type ClasseErro, type ModoDados } from './comum.ts'
import { CHAVES_ERRO, classificarErroConta, erroDaChave } from './conta.erros.ts'

// O catálogo "erro → estado → texto" (seção 4.2 da spec): para cada linha, uma entrada de cada
// origem listada dá a chave e a classe certas.

const pg = (code: string, message: string) => ({ code, message })
const auth = (code: string, status: number, message = 'erro do auth') => ({ name: 'AuthApiError', code, status, message })

interface Linha {
  chave: string
  classe: ClasseErro
  origens: unknown[]
}

const CATALOGO: Linha[] = [
  {
    chave: 'rede',
    classe: 'rede',
    origens: [
      new TypeError('Failed to fetch'),
      { name: 'TypeError', message: 'Failed to fetch' },
      { name: 'AuthRetryableFetchError', message: 'sem resposta', status: 502 },
      { message: '', status: 0 },
      { code: '', message: 'TypeError: NetworkError when attempting to fetch resource.' },
      { code: '', message: 'FetchError: request failed' },
    ],
  },
  { chave: 'tente_de_novo', classe: 'tente_de_novo', origens: [pg('40P01', 'deadlock detected'), pg('P0001', 'tente de novo')] },
  {
    chave: 'nao_encontrado',
    classe: 'nao_encontrado',
    origens: ['familia inexistente', 'convite inexistente', 'vinculo inexistente', 'bebe inexistente', 'qualquer outra'].map((m) => pg('P0002', m)),
  },
  { chave: 'sem_permissao', classe: 'sem_permissao', origens: [pg('42501', 'sem permissao'), pg('42501', 'permission denied for table bebes')] },
  {
    chave: 'parametro_obrigatorio',
    classe: 'negocio',
    origens: [pg('P0001', 'parametro obrigatorio'), pg('23502', 'null value in column "nome" violates not-null constraint')],
  },
  { chave: 'conta_inexistente', classe: 'negocio', origens: [pg('P0001', 'conta inexistente')] },
  { chave: 'nome_vazio', classe: 'negocio', origens: [pg('P0001', 'nome vazio')] },
  { chave: 'fuso_invalido', classe: 'negocio', origens: [pg('23514', 'fuso invalido')] },
  { chave: 'nascimento_no_futuro', classe: 'negocio', origens: [pg('23514', 'nascimento no futuro')] },
  { chave: 'convite_invalido', classe: 'negocio', origens: [pg('P0001', 'convite invalido')] },
  { chave: 'convite_revogado', classe: 'negocio', origens: [pg('P0001', 'convite revogado')] },
  { chave: 'convite_usado', classe: 'negocio', origens: [pg('P0001', 'convite usado')] },
  { chave: 'convite_vencido', classe: 'negocio', origens: [pg('P0001', 'convite vencido')] },
  { chave: 'ja_e_membro', classe: 'negocio', origens: [pg('P0001', 'ja e membro')] },
  { chave: 'convite_nao_pendente', classe: 'negocio', origens: [pg('P0001', 'convite nao pendente')] },
  { chave: 'responsavel_sem_validade', classe: 'negocio', origens: [pg('P0001', 'responsavel sem validade')] },
  { chave: 'validade_menor', classe: 'negocio', origens: [pg('P0001', 'validade menor que o convite')] },
  { chave: 'papel_igual', classe: 'negocio', origens: [pg('P0001', 'papel igual')] },
  { chave: 'vinculo_inativo', classe: 'negocio', origens: [pg('P0001', 'vinculo inativo')] },
  { chave: 'use_sair', classe: 'negocio', origens: [pg('P0001', 'use sair da familia')] },
  { chave: 'ultimo_responsavel', classe: 'negocio', origens: [pg('P0001', 'ultimo responsavel')] },
  { chave: 'credenciais', classe: 'negocio', origens: [auth('invalid_credentials', 400)] },
  { chave: 'email_nao_confirmado', classe: 'negocio', origens: [auth('email_not_confirmed', 400)] },
  { chave: 'email_em_uso', classe: 'negocio', origens: [auth('user_already_exists', 422), auth('email_exists', 422)] },
  { chave: 'senha_fraca', classe: 'negocio', origens: [auth('weak_password', 422)] },
  { chave: 'senha_igual', classe: 'negocio', origens: [auth('same_password', 422)] },
  { chave: 'email_invalido', classe: 'negocio', origens: [auth('email_address_invalid', 400), auth('validation_failed', 400)] },
  {
    chave: 'muitas_tentativas',
    classe: 'negocio',
    origens: [auth('over_request_rate_limit', 429), auth('over_email_send_rate_limit', 429), { name: 'AuthApiError', status: 429, message: 'x' }],
  },
  { chave: 'link_vencido', classe: 'negocio', origens: [auth('otp_expired', 403)] },
  {
    chave: 'sessao_encerrada',
    classe: 'sessao_encerrada',
    origens: [auth('refresh_token_not_found', 400), auth('session_not_found', 403), { name: 'AuthSessionMissingError', message: 'Auth session missing!' }],
  },
  {
    chave: 'desconhecido',
    classe: 'desconhecido',
    origens: [pg('22023', 'invalid parameter value'), pg('23505', 'duplicate key value'), pg('XX000', 'internal error'), pg('P0001', 'uma mensagem que ninguém conhece'), 'texto solto', null, undefined, 42],
  },
]

describe('catálogo de erros: cada origem dá a chave e a classe da linha', () => {
  for (const { chave, classe, origens } of CATALOGO) {
    it(`${chave} (${classe})`, () => {
      expect(origens.length).toBeGreaterThan(0)
      for (const origem of origens) {
        const erro = classificarErroConta(origem)
        expect(erro.chave, JSON.stringify(origem)).toBe(chave)
        expect(erro.classe, JSON.stringify(origem)).toBe(classe)
      }
    })
  }

  it('a tabela de teste cobre exatamente as chaves do catálogo', () => {
    expect(CATALOGO.map((linha) => linha.chave).sort()).toEqual([...CHAVES_ERRO].sort())
  })

  it('o erro guarda o código e a mensagem originais, para quem precisar depurar', () => {
    expect(classificarErroConta(pg('P0001', 'convite vencido'))).toEqual({
      classe: 'negocio',
      chave: 'convite_vencido',
      codigo: 'P0001',
      mensagemOriginal: 'convite vencido',
    })
    expect(classificarErroConta(auth('weak_password', 422, 'Password should be at least 6 characters.'))).toMatchObject({
      codigo: 'weak_password',
      mensagemOriginal: 'Password should be at least 6 characters.',
    })
    expect(classificarErroConta(new TypeError('Failed to fetch')).codigo).toBe('rede')
  })

  it('42501 é sempre sem_permissao e P0002 é sempre nao_encontrado, qualquer que seja a mensagem', () => {
    for (const mensagem of ['convite invalido', 'ultimo responsavel', 'qualquer']) {
      expect(classificarErroConta(pg('42501', mensagem)).chave).toBe('sem_permissao')
      expect(classificarErroConta(pg('P0002', mensagem)).chave).toBe('nao_encontrado')
    }
  })

  it('um ErroDados passa como está, e erroDaChave devolve a linha pedida', () => {
    const pronto = classificarErroConta(pg('P0001', 'papel igual'))
    expect(ehErroDados(pronto)).toBe(true)
    expect(classificarErroConta(pronto)).toBe(pronto)
    expect(classificarErro(pronto)).toBe(pronto)
    for (const linha of CATALOGO) {
      const erro = erroDaChave(linha.chave as (typeof CHAVES_ERRO)[number])
      expect(erro.chave).toBe(linha.chave)
      expect(erro.classe).toBe(linha.classe)
    }
  })

  it('ehErroDados só aceita o formato completo', () => {
    expect(ehErroDados(null)).toBe(false)
    expect(ehErroDados('rede')).toBe(false)
    expect(ehErroDados({ classe: 'rede', chave: 'rede' })).toBe(false)
  })
})

describe('classificarErro: só a parte comum do catálogo', () => {
  it('reconhece rede, P0002, 42501, 40P01, 23502 e os dois P0001 comuns', () => {
    expect(classificarErro(new TypeError('Failed to fetch')).chave).toBe('rede')
    expect(classificarErro(pg('P0002', 'x')).chave).toBe('nao_encontrado')
    expect(classificarErro(pg('42501', 'x')).chave).toBe('sem_permissao')
    expect(classificarErro(pg('40P01', 'x')).chave).toBe('tente_de_novo')
    expect(classificarErro(pg('23502', 'x')).chave).toBe('parametro_obrigatorio')
    expect(classificarErro(pg('P0001', 'parametro obrigatorio')).chave).toBe('parametro_obrigatorio')
    expect(classificarErro(pg('P0001', 'tente de novo')).chave).toBe('tente_de_novo')
  })

  it('o que é de negócio de uma área fica como desconhecido, para a área classificar', () => {
    expect(classificarErro(pg('P0001', 'convite vencido')).chave).toBe('desconhecido')
    expect(classificarErro(auth('invalid_credentials', 400)).chave).toBe('desconhecido')
  })
})

describe('textos do catálogo', () => {
  const comTexto = CHAVES_ERRO.filter((chave) => chave !== 'conta_inexistente')

  it('cada linha com texto tem a constante, não vazia', () => {
    for (const chave of comTexto) {
      expect(typeof TEXTOS_ERRO[chave], chave).toBe('string')
      expect(TEXTOS_ERRO[chave].trim().length, chave).toBeGreaterThan(0)
    }
  })

  it('conta_inexistente não tem texto nem constante: a tela nunca a mostra', () => {
    expect(Object.keys(TEXTOS_ERRO)).not.toContain('conta_inexistente')
    expect(Object.keys(TEXTOS_ERRO).sort()).toEqual([...comTexto].sort())
  })

  it('nenhuma frase contém código nem mensagem do Postgres ou do Auth', () => {
    const codigos = /\b(P0001|P0002|42501|40P01|23502|23505|23514|22023|PGRST\d+)\b/
    for (const chave of comTexto) {
      const frase = TEXTOS_ERRO[chave]
      expect(frase, chave).not.toMatch(codigos)
      const linha = CATALOGO.find((l) => l.chave === chave)!
      for (const origem of linha.origens) {
        const mensagem = (origem as { message?: unknown } | null)?.message
        if (typeof mensagem === 'string' && mensagem.length > 3) expect(frase, chave).not.toContain(mensagem)
        const codigo = (origem as { code?: unknown } | null)?.code
        if (typeof codigo === 'string' && codigo.length > 3) expect(frase, chave).not.toContain(codigo)
      }
    }
  })

  it('textoDoErro mostra a frase da linha, cai na da classe e preenche o nome da família', () => {
    expect(textoDoErro(erroDaChave('rede'))).toBe(TEXTOS_ERRO.rede)
    expect(textoDoErro(erroDaChave('credenciais'))).toBe(TEXTOS_ERRO.credenciais)
    expect(textoDoErro({ classe: 'sem_permissao', chave: 'outra', codigo: '42501', mensagemOriginal: '' })).toBe(TEXTOS_ERRO.sem_permissao)
    expect(textoDoErro(erroDaChave('conta_inexistente'))).toBe(TEXTOS_ERRO.desconhecido)
    expect(textoDoErro(erroDaChave('ja_e_membro'), 'Família Exemplo')).toBe('Você já faz parte da família Família Exemplo.')
  })
})

describe('fusos e datas', () => {
  it('fusoValido aceita nomes do motor e recusa o resto', () => {
    expect(fusoValido('America/Sao_Paulo')).toBe(true)
    expect(fusoValido('UTC')).toBe(true)
    expect(fusoValido('Fuso/Inexistente')).toBe(false)
    expect(fusoValido('')).toBe(false)
  })

  it('dataNoFuso usa a data de agora no fuso pedido', () => {
    const instante = Date.parse('2026-11-06T01:30:00Z')
    expect(dataNoFuso(instante, 'America/Sao_Paulo')).toBe('2026-11-05')
    expect(dataNoFuso(instante, 'UTC')).toBe('2026-11-06')
    expect(dataNoFuso(instante, 'Asia/Tokyo')).toBe('2026-11-06')
  })

  it('o tipo do modo existe nos dois valores', () => {
    const modos: ModoDados[] = ['supabase', 'memoria']
    expect(modos).toHaveLength(2)
  })
})
