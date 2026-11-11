import type { ReactNode } from 'react'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import './publicas-destaque.css'

interface Props {
  legenda: string
  /** A legenda só para o leitor de tela, quando um título logo acima já diz o mesmo. */
  legendaOculta?: boolean
  colunas: readonly string[]
  /** A primeira célula de cada linha é o cabeçalho da linha. */
  linhas: ReadonlyArray<readonly string[]>
  /** O que vem logo abaixo da tabela, no mesmo painel. */
  depois?: ReactNode
  className?: string
}

/**
 * Uma `<table>` de texto num painel de oliva, com o texto de papel (4,68:1), como a tabela de
 * comparação (DESIGN.md 4). No celular cada linha vira um bloco, com o nome da coluna em cada célula.
 */
export function TabelaTexto({ legenda, legendaOculta = false, colunas, linhas, depois, className }: Props) {
  return (
    <PainelCampo variante="oliva" className={className}>
      <table className="pd-tabela">
        <caption className={legendaOculta ? 'sr-only' : 'cm-h3'}>{legenda}</caption>
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
          {linhas.map(([cabeca, ...celulas]) => (
            <tr key={cabeca}>
              <th scope="row">{cabeca}</th>
              {celulas.map((celula, i) => (
                <td key={colunas[i + 1]} data-coluna={colunas[i + 1]}>
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {depois}
    </PainelCampo>
  )
}
