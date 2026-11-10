import type { ReactNode } from 'react'

/** Etiqueta do sistema-base: `ui` 15, fundo da superfície, raio 4, altura 26. Sem caixa alta. */
export function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="sb-etiqueta t-ui">{children}</span>
}
