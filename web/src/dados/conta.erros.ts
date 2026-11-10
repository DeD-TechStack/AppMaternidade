import { classificarErro, ehErroDados, lerOrigemDoErro, type ClasseErro, type ErroDados } from './comum.ts'

// O catálogo da área de conta: liga cada erro do banco e do Auth a uma chave e a uma classe. O
// texto de cada chave mora em `conteudo/conta.ts`. A parte comum (rede, P0002, 42501...) é de
// `comum.ts`; aqui ficam as mensagens de negócio do Postgres e os códigos do Auth.

export const CHAVES_ERRO = [
  'rede',
  'tente_de_novo',
  'nao_encontrado',
  'sem_permissao',
  'parametro_obrigatorio',
  'conta_inexistente',
  'nome_vazio',
  'fuso_invalido',
  'nascimento_no_futuro',
  'convite_invalido',
  'convite_revogado',
  'convite_usado',
  'convite_vencido',
  'ja_e_membro',
  'convite_nao_pendente',
  'responsavel_sem_validade',
  'validade_menor',
  'papel_igual',
  'vinculo_inativo',
  'use_sair',
  'ultimo_responsavel',
  'credenciais',
  'email_nao_confirmado',
  'email_em_uso',
  'senha_fraca',
  'senha_igual',
  'email_invalido',
  'muitas_tentativas',
  'link_vencido',
  'sessao_encerrada',
  'desconhecido',
] as const

export type ChaveErro = (typeof CHAVES_ERRO)[number]

// `P0001`: a mensagem do `raise exception` (sem acento) decide a linha.
const POR_MENSAGEM_P0001: Record<string, ChaveErro> = {
  'conta inexistente': 'conta_inexistente',
  'nome vazio': 'nome_vazio',
  'convite invalido': 'convite_invalido',
  'convite revogado': 'convite_revogado',
  'convite usado': 'convite_usado',
  'convite vencido': 'convite_vencido',
  'ja e membro': 'ja_e_membro',
  'convite nao pendente': 'convite_nao_pendente',
  'responsavel sem validade': 'responsavel_sem_validade',
  'validade menor que o convite': 'validade_menor',
  'papel igual': 'papel_igual',
  'vinculo inativo': 'vinculo_inativo',
  'use sair da familia': 'use_sair',
  'ultimo responsavel': 'ultimo_responsavel',
}

const POR_MENSAGEM_23514: Record<string, ChaveErro> = {
  'fuso invalido': 'fuso_invalido',
  'nascimento no futuro': 'nascimento_no_futuro',
}

// Os códigos do Auth (`AuthError.code`).
const POR_CODIGO_DO_AUTH: Record<string, ChaveErro> = {
  invalid_credentials: 'credenciais',
  email_not_confirmed: 'email_nao_confirmado',
  user_already_exists: 'email_em_uso',
  email_exists: 'email_em_uso',
  weak_password: 'senha_fraca',
  same_password: 'senha_igual',
  email_address_invalid: 'email_invalido',
  validation_failed: 'email_invalido',
  over_request_rate_limit: 'muitas_tentativas',
  over_email_send_rate_limit: 'muitas_tentativas',
  otp_expired: 'link_vencido',
  refresh_token_not_found: 'sessao_encerrada',
  session_not_found: 'sessao_encerrada',
  session_expired: 'sessao_encerrada',
  bad_jwt: 'sessao_encerrada',
  PGRST301: 'sessao_encerrada',
  PGRST303: 'sessao_encerrada',
}

function montar(chave: ChaveErro, codigo: string, mensagem: string): ErroDados {
  const classe: ClasseErro = chave === 'sessao_encerrada' ? 'sessao_encerrada' : 'negocio'
  return { classe, chave, codigo, mensagemOriginal: mensagem }
}

/**
 * Classifica qualquer erro da área de conta. O que a parte comum reconhece sai dela; o resto passa
 * pelas mensagens de negócio e pelos códigos do Auth. O que ninguém reconhece é `desconhecido`
 * (inclui `22023` e `23505`, que a tela só trata pela conferência da regra "rede numa escrita").
 */
export function classificarErroConta(origem: unknown): ErroDados {
  if (ehErroDados(origem)) return origem
  const comum = classificarErro(origem)
  if (comum.chave !== 'desconhecido') return comum

  const { codigo, mensagem, status, nome } = lerOrigemDoErro(origem)
  if (codigo === 'P0001' && POR_MENSAGEM_P0001[mensagem]) return montar(POR_MENSAGEM_P0001[mensagem], codigo, mensagem)
  if (codigo === '23514' && POR_MENSAGEM_23514[mensagem]) return montar(POR_MENSAGEM_23514[mensagem], codigo, mensagem)
  if (codigo && POR_CODIGO_DO_AUTH[codigo]) return montar(POR_CODIGO_DO_AUTH[codigo], codigo, mensagem)
  if (status === 429) return montar('muitas_tentativas', codigo || '429', mensagem)
  if (nome === 'AuthSessionMissingError' || status === 401) return montar('sessao_encerrada', codigo || '401', mensagem)
  return comum
}

// Uma origem de exemplo para cada linha do catálogo, no formato que o banco e o Auth devolvem.
// Serve à simulação de falhas na memória: `erroDaChave` passa pelo mesmo classificador.
const ORIGEM_DE_EXEMPLO: Record<ChaveErro, unknown> = {
  rede: { name: 'TypeError', message: 'Failed to fetch' },
  tente_de_novo: { code: '40P01', message: 'deadlock detected' },
  nao_encontrado: { code: 'P0002', message: 'familia inexistente' },
  sem_permissao: { code: '42501', message: 'sem permissao' },
  parametro_obrigatorio: { code: 'P0001', message: 'parametro obrigatorio' },
  conta_inexistente: { code: 'P0001', message: 'conta inexistente' },
  nome_vazio: { code: 'P0001', message: 'nome vazio' },
  fuso_invalido: { code: '23514', message: 'fuso invalido' },
  nascimento_no_futuro: { code: '23514', message: 'nascimento no futuro' },
  convite_invalido: { code: 'P0001', message: 'convite invalido' },
  convite_revogado: { code: 'P0001', message: 'convite revogado' },
  convite_usado: { code: 'P0001', message: 'convite usado' },
  convite_vencido: { code: 'P0001', message: 'convite vencido' },
  ja_e_membro: { code: 'P0001', message: 'ja e membro' },
  convite_nao_pendente: { code: 'P0001', message: 'convite nao pendente' },
  responsavel_sem_validade: { code: 'P0001', message: 'responsavel sem validade' },
  validade_menor: { code: 'P0001', message: 'validade menor que o convite' },
  papel_igual: { code: 'P0001', message: 'papel igual' },
  vinculo_inativo: { code: 'P0001', message: 'vinculo inativo' },
  use_sair: { code: 'P0001', message: 'use sair da familia' },
  ultimo_responsavel: { code: 'P0001', message: 'ultimo responsavel' },
  credenciais: { name: 'AuthApiError', code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' },
  email_nao_confirmado: { name: 'AuthApiError', code: 'email_not_confirmed', status: 400, message: 'Email not confirmed' },
  email_em_uso: { name: 'AuthApiError', code: 'user_already_exists', status: 422, message: 'User already registered' },
  senha_fraca: { name: 'AuthApiError', code: 'weak_password', status: 422, message: 'Password should be at least 6 characters.' },
  senha_igual: { name: 'AuthApiError', code: 'same_password', status: 422, message: 'New password should be different from the old password.' },
  email_invalido: { name: 'AuthApiError', code: 'email_address_invalid', status: 400, message: 'Email address is invalid' },
  muitas_tentativas: { name: 'AuthApiError', code: 'over_request_rate_limit', status: 429, message: 'Request rate limit reached' },
  link_vencido: { name: 'AuthApiError', code: 'otp_expired', status: 403, message: 'Email link is invalid or has expired' },
  sessao_encerrada: { name: 'AuthApiError', code: 'session_not_found', status: 403, message: 'Session from session_id claim in JWT does not exist' },
  desconhecido: { code: '22023', message: 'invalid parameter value' },
}

/** O erro de uma linha do catálogo, como o banco ou o Auth o devolveriam. */
export function erroDaChave(chave: ChaveErro): ErroDados {
  return classificarErroConta(ORIGEM_DE_EXEMPLO[chave])
}
