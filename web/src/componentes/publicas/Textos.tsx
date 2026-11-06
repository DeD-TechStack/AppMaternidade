import { Fragment } from 'react'
import { Link } from 'react-router'
import { PENDENCIAS, TF } from '../../conteudo/publicas.ts'
import type { Bloco, DadosDeTabela, Lista, Texto } from '../../conteudo/publicas.ts'

// Os textos das páginas públicas: parágrafos (com link ou pendência dentro), listas, tabelas e
// os avisos. Todo <p> do <main> tem a linha de até 65ch (texto-medida).

/** Um parágrafo. Um texto só, ou uma sequência de trechos: texto, link para outra página ou pendência. */
export function Paragrafo({ texto, className = 'texto-medida' }: { texto: Texto; className?: string }) {
  if (typeof texto === 'string') return <p className={className}>{texto}</p>
  return (
    <p className={className}>
      {texto.map((trecho, indice) => {
        if (typeof trecho === 'string') return <Fragment key={indice}>{trecho}</Fragment>
        if ('link' in trecho) {
          return (
            <Link key={indice} to={trecho.para}>
              {trecho.link}
            </Link>
          )
        }
        return (
          <span key={indice} data-pendencia={trecho.pendencia} className="font-semibold">
            {PENDENCIAS[trecho.pendencia]}
          </span>
        )
      })}
    </p>
  )
}

function ListaDeItens({ lista }: { lista: Lista }) {
  const Marcador = lista.ordenada ? 'ol' : 'ul'
  const estilo = lista.ordenada ? 'list-decimal' : 'list-disc'
  return (
    <Marcador className={`texto-medida ${estilo} space-y-2 pl-6`}>
      {lista.itens.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </Marcador>
  )
}

function ehLista(bloco: Bloco): bloco is Lista {
  return typeof bloco === 'object' && !Array.isArray(bloco)
}

/** Os blocos de uma seção: parágrafos e listas, na ordem. */
export function Blocos({ blocos }: { blocos: readonly Bloco[] }) {
  return (
    <>
      {blocos.map((bloco, indice) =>
        ehLista(bloco) ? <ListaDeItens key={indice} lista={bloco} /> : <Paragrafo key={indice} texto={bloco} />,
      )}
    </>
  )
}

/** Vários parágrafos seguidos. */
export function Paragrafos({ textos }: { textos: readonly Texto[] }) {
  return (
    <>
      {textos.map((texto, indice) => (
        <Paragrafo key={indice} texto={texto} />
      ))}
    </>
  )
}

/** Tabela com legenda, cabeçalhos de coluna e a primeira célula de cada linha como cabeçalho da linha. */
export function Tabela({ legenda, colunas, linhas }: DadosDeTabela) {
  return (
    <table className="w-full border-collapse text-left text-[0.9375rem] leading-snug @min-[46rem]/publica:text-[1.0625rem]">
      <caption className="rotulo pb-3 text-left">{legenda}</caption>
      <thead>
        <tr className="border-y">
          {colunas.map((coluna) => (
            <th key={coluna} scope="col" className="rotulo py-3 pr-4 text-left align-bottom">
              {coluna}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map(([cabecalho, ...celulas]) => (
          <tr key={cabecalho} className="border-b">
            <th scope="row" className="py-4 pr-4 text-left align-top font-semibold">
              {cabecalho}
            </th>
            {celulas.map((celula) => (
              <td key={celula} className="tabular py-4 pr-4 align-top">
                {celula}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** O aviso das 9 páginas novas: algumas funções descritas ainda não estão no ar. */
export function AvisoDeConstrucao() {
  return (
    <p data-aviso="construcao" className="texto-medida texto-info text-[0.9375rem] font-semibold">
      {TF.construcao}
    </p>
  )
}

/** O aviso dos três rascunhos jurídicos: logo depois do h1, com contorno de 1 px na tinta. */
export function AvisoDeRascunho() {
  return (
    <div data-aviso="rascunho" className="mt-6 rounded-[8px] border px-4 py-3 font-semibold">
      {TF.rascunho}
    </div>
  )
}
