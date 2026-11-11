import { useId, type ReactNode } from 'react'
import { COMUM } from '../../conteudo/rotina.ts'
import type { Papel } from '../../dados/comum.ts'
import { AvisoDeErro } from './AvisoDeErro.tsx'
import type { Secao } from './useSecao.ts'

const CARTAO =
  'rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) px-5 pt-5 pb-5 [box-shadow:var(--sombra-cartao)] lg:px-7 lg:pt-7'

interface Props<T> {
  secao: Secao<T>
  titulo: string
  papel: Papel
  className?: string
  /** Desenha a seção com os dados; recebe o que a leitura trouxe (de agora ou a anterior). */
  children: (dados: T) => ReactNode
}

/**
 * Os estados de uma seção do Hoje (R38-11): carregando (esqueleto com `aria-busy` e o texto para o leitor
 * de tela), erro sem dados (a frase e `Tentar de novo`) e erro com dados (eles continuam, com a frase acima
 * da seção). A falha de uma seção não derruba as outras.
 */
export function SecaoDoHoje<T>({ secao, titulo, papel, className, children }: Props<T>) {
  const idTitulo = useId()
  if (secao.estado === 'carregando' || (secao.estado === 'erro' && secao.dados === null)) {
    return (
      <section
        aria-labelledby={idTitulo}
        aria-busy={secao.estado === 'carregando' ? 'true' : undefined}
        data-secao-estado={secao.estado}
        className={`${CARTAO} ${className ?? ''}`}
      >
        <h2 id={idTitulo} className="cm-h4">
          {titulo}
        </h2>
        {secao.estado === 'erro' && secao.erro ? (
          <AvisoDeErro erro={secao.erro} papel={papel} aoTentarDeNovo={secao.recarregar} className="mt-3" />
        ) : (
          <p className="mt-3 text-(--cor-texto-2)">{COMUM.carregando}</p>
        )}
      </section>
    )
  }
  return (
    <div className={className}>
      {secao.erro ? <AvisoDeErro erro={secao.erro} papel={papel} aoTentarDeNovo={secao.recarregar} className="mb-3" /> : null}
      {secao.dados !== null ? children(secao.dados) : null}
    </div>
  )
}
