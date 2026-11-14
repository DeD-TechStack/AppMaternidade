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

const PAGINAS_DE_DESTAQUE = ['/como-funciona', '/cuidado-compartilhado', '/desenvolvimento'] as const

function principal(container: HTMLElement): HTMLElement {
  return container.querySelector('main') as HTMLElement
}

function ehSecao(elemento: Element): boolean {
  return (elemento.getAttribute('data-h') ?? '').split(' ').includes('secao')
}

describe('páginas públicas: o <main> tem só Secao', () => {
  for (const caminho of [...PAGINAS_DE_TEXTO, ...PAGINAS_DE_DESTAQUE, '/nao-existe']) {
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

describe('páginas em destaque: Secao, Colunas e painéis', () => {
  for (const caminho of PAGINAS_DE_DESTAQUE) {
    it(`${caminho}: a abertura é um Colunas de vão midia, de 1100 px em diante, com o texto e a mídia por filhos`, () => {
      const { container } = renderizarRota(caminho)
      const abertura = principal(container).querySelector('.pd-abertura')!
      expect(abertura.getAttribute('data-h')).toContain('colunas')
      expect(abertura.getAttribute('data-h-vao')).toBe('midia')
      expect(abertura.getAttribute('data-h-quebra')).toBe('1100')
      expect(abertura.querySelector(':scope > .pd-abertura-texto')!.getAttribute('data-h')).toContain('coluna')
      expect(abertura.querySelector(':scope > .pd-abertura-midia')!.getAttribute('data-h')).toContain('coluna')
      expect(abertura.closest('[data-h~="secao"]')!.parentElement).toBe(principal(container))
    })

    it(`${caminho}: nenhum bloco do <main> usa classe de margem entre seções (pd-secao, pd-pagina)`, () => {
      const { container } = renderizarRota(caminho)
      expect(principal(container).classList.contains('pd-pagina')).toBe(false)
      expect(principal(container).querySelector('.pd-secao, .pd-pagina')).toBeNull()
    })

    it(`${caminho}: a cabeça de cada seção é um QuadroLayout medio (880) e o h2 vem de uma Pilha`, () => {
      const { container } = renderizarRota(caminho)
      const cabecas = principal(container).querySelectorAll('.pd-cabeca')
      for (const cabeca of cabecas) {
        expect(cabeca.getAttribute('data-h')).toContain('pilha')
        const quadro = cabeca.closest('[data-h~="quadro"]')
        // Dentro de uma coluna (tummy time) a cabeça não leva quadro próprio.
        if (!cabeca.closest('[data-h~="coluna"]')) expect(quadro!.getAttribute('data-h-largura')).toBe('medio')
      }
    })
  }

  it('Como funciona: uma faixa de cacau, como Secao de painel; os passos são uma Pilha bloco (ol)', () => {
    const { container } = renderizarRota('/como-funciona')
    const faixas = principal(container).querySelectorAll('[data-h~="secao"][data-h-variante="painel"]')
    expect(faixas).toHaveLength(1)
    expect(faixas[0].querySelector(':scope > [data-painel="cacau"]')).not.toBeNull()
    expect(faixas[0].matches('section[aria-labelledby]')).toBe(true)
    const passos = principal(container).querySelector('ol[data-passos]')!
    expect(passos.getAttribute('data-h')).toContain('pilha')
    expect(passos.getAttribute('data-h-vao')).toBe('bloco')
    const colunas = principal(container).querySelector('.pd-duas')!
    expect(colunas.getAttribute('data-h-vao')).toBe('bloco')
    expect(colunas.getAttribute('data-h-quebra')).toBe('900')
  })

  it('Cuidado compartilhado: o painel de areia é uma Secao de painel (.pd-registro) e a lista dos blocos é uma Pilha', () => {
    const { container } = renderizarRota('/cuidado-compartilhado')
    const paineis = principal(container).querySelectorAll('[data-h~="secao"][data-h-variante="painel"]')
    expect(paineis).toHaveLength(1)
    const caixa = paineis[0].querySelector(':scope > [data-painel="areia"]')!
    expect(caixa.classList.contains('pd-registro')).toBe(true)
    const lista = principal(container).querySelector('ul[data-blocos]')!
    expect(lista.getAttribute('data-h')).toContain('pilha')
    expect(lista.closest('[data-h~="quadro"]')!.getAttribute('data-h-largura')).toBe('quadro')
  })

  it('Desenvolvimento: a faixa de cacau é uma Secao de painel e o tummy time é uma Pilha bloco', () => {
    const { container } = renderizarRota('/desenvolvimento')
    const paineis = principal(container).querySelectorAll('[data-h~="secao"][data-h-variante="painel"]')
    expect(paineis).toHaveLength(1)
    expect(paineis[0].querySelector(':scope > [data-painel="cacau"]')).not.toBeNull()
    const cima = principal(container).querySelector('#tummy-time .pd-tummy-cima')!
    expect(cima.getAttribute('data-h-vao')).toBe('midia')
    expect(cima.parentElement!.getAttribute('data-h-vao')).toBe('bloco')
    const fim = principal(container).querySelector('#tummy-time .pd-tummy-fim')!
    expect(fim.getAttribute('data-h-vao')).toBe('grupo')
  })
})

describe('rota inexistente: Secao, QuadroLayout e Pilha', () => {
  it('o título, a linha de ajuda e o botão são itens de uma Pilha dentro do QuadroLayout', () => {
    const { container } = renderizarRota('/nao-existe')
    const secao = principal(container).firstElementChild!
    const quadro = secao.querySelector(':scope > [data-h~="quadro"]')!
    expect(quadro.getAttribute('data-h-largura')).toBe('medio')
    const pilha = quadro.querySelector(':scope > [data-h~="pilha"]')!
    expect(Array.from(pilha.children).map((filho) => filho.tagName)).toEqual(['H1', 'P', 'A'])
    expect(principal(container).querySelector('.cm-pagina-simples')).toBeNull()
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

  it('Desenvolvimento: o painel de cada fase é um Cartao, mantendo a coluna', () => {
    const { container } = renderizarRota('/desenvolvimento')
    const fases = container.querySelectorAll('[role="tabpanel"].pd-fase')
    expect(fases.length).toBeGreaterThan(0)
    for (const fase of fases) {
      expect(ehCartao(fase)).toBe(true)
      expect((fase.getAttribute('data-h') ?? '').split(' ')).toContain('coluna')
    }
  })

  it('Desenvolvimento: o aviso de saúde é um Cartao, com o ícone e o texto', () => {
    const { container } = renderizarRota('/desenvolvimento')
    const aviso = container.querySelector('[data-aviso-saude]')!
    expect(ehCartao(aviso)).toBe(true)
    expect(aviso.querySelector('svg')).not.toBeNull()
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

  it('Como funciona: os passos são uma Pilha de vão bloco e cada item é filho direto', () => {
    const { container } = renderizarRota('/como-funciona')
    const passos = principal(container).querySelector('ol[data-passos]')!
    expect(passos.getAttribute('data-h-vao')).toBe('bloco')
    for (const item of passos.children) expect(item.tagName).toBe('LI')
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
