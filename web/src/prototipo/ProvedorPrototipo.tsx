import { useEffect, useReducer, type ReactNode } from 'react'
import { ContextoDoPrototipo } from './contexto.ts'
import { criarEstadoInicial, reduzir, type EstadoPrototipo } from './estado.ts'

interface Props {
  /** Só os testes injetam; no site o estado nasce quando a página carrega. */
  estadoInicial?: EstadoPrototipo
  children: ReactNode
}

function estadoDeAgora(): EstadoPrototipo {
  return criarEstadoInicial(Date.now())
}

// Vive no layout raiz: o estado sobrevive à navegação entre Hoje e Sessão e volta ao
// inicial quando a página recarrega. Nada vai para o navegador (sem localStorage).
export function ProvedorPrototipo({ estadoInicial, children }: Props) {
  const [estado, dispatch] = useReducer(reduzir, estadoInicial, (inicial) => inicial ?? estadoDeAgora())

  useEffect(() => {
    const raiz = document.documentElement
    if (estado.madrugada) raiz.setAttribute('data-tema', 'madrugada')
    else raiz.removeAttribute('data-tema')
    return () => raiz.removeAttribute('data-tema')
  }, [estado.madrugada])

  return <ContextoDoPrototipo value={{ estado, dispatch }}>{children}</ContextoDoPrototipo>
}
