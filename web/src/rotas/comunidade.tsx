import type { RouteObject } from 'react-router'
import { TITULO_DA_ABA_COMUNIDADE } from '../conteudo/comunidade.ts'
import type { ItemNavegacao } from './navegacao.ts'

// As rotas da área Comunidade. O título da aba é fixo (`handle.titulo`), aplicado pelo provedor de
// sessão. As rotas fixas (`entrar`, `perfil`, `denuncias`, `topico/...`) têm precedência sobre `:slug`.
// Cada página é um pacote à parte (`lazy`): esta lista não importa componentes de página.
const handle = { titulo: TITULO_DA_ABA_COMUNIDADE }

export const rotasComunidadePublicas: RouteObject[] = []
export const rotasComunidadeLogadas: RouteObject[] = [
  {
    path: 'app/comunidade',
    lazy: async () => ({ Component: (await import('../paginas/comunidade/Comunidade.tsx')).Comunidade }),
    handle,
  },
  {
    path: 'app/comunidade/entrar',
    lazy: async () => ({ Component: (await import('../paginas/comunidade/EntrarNaComunidade.tsx')).EntrarNaComunidade }),
    handle,
  },
  {
    path: 'app/comunidade/perfil',
    lazy: async () => ({ Component: (await import('../paginas/comunidade/MeuPerfil.tsx')).MeuPerfil }),
    handle,
  },
  {
    path: 'app/comunidade/denuncias',
    lazy: async () => ({ Component: (await import('../paginas/comunidade/MinhasDenuncias.tsx')).MinhasDenuncias }),
    handle,
  },
  {
    path: 'app/comunidade/topico/:id',
    lazy: async () => ({ Component: (await import('../paginas/comunidade/Topico.tsx')).Topico }),
    handle,
  },
  {
    path: 'app/comunidade/topico/:id/editar',
    lazy: async () => ({ Component: (await import('../paginas/comunidade/EditarTopico.tsx')).EditarTopico }),
    handle,
  },
  {
    path: 'app/comunidade/:slug',
    lazy: async () => ({ Component: (await import('../paginas/comunidade/Espaco.tsx')).Espaco }),
    handle,
  },
  {
    path: 'app/comunidade/:slug/novo',
    lazy: async () => ({ Component: (await import('../paginas/comunidade/NovoTopico.tsx')).NovoTopico }),
    handle,
  },
]

// O item do cabeçalho logado (MAT-40a, RF-18): logo depois de Hoje e Sessão.
export const navegacaoComunidade: ItemNavegacao[] = [
  { chave: 'comunidade', rotulo: 'Comunidade', ordem: 30, destino: '/app/comunidade', atualEm: ['/app/comunidade'] },
]
