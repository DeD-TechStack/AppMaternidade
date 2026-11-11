import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { ROTULO_NAVEGACAO_PAGINAS_RODAPE, ROTULO_NAVEGACAO_RODAPE } from '../../componentes/casca/textos.ts'
import { PAGINAS_DO_SITE, ROTULOS } from '../../conteudo/publicas.ts'
import { pastaSrcDe } from '../../teste/fontes.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// MAT-36, volta 1, N1: o rodapé da casca liga para as 9 páginas públicas. O jsdom não mede layout:
// o que o navegador mede (vãos de 96 px, colunas, contraste) está em medir.mjs e nas capturas.

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

const CAMINHOS_DAS_PAGINAS = PAGINAS_DO_SITE.map(({ para }) => para)
/** Todas as rotas que levam a casca: as 9 páginas e as outras (Início, Hoje, Sessão, /sistema, 404). */
const OUTRAS_ROTAS = ['/', '/sistema', '/app/hoje', '/app/sessao', '/rota-inexistente']

function rodape(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-rodape]')!
}

function linhaDoRodape(container: HTMLElement) {
  return within(rodape(container)).getByRole('navigation', { name: ROTULO_NAVEGACAO_PAGINAS_RODAPE })
}

describe('rodapé da casca: linha "Páginas do site"', () => {
  it('em toda rota o rodapé traz a linha, com o rótulo visível e os 9 links na ordem de PAGINAS_DO_SITE', async () => {
    for (const caminho of [...CAMINHOS_DAS_PAGINAS, ...OUTRAS_ROTAS]) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const nav = linhaDoRodape(container)
      expect(nav.querySelector('p')!.textContent, caminho).toBe(ROTULOS.paginas)
      expect(nav.querySelector('h1, h2, h3'), caminho).toBeNull()
      const links = [...nav.querySelectorAll('a')]
      expect(links.map((a) => [a.textContent, a.getAttribute('href')]), caminho).toEqual(
        PAGINAS_DO_SITE.map(({ rotulo, para }) => [rotulo, para]),
      )
      // Depois das colunas de links e antes da linha final do aviso.
      const colunas = within(rodape(container)).getByRole('navigation', { name: ROTULO_NAVEGACAO_RODAPE })
      expect(colunas.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)
      const final = rodape(container).querySelector('.sb-rodape-final')!
      expect(nav.compareDocumentPosition(final) & Node.DOCUMENT_POSITION_FOLLOWING, caminho).not.toBe(0)
      unmount()
    }
  }, 60000)

  it('os links são alvos de toque, em lista ul/li, e ficam na ordem de PAGINAS_DO_SITE', async () => {
    const { container } = renderizarRota('/')
    await screen.findAllByRole('heading', { level: 1 })

    const nav = linhaDoRodape(container)
    const itens = [...nav.querySelectorAll('ul > li')]
    expect(itens).toHaveLength(PAGINAS_DO_SITE.length)
    itens.forEach((item, i) => {
      const link = item.querySelector(':scope > a')!
      expect(link.classList.contains('alvo-toque'), PAGINAS_DO_SITE[i].rotulo).toBe(true)
      expect(link.getAttribute('href')).toBe(PAGINAS_DO_SITE[i].para)
      expect(link.textContent).toBe(PAGINAS_DO_SITE[i].rotulo)
    })
  })

  it('partindo do Início, cada uma das 9 páginas se alcança por um link visível do rodapé', async () => {
    for (const { rotulo, para } of PAGINAS_DO_SITE) {
      const { container, roteador, unmount } = renderizarRota('/')
      await screen.findAllByRole('heading', { level: 1 })

      fireEvent.click(within(linhaDoRodape(container)).getByRole('link', { name: rotulo }))
      await act(async () => undefined)

      expect(roteador.state.location.pathname, rotulo).toBe(para)
      expect(screen.getAllByRole('heading', { level: 1 }), rotulo).toHaveLength(1)
      expect(screen.getByRole('heading', { level: 1 }).textContent, rotulo).toMatch(/\S/)
      expect(document.title, rotulo).toContain('| AppMaternidade')
      unmount()
    }
  }, 60000)

  it('em cada uma das 9 rotas só o link da própria página leva aria-current="page" no rodapé', async () => {
    for (const caminho of CAMINHOS_DAS_PAGINAS) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const atuais = [...linhaDoRodape(container).querySelectorAll('a[aria-current]')]
      expect(atuais, caminho).toHaveLength(1)
      expect(atuais[0].getAttribute('aria-current'), caminho).toBe('page')
      expect(atuais[0].getAttribute('href'), caminho).toBe(caminho)
      unmount()
    }
  }, 60000)

  it('no Início, no /sistema, no Hoje, na Sessão e numa rota inexistente nenhum dos 9 leva aria-current', async () => {
    for (const caminho of OUTRAS_ROTAS) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      expect(linhaDoRodape(container).querySelectorAll('[aria-current]'), caminho).toHaveLength(0)
      unmount()
    }
  }, 60000)

  it('o aria-current acompanha a navegação: ao ir de uma página à outra, o link atual muda', async () => {
    const { container, roteador } = renderizarRota('/sobre')
    await screen.findAllByRole('heading', { level: 1 })
    expect(linhaDoRodape(container).querySelector('a[aria-current]')!.getAttribute('href')).toBe('/sobre')

    await act(async () => {
      await roteador.navigate('/contato')
    })
    expect(linhaDoRodape(container).querySelector('a[aria-current]')!.getAttribute('href')).toBe('/contato')

    await act(async () => {
      await roteador.navigate('/')
    })
    expect(linhaDoRodape(container).querySelectorAll('a[aria-current]')).toHaveLength(0)
  })

  it('o landmark tem nome próprio: nenhum nav da tela repete o nome de outro, em nenhuma rota', async () => {
    for (const caminho of [...CAMINHOS_DAS_PAGINAS, ...OUTRAS_ROTAS]) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const nomes = [...container.querySelectorAll('nav')].map((nav) => nav.getAttribute('aria-label'))
      expect(nomes.every((nome) => nome), caminho).toBe(true)
      expect(new Set(nomes).size, `${caminho}: ${nomes.join(' | ')}`).toBe(nomes.length)
      expect(nomes, caminho).toContain(ROTULO_NAVEGACAO_PAGINAS_RODAPE)
      expect(ROTULO_NAVEGACAO_PAGINAS_RODAPE).not.toBe(ROTULOS.paginas)
      expect(ROTULO_NAVEGACAO_PAGINAS_RODAPE).not.toBe(ROTULO_NAVEGACAO_RODAPE)
      unmount()
    }
  }, 60000)

  it('o nome acessível da linha do rodapé começa pelo texto visível (WCAG 2.5.3)', async () => {
    const { container } = renderizarRota('/')
    await screen.findAllByRole('heading', { level: 1 })

    expect(ROTULO_NAVEGACAO_PAGINAS_RODAPE.startsWith(ROTULOS.paginas)).toBe(true)
    expect(linhaDoRodape(container).querySelector('p')!.textContent).toBe(ROTULOS.paginas)
  })

  it('o rodapé segue um só: a linha fica dentro do mesmo footer, sem rodapé público à parte', async () => {
    for (const caminho of ['/sobre', '/']) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      expect(container.querySelectorAll('footer'), caminho).toHaveLength(1)
      expect(container.querySelectorAll('[data-rodape]'), caminho).toHaveLength(1)
      expect(rodape(container).contains(linhaDoRodape(container)), caminho).toBe(true)
      unmount()
    }
  })

  it('a linha não traz estilo em linha nem texto de interface fora dos textos importados', async () => {
    const { container } = renderizarRota('/')
    await screen.findAllByRole('heading', { level: 1 })

    const nav = linhaDoRodape(container)
    for (const elemento of [nav, ...nav.querySelectorAll('*')]) expect(elemento.getAttribute('style')).toBeNull()
  })

  describe('o CSS da linha (bloco MAT-36, classes vp-rodape-*)', () => {
    const css = readFileSync(pastaSrcDe(import.meta.url) + '../../index.css', 'utf8')
    const bloco = css.slice(css.indexOf('/* MAT-36: páginas públicas */')).replace(/\/\*[\s\S]*?\*\//g, '')
    const regras = [...bloco.matchAll(/(\.vp-rodape[^{}]*)\{([^{}]*)\}/g)].map((m) => ({ seletor: m[1].trim(), corpo: m[2] }))

    it('existem regras vp-rodape-* no bloco, e nenhuma sombra, caixa alta nem transição de tudo', () => {
      expect(regras.length).toBeGreaterThanOrEqual(3)
      for (const { seletor, corpo } of regras) {
        expect(corpo, seletor).not.toMatch(/box-shadow|text-shadow|filter|text-transform|transition:\s*all/)
      }
    })

    it('o rótulo fica na 1ª coluna (x=32) e a lista nas colunas 2 e 3 (x=208 e 384) da grade de 3 × 176 px dos links do rodapé', () => {
      // Antes: rótulo em c2 e lista em c4 + 32 px (a linha rótulo + texto das páginas). Agora é a grade das colunas de links.
      const grade = regras.find((r) => r.seletor === '.vp-rodape-paginas' && /repeat\(3/.test(r.corpo))!
      expect(grade.corpo).toMatch(/grid-template-columns:\s*repeat\(3,\s*176px\)/)
      const rotulo = regras.find((r) => r.seletor === '.vp-rodape-rotulo' && /grid-column:\s*1\s*;/.test(r.corpo))!
      expect(rotulo).toBeDefined()
      const lista = regras.find((r) => r.seletor === '.vp-rodape-lista' && /grid-column:\s*2\s*\/\s*4/.test(r.corpo))!
      expect(lista.corpo).toMatch(/grid-template-columns:\s*repeat\(2,\s*176px\)/)
      expect(lista.corpo).not.toMatch(/margin(-left)?:\s*(0 0 0 )?32px/)
    })

    it('abaixo de 768 nenhum vão da linha passa de 96 px e a lista volta a uma coluna', () => {
      // O último @media estreito do bloco é o da linha do rodapé (ela é a última regra do bloco).
      const estreito = bloco.slice(bloco.lastIndexOf('@media (max-width: 767px)'))
      const marcadas = [...estreito.matchAll(/(\.vp-rodape[^{}]*)\{([^{}]*)\}/g)]
      expect(marcadas.length).toBeGreaterThanOrEqual(1)
      for (const [, seletor, corpo] of marcadas) {
        for (const [, px] of corpo.matchAll(/(?:margin|padding)[a-z-]*:\s*([^;]*)/g)) {
          for (const valor of px.matchAll(/(\d+)px/g)) expect(Number(valor[1]), seletor).toBeLessThanOrEqual(96)
        }
        expect(corpo, seletor).not.toMatch(/repeat\(2/)
      }
    })
  })

  it('axe: sem violação nas páginas com a linha no rodapé (landmark duplicado, lista, link)', async () => {
    for (const caminho of ['/', '/sobre', '/privacidade']) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findAllByRole('heading', { level: 1 })

      const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
      expect(
        resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html.slice(0, 100)).join(' | ')})`),
        caminho,
      ).toEqual([])
      unmount()
    }
  }, 60000)
})
