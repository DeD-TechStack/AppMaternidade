import { useId, useMemo, useState, type Ref } from 'react'
import { COMECAR, COMUM } from '../../conteudo/conta.ts'
import { listaDeFusos, nomeDoFuso } from './fusos.ts'

// Campos de formulário: rótulo em caixa alta acima, borda de 1 px na tinta com o fio de base de
// 2 px, canto de 6 px, altura mínima de 48 px. Erro e ajuda ficam ligados ao controle por
// `aria-describedby`. O foco é o contorno da base (2 px), que nenhum controle desfaz.

const ENTRADA =
  'alvo-toque min-h-12 w-full rounded-[6px] border border-b-2 bg-[var(--cor-fundo)] px-3 py-2.5 text-[var(--cor-texto)] ' +
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
}: CampoProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
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
        className={`${ENTRADA} ${SOMENTE_LEITURA}`}
      />
      <Descricoes id={id} ajuda={ajuda} erro={erro} />
    </div>
  )
}

// O olho do botão de senha, só CSS (sem desenho vetorial, sem biblioteca de ícones, sem emoji): uma forma oval
// de contorno com o ponto da íris no meio (`::after`). Com a senha à mostra leva um traço
// diagonal (`::before`) por cima. A cor é `currentColor`, então segue o tema e o estado.
const OLHO =
  'relative block h-3.5 w-6 rounded-[50%] border-2 border-current ' +
  'after:absolute after:left-1/2 after:top-1/2 after:size-1.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-current after:content-[""]'
const RISCO_DO_OLHO =
  'before:absolute before:left-1/2 before:top-1/2 before:z-10 before:h-0.5 before:w-8 before:-translate-x-1/2 before:-translate-y-1/2 before:-rotate-45 before:rounded-full before:bg-current before:content-[""]'

/**
 * Campo de senha numa faixa só: o `<input>` sem borda própria, que ocupa quase toda a faixa, e, à
 * direita, separado por uma régua vertical, um botão compacto (56 px de largura) com o olho
 * desenhado em CSS. O botão não tem texto visível: o nome acessível ("Mostrar senha" e "Ocultar
 * senha") e `aria-pressed` dizem o estado, e o olho riscado é a pista visual da senha à mostra. A
 * faixa desenha a borda, o fundo e o foco do campo; o foco do botão é o contorno da base, no
 * próprio botão. Tudo em rem, sem altura fixa em texto: com a fonte a 200% o campo não estoura.
 */
export function CampoSenha(props: Omit<CampoProps, 'tipo' | 'somenteLeitura'>) {
  const { rotulo, valor, aoMudar, autoComplete, ajuda, erro, refEntrada } = props
  const id = useId()
  const [visivel, setVisivel] = useState(false)
  const bordaDoErro = erro ? 'border-2 border-[var(--cor-destaque)]' : ''

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <div
        className={`flex min-h-12 w-full flex-nowrap items-stretch rounded-[6px] border border-b-2 bg-[var(--cor-fundo)] text-[var(--cor-texto)] hover:bg-[var(--cor-papel-fundo)] has-[input:focus]:bg-[var(--cor-fundo)] has-[input:focus]:outline-2 has-[input:focus]:outline-offset-2 has-[input:focus]:outline-[var(--cor-foco)] ${bordaDoErro}`}
      >
        <input
          ref={refEntrada}
          id={id}
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          autoComplete={autoComplete}
          aria-invalid={erro ? true : undefined}
          aria-describedby={ligar(id, ajuda, erro)}
          className="alvo-toque min-h-12 min-w-0 flex-1 rounded-l-[5px] bg-transparent px-3 py-2.5 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          aria-pressed={visivel}
          aria-label={visivel ? COMUM.ocultarSenha : COMUM.mostrarSenha}
          className="alvo-toque flex w-14 shrink-0 items-center justify-center rounded-r-[5px] border-l hover:bg-[var(--cor-papel-fundo)]"
          onClick={() => setVisivel(!visivel)}
        >
          <span aria-hidden="true" data-olho={visivel ? 'riscado' : 'aberto'} className={`${OLHO} ${visivel ? RISCO_DO_OLHO : ''}`} />
        </button>
      </div>
      <Descricoes id={id} ajuda={ajuda} erro={erro} />
    </div>
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

// A seta é só CSS (duas bordas giradas num pseudo-elemento do envoltório): sem desenho vetorial nem ícone.
const ENVOLTORIO_DO_SELETOR =
  'relative after:pointer-events-none after:absolute after:right-4 after:top-1/2 after:size-2 after:-translate-y-[70%] after:rotate-45 after:border-b-2 after:border-r-2 after:border-current after:content-[""]'

/** O controle de fuso das telas Começar, Família e Conta. O valor de cada opção é o id IANA. */
export function SeletorFuso({ rotulo, valor, aoMudar, guardado, ajuda, erro, refEntrada }: SeletorFusoProps) {
  const id = useId()
  const { opcoes, foraDaLista } = useMemo(() => {
    const lista = listaDeFusos()
    if (guardado && !lista.includes(guardado)) return { opcoes: [guardado, ...lista], foraDaLista: guardado }
    return { opcoes: lista, foraDaLista: null }
  }, [guardado])

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <div className={ENVOLTORIO_DO_SELETOR}>
        <select
          ref={refEntrada}
          id={id}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={ligar(id, ajuda, erro)}
          className={`${ENTRADA} appearance-none pr-10 aria-invalid:pr-[calc(2.5rem_-_1px)]`}
        >
          {opcoes.map((fuso) => (
            <option key={fuso} value={fuso}>
              {fuso === foraDaLista ? COMECAR.fusoAtual(nomeDoFuso(fuso)) : nomeDoFuso(fuso)}
            </option>
          ))}
        </select>
      </div>
      <Descricoes id={id} ajuda={ajuda} erro={erro} />
    </div>
  )
}
