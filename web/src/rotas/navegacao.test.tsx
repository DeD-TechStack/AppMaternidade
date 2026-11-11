import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderizarComDados } from '../teste/renderizarComDados.tsx'
import { itensNavegacao } from './areas.tsx'

// A navegação logada é o cabeçalho do site: os itens vêm do registro das áreas (`itensNavegacao`),
// cada área declara os seus. Só entra item de tela que existe.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('itensNavegacao: o registro das áreas', () => {
  it('é a junção das áreas, ordenada por `ordem`, com uma chave por item', () => {
    const ordens = itensNavegacao.map((item) => item.ordem)
    expect(ordens).toEqual([...ordens].sort((a, b) => a - b))
    const chaves = itensNavegacao.map((item) => item.chave)
    expect(new Set(chaves).size).toBe(chaves.length)
    for (const item of itensNavegacao) {
      expect(item.rotulo.length, item.chave).toBeGreaterThan(0)
      expect(item.destino.startsWith('/app/'), item.chave).toBe(true)
    }
  })

  it('contém Hoje e Família, cada um com destino; a Família vale também em /app/conta e /app/comecar', () => {
    const hoje = itensNavegacao.find((item) => item.chave === 'hoje')
    const familia = itensNavegacao.find((item) => item.chave === 'familia')

    expect(hoje).toMatchObject({ rotulo: 'Hoje', destino: '/app/hoje' })
    expect(familia).toMatchObject({ rotulo: 'Família', ordem: 50, destino: '/app/familia' })
    expect(familia?.atualEm).toEqual(['/app/familia', '/app/conta', '/app/comecar'])
  })
})

describe('o cabeçalho lê o registro', () => {
  const telas: Array<[string, 'juliana' | null]> = [
    ['/app/hoje', null],
    ['/app/sessao', null],
    ['/app/familia', 'juliana'],
    ['/app/conta', 'juliana'],
  ]

  for (const [caminho, sessao] of telas) {
    it(`${caminho}: um link por entrada de itensNavegacao, na ordem, e nenhum item "Em breve"`, async () => {
      const { container } = renderizarComDados(caminho, { sessao })
      await screen.findByRole('heading', { level: 1 })

      const cabecalho = container.querySelector<HTMLElement>('header[data-cabecalho]')!
      const links = within(within(cabecalho).getByRole('navigation', { name: 'Site' })).getAllByRole('link')
      expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual(
        itensNavegacao.map((item) => [item.rotulo, item.destino]),
      )
      expect(screen.queryByText('Em breve')).toBeNull()
      expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
      // Só o modo madrugada e o menu são botões do cabeçalho: nenhum item desativado.
      expect(within(cabecalho).getAllByRole('button').map((botao) => botao.getAttribute('aria-disabled'))).toEqual([null, null])
    })
  }

  it('na Família, o item Família leva aria-current="page"', async () => {
    const { container } = renderizarComDados('/app/familia', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Família' })

    const cabecalho = within(container.querySelector<HTMLElement>('header[data-cabecalho]')!)
    expect(cabecalho.getByRole('link', { name: 'Família' }).getAttribute('aria-current')).toBe('page')
    expect(cabecalho.getByRole('link', { name: 'Hoje' }).hasAttribute('aria-current')).toBe(false)
  })

  it('sem sessão, tocar "Família" no Hoje leva a /entrar?volta=%2Fapp%2Ffamilia', async () => {
    const { roteador } = renderizarComDados('/app/hoje')
    await screen.findByRole('heading', { level: 1, name: 'Hoje' })

    fireEvent.click(screen.getByRole('link', { name: 'Família' }))

    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'))
    expect(roteador.state.location.search).toBe('?volta=%2Fapp%2Ffamilia')
  })
})
