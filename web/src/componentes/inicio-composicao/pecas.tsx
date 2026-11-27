/** A caption in the hour voice: the hour stands alone, large; the rest ("mamada, anotada por Ju") sits beside it. */
export function Legenda({ texto, className }: { texto: string; className?: string }) {
  const corte = texto.indexOf(', ')
  return (
    <p className={`co-leg ${className ?? ''}`} data-legenda="">
      <span className="co-leg-hora">{texto.slice(0, corte)}</span>
      <span className="sr-only">, </span>
      <span className="co-leg-resto">{texto.slice(corte + 2)}</span>
    </p>
  )
}

/** A capture of the product in a phone drawn in CSS (the bezel is a token, so it follows the palette and stays sharp). */
export function Telefone({ arte, nome, alt, sizes, className }: { arte: string; nome: string; alt: string; sizes: string; className?: string }) {
  return (
    <figure className={`co-fone ${className ?? ''}`}>
      <img
        src={`${arte}/${nome}-780w.webp`}
        srcSet={`${arte}/${nome}-780w.webp 780w, ${arte}/${nome}-1170w.webp 1170w`}
        sizes={sizes}
        width={390}
        height={844}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </figure>
  )
}
