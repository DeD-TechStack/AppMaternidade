import { CATALOGO } from '../catalogo.ts'

// The numbers of moments 2 and 3 of the Início, read from the catalogue and nowhere else, and the pure arithmetic of
// the pinned scroll: pin distance, progress p, the night sheet's edge and the caption's side. No DOM here.

/** The distance of the pinned scroll in px for a window width (M16): 600 from 1280, 480 from 1024 to 1279, 360 below. */
export function distanciaDoFixo(largura: number): number {
  const { largo, medio, estreito } = CATALOGO.M16.janelaPxPorLargura
  if (largura >= 1280) return largo
  if (largura >= 1024) return medio
  return estreito
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

const entre = (de: number, ate: number, fracao: number) => de + (ate - de) * fracao

/**
 * The x of the night sheet's edge in the stage, in px, for the progress p. It starts at the seam and holds there until
 * p 0.10, runs to the frame's centre line and holds from 0.45 to 0.55, runs to the left edge and holds from 0.85 on.
 * Linear in p between the holds. The sheet is cut paper: the edge moves, nothing fades.
 */
export function bordaDaNoite(p: number, costura: number, centro: number): number {
  const { repousoAte, centroDe, centroAte, fimDe } = CATALOGO.M16.paradas
  const q = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0))
  if (q <= repousoAte) return costura
  if (q < centroDe) return entre(costura, centro, (q - repousoAte) / (centroDe - repousoAte))
  if (q <= centroAte) return centro
  if (q < fimDe) return entre(centro, 0, (q - centroAte) / (fimDe - centroAte))
  return 0
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
