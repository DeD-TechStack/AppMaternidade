import { exigirTexto, exigirTom, type Tom } from './contrato.ts'

interface Props {
  /** A frase: um so no de texto, sem elemento filho. */
  texto: string
  tom: Tom
}

const PECA = 'Legenda'

/**
 * Legenda (DS1:RF-12): uma linha de abertura em prumo, de cacau de dia e de papel de noite. Um `p[data-legenda]` com
 * exatamente um no de texto: sem elemento filho e sem rotulo antes dela (FREEZE 1.6).
 */
export function Legenda({ texto, tom }: Props) {
  exigirTexto(PECA, 'texto', texto)
  exigirTom(PECA, tom)
  return (
    <p data-legenda="" data-tom={tom} className="text-abertura font-texto cm-legenda">
      {texto}
    </p>
  )
}
