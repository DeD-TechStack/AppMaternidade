import type { ReactNode } from 'react'
import { useBarraFixa } from './useBarraFixa.ts'
import { useVitrine } from './vitrine.ts'

// A barra de baixo das telas logadas (Hoje: botões rápidos e navegação; Sessão: navegação).
// Num aparelho do Início ela fica no fluxo da moldura e não mexe na rolagem da janela.
export function BarraInferior({ children }: { children: ReactNode }) {
  const vitrine = useVitrine()
  const { barra, fixa } = useBarraFixa(!vitrine)
  return (
    <div ref={barra} className={fixa ? 'barra-inferior barra-fixa' : 'barra-inferior'}>
      {children}
    </div>
  )
}
