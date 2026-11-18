import type { Imagem } from '../secoes/contrato.ts'

// The files of the page: ASSET-1's plates and light layers under `web/public/cenas/inicio/` (PROVENANCE.md, section
// "ASSET-1 served plates and light layers") and the three real captures under `web/public/telas/casa/` (MANIFESTO.json).
// Every path and size below is a served file's own; `src/teste/inicioCapturas.test.ts` reads the manifest and fails when
// a capture's path, width or height here differs from it. This card does not create anything under `web/public/**`.
// The device frames are ASSET-1's rasters under `web/public/molduras/`; nothing is drawn in CSS or SVG.

/** M05, the whole plate (900 × 506.5 CSS px at 1440): the day and the night of one room on one seam. */
export const M05: Imagem = {
  src: '/cenas/inicio/m05-sol-900w.webp',
  srcSet: '/cenas/inicio/m05-sol-900w.webp 900w, /cenas/inicio/m05-sol-1672w.webp 1672w',
  sizes: '(min-width: 1440px) 900px, 62.5vw',
  largura: 1672,
  altura: 941,
}

/** M05 for 390: the window of RECUT §4, 390 × 306 CSS px, in the plate's own pixels at 1× and 2×. */
export const M05_390: Imagem = {
  src: '/cenas/inicio/m05-sol-390c-390w.webp',
  srcSet: '/cenas/inicio/m05-sol-390c-390w.webp 390w, /cenas/inicio/m05-sol-390c-780w.webp 780w',
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

/**
 * The light layer of a plate: ONE file (cone and pool merged) in the plate's own box, opacity only, lit at rest. The
 * layers over 12,000 bytes (`m05-luz-1672w`, `m05-luz-390c-780w`, `m06-luz-600w`, `m06-luz-792w`) are not served.
 */
export const LUZ_M05: Imagem = { src: '/cenas/inicio/m05-luz-900w.png', largura: 900, altura: 507 }
export const LUZ_M05_390: Imagem = { src: '/cenas/inicio/m05-luz-390c-390w.png', largura: 390, altura: 306 }
export const LUZ_M06: Imagem = {
  src: '/cenas/inicio/m06-luz-396w.png',
  srcSet: '/cenas/inicio/m06-luz-300w.png 300w, /cenas/inicio/m06-luz-396w.png 396w',
  sizes: '(min-width: 1024px) 395.5px, 300px',
  largura: 396,
  altura: 647,
}

/** M06, the whole plate with the lamp off (395.5 × 645.9 CSS px from 1024, 300 × 490 below). */
export const M06: Imagem = {
  src: '/cenas/inicio/m06-apagada-396w.webp',
  srcSet:
    '/cenas/inicio/m06-apagada-300w.webp 300w, /cenas/inicio/m06-apagada-396w.webp 396w, /cenas/inicio/m06-apagada-600w.webp 600w, /cenas/inicio/m06-apagada-792w.webp 792w',
  sizes: '(min-width: 1024px) 395.5px, 300px',
  largura: 792,
  altura: 1293,
}

/** M04, the scene of the band "só eu" (a crop of the plate of 15:00; its caption is not rendered here). */
export const M04: Imagem = {
  src: '/cenas/inicio/m04-recorte-600w.webp',
  srcSet:
    '/cenas/inicio/m04-recorte-350w.webp 350w, /cenas/inicio/m04-recorte-600w.webp 600w, /cenas/inicio/m04-recorte-700w.webp 700w, /cenas/inicio/m04-recorte-1200w.webp 1200w',
  sizes: '(min-width: 1024px) 600px, 100vw',
  largura: 1200,
  altura: 870,
}

/**
 * The device frames (ASSET-1, `web/public/molduras/`, PROVENANCE.md there): a PNG with a hole where the screen goes, the
 * real capture under it. The day frame stands on the papel wall, the night frame on cacau (and as the night twin).
 * 678 x 1423 = the screen layer's width x 1.06 by its height x 2.2241 (`--moldura-razao`).
 */
export const MOLDURA_DIA: Imagem = { src: '/molduras/moldura-dia.png', largura: 678, altura: 1423 }
export const MOLDURA_NOITE: Imagem = { src: '/molduras/moldura-noite.png', largura: 678, altura: 1423 }

/**
 * The screen layer of a framed capture: 320 CSS px wide at 1440 and 280 at 390 (RECUT §6), so the 280w, 320w, 560w and
 * 640w files cover 1× and 2×. The same list serves both captures.
 */
const TAMANHOS_DA_TELA =
  '(min-width: 1440px) 320px, (max-width: 390px) 280px, calc(280px + (100vw - 390px) * 40 / 1050)'

/** State `Y` of the manifest: Histórico on 21:42, the 16:00 mamada row and the 17:30 fralda row in the top 240 px. */
export const CAPTURA_Y: Imagem = {
  src: '/telas/casa/historico-y-320w.webp',
  srcSet:
    '/telas/casa/historico-y-280w.webp 280w, /telas/casa/historico-y-320w.webp 320w, /telas/casa/historico-y-560w.webp 560w, /telas/casa/historico-y-640w.webp 640w',
  sizes: TAMANHOS_DA_TELA,
  largura: 640,
  altura: 1385,
}

/** State `N` of the manifest: Hoje in the madrugada theme at 21:42, the sleep in progress since 20:30. */
export const CAPTURA_N: Imagem = {
  src: '/telas/casa/hoje-n-320w.webp',
  srcSet:
    '/telas/casa/hoje-n-280w.webp 280w, /telas/casa/hoje-n-320w.webp 320w, /telas/casa/hoje-n-560w.webp 560w, /telas/casa/hoje-n-640w.webp 640w',
  sizes: TAMANHOS_DA_TELA,
  largura: 640,
  altura: 1385,
}
