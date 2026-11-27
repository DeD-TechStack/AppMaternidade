import { describe, expect, it, vi } from 'vitest'
import { act, isInaccessible, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { criarRotas } from '../rotas.tsx'
import { comLimiteDeErro } from '../rotasComErro.tsx'

// Retém o lazy real até o teste liberar o pacote, sem relógio nem rotas pré-resolvidas.
function criarRotasPendentes() {
  const rotas = criarRotas()
  const rota = rotas[0].children?.[0].children?.find(({ path }) => path === 'regras-da-comunidade')
  const carregar = rota?.lazy
  if (!rota || typeof carregar !== 'function') throw new Error('A rota pública precisa continuar lazy')
  let liberar!: () => void
  let rejeitar!: (erro: Error) => void
  const pendente = new Promise<void>((resolve, reject) => {
    liberar = resolve
    rejeitar = reject
  })
  rota.lazy = async (...args) => {
    await pendente
    return carregar(...args)
  }
  return { rotas, liberar, rejeitar }
}

// As rotas de verdade, com `lazy`: o roteador baixa o pacote da página e só então a mostra. Os demais testes de rota
// usam `criarRotasProntas()` (já resolvidas); estes também exercitam o intervalo em que o pacote está pendente.
describe('rotas com lazy', () => {
  it('mostra um status visível na entrada direta enquanto o pacote está pendente e o substitui pela página', async () => {
    vi.stubGlobal('scrollTo', vi.fn())
    const avisos = vi.spyOn(console, 'warn')
    const { rotas, liberar } = criarRotasPendentes()
    const roteador = createMemoryRouter(comLimiteDeErro(rotas), { initialEntries: ['/regras-da-comunidade'] })
    const { unmount } = render(<RouterProvider router={roteador} />)

    try {
      expect(roteador.state.initialized).toBe(false)
      const status = screen.getByRole('status')
      expect(status.textContent).toBe('Carregando a página…')
      expect(isInaccessible(status)).toBe(false)
      expect(status.querySelector('.sr-only')).toBeNull()
      expect(status.getAttribute('aria-busy')).toBe('true')
      expect(avisos.mock.calls.flat().join(' ')).not.toContain('HydrateFallback')
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull()

      await act(async () => liberar())

      expect(await screen.findByRole('heading', { level: 1, name: 'Regras da comunidade' })).toBeTruthy()
      expect(screen.queryByText('Carregando a página…')).toBeNull()
      expect(roteador.state.initialized).toBe(true)
    } finally {
      unmount()
      roteador.dispose()
    }
  })

  it('substitui o carregamento pela recuperação existente quando o pacote é rejeitado', async () => {
    const erros = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rotas, rejeitar } = criarRotasPendentes()
    const roteador = createMemoryRouter(comLimiteDeErro(rotas), { initialEntries: ['/regras-da-comunidade'] })
    const { container, unmount } = render(<RouterProvider router={roteador} />)

    try {
      expect(screen.getByRole('status').textContent).toBe('Carregando a página…')

      await act(async () => rejeitar(new Error('detalhe privado do pacote')))

      const titulo = await screen.findByRole('heading', { level: 1, name: 'Algo deu errado nesta página' })
      expect(screen.queryByRole('status')).toBeNull()
      expect(screen.queryByText('Carregando a página…')).toBeNull()
      expect(screen.getByRole('alert').textContent).not.toBe('')
      expect(screen.getByRole('button', { name: 'Recarregar a página' })).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Ir para o início' }).getAttribute('href')).toBe('/')
      expect(document.activeElement).toBe(titulo)
      expect(container.textContent).not.toMatch(/Unexpected Application Error|detalhe privado do pacote/)
      const registros = erros.mock.calls.filter(([mensagem]) => String(mensagem).startsWith('[AppMaternidade]'))
      expect(registros).toHaveLength(1)
      expect(registros.flat().join(' ')).toContain('/regras-da-comunidade')
      expect(registros.flat().join(' ')).not.toContain('detalhe privado do pacote')
    } finally {
      unmount()
      roteador.dispose()
    }
  })

  it('/como-funciona abre pelo pacote da página, dentro da casca, com o h1 "Deixa que eu anoto."', async () => {
    vi.stubGlobal('scrollTo', vi.fn())
    const roteador = createMemoryRouter(criarRotas(), { initialEntries: ['/como-funciona'] })
    const { container } = render(<RouterProvider router={roteador} />)

    const h1 = await screen.findByRole('heading', { level: 1, name: 'Deixa que eu anoto.' })
    expect(h1.closest('main')).not.toBeNull()
    expect(container.querySelector('header[data-cabecalho]')).not.toBeNull()
  })
})
