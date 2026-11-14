import { useId, type ReactNode } from 'react'
import { COMUM } from '../../conteudo/rotina.ts'
import type { Papel } from '../../dados/comum.ts'
import { AvisoDeErro } from './AvisoDeErro.tsx'
import { Pilha } from '../base/layout/index.ts'
import type { Secao } from './useSecao.ts'

interface Props<T> {
  secao: Secao<T>
  titulo: string
  papel: Papel
  className?: string
  /** Valores a somar no `data-h` da Pilha da seção (`coluna`, quando ela é filha de `Colunas`). */
  dataH?: string
  /** Desenha a seção com os dados; recebe o que a leitura trouxe (de agora ou a anterior). */
  children: (dados: T) => ReactNode
}

/**
 * Os estados de uma seção do Hoje (R38-11): carregando (esqueleto com `aria-busy` e o texto para o leitor
 * de tela), erro sem dados (a frase e `Tentar de novo`) e erro com dados (eles continuam, com a frase acima
 * da seção). A falha de uma seção não derruba as outras.
 */
export function SecaoDoHoje<T>({ secao, titulo, papel, className, dataH, children }: Props<T>) {
  const idTitulo = useId()
  if (secao.estado === 'carregando' || (secao.estado === 'erro' && secao.dados === null)) {
    return (
      <Pilha
        as="section"
        vao="pilha"
        dataH={dataH}
        aria-labelledby={idTitulo}
        aria-busy={secao.estado === 'carregando' ? 'true' : undefined}
        data-secao-estado={secao.estado}
        className={className}
      >
        <h2 id={idTitulo} className="cm-h4">
          {titulo}
        </h2>
        {secao.estado === 'erro' && secao.erro ? (
          <AvisoDeErro erro={secao.erro} papel={papel} aoTentarDeNovo={secao.recarregar} />
        ) : (
          <p className="text-(--cor-texto-2)">{COMUM.carregando}</p>
        )}
      </Pilha>
    )
  }
  return (
    <Pilha vao="pilha" dataH={dataH} className={className}>
      {secao.erro ? <AvisoDeErro erro={secao.erro} papel={papel} aoTentarDeNovo={secao.recarregar} /> : null}
      {secao.dados !== null ? children(secao.dados) : null}
    </Pilha>
  )
}
