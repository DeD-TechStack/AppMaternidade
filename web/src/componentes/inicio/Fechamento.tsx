import { useId } from 'react'
import { Botao } from '../base/Botao.tsx'
import { Ilustracao } from '../campo/Ilustracao.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import './inicio.css'

/**
 * O fechamento: um painel de mel, centrado, com uma frase e um só primário. A babá no tapete sai pela
 * borda de cima do painel (entra 48 px nele), de um lado, longe do título e do botão.
 */
export function Fechamento() {
  const id = useId()
  const { titulo, primario } = INICIO.fechamento

  return (
    <PainelCampo variante="mel" luz como="section" aria-labelledby={id} className="in-fechamento">
      <Ilustracao nome="baba-tapete" className="in-fechamento-arte" carregamento="eager" />
      <Titulo nivel="h2" id={id} linhas={titulo} />
      <Botao to={primario.destino}>{primario.rotulo}</Botao>
    </PainelCampo>
  )
}
