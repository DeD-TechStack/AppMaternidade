import { useEffect, useState, type RefObject } from 'react'

const CONSULTA_FAIXA_PRESA =
  '(min-width: 69em) and (min-aspect-ratio: 1/1) and (min-height: 40em) and (prefers-reduced-motion: no-preference)'

function faixaPresaAtiva(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('(animation-timeline: view()) and (animation-range: entry)') &&
    window.matchMedia(CONSULTA_FAIXA_PRESA).matches
  )
}

export function useInertNaFaixa(ref: RefObject<HTMLElement | null>, ativa: boolean): boolean {
  const [foraDaTela, setForaDaTela] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el?.closest('.co-fita')) return

    let quadro = 0
    const conferir = () => {
      quadro = 0
      if (!faixaPresaAtiva()) return setForaDaTela(false)
      const palco = el.closest<HTMLElement>('.co-palco')?.getBoundingClientRect()
      const visEsq = Math.max(0, palco && palco.width > 0 ? palco.left : 0)
      const visDir = Math.min(window.innerWidth, palco && palco.width > 0 ? palco.right : window.innerWidth)
      const rect = (el.querySelector<HTMLElement>('.dt-moldura-ativa, .dt-barra-gatilho') ?? el).getBoundingClientRect()
      setForaDaTela(rect.width > 0 && (rect.left < visEsq || rect.right > visDir))
    }

    const agendar = () => {
      if (!quadro) quadro = window.requestAnimationFrame(conferir)
    }

    conferir()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar, { passive: true })
    return () => {
      if (quadro) window.cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
    }
  }, [ref, ativa])

  return foraDaTela
}
