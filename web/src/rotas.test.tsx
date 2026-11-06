import { describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { PROMESSA } from './conteudo/textos.ts'
import { criarEstadoInicial } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

const semSessao = () => ({ ...criarEstadoInicial(Date.now()), sessao: null })

describe('rotas', () => {
  it('o Início tem um único h1, igual à promessa', async () => {
    renderizarRota('/')

    const titulos = await screen.findAllByRole('heading', { level: 1 })
    expect(titulos).toHaveLength(1)
    expect(titulos[0].textContent).toBe(PROMESSA)
  })

  it('o Início traz os quatro pilares e o link para o Hoje', async () => {
    renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    for (const pilar of ['Rotina', 'Desenvolvimento', 'Cuidado compartilhado', 'Comunidade']) {
      expect(screen.getByText(pilar).className).toContain('etiqueta')
    }
    const link = screen.getByRole('link', { name: 'Ver o protótipo do Hoje' })
    expect(link.getAttribute('href')).toBe('/app/hoje')
    expect(screen.getByText('Protótipo em construção. Nada aqui é dado real.')).toBeTruthy()
  })

  it('as miniaturas do Início ficam inertes e escondidas do leitor de tela', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const miniaturas = container.querySelector('[inert]')
    expect(miniaturas).not.toBeNull()
    expect(miniaturas!.getAttribute('aria-hidden')).toBe('true')
    // Nada dentro é focável por Tab.
    for (const elemento of miniaturas!.querySelectorAll<HTMLElement>('a, button, input, textarea, select')) {
      const fora = elemento.tabIndex < 0 || (elemento as HTMLButtonElement).disabled
      expect(fora, elemento.outerHTML).toBe(true)
    }
  })

  it('o Hoje tem o h1 "Hoje" e um único cartão', async () => {
    const { container } = renderizarRota('/app/hoje')

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Hoje')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(container.querySelectorAll('.cartao')).toHaveLength(1)
    expect(container.querySelector('.cartao .cartao')).toBeNull()
  })

  it('a Sessão com ?tipo=tummy e sem sessão começa um Tummy time', async () => {
    renderizarRota('/app/sessao?tipo=tummy', { estadoInicial: semSessao() })

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Tummy time de Heloísa')
    expect(screen.getByText('Atividade sugerida: Espelho no chão')).toBeTruthy()
    expect(screen.getByText(/^Iniciado às \d{2}:\d{2} por Juliana$/)).toBeTruthy()
  })

  it('a Sessão sem sessão e sem tipo mostra o estado vazio', async () => {
    renderizarRota('/app/sessao', { estadoInicial: semSessao() })

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Nenhuma sessão em andamento')
    const link = screen.getByRole('link', { name: 'Voltar para Hoje' })
    expect(link.getAttribute('href')).toBe('/app/hoje')
  })

  it('a Sessão ignora um ?tipo= inválido', async () => {
    renderizarRota('/app/sessao?tipo=banho', { estadoInicial: semSessao() })

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Nenhuma sessão em andamento')
  })

  it('a Sessão mostra a sessão em andamento e ignora o ?tipo=', async () => {
    renderizarRota('/app/sessao?tipo=tummy')

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Sono de Heloísa')
    expect(screen.queryByText(/Atividade sugerida/)).toBeNull()
  })

  it('a rota inexistente mostra o aviso e o link para o início', async () => {
    renderizarRota('/qualquer-coisa')

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Página não encontrada')

    const link = screen.getByRole('link', { name: 'Voltar ao início' })
    expect(link.getAttribute('href')).toBe('/')
  })

  it('cada tela tem um único main', async () => {
    for (const caminho of ['/', '/app/hoje', '/app/sessao', '/qualquer-coisa']) {
      const { unmount } = renderizarRota(caminho)
      await screen.findByRole('heading', { level: 1 })
      expect(screen.getAllByRole('main'), caminho).toHaveLength(1)
      unmount()
    }
  })
})

describe('navegação inferior', () => {
  it('no Hoje só o item Hoje é link; os outros quatro estão desativados', async () => {
    renderizarRota('/app/hoje')
    const nav = await screen.findByRole('navigation', { name: 'Principal' })

    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Hoje'])
    expect(links[0].getAttribute('href')).toBe('/app/hoje')
    expect(links[0].getAttribute('aria-current')).toBe('page')

    for (const nome of ['Histórico', 'Desenvolvimento', 'Comunidade', 'Família']) {
      const item = within(nav).getByRole('button', { name: nome })
      expect(item.getAttribute('aria-disabled')).toBe('true')
    }
    expect(within(nav).getAllByRole('button')).toHaveLength(4)
  })

  it('"Em breve" aparece uma vez', async () => {
    renderizarRota('/app/hoje')
    await screen.findByRole('navigation', { name: 'Principal' })

    expect(screen.getAllByText('Em breve')).toHaveLength(1)
  })

  it('os itens desativados não fazem nada ao toque', async () => {
    const { roteador } = renderizarRota('/app/hoje')
    const nav = await screen.findByRole('navigation', { name: 'Principal' })

    fireEvent.click(within(nav).getByRole('button', { name: 'Histórico' }))

    expect(roteador.state.location.pathname).toBe('/app/hoje')
  })

  it('na Sessão o item Hoje é link, mas não é a página atual', async () => {
    renderizarRota('/app/sessao')
    const nav = await screen.findByRole('navigation', { name: 'Principal' })

    const link = within(nav).getByRole('link', { name: 'Hoje' })
    expect(link.getAttribute('href')).toBe('/app/hoje')
    expect(link.hasAttribute('aria-current')).toBe(false)
    expect(within(nav).getAllByRole('button')).toHaveLength(4)
    expect(screen.getAllByText('Em breve')).toHaveLength(1)
  })
})
