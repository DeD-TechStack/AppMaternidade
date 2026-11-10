import { Fragment, type ReactNode } from 'react'
import type { SecaoDeLeitura } from '../../conteudo/publicas.ts'
import { LinhaDeLeitura } from './LinhaDeLeitura.tsx'

interface Props {
  secoes: readonly SecaoDeLeitura[]
  /** O espaço de cima da primeira linha: uma das classes `sb-mt-*`. As outras encostam na anterior. */
  margem?: string
  /** Um bloco (uma mídia) entre duas linhas: vem depois da linha `depoisDe` (contando de 1). */
  entre?: { depoisDe: number; bloco: ReactNode }
}

/** Uma `section` por linha de leitura, na ordem, com um bloco opcional entre duas delas. */
export function LeituraEmLinhas({ secoes, margem, entre }: Props) {
  return (
    <>
      {secoes.map(({ secao, blocos }, indice) => {
        // A linha que vem logo depois do bloco do meio tem o espaço de uma mídia para linhas (160).
        const depoisDoBloco = entre !== undefined && entre.depoisDe === indice
        const margemDaLinha = indice === 0 ? margem : depoisDoBloco ? 'sb-mt-midia-linhas' : undefined
        return (
          <Fragment key={secao.id}>
            <LinhaDeLeitura secao={secao} blocos={blocos} margem={margemDaLinha} />
            {entre && entre.depoisDe === indice + 1 ? entre.bloco : null}
          </Fragment>
        )
      })}
    </>
  )
}
