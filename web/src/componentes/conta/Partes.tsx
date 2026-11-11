import type { ReactNode, Ref } from 'react'
import { CircleAlert, Info } from 'lucide-react'
import { AVISO_BANCO_DEMONSTRACAO, COMUM, textoDoErro } from '../../conteudo/conta.ts'
import { modoDados, type ErroDados } from '../../dados/comum.ts'

// Peças pequenas e as classes que as telas da área de conta repetem. O visual sai das classes do
// "Campo de mel" (`.cm-botao`, `.cm-campo-*`...) e das variáveis `--cor-*` do tema, que trocam na
// madrugada.

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

/**
 * O aviso do banco de demonstração, acima dos formulários que gravam dados da família e do bebê.
 * Só no modo Supabase: sem banco, o aviso do site (AvisoDemonstracao) já está na tela.
 */
export function AvisoDoBanco() {
  if (modoDados() !== 'supabase') return null
  return (
    <p
      data-aviso="banco-de-demonstracao"
      className="cm-pequeno flex items-start gap-3 rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3"
    >
      <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{AVISO_BANCO_DEMONSTRACAO}</span>
    </p>
  )
}

/** O estado carregando: o texto, sem formulário clicável. */
export function Carregando() {
  return <p className="py-2">{COMUM.carregando}</p>
}

/**
 * A região de status da tela: única, sempre no DOM (para o leitor de tela anunciar o que entra
 * nela), não move o foco e não some sozinha. Com texto, leva um ícone: a mensagem nunca é só cor.
 */
export function RegiaoStatus({ mensagem }: { mensagem: string | null }) {
  return (
    <div
      role="status"
      className={
        mensagem
          ? 'flex items-start gap-3 rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 font-medium wrap-anywhere'
          : 'sr-only'
      }
    >
      {mensagem ? <Info size={22} aria-hidden="true" className="mt-0.5 shrink-0" /> : null}
      {mensagem}
    </div>
  )
}

interface ResumoErroProps {
  erro: ErroDados
  /** O botão "Tentar de novo" aparece quando há a ação e a classe do erro pede repetição. */
  aoTentarDeNovo?: () => void
  repetivel?: boolean
  refResumo?: Ref<HTMLDivElement>
  familiaNome?: string
  /** Uma frase no lugar da do catálogo (a da regra "rede numa escrita" de objeto novo). */
  texto?: string
  children?: ReactNode
}

/**
 * A frase do catálogo no topo do formulário ou da seção; o foco vai para ele num envio com erro.
 * Ícone, contorno e palavras: o erro nunca depende só da cor.
 */
export function ResumoErro({
  erro,
  aoTentarDeNovo,
  repetivel = false,
  refResumo,
  familiaNome,
  texto,
  children,
}: ResumoErroProps) {
  return (
    <div
      ref={refResumo}
      role="alert"
      tabIndex={-1}
      className="alvo-foco flex w-full flex-col items-start gap-3 rounded-campo border-[1.5px] border-[var(--cor-texto)] bg-[var(--cor-cartao)] p-4"
    >
      <p className="flex items-start gap-3 font-medium wrap-anywhere">
        <CircleAlert size={22} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>{texto ?? textoDoErro(erro, familiaNome)}</span>
      </p>
      {children}
      {repetivel && aoTentarDeNovo ? (
        <button type="button" className={BOTAO_SECUNDARIO} data-tamanho="app" onClick={aoTentarDeNovo}>
          {COMUM.tentarDeNovo}
        </button>
      ) : null}
    </div>
  )
}
