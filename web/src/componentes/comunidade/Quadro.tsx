import { useEffect, type ReactNode } from 'react'
import { useFocoNoTitulo } from '../conta/foco.ts'
import { MolduraLogada } from '../conta/MolduraLogada.tsx'
import { TopoDaTela } from './Avisos.tsx'

// O quadro das telas da Comunidade: a moldura logada da base com o link "Voltar" e o selo no topo do
// conteúdo, e a meta que deixa a página fora dos buscadores enquanto a tela está montada.

/** Enquanto uma tela da Comunidade está montada, o `<head>` pede que nenhum buscador a indexe. */
function useForaDosBuscadores() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}

interface QuadroProps {
  voltar?: string
  /** A leitura em curso: o `<main>` leva `aria-busy`. */
  ocupado?: boolean
  children: ReactNode
}

export function Quadro({ voltar, ocupado = false, children }: QuadroProps) {
  useForaDosBuscadores()
  return (
    <MolduraLogada ocupado={ocupado}>
      <TopoDaTela voltar={voltar} />
      {children}
    </MolduraLogada>
  )
}

interface TituloProps {
  /** Duas linhas: a ênfase é a segunda linha inteira em itálico. */
  linhas?: readonly [string, string]
  children?: string
}

/** O `h1` da tela: recebe o foco por programa quando a tela muda (`useFocoNoTitulo`). */
export function TituloDaTela({ linhas, children }: TituloProps) {
  const foco = useFocoNoTitulo()
  return (
    <h1 ref={foco} tabIndex={-1} className="cm-h2 alvo-foco wrap-anywhere">
      {linhas ? (
        <>
          {linhas[0]}
          <span className="cm-segunda-linha" style={{ display: 'block' }}>
            {` ${linhas[1]}`}
          </span>
        </>
      ) : (
        children
      )}
    </h1>
  )
}
