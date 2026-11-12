import type { ReactNode } from 'react'
import { TituloDaTela } from '../app/TituloDaTela.tsx'

interface Props {
  titulo: string
  /** A segunda linha em itálico: um texto, ou o seletor de bebê quando há mais de um. */
  linha: ReactNode
  antes?: ReactNode
  lateral?: ReactNode
}

/**
 * A abertura das telas da rotina. Com texto na segunda linha é o `TituloDaTela` da base; com outro nó (o
 * botão do seletor de bebê, R38-03) tem a mesma estrutura e as mesmas classes, porque o `TituloDaTela` só
 * aceita texto na segunda linha.
 */
export function TituloRotina({ titulo, linha, antes, lateral }: Props) {
  if (typeof linha === 'string') return <TituloDaTela titulo={titulo} linha={linha} antes={antes} lateral={lateral} />
  return (
    <div className="cm-area pt-6 lg:pt-12" data-titulo-tela="">
      {antes}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div className="min-w-0">
          <h1 className="cm-h1">{titulo}</h1>
          <div className="cm-h3 mt-1 font-medium italic">{linha}</div>
        </div>
        {lateral}
      </div>
    </div>
  )
}
