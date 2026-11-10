import { Fragment } from 'react'
import { Link } from 'react-router'
import { EMAIL_CONTATO } from '../../conteudo/publicas.ts'
import type { Bloco, Lista, Texto } from '../../conteudo/publicas.ts'

// Os textos das páginas públicas: parágrafos (com link de página ou o e-mail de contato dentro) e
// listas. Cada bloco leva `vp-bloco`, que dá o espaço entre blocos dentro de uma linha.

/**
 * O e-mail de contato: um link `mailto:` cujo texto é o próprio endereço (a constante `EMAIL_CONTATO`).
 * Um endereço comprido, em tipo grande, quebra depois do "@" (o `<wbr>` não muda o texto do link).
 */
export function LinkDeEmail() {
  const [usuario, ...dominio] = EMAIL_CONTATO.split('@')
  return (
    <a href={`mailto:${EMAIL_CONTATO}`} data-contato="" className="vp-email">
      {dominio.length === 0 ? (
        EMAIL_CONTATO
      ) : (
        <>
          {`${usuario}@`}
          <wbr />
          {dominio.join('@')}
        </>
      )}
    </a>
  )
}

/** Um parágrafo: um texto só, ou uma sequência de trechos (texto, link para outra página ou o e-mail). */
export function Paragrafo({ texto }: { texto: Texto }) {
  if (typeof texto === 'string') return <p className="vp-bloco">{texto}</p>
  return (
    <p className="vp-bloco">
      {texto.map((trecho, indice) => {
        if (typeof trecho === 'string') return <Fragment key={indice}>{trecho}</Fragment>
        if ('link' in trecho) {
          return (
            <Link key={indice} to={trecho.para}>
              {trecho.link}
            </Link>
          )
        }
        return <LinkDeEmail key={indice} />
      })}
    </p>
  )
}

function ListaDeItens({ lista }: { lista: Lista }) {
  const Marcador = lista.ordenada ? 'ol' : 'ul'
  return (
    <Marcador className="vp-bloco vp-lista" data-lista={lista.ordenada ? 'ordenada' : 'simples'}>
      {lista.itens.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </Marcador>
  )
}

function ehLista(bloco: Bloco): bloco is Lista {
  return typeof bloco === 'object' && !Array.isArray(bloco)
}

/** Os blocos de uma linha: parágrafos e listas, na ordem. */
export function Blocos({ blocos }: { blocos: readonly Bloco[] }) {
  return (
    <>
      {blocos.map((bloco, indice) =>
        ehLista(bloco) ? <ListaDeItens key={indice} lista={bloco} /> : <Paragrafo key={indice} texto={bloco} />,
      )}
    </>
  )
}
