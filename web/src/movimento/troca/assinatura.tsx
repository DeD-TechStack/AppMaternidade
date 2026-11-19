import { useEffect, useState, type RefObject } from 'react'
import { usePrefereMovimentoReduzido } from '../reduzido.ts'

// Moment 4 of the Início (HOME-FINAL): the timestamp strip reads like a signed log line. The hour leads (heavier,
// larger, tabular figures), the author is subordinate (smaller, quieter), and a stroke draws under "por <nome>" ONCE,
// when the caption first stands whole in the window: 400 ms, `scaleX(0)` to `scaleX(1)` from the left, on the standard
// curve, in plain CSS (inicio-casa.css, `[data-assinada]`). With reduced motion the stroke is there, finished, at once.
// The approved wording never changes: the caption's text is the copy string, split into three runs, nothing added.

/** "hh:mm" + the middle + the last two words (the author: "por Ju", "por Ícaro"). */
const PARTES = /^(\d{1,2}:\d{2})(.*\s)(\S+\s+\S+)$/u

/** Whole in view: the stroke starts when the caption's line is entirely on screen. */
const LIMIAR_DA_ASSINATURA = 1

/** The caption's text in three runs: the hour, the middle, and the author holding the stroke. */
export function TextoAssinado({ texto }: { texto: string }) {
  const partes = PARTES.exec(texto)
  if (!partes) return <>{texto}</>
  const [, hora, meio, autor] = partes
  return (
    <>
      <span data-legenda-hora="" className="ic-legenda-hora">
        {hora}
      </span>
      {meio}
      <span data-legenda-autor="" className="ic-legenda-autor">
        {autor}
        <span data-legenda-traco="" className="ic-legenda-traco" aria-hidden="true" />
      </span>
    </>
  )
}

/**
 * True once the caption has been whole in view (then it stays true: the stroke plays once per mount), and at once with
 * reduced motion. Without IntersectionObserver the stroke is finished from the start.
 */
export function useAssinatura(alvo: RefObject<Element | null>): boolean {
  const reduzido = usePrefereMovimentoReduzido()
  const [vista, setVista] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = alvo.current
    if (reduzido || vista || !el) return
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((entrada) => entrada.isIntersecting)) return
        observador.disconnect()
        setVista(true)
      },
      { threshold: LIMIAR_DA_ASSINATURA },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [alvo, reduzido, vista])

  return reduzido || vista
}
