import { useId } from 'react'
import { Botao } from '../base/Botao.tsx'
import { Pilha } from '../base/layout/Pilha.tsx'
import { Secao } from '../base/layout/Secao.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
import { RevelacaoPorBaixo } from '../../movimento/RevelacaoPorBaixo.tsx'
import { FotoCena } from './FotoCena.tsx'
import './inicio.css'

/**
 * A faixa de cacau do modo madrugada: o texto de papel com o primário de mel e, ao lado, os dois
 * tablets sobre o cacau, com o brilho de mel atrás. Nada de traço preto aqui.
 */
export function FaixaMadrugada() {
  const id = useId()
  const { titulo, lide, botao, cena } = INICIO.madrugada

  return (
    <Secao
      variante="painel"
      painel="cacau"
      aria-labelledby={id}
      className="in-faixa"
      classeCaixa="cm-faixa-cacau in-faixa-caixa"
    >
      <div className="cm-faixa-brilho" aria-hidden="true" data-brilho="" />
      {/* O mesmo recipiente da revelação (M6) da FaixaCacau da base, agora dentro da caixa de cor do painel. */}
      <RevelacaoPorBaixo variante="M6" className="cm-faixa-conteudo">
        {/* Duas metades a partir de 960 (o ponto de quebra de hoje, em inicio.css), `midia` entre elas. */}
        <div className="in-faixa-grade">
          <Pilha vao="grupo" className="in-faixa-texto">
            <Pilha vao="pilha">
              <Titulo nivel="h2" id={id} linhas={titulo} />
              <p className="cm-lide">{lide}</p>
            </Pilha>
            <Botao variante="mel" to={botao.destino}>
              {botao.rotulo}
            </Botao>
          </Pilha>
          <FotoCena base={cena.base} largura={768} altura={512} alt={cena.alt} className="in-faixa-foto" />
        </div>
      </RevelacaoPorBaixo>
    </Secao>
  )
}
