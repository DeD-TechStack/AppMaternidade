import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { criarRotas } from '../rotas.tsx'
import type { EstadoPrototipo } from '../prototipo/estado.ts'

interface Opcoes {
  /** Estado inicial do protótipo; sem ele, vale o estado inicial do site. */
  estadoInicial?: EstadoPrototipo
}

// Renderiza o site real num roteador em memória, no caminho pedido.
export function renderizarRota(caminho: string, opcoes: Opcoes = {}) {
  const roteador = createMemoryRouter(criarRotas(opcoes.estadoInicial), { initialEntries: [caminho] })
  const resultado = render(<RouterProvider router={roteador} />)
  return { ...resultado, roteador }
}
