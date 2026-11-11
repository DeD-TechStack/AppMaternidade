import { useId } from 'react'
import { Botao } from '../base/Botao.tsx'
import { Ilustracao } from '../campo/Ilustracao.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import './inicio.css'

/**
 * O fechamento: um painel de cacau, centrado, com uma frase em papel e um só primário (que no cacau
 * vira a pílula de mel), para não se fundir com o rodapé de mel logo abaixo. A babá no tapete fica num
 * disco de mel que sai pela borda de cima do painel (entra 48 px nele), de um lado, longe do título e
 * do botão: o traço preto nunca vai sobre o cacau.
 */
export function Fechamento() {
  const id = useId()
  const { titulo, primario } = INICIO.fechamento

  return (
    <PainelCampo variante="cacau" como="section" aria-labelledby={id} className="in-fechamento">
      <span className="in-fechamento-disco">
        <Ilustracao nome="baba-tapete" className="in-fechamento-arte" carregamento="eager" />
      </span>
      <Titulo nivel="h2" id={id} linhas={titulo} />
      <Botao to={primario.destino}>{primario.rotulo}</Botao>
    </PainelCampo>
  )
}
