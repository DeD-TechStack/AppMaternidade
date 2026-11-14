import type { HTMLAttributes } from 'react'
import { juntarDataH } from './dataH.ts'
import './layout.css'

type Props = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'ul' | 'ol' | 'section' | 'article' | 'nav'
  /** O papel do vão (tabela "qual token em qual vão" do DESIGN.md); `pilha` por padrão. */
  vao?: 'junto' | 'pilha' | 'grupo' | 'bloco' | 'midia'
  /** Valores a somar no `data-h`. */
  dataH?: string
}

/** Pilha: grupo vertical de blocos com um vão fixo, igual ao token do papel (`data-h-vao`). */
export function Pilha({ as: Elemento = 'div', vao = 'pilha', dataH, children, ...resto }: Props) {
  return (
    <Elemento {...resto} data-h={juntarDataH(dataH, 'pilha')} data-h-vao={vao}>
      {children}
    </Elemento>
  )
}
