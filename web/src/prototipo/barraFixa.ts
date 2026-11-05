/** Altura mínima da janela, em rem, para a barra de baixo ficar colada a ela. */
const ALTURA_MINIMA_EM_REM = 40

/**
 * Decide se a barra (botões rápidos e navegação) fica fixa na janela ou no fluxo da página.
 * Fica fixa se e só se a janela tem pelo menos 40 rem de altura. A decisão olha a janela e a
 * fonte raiz, nunca a altura atual da barra: confirmações e painéis fazem a barra crescer no
 * uso normal e não podem tirá-la da janela. Com fonte em 200% ou zoom alto a janela passa a
 * medir menos de 40 rem; aí a barra, fixa, cobriria os controles que recebem foco, e ela fica
 * estática, no fim do conteúdo.
 */
export function barraDeveFicarFixa(alturaJanelaPx: number, fonteRaizPx: number): boolean {
  return fonteRaizPx > 0 && alturaJanelaPx >= ALTURA_MINIMA_EM_REM * fonteRaizPx
}
