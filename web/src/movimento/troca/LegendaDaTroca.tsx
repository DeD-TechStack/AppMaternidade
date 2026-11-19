import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { TextoAssinado, useAssinatura } from './assinatura.tsx'
import { temposDaLegenda } from './medidas.ts'

// Moment 3 of the Início (REP-HOME, motion sheet §5): the caption of the pinned stage. ONE `p`, whose text is the copy
// string in the three runs of the signed caption (moment 4, `assinatura.tsx`: hour, middle, author with the stroke). When
// the side wanted changes (p crossed 0.5, either way) the line leaves (opacity 1 to 0 and 0 to -6 px, M17 `saida`), the
// text is swapped at the end of the leave, and the line enters from +6 px (M17). Only opacity and transform move, on the
// Web Animations API, so `getAnimations()` sees them. The line is interruptible: a change during the leave lands on the
// newest side at its end; a change during the entry starts a new leave from the values the line has at that moment.
// The node keeps its box (no height change) and `aria-live="off"`: the stage is scrolled, not announced.

type Lado = 1 | 2
type Fase = 'repouso' | 'saida' | 'entrada'

interface Props {
  /** The two captions in order: the one shown while p is under the threshold, then the one from it. */
  textos: readonly [string, string]
  /** The side wanted now (from p). The text on screen follows it through the leave and the entry. */
  lado: Lado
}

/** Without the Web Animations API (plain jsdom) the text just follows the side. */
const temAnimacao = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function'

/** The `translateY` and opacity the line has now, read from the running animation or the style. */
function valoresAgora(no: HTMLElement): { opacidade: number; y: number } {
  const estilo = window.getComputedStyle(no)
  const opacidade = Number.parseFloat(estilo.opacity)
  let y = 0
  if (estilo.transform !== 'none' && typeof DOMMatrixReadOnly !== 'undefined') {
    y = new DOMMatrixReadOnly(estilo.transform).m42
  }
  return { opacidade: Number.isFinite(opacidade) ? opacidade : 1, y: Number.isFinite(y) ? y : 0 }
}

export function LegendaDaTroca({ textos, lado }: Props) {
  const no = useRef<HTMLParagraphElement>(null)
  const [exibido, setExibido] = useState<Lado>(lado)
  const exibidoRef = useRef<Lado>(lado)
  const alvo = useRef<Lado>(lado)
  const fase = useRef<Fase>('repouso')
  const animacao = useRef<Animation | null>(null)

  useEffect(() => {
    alvo.current = lado
    const el = no.current
    if (!temAnimacao || !el) return
    if (fase.current === 'saida') return // the leave in progress lands on `alvo` at its end
    if (fase.current === 'repouso' && exibidoRef.current === lado) return

    const { saidaMs, entradaMs, deslocamentoPx, curva } = temposDaLegenda()
    const easing = Array.isArray(curva) ? `cubic-bezier(${curva.join(',')})` : curva
    const de = valoresAgora(el)
    animacao.current?.cancel()

    fase.current = 'saida'
    const saida = el.animate(
      [
        { opacity: de.opacidade, transform: `translateY(${de.y}px)` },
        { opacity: 0, transform: `translateY(${-deslocamentoPx}px)` },
      ],
      { duration: saidaMs, easing, fill: 'forwards' },
    )
    animacao.current = saida
    saida.onfinish = () => {
      const novo = alvo.current
      exibidoRef.current = novo
      flushSync(() => setExibido(novo))
      saida.cancel()
      fase.current = 'entrada'
      const entrada = el.animate(
        [
          { opacity: 0, transform: `translateY(${deslocamentoPx}px)` },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: entradaMs, easing },
      )
      animacao.current = entrada
      entrada.onfinish = () => {
        fase.current = 'repouso'
        animacao.current = null
      }
    }
  }, [lado])

  useEffect(
    () => () => {
      animacao.current?.cancel()
    },
    [],
  )

  const assinada = useAssinatura(no)
  const mostrado: Lado = temAnimacao ? exibido : lado
  return (
    <p
      ref={no}
      data-legenda=""
      data-troca-legenda=""
      data-tom="noite"
      data-assinada={assinada ? '' : undefined}
      aria-live="off"
      className="text-abertura font-texto cm-legenda ic-legenda"
    >
      <TextoAssinado texto={textos[mostrado - 1]} />
    </p>
  )
}
