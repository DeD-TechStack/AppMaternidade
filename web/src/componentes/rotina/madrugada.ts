import { createContext, useContext } from 'react'

// O modo madrugada (R38-04): o estado fica só na memória da página, no layout raiz, porque o botão
// `Modo madrugada` mora no cabeçalho da casca. Vale em todas as telas da área logada e some ao sair dela.

interface ControleDaMadrugada {
  madrugada: boolean
  definir: (valor: boolean) => void
}

export const ContextoDaMadrugada = createContext<ControleDaMadrugada | null>(null)

export function useMadrugada(): ControleDaMadrugada {
  return useContext(ContextoDaMadrugada) ?? { madrugada: false, definir: () => undefined }
}
