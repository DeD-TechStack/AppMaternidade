import type { ReactNode } from 'react'
import type { Bloco, Secao } from '../../conteudo/publicas.ts'
import { Blocos } from './Textos.tsx'

interface Props {
  /** O rótulo da linha: um `h2` com id `secao-<slug>`. */
  secao: Secao
  /** O texto da linha: parágrafos e listas. */
  blocos?: readonly Bloco[]
  /** Conteúdo próprio da linha (no lugar de `blocos`, ou depois dele). */
  children?: ReactNode
  /** O que vai abaixo da linha, de c2 a c8 (uma tabela, por exemplo). */
  depois?: ReactNode
  /** O espaço de cima: uma das classes `sb-mt-*`. Sem ela, a linha encosta na anterior. */
  margem?: string
}

/**
 * Linha de leitura: o `h2` é o rótulo (c2–c3), o texto fica em c4–c8 com 32 px de recuo, o fio vertical
 * em x de c4 e o fio horizontal embaixo (as classes da linha rótulo + texto da base). Aceita vários
 * parágrafos, listas e links. Cada linha é uma `section` com um `h2` só, pronto para o foco por código.
 */
export function LinhaDeLeitura({ secao, blocos, children, depois, margem }: Props) {
  return (
    <section className={['sb-area', margem].filter(Boolean).join(' ')}>
      <div className="grade-10">
        <div className="sb-linha vp-linha col-c2-c8">
          <h2 id={secao.id} tabIndex={-1} className="sb-linha-rotulo t-rotulo focus:outline-none">
            {secao.titulo}
          </h2>
          <div className="sb-linha-texto vp-texto t-corpo">
            {blocos ? <Blocos blocos={blocos} /> : null}
            {children}
          </div>
        </div>
      </div>
      {depois ? (
        <div className="grade-10">
          <div className="vp-depois col-c2-c8">{depois}</div>
        </div>
      ) : null}
    </section>
  )
}
