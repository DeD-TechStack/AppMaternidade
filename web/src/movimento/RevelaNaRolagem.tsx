import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido } from './reduzido.ts'

// M3: a mídia de um painel de campo vai de 0,9 a 1 presa à rolagem, nos primeiros 360 px a partir de
// quando o topo dela entra pela base da janela, com a mola do catálogo (sobreamortecida: chega sem
// passar do alvo). Uma mídia que já está 360 px dentro da janela ao carregar nasce em 1. Só lê a
// rolagem. A árvore e os hooks são os mesmos com e sem movimento reduzido; com movimento reduzido a
// escala fica fixa em 1.

interface Props {
  children: ReactNode
  className?: string
}

export function RevelaNaRolagem({ children, className }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const { janelaPx, escala, mola } = CATALOGO.M3
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', `${janelaPx}px end`] })
  const escalaBruta = useTransform(scrollYProgress, [0, 1], [escala.de, escala.para])
  const scale = useSpring(escalaBruta, { stiffness: mola.stiffness, damping: mola.damping })

  return (
    <motion.div ref={ref} className={className} data-revela="" style={{ scale: reduzido ? escala.para : scale }}>
      {children}
    </motion.div>
  )
}
