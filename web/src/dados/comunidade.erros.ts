import { classificarErro, ehErroDados, lerOrigemDoErro, type ClasseErro, type ErroDados } from './comum.ts'

// O catálogo de erros da Comunidade (MAT-40, seção 4.6): liga cada erro do banco a uma chave. A parte
// comum (rede, P0002, 42501, 40P01, 23502) é de `comum.ts`; aqui ficam as mensagens de negócio da
// MAT-47 e as restrições que a tela traduz. O texto de cada chave mora em `conteudo/comunidade.ts`.

export type ChaveErroComunidade =
  | 'rede'
  | 'tente_de_novo'
  | 'nao_encontrado'
  | 'sem_permissao'
  | 'nao_editavel'
  | 'parametro_obrigatorio'
  | 'sem_conta'
  | 'termos_indisponiveis'
  | 'sem_aceite'
  | 'sem_perfil'
  | 'versao_nao_vigente'
  | 'alvo_invalido'
  | 'alvo_inexistente'
  | 'so_um_nivel'
  | 'resposta_de_outro_topico'
  | 'apelido_em_uso'
  | 'texto_fora_do_tamanho'
  | 'sessao_encerrada'
  | 'desconhecido'

// `P0001`: a mensagem do `raise exception` (sem acento) decide a linha.
const POR_MENSAGEM_P0001: Record<string, ChaveErroComunidade> = {
  'sem conta': 'sem_conta',
  'termos indisponiveis': 'termos_indisponiveis',
  'sem aceite': 'sem_aceite',
  'sem perfil': 'sem_perfil',
  'versao nao vigente': 'versao_nao_vigente',
  'so um nivel de resposta': 'so_um_nivel',
  'resposta de outro topico': 'resposta_de_outro_topico',
}

// `23514`: o nome da restrição vem dentro da mensagem do Postgres.
const RESTRICOES_DE_TAMANHO = [
  'perfis_publicos_apelido_tamanho',
  'perfis_publicos_bio_tamanho',
  'topicos_titulo_tamanho',
  'topicos_corpo_tamanho',
  'respostas_corpo_tamanho',
  'denuncias_texto_tamanho',
]

const CODIGOS_DE_SESSAO = new Set(['refresh_token_not_found', 'session_not_found', 'session_expired', 'bad_jwt', 'PGRST301', 'PGRST303'])

function montar(chave: ChaveErroComunidade, classe: ClasseErro, codigo: string, mensagem: string): ErroDados {
  return { classe, chave, codigo, mensagemOriginal: mensagem }
}

/**
 * Classifica qualquer erro da Comunidade. A chave específica vale quando a mensagem do banco casa com
 * uma linha do catálogo; senão vale a chave genérica da classe. O que ninguém reconhece é `desconhecido`.
 */
export function classificarErroComunidade(origem: unknown): ErroDados {
  if (ehErroDados(origem)) return origem
  const { codigo, mensagem, status, nome } = lerOrigemDoErro(origem)

  if (CODIGOS_DE_SESSAO.has(codigo) || nome === 'AuthSessionMissingError' || status === 401) {
    return montar('sessao_encerrada', 'sessao_encerrada', codigo || '401', mensagem)
  }
  if (codigo === 'P0001' && POR_MENSAGEM_P0001[mensagem]) return montar(POR_MENSAGEM_P0001[mensagem], 'negocio', codigo, mensagem)
  if (codigo === 'P0002' && mensagem === 'alvo inexistente') return montar('alvo_inexistente', 'nao_encontrado', codigo, mensagem)
  if (codigo === '23514' && mensagem === 'alvo invalido') return montar('alvo_invalido', 'negocio', codigo, mensagem)
  if (codigo === '23514' && RESTRICOES_DE_TAMANHO.some((restricao) => mensagem.includes(restricao))) {
    return montar('texto_fora_do_tamanho', 'negocio', codigo, mensagem)
  }
  if (codigo === '23505' && mensagem.includes('perfis_publicos_apelido_idx')) {
    return montar('apelido_em_uso', 'negocio', codigo, mensagem)
  }
  return classificarErro(origem)
}

/** O update que o banco filtrou (zero linhas, sem erro): moderado, removido ou sem aceite. */
export function erroNaoEditavel(): ErroDados {
  return { classe: 'nao_encontrado', chave: 'nao_editavel', codigo: '', mensagemOriginal: '' }
}

/** `23505` na restrição de uma conta por perfil: o perfil já existe (criado noutra aba). */
export const ehPerfilJaCriado = (erro: ErroDados): boolean =>
  erro.codigo === '23505' && erro.mensagemOriginal.includes('perfis_publicos_conta_unica')

/** Uma origem de exemplo para cada linha do catálogo, como o banco a devolve (simulação na memória). */
const ORIGEM_DE_EXEMPLO: Record<ChaveErroComunidade, unknown> = {
  rede: { name: 'TypeError', message: 'Failed to fetch' },
  tente_de_novo: { code: '40P01', message: 'deadlock detected' },
  nao_encontrado: { code: 'P0002', message: 'topico inexistente' },
  sem_permissao: { code: '42501', message: 'sem permissao' },
  nao_editavel: erroNaoEditavel(),
  parametro_obrigatorio: { code: 'P0001', message: 'parametro obrigatorio' },
  sem_conta: { code: 'P0001', message: 'sem conta' },
  termos_indisponiveis: { code: 'P0001', message: 'termos indisponiveis' },
  sem_aceite: { code: 'P0001', message: 'sem aceite' },
  sem_perfil: { code: 'P0001', message: 'sem perfil' },
  versao_nao_vigente: { code: 'P0001', message: 'versao nao vigente' },
  alvo_invalido: { code: '23514', message: 'alvo invalido' },
  alvo_inexistente: { code: 'P0002', message: 'alvo inexistente' },
  so_um_nivel: { code: 'P0001', message: 'so um nivel de resposta' },
  resposta_de_outro_topico: { code: 'P0001', message: 'resposta de outro topico' },
  apelido_em_uso: {
    code: '23505',
    message: 'duplicate key value violates unique constraint "perfis_publicos_apelido_idx"',
  },
  texto_fora_do_tamanho: {
    code: '23514',
    message: 'new row for relation "topicos" violates check constraint "topicos_titulo_tamanho"',
  },
  sessao_encerrada: { name: 'AuthApiError', code: 'session_not_found', status: 403, message: 'Session from session_id claim in JWT does not exist' },
  desconhecido: { code: '22023', message: 'invalid parameter value' },
}

/** O erro de uma linha do catálogo, como o banco o devolveria. */
export function erroDaChaveComunidade(chave: ChaveErroComunidade): ErroDados {
  return classificarErroComunidade(ORIGEM_DE_EXEMPLO[chave])
}
