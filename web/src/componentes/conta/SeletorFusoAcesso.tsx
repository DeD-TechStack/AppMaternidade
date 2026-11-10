import { useId, useMemo, type Ref } from 'react'
import { COMECAR } from '../../conteudo/conta.ts'
import { listaDeFusos, nomeDoFuso } from './fusos.ts'

interface Props {
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  /** O fuso que já estava guardado: se não estiver na lista, aparece primeiro, como atual. */
  guardado?: string
  /** Ajuda: `corpo-p` secundário dentro da linha, ligada ao campo por `aria-describedby`. */
  ajuda?: string
  /** Erro: `corpo-p` em urucum dentro da linha, ligado ao campo por `aria-describedby`. */
  erro?: string | null
  refEntrada?: Ref<HTMLSelectElement>
}

/**
 * O controle de fuso das telas Começar e Conta no sistema novo: a mesma marcação e as mesmas classes
 * de `base/Campo.tsx` com `tipo="select"` (`sb-campo`, `sb-campo-controle[data-select]`,
 * `sb-campo-entrada`), mais o que a base não tem: o valor controlado pela tela, o `ref` (o foco no
 * primeiro erro), o fuso guardado fora da lista e a ajuda e o erro ligados por `aria-describedby`.
 * Tem a mesma altura (112 px; 64 abaixo de 768), o mesmo fio e a mesma fonte do campo de texto.
 * O texto de cada opção é o nome legível (`nomeDoFuso`, sem "_"); o `value`, o estado e o envio seguem
 * sendo o identificador IANA.
 */
export function SeletorFusoAcesso({ rotulo, valor, aoMudar, guardado, ajuda, erro, refEntrada }: Props) {
  const id = useId()
  const { opcoes, foraDaLista } = useMemo(() => {
    const lista = listaDeFusos()
    if (guardado && !lista.includes(guardado)) return { opcoes: [guardado, ...lista], foraDaLista: guardado }
    return { opcoes: lista, foraDaLista: null }
  }, [guardado])

  const idErro = `${id}-erro`
  const idAjuda = `${id}-ajuda`
  const descricao = [erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="grade-10">
      <div className="sb-campo col-c2-c8" data-erro={erro ? '' : undefined} data-ajuda={ajuda ? '' : undefined}>
        <label htmlFor={id} className="sb-campo-rotulo t-rotulo">
          {rotulo}
        </label>
        <div className="sb-campo-controle" data-select="">
          <select
            ref={refEntrada}
            id={id}
            value={valor}
            onChange={(evento) => aoMudar(evento.target.value)}
            aria-invalid={erro ? true : undefined}
            aria-describedby={descricao}
            className="sb-campo-entrada alvo-toque"
          >
            {opcoes.map((fuso) => (
              <option key={fuso} value={fuso}>
                {fuso === foraDaLista ? COMECAR.fusoAtual(nomeDoFuso(fuso)) : nomeDoFuso(fuso)}
              </option>
            ))}
          </select>
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
