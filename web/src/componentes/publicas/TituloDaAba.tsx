import { useEffect } from 'react'
import { useMatches } from 'react-router'
import { NOME_SITE } from '../../conteudo/publicas.ts'

interface RotaCasada {
  handle?: unknown
}

/**
 * O título da aba: o `handle.titulo` da rota casada mais profunda que tenha um. Sem nenhum, o nome
 * do site. Nenhuma página define o título sozinha.
 */
export function escolherTitulo(casadas: readonly RotaCasada[]): string {
  for (let i = casadas.length - 1; i >= 0; i--) {
    const titulo = (casadas[i].handle as { titulo?: unknown } | null | undefined)?.titulo
    if (typeof titulo === 'string' && titulo !== '') return titulo
  }
  return NOME_SITE
}

// Montado uma vez na rota raiz: define document.title a cada troca de rota.
export function TituloDaAba() {
  const titulo = escolherTitulo(useMatches())

  useEffect(() => {
    document.title = titulo
  }, [titulo])

  return null
}
