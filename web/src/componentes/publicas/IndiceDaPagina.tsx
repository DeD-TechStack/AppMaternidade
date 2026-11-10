import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { ROTULOS } from '../../conteudo/publicas.ts'
import type { Secao } from '../../conteudo/publicas.ts'

/**
 * O índice "Nesta página": uma linha rótulo + texto, com o rótulo num `<p>` e um link-âncora para cada
 * `h2` da página, na ordem. `margem` é uma das classes `sb-mt-*`.
 */
export function IndiceDaPagina({ secoes, margem }: { secoes: readonly Secao[]; margem: string }) {
  return (
    <div className={`sb-area ${margem}`} data-bloco="">
      <nav aria-label={ROTULOS.indice}>
        <div className="grade-10">
          <div className="sb-linha vp-linha col-c2-c8">
            <p className="sb-linha-rotulo t-rotulo">{ROTULOS.indice}</p>
            <div className="sb-linha-texto vp-texto t-corpo">
              <ul
                className="vp-links vp-links-duplo"
                style={{ '--linhas': Math.ceil(secoes.length / 2) } as CSSProperties}
              >
                {secoes.map(({ titulo, id }) => (
                  <li key={id}>
                    <Link to={`#${id}`} className="alvo-toque">
                      {titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}
