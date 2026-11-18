import type { Imagem } from '../secoes/contrato.ts'

// The files of the page (plates, light layers, frames, real captures). ASSET-1 serves them under
// `web/public/cenas/casa/` and `web/public/telas/casa/`; this card does not create anything under `web/public/**`.
// The names below follow the slot sheet (`M05_base_sol`, `M05_luz_lampada`, `M06_*`, state captures `Y` and `N`);
// the widths and heights are the ones of RECUT §2-§4 at density 2. They change here, in one place, when ASSET-1
// publishes `web/public/telas/casa/MANIFESTO.json`.

const CENAS = '/cenas/casa'
const TELAS = '/telas/casa'

/** M05, the whole plate (900 × 506.5 CSS px at 1440): the day and the night of one room on one seam. */
export const M05: Imagem = {
  src: `${CENAS}/M05_base_sol-1800.webp`,
  srcSet: `${CENAS}/M05_base_sol-900.webp 900w, ${CENAS}/M05_base_sol-1800.webp 1800w`,
  sizes: '(min-width: 1440px) 900px, 62.5vw',
  largura: 1800,
  altura: 1013,
}

/** M05 for 390: the window of RECUT §4 (L 472, s 0.325), 390 × 305.8 CSS px, from the plate's source columns. */
export const M05_390: Imagem = {
  src: `${CENAS}/M05_base_sol-390.webp`,
  srcSet: `${CENAS}/M05_base_sol-390.webp 390w, ${CENAS}/M05_base_sol-780.webp 780w`,
  sizes: '100vw',
  largura: 780,
  altura: 612,
}

/** The seam of M05 as a fraction of its whole width (RECUT §2: 0.5443), and of the 390 window (142.3 of 390). */
export const M05_COSTURA = 0.5443
export const M05_COSTURA_390 = 0.365

/** The floor line of M05 as a fraction of its height (RECUT §2: 628.8 − 224 = 404.8 of 506.5). */
export const M05_CHAO = 0.7992

/** The width of M05 at 1440, within the 836 to 1115 px range of CenaHeroi. */
export const M05_LARGURA = 900

/** The light layers of M05 and M06 (cone and pool, same box as the plate; opacity only; lit at rest). */
export const LUZ_M05 = { cone: `${CENAS}/M05_luz_lampada_cone.webp`, poca: `${CENAS}/M05_luz_lampada_poca.webp` } as const
export const LUZ_M06 = { cone: `${CENAS}/M06_luz_lampada_cone.webp`, poca: `${CENAS}/M06_luz_lampada_poca.webp` } as const

/** M06, the whole plate (395.5 × 645.9 CSS px at 1440, 300 × 490 inset at 390). */
export const M06: Imagem = {
  src: `${CENAS}/M06_base_noite-791.webp`,
  srcSet: `${CENAS}/M06_base_noite-600.webp 600w, ${CENAS}/M06_base_noite-791.webp 791w`,
  sizes: '(min-width: 1024px) 396px, 300px',
  largura: 791,
  altura: 1292,
}

/** M04, the scene of the band "só eu" (a crop of the plate of 15:00; its caption is not rendered here). */
export const M04: Imagem = {
  src: `${CENAS}/M04_so_eu-1280.webp`,
  srcSet: `${CENAS}/M04_so_eu-640.webp 640w, ${CENAS}/M04_so_eu-1280.webp 1280w`,
  sizes: '(min-width: 1024px) 640px, 100vw',
  largura: 1280,
  altura: 720,
}

/** The frame rasters: the day body (cacau on papel, 1440) and the night body (#6E6560, on a cacau wall). */
export const MOLDURA_DIA: Imagem = { src: `${TELAS}/moldura-dia.webp`, largura: 678, altura: 1423 }
export const MOLDURA_NOITE: Imagem = { src: `${TELAS}/moldura-noite.webp`, largura: 678, altura: 1423 }

/** The two real captures (manifest states `Y`, Histórico, and `N`, Hoje at 21:42), screen layer 320 × 692.5 at 2×. */
export const CAPTURA_Y = { src: `${TELAS}/Y.png`, largura: 640, altura: 1385 } as const
export const CAPTURA_N = { src: `${TELAS}/N.png`, largura: 640, altura: 1385 } as const
