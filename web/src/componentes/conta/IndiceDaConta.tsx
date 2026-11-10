import type { MouseEvent } from 'react'
import { CONTA } from '../../conteudo/conta.ts'

export interface ItemDoIndice {
  id: string
  rotulo: string
}

interface Props {
  itens: readonly ItemDoIndice[]
  /** O `id` da seção atual: o único item com `aria-current="location"`. */
  ativo: string
  /** Clique num item (sem tecla de modificação): quem chama rola, foca o título e trava o destino. */
  aoEscolher: (id: string) => void
  /** De 768 para cima o índice fica ao lado e acompanha a rolagem; abaixo, fica na abertura. */
  aoLado: boolean
}

/**
 * O índice da Conta: as âncoras das 6 seções, empilhadas na coluna lateral (de 32 em 32 px, no mesmo
 * x) ou, abaixo de 768, em linha com quebra antes do fio. O link leva o `#id`; um clique sem tecla de
 * modificação não segue o link do navegador: a tela rola até a seção e foca o título dela. Cada link
 * tem o alvo de toque inteiro (44 px, 56 na madrugada) e, de 768 para cima, a caixa do alvo se
 * sobrepõe à do vizinho (o passo é 32): vale o link de baixo na faixa comum.
 */
export function IndiceDaConta({ itens, ativo, aoEscolher, aoLado }: Props) {
  function aoClicar(evento: MouseEvent<HTMLAnchorElement>, id: string) {
    const comTecla = evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey
    if (evento.defaultPrevented || evento.button !== 0 || comTecla) return
    evento.preventDefault()
    aoEscolher(id)
  }

  return (
    <nav
      aria-label={CONTA.indice}
      className={aoLado ? 'sb-area conta-indice conta-indice-ao-lado' : 'conta-indice col-c9-c10'}
    >
      <ul className="sb-abertura-lateral conta-indice-lista">
        {itens.map(({ id, rotulo }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="sb-abertura-link t-corpo alvo-toque"
              aria-current={ativo === id ? 'location' : undefined}
              onClick={(evento) => aoClicar(evento, id)}
            >
              {rotulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
