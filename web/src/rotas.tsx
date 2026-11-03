import type { RouteObject } from 'react-router'
import { Layout } from './componentes/Layout.tsx'
import { Inicio } from './paginas/Inicio.tsx'
import { NaoEncontrada } from './paginas/NaoEncontrada.tsx'

export const rotas: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Inicio /> },
      { path: '*', element: <NaoEncontrada /> },
    ],
  },
]
