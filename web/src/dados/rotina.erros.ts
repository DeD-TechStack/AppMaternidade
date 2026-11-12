import { classificarErro, ehErroDados, lerOrigemDoErro, type ClasseErro, type ErroDados } from './comum.ts'

// O catálogo da rotina (Anexo B): liga cada erro do banco a uma chave e a uma classe. O texto de cada
// chave mora em `conteudo/rotina.ts`. A rotina aplica primeiro as linhas próprias e depois o
// `classificarErro` comum (rede, `P0002`, `42501`, `40P01`, `23502`). Código e mensagem originais ficam
// no erro, mas nunca aparecem na tela.

export const CHAVES_ERRO_ROTINA = [
  'rede',
  'parametro_obrigatorio',
  'nao_encontrado',
  'sem_permissao',
  'bebe_arquivado',
  'registro_excluido',
  'nota_excluida',
  'nao_e_sessao',
  'sessao_ja_encerrada',
  'prazo_encerrado',
  'autor_desconhecido',
  'horario_no_futuro',
  'valor_invalido',
  'tente_de_novo',
  'fuso_da_familia_invalido',
  'sessao_encerrada',
  'desconhecido',
] as const

export type ChaveErroRotina = (typeof CHAVES_ERRO_ROTINA)[number]

const POR_MENSAGEM_P0001: Record<string, ChaveErroRotina> = {
  'bebe arquivado': 'bebe_arquivado',
  'registro excluido': 'registro_excluido',
  'nota excluida': 'nota_excluida',
  'nao e sessao': 'nao_e_sessao',
  'sessao encerrada': 'sessao_ja_encerrada',
  'prazo de restauracao encerrado': 'prazo_encerrado',
  'autor desconhecido': 'autor_desconhecido',
}

const montar = (classe: ClasseErro, chave: string, codigo: string, mensagem: string): ErroDados => ({
  classe,
  chave,
  codigo,
  mensagemOriginal: mensagem,
})

/** Classifica qualquer erro da rotina. O que ninguém reconhece é `desconhecido`. */
export function classificarErroRotina(origem: unknown): ErroDados {
  if (ehErroDados(origem)) return origem
  const { codigo, mensagem, status } = lerOrigemDoErro(origem)

  if (codigo === 'PGRST301' || status === 401) return montar('sessao_encerrada', 'sessao_encerrada', codigo || '401', mensagem)
  if (codigo === 'P0001' && POR_MENSAGEM_P0001[mensagem]) {
    const chave = POR_MENSAGEM_P0001[mensagem]
    return montar(chave === 'autor_desconhecido' ? 'desconhecido' : 'negocio', chave, codigo, mensagem)
  }
  if (codigo === '23514') {
    return mensagem === 'horario no futuro'
      ? montar('negocio', 'horario_no_futuro', codigo, mensagem)
      : montar('negocio', 'valor_invalido', codigo, mensagem)
  }
  if (codigo === '22023') return montar('desconhecido', 'fuso_da_familia_invalido', codigo, mensagem)

  const comum = classificarErro(origem)
  // Resposta HTTP sem código ou erro de servidor: `desconhecido`, nunca "rede".
  return comum
}

/** Uma origem de exemplo para cada linha, no formato do banco. Serve à simulação de falhas na memória. */
const ORIGEM_DE_EXEMPLO: Record<ChaveErroRotina, unknown> = {
  rede: { name: 'TypeError', message: 'Failed to fetch' },
  parametro_obrigatorio: { code: '23502', message: 'parametro obrigatorio' },
  nao_encontrado: { code: 'P0002', message: 'registro inexistente' },
  sem_permissao: { code: '42501', message: 'sem permissao' },
  bebe_arquivado: { code: 'P0001', message: 'bebe arquivado' },
  registro_excluido: { code: 'P0001', message: 'registro excluido' },
  nota_excluida: { code: 'P0001', message: 'nota excluida' },
  nao_e_sessao: { code: 'P0001', message: 'nao e sessao' },
  sessao_ja_encerrada: { code: 'P0001', message: 'sessao encerrada' },
  prazo_encerrado: { code: 'P0001', message: 'prazo de restauracao encerrado' },
  autor_desconhecido: { code: 'P0001', message: 'autor desconhecido' },
  horario_no_futuro: { code: '23514', message: 'horario no futuro' },
  valor_invalido: { code: '23514', message: 'new row violates check constraint' },
  tente_de_novo: { code: '40P01', message: 'tente de novo' },
  fuso_da_familia_invalido: { code: '22023', message: 'invalid time zone' },
  sessao_encerrada: { code: 'PGRST301', message: 'JWT expired', status: 401 },
  desconhecido: { code: 'XX000', message: 'erro qualquer' },
}

export const erroRotinaDaChave = (chave: ChaveErroRotina): ErroDados => classificarErroRotina(ORIGEM_DE_EXEMPLO[chave])

/** Um erro de formato: resposta sem erro, mas com corpo diferente do esperado (R38-02). */
export function formatoInesperado(onde: string): never {
  throw { code: 'unexpected_failure', message: `Resposta fora do formato: ${onde}.` }
}
