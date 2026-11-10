// Para onde a pessoa vai depois de entrar (RF-10) e como o `volta` viaja entre as telas de acesso.

const BASE_FALSA = 'http://local.invalid'

/**
 * O `volta` da URL, se é um caminho interno válido: começa por `/app/` e não é `/app/comecar`
 * (com ou sem busca). Qualquer outro formato (`//…`, `http…`, `/entrar`, `/app/comecar`) é
 * ignorado, sem erro. Na 37a, `/convite` também é ignorado, porque a rota ainda não existe.
 */
export function voltaValida(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith('/app/')) return null
  if (valor.includes('\\') || [...valor].some((letra) => letra.charCodeAt(0) < 32)) return null
  try {
    const url = new URL(valor, BASE_FALSA)
    if (url.origin !== BASE_FALSA || !url.pathname.startsWith('/app/')) return null
    if (url.pathname === '/app/comecar' || url.pathname.startsWith('/app/comecar/')) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

/** O destino calculado; com conta incompleta, a pessoa passa antes pelo passo "Seu nome". */
export function destinoDepoisDeEntrar(volta: string | null, contaCompleta: boolean): string {
  // Na 37a o destino sem `volta` é a Conta, no lugar dos itens de convite e de família.
  const destino = voltaValida(volta) ?? '/app/conta'
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
