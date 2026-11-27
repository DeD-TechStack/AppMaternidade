import { CATALOGO } from '../catalogo.ts'

// The numbers of moments 2 and 3 of the Início, read from the catalogue and nowhere else, and the pure arithmetic of
// the pinned scroll: pin distance, progress p, the night sheet's edge and the caption's side. No DOM here.

/**
 * The pin distance D in px for a window height (M16): `clamp(minPx, svh * height, maxPx)`, 80 svh clamped to 600-900 px.
 * It is the model of the CSS (`--palco-pino` in troca.css, which owns D): tests and probes compare the page against it,
 * and the scroll driver never writes it, it measures D from the track and the stage.
 */
export function pinoDoPalco(alturaDaJanela: number): number {
  const { minPx, svh, maxPx } = CATALOGO.M16.pino
  const alvo = (alturaDaJanela * svh) / 100
  return Math.min(maxPx, Math.max(minPx, alvo))
}

/** The smallest window height, in px, with a pin (M16). */
export function alturaMinimaDoFixo(): number {
  return CATALOGO.M16.alturaMinimaPx
}

/** The timings of the caption swap (M17): out, in, the travel in px and the standard curve. */
export function temposDaLegenda() {
  const { duracaoSaidaMs, duracaoMs, deslocamentoPx, curva } = CATALOGO.M17
  return { saidaMs: duracaoSaidaMs, entradaMs: duracaoMs, deslocamentoPx, curva }
}

/**
 * The progress p of the pin, 0 to 1. The stage sticks when the top of its track reaches `topoColado` (its sticky top)
 * and leaves `distancia` px of scroll later: p 0 is the track's top at `topoColado`, p 1 is `distancia` px above it.
 */
export function progressoDoFixo(topoDaTrilha: number, topoColado: number, distancia: number): number {
  if (!(distancia > 0) || !Number.isFinite(topoDaTrilha) || !Number.isFinite(topoColado)) return 0
  return Math.min(1, Math.max(0, (topoColado - topoDaTrilha) / distancia))
}

const limitar = (valor: number) => Math.min(1, Math.max(0, Number.isFinite(valor) ? valor : 0))

/**
 * The x of the night sheet's edge in the stage, in px, for the progress p. It starts at the seam and holds there until
 * p 0.10, then runs linearly to the left edge, which it reaches at p 0.70 and holds (no hold on the frame's centre line).
 * The sheet is cut paper: the edge moves, nothing fades.
 */
export function bordaDaNoite(p: number, costura: number): number {
  const { repousoAte, fimDe } = CATALOGO.M16.paradas
  const avanco = limitar((limitar(p) - repousoAte) / (fimDe - repousoAte))
  return costura * (1 - avanco)
}

/**
 * How far the marker ("a faixa da vez") has stepped from the 16:00 row to the 17:30 row, 0 to 1, for the progress p: 0
 * up to p 0.485, 1 from p 0.515, linear between (3 % of the pin).
 */
export function passoDaVez(p: number): number {
  const { de, ate } = CATALOGO.M16.vez
  return limitar((limitar(p) - de) / (ate - de))
}

/** The edge as a percent of the sheet's own width, the `translateX` the two boxes of the sheet take (outer +t, inner -t). */
export function traducaoEmPercentual(borda: number, largura: number): number {
  if (!(largura > 0) || !Number.isFinite(borda)) return 0
  return (borda / largura) * 100
}

/** The side of the caption: 1 (`ini.leg1`) while p is under the threshold, 2 (`ini.leg2`) from it (M17). */
export function ladoDaLegenda(p: number): 1 | 2 {
  return p < CATALOGO.M17.limiar ? 1 : 2
}
