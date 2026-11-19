import { FaixaInteira } from '../secoes/index.ts'
import { COMO_FUNCIONA as T, PASSOS } from '../../conteudo/casa/comoFunciona.ts'
import './como-casa.css'

const ID = 'cf-comecar'

/** Faixa 5 (papel): o h2 na esquerda; na direita, os tres passos numa lista com fio entre as linhas e o aviso. */
export function BandaComecar() {
  return (
    <FaixaInteira fundo="papel" idTitulo={ID}>
      <div className="cf-duas cf-duas-comecar">
        <div className="cf-texto">
          <h2 id={ID} className="text-titulo-1 font-titulo cm-sec-titulo">
            {T.h2Comecar}
          </h2>
        </div>
        <div className="cf-lista-col">
          <ol className="cf-passos text-corpo font-texto">
            {PASSOS.map((passo) => (
              <li key={passo}>
                <span>{passo}</span>
              </li>
            ))}
          </ol>
          <p className="text-corpo font-texto cm-sec-texto">{T.aviso}</p>
        </div>
      </div>
    </FaixaInteira>
  )
}
