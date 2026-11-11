import type { ReactNode } from 'react'

interface Props {
  /** O `h1` da tela, em Literata 600 (84/88 em 1440, 42/46 em 390). */
  titulo: string
  /** A segunda linha inteira em itálico (DESIGN.md 2), fora do `h1` para o nome do título ficar curto. */
  linha: string
  /** O que vem antes do título (o link de volta da Sessão). */
  antes?: ReactNode
  /** O que fica à direita do título em telas largas (a data no Hoje). */
  lateral?: ReactNode
}

/**
 * A abertura das telas do app: o título e a segunda linha em itálico. O `h1` recebe o foco por programa
 * quando a origem pede (`useTituloDaTela` põe o `tabIndex`).
 */
export function TituloDaTela({ titulo, linha, antes, lateral }: Props) {
  return (
    <div className="cm-area pt-6 lg:pt-12" data-titulo-tela="">
      {antes}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div className="min-w-0">
          <h1 className="cm-h1">{titulo}</h1>
          <p className="cm-h3 mt-1 font-medium italic">{linha}</p>
        </div>
        {lateral}
      </div>
    </div>
  )
}
