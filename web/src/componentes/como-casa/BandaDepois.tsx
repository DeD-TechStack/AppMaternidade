import { FaixaInteira, Legenda } from '../secoes/index.ts'
import { COMO_FUNCIONA as T, CENA_COLO } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

const ID = 'cf-depois'

/** Faixa 3 (cacau): o texto e M06 inteira, com a linha do chao continuada em `chao-noite` e a legenda sobre ela. */
export function BandaDepois() {
  return (
    <FaixaInteira fundo="cacau" idTitulo={ID}>
      <div className="cf-duas cf-duas-depois">
        <div className="cf-texto">
          <h2 id={ID} className="text-titulo-1 font-titulo cm-sec-titulo">
            {T.h2Depois}
          </h2>
          <p className="text-corpo font-texto cm-sec-texto">{T.pDepois}</p>
        </div>
        <div className="cf-colo">
          <span className="cf-chao" aria-hidden="true" />
          <img
            src={CENA_COLO.src}
            srcSet={CENA_COLO.srcSet}
            sizes={CENA_COLO.sizes}
            width={CENA_COLO.largura}
            height={CENA_COLO.altura}
            alt={T.altCena3}
            loading="lazy"
            decoding="async"
          />
          <Legenda texto={T.leg3} tom="noite" />
        </div>
      </div>
    </FaixaInteira>
  )
}
