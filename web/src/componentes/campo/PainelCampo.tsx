import type { ReactNode } from 'react'
import { cn } from '../terceiros/cn.ts'

export type VariantePainel = 'mel' | 'oliva' | 'areia' | 'cacau'

interface Props {
  /** O campo de cor. Mel é o campo de mídia; oliva, o pedestal e os selos; areia, o descanso; cacau, a faixa. */
  variante?: VariantePainel
  /** Aplica a luz de estúdio (`--luz-estudio`); só faz sentido no mel. */
  luz?: boolean
  /** `campo`: a largura da janela menos 32 px de cada lado (12 em 390). `celula`: ocupa a célula da grade. */
  largura?: 'campo' | 'celula'
  como?: 'div' | 'section' | 'aside' | 'figure'
  className?: string
  id?: string
  'aria-labelledby'?: string
  'aria-label'?: string
  children: ReactNode
}

/** Painel de campo (DESIGN.md 3): raio 24, respiro de 64 (1440) a 24 (390), uma cor de papel definido. */
export function PainelCampo({
  variante = 'mel',
  luz = false,
  largura = 'campo',
  como: Tag = 'div',
  className,
  id,
  children,
  ...aria
}: Props) {
  return (
    <Tag
      id={id}
      className={cn('cm-painel', `cm-painel-${variante}`, luz && variante === 'mel' && 'cm-painel-luz', className)}
      data-painel={variante}
      data-largura={largura === 'celula' ? 'celula' : undefined}
      {...aria}
    >
      {children}
    </Tag>
  )
}
