import type { RouteObject } from 'react-router'
import { TITULOS, tituloDaAba } from '../conteudo/conta.ts'
import { Comecar } from '../paginas/conta/Comecar.tsx'
import { ContaExcluida } from '../paginas/conta/ContaExcluida.tsx'
import { Convite } from '../paginas/conta/Convite.tsx'
import { CriarConta } from '../paginas/conta/CriarConta.tsx'
import { Entrar } from '../paginas/conta/Entrar.tsx'
import { Familia } from '../paginas/conta/Familia.tsx'
import { PaginaConta } from '../paginas/conta/PaginaConta.tsx'
import { RecuperarAcesso } from '../paginas/conta/RecuperarAcesso.tsx'
import { RedefinirSenha } from '../paginas/conta/RedefinirSenha.tsx'
import type { ItemNavegacao } from './navegacao.ts'

// As rotas da área de conta. O título da aba é fixo por rota (`handle.titulo`), aplicado pelo
// provedor de sessão. A Família é o item da navegação logada que esta área declara.

export const rotasContaPublicas: RouteObject[] = [
  { path: 'entrar', element: <Entrar />, handle: { titulo: tituloDaAba(TITULOS.entrar) } },
  { path: 'criar-conta', element: <CriarConta />, handle: { titulo: tituloDaAba(TITULOS.criarConta) } },
  {
    path: 'recuperar-acesso',
    element: <RecuperarAcesso />,
    handle: { titulo: tituloDaAba(TITULOS.recuperarAcesso) },
  },
  { path: 'redefinir-senha', element: <RedefinirSenha />, handle: { titulo: tituloDaAba(TITULOS.redefinirSenha) } },
  { path: 'conta-excluida', element: <ContaExcluida />, handle: { titulo: tituloDaAba(TITULOS.contaExcluida) } },
  { path: 'convite', element: <Convite />, handle: { titulo: tituloDaAba(TITULOS.convite) } },
]

export const rotasContaLogadas: RouteObject[] = [
  { path: 'app/comecar', element: <Comecar />, handle: { titulo: tituloDaAba(TITULOS.comecar) } },
  { path: 'app/conta', element: <PaginaConta />, handle: { titulo: tituloDaAba(TITULOS.conta) } },
  { path: 'app/familia', element: <Familia />, handle: { titulo: tituloDaAba(TITULOS.familia) } },
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
