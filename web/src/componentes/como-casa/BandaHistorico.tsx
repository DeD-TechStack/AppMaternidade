import { Legenda, Telefone } from '../inicio-composicao/pecas.tsx'
import { ARTE_COMO, COMO_FUNCIONA as T } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

const ID = 'cf-historico'

/**
 * Faixa 2 (15:00, dia): "Olha no histórico." Sem placa de cena (M04 sai desta página; A-CF15 aguarda arte sem
 * espaço reservado). Texto à esquerda, celular do Histórico em pé no chão de dia à direita e legenda das 15:00 no chão.
 */
export function BandaHistorico() {
  return (
    <section className="cf-faixa cf-hist" aria-labelledby={ID}>
      <div className="cf-hist-grade">
        <div className="co-texto cf-hist-texto">
          <h2 id={ID} className="co-h2">
            {T.h2Hist}
          </h2>
          <p className="co-p">{T.pHist}</p>
        </div>
        <Telefone
          arte={ARTE_COMO}
          nome="historico"
          alt={T.altTela1}
          sizes="(min-width: 69em) 370px, 300px"
          className="cf-hist-fone"
        />
      </div>
      <div className="cf-hist-chao">
        <Legenda texto={T.leg2} className="cf-hist-leg" />
      </div>
    </section>
  )
}
