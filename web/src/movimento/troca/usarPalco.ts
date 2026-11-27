import { useMotionValue, useScroll, useTransform } from 'motion/react'
import { useLayoutEffect, useMemo, useRef, useSyncExternalStore, type RefObject } from 'react'
import { usePrefereMovimentoReduzido } from '../reduzido.ts'
import {
  alturaMinimaDoFixo,
  bordaDaNoite,
  ladoDaLegenda,
  passoDaVez,
  progressoDoFixo,
  traducaoEmPercentual,
} from './medidas.ts'

// Moment 2 of the Início (REP-HOME, motion sheet §3): the pinned stage and the night sheet that crosses it. The pin
// itself is CSS (`position: sticky` on the stage, inside a track of stage + D, with D owned by troca.css); the sheet and
// the marker ("a faixa da vez") are scrubbed by CSS scroll-driven animations where the browser has them. This file reads
// the scroll through Motion's `useScroll` (one tick per frame) for two things: the caption's side, as an attribute that the
// caption and the lamp read, and, only WITHOUT scroll-timeline support, the inline `transform` of the sheet and the
// `translate` of the markers (the fallback). No smoothing.

/**
 * The feature test of the scrubbed beats, as written in troca.css's `@supports`: a test asserts that both texts are the
 * same. Where it is true the browser scrubs the sheet and the markers and this file writes none of their styles.
 */
export const CONDICAO_NATIVA = '(animation-timeline: view()) and (animation-range: entry)'

function temTimelineNativa(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(CONDICAO_NATIVA)
}

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
 * True where the pin is built: the room composition, at least M16 `alturaMinimaPx` tall and with motion allowed. That
 * height is where the stage's phone is still 240 px (measured), so the short desktop windows above it pin (1366 x 768,
 * 1280 x 800, 1536 x 864, 1440 x 900); a phone never does (390 x 844 is not the room). The stage itself is bounded in CSS
 * by the window and the plate (`--palco-alto` in inicio-casa.css). It is read on the client before the first paint, so
 * the stage's attribute is right at first paint, and reduced motion, a window under the gate and a missing script all
 * share one layout: the rest one. Switching reduced motion on in the middle of the session unmounts every moving piece.
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

/** The markers of "a faixa da vez" in the stage: the overlay's and the twin's. */
const MARCADORES_DA_VEZ = '[data-vez]'

/** The stage's measures in px, read by `medir` on mount and on resize: the stage's width and the seam. */
interface MedidasDoPalco {
  largura: number
  costura: number
}

/** The sheet's `translateX`, in percent, for the progress p: the edge of `bordaDaNoite` as a share of the stage's width. */
function traduzir(progresso: number, { largura, costura }: MedidasDoPalco): number {
  return traducaoEmPercentual(bordaDaNoite(progresso, costura), largura)
}

/** The marker's own `translate` for p: one row (`--vez-passo`, set in troca.css) below its rest at p 0, none from p 0.515. */
function deslocarMarcador(progresso: number): string {
  const resto = Number((passoDaVez(progresso) - 1).toFixed(4))
  return `0 calc(var(--vez-passo) * ${String(resto)})`
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
 * Reads the scroll of the pinned stage while `ativo`. `useScroll` tracks the pin's track (`target`, with the offset
 * above); `useTransform` turns its progress into p (the track's top against the sticky top and D, which is MEASURED from
 * the track's and the stage's rects: CSS owns it). When p crosses the caption's threshold, either way and once at mount,
 * the stage takes `data-troca-lado` ("1" or "2") and `aoMudarLado` is called, in that order: the caption and the lamp of
 * M06 both read that one moment.
 *
 * Where the browser has scroll-driven animations (`CONDICAO_NATIVA`) nothing else is written: troca.css scrubs the sheet
 * and the markers. Without them (an older Firefox or Safari) the hook writes the sheet's two `translateX` (outer `+t`,
 * inner `-t`, in percent of the stage's width, so they cancel) from `bordaDaNoite(p)` and every marker's `translate`
 * from `passoDaVez(p)`. It does the same when the native timeline is dead (the animation exists, in view, with no
 * current time). The stage is marked `data-troca-visivel` while its track is in the window: that is when the sheet's boxes
 * carry `will-change: transform`.
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
  const medidas = useRef<MedidasDoPalco>({ largura: 0, costura: 0 })
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
    if (!ativo || !palco || !folha || !interior || !costuraEl) return undefined
    const trilha = palco.closest<HTMLElement>('[data-faixa]')
    if (!trilha) return undefined
    const marcadores = [...palco.querySelectorAll<HTMLElement>(MARCADORES_DA_VEZ)]

    // `nativo`: the browser scrubs the sheet and the markers from troca.css. `escreve`: this hook does it instead (no
    // support, or the native timeline was found dead). `provado`: the native timeline was seen with a current time.
    const nativo = temTimelineNativa()
    let escreve = !nativo
    let provado = false
    let ultimoLado: 1 | 2 | null = null
    let ultimaTraducao = Number.NaN
    let ultimoPasso = Number.NaN
    let visivel: boolean | null = null

    const escrever = (t: number) => {
      if (!escreve || t === ultimaTraducao) return
      ultimaTraducao = t
      folha.style.setProperty('transform', `translateX(${t}%)`)
      interior.style.setProperty('transform', `translateX(${-t}%)`)
    }

    const deslocar = (progresso: number) => {
      const passo = passoDaVez(progresso)
      if (!escreve || passo === ultimoPasso) return
      ultimoPasso = passo
      const deslocamento = deslocarMarcador(progresso)
      for (const marcador of marcadores) marcador.style.translate = deslocamento
    }

    const anunciar = (progresso: number) => {
      const lado = ladoDaLegenda(progresso)
      if (lado !== ultimoLado) {
        ultimoLado = lado
        palco.setAttribute('data-troca-lado', String(lado))
        aviso.current(lado)
      }
    }

    const marcar = (naVista: boolean) => {
      if (naVista !== visivel) {
        visivel = naVista
        palco.toggleAttribute('data-troca-visivel', naVista)
      }
    }

    // The progress of the track right now, from one read of its rect (the motion values update on the next frame step).
    const progressoAgora = () =>
      progressoDoFixo(trilha.getBoundingClientRect().top, geometria.current.topoColado, geometria.current.distancia)

    // Dead pin: with the stage in the window, a sheet animation that is not being scrubbed (its timeline has no current
    // time: the timeline's subject has no box, or the engine's support is partial; or it has no timeline at all: the
    // named one did not resolve, and the animation sits at its end state) takes the JS path over at once. The dead
    // animations are cancelled, because a filling animation would win over the inline styles the JS path writes.
    // A scroll timeline has no current time until its first frame after it was created or the layout changed, so a dead
    // reading is confirmed two frames later before the JS path takes over (measured: the first stage of a fresh page
    // read dead on the first scroll event and was alive two frames after).
    let confirmando = false
    const lerAnimacoes = () => [folha, interior, ...marcadores].flatMap((alvo) => alvo.getAnimations())
    const estaMorta = (animacao: Animation) => animacao.timeline == null || animacao.timeline.currentTime == null
    const assumir = () => {
      const mortas = lerAnimacoes().filter(estaMorta)
      if (mortas.length === 0) return
      for (const animacao of mortas) animacao.cancel?.()
      escreve = true
      ultimaTraducao = Number.NaN
      ultimoPasso = Number.NaN
      const agora = progressoAgora()
      escrever(traduzir(agora, medidas.current))
      deslocar(agora)
    }
    let quadroPendente = 0
    let tempoPendente = 0
    const verificarPino = () => {
      if (!nativo || escreve || provado || confirmando || typeof folha.getAnimations !== 'function') return
      const animacoes = lerAnimacoes()
      if (animacoes.length === 0) return
      if (!animacoes.some(estaMorta)) {
        provado = true
        return
      }
      confirmando = true
      const confirmar = () => {
        confirmando = false
        quadroPendente = 0
        tempoPendente = 0
        if (escreve || provado) return
        const vivas = lerAnimacoes()
        if (vivas.length > 0 && vivas.some(estaMorta)) assumir()
        else if (vivas.length > 0) provado = true
      }
      if (typeof window.requestAnimationFrame === 'function') {
        quadroPendente = window.requestAnimationFrame(() => {
          quadroPendente = window.requestAnimationFrame(confirmar)
        })
      } else {
        tempoPendente = window.setTimeout(confirmar, 0)
      }
    }

    const medir = () => {
      // D is the track's height less the stage's: CSS owns it (`--palco-pino`), nothing here writes it.
      const distancia = trilha.getBoundingClientRect().height - palco.getBoundingClientRect().height
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
      }
      versao.set(versao.get() + 1)
    }

    // The track is in the window exactly while its progress is strictly between the two ends.
    const pararVisivel = scrollYProgress.on('change', (v) => {
      const naVista = v > 0 && v < 1
      marcar(naVista)
      if (naVista) verificarPino()
    })
    const pararTraducao = traducao.on('change', escrever)
    const pararLado = p.on('change', (progresso) => {
      anunciar(progresso)
      deslocar(progresso)
    })
    medir()
    // First state, written at once (the motion values update on the next frame step): the in-view flag, the sheet, the
    // markers and the caption's side, from one read of the track's top.
    const p0 = progressoAgora()
    const r = trilha.getBoundingClientRect()
    marcar(r.bottom > 0 && r.top < window.innerHeight)
    escrever(traduzir(p0, medidas.current))
    deslocar(p0)
    anunciar(p0)
    if (visivel) verificarPino()
    window.addEventListener('resize', medir, { passive: true })
    return () => {
      window.removeEventListener('resize', medir)
      if (quadroPendente && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(quadroPendente)
      if (tempoPendente) window.clearTimeout(tempoPendente)
      pararVisivel()
      pararTraducao()
      pararLado()
      folha.style.removeProperty('transform')
      interior.style.removeProperty('transform')
      for (const marcador of marcadores) marcador.style.translate = ''
      palco.removeAttribute('data-troca-visivel')
      palco.removeAttribute('data-troca-lado')
    }
  }, [alvos, ativo, scrollYProgress, p, versao, traducao, medidas, geometria])
}
