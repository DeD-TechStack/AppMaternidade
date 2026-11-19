import { QUANTO_TEMPO } from '../../conteudo/desenvolvimento/itens.ts'
import './desenvolvimento-casa.css'

// O traço solitário do dado (a célula da Pathways) vira célula vazia: o deck não tem traço (deck 2.3).
const TRACO = '—'

/**
 * A tabela "quanto tempo" (`de.qt.*`): uma `<table>` de verdade, com legenda, `th scope` de coluna e de linha. Cada
 * linha é um bloco (do celular ao desktop: a coluna do conteúdo tem 520 px, estreita para três colunas), com o nome da
 * coluna na frente de cada célula (`data-coluna`); o cabeçalho das colunas fica só para o leitor de tela.
 */
export function TabelaQuantoTempo() {
  return (
    <table className="dc-tabela">
      <caption className="text-titulo-4 font-titulo cm-sec-titulo">{QUANTO_TEMPO.titulo}</caption>
      <thead className="sr-only">
        <tr>
          {QUANTO_TEMPO.colunas.map((coluna) => (
            <th key={coluna} scope="col">
              {coluna}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {QUANTO_TEMPO.linhas.map(([cabeca, ...celulas]) => (
          <tr key={cabeca}>
            <th scope="row" className="text-corpo font-texto">
              {cabeca}
            </th>
            {celulas.map((celula, i) => (
              <td key={QUANTO_TEMPO.colunas[i + 1]} data-coluna={QUANTO_TEMPO.colunas[i + 1]} className="text-corpo font-texto">
                {celula === TRACO ? '' : celula}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
