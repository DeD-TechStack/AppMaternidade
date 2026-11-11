import type { ReactNode } from 'react'
import { Titulo } from '../campo/Titulo.tsx'
import './publicas-destaque.css'

interface Props {
  id: string
  titulo: readonly [string] | readonly [string, string]
  /** O texto curto ao lado do título (abaixo dele no celular). */
  children: ReactNode
  /** `junta`: o texto logo abaixo do título, colado ao que vem depois (sem a coluna da direita). */
  junta?: boolean
}

/** A cabeça de uma seção: o h2 de duas linhas de um lado e o texto curto do outro, sem lado vazio. */
export function CabecaDeSecao({ id, titulo, children, junta = false }: Props) {
  return (
    <div className={['cm-area', 'pd-cabeca', junta ? 'pd-cabeca-junta' : null].filter(Boolean).join(' ')}>
      <Titulo nivel="h2" id={id} linhas={titulo} />
      <div>{children}</div>
    </div>
  )
}
