import { useState, type ChangeEventHandler } from 'react'

interface Opcao {
  valor: string
  rotulo: string
}

interface Comum {
  id: string
  rotulo: string
  /** Texto de erro: `corpo-p` em urucum abaixo do campo, ligado ao campo por `aria-describedby`. */
  erro?: string
  /** Ajuda: `corpo-p` secundário abaixo do campo. */
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
 * Campo do sistema-base. Em 768 ou mais, uma linha de c2 a c8 (como a linha rótulo + texto): rótulo
 * em c2–c3 e campo em c4–c8, sem caixa, com o fio horizontal de c2 ao início de c9 embaixo e o fio
 * vertical em x de c4 (do topo + 32 px até o fio de baixo). A linha tem 112 px, e a mensagem de erro
 * ou de ajuda fica dentro dela, abaixo do valor. Abaixo de 768, o rótulo fica em cima e o campo é uma
 * caixa de 64 px. A senha traz o botão de mostrar/ocultar de 44 × 44 (`aria-pressed`).
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
    className: 'sb-campo-entrada',
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': descricao,
  }

  const select = props.tipo === 'select'
  const senha = props.tipo === 'senha'

  return (
    <div className="grade-10">
      <div className="sb-campo col-c2-c8" data-erro={erro ? '' : undefined}>
        <label htmlFor={id} className="sb-campo-rotulo t-rotulo">
          {rotulo}
        </label>
        <div className="sb-campo-controle" data-select={select ? '' : undefined}>
          {props.tipo === 'select' ? (
            <select {...comuns} onChange={props.onChange}>
              {props.opcoes.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
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
              className="sb-campo-olho"
              aria-label={ROTULO_MOSTRAR_SENHA}
              aria-pressed={senhaVisivel}
              onClick={() => setSenhaVisivel((visivel) => !visivel)}
            >
              <span className="sb-olho" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {erro ? (
          <p id={idErro} className="sb-campo-erro t-corpo-p">
            {erro}
          </p>
        ) : null}
        {ajuda ? (
          <p id={idAjuda} className="sb-campo-ajuda t-corpo-p">
            {ajuda}
          </p>
        ) : null}
      </div>
    </div>
  )
}
