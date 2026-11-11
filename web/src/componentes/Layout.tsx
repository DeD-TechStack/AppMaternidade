import { Outlet, useLocation } from 'react-router'
import { Cabecalho } from './casca/Cabecalho.tsx'
import { Rodape } from './casca/Rodape.tsx'
import type { Contexto } from './casca/textos.ts'
import { useLuaDaCasca } from './rotina/madrugada.ts'

/** A área logada (/app/*) usa o cabeçalho logado, com o modo madrugada; o resto, o público. */
function contextoDoCaminho(caminho: string): Contexto {
  return caminho === '/app' || caminho.startsWith('/app/') ? 'logado' : 'publico'
}

// A casca do site: cabeçalho, a tela e o rodapé, em todas as rotas. Sem altura mínima própria: o
// rodapé vem depois de todo o conteúdo da tela.
function Casca() {
  const { pathname } = useLocation()
  const { madrugada, alternar } = useLuaDaCasca()
  const contexto = contextoDoCaminho(pathname)

  // `sb-casca` continua como marcador da casca para os testes das telas do app.
  return (
    <div className="sb-casca cm-casca">
      <Cabecalho contexto={contexto} madrugada={madrugada} aoAlternarMadrugada={alternar} />
      <Outlet />
      {/* As telas do app já trazem o aviso de demonstração: o do rodapé fica só no site público. */}
      <Rodape comAviso={contexto === 'publico'} />
    </div>
  )
}

// Layout raiz: monta a casca. Cada tela monta o próprio <main>.
export function Layout() {
  return <Casca />
}
