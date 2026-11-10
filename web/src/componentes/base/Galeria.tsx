import type { ReactNode } from 'react'

/**
 * Galeria de 2 colunas, com gap de 32 (a partir de 992), 16 (de 768 a 991) ou 8 (abaixo de 768).
 * Uma mídia larga ocupa as duas colunas; duas mídias em par ficam lado a lado.
 */
export function Galeria({ children }: { children: ReactNode }) {
  return (
    <div className="sb-galeria" data-bloco="">
      {children}
    </div>
  )
}
