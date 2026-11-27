import { CHAVE_CONVITE, lerChave } from './armazenamento.ts'

// Para onde a pessoa vai depois de entrar (RF-10) e como o `volta` viaja entre as telas de acesso.

const BASE_FALSA = 'http://local.invalid'

const ehConvite = (valor: string) => valor === '/convite' || valor.startsWith('/convite?') || valor.startsWith('/convite#')

/**
 * O `volta` da URL, se é um caminho interno válido: começa por `/app/` e não é `/app/comecar`
 * (com ou sem busca), ou é `/convite`. Qualquer outro formato (`//…`, `http…`, `/entrar`,
 * `/app/comecar`) é ignorado, sem erro.
 */
export function voltaValida(valor: string | null | undefined): string | null {
  if (!valor || (!valor.startsWith('/app/') && !ehConvite(valor))) return null
  if (valor.includes('\\') || [...valor].some((letra) => letra.charCodeAt(0) < 32)) return null
  try {
    const url = new URL(valor, BASE_FALSA)
    if (url.origin !== BASE_FALSA) return null
    // O fragmento do convite (o código) nunca viaja de uma tela a outra: só o caminho vale.
    if (url.pathname === '/convite') return '/convite'
    if (!url.pathname.startsWith('/app/')) return null
    if (url.pathname === '/app/comecar' || url.pathname.startsWith('/app/comecar/')) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

/**
 * O destino calculado, em ordem: o `volta` válido; `/convite`, se há código guardado; `/app/familia`.
 * A Família sem família ativa leva a `/app/comecar` (RF-09), então o item 4 do RF-10 vem dela. Com
 * conta incompleta, a pessoa passa antes pelo passo "Seu nome".
 */
export function destinoDepoisDeEntrar(volta: string | null, contaCompleta: boolean): string {
  const destino = voltaValida(volta) ?? (lerChave('sessao', CHAVE_CONVITE) ? '/convite' : '/app/familia')
  return contaCompleta ? destino : `/app/comecar?volta=${encodeURIComponent(destino)}`
}

/** Um link entre as telas de acesso leva junto o `volta` válido. */
export function caminhoComVolta(caminho: string, volta: string | null): string {
  return volta ? `${caminho}?volta=${encodeURIComponent(volta)}` : caminho
}

/** O endereço absoluto de uma página do site, para os links que o Auth manda por e-mail. */
export function urlDoSite(caminho: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}${caminho}`
}
