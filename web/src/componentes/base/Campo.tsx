import { useState, type ChangeEventHandler } from 'react'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'

interface Opcao {
  valor: string
  rotulo: string
}

interface Comum {
  id: string
  rotulo: string
  /** Texto de erro abaixo do campo, ligado a ele por `aria-describedby`; marca `aria-invalid`. */
  erro?: string
  /** Ajuda abaixo do campo, em texto secundário. */
  ajuda?: string
  name?: string
  required?: boolean
  autoComplete?: string
  defaultValue?: string
  value?: string
}

type Props =
  | (Comum & { tipo?: 'texto' | 'email' | 'senha'; opcoes?: undefined; onChange?: ChangeEventHandler<HTMLInputElement> })
  | (Comum & { tipo: 'select'; opcoes: readonly Opcao[]; onChange?: ChangeEventHandler<HTMLSelectElement> })

const ROTULO_MOSTRAR_SENHA = 'Mostrar senha'

/**
 * Campo do site: rótulo em cima e a caixa de 56 px com raio 14, contorno de 1,5 px no texto secundário
 * (5,25:1 no papel). Estados: hover (contorno cacau), foco visível (anel de 2 px), erro (contorno de
 * 2 px e a mensagem). A senha traz o botão de mostrar/ocultar de 44 × 44 (`aria-pressed`).
 */
export function Campo(props: Props) {
  const { id, rotulo, erro, ajuda, name, required, autoComplete, defaultValue, value } = props
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  const idErro = `${id}-erro`
  const idAjuda = `${id}-ajuda`
  const descricao = [erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(' ') || undefined
  const comuns = {
    id,
    name,
    required,
    autoComplete,
    defaultValue,
    value,
    className: 'cm-campo-entrada',
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': descricao,
  }

  const select = props.tipo === 'select'
  const senha = props.tipo === 'senha'

  return (
    <div className="cm-campo" data-erro={erro ? '' : undefined}>
      <label htmlFor={id} className="cm-campo-rotulo">
        {rotulo}
      </label>
      <div className="cm-campo-controle" data-select={select ? '' : undefined} data-senha={senha ? '' : undefined}>
        {props.tipo === 'select' ? (
          <>
            <select {...comuns} onChange={props.onChange}>
              {props.opcoes.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
            <ChevronDown className="cm-campo-seta" aria-hidden="true" />
          </>
        ) : (
          <input
            {...comuns}
            type={senha ? (senhaVisivel ? 'text' : 'password') : props.tipo === 'email' ? 'email' : 'text'}
            onChange={props.onChange}
          />
        )}
        {senha ? (
          <button
            type="button"
            className="cm-campo-olho"
            aria-label={ROTULO_MOSTRAR_SENHA}
            aria-pressed={senhaVisivel}
            onClick={() => setSenhaVisivel((visivel) => !visivel)}
          >
            {senhaVisivel ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      {erro ? (
        <p id={idErro} className="cm-campo-mensagem cm-campo-erro cm-pequeno">
          {erro}
        </p>
      ) : null}
      {ajuda ? (
        <p id={idAjuda} className="cm-campo-mensagem cm-pequeno cm-texto-2">
          {ajuda}
        </p>
      ) : null}
    </div>
  )
}
