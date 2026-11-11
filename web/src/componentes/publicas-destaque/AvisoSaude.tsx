import { Stethoscope } from 'lucide-react'
import { AVISO_SAUDE } from '../../conteudo/desenvolvimento/pagina.ts'
import './publicas-destaque.css'

/** O aviso de saúde de Desenvolvimento, com o texto exato: o único aviso da página, perto do topo. */
export function AvisoSaude() {
  return (
    <p className="pd-aviso-saude" data-aviso="" data-aviso-saude="">
      <Stethoscope aria-hidden="true" strokeWidth={1.75} />
      <span>{AVISO_SAUDE}</span>
    </p>
  )
}
