import type { ReactNode } from 'react'
import { DuasColunas } from '../acesso/DuasColunas.tsx'
import { Manchete } from '../acesso/Manchete.tsx'
import { useFocoNoTitulo } from './foco.ts'

interface Props {
  /** O texto fixo da rota (o `h1` de uma linha só, quando a tela não tem manchete). */
  titulo: string
  /** As duas linhas do `h1` (a segunda em itálico). Sem elas, o `h1` é o `titulo`. */
  manchete?: readonly [string, string]
  /** A frase curta logo abaixo do `h1`. */
  frase?: ReactNode
  /** Os links secundários, depois do formulário, sobre um fio de 1 px. */
  ligacoes?: ReactNode
  /** Enquanto a sessão carrega, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  /** O formulário (ou o estado da tela). Sem ele, só o `h1`, a frase e os links. */
  children?: ReactNode
}

// A moldura das telas públicas de acesso, no cabeçalho e no rodapé da casca (sem marca, sem aviso de
// demonstração e sem cabeçalho próprios): o `<main>` na área de conteúdo, a coluna do formulário no
// papel e o painel de mel com a cena (`DuasColunas`). `h1` e frase, o formulário e, por último, os
// links secundários.
export function MolduraPublica({ titulo, manchete, frase, ligacoes, ocupado = false, children }: Props) {
  const tituloRef = useFocoNoTitulo()

  return (
    <main aria-busy={ocupado || undefined} className="cm-area pt-6 lg:pt-10">
      <DuasColunas>
        {manchete ? (
          <Manchete linhas={manchete} refTitulo={tituloRef} />
        ) : (
          <h1 ref={tituloRef} tabIndex={-1} className="cm-h2 alvo-foco">
            {titulo}
          </h1>
        )}
        {frase ? <p className="cm-lide cm-medida">{frase}</p> : null}
        {children ? <div className="flex max-w-[28rem] flex-col gap-5">{children}</div> : null}
        {ligacoes ? (
          <div className="flex max-w-[28rem] flex-wrap items-center gap-x-4 border-t border-[var(--cor-fio-suave)] pt-4">
            {ligacoes}
          </div>
        ) : null}
      </DuasColunas>
    </main>
  )
}
