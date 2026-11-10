import { useCallback, useLayoutEffect, useRef } from 'react'

// O `Abertura` da base desenha o `h1` e não aceita `ref` nem `tabIndex`. Para a tela levar o foco
// ao título quando a origem pede (navegação interna), o `<main>` guarda a ref e o hook acha o `h1`
// dentro dele: põe o `tabIndex=-1` (alvo de foco por programa, sem contorno: `h1:focus` já o tira)
// e devolve a função que o foca.
export function useTituloDaTela() {
  const principal = useRef<HTMLElement>(null)
  const titulo = useCallback(() => principal.current?.querySelector<HTMLElement>('h1') ?? null, [])

  useLayoutEffect(() => {
    const h1 = titulo()
    if (h1) h1.tabIndex = -1
  }, [titulo])

  const focarTitulo = useCallback(() => titulo()?.focus(), [titulo])

  return { principal, focarTitulo }
}
