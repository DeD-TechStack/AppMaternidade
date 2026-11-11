/**
 * Página pública ainda sem conteúdo: só o `<main>` com o título da página em `<h1>`, dentro da casca.
 * O conteúdo de cada uma chega no cartão dela.
 */
export function PaginaSimples({ titulo }: { titulo: string }) {
  return (
    <main className="cm-area cm-pagina-simples">
      <h1 className="cm-h1">{titulo}</h1>
    </main>
  )
}
