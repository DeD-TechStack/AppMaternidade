import { ROTULOS_FONTES } from '../../conteudo/desenvolvimento/pagina.ts'
import type { Fonte } from '../../conteudo/desenvolvimento/tipos.ts'
import './publicas-destaque.css'

interface Props {
  fontes: readonly Fonte[]
  /** A data em que as fontes foram consultadas (dd/mm/aaaa). */
  consultadoEm: string
}

/** As fontes de um item de Desenvolvimento, com o link de cada uma, e a data da consulta. */
export function FontesDoItem({ fontes, consultadoEm }: Props) {
  return (
    <div className="pd-fontes" data-fontes="">
      <p className="pd-fontes-titulo">{ROTULOS_FONTES.titulo}</p>
      <ul className="pd-fontes-lista">
        {fontes.map((fonte) => (
          <li key={fonte.url}>
            <a className="pd-fonte" href={fonte.url}>
              {fonte.nome}
            </a>
          </li>
        ))}
      </ul>
      <p className="pd-fontes-data" data-consulta="">{`${ROTULOS_FONTES.consultadas} ${consultadoEm}`}</p>
    </div>
  )
}
