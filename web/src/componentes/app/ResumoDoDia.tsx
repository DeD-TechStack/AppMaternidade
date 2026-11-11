import { useId } from 'react'

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
    <section aria-labelledby={idTitulo} data-resumo="" className={className}>
      <h2 id={idTitulo} className="cm-h4">
        Hoje até agora
      </h2>
      <ul className="mt-3 grid grid-cols-[1fr_1fr_1.45fr] border-y border-(--cor-fio-suave) lg:mt-4">
        {itens.map((item) => (
          <li
            key={item.rotulo}
            className="flex min-w-0 flex-col-reverse justify-end gap-1.5 border-l border-(--cor-fio-suave) py-4 pl-4 first:border-l-0 first:pl-0 lg:py-5 lg:pl-6"
          >
            <span
              data-numero-do-dia=""
              className="font-titulo text-[44px] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums lg:text-[52px]"
            >
              {item.valor}
            </span>
            <span className="text-[15px] leading-[22px] font-medium text-(--cor-texto-2)">{item.rotulo}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
