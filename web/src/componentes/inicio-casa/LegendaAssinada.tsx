import { useRef } from 'react'
import { TextoAssinado, useAssinatura } from '../../movimento/troca/assinatura.tsx'
import { exigirTexto, exigirTom, type Tom } from '../secoes/contrato.ts'

interface Props {
  /** The caption, one copy string: "hh:mm, <what>, anotada por <name>". */
  texto: string
  tom: Tom
}

const PECA = 'LegendaAssinada'

/**
 * The Início's own caption (HOME-FINAL moment 4): the shared Legenda's line (`p[data-legenda]`, abertura, cacau by day,
 * papel by night) with the hour emphasised, the author subordinate and the signature stroke under "por <nome>"
 * (movimento/troca/assinatura.tsx). The shared Legenda keeps its one text node for the other pages.
 */
export function LegendaAssinada({ texto, tom }: Props) {
  exigirTexto(PECA, 'texto', texto)
  exigirTom(PECA, tom)
  const no = useRef<HTMLParagraphElement>(null)
  const assinada = useAssinatura(no)
  return (
    <p
      ref={no}
      data-legenda=""
      data-tom={tom}
      data-assinada={assinada ? '' : undefined}
      className="text-abertura font-texto cm-legenda ic-legenda"
    >
      <TextoAssinado texto={texto} />
    </p>
  )
}
