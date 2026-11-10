import { useId } from 'react'
import { Link } from 'react-router'

interface Props {
  pergunta: string
  /** O texto do círculo cheio e a rota dele. */
  cta: string
  destinoCta: string
  /** O texto do círculo só de contorno e a rota dele. */
  contorno: string
  destinoContorno: string
}

/**
 * Pergunta centrada e, abaixo, o círculo CTA de 480 px (322 abaixo de 768), urucum, centrado na
 * janela. O círculo de contorno de 240 px fica à direita; em páginas estreitas vai para baixo do
 * CTA, para os dois nunca se tocarem nem passarem da borda.
 */
export function PerguntaCta({ pergunta, cta, destinoCta, contorno, destinoContorno }: Props) {
  const idTitulo = useId()
  return (
    <section className="sb-area sb-mt-midia-linhas vt-pergunta" aria-labelledby={idTitulo} data-bloco="">
      <h2 id={idTitulo} className="vt-pergunta-titulo t-secao">
        {pergunta}
      </h2>
      <div className="vt-cta-palco">
        <Link to={destinoCta} className="vt-cta t-botao alvo-toque" data-cta="">
          {cta}
        </Link>
        <Link to={destinoContorno} className="vt-cta-contorno t-botao alvo-toque">
          {contorno}
        </Link>
      </div>
    </section>
  )
}
