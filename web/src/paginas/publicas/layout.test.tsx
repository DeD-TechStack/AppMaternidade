import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// H-3a nas páginas públicas: cada página é uma pilha de `Secao` filhas diretas do <main>, sem margem entre
// elas; as páginas de leitura têm o título e o corpo em `QuadroLayout largura="leitura"` e todas as seções de
// texto numa só `Pilha` de vão `bloco`.

const PAGINAS_DE_TEXTO = [
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
] as const

// /como-funciona, /cuidado-compartilhado e /desenvolvimento saíram das páginas em destaque: as três foram refeitas
// nas seções da casa e cada uma tem o seu teste (comoFunciona.casa.test.tsx, cuidado.casa.test.tsx e
// desenvolvimento.casa.test.tsx). Com a lista vazia, o bloco "páginas em destaque" daqui saiu.

function principal(container: HTMLElement): HTMLElement {
  return container.querySelector('main') as HTMLElement
}

function ehSecao(elemento: Element): boolean {
  return (elemento.getAttribute('data-h') ?? '').split(' ').includes('secao')
}

describe('páginas públicas: o <main> tem só Secao', () => {
  for (const caminho of PAGINAS_DE_TEXTO) {
    it(`${caminho}: todo filho do <main> é uma Secao e nenhum elemento usa cm-area`, () => {
      const { container } = renderizarRota(caminho)
      const filhos = Array.from(principal(container).children)
      expect(filhos.length).toBeGreaterThan(0)
      for (const filho of filhos) expect(ehSecao(filho)).toBe(true)
      expect(principal(container).classList.contains('cm-area')).toBe(false)
      expect(principal(container).querySelector('.cm-area')).toBeNull()
    })
  }
})

describe('páginas de leitura: coluna de leitura de 640', () => {
  for (const caminho of PAGINAS_DE_TEXTO) {
    if (caminho === '/sobre') continue
    it(`${caminho}: as seções de texto são itens de uma só Pilha midia (64 px em 1440), a coluna de leitura de 640, dentro do quadro da página`, () => {
      const { container } = renderizarRota(caminho)
      const quadro = principal(container).querySelector('[data-h~="quadro"].pt-pagina')!
      expect(quadro).not.toBeNull()
      expect(quadro.getAttribute('data-h-largura')).toBe('quadro')
      const pilha = quadro.querySelector('.pt-pagina-grade > [data-h~="pilha"]')!
      expect(pilha.getAttribute('data-h-vao')).toBe('midia')
      expect(pilha.classList.contains('max-w-leitura')).toBe(true)
      const secoes = Array.from(principal(container).querySelectorAll('section.pt-secao'))
      expect(secoes.length).toBeGreaterThan(0)
      for (const secao of secoes) expect(secao.parentElement).toBe(pilha)
      // Uma só pilha de seções de texto na página.
      expect(principal(container).querySelectorAll('[data-h~="pilha"]:has(> section.pt-secao)')).toHaveLength(1)
    })

    it(`${caminho}: a abertura é uma Secao de cacau, de ponta a ponta, com o texto num QuadroLayout leitura na borda esquerda do quadro`, () => {
      const { container } = renderizarRota(caminho)
      const faixa = principal(container).querySelector('.pt-abertura')!
      expect(ehSecao(faixa)).toBe(true)
      expect(faixa.getAttribute('data-faixa-fundo')).toBe('cacau')
      const quadro = faixa.querySelector('[data-h~="quadro"]')!
      expect(quadro.getAttribute('data-h-largura')).toBe('leitura')
      expect(quadro.querySelector('h1')).not.toBeNull()
      expect(faixa.querySelector('[data-h~="colunas"], [data-h~="cartao"], aside')).toBeNull()
    })

    it(`${caminho}: o corpo de cada seção é uma Pilha (h2 e texto são irmãos diretos)`, () => {
      const { container } = renderizarRota(caminho)
      const secao = principal(container).querySelector('section.pt-secao')!
      expect(secao.getAttribute('data-h')).toContain('pilha')
      expect(secao.querySelector(':scope > h2')).not.toBeNull()
      expect(secao.querySelector(':scope > .pt-texto')!.getAttribute('data-h')).toContain('pilha')
    })
  }

  it('o índice abre a grade da leitura, antes do texto', () => {
    const { container } = renderizarRota('/privacidade')
    const grade = principal(container).querySelector('.pt-pagina-grade')!
    expect(grade.firstElementChild!.matches('nav.pt-indice')).toBe(true)
    expect(grade.lastElementChild!.matches('.pt-leitura')).toBe(true)
  })
})

function semComentarios(arquivo: string): string {
  return readFileSync(arquivo, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

function ehCartao(elemento: Element | null): boolean {
  return (elemento?.getAttribute('data-h') ?? '').split(' ').includes('cartao')
}

describe('T2: nenhuma caixa de conteúdo na abertura (nada de cartão, painel nem sombra)', () => {
  it('Contato: o bloco de e-mail não é um Cartao (sem fundo, borda nem padding próprio): fica sobre o cacau', () => {
    const { container } = renderizarRota('/contato')
    expect(ehCartao(container.querySelector('.pt-email'))).toBe(false)
    const css = semComentarios('src/componentes/publicas-texto/publicasTexto.css')
    const regra = css.match(/\.pt-email\s*\{([^}]*)\}/)![1]
    expect(regra).not.toMatch(/padding\s*:/)
    expect(regra).not.toMatch(/border|background|box-shadow/)
  })
})

describe('H-3c R1-05: a cabeça da página de leitura tem o limite de leitura (640)', () => {
  for (const caminho of PAGINAS_DE_TEXTO) {
    if (caminho === '/sobre') continue
    it(`${caminho}: título e abertura ficam num QuadroLayout leitura (640), e o corpo numa coluna com max-w-leitura`, () => {
      const { container } = renderizarRota(caminho)
      const cabeca = principal(container).querySelector('.pt-abertura .pt-cabeca')!
      expect(cabeca.closest('[data-h~="quadro"]')!.getAttribute('data-h-largura')).toBe('leitura')
      expect(cabeca.querySelector('h1')).not.toBeNull()
      const corpo = principal(container).querySelector('.pt-leitura')!
      expect(corpo.classList.contains('max-w-leitura')).toBe(true)
    })
  }

  it('/sobre: o corpo ocupa três faixas no quadro da página', () => {
    const { container } = renderizarRota('/sobre')
    const quadros = principal(container).querySelectorAll(':scope > [data-h~="secao"] > [data-h-largura="quadro"]')
    expect([...quadros].map((quadro) => quadro.querySelectorAll('section.pt-secao').length)).toEqual([1, 1, 2])
  })
})

describe('os arquivos de estilo das páginas públicas não têm espaço solto', () => {
  const ARQUIVOS = ['src/componentes/publicas-texto/publicasTexto.css']
  for (const arquivo of ARQUIVOS) {
    it(`${arquivo}: sem clamp() nem px acima de 32 em margin, padding e gap`, () => {
      const css = readFileSync(arquivo, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      const declaracoes = css.match(/(?:^|[;{\s])(?:margin|padding|gap|row-gap|column-gap)[a-z-]*\s*:[^;}]+/g) ?? []
      const soltas = declaracoes.filter((declaracao) => {
        if (/clamp\(/.test(declaracao)) return true
        return Array.from(declaracao.matchAll(/(-?\d+(?:\.\d+)?)px/g)).some((m) => Math.abs(Number(m[1])) > 32)
      })
      expect(soltas.map((declaracao) => declaracao.trim())).toEqual([])
    })
  }
})
