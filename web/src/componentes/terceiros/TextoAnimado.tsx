// Adaptado do componente TextAnimate do Magic UI (https://magicui.design, commit efe76fc5755e).
// Licença MIT: texto em web/licencas/magicui-LICENSE.md.
// O que mudou: só a divisão por linha e a animação de subir com opacidade; saíram as variantes
// que desfocam ou mudam a escala e as divisões por palavra e por letra; os parâmetros chegam por
// props, vindos do catálogo de movimento; o texto inteiro vai num span sr-only dentro do elemento
// (sem aria-label, que o ARIA não permite em p, div e span) e as linhas animadas ficam escondidas
// do leitor de tela; com movimento reduzido as linhas são comuns, sem movimento.
import { motion, type Variants } from 'motion/react'
import { usePrefereMovimentoReduzido } from '../../movimento/reduzido.ts'
import type { RegistroMovimento } from '../../movimento/catalogo.ts'
import { cn } from './cn.ts'

const elementos = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  div: motion.div,
} as const

interface Props {
  /** O texto; cada `\n` começa uma linha nova. */
  children: string
  as?: keyof typeof elementos
  className?: string
  classeLinha?: string
  /** Quanto cada linha sobe, em px, ao entrar. */
  deslocamentoPx: number
  duracaoMs: number
  curva: RegistroMovimento['curva']
  /** Intervalo entre uma linha e a seguinte. */
  escalonamentoMs: number
  atrasoMs?: number
}

export function TextoAnimado({
  children,
  as = 'p',
  className,
  classeLinha,
  deslocamentoPx,
  duracaoMs,
  curva,
  escalonamentoMs,
  atrasoMs = 0,
}: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const linhas = children.split('\n')
  // O texto inteiro, lido pelo leitor de tela uma vez só; as linhas visíveis ficam escondidas dele.
  const inteiro = <span className="sr-only">{linhas.join(' ')}</span>

  if (reduzido) {
    const Comum = as
    return (
      <Comum className={className}>
        {inteiro}
        {linhas.map((linha, i) => (
          <span key={i} aria-hidden="true" className={cn('block', classeLinha)}>
            {linha}
          </span>
        ))}
      </Comum>
    )
  }

  const Animado = elementos[as]
  const variantesDoTexto: Variants = {
    oculto: {},
    visivel: { transition: { delayChildren: atrasoMs / 1000, staggerChildren: escalonamentoMs / 1000 } },
  }
  const variantesDaLinha: Variants = {
    oculto: { opacity: 0, y: deslocamentoPx },
    visivel: { opacity: 1, y: 0, transition: { duration: duracaoMs / 1000, ease: curva } },
  }

  return (
    <Animado
      className={className}
      variants={variantesDoTexto}
      initial="oculto"
      whileInView="visivel"
      viewport={{ once: false }}
    >
      {inteiro}
      {linhas.map((linha, i) => (
        <motion.span key={i} className={cn('block', classeLinha)} variants={variantesDaLinha} aria-hidden="true">
          {linha}
        </motion.span>
      ))}
    </Animado>
  )
}
