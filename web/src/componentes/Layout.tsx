import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Cabecalho } from './casca/Cabecalho.tsx'
import { Rodape } from './casca/Rodape.tsx'
import type { Contexto } from './casca/textos.ts'
import { ContextoDaMadrugada } from './rotina/madrugada.ts'

/** A área logada (/app/*) usa o cabeçalho logado, com o modo madrugada; o resto, o público. */
function contextoDoCaminho(caminho: string): Contexto {
  return caminho === '/app' || caminho.startsWith('/app/') ? 'logado' : 'publico'
}

// A casca do site: cabeçalho, a tela e o rodapé, em todas as rotas. Sem altura mínima própria: o
// rodapé vem depois de todo o conteúdo da tela.
function Casca() {
  const { pathname } = useLocation()
  const contexto = contextoDoCaminho(pathname)
  const [ligada, setLigada] = useState(false)

  // O modo madrugada só vale na área logada: sair dela (ir ao Início ou a outra área) o desliga. O estado
  // fica só na memória da página (D-5).
  if (ligada && contexto === 'publico') setLigada(false)
  const madrugada = ligada && contexto === 'logado'

  useEffect(() => {
    if (!madrugada) return
    const raiz = document.documentElement
    raiz.setAttribute('data-tema', 'madrugada')
    return () => raiz.removeAttribute('data-tema')
  }, [madrugada])

  const controle = useMemo(() => ({ madrugada, definir: setLigada }), [madrugada])

  // `sb-casca` continua como marcador da casca para os testes das telas do app.
  return (
    <ContextoDaMadrugada value={controle}>
      <div className="sb-casca cm-casca">
        <Cabecalho contexto={contexto} madrugada={madrugada} aoAlternarMadrugada={() => setLigada(!madrugada)} />
        <Outlet />
        {/* As telas do app já trazem o aviso de demonstração: o do rodapé fica só no site público. */}
        <Rodape comAviso={contexto === 'publico'} />
      </div>
    </ContextoDaMadrugada>
  )
}

// Layout raiz: monta a casca. Cada tela monta o próprio <main>.
export function Layout() {
  return <Casca />
}
