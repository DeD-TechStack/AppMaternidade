import type { ReactNode } from 'react'
import { Titulo } from '../campo/Titulo.tsx'
import './publicas-destaque.css'

interface Props {
  id: string
  titulo: readonly [string] | readonly [string, string]
  /** O texto curto, logo abaixo do título e na mesma borda esquerda dele. */
  children: ReactNode
}

/** A cabeça de uma seção: o h2 de duas linhas e, colado a ele, o texto curto, numa coluna só. */
export function CabecaDeSecao({ id, titulo, children }: Props) {
  return (
    <div className="cm-area pd-cabeca">
      <Titulo nivel="h2" id={id} linhas={titulo} />
      <div>{children}</div>
    </div>
  )
}
