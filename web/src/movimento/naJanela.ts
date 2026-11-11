import { useEffect, useState, type RefObject } from 'react'

const temObservador = () => typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function'

/**
 * O elemento está dentro da janela? Acompanha a entrada e a saída (não para na primeira vez). Sem
 * `IntersectionObserver` (navegador antigo, jsdom), vale "dentro": o conteúdo aparece já no estado final,
 * nunca fica escondido à espera de um evento que não vem.
 */
export function useNaJanela(ref: RefObject<Element | null>): boolean {
  const [dentro, setDentro] = useState(() => !temObservador())

  useEffect(() => {
    const no = ref.current
    if (!no || !temObservador()) return
    const observador = new window.IntersectionObserver(([registro]) => setDentro(registro.isIntersecting))
    observador.observe(no)
    return () => observador.disconnect()
  }, [ref])

  return dentro
}
