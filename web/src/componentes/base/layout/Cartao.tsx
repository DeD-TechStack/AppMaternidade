import type { ComponentType, HTMLAttributes, Ref } from 'react'
import { juntarDataH } from './dataH.ts'
import './layout.css'

type Props = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'li' | 'section' | 'figure'
  /** Valores a somar no `data-h` (`dataH="coluna"` dá `"coluna cartao"`). */
  dataH?: string
  /** O elemento do cartão (React 19: `ref` é prop comum). */
  ref?: Ref<HTMLElement>
}

/**
 * Cartão: bloco com fundo próprio ou borda dentro de uma seção. O padding é `espaco-painel` em volta e o raio é o
 * do cartão; o fundo e a borda são de quem usa (`className`).
 */
export function Cartao({ as: como = 'div', dataH, ref, children, ...resto }: Props) {
  // Cada `as` tem o seu tipo de ref (div, li, figure...) e a união deles não aceita um `Ref<HTMLElement>`: a tag
  // vai tipada como a peça de props comuns que ela é aqui.
  const Elemento = como as unknown as ComponentType<HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }>
  return (
    <Elemento {...resto} ref={ref} data-h={juntarDataH(dataH, 'cartao')}>
      {children}
    </Elemento>
  )
}
