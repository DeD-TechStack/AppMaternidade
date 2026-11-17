import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router'
import { COMUM, LIGACOES, ehErroRepetivel, textoDoErro } from '../../conteudo/rotina.ts'
import type { ErroDados, Papel } from '../../dados/comum.ts'
import { LINK_ALVO } from '../conta/Partes.tsx'
import { ErroDeLeitura } from './ErroDeLeitura.tsx'

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
 * O erro da Rotina na peça comum: a frase do catálogo (Anexo B), o `data-erro-rotina` com a chave, o link da lixeira
 * para `registro_excluido` e "Tentar de novo" só nos erros que repetem a chamada.
 */
export function ErroDaRotina({ erro, escrita = false, papel = null, aoTentarDeNovo, refAviso, className, children }: Props) {
  return (
    <ErroDeLeitura
      refErro={refAviso}
      className={className}
      data-erro-rotina={erro.chave}
      texto={textoDoErro(erro, { escrita, papel })}
      aoTentarDeNovo={ehErroRepetivel(erro) ? aoTentarDeNovo : undefined}
      rotuloDeNovo={COMUM.tentarDeNovo}
    >
      {children}
      {erro.chave === 'registro_excluido' ? (
        <Link to="/app/lixeira" state={{ foco: 'titulo' }} className={LINK_ALVO}>
          {LIGACOES.abrirALixeira}
        </Link>
      ) : null}
    </ErroDeLeitura>
  )
}
