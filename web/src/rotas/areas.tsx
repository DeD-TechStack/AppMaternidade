import type { RouteObject } from 'react-router'
import { GuardaSessao } from '../componentes/conta/guarda.tsx'
import { ProvedorSessao } from '../componentes/conta/sessao.tsx'
import { rotasComunidadeLogadas, rotasComunidadePublicas } from './comunidade.tsx'
import { rotasContaLogadas, rotasContaPublicas } from './conta.tsx'
import { rotasDesenvolvimentoLogadas, rotasDesenvolvimentoPublicas } from './desenvolvimento.tsx'
import { rotasModeracaoLogadas, rotasModeracaoPublicas } from './moderacao.tsx'
import { rotasRotinaLogadas, rotasRotinaPublicas } from './rotina.tsx'

// O registro de rotas por área: uma rota sem caminho com o provedor de sessão, cujos filhos são as
// rotas públicas das cinco áreas e uma rota sem caminho com a guarda, cujos filhos são as logadas.
// Cada tarefa edita só o arquivo da própria área. `/app/hoje` e `/app/sessao` ficam fora daqui.
export const rotasDasAreas: RouteObject[] = [
  {
    element: <ProvedorSessao />,
    children: [
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
    ],
  },
]
