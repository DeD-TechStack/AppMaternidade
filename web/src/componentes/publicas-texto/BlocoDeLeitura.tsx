import { Fragment } from 'react'
import { Link } from 'react-router'
import { EMAIL_CONTATO, type Bloco, type Texto } from '../../conteudo/publicas-texto.ts'

/** Um parágrafo: texto simples ou uma sequência de trechos (texto, link de rota ou o e-mail de contato). */
function Paragrafo({ texto }: { texto: Texto }) {
  if (typeof texto === 'string') return <p>{texto}</p>
  // O e-mail sozinho no parágrafo (a página Contato) aparece em destaque, em Literata.
  const soEmail = texto.length === 1 && typeof texto[0] !== 'string' && 'email' in texto[0]
  return (
    <p className={soEmail ? 'pt-destaque' : undefined}>
      {texto.map((trecho, indice) => {
        if (typeof trecho === 'string') return <Fragment key={indice}>{trecho}</Fragment>
        if ('email' in trecho) {
          return (
            <a key={indice} href={`mailto:${EMAIL_CONTATO}`}>
              {EMAIL_CONTATO}
            </a>
          )
        }
        return (
          <Link key={indice} to={trecho.para}>
            {trecho.link}
          </Link>
        )
      })}
    </p>
  )
}

/** Um bloco de leitura: parágrafo, lista (ordenada ou não) ou itens com título (`h3` e parágrafo). */
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
  return <Paragrafo texto={bloco} />
}
