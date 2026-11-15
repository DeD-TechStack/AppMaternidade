import type { Ref } from 'react'

interface Props {
  /** A primeira linha e a segunda: a ênfase é a segunda linha inteira em itálico (DESIGN.md 2). */
  linhas: readonly [string, string]
  /** O `h1` recebe o foco por programa quando a tela muda (`useFocoNoTitulo`). */
  refTitulo: Ref<HTMLHeadingElement>
}

// No celular o desenho de traço (`DuasColunas`: no canto direito da coluna, até 60 px de largura, ao lado da
// segunda linha) divide a coluna com o título. Só nas telas que têm o desenho (a coluna `.relative` com um
// `img[data-ilustracao]` filho), a segunda linha deixa a largura do desenho mais um vão `pilha` livre à direita:
// ela quebra antes dele, em vez de encostar nele. A primeira linha fica acima do desenho e usa a coluna toda
// (com o recuo no título inteiro, "Esqueceu a senha?" cairia em três linhas). Acima de 640 px o desenho some e a
// largura volta ao normal. O desenho desce até 104 px (46 + 58 de altura) e o título de duas linhas
// tem 80: o respiro `pilha` embaixo da segunda linha (mais o vão `pilha` da coluna) deixa 8 px entre o desenho e a frase.
// O 60px é o `max-w-[60px]` do desenho em `DuasColunas`. A classe fica inteira, numa só string: o Tailwind só
// gera as classes que lê escritas por inteiro no código.
const AO_LADO_DO_DESENHO =
  'max-sm:[.relative:has(>img[data-ilustracao])_&]:pe-[calc(60px+var(--espaco-pilha))] max-sm:[.relative:has(>img[data-ilustracao])_&]:pb-esp-pilha'

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
      <span className={`cm-segunda-linha ${AO_LADO_DO_DESENHO}`} style={{ display: 'block' }}>
        {` ${linhas[1]}`}
      </span>
    </h1>
  )
}
