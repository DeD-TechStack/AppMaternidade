import { useId, useLayoutEffect, useRef, type Ref } from 'react'
import { Link } from 'react-router'
import { Botao } from '../componentes/base/Botao.tsx'

interface SessaoEmAndamento {
  rotulo: string
  duracao: string
  pessoa: string
}

interface Props {
  sessao: SessaoEmAndamento | null
  aoEncerrar: () => void
  /** O Hoje guarda o bloco para levar o foco até ele (tabindex="-1"). */
  ref?: Ref<HTMLElement>
}

// O número nasce em 112 px (linha de 90) e cai para 96, 72 ou 56 se não couber em uma linha, como
// na faixa de números (tabela 2.2). A linha acompanha o tamanho na mesma proporção.
const TAMANHOS_DO_NUMERO = [112, 96, 72, 56] as const
const PROPORCAO_DA_LINHA = 90 / 112

function ajustar(numero: HTMLElement) {
  for (const tamanho of TAMANHOS_DO_NUMERO) {
    numero.style.fontSize = `${tamanho}px`
    numero.style.lineHeight = `${Math.round(tamanho * PROPORCAO_DA_LINHA)}px`
    if (numero.scrollWidth <= numero.clientWidth) return
  }
}

/**
 * O bloco "Em andamento" do Hoje (EMENDAS E4, bloco 2): a sessão em curso num campo de cor, com a
 * duração em número grande e os botões Encerrar (o primário do bloco) e Ver sessão (moldura dupla).
 * Sem sessão: só o rótulo e "Nenhuma sessão em andamento.". O bloco recebe foco por programa.
 */
export function BlocoEmAndamento({ sessao, aoEncerrar, ref }: Props) {
  const idTitulo = useId()
  const numero = useRef<HTMLParagraphElement>(null)
  const duracao = sessao?.duracao

  useLayoutEffect(() => {
    const no = numero.current
    if (!no) return
    const reajustar = () => ajustar(no)
    reajustar()
    if (typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(reajustar)
    observador.observe(no)
    return () => observador.disconnect()
  }, [duracao])

  return (
    <section
      ref={ref}
      aria-labelledby={idTitulo}
      tabIndex={-1}
      data-andamento=""
      className="sb-area sb-mt-fio-bloco ha-andamento alvo-foco"
    >
      <h2 id={idTitulo} className="ha-andamento-rotulo t-rotulo">
        Em andamento
      </h2>
      {sessao ? (
        <>
          <p className="ha-andamento-nome t-corpo-g">{sessao.rotulo}</p>
          <p ref={numero} data-numero="" className="ha-andamento-numero t-numero">
            {sessao.duracao}
          </p>
          <p className="ha-andamento-pessoa t-corpo">{`por ${sessao.pessoa}`}</p>
          <div className="ha-andamento-acoes">
            <Botao className="ha-encerrar alvo-toque" onClick={aoEncerrar}>
              Encerrar
            </Botao>
            <Link
              to="/app/sessao"
              state={{ foco: 'titulo' }}
              className="sb-moldura t-botao alvo-toque"
              data-botao="moldura"
              data-moldura-dupla=""
              data-alto=""
            >
              <span className="sb-moldura-miolo">Ver sessão</span>
            </Link>
          </div>
        </>
      ) : (
        <p className="ha-andamento-nome t-corpo-g">Nenhuma sessão em andamento.</p>
      )}
    </section>
  )
}
