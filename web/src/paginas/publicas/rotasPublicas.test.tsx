import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { PROMESSA } from '../../conteudo/textos.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Rotas, títulos, madrugada, acessibilidade, links e a navegação entre as páginas públicas (MAT-36).
// O jsdom não rola a janela: a navegação nova chama window.scrollTo, que aqui não faz nada.

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

type Roteador = ReturnType<typeof renderizarRota>['roteador']

async function ir(roteador: Roteador, para: string) {
  await act(async () => {
    await roteador.navigate(para)
  })
}

const NAO_ENCONTRADA = 'Página não encontrada'

// caminho, h1, título da aba
const NOVAS: Array<[string, string, string]> = [
  ['/como-funciona', 'Como funciona', 'Como funciona | AppMaternidade'],
  ['/cuidado-compartilhado', 'Cuidado compartilhado', 'Cuidado compartilhado | AppMaternidade'],
  ['/desenvolvimento', 'Desenvolvimento e tummy time', 'Desenvolvimento e tummy time | AppMaternidade'],
  ['/regras-da-comunidade', 'Regras da comunidade', 'Regras da comunidade | AppMaternidade'],
  ['/privacidade', 'Política de privacidade', 'Política de privacidade | AppMaternidade'],
  ['/termos', 'Termos de uso', 'Termos de uso | AppMaternidade'],
  ['/exclusao-de-conta', 'Exclusão de conta', 'Exclusão de conta | AppMaternidade'],
  ['/contato', 'Contato', 'Contato | AppMaternidade'],
  ['/sobre', 'Sobre o AppMaternidade', 'Sobre | AppMaternidade'],
]

const CAMINHOS_NOVOS = NOVAS.map(([caminho]) => caminho)
const DA_MAT36 = [...CAMINHOS_NOVOS, '/rota-inexistente']

describe('rotas e títulos', () => {
  it('cada página nova tem um único h1 e o título da aba da tabela, a partir do Sobre', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findAllByRole('heading', { level: 1 })

    for (const [caminho, h1, titulo] of NOVAS) {
      if (caminho === '/sobre') continue
      await ir(roteador, caminho)
      const titulos = screen.getAllByRole('heading', { level: 1 })
      expect(titulos, caminho).toHaveLength(1)
      expect(titulos[0].textContent, caminho).toBe(h1)
      expect(document.title, caminho).toBe(titulo)
    }
  }, 30000)

  it('o Sobre, a partir do Início, e o Início, a partir do Sobre', async () => {
    const { roteador } = renderizarRota('/')
    await screen.findAllByRole('heading', { level: 1 })

    await ir(roteador, '/sobre')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sobre o AppMaternidade')
    expect(document.title).toBe('Sobre | AppMaternidade')

    await ir(roteador, '/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(PROMESSA)
    expect(document.title).toBe('AppMaternidade')
  })

  it('uma rota inexistente mostra a Página não encontrada, com o título da aba dela', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findAllByRole('heading', { level: 1 })

    await ir(roteador, '/rota-inexistente')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(NAO_ENCONTRADA)
    expect(document.title).toBe('Página não encontrada | AppMaternidade')
  })

  it('Hoje e Sessão só ganham o título da aba', async () => {
    const { roteador } = renderizarRota('/sobre')
    await screen.findAllByRole('heading', { level: 1 })

    await ir(roteador, '/app/hoje')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
    expect(document.title).toBe('Hoje | AppMaternidade')

    await ir(roteador, '/app/sessao')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    expect(document.title).toBe('Sessão | AppMaternidade')
  })

  it('cada página nova tem a casca: um header, um main e um footer', async () => {
    for (const caminho of DA_MAT36) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      expect(container.querySelectorAll('header'), caminho).toHaveLength(1)
      expect(container.querySelectorAll('main'), caminho).toHaveLength(1)
      expect(container.querySelectorAll('footer'), caminho).toHaveLength(1)
      unmount()
    }
  }, 30000)

  it('a rota do sistema continua como estava, fora do layout público', async () => {
    renderizarRota('/sistema')
    await screen.findAllByRole('heading', { level: 1 })

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.queryByRole('navigation', { name: 'Páginas do site' })).toBeNull()
    expect(document.title).toBe('AppMaternidade')
  })
})

describe('madrugada', () => {
  it('desliga ao entrar em cada página da MAT-36 e continua desligada ao voltar ao Hoje', async () => {
    for (const caminho of DA_MAT36) {
      const { roteador, unmount } = renderizarRota('/app/hoje')
      const botao = await screen.findByRole('button', { name: 'Modo madrugada' })
      fireEvent.click(botao)
      expect(botao.getAttribute('aria-pressed'), caminho).toBe('true')
      expect(document.documentElement.getAttribute('data-tema'), caminho).toBe('madrugada')

      await ir(roteador, caminho)
      await screen.findAllByRole('heading', { level: 1 })
      expect(document.documentElement.hasAttribute('data-tema'), caminho).toBe(false)

      await ir(roteador, '/app/hoje')
      const depois = await screen.findByRole('button', { name: 'Modo madrugada' })
      expect(depois.getAttribute('aria-pressed'), caminho).toBe('false')
      expect(document.documentElement.hasAttribute('data-tema'), caminho).toBe(false)
      unmount()
    }
  }, 30000)
})

describe('acessibilidade (axe-core) das páginas públicas', () => {
  for (const caminho of DA_MAT36) {
    it(`não tem violações em ${caminho}`, async () => {
      const { container } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      // O jsdom não calcula cores: o contraste é conferido em estilo.test.ts e pelo medidor de tela.
      const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
      expect(
        resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')})`),
      ).toEqual([])
    }, 30000)
  }
})

describe('navegação entre as páginas (a lista "Páginas do site" do rodapé; a 404 mantém a do main)', () => {
  const NAV_DO_RODAPE = 'Páginas do site, no rodapé'

  const LINKS = [
    ['Como funciona', '/como-funciona'],
    ['Cuidado compartilhado', '/cuidado-compartilhado'],
    ['Desenvolvimento e tummy time', '/desenvolvimento'],
    ['Regras da comunidade', '/regras-da-comunidade'],
    ['Política de privacidade', '/privacidade'],
    ['Termos de uso', '/termos'],
    ['Exclusão de conta', '/exclusao-de-conta'],
    ['Contato', '/contato'],
    ['Sobre', '/sobre'],
  ]

  it('cada página nova tem a lista "Páginas do site" no rodapé (e não no main), com os 9 links, nesta ordem', async () => {
    for (const caminho of CAMINHOS_NOVOS) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      expect(container.querySelector('main nav[aria-label="Páginas do site"]'), caminho).toBeNull()
      const nav = within(container).getByRole('navigation', { name: NAV_DO_RODAPE })
      expect(
        within(nav)
          .getAllByRole('link')
          .map((link) => [link.textContent, link.getAttribute('href')]),
        caminho,
      ).toEqual(LINKS)
      // Fica dentro do rodapé, depois de todo o main.
      expect(container.querySelector('footer')!.contains(nav), caminho).toBe(true)
      expect(container.querySelector('main')!.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
      unmount()
    }
  }, 30000)

  it('a Página não encontrada mantém a lista no main, com os 9 links, como último bloco', async () => {
    const { container } = renderizarRota('/rota-inexistente')
    await screen.findAllByRole('heading', { level: 1 })

    const nav = container.querySelector('main nav[aria-label="Páginas do site"]')!
    expect(
      within(nav as HTMLElement)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual(LINKS)
    expect(container.querySelector('main')!.lastElementChild!.contains(nav)).toBe(true)
    expect(container.querySelectorAll('main nav[aria-label^="Páginas do site"]')).toHaveLength(1)
  })

  it('só o link da própria página leva aria-current="page"', async () => {
    for (const caminho of CAMINHOS_NOVOS) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const nav = container.querySelector(`nav[aria-label="${NAV_DO_RODAPE}"]`)!
      const atuais = [...nav.querySelectorAll('a[aria-current]')]
      expect(atuais, caminho).toHaveLength(1)
      expect(atuais[0].getAttribute('aria-current'), caminho).toBe('page')
      expect(atuais[0].getAttribute('href'), caminho).toBe(caminho)
      unmount()
    }
  }, 30000)

  it('o rótulo é um parágrafo, não um título, e cada link tem alvo de 44 px (alvo-toque): no rodapé e na 404', async () => {
    const { container } = renderizarRota('/sobre')
    await screen.findAllByRole('heading', { level: 1 })

    const nav = container.querySelector(`nav[aria-label="${NAV_DO_RODAPE}"]`)!
    expect(nav.querySelector('h1, h2, h3')).toBeNull()
    expect(nav.querySelector('p.t-corpo-p')!.textContent).toBe('Páginas do site')
    for (const link of nav.querySelectorAll('a')) expect(link.classList.contains('alvo-toque')).toBe(true)
    cleanup()

    const { container: naoEncontrada } = renderizarRota('/rota-inexistente')
    await screen.findAllByRole('heading', { level: 1 })
    const navDoMain = naoEncontrada.querySelector('main nav[aria-label="Páginas do site"]')!
    expect(navDoMain.querySelector('h1, h2, h3')).toBeNull()
    expect(navDoMain.querySelector('p.t-rotulo')!.textContent).toBe('Páginas do site')
    for (const link of navDoMain.querySelectorAll('a')) expect(link.classList.contains('alvo-toque')).toBe(true)
  })

  it('um clique no rodapé leva à página, com o título da aba dela', async () => {
    renderizarRota('/sobre')
    await screen.findAllByRole('heading', { level: 1 })

    fireEvent.click(within(screen.getByRole('navigation', { name: NAV_DO_RODAPE })).getByRole('link', { name: 'Contato' }))

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Contato')
    expect(document.title).toBe('Contato | AppMaternidade')
  })

  it('o landmark da navegação tem nome único: os outros nav da página têm outros nomes', async () => {
    const { container } = renderizarRota('/privacidade')
    await screen.findAllByRole('heading', { level: 1 })

    const nomes = [...container.querySelectorAll('nav')].map((nav) => nav.getAttribute('aria-label'))
    expect(new Set(nomes).size).toBe(nomes.length)
    expect(nomes).toEqual(expect.arrayContaining(['Nesta página', NAV_DO_RODAPE]))
    expect(nomes).not.toContain('Páginas do site')
  })
})

describe('links internos', () => {
  interface Pagina {
    h1: string
    /** Quantas vezes cada id aparece na página. */
    ids: Map<string, number>
  }
  const lidas = new Map<string, Pagina>()

  async function lerPagina(caminho: string): Promise<Pagina> {
    const guardada = lidas.get(caminho)
    if (guardada) return guardada
    const { container, unmount } = renderizarRota(caminho)
    await screen.findAllByRole('heading', { level: 1 })
    const ids = new Map<string, number>()
    for (const elemento of container.querySelectorAll('[id]')) ids.set(elemento.id, (ids.get(elemento.id) ?? 0) + 1)
    const pagina = { h1: container.querySelector('h1')!.textContent ?? '', ids }
    unmount()
    lidas.set(caminho, pagina)
    return pagina
  }

  it('todo href do main e da lista "Páginas do site" do rodapé que começa com / leva a uma rota que não é a 404 e a um id existente e único', async () => {
    for (const origem of CAMINHOS_NOVOS) {
      const { container, unmount } = renderizarRota(origem)
      await screen.findAllByRole('heading', { level: 1 })
      // A lista de páginas saiu do main (Cuidado, Desenvolvimento e Sobre ficaram sem link nele): entra a do rodapé.
      const hrefs = [...container.querySelectorAll('main a[href], footer nav[aria-label="Páginas do site, no rodapé"] a[href]')]
        .map((a) => a.getAttribute('href')!)
        .filter((href) => !href.startsWith('mailto:'))
      unmount()
      expect(hrefs.length, origem).toBeGreaterThan(0)

      for (const href of hrefs) {
        expect(/^[/#]/.test(href), `${origem}: ${href}`).toBe(true)
        const [parteDoCaminho, ancora] = href.split('#')
        const destino = await lerPagina(href.startsWith('#') ? origem : parteDoCaminho)
        expect(destino.h1, `${origem}: ${href}`).not.toBe(NAO_ENCONTRADA)
        if (ancora) expect(destino.ids.get(ancora), `${origem}: ${href}`).toBe(1)
      }
    }
  }, 30000)

  it('o índice "Nesta página" tem um link para cada h2, na ordem, com o texto do h2', async () => {
    for (const caminho of ['/privacidade', '/termos']) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const indice = container.querySelector('nav[aria-label="Nesta página"]')!
      expect(indice.querySelector('p.t-rotulo')!.textContent, caminho).toBe('Nesta página')
      const h2s = [...container.querySelectorAll('main h2')]
      const links = [...indice.querySelectorAll('a')]
      expect(links.map((a) => a.textContent), caminho).toEqual(h2s.map((h2) => h2.textContent))
      expect(links.map((a) => a.getAttribute('href')), caminho).toEqual(h2s.map((h2) => `${caminho}#${h2.id}`))
      for (const link of links) expect(link.classList.contains('alvo-toque'), caminho).toBe(true)
      unmount()
    }
  }, 30000)

  it('as outras páginas não têm índice', async () => {
    for (const caminho of CAMINHOS_NOVOS.filter((c) => c !== '/privacidade' && c !== '/termos')) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })
      expect(container.querySelector('nav[aria-label="Nesta página"]'), caminho).toBeNull()
      unmount()
    }
  }, 30000)

  it('o link de urgência do Contato leva às Regras, ao h2 dos canais de ajuda', async () => {
    const { container } = renderizarRota('/contato')
    await screen.findAllByRole('heading', { level: 1 })

    const link = container.querySelector('main a[href="/regras-da-comunidade#secao-ajuda-agora"]')!
    expect(link.textContent).toBe('Regras da comunidade')
  })
})
