interface Props {
  /** A frase, sem aspas (as aspas tipográficas vêm do componente). */
  texto: string
  /** Quem disse, em Outfit. */
  autor: string
  className?: string
}

/** Citação (DESIGN.md 4): Literata itálico 48/56 (30/36 em 390), cacau, com a linha do autor em Outfit. */
export function Citacao({ texto, autor, className }: Props) {
  return (
    <figure className={['cm-citacao', className].filter(Boolean).join(' ')}>
      <blockquote>
        <p className="cm-citacao-texto">{`“${texto}”`}</p>
      </blockquote>
      <figcaption className="cm-citacao-autor">{autor}</figcaption>
    </figure>
  )
}
