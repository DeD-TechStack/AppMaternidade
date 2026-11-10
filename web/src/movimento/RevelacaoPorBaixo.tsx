import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '../componentes/terceiros/cn.ts'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido } from './reduzido.ts'

// M6 e M7: a seção parece sair de baixo da anterior. O conteúdo vai de -50% (M6) ou -30% (M7) da
// própria altura até 0, preso à rolagem, linear e sem suavização. O movimento corre de quando o
// topo da seção entra pela base da janela até quando a base dela chega à base da janela, para
// terminar no lugar mesmo na última seção da página. O recipiente corta o que sobe além da borda.
// A árvore e os hooks são os mesmos com e sem movimento reduzido; com movimento reduzido o
// conteúdo fica fixo no lugar (y em 0).

interface Props {
  variante: 'M6' | 'M7'
  children: ReactNode
  className?: string
}

export function RevelacaoPorBaixo({ variante, children, className }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const { deslocamentoPct } = CATALOGO[variante]
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], [`-${deslocamentoPct}%`, '0%'])

  return (
    <div ref={ref} className={cn('overflow-hidden', className)}>
      <motion.div style={reduzido ? { y: 0 } : { y }}>{children}</motion.div>
    </div>
  )
}
