import type { DadosDeTabela } from '../../conteudo/publicas-texto.ts'

/**
 * Tabela de leitura: `<table>` de verdade, com legenda, `scope` nos cabeçalhos e a primeira célula de
 * cada linha como cabeçalho da linha. Em tela estreita ela rola dentro da própria região (que recebe
 * foco do teclado e tem nome), nunca a página inteira.
 */
export function TabelaDeLeitura({ legenda, colunas, linhas }: DadosDeTabela) {
  return (
    // Região rolável com foco do teclado: é o padrão para quem não tem mouse poder rolar a tabela.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className="pt-tabela" role="region" aria-label={legenda} tabIndex={0}>
      <table>
        <caption>{legenda}</caption>
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna} scope="col">
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map(([cabecalho, ...celulas]) => (
            <tr key={cabecalho}>
              <th scope="row">{cabecalho}</th>
              {celulas.map((celula) => (
                <td key={celula}>{celula}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
