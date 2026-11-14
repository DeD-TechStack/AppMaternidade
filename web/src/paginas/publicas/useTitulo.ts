import { useEffect } from 'react'
import { tituloPublico } from '../../conteudo/conta.ts'

// O título da aba de uma página pública: "<nome> | AppMaternidade". Grava ao montar e devolve o anterior ao
// sair, como a área logada faz (`sessao.tsx`).
export function useTituloDaPagina(nome: string): void {
  useEffect(() => {
    const anterior = document.title
    document.title = tituloPublico(nome)
    return () => {
      document.title = anterior
    }
  }, [nome])
}
