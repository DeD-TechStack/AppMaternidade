import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { motion, type Variants } from 'motion/react'
import { cn } from '../componentes/terceiros/cn.ts'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido } from './reduzido.ts'

// M12: no hover e no foco do link a seta desliza 2 px para a direita e 2 px para cima, em 300 ms,
// e volta. O ícone vem de quem usa a peça (aqui não se importa biblioteca de ícones) e fica
// escondido do leitor de tela: o nome do link é só o texto. Com movimento reduzido a seta fica
// parada; o link continua mudando de cor pelo CSS da página.

type Props = Omit<
  ComponentPropsWithoutRef<'a'>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'style'
> & {
  icone: ReactNode
}

const CLASSE = 'alvo-toque inline-flex items-center gap-1'

export function LinkComSeta({ icone, children, className, ...resto }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const { deslocamentoPx, duracaoMs, curva } = CATALOGO.M12

  if (reduzido) {
    return (
      <a {...resto} className={cn(CLASSE, className)}>
        {children}
        <span aria-hidden="true" className="inline-flex">
          {icone}
        </span>
      </a>
    )
  }

  const link: Variants = { repouso: {}, ativo: {} }
  const seta: Variants = {
    repouso: { x: 0, y: 0 },
    ativo: { x: deslocamentoPx, y: -deslocamentoPx },
  }

  return (
    <motion.a
      {...resto}
      className={cn(CLASSE, className)}
      variants={link}
      initial="repouso"
      whileHover="ativo"
      whileFocus="ativo"
    >
      {children}
      <motion.span
        aria-hidden="true"
        className="inline-flex"
        variants={seta}
        transition={{ duration: duracaoMs / 1000, ease: curva }}
      >
        {icone}
      </motion.span>
    </motion.a>
  )
}
