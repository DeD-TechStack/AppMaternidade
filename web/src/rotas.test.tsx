import { describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { PROMESSA } from './conteudo/textos.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'
import { semSessaoEmAndamento } from './teste/rotina.fixture.ts'

const semSessao = () => ({ ajustarRotina: semSessaoEmAndamento })

describe('rotas', () => {
  it('o Início tem um único h1, igual à promessa', async () => {
    renderizarRota('/')

    const titulos = await screen.findAllByRole('heading', { level: 1 })
    expect(titulos).toHaveLength(1)
    expect(titulos[0].textContent).toBe(PROMESSA)
  })

  // MAT-49c: o primário "Começar grátis" (abertura e fechamento) vai a /app/hoje; o link de texto
  // "Ver como funciona", a Como funciona.
  it('o Início traz o primário "Começar grátis" para /app/hoje e o link "Ver como funciona"', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const primarios = [...container.querySelectorAll<HTMLElement>('main [data-botao="primario"]')]
    expect(primarios).toHaveLength(2)
    expect(primarios.map((p) => p.textContent)).toEqual(['Começar grátis', 'Começar grátis'])
    expect(primarios.map((p) => p.getAttribute('href'))).toEqual(['/app/hoje', '/app/hoje'])

    const main = container.querySelector<HTMLElement>('main')!
    const secundario = within(main).getByRole('link', { name: 'Ver como funciona' })
    expect(secundario.getAttribute('href')).toBe('/como-funciona')
    expect(secundario.getAttribute('data-botao')).toBe('texto')
    expect(container.querySelector('[inert]')).toBeNull()
  })

  for (const [caminho, titulo] of [
    ['/como-funciona', 'Do primeiro dia à troca de turno.'],
    ['/cuidado-compartilhado', 'Um bebê, vários adultos.'],
    ['/desenvolvimento', 'Cada fase, no tempo do bebê.'],
    ['/regras-da-comunidade', 'Regras da comunidade'],
    ['/privacidade', 'Privacidade'],
    ['/termos', 'Termos de uso'],
    ['/exclusao-de-conta', 'Exclusão de conta'],
    ['/contato', 'Contato'],
    ['/sobre', 'Sobre'],
    ['/sistema', 'Campo de mel, a base do site.'],
  ] as const) {
    it(`${caminho} abre dentro da casca, com o h1 "${titulo}"`, async () => {
      const { container } = renderizarRota(caminho)
      const h1 = await screen.findByRole('heading', { level: 1, name: titulo })
      expect(container.querySelector('header[data-cabecalho]')).not.toBeNull()
      expect(container.querySelector('footer[data-rodape]')).not.toBeNull()
      expect(h1.closest('main')).not.toBeNull()
    })
  }

  it('o Hoje tem o h1 "Hoje" e um único bloco de cor (Em andamento), sem cartão', async () => {
    const { container } = renderizarRota('/app/hoje')

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Hoje')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(container.querySelectorAll('[data-andamento]')).toHaveLength(1)
    expect(container.querySelector('.cartao')).toBeNull()
  })

  it('a Sessão com ?tipo=tummy e sem sessão começa um Tummy time', async () => {
    renderizarRota('/app/sessao?tipo=tummy', semSessao())

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Tummy time de Heloísa')
    expect(screen.getByText('Atividade sugerida: Espelho no chão')).toBeTruthy()
    expect(screen.getByText(/^Iniciado às \d{2}:\d{2} por Juliana$/)).toBeTruthy()
  })

  it('a Sessão sem sessão e sem tipo mostra o estado vazio', async () => {
    renderizarRota('/app/sessao', semSessao())

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Nenhuma sessão em andamento')
    const link = screen.getByRole('link', { name: 'Voltar para Hoje' })
    expect(link.getAttribute('href')).toBe('/app/hoje')
  })

  it('a Sessão ignora um ?tipo= inválido', async () => {
    renderizarRota('/app/sessao?tipo=banho', semSessao())

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
