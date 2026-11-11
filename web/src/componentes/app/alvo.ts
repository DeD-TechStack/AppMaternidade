// O alvo de toque dos botões e links das telas do app: 48 px de altura de dia (o `tamanho="app"` do Botao) e
// 56 px na madrugada, onde `--alvo-toque` (tema.css) vira 56 px (G11). A largura mínima de 44 px vem do
// `.cm-botao` e do `.alvo-toque`.
export const ALVO_APP = 'min-h-[max(48px,var(--alvo-toque))]'
