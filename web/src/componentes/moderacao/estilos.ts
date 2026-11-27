import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO, LINK_ALVO } from '../conta/Partes.tsx'

// As classes do painel de moderação que corrigem o que a conta (somente leitura) não prevê: a 390 px com
// 200 % de fonte o rótulo de um botão, uma etiqueta ou um link passava da largura da tela. Só tokens do tema.

/**
 * Deixa o rótulo do `.cm-botao` (que é `nowrap`) quebrar dentro da pílula. A altura mínima (56 px; 48 no app)
 * continua a do `.cm-botao`; `py-3` dá o respiro quando o rótulo ocupa mais de uma linha.
 */
const QUEBRA_DO_BOTAO = 'h-auto max-w-full py-3 text-center whitespace-normal wrap-anywhere'

/** Botão principal do painel: o `BOTAO_PRINCIPAL` da conta, com o rótulo que quebra. */
export const BOTAO_PRINCIPAL_QUEBRA = `${BOTAO_PRINCIPAL} ${QUEBRA_DO_BOTAO}`

/** Botão secundário do painel: o `BOTAO_SECUNDARIO` da conta, com o rótulo que quebra. */
export const BOTAO_SECUNDARIO_QUEBRA = `${BOTAO_SECUNDARIO} ${QUEBRA_DO_BOTAO}`

/**
 * No contêiner de etiquetas (um `flex flex-wrap`): a `Etiqueta` da base não recebe `className` e é `nowrap`.
 * Estas classes agem sobre a `.sb-etiqueta` filha direta e a deixam encolher e quebrar o texto.
 */
export const ETIQUETAS_QUEBRAM =
  '[&>.sb-etiqueta]:min-w-0 [&>.sb-etiqueta]:max-w-full [&>.sb-etiqueta]:whitespace-normal [&>.sb-etiqueta]:wrap-anywhere'

/** A aba do painel. O hover vem de `HOVER_DA_ABA`, que só entra na aba que não é a atual. */
export const LINK_DO_PAINEL = 'alvo-toque inline-flex items-center rounded-pilula px-4 font-medium no-underline'

/** A aba atual: o fundo de destaque do tema. Não leva hover, para não mudar de cara sob o ponteiro. */
export const ATUAL = 'bg-[var(--cor-destaque)] font-semibold text-[var(--cor-sobre-destaque)]'

/** Hover da aba que não é a atual: fundo de areia (cartão da noite na madrugada) e sublinhado com respiro. */
export const HOVER_DA_ABA = 'hover:bg-[var(--cor-papel-fundo)] hover:underline hover:underline-offset-4'

/**
 * Link fora de parágrafo do painel (Voltar, Ver conteúdo, Abrir...): o `LINK_ALVO` da conta só engrossava o
 * traço de 1,5 para 2 px, o que não se vê. No hover a cor passa à do texto (cacau, papel na madrugada, AA) e o
 * traço vai a 3 px (o `!` vence o `hover:decoration-2` do `LINK_ALVO`, que concorre na mesma propriedade); o
 * sublinhado continua sempre, então a mudança nunca é só de cor.
 */
export const LINK_ALVO_DO_PAINEL = `${LINK_ALVO} hover:text-[var(--cor-texto)] hover:decoration-[3px]!`
