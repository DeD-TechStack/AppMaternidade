import { useEffect, useRef, useState } from 'react'
import { barraDeveFicarFixa } from './barraFixa.ts'

/** Folga entre a barra e o controle que recebe foco ao rolar até ele. */
const FOLGA_DE_ROLAGEM_PX = 8
const FONTE_PADRAO_PX = 16

/** A fonte raiz em px, como o navegador a calcula; 16 se não der para ler. */
function fonteRaizEmPx(): number {
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize)
  return Number.isFinite(px) && px > 0 ? px : FONTE_PADRAO_PX
}

// Decide se a barra fica fixa pela janela e pela fonte raiz (ver barraDeveFicarFixa). Enquanto
// fixa, o <html> ganha um scroll-padding-bottom igual à altura medida da barra mais a folga, para
// o navegador rolar o controle focado até acima da barra (WCAG 2.4.11). Reavalia quando a janela
// muda (resize: zoom, rotação) e quando a barra muda de tamanho (ResizeObserver): trocar a fonte
// muda a barra, e ela serve de gatilho. Sem ResizeObserver (jsdom), fica no padrão: fixa.
//
// `ativo` é falso na barra de um aparelho do Início: ela não mede nada, não mexe no <html> e fica
// no fluxo da moldura.
export function useBarraFixa(ativo = true) {
  const barra = useRef<HTMLDivElement>(null)
  const [fixa, setFixa] = useState(true)

  useEffect(() => {
    if (!ativo) return
    const elemento = barra.current
    if (!elemento) return
    const raiz = document.documentElement

    function medir() {
      const cabe = barraDeveFicarFixa(window.innerHeight, fonteRaizEmPx())
      setFixa(cabe)
      if (cabe) {
        const altura = elemento!.getBoundingClientRect().height
        raiz.style.setProperty('scroll-padding-bottom', `${Math.ceil(altura) + FOLGA_DE_ROLAGEM_PX}px`)
      } else {
        raiz.style.removeProperty('scroll-padding-bottom')
      }
    }

    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir)
    observador?.observe(elemento)
    window.addEventListener('resize', medir)

    return () => {
      observador?.disconnect()
      window.removeEventListener('resize', medir)
      raiz.style.removeProperty('scroll-padding-bottom')
    }
  }, [ativo])

  return { barra, fixa: ativo && fixa }
}
