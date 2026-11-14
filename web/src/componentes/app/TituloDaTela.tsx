import type { ReactNode } from 'react'
import { Pilha } from '../base/layout/index.ts'

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
    <Pilha vao="junto" data-titulo-tela="">
      {antes}
      <div className="flex flex-wrap items-end justify-between gap-x-esp-grupo gap-y-esp-junto">
        <Pilha vao="junto" className="min-w-0">
          <h1 className="cm-h1">{titulo}</h1>
          <p className="cm-h3 font-medium italic">{linha}</p>
        </Pilha>
        {lateral}
      </div>
    </Pilha>
  )
}
