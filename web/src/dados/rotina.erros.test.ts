import { describe, expect, it } from 'vitest'
import { CHAVES_ERRO_ROTINA, classificarErroRotina, erroRotinaDaChave } from './rotina.erros.ts'

// O catálogo do Anexo B, linha por linha: código e mensagem do banco → chave e classe.

const LINHAS: Array<[string, string, string, string, string]> = [
  // código, mensagem, chave, classe, rótulo
  ['23502', 'parametro obrigatorio', 'parametro_obrigatorio', 'negocio', 'parâmetro obrigatório'],
  ['P0002', 'registro inexistente', 'nao_encontrado', 'nao_encontrado', 'registro inexistente'],
  ['P0002', 'nota inexistente', 'nao_encontrado', 'nao_encontrado', 'nota inexistente'],
  ['P0002', 'bebe inexistente', 'nao_encontrado', 'nao_encontrado', 'bebê inexistente'],
  ['P0002', 'familia inexistente', 'nao_encontrado', 'nao_encontrado', 'família inexistente'],
  ['42501', 'sem permissao', 'sem_permissao', 'sem_permissao', 'sem permissão'],
  ['P0001', 'bebe arquivado', 'bebe_arquivado', 'negocio', 'bebê arquivado'],
  ['P0001', 'registro excluido', 'registro_excluido', 'negocio', 'registro excluído'],
  ['P0001', 'nota excluida', 'nota_excluida', 'negocio', 'nota excluída'],
  ['P0001', 'nao e sessao', 'nao_e_sessao', 'negocio', 'não é sessão'],
  ['P0001', 'sessao encerrada', 'sessao_ja_encerrada', 'negocio', 'sessão encerrada'],
  ['P0001', 'prazo de restauracao encerrado', 'prazo_encerrado', 'negocio', 'prazo encerrado'],
  ['P0001', 'autor desconhecido', 'autor_desconhecido', 'desconhecido', 'autor desconhecido'],
  ['23514', 'horario no futuro', 'horario_no_futuro', 'negocio', 'horário no futuro'],
  ['23514', 'new row for relation "registros" violates check constraint "registros_fim_check"', 'valor_invalido', 'negocio', 'outra check'],
  ['40P01', 'tente de novo', 'tente_de_novo', 'tente_de_novo', 'tente de novo'],
  ['22023', 'invalid time zone', 'fuso_da_familia_invalido', 'desconhecido', 'fuso da família inválido'],
  ['PGRST301', 'JWT expired', 'sessao_encerrada', 'sessao_encerrada', 'token vencido'],
  ['P0001', 'uma mensagem que ninguém conhece', 'desconhecido', 'desconhecido', 'P0001 fora da tabela'],
  ['XX000', 'internal error', 'desconhecido', 'desconhecido', 'qualquer outro código'],
]

describe('catálogo de erros da rotina (Anexo B)', () => {
  for (const [codigo, mensagem, chave, classe, rotulo] of LINHAS) {
    it(`${codigo} "${rotulo}" vira ${chave} (${classe})`, () => {
      const erro = classificarErroRotina({ code: codigo, message: mensagem })
      expect(erro).toEqual({ chave, classe, codigo, mensagemOriginal: mensagem })
    })
  }

  it('sem resposta do servidor (fetch falhou) é rede', () => {
    expect(classificarErroRotina(new TypeError('Failed to fetch')).chave).toBe('rede')
    expect(classificarErroRotina({ message: 'FetchError: network request failed' }).classe).toBe('rede')
  })

  it('HTTP 401 é sessao_encerrada; HTTP 5xx e erro sem código nem mensagem são desconhecido, nunca rede', () => {
    expect(classificarErroRotina({ status: 401, message: 'Unauthorized' }).chave).toBe('sessao_encerrada')
    expect(classificarErroRotina({ status: 503, message: 'Service Unavailable' }).chave).toBe('desconhecido')
    expect(classificarErroRotina({ status: 500 }).chave).toBe('desconhecido')
    expect(classificarErroRotina({}).chave).toBe('desconhecido')
    expect(classificarErroRotina(null).chave).toBe('desconhecido')
  })

  it('a chave sessao_ja_encerrada (sessão de cuidado) não se confunde com sessao_encerrada (login)', () => {
    expect(classificarErroRotina({ code: 'P0001', message: 'sessao encerrada' }).classe).toBe('negocio')
    expect(classificarErroRotina({ code: 'PGRST301', message: 'x' }).classe).toBe('sessao_encerrada')
  })

  it('um ErroDados já classificado passa sem mudança', () => {
    const erro = erroRotinaDaChave('bebe_arquivado')
    expect(classificarErroRotina(erro)).toBe(erro)
  })

  it('toda chave do catálogo tem uma origem de exemplo que volta para a mesma chave', () => {
    for (const chave of CHAVES_ERRO_ROTINA) expect(erroRotinaDaChave(chave).chave, chave).toBe(chave)
  })
})
