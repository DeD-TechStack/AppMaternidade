import { Outlet } from 'react-router'
import { ProvedorPrototipo } from '../prototipo/ProvedorPrototipo.tsx'
import type { EstadoPrototipo } from '../prototipo/estado.ts'

// Layout raiz: guarda o estado do protótipo para o Início, o Hoje e a Sessão compartilharem.
// Cada tela monta o próprio <main>.
export function Layout({ estadoInicial }: { estadoInicial?: EstadoPrototipo }) {
  return (
    <ProvedorPrototipo estadoInicial={estadoInicial}>
      <Outlet />
    </ProvedorPrototipo>
  )
}
