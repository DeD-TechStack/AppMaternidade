import { createContext, useContext, type Dispatch } from 'react'
import type { Acao, EstadoPrototipo } from './estado.ts'

interface ContextoPrototipo {
  estado: EstadoPrototipo
  dispatch: Dispatch<Acao>
}

export const ContextoDoPrototipo = createContext<ContextoPrototipo | null>(null)

export function usePrototipo(): ContextoPrototipo {
  const contexto = useContext(ContextoDoPrototipo)
  if (!contexto) throw new Error('usePrototipo precisa estar dentro de ProvedorPrototipo')
  return contexto
}
