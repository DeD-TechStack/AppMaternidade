interface EscolhaProps {
  tipo: 'checkbox' | 'radio'
  rotulo: string
  marcado: boolean
  aoMudar: () => void
  name?: string
  value?: string
}

// A caixa que se vê tem 20 px, mas o controle que recebe o toque (o `input`) cobre o rótulo inteiro:
// 44 px de altura no mínimo (G11), como no resto do painel. O `input` fica transparente por cima, o foco
// e o estado marcado vão para a caixa desenhada logo depois (`peer`).
const CAIXA =
  'grid size-5 shrink-0 place-items-center border-[1.5px] border-[var(--cor-texto)] bg-[var(--cor-cartao)] ' +
  'peer-checked:bg-[var(--cor-texto)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ' +
  'peer-focus-visible:outline-[var(--cor-foco)] after:block after:opacity-0 peer-checked:after:opacity-100'
const MARCA_DE_CAIXA =
  'rounded-[6px] after:mb-0.5 after:h-2.5 after:w-1.5 after:rotate-45 after:border-b-2 after:border-r-2 after:border-[var(--cor-cartao)]'
const MARCA_DE_OPCAO = 'rounded-full after:size-2 after:rounded-full after:bg-[var(--cor-cartao)]'

/** Uma caixa de seleção ou uma opção de escolha única, com o rótulo ao lado e o alvo de toque de 44 px. */
export function Escolha({ tipo, rotulo, marcado, aoMudar, name, value }: EscolhaProps) {
  return (
    <label className="alvo-toque relative flex min-w-11 cursor-pointer items-center gap-2">
      <input
        type={tipo}
        name={name}
        value={value}
        checked={marcado}
        onChange={aoMudar}
        className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0"
      />
      <span aria-hidden="true" className={`${CAIXA} ${tipo === 'checkbox' ? MARCA_DE_CAIXA : MARCA_DE_OPCAO}`} />
      <span>{rotulo}</span>
    </label>
  )
}
