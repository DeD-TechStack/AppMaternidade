import type { Ref } from 'react'

interface Props {
  /** A primeira linha e a segunda: a ênfase é a segunda linha inteira em itálico (DESIGN.md 2). */
  linhas: readonly [string, string]
  /** O `h1` recebe o foco por programa quando a tela muda (`useFocoNoTitulo`). */
  refTitulo: Ref<HTMLHeadingElement>
}

/**
 * O `h1` das telas de acesso: Literata 600 na escala do h2 (56/62 em 1440, 32/38 em 390), porque ele
 * mora numa coluna de formulário, e não numa abertura de página. Não anima: é a primeira coisa da tela.
 * O espaço no começo da segunda linha mantém o texto do título legível ("primeira segunda"). A segunda
 * linha é um bloco: com o `display` também em linha, quem calcula o nome acessível sem folha de estilo
 * (os testes, no jsdom) separa as duas linhas por um espaço, como o navegador faz com a folha.
 */
export function Manchete({ linhas, refTitulo }: Props) {
  return (
    <h1 ref={refTitulo} tabIndex={-1} className="cm-h2 alvo-foco">
      {linhas[0]}
      <span className="cm-segunda-linha" style={{ display: 'block' }}>
        {` ${linhas[1]}`}
      </span>
    </h1>
  )
}
