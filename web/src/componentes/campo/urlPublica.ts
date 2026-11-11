/** O endereço de um arquivo de `web/public` (`/cenas/x` vira `<base>cenas/x`), respeitando a base do site. */
export function urlPublica(caminho: string): string {
  return `${import.meta.env.BASE_URL}${caminho.replace(/^\/+/, '')}`
}

/** O `srcSet` 1× e 2× de uma imagem WebP de `web/public`, a partir do caminho sem o sufixo (`/cenas/x`). */
export function srcSetWebp(base: string): string {
  return `${urlPublica(`${base}@1x.webp`)} 1x, ${urlPublica(`${base}@2x.webp`)} 2x`
}
