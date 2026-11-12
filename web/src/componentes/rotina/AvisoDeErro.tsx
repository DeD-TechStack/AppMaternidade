import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router'
import { CircleAlert } from 'lucide-react'
import { COMUM, LIGACOES, ehErroRepetivel, textoDoErro } from '../../conteudo/rotina.ts'
import type { ErroDados, Papel } from '../../dados/comum.ts'
import { BOTAO_SECUNDARIO, LINK_ALVO } from '../conta/Partes.tsx'

interface Props {
  erro: ErroDados
  /** `true` numa escrita: a frase de rede não afirma se a mudança foi salva. */
  escrita?: boolean
  papel?: Papel | null
  /** O botão "Tentar de novo" aparece quando há a ação e a classe do erro pede repetição. */
  aoTentarDeNovo?: () => void
  refAviso?: Ref<HTMLDivElement>
  className?: string
  children?: ReactNode
}

/**
 * A frase do catálogo (Anexo B) no topo da seção ou do formulário. Ícone, contorno e palavras: o erro nunca
 * depende só da cor. Código e mensagem do banco nunca aparecem.
 */
export function AvisoDeErro({ erro, escrita = false, papel = null, aoTentarDeNovo, refAviso, className, children }: Props) {
  return (
    <div
      ref={refAviso}
      role="alert"
      tabIndex={-1}
      data-erro-rotina={erro.chave}
      className={`alvo-foco flex w-full flex-col items-start gap-3 rounded-campo border-[1.5px] border-(--cor-texto) bg-(--cor-cartao) p-4 ${className ?? ''}`}
    >
      <p className="flex items-start gap-3 font-medium wrap-anywhere">
        <CircleAlert size={22} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>{textoDoErro(erro, { escrita, papel })}</span>
      </p>
      {children}
      {erro.chave === 'registro_excluido' ? (
        <Link to="/app/lixeira" state={{ foco: 'titulo' }} className={LINK_ALVO}>
          {LIGACOES.abrirALixeira}
        </Link>
      ) : null}
      {aoTentarDeNovo && ehErroRepetivel(erro) ? (
        <button type="button" className={BOTAO_SECUNDARIO} data-botao="contorno" data-tamanho="app" onClick={aoTentarDeNovo}>
          {COMUM.tentarDeNovo}
        </button>
      ) : null}
    </div>
  )
}
