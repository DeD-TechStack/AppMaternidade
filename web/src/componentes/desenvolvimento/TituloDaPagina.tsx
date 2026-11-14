import type { ReactNode } from 'react'
import { Pilha } from '../base/layout/Pilha.tsx'

interface Props {
  titulo: string
  /** A segunda linha em itálico; sem ela (a página sem bebê), só o título. */
  linha: string | null
  /** O que fica ao lado do título em telas largas (o seletor de bebê). */
  lateral?: ReactNode
}

/**
 * A abertura da página de Desenvolvimento: o `h1` e, abaixo dele, a segunda linha em itálico. Mesma estrutura e mesmas
 * classes do `TituloDaTela` do app (`[data-titulo-tela]`, `h1` e a linha como irmã seguinte), mas o espaço entre o
 * título e a linha é o do papel `junto` (a `Pilha`) e a abertura não leva padding próprio: o espaço de cima é o da
 * `Secao` que a contém.
 */
export function TituloDaPagina({ titulo, linha, lateral }: Props) {
  return (
    <div data-titulo-tela="">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <Pilha vao="junto" className="min-w-0">
          <h1 className="cm-h1 text-titulo-1">{titulo}</h1>
          {linha ? <p className="cm-h3 text-titulo-3 font-medium italic">{linha}</p> : null}
        </Pilha>
        {lateral}
      </div>
    </div>
  )
}
