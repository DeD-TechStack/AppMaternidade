import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
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

  it('o Início traz os quatro pilares e os links "Ver o protótipo" para o Hoje', async () => {
    renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    for (const pilar of ['Rotina', 'Desenvolvimento', 'Cuidado compartilhado', 'Comunidade']) {
      expect(screen.getByText(pilar).className).toContain('etiqueta')
    }
    // Um na abertura e o círculo CTA: os dois levam ao Hoje.
    const links = screen.getAllByRole('link', { name: 'Ver o protótipo' })
    expect(links).toHaveLength(2)
    for (const link of links) expect(link.getAttribute('href')).toBe('/app/hoje')
    expect(screen.getByText('Protótipo em construção. Nada aqui é dado real.')).toBeTruthy()
  })

  it('as molduras de mídia do Início são imagens nomeadas, sem texto; só os aparelhos de dentro delas são inertes', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    // MAT-44d-5: as molduras têm cena; o inerte vale fora de [data-midia] (não há miniatura inerte).
    for (const inerte of container.querySelectorAll('[inert]')) {
      expect(inerte.closest('[data-midia]'), inerte.outerHTML.slice(0, 60)).not.toBeNull()
    }
    const molduras = [...container.querySelectorAll('[data-midia]')]
    expect(molduras.length).toBeGreaterThan(0)
    for (const moldura of molduras) {
      expect(moldura.getAttribute('role')).toBe('img')
      expect(moldura.getAttribute('aria-label')).toBeTruthy()
      expect(moldura.textContent).toBe('')
    }
  })

  it('o Hoje tem o h1 "Hoje" e um único bloco de cor (Em andamento), sem cartão', async () => {
    const { container } = renderizarRota('/app/hoje')

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Hoje')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(container.querySelectorAll('[data-andamento]')).toHaveLength(1)
    expect(container.querySelector('.cartao')).toBeNull()
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
  // MAT-44d-2: nenhuma tela logada tem navegação inferior (a barra Registrar do Hoje não é navegação).
  // O caminho de volta da Sessão ao Hoje é o link "Voltar para Hoje" da lateral da abertura.
  for (const caminho of ['/app/hoje', '/app/sessao']) {
    it(`${caminho} não tem navegação inferior: nem a nav "Principal", nem a legenda "Em breve", nem itens desativados`, async () => {
      renderizarRota(caminho)
      await screen.findByRole('heading', { level: 1 })

      expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
      expect(screen.queryByText('Em breve')).toBeNull()
      for (const nome of ['Histórico', 'Desenvolvimento', 'Comunidade', 'Família']) {
        expect(screen.queryByRole('button', { name: nome }), nome).toBeNull()
      }
    })
  }

  it('na Sessão o caminho de volta é o link "Voltar para Hoje", na lateral, e leva à página /app/hoje', async () => {
    const { roteador } = renderizarRota('/app/sessao')
    const voltar = await screen.findByRole('link', { name: 'Voltar para Hoje' })
    expect(voltar.getAttribute('href')).toBe('/app/hoje')
    expect(voltar.hasAttribute('aria-current')).toBe(false)

    fireEvent.click(voltar)

    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    expect(roteador.state.location.pathname).toBe('/app/hoje')
  })
})
