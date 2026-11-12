import { Fragment, type ReactNode } from 'react'
import './publicas-destaque.css'

// Horas ("14:05", "às 14:05") e durações ("1 h 15 min", "20 min"): cada uma é uma peça só, nunca quebra
// no meio ("1 / h 15 min"). O texto não muda: só ganha um `<span>` sem quebra em volta.
const PADRAO = /((?:às )?\d{1,2}:\d{2}|\d+ h(?: \d+ min)?|\d+ min)/g

/** O texto com as horas e as durações presas em uma linha (a quebra acontece antes ou depois delas). */
export function SemQuebra({ texto }: { texto: string }): ReactNode {
  return texto.split(PADRAO).map((trecho, i) =>
    i % 2 === 1 ? (
      <span key={i} className="pd-nq">
        {trecho}
      </span>
    ) : (
      <Fragment key={i}>{trecho}</Fragment>
    ),
  )
}
