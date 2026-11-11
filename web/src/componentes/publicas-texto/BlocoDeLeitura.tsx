import { Fragment } from 'react'
import { Link } from 'react-router'
import { type Bloco, type Texto } from '../../conteudo/publicas-texto.ts'
import { Botao } from '../base/Botao.tsx'

/** Um parágrafo: texto simples ou uma sequência de trechos (texto ou link de rota). */
function Paragrafo({ texto }: { texto: Texto }) {
  if (typeof texto === 'string') return <p>{texto}</p>
  return (
    <p>
      {texto.map((trecho, indice) =>
        typeof trecho === 'string' ? (
          <Fragment key={indice}>{trecho}</Fragment>
        ) : (
          <Link key={indice} to={trecho.para}>
            {trecho.link}
          </Link>
        ),
      )}
    </p>
  )
}

/** Um bloco de leitura: parágrafo, lista (ordenada ou não), itens com título (`h3` e parágrafo) ou botão de rota. */
export function BlocoDeLeitura({ bloco }: { bloco: Bloco }) {
  if (typeof bloco === 'string') return <Paragrafo texto={bloco} />
  if ('itens' in bloco) {
    const Lista = bloco.ordenada ? 'ol' : 'ul'
    return (
      <Lista className="pt-lista">
        {bloco.itens.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Lista>
    )
  }
  if ('titulados' in bloco) {
    return (
      <div className="pt-titulados">
        {bloco.titulados.map(({ titulo, texto }) => (
          <div key={titulo}>
            <h3 className="pt-h3">{titulo}</h3>
            <p>{texto}</p>
          </div>
        ))}
      </div>
    )
  }
  if ('botao' in bloco) {
    return (
      <div className="pt-acao">
        <Botao to={bloco.para}>{bloco.botao}</Botao>
      </div>
    )
  }
  return <Paragrafo texto={bloco} />
}
