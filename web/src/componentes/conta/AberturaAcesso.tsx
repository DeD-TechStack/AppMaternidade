import type { ReactNode } from 'react'
import { useFocoNoTitulo } from './foco.ts'

interface Props {
  /** O `h1` da tela, com o texto fixo da rota. */
  titulo: string
  /** A linha sob o título (uma linha em 1440). */
  subtitulo: string
  /** A coluna lateral (c9–c10): itens `<li>` com etiquetas, o aviso de demonstração e links. */
  lateral?: ReactNode
  /**
   * A coluna lateral já montada (um `nav` com a própria lista, como o índice da Conta abaixo de 768):
   * entra no lugar da `<ul>` de `lateral`.
   */
  colunaLateral?: ReactNode
  /** A linha sob o título leva um valor sem ponto de quebra (o e-mail): ela quebra dentro da palavra. */
  quebraLonga?: boolean
}

/**
 * A abertura das telas de acesso: a mesma marcação e as mesmas classes de `base/Abertura.tsx`
 * (`sb-abertura`, `grade-10`, `t-display-xl`, `t-subtitulo`), mais o que a base não tem: o `h1` leva
 * `ref` e `tabIndex={-1}` para receber o foco quando a pessoa navega para a tela (`useFocoNoTitulo`).
 * O `h1` com foco por programa não mostra contorno (`h1:focus`, na base).
 */
export function AberturaAcesso({ titulo, subtitulo, lateral, colunaLateral, quebraLonga = false }: Props) {
  const tituloRef = useFocoNoTitulo()

  return (
    <section className="sb-area sb-abertura" data-bloco="">
      <div className="grade-10">
        <div className="col-c1-c8">
          <h1 ref={tituloRef} tabIndex={-1} className="t-display-xl">
            {titulo}
          </h1>
          <p className={`sb-abertura-subtitulo t-subtitulo${quebraLonga ? ' wrap-anywhere' : ''}`}>{subtitulo}</p>
        </div>
        {colunaLateral ?? (lateral ? <ul className="sb-abertura-lateral col-c9-c10">{lateral}</ul> : null)}
      </div>
      <div className="sb-abertura-base" aria-hidden="true" />
    </section>
  )
}
