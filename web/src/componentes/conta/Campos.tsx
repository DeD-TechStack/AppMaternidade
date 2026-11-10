import { useId, useMemo, useState, type ReactNode, type Ref } from 'react'
import { COMECAR, COMUM } from '../../conteudo/conta.ts'
import { listaDeFusos } from './fusos.ts'
import { BOTAO_SECUNDARIO } from './Partes.tsx'

// Campos de formulário: rótulo visível acima, borda de 1 px na tinta, canto de 6 px, altura mínima
// de 48 px. Erro e ajuda ficam ligados ao controle por `aria-describedby`.

const ENTRADA =
  'alvo-toque min-h-12 w-full rounded-[6px] border bg-[var(--cor-fundo)] px-3 py-2.5 text-[var(--cor-texto)] ' +
  'hover:bg-[var(--cor-papel-fundo)] focus:bg-[var(--cor-fundo)] ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-invalid:border-2 aria-invalid:border-[var(--cor-destaque)] aria-invalid:px-[calc(0.75rem_-_1px)] aria-invalid:py-[calc(0.625rem_-_1px)]'

// O fundo preenchido do campo de texto `readonly` (o e-mail). Fica só no `<input>`: o `:read-only`
// do CSS casa também com todo `<select>`, que é editável e usa o mesmo fundo do campo de nome.
const SOMENTE_LEITURA = 'read-only:bg-[var(--cor-papel-fundo)]'

function Descricoes({ id, ajuda, erro }: { id: string; ajuda?: string; erro?: string | null }) {
  return (
    <>
      {ajuda ? (
        <p id={`${id}-ajuda`} className="text-[0.9375rem]">
          {ajuda}
        </p>
      ) : null}
      {erro ? (
        <p id={`${id}-erro`} className="font-semibold text-[var(--cor-destaque)]">
          {erro}
        </p>
      ) : null}
    </>
  )
}

const ligar = (id: string, ajuda?: string, erro?: string | null) =>
  [ajuda ? `${id}-ajuda` : null, erro ? `${id}-erro` : null].filter(Boolean).join(' ') || undefined

interface CampoProps {
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  tipo?: 'text' | 'email' | 'password'
  autoComplete?: string
  ajuda?: string
  erro?: string | null
  somenteLeitura?: boolean
  refEntrada?: Ref<HTMLInputElement>
  /** Um controle ao lado do campo (o botão "Mostrar senha"). */
  complemento?: ReactNode
}

export function Campo({
  rotulo,
  valor,
  aoMudar,
  tipo = 'text',
  autoComplete,
  ajuda,
  erro,
  somenteLeitura = false,
  refEntrada,
  complemento,
}: CampoProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {rotulo}
      </label>
      <div className="flex gap-2">
        <input
          ref={refEntrada}
          id={id}
          type={tipo}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          autoComplete={autoComplete}
          readOnly={somenteLeitura}
          aria-invalid={erro ? true : undefined}
          aria-describedby={ligar(id, ajuda, erro)}
          className={`${ENTRADA} ${SOMENTE_LEITURA} flex-1`}
        />
        {complemento}
      </div>
      <Descricoes id={id} ajuda={ajuda} erro={erro} />
    </div>
  )
}

/** Campo de senha com o botão "Mostrar senha" (`aria-pressed`). */
export function CampoSenha(props: Omit<CampoProps, 'tipo' | 'complemento'>) {
  const [visivel, setVisivel] = useState(false)
  return (
    <Campo
      {...props}
      tipo={visivel ? 'text' : 'password'}
      complemento={
        <button type="button" aria-pressed={visivel} className={BOTAO_SECUNDARIO} onClick={() => setVisivel(!visivel)}>
          {COMUM.mostrarSenha}
        </button>
      }
    />
  )
}

interface SeletorFusoProps {
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  /** O fuso que já estava guardado: se não estiver na lista, aparece primeiro, como atual. */
  guardado?: string
  ajuda?: string
  erro?: string | null
  refEntrada?: Ref<HTMLSelectElement>
}

/** O controle de fuso das telas Começar, Família e Conta. */
export function SeletorFuso({ rotulo, valor, aoMudar, guardado, ajuda, erro, refEntrada }: SeletorFusoProps) {
  const id = useId()
  const { opcoes, foraDaLista } = useMemo(() => {
    const lista = listaDeFusos()
    if (guardado && !lista.includes(guardado)) return { opcoes: [guardado, ...lista], foraDaLista: guardado }
    return { opcoes: lista, foraDaLista: null }
  }, [guardado])

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {rotulo}
      </label>
      <select
        ref={refEntrada}
        id={id}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={ligar(id, ajuda, erro)}
        className={ENTRADA}
      >
        {opcoes.map((fuso) => (
          <option key={fuso} value={fuso}>
            {fuso === foraDaLista ? COMECAR.fusoAtual(fuso) : fuso}
          </option>
        ))}
      </select>
      <Descricoes id={id} ajuda={ajuda} erro={erro} />
    </div>
  )
}
