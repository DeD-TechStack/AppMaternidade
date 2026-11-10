import { useId, useState, type Ref } from 'react'
import { COMUM } from '../../conteudo/conta.ts'

interface Props {
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  tipo?: 'text' | 'email' | 'password'
  /** Só com `tipo="password"`: o botão "Mostrar senha" de 44 × 44 (`aria-pressed`) no fim do campo. */
  mostrarSenha?: boolean
  autoComplete?: string
  /** Ajuda: `corpo-p` secundário dentro da linha, ligada ao campo por `aria-describedby`. */
  ajuda?: string
  /** Erro: `corpo-p` em urucum dentro da linha, ligado ao campo por `aria-describedby`. */
  erro?: string | null
  /**
   * Uma mensagem de status na mesma linha (`role="status"`, sempre no DOM para o leitor de tela
   * anunciar o que entra nela). Quando falta, a tela já tem a região de status dela fora do campo.
   */
  status?: string | null
  somenteLeitura?: boolean
  refEntrada?: Ref<HTMLInputElement>
}

/**
 * O campo das telas de acesso: a mesma marcação e as mesmas classes de `base/Campo.tsx` (`sb-campo`,
 * `sb-campo-rotulo`, `sb-campo-controle`, `sb-campo-entrada`, `sb-campo-olho`, `sb-campo-erro`,
 * `sb-campo-ajuda`), mais o que a base não tem: o texto controlado pela tela, `ref` do `input` (o foco
 * no primeiro erro), `somenteLeitura` e a mensagem de status na linha. Em 768 ou mais é uma linha de
 * 112 px de c2 a c8 (rótulo em c2–c3, campo em c4–c8); abaixo disso, o rótulo fica em cima de um campo
 * de 64 px. Erro, ajuda e status ficam dentro da linha, sem mudar a altura dela. `data-ajuda` marca a
 * linha que tem ajuda: abaixo de 768 o erro, que fica fora do fluxo, ocupa o lugar da ajuda (ela segue
 * na linha, fora da vista) em vez de cair no vão de 24 px abaixo do campo. `data-status` marca a linha
 * que tem a região de status (mesmo vazia): abaixo de 768 ela reserva uma zona fixa de 2 linhas abaixo
 * do campo, onde moram a confirmação e o erro, para a página não mudar de altura (R-3).
 */
export function CampoAcesso({
  rotulo,
  valor,
  aoMudar,
  tipo = 'text',
  mostrarSenha = false,
  autoComplete,
  ajuda,
  erro,
  status,
  somenteLeitura = false,
  refEntrada,
}: Props) {
  const id = useId()
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  const idErro = `${id}-erro`
  const idAjuda = `${id}-ajuda`
  const descricao = [erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(' ') || undefined
  const comOlho = tipo === 'password' && mostrarSenha

  return (
    <div className="grade-10">
      <div
        className="sb-campo col-c2-c8"
        data-erro={erro ? '' : undefined}
        data-ajuda={ajuda ? '' : undefined}
        data-status={status !== undefined ? '' : undefined}
      >
        <label htmlFor={id} className="sb-campo-rotulo t-rotulo">
          {rotulo}
        </label>
        <div className="sb-campo-controle">
          <input
            ref={refEntrada}
            id={id}
            type={comOlho && senhaVisivel ? 'text' : tipo}
            value={valor}
            onChange={(evento) => aoMudar(evento.target.value)}
            autoComplete={autoComplete}
            readOnly={somenteLeitura}
            aria-invalid={erro ? true : undefined}
            aria-describedby={descricao}
            className="sb-campo-entrada alvo-toque"
          />
          {comOlho ? (
            <button
              type="button"
              className="sb-campo-olho alvo-toque"
              aria-label={COMUM.mostrarSenha}
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
        {status !== undefined ? (
          <p role="status" className="sb-campo-status t-corpo-p wrap-anywhere">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  )
}
