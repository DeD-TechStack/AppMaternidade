import type { RouteObject } from 'react-router'
import { AVISOS_TEXTOS } from '../conteudo/avisos.ts'
import { TITULOS, tituloDaAba } from '../conteudo/conta.ts'
import type { ItemNavegacao } from './navegacao.ts'

// As rotas da área de conta. O título da aba é fixo por rota (`handle.titulo`), aplicado pelo
// provedor de sessão. A Família é o item da navegação logada que esta área declara. Cada página é um
// pacote à parte (`lazy`): esta lista não importa componentes de página.

export const rotasContaPublicas: RouteObject[] = [
  {
    path: 'entrar',
    lazy: async () => ({ Component: (await import('../paginas/conta/Entrar.tsx')).Entrar }),
    handle: { titulo: tituloDaAba(TITULOS.entrar) },
  },
  {
    path: 'criar-conta',
    lazy: async () => ({ Component: (await import('../paginas/conta/CriarConta.tsx')).CriarConta }),
    handle: { titulo: tituloDaAba(TITULOS.criarConta) },
  },
  {
    path: 'recuperar-acesso',
    lazy: async () => ({ Component: (await import('../paginas/conta/RecuperarAcesso.tsx')).RecuperarAcesso }),
    handle: { titulo: tituloDaAba(TITULOS.recuperarAcesso) },
  },
  {
    path: 'redefinir-senha',
    lazy: async () => ({ Component: (await import('../paginas/conta/RedefinirSenha.tsx')).RedefinirSenha }),
    handle: { titulo: tituloDaAba(TITULOS.redefinirSenha) },
  },
  {
    path: 'conta-excluida',
    lazy: async () => ({ Component: (await import('../paginas/conta/ContaExcluida.tsx')).ContaExcluida }),
    handle: { titulo: tituloDaAba(TITULOS.contaExcluida) },
  },
  {
    path: 'convite',
    lazy: async () => ({ Component: (await import('../paginas/conta/Convite.tsx')).Convite }),
    handle: { titulo: tituloDaAba(TITULOS.convite) },
  },
]

export const rotasContaLogadas: RouteObject[] = [
  {
    path: 'app/comecar',
    lazy: async () => ({ Component: (await import('../paginas/conta/Comecar.tsx')).Comecar }),
    handle: { titulo: tituloDaAba(TITULOS.comecar) },
  },
  {
    path: 'app/conta',
    lazy: async () => ({ Component: (await import('../paginas/conta/PaginaConta.tsx')).PaginaConta }),
    handle: { titulo: tituloDaAba(TITULOS.conta) },
  },
  {
    path: 'app/familia',
    lazy: async () => ({ Component: (await import('../paginas/conta/Familia.tsx')).Familia }),
    handle: { titulo: tituloDaAba(TITULOS.familia) },
  },
  {
    path: 'app/avisos',
    lazy: async () => ({ Component: (await import('../paginas/avisos/PaginaAvisos.tsx')).PaginaAvisos }),
    handle: { titulo: AVISOS_TEXTOS.abaDaPagina },
  },
]

export const navegacaoConta: ItemNavegacao[] = [
  {
    chave: 'familia',
    rotulo: TITULOS.familia,
    ordem: 50,
    destino: '/app/familia',
    atualEm: ['/app/familia', '/app/conta', '/app/comecar'],
  },
]
