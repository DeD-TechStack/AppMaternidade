import type { ReactNode, Ref } from 'react'
import { COMUM, textoDoErro } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'

// Peças pequenas e as classes que as telas da área de conta repetem. O visual sai das classes da
// base (`.botao`, `.alvo-toque`, `.texto-medida`...) e das variáveis `--cor-*` do tema.

/** Ação principal do formulário: 56 px, largura cheia. */
export const BOTAO_PRINCIPAL =
  'botao botao-principal botao-grande hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'

export const BOTAO_SECUNDARIO =
  'botao botao-secundario hover:bg-[var(--cor-papel-fundo)] disabled:cursor-not-allowed disabled:opacity-60'

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
      className="alvo-foco flex flex-col items-start gap-3 border-l-4 border-[var(--cor-destaque)] py-1 pl-3"
    >
      <p className="wrap-anywhere font-semibold text-[var(--cor-destaque)]">{textoDoErro(erro, familiaNome)}</p>
      {children}
      {repetivel && aoTentarDeNovo ? (
        <button type="button" className={BOTAO_SECUNDARIO} onClick={aoTentarDeNovo}>
          {COMUM.tentarDeNovo}
        </button>
      ) : null}
    </div>
  )
}
