import type { ReactNode } from 'react'
import { PainelCampo } from './PainelCampo.tsx'

interface Relato {
  texto: string
  nome: string
  papel: string
}

interface Props {
  /** O título do grupo (um `Titulo`, por exemplo). */
  titulo: ReactNode
  relatos: readonly Relato[]
  'aria-labelledby'?: string
  className?: string
}

/**
 * Depoimentos (DESIGN.md 4, de F2): seção de areia com cartões brancos de raio 20; a frase em Literata
 * itálico 22 e o nome e o papel em Outfit. Enquanto não houver relatos reais, uma linha só acima do
 * grupo diz que são ilustrativos.
 */
export function Depoimento({ titulo, relatos, className, ...aria }: Props) {
  return (
    <PainelCampo variante="areia" como="section" className={className} {...aria}>
      {titulo}
      <p className="cm-rotulo cm-depoimentos-aviso" data-relatos-ilustrativos="">
        Relatos ilustrativos
      </p>
      <ul className="cm-depoimentos-lista">
        {relatos.map((relato) => (
          <li key={relato.nome}>
            <figure className="cm-depoimento">
              <blockquote>
                <p className="cm-depoimento-texto">{`“${relato.texto}”`}</p>
              </blockquote>
              <figcaption className="cm-pequeno">
                <span className="cm-depoimento-nome">{relato.nome}</span>
                <span>{relato.papel}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </PainelCampo>
  )
}
