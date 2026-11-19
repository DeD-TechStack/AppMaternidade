import { useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from 'react'
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
// itself is CSS (`position: sticky` on the stage, inside a track of stage + D); this file only reads the scroll, with a
// passive listener throttled to one frame, and writes the two `translateX` of the sheet. No library, no smoothing.

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

/**
 * Drives the night sheet from the scroll while `ativo`. Each frame it reads the track's top, takes p, puts the edge at
 * `bordaDaNoite(p)` and writes the two transforms (outer `+t`, inner `-t`, in percent of the stage's width, so they
 * cancel). `aoMudarLado` is called when p crosses the caption's threshold, either way, and once at mount. The
 * stage is marked `data-troca-visivel` while its track is in the window: that is when the sheet's boxes carry
 * `will-change: transform`.
 */
export function useNoitePresa(alvos: AlvosDoPalco, ativo: boolean, aoMudarLado: (lado: 1 | 2) => void): void {
  const aviso = useRef(aoMudarLado)
  useLayoutEffect(() => {
    aviso.current = aoMudarLado
  })

  useLayoutEffect(() => {
    const palco = alvos.palco.current
    const folha = alvos.folha.current
    const interior = alvos.interior.current
    const costuraEl = alvos.costura.current
    const quadro = palco?.querySelector<HTMLElement>(QUADRO_DO_DIA) ?? null
    if (!ativo || !palco || !folha || !interior || !costuraEl || !quadro) return undefined
    const trilha = palco.closest<HTMLElement>('[data-faixa]')
    if (!trilha) return undefined

    let distancia = distanciaDoFixo(window.innerWidth)
    let topoColado = 0
    let largura = 0
    let costura = 0
    let centro = 0
    let quadroId = 0
    let ultimoLado: 1 | 2 | null = null
    let ultimaTraducao = Number.NaN
    let visivel: boolean | null = null

    const medir = () => {
      distancia = distanciaDoFixo(window.innerWidth)
      trilha.style.setProperty('--troca-d', `${distancia}px`)
      const topo = Number.parseFloat(window.getComputedStyle(palco).top)
      topoColado = Number.isFinite(topo) ? topo : 0
      largura = palco.clientWidth
      costura = costuraEl.offsetLeft
      centro = quadro.offsetLeft + quadro.offsetWidth / 2
    }

    const aplicar = () => {
      quadroId = 0
      const r = trilha.getBoundingClientRect()
      const naVista = r.bottom > 0 && r.top < window.innerHeight
      if (naVista !== visivel) {
        visivel = naVista
        palco.toggleAttribute('data-troca-visivel', naVista)
      }
      const p = progressoDoFixo(r.top, topoColado, distancia)
      const t = traducaoEmPercentual(bordaDaNoite(p, costura, centro), largura)
      if (t !== ultimaTraducao) {
        ultimaTraducao = t
        folha.style.setProperty('transform', `translateX(${t}%)`)
        interior.style.setProperty('transform', `translateX(${-t}%)`)
      }
      const lado = ladoDaLegenda(p)
      if (lado !== ultimoLado) {
        ultimoLado = lado
        aviso.current(lado)
      }
    }

    const agendar = () => {
      if (quadroId === 0) quadroId = window.requestAnimationFrame(aplicar)
    }
    const aoRedimensionar = () => {
      medir()
      agendar()
    }

    medir()
    aplicar()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', aoRedimensionar, { passive: true })
    return () => {
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', aoRedimensionar)
      if (quadroId !== 0) window.cancelAnimationFrame(quadroId)
      folha.style.removeProperty('transform')
      interior.style.removeProperty('transform')
      palco.removeAttribute('data-troca-visivel')
      trilha.style.removeProperty('--troca-d')
    }
  }, [alvos, ativo])
}
