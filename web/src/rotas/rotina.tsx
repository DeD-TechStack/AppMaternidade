import type { RouteObject } from 'react-router'
import type { ItemNavegacao } from './navegacao.ts'

// As rotas da área Rotina. A MAT-38 registra as dela aqui (e leva `/app/hoje` e `/app/sessao`).
export const rotasRotinaPublicas: RouteObject[] = []
export const rotasRotinaLogadas: RouteObject[] = []

export const navegacaoRotina: ItemNavegacao[] = [
  { chave: 'hoje', rotulo: 'Hoje', ordem: 10, destino: '/app/hoje', atualEm: ['/app/hoje'] },
  { chave: 'sessao', rotulo: 'Sessão', ordem: 20, destino: '/app/sessao', atualEm: ['/app/sessao'] },
]
