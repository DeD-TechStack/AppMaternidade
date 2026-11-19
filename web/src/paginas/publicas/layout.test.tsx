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
    it(`${caminho}: as seções de texto são itens de uma só Pilha bloco dentro do QuadroLayout leitura`, () => {
      const { container } = renderizarRota(caminho)
      const quadro = principal(container).querySelector('[data-h~="quadro"][data-h-largura="leitura"]')!
      expect(quadro).not.toBeNull()
      const pilha = quadro.querySelector(':scope > [data-h~="pilha"]')!
      expect(pilha.getAttribute('data-h-vao')).toBe('bloco')
      const secoes = Array.from(principal(container).querySelectorAll('section.pt-secao'))
      expect(secoes.length).toBeGreaterThan(0)
      for (const secao of secoes) expect(secao.parentElement).toBe(pilha)
      // Uma só pilha de seções de texto na página.
      expect(principal(container).querySelectorAll('[data-h~="pilha"]:has(> section.pt-secao)')).toHaveLength(1)
    })

    it(`${caminho}: o título e a abertura ficam em Colunas de vão midia, à esquerda da coluna`, () => {
      const { container } = renderizarRota(caminho)
      const colunas = principal(container).querySelector('.pt-abertura')!
      expect(colunas.getAttribute('data-h')).toContain('colunas')
      expect(colunas.getAttribute('data-h-vao')).toBe('midia')
      expect(colunas.getAttribute('data-h-quebra')).toBe('1100')
      expect(colunas.querySelector('h1')!.closest('[data-h~="coluna"]')).not.toBeNull()
      expect(colunas.querySelector('aside.pt-painel')!.closest('[data-h~="coluna"]')).not.toBeNull()
    })

    it(`${caminho}: o corpo de cada seção é uma Pilha (h2 e texto são irmãos diretos)`, () => {
      const { container } = renderizarRota(caminho)
      const secao = principal(container).querySelector('section.pt-secao')!
      expect(secao.getAttribute('data-h')).toContain('pilha')
      expect(secao.querySelector(':scope > h2')).not.toBeNull()
      expect(secao.querySelector(':scope > .pt-texto')!.getAttribute('data-h')).toContain('pilha')
    })
  }

  it('o índice abre a pilha de leitura, antes do texto', () => {
    const { container } = renderizarRota('/privacidade')
    const pilha = principal(container).querySelector('.pt-leitura')!
    expect(pilha.firstElementChild!.matches('nav.pt-indice')).toBe(true)
  })
})

function semComentarios(arquivo: string): string {
  return readFileSync(arquivo, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

function ehCartao(elemento: Element | null): boolean {
  return (elemento?.getAttribute('data-h') ?? '').split(' ').includes('cartao')
}

describe('H-3c R1-01: caixas de conteúdo com fundo ou borda são o primitivo Cartao', () => {
  it('Contato: o cartão de e-mail é um Cartao (padding do token, sem padding próprio)', () => {
    const { container } = renderizarRota('/contato')
    expect(ehCartao(container.querySelector('.pt-email'))).toBe(true)
    const css = semComentarios('src/componentes/publicas-texto/publicasTexto.css')
    const regra = css.match(/\.pt-email\s*\{([^}]*)\}/)![1]
    expect(regra).not.toMatch(/padding\s*:/)
    expect(regra).not.toMatch(/border-radius\s*:/)
  })

  it('o CSS local não repete o padding nem o raio que o Cartao já dá (só a exceção do celular)', () => {
    const css = semComentarios('src/componentes/publicas-destaque/publicas-destaque.css')
    const base = css.match(/\n\.pd-fase\s*\{([^}]*)\}/)![1]
    expect(base).not.toMatch(/padding\s*:/)
    expect(base).not.toMatch(/border-radius\s*:/)
    const aviso = css.match(/\n\.pd-aviso-saude\s*\{([^}]*)\}/)![1]
    expect(aviso).not.toMatch(/padding\s*:/)
    expect(aviso).not.toMatch(/border-radius\s*:/)
  })
})

describe('H-3c R1-03: o vão entre os passos é o da Pilha (bloco), sem margem de fora no item', () => {
  it('nenhuma regra põe margem no item da lista de passos', () => {
    const css = semComentarios('src/componentes/publicas-destaque/publicas-destaque.css')
    const regras = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    const comMargem = regras
      .filter(([, seletor]) => /\.pd-passos\s*>\s*li/.test(seletor))
      .filter(([, , corpo]) => /margin/.test(corpo))
    expect(comMargem.map(([, seletor]) => seletor.trim())).toEqual([])
  })
})

describe('H-3c R1-05: a cabeça da página de leitura tem o limite de leitura (640)', () => {
  for (const caminho of PAGINAS_DE_TEXTO) {
    it(`${caminho}: título e abertura ficam numa coluna com max-w-leitura, e o corpo num quadro leitura`, () => {
      const { container } = renderizarRota(caminho)
      const cabeca = principal(container).querySelector('.pt-abertura > .pt-cabeca')!
      expect(cabeca.classList.contains('max-w-leitura')).toBe(true)
      expect(cabeca.querySelector('h1')).not.toBeNull()
      const corpo = principal(container).querySelector('.pt-leitura')!
      expect(corpo.closest('[data-h~="quadro"]')!.getAttribute('data-h-largura')).toBe('leitura')
    })
  }
})

describe('os arquivos de estilo das páginas públicas não têm espaço solto', () => {
  const ARQUIVOS = [
    'src/componentes/publicas-texto/publicasTexto.css',
    'src/componentes/publicas-destaque/publicas-destaque.css',
  ]
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
