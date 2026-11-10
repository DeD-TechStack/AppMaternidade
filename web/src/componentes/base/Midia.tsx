import type { CSSProperties, ReactNode } from 'react'

interface Props {
  /** `larga`: c1–c10, proporção 1,43. `par`: quadrada, metade da galeria. `retrato`: c8–c10. */
  formato: 'larga' | 'par' | 'retrato'
  /** Barro ou lavanda: só existem como fundo de mídia. */
  fundo: 'barro' | 'lavanda'
  /** A descrição da mídia (não há texto dentro da moldura). */
  'aria-label': string
  /** Só para `larga`: a proporção desta instância, como `largura / altura` (`"1376 / 984"`), uma para
   *  768 ou mais e outra para abaixo disso. Sem ela, a moldura tem a proporção de sempre. */
  proporcao?: { larga: string; estreita: string }
  /** O conteúdo da moldura: uma imagem que cobre tudo. Sem ele, a moldura fica vazia. */
  children?: ReactNode
}

/** Moldura de mídia: raio 8 (4 abaixo de 768), `overflow: hidden`, sem sombra, sem borda e sem texto. */
export function Midia({ formato, fundo, proporcao, children, ...resto }: Props) {
  // A proporção por instância vai em variáveis CSS (o CSS que as aplica está em midia/midia.css) e no
  // atributo `data-proporcao`; sem ela, nem o atributo nem o `style` aparecem.
  const estilo = proporcao
    ? ({ '--proporcao-larga': proporcao.larga, '--proporcao-estreita': proporcao.estreita } as CSSProperties)
    : undefined
  return (
    <div
      role="img"
      aria-label={resto['aria-label']}
      className="sb-midia"
      data-midia=""
      data-formato={formato}
      data-fundo={fundo}
      data-proporcao={proporcao?.larga}
      style={estilo}
    >
      {children}
    </div>
  )
}
