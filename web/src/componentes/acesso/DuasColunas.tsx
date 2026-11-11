import type { ReactNode } from 'react'
import { CenaAcesso } from './CenaAcesso.tsx'

/**
 * A tela de acesso em duas colunas: o formulário no papel, à esquerda, e o painel de mel com a cena,
 * à direita (5/6 da grade, a partir de 64 rem). No celular é uma coluna só: o formulário primeiro, a
 * cena depois. A coluna do formulário se centra na altura do painel, sem sobra vazia ao lado.
 */
export function DuasColunas({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
      <div className="flex min-w-0 flex-col gap-6 lg:justify-center lg:py-4">{children}</div>
      <CenaAcesso />
    </div>
  )
}
