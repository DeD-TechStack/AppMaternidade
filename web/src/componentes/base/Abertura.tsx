import type { ReactNode } from 'react'

interface Props {
  /** O `h1` da tela: `display-xl`, peso 600. */
  titulo: string
  /** A linha sob o título: `subtitulo`. */
  subtitulo: string
  /** A coluna lateral (c9–c10): em geral, etiquetas. Cada uma ocupa 32 px de altura. */
  lateral?: ReactNode
}

/**
 * Abertura de toda tela: título em c1–c8 e coluna lateral em c9–c10, na mesma linha da grade (a
 * primeira etiqueta começa na altura do título). Abaixo de 768 a lateral vai para baixo do subtítulo.
 * O `.sb-abertura-base` é só o fio: o horizontal em c1–c10 (a borda de baixo) e, por pseudo-elemento,
 * o vertical em x de c9, nos 80 px finais e terminando no horizontal. O vertical é decoração e some
 * abaixo de 768.
 */
export function Abertura({ titulo, subtitulo, lateral }: Props) {
  return (
    <section className="sb-area sb-abertura" data-bloco="">
      <div className="grade-10">
        <div className="col-c1-c8">
          <h1 className="t-display-xl">{titulo}</h1>
          <p className="sb-abertura-subtitulo t-subtitulo">{subtitulo}</p>
        </div>
        {lateral ? <ul className="sb-abertura-lateral col-c9-c10">{lateral}</ul> : null}
      </div>
      <div className="sb-abertura-base" aria-hidden="true" />
    </section>
  )
}
