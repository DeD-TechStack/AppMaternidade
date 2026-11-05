import { useEffect, useRef, useState } from 'react'
import { barraDeveFicarFixa } from './barraFixa.ts'

/** Folga entre a barra e o controle que recebe foco ao rolar até ele. */
const FOLGA_DE_ROLAGEM_PX = 8

// Mede a barra e decide se ela fica fixa. Enquanto fixa, o <html> ganha um scroll-padding-bottom
// igual à altura medida mais a folga, para o navegador rolar o controle focado até acima da
// barra (WCAG 2.4.11). Mede quando a barra muda de tamanho (ResizeObserver) e quando a janela
// muda (resize: zoom, rotação). Sem ResizeObserver (jsdom), fica no padrão: fixa.
export function useBarraFixa() {
  const barra = useRef<HTMLDivElement>(null)
  const [fixa, setFixa] = useState(true)

  useEffect(() => {
    const elemento = barra.current
    if (!elemento) return
    const raiz = document.documentElement

    function medir() {
      const altura = elemento!.getBoundingClientRect().height
      const cabe = barraDeveFicarFixa(altura, window.innerHeight)
      setFixa(cabe)
      if (cabe) {
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
  }, [])

  return { barra, fixa }
}
