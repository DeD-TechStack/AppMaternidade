import { FASES, IDEIAS } from '../../conteudo/desenvolvimento/itens.ts'
import { Fontes } from './Fontes.tsx'
import './desenvolvimento-casa.css'

/**
 * As seis fases das ideias para brincar como UMA lista com fio de 1 px (cor do texto): o h3 da fase, os itens e as
 * fontes de cada uma. Todas no DOM, na ordem; nada de abas nem de `details`.
 */
export function Fases() {
  return (
    <div className="dc-fases-bloco">
      <nav className="dc-fases-indice text-corpo font-texto" aria-labelledby="dc-fases-rotulo">
        <p id="dc-fases-rotulo">{IDEIAS.rotuloSeletor}</p>
        <ul>
          {FASES.map((fase) => (
            <li key={fase.id}>
              <a href={`#${fase.id}`}>{fase.titulo}</a>
            </li>
          ))}
        </ul>
      </nav>
      <ul className="dc-fases" data-fases="">
        {FASES.map((fase) => (
          <li key={fase.id} id={fase.id}>
            <h3 className="text-titulo-3 font-titulo cm-sec-titulo">{fase.titulo}</h3>
            <ul className="dc-itens text-corpo font-texto">
              {fase.itens.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Fontes fontes={fase.fontes} consultadoEm={fase.consultadoEm} />
          </li>
        ))}
      </ul>
    </div>
  )
}
