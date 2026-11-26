import { useEffect, useState, type RefObject } from 'react'
import { usePrefereMovimentoReduzido } from '../reduzido.ts'

// Moment 4 of the Início (HOME-FINAL): the timestamp strip reads like a signed log line. The hour leads (heavy serif,
// larger, tabular figures) and the author is the name in an upright serif (inicio-casa.css); there is no drawn stroke any
// more, so nothing reads like a link. `useAssinatura` still says once when the caption first stands whole in the window
// (`data-assinada`; at once with reduced motion), which band 5's hairlines also read.
// The approved wording never changes: the caption's text is the copy string, split into three runs, nothing added.

/** "hh:mm" + the middle + the last two words (the author: "por Ju", "por Ícaro"). */
const PARTES = /^(\d{1,2}:\d{2})(.*\s)(\S+\s+\S+)$/u

/** Mostly in view: the stroke starts when 60 % of the caption's line is on screen (STAGE, H2). */
const LIMIAR_DA_ASSINATURA = 0.6

/** The caption's text in three runs: the hour, the middle, and the author. */
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
      </span>
    </>
  )
}

/**
 * True once the caption has been whole in view (then it stays true, once per mount), and at once with reduced motion.
 * Without IntersectionObserver it is true from the start.
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
