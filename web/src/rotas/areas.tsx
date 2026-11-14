import type { RouteObject } from 'react-router'
import { GuardaSessao } from '../componentes/conta/guarda.tsx'
import { navegacaoComunidade, rotasComunidadeLogadas, rotasComunidadePublicas } from './comunidade.tsx'
import { navegacaoConta, rotasContaLogadas, rotasContaPublicas } from './conta.tsx'
import {
  navegacaoDesenvolvimento,
  rotasDesenvolvimentoLogadas,
  rotasDesenvolvimentoPublicas,
} from './desenvolvimento.tsx'
import { navegacaoModeracao, rotasModeracaoLogadas, rotasModeracaoPublicas } from './moderacao.tsx'
import type { ItemNavegacao } from './navegacao.ts'
import { navegacaoRotina, rotasRotinaLogadas, rotasRotinaPublicas } from './rotina.tsx'

/** Os itens da navegação logada (o cabeçalho do site): a junção das cinco áreas, por `ordem`. */
export const itensNavegacao: ItemNavegacao[] = [
  ...navegacaoRotina,
  ...navegacaoDesenvolvimento,
  ...navegacaoComunidade,
  ...navegacaoModeracao,
  ...navegacaoConta,
].sort((a, b) => a.ordem - b.ordem)

// O registro de rotas por área: as rotas públicas das cinco áreas e uma rota sem caminho com a guarda,
// cujos filhos são as logadas. O provedor de sessão fica acima da casca (`rotas.tsx`), para o cabeçalho
// também seguir a sessão. Cada tarefa edita só o arquivo da própria área.
export const rotasDasAreas: RouteObject[] = [
  ...rotasContaPublicas,
  ...rotasRotinaPublicas,
  ...rotasDesenvolvimentoPublicas,
  ...rotasComunidadePublicas,
  ...rotasModeracaoPublicas,
  {
    element: <GuardaSessao />,
    children: [
      ...rotasContaLogadas,
      ...rotasRotinaLogadas,
      ...rotasDesenvolvimentoLogadas,
      ...rotasComunidadeLogadas,
      ...rotasModeracaoLogadas,
    ],
  },
]
