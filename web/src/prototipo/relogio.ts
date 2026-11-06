import { createContext } from 'react'

/**
 * O instante (ms) em que um relógio parado marca. Os aparelhos do Início mostram as telas reais
 * com o relógio parado; `useAgora` lê este contexto e, havendo valor, não cria temporizador.
 * Nulo: o relógio real.
 */
export const ContextoDoRelogio = createContext<number | null>(null)
