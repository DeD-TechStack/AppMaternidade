import { imagemPublica } from '../campo/urlPublica.ts'
import type { CSSProperties } from 'react'
import { placa } from '../campo/imagens.ts'
import type { Imagem } from '../secoes/contrato.ts'
import m04Avif350 from '../../assets/cenas/inicio/m04-recorte-350w.avif'
import m04Avif600 from '../../assets/cenas/inicio/m04-recorte-600w.avif'
import m04Avif700 from '../../assets/cenas/inicio/m04-recorte-700w.avif'
import m04Avif1200 from '../../assets/cenas/inicio/m04-recorte-1200w.avif'
import m04Webp350 from '../../assets/cenas/inicio/m04-recorte-350w.webp'
import m04Webp600 from '../../assets/cenas/inicio/m04-recorte-600w.webp'
import m04Webp700 from '../../assets/cenas/inicio/m04-recorte-700w.webp'
import m04Webp1200 from '../../assets/cenas/inicio/m04-recorte-1200w.webp'
import m05Avif900 from '../../assets/cenas/inicio/m05-sol-900w.avif'
import m05Avif1672 from '../../assets/cenas/inicio/m05-sol-1672w.avif'
import m05Webp900 from '../../assets/cenas/inicio/m05-sol-900w.webp'
import m05Webp1672 from '../../assets/cenas/inicio/m05-sol-1672w.webp'
import m05Avif390c390 from '../../assets/cenas/inicio/m05-sol-390c-390w.avif'
import m05Avif390c780 from '../../assets/cenas/inicio/m05-sol-390c-780w.avif'
import m05Avif390c1170 from '../../assets/cenas/inicio/m05-sol-390c-1170w.avif'
import m05Webp390c390 from '../../assets/cenas/inicio/m05-sol-390c-390w.webp'
import m05Webp390c780 from '../../assets/cenas/inicio/m05-sol-390c-780w.webp'
import m05Webp390c1170 from '../../assets/cenas/inicio/m05-sol-390c-1170w.webp'
import m06Apagada from '../../assets/cenas/inicio/m06-apagada-900w.webp?w=300;396;600;792;900&format=avif;webp&as=picture'
import m04Faixa from '../../assets/cenas/inicio-faixas/m04-faixa-1200w.webp?w=1200&format=webp&lossless=true&as=picture'
import m11Apagada from '../../assets/cenas/inicio-faixas/m11-apagada-542w.webp?w=326;542&format=webp&lossless=true&as=picture'

// The files of the page. M04 and M05 are FIXED files under `web/src/assets/cenas/inicio/` (PROVENANCE.md there): an AVIF
// 4:4:4 ladder whose ground is calibrated on the decoded output, and a WebP ladder, both exported once from the lossless
// masters and imported as plain Vite assets (no query, so vite-imagetools leaves them alone and the build never
// re-transcodes the ground). M05_390 and M06 still come from ONE master each, through vite-imagetools (`placa` in
// `campo/imagens.ts`). The light layers stay in `web/public/cenas/inicio/` as PNG, and the three real captures under
// `web/public/telas/casa/` (MANIFESTO.json) are served as they are. `src/teste/inicioCapturas.test.ts` reads the manifest
// and fails when a capture's path, width or height here differs from it. The device frames are ASSET-1's rasters under
// `web/public/molduras/`; nothing is drawn in CSS or SVG.

interface Degrau {
  url: string
  largura: number
}

const lista = (degraus: Degrau[]) => degraus.map(({ url, largura }) => `${url} ${largura}w`).join(', ')

/**
 * The `Imagem` of a plate made of fixed files: `src` is the WebP of `larguraDoSrc`, `srcSet` the WebP ladder, `avif` the
 * AVIF ladder of the same widths. `largura` and `altura` are those of the largest file (the lossless master's crop).
 */
function placaFixa(webp: Degrau[], avif: Degrau[], sizes: string, larguraDoSrc: number, largura: number, altura: number): Imagem & { avif: string; srcSet: string; sizes: string } {
  const doSrc = webp.find((degrau) => degrau.largura === larguraDoSrc)
  if (doSrc === undefined) throw new Error(`placaFixa: no WebP file of ${larguraDoSrc}w`)
  return { src: doSrc.url, srcSet: lista(webp), avif: lista(avif), sizes, largura, altura }
}

/** The `sizes` of the plate and of its light layer: one string, so both pick the same tier (W2). */
const M05_TAMANHOS = '(min-width: 1440px) min(62.5vw, 1600px), (min-width: 1180px) 62.5vw, min(100vw, 760px)'

/** M05, the whole plate (900 × 506.5 CSS px at 1440): the day and the night of one room on one seam. */
export const M05: Imagem = placaFixa(
  [
    { url: m05Webp900, largura: 900 },
    { url: m05Webp1672, largura: 1672 },
  ],
  [
    { url: m05Avif900, largura: 900 },
    { url: m05Avif1672, largura: 1672 },
  ],
  // The plate is 900 x min(window, 1440) / 1440 x k wide, and k is at most the quadro over 1200 (the quadro is 83.333 % of
  // the window): never more than 62.5 % of the window, capped at 1600 css px from 1440 (HOME-WIDTH, W2). Below 1180 the
  // stacked plate is no wider than 760 px. The light layer of the plate (`LUZ_M05`) reads the same string.
  M05_TAMANHOS,
  900,
  1672,
  941,
)

/**
 * M05 for 390: the window of RECUT §4, 390 × 306 CSS px, in the plate's own pixels at 1×, 2× and 3× (390, 780, 1170 wide;
 * the lossless master's 1199 × 941 crop, 1170 × 918 at the top tier, the same aspect as the 780 × 612 of before). Fixed
 * files like M04 and M05: an AVIF 4:4:4 ladder and a WebP ladder, `CenaHeroi` reads both.
 */
export const M05_390: Imagem = placaFixa(
  [
    { url: m05Webp390c390, largura: 390 },
    { url: m05Webp390c780, largura: 780 },
    { url: m05Webp390c1170, largura: 1170 },
  ],
  [
    { url: m05Avif390c390, largura: 390 },
    { url: m05Avif390c780, largura: 780 },
    { url: m05Avif390c1170, largura: 1170 },
  ],
  '100vw',
  390,
  1170,
  918,
)

/** The seam of M05 as a fraction of its whole width (RECUT §2: 0.5443). */
export const M05_COSTURA = 0.5443

/** The floor line of M05 as a fraction of its height (RECUT §2: 628.8 − 224 = 404.8 of 506.5). */
export const M05_CHAO = 0.7992

/** The width of M05 at 1440, within the 836 to 1115 px range of CenaHeroi. */
export const M05_LARGURA = 900

/**
 * The light layer of a plate: ONE file (cone and pool merged) in the plate's own box, opacity only, lit at rest. The
 * M05 includes the delivered 2x tiers, M05_390 and M06 their 3x and 2x tiers (the byte caps in `ativosInicio.test.mjs`).
 */
export const LUZ_M05: Imagem = imagemPublica({
  src: '/cenas/inicio/m05-luz-900w.png',
  srcSet: '/cenas/inicio/m05-luz-900w.png 900w, /cenas/inicio/m05-luz-1672w.png 1672w',
  sizes: M05_TAMANHOS,
  largura: 900,
  altura: 507,
})
export const LUZ_M05_390: Imagem = imagemPublica({
  src: '/cenas/inicio/m05-luz-390c-390w.png',
  srcSet:
    '/cenas/inicio/m05-luz-390c-390w.png 390w, /cenas/inicio/m05-luz-390c-780w.png 780w, /cenas/inicio/m05-luz-390c-1170w.png 1170w',
  sizes: '100vw',
  largura: 390,
  altura: 306,
})
export const LUZ_M06: Imagem = imagemPublica({
  src: '/cenas/inicio/m06-luz-396w.png',
  srcSet:
    '/cenas/inicio/m06-luz-300w.png 300w, /cenas/inicio/m06-luz-396w.png 396w, /cenas/inicio/m06-luz-600w.png 600w, /cenas/inicio/m06-luz-792w.png 792w',
  sizes: '(min-width: 1024px) 395.5px, 300px',
  largura: 396,
  altura: 647,
})

/** M06, the whole plate with the lamp off (395.5 × 645.9 CSS px from 1024, 300 × 490 below). */
export const M06: Imagem = placa(m06Apagada, '(min-width: 1024px) 395.5px, 300px', 396)

/** M04, the scene of the band "só eu" (a crop of the plate of 15:00; its caption is not rendered here). */
export const M04: Imagem = placaFixa(
  [
    { url: m04Webp350, largura: 350 },
    { url: m04Webp600, largura: 600 },
    { url: m04Webp700, largura: 700 },
    { url: m04Webp1200, largura: 1200 },
  ],
  [
    { url: m04Avif350, largura: 350 },
    { url: m04Avif600, largura: 600 },
    { url: m04Avif700, largura: 700 },
    { url: m04Avif1200, largura: 1200 },
  ],
  '(min-width: 1024px) 600px, 100vw',
  600,
  1200,
  870,
)

/**
 * The `Imagem` of a WebP-only plate from `src/assets/cenas/inicio-faixas/` (HOME-SECOND-HALF). Those masters are LOSSLESS
 * (the import query asks for the lossless encoder): the plate's flat ground is a token colour that a lossy encode would shift, and the
 * band meets its neighbour on that ground without a seam. No AVIF: the lossy codec cannot hold the ground either.
 */
function placaWebp(gerada: { sources: Record<string, string>; img: { src: string; w: number; h: number } }, sizes: string, larguraDoSrc: number, altura: number = gerada.img.h) {
  // With one width the build leaves the fallback format out of `sources`: the only file is `img.src`, bare (no `w`
  // descriptor), and its descriptor is the plate's width.
  const bruto: string = gerada.sources.webp ?? gerada.img.src
  const webp = bruto
    .split(', ')
    .map((item) => (/\s\d+w$/.test(item) ? item : `${item} ${gerada.img.w}w`))
    .join(', ')
  const entrada = webp.split(', ').find((item) => item.endsWith(` ${larguraDoSrc}w`))
  if (entrada === undefined) throw new Error(`placaWebp: no WebP file of ${larguraDoSrc}w`)
  return { src: entrada.slice(0, entrada.lastIndexOf(' ')), srcSet: webp, sizes, largura: gerada.img.w, altura } satisfies Imagem
}

/**
 * M04 of band 4 (HOME-SECOND-HALF): the 1200 × 870 plate of the 15:00 scene, the mat to row 853 and 17 rows of ground
 * above, lossless. The band's frame (`1200 / 832`, clipped) shows its rows 0 to 832; the band line cuts the mat. Drawn at
 * `--faixa4-placa` (720 at 1440, the whole width stacked), so the one file serves 1× and 2×. The older `M04` ladder
 * above stays for `inicioCapturas.test.ts`, which pins it.
 */
export const M04_FAIXA: Imagem = placaWebp(m04Faixa, '(min-width: 1024px) min(50vw, 1040px), 100vw', 1200)

/**
 * The Notas capture of band 5 (HOME-SECOND-HALF): `/telas/t1i/notas-*.webp` (MANIFESTO.json of that folder: 280, 320,
 * 560 and 640 wide, 640 × 1385 the largest), in the day frame on the areia rug. Same widths as the other captures.
 */
export const CAPTURA_NOTAS: Imagem = imagemPublica({
  src: '/telas/t1i/notas-320w.webp',
  srcSet:
    '/telas/t1i/notas-280w.webp 280w, /telas/t1i/notas-320w.webp 320w, /telas/t1i/notas-560w.webp 560w, /telas/t1i/notas-640w.webp 640w, /telas/t1i/notas-780w.webp 780w, /telas/t1i/notas-1170w.webp 1170w',
  sizes: '(min-width: 1440px) 320px, (max-width: 390px) 280px, calc(280px + (100vw - 390px) * 40 / 1050)',
  largura: 1170,
  altura: 2532,
})

/**
 * The door of band 6 (HOME-SECOND-HALF): the night corridor, a hand with the key at a closed door, 1254 × 1070 with the
 * floor strip cut out, lossless (the wall is `cacau` to the pixel). Shown at `min(var(--faixa6-porta), 627px)`.
 */
export const PORTA_NOITE: Imagem = imagemPublica({
  src: '/cenas/inicio-faixas/porta-noite-720w.webp',
  srcSet:
    '/cenas/inicio-faixas/porta-noite-390w.webp 390w, /cenas/inicio-faixas/porta-noite-720w.webp 720w, /cenas/inicio-faixas/porta-noite-780w.webp 780w, /cenas/inicio-faixas/porta-noite-1254w.webp 1254w',
  sizes: '(min-width: 1024px) min(43vw, 627px), 100vw',
  largura: 1254,
  altura: 1070,
})

/**
 * The device frames (ASSET-1, `web/public/molduras/`, PROVENANCE.md there): a PNG with a hole where the screen goes, the
 * real capture under it. The day frame stands on the papel wall, the night frame on cacau (and as the night twin).
 * 678 x 1423 = the screen layer's width x 1.06 by its height x 2.2241 (`--moldura-razao`).
 */
export const MOLDURA_DIA: Imagem = imagemPublica({
  src: '/molduras/moldura-dia.png',
  srcSet: '/molduras/moldura-dia.png 678w, /molduras/moldura-dia-1356w.png 1356w',
  sizes: '(min-width: 1440px) 414px, 350px',
  largura: 678,
  altura: 1423,
})
export const MOLDURA_NOITE: Imagem = imagemPublica({
  src: '/molduras/moldura-noite.png',
  srcSet: '/molduras/moldura-noite.png 678w, /molduras/moldura-noite-1356w.png 1356w',
  sizes: '(min-width: 1440px) 414px, 350px',
  largura: 678,
  altura: 1423,
})

/**
 * The screen layer of a framed capture: 320 CSS px wide at 1440 and 280 at 390 (RECUT §6), so the 280w, 320w, 560w and
 * 640w files cover 1× and 2×. The same list serves both captures.
 */
const TAMANHOS_DA_TELA =
  '(min-width: 1440px) 320px, (max-width: 390px) 280px, calc(280px + (100vw - 390px) * 40 / 1050)'

/**
 * State `Y_ALTA` of the manifest (recaptured 19/11/2026, clock fixed 18/11 21:42): the Histórico of the day before in a
 * 390 x 1234 window at scrollY 1099 of a 2609 px document (HOME-PHONE-B2), with `[data-rodape]` (site footer) and
 * `[data-aviso-tela]` (in-app demo note) hidden for the capture only and asserted absent by the capture tool. The sticky
 * app header sits at the top of the image. The frame's screen layer shows 844 of the 1234 CSS px, so the capture has
 * exactly one screen width more than the screen (`ROLAGEM_PX`): the frame rests on the bottom 844 px, which ends on the
 * 16:00 Juliana row followed by the 17:30 Ícaro row (the last row, 16 css px above the window bottom), and the pan
 * goes up to the header. The frames of the Início serve it.
 */
export const CAPTURA_Y_ALTA: Imagem = imagemPublica({
  src: '/telas/casa/historico-y-alta-320w.webp',
  srcSet:
    '/telas/casa/historico-y-alta-280w.webp 280w, /telas/casa/historico-y-alta-320w.webp 320w, /telas/casa/historico-y-alta-560w.webp 560w, /telas/casa/historico-y-alta-640w.webp 640w, /telas/casa/historico-y-alta-780w.webp 780w, /telas/casa/historico-y-alta-1170w.webp 1170w',
  sizes: TAMANHOS_DA_TELA,
  largura: 1170,
  altura: 3702,
})

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
 * M11 of band 7 (HOME-SECOND-HALF): the street corner at night with the four panes UNLIT (`inicio-faixas`, lossless,
 * 326 and 542 wide: the master holds 542 px, so no 1440 w file exists). The lit panes are `LUZ_M11`, a layer over it.
 * The figure is `min(var(--fecho-janela), 542px)` wide: 542 at 1440, 326 at 390, and half the container between (326 from
 * 652 px up to 541 at 1083), so DPR 1 at 768, 1024 and 1083 (384, 512 and 541.5 px) takes the 542 file, never the 326 one.
 */
const M11_TAMANHOS = '(min-width: 1084px) 542px, (min-width: 652px) 50vw, 326px'
export const M11_JANELA: Imagem = placaWebp(m11Apagada, M11_TAMANHOS, 542)

/** The lit panes of M11: one RGBA layer in the plate's own box, opacity only (`LuzDaLampada`, key `casa-luz-m11`). */
export const LUZ_M11: Imagem = imagemPublica({
  src: '/cenas/inicio-faixas/m11-luz-542w.png',
  srcSet: '/cenas/inicio-faixas/m11-luz-326w.png 326w, /cenas/inicio-faixas/m11-luz-542w.png 542w',
  sizes: M11_TAMANHOS,
  largura: 542,
  altura: 421,
})

/**
 * State `N` of the manifest (recaptured 19/11/2026, clock fixed 18/11 21:42): Hoje in the madrugada theme (dark), the
 * sleep in progress since 20:30 and the yellow "Iniciar mamada" button with "Última mamada às 16:00, registrada por
 * Juliana" above the bottom bar, in a 390 x 880 window scrolled 78 px, so the title clears the header. It is
 * 390:880, taller than the frame's 390:844 screen layer: the sleep frame shows it whole (`object-fit: contain` on the
 * paper of the app, inicio-casa.css), never cropped.
 */
export const CAPTURA_N: Imagem = imagemPublica({
  src: '/telas/casa/hoje-n-320w.webp',
  srcSet:
    '/telas/casa/hoje-n-280w.webp 280w, /telas/casa/hoje-n-320w.webp 320w, /telas/casa/hoje-n-560w.webp 560w, /telas/casa/hoje-n-640w.webp 640w, /telas/casa/hoje-n-780w.webp 780w, /telas/casa/hoje-n-1170w.webp 1170w',
  sizes: TAMANHOS_DA_TELA,
  largura: 1170,
  altura: 2640,
})
