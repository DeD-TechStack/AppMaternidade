import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido } from './reduzido.ts'

// M8: a cena da abertura vai de 0,94 a 1 e aparece, em 0,8 s, quando a cortina termina (`pronta`).
// Antes disso fica no estado inicial, escondida sob a cortina. Com movimento reduzido nasce no estado
// final e não anima.

interface Props {
  /** A cortina já subiu (ou nem apareceu): a cena entra. */
  pronta: boolean
  children: ReactNode
  className?: string
}

export function EntradaCena({ pronta, children, className }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const { duracaoMs, curva, escala } = CATALOGO.M8
  const final = { scale: escala.para, opacity: 1 }

  return (
    <motion.div
      className={className}
      data-entrada-cena={reduzido || pronta ? 'final' : 'espera'}
      initial={reduzido ? final : { scale: escala.de, opacity: 0 }}
      animate={reduzido || pronta ? final : { scale: escala.de, opacity: 0 }}
      transition={reduzido ? { duration: 0 } : { duration: duracaoMs / 1000, ease: curva }}
    >
      {children}
    </motion.div>
  )
}
