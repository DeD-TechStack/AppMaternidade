import type { ReactNode } from 'react'
import { PainelCampo, type VariantePainel } from '../campo/PainelCampo.tsx'
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
 * Uma sequência de verdade (por isso numerada): cada passo é um painel de campo com o texto de um
 * lado e a tela de exemplo do outro; a tela sobra 32 px pela borda de baixo do painel. Empilha no
 * celular. A lista ordenada já diz a ordem ao leitor de tela; o número desenhado fica escondido dele.
 */
export function ListaDePassos({ passos, midias }: Props) {
  return (
    <ol className="pd-passos" data-passos="">
      {passos.map((passo, i) => {
        const campo = CAMPOS[i % CAMPOS.length]
        return (
          <li key={passo.id} id={`passo-${passo.id}`}>
            <PainelCampo variante={campo} luz={campo === 'mel'} className="pd-passo">
              <div className="pd-passo-texto">
                <span className="pd-passo-numero" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="cm-h3">{passo.titulo}</h3>
                <p className="cm-lide">{passo.texto}</p>
              </div>
              <div className="pd-passo-midia">{midias[i]}</div>
            </PainelCampo>
          </li>
        )
      })}
    </ol>
  )
}
