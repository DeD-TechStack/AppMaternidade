import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { ITENS_DE_CONTEUDO, type ItemDeConteudo } from './itens.ts'
import { itensVisiveis } from './publicacao.ts'

// Quais itens a página conhece e se o site é o de produção. Sem provedor valem os 9 itens reais e o padrão
// de `itensVisiveis` (`import.meta.env.PROD`); os testes injetam uma lista própria (um item recolhido) e os
// dois parâmetros, como o DES-06 pede.

interface ValorDoConteudo {
  itens: readonly ItemDeConteudo[]
  siteDeProducao?: boolean
}

const ContextoDoConteudo = createContext<ValorDoConteudo>({ itens: ITENS_DE_CONTEUDO })

interface Props extends Partial<ValorDoConteudo> {
  children: ReactNode
}

export function ProvedorDoConteudo({ itens = ITENS_DE_CONTEUDO, siteDeProducao, children }: Props) {
  const valor = useMemo(() => ({ itens, siteDeProducao }), [itens, siteDeProducao])
  return <ContextoDoConteudo value={valor}>{children}</ContextoDoConteudo>
}

interface Conteudo {
  /** Todos os itens, publicados ou não (a conta da fase usa estes). */
  todos: readonly ItemDeConteudo[]
  /** Os que a tela mostra, pela regra de publicação. */
  visiveis: readonly ItemDeConteudo[]
  porId: (id: string) => ItemDeConteudo | undefined
  visivel: (id: string) => ItemDeConteudo | undefined
}

export function useConteudo(): Conteudo {
  const { itens, siteDeProducao } = useContext(ContextoDoConteudo)
  return useMemo(() => {
    const visiveis = itensVisiveis(itens, siteDeProducao)
    return {
      todos: itens,
      visiveis,
      porId: (id) => itens.find((item) => item.id === id),
      visivel: (id) => visiveis.find((item) => item.id === id),
    }
  }, [itens, siteDeProducao])
}
