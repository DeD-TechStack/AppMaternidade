import type { ReactNode } from 'react'
import { Pilha } from '../base/layout/Pilha.tsx'
import { Faixa } from '../comunidade/Faixa.tsx'

interface Props {
  /** O `id` do `h2`: o nome da seção. */
  id: string
  titulo: string
  children: ReactNode
  /** Só a primeira seção da tela: o estado da leitura (confirmação, esqueleto, erro) antes do título. */
  topo?: ReactNode
  /** A leitura está em curso: a seção leva `aria-busy`. */
  ocupado?: true
}

/** Uma seção das telas do painel: a `Faixa` com o `h2` e o conteúdo, e o vão de `grupo` entre os dois. */
export function Bloco({ id, titulo, children, topo, ocupado }: Props) {
  return (
    <Faixa aria-labelledby={id} aria-busy={ocupado}>
      <Pilha vao="grupo">
        {topo}
        <h2 id={id} className="cm-h4 text-titulo-4">
          {titulo}
        </h2>
        {children}
      </Pilha>
    </Faixa>
  )
}
