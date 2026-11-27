import type { Imagem } from '../secoes/contrato.ts'

/** O endereço de um arquivo de `web/public` (`/cenas/x` vira `<base>cenas/x`), respeitando a base do site. */
export function urlPublica(caminho: string): string {
  return `${import.meta.env.BASE_URL}${caminho.replace(/^\/+/, '')}`
}

/** O `srcSet` 1× e 2× de uma imagem WebP de `web/public`, a partir do caminho sem o sufixo (`/cenas/x`). */
export function srcSetWebp(base: string): string {
  return `${urlPublica(`${base}@1x.webp`)} 1x, ${urlPublica(`${base}@2x.webp`)} 2x`
}

/**
 * Um endereço com a base do site, sem repetir a base. Só um caminho raiz-absoluto (uma só `/` na frente) é reescrito;
 * ficam como estão: o que já começa pela base (quando a base não é só "/"), `http(s):`, `data:`, `//host`, o caminho
 * relativo e qualquer outro texto que não comece por `/`. Por isso aplicar duas vezes dá o mesmo resultado.
 */
function comBase(endereco: string): string {
  const base: string = import.meta.env.BASE_URL
  if (!/^\/(?!\/)/.test(endereco)) return endereco
  if (base !== '/' && endereco.startsWith(base)) return endereco
  return urlPublica(endereco)
}

/** O `srcSet` com a base em cada candidato (`url descritor`, separados por vírgula); espaços e descritores ficam. */
function srcSetComBase(srcSet: string): string {
  return srcSet.replace(/(^|,)(\s*)([^\s,]+)/g, (_t, antes: string, espaco: string, url: string) => `${antes}${espaco}${comBase(url)}`)
}

/**
 * A mesma `Imagem` com a base do site no `src` e em cada candidato do `srcSet`: o único ponto por onde um arquivo de
 * `web/public` descrito como `Imagem` ganha a base do Pages (`/AppMaternidade/previa/`). Devolve uma cópia, é
 * idempotente (uma URL que já leva a base, ou que veio do Vite com ela, fica como está) e lê a base na chamada.
 */
export function imagemPublica<T extends Imagem>(imagem: T): T {
  const copia = { ...imagem, src: comBase(imagem.src) }
  if (imagem.srcSet !== undefined) copia.srcSet = srcSetComBase(imagem.srcSet)
  return copia
}
