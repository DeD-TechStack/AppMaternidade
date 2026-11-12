import { EntradaSuave } from '../terceiros/EntradaSuave.tsx'
import { CATALOGO } from '../../movimento/catalogo.ts'
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
 * (no celular a legenda vai no tamanho pequeno, em duas linhas). Cada item sobe 48 px e
 * aparece ao entrar na janela, um a cada 250 ms (M4), e é lido inteiro ("7 tipos de registro"). As classes `cm-numeros-*` ficam como
 * marca das peças (os testes de layout as procuram); o desenho é o das `in-numeros-*`, sem camada.
 */
export function NumerosInicio({ itens }: Props) {
  const { deslocamentoPx, duracaoMs, curva, escalonamentoMs } = CATALOGO.M4
  return (
    <ul className="in-numeros-lista" data-numeros="">
      {itens.map((item, i) => (
        <li key={item.valor + item.legenda} className="in-numeros-item">
          <EntradaSuave deslocamentoPx={deslocamentoPx} duracaoMs={duracaoMs} curva={curva} atrasoMs={i * escalonamentoMs}>
            <span className="in-numeros-linha">
              <span className="cm-numeros-valor in-numeros-valor">{item.valor}</span>{' '}
              <span className="cm-numeros-legenda in-numeros-legenda">{item.legenda}</span>
            </span>
          </EntradaSuave>
        </li>
      ))}
    </ul>
  )
}
