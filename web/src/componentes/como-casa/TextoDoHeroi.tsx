import { BotaoLargo } from '../secoes/index.ts'
import { COMO_FUNCIONA as T, DESTINO_CRIAR_CONTA } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

export const ID_DO_TITULO = 'cf-titulo'

/** O texto do heroi: o h1, a frase e o botao de mel, pendurados na parede da noite (de 768 em diante). */
export function TextoDoHeroi() {
  return (
    <div className="cf-hero-texto">
      <div className="cf-hero-titulo">
        <h1 id={ID_DO_TITULO} className="text-exibicao font-titulo cm-sec-titulo">
          {T.h1}
        </h1>
        <p className="text-abertura font-texto cm-sec-texto">{T.lede}</p>
      </div>
      <BotaoLargo rotulo={T.cta1} para={DESTINO_CRIAR_CONTA} variante="mel" />
    </div>
  )
}
