import { Legenda } from '../inicio-composicao/pecas.tsx'
import { CENA_M06, COMO_FUNCIONA as T } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

const ID = 'cf-depois'

/**
 * Faixa 3 (18:00, noite): "Anoto depois." A noite entra pela direita sobre o chão anterior; recorte M06 com a
 * luminária acesa em pé no chão de noite e legenda das 18:00 na faixa do chão.
 */
export function BandaDepois() {
  return (
    <section className="cf-faixa cf-depois" aria-labelledby={ID}>
      <div className="cf-depois-dentro">
        <div className="cf-depois-grade">
          <div className="co-texto cf-depois-texto">
            <h2 id={ID} className="co-h2">
              {T.h2Depois}
            </h2>
            <p className="co-p">{T.pDepois}</p>
          </div>
          <div className="co-placa cf-m06">
            <img
              src={CENA_M06.src}
              width={CENA_M06.largura}
              height={CENA_M06.altura}
              alt={T.altCena3}
              loading="lazy"
              decoding="async"
            />
            <img
              className="co-luz"
              src={CENA_M06.luz}
              width={CENA_M06.luzLargura}
              height={CENA_M06.luzAltura}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <div className="cf-depois-chao">
          <Legenda texto={T.leg3} className="cf-depois-leg" />
        </div>
      </div>
    </section>
  )
}
