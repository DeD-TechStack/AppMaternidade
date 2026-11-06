import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import axe from 'axe-core'
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

/** Nada de tela fica fora da coluna: um só .coluna-app, e todo header, main e nav está dentro dele. */
function conferirTudoDentroDaColuna(container: HTMLElement) {
  const colunas = container.querySelectorAll('.coluna-app')
  expect(colunas).toHaveLength(1)
  const coluna = colunas[0]
  const pecas = container.querySelectorAll('header, main, nav')
  expect(pecas.length).toBeGreaterThan(0)
  for (const peca of pecas) expect(coluna.contains(peca), peca.outerHTML).toBe(true)
}

describe('aviso de demonstração: lugar na tela', () => {
  it('é a primeira linha dentro do raiz do Início', async () => {
    definirBanco('', '')
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const raiz = container.firstElementChild!
    expect(raiz.classList.contains('@container/pagina')).toBe(true)
    expect(raiz.firstElementChild).toBe(container.querySelector(SELETOR))
    expect(raiz.firstElementChild!.nextElementSibling!.tagName).toBe('HEADER')
  })

  for (const [tela, caminho] of [
    ['Hoje', '/app/hoje'],
    ['Sessão', '/app/sessao'],
  ] as const) {
    it(`é a primeira linha dentro da coluna do ${tela}, antes do header, e com recuo`, () => {
      definirBanco('', '')
      const { container } = renderizarRota(caminho)

      const coluna = container.querySelector('.coluna-app')!
      const aviso = container.querySelector(SELETOR)!
      expect(coluna.firstElementChild).toBe(aviso)
      conferirTudoDentroDaColuna(container)
      expect(aviso.classList.contains('px-4')).toBe(true)
      expect(aviso.nextElementSibling!.tagName).toBe('HEADER')
    })
  }

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
