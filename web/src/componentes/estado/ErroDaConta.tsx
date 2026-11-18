import type { ReactNode, Ref } from 'react'
import { COMUM, textoDoErro } from '../../conteudo/conta.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { ErroDeLeitura } from './ErroDeLeitura.tsx'

interface Props {
  erro: ErroDados
  /** O botão "Tentar de novo" aparece quando há a ação e a tela diz que o erro se repete. */
  aoTentarDeNovo?: () => void
  repetivel?: boolean
  refResumo?: Ref<HTMLDivElement>
  familiaNome?: string
  /** Uma frase no lugar da do catálogo (a da regra "rede numa escrita" de objeto novo). */
  texto?: string
  children?: ReactNode
}

/** O erro da área de conta na peça comum: a frase do catálogo (ou a que a tela dá) e, se repete, "Tentar de novo". */
export function ErroDaConta({ erro, aoTentarDeNovo, repetivel = false, refResumo, familiaNome, texto, children }: Props) {
  return (
    <ErroDeLeitura
      refErro={refResumo}
      texto={texto ?? textoDoErro(erro, familiaNome)}
      aoTentarDeNovo={repetivel ? aoTentarDeNovo : undefined}
      rotuloDeNovo={COMUM.tentarDeNovo}
    >
      {children}
    </ErroDeLeitura>
  )
}
