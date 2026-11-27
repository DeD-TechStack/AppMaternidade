import type { ComponentProps } from 'react'
import { QuadroLayout } from '../base/layout/QuadroLayout.tsx'
import { Secao } from '../base/layout/Secao.tsx'

/**
 * Uma seção das telas logadas (Comunidade, Desenvolvimento e Moderação): a `Secao` filha direta do `<main>`, com o
 * `QuadroLayout` dentro. O espaço de cima e de baixo é o da primitiva (`espaco-secao`; `espaco-secao-ampla` na
 * primeira e na última), e nenhuma seção leva margem.
 *
 * `max-w-full`: na moldura da conta o `<main>` mora dentro de `.cm-area`, que em larguras médias é um pouco mais
 * estreita que o quadro; o teto de 100% impede que o quadro passe da moldura e crie rolagem lateral. Em 390 e em
 * 1440 o quadro tem a mesma largura de sempre.
 *
 * `text-corpo`: o texto corrido da seção é o nível `corpo` da tabela de tipo; títulos e legendas trazem o seu.
 */
export function Faixa({ children, ...secao }: ComponentProps<typeof Secao>) {
  return (
    <Secao {...secao}>
      <QuadroLayout className="max-w-full text-corpo">{children}</QuadroLayout>
    </Secao>
  )
}
