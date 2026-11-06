// Adaptado do componente BlurFade do Magic UI (https://magicui.design, commit efe76fc5755e).
// Licença MIT: texto em web/licencas/magicui-LICENSE.md.
// O que mudou: sem nenhum filtro (o original desfoca; aqui só opacidade e deslocamento);
// deslocamento, duração, curva e atraso chegam por props, vindos do catálogo de movimento;
// volta ao estado inicial quando o elemento sai da janela (once: false); sem AnimatePresence;
// com movimento reduzido vira um elemento comum, já no estado final.
import { useRef, type ReactNode } from 'react'
import { motion, useInView } from 'motion/react'
import { usePrefereMovimentoReduzido } from '../../movimento/reduzido.ts'
import type { RegistroMovimento } from '../../movimento/catalogo.ts'

interface Props {
  children: ReactNode
  className?: string
  /** Quanto o elemento sobe, em px, ao entrar. */
  deslocamentoPx: number
  duracaoMs: number
  curva: RegistroMovimento['curva']
  atrasoMs?: number
}

function EntradaAnimada({ children, className, deslocamentoPx, duracaoMs, curva, atrasoMs = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dentro = useInView(ref, { once: false })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: deslocamentoPx }}
      animate={dentro ? { opacity: 1, y: 0 } : { opacity: 0, y: deslocamentoPx }}
      transition={{ duration: duracaoMs / 1000, ease: curva, delay: dentro ? atrasoMs / 1000 : 0 }}
    >
      {children}
    </motion.div>
  )
}

export function EntradaSuave(props: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  if (reduzido) return <div className={props.className}>{props.children}</div>
  return <EntradaAnimada {...props} />
}
