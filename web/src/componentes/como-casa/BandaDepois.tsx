import { FaixaInteira, Legenda } from '../secoes/index.ts'
import { COMO_FUNCIONA as T, CENA_COLO } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

const ID = 'cf-depois'
const TAMANHO_CENA = '(min-width: 768px) 420px, 350px'

/** Cocoa band: the existing M06 scene, cropped below the light pool, with its caption directly beneath. */
export function BandaDepois() {
  return (
    <FaixaInteira fundo="cacau" idTitulo={ID}>
      <div className="cf-banda">
        <div className="cf-duas cf-duas-depois">
          <div className="cf-texto">
            <h2 id={ID} className="text-titulo-1 font-titulo cm-sec-titulo">
              {T.h2Depois}
            </h2>
            <p className="text-corpo font-texto cm-sec-texto">{T.pDepois}</p>
          </div>
          <div className="cf-colo">
            <span className="cf-chao" aria-hidden="true" />
            <picture>
              {CENA_COLO.avif ? <source type="image/avif" srcSet={CENA_COLO.avif} sizes={TAMANHO_CENA} /> : null}
              <img
                src={CENA_COLO.src}
                srcSet={CENA_COLO.srcSet}
                sizes={TAMANHO_CENA}
                width={CENA_COLO.largura}
                height={CENA_COLO.altura}
                alt={T.altCena3}
                loading="lazy"
                decoding="async"
              />
            </picture>
            <Legenda texto={T.leg3} tom="noite" />
          </div>
        </div>
      </div>
    </FaixaInteira>
  )
}
