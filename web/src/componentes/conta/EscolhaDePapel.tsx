import { useId } from 'react'
import { ORDEM_DOS_PAPEIS, PAPEIS } from '../../conteudo/conta.ts'
import type { Papel } from '../../dados/comum.ts'

interface Props {
  legenda: string
  valor: Papel
  aoMudar: (papel: Papel) => void
}

/**
 * A escolha do papel: os três, cada um com a frase do que permite. Cada opção é um rótulo inteiro de
 * pelo menos 44 px de altura (o alvo de toque), com o botão de opção dentro.
 */
export function EscolhaDePapel({ legenda, valor, aoMudar }: Props) {
  const grupo = useId()
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="cm-campo-rotulo mb-2 p-0">{legenda}</legend>
      {ORDEM_DOS_PAPEIS.map((papel) => (
        <label
          key={papel}
          className="alvo-toque grid min-h-11 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 rounded-campo border-[1.5px] border-[var(--cor-fio-suave)] p-3 has-[:checked]:border-[var(--cor-texto)]"
        >
          {/* O nome acessível é só o papel; o que ele permite vai em `aria-describedby` (A11Y-013). */}
          <input
            type="radio"
            name={grupo}
            value={papel}
            checked={valor === papel}
            onChange={() => aoMudar(papel)}
            aria-labelledby={`${grupo}-${papel}-nome`}
            aria-describedby={`${grupo}-${papel}-descricao`}
            className="row-span-2 accent-[var(--cor-texto)]"
          />
          <span id={`${grupo}-${papel}-nome`} className="font-medium">
            {PAPEIS[papel].nome}
          </span>
          <span id={`${grupo}-${papel}-descricao`} className="cm-pequeno text-[var(--cor-texto-2)]">
            {PAPEIS[papel].permite}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
