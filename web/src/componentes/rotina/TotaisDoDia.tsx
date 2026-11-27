import { HISTORICO } from '../../conteudo/rotina.ts'
import { Pilha } from '../base/layout/index.ts'
import { linhasDoResumo, type TotaisDoPeriodo } from './totaisHistorico.ts'

/** O resumo do dia (R38-20, D-9): só totais, em linhas de rótulo e valor. */
export function TotaisDoDia({ totais }: { totais: TotaisDoPeriodo }) {
  return (
    <Pilha as="section" vao="pilha" aria-labelledby="historico-resumo" data-resumo-do-dia="">
      <h2 id="historico-resumo" className="text-titulo-4 font-titulo font-semibold">
        {HISTORICO.resumoDoDia}
      </h2>
      <dl className="max-w-leitura border-y border-(--cor-fio-suave)">
        {linhasDoResumo(totais).map((linha) => (
          <div key={linha.rotulo} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-(--cor-fio-suave) py-3 first:border-t-0">
            <dt className="w-[12ch] max-w-full shrink-0 wrap-anywhere text-(--cor-texto-2)">{linha.rotulo}</dt>
            <dd className="min-w-0 flex-1 basis-[20ch] wrap-anywhere font-medium tabular-nums">{linha.valor}</dd>
          </div>
        ))}
      </dl>
    </Pilha>
  )
}
