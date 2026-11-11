// Catálogo único do movimento (DESIGN.md 5). Toda peça de movimento lê os parâmetros daqui: nenhum
// número de movimento fica solto num componente. Com `prefers-reduced-motion: reduce` tudo para
// (as peças leem `usePrefereMovimentoReduzido`).

export interface RegistroMovimento {
  id: string
  /** `tempo` corre no relógio; `rolagem` segue a posição da rolagem; `laco` repete. */
  tipo: 'tempo' | 'rolagem' | 'laco'
  /** Duração de cada animação em ms; `null` quando o progresso vem da rolagem. */
  duracaoMs: number | null
  /** Distância de rolagem, em px, que dura a animação presa à rolagem; 0 fora dela. */
  janelaPx: number
  curva: [number, number, number, number] | 'linear' | 'easeOut'
  /** Intervalo entre um item e o seguinte, em ms. */
  escalonamentoMs: number
  atrasoMs: number
  /** Deslocamento em px (módulo). */
  deslocamentoPx: number
  /** Deslocamento em % da altura do próprio elemento (módulo), num recipiente com overflow hidden. */
  deslocamentoPct: number
  escala: { de: number; para: number }
  /** Saída (desaparecer), quando difere da entrada. */
  duracaoSaidaMs?: number
  /** Cortina: número de colunas no largo (46 rem ou mais) e no estreito. */
  colunas?: { largo: number; estreito: number }
  /** Cortina: atraso da camada de mel em relação à de cacau, em ms. */
  atrasoCamadaMs?: number
  /** Suavização por mola da animação presa à rolagem. */
  mola?: { stiffness: number; damping: number }
}

export const CATALOGO = {
  // Primeiro carregamento: cortina em colunas (6 no largo, 4 no estreito). A camada de cacau sobe
  // primeiro e a de mel 120 ms depois, cada uma de 0 a -100 %, 0,5 s, uma coluna a cada 90 ms.
  M2: {
    id: 'M2',
    tipo: 'tempo',
    duracaoMs: 500,
    janelaPx: 0,
    curva: [0.16, 1, 0.3, 1],
    escalonamentoMs: 90,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 100,
    escala: { de: 1, para: 1 },
    colunas: { largo: 6, estreito: 4 },
    atrasoCamadaMs: 120,
  },
  // Painel com mídia: a mídia vai de 0,9 a 1 nos primeiros 360 px de rolagem, com mola; o cartão
  // flutuante chega 120 ms depois.
  M3: {
    id: 'M3',
    tipo: 'rolagem',
    duracaoMs: null,
    janelaPx: 360,
    curva: 'linear',
    escalonamentoMs: 0,
    atrasoMs: 120,
    deslocamentoPx: 24,
    deslocamentoPct: 0,
    escala: { de: 0.9, para: 1 },
    mola: { stiffness: 120, damping: 30 },
  },
  // Títulos de seção e números: as linhas sobem 48 px e aparecem, 1,25 s, uma a cada 250 ms.
  M4: {
    id: 'M4',
    tipo: 'tempo',
    duracaoMs: 1250,
    janelaPx: 0,
    curva: [0.165, 0.84, 0.44, 1],
    escalonamentoMs: 250,
    atrasoMs: 0,
    deslocamentoPx: 48,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
  },
  // Faixa de cacau: o conteúdo sai de baixo, de -50 % a 0, preso à rolagem.
  M6: {
    id: 'M6',
    tipo: 'rolagem',
    duracaoMs: null,
    janelaPx: 0,
    curva: 'linear',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 50,
    escala: { de: 1, para: 1 },
  },
  // Rodapé: o mesmo, de -30 % a 0.
  M7: {
    id: 'M7',
    tipo: 'rolagem',
    duracaoMs: null,
    janelaPx: 0,
    curva: 'linear',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 30,
    escala: { de: 1, para: 1 },
  },
  // Cena da abertura: de 0,94 a 1 com a opacidade, 0,8 s, depois da cortina.
  M8: {
    id: 'M8',
    tipo: 'tempo',
    duracaoMs: 800,
    janelaPx: 0,
    curva: [0.16, 1, 0.3, 1],
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 0.94, para: 1 },
  },
  // Camada de cacau com o resumo sobre o cartão de mídia: só opacidade, 100 ms (110 para sair).
  M13: {
    id: 'M13',
    tipo: 'tempo',
    duracaoMs: 100,
    janelaPx: 0,
    curva: 'easeOut',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
    duracaoSaidaMs: 110,
  },
  // Letreiro dos selos: 60 s por volta, em laço (CSS; pausa no hover, no foco e no botão).
  M14: {
    id: 'M14',
    tipo: 'laco',
    duracaoMs: 60000,
    janelaPx: 0,
    curva: 'linear',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 50,
    escala: { de: 1, para: 1 },
  },
} satisfies Record<string, RegistroMovimento>

/** Quando termina a cortina (todas as colunas do largo, com a camada de mel), em ms. */
export function fimDaCortina(): number {
  const { escalonamentoMs, duracaoMs, colunas, atrasoCamadaMs } = CATALOGO.M2
  return (colunas.largo - 1) * escalonamentoMs + atrasoCamadaMs + duracaoMs
}
