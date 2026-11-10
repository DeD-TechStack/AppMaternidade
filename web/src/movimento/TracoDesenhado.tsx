import { useEffect } from 'react'
import { animate, motion, useMotionValue } from 'motion/react'
import { cn } from '../componentes/terceiros/cn.ts'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido } from './reduzido.ts'

// M1: uma linha fina que se desenha da esquerda para a direita por revelação com máscara. O
// recipiente (span de bloco, 2 px de altura, cantos arredondados, overflow hidden) corta uma linha
// que desliza no eixo x de -100% a 0% da própria largura, linear (só transform). A cor vem de
// `currentColor`. A mesma árvore vale com e sem movimento reduzido; com movimento reduzido a linha
// já nasce inteira (x em 0%) e, se a preferência liga no meio do desenho, vai ao lugar de uma vez,
// sem terminar a animação (o valor é conduzido por animate() num efeito, cancelado a cada mudança).

interface Props {
  /** Largura e cor da linha: classes de quem usa a peça. Sem largura, ocupa o contêiner. */
  className?: string
}

// Sem classe de largura: o span é de bloco e ocupa o contêiner; quem usa a peça decide a largura
// por `className` (o `cn` só junta classes, então uma largura aqui brigaria com a de fora).
const RECIPIENTE = 'block h-0.5 overflow-hidden rounded-full'

export function TracoDesenhado({ className }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const { duracaoMs, curva, atrasoMs, deslocamentoPct } = CATALOGO.M1
  const x = useMotionValue(reduzido ? '0%' : `-${deslocamentoPct}%`)

  useEffect(() => {
    if (reduzido) {
      // Salto: encerra o desenho em curso e põe a linha inteira de uma vez.
      x.jump('0%')
      return
    }
    const desenho = animate(x, '0%', { duration: duracaoMs / 1000, ease: curva, delay: atrasoMs / 1000 })
    return () => desenho.stop()
  }, [reduzido, x, duracaoMs, curva, atrasoMs])

  return (
    <span aria-hidden="true" className={cn(RECIPIENTE, className)}>
      <motion.span className="block h-full w-full bg-current" style={{ x }} />
    </span>
  )
}
