// Os tipos do conteúdo de Desenvolvimento: cada item traz a faixa de idade, as fontes e a data em que
// as fontes foram consultadas.

/** Uma fonte de saúde: o nome que a página mostra e o endereço público. */
export interface Fonte {
  nome: string
  url: string
}

interface ItemBase {
  id: string
  /** A faixa de idade a que o item se refere ("0 a 2 meses", "0 a 12 meses"). */
  faixa: string
  titulo: string
  fontes: readonly Fonte[]
  /** Quando as fontes foram consultadas (dd/mm/aaaa). */
  consultadoEm: string
}

/** Uma fase das ideias para brincar: as atividades, uma por linha. */
export interface Fase extends ItemBase {
  itens: readonly string[]
}

/** Uma parte de um artigo: o subtítulo e os parágrafos. */
export interface ParteDoArtigo {
  titulo: string
  textos: readonly string[]
}

/** Um artigo (tummy time, marcos): o resumo e as partes, na ordem. */
export interface Artigo extends ItemBase {
  resumo: string
  itens: readonly ParteDoArtigo[]
}
