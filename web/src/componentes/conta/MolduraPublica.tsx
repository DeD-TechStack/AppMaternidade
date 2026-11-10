import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MARCA } from '../../conteudo/conta.ts'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { useFocoNoTitulo } from './foco.ts'
import { PainelApoio, type ConteudoDoPainel } from './PainelApoio.tsx'

interface Props {
  /** O `h1` da tela, com o texto fixo da rota. */
  titulo: string
  /** A frase curta do `h1`, na coluna da esquerda. */
  frase?: ReactNode
  /** Os links secundários, logo abaixo da frase. */
  ligacoes?: ReactNode
  /** Enquanto a sessão carrega, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  /** O painel de apoio da tela (sem ele, a tela da conta excluída não tem a terceira peça). */
  painel?: ConteudoDoPainel
  /** O Hoje em miniatura dentro do painel (só a tela Entrar). */
  miniatura?: ReactNode
  children: ReactNode
}

// "Índice e régua" nas telas públicas: a marca no topo sobre uma régua de 1 px na tinta; a partir
// de 60 rem, duas colunas iguais com um fio vertical na tinta: à esquerda o título, a frase e os
// links (quem a pessoa é e onde está) e, embaixo deles, o painel de apoio; à direita a ação (o
// formulário), de uma medida só (27,5 rem) e ancorada no topo, de modo que o fio acaba onde acaba
// o conteúdo dela. Uma só margem e uma só divisão, as mesmas da moldura logada.
//
// São três peças na grade, nesta ordem do DOM: o cabeçalho da tela, a ação e o painel. Abaixo de
// 60 rem ficam empilhadas (título, formulário, painel); a partir dele a ação ocupa a coluna da
// direita nas duas linhas e o painel fica na coluna da esquerda, embaixo do cabeçalho da tela.
export function MolduraPublica({ titulo, frase, ligacoes, ocupado = false, painel, miniatura, children }: Props) {
  const tituloRef = useFocoNoTitulo()

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 pb-16 min-[40rem]:px-8">
      <AvisoDemonstracao />
      <header className="flex min-h-14 items-center border-b">
        <Link to="/" className="marca alvo-toque inline-flex items-center no-underline">
          {MARCA}
        </Link>
      </header>
      <main
        aria-busy={ocupado || undefined}
        className="mt-10 grid gap-10 min-[60rem]:mt-20 min-[60rem]:grid-cols-2 min-[60rem]:gap-x-0 min-[60rem]:gap-y-8"
      >
        <div className="flex min-w-0 flex-col gap-4 min-[60rem]:col-start-1 min-[60rem]:row-start-1 min-[60rem]:pr-16">
          <h1
            ref={tituloRef}
            tabIndex={-1}
            className="titulo-tela text-[clamp(2.75rem,6vw,4.5rem)] font-extrabold leading-none tracking-[-0.02em] outline-none"
          >
            {titulo}
          </h1>
          {frase ? <p className="texto-medida text-[1.125rem]">{frase}</p> : null}
          {ligacoes}
        </div>
        <div
          className={`min-w-0 min-[60rem]:col-start-2 min-[60rem]:row-start-1 min-[60rem]:self-start min-[60rem]:border-l min-[60rem]:pl-16 ${painel ? 'min-[60rem]:row-span-2' : ''}`}
        >
          <div className="flex w-full max-w-[36rem] flex-col gap-5 min-[60rem]:max-w-[27.5rem]">{children}</div>
        </div>
        {painel ? (
          <div className="flex min-w-0 flex-col min-[60rem]:col-start-1 min-[60rem]:row-start-2 min-[60rem]:pr-16">
            <PainelApoio painel={painel} miniatura={miniatura} />
          </div>
        ) : null}
      </main>
    </div>
  )
}
