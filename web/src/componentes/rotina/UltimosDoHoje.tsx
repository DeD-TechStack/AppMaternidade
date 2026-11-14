import { useId, type ReactNode } from 'react'
import { HOJE } from '../../conteudo/rotina.ts'
import type { Registro } from '../../dados/rotina.tipos.ts'
import { Pilha } from '../base/layout/index.ts'
import { MarcaDeEnvio } from './ItemRegistro.tsx'

const DESDE = ', tempo desde o registro'

export interface ItemDosUltimos {
  /** O tempo (`2 h 10`, `17:30`) de `formatarUltimo`. */
  valor: string
  /** A legenda (`Mamada, tempo desde o registro`) de `formatarUltimo`. */
  legenda: string
  /** O registro que a coluna mostra; nas colunas de travessão não há. */
  registro?: Registro
}

interface Props {
  itens: ReadonlyArray<ItemDosUltimos>
  /**
   * O lugar da marca de envio de cada coluna (R38-13, ponto M4 da MAT-41): o mesmo encaixe do `ItemRegistro`
   * (`MarcaDeEnvio`), logo depois do tempo. A MAT-38 nunca passa esta função em produção: sem ela, nenhuma
   * coluna tem o `span` da marca.
   */
  marcaDe?: (registro: Registro) => ReactNode
  className?: string
  /** Valores a somar no `data-h` da Pilha (`coluna`, quando ela é filha de `Colunas`). */
  dataH?: string
}

/**
 * "Últimos" do Hoje: a composição aprovada do `Ultimos` da base (`componentes/app/Ultimos.tsx`, que não muda),
 * linha a linha, com o encaixe da marca de envio junto da hora. Mesma estrutura, mesmas classes e os mesmos
 * marcadores (`data-ultimos`, `.sb-numeros-item`, `data-numero`); só acrescenta a marca.
 */
export function UltimosDoHoje({ itens, marcaDe, className, dataH }: Props) {
  const idTitulo = useId()
  return (
    <Pilha as="section" vao="pilha" dataH={dataH} id="ultimos" data-ultimos="" aria-labelledby={idTitulo} className={className}>
      <h2 id={idTitulo} className="cm-h4">
        {HOJE.ultimos}
      </h2>
      {/* A mesma linguagem do histórico: linhas com fio fino, sem cartão. Em 1440, três colunas entre os
          mesmos fios. */}
      <div className="border-y border-(--cor-fio-suave) lg:grid lg:grid-cols-3">
        {itens.map((item, posicao) => {
          const desde = item.legenda.endsWith(DESDE)
          const nome = desde ? item.legenda.slice(0, -DESDE.length) : item.legenda
          return (
            <div
              key={item.registro?.id ?? posicao}
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
                {item.registro && marcaDe ? <MarcaDeEnvio marca={marcaDe(item.registro)} /> : null}
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
