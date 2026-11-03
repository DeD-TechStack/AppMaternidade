import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { rotas } from '../rotas.tsx'

// Renderiza o site real (o array `rotas`) num roteador em memória, no caminho pedido.
export function renderizarRota(caminho: string) {
  const roteador = createMemoryRouter(rotas, { initialEntries: [caminho] })
  return render(<RouterProvider router={roteador} />)
}
