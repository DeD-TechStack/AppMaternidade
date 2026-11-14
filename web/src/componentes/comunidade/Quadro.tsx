import { useEffect, type ReactNode } from 'react'
import { useFocoNoTitulo } from '../conta/foco.ts'
import { Pilha } from '../base/layout/Pilha.tsx'
import { MolduraLogada } from '../conta/MolduraLogada.tsx'
import { TopoDaTela } from './Avisos.tsx'
import { Faixa } from './Faixa.tsx'

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
  /** O `h1` da tela (`TituloDaTela`). */
  titulo: ReactNode
  /** A frase de abertura abaixo do título, em `leitura`. */
  lide?: string
  /** Os blocos de estado da primeira seção, depois do título: aviso de saúde, confirmação, erro, esqueleto. */
  cabeca?: ReactNode
  /** As demais seções da tela: cada uma é uma `Faixa`, filha direta do `<main>`. */
  children?: ReactNode
}

/**
 * A moldura da Comunidade: a primeira seção reúne o link "Voltar" e o selo (juntos, o sobretítulo do título), o título,
 * a abertura e os blocos de estado; as outras seções vêm de `children`.
 */
export function Quadro({ voltar, ocupado = false, titulo, lide, cabeca, children }: QuadroProps) {
  useForaDosBuscadores()
  return (
    <MolduraLogada ocupado={ocupado}>
      <Faixa>
        <Pilha vao="grupo">
          <Pilha vao="pilha">
            <Pilha vao="junto">
              <TopoDaTela voltar={voltar} />
              {titulo}
            </Pilha>
            {lide ? <p className="cm-lide text-abertura max-w-leitura text-[var(--cor-texto-2)]">{lide}</p> : null}
          </Pilha>
          {cabeca}
        </Pilha>
      </Faixa>
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
    <h1 ref={foco} tabIndex={-1} className="cm-h2 text-titulo-1 alvo-foco wrap-anywhere">
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
