import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderizarRota } from './teste/renderizarRota.tsx'

describe('rotas', () => {
  it('a página inicial tem um único h1 e o parágrafo provisório', async () => {
    renderizarRota('/')

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(titulo.textContent).toBe('AppMaternidade')

    const paragrafo = screen.getByText(
      'Um lugar para a família registrar e dividir o cuidado com o bebê. Site em construção.',
    )
    expect(paragrafo.tagName).toBe('P')
  })

  it('a rota inexistente mostra o aviso e o link para o início', async () => {
    renderizarRota('/qualquer-coisa')

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Página não encontrada')

    const link = screen.getByRole('link', { name: 'Voltar ao início' })
    expect(link.getAttribute('href')).toBe('/')
  })
})
