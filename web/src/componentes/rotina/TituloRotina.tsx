import type { ReactNode } from 'react'
import { TituloDaTela } from '../app/TituloDaTela.tsx'
import { Pilha } from '../base/layout/index.ts'

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
    <Pilha vao="junto" data-titulo-tela="">
      {antes}
      <div className="flex flex-wrap items-end justify-between gap-x-esp-grupo gap-y-esp-junto">
        <Pilha vao="junto" className="min-w-0">
          <h1 className="text-titulo-1 font-titulo font-semibold">{titulo}</h1>
          <div className="text-titulo-3 font-titulo font-medium italic">{linha}</div>
        </Pilha>
        {lateral}
      </div>
    </Pilha>
  )
}
