import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { criarRotas } from '../rotas.tsx'

// As rotas de verdade, com `lazy`: o roteador baixa o pacote da página e só então a mostra. Os demais testes de rota
// usam `criarRotasProntas()` (já resolvidas); este garante que o caminho com `lazy` também abre a tela.

describe('rotas com lazy', () => {
  it('/como-funciona abre pelo pacote da página, dentro da casca, com o h1 "Deixa que eu anoto."', async () => {
    vi.stubGlobal('scrollTo', vi.fn())
    const roteador = createMemoryRouter(criarRotas(), { initialEntries: ['/como-funciona'] })
    const { container } = render(<RouterProvider router={roteador} />)

    const h1 = await screen.findByRole('heading', { level: 1, name: 'Deixa que eu anoto.' })
    expect(h1.closest('main')).not.toBeNull()
    expect(container.querySelector('header[data-cabecalho]')).not.toBeNull()
  })
})
