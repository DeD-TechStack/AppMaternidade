import { useSyncExternalStore } from 'react'

// Impressão (VIS-1 R2-F1): ao imprimir, toda entrada de movimento está no estado final (opacidade 1,
// sem deslocamento), também num bloco já carregado que nunca entrou na janela. Vale quando o navegador
// avisa (`beforeprint`/`afterprint`) ou quando a mídia `print` está ativa (`matchMedia('print')`).
// Sem window (renderização no servidor) vale o padrão: não está imprimindo.

let avisoImpressao = false
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((ouvinte) => ouvinte())

function lerMidia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('print').matches
}

function assinar(aviso: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  ouvintes.add(aviso)
  const antes = () => { avisoImpressao = true; avisar() }
  const depois = () => { avisoImpressao = false; avisar() }
  window.addEventListener('beforeprint', antes)
  window.addEventListener('afterprint', depois)
  const lista = typeof window.matchMedia === 'function' ? window.matchMedia('print') : null
  lista?.addEventListener?.('change', aviso)
  return () => {
    ouvintes.delete(aviso)
    window.removeEventListener('beforeprint', antes)
    window.removeEventListener('afterprint', depois)
    lista?.removeEventListener?.('change', aviso)
  }
}

/** Verdadeiro enquanto a página está sendo impressa (ou pré-visualizada para impressão). */
export function useImprimindo(): boolean {
  return useSyncExternalStore(assinar, () => avisoImpressao || lerMidia(), () => false)
}
