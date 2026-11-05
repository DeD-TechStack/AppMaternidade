import type { ReactNode } from 'react'
import { useBarraFixa } from './useBarraFixa.ts'

// A barra de baixo das telas logadas (Hoje: botões rápidos e navegação; Sessão: navegação).
export function BarraInferior({ children }: { children: ReactNode }) {
  const { barra, fixa } = useBarraFixa()
  return (
    <div ref={barra} className={fixa ? 'barra-inferior barra-fixa' : 'barra-inferior'}>
      {children}
    </div>
  )
}
