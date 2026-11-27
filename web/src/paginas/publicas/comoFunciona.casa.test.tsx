import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { COMO_FUNCIONA } from '../../conteudo/casa/comoFunciona.ts'
import { rodarAxe } from '../../teste/axe.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

const ABA = 'Como funciona | AppMaternidade'

const TEXTOS_VISIVEIS: Record<string, string> = {
  'cf.h1': COMO_FUNCIONA.h1,
  'cf.lede': COMO_FUNCIONA.lede,
  'cf.cta1': COMO_FUNCIONA.cta1,
  'cf.leg1': COMO_FUNCIONA.leg1,
  'cf.h2.hist': COMO_FUNCIONA.h2Hist,
  'cf.p.hist': COMO_FUNCIONA.pHist,
  'cf.leg2': COMO_FUNCIONA.leg2,
  'cf.h2.depois': COMO_FUNCIONA.h2Depois,
  'cf.p.depois': COMO_FUNCIONA.pDepois,
  'cf.leg3': COMO_FUNCIONA.leg3,
  'cf.h2.nota': COMO_FUNCIONA.h2Nota,
  'cf.p.nota': COMO_FUNCIONA.pNota,
  'cf.h2.comecar': COMO_FUNCIONA.h2Comecar,
  'cf.passo1': COMO_FUNCIONA.passo1,
  'cf.passo2': COMO_FUNCIONA.passo2,
  'cf.passo3': COMO_FUNCIONA.passo3,
  'cf.aviso': COMO_FUNCIONA.aviso,
  'cf.h2.fecho': COMO_FUNCIONA.h2Fecho,
  'cf.p.fecho': COMO_FUNCIONA.fecho,
  'cf.cta2': COMO_FUNCIONA.cta2,
}

// M04 (`altCena2`) leaves /como-funciona per COMO-FUNCIONA.md §2; A-CF15 awaits art with no placeholder.
const ALTS_ATIVOS: Record<string, string> = {
  'cf.alt.cena1': COMO_FUNCIONA.altCena1,
  'cf.alt.tela1': COMO_FUNCIONA.altTela1,
  'cf.alt.cena3': COMO_FUNCIONA.altCena3,
  'cf.alt.tela2': COMO_FUNCIONA.altTela2,
}

const DECK = new Set([...Object.values(TEXTOS_VISIVEIS), ...Object.values(ALTS_ATIVOS)])

function principal(container: HTMLElement): HTMLElement {
  return container.querySelector('main') as HTMLElement
}

function faixas(container: HTMLElement): HTMLElement[] {
  return [...principal(container).querySelectorAll<HTMLElement>('.cf-pagina > section.cf-faixa')]
}

/** Text blocks inside `<main>`, excluding `aria-hidden` decorative type (e.g. ghost `03:00`). */
function blocosVisiveis(raiz: HTMLElement): string[] {
  return [...raiz.querySelectorAll('h1, h2, p, a, li')]
    .filter((el) => !el.closest('[aria-hidden="true"]'))
    .map((el) => (el.textContent ?? '').trim())
    .filter((t) => t !== '')
}

describe('/como-funciona: composição "um dia, pela hora"', () => {
  it('renderiza 6 faixas semânticas em ordem dentro de PaginaCasa e .co, sem níveis de título pulados', () => {
    const { container } = renderizarRota('/como-funciona')
    expect(container.querySelectorAll('main')).toHaveLength(1)
    expect(principal(container).querySelectorAll(':scope > [data-casa] > .co.cf-pagina')).toHaveLength(1)

    const secoes = faixas(container)
    expect(secoes).toHaveLength(6)
    for (const secao of secoes) {
      const id = secao.getAttribute('aria-labelledby')
      expect(id).toBeTruthy()
      expect(secao.querySelector(`#${id}`)).not.toBeNull()
    }

    const headings = [...principal(container).querySelectorAll('h1, h2, h3, h4, h5, h6')]
    expect(headings.map((h) => h.tagName)).toEqual(['H1', 'H2', 'H2', 'H2', 'H2', 'H2'])
    expect(headings.map((h) => h.textContent)).toEqual([
      COMO_FUNCIONA.h1,
      COMO_FUNCIONA.h2Hist,
      COMO_FUNCIONA.h2Depois,
      COMO_FUNCIONA.h2Nota,
      COMO_FUNCIONA.h2Comecar,
      COMO_FUNCIONA.h2Fecho,
    ])
  })

  it('define título da aba, cabeçalho de noite, rodapé e gancho do documento', () => {
    const { container, unmount } = renderizarRota('/como-funciona')
    expect(document.title).toBe(ABA)
    expect(container.querySelector('header[data-cabecalho]')!.getAttribute('data-tom')).toBe('noite')
    expect(container.querySelector('footer[data-rodape]')).not.toBeNull()
    expect(document.documentElement.hasAttribute('data-pagina-como-funciona')).toBe(true)
    unmount()
    expect(document.documentElement.hasAttribute('data-pagina-como-funciona')).toBe(false)
  })

  it('faixa 1 (03:00): texto antes da cena no DOM, recorte M01, legenda das 03:00 e 03:00 fantasma aria-hidden', () => {
    const { container } = renderizarRota('/como-funciona')
    const heroi = faixas(container)[0]
    const h1 = heroi.querySelector('h1.co-h1')!
    const cena = heroi.querySelector('.cf-m01 img')!
    const leg = heroi.querySelector('p[data-legenda]')!
    expect(h1.compareDocumentPosition(cena) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cena.compareDocumentPosition(leg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(leg.textContent).toBe(COMO_FUNCIONA.leg1)
    expect(leg.querySelector('.co-leg-hora')!.textContent).toBe('03:00')
    const fantasma = heroi.querySelector('.co-fantasma')!
    expect(fantasma.textContent).toBe('03:00')
    expect(fantasma.getAttribute('aria-hidden')).toBe('true')
  })

  it('faixas 2 a 6: Histórico, 18:00 (M06 + luz), Notas, três passos e fecho com 03:00 fantasma', () => {
    const { container } = renderizarRota('/como-funciona')
    const [, hist, depois, nota, comecar, fecho] = faixas(container)

    expect(hist.querySelectorAll('figure.co-fone')).toHaveLength(1)
    expect(hist.querySelector('p[data-legenda]')!.textContent).toBe(COMO_FUNCIONA.leg2)

    expect(depois.querySelector('.cf-m06 img[src*="/composicao/a/m06.webp"]')).not.toBeNull()
    expect(depois.querySelector('.cf-m06 img.co-luz[alt=""]')).not.toBeNull()
    expect(depois.querySelector('p[data-legenda]')!.textContent).toBe(COMO_FUNCIONA.leg3)

    expect(nota.querySelectorAll('figure.co-fone')).toHaveLength(1)

    const lista = comecar.querySelector('ol.cf-passos')!
    expect([...lista.children].map((li) => li.textContent)).toEqual([
      COMO_FUNCIONA.passo1,
      COMO_FUNCIONA.passo2,
      COMO_FUNCIONA.passo3,
    ])
    const aviso = comecar.querySelector('p.cf-aviso')!
    expect(aviso.textContent).toBe(COMO_FUNCIONA.aviso)
    expect(lista.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const fantasmaFecho = fecho.querySelector('.co-fantasma')!
    expect(fantasmaFecho.textContent).toBe('03:00')
    expect(fantasmaFecho.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('duas ações principais "Criar conta" em mel para /criar-conta (herói e fecho)', () => {
    const { container } = renderizarRota('/como-funciona')
    const links = [...principal(container).querySelectorAll('a')]
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link.getAttribute('href')).toBe('/criar-conta')
      expect(link.textContent).toBe('Criar conta')
      expect(link.hasAttribute('data-botao-mel')).toBe(true)
    }
    const secoes = faixas(container)
    expect(secoes[0].contains(links[0])).toBe(true)
    expect(secoes[5].contains(links[1])).toBe(true)
  })
})

describe('/como-funciona: cópia inalterada do deck', () => {
  it('todo bloco de texto visível (exceto tipo fantasma aria-hidden) e todo alt não vazio vêm de COMO_FUNCIONA', () => {
    const { container } = renderizarRota('/como-funciona')
    const main = principal(container)
    const blocos = blocosVisiveis(main)
    for (const texto of blocos) expect(DECK.has(texto), texto).toBe(true)
    for (const [id, esperado] of Object.entries(TEXTOS_VISIVEIS)) expect(blocos, id).toContain(esperado)

    const alts = [...main.querySelectorAll('img')]
      .map((img) => img.getAttribute('alt') ?? '')
      .filter((alt) => alt !== '')
    expect(alts).toHaveLength(4)
    for (const alt of alts) expect(DECK.has(alt), alt).toBe(true)
    for (const [id, esperado] of Object.entries(ALTS_ATIVOS)) expect(alts, id).toContain(esperado)
  })

  it('sem seta, ponto médio, travessão nem itálico no texto', () => {
    const { container } = renderizarRota('/como-funciona')
    const main = principal(container)
    expect(main.textContent!).not.toMatch(/[→·—–]/)
    expect(main.querySelector('em, i, cite, [class*="italic"]')).toBeNull()
  })
})

describe('/como-funciona: imagens, recortes e celulares em CSS', () => {
  it('usa recortes /composicao/a/m01.webp e m06.webp + dois celulares CSS; sem moldura-dia.png, sem M04 e sem vaga A-CF15', () => {
    const { container } = renderizarRota('/como-funciona')
    const main = principal(container)

    const m01 = main.querySelector<HTMLImageElement>('img[src$="/composicao/a/m01.webp"]')!
    expect(m01).not.toBeNull()
    expect(m01.getAttribute('alt')).toBe(COMO_FUNCIONA.altCena1)
    expect([m01.getAttribute('width'), m01.getAttribute('height')]).toEqual(['1672', '941'])
    expect(m01.getAttribute('fetchpriority')).toBe('high')
    expect(m01.getAttribute('loading')).not.toBe('lazy')

    const fones = [...main.querySelectorAll<HTMLImageElement>('figure.co-fone img')]
    expect(fones).toHaveLength(2)
    expect(fones[0].getAttribute('src')).toContain('/composicao/a/historico-')
    expect(fones[0].getAttribute('alt')).toBe(COMO_FUNCIONA.altTela1)
    expect(fones[1].getAttribute('src')).toContain('/composicao/a/notas-')
    expect(fones[1].getAttribute('alt')).toBe(COMO_FUNCIONA.altTela2)

    for (const img of main.querySelectorAll('img')) {
      const fontes = `${img.getAttribute('src') ?? ''} ${img.getAttribute('srcset') ?? ''}`
      expect(fontes).not.toMatch(/moldura-dia\.png|m04|cenas\/publicas|ilustracoes/)
      expect(img.getAttribute('width')).toMatch(/^[1-9]\d*$/)
      expect(img.getAttribute('height')).toMatch(/^[1-9]\d*$/)
    }

    expect(main.querySelector('[data-aguarda-arte], .co-vaga, [data-produto-moldura], [data-cena-heroi]')).toBeNull()
  })

  it('CSS local usa apenas tokens, sem cor crua, sombra, gradiente nem movimento fora das guardas', () => {
    const css = readFileSync(join(process.cwd(), 'src/componentes/como-casa/como-casa.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(css).not.toMatch(/box-shadow|text-shadow|gradient\(|blur|backdrop-filter|italic|uppercase/)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/)
    expect(css).toMatch(/@media \(min-width: 69em\) and \(min-aspect-ratio: 1\/1\) and \(prefers-reduced-motion: no-preference\)/)
    expect(css).toMatch(/@supports \(\(animation-timeline: view\(\)\) and \(animation-range: entry\)\)/)
  })
})

describe('/como-funciona: acessibilidade', () => {
  it('sem violações do axe', async () => {
    const { container } = renderizarRota('/como-funciona')
    const resultado = await rodarAxe(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)).toEqual([])
  })

  it('aviso de demonstração no rodapé e aviso de saúde uma vez só', () => {
    const { container } = renderizarRota('/como-funciona')
    const demonstracao = [...container.querySelectorAll('[data-aviso]')]
    expect(demonstracao).toHaveLength(1)
    expect(demonstracao[0].closest('footer[data-rodape]')).not.toBeNull()
    expect(screen.getAllByText(COMO_FUNCIONA.aviso)).toHaveLength(1)
  })
})
