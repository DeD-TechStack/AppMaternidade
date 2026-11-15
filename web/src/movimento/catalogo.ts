// Catálogo único do movimento (DESIGN.md, seção Motion; SPEC_MOVIMENTO 2). Toda peça de movimento lê os
// parâmetros daqui: nenhum número de movimento fica solto num componente. O CSS lê os mesmos números nas
// variáveis `--mov-*` e `--curva-*` de `web/src/styles/tokens.css`; `movimento/tokens.test.ts` confere que
// os dois lugares concordam. Com `prefers-reduced-motion: reduce` tudo para (as peças leem
// `usePrefereMovimentoReduzido`).

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
  /** Entrada que dispara uma vez: o que já entrou não volta à espera ao sair da janela. */
  umaVez?: boolean
  /** Opacidade da espera, antes de entrar: já legível (acima de 0,1), nunca 0. */
  opacidadeDe?: number
  /** Escalonamento: do item `maxItensEscalonados` em diante, todos entram junto com ele. */
  maxItensEscalonados?: number
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
  // Títulos de seção e números (--mov-revela): as linhas sobem 24 px e ganham opacidade, 700 ms, 80 ms entre
  // uma e a seguinte, no máximo 3 escalonadas, uma vez só (não voltam à espera ao sair da janela). A espera
  // já é legível: opacidade 0,5, não 0 (um título grande de cacau sobre o papel fica acima de 3:1).
  M4: {
    id: 'M4',
    tipo: 'tempo',
    duracaoMs: 700,
    janelaPx: 0,
    curva: [0.165, 0.84, 0.44, 1],
    escalonamentoMs: 80,
    atrasoMs: 0,
    deslocamentoPx: 24,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
    umaVez: true,
    opacidadeDe: 0.5,
    maxItensEscalonados: 3,
  },
  // Faixa de cacau: o conteúdo sai de baixo, de -30 % a 0 (era -50 %), preso à rolagem.
  M6: {
    id: 'M6',
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
  // Resposta a ação (CSS, interrompível; SPEC_MOVIMENTO D4 e D5). Cor de hover em botões e links e cor da
  // borda do campo (--mov-feedback): 150 ms, curva padrão.
  M15: {
    id: 'M15',
    tipo: 'tempo',
    duracaoMs: 150,
    janelaPx: 0,
    curva: [0.4, 0, 0.2, 1],
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
  },
  // Todo painel que aparece (--mov-pequeno): menu do celular, painéis e confirmações do app, popovers.
  // Entra em 220 ms e sai em 160 ms, subindo 8 px (--mov-dist-popover).
  M16: {
    id: 'M16',
    tipo: 'tempo',
    duracaoMs: 220,
    janelaPx: 0,
    curva: [0.4, 0, 0.2, 1],
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 8,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
    duracaoSaidaMs: 160,
  },
  // Só a altura do acordeão (--mov-medio): 280 ms, curva de saída.
  M17: {
    id: 'M17',
    tipo: 'tempo',
    duracaoMs: 280,
    janelaPx: 0,
    curva: [0, 0, 0.2, 1],
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
  },
  // O `<main>` ao trocar de rota (--mov-rota): só opacidade, 180 ms, sem saída.
  M18: {
    id: 'M18',
    tipo: 'tempo',
    duracaoMs: 180,
    janelaPx: 0,
    curva: [0, 0, 0.2, 1],
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
  },
  // Brilho do esqueleto de carregamento (--mov-esqueleto): 1,5 s por volta, em laço.
  M19: {
    id: 'M19',
    tipo: 'laco',
    duracaoMs: 1500,
    janelaPx: 0,
    curva: 'linear',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 1, para: 1 },
  },
  // Toque nos botões (--mov-toque, --mov-escala-toque): escala 0,96 no `:active`, 120 ms, ease-out
  // (o CSS de `.cm-botao-*` em site.css). Nunca abaixo de 0,95.
  M20: {
    id: 'M20',
    tipo: 'tempo',
    duracaoMs: 120,
    janelaPx: 0,
    curva: 'easeOut',
    escalonamentoMs: 0,
    atrasoMs: 0,
    deslocamentoPx: 0,
    deslocamentoPct: 0,
    escala: { de: 0.96, para: 1 },
  },
} satisfies Record<string, RegistroMovimento>

/**
 * Atraso do item `i` numa entrada escalonada: `escalonamentoMs` entre um item e o seguinte, e do item
 * `maxItens` em diante todos entram juntos com ele (no M4, 0, 80, 160, 160...).
 */
export function atrasoEscalonado(
  i: number,
  escalonamentoMs: number = CATALOGO.M4.escalonamentoMs,
  maxItens: number = CATALOGO.M4.maxItensEscalonados,
): number {
  return Math.min(Math.max(i, 0), maxItens - 1) * escalonamentoMs
}

/** Quando termina a cortina (todas as colunas do largo, com a camada de mel), em ms. */
export function fimDaCortina(): number {
  const { escalonamentoMs, duracaoMs, colunas, atrasoCamadaMs } = CATALOGO.M2
  return (colunas.largo - 1) * escalonamentoMs + atrasoCamadaMs + duracaoMs
}
