import type { ReactNode } from 'react'
import { RevelacaoPorBaixo } from '../../movimento/RevelacaoPorBaixo.tsx'
import { PainelCampo } from './PainelCampo.tsx'

interface Props {
  /** Liga o brilho de mel (`--brilho-mel`) atrás do conteúdo. */
  brilho?: boolean
  id?: string
  'aria-labelledby'?: string
  children: ReactNode
  className?: string
}

/**
 * Faixa de cacau (DESIGN.md 4): o painel de cacau com o texto de papel. O conteúdo sai de baixo,
 * de -50 % a 0, preso à rolagem (M6); com movimento reduzido fica parado. O brilho de mel, quando
 * ligado, é só fundo. Nada de ilustração de traço aqui: o traço preto não vai sobre o cacau.
 */
export function FaixaCacau({ brilho = false, id, children, className, ...aria }: Props) {
  return (
    <PainelCampo
      variante="cacau"
      como="section"
      id={id}
      className={['cm-faixa-cacau', className].filter(Boolean).join(' ')}
      {...aria}
    >
      {brilho ? <div className="cm-faixa-brilho" aria-hidden="true" data-brilho="" /> : null}
      <RevelacaoPorBaixo variante="M6" className="cm-faixa-conteudo">
        {children}
      </RevelacaoPorBaixo>
    </PainelCampo>
  )
}
