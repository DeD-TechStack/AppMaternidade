import { useLayoutEffect, useState, type RefObject } from 'react'

/**
 * A folga medida de um bloco que espera (`ativo`): mede antes da primeira pintura e de novo quando o
 * layout muda (fontes, imagens, carga da página, redimensionamento), porque uma medida feita só na
 * montagem fica velha assim que a página termina de montar. Para quando o bloco entra (`ativo` falso).
 */
export function useDeslocamentoSeguro(
  ref: RefObject<HTMLElement | null>,
  px: number,
  ativo: boolean,
  yAtual: () => number = () => 0,
): number {
  // Nasce 0 (no lugar). Só se mede com a página completa (`load`): antes disso o layout ainda se mexe
  // (imagens, fontes) e uma folga medida cedo pode ser maior que a real; no lugar, o bloco nunca sobrepõe.
  const [valor, setValor] = useState(0)
  useLayoutEffect(() => {
    if (!ativo) return
    const medir = () => setValor(document.readyState === 'complete' ? deslocamentoSeguro(ref.current, px, yAtual()) : 0)
    medir()
    let quadro = 0
    const adiar = () => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(medir)
    }
    window.addEventListener('load', adiar)
    window.addEventListener('resize', adiar)
    void document.fonts?.ready.then(adiar)
    const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(adiar) : null
    observador?.observe(document.documentElement)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('load', adiar)
      window.removeEventListener('resize', adiar)
      observador?.disconnect()
    }
    // yAtual é um leitor estável do valor de movimento; px e ativo são os que mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, px, ativo])
  return valor
}

const yEscrito = (no: Element): number => {
  const achado = /translateY\((-?[\d.]+)px\)/.exec((no as HTMLElement).style?.transform ?? '')
  return achado ? Number(achado[1]) : 0
}

/**
 * Quanto um bloco pode esperar deslocado para baixo sem encostar no que vem depois (VIS-1 R1: a espera
 * nunca sobrepõe o bloco seguinte). É a folga medida entre a base do bloco e o topo do próximo irmão que
 * está abaixo dele (irmãos ao lado, em grade, e irmãos fora do fluxo não contam; sem irmão abaixo, vale o
 * do ancestral mais próximo que tenha). Devolve no máximo `px`, nunca menos que 0; sem medida (jsdom,
 * sem layout) devolve 0, o bloco fica no lugar. `yAtual` desconta a transformação em curso da medida.
 */
export function deslocamentoSeguro(no: HTMLElement | null, px: number, yAtual = 0): number {
  if (!no || typeof window === 'undefined') return px
  const base = no.getBoundingClientRect().bottom - yAtual
  let atual: HTMLElement | null = no
  for (let nivel = 0; atual && nivel < 4; nivel += 1, atual = atual.parentElement) {
    // Num ancestral, a folga conta a partir da base dele (o que o bloco tem abaixo dentro dele também vale).
    const baseDoNivel = atual === no ? base : Math.max(base, atual.getBoundingClientRect().bottom)
    let irmao = atual.nextElementSibling
    while (irmao) {
      const estilo = window.getComputedStyle(irmao)
      const foraDoFluxo = estilo.position === 'absolute' || estilo.position === 'fixed' || estilo.display === 'none'
      // O topo do irmão sem o deslocamento de espera dele (ele também pode estar esperando e vai voltar ao lugar).
      const topo = irmao.getBoundingClientRect().top - yEscrito(irmao)
      if (!foraDoFluxo && topo >= baseDoNivel - 1) return Math.max(0, Math.min(px, Math.floor(topo - baseDoNivel)))
      irmao = irmao.nextElementSibling
    }
  }
  return px
}
