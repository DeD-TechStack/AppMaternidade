import { useId, useMemo, useState, type ReactNode, type Ref } from 'react'
import { ChevronDown, CircleAlert, Eye, EyeOff } from 'lucide-react'
import { COMECAR, COMUM } from '../../conteudo/conta.ts'
import { listaDeFusos } from './fusos.ts'

// Campos de formulário no "Campo de mel": rótulo visível acima, caixa de 56 px com raio 14 e contorno
// de 1,5 px (as classes `cm-campo-*` da base). Erro e ajuda ficam ligados ao controle por
// `aria-describedby`; o erro leva ícone e palavras, nunca só cor.

// O fundo preenchido do campo de texto `readonly` (o e-mail). Fica só no `<input>`: o `:read-only`
// do CSS casa também com todo `<select>`, que é editável e usa o mesmo fundo do campo de nome.
const SOMENTE_LEITURA = 'read-only:bg-[var(--cor-papel-fundo)]'

// O tamanho da caixa vem de `.cm-campo-entrada` (site.css: 56 px), sem `alvo-toque` (o index.css baixaria
// para 44 px). Nas telas do app (Começar e Conta) o campo é de 48 px: `min-h-12` (utilitário) vence o
// `min-height` do sistema.
type TamanhoDoCampo = 'site' | 'app'
const caixa = (tamanho: TamanhoDoCampo) => (tamanho === 'app' ? 'cm-campo-entrada min-h-12' : 'cm-campo-entrada')

function Descricoes({ id, ajuda, erro }: { id: string; ajuda?: string; erro?: string | null }) {
  return (
    <>
      {erro ? (
        <p id={`${id}-erro`} className="cm-campo-mensagem cm-campo-erro cm-pequeno flex items-start gap-2">
          <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </p>
      ) : null}
      {ajuda ? (
        <p id={`${id}-ajuda`} className="cm-campo-mensagem cm-pequeno text-[var(--cor-texto-2)]">
          {ajuda}
        </p>
      ) : null}
    </>
  )
}

const ligar = (id: string, ajuda?: string, erro?: string | null) =>
  [erro ? `${id}-erro` : null, ajuda ? `${id}-ajuda` : null].filter(Boolean).join(' ') || undefined

interface CampoProps {
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  tipo?: 'text' | 'email' | 'password' | 'date'
  /** Só nos campos de data: o limite (`AAAA-MM-DD`). */
  min?: string
  max?: string
  autoComplete?: string
  ajuda?: string
  erro?: string | null
  somenteLeitura?: boolean
  refEntrada?: Ref<HTMLInputElement>
  /** Um controle dentro do campo, à direita (o botão de mostrar a senha). */
  complemento?: ReactNode
  /** `site` (56 px, telas públicas) ou `app` (48 px, Começar e Conta). */
  tamanho?: TamanhoDoCampo
}

export function Campo({
  rotulo,
  valor,
  aoMudar,
  tipo = 'text',
  min,
  max,
  autoComplete,
  ajuda,
  erro,
  somenteLeitura = false,
  refEntrada,
  complemento,
  tamanho = 'site',
}: CampoProps) {
  const id = useId()
  return (
    <div className="cm-campo max-w-none">
      <label htmlFor={id} className="cm-campo-rotulo">
        {rotulo}
      </label>
      <div className="cm-campo-controle" data-senha={complemento ? '' : undefined}>
        <input
          ref={refEntrada}
          id={id}
          type={tipo}
          min={min}
          max={max}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          autoComplete={autoComplete}
          readOnly={somenteLeitura}
          aria-invalid={erro ? true : undefined}
          aria-describedby={ligar(id, ajuda, erro)}
          className={`${caixa(tamanho)} ${SOMENTE_LEITURA}`}
        />
        {complemento}
      </div>
      <Descricoes id={id} ajuda={ajuda} erro={erro} />
    </div>
  )
}

/** Campo de senha com o botão "Mostrar senha" (`aria-pressed`) dentro da caixa. */
export function CampoSenha(props: Omit<CampoProps, 'tipo' | 'complemento'>) {
  const [visivel, setVisivel] = useState(false)
  return (
    <Campo
      {...props}
      tipo={visivel ? 'text' : 'password'}
      complemento={
        <button
          type="button"
          aria-label={COMUM.mostrarSenha}
          aria-pressed={visivel}
          className="cm-campo-olho alvo-toque"
          onClick={() => setVisivel(!visivel)}
        >
          {visivel ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
        </button>
      }
    />
  )
}

interface SeletorDeOpcoesProps {
  rotulo: string
  valor: string
  opcoes: ReadonlyArray<{ valor: string; texto: string }>
  aoMudar: (valor: string) => void
  tamanho?: TamanhoDoCampo
}

/** Uma escolha entre poucas opções (o seletor "Família" do alto da tela Família). */
export function SeletorDeOpcoes({ rotulo, valor, opcoes, aoMudar, tamanho = 'app' }: SeletorDeOpcoesProps) {
  const id = useId()
  return (
    <div className="cm-campo max-w-none">
      <label htmlFor={id} className="cm-campo-rotulo">
        {rotulo}
      </label>
      <div className="cm-campo-controle" data-select="">
        <select id={id} value={valor} onChange={(evento) => aoMudar(evento.target.value)} className={caixa(tamanho)}>
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.texto}
            </option>
          ))}
        </select>
        <ChevronDown className="cm-campo-seta" aria-hidden="true" />
      </div>
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
  tamanho?: TamanhoDoCampo
}

/** O controle de fuso das telas Começar, Família e Conta. */
export function SeletorFuso({ rotulo, valor, aoMudar, guardado, ajuda, erro, refEntrada, tamanho = 'site' }: SeletorFusoProps) {
  const id = useId()
  const { opcoes, foraDaLista } = useMemo(() => {
    const lista = listaDeFusos()
    if (guardado && !lista.includes(guardado)) return { opcoes: [guardado, ...lista], foraDaLista: guardado }
    return { opcoes: lista, foraDaLista: null }
  }, [guardado])

  return (
    <div className="cm-campo max-w-none">
      <label htmlFor={id} className="cm-campo-rotulo">
        {rotulo}
      </label>
      <div className="cm-campo-controle" data-select="">
        <select
          ref={refEntrada}
          id={id}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={ligar(id, ajuda, erro)}
          className={caixa(tamanho)}
        >
          {opcoes.map((fuso) => (
            <option key={fuso} value={fuso}>
              {fuso === foraDaLista ? COMECAR.fusoAtual(fuso) : fuso}
            </option>
          ))}
        </select>
        <ChevronDown className="cm-campo-seta" aria-hidden="true" />
      </div>
      <Descricoes id={id} ajuda={ajuda} erro={erro} />
    </div>
  )
}
