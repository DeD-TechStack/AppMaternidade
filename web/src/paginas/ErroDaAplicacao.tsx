import { useEffect, useRef } from 'react'
import { useLocation, useRouteError } from 'react-router'
import { Botao } from '../componentes/base/Botao.tsx'
import { Pilha, QuadroLayout, Secao } from '../componentes/base/layout/index.ts'
import { NOME_SITE } from '../componentes/casca/textos.ts'
import { ERRO_INICIO, ERRO_PREFIXO_LOG, ERRO_RECARREGAR, ERRO_TEXTO, ERRO_TITULO } from '../conteudo/erroAplicacao.ts'

/**
 * A tela de quando uma rota falha ao renderizar. Ela substitui a árvore inteira (a casca não aparece), então traz a
 * própria moldura mínima: o nome do site, o título, uma linha e as duas saídas. O foco vai para o título.
 */
export function ErroDaAplicacao() {
  const erro = useRouteError()
  const { pathname } = useLocation()
  const titulo = useRef<HTMLHeadingElement>(null)
  const registrado = useRef<unknown>(undefined)

  useEffect(() => {
    titulo.current?.focus()
    // Uma linha por erro, também no StrictMode. Só o nome do erro e o caminho: a mensagem pode trazer dados.
    if (registrado.current === erro) return
    registrado.current = erro
    const nome = erro instanceof Error ? erro.name : typeof erro
    console.error(`${ERRO_PREFIXO_LOG}: ${nome} em ${pathname}`)
  }, [erro, pathname])

  return (
    <main>
      <Secao>
        <QuadroLayout largura="medio">
          <Pilha vao="grupo">
            <p className="cm-marca">{NOME_SITE}</p>
            <h1 ref={titulo} tabIndex={-1} className="cm-h1 alvo-foco">
              {ERRO_TITULO}
            </h1>
            <p role="alert" className="cm-lide cm-medida">
              {ERRO_TEXTO}
            </p>
            <div className="flex flex-wrap items-center gap-x-esp-grupo gap-y-esp-pilha">
              <Botao onClick={() => window.location.reload()}>{ERRO_RECARREGAR}</Botao>
              <Botao to="/" variante="texto">
                {ERRO_INICIO}
              </Botao>
            </div>
          </Pilha>
        </QuadroLayout>
      </Secao>
    </main>
  )
}
