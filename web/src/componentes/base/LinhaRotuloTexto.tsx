import type { ReactNode } from 'react'

/**
 * Linha rótulo + texto: rótulo em c2–c3, texto em c4–c8 (no máximo 560 px, com 32 px de recuo e um
 * fio vertical em x de c4) e um fio horizontal embaixo, de c2 a c9. Abaixo de 768 o rótulo fica
 * em cima do texto. Vai dentro de uma área útil (`sb-area`).
 */
export function LinhaRotuloTexto({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grade-10">
      <div className="sb-linha col-c2-c9">
        <h2 className="sb-linha-rotulo t-rotulo">{rotulo}</h2>
        <div className="sb-linha-texto t-corpo">
          <p>{children}</p>
        </div>
      </div>
    </div>
  )
}
