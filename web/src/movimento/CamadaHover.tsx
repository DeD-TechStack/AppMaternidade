import { useEffect, useState, type FocusEvent, type ReactNode } from 'react'
import { animate, motion, useMotionValue } from 'motion/react'
import { cn } from '../componentes/terceiros/cn.ts'
import { CATALOGO } from './catalogo.ts'
import { usePrefereMovimentoReduzido, useSemHover } from './reduzido.ts'

// M13: uma camada com o resumo fica por cima do cartão. Ela está sempre montada, para o teclado
// alcançar o que houver dentro dela: fechada, tem opacidade 0 e não pega o ponteiro; aberta,
// opacidade 1 e pega o ponteiro. Só a opacidade anima (100 ms para abrir, 110 ms para fechar).
// Abre no hover do cartão e quando o foco entra em qualquer focável dentro do cartão, inclusive
// dentro da própria camada; fecha quando o foco sai do cartão e o ponteiro não está sobre ele.
// O estado fica em `data-aberta`. Em aparelho de toque (sem hover) o resumo fica sempre visível,
// abaixo do conteúdo, para nada ficar escondido. A árvore é a mesma com e sem movimento reduzido
// (o conteúdo, o estado e o foco da camada e do cartão sobrevivem à troca da preferência); com
// movimento reduzido a troca de opacidade é instantânea (duração 0).

interface Props {
  /** O conteúdo do cartão, sempre visível. */
  children: ReactNode
  /** O resumo que aparece por cima. */
  camada: ReactNode
  className?: string
  /** Classes da camada, para o fundo e o texto dela. */
  classeCamada?: string
}

// A cor de foco do tema (--cor-foco) é igual ou quase igual à do fundo da camada (--cor-texto) nos
// dois temas, então o anel de foco dos focáveis de dentro dela some. Dentro da camada o contorno
// usa a cor do papel (--cor-fundo), que contrasta com o fundo da camada. O contorno de 2 px e o
// afastamento de 2 px continuam os da regra global.
// A camada herda o arredondamento do cartão (rounded-[inherit]); o cartão não leva overflow
// hidden, que cortaria o anel de foco dos focáveis de dentro.
const BASE_DA_CAMADA =
  'rounded-[inherit] bg-[var(--cor-texto)] text-[color:var(--cor-fundo)] [&_:focus-visible]:outline-[color:var(--cor-fundo)]'

export function CamadaHover({ children, camada, className, classeCamada }: Props) {
  const reduzido = usePrefereMovimentoReduzido()
  const semHover = useSemHover()
  const [sobre, setSobre] = useState(false)
  const [foco, setFoco] = useState(false)
  const { duracaoMs, duracaoSaidaMs, curva } = CATALOGO.M13

  const aberta = sobre || foco
  const opacity = useMotionValue(aberta ? 1 : 0)

  useEffect(() => {
    const alvo = aberta ? 1 : 0
    if (reduzido) {
      // Salto: encerra a animação em curso e põe a camada no estado dela de uma vez.
      opacity.jump(alvo)
      return
    }
    const transicao = { duration: (aberta ? duracaoMs : duracaoSaidaMs) / 1000, ease: curva }
    const animacao = animate(opacity, alvo, transicao)
    return () => animacao.stop()
  }, [reduzido, aberta, opacity, duracaoMs, duracaoSaidaMs, curva])

  const aoSairOFoco = (evento: FocusEvent<HTMLDivElement>) => {
    if (!evento.currentTarget.contains(evento.relatedTarget)) setFoco(false)
  }

  if (semHover) {
    return (
      <div className={className}>
        {children}
        <div data-aberta="true" className={cn(BASE_DA_CAMADA, classeCamada)}>
          {camada}
        </div>
      </div>
    )
  }

  const sobreposta = cn('absolute inset-0', BASE_DA_CAMADA, classeCamada)
  const pointerEvents = aberta ? 'auto' : 'none'

  return (
    <div
      className={cn('relative', className)}
      onPointerEnter={() => setSobre(true)}
      onPointerLeave={() => setSobre(false)}
      onFocus={() => setFoco(true)}
      onBlur={aoSairOFoco}
    >
      {children}
      <motion.div
        data-aberta={aberta}
        className={sobreposta}
        style={{ opacity, pointerEvents }}
      >
        {camada}
      </motion.div>
    </div>
  )
}
