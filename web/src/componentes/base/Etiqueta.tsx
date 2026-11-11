import type { ReactNode } from 'react'

/** Etiqueta: pílula de areia (na madrugada, o cartão da noite), Outfit 15, sem caixa alta. */
export function Etiqueta({ children }: { children: ReactNode }) {
  return <span className="sb-etiqueta t-ui">{children}</span>
}
