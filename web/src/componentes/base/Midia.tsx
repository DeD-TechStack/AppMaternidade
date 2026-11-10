import type { ReactNode } from 'react'

interface Props {
  /** `larga`: c1–c10, proporção 1,43. `par`: quadrada, metade da galeria. `retrato`: c8–c10. */
  formato: 'larga' | 'par' | 'retrato'
  /** Barro ou lavanda: só existem como fundo de mídia. */
  fundo: 'barro' | 'lavanda'
  /** A descrição da mídia (não há texto dentro da moldura). */
  'aria-label': string
  /** O conteúdo da moldura: uma imagem que cobre tudo. Sem ele, a moldura fica vazia. */
  children?: ReactNode
}

/** Moldura de mídia: raio 8 (4 abaixo de 768), `overflow: hidden`, sem sombra, sem borda e sem texto. */
export function Midia({ formato, fundo, children, ...resto }: Props) {
  return (
    <div
      role="img"
      aria-label={resto['aria-label']}
      className="sb-midia"
      data-midia=""
      data-formato={formato}
      data-fundo={fundo}
    >
      {children}
    </div>
  )
}
