import type { HTMLAttributes } from 'react'
import { juntarDataH } from './dataH.ts'
import './layout.css'

type Props = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'nav' | 'header' | 'section' | 'footer'
  /**
   * `quadro` (padrão): a largura útil inteira, centrada. `medio` (880) e `leitura` (640): largura máxima de bloco
   * de texto, alinhada à borda esquerda do quadro e não centrada.
   */
  largura?: 'quadro' | 'medio' | 'leitura'
  /** Valores a somar no `data-h`. */
  dataH?: string
}

/**
 * Quadro: a faixa onde fica o conteúdo da página, `min(var(--quadro-largura), 100vw - 2 * var(--quadro-calha))`,
 * centrada. A borda esquerda dele é a borda da página. O nome evita a confusão com `comunidade/Quadro.tsx`.
 */
export function QuadroLayout({ as: Elemento = 'div', largura = 'quadro', dataH, children, ...resto }: Props) {
  return (
    <Elemento {...resto} data-h={juntarDataH(dataH, 'quadro')} data-h-largura={largura}>
      {children}
    </Elemento>
  )
}
