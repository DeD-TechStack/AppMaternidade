// Catálogo único do movimento (VIS4-20). Cada registro leva o id da linha do inventário
// MOVIMENTO (M1, M2, …). Toda peça de movimento lê os parâmetros daqui: nenhum número de
// movimento fica solto num componente. Nesta fatia entram só os movimentos que já têm valores
// decididos; os outros ids entram quando a peça deles entrar.

export interface RegistroMovimento {
  id: string
  /** `tempo` corre no relógio; `rolagem` segue a posição da rolagem; `laco` repete (não usado). */
  tipo: 'tempo' | 'rolagem' | 'laco' | 'instantaneo'
  /** Abertura e elementos de destaque seguem os tetos de destaque; os outros, os de fora de destaque. */
  destaque: boolean
  /** Duração de cada animação em ms; `null` quando o progresso vem da rolagem. */
  duracaoMs: number | null
  /** Distância de rolagem, em px, que dura a animação presa à rolagem; 0 fora da rolagem. */
  janelaPx: number
  curva: [number, number, number, number] | 'linear' | 'easeOut'
  /** Intervalo entre um item e o seguinte, em ms. */
  escalonamentoMs: number
  atrasoMs: number
  /** Deslocamento em px (módulo). */
  deslocamentoPx: number
  /** Deslocamento em % da altura do próprio elemento (módulo), dentro de recipiente com overflow hidden. */
  deslocamentoPct: number
  escala: { de: number; para: number }
  rotacaoGraus: number
  /** Nesta fatia nenhum movimento repete. */
  repetir: false
  /** Saída (desaparecer), quando difere da entrada. */
  duracaoSaidaMs?: number
  /** Cortina: número de colunas no largo (46 rem ou mais) e no estreito. */
  colunas?: { largo: number; estreito: number }
  /** Cortina: atraso da camada de destaque em relação à camada escura, em ms. */
  atrasoCamadaMs?: number
  /** Suavização por mola da animação presa à rolagem. */
  mola?: { stiffness: number; damping: number }
}

export const CATALOGO = {
  // Linha que se desenha por revelação com máscara: um recipiente com overflow hidden e uma linha
  // dentro que desliza no eixo x (transform translateX) de -100% a 0% da própria largura, 400 ms,
  // linear. Sem escala e sem clip-path. Fica parada 100 ms antes da cortina.
  M1: {
    id: 'M1',
    tipo: 'tempo',
    destaque: true,
    duracaoMs: 400,
    janelaPx: 0,
    curva: 'linear',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 100,
    escala: { de: 1, para: 1 },
    rotacaoGraus: 0,
    repetir: false,
  },
  // Cortina em colunas: começa em 500 ms (fim do traço + pausa de 100 ms).
  M2: {
    id: 'M2',
    tipo: 'tempo',
    destaque: true,
    duracaoMs: 500,
    janelaPx: 0,
    curva: [0.16, 1, 0.3, 1],
    escalonamentoMs: 60,
    atrasoMs: 500,
    deslocamentoPx: 0,
    deslocamentoPct: 100,
    escala: { de: 1, para: 1 },
    rotacaoGraus: 0,
    repetir: false,
    colunas: { largo: 6, estreito: 4 },
    atrasoCamadaMs: 120,
  },
  // Mídia presa à rolagem: escala e opacidade nos primeiros 360 px, com suavização por mola.
  M3: {
    id: 'M3',
    tipo: 'rolagem',
    destaque: true,
    duracaoMs: null,
    janelaPx: 360,
    curva: 'linear',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 0.9, para: 1 },
    rotacaoGraus: 0,
    repetir: false,
    mola: { stiffness: 120, damping: 30 },
  },
  // Linhas que sobem e aparecem, uma depois da outra.
  M4: {
    id: 'M4',
    tipo: 'tempo',
    destaque: true,
    duracaoMs: 1200,
    janelaPx: 0,
    curva: [0.165, 0.84, 0.44, 1],
    escalonamentoMs: 250,
    atrasoMs: 0,
    deslocamentoPx: 48,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
    rotacaoGraus: 0,
    repetir: false,
  },
  // Título dividido por linha: os mesmos valores da M4.
  M5: {
    id: 'M5',
    tipo: 'tempo',
    destaque: true,
    duracaoMs: 1200,
    janelaPx: 0,
    curva: [0.165, 0.84, 0.44, 1],
    escalonamentoMs: 250,
    atrasoMs: 0,
    deslocamentoPx: 48,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
    rotacaoGraus: 0,
    repetir: false,
  },
  // Revelação por baixo, presa à rolagem, linear: o conteúdo vai de -50% a 0.
  M6: {
    id: 'M6',
    tipo: 'rolagem',
    destaque: true,
    duracaoMs: null,
    janelaPx: 0,
    curva: 'linear',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 50,
    escala: { de: 1, para: 1 },
    rotacaoGraus: 0,
    repetir: false,
  },
  // Variante da M6: de -30% a 0.
  M7: {
    id: 'M7',
    tipo: 'rolagem',
    destaque: true,
    duracaoMs: null,
    janelaPx: 0,
    curva: 'linear',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 30,
    escala: { de: 1, para: 1 },
    rotacaoGraus: 0,
    repetir: false,
  },
  // Seta do link: desliza 2 px à direita e 2 px para cima no hover e no foco.
  M12: {
    id: 'M12',
    tipo: 'tempo',
    destaque: false,
    duracaoMs: 300,
    janelaPx: 0,
    curva: 'easeOut',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 2,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
    rotacaoGraus: 0,
    repetir: false,
  },
  // Camada sobre o cartão: só opacidade, 100 ms para entrar e 110 ms para sair.
  M13: {
    id: 'M13',
    tipo: 'tempo',
    destaque: false,
    duracaoMs: 100,
    janelaPx: 0,
    curva: 'easeOut',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
    rotacaoGraus: 0,
    repetir: false,
    duracaoSaidaMs: 110,
  },
} satisfies Record<string, RegistroMovimento>

/** Tetos do destaque (abertura e elementos de destaque). */
export const TETO_DESTAQUE = {
  deslocamentoPx: 120,
  /** Só vale dentro de recipiente com overflow hidden. */
  deslocamentoPct: 100,
  escalaMinima: 0.8,
  escalaMaxima: 1.1,
  rotacaoGraus: 8,
  duracaoMs: 1200,
} as const

/** A sequência de abertura (M1 + M2) termina em até este tempo depois do carregamento. */
export const TETO_ABERTURA_MS = 1500

/** Tetos fora de destaque: só opacidade e deslocamento curto. */
export const TETO_FORA_DE_DESTAQUE = {
  deslocamentoPx: 16,
  duracaoMs: 300,
} as const

/** Quando termina a abertura (traço + cortina de todas as colunas do largo), em ms. */
export function fimDaAbertura(): number {
  const { atrasoMs, escalonamentoMs, duracaoMs, colunas, atrasoCamadaMs } = CATALOGO.M2
  return atrasoMs + (colunas.largo - 1) * escalonamentoMs + atrasoCamadaMs + duracaoMs
}
