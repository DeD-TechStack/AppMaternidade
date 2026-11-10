import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { motion, type Variants } from 'motion/react'
import { cn } from '../componentes/terceiros/cn.ts'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido } from './reduzido.ts'

// M12: no hover e no foco do link a seta desliza 2 px para a direita e 2 px para cima, em 300 ms,
// e volta. O ícone vem de quem usa a peça (aqui não se importa biblioteca de ícones) e fica
// escondido do leitor de tela: o nome do link é só o texto. A árvore é a mesma com e sem movimento
// reduzido (o foco no link sobrevive à troca da preferência); com movimento reduzido o hover e o
// foco não ligam a seta, e se a preferência liga com a seta fora do repouso ela volta sem animar.
// O link continua mudando de cor pelo CSS da página.

type Props = Omit<
  ComponentPropsWithoutRef<'a'>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'style'
> & {
  icone: ReactNode
}

const CLASSE = 'alvo-toque inline-flex items-center gap-1'

const link: Variants = { repouso: {}, ativo: {} }

export function LinkComSeta({ icone, children, className, ...resto }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const { deslocamentoPx, duracaoMs, curva } = CATALOGO.M12

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
      animate="repouso"
      whileHover={reduzido ? undefined : 'ativo'}
      whileFocus={reduzido ? undefined : 'ativo'}
    >
      {children}
      <motion.span
        aria-hidden="true"
        className="inline-flex"
        variants={seta}
        transition={reduzido ? { duration: 0 } : { duration: duracaoMs / 1000, ease: curva }}
      >
        {icone}
      </motion.span>
    </motion.a>
  )
}
