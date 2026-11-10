import type { SecaoDeLeitura } from '../../conteudo/publicas.ts'
import { LinhaDeLeitura } from './LinhaDeLeitura.tsx'

interface Props {
  secoes: readonly SecaoDeLeitura[]
  /** O espaço de cima da primeira linha: uma das classes `sb-mt-*`. As outras encostam na anterior. */
  margem?: string
}

/** Uma `section` por linha de leitura, na ordem, seguidas: os 32 px entre elas vêm da própria linha. */
export function LeituraEmLinhas({ secoes, margem }: Props) {
  return (
    <>
      {secoes.map(({ secao, blocos }, indice) => (
        <LinhaDeLeitura key={secao.id} secao={secao} blocos={blocos} margem={indice === 0 ? margem : undefined} />
      ))}
    </>
  )
}
