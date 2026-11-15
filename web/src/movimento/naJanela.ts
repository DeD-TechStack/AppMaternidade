import { useEffect, useState, type RefObject } from 'react'

const temObservador = () => typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function'

export interface OpcoesNaJanela {
  /** Para na primeira entrada: desliga o observador e o elemento fica "dentro" para sempre. */
  umaVez?: boolean
}

/**
 * O elemento está dentro da janela? Sem `umaVez`, acompanha a entrada e a saída; com `umaVez`, para na
 * primeira entrada (o que entrou não volta à espera). Sem `IntersectionObserver` (navegador antigo, jsdom),
 * vale "dentro": o conteúdo aparece já no estado final, nunca fica escondido à espera de um evento que não vem.
 */
export function useNaJanela(ref: RefObject<Element | null>, { umaVez = false }: OpcoesNaJanela = {}): boolean {
  const [dentro, setDentro] = useState(() => !temObservador())

  useEffect(() => {
    const no = ref.current
    if (!no || !temObservador()) return
    const observador = new window.IntersectionObserver(([registro]) => {
      if (!umaVez) {
        setDentro(registro.isIntersecting)
        return
      }
      if (!registro.isIntersecting) return
      setDentro(true)
      observador.disconnect()
    })
    observador.observe(no)
    return () => observador.disconnect()
  }, [ref, umaVez])

  return dentro
}
