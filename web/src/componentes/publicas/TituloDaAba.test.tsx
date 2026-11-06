import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
import { escolherTitulo } from './TituloDaAba.tsx'

describe('escolherTitulo', () => {
  it('sem nenhuma rota com handle.titulo, devolve o nome do site', () => {
    expect(escolherTitulo([])).toBe('AppMaternidade')
    expect(escolherTitulo([{ handle: undefined }, { handle: {} }, { handle: { titulo: 3 } }])).toBe('AppMaternidade')
  })

  it('com mais de uma rota que tem título, vale a mais profunda', () => {
    const casadas = [
      { handle: { titulo: 'Raiz | AppMaternidade' } },
      { handle: undefined },
      { handle: { titulo: 'Funda | AppMaternidade' } },
      { handle: {} },
    ]
    expect(escolherTitulo(casadas)).toBe('Funda | AppMaternidade')
  })

  it('uma rota mais rasa vale quando as mais fundas não têm título', () => {
    expect(escolherTitulo([{ handle: { titulo: 'Rasa | AppMaternidade' } }, { handle: {} }])).toBe('Rasa | AppMaternidade')
  })
})

describe('título da aba por rota', () => {
  // O jsdom não rola a janela: a navegação nova chama window.scrollTo.
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  const rotas: Array<[string, string]> = [
    ['/', 'AppMaternidade'],
    ['/como-funciona', 'Como funciona | AppMaternidade'],
    ['/cuidado-compartilhado', 'Cuidado compartilhado | AppMaternidade'],
    ['/desenvolvimento', 'Desenvolvimento e tummy time | AppMaternidade'],
    ['/regras-da-comunidade', 'Regras da comunidade | AppMaternidade'],
    ['/privacidade', 'Política de privacidade | AppMaternidade'],
    ['/termos', 'Termos de uso | AppMaternidade'],
    ['/exclusao-de-conta', 'Exclusão de conta | AppMaternidade'],
    ['/contato', 'Contato | AppMaternidade'],
    ['/sobre', 'Sobre | AppMaternidade'],
    ['/rota-inexistente', 'Página não encontrada | AppMaternidade'],
    ['/app/hoje', 'Hoje | AppMaternidade'],
    ['/app/sessao', 'Sessão | AppMaternidade'],
  ]

  it('cada rota define o título depois de chegar a ela por navegação', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findAllByRole('heading', { level: 1 })

    for (const [caminho, titulo] of rotas) {
      if (caminho === '/sobre') continue
      await act(async () => {
        await roteador.navigate(caminho)
      })
      expect(document.title, caminho).toBe(titulo)
    }
    // O Sobre, a partir do Início.
    await act(async () => {
      await roteador.navigate('/')
    })
    await act(async () => {
      await roteador.navigate('/sobre')
    })
    expect(document.title).toBe('Sobre | AppMaternidade')
  })

  it('a primeira rota mostrada já define o título', async () => {
    renderizarRota('/termos')
    await screen.findAllByRole('heading', { level: 1 })

    expect(document.title).toBe('Termos de uso | AppMaternidade')
  })
})
