import { useId, type Ref } from 'react'
import { Link } from 'react-router'

interface SessaoEmAndamento {
  rotulo: string
  duracao: string
  pessoa: string
}

interface Props {
  sessao: SessaoEmAndamento | null
  aoEncerrar?: () => void
  /** O Hoje guarda o cartão para levar o foco até ele (tabindex="-1"). A miniatura não tem. */
  ref?: Ref<HTMLElement>
  /** Versão do Início: sem contorno próprio (o painel já tem) e sem nada focável. */
  miniatura?: boolean
}

export function CartaoEmAndamento({ sessao, aoEncerrar, ref, miniatura = false }: Props) {
  const idTitulo = useId()
  return (
    <section
      ref={ref}
      aria-labelledby={idTitulo}
      tabIndex={miniatura ? undefined : -1}
      className={miniatura ? 'bloco-miniatura' : 'cartao alvo-foco'}
    >
      <h2 id={idTitulo} className="rotulo">
        Em andamento
      </h2>
      {sessao ? (
        <>
          <p className="mt-3 text-lg font-semibold">{sessao.rotulo}</p>
          <p className="numero-grande mt-1">{sessao.duracao}</p>
          <p className="mt-1">{`por ${sessao.pessoa}`}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="botao botao-principal"
              onClick={aoEncerrar}
              disabled={miniatura}
              tabIndex={miniatura ? -1 : undefined}
            >
              Encerrar
            </button>
            <Link
              to="/app/sessao"
              state={{ foco: 'titulo' }}
              className="botao botao-secundario"
              tabIndex={miniatura ? -1 : undefined}
            >
              Ver sessão
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-3">Nenhuma sessão em andamento.</p>
      )}
    </section>
  )
}
