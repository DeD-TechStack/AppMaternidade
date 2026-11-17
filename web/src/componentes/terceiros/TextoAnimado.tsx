// Adaptado do componente TextAnimate do Magic UI (https://magicui.design, commit efe76fc5755e).
// Licença MIT: texto em web/licencas/magicui-LICENSE.md.
// O que mudou: só a divisão por linha e a animação de subir com opacidade; saíram as variantes
// que desfocam ou mudam a escala e as divisões por palavra e por letra; os parâmetros chegam por
// props, vindos do catálogo de movimento; o texto inteiro vai num span sr-only dentro do elemento
// (sem aria-label, que o ARIA não permite em p, div e span) e as linhas animadas ficam escondidas
// do leitor de tela; a entrada é decidida por useNaJanela (uma vez, `umaVez` do catálogo: a linha que
// entrou não volta à espera; sem IntersectionObserver vale "dentro") em vez de whileInView; a espera já é
// legível (opacidade `opacidadeDe` do M4, nunca 0); o escalonamento é calculado por linha e para na
// terceira (atrasoEscalonado), e os valores de cada linha são conduzidos por animate() num
// efeito, cancelado a cada mudança; a árvore é a mesma com e sem movimento reduzido; com
// movimento reduzido as linhas nascem no estado final, e se a preferência liga no meio de uma
// entrada elas vão direto ao estado final, sem terminar a animação.
import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue } from 'motion/react'
import { useDeslocamentoSeguro } from '../../movimento/folga.ts'
import { useNaJanela } from '../../movimento/naJanela.ts'
import { usePrefereMovimentoReduzido } from '../../movimento/reduzido.ts'
import { CATALOGO, atrasoEscalonado, type RegistroMovimento } from '../../movimento/catalogo.ts'
import { cn } from './cn.ts'

interface Props {
  /** O texto; cada `\n` começa uma linha nova. */
  children: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div'
  id?: string
  className?: string
  classeLinha?: string
  /** Classe a mais das linhas depois da primeira (a ênfase do título é a segunda linha em itálico). */
  classeSegundaLinha?: string
  /** Quanto cada linha sobe, em px, ao entrar. */
  deslocamentoPx: number
  duracaoMs: number
  curva: RegistroMovimento['curva']
  /** Intervalo entre uma linha e a seguinte. */
  escalonamentoMs: number
  atrasoMs?: number
  /** Opacidade da espera, antes de entrar (padrão: a do M4, já legível). */
  opacidadeDe?: number
  /** Entra uma vez e não volta à espera ao sair da janela (padrão: o do M4, sim). */
  umaVez?: boolean
}

interface PropsDaLinha {
  texto: string
  className?: string
  visivel: boolean
  reduzido: boolean
  deslocamentoPx: number
  duracaoMs: number
  curva: RegistroMovimento['curva']
  atrasoMs: number
  opacidadeDe: number
}

function Linha({ texto, className, visivel, reduzido, deslocamentoPx, duracaoMs, curva, atrasoMs, opacidadeDe }: PropsDaLinha) {
  const opacity = useMotionValue(reduzido ? 1 : opacidadeDe)
  // Nasce no lugar; a espera (já medida pelo texto, no máximo a folga até o bloco seguinte) entra no efeito.
  const y = useMotionValue(0)

  useEffect(() => {
    const alvoOpacity = visivel ? 1 : opacidadeDe
    const alvoY = visivel ? 0 : deslocamentoPx
    if (reduzido || !visivel) {
      // Salto: encerra qualquer animação em curso e põe a linha no estado de espera ou final de uma vez.
      opacity.jump(reduzido ? 1 : alvoOpacity)
      y.jump(reduzido ? 0 : alvoY)
      return
    }
    const transicao = { duration: duracaoMs / 1000, ease: curva, delay: visivel ? atrasoMs / 1000 : 0 }
    const animacoes = [animate(opacity, alvoOpacity, transicao), animate(y, alvoY, transicao)]
    return () => animacoes.forEach((animacao) => animacao.stop())
  }, [reduzido, visivel, deslocamentoPx, duracaoMs, curva, atrasoMs, opacidadeDe, opacity, y])

  return (
    <motion.span aria-hidden="true" className={className} style={{ opacity, y }}>
      {texto}
    </motion.span>
  )
}

export function TextoAnimado({
  children,
  as = 'p',
  id,
  className,
  classeLinha,
  classeSegundaLinha,
  deslocamentoPx,
  duracaoMs,
  curva,
  escalonamentoMs,
  atrasoMs = 0,
  opacidadeDe = CATALOGO.M4.opacidadeDe,
  umaVez = CATALOGO.M4.umaVez,
}: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const ref = useRef<HTMLDivElement>(null)
  // Sempre observa, também no reduzido, para a volta ao normal saber se o texto já está na tela.
  const dentro = useNaJanela(ref, { umaVez })
  const visivel = reduzido || dentro
  const Tag = as

  // A espera desloca as linhas no máximo até a folga do texto para o bloco seguinte (VIS-1 R1).
  const espera = useDeslocamentoSeguro(ref, deslocamentoPx, !reduzido && !visivel)

  const linhas = children.split('\n')

  return (
    <Tag ref={ref as never} id={id} className={className}>
      {/* O texto inteiro, lido pelo leitor de tela uma vez só; as linhas visíveis ficam escondidas dele. */}
      <span className="sr-only">{linhas.join(' ')}</span>
      {linhas.map((linha, i) => (
        <Linha
          key={i}
          texto={linha}
          className={cn('block', classeLinha, i > 0 && classeSegundaLinha)}
          visivel={visivel}
          reduzido={reduzido}
          deslocamentoPx={espera}
          duracaoMs={duracaoMs}
          curva={curva}
          atrasoMs={atrasoMs + atrasoEscalonado(i, escalonamentoMs)}
          opacidadeDe={opacidadeDe}
        />
      ))}
    </Tag>
  )
}
