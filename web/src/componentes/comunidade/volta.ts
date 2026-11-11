// O `volta` da entrada na comunidade (MAT-40:RF-03): o destino da ação que levou a pessoa à C5.

const BASE_FALSA = 'http://local.invalid'
const ENTRADA = '/app/comunidade/entrar'

/**
 * O `volta`, se é um caminho interno da Comunidade: começa por `/app/comunidade/` ou é
 * `/app/comunidade`, sem `//`, sem esquema e sem ser a própria entrada. Qualquer outro formato é
 * ignorado, sem erro (a pessoa volta à C1).
 */
export function voltaDaComunidade(valor: string | null | undefined): string | null {
  if (!valor || valor.includes('//') || valor.includes('\\')) return null
  if ([...valor].some((letra) => letra.charCodeAt(0) < 32)) return null
  if (valor !== '/app/comunidade' && !valor.startsWith('/app/comunidade/') && !/^\/app\/comunidade[?#]/.test(valor)) return null
  try {
    const url = new URL(valor, BASE_FALSA)
    if (url.origin !== BASE_FALSA) return null
    if (url.pathname === ENTRADA || url.pathname.startsWith(`${ENTRADA}/`)) return null
    if (url.pathname !== '/app/comunidade' && !url.pathname.startsWith('/app/comunidade/')) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

/** O link para a C5 com o destino da ação. */
export const caminhoDeEntrada = (destino: string): string => `${ENTRADA}?volta=${encodeURIComponent(destino)}`
