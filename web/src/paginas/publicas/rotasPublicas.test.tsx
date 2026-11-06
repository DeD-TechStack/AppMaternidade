import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// Rotas, títulos, cabeçalho, rodapé, madrugada, acessibilidade e links das páginas públicas (MAT-36).
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
const PUBLICAS = ['/', ...DA_MAT36]

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
  })

  it('o Sobre, a partir do Início, e o Início, a partir do Sobre', async () => {
    const { roteador } = renderizarRota('/')
    await screen.findAllByRole('heading', { level: 1 })

    await ir(roteador, '/sobre')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sobre o AppMaternidade')
    expect(document.title).toBe('Sobre | AppMaternidade')

    await ir(roteador, '/')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Quem chega para o turno já sabe o que aconteceu.')
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
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Lia')
    expect(document.title).toBe('Sessão | AppMaternidade')
  })

  it('cada página tem um header, um main e um footer', async () => {
    for (const caminho of PUBLICAS) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      expect(container.querySelectorAll('header'), caminho).toHaveLength(1)
      expect(container.querySelectorAll('main'), caminho).toHaveLength(1)
      expect(container.querySelectorAll('footer'), caminho).toHaveLength(1)
      unmount()
    }
  })
})

describe('cabeçalho público', () => {
  const COM_LINK_ATUAL = ['/como-funciona', '/cuidado-compartilhado', '/desenvolvimento', '/sobre']

  it('tem o nome como link para / e os 4 links, nesta ordem', async () => {
    for (const caminho of DA_MAT36) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const cabecalho = container.querySelector('header')!
      const marca = within(cabecalho).getByRole('link', { name: 'AppMaternidade' })
      expect(marca.getAttribute('href'), caminho).toBe('/')
      const nav = within(cabecalho).getByRole('navigation', { name: 'Páginas' })
      expect(
        within(nav)
          .getAllByRole('link')
          .map((link) => [link.textContent, link.getAttribute('href')]),
        caminho,
      ).toEqual([
        ['Como funciona', '/como-funciona'],
        ['Cuidado compartilhado', '/cuidado-compartilhado'],
        ['Desenvolvimento e tummy time', '/desenvolvimento'],
        ['Sobre', '/sobre'],
      ])
      unmount()
    }
  })

  it('só o link da própria página tem aria-current, e só nas 4 páginas de produto', async () => {
    for (const caminho of DA_MAT36) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const atuais = [...container.querySelectorAll('header a[aria-current="page"]')]
      if (COM_LINK_ATUAL.includes(caminho)) {
        expect(atuais, caminho).toHaveLength(1)
        expect(atuais[0].getAttribute('href'), caminho).toBe(caminho)
      } else {
        expect(atuais, caminho).toHaveLength(0)
      }
      unmount()
    }
  })

  it('cada link tem alvo de 44 px (alvo-toque), o desktop tem até 64 px de altura e nada usa o contêiner da página', async () => {
    const { container } = renderizarRota('/como-funciona')
    await screen.findAllByRole('heading', { level: 1 })

    const cabecalho = container.querySelector('header')!
    for (const link of cabecalho.querySelectorAll('a')) expect(link.classList.contains('alvo-toque')).toBe(true)
    expect(cabecalho.innerHTML).toContain('@min-[46rem]/cabecalho:h-16')
    expect(cabecalho.innerHTML).not.toContain('/pagina')
    expect(cabecalho.querySelector('nav')!.className).toContain('flex-wrap')
  })
})

describe('rodapé público', () => {
  const LINKS_DO_RODAPE = [
    ['Início', '/'],
    ['Como funciona', '/como-funciona'],
    ['Cuidado compartilhado', '/cuidado-compartilhado'],
    ['Desenvolvimento e tummy time', '/desenvolvimento'],
    ['Sobre', '/sobre'],
    ['Regras da comunidade', '/regras-da-comunidade'],
    ['Privacidade', '/privacidade'],
    ['Termos de uso', '/termos'],
    ['Exclusão de conta', '/exclusao-de-conta'],
    ['Contato', '/contato'],
  ]

  it('nas 11 páginas públicas, tem os 10 links, o Fale conosco com a pendência e a frase da base', async () => {
    for (const caminho of PUBLICAS) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const rodape = container.querySelector('footer')!
      const produto = within(rodape).getByRole('navigation', { name: 'Produto' })
      const regras = within(rodape).getByRole('navigation', { name: 'Regras e privacidade' })
      const links = [...within(produto).getAllByRole('link'), ...within(regras).getAllByRole('link')]
      expect(
        links.map((link) => [link.textContent, link.getAttribute('href')]),
        caminho,
      ).toEqual(LINKS_DO_RODAPE)
      for (const link of links) expect(link.classList.contains('alvo-toque'), `${caminho}: ${link.textContent}`).toBe(true)

      const contato = rodape.querySelector('p span[data-pendencia="contato"]')!
      expect(contato.textContent, caminho).toBe('Canal de contato a definir')
      expect(contato.parentElement!.textContent, caminho).toBe('Fale conosco: Canal de contato a definir')
      expect(within(rodape).getByText('Protótipo em construção. Nada aqui é dado real.'), caminho).toBeTruthy()
      expect(rodape.className).not.toContain('/pagina')
      expect(rodape.innerHTML).not.toContain('/pagina')
      unmount()
    }
  })

  it('exatamente um link do rodapé tem aria-current, o da página; na 404, nenhum', async () => {
    for (const caminho of PUBLICAS) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const atuais = [...container.querySelectorAll('footer a[aria-current="page"]')]
      if (caminho === '/rota-inexistente') {
        expect(atuais, caminho).toHaveLength(0)
      } else {
        expect(atuais, caminho).toHaveLength(1)
        expect(atuais[0].getAttribute('href'), caminho).toBe(caminho)
      }
      unmount()
    }
  })

  it('Hoje e Sessão não têm rodapé nem cabeçalho público', async () => {
    for (const caminho of ['/app/hoje', '/app/sessao']) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      expect(container.querySelector('footer'), caminho).toBeNull()
      expect(screen.queryByRole('navigation', { name: 'Páginas' }), caminho).toBeNull()
      unmount()
    }
  })

  it('os nav do site têm aria-label distintos, na Privacidade (com o índice) e no Início', async () => {
    const privacidade = renderizarRota('/privacidade')
    await screen.findAllByRole('heading', { level: 1 })
    const daPrivacidade = [...privacidade.container.querySelectorAll('nav')].map((nav) => nav.getAttribute('aria-label'))
    expect(daPrivacidade).toEqual(['Páginas', 'Nesta página', 'Produto', 'Regras e privacidade'])
    privacidade.unmount()

    const inicio = renderizarRota('/')
    await screen.findAllByRole('heading', { level: 1 })
    const doInicio = [...inicio.container.querySelectorAll('nav')].map((nav) => nav.getAttribute('aria-label'))
    expect(doInicio).toEqual(['Seções da página', 'Produto', 'Regras e privacidade'])
    expect(new Set([...daPrivacidade, ...doInicio]).size).toBe(5)
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
  })
})

describe('acessibilidade (axe-core) das páginas públicas', () => {
  for (const caminho of PUBLICAS) {
    it(`não tem violações em ${caminho}`, async () => {
      const { container } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      // O jsdom não calcula cores: o contraste é conferido em estilo.test.ts.
      const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
      expect(
        resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')})`),
      ).toEqual([])
    })
  }
})

describe('sem endereço, telefone ou formulário', () => {
  it('nenhum @ no texto e nenhum mailto: ou tel:', async () => {
    for (const caminho of PUBLICAS) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      expect(container.textContent, caminho).not.toContain('@')
      expect(container.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]'), caminho).toHaveLength(0)
      expect(container.querySelectorAll('form, input, textarea'), caminho).toHaveLength(0)
      unmount()
    }
  })
})

const REGIAO = 'Nesta fase de avaliação, a demonstração roda num projeto Supabase nos Estados Unidos (região us-east-1), só com dados fictícios.'
const FRASES_PROIBIDAS = [
  'comprovad',
  'cientificamente',
  'clinicamente',
  'garantimos',
  'melhor app',
  'recomendado por',
  'revisado por profissional',
  'antes de ser publicad',
  'só sai depois',
]

/**
 * O texto de header, main e footer, sem o que está dentro de um aparelho. Cada trecho de texto
 * vem separado por quebra de linha: células de tabela vizinhas não se juntam em um número só.
 */
function textoForaDosAparelhos(container: HTMLElement): string {
  const copia = container.cloneNode(true) as HTMLElement
  for (const aparelho of copia.querySelectorAll('[data-aparelho]')) aparelho.remove()
  const trechos: string[] = []
  for (const parte of ['header', 'main', 'footer']) {
    const raiz = copia.querySelector(parte)
    if (!raiz) continue
    const percurso = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT)
    for (let no = percurso.nextNode(); no; no = percurso.nextNode()) trechos.push(no.textContent ?? '')
  }
  return trechos.join('\n')
}

describe('números, frases e parágrafos', () => {
  it('as únicas sequências de algarismos são 3, 7, 100, 180, 188 e 192 (e o us-east-1 do TF-15)', async () => {
    for (const caminho of DA_MAT36) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const texto = textoForaDosAparelhos(container).replace(REGIAO, '')
      const sequencias = texto.match(/\d+/g) ?? []
      for (const sequencia of sequencias) {
        expect(['3', '7', '100', '180', '188', '192'], `${caminho}: ${sequencia}`).toContain(sequencia)
      }
      unmount()
    }
  })

  it('nenhuma das frases proibidas aparece', async () => {
    for (const caminho of DA_MAT36) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const texto = textoForaDosAparelhos(container).toLowerCase()
      for (const frase of FRASES_PROIBIDAS) expect(texto, `${caminho}: ${frase}`).not.toContain(frase)
      unmount()
    }
  })

  it('nas 9 páginas novas, nenhum <p> do main passa de 120 palavras e todos têm a linha de 65ch', async () => {
    for (const caminho of CAMINHOS_NOVOS) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const paragrafos = [...container.querySelectorAll('main p')].filter((p) => p.closest('[data-aparelho]') === null)
      expect(paragrafos.length, caminho).toBeGreaterThan(0)
      for (const p of paragrafos) {
        const palavras = (p.textContent ?? '').split(/\s+/).filter((trecho) => /[\p{L}\p{N}]/u.test(trecho))
        expect(palavras.length, `${caminho}: ${p.textContent}`).toBeLessThanOrEqual(120)
        expect(p.classList.contains('texto-medida'), `${caminho}: ${p.textContent}`).toBe(true)
      }
      unmount()
    }
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

  it('todo href começa com / ou #, leva a uma rota que não é a 404 e a um id existente e único', async () => {
    for (const origem of PUBLICAS) {
      const { container, unmount } = renderizarRota(origem)
      await screen.findAllByRole('heading', { level: 1 })
      const hrefs = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!)
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
  })
})
