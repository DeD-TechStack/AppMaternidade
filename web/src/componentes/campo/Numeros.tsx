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
 * horizontais, empilhados, abaixo de 768). Os itens já nascem no lugar, visíveis desde a primeira
 * pintura. O item é lido inteiro ("7 tipos de registro").
 */
export function Numeros({ itens, className }: Props) {
  return (
    <ul className={['cm-numeros', className].filter(Boolean).join(' ')} data-numeros="">
      {itens.map((item) => (
        <li key={item.valor + item.legenda} className="cm-numeros-item">
          <div>
            <span className="cm-numeros-linha">
              <span className="cm-numeros-valor">{item.valor}</span> <span className="cm-numeros-legenda">{item.legenda}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
