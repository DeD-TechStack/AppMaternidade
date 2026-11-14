import { useId } from 'react'
import { Pilha } from '../base/layout/index.ts'

interface Props {
  /** As 3 colunas de `formatarUltimo`: "2 h 10" e "Mamada, tempo desde o registro". */
  itens: ReadonlyArray<{ valor: string; legenda: string }>
  className?: string
  /** Valores a somar no `data-h` da Pilha (`coluna`, quando ela é filha de `Colunas`). */
  dataH?: string
}

const DESDE = ', tempo desde o registro'

/**
 * "Últimos": quanto tempo faz desde o último registro de cada tipo. Cada linha (`.sb-numeros-item`, o
 * marcador que os testes do protótipo leem) tem dois parágrafos, o tempo e a legenda, nessa ordem no
 * DOM; na tela a legenda vem à esquerda. O "há" visível é enfeite: o leitor de tela ouve a legenda
 * inteira ("Mamada, tempo desde o registro").
 */
export function Ultimos({ itens, className, dataH }: Props) {
  const idTitulo = useId()
  return (
    <Pilha
      as="section"
      vao="pilha"
      dataH={dataH}
      id="ultimos"
      data-ultimos=""
      aria-labelledby={idTitulo}
      className={className}
    >
      <h2 id={idTitulo} className="text-titulo-4 font-titulo font-semibold">
        Últimos
      </h2>
      {/* A mesma linguagem do histórico: linhas com fio fino, sem cartão. Em 1440, três colunas entre os
          mesmos fios. */}
      <div className="border-y border-(--cor-fio-suave) lg:grid lg:grid-cols-3">
        {itens.map((item, posicao) => {
          const desde = item.legenda.endsWith(DESDE)
          const nome = desde ? item.legenda.slice(0, -DESDE.length) : item.legenda
          return (
            <div
              key={posicao}
              className="sb-numeros-item flex min-h-14 flex-row-reverse items-center justify-between gap-4 border-t border-l-0 border-(--cor-fio-suave) px-0 py-2 first:border-t-0 lg:flex-col-reverse lg:items-start lg:justify-end lg:gap-1 lg:border-t-0 lg:border-l lg:py-5 lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
            >
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                {desde ? (
                  <span aria-hidden="true" className="text-pequeno text-(--cor-texto-2)">
                    há
                  </span>
                ) : null}
                <p data-numero="" className="font-titulo text-titulo-4 font-semibold tabular-nums">
                  {item.valor}
                </p>
              </div>
              <p className="min-w-0 font-medium lg:text-pequeno lg:text-(--cor-texto-2)">
                {nome}
                {desde ? <span className="sr-only">{DESDE}</span> : null}
              </p>
            </div>
          )
        })}
      </div>
    </Pilha>
  )
}
