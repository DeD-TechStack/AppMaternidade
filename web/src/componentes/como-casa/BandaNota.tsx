import { FaixaInteira, ProdutoEmMoldura } from '../secoes/index.ts'
import { COMO_FUNCIONA as T, MOLDURA_DIA, TELA_NOTAS } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

const ID = 'cf-nota'

/** Faixa 4 (areia): a moldura das Notas na esquerda, o texto na segunda coluna (acima da moldura numa coluna so). */
export function BandaNota() {
  return (
    <FaixaInteira fundo="areia" idTitulo={ID}>
      <div className="cf-banda">
        <div className="cf-duas cf-duas-nota">
          <div className="cf-texto">
            <h2 id={ID} className="text-titulo-1 font-titulo cm-sec-titulo">
              {T.h2Nota}
            </h2>
            <p className="text-corpo font-texto cm-sec-texto">{T.pNota}</p>
          </div>
          <div className="cf-lado">
            <ProdutoEmMoldura tela={{ ...TELA_NOTAS, alt: T.altTela2 }} moldura={MOLDURA_DIA} />
          </div>
        </div>
      </div>
    </FaixaInteira>
  )
}
