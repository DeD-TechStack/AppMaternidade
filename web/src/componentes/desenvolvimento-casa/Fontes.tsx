import { ROTULOS_FONTES } from '../../conteudo/desenvolvimento/pagina.ts'
import type { Fonte } from '../../conteudo/desenvolvimento/tipos.ts'
import { DESENVOLVIMENTO_CASA } from '../../conteudo/casa/desenvolvimento.ts'
import './desenvolvimento-casa.css'

interface Props {
  fontes: readonly Fonte[]
  /** A data em que as fontes foram consultadas (dd/mm/aaaa). */
  consultadoEm: string
}

/**
 * As fontes de um item, sempre abertas (sem `details`): o rótulo "Fontes" abre a lista, depois a data da consulta e
 * um link por fonte. O texto vem do deck (rótulo) e do conteúdo de saúde (data, nomes e endereços), só de leitura.
 */
export function Fontes({ fontes, consultadoEm }: Props) {
  return (
    <div className="dc-fontes" data-fontes="">
      <p className="dc-fontes-rotulo text-pequeno font-texto">{DESENVOLVIMENTO_CASA.fontesRotulo}</p>
      <p className="dc-fontes-data text-pequeno font-texto" data-consulta="">{`${ROTULOS_FONTES.consultadas} ${consultadoEm}`}</p>
      <ul className="dc-fontes-lista text-pequeno font-texto">
        {fontes.map((fonte) => (
          <li key={fonte.url}>
            <a href={fonte.url}>{fonte.nome}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}
