import { Outlet, useLocation } from 'react-router'
import { Cabecalho } from './casca/Cabecalho.tsx'
import { Rodape } from './casca/Rodape.tsx'
import type { Contexto } from './casca/textos.ts'
import { ProvedorPrototipo } from '../prototipo/ProvedorPrototipo.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'
import type { EstadoPrototipo } from '../prototipo/estado.ts'

/** A área logada (/app/*) e a página de amostra do sistema usam o cabeçalho logado; o resto, o público. */
function contextoDoCaminho(caminho: string): Contexto {
  return caminho === '/app' || caminho.startsWith('/app/') || caminho === '/sistema' ? 'logado' : 'publico'
}

// A casca do site: cabeçalho, a tela e o rodapé, em todas as rotas. Sem altura mínima própria: o
// rodapé vem depois de todo o conteúdo da tela.
function Casca() {
  const { pathname } = useLocation()
  const { estado, dispatch } = usePrototipo()

  return (
    <div className="sb-casca">
      <Cabecalho
        contexto={contextoDoCaminho(pathname)}
        madrugada={estado.madrugada}
        aoAlternarMadrugada={() => dispatch({ tipo: 'definirMadrugada', valor: !estado.madrugada })}
      />
      <Outlet />
      <Rodape />
    </div>
  )
}

// Layout raiz: guarda o estado do protótipo para o Início, o Hoje e a Sessão compartilharem e
// monta a casca. Cada tela monta o próprio <main>.
export function Layout({ estadoInicial }: { estadoInicial?: EstadoPrototipo }) {
  return (
    <ProvedorPrototipo estadoInicial={estadoInicial}>
      <Casca />
    </ProvedorPrototipo>
  )
}
