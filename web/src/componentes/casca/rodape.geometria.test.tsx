import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
import { COLUNAS_DO_RODAPE, NOME_SITE } from './textos.ts'

// NEW-A (t_7a5a5126): a estrutura por trás da geometria do rodapé. O jsdom não faz layout: aqui ficam a árvore e as
// regras de CSS que produzem RF-01..RF-08 e F-06; os números (Δtop, quebras, alturas, bordas) saem da sonda CDP do
// cartão, no navegador. O CSS é lido do disco (no Vitest, importar CSS não devolve o texto); o Vitest roda em web/.
const site = readFileSync(join(process.cwd(), 'src', 'styles', 'site.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Os corpos de todas as regras cujo seletor é exatamente `seletor`, na ordem do arquivo (em qualquer @media). */
function corpos(seletor: string): string[] {
  return [...site.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].trim() === seletor).map((m) => m[2])
}

/** O corpo da regra `seletor` dentro do primeiro `@media` cujo texto de condição casa com `condicao`. */
function corpoNoMedia(condicao: RegExp, seletor: string): string {
  for (const m of site.matchAll(/@media([^{]+)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
    if (!condicao.test(m[1])) continue
    const regra = [...m[2].matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((r) => r[1].trim() === seletor)
    if (regra) return regra[2]
  }
  return ''
}

function rodapePublico(caminho = '/contato') {
  const r = renderizarRota(caminho)
  return { ...r, rodape: r.container.querySelector<HTMLElement>('footer[data-rodape]')! }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('NEW-A RF-01/RF-02: uma grade só de colunas, trilhas pelo conteúdo', () => {
  it('as três colunas são filhas diretas de uma única grade, cada uma com um título e uma lista', () => {
    const { rodape } = rodapePublico()
    const grades = rodape.querySelectorAll('.cm-rodape-colunas')
    expect(grades).toHaveLength(1)
    const colunas = [...grades[0].children]
    expect(colunas.map((c) => c.querySelector('h2')?.textContent)).toEqual(COLUNAS_DO_RODAPE.map((c) => c.titulo))
    for (const c of colunas) expect(c.querySelectorAll(':scope > ul.cm-rodape-lista')).toHaveLength(1)
    expect(colunas.map((c) => c.getAttribute('data-coluna'))).toEqual(['produto', 'ajuda', 'legal'])
  })

  it('de 768 para cima as trilhas vêm do conteúdo (max-content), não de terços iguais que quebram os rótulos longos', () => {
    const corpo = corpoNoMedia(/min-width:\s*768px/, '.cm-rodape-colunas')
    expect(corpo).toMatch(/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*max-content\)\)/)
    expect(corpo).toMatch(/justify-content:\s*space-between/)
  })
})

describe('NEW-A RF-03: abaixo de 768 nenhuma coluna fica sozinha ao lado de espaço vazio', () => {
  it('cada grupo ocupa a linha inteira e os links correm em linha, com o vão junto', () => {
    const grade = corpos('.cm-rodape-colunas')[0] ?? ''
    expect(grade).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    const lista = corpos('.cm-rodape-lista')[0] ?? ''
    expect(lista).toMatch(/display:\s*flex/)
    expect(lista).toMatch(/flex-wrap:\s*wrap/)
    expect(lista).toMatch(/column-gap:\s*var\(--espaco-junto\)/)
    // De 768 para cima as listas voltam a ser colunas.
    expect(corpoNoMedia(/min-width:\s*768px/, '.cm-rodape-lista')).toMatch(/flex-direction:\s*column/)
  })
})

describe('NEW-A RF-05: o nome segue o comprimento da página (data-pagina-curta)', () => {
  function simularAlturas(main: number, janela: number) {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(janela)
    const original = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.tagName === 'MAIN') return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: main, width: 0, height: main, toJSON: () => ({}) } as DOMRect
      return original.call(this)
    })
  }

  it('página longa (main >= 1,5 x janela): sem o atributo; ao encolher e redimensionar, o atributo aparece', () => {
    simularAlturas(2000, 800)
    const { rodape } = rodapePublico('/privacidade')
    expect(rodape.hasAttribute('data-pagina-curta')).toBe(false)
    simularAlturas(1100, 800)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(rodape.hasAttribute('data-pagina-curta')).toBe(true)
  })

  it('a regra da página curta usa o token exibicao; a regra base continua presa ao miolo do painel', () => {
    // Sem @media: o token vale em todas as larguras, inclusive 390 (a regra fora de media e a única com esse seletor).
    expect(corpoNoMedia(/min-width/, '.cm-rodape[data-pagina-curta] .cm-rodape-nome')).toBe('')
    expect(corpos('.cm-rodape[data-pagina-curta] .cm-rodape-nome')).toHaveLength(1)
    const curta = corpos('.cm-rodape[data-pagina-curta] .cm-rodape-nome')[0] ?? ''
    expect(curta).toMatch(/font-size:\s*var\(--texto-exibicao-tamanho\)/)
    expect(curta).toMatch(/line-height:\s*var\(--texto-exibicao-entrelinha\)/)
    expect(corpos('.cm-rodape-nome')[0]).toMatch(/cqi/)
  })
})

describe('NEW-A RF-08 (V-01/AUD-13): na página curta o rodapé não passa pela revelação', () => {
  it('com main curto, nenhum link do rodapé fica dentro do recipiente que corta (overflow-hidden)', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900)
    const { rodape } = rodapePublico('/rota-que-nao-existe')
    expect(rodape.hasAttribute('data-pagina-curta')).toBe(true)
    const links = rodape.querySelectorAll('a')
    expect(links.length).toBe(9)
    for (const a of links) expect(a.closest('.overflow-hidden'), a.textContent ?? '').toBeNull()
    expect(rodape.querySelector('.cm-rodape-painel > .cm-rodape-conteudo')).not.toBeNull()
  })
})

describe('NEW-A F-06 (WCAG 1.4.12) e RF-07 (AUD-12)', () => {
  it('o nome pode quebrar entre "App" e "Maternidade" quando o espaçamento de texto cresce, sem mudar o texto', () => {
    const { rodape } = rodapePublico()
    const nome = rodape.querySelector<HTMLElement>('[data-nome-rodape]')!
    expect(nome.textContent).toBe(NOME_SITE)
    expect(nome.querySelectorAll('wbr')).toHaveLength(1)
    const corpo = corpos('.cm-rodape-nome')[0] ?? ''
    expect(corpo).not.toMatch(/white-space:\s*nowrap/)
    expect(corpo).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('o link do rodapé guarda uma margem de rolagem: o Tab não o deixa colado na borda da janela', () => {
    expect(corpos('.cm-rodape-link')[0]).toMatch(/scroll-margin-block:\s*var\(--espaco-/)
  })
})

describe('NEW-A RF-06: rodapé logado no quadro do conteúdo, com o nome do site', () => {
  it('em /app/hoje o rodapé compacto está num QuadroLayout (o mesmo recipiente da moldura logada) e não na cm-area', () => {
    const { container } = renderizarRota('/app/hoje')
    const rodape = container.querySelector<HTMLElement>('footer[data-rodape]')!
    expect(rodape.classList.contains('cm-rodape-compacto')).toBe(true)
    expect(rodape.querySelector('.cm-area')).toBeNull()
    const quadro = rodape.querySelector<HTMLElement>(':scope > [data-h~="quadro"]')
    expect(quadro).not.toBeNull()
    expect(quadro!.getAttribute('data-h-largura')).toBe('quadro')
    // A moldura logada usa o mesmo recipiente: as duas bordas esquerdas são a mesma.
    expect(container.querySelector('main')!.previousElementSibling!.matches('[data-h~="quadro"]')).toBe(true)
  })

  it('traz o nome do site em texto pequeno (não título) antes dos links', () => {
    const { container } = renderizarRota('/app/hoje')
    const rodape = container.querySelector<HTMLElement>('footer[data-rodape]')!
    const marca = rodape.querySelector<HTMLElement>('[data-marca-rodape]')
    expect(marca).not.toBeNull()
    expect(marca!.tagName).toBe('P')
    expect(marca!.textContent).toBe(NOME_SITE)
    expect(marca!.classList.contains('cm-pequeno')).toBe(true)
    const nav = within(rodape).getByRole('navigation')
    expect(marca!.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(rodape).queryAllByRole('heading')).toHaveLength(0)
  })
})
