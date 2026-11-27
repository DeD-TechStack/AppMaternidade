// Os textos da tela Sessão que não são do estado do protótipo: o subtítulo do estado vazio e a
// descrição de cada ilustração (a moldura da mídia não tem texto dentro, então a descrição vai no
// `aria-label` dela).
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

export const DESCRICAO_DA_MIDIA = {
  sono: 'Ilustração: o bebê dorme no berço, sob a manta, com a lua na janela, e um adulto sai do quarto.',
  tummy: 'Ilustração: o bebê de bruços no tapete levanta a cabeça, com um adulto ajoelhado ao lado.',
  mamada: 'Ilustração: de madrugada, um adulto na poltrona com o bebê no colo, perto da janela.',
  vazio: 'Ilustração: um berço com o bebê dormindo e a lua na janela.',
} as const
