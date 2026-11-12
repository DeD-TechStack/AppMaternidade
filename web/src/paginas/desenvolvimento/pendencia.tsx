import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

// O contexto da operação pendente da página (DES-02, DES-03): o bloco de tummy time (MAT-39b) liga
// `pendente` enquanto uma escrita espera a resposta, e o seletor de bebê fica `disabled`. Um só valor na
// página toda.

interface ValorDaPendencia {
  pendente: boolean
  definirPendente: (valor: boolean) => void
}

const ContextoDaPendencia = createContext<ValorDaPendencia>({ pendente: false, definirPendente: () => undefined })

interface Props {
  /** Só para os testes: o valor com que a página nasce. Falso por padrão. */
  pendenteInicial?: boolean
  children: ReactNode
}

export function ProvedorDaPendencia({ pendenteInicial = false, children }: Props) {
  const [pendente, setPendente] = useState(pendenteInicial)
  const definirPendente = useCallback((valor: boolean) => setPendente(valor), [])
  const valor = useMemo(() => ({ pendente, definirPendente }), [pendente, definirPendente])
  return <ContextoDaPendencia value={valor}>{children}</ContextoDaPendencia>
}

export function usePendencia(): ValorDaPendencia {
  return useContext(ContextoDaPendencia)
}
