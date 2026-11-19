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
// The trigger is the plate's own `load` (the hero) or 10 % of the plate in view (M06).

type Estado = 'apagada' | 'acesa'

interface Props {
  /** The light layer file, same box as the plate. */
  luz: Imagem
  /** The light layer of the 390 window, used below 768 px (the hero's plate is a different crop there). */
  luz390?: Imagem
  /** The sessionStorage key that remembers the first visit of this lamp. */
  memoria: string
  /** `carga`: the plate's `load`; `vista`: 10 % of the plate inside the window. */
  gatilho: 'carga' | 'vista'
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
export function LuzDaLampada({ luz, luz390, memoria, gatilho }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const raiz = useRef<HTMLSpanElement>(null)
  const [estadoDaSequencia, setEstado] = useState<Estado>(() => (reduzido || jaViu(memoria) ? 'acesa' : 'apagada'))
  // Reduced motion (also switched on in the middle of the session): the final state is the lit one, derived, not stored.
  const estado: Estado = reduzido ? 'acesa' : estadoDaSequencia

  useEffect(() => {
    if (estado === 'acesa') return undefined
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
          { threshold: 0.1 },
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
  }, [estado, gatilho, memoria])

  const { escalonamentoMs, duracaoPocaMs, duracaoMs } = CATALOGO.M15
  const medidas = { '--luz-ms': `${escalonamentoMs + (duracaoPocaMs ?? duracaoMs ?? 0)}ms` } as CSSProperties

  return (
    <span ref={raiz} data-luz-grupo="" data-luz-estado={estado} aria-hidden="true" style={medidas}>
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
