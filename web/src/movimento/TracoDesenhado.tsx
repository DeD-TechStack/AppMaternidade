import { motion } from 'motion/react'
import { cn } from '../componentes/terceiros/cn.ts'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido } from './reduzido.ts'

// M1: uma linha fina que se desenha da esquerda para a direita, com scaleX de 0 a 1, linear, a
// partir da borda esquerda. É uma linha comum (um span de bloco com 2 px de altura, na cor do
// texto do contêiner), não um desenho: a cor vem de `currentColor`. Com movimento reduzido ela
// aparece inteira e parada.

interface Props {
  /** Largura e cor da linha: classes de quem usa a peça. Sem largura, ocupa o contêiner. */
  className?: string
}

// Sem classe de largura: o span é de bloco e ocupa o contêiner; quem usa a peça decide a largura
// por `className` (o `cn` só junta classes, então uma largura aqui brigaria com a de fora).
const LINHA = 'block h-0.5 origin-left rounded-full bg-current'

export function TracoDesenhado({ className }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const classe = cn(LINHA, className)

  if (reduzido) return <span aria-hidden="true" className={classe} />

  return (
    <motion.span
      aria-hidden="true"
      className={classe}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{
        duration: CATALOGO.M1.duracaoMs / 1000,
        ease: CATALOGO.M1.curva,
        delay: CATALOGO.M1.atrasoMs / 1000,
      }}
    />
  )
}
