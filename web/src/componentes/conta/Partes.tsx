import type { ReactNode, Ref } from 'react'
import { CircleAlert, Info } from 'lucide-react'
import { AVISO_BANCO_DEMONSTRACAO, COMUM, textoDoErro } from '../../conteudo/conta.ts'
import { modoDados, type ErroDados } from '../../dados/comum.ts'
import { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO } from './partesClasses.ts'

export { BOTAO_PRINCIPAL, BOTAO_SECUNDARIO }
export { LINK_ALVO } from './partesClasses.ts'

// Peças pequenas e as classes que as telas da área de conta repetem. O visual sai das classes do
// "Campo de mel" (`.cm-botao`, `.cm-campo-*`...) e das variáveis `--cor-*` do tema, que trocam na
// madrugada.

/**
 * Ação destrutiva (excluir a conta): contorno de 2 px e texto na cor de erro, com o mesmo contraste
 * também desativada (a regra do negócio a desativa, mas ela não pode parecer apagada). A cor é a variável
 * `--cor-erro` do tema, quando ela existir; sem ela vale a tinta do texto (cacau, papel na madrugada).
 * No hover se enche, e desativada o hover não muda nada.
 */
export const BOTAO_PERIGO =
  'cm-botao cm-botao-contorno border-2 font-semibold border-[var(--cor-erro,var(--cor-texto))] ' +
  'text-[var(--cor-erro,var(--cor-texto))] hover:bg-[var(--cor-erro,var(--cor-texto))] hover:text-[var(--cor-fundo)] ' +
  'disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--cor-erro,var(--cor-texto))]'

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
          ? 'flex max-w-[40rem] items-start gap-3 rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 font-medium wrap-anywhere'
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
      className="alvo-foco flex w-full flex-col items-start gap-3 rounded-campo border-2 border-[var(--cor-erro,var(--cor-texto))] bg-[var(--cor-cartao)] p-4"
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
