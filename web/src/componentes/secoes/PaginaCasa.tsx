import { Children, type ReactNode } from 'react'
import './secoes.css'

/**
 * PaginaCasa (DS1:RF-12): o marcador do escopo "A casa acesa" (DESIGN.md 1). Um `div[data-casa]` sem visual proprio:
 * nao pinta, nao tem estilo em linha e nao muda a pagina por si. Sem filhos, nao renderiza nada.
 */
export function PaginaCasa({ children }: { children?: ReactNode }) {
  if (Children.toArray(children).length === 0) return null
  return <div data-casa="">{children}</div>
}
