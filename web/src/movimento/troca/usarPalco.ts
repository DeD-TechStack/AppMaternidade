import { useMotionValue, useScroll, useTransform } from 'motion/react'
import { useLayoutEffect, useMemo, useRef, useSyncExternalStore, type RefObject } from 'react'
import { usePrefereMovimentoReduzido } from '../reduzido.ts'
import {
  alturaMinimaDoFixo,
  bordaDaNoite,
  distanciaDoFixo,
  ladoDaLegenda,
  progressoDoFixo,
  traducaoEmPercentual,
} from './medidas.ts'

// Moment 2 of the Início (REP-HOME, motion sheet §3): the pinned stage and the night sheet that crosses it. The pin
// itself is CSS (`position: sticky` on the stage, inside a track of stage + D); this file only reads the scroll, through
// Motion's `useScroll` (one tick per frame), and writes the two `translateX` of the sheet from `useTransform`. No smoothing.

function temMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

/** One media query as a boolean that follows the change event. Without matchMedia (plain jsdom) it is false. */
function useConsulta(consulta: string): boolean {
  const assinar = (aviso: () => void) => {
    if (!temMatchMedia()) return () => {}
    const lista = window.matchMedia(consulta)
    if (typeof lista.addEventListener === 'function') {
      lista.addEventListener('change', aviso)
      return () => lista.removeEventListener('change', aviso)
    }
    if (typeof lista.addListener === 'function') {
      lista.addListener(aviso)
      return () => lista.removeListener(aviso)
    }
    return () => {}
  }
  const ler = () => (temMatchMedia() ? window.matchMedia(consulta).matches : false)
  return useSyncExternalStore(assinar, ler, () => false)
}

/**
 * The room composition of the Início (`CONSULTA_SALA` in componentes/inicio-casa/usoDaCasa.ts): 1180 px wide or more on
 * a landscape window. The stage exists only there.
 */
const CONSULTA_DA_SALA = '(min-width: 1180px) and (min-aspect-ratio: 1/1)'

/**
 * True where the pin is built: the room composition, at least M16 `alturaMinimaPx` (640 px) tall and with motion
 * allowed. 640 is about the plate's height, so the short desktop windows pin (1366 x 768, 1280 x 800, 1536 x 864,
 * 1440 x 900); a phone never does (390 x 844 is not the room). The stage itself is bounded in CSS by the window and the
 * plate (`--palco-alto` in inicio-casa.css). It is read on the client before the first paint, so the stage's attribute
 * is right at first paint, and reduced motion, a window under 640 px and a missing script all share one layout: the
 * rest one. Switching reduced motion on in the middle of the session unmounts every moving piece.
 */
export function usePalcoFixo(): boolean {
  const larga = useConsulta(CONSULTA_DA_SALA)
  const alta = useConsulta(`(min-height: ${alturaMinimaDoFixo()}px)`)
  const reduzido = usePrefereMovimentoReduzido()
  return larga && alta && !reduzido
}

/** The elements the scroll driver reads and writes. */
interface AlvosDoPalco {
  /** The sticky stage (`[data-troca-palco]`); its band is the track. */
  palco: RefObject<HTMLElement | null>
  /** The sheet's outer box: `translateX(t)`, clips its inner box. */
  folha: RefObject<HTMLElement | null>
  /** The sheet's inner box: `translateX(-t)`, so its content stays still while the edge moves. */
  interior: RefObject<HTMLElement | null>
  /** A zero-size marker on the seam, in the stage's coordinates. */
  costura: RefObject<HTMLElement | null>
}

/** The day frame in the stage: its centre line is where the edge holds in the middle. */
const QUADRO_DO_DIA = '[data-produto-moldura]'

/** The stage's measures in px, read by `medir` on mount and on resize: the stage's width, the seam, the frame's centre line. */
interface MedidasDoPalco {
  largura: number
  costura: number
  centro: number
}

/** The sheet's `translateX`, in percent, for the progress p: the edge of `bordaDaNoite` as a share of the stage's width. */
function traduzir(progresso: number, { largura, costura, centro }: MedidasDoPalco): number {
  return traducaoEmPercentual(bordaDaNoite(progresso, costura, centro), largura)
}

/**
 * The scroll range of the track for `useScroll`: 0 when the track's top enters the window's bottom edge, 1 when its bottom
 * leaves the window's top edge. So `v` is `(janela - topo) / (trilha + janela)` and the track's top is
 * `janela - v * (trilha + janela)`: exact, and 0 and 1 are the two ends where the track is out of the window.
 */
const DESLOCAMENTO_DA_TRILHA: ['start end', 'end start'] = ['start end', 'end start']

/** The measures of the track, in px, read by `medir` (the same numbers Motion's offset resolver reads): they turn `v` back into the track's top. */
interface GeometriaDaTrilha {
  /** The window's height (the scrolling element's `clientHeight`). */
  janela: number
  /** The track's height (`clientHeight`). */
  trilha: number
  /** The pin distance D. */
  distancia: number
  /** The stage's sticky `top`. */
  topoColado: number
}

/**
 * Drives the night sheet from the scroll while `ativo`. `useScroll` tracks the pin's track (`target`, with the offset
 * above); `useTransform` turns its progress into p (the track's top against the sticky top and D), and again into the
 * edge at `bordaDaNoite(p)`. The hook writes the two transforms (outer `+t`, inner `-t`, in percent of the stage's
 * width, so they cancel). `aoMudarLado` is called when p crosses the caption's threshold, either way, and once at mount.
 * The stage is marked `data-troca-visivel` while its track is in the window: that is when the sheet's boxes carry
 * `will-change: transform`.
 */
export function useNoitePresa(alvos: AlvosDoPalco, ativo: boolean, aoMudarLado: (lado: 1 | 2) => void): void {
  const aviso = useRef(aoMudarLado)
  useLayoutEffect(() => {
    aviso.current = aoMudarLado
  })

  // The track, resolved when `useScroll`'s own layout effect runs (the refs are attached by then). Inactive, it tracks the
  // document itself, which costs nothing; the identity changes with `ativo`, so the tracker restarts on the track.
  const trilhaAlvo = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        const palco = alvos.palco.current
        if (!ativo || !palco) return document.documentElement
        return palco.closest<HTMLElement>('[data-faixa]') ?? palco
      },
    }),
    [alvos, ativo],
  )
  const { scrollYProgress } = useScroll({ target: trilhaAlvo, offset: DESLOCAMENTO_DA_TRILHA })

  // The measures live in refs; `versao` is bumped by every re-measure, so p and the percent are computed again even when
  // the scroll did not move. The sheet's translateX is `useTransform` of p.
  const versao = useMotionValue(0)
  const medidas = useRef<MedidasDoPalco>({ largura: 0, costura: 0, centro: 0 })
  const geometria = useRef<GeometriaDaTrilha>({ janela: 0, trilha: 0, distancia: 0, topoColado: 0 })
  const p = useTransform([scrollYProgress, versao], ([v]: number[]) => {
    const { janela, trilha, distancia, topoColado } = geometria.current
    return progressoDoFixo(janela - v * (trilha + janela), topoColado, distancia)
  })
  const traducao = useTransform([p, versao], ([v]: number[]) => traduzir(v, medidas.current))

  useLayoutEffect(() => {
    const palco = alvos.palco.current
    const folha = alvos.folha.current
    const interior = alvos.interior.current
    const costuraEl = alvos.costura.current
    const quadro = palco?.querySelector<HTMLElement>(QUADRO_DO_DIA) ?? null
    if (!ativo || !palco || !folha || !interior || !costuraEl || !quadro) return undefined
    const trilha = palco.closest<HTMLElement>('[data-faixa]')
    if (!trilha) return undefined

    let ultimoLado: 1 | 2 | null = null
    let ultimaTraducao = Number.NaN
    let visivel: boolean | null = null

    const escrever = (t: number) => {
      if (t === ultimaTraducao) return
      ultimaTraducao = t
      folha.style.setProperty('transform', `translateX(${t}%)`)
      interior.style.setProperty('transform', `translateX(${-t}%)`)
    }

    const anunciar = (progresso: number) => {
      const lado = ladoDaLegenda(progresso)
      if (lado !== ultimoLado) {
        ultimoLado = lado
        aviso.current(lado)
      }
    }

    const marcar = (naVista: boolean) => {
      if (naVista !== visivel) {
        visivel = naVista
        palco.toggleAttribute('data-troca-visivel', naVista)
      }
    }

    const medir = () => {
      const distancia = distanciaDoFixo(window.innerWidth)
      trilha.style.setProperty('--troca-d', `${distancia}px`)
      const topo = Number.parseFloat(window.getComputedStyle(palco).top)
      geometria.current = {
        janela: (document.scrollingElement ?? document.documentElement).clientHeight,
        trilha: trilha.clientHeight,
        distancia,
        topoColado: Number.isFinite(topo) ? topo : 0,
      }
      medidas.current = {
        largura: palco.clientWidth,
        costura: costuraEl.offsetLeft,
        centro: quadro.offsetLeft + quadro.offsetWidth / 2,
      }
      versao.set(versao.get() + 1)
    }

    // The track is in the window exactly while its progress is strictly between the two ends.
    const pararVisivel = scrollYProgress.on('change', (v) => marcar(v > 0 && v < 1))
    const pararTraducao = traducao.on('change', escrever)
    const pararLado = p.on('change', anunciar)
    medir()
    // First state, written at once (the motion values update on the next frame step): the in-view flag, the sheet and the
    // caption's side, from one read of the track's top.
    const r = trilha.getBoundingClientRect()
    const p0 = progressoDoFixo(r.top, geometria.current.topoColado, geometria.current.distancia)
    marcar(r.bottom > 0 && r.top < window.innerHeight)
    escrever(traduzir(p0, medidas.current))
    anunciar(p0)
    window.addEventListener('resize', medir, { passive: true })
    return () => {
      window.removeEventListener('resize', medir)
      pararVisivel()
      pararTraducao()
      pararLado()
      folha.style.removeProperty('transform')
      interior.style.removeProperty('transform')
      palco.removeAttribute('data-troca-visivel')
      trilha.style.removeProperty('--troca-d')
    }
  }, [alvos, ativo, scrollYProgress, p, versao, traducao, medidas, geometria])
}
