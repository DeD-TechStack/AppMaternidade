import type { ReactNode } from 'react'
import { Midia } from '../base/Midia.tsx'

interface Props {
  /** O texto da citação, sem aspas: a citação as põe. */
  texto: string
  /** Quem escreveu e a marca de que é exemplo. */
  autoria: string
  /** A descrição da moldura do retrato (a moldura não tem texto dentro). */
  rotuloRetrato: string
  /** A cena dentro da moldura do retrato (um aparelho cortado pela borda, por exemplo). */
  midia?: ReactNode
}

/**
 * Citação do Início: o texto em `citacao` (Fraunces itálico) em c1–c6 e, em c8–c10, uma moldura de
 * retrato. Abaixo de 768 o retrato vem abaixo do texto. Vai como filho direto do `main`.
 */
export function Citacao({ texto, autoria, rotuloRetrato, midia }: Props) {
  return (
    <section className="sb-area sb-mt-midia-linhas grade-10 vt-citacao" data-bloco="">
      <figure className="vt-citacao-texto col-c1-c6">
        <blockquote className="t-citacao">
          <p>{`“${texto}”`}</p>
        </blockquote>
        <figcaption className="vt-citacao-autoria t-ui">{autoria}</figcaption>
      </figure>
      <div className="vt-citacao-midia col-c8-c10">
        <Midia formato="retrato" fundo="lavanda" aria-label={rotuloRetrato}>
          {midia}
        </Midia>
      </div>
    </section>
  )
}
