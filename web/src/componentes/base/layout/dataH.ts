/**
 * O valor do `data-h` de uma primitiva: o dela por último, depois os que o chamador quer somar (`"coluna cartao"`).
 * A medida do H-3 acha a peça pelo seletor `[data-h~='cartao']`, que vale para um valor ou para vários.
 */
export function juntarDataH(extra: string | undefined, proprio: string): string {
  return [extra, proprio].filter(Boolean).join(' ')
}
