import type { ParteDoArtigo } from '../../conteudo/desenvolvimento/tipos.ts'
import { Colunas, Pilha } from '../base/layout/index.ts'
import './publicas-destaque.css'

interface Props {
  partes: readonly ParteDoArtigo[]
  /**
   * Em quantas colunas as partes correm quando a largura deixa: `tres` (a partir de 1100 px) ou `duas` (a partir
   * de 900 px). Sem isso, uma coluna só, uma parte sob a outra.
   */
  colunas?: 'duas' | 'tres'
}

/** As partes de um artigo de Desenvolvimento: um h3 e os parágrafos de cada uma. */
export function PartesDoArtigo({ partes, colunas }: Props) {
  const itens = partes.map((parte) => (
    <Pilha key={parte.titulo} vao="pilha" dataH={colunas ? 'coluna' : undefined}>
      <h3 className="cm-h4">{parte.titulo}</h3>
      {parte.textos.map((texto) => (
        <p key={texto} className="cm-corpo">
          {texto}
        </p>
      ))}
    </Pilha>
  ))
  if (colunas === 'tres') {
    return (
      <Colunas fracoes="repeat(3, minmax(0, 1fr))" aPartirDe={1100} className="pd-partes">
        {itens}
      </Colunas>
    )
  }
  if (colunas === 'duas') {
    return (
      <Colunas aPartirDe={900} className="pd-partes">
        {itens}
      </Colunas>
    )
  }
  return (
    <Pilha vao="grupo" className="pd-partes">
      {itens}
    </Pilha>
  )
}
