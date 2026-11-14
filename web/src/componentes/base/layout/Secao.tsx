import type { HTMLAttributes } from 'react'
import { cn } from '../../terceiros/cn.ts'
import { juntarDataH } from './dataH.ts'
import './layout.css'

type CorDoPainel = 'mel' | 'oliva' | 'areia' | 'cacau'

type Props = HTMLAttributes<HTMLElement> & {
  /** O elemento: `section` (padrão), `div` ou `footer` (o rodapé do site é um painel). */
  as?: 'section' | 'div' | 'footer'
  /**
   * `painel`: caixa externa sem fundo (padding vertical de meio `espaco-bloco`) e, dentro, a caixa de cor com a
   * largura do quadro. `centrada`: um título e uma ação, com o texto centrado.
   */
  variante?: 'painel' | 'centrada'
  /** A cor da caixa do painel (só com `variante="painel"`); mel por padrão. */
  painel?: CorDoPainel
  /** A luz de estúdio, só no painel de mel. */
  luz?: boolean
  /** Classes da caixa de cor (a de dentro); `className` vai na caixa externa. */
  classeCaixa?: string
  /** Valores a somar no `data-h` (por exemplo `"coluna"` vira `"coluna secao"`). */
  dataH?: string
}

/**
 * Seção: faixa vertical filha direta do `<main>` (SPEC H3, glossário). Sem fundo, o padding de topo e de base é
 * `espaco-secao`, e a primeira e a última filha do `<main>` usam `espaco-secao-ampla` (layout.css). As caixas de
 * seções vizinhas se tocam: nenhuma margem. O painel é a seção de variante `painel`: a caixa externa não tem
 * fundo e a de dentro, de cor, tem a largura do quadro, `espaco-secao` em cima e embaixo e `espaco-painel` dos lados.
 */
export function Secao({
  as: Elemento = 'section',
  variante,
  painel = 'mel',
  luz = false,
  classeCaixa,
  dataH,
  className,
  children,
  ...resto
}: Props) {
  return (
    <Elemento {...resto} className={className} data-h={juntarDataH(dataH, 'secao')} data-h-variante={variante}>
      {variante === 'painel' ? (
        <div
          data-h="caixa-cor"
          data-painel={painel}
          className={cn(`cm-painel-${painel}`, luz && painel === 'mel' && 'cm-painel-luz', classeCaixa)}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </Elemento>
  )
}
