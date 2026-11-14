import { useId } from 'react'
import { Botao } from '../base/Botao.tsx'
import { Colunas } from '../base/layout/Colunas.tsx'
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
        {/* Texto (5fr) e cena (7fr), `midia` entre eles. A primitiva quebra em 992; o inicio.css mantém o 960 de hoje. */}
        <Colunas fracoes="5fr 7fr" vao="midia" aPartirDe={992} alinhar="centro" className="in-faixa-grade">
          <Pilha vao="grupo" dataH="coluna" className="in-faixa-texto">
            <Pilha vao="pilha">
              <Titulo nivel="h2" id={id} linhas={titulo} />
              <p className="cm-lide">{lide}</p>
            </Pilha>
            <Botao variante="mel" to={botao.destino}>
              {botao.rotulo}
            </Botao>
          </Pilha>
          <FotoCena
            base={cena.base}
            largura={768}
            altura={512}
            alt={cena.alt}
            className="in-faixa-foto"
            dataH="coluna"
          />
        </Colunas>
      </RevelacaoPorBaixo>
    </Secao>
  )
}
