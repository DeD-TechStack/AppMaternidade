import type { RouteObject } from 'react-router'
import { TITULO_DA_ABA_COMUNIDADE } from '../conteudo/comunidade.ts'
import { Comunidade } from '../paginas/comunidade/Comunidade.tsx'
import { EditarTopico } from '../paginas/comunidade/EditarTopico.tsx'
import { EntrarNaComunidade } from '../paginas/comunidade/EntrarNaComunidade.tsx'
import { Espaco } from '../paginas/comunidade/Espaco.tsx'
import { MeuPerfil } from '../paginas/comunidade/MeuPerfil.tsx'
import { MinhasDenuncias } from '../paginas/comunidade/MinhasDenuncias.tsx'
import { NovoTopico } from '../paginas/comunidade/NovoTopico.tsx'
import { Topico } from '../paginas/comunidade/Topico.tsx'
import type { ItemNavegacao } from './navegacao.ts'

// As rotas da área Comunidade. O título da aba é fixo (`handle.titulo`), aplicado pelo provedor de
// sessão. As rotas fixas (`entrar`, `perfil`, `denuncias`, `topico/...`) têm precedência sobre `:slug`.
const handle = { titulo: TITULO_DA_ABA_COMUNIDADE }

export const rotasComunidadePublicas: RouteObject[] = []
export const rotasComunidadeLogadas: RouteObject[] = [
  { path: 'app/comunidade', element: <Comunidade />, handle },
  { path: 'app/comunidade/entrar', element: <EntrarNaComunidade />, handle },
  { path: 'app/comunidade/perfil', element: <MeuPerfil />, handle },
  { path: 'app/comunidade/denuncias', element: <MinhasDenuncias />, handle },
  { path: 'app/comunidade/topico/:id', element: <Topico />, handle },
  { path: 'app/comunidade/topico/:id/editar', element: <EditarTopico />, handle },
  { path: 'app/comunidade/:slug', element: <Espaco />, handle },
  { path: 'app/comunidade/:slug/novo', element: <NovoTopico />, handle },
]

// O item do cabeçalho logado (MAT-40a, RF-18): logo depois de Hoje e Sessão.
export const navegacaoComunidade: ItemNavegacao[] = [
  { chave: 'comunidade', rotulo: 'Comunidade', ordem: 30, destino: '/app/comunidade', atualEm: ['/app/comunidade'] },
]
