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

// Os papéis ARIA da tabela vão em objetos e entram por spread. Quando a tabela se empilha (display:
// block), o navegador pode perder o papel nativo de table, rowgroup, row, cell e cabeçalho; o papel
// explícito o mantém para o leitor de tela. O spread é só para o lint não tratar o papel como
// redundante: nas outras larguras ele é o mesmo da tag.
const PAPEL = {
  tabela: { role: 'table' },
  grupo: { role: 'rowgroup' },
  linha: { role: 'row' },
  cabecalhoDeColuna: { role: 'columnheader' },
  cabecalhoDeLinha: { role: 'rowheader' },
  celula: { role: 'cell' },
} as const

/**
 * Tabela com legenda, cabeçalhos de coluna e a primeira célula de cada linha como cabeçalho da linha.
 *
 * Abaixo de 36 rem de largura da página (contêiner "publica", em rem: vale também com a fonte
 * ampliada, quando a página tem menos rem) cada linha vira um bloco empilhado: o cabeçalho da linha
 * em cima e, em cada célula, o nome da coluna visível antes do valor. A linha de cabeçalhos sai da
 * vista (sr-only) e continua para o leitor de tela; o nome da coluna repetido na célula é aria-hidden,
 * para não ser lido duas vezes.
 */
export function Tabela({ legenda, colunas, linhas }: DadosDeTabela) {
  return (
    <table
      {...PAPEL.tabela}
      className="w-full border-collapse text-left text-[0.9375rem] leading-snug @min-[46rem]/publica:text-[1.0625rem] @max-[36rem]/publica:block"
    >
      <caption className="rotulo pb-3 text-left @max-[36rem]/publica:block">{legenda}</caption>
      <thead {...PAPEL.grupo} className="@max-[36rem]/publica:sr-only">
        <tr {...PAPEL.linha} className="border-y">
          {colunas.map((coluna) => (
            <th
              key={coluna}
              {...PAPEL.cabecalhoDeColuna}
              scope="col"
              className="rotulo py-3 pr-4 text-left align-bottom"
            >
              {coluna}
            </th>
          ))}
        </tr>
      </thead>
      <tbody {...PAPEL.grupo} className="@max-[36rem]/publica:block">
        {linhas.map(([cabecalho, ...celulas]) => (
          <tr
            key={cabecalho}
            {...PAPEL.linha}
            className="border-b @max-[36rem]/publica:block @max-[36rem]/publica:py-4"
          >
            <th
              {...PAPEL.cabecalhoDeLinha}
              scope="row"
              className="py-4 pr-4 text-left align-top font-semibold @max-[36rem]/publica:block @max-[36rem]/publica:py-0 @max-[36rem]/publica:pb-2 @max-[36rem]/publica:text-lg"
            >
              {cabecalho}
            </th>
            {celulas.map((celula, indice) => (
              <td
                key={celula}
                {...PAPEL.celula}
                className="tabular py-4 pr-4 align-top @max-[36rem]/publica:block @max-[36rem]/publica:py-2 @max-[36rem]/publica:pr-0"
              >
                <span
                  aria-hidden="true"
                  className="rotulo hidden @max-[36rem]/publica:block"
                >
                  {colunas[indice + 1]}
                </span>
                <span>{celula}</span>
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
