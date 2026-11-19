import { useEffect, useRef } from 'react'
import { matchPath, Outlet, useLocation, useMatches } from 'react-router'
import { Cabecalho, useCabecalhoNoite } from './casca/Cabecalho.tsx'
import { Rodape } from './casca/Rodape.tsx'
import type { Contexto } from './casca/textos.ts'
import { useLuaDoCabecalho } from './casca/luaDoCabecalho.ts'
import { useRolarParaAncora } from './casca/useRolarParaAncora.ts'
import { AREA_DA_ROTINA } from './rotina/madrugada.ts'

// A noite do cabeçalho mora em casca/Cabecalho.tsx; as páginas a pedem por aqui.
export { useCabecalhoNoite }

/** A área logada (/app/*) usa o cabeçalho logado, com o modo madrugada; o resto, o público. */
function contextoDoCaminho(caminho: string): Contexto {
  return caminho === '/app' || caminho.startsWith('/app/') ? 'logado' : 'publico'
}

// A casca do site: cabeçalho, a tela e o rodapé, em todas as rotas. Sem altura mínima própria: o
// rodapé vem depois de todo o conteúdo da tela.
function Casca() {
  const { pathname, hash } = useLocation()
  const caminhoAnterior = useRef(pathname)
  const { madrugada, alternar } = useLuaDoCabecalho()
  const contexto = contextoDoCaminho(pathname)
  // Carga a frio de /rota#id: a rota preguiçosa só existe depois do primeiro commit da casca.
  useRolarParaAncora()
  // O "Modo madrugada" só existe nas páginas da Rotina (a rota pai delas leva `handle.area`).
  const naRotina = useMatches().some((rota) => (rota.handle as { area?: unknown } | undefined)?.area === AREA_DA_ROTINA)

  // Os títulos (h1 a h4) herdam a face de exibição só no site público e na /sistema (DS1:RF-05): a área logada
  // (/app/*) e a fila de moderação (/moderacao*) mantêm o desenho delas (site.css, `data-titulos`).
  const daModeracao = pathname === '/moderacao' || pathname.startsWith('/moderacao/')
  const titulosDoSite = contexto === 'publico' && !daModeracao

  useEffect(() => {
    const mudouDePagina = caminhoAnterior.current !== pathname
    caminhoAnterior.current = pathname
    // Só uma troca de caminho já renderizada: não disputa hashes nem repete no StrictMode.
    if (!mudouDePagina || hash || !titulosDoSite) return
    // As seis telas públicas de acesso já cuidam da rolagem e do foco no título.
    // Só os caminhos de rotas/conta.tsx: importar o registro acopla seus pacotes à entrada pública.
    const caminhosDeAcesso = ['/entrar', '/criar-conta', '/recuperar-acesso', '/redefinir-senha', '/conta-excluida', '/convite']
    if (caminhosDeAcesso.some((caminho) => matchPath(caminho, pathname))) return
    window.scrollTo(0, 0)
  }, [pathname, hash, titulosDoSite])

  // `sb-casca` continua como marcador da casca para os testes das telas do app.
  return (
    <div className="sb-casca cm-casca" data-titulos={titulosDoSite ? 'site' : undefined}>
      <Cabecalho contexto={contexto} comLua={naRotina} madrugada={madrugada} aoAlternarMadrugada={alternar} />
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
