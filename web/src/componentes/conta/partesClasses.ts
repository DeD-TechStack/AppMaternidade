/** Botão desativado de verdade (`disabled`): areia com o texto apagado, e o hover não muda nada. */
const DESATIVADO =
  'disabled:cursor-not-allowed disabled:border-[var(--cor-desativado-fundo)] disabled:bg-[var(--cor-desativado-fundo)] ' +
  'disabled:text-[var(--cor-desativado-texto)]'

// O tamanho dos botões vem de `.cm-botao` (site.css: 56 px; 48 com `data-tamanho="app"`). Eles não levam
// `alvo-toque`: a regra dessa classe, no index.css, é mais tardia e baixaria o botão para 44 px.

/** Ação principal do formulário: pílula de cacau (mel na madrugada), 56 px, largura cheia. */
export const BOTAO_PRINCIPAL = `cm-botao cm-botao-primario w-full ${DESATIVADO}`

/** Ação secundária: pílula de contorno de 1,5 px; no hover se enche. Nas telas do app leva `data-tamanho="app"` (48 px). */
export const BOTAO_SECUNDARIO = `cm-botao cm-botao-contorno ${DESATIVADO}`

/** Link fora de parágrafo: sublinhado sempre, na cor de link do tema, e alvo de 44 px. */
export const LINK_ALVO =
  'alvo-toque inline-flex items-center font-medium text-[var(--cor-link)] underline decoration-[1.5px] underline-offset-4 ' +
  'hover:decoration-2'
