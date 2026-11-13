import { HISTORICO } from '../../conteudo/rotina.ts'
import { linhasDoResumo, type TotaisDoPeriodo } from './totaisHistorico.ts'

/** O resumo do dia (R38-20, D-9): só totais, em linhas de rótulo e valor. */
export function TotaisDoDia({ totais }: { totais: TotaisDoPeriodo }) {
  return (
    <section aria-labelledby="historico-resumo" data-resumo-do-dia="">
      <h2 id="historico-resumo" className="cm-h4">
        {HISTORICO.resumoDoDia}
      </h2>
      <dl className="mt-3 border-y border-(--cor-fio-suave)">
        {linhasDoResumo(totais).map((linha) => (
          <div key={linha.rotulo} className="flex flex-wrap items-baseline justify-between gap-x-4 border-t border-(--cor-fio-suave) py-3 first:border-t-0">
            <dt className="text-(--cor-texto-2)">{linha.rotulo}</dt>
            <dd className="font-medium tabular-nums">{linha.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
