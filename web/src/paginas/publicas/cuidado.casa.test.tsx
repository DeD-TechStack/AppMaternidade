import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CUIDADO } from '../../conteudo/casa/cuidado.ts'
import { rodarAxe } from '../../teste/axe.ts'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

const ROTA = '/cuidado-compartilhado'

/** All strings stored inside `CUIDADO`. */
function folhas(valor: unknown): string[] {
  if (typeof valor === 'string') return [valor]
  if (Array.isArray(valor)) return valor.flatMap(folhas)
  if (valor && typeof valor === 'object') return Object.values(valor).flatMap(folhas)
  return []
}

const DECK = new Set(folhas(CUIDADO))
// Strings intentionally not drawn inside `<main>`:
// - `aba`: document title; `papeis.legenda`: ul aria-label
// - `alt.cena2` (M05 hands) and `alt.cena3` (M01 Ícaro crop): removed per CUIDADO-COMPARTILHADO.md §2
const FORA_DO_PRINCIPAL = new Set<string>([CUIDADO.aba, CUIDADO.papeis.legenda, CUIDADO.alt.cena2, CUIDADO.alt.cena3])

function principal(container: HTMLElement): HTMLElement {
  return container.querySelector('main') as HTMLElement
}

function faixas(container: HTMLElement): HTMLElement[] {
  return [...principal(container).querySelectorAll<HTMLElement>('.cc-pagina > section.cc-faixa')]
}

/** Visible text blocks inside `<main>`, excluding `aria-hidden` decorative type (ghost `13:00` / `14:40`). */
function blocosVisiveis(raiz: HTMLElement): string[] {
  return [...raiz.querySelectorAll('h1, h2, h3, p, a, dt, dd')]
    .filter((el) => !el.closest('[aria-hidden="true"]'))
    .map((el) => (el.textContent ?? '').trim())
    .filter((t) => t !== '')
}

describe('/cuidado-compartilhado: composição "a porta"', () => {
  it('renderiza as 7 faixas semânticas em ordem dentro de PaginaCasa e .co, sem níveis de título pulados', () => {
    const { container } = renderizarRota(ROTA)
    expect(container.querySelectorAll('main')).toHaveLength(1)
    expect(principal(container).querySelectorAll(':scope > [data-casa] > .co.cc-pagina')).toHaveLength(1)

    const bandas = faixas(container)
    expect(bandas).toHaveLength(7)
    for (const banda of bandas) {
      const id = banda.getAttribute('aria-labelledby')
      expect(id).toBeTruthy()
      expect(banda.querySelector(`#${id}`)).not.toBeNull()
    }

    const headings = [...principal(container).querySelectorAll('h1, h2, h3, h4, h5, h6')]
    expect(headings.map((h) => h.tagName)).toEqual(['H1', 'H2', 'H2', 'H3', 'H3', 'H3', 'H2', 'H2', 'H2', 'H2'])
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([CUIDADO.h1])
  })

  it('define título da aba, cabeçalho de dia, rodapé e gancho data-pagina-cuidado', () => {
    const { container, unmount } = renderizarRota(ROTA)
    expect(document.title).toBe(CUIDADO.aba)
    expect(container.querySelector('header[data-cabecalho]')!.getAttribute('data-tom')).toBe('dia')
    expect(container.querySelector('footer[data-rodape]')).not.toBeNull()
    expect(document.documentElement.hasAttribute('data-pagina-cuidado')).toBe(true)
    unmount()
    expect(document.documentElement.hasAttribute('data-pagina-cuidado')).toBe(false)
  })

  it('faixas 1 e 2: texto antes do recorte M12 no DOM e celular Família + "Por enquanto, somos três." na areia', () => {
    const { container } = renderizarRota(ROTA)
    const [abertura, tres] = faixas(container)
    const h1 = abertura.querySelector('h1.co-h1')!
    const lede = [...abertura.querySelectorAll('p')].find((p) => p.textContent === CUIDADO.lede)!
    const cta = abertura.querySelector('a[data-botao-largo]')!
    const m12 = abertura.querySelector<HTMLImageElement>('.cc-m12 img')!

    expect(h1.compareDocumentPosition(lede) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(lede.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cta.compareDocumentPosition(m12) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(m12.getAttribute('src')).toContain('/composicao/a/m12.webp')
    expect([m12.getAttribute('width'), m12.getAttribute('height')]).toEqual(['981', '1602'])
    expect(m12.getAttribute('fetchpriority')).toBe('high')
    expect(m12.getAttribute('loading')).not.toBe('lazy')

    expect(tres.querySelector('figure.co-fone img[src*="/composicao/a/familia-"]')).not.toBeNull()
    expect(tres.querySelector('h2')!.textContent).toBe(CUIDADO.tres.h2)
  })

  it('faixa 3 (papéis): lista de 3 papéis com h3, <dl> de 3 campos, verbos em <strong> e Cuidador marcado', () => {
    const { container } = renderizarRota(ROTA)
    const lista = within(principal(container)).getByRole('list', { name: CUIDADO.papeis.legenda })
    expect(lista.tagName).toBe('UL')
    const itens = [...lista.children]
    expect(itens).toHaveLength(3)
    expect(itens.map((li) => li.getAttribute('data-papel'))).toEqual(['responsavel', 'cuidador', 'observador'])

    CUIDADO.papeis.linhas.forEach((linha, i) => {
      expect(itens[i].querySelector('h3')!.textContent).toBe(linha.nome)
      const dl = itens[i].querySelector('dl')!
      expect([...dl.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual([...CUIDADO.papeis.rotulos])
      expect([...dl.querySelectorAll('dd')].map((dd) => dd.textContent)).toEqual([linha.quem, linha.ve, linha.muda])
    })

    const verbos = itens.map((li) => [...li.querySelectorAll('strong[data-cc-verbo]')].map((s) => s.textContent))
    expect(verbos).toEqual([['Administra'], ['Registra', 'Edita e exclui'], ['Nada']])
  })

  it('faixa 4 (duas horas): 13:00 e 14:40 fantasmas aria-hidden e horas marcadas via HorasNoTexto; sem M05', () => {
    const { container } = renderizarRota(ROTA)
    const sono = faixas(container)[3]
    const fantasmas = sono.querySelector('.cc-sono-horas')!
    expect(fantasmas.getAttribute('aria-hidden')).toBe('true')
    expect([...fantasmas.querySelectorAll('.cc-sono-hora')].map((el) => el.textContent)).toEqual(['13:00', '14:40'])
    expect([...sono.querySelectorAll('strong[data-cc-hora]')].map((el) => el.textContent)).toEqual(['13:00', '14:40'])
    expect(sono.querySelectorAll('img')).toHaveLength(0)
  })

  it('faixa 5 (noite): celular Histórico com legenda 03:00 por Ícaro; sem M01', () => {
    const { container } = renderizarRota(ROTA)
    const senha = faixas(container)[4]
    const fone = senha.querySelector<HTMLImageElement>('figure.co-fone img')!
    expect(fone).not.toBeNull()
    expect(fone.getAttribute('src')).toContain('/composicao/a/historico-')
    expect(fone.getAttribute('alt')).toBe(CUIDADO.senha.legenda)
    const leg = senha.querySelector('p[data-legenda]')!
    expect(leg.textContent).toBe(CUIDADO.senha.legenda)
    expect(leg.querySelector('.co-leg-hora')!.textContent).toBe('03:00')
    expect(senha.querySelectorAll('img')).toHaveLength(1)
  })

  it('faixas 6 e 7: "Quando alguém para de cuidar." e fecho de noite com fresta de luz de mel aria-hidden', () => {
    const { container } = renderizarRota(ROTA)
    const [, , , , , parar, fecho] = faixas(container)
    expect(parar.querySelector('h2')!.textContent).toBe(CUIDADO.parar.h2)
    expect([...parar.querySelectorAll('p')].map((p) => p.textContent)).toEqual([CUIDADO.parar.p1, CUIDADO.parar.p2])

    const luz = fecho.querySelector('.cc-porta-luz')!
    expect(luz.getAttribute('aria-hidden')).toBe('true')
    expect(luz.querySelector('.cc-porta-fresta')).not.toBeNull()
    expect(luz.querySelector('.cc-porta-cunha')).not.toBeNull()
    expect(fecho.querySelector('h2')!.textContent).toBe(CUIDADO.fecho.h2)
  })

  it('duas ações "Criar conta" para /criar-conta (primário na abertura, mel no fecho)', () => {
    const { container } = renderizarRota(ROTA)
    const links = [...principal(container).querySelectorAll('a[data-botao-largo]')]
    expect(links.map((a) => a.textContent)).toEqual([CUIDADO.cta1, CUIDADO.fecho.cta2])
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/criar-conta', '/criar-conta'])
    expect(links[0].getAttribute('data-botao')).toBe('primario')
    expect(links[1].hasAttribute('data-botao-mel')).toBe(true)
  })
})

describe('/cuidado-compartilhado: cópia inalterada do deck', () => {
  it('todo bloco visível (exceto horas fantasma aria-hidden) e todo alt vêm de CUIDADO, e nenhuma frase ativa falta', () => {
    const { container } = renderizarRota(ROTA)
    const main = principal(container)
    const textos = blocosVisiveis(main)
    const alts = [...main.querySelectorAll('img[alt]')].map((img) => img.getAttribute('alt')!).filter((a) => a !== '')
    for (const texto of [...textos, ...alts]) expect(DECK.has(texto), texto).toBe(true)

    const vistas = new Set([...textos, ...alts])
    const faltam = [...DECK].filter((frase) => !FORA_DO_PRINCIPAL.has(frase) && !vistas.has(frase))
    expect(faltam).toEqual([])
  })
})

describe('/cuidado-compartilhado: imagens, sem M01/M05/moldura-dia e CSS de tokens', () => {
  it('usa apenas M12 + celulares Família e Histórico em CSS; sem M01, sem M05, sem moldura-dia.png e sem vagas', () => {
    const { container } = renderizarRota(ROTA)
    const main = principal(container)
    const imagens = [...main.querySelectorAll<HTMLImageElement>('img')]
    expect(imagens).toHaveLength(3)
    expect(main.querySelectorAll('figure.co-fone')).toHaveLength(2)

    for (const img of imagens) {
      const fontes = `${img.getAttribute('src') ?? ''} ${img.getAttribute('srcset') ?? ''}`
      expect(fontes).not.toMatch(/m01|m05|moldura-dia\.png|cenas\/publicas|ilustracoes/)
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0)
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0)
      expect((img.getAttribute('alt') ?? '').length).toBeGreaterThan(0)
    }

    expect(main.querySelector('[data-aguarda-arte], .co-vaga, [data-produto-moldura], [data-cena-heroi]')).toBeNull()
  })

  it('CSS local usa apenas tokens, sem cor crua, sombra, gradiente nem movimento fora das guardas', () => {
    const css = readFileSync(join(process.cwd(), 'src/componentes/cuidado-casa/cuidado-casa.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(css).not.toMatch(/box-shadow|text-shadow|gradient\(|blur|backdrop-filter|italic|uppercase/)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/)
    expect(css).toMatch(/@media \(min-width: 69em\) and \(min-aspect-ratio: 1\/1\) and \(prefers-reduced-motion: no-preference\)/)
    expect(css).toMatch(/@supports \(\(animation-timeline: view\(\)\) and \(animation-range: entry\)\)/)
  })
})

describe('/cuidado-compartilhado: acessibilidade', () => {
  it('sem violações do axe', async () => {
    const { container } = renderizarRota(ROTA)
    const resultado = await rodarAxe(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)).toEqual([])
  })
})
