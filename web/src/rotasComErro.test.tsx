import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { comLimiteDeErro } from './rotasComErro.tsx'

// PA-01: um erro ao renderizar qualquer rota mostra a tela de recuperação em português, nunca a página inglesa
// "Unexpected Application Error!" do React Router com o stack trace.

class FalhaDeTeste extends Error {
  name = 'FalhaDeTeste'
}

function Explode(): never {
  throw new FalhaDeTeste('dado que não pode aparecer: juliana@exemplo.com')
}

function montar(rotas: RouteObject[], caminho = '/', basename?: string) {
  const roteador = createMemoryRouter(comLimiteDeErro(rotas), { initialEntries: [caminho], basename })
  return render(<RouterProvider router={roteador} />)
}

function linhasDoApp(espiao: { mock: { calls: unknown[][] } }) {
  return espiao.mock.calls.filter(([primeiro]) => typeof primeiro === 'string' && primeiro.startsWith('[AppMaternidade]'))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('comLimiteDeErro', () => {
  it('uma rota que lança mostra a tela em português, com recarregar e ir para o início', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = montar([{ path: '/', element: <Explode /> }])

    const h1 = await screen.findByRole('heading', { level: 1, name: 'Algo deu errado nesta página' })
    expect(screen.getByRole('button', { name: 'Recarregar a página' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir para o início' }).getAttribute('href')).toBe('/')
    expect(container.textContent).not.toMatch(/Unexpected Application Error/)
    expect(container.textContent).not.toMatch(/juliana@exemplo\.com/)
    // O alerta é anunciado e o foco vai para o título.
    expect(screen.getByRole('alert').textContent).not.toBe('')
    expect(document.activeElement).toBe(h1)
  })

  it('o link "Ir para o início" aponta para a raiz do basename', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    montar([{ path: '/', element: <Explode /> }], '/AppMaternidade/', '/AppMaternidade')

    await screen.findByRole('heading', { level: 1, name: 'Algo deu errado nesta página' })
    expect(screen.getByRole('link', { name: 'Ir para o início' }).getAttribute('href')).toBe('/AppMaternidade')
  })

  it('"Recarregar a página" recarrega o documento', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const recarregar = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload: recarregar })
    montar([{ path: '/', element: <Explode /> }])

    fireEvent.click(await screen.findByRole('button', { name: 'Recarregar a página' }))
    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('escreve uma linha [AppMaternidade] erro de rota, só com o nome do erro e o caminho', async () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => {})
    montar([{ path: '/quebrada', element: <Explode /> }], '/quebrada')

    await screen.findByRole('heading', { level: 1, name: 'Algo deu errado nesta página' })
    const linhas = linhasDoApp(espiao)
    expect(linhas).toHaveLength(1)
    const [primeiro, ...resto] = linhas[0] as unknown[]
    expect(String(primeiro).startsWith('[AppMaternidade] erro de rota')).toBe(true)
    const tudo = [primeiro, ...resto].map(String).join(' ')
    expect(tudo).toContain('FalhaDeTeste')
    expect(tudo).toContain('/quebrada')
    expect(tudo).not.toContain('juliana@exemplo.com')
  })

  // Controle negativo: sem erro, a rota aparece como sempre, sem a tela nem a linha de erro.
  it('uma rota que não lança aparece sem mudança', async () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => {})
    montar([{ path: '/', element: <h1>Página boa</h1> }])

    expect(await screen.findByRole('heading', { level: 1, name: 'Página boa' })).toBeTruthy()
    expect(screen.queryByText('Algo deu errado nesta página')).toBeNull()
    expect(linhasDoApp(espiao)).toHaveLength(0)
  })
})
