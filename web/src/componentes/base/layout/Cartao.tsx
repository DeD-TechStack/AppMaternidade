import type { HTMLAttributes } from 'react'
import { juntarDataH } from './dataH.ts'
import './layout.css'

type Props = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'li' | 'section'
  /** Valores a somar no `data-h` (`dataH="coluna"` dá `"coluna cartao"`). */
  dataH?: string
}

/**
 * Cartão: bloco com fundo próprio ou borda dentro de uma seção. O padding é `espaco-painel` em volta e o raio é o
 * do cartão; o fundo e a borda são de quem usa (`className`).
 */
export function Cartao({ as: Elemento = 'div', dataH, children, ...resto }: Props) {
  return (
    <Elemento {...resto} data-h={juntarDataH(dataH, 'cartao')}>
      {children}
    </Elemento>
  )
}
