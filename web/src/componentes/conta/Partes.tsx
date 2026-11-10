import type { ReactNode, Ref } from 'react'
import { COMUM, textoDoErro } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'

// Peças pequenas e as classes que as telas da área de conta repetem. O visual sai das classes da
// base (`.botao`, `.alvo-toque`, `.texto-medida`...) e das variáveis `--cor-*` do tema.

/** Ação principal: 56 px, largura cheia. */
export const BOTAO_PRINCIPAL =
  'botao botao-principal botao-grande hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'

/**
 * A ação principal de um formulário da página: largura cheia no celular e, a partir de 60 rem, a
 * largura do conteúdo (mínimo de 12 rem, 56 px de altura), à esquerda da coluna.
 */
export const BOTAO_DO_FORMULARIO = `${BOTAO_PRINCIPAL} min-[60rem]:w-fit min-[60rem]:min-w-[12rem] min-[60rem]:self-start`

export const BOTAO_SECUNDARIO =
  'botao botao-secundario hover:bg-[var(--cor-papel-fundo)] disabled:cursor-not-allowed disabled:opacity-60'

/**
 * A ação perigosa (excluir a conta): contorno e texto no destaque, e o preenchimento no hover
 * (só habilitado). Desabilitado, ganha cor e borda próprias em vez de opacidade: o texto na tinta
 * sobre o papel fundo e a borda tracejada na cor da linha, que passam de 4,5:1 e 3:1 nos dois temas.
 */
export const BOTAO_PERIGO =
  'botao botao-secundario border-2 border-[var(--cor-destaque)] text-[var(--cor-destaque)] enabled:hover:bg-[var(--cor-destaque)] enabled:hover:text-[var(--cor-sobre-destaque)] disabled:cursor-not-allowed disabled:border-dashed disabled:border-[var(--cor-linha)] disabled:bg-[var(--cor-papel-fundo)] disabled:text-[var(--cor-texto)]'

/** O `h1` das telas logadas: a escala de exibição; o foco por programa não desenha caixa. */
export const TITULO_DE_EXIBICAO =
  'titulo-tela text-[clamp(2.75rem,6vw,4.5rem)] font-extrabold leading-none tracking-[-0.02em] outline-none'

/** O link do índice lateral da Conta: o da seção atual leva peso 700 e o traço de 3 px. */
export const ITEM_DO_INDICE = 'alvo-toque -ml-px flex items-center border-l-[3px] px-3'
export const ITEM_DO_INDICE_ATIVO = 'border-[var(--cor-destaque)] font-bold no-underline'
export const ITEM_DO_INDICE_INATIVO = 'border-transparent no-underline hover:underline'

/** Link fora de parágrafo: alvo de 44 px e o sublinhado da base. */
export const LINK_ALVO = 'alvo-toque inline-flex items-center font-semibold'

/** O estado carregando: o texto, sem formulário clicável. */
export function Carregando() {
  return <p className="py-2">{COMUM.carregando}</p>
}

/**
 * A região de status da tela: única, sempre no DOM (para o leitor de tela anunciar o que entra
 * nela), não move o foco e não some sozinha.
 */
export function RegiaoStatus({ mensagem }: { mensagem: string | null }) {
  return (
    <div role="status" className={mensagem ? 'texto-info font-semibold wrap-anywhere' : 'sr-only'}>
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
  children?: ReactNode
}

/** A frase do catálogo no topo do formulário ou da seção; o foco vai para ele num envio com erro. */
export function ResumoErro({ erro, aoTentarDeNovo, repetivel = false, refResumo, familiaNome, children }: ResumoErroProps) {
  return (
    <div
      ref={refResumo}
      role="alert"
      tabIndex={-1}
      className="alvo-foco flex flex-col items-start gap-3 rounded-[8px] border-2 border-[var(--cor-destaque)] px-4 py-3"
    >
      <p className="wrap-anywhere font-semibold">{textoDoErro(erro, familiaNome)}</p>
      {children}
      {repetivel && aoTentarDeNovo ? (
        <button type="button" className={BOTAO_SECUNDARIO} onClick={aoTentarDeNovo}>
          {COMUM.tentarDeNovo}
        </button>
      ) : null}
    </div>
  )
}
