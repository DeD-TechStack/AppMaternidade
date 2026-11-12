import type { RouteObject } from 'react-router'
import { IDS_DOS_ITENS, ITENS_DE_CONTEUDO } from '../componentes/desenvolvimento/itens.ts'
import { TITULO_NAO_ENCONTRADO_DA_ABA, tituloDaAbaDesenvolvimento } from '../conteudo/desenvolvimento/textosLogada.ts'
import { PaginaDesenvolvimento } from '../paginas/desenvolvimento/PaginaDesenvolvimento.tsx'
import { PaginaItem, PaginaItemDaRota } from '../paginas/desenvolvimento/PaginaItem.tsx'

// As rotas da área Desenvolvimento. O título da aba é fixo por rota (`handle.titulo`), aplicado pelo
// provedor de sessão. Cada item tem a rota fixa dele; `:id` só pega o que não existe (T-48).
export const rotasDesenvolvimentoPublicas: RouteObject[] = []
export const rotasDesenvolvimentoLogadas: RouteObject[] = [
  { path: 'app/desenvolvimento', element: <PaginaDesenvolvimento />, handle: { titulo: tituloDaAbaDesenvolvimento('Desenvolvimento') } },
  ...IDS_DOS_ITENS.map((id): RouteObject => {
    const item = ITENS_DE_CONTEUDO.find((candidato) => candidato.id === id)
    return {
      path: `app/desenvolvimento/conteudo/${id}`,
      element: <PaginaItem id={id} />,
      handle: { titulo: tituloDaAbaDesenvolvimento(item?.titulo ?? 'Desenvolvimento') },
    }
  }),
  { path: 'app/desenvolvimento/conteudo/:id', element: <PaginaItemDaRota />, handle: { titulo: TITULO_NAO_ENCONTRADO_DA_ABA } },
]
