import type { DadosDeTabela } from '../../conteudo/publicas.ts'

// Os papéis ARIA da tabela vão em objetos e entram por spread. Abaixo de 768 a tabela se empilha
// (display: block) e o navegador pode perder o papel nativo de table, rowgroup, row, cell e cabeçalho;
// o papel explícito o mantém para o leitor de tela. O spread é só para o lint não tratar o papel como
// redundante: nas outras larguras ele é o mesmo da tag.
const PAPEL = {
  tabela: { role: 'table' },
  grupo: { role: 'rowgroup' },
  linha: { role: 'row' },
  cabecalhoDeColuna: { role: 'columnheader' },
  cabecalhoDeLinha: { role: 'rowheader' },
  celula: { role: 'cell' },
} as const

interface Props extends DadosDeTabela {
  /** Índice da coluna (o cabeçalho da linha é 0) cujos valores são números a destacar, em Zilla Slab. */
  colunaDeDestaque?: number
}

/**
 * Tabela de leitura: legenda, cabeçalhos de coluna e a primeira célula de cada linha como cabeçalho da
 * linha. Em `corpo-p` (17/24), só com fios horizontais de 1 px (sem borda nos 4 lados e sem fundo de
 * cor), na largura de c2 a c8. Abaixo de 768 cada linha vira um bloco empilhado: o cabeçalho da linha em
 * cima e, antes de cada valor, o nome da coluna (visível, escondido do leitor de tela para não ser lido
 * duas vezes). Sem rolagem horizontal.
 */
export function TabelaDeLeitura({ legenda, colunas, linhas, colunaDeDestaque }: Props) {
  return (
    <table
      {...PAPEL.tabela}
      className="vp-tabela t-corpo-p"
      data-com-numero={colunaDeDestaque !== undefined ? '' : undefined}
    >
      <caption className="vp-tabela-legenda t-rotulo">{legenda}</caption>
      <thead {...PAPEL.grupo} className="vp-tabela-cabeca">
        <tr {...PAPEL.linha}>
          {colunas.map((coluna) => (
            <th key={coluna} {...PAPEL.cabecalhoDeColuna} scope="col">
              {coluna}
            </th>
          ))}
        </tr>
      </thead>
      <tbody {...PAPEL.grupo}>
        {linhas.map(([cabecalho, ...celulas]) => (
          <tr key={cabecalho} {...PAPEL.linha}>
            <th {...PAPEL.cabecalhoDeLinha} scope="row">
              {cabecalho}
            </th>
            {celulas.map((celula, indice) => {
              const destaque = indice + 1 === colunaDeDestaque
              return (
                <td key={celula} {...PAPEL.celula} data-destaque={destaque ? 'numero' : undefined}>
                  <span aria-hidden="true" className="vp-tabela-coluna">
                    {colunas[indice + 1]}
                  </span>
                  {destaque ? <span className="vp-tabela-numero t-numero">{celula}</span> : <span>{celula}</span>}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
