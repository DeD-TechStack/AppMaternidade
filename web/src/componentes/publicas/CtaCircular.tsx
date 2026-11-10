import { Link } from 'react-router'
import type { Secao } from '../../conteudo/publicas.ts'

interface Props {
  /** O `h2` da seção, em `secao` (56/67; 36/43 no celular), com id `secao-<slug>`. */
  secao: Secao
  /** Um texto curto entre o título e o círculo. */
  texto: string
  /** O texto do círculo e a rota dele. */
  cta: string
  destino: string
  margem: string
}

/**
 * O título da seção, um texto curto e o círculo CTA de 480 px (322 abaixo de 768), urucum, centrado.
 * Usa as classes do bloco da pergunta do Início (`vt-pergunta`, `vt-cta-palco`, `vt-cta`), mas só com o
 * círculo cheio: o círculo de contorno é do Início.
 */
export function CtaCircular({ secao, texto, cta, destino, margem }: Props) {
  return (
    <section className={`sb-area ${margem} vt-pergunta`} aria-labelledby={secao.id} data-bloco="">
      <h2 id={secao.id} tabIndex={-1} className="vt-pergunta-titulo t-secao focus:outline-none">
        {secao.titulo}
      </h2>
      <p className="vp-cta-texto t-corpo">{texto}</p>
      <div className="vt-cta-palco">
        <Link to={destino} className="vt-cta t-secao alvo-toque" data-cta="">
          {cta}
        </Link>
      </div>
    </section>
  )
}
