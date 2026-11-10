import type { RouteObject } from 'react-router'
import { Layout } from './componentes/Layout.tsx'
import { Hoje } from './paginas/Hoje.tsx'
import { Inicio } from './paginas/Inicio.tsx'
import { NaoEncontrada } from './paginas/NaoEncontrada.tsx'
import { Sessao } from './paginas/Sessao.tsx'
import type { EstadoPrototipo } from './prototipo/estado.ts'
import { rotasDasAreas } from './rotas/areas.tsx'

// Os testes injetam um estado inicial; no site ele nasce quando a página carrega.
export function criarRotas(estadoInicial?: EstadoPrototipo): RouteObject[] {
  return [
    {
      element: <Layout estadoInicial={estadoInicial} />,
      children: [
        { index: true, element: <Inicio /> },
        { path: 'app/hoje', element: <Hoje /> },
        { path: 'app/sessao', element: <Sessao /> },
        ...rotasDasAreas,
        { path: '*', element: <NaoEncontrada /> },
      ],
    },
  ]
}

export const rotas: RouteObject[] = criarRotas()
