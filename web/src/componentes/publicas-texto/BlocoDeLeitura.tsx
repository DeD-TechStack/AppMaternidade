import { Fragment } from 'react'
import { Link } from 'react-router'
import { type Bloco, type Texto } from '../../conteudo/publicas-texto.ts'

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

/** Uma lista com este número de itens ou mais corre em duas colunas em tela larga (a ordem segue de cima para baixo). */
const ITENS_PARA_DUAS_COLUNAS = 4

/** Um bloco de leitura: parágrafo, lista (ordenada ou não) ou itens com título (`h3` e parágrafo). */
export function BlocoDeLeitura({ bloco }: { bloco: Bloco }) {
  if (typeof bloco === 'string') return <Paragrafo texto={bloco} />
  if ('itens' in bloco) {
    const Lista = bloco.ordenada ? 'ol' : 'ul'
    const emColunas = bloco.itens.length >= ITENS_PARA_DUAS_COLUNAS
    return (
      <Lista className={emColunas ? 'pt-lista pt-lista-colunas' : 'pt-lista'}>
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
  return <Paragrafo texto={bloco} />
}
