import { useContext, useEffect, useState } from 'react'
import { ContextoDoRelogio } from './relogio.ts'

const instanteAtual = () => Date.now()

// Devolve o instante atual e o atualiza a cada `intervaloMs`. Quem mostra uma duração
// calcula `agora - inicio`; nunca soma ticks. Dentro de um aparelho do Início há um relógio
// parado (ContextoDoRelogio): o valor é o dele e nenhum temporizador é criado.
export function useAgora(intervaloMs: number): number {
  const parado = useContext(ContextoDoRelogio)
  const [agora, setAgora] = useState(instanteAtual)

  useEffect(() => {
    if (parado !== null) return
    const id = setInterval(() => setAgora(instanteAtual()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs, parado])

  return parado ?? agora
}
