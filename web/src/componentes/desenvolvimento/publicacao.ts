import type { ItemDeConteudo } from './itens.ts'

/**
 * A regra de publicação (DES-06, item 5), numa função só. No site de produção, um item com
 * `publicado: false` não aparece; fora dele, todo item aparece. O valor padrão de `siteDeProducao` é
 * `import.meta.env.PROD`, lido só aqui. Os testes passam os dois parâmetros.
 */
export function itensVisiveis(
  itens: readonly ItemDeConteudo[],
  siteDeProducao: boolean = import.meta.env.PROD,
): ItemDeConteudo[] {
  return siteDeProducao ? itens.filter((item) => item.publicado) : [...itens]
}
