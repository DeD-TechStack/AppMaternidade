import type { ReactNode } from 'react'
import { DuasColunas } from '../acesso/DuasColunas.tsx'
import { Pilha } from '../base/layout/index.ts'
import { Manchete } from '../acesso/Manchete.tsx'
import { useFocoNoTitulo } from './foco.ts'

interface Props {
  /** O texto fixo da rota (o `h1`, quando a tela não tem manchete). */
  titulo: string
  /** O texto do `h1` (uma frase só, em prumo). Sem ele, o `h1` é o `titulo`. */
  manchete?: string
  /** A frase curta logo abaixo do `h1`. */
  frase?: ReactNode
  /** Os links secundários, depois do formulário, sem fio em cima. */
  ligacoes?: ReactNode
  /** Enquanto a sessão carrega, o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  /** O formulário (ou o estado da tela). Sem ele, só o `h1`, a frase e os links. */
  children?: ReactNode
}

// A moldura das telas públicas de acesso, no cabeçalho e no rodapé da casca (sem marca, sem aviso de
// demonstração e sem cabeçalho próprios): o `<main>` com a banda de duas metades (`DuasColunas`: a placa da
// porta à esquerda, o formulário no papel à direita). `h1` e frase, o formulário e, por último, os links
// secundários, que ficam sem fio em cima.
export function MolduraPublica({ titulo, manchete, frase, ligacoes, ocupado = false, children }: Props) {
  const tituloRef = useFocoNoTitulo()

  return (
    <main aria-busy={ocupado || undefined}>
      <DuasColunas>
        <Pilha vao="grupo">
          <Pilha vao="pilha">
            <Manchete texto={manchete ?? titulo} refTitulo={tituloRef} />
            {frase ? <p className="cm-corpo">{frase}</p> : null}
          </Pilha>
          {children ? <Pilha vao="pilha">{children}</Pilha> : null}
          {ligacoes ? <div className="flex flex-wrap items-center gap-x-4">{ligacoes}</div> : null}
        </Pilha>
      </DuasColunas>
    </main>
  )
}
