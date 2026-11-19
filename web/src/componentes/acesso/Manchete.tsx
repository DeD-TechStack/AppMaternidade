import type { Ref } from 'react'

interface Props {
  /** O texto do `h1`: uma frase só, num nó só (`MANCHETES` de conta.ts). */
  texto: string
  /** O `h1` recebe o foco por programa quando a tela muda (`useFocoNoTitulo`). */
  refTitulo: Ref<HTMLHeadingElement>
}

/**
 * O `h1` das telas de acesso: `titulo-1` do DESIGN.md (48/54 em 1440, 34/40 em 390), em prumo (`not-italic`), de
 * um nó só e, nas telas com cartão de texto, de uma linha só na coluna do formulário. `wrap-anywhere` impede que
 * uma palavra estoure a coluna. Não anima: é a primeira coisa da tela.
 */
export function Manchete({ texto, refTitulo }: Props) {
  return (
    <h1 ref={refTitulo} tabIndex={-1} className="cm-h1 alvo-foco wrap-anywhere not-italic">
      {texto}
    </h1>
  )
}
