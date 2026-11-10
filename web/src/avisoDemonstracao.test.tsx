import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { AvisoDemonstracao } from './componentes/AvisoDemonstracao.tsx'
import { AVISO_DEMONSTRACAO } from './conteudo/textos.ts'
import { criarEstadoInicial, type EstadoPrototipo } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

const TEXTO = 'Demonstração sem banco: nada do que você registra aqui é salvo. Ao recarregar a página, tudo volta ao começo.'
const SELETOR = '[data-aviso="demonstracao"]'
const URL_FICTICIA = 'https://exemplo.invalid'
const CHAVE_FICTICIA = 'chave-ficticia'

const claro = (): EstadoPrototipo => criarEstadoInicial(Date.now())
const madrugada = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), madrugada: true })

// O setup.ts não desfaz variáveis de ambiente: este arquivo desfaz as suas.
afterEach(() => {
  vi.unstubAllEnvs()
})

function definirBanco(url: string, chave: string) {
  vi.stubEnv('VITE_SUPABASE_URL', url)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', chave)
}

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)
}

describe('aviso de demonstração: aparece quando falta uma variável do banco', () => {
  const casos: Array<[string, string, string, boolean]> = [
    ['as duas vazias', '', '', true],
    ['só a URL', URL_FICTICIA, '', true],
    ['só a chave', '', CHAVE_FICTICIA, true],
    ['as duas preenchidas', URL_FICTICIA, CHAVE_FICTICIA, false],
  ]

  it('o texto da constante é o do glossário', () => {
    expect(AVISO_DEMONSTRACAO).toBe(TEXTO)
  })

  for (const [nome, url, chave, aparece] of casos) {
    it(`${nome}: ${aparece ? 'mostra' : 'não mostra'} o aviso em todas as telas`, async () => {
      definirBanco(url, chave)

      for (const caminho of ['/', '/app/hoje', '/app/sessao', '/qualquer-coisa']) {
        const { container, unmount } = renderizarRota(caminho)
        await screen.findByRole('heading', { level: 1 })

        expect(container.querySelectorAll(SELETOR), caminho).toHaveLength(aparece ? 1 : 0)
        expect(screen.queryAllByText(TEXTO), caminho).toHaveLength(aparece ? 1 : 0)
        unmount()
      }
    })
  }
})

describe('aviso de demonstração: variante lateral (coluna da abertura)', () => {
  const CLASSES_DO_AVISO_DE_TOPO = ['texto-info', 'text-sm', 'py-1', 'px-4']

  it('com lateral e sem banco: o mesmo <p data-aviso>, com o texto exato e a classe ui + secundário', () => {
    definirBanco('', '')
    const { container } = render(<AvisoDemonstracao lateral />)

    const aviso = container.querySelector(SELETOR)!
    expect(container.querySelectorAll(SELETOR)).toHaveLength(1)
    expect(aviso.tagName).toBe('P')
    expect(aviso.textContent).toBe(AVISO_DEMONSTRACAO)
    expect(screen.getByText(AVISO_DEMONSTRACAO)).toBe(aviso)
    expect([...aviso.classList].sort()).toEqual(['aviso-demonstracao', 't-secundario', 't-ui'])
  })

  it('com lateral não leva texto-info, text-sm, py-1 nem px-4 (mesmo com comRecuo)', () => {
    definirBanco('', '')
    for (const props of [{ lateral: true }, { lateral: true, comRecuo: true }]) {
      const { container, unmount } = render(<AvisoDemonstracao {...props} />)
      const classes = [...container.querySelector(SELETOR)!.classList]
      for (const classe of CLASSES_DO_AVISO_DE_TOPO) expect(classes, JSON.stringify(props)).not.toContain(classe)
      unmount()
    }
  })

  it('sem lateral (o padrão) nada muda: texto-info, text-sm e py-1; px-4 só com comRecuo', () => {
    definirBanco('', '')
    const comum = render(<AvisoDemonstracao />)
    const classesComuns = [...comum.container.querySelector(SELETOR)!.classList]
    for (const classe of ['aviso-demonstracao', 'texto-info', 'text-sm', 'py-1']) expect(classesComuns).toContain(classe)
    expect(classesComuns).not.toContain('px-4')
    expect(classesComuns).not.toContain('t-ui')
    expect(classesComuns).not.toContain('t-secundario')
    comum.unmount()

    const comRecuo = render(<AvisoDemonstracao comRecuo />)
    expect([...comRecuo.container.querySelector(SELETOR)!.classList]).toContain('px-4')
    comRecuo.unmount()

    const explicito = render(<AvisoDemonstracao lateral={false} />)
    expect([...explicito.container.querySelector(SELETOR)!.classList]).toContain('texto-info')
  })

  for (const [nome, url, chave, aparece] of [
    ['as duas vazias', '', '', true],
    ['só a URL', URL_FICTICIA, '', true],
    ['só a chave', '', CHAVE_FICTICIA, true],
    ['as duas preenchidas', URL_FICTICIA, CHAVE_FICTICIA, false],
  ] as const) {
    it(`com lateral, ${nome}: ${aparece ? 'mostra' : 'não mostra'} o aviso`, () => {
      definirBanco(url, chave)
      const { container } = render(<AvisoDemonstracao lateral />)

      expect(container.querySelectorAll(SELETOR)).toHaveLength(aparece ? 1 : 0)
      expect(container.textContent === '').toBe(!aparece)
    })
  }
})

describe('aviso de demonstração: texto e marcador são o mesmo elemento', () => {
  it('em /app/hoje, com as duas variáveis vazias, o data-aviso e o texto exato apontam o mesmo <p>', () => {
    definirBanco('', '')
    const { container } = renderizarRota('/app/hoje')

    const marcado = container.querySelector(SELETOR)
    expect(marcado).not.toBeNull()
    expect(marcado!.tagName).toBe('P')
    expect(marcado!.textContent).toBe(TEXTO)
    expect(screen.getByText(TEXTO)).toBe(marcado)
  })
})

/**
 * Nada de tela fica fora da coluna: um só .coluna-app, e todo header, main e nav da tela está dentro dele.
 * O cabeçalho e o rodapé do site (a casca do Layout, 2.6 e 2.7) ficam fora da coluna de propósito.
 */
function conferirTudoDentroDaColuna(container: HTMLElement) {
  const colunas = container.querySelectorAll('.coluna-app')
  expect(colunas).toHaveLength(1)
  const coluna = colunas[0]
  const pecas = [...container.querySelectorAll('header, main, nav')].filter(
    (peca) => peca.closest('[data-cabecalho], [data-rodape]') === null,
  )
  expect(pecas.length).toBeGreaterThan(0)
  for (const peca of pecas) expect(coluna.contains(peca), peca.outerHTML).toBe(true)
}

describe('aviso de demonstração: lugar na tela', () => {
  it('é a primeira linha dentro do raiz do Início', async () => {
    definirBanco('', '')
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    // A raiz é a tela, entre o cabeçalho e o rodapé do site (a casca do Layout, 2.6 e 2.7); depois
    // do aviso vem a nav das seções, que ocupa o lugar do <header> antigo da página.
    const raiz = container.querySelector('[class~="@container/pagina"]')!
    expect(raiz.classList.contains('@container/pagina')).toBe(true)
    expect(raiz.previousElementSibling!.matches('[data-cabecalho]')).toBe(true)
    expect(raiz.firstElementChild).toBe(container.querySelector(SELETOR))
    expect(raiz.firstElementChild!.nextElementSibling!.tagName).toBe('NAV')
  })

  // A Sessão ainda é a da coluna única (parte 2 do cartão 44d-2 a refaz).
  it('é a primeira linha dentro da coluna da Sessão, antes do header, e com recuo', () => {
    definirBanco('', '')
    const { container } = renderizarRota('/app/sessao')

    const coluna = container.querySelector('.coluna-app')!
    const aviso = container.querySelector(SELETOR)!
    expect(coluna.firstElementChild).toBe(aviso)
    conferirTudoDentroDaColuna(container)
    expect(aviso.classList.contains('px-4')).toBe(true)
    // Depois do aviso vem a seção da faixa do protótipo, que guarda o <header> dela.
    expect(aviso.nextElementSibling!.tagName).toBe('SECTION')
    expect(aviso.nextElementSibling!.querySelector('header')).not.toBeNull()
  })

  it('no Hoje o aviso é um item da coluna lateral da abertura: sem faixa no topo, sem coluna única e sem o aviso duplicado', () => {
    definirBanco('', '')
    const { container } = renderizarRota('/app/hoje')

    const aviso = container.querySelector(SELETOR)!
    expect(container.querySelectorAll(SELETOR)).toHaveLength(1)
    expect(aviso.closest('ul.sb-abertura-lateral')).not.toBeNull()
    expect(aviso.closest('main')!.firstElementChild!.contains(aviso)).toBe(true)
    expect(aviso.parentElement!.tagName).toBe('LI')
    expect([...aviso.classList]).toEqual(expect.arrayContaining(['t-ui', 't-secundario']))
    expect(aviso.classList.contains('px-4')).toBe(false)
    expect(container.querySelector('.coluna-app')).toBeNull()
    expect(container.querySelector('[aria-label="Aviso do protótipo"]')).toBeNull()
    expect(screen.queryByText('Protótipo: dados fictícios, nada é salvo.')).toBeNull()
    // O primeiro elemento da página é o cabeçalho do site (H-2).
    expect(container.querySelector('[data-cabecalho]')!.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(container.firstElementChild!.firstElementChild!.matches('[data-cabecalho]')).toBe(true)
  })

  it('no Hoje, com as variáveis do banco, a lateral mostra a etiqueta "Protótipo, dados fictícios" e nenhum aviso', () => {
    definirBanco(URL_FICTICIA, CHAVE_FICTICIA)
    const { container } = renderizarRota('/app/hoje')

    expect(container.querySelectorAll(SELETOR)).toHaveLength(0)
    const etiqueta = screen.getByText('Protótipo, dados fictícios')
    expect(etiqueta.classList.contains('sb-etiqueta')).toBe(true)
    expect(etiqueta.closest('ul.sb-abertura-lateral')).not.toBeNull()
  })

  it('no Hoje, sem as variáveis do banco, a etiqueta não aparece (o aviso a substitui)', () => {
    definirBanco('', '')
    renderizarRota('/app/hoje')

    expect(screen.queryByText('Protótipo, dados fictícios')).toBeNull()
  })

  it('é a primeira linha dentro do main da rota inexistente, antes do h1, sem recuo próprio', async () => {
    definirBanco('', '')
    const { container } = renderizarRota('/qualquer-coisa')
    await screen.findByRole('heading', { level: 1 })

    const main = container.querySelector('main')!
    const aviso = container.querySelector(SELETOR)!
    expect(main.firstElementChild).toBe(aviso)
    expect(aviso.classList.contains('px-4')).toBe(false)
    expect(aviso.nextElementSibling!.tagName).toBe('H1')
  })

  it('a região status da confirmação continua única e não contém o aviso', () => {
    definirBanco('', '')
    const { container } = renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Heloísa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xixi' }))

    const regioes = screen.getAllByRole('status')
    expect(regioes).toHaveLength(1)
    expect(regioes[0].querySelector(SELETOR)).toBeNull()
    expect(regioes[0].contains(container.querySelector(SELETOR))).toBe(false)
    expect(regioes[0].textContent).not.toContain('Demonstração sem banco')
  })
})

describe('aviso de demonstração: marcação', () => {
  it('é um <p> simples, sem role, sem aria-* e sem classe com variante de janela', async () => {
    definirBanco('', '')

    for (const caminho of ['/', '/app/hoje', '/app/sessao', '/qualquer-coisa']) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findByRole('heading', { level: 1 })

      const aviso = container.querySelector(SELETOR)!
      expect(aviso.tagName, caminho).toBe('P')
      expect(aviso.classList.contains('aviso-demonstracao'), caminho).toBe(true)
      expect(aviso.hasAttribute('role'), caminho).toBe(false)
      expect(aviso.getAttributeNames().filter((nome) => nome.startsWith('aria-')), caminho).toEqual([])
      expect(aviso.children, caminho).toHaveLength(0)
      expect([...aviso.classList].filter((c) => /(^|:)(sm|md|lg|xl|2xl):/.test(c)), caminho).toEqual([])
      unmount()
    }
  })
})

describe('aviso de demonstração: acessibilidade (axe-core)', () => {
  it('não tem violações no Início', async () => {
    definirBanco('', '')
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector(SELETOR)).not.toBeNull()

    expect(await violacoes(container)).toEqual([])
  })

  it('não tem violações na rota inexistente', async () => {
    definirBanco('', '')
    const { container } = renderizarRota('/qualquer-coisa')
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector(SELETOR)).not.toBeNull()

    expect(await violacoes(container)).toEqual([])
  })

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    for (const caminho of ['/app/hoje', '/app/sessao']) {
      it(`não tem violações em ${caminho} (${tema})`, async () => {
        definirBanco('', '')
        const { container } = renderizarRota(caminho, { estadoInicial: estado() })
        await screen.findByRole('heading', { level: 1 })
        expect(container.querySelector(SELETOR)).not.toBeNull()
        expect(document.documentElement.hasAttribute('data-tema')).toBe(tema === 'madrugada')

        expect(await violacoes(container)).toEqual([])
      })
    }
  }
})
