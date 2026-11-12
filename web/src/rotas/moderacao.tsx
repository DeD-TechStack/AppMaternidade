import type { RouteObject } from 'react-router'
import type { ItemNavegacao } from './navegacao.ts'
import { TITULO_DA_ABA_MODERACAO } from '../conteudo/moderacao.ts'
import { AuditoriaDoPainel } from '../paginas/moderacao/Auditoria.tsx'
import { ConteudoNoPainel } from '../paginas/moderacao/Conteudo.tsx'
import { DenunciaNoPainel } from '../paginas/moderacao/Denuncia.tsx'
import { FilaDeDenuncias } from '../paginas/moderacao/Fila.tsx'
import { PapeisDaPlataforma } from '../paginas/moderacao/Papeis.tsx'

// As rotas da área Moderação. O título da aba é fixo (`handle.titulo`), aplicado pelo provedor de sessão.
const handle = { titulo: TITULO_DA_ABA_MODERACAO }

export const rotasModeracaoPublicas: RouteObject[] = []
export const rotasModeracaoLogadas: RouteObject[] = [
  { path: 'moderacao', element: <FilaDeDenuncias />, handle },
  { path: 'moderacao/denuncia/:id', element: <DenunciaNoPainel />, handle },
  { path: 'moderacao/conteudo/:tipo/:id', element: <ConteudoNoPainel />, handle },
  { path: 'moderacao/auditoria', element: <AuditoriaDoPainel />, handle },
  { path: 'moderacao/papeis', element: <PapeisDaPlataforma />, handle },
]
export const navegacaoModeracao: ItemNavegacao[] = []
