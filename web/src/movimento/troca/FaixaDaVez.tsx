// "A faixa da vez" (STAGE, beat B3): one areia band on the 17:30 row of the first framed screen that steps down one row, from
// the 16:00 entry to the 17:30 entry, while the night sheet crosses the frame, together with the caption swap and the lamp
// of M06. The band is decoration: it blends (multiply) with the capture under it, so it is never a stacking context
// away from the frame (no transform, translate, opacity, will-change, filter or z-index on its box or on the hole). Its CSS
// is in troca.css; its scrubbing is CSS (scroll-driven) or, without it, `useNoitePresa`.

/** The turn marker: the screen hole of a frame, and one areia band on the 17:30 row. Decorative. */
export function FaixaDaVez() {
  return (
    <span data-vez-tela="" aria-hidden="true">
      <span data-vez="" />
    </span>
  )
}

/**
 * The overlay for a frame the page cannot enter (the shared `ProdutoEmMoldura`): a `.cm-produto-moldura`, so the rules that
 * place the day frame place this box too (the twin's registration trick). It follows the day frame and holds only the marker.
 */
export function CaixaDaVez() {
  return (
    <span data-vez-caixa="" className="cm-produto-moldura" aria-hidden="true">
      <FaixaDaVez />
    </span>
  )
}
