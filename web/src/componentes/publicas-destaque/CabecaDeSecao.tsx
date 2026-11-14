import type { ReactNode } from 'react'
import { Titulo } from '../campo/Titulo.tsx'
import { Pilha, QuadroLayout } from '../base/layout/index.ts'
import './publicas-destaque.css'

interface Props {
  id: string
  titulo: readonly [string] | readonly [string, string]
  /** O texto curto, logo abaixo do título e na mesma borda esquerda dele. */
  children: ReactNode
  /** Dentro de uma coluna (e não no quadro da seção): sem o `QuadroLayout`, na largura da coluna. */
  emColuna?: boolean
}

/**
 * A cabeça de uma seção: o h2 de duas linhas e, logo abaixo, o texto curto, numa coluna só. Filha direta da
 * `Secao` (ou de uma `Pilha` dela), vai num `QuadroLayout` de 880 (`medio`), à esquerda do quadro.
 */
export function CabecaDeSecao({ id, titulo, children, emColuna = false }: Props) {
  const cabeca = (
    <Pilha vao="pilha" className="pd-cabeca">
      <Titulo nivel="h2" id={id} linhas={titulo} />
      <Pilha vao="grupo">{children}</Pilha>
    </Pilha>
  )
  return emColuna ? cabeca : <QuadroLayout largura="medio">{cabeca}</QuadroLayout>
}
