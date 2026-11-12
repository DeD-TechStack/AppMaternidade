import { useId } from 'react'
import { T } from '../../conteudo/desenvolvimento/textosLogada.ts'
import type { Bebe } from '../../dados/conta.ts'

interface Props {
  bebes: readonly Bebe[]
  escolhido: string
  aoEscolher: (id: string) => void
  /** Uma escrita da página está esperando a resposta: o seletor não muda o bebê no meio dela. */
  pendente: boolean
}

/**
 * T-51: o rótulo visível "Bebê" e a lista nativa dos bebês da família (arquivados por último). A caixa leva as
 * classes do campo da base; a seta é só CSS, sem ícone novo. Só aparece quando há mais de um bebê.
 */
export function SeletorDeBebe({ bebes, escolhido, aoEscolher, pendente }: Props) {
  const id = useId()
  return (
    <div className="cm-campo w-full pb-2 lg:w-72" data-seletor-de-bebe="">
      <label htmlFor={id} className="cm-campo-rotulo">
        {T.bebe}
      </label>
      <div className="cm-campo-controle" data-select="">
        <select
          id={id}
          value={escolhido}
          disabled={pendente}
          onChange={(evento) => aoEscolher(evento.target.value)}
          className="cm-campo-entrada disabled:cursor-not-allowed disabled:opacity-60"
        >
          {bebes.map((bebe) => (
            <option key={bebe.id} value={bebe.id}>
              {bebe.estado === 'arquivado' ? `${bebe.nome} (arquivado)` : bebe.nome}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-5 size-2.5 -translate-y-0.5 rotate-45 border-r-2 border-b-2 border-current"
        />
      </div>
    </div>
  )
}
