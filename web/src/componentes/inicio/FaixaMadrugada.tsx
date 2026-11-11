import { useId } from 'react'
import { Botao } from '../base/Botao.tsx'
import { FaixaCacau } from '../campo/FaixaCacau.tsx'
import { Titulo } from '../campo/Titulo.tsx'
import { INICIO } from '../../conteudo/textos.ts'
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
    <FaixaCacau brilho aria-labelledby={id} className="in-faixa">
      <div className="in-faixa-grade">
        <div className="cm-faixa-texto">
          <Titulo nivel="h2" id={id} linhas={titulo} />
          <p className="cm-lide">{lide}</p>
          <Botao variante="mel" to={botao.destino}>
            {botao.rotulo}
          </Botao>
        </div>
        <FotoCena base={cena.base} largura={768} altura={512} alt={cena.alt} />
      </div>
    </FaixaCacau>
  )
}
