import type { Ref } from 'react'

interface Props {
  /** A primeira linha e a segunda: a ênfase é a segunda linha inteira em itálico (DESIGN.md 2). */
  linhas: readonly [string, string]
  /** O `h1` recebe o foco por programa quando a tela muda (`useFocoNoTitulo`). */
  refTitulo: Ref<HTMLHeadingElement>
}

/**
 * O `h1` das telas de acesso: Literata 600 na escala do h1 do DESIGN.md (84/88 em 1440, 42/46 em 390),
 * a mesma de toda página. As linhas são curtas (até 17 caracteres) para caberem na coluna do
 * formulário, e `wrap-anywhere` impede que uma palavra estoure a coluna. Não anima: é a primeira coisa
 * da tela.
 * O espaço no começo da segunda linha mantém o texto do título legível ("primeira segunda"). A segunda
 * linha é um bloco: com o `display` também em linha, quem calcula o nome acessível sem folha de estilo
 * (os testes, no jsdom) separa as duas linhas por um espaço, como o navegador faz com a folha.
 */
export function Manchete({ linhas, refTitulo }: Props) {
  return (
    <h1 ref={refTitulo} tabIndex={-1} className="cm-h1 alvo-foco wrap-anywhere">
      {linhas[0]}
      <span className="cm-segunda-linha" style={{ display: 'block' }}>
        {` ${linhas[1]}`}
      </span>
    </h1>
  )
}
