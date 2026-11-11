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
 * Os números do Início. No celular cada número abre a linha dele em Literata de exibição (88 px), com
 * a legenda em Outfit embaixo e um fio fino de cacau entre as linhas; do tablet em diante, a fileira de
 * três com fios verticais (64 px em 1440). Cada item sobe 48 px e aparece ao entrar na janela, um a
 * cada 250 ms (M4), e é lido inteiro ("7 tipos de registro"). As classes `cm-numeros-*` ficam como
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
