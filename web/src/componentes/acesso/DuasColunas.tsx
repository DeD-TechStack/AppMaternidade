import type { ReactNode } from 'react'
import { CenaAcesso } from './CenaAcesso.tsx'

/**
 * A tela de acesso em duas colunas: o formulário no papel, à esquerda, e o painel de mel com a cena,
 * à direita (7/5 da grade, a partir de 64 rem: o título de 84 px precisa de uma coluna de ~730 px, e o
 * painel de ~530 px com a cena 2:3 quase não é cortado). No celular é uma coluna só: o formulário primeiro, a
 * cena depois. A coluna do formulário se centra na altura do painel, sem sobra vazia ao lado.
 */
export function DuasColunas({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
      <div className="flex min-w-0 flex-col gap-4 lg:justify-center">{children}</div>
      <CenaAcesso />
    </div>
  )
}
