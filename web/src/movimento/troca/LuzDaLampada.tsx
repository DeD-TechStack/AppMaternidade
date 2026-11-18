import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CATALOGO } from '../catalogo.ts'
import { usePrefereMovimentoReduzido } from '../reduzido.ts'
import './troca.css'

// Moment 1 of the Início (REP-HOME, motion slot sheet §3.3): the lamp lights at the seam.
// The light layer is lit at rest. Only on the first visit of the session, and only with motion allowed, it starts
// dark and lights in two steps, both opacity only: the cone (M15 `duracaoMs`) and, `escalonamentoMs` later, the
// pool on the floor (`duracaoPocaMs`), `atrasoMs` after its trigger. The plate itself never animates.
// The trigger is the plate's own `load` (the hero) or 10 % of the plate in view (M06).

type Estado = 'apagada' | 'acesa'

interface Props {
  /** The cone layer file, same box as the plate. */
  cone: string
  /** The pool layer file, same box as the plate. */
  poca: string
  /** The sessionStorage key that remembers the first visit of this lamp. */
  memoria: string
  /** `carga`: the plate's `load`; `vista`: 10 % of the plate inside the window. */
  gatilho: 'carga' | 'vista'
  /** The plate's intrinsic size (width, height), so the layers keep its aspect ratio before they load. */
  tamanho: { largura: number; altura: number }
}

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

/** The light of one lamp: two stacked `data-luz` layers inside the plate's box, decorative and never in the way. */
export function LuzDaLampada({ cone, poca, memoria, gatilho, tamanho }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const raiz = useRef<HTMLSpanElement>(null)
  const [estadoDaSequencia, setEstado] = useState<Estado>(() => (reduzido || jaViu(memoria) ? 'acesa' : 'apagada'))
  // Reduced motion (also switched on in the middle of the session): the final state is the lit one, derived, not stored.
  const estado: Estado = reduzido ? 'acesa' : estadoDaSequencia

  useEffect(() => {
    if (estado === 'acesa') return undefined
    const placa = raiz.current?.parentElement?.querySelector<HTMLImageElement>('img:not([data-luz])') ?? null
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

  const medidas = {
    '--luz-cone-ms': `${CATALOGO.M15.duracaoMs}ms`,
    '--luz-poca-ms': `${CATALOGO.M15.duracaoPocaMs}ms`,
    '--luz-poca-atraso': `${CATALOGO.M15.escalonamentoMs}ms`,
  } as CSSProperties

  return (
    <span ref={raiz} data-luz-grupo="" data-luz-estado={estado} aria-hidden="true" style={medidas}>
      <img data-luz="cone" src={cone} alt="" width={tamanho.largura} height={tamanho.altura} decoding="async" />
      <img data-luz="poca" src={poca} alt="" width={tamanho.largura} height={tamanho.altura} decoding="async" />
    </span>
  )
}
