import { useId } from 'react'

interface Props {
  itens: ReadonlyArray<{ rotulo: string; valor: string }>
  className?: string
}

/**
 * Os números do dia (DESIGN.md 4, Numeros, na escala do app): três figuras em Literata separadas por fios
 * de 1 px, verticais de 768 para cima e horizontais no celular. O rótulo é um `span` (a figura é o número).
 */
export function ResumoDoDia({ itens, className }: Props) {
  const idTitulo = useId()
  return (
    <section aria-labelledby={idTitulo} data-resumo="" className={className}>
      <h2 id={idTitulo} className="cm-h4">
        Hoje até agora
      </h2>
      <ul className="mt-3 grid grid-cols-1 md:mt-5 md:grid-cols-3">
        {itens.map((item) => (
          <li
            key={item.rotulo}
            className="flex flex-row-reverse items-baseline justify-between gap-4 border-t border-(--cor-fio-suave) py-4 last:border-b md:flex-col-reverse md:items-start md:justify-end md:gap-1 md:border-t-0 md:border-l md:py-1 md:pl-6 md:last:border-b-0 md:first:border-l-0 md:first:pl-0"
          >
            <span className="font-titulo text-[40px] leading-none font-semibold whitespace-nowrap tabular-nums lg:text-[48px]">
              {item.valor}
            </span>
            <span className="text-[15px] leading-[22px] font-medium text-(--cor-texto-2)">{item.rotulo}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
