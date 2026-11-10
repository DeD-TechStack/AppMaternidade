import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MARCA } from '../../conteudo/conta.ts'
import { AvisoDemonstracao } from '../AvisoDemonstracao.tsx'
import { useFocoNoTitulo } from './foco.ts'

interface Props {
  /** O `h1` da tela, com o texto fixo da rota. */
  titulo: string
  /** A frase curta do `h1`, na coluna da esquerda. */
  frase?: ReactNode
  /** Os links secundários, logo abaixo da frase. */
  ligacoes?: ReactNode
  /** Enquanto a sessão carrega, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  children: ReactNode
}

// "Índice e régua" nas telas públicas: a marca no topo sobre uma régua de 1 px na tinta; a partir
// de 60 rem, o `h1` grande e a frase à esquerda e o formulário, numa medida de 28 rem, à direita;
// abaixo disso, uma coluna: `h1`, frase, formulário. Sem cartão, sem campo de cor, sem ilustração.
export function MolduraPublica({ titulo, frase, ligacoes, ocupado = false, children }: Props) {
  const tituloRef = useFocoNoTitulo()

  return (
    <div className="mx-auto w-full max-w-[64rem] px-4 pb-16">
      <AvisoDemonstracao />
      <header className="border-b">
        <Link to="/" className="marca alvo-toque inline-flex items-center no-underline">
          {MARCA}
        </Link>
      </header>
      <main
        aria-busy={ocupado || undefined}
        className="mt-10 grid gap-10 min-[60rem]:mt-20 min-[60rem]:grid-cols-[5fr_7fr] min-[60rem]:gap-16"
      >
        <div className="flex flex-col gap-4">
          <h1 ref={tituloRef} tabIndex={-1} className="titulo-tela alvo-foco text-[clamp(2.25rem,5vw,3.5rem)]">
            {titulo}
          </h1>
          {frase ? <p className="texto-medida">{frase}</p> : null}
          {ligacoes}
        </div>
        <div className="flex max-w-[28rem] flex-col gap-5">{children}</div>
      </main>
    </div>
  )
}
