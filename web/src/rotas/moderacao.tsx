import type { RouteObject } from 'react-router'
import type { ItemNavegacao } from './navegacao.ts'
import { TITULO_DA_ABA_MODERACAO } from '../conteudo/moderacao.ts'

// As rotas da área Moderação. O título da aba é fixo (`handle.titulo`), aplicado pelo provedor de sessão.
// Cada página é um pacote à parte (`lazy`): o painel só é baixado por quem o abre.
const handle = { titulo: TITULO_DA_ABA_MODERACAO }

export const rotasModeracaoPublicas: RouteObject[] = []
export const rotasModeracaoLogadas: RouteObject[] = [
  {
    path: 'moderacao',
    lazy: async () => ({ Component: (await import('../paginas/moderacao/Fila.tsx')).FilaDeDenuncias }),
    handle,
  },
  {
    path: 'moderacao/denuncia/:id',
    lazy: async () => ({ Component: (await import('../paginas/moderacao/Denuncia.tsx')).DenunciaNoPainel }),
    handle,
  },
  {
    path: 'moderacao/conteudo/:tipo/:id',
    lazy: async () => ({ Component: (await import('../paginas/moderacao/Conteudo.tsx')).ConteudoNoPainel }),
    handle,
  },
  {
    path: 'moderacao/auditoria',
    lazy: async () => ({ Component: (await import('../paginas/moderacao/Auditoria.tsx')).AuditoriaDoPainel }),
    handle,
  },
  {
    path: 'moderacao/papeis',
    lazy: async () => ({ Component: (await import('../paginas/moderacao/Papeis.tsx')).PapeisDaPlataforma }),
    handle,
  },
]
export const navegacaoModeracao: ItemNavegacao[] = []
