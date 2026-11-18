import type { RouteObject } from 'react-router'
import { ErroDaAplicacao } from './paginas/ErroDaAplicacao.tsx'

/**
 * Envolve a árvore de rotas numa rota sem caminho com `errorElement`: um erro ao renderizar qualquer rota mostra a
 * tela em português (`ErroDaAplicacao`) no lugar da página inglesa do React Router com o stack trace.
 */
export function comLimiteDeErro(rotas: RouteObject[]): RouteObject[] {
  return [{ errorElement: <ErroDaAplicacao />, children: rotas }]
}
