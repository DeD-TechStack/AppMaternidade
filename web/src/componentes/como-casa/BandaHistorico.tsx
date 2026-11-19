import { FaixaInteira, Legenda, ProdutoEmMoldura } from '../secoes/index.ts'
import { COMO_FUNCIONA as T, CENA_TUMMY, MOLDURA_DIA, TELA_HISTORICO } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

const ID = 'cf-historico'

/** Faixa 2 (papel): a moldura do Historico na direita; a esquerda traz a legenda do heroi, o texto e a cena das 15:00. */
export function BandaHistorico() {
  return (
    <FaixaInteira fundo="papel" idTitulo={ID}>
      <div className="cf-duas cf-duas-hist">
        <div className="cf-lado">
          <ProdutoEmMoldura tela={{ ...TELA_HISTORICO, alt: T.altTela1 }} moldura={MOLDURA_DIA} />
        </div>
        <div className="cf-texto cf-texto-hist">
          <Legenda texto={T.leg1} tom="dia" />
          <h2 id={ID} className="text-titulo-1 font-titulo cm-sec-titulo">
            {T.h2Hist}
          </h2>
          <p className="text-corpo font-texto cm-sec-texto">{T.pHist}</p>
          <img
            src={CENA_TUMMY.src}
            srcSet={CENA_TUMMY.srcSet}
            sizes={CENA_TUMMY.sizes}
            width={CENA_TUMMY.largura}
            height={CENA_TUMMY.altura}
            alt={T.altCena2}
            loading="lazy"
            decoding="async"
          />
          <Legenda texto={T.leg2} tom="dia" />
        </div>
      </div>
    </FaixaInteira>
  )
}
