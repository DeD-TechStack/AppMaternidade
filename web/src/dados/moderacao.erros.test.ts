import { describe, expect, it } from 'vitest'
import { TEXTOS_ERRO_COMUNIDADE } from '../conteudo/comunidade.ts'
import { TEXTOS_ERRO_MODERACAO, TX, textoDoErroModeracao } from '../conteudo/moderacao.ts'
import { classificarErroMfa, classificarErroModeracao, erroDaChaveModeracao } from './moderacao.erros.ts'

// MAT-40, teste 3 (linhas da 40b): cada linha nova da tabela fechada de frases (4.6) vira uma asserção, de
// código e mensagem para chave e frase. Entram também os textos TX-12 a TX-37 da 40b e a precedência.

// [código, mensagem do banco, chave, classe, a frase do contrato]
const LINHAS: Array<[string, string, string, string, string]> = [
  ['P0001', 'motivo vazio', 'motivo_vazio', 'negocio', 'Escreva o motivo.'],
  ['P0002', 'denuncia inexistente', 'denuncia_inexistente', 'nao_encontrado', 'Essa denúncia não existe mais.'],
  ['P0002', 'conta inexistente', 'conta_inexistente', 'nao_encontrado', 'Não existe conta com esse id. Confira o id copiado da tela Conta.'],
  ['P0002', 'papel inexistente', 'papel_inexistente', 'nao_encontrado', 'Essa conta não tem esse papel.'],
  ['P0001', 'denuncia de outro alvo', 'denuncia_de_outro_alvo', 'negocio', 'Essa denúncia é de outro conteúdo.'],
  [
    'P0001',
    'conflito de interesse',
    'conflito_de_interesse',
    'negocio',
    'Você não pode agir sobre conteúdo seu nem sobre denúncia que você abriu. Peça a outra pessoa da equipe.',
  ],
  ['P0001', 'estado igual', 'estado_igual', 'negocio', 'Já está nesse estado.'],
  ['P0001', 'decisao invalida', 'decisao_invalida', 'negocio', 'Escolha uma decisão.'],
  ['P0001', 'denuncia ja decidida', 'denuncia_ja_decidida', 'negocio', 'Essa denúncia já foi decidida.'],
  ['P0001', 'validade no passado', 'validade_no_passado', 'negocio', 'A validade precisa ser uma data futura.'],
  ['P0001', 'ultimo admin', 'ultimo_admin', 'negocio', 'Não dá para tirar o último admin. Conceda o papel a outra pessoa antes.'],
  ['42501', 'sem papel de plataforma', 'sem_papel', 'sem_permissao', 'Seu acesso à moderação terminou.'],
]

describe('as linhas novas da tabela fechada de frases (40b)', () => {
  for (const [codigo, mensagem, chave, classe, frase] of LINHAS) {
    it(`${codigo} "${mensagem}" → ${chave}`, () => {
      const erro = classificarErroModeracao({ code: codigo, message: mensagem })
      expect(erro).toMatchObject({ chave, classe, codigo, mensagemOriginal: mensagem })
      expect(TEXTOS_ERRO_MODERACAO[chave]).toBe(frase)
      expect(textoDoErroModeracao(erro)).toBe(frase)
    })
  }

  it('o código do Auth recusado é codigo_invalido, e qualquer outra recusa é mfa_indisponivel', () => {
    for (const origem of [
      { name: 'AuthApiError', code: 'mfa_verification_failed', status: 400, message: 'Invalid TOTP code entered' },
      { name: 'AuthApiError', code: 'mfa_challenge_expired', status: 400, message: 'MFA challenge has expired' },
      { message: 'invalid totp code' },
    ]) {
      expect(classificarErroMfa(origem).chave).toBe('codigo_invalido')
    }
    expect(textoDoErroModeracao(classificarErroMfa({ name: 'AuthApiError', code: 'mfa_verification_failed', message: 'Invalid TOTP code entered' }))).toBe(
      'Código incorreto ou vencido. Confira o app autenticador e tente de novo.',
    )
    const indisponivel = classificarErroMfa({ name: 'AuthApiError', code: 'mfa_totp_enroll_not_enabled', status: 400, message: 'MFA enroll is disabled for TOTP' })
    expect(indisponivel.chave).toBe('mfa_indisponivel')
    expect(textoDoErroModeracao(indisponivel)).toBe('A verificação em duas etapas não está disponível agora. Avise a equipe técnica.')
  })

  it('no Auth, a rede e a sessão encerrada seguem as classes comuns', () => {
    expect(classificarErroMfa(new TypeError('Failed to fetch')).classe).toBe('rede')
    expect(classificarErroMfa({ name: 'AuthSessionMissingError', message: 'x' }).classe).toBe('sessao_encerrada')
  })

  it('a precedência: a mensagem do catálogo vale; senão, a frase genérica da classe', () => {
    expect(classificarErroModeracao({ code: 'P0002', message: 'alvo inexistente' }).chave).toBe('alvo_inexistente')
    expect(classificarErroModeracao({ code: 'P0002', message: 'qualquer outra' }).chave).toBe('nao_encontrado')
    expect(classificarErroModeracao({ code: '42501', message: 'permission denied for table denuncias' }).chave).toBe('sem_permissao')
    expect(classificarErroModeracao({ code: 'P0001', message: 'fora do catalogo' }).chave).toBe('desconhecido')
    expect(classificarErroModeracao({ code: '22P02', message: 'invalid input syntax for type uuid: "x"' }).chave).toBe('desconhecido')
  })

  it('as frases da 40a continuam na tabela da 40b, e o desconhecido mostra o código', () => {
    for (const [chave, frase] of Object.entries(TEXTOS_ERRO_COMUNIDADE)) expect(TEXTOS_ERRO_MODERACAO[chave]).toBe(frase)
    expect(textoDoErroModeracao(classificarErroModeracao({ code: '22P02', message: 'x' }))).toBe(`${TEXTOS_ERRO_MODERACAO.desconhecido} (22P02)`)
  })

  it('cada chave do catálogo da 40b tem uma origem de exemplo que volta à mesma chave', () => {
    for (const [, , chave] of LINHAS) expect(erroDaChaveModeracao(chave as never).chave).toBe(chave)
    expect(erroDaChaveModeracao('codigo_invalido').chave).toBe('codigo_invalido')
    expect(erroDaChaveModeracao('mfa_indisponivel').chave).toBe('mfa_indisponivel')
    expect(erroDaChaveModeracao('rede').classe).toBe('rede')
  })

  it('nenhuma frase da 40b cita termo de banco', () => {
    for (const frase of Object.values(TEXTOS_ERRO_MODERACAO)) {
      expect(frase).not.toMatch(/P0001|P0002|42501|23505|23514|rls|constraint|SQL|banco de dados/i)
    }
  })
})

describe('os textos fixos da 40b (seção 4.11)', () => {
  it('TX-12 a TX-37 são os do contrato', () => {
    expect(TX.tx12).toBe('Esta área é só da equipe de moderação.')
    expect(TX.tx13).toBe('Nenhuma denúncia com esses filtros.')
    expect(TX.tx14).toBe('Feito. A ação ficou registrada na auditoria.')
    expect(TX.tx15).toBe(
      'Se a última pessoa admin excluir a própria conta, ninguém mais concede papéis pelo site. A equipe técnica recupera por migração.',
    )
    expect(TX.tx20).toBe('Nenhuma ação registrada ainda.')
    expect(TX.tx28).toBe('Perfil excluído. A denúncia ainda pode ser decidida.')
    expect(TX.tx29).toBe('Nenhum outro conteúdo deste perfil.')
    expect(TX.tx31).toBe('Nenhum papel registrado.')
    expect(TX.tx32).toBe('Já estava assim quando conferimos. Veja na auditoria quem fez a ação.')
    expect(TX.tx33).toBe('Verificação em duas etapas')
    expect(TX.tx34).toBe('Para abrir o painel, confirme com o código do seu app autenticador.')
    expect(TX.tx35).toBe('Cadastrar app autenticador')
    expect(TX.tx36).toBe('QR code para cadastrar o app autenticador')
    expect(TX.tx37).toBe('Código de 6 dígitos')
    expect(TX.selo).toBe('Moderação · uso interno')
  })
})
