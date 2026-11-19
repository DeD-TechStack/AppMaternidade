import type { CSSProperties } from 'react'
import { placa } from '../campo/imagens.ts'
import type { Imagem } from '../secoes/contrato.ts'
import m04Recorte from '../../assets/cenas/inicio/m04-recorte-1200w.webp?w=350;600;700;1200&format=avif;webp&as=picture'
import m05Sol from '../../assets/cenas/inicio/m05-sol-1672w.webp?w=900;1672&format=avif;webp&as=picture'
import m05Sol390 from '../../assets/cenas/inicio/m05-sol-390c-780w.webp?w=390;780&format=avif;webp&as=picture'
import m06Apagada from '../../assets/cenas/inicio/m06-apagada-792w.webp?w=300;396;600;792&format=avif;webp&as=picture'
import m11Janela from '../../assets/cenas/nao-encontrada/m11-janela-542w.webp?w=340;361;542&format=avif;webp&as=picture'

// The files of the page. The four scene plates (M05, M05_390, M06, M04) come from ONE master each under
// `web/src/assets/cenas/inicio/` (PROVENANCE.md there): vite-imagetools generates the AVIF and WebP of each width at
// build time, with hashed URLs (`placa` in `campo/imagens.ts`). The light layers stay in `web/public/cenas/inicio/` as
// PNG, and the three real captures under `web/public/telas/casa/` (MANIFESTO.json) are served as they are.
// `src/teste/inicioCapturas.test.ts` reads the manifest and fails when a capture's path, width or height here differs
// from it. The device frames are ASSET-1's rasters under `web/public/molduras/`; nothing is drawn in CSS or SVG.

/** M05, the whole plate (900 × 506.5 CSS px at 1440): the day and the night of one room on one seam. */
export const M05: Imagem = placa(m05Sol, '(min-width: 1440px) 900px, 62.5vw', 900)

/** M05 for 390: the window of RECUT §4, 390 × 306 CSS px, in the plate's own pixels at 1× and 2×. */
export const M05_390: Imagem = placa(m05Sol390, '100vw', 390)

/** The seam of M05 as a fraction of its whole width (RECUT §2: 0.5443). */
export const M05_COSTURA = 0.5443

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
export const M06: Imagem = placa(m06Apagada, '(min-width: 1024px) 395.5px, 300px', 396)

/** M04, the scene of the band "só eu" (a crop of the plate of 15:00; its caption is not rendered here). */
export const M04: Imagem = placa(m04Recorte, '(min-width: 1024px) 600px, 100vw', 600)

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

/**
 * State `Y_ALTA` of the manifest (recaptured 19/11/2026, clock fixed 18/11 21:42): the Histórico of the day before in a
 * 390 x 1234 window scrolled to the page maximum (scroll_y 1767 of a 3001 px document), with `[data-rodape]` hidden for
 * the capture. The app header sits at the top of the image; the rows run from 11:00 to 20:30. The frame's screen layer
 * shows 844 of the 1234 CSS px, so the capture has exactly one screen width more than the screen (`ROLAGEM_PX`): the
 * frame opens on the bottom 844 px, where the 16:00 Juliana and 17:30 Ícaro rows lead the resting frame, and the pan
 * goes up to the header. The frames of the Início serve it.
 */
export const CAPTURA_Y_ALTA: Imagem = {
  src: '/telas/casa/historico-y-alta-320w.webp',
  srcSet:
    '/telas/casa/historico-y-alta-280w.webp 280w, /telas/casa/historico-y-alta-320w.webp 320w, /telas/casa/historico-y-alta-560w.webp 560w, /telas/casa/historico-y-alta-640w.webp 640w',
  sizes: TAMANHOS_DA_TELA,
  largura: 640,
  altura: 2025,
}

/**
 * The pan of the Histórico frame, in displayed px: MANIFESTO.json `Y_ALTA.rolagem_px` (280 at 390, 320 at 1440). It
 * equals the capture's surplus over the screen layer, (1234 - 844) x W / 390 = W, where W is the screen layer's width.
 */
export const ROLAGEM_PX = { 390: 280, 1440: 320 } as const

/**
 * The two ends of the pan as unitless custom properties, set by the page on the boxes that hold the Histórico frames
 * (the hero stage and band 2's stage, so the night twin reads the same numbers). inicio-casa.css interpolates them
 * between 390 and 1440 into `--produto-rolagem`, capped by the screen layer's width on a short stage.
 */
export const ESTILO_DA_ROLAGEM = {
  '--produto-rolagem-390': String(ROLAGEM_PX[390]),
  '--produto-rolagem-1440': String(ROLAGEM_PX[1440]),
} as CSSProperties

/**
 * M11 (ASSET-2, served for the 404 under `web/public/cenas/nao-encontrada/`): a street corner at night with one lit
 * window, already set on the cacau wall. The closing band stands it on the night floor. 542 x 421 is the largest file.
 */
export const M11_JANELA: Imagem = placa(m11Janela, '(min-width: 1024px) 420px, 340px', 542)

/**
 * State `N` of the manifest (recaptured 19/11/2026, clock fixed 18/11 21:42): Hoje in the madrugada theme (dark), the
 * sleep in progress since 20:30 and the yellow "Iniciar mamada" button with "Última mamada às 16:00, registrada por
 * Juliana" above the bottom bar, in a 390 x 880 window scrolled 78 px, so the title clears the header. It is
 * 390:880, taller than the frame's 390:844 screen layer: the sleep frame shows it whole (`object-fit: contain` on the
 * paper of the app, inicio-casa.css), never cropped.
 */
export const CAPTURA_N: Imagem = {
  src: '/telas/casa/hoje-n-320w.webp',
  srcSet:
    '/telas/casa/hoje-n-280w.webp 280w, /telas/casa/hoje-n-320w.webp 320w, /telas/casa/hoje-n-560w.webp 560w, /telas/casa/hoje-n-640w.webp 640w',
  sizes: TAMANHOS_DA_TELA,
  largura: 640,
  altura: 1444,
}
