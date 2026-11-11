import { EntradaSuave } from '../terceiros/EntradaSuave.tsx'
import { CATALOGO } from '../../movimento/catalogo.ts'

interface Item {
  /** A figura, em Literata 64 (40 em 390). */
  valor: string
  /** O que ela conta, em Outfit. */
  legenda: string
}

interface Props {
  itens: readonly [Item, Item, Item]
  className?: string
}

/**
 * Faixa de números (DESIGN.md 4): três itens separados por fios verticais de cacau a 20 % (fios
 * horizontais, empilhados, abaixo de 768). Cada item sobe 48 px e aparece ao entrar na janela, um a
 * cada 250 ms (M4). O item é lido inteiro ("7 tipos de registro").
 */
export function Numeros({ itens, className }: Props) {
  const { deslocamentoPx, duracaoMs, curva, escalonamentoMs } = CATALOGO.M4
  return (
    <ul className={['cm-numeros', className].filter(Boolean).join(' ')} data-numeros="">
      {itens.map((item, i) => (
        <li key={item.valor + item.legenda} className="cm-numeros-item">
          <EntradaSuave deslocamentoPx={deslocamentoPx} duracaoMs={duracaoMs} curva={curva} atrasoMs={i * escalonamentoMs}>
            <span className="cm-numeros-linha">
              <span className="cm-numeros-valor">{item.valor}</span> <span className="cm-numeros-legenda">{item.legenda}</span>
            </span>
          </EntradaSuave>
        </li>
      ))}
    </ul>
  )
}
