import type { ReactNode } from 'react'

// A coluna única das telas logadas (cerca de 40 rem, centrada). A faixa do topo, o conteúdo,
// a barra de baixo e a navegação ficam todos dentro dela.
export function ColunaApp({ children }: { children: ReactNode }) {
  return <div className="coluna-app flex min-h-dvh flex-col">{children}</div>
}
