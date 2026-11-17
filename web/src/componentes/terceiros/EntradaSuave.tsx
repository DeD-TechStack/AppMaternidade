// Adaptado do componente BlurFade do Magic UI (https://magicui.design, commit efe76fc5755e).
// Licença MIT: texto em web/licencas/magicui-LICENSE.md.
// O que mudou: sem nenhum filtro (o original desfoca; aqui só opacidade e deslocamento);
// deslocamento, duração, curva e atraso chegam por props, vindos do catálogo de movimento;
// a espera (antes de entrar na janela) já é legível: opacidade `opacidadeDe` do catálogo (M4, 0,5), nunca 0,
// para o texto não sumir de quem não rola nem de uma captura de página inteira; entra uma vez (`umaVez`,
// padrão do catálogo): depois de entrar não volta à espera ao sair da janela (useNaJanela; sem
// IntersectionObserver o bloco fica visível); sem AnimatePresence;
// os valores são conduzidos por animate() num efeito, cancelado a cada mudança; a árvore é a mesma
// com e sem movimento reduzido (o conteúdo, o estado e o foco dos filhos sobrevivem à troca da
// preferência); com movimento reduzido o bloco nasce no estado final, e se a preferência liga no
// meio de uma entrada ele vai direto ao estado final, sem terminar a animação.
import { useEffect, useRef, type ReactNode } from 'react'
import { animate, motion, useMotionValue } from 'motion/react'
import { useDeslocamentoSeguro } from '../../movimento/folga.ts'
import { useImprimindo } from '../../movimento/impressao.ts'
import { useNaJanela } from '../../movimento/naJanela.ts'
import { usePrefereMovimentoReduzido } from '../../movimento/reduzido.ts'
import { CATALOGO, type RegistroMovimento } from '../../movimento/catalogo.ts'

interface Props {
  children: ReactNode
  className?: string
  /** Quanto o elemento sobe, em px, ao entrar. */
  deslocamentoPx: number
  duracaoMs: number
  curva: RegistroMovimento['curva']
  atrasoMs?: number
  /** Opacidade da espera, antes de entrar (padrão: a do M4, já legível). */
  opacidadeDe?: number
  /** Entra uma vez e não volta à espera ao sair da janela (padrão: o do M4, sim). */
  umaVez?: boolean
}

export function EntradaSuave({
  children,
  className,
  deslocamentoPx,
  duracaoMs,
  curva,
  atrasoMs = 0,
  opacidadeDe = CATALOGO.M4.opacidadeDe,
  umaVez = CATALOGO.M4.umaVez,
}: Props) {
  // Movimento reduzido e impressão têm o mesmo efeito: o bloco fica no estado final, sem animar (R2-F1).
  const reduzido = usePrefereMovimentoReduzido() || useImprimindo()
  const ref = useRef<HTMLDivElement>(null)
  // Sempre observa, também no reduzido: ao voltar ao normal a peça sabe se já está na tela e não
  // reinicia a entrada de algo visível.
  const dentro = useNaJanela(ref, { umaVez })
  const visivel = reduzido || dentro
  const opacity = useMotionValue(reduzido ? 1 : opacidadeDe)
  // Nasce no lugar (o estado final: sem JS, na impressão e antes da medida o bloco já está inteiro).
  const y = useMotionValue(0)
  // A espera desloca o bloco no máximo até a folga que ele tem para o bloco seguinte (VIS-1 R1): medida
  // antes da primeira pintura, nunca há sobreposição, e o conteúdo nasce legível (opacidade 1).
  const espera = useDeslocamentoSeguro(ref, deslocamentoPx, !reduzido && !visivel, () => y.get())

  useEffect(() => {
    const alvoOpacity = visivel ? 1 : opacidadeDe
    const alvoY = visivel ? 0 : espera
    if (reduzido || !visivel) {
      // Salto: encerra qualquer animação em curso e põe o bloco no estado de espera ou final de uma vez.
      opacity.jump(reduzido ? 1 : alvoOpacity)
      y.jump(reduzido ? 0 : alvoY)
      return
    }
    const transicao = { duration: duracaoMs / 1000, ease: curva, delay: dentro ? atrasoMs / 1000 : 0 }
    const animacoes = [animate(opacity, alvoOpacity, transicao), animate(y, alvoY, transicao)]
    return () => animacoes.forEach((animacao) => animacao.stop())
  }, [reduzido, visivel, dentro, espera, duracaoMs, curva, atrasoMs, opacidadeDe, opacity, y])

  return (
    <motion.div ref={ref} className={className} style={{ opacity, y }}>
      {children}
    </motion.div>
  )
}
