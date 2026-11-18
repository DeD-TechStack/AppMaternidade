import './inicio.css'

interface Item {
  valor: string
  legenda: string
}

interface Props {
  itens: readonly [Item, Item, Item]
}

/**
 * Os números do Início, na escala de `Numeros` (DESIGN.md 4): o número lidera, em Literata 64 em 1440
 * (40 em 390), e a legenda em Outfit vem embaixo dele. Em toda largura, um bloco só que abre a faixa:
 * a fileira de três, alinhada à grade, com fios de cacau a 20 % em cima, embaixo e entre os números
 * (no celular a legenda vai no tamanho pequeno, em duas linhas). Os itens já nascem no lugar, visíveis
 * desde a primeira pintura, e são lidos inteiros ("7 tipos de registro"). As classes `cm-numeros-*` ficam como
 * marca das peças (os testes de layout as procuram); o desenho é o das `in-numeros-*`, sem camada.
 */
export function NumerosInicio({ itens }: Props) {
  return (
    <ul className="in-numeros-lista" data-numeros="">
      {itens.map((item) => (
        <li key={item.valor + item.legenda} className="in-numeros-item">
          <div>
            <span className="in-numeros-linha">
              <span className="cm-numeros-valor in-numeros-valor">{item.valor}</span>{' '}
              <span className="cm-numeros-legenda in-numeros-legenda">{item.legenda}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
