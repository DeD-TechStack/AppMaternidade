import type { ReactNode } from 'react'
import { Titulo } from '../campo/Titulo.tsx'
import './publicas-destaque.css'

interface Props {
  id: string
  titulo: readonly [string] | readonly [string, string]
  /** O texto curto ao lado do título (abaixo dele no celular). */
  children: ReactNode
}

/** A cabeça de uma seção: o h2 de duas linhas de um lado e o texto curto do outro, sem lado vazio. */
export function CabecaDeSecao({ id, titulo, children }: Props) {
  return (
    <div className="cm-area pd-cabeca">
      <Titulo nivel="h2" id={id} linhas={titulo} />
      <div>{children}</div>
    </div>
  )
}
