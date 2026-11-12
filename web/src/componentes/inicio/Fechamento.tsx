import { useId } from 'react'
import { Botao } from '../base/Botao.tsx'
import { Ilustracao } from '../campo/Ilustracao.tsx'
import { PainelCampo } from '../campo/PainelCampo.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import './inicio.css'

/**
 * O fechamento: um painel de cacau da altura do conteúdo, com uma frase em papel e um só primário (que
 * no cacau vira a pílula de mel) na borda esquerda, para não se fundir com o rodapé de mel logo abaixo.
 * O bebê no tapete fica num disco de mel que morde a borda de cima do painel, à direita, longe do
 * título e do botão: o traço preto nunca vai sobre o cacau. (A babá no tapete está nos relatos; aqui vai o desenho que sobra, para
 * nenhum se repetir na página.)
 */
export function Fechamento() {
  const id = useId()
  const { titulo, primario } = INICIO.fechamento

  return (
    <PainelCampo variante="cacau" como="section" aria-labelledby={id} className="in-fechamento">
      <span className="in-fechamento-disco">
        <Ilustracao nome="tummy-time" className="in-fechamento-arte" carregamento="eager" />
      </span>
      <Titulo nivel="h2" id={id} linhas={titulo} />
      <Botao to={primario.destino}>{primario.rotulo}</Botao>
    </PainelCampo>
  )
}
