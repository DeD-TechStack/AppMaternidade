import { Check, Minus } from 'lucide-react'
import { PainelCampo } from './PainelCampo.tsx'

interface Linha {
  /** O que a família precisa. */
  necessidade: string
  /** O AppMaternidade atende? */
  app: boolean
  /** O caderno com as mensagens soltas atende? */
  caderno: boolean
}

interface Props {
  legenda: string
  linhas: readonly Linha[]
  className?: string
}

function Marca({ sim }: { sim: boolean }) {
  return sim ? (
    <>
      <Check aria-hidden="true" strokeWidth={2.25} />
      <span className="sr-only">Sim</span>
    </>
  ) : (
    <>
      <Minus aria-hidden="true" strokeWidth={2.25} />
      <span className="sr-only">Não</span>
    </>
  )
}

/**
 * Tabela de comparação (DESIGN.md 4, de F2): uma `<table>` de verdade, com legenda e cabeçalhos de
 * coluna e de linha, num painel de oliva com texto de papel (4,68:1). O visto e o traço trazem "Sim" e
 * "Não" para o leitor de tela.
 */
export function TabelaComparacao({ legenda, linhas, className }: Props) {
  return (
    <PainelCampo variante="oliva" className={className}>
      <div className="cm-tabela-rolagem">
        <table className="cm-tabela">
          <caption className="cm-h4">{legenda}</caption>
          <thead>
            <tr>
              <th scope="col">O que você precisa</th>
              <th scope="col">AppMaternidade</th>
              <th scope="col">Caderno e mensagens</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.necessidade}>
                <th scope="row">{linha.necessidade}</th>
                <td>
                  <Marca sim={linha.app} />
                </td>
                <td>
                  <Marca sim={linha.caderno} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PainelCampo>
  )
}
