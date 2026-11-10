// Adaptado do componente BlurFade do Magic UI (https://magicui.design, commit efe76fc5755e).
// Licença MIT: texto em web/licencas/magicui-LICENSE.md.
// O que mudou: sem nenhum filtro (o original desfoca; aqui só opacidade e deslocamento);
// deslocamento, duração, curva e atraso chegam por props, vindos do catálogo de movimento;
// volta ao estado inicial quando o elemento sai da janela (once: false); sem AnimatePresence;
// os valores são conduzidos por animate() num efeito, cancelado a cada mudança; a árvore é a mesma
// com e sem movimento reduzido (o conteúdo, o estado e o foco dos filhos sobrevivem à troca da
// preferência); com movimento reduzido o bloco nasce no estado final, e se a preferência liga no
// meio de uma entrada ele vai direto ao estado final, sem terminar a animação.
import { useEffect, useRef, type ReactNode } from 'react'
import { animate, motion, useInView, useMotionValue } from 'motion/react'
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

export function EntradaSuave({ children, className, deslocamentoPx, duracaoMs, curva, atrasoMs = 0 }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const ref = useRef<HTMLDivElement>(null)
  // Sempre observa, também no reduzido: ao voltar ao normal a peça sabe se já está na tela e não
  // reinicia a entrada de algo visível.
  const dentro = useInView(ref, { once: false })
  const visivel = reduzido || dentro
  const opacity = useMotionValue(reduzido ? 1 : 0)
  const y = useMotionValue(reduzido ? 0 : deslocamentoPx)

  useEffect(() => {
    const alvoOpacity = visivel ? 1 : 0
    const alvoY = visivel ? 0 : deslocamentoPx
    if (reduzido) {
      // Salto: encerra qualquer animação em curso e põe o bloco no estado final de uma vez.
      opacity.jump(alvoOpacity)
      y.jump(alvoY)
      return
    }
    const transicao = { duration: duracaoMs / 1000, ease: curva, delay: dentro ? atrasoMs / 1000 : 0 }
    const animacoes = [animate(opacity, alvoOpacity, transicao), animate(y, alvoY, transicao)]
    return () => animacoes.forEach((animacao) => animacao.stop())
  }, [reduzido, visivel, dentro, deslocamentoPx, duracaoMs, curva, atrasoMs, opacity, y])

  return (
    <motion.div ref={ref} className={className} style={{ opacity, y }}>
      {children}
    </motion.div>
  )
}
