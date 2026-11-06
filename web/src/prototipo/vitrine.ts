import { createContext, useContext } from 'react'

/**
 * Verdadeiro dentro de um aparelho do Início (a tela real, mostrada como vitrine). Nesse caso a
 * tela não tem efeito fora da moldura: não move o foco, não lê nem escreve a URL, não mexe na
 * rolagem da janela, não repete id no documento e nada nela entra na ordem de Tab.
 */
export const ContextoDaVitrine = createContext(false)

export function useVitrine(): boolean {
  return useContext(ContextoDaVitrine)
}
