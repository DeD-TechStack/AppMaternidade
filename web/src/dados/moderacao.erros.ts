import { ehErroDados, lerOrigemDoErro, type ClasseErro, type ErroDados } from './comum.ts'
import { classificarErroComunidade, type ChaveErroComunidade } from './comunidade.erros.ts'

// O catálogo de erros do painel de moderação (MAT-40, seção 4.6, linhas da 40b): liga cada erro do banco
// ou do Auth a uma chave. A parte comum (rede, P0002, 42501, 40P01, 23502, sessão) vem da Comunidade e
// de `comum.ts`; aqui ficam as mensagens de negócio das funções de moderação e de papel. O texto de cada
// chave mora em `conteudo/moderacao.ts`.

export type ChaveErroModeracao =
  | ChaveErroComunidade
  | 'motivo_vazio'
  | 'denuncia_inexistente'
  | 'conta_inexistente'
  | 'papel_inexistente'
  | 'denuncia_de_outro_alvo'
  | 'conflito_de_interesse'
  | 'estado_igual'
  | 'decisao_invalida'
  | 'denuncia_ja_decidida'
  | 'validade_no_passado'
  | 'ultimo_admin'
  | 'sem_papel'
  | 'codigo_invalido'
  | 'mfa_indisponivel'

// `P0001`: a mensagem do `raise exception` (sem acento) decide a linha.
const POR_MENSAGEM_P0001: Record<string, ChaveErroModeracao> = {
  'motivo vazio': 'motivo_vazio',
  'denuncia de outro alvo': 'denuncia_de_outro_alvo',
  'conflito de interesse': 'conflito_de_interesse',
  'estado igual': 'estado_igual',
  'decisao invalida': 'decisao_invalida',
  'denuncia ja decidida': 'denuncia_ja_decidida',
  'validade no passado': 'validade_no_passado',
  'ultimo admin': 'ultimo_admin',
}

// `P0002`: a mensagem decide qual "não existe".
const POR_MENSAGEM_P0002: Record<string, ChaveErroModeracao> = {
  'denuncia inexistente': 'denuncia_inexistente',
  'conta inexistente': 'conta_inexistente',
  'papel inexistente': 'papel_inexistente',
}

function montar(chave: ChaveErroModeracao, classe: ClasseErro, codigo: string, mensagem: string): ErroDados {
  return { classe, chave, codigo, mensagemOriginal: mensagem }
}

/**
 * Classifica qualquer erro do painel. A chave específica vale quando a mensagem do banco casa com uma
 * linha do catálogo; senão vale a chave genérica da classe. O que ninguém reconhece é `desconhecido`.
 */
export function classificarErroModeracao(origem: unknown): ErroDados {
  if (ehErroDados(origem)) return origem
  const { codigo, mensagem } = lerOrigemDoErro(origem)
  if (codigo === 'P0001' && POR_MENSAGEM_P0001[mensagem]) return montar(POR_MENSAGEM_P0001[mensagem], 'negocio', codigo, mensagem)
  if (codigo === 'P0002' && POR_MENSAGEM_P0002[mensagem]) return montar(POR_MENSAGEM_P0002[mensagem], 'nao_encontrado', codigo, mensagem)
  if (codigo === '42501' && mensagem === 'sem papel de plataforma') return montar('sem_papel', 'sem_permissao', codigo, mensagem)
  return classificarErroComunidade(origem)
}

// O Auth devolve estes códigos quando o código de seis dígitos está errado ou venceu.
const CODIGOS_DE_CODIGO_RECUSADO = new Set(['mfa_verification_failed', 'mfa_challenge_expired', 'mfa_verification_rejected'])

/**
 * Um erro do Auth ao cadastrar ou verificar o fator: rede e sessão encerrada seguem as classes
 * comuns; código recusado é `codigo_invalido`; qualquer outra recusa (por exemplo, o TOTP desligado no
 * projeto) é `mfa_indisponivel`.
 */
export function classificarErroMfa(origem: unknown): ErroDados {
  if (ehErroDados(origem)) return origem
  const comum = classificarErroModeracao(origem)
  if (comum.classe === 'rede' || comum.classe === 'sessao_encerrada') return comum
  const { codigo, mensagem } = lerOrigemDoErro(origem)
  if (CODIGOS_DE_CODIGO_RECUSADO.has(codigo) || /invalid totp|invalid.*code/i.test(mensagem)) {
    return montar('codigo_invalido', 'negocio', codigo, mensagem)
  }
  return montar('mfa_indisponivel', 'negocio', codigo, mensagem)
}

/** Uma origem de exemplo para cada linha nova do catálogo, como o banco a devolve (simulação na memória). */
const ORIGEM_DE_EXEMPLO: Record<Exclude<ChaveErroModeracao, ChaveErroComunidade>, unknown> = {
  motivo_vazio: { code: 'P0001', message: 'motivo vazio' },
  denuncia_inexistente: { code: 'P0002', message: 'denuncia inexistente' },
  conta_inexistente: { code: 'P0002', message: 'conta inexistente' },
  papel_inexistente: { code: 'P0002', message: 'papel inexistente' },
  denuncia_de_outro_alvo: { code: 'P0001', message: 'denuncia de outro alvo' },
  conflito_de_interesse: { code: 'P0001', message: 'conflito de interesse' },
  estado_igual: { code: 'P0001', message: 'estado igual' },
  decisao_invalida: { code: 'P0001', message: 'decisao invalida' },
  denuncia_ja_decidida: { code: 'P0001', message: 'denuncia ja decidida' },
  validade_no_passado: { code: 'P0001', message: 'validade no passado' },
  ultimo_admin: { code: 'P0001', message: 'ultimo admin' },
  sem_papel: { code: '42501', message: 'sem papel de plataforma' },
  codigo_invalido: { name: 'AuthApiError', code: 'mfa_verification_failed', status: 400, message: 'Invalid TOTP code entered' },
  mfa_indisponivel: { name: 'AuthApiError', code: 'mfa_totp_enroll_not_enabled', status: 400, message: 'MFA enroll is disabled for TOTP' },
}

const ORIGEM_COMUM: Partial<Record<ChaveErroComunidade, unknown>> = {
  rede: { name: 'TypeError', message: 'Failed to fetch' },
  tente_de_novo: { code: '40P01', message: 'deadlock detected' },
  nao_encontrado: { code: 'P0002', message: 'conteudo inexistente' },
  sem_permissao: { code: '42501', message: 'sem permissao' },
  parametro_obrigatorio: { code: 'P0001', message: 'parametro obrigatorio' },
  alvo_inexistente: { code: 'P0002', message: 'alvo inexistente' },
  sessao_encerrada: {
    name: 'AuthApiError',
    code: 'session_not_found',
    status: 403,
    message: 'Session from session_id claim in JWT does not exist',
  },
  desconhecido: { code: '22023', message: 'invalid parameter value' },
}

/** O erro de uma linha do catálogo, como o banco ou o Auth o devolveria. */
export function erroDaChaveModeracao(chave: ChaveErroModeracao): ErroDados {
  if (chave in ORIGEM_DE_EXEMPLO) {
    const origem = ORIGEM_DE_EXEMPLO[chave as keyof typeof ORIGEM_DE_EXEMPLO]
    return chave === 'codigo_invalido' || chave === 'mfa_indisponivel' ? classificarErroMfa(origem) : classificarErroModeracao(origem)
  }
  return classificarErroModeracao(ORIGEM_COMUM[chave as ChaveErroComunidade] ?? ORIGEM_COMUM.desconhecido)
}
