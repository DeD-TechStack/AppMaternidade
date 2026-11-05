import { useEffect, useState } from 'react'

const instanteAtual = () => Date.now()

// Devolve o instante atual e o atualiza a cada `intervaloMs`. Quem mostra uma duração
// calcula `agora - inicio`; nunca soma ticks.
export function useAgora(intervaloMs: number): number {
  const [agora, setAgora] = useState(instanteAtual)

  useEffect(() => {
    const id = setInterval(() => setAgora(instanteAtual()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])

  return agora
}
