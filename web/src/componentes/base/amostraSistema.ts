// O que a página /sistema mostra da escala de espaço e da escala de tipo do web/DESIGN.md (`## Layout` e
// `## Typography`). Os nomes são os dos papéis e dos níveis; os valores não ficam aqui: a barra de cada papel lê
// `--espaco-<papel>` (tema gerado) e mostra o valor calculado na largura de agora.

/** Os oito papéis de espaço, na ordem da tabela "qual token em qual vão". */
export const PAPEIS_DE_ESPACO = ['junto', 'pilha', 'grupo', 'bloco', 'midia', 'secao', 'secao-ampla', 'painel'] as const

/** A frase fixa de exemplo de cada nível de tipo (SPEC H3, H3:RF-02). */
export const FRASE_DE_EXEMPLO = 'Quanto tempo ela mamou?'

/**
 * Os nove níveis de tipo, com as classes do tema (`text-<nível>` traz tamanho e entrelinha; a família e o peso são
 * os da tabela do DESIGN.md: títulos em Literata 600, abertura, corpo e pequeno em Outfit 400, sobretítulo em Outfit 600).
 */
export const NIVEIS_DE_TIPO = [
  { nivel: 'exibicao', classes: 'text-exibicao font-titulo font-semibold' },
  { nivel: 'titulo-1', classes: 'text-titulo-1 font-titulo font-semibold' },
  { nivel: 'titulo-2', classes: 'text-titulo-2 font-titulo font-semibold' },
  { nivel: 'titulo-3', classes: 'text-titulo-3 font-titulo font-semibold' },
  { nivel: 'titulo-4', classes: 'text-titulo-4 font-titulo font-semibold' },
  { nivel: 'abertura', classes: 'text-abertura font-texto font-normal' },
  { nivel: 'corpo', classes: 'text-corpo font-texto font-normal' },
  { nivel: 'pequeno', classes: 'text-pequeno font-texto font-normal' },
  { nivel: 'sobretitulo', classes: 'text-sobretitulo font-texto font-semibold' },
] as const
