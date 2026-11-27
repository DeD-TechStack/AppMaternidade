import { COMO_FUNCIONA as T, PASSOS } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

const ID = 'cf-comecar'

/**
 * Faixa 5 (papel): "Para começar, só o navegador." Os três passos em três colunas em 1440 (empilhados em 390),
 * numerados na voz da hora (Literata 800 tabular), com o aviso pequeno abaixo.
 */
export function BandaComecar() {
  return (
    <section className="cf-faixa cf-comecar" aria-labelledby={ID}>
      <div className="co-texto cf-comecar-miolo">
        <h2 id={ID} className="co-h2">
          {T.h2Comecar}
        </h2>
        <ol className="cf-passos">
          {PASSOS.map((passo) => (
            <li key={passo} className="cf-passo">
              <span className="co-p cf-passo-texto">{passo}</span>
            </li>
          ))}
        </ol>
        <p className="cf-aviso">{T.aviso}</p>
      </div>
    </section>
  )
}
