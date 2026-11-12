// A navegação logada é o cabeçalho do site. Cada área declara os próprios itens (`navegacao<Area>`
// no arquivo dela), e `areas.tsx` junta e ordena. Só entra item de tela que existe: nenhum
// "Em breve".

export interface ItemNavegacao {
  chave: 'hoje' | 'sessao' | 'comunidade' | 'familia'
  rotulo: string
  /** A posição no cabeçalho: menor vem primeiro. */
  ordem: number
  /** A rota do item. */
  destino: string
  /** Os caminhos em que o item vale como "a página atual". */
  atualEm: string[]
}
