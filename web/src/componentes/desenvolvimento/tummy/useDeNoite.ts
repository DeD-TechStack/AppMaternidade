import { useSyncExternalStore } from 'react'

// A página não liga nem desliga a madrugada (P9, DES-11): só acompanha o `data-tema` do `<html>`, sem recarregar.

const lerTema = () => document.documentElement.getAttribute('data-tema') === 'madrugada'

function assinar(aoMudar: () => void) {
  const observador = new MutationObserver(aoMudar)
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })
  return () => observador.disconnect()
}

/** Verdadeiro com `data-tema="madrugada"` no `<html>`. */
export function useDeNoite(): boolean {
  return useSyncExternalStore(assinar, lerTema, () => false)
}
