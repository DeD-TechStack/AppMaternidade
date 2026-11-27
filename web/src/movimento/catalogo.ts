// Catálogo único do movimento (DESIGN.md 5). Toda peça de movimento lê os parâmetros daqui: nenhum
// número de movimento fica solto num componente. Com `prefers-reduced-motion: reduce` tudo para
// (as peças leem `usePrefereMovimentoReduzido`).

interface RegistroMovimento {
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
  /** Lamp (M15): duration of the pool of light in ms, when it differs from the cone's (`duracaoMs`). */
  duracaoPocaMs?: number
  /** Pin (M16): the pin distance D as one rule of the window's height, `clamp(minPx, svh * height, maxPx)`. The CSS
   *  (`--palco-pino` in movimento/troca/troca.css) and `pinoDoPalco` in medidas.ts read the same three numbers. */
  pino?: { minPx: number; svh: number; maxPx: number }
  /** Pin (M16): the p where the wipe's holds begin and end: the first hold ends at `repousoAte`, the last one starts at
   *  `fimDe`. Between them the edge moves linearly with p (no hold on the frame's centre line). */
  paradas?: { repousoAte: number; fimDe: number }
  /** Marker (M16, "a faixa da vez"): the p range over which it steps one row, in the pinned stage. */
  vez?: { de: number; ate: number }
  /** Marker (M16), stacked composition (no pin): the share of the frame's own view timeline (`contain`) it steps over. */
  vezEmpilhada?: { de: number; ate: number }
  /** Pin (M16): the smallest window height, in px, with a pin (the room windows shorter than this rest). */
  alturaMinimaPx?: number
  /** Caption (M17): the p whose crossing, either way, swaps the text. */
  limiar?: number
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
  // Rodapé: o conteúdo sai de baixo, de -30 % a 0, preso à rolagem.
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
  // Início, moment 1 (REP-HOME): the lamp lights at the seam. The cone fades in over 240 ms and the pool of light
  // on the floor 80 ms later, over 320 ms; both start 300 ms after the plate's `load`, on the first visit only.
  // `duracaoMs` is the cone, `duracaoPocaMs` the pool. Opacity only. ASSET-1 serves cone and pool merged in ONE light
  // layer per plate, so the page runs that one layer from the cone's start to the pool's end (`escalonamentoMs` +
  // `duracaoPocaMs`, 400 ms); the two numbers stay here as the sheet's.
  M15: {
    id: 'M15',
    tipo: 'tempo',
    duracaoMs: 240,
    duracaoPocaMs: 320,
    janelaPx: 0,
    curva: [0.16, 1, 0.3, 1],
    escalonamentoMs: 80,
    atrasoMs: 300,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
  },
  // Início, moment 2: the night takes the house, tied to scroll (the pinned stage).
  M16: {
    id: 'M16',
    tipo: 'rolagem',
    duracaoMs: null,
    // The pin distance is one rule of the window's height, `clamp(600px, 80svh, 900px)` (STAGE, 25/11/2026). It replaces
    // the pin by width (600 px from 1280 wide, 480 from 1024 to 1279, 360 below 1024). `janelaPx` holds the 1440 x 900
    // value, in px (80 svh of 900).
    janelaPx: 720,
    pino: { minPx: 600, svh: 80, maxPx: 900 },
    // The edge holds at the seam (p 0 to 0.10), runs linearly to the left edge and holds there from 0.70 on (no hold on
    // the frame's centre line); no smoothing. Below 1180 wide there is no pin (RECUT §7).
    paradas: { repousoAte: 0.1, fimDe: 0.7 },
    // "A faixa da vez": the areia marker steps from the 16:00 row to the 17:30 row over 3 % of the pin (p 0.485 to
    // 0.515), together with the caption swap (M17, p 0.5) and the lamp of M06. In the stacked composition it steps over
    // `contain 45 %` to `contain 55 %` of the frame's own view timeline.
    vez: { de: 0.485, ate: 0.515 },
    vezEmpilhada: { de: 0.45, ate: 0.55 },
    // STAGE (25/11/2026), measured in Chrome 158 at DPR 2 (sonda-palco, 1440 wide, 1 px steps): no pinned phone under 240 px
    // (0.75 of the 320 px design screen). The stage screen (`--produto-tela` in inicio-casa.css, height-capped) is 239.8 px
    // at 727 and 240.2 at 728 tall, the same at every width from 1180 to 2560. It replaces the 640 of HOME-FINAL (19/11/2026).
    alturaMinimaPx: 728,
    curva: 'linear',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
  },
  // Início, moment 3: the caption swaps its text in one node. It leaves in 160 ms (opacity 1 to 0, 0 to -6 px) and
  // enters in 220 ms (from +6 px), on the standard curve. The text swap falls at the end of the leave.
  M17: {
    id: 'M17',
    tipo: 'tempo',
    duracaoMs: 220,
    janelaPx: 0,
    curva: [0.4, 0, 0.2, 1],
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 6,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
    duracaoSaidaMs: 160,
    // The swap fires when p crosses 0.5 in either direction, inside the middle hold (no hysteresis).
    limiar: 0.5,
  },
  // Início, band 7 (A05): composicao.css drives the street light's opacity with a CSS view timeline.
  // The windows stay lit with reduced motion or without support for the timeline or animation range.
  M11: {
    id: 'M11',
    tipo: 'tempo',
    duracaoMs: 240,
    janelaPx: 0,
    curva: [0.16, 1, 0.3, 1],
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
    limiar: 0.6,
  },
} satisfies Record<string, RegistroMovimento>

/** Quando termina a cortina (todas as colunas do largo, com a camada de mel), em ms. */
export function fimDaCortina(): number {
  const { escalonamentoMs, duracaoMs, colunas, atrasoCamadaMs } = CATALOGO.M2
  return (colunas.largo - 1) * escalonamentoMs + atrasoCamadaMs + duracaoMs
}
