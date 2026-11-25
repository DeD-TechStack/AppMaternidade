import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Imagem } from '../../componentes/secoes/contrato.ts'
import { CATALOGO } from '../catalogo.ts'
import { usePrefereMovimentoReduzido } from '../reduzido.ts'
import './troca.css'

// Moment 1 of the Início (REP-HOME, motion slot sheet §3.3): the lamp lights at the seam.
// The light is ONE layer over the plate (ASSET-1 serves cone and pool merged in one file per plate), in the plate's own
// box, and it is lit at rest. Only on the first visit of the session, and only with motion allowed, it starts dark and
// lights with opacity alone, `atrasoMs` after its trigger and over the span the two steps of the sheet add up to: the
// cone's start to the pool's end (M15 `escalonamentoMs` + `duracaoPocaMs`). The plate itself never animates.
// The trigger is the plate's own `load` (the hero), a share of the plate in view (`limiar`, 10 % by default; M06 stacked)
// or "a vez" (M06 on the pinned stage): the lamp lights AT ONCE, with no M15 delay, on the first `acender` true, which the
// stage gives at the same instant as the caption swap (p 0.5). It lights one way and never goes dark again.

type Estado = 'apagada' | 'acesa'

interface Props {
  /** The light layer file, same box as the plate. */
  luz: Imagem
  /** The light layer of the 390 window, used below 768 px (the hero's plate is a different crop there). */
  luz390?: Imagem
  /** The sessionStorage key that remembers the first visit of this lamp. */
  memoria: string
  /** `carga`: the plate's `load`; `vista`: `limiar` of the plate inside the window; `vez`: the first `acender` true. */
  gatilho: 'carga' | 'vista' | 'vez'
  /** Only for `vez`: true from the stage's crossing on (p 0.5). The first true lights the lamp, remembered, and a later false changes nothing. */
  acender?: boolean
  /** Only for `vista`: the share of the plate that must be in the window (default 0.1). */
  limiar?: number
}

/** The box that holds the plate and this lamp: the hero's plate wrapper or the figure of a plate. */
const CAIXA_DA_PLACA = '.cm-cena-placa, figure'

function jaViu(chave: string): boolean {
  try {
    return window.sessionStorage.getItem(chave) === '1'
  } catch {
    return false
  }
}

function lembrar(chave: string) {
  try {
    window.sessionStorage.setItem(chave, '1')
  } catch {
    // Storage blocked: the lamp simply runs again on the next visit.
  }
}

/** The light of one lamp: one `data-luz` layer inside the plate's box, decorative and never in the way. */
export function LuzDaLampada({ luz, luz390, memoria, gatilho, acender: aVez = false, limiar = 0.1 }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const raiz = useRef<HTMLSpanElement>(null)
  const [estadoDaSequencia, setEstado] = useState<Estado>(() => (reduzido || jaViu(memoria) ? 'acesa' : 'apagada'))
  // "A vez" (the pinned stage): the first `acender` true lights the lamp for good. `direto` records whether that happened
  // before the first frame was painted (a stage mounted at p 0.5 or later: a deep link, a restored scroll), so the lamp then
  // shows lit with no transition, never as a light that comes on by itself.
  const [vez, setVez] = useState<{ direto: boolean } | null>(null)
  const [pintou, setPintou] = useState(false)
  // Reduced motion (also switched on in the middle of the session): the final state is the lit one, derived, not stored.
  const estado: Estado = reduzido || estadoDaSequencia === 'acesa' || vez !== null ? 'acesa' : 'apagada'

  // The first frame is painted when this callback runs; the stage's first reading (a layout effect of its own) lands before it.
  useEffect(() => {
    if (typeof window.requestAnimationFrame !== 'function') {
      const tempo = window.setTimeout(() => setPintou(true), 0)
      return () => window.clearTimeout(tempo)
    }
    const quadro = window.requestAnimationFrame(() => setPintou(true))
    return () => window.cancelAnimationFrame(quadro)
  }, [])

  // Adjusting state during render (React's pattern for a value derived from props): the one true crossing, once.
  if (gatilho === 'vez' && aVez && vez === null && estadoDaSequencia !== 'acesa') setVez({ direto: !pintou })

  useEffect(() => {
    if (vez !== null) lembrar(memoria)
  }, [vez, memoria])

  useEffect(() => {
    if (estado === 'acesa' || gatilho === 'vez') return undefined
    const placa = raiz.current?.closest(CAIXA_DA_PLACA)?.querySelector<HTMLImageElement>('img:not([data-luz])') ?? null
    let tempo: number | undefined
    let observador: IntersectionObserver | undefined

    const acender = () => {
      if (tempo !== undefined) return
      tempo = window.setTimeout(() => {
        lembrar(memoria)
        setEstado('acesa')
      }, CATALOGO.M15.atrasoMs)
    }

    const aoCarregar = () => acender()
    if (gatilho === 'vista') {
      if (!placa || typeof IntersectionObserver === 'undefined') {
        acender()
      } else {
        observador = new IntersectionObserver(
          (entradas) => {
            if (entradas.some((entrada) => entrada.isIntersecting)) {
              observador?.disconnect()
              acender()
            }
          },
          { threshold: limiar },
        )
        observador.observe(placa)
      }
    } else if (!placa || placa.complete) {
      acender()
    } else {
      placa.addEventListener('load', aoCarregar, { once: true })
      placa.addEventListener('error', aoCarregar, { once: true })
    }

    return () => {
      if (tempo !== undefined) window.clearTimeout(tempo)
      observador?.disconnect()
      placa?.removeEventListener('load', aoCarregar)
      placa?.removeEventListener('error', aoCarregar)
    }
  }, [estado, gatilho, memoria, limiar])

  const { escalonamentoMs, duracaoPocaMs, duracaoMs } = CATALOGO.M15
  const medidas = { '--luz-ms': `${escalonamentoMs + (duracaoPocaMs ?? duracaoMs ?? 0)}ms` } as CSSProperties

  return (
    <span ref={raiz} data-luz-grupo="" data-luz-estado={estado} data-luz-direto={vez?.direto ? '' : undefined} aria-hidden="true" style={medidas}>
      <picture>
        {luz390 ? (
          <source media="(max-width: 767px)" srcSet={luz390.srcSet ?? luz390.src} width={luz390.largura} height={luz390.altura} />
        ) : null}
        <img
          data-luz="luz"
          src={luz.src}
          srcSet={luz.srcSet}
          sizes={luz.sizes}
          width={luz.largura}
          height={luz.altura}
          alt=""
          decoding="async"
        />
      </picture>
    </span>
  )
}
