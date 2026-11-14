import { Stethoscope } from 'lucide-react'
import { AVISO_SAUDE } from '../../conteudo/desenvolvimento/pagina.ts'
import { Cartao } from '../base/layout/index.ts'
import './publicas-destaque.css'

/**
 * O aviso de saúde de Desenvolvimento, com o texto exato, uma vez, perto do topo. É um aviso médico,
 * não de demonstração: só `data-aviso-saude` (o `data-aviso` é o da casca, no rodapé).
 */
export function AvisoSaude() {
  return (
    <Cartao className="pd-aviso-saude" data-aviso-saude="">
      <Stethoscope aria-hidden="true" strokeWidth={1.75} />
      <span>{AVISO_SAUDE}</span>
    </Cartao>
  )
}
