// O que o passo de build grava no sw.js e o que o service worker lê dali.

export interface ConfigSw {
  /** O subcaminho do site, com / dos dois lados: "/" ou "/AppMaternidade/". */
  subcaminho: string
  /** Hash do conteúdo de todos os arquivos da casca: muda quando qualquer um muda. */
  versao: string
  /** Os caminhos da casca daquele build, cada um com o subcaminho na frente. */
  casca: readonly string[]
  /** O index.html guardado, que responde a toda navegação sem rede. */
  paginaInicial: string
}

/** Todo cache deste site começa com isto. */
export const PREFIXO_DO_CACHE = 'appmaternidade-casca'

/**
 * O prefixo dos caches deste site neste subcaminho. Termina em ":" e leva o subcaminho: num mesmo
 * domínio (GitHub Pages) outro site, ou a raiz, nunca tem o prefixo de um cache nosso.
 */
export function prefixoDoCache(config: Pick<ConfigSw, 'subcaminho'>): string {
  return `${PREFIXO_DO_CACHE}:${config.subcaminho}:`
}

/** O nome do cache de uma versão. */
export function nomeDoCache(config: Pick<ConfigSw, 'subcaminho' | 'versao'>): string {
  return prefixoDoCache(config) + config.versao
}
