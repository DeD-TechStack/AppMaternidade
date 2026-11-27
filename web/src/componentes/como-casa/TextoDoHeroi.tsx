import { BotaoLargo } from '../secoes/index.ts'
import { COMO_FUNCIONA as T, DESTINO_CRIAR_CONTA } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

export const ID_DO_TITULO = 'cf-titulo'

/** O texto do herói (03:00): h1, frase e pílula de mel sobre a parede de noite. */
export function TextoDoHeroi() {
  return (
    <div className="co-texto cf-heroi-texto">
      <h1 id={ID_DO_TITULO} className="co-h1">
        {T.h1}
      </h1>
      <p className="co-lede">{T.lede}</p>
      <div className="co-acoes">
        <BotaoLargo rotulo={T.cta1} para={DESTINO_CRIAR_CONTA} variante="mel" />
      </div>
    </div>
  )
}
