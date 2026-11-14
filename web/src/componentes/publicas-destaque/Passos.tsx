import type { ReactNode } from 'react'
import { PainelCampo, type VariantePainel } from '../campo/PainelCampo.tsx'
import { Coluna, Colunas, Pilha } from '../base/layout/index.ts'
import './publicas-destaque.css'

interface Passo {
  id: string
  titulo: string
  texto: string
}

interface Props {
  passos: readonly Passo[]
  /** A tela de exemplo de cada passo, na mesma ordem. */
  midias: readonly ReactNode[]
}

// Os campos se alternam: mel (com a luz de estúdio), oliva e areia.
const CAMPOS: readonly VariantePainel[] = ['mel', 'oliva', 'areia']

/**
 * Uma sequência de verdade (por isso numerada): uma `Pilha` de vão `bloco` com um painel de campo por passo, o
 * texto de um lado e a tela de exemplo do outro (`Colunas` de vão `midia`); a tela sobra 32 px pela borda de
 * baixo do painel. Empilha no celular. A lista ordenada já diz a ordem ao leitor de tela; o número desenhado
 * fica escondido dele.
 */
export function ListaDePassos({ passos, midias }: Props) {
  return (
    <Pilha as="ol" vao="bloco" className="pd-passos" data-passos="">
      {passos.map((passo, i) => {
        const campo = CAMPOS[i % CAMPOS.length]
        return (
          <li key={passo.id} id={`passo-${passo.id}`}>
            <PainelCampo variante={campo} luz={campo === 'mel'} largura="celula" className="pd-passo">
              <Colunas aPartirDe={900} vao="midia" alinhar="centro">
                <Pilha vao="pilha" dataH="coluna" className="pd-passo-texto">
                  <span className="pd-passo-numero" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="cm-h3">{passo.titulo}</h3>
                  <p className="cm-lide">{passo.texto}</p>
                </Pilha>
                <Coluna className="pd-passo-midia">{midias[i]}</Coluna>
              </Colunas>
            </PainelCampo>
          </li>
        )
      })}
    </Pilha>
  )
}
