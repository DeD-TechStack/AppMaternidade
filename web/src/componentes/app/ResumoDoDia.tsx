import { useId } from 'react'
import { Pilha } from '../base/layout/index.ts'

interface Props {
  itens: ReadonlyArray<{ rotulo: string; valor: string }>
  className?: string
}

/**
 * Os números do dia (DESIGN.md 4, Numeros, na escala do app): o momento da área da lista. Três figuras
 * grandes em Literata, lado a lado em todas as larguras, separadas por fios verticais de 1 px e
 * emolduradas pelos mesmos fios finos das linhas do histórico. O rótulo é um `span` (a figura é o número)
 * e vem depois dele no DOM; na tela, fica em cima.
 */
export function ResumoDoDia({ itens, className }: Props) {
  const idTitulo = useId()
  return (
    <Pilha as="section" vao="pilha" aria-labelledby={idTitulo} data-resumo="" className={`@container/resumo ${className ?? ''}`}>
      <h2 id={idTitulo} className="text-titulo-4 font-titulo font-semibold">
        Hoje até agora
      </h2>
      {/* A grade decide pelo espaço da própria seção, não pela janela: abaixo de 18 rem (390 a 200 %, fonte
          grande) cada número vira uma linha com fio, rótulo à esquerda; com espaço, três lado a lado. Os
          números seguem a largura (clamp em cqi): 44 px em 390, 52 px em 1440, 28 px no mínimo. */}
      <ul className="grid grid-cols-1 border-b border-(--cor-fio-suave) @min-[18rem]/resumo:grid-cols-[1fr_1fr_1.45fr] @min-[18rem]/resumo:border-t">
        {itens.map((item) => (
          <li
            key={item.rotulo}
            className="flex min-w-0 flex-row-reverse items-baseline justify-between gap-4 border-t border-(--cor-fio-suave) py-3 @min-[18rem]/resumo:flex-col-reverse @min-[18rem]/resumo:items-stretch @min-[18rem]/resumo:justify-end @min-[18rem]/resumo:gap-1.5 @min-[18rem]/resumo:border-t-0 @min-[18rem]/resumo:border-l @min-[18rem]/resumo:py-4 @min-[18rem]/resumo:pl-4 @min-[18rem]/resumo:first:border-l-0 @min-[18rem]/resumo:first:pl-0 lg:@min-[18rem]/resumo:py-5 lg:@min-[18rem]/resumo:pl-6"
          >
            <span
              data-numero-do-dia=""
              className="font-titulo text-[clamp(28px,12.5cqi,52px)] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums"
            >
              {item.valor}
            </span>
            <span className="text-pequeno font-medium text-(--cor-texto-2)">{item.rotulo}</span>
          </li>
        ))}
      </ul>
    </Pilha>
  )
}
