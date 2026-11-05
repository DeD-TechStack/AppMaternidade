/** A barra de baixo só pode ficar colada à janela se ocupar, no máximo, esta fração dela. */
const FRACAO_MAXIMA = 0.35

/**
 * Decide se a barra (botões rápidos e navegação) fica fixa na janela ou no fluxo da página.
 * Com fonte em 200% ou zoom alto a barra cresce e, fixa, cobriria os controles que recebem
 * foco; nesse caso ela fica estática, no fim do conteúdo.
 */
export function barraDeveFicarFixa(alturaBarra: number, alturaJanela: number): boolean {
  return alturaJanela > 0 && alturaBarra <= alturaJanela * FRACAO_MAXIMA
}
