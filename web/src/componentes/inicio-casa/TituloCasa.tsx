import { INI } from '../../conteudo/inicio.ts'

/**
 * The h1 of the Início: one string in two spans (RECUT §1.2). The first sits on the day wall in cacau, the second on
 * the night wall in papel; the seam of the plate falls between them (12 px each side at 1440). The space between the
 * spans keeps the text of the heading whole for a screen reader; it is not drawn (the spans are flex items).
 */
export function TituloCasa({ id }: { id: string }) {
  return (
    <h1 id={id} className="cm-h1 cm-exibicao ic-titulo">
      <span data-h1-dia="">{INI.h1Dia}</span> <span data-h1-noite="">{INI.h1Noite}</span>
    </h1>
  )
}
