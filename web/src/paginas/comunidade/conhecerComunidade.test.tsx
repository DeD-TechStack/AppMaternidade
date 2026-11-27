import { render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvedorDadosConta } from '../../componentes/conta/sessao.tsx'
import { bancoConfigurado } from '../../dados/cliente.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { fixtureComunidadeDemonstracao } from '../../dados/comunidade.demonstracao.ts'
import { criarRotas } from '../../rotas.tsx'
import { criarClienteFalso, renderizarComDados } from '../../teste/renderizarComDados.tsx'

const obterCliente = vi.hoisted(() => vi.fn())
vi.mock('../../dados/cliente.ts', async (original) => ({
  ...(await original<typeof import('../../dados/cliente.ts')>()),
  obterCliente,
}))

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-publica-de-teste')
  obterCliente.mockReset()
  obterCliente.mockResolvedValue(criarClienteFalso({ usuario: null }).cliente)
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Rede proibida neste teste') }))
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => vi.unstubAllEnvs())

// Usa a árvore real, inclusive lazy e basename. A conta injetada está vazia, sem sessão;
// nenhuma troca global de modoDados ou identidade visitante abre a introdução.
function abrirIntroducao(base: string) {
  const dados = criarDadosContaMemoria({ usuarios: [], contas: [], familias: [], vinculos: [], bebes: [], convites: [] })
  const roteador = createMemoryRouter(criarRotas(), {
    basename: base,
    initialEntries: [`${base}comunidade`],
  })
  return {
    ...render(<ProvedorDadosConta dados={dados}><RouterProvider router={roteador} /></ProvedorDadosConta>),
    roteador,
  }
}

describe('introdução pública da Comunidade', () => {
  it.each(['/', '/AppMaternidade/previa/'])('com banco configurado e sem sessão, abre em %s sem cliente nem rede', async (base) => {
    vi.stubEnv('BASE_URL', base)
    const { container, roteador } = abrirIntroducao(base)
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Conheça a comunidade' })
    const main = within(screen.getByRole('main'))
    expect(titulo).toBeTruthy()
    expect(container.querySelectorAll('main')).toHaveLength(1)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    await waitFor(() => expect(document.title).toBe('Comunidade | AppMaternidade'))
    expect(roteador.state.location.pathname).toBe(`${base}comunidade`)
    expect(bancoConfigurado()).toBe(true)
    for (const { nome } of fixtureComunidadeDemonstracao.espacos!) expect(main.getByText(nome)).toBeTruthy()
    const exemplos = within(main.getByRole('region', { name: 'Exemplos fictícios' }))
    expect(exemplos.getAllByText('Exemplo fictício')).toHaveLength(3)
    for (const { titulo: nome, corpo } of fixtureComunidadeDemonstracao.topicos!) {
      expect(exemplos.getByRole('heading', { name: nome })).toBeTruthy()
      expect(exemplos.getByText(corpo)).toBeTruthy()
    }
    // Nenhum perfil/identificador/aceite/conta da fixture é parte da projeção pública.
    for (const perfil of fixtureComunidadeDemonstracao.perfis!) {
      expect(container.textContent).not.toContain(perfil.apelido)
      expect(container.innerHTML).not.toContain(perfil.contaId)
      expect(container.innerHTML).not.toContain(perfil.id)
    }
    expect(main.getByRole('link', { name: 'Participar da comunidade' }).getAttribute('href')).toBe(`${base}app/comunidade`)
    expect(main.getByRole('link', { name: 'Regras da comunidade' }).getAttribute('href')).toBe(`${base}regras-da-comunidade`)
    expect(within(container.querySelector('footer')!).getByRole('link', { name: 'Regras da comunidade' }).getAttribute('href')).toBe(`${base}regras-da-comunidade`)
    expect(container.querySelector('form, textarea')).toBeNull()
    expect(main.queryByRole('textbox')).toBeNull()
    expect(main.queryByRole('button')).toBeNull()
    expect(obterCliente).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sem banco, a introdução também permanece somente leitura', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    const { container } = abrirIntroducao('/')
    await screen.findByRole('heading', { level: 1, name: 'Conheça a comunidade' })
    expect(container.querySelector('form, textarea')).toBeNull()
    expect(obterCliente).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    '/app/comunidade', '/app/comunidade/sono',
    '/app/comunidade/topico/47000000-0000-4000-8000-000000000021',
    '/app/comunidade/entrar', '/app/comunidade/perfil', '/app/comunidade/denuncias',
    '/app/comunidade/sono/novo',
    '/app/comunidade/topico/47000000-0000-4000-8000-000000000021/editar',
  ])('com banco, %s continua exigindo sessão antes de obter cliente', async (caminho) => {
    const { roteador } = renderizarComDados(caminho, { sessao: null })
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'))
    expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent(caminho)}`)
    expect(screen.queryByText('Sonecas curtas de manhã')).toBeNull()
    expect(obterCliente).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})
