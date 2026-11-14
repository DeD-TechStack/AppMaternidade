import { Fragment } from 'react'
import { Link } from 'react-router'
import { type Bloco, type Texto } from '../../conteudo/publicas-texto.ts'
import { Pilha } from '../base/layout/index.ts'

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

/** Uma lista com este número de itens ou mais, e só de itens curtos, corre em duas colunas (de cima para baixo). */
const ITENS_PARA_DUAS_COLUNAS = 4
/** O maior item (em letras) que ainda cabe numa das duas colunas da coluna de leitura. */
const LETRAS_DO_ITEM_CURTO = 36

/** A lista corre em duas colunas? Só quando tem 4 itens ou mais e todos são curtos. */
function listaEmColunas(itens: readonly string[]): boolean {
  return itens.length >= ITENS_PARA_DUAS_COLUNAS && itens.every((item) => item.length <= LETRAS_DO_ITEM_CURTO)
}

/** Um bloco de leitura: parágrafo, lista (ordenada ou não) ou itens com título (`h3` e parágrafo). */
export function BlocoDeLeitura({ bloco }: { bloco: Bloco }) {
  if (typeof bloco === 'string') return <Paragrafo texto={bloco} />
  if ('itens' in bloco) {
    const Lista = bloco.ordenada ? 'ol' : 'ul'
    const emColunas = listaEmColunas(bloco.itens)
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
      <Pilha vao="grupo" className="pt-titulados">
        {bloco.titulados.map(({ titulo, texto }) => (
          <Pilha key={titulo} vao="junto">
            <h3 className="pt-h3">{titulo}</h3>
            <p>{texto}</p>
          </Pilha>
        ))}
      </Pilha>
    )
  }
  return <Paragrafo texto={bloco} />
}
