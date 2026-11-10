import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido } from './reduzido.ts'

// M3: o bloco aparece (opacidade 0 → 1, escala 0,9 → 1) preso à rolagem, durante os primeiros
// 360 px de rolagem a partir de quando o topo dele entra pela base da janela. A janela é em
// pixels de rolagem, não uma fração da altura da janela: o fim é o ponto do bloco 360 px abaixo
// do topo chegando à base da janela. Só lê a rolagem; não a muda nem a intercepta.
// A árvore e os hooks são os mesmos com e sem movimento reduzido. Com movimento reduzido o estilo
// são valores fixos (opacidade 1, escala 1) no lugar dos valores presos à rolagem.

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
  const opacidadeBruta = useTransform(scrollYProgress, [0, 1], [0, 1])
  // Mola sobreamortecida (damping acima do crítico): alcança o alvo sem passar dele.
  const suave = { stiffness: mola.stiffness, damping: mola.damping }
  const scale = useSpring(escalaBruta, suave)
  const opacity = useSpring(opacidadeBruta, suave)

  return (
    <motion.div ref={ref} className={className} style={reduzido ? { scale: escala.para, opacity: 1 } : { scale, opacity }}>
      {children}
    </motion.div>
  )
}
