import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido } from './reduzido.ts'

// Mesma marca que a Cortina grava na sessão ao terminar.
const MARCA = 'cortina-vista'

// M8: a cena da abertura vai de 0,94 a 1 e aparece, em 0,8 s, quando a cortina termina (`pronta`).
// Na primeira visita fica no estado inicial (opacity 0), escondida sob a cortina, e só então anima até
// o final. Com movimento reduzido nasce no estado final e não anima. A cena também nasce final quando
// a cortina de abertura já foi vista na sessão (segunda visita): a Cortina não renderiza nada, e o
// `pronta` dos chamadores só vira true num efeito depois da primeira renderização.

interface Props {
  /** A cortina já subiu (ou nem apareceu): a cena entra. */
  pronta: boolean
  children: ReactNode
  className?: string
}

export function EntradaCena({ pronta, children, className }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const [semCortina] = useState(() => {
    try {
      return window.sessionStorage.getItem(MARCA) === '1'
    } catch {
      return false
    }
  })
  const nasceFinal = reduzido || semCortina
  const { duracaoMs, curva, escala } = CATALOGO.M8
  const final = { scale: escala.para, opacity: 1 }

  return (
    <motion.div
      className={className}
      data-entrada-cena={nasceFinal || pronta ? 'final' : 'espera'}
      initial={nasceFinal ? final : { scale: escala.de, opacity: 0 }}
      animate={nasceFinal || pronta ? final : { scale: escala.de, opacity: 0 }}
      transition={reduzido ? { duration: 0 } : { duration: duracaoMs / 1000, ease: curva }}
    >
      {children}
    </motion.div>
  )
}
