// Textos da sessão que não vêm do estado do protótipo.
export const TITULO_SEM_SESSAO = 'Nenhuma sessão em andamento'

export const SUBTITULO_SEM_SESSAO = 'Comece uma sessão pelo registro rápido, na tela Hoje.'

/** O cartão da sessão em andamento do Hoje (CartaoSessao). */
export const CARTAO_SESSAO = {
  emAndamento: 'Em andamento',
  semSessao: 'Nenhuma sessão em andamento.',
  comoComecar: 'Para começar, toque em Sono ou Mamada no registro rápido, embaixo.',
  /** Termina em vírgula e espaço: o autor ("por Pessoa") vem logo depois, em outro elemento. */
  inicioAs: (hora: string) => `Início às ${hora}, `,
  porPessoa: (pessoa: string) => `por ${pessoa}`,
  tempoDe: (tipo: string) => `Tempo de ${tipo}`,
  encerrar: 'Encerrar',
  verSessao: 'Ver sessão',
} as const

/** Os títulos das sessões já encerradas (SessoesAnteriores). */
export const SESSOES_ANTERIORES = {
  sono: 'Sessões anteriores de sono',
  mamada: 'Mamadas anteriores',
  tummy: 'Sessões anteriores de tummy time',
  nenhuma: 'Nenhuma ainda.',
} as const

/** A tela de cronômetro da sessão (CronometroSessao): os rótulos e os painéis de nota e de descarte. */
export const CRONOMETRO_SESSAO = {
  duracao: 'Duração da sessão',
  atividadeSugerida: (atividade: string) => `Atividade sugerida: ${atividade}`,
  encerrarEAnotar: 'Encerrar e anotar',
  nota: 'Nota',
  dicaDaNota: 'O que a família precisa saber sobre esta sessão.',
  cancelar: 'Cancelar',
  descartar: 'Descartar',
  encerrar: 'Encerrar',
  descartarPergunta: 'Descartar esta sessão?',
  descartarExplicacao: 'O tempo não vai para o dia nem para o histórico.',
  manter: 'Manter',
} as const
