import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { criarEstadoInicial, type EstadoPrototipo } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'
import { listarFontes, pastaSrcDe } from './teste/fontes.ts'

// MAT-44: o salto visual de Início, Hoje e Sessão. O jsdom não pinta nada; estes testes conferem
// o que dá para conferir no código: os tokens, a estrutura dos campos, dos aparelhos e das
// ilustrações, as âncoras do cabeçalho e as dependências de movimento.

const pastaSrc = pastaSrcDe(import.meta.url)
const lerTexto = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')
const tokensCss = lerTexto('styles/tokens.css')
const temaCss = lerTexto('styles/tema.css')
const estiloGlobal = lerTexto('index.css')

const claro = (): EstadoPrototipo => criarEstadoInicial(Date.now())
const madrugada = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), madrugada: true })
const semSessao = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), sessao: null })

function lerTokens(css: string): Record<string, string> {
  const bloco = /@theme\s*\{([^}]*)\}/.exec(css)
  if (!bloco) throw new Error('bloco @theme não encontrado em tokens.css')
  const cores: Record<string, string> = {}
  for (const [, nome, hex] of bloco[1].matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/g)) {
    cores[nome] = hex
  }
  return cores
}

/** Matiz (graus) e saturação (0 a 1) em HSL. */
function hsl(hex: string): { matiz: number; saturacao: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const luz = (max + min) / 2
  if (delta === 0) return { matiz: 0, saturacao: 0 }
  let matiz: number
  if (max === r) matiz = ((g - b) / delta) % 6
  else if (max === g) matiz = (b - r) / delta + 2
  else matiz = (r - g) / delta + 4
  matiz *= 60
  if (matiz < 0) matiz += 360
  return { matiz, saturacao: delta / (1 - Math.abs(2 * luz - 1)) }
}

const tokens = lerTokens(tokensCss)

describe('MAT-44: matiz e saturação dos campos de cor', () => {
  const campos = Object.keys(tokens).filter((nome) => /^(night-)?field-\d+$/.test(nome))

  it('existe pelo menos um campo de cor, nos dois temas', () => {
    expect(campos.filter((nome) => !nome.startsWith('night-')).length).toBeGreaterThanOrEqual(1)
    expect(campos.filter((nome) => nome.startsWith('night-')).length).toBeGreaterThanOrEqual(1)
  })

  for (const nome of ['accent', 'night-accent', ...campos]) {
    it(`${nome} fica fora do intervalo de matiz [35°, 65°] (amarelo e âmbar)`, () => {
      const { matiz } = hsl(tokens[nome])
      expect(matiz < 35 || matiz > 65, `matiz de ${nome}: ${matiz.toFixed(1)}°`).toBe(true)
    })
  }

  for (const nome of campos) {
    it(`${nome} tem saturação HSL de no máximo 35%`, () => {
      const { saturacao } = hsl(tokens[nome])
      expect(saturacao, `saturação de ${nome}`).toBeLessThanOrEqual(0.35)
    })
  }
})

describe('MAT-44: variáveis de uso dos campos', () => {
  const blocoDoDia = /:root\s*\{([^}]*)\}/.exec(temaCss)![1]
  const noite = /\[data-tema=['"]madrugada['"]\]\s*\{([^}]*)\}/.exec(temaCss)![1]

  it('os campos de barro e lavanda apontam para os tokens do dia e da noite', () => {
    expect(blocoDoDia).toMatch(/--cor-campo-1:\s*var\(--color-field-1\)/)
    expect(blocoDoDia).toMatch(/--cor-campo-2:\s*var\(--color-field-2\)/)
    expect(noite).toMatch(/--cor-campo-1:\s*var\(--color-night-field-1\)/)
    expect(noite).toMatch(/--cor-campo-2:\s*var\(--color-night-field-2\)/)
  })

  it('o invólucro local da madrugada usa o mesmo bloco da madrugada da página', () => {
    expect(temaCss).toMatch(/\[data-tema-local=['"]madrugada['"]\]\s*,\s*:root\[data-tema=['"]madrugada['"]\]\s*\{/)
  })

  it('sobre barro e lavanda o texto é a tinta; sobre o urucum, a cor sobre o destaque', () => {
    expect(estiloGlobal).toMatch(/\[data-campo='accent'\]\s*\{[^}]*color:\s*var\(--cor-sobre-destaque\)/)
    expect(estiloGlobal).toMatch(/\[data-campo='field-1'\][^{]*\{[^}]*color:\s*var\(--cor-texto\)/)
    expect(estiloGlobal).toMatch(/\[data-campo='field-2'\][^{]*\{[^}]*color:\s*var\(--cor-texto\)/)
  })
})

describe('MAT-44: composição do Início', () => {
  async function inicio() {
    const resultado = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    return resultado.container
  }

  it('há pelo menos 3 seções de campo de cor, com token válido, e nunca mais de 2 seguidas', async () => {
    const container = await inicio()

    const secoes = [...container.querySelectorAll('main > section')]
    const campos = secoes.filter((secao) => secao.hasAttribute('data-campo'))
    expect(campos.length).toBeGreaterThanOrEqual(3)
    for (const campo of campos) {
      expect(tokens[campo.getAttribute('data-campo')!], campo.outerHTML.slice(0, 80)).toBeDefined()
    }

    let seguidos = 0
    for (const secao of secoes) {
      seguidos = secao.hasAttribute('data-campo') ? seguidos + 1 : 0
      expect(seguidos, 'campos de cor seguidos').toBeLessThanOrEqual(2)
    }
    // Entre os campos há faixas de papel: nem tudo é campo.
    expect(secoes.length).toBeGreaterThan(campos.length)
  })

  it('os campos usam o urucum, o barro e a lavanda', async () => {
    const container = await inicio()

    const usados = new Set([...container.querySelectorAll('main > section[data-campo]')].map((s) => s.getAttribute('data-campo')))
    expect([...usados].sort()).toEqual(['accent', 'field-1', 'field-2'])
  })

  it('há pelo menos 2 aparelhos, inertes e escondidos do leitor de tela, e um deles é notebook', async () => {
    const container = await inicio()

    const aparelhos = [...container.querySelectorAll<HTMLElement>('[data-aparelho]')]
    expect(aparelhos.length).toBeGreaterThanOrEqual(2)
    for (const aparelho of aparelhos) {
      expect(['celular', 'notebook']).toContain(aparelho.getAttribute('data-aparelho'))
      expect(aparelho.hasAttribute('inert'), aparelho.className).toBe(true)
      expect(aparelho.getAttribute('aria-hidden')).toBe('true')
    }
    expect(aparelhos.some((a) => a.getAttribute('data-aparelho') === 'notebook')).toBe(true)
  })

  it('o primeiro [inert] é o grupo de miniaturas, com os botões rápidos, o cronômetro e as variantes da página', async () => {
    const container = await inicio()

    const grupo = container.querySelector<HTMLElement>('[inert]')!
    expect(grupo.getAttribute('aria-hidden')).toBe('true')
    expect(grupo.querySelector('button[aria-label="Iniciar sono de Lia"]')).not.toBeNull()
    expect(grupo.querySelector('[role="timer"].cronometro-mini')).not.toBeNull()
    expect(grupo.querySelector('[class*="/pagina:"]')).not.toBeNull()
  })

  it('as miniaturas usam os mesmos componentes, sem navegação inferior, sem ids e sem efeito no <html>', async () => {
    const container = await inicio()

    for (const aparelho of container.querySelectorAll('[data-aparelho]')) {
      expect(aparelho.querySelector('nav'), 'navegação inferior dentro do aparelho').toBeNull()
      expect(aparelho.querySelector('[id]'), 'id dentro do aparelho').toBeNull()
    }
    expect(container.querySelectorAll('[data-aparelho] .campo-andamento').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-aparelho] .campo-sessao').length).toBeGreaterThan(0)
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)
  })

  it('a miniatura da madrugada usa o invólucro local, não o <html>', async () => {
    const container = await inicio()

    const locais = container.querySelectorAll('[data-tema-local="madrugada"]')
    expect(locais).toHaveLength(1)
    expect(locais[0].closest('[data-aparelho="celular"]')).not.toBeNull()
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)
  })

  it('cada composição de aparelhos tem um parágrafo visível ao lado', async () => {
    await inicio()

    expect(screen.getByText('Duas telas do protótipo')).toBeTruthy()
    expect(screen.getByText(/^Na tela Hoje ficam a soneca que Bruno começou/)).toBeTruthy()
    expect(
      screen.getByText(
        'No celular, a mesma sessão de tummy time no modo madrugada: tela escura, cronômetro grande e botões maiores.',
      ),
    ).toBeTruthy()
  })

  it('o cabeçalho tem até 64 px no desktop e os links têm alvo de 44 px', async () => {
    const container = await inicio()

    const cabecalho = container.querySelector('header')!
    expect(cabecalho.className).toContain('@min-[46rem]/pagina:h-16')
    const links = [...cabecalho.querySelectorAll('a')]
    expect(links).toHaveLength(3)
    for (const link of links) expect(link.classList.contains('alvo-toque')).toBe(true)
  })

  it('os fatos mantêm os quatro itens, com o termo grande em Fraunces', async () => {
    const container = await inicio()

    expect([...container.querySelectorAll('.numero-fato')].map((n) => n.textContent)).toEqual([
      '7',
      'Autoria',
      'Convites',
      'Lembretes',
    ])
    // A regra do tamanho é a que declara font-size (o seletor também aparece em outro grupo).
    const corpo = [...estiloGlobal.matchAll(/\.numero-fato\s*\{([^}]*)\}/g)]
      .map((m) => m[1])
      .find((texto) => texto.includes('font-size'))!
    const [, minimo, , maximo] = /clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)rem\s*\)/.exec(corpo)!
    // Em 390 px vale o mínimo; em 1440 px vale o máximo (o termo central da escala é menor).
    expect(parseFloat(minimo) * 16).toBeGreaterThanOrEqual(32)
    expect(parseFloat(maximo) * 16).toBeGreaterThanOrEqual(40)
  })

  it('na página pública não há ícone fora das miniaturas dos aparelhos', async () => {
    const container = await inicio()

    const fora = [...container.querySelectorAll('svg.lucide')].filter((icone) => icone.closest('[inert]') === null)
    expect(fora).toEqual([])
  })
})

describe('MAT-44: âncoras do cabeçalho do Início', () => {
  it('cada link começa com #, aponta para um id existente e é único', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const hrefs = [...container.querySelectorAll('header a')].map((a) => a.getAttribute('href')!)
    expect(hrefs.length).toBeGreaterThanOrEqual(3)
    for (const href of hrefs) {
      expect(href.startsWith('#'), href).toBe(true)
      expect(href.startsWith('#secao-'), href).toBe(true)
      expect(container.querySelector(`[id="${href.slice(1)}"]`), `id de ${href}`).not.toBeNull()
    }
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('os rótulos são os do texto aprovado, na ordem', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    expect([...container.querySelectorAll('header a')].map((a) => a.textContent)).toEqual([
      'As telas',
      'Para que serve',
      'Madrugada',
    ])
  })
})

describe('MAT-44: ilustrações', () => {
  const casos: Array<[string, string, EstadoPrototipo]> = [
    ['Início', '/', claro()],
    ['Hoje', '/app/hoje', claro()],
    ['Sessão', '/app/sessao', claro()],
    ['Sessão vazia', '/app/sessao', semSessao()],
  ]

  it('somam de 3 a 6 ilustrações distintas nas 3 telas, todas decorativas', async () => {
    const nomes = new Set<string>()
    for (const [tela, caminho, estado] of casos) {
      const { container, unmount } = renderizarRota(caminho, { estadoInicial: estado })
      await screen.findAllByRole('heading')
      for (const ilustracao of container.querySelectorAll('[data-ilustracao]')) {
        expect(ilustracao.tagName.toLowerCase(), tela).toBe('svg')
        expect(ilustracao.getAttribute('aria-hidden'), `${tela}: ${ilustracao.getAttribute('data-ilustracao')}`).toBe('true')
        nomes.add(ilustracao.getAttribute('data-ilustracao')!)
      }
      unmount()
    }
    expect(nomes.size).toBeGreaterThanOrEqual(3)
    expect(nomes.size).toBeLessThanOrEqual(6)
  })

  it('o estado vazio da Sessão tem uma ilustração', async () => {
    const { container } = renderizarRota('/app/sessao', { estadoInicial: semSessao() })
    await screen.findByRole('heading', { level: 1 })

    expect(container.querySelectorAll('[data-ilustracao]').length).toBeGreaterThanOrEqual(1)
  })

  it('na área logada, o Hoje não tem ilustração e a Sessão tem uma só', async () => {
    const hoje = renderizarRota('/app/hoje')
    await screen.findByRole('heading', { level: 1 })
    expect(hoje.container.querySelectorAll('[data-ilustracao]')).toHaveLength(0)
    hoje.unmount()

    const sessao = renderizarRota('/app/sessao')
    await screen.findByRole('heading', { level: 1 })
    expect(sessao.container.querySelectorAll('[data-ilustracao]')).toHaveLength(1)
  })
})

describe('MAT-44: Hoje e Sessão', () => {
  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`Hoje (${tema}): o único cartão fica num campo de cor com token válido`, () => {
      const { container } = renderizarRota('/app/hoje', { estadoInicial: estado() })

      const cartoes = container.querySelectorAll('.cartao')
      expect(cartoes).toHaveLength(1)
      const nome = cartoes[0].getAttribute('data-campo')!
      expect(tokens[nome], nome).toBeDefined()
      expect(nome.startsWith('night-')).toBe(tema === 'madrugada')
    })

    it(`Sessão (${tema}): o cronômetro fica num campo de cor com token válido`, () => {
      const { container } = renderizarRota('/app/sessao', { estadoInicial: estado() })

      const campo = container.querySelector('[role="timer"]')!.closest('[data-campo]')!
      const nome = campo.getAttribute('data-campo')!
      expect(tokens[nome], nome).toBeDefined()
      expect(nome.startsWith('night-')).toBe(tema === 'madrugada')
    })
  }

  it('o cronômetro tem números tabulares e pelo menos 48 px', () => {
    const corpo = /\.cronometro\s*\{([^}]*)\}/.exec(estiloGlobal)![1]
    expect(corpo).toMatch(/font-variant-numeric:\s*tabular-nums/)
    const minimo = /clamp\(\s*([\d.]+)rem/.exec(corpo)![1]
    expect(parseFloat(minimo) * 16).toBeGreaterThanOrEqual(48)
  })

  it('o ícone da área logada vem sempre com rótulo de texto visível, escondido do leitor de tela', () => {
    for (const caminho of ['/app/hoje', '/app/sessao']) {
      const { container, unmount } = renderizarRota(caminho)
      const icones = [...container.querySelectorAll('svg.lucide')]
      expect(icones.length, caminho).toBeGreaterThan(0)
      for (const icone of icones) {
        expect(icone.getAttribute('aria-hidden')).toBe('true')
        const controle = icone.closest('button, a')
        expect(controle, 'ícone fora de botão ou link').not.toBeNull()
        const texto = [...controle!.children]
          .filter((filho) => filho !== icone && !filho.hasAttribute('aria-hidden'))
          .map((filho) => filho.textContent?.trim())
          .join('')
        expect(texto, controle!.outerHTML).not.toBe('')
      }
      unmount()
    }
  })

  it('nenhum título leva ícone', () => {
    for (const caminho of ['/app/hoje', '/app/sessao', '/']) {
      const { container, unmount } = renderizarRota(caminho)
      expect(container.querySelectorAll('h1 svg, h2 svg, h3 svg'), caminho).toHaveLength(0)
      unmount()
    }
  })
})

describe('MAT-44: SVG e movimento', () => {
  it('todo <svg> das 3 telas tem aria-hidden="true" ou nome acessível', async () => {
    const casos: Array<[string, EstadoPrototipo]> = [
      ['/', claro()],
      ['/app/hoje', claro()],
      ['/app/hoje', madrugada()],
      ['/app/sessao', claro()],
      ['/app/sessao', semSessao()],
    ]
    for (const [caminho, estado] of casos) {
      const { container, unmount } = renderizarRota(caminho, { estadoInicial: estado })
      await screen.findAllByRole('heading')
      const svgs = [...container.querySelectorAll('svg')]
      expect(svgs.length, caminho).toBeGreaterThan(0)
      for (const svg of svgs) {
        const decorativo = svg.getAttribute('aria-hidden') === 'true'
        const nomeado = svg.hasAttribute('aria-label') || svg.hasAttribute('aria-labelledby') || svg.querySelector('title') !== null
        expect(decorativo || nomeado, `${caminho}: ${svg.outerHTML.slice(0, 80)}`).toBe(true)
      }
      unmount()
    }
  })

  it('o movimento é só em CSS: motion e framer-motion não estão no package.json nem são importados', () => {
    const pacote = JSON.parse(readFileSync(pastaSrc + '../package.json', 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const instalados = Object.keys({ ...pacote.dependencies, ...pacote.devDependencies })
    expect(instalados).not.toContain('motion')
    expect(instalados).not.toContain('framer-motion')

    const importam = listarFontes(pastaSrc, true)
      .filter((f) => f.nome !== 'visual.test.tsx')
      .filter((f) => /from\s+['"](motion\/react|motion|framer-motion)['"]/.test(f.texto))
      .map((f) => f.nome)
    expect(importam).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Rodada 2, parte A: três regras de projeto que a rodada 1 quebrou.

const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1')

/** Todas as regras "seletor { corpo }" de um CSS, sem comentários (o aninhamento sai achatado). */
function regrasDe(css: string): Array<{ seletor: string; corpo: string }> {
  return [...semComentarios(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({
    seletor: seletor.trim().replace(/\s+/g, ' '),
    corpo,
  }))
}

/** Uma medida de translate em px (rem e em valem 16 px); null se a unidade não é de comprimento fixo. */
function emPx(medida: string): number | null {
  const achado = /^(-?\d*\.?\d+)(px|rem|em)?$/.exec(medida.trim())
  if (!achado) return null
  const numero = parseFloat(achado[1])
  if (achado[2] === 'rem' || achado[2] === 'em') return numero * 16
  return numero
}

describe('MAT-44 r2 A1: resposta a hover, active e foco sem escala, giro ou inclinação', () => {
  const arquivosCss = listarFontes(pastaSrc).filter((f) => f.nome.endsWith('.css'))
  const comEstado = arquivosCss.flatMap(({ nome, texto }) =>
    regrasDe(texto)
      .filter((r) => /:(active|hover|focus(?:-visible|-within)?)\b/.test(r.seletor))
      .map((r) => ({ nome, ...r })),
  )

  it('encontra as regras com :active, :hover e :focus*', () => {
    expect(comEstado.length).toBeGreaterThan(0)
    expect(comEstado.some((r) => r.seletor.includes(':active'))).toBe(true)
  })

  it('nenhuma delas usa scale(, rotate( ou skew(, nem as propriedades scale e rotate', () => {
    const achados = comEstado
      .filter(
        (r) =>
          /\b(scale|scale3d|scaleX|scaleY|scaleZ|rotate|rotate3d|rotateX|rotateY|rotateZ|skew|skewX|skewY)\(/.test(r.corpo) ||
          /(^|[;\s])(scale|rotate)\s*:/.test(r.corpo),
      )
      .map((r) => `${r.nome}: ${r.seletor}`)
    expect(achados).toEqual([])
  })

  it('o deslocamento (translate) nelas fica em até 16 px', () => {
    const excessos: string[] = []
    for (const { nome, seletor, corpo } of comEstado) {
      const medidas = [...corpo.matchAll(/translate(?:3d|[XYZ])?\(([^)]*)\)/g)].flatMap((m) => m[1].split(','))
      for (const [, valor] of corpo.matchAll(/(?:^|[;\s])translate\s*:\s*([^;]+)/g)) medidas.push(...valor.split(/\s+/))
      for (const medida of medidas) {
        const px = emPx(medida)
        if (px === null || Math.abs(px) > 16) excessos.push(`${nome}: ${seletor}: ${medida.trim()}`)
      }
    }
    expect(excessos).toEqual([])
  })

  it('nenhuma classe de utilitário em .tsx usa hover:, active: ou focus*: com scale, rotate ou skew', () => {
    const achados = listarFontes(pastaSrc)
      .filter((f) => f.nome.endsWith('.tsx'))
      .filter((f) => /(?:hover|active|focus[\w-]*|group-hover):-?(?:scale|rotate|skew)/.test(f.texto))
      .map((f) => f.nome)
    expect(achados).toEqual([])
  })

  it('o detector enxerga uma regra :active com scale', () => {
    const achada = regrasDe('.a:active:not(:disabled) { transform: scale(0.96); }').filter((r) => /:active/.test(r.seletor))
    expect(achada).toHaveLength(1)
    expect(/\bscale\(/.test(achada[0].corpo)).toBe(true)
  })
})

describe('MAT-44 r2 A2: ícones só na navegação inferior e nos botões rápidos', () => {
  const importam = listarFontes(pastaSrc).filter((f) => /from\s+['"]lucide-react[^'"]*['"]/.test(f.texto))

  it('só NavegacaoInferior.tsx e BotoesRapidos.tsx importam de lucide-react', () => {
    expect(importam.map((f) => f.nome).sort()).toEqual(['prototipo/BotoesRapidos.tsx', 'prototipo/NavegacaoInferior.tsx'])
  })

  it('cada import é de ícones nomeados, do pacote raiz', () => {
    for (const { nome, texto } of importam) {
      const importacoes = [
        ...texto.matchAll(
          /import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*\{[^}]*\})?\s+from\s+['"]lucide-react[^'"]*['"]/g,
        ),
      ].map((m) => m[0])
      expect(importacoes.length, nome).toBeGreaterThan(0)
      for (const importacao of importacoes) {
        expect(importacao, nome).toMatch(/^import\s+(?:type\s+)?\{[^}]+\}\s+from\s+'lucide-react'$/)
      }
    }
  })

  it('a Sessão não tem ícone, nem no estado vazio', async () => {
    for (const estado of [claro(), semSessao()]) {
      const { container, unmount } = renderizarRota('/app/sessao', { estadoInicial: estado })
      await screen.findByRole('heading', { level: 1 })
      const dentroDoMain = [...container.querySelectorAll('main svg.lucide')]
      expect(dentroDoMain).toHaveLength(0)
      unmount()
    }
  })
})

// ---------------------------------------------------------------------------
// Rodada 2, parte B: composição.

describe('MAT-44 r2 B1: vitrine de aparelhos do Início', () => {
  async function aparelhosDoTopo() {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const palco = container.querySelector<HTMLElement>('.vitrine-palco')!
    const celulares = [...palco.querySelectorAll<HTMLElement>('[data-aparelho="celular"]')]
    return { container, palco, notebook: palco.querySelector<HTMLElement>('[data-aparelho="notebook"]')!, celulares }
  }

  it('o notebook mostra um Hoje de computador, com o cartão, a nota e a lista Últimos', async () => {
    const { notebook } = await aparelhosDoTopo()

    expect(notebook.querySelector('.campo-andamento')).not.toBeNull()
    expect(notebook.textContent).toContain('Para você saber')
    expect(notebook.textContent).toContain('Pomada só à noite.')
    expect(notebook.textContent).toContain('Últimos')
    expect(notebook.textContent).toContain('Tummy time')
    expect(notebook.querySelector('[role="timer"]')).toBeNull()
  })

  it('há dois celulares e cada um mostra uma tela distinta: um o Hoje, outro a Sessão', async () => {
    const { celulares, notebook } = await aparelhosDoTopo()

    expect(celulares).toHaveLength(2)
    const doHoje = celulares.filter((c) => c.querySelector('.campo-andamento') !== null)
    const daSessao = celulares.filter((c) => c.querySelector('[role="timer"]') !== null)
    expect(doHoje).toHaveLength(1)
    expect(daSessao).toHaveLength(1)
    expect(doHoje[0]).not.toBe(daSessao[0])
    // O celular do Hoje não repete a nota nem a lista do notebook; o da Sessão não tem o cartão.
    expect(doHoje[0].textContent).not.toContain('Para você saber')
    expect(daSessao[0].querySelector('.campo-andamento')).toBeNull()
    // A tela do notebook é diferente das dos celulares: é a única com a lista Últimos.
    expect(celulares.every((c) => !c.textContent!.includes('Últimos'))).toBe(true)
    expect(notebook.querySelector('ul')).not.toBeNull()
  })

  it('em página estreita ficam só o notebook e um celular: o da Sessão só aparece a partir de 46 rem', async () => {
    const { celulares } = await aparelhosDoTopo()

    const daSessao = celulares.find((c) => c.querySelector('[role="timer"]'))!
    expect(daSessao.classList.contains('hidden')).toBe(true)
    expect(daSessao.classList.contains('@min-[46rem]/pagina:block')).toBe(true)
    const doHoje = celulares.find((c) => c.querySelector('.campo-andamento'))!
    expect(doHoje.classList.contains('hidden')).toBe(false)
  })

  it('o notebook tem margens laterais largas, que é onde os celulares se sobrepõem', () => {
    const corpo = regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-notebook .aparelho-tela')!.corpo
    const [, vertical, lateral] = /padding:\s*([\d.]+)rem\s+([\d.]+)rem/.exec(corpo)!
    expect(parseFloat(vertical)).toBeLessThan(parseFloat(lateral))
    expect(parseFloat(lateral)).toBeGreaterThanOrEqual(6)
  })

  it('o palco encolhe por degraus que cabem na largura: nenhum degrau passa de largura natural × escala > largura da página', () => {
    const css = semComentarios(estiloGlobal)
    // Degraus de baixo de 46 rem: palco de 58 rem. Daí para cima: palco de 72 rem.
    const degraus = [...css.matchAll(/@container pagina \(min-width:\s*([\d.]+)rem\)\s*\{\s*\.vitrine\s*\{\s*--escala:\s*([\d.]+);/g)].map(
      (m) => [parseFloat(m[1]), parseFloat(m[2])] as const,
    )
    expect(degraus.length).toBeGreaterThanOrEqual(5)
    for (const [largura, escala] of degraus) {
      const palco = largura >= 46 ? 72 : 58
      expect(palco * escala, `degrau de ${largura} rem`).toBeLessThanOrEqual(largura + 0.5)
    }
    expect(css).toMatch(/\.vitrine\s*\{\s*--escala:\s*0\.38;/)
    expect(58 * 0.38).toBeLessThanOrEqual(22.4)
  })

  it('o campo da vitrine não tem sombra: a profundidade vem da sobreposição e da escala', () => {
    expect(estiloGlobal).not.toMatch(/box-shadow/)
  })
})

describe('MAT-44 r2 B2: cena de ilustrações do campo de barro', () => {
  it('as três ilustrações ficam na mesma linha, com a mesma largura e sobrepostas', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const campo = container.querySelector('main > section[data-campo="field-1"]')!
    const figuras = [...campo.querySelectorAll<SVGElement>('[data-ilustracao]')]
    expect(figuras.map((f) => f.getAttribute('data-ilustracao'))).toEqual(['colo', 'tapete', 'passeio'])
    expect(new Set(figuras.map((f) => f.parentElement)).size).toBe(1)
    const larguras = figuras.map((f) => /(?:^|\s)(w-\[[\d.]+%\])/.exec(f.getAttribute('class')!)?.[1])
    expect(new Set(larguras).size).toBe(1)
    expect(larguras[0]).toBeDefined()
    expect(figuras.slice(1).every((f) => /(?:^|\s)-ml-\[\d+%\]/.test(f.getAttribute('class')!))).toBe(true)
  })

  it('o campo não tem altura mínima solta: a altura vem das ilustrações', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const campo = container.querySelector('main > section[data-campo="field-1"]')!
    expect(campo.className).not.toMatch(/min-h-/)
  })

  it('o chão de cada ilustração vai de borda a borda do desenho, para formar uma linha só', () => {
    for (const nome of ['Colo', 'Tapete', 'Passeio', 'Mamada', 'Berco']) {
      const texto = lerTexto(`prototipo/Ilustracao${nome}.tsx`)
      expect(texto, nome).toContain('<path d="M0 220H240" />')
    }
  })
})

describe('MAT-44 r2 B3 e B4: Sessão', () => {
  it('as informações da sessão ficam dentro do campo do cronômetro, em linhas com régua', () => {
    const { container } = renderizarRota('/app/sessao', {
      estadoInicial: { ...criarEstadoInicial(Date.now()), sessao: { tipo: 'tummy', inicio: Date.now() - 60_000, pessoa: 'Ana' } },
    })

    const campo = container.querySelector('[role="timer"]')!.closest('[data-campo]')!
    const linhas = [...campo.querySelectorAll('p.border-t')]
    expect(linhas.map((l) => l.textContent)).toEqual([
      expect.stringMatching(/^Iniciado às \d{2}:\d{2} por Ana$/),
      'Atividade sugerida: Espelho no chão',
    ])
    expect(linhas.every((l) => l.classList.contains('border-current'))).toBe(true)
  })

  it('as ações ficam no pé da tela, depois do campo, que tem a altura do próprio conteúdo', () => {
    const { container } = renderizarRota('/app/sessao')

    const campo = container.querySelector('[role="timer"]')!.closest('[data-campo]')!
    expect(campo.classList.contains('flex-1')).toBe(false)
    const acoes = screen.getByRole('button', { name: 'Encerrar' })
    expect(campo.closest('main')!.contains(acoes)).toBe(true)
    expect(campo.compareDocumentPosition(acoes) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(acoes.closest('.mt-auto')).not.toBeNull()
  })

  it('o estado vazio tem a ilustração do berço, própria dele, dentro de um campo de cor', () => {
    const { container } = renderizarRota('/app/sessao', { estadoInicial: semSessao() })

    const berco = container.querySelector('[data-ilustracao="berco"]')!
    expect(berco).not.toBeNull()
    expect(berco.getAttribute('aria-hidden')).toBe('true')
    const campo = berco.closest('[data-campo]')!
    expect(tokens[campo.getAttribute('data-campo')!]).toBeDefined()
    expect(container.querySelector('[data-ilustracao="colo"]')).toBeNull()
  })

  it('"Voltar para Hoje" é um botão secundário do sistema, com o mesmo destino e o mesmo nome', () => {
    renderizarRota('/app/sessao', { estadoInicial: semSessao() })

    const voltar = screen.getByRole('link', { name: 'Voltar para Hoje' })
    expect(voltar.getAttribute('href')).toBe('/app/hoje')
    expect(voltar.classList.contains('botao')).toBe(true)
    expect(voltar.classList.contains('botao-secundario')).toBe(true)
    expect(voltar.closest('p')).toBeNull()
  })
})

describe('MAT-44 r2 B5: campo da madrugada no Início', () => {
  async function madrugadaDoInicio() {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    return container.querySelector<HTMLElement>('#secao-madrugada')!
  }

  it('a legenda vem logo depois do celular, os dois filhos do mesmo campo', async () => {
    const secao = await madrugadaDoInicio()

    const celular = secao.querySelector<HTMLElement>('.madrugada-celular')!
    expect(celular.querySelector('[data-aparelho="celular"]')).not.toBeNull()
    const legenda = celular.nextElementSibling as HTMLElement
    expect(legenda.textContent).toMatch(/^No celular,/)
    expect(legenda.classList.contains('madrugada-legenda')).toBe(true)
    expect(legenda.parentElement).toBe(secao)
    expect(celular.parentElement).toBe(secao)
  })

  it('o celular tem escala de pelo menos 0,75 (o texto da miniatura fica com 12 px ou mais)', async () => {
    const secao = await madrugadaDoInicio()

    const celular = secao.querySelector('[data-aparelho="celular"]')!
    const escalas = [...celular.className.matchAll(/scale-\[([\d.]+)\]/g)].map((m) => parseFloat(m[1]))
    expect(escalas.length).toBeGreaterThanOrEqual(2)
    for (const escala of escalas) expect(escala * 16).toBeGreaterThanOrEqual(12)
    expect(Math.max(...escalas)).toBeGreaterThanOrEqual(0.85)
  })

  it('a miniatura da madrugada traz o cronômetro e as ações da sessão, em botões grandes', async () => {
    const secao = await madrugadaDoInicio()

    expect(secao.querySelector('[role="timer"]')).not.toBeNull()
    const grandes = [...secao.querySelectorAll('[data-aparelho] button.botao-grande')]
    expect(grandes.map((b) => b.textContent)).toEqual(['Encerrar'])
    expect(secao.querySelector('[data-aparelho]')!.textContent).toContain('Encerrar e anotar')
  })
})

// ---------------------------------------------------------------------------
// Rodada 3: acabamento.

describe('MAT-44 r3 #1: Hoje com mais peso editorial', () => {
  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`(${tema}) "Para você saber" é um campo de lavanda e o data-campo acompanha o tema`, () => {
      renderizarRota('/app/hoje', { estadoInicial: estado() })

      const secao = screen.getByRole('heading', { name: 'Para você saber' }).closest('section')!
      const nome = secao.getAttribute('data-campo')!
      expect(nome).toBe(tema === 'madrugada' ? 'night-field-2' : 'field-2')
      expect(tokens[nome]).toBeDefined()
      expect(secao.querySelector('.cartao')).toBeNull()
      expect(secao.textContent).toContain('Pomada só à noite.')
      expect(secao.textContent).toContain('Carla, 22:40')
    })
  }

  it('a frase da nota é um itálico maior que o corpo da rodada anterior (mais de 1,5 rem)', () => {
    renderizarRota('/app/hoje')

    const secao = screen.getByRole('heading', { name: 'Para você saber' }).closest('section')!
    const frase = secao.querySelector('.nota-italico')!
    const tamanho = /text-\[([\d.]+)rem\]/.exec(frase.className)
    expect(tamanho, frase.className).not.toBeNull()
    expect(parseFloat(tamanho![1])).toBeGreaterThan(1.5)
  })

  it('"Últimos" fica em papel, com as horas tabulares à direita e respiro maior entre as linhas', () => {
    renderizarRota('/app/hoje')

    const secao = screen.getByRole('heading', { name: 'Últimos' }).closest('section')!
    expect(secao.hasAttribute('data-campo')).toBe(false)
    for (const item of secao.querySelectorAll('li')) {
      expect(item.className).toMatch(/\bpy-4\b/)
      const hora = item.lastElementChild!
      expect(hora.className).toContain('tabular')
      expect(hora.className).toContain('text-right')
    }
  })

  it('a ordem de leitura é a mesma: cartão, nota, últimos; e há um só cartão', () => {
    const { container } = renderizarRota('/app/hoje')

    const cartao = container.querySelector('.cartao')!
    const nota = screen.getByRole('heading', { name: 'Para você saber' })
    const ultimos = screen.getByRole('heading', { name: 'Últimos' })
    expect(container.querySelectorAll('.cartao')).toHaveLength(1)
    expect(cartao.compareDocumentPosition(nota) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(nota.compareDocumentPosition(ultimos) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })
})

describe('MAT-44 r3 #2: botões rápidos com o mesmo tratamento em toda largura e tema', () => {
  const casos: Array<[string, string, () => EstadoPrototipo]> = [
    ['Hoje (claro)', '/app/hoje', claro],
    ['Hoje (madrugada)', '/app/hoje', madrugada],
    ['Início (miniaturas)', '/', claro],
  ]

  for (const [nome, caminho, estado] of casos) {
    it(`${nome}: Sono, Mamada, Fralda e Tummy time têm exatamente um ícone antes do texto, e o ícone não encolhe`, async () => {
      const { container } = renderizarRota(caminho, { estadoInicial: estado() })
      await screen.findAllByRole('heading')

      const sono = container.querySelector('button[aria-label="Iniciar sono de Lia"]')!
      const botoes = [...sono.parentElement!.children] as HTMLElement[]
      expect(botoes.map((b) => b.textContent)).toEqual(['Sono', 'Mamada', 'Fralda', 'Tummy time', '+ Mais'])
      for (const botao of botoes.slice(0, 4)) {
        const icones = botao.querySelectorAll('svg')
        expect(icones, botao.textContent!).toHaveLength(1)
        expect(icones[0].getAttribute('aria-hidden')).toBe('true')
        expect(botao.firstElementChild, botao.textContent!).toBe(icones[0])
        expect(icones[0].getAttribute('class')).toContain('shrink-0')
      }
    })

    it(`${nome}: o "+ Mais" leva o próprio sinal, escondido do leitor de tela, antes do texto`, async () => {
      const { container } = renderizarRota(caminho, { estadoInicial: estado() })
      await screen.findAllByRole('heading')

      const mais = container.querySelector('button[aria-label="Mais registros"]')!
      expect(mais.querySelectorAll('svg')).toHaveLength(0)
      const sinal = mais.querySelector('[aria-hidden="true"]')!
      expect(sinal.textContent).toBe('+')
      expect(mais.textContent).toBe('+ Mais')
    })
  }

  it('o rótulo do botão rápido cabe numa linha em 1440: fonte de 15 px no máximo e sem quebra', () => {
    const corpo = regrasDe(estiloGlobal).find((r) => r.seletor === '.acao-rapida')!.corpo
    const tamanho = /font-size:\s*([\d.]+)rem/.exec(corpo)
    expect(tamanho).not.toBeNull()
    expect(parseFloat(tamanho![1]) * 16).toBeLessThanOrEqual(15)
    expect(lerTexto('prototipo/BotoesRapidos.tsx')).toContain('whitespace-nowrap')
  })
})

describe('MAT-44 r3 #3: aparelhos sem tela vazia', () => {
  it('o celular tem a proporção de 9 por 14, que acompanha o conteúdo', () => {
    const corpo = regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-celular')!.corpo
    expect(corpo).toMatch(/aspect-ratio:\s*9\s*\/\s*14\s*;/)
  })

  it('cada celular termina em botões desativados e fora da ordem de Tab (ações da sessão ou registro rápido)', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const celulares = [...container.querySelectorAll<HTMLElement>('[data-aparelho="celular"]')]
    expect(celulares).toHaveLength(3)
    for (const celular of celulares) {
      const botoes = [...celular.querySelectorAll<HTMLButtonElement>('button')]
      expect(botoes.length).toBeGreaterThanOrEqual(3)
      const ultimo = botoes[botoes.length - 1]
      expect(ultimo.disabled).toBe(true)
      expect(ultimo.tabIndex).toBe(-1)
      // O último controle é do pé da tela: não sobra tela vazia embaixo dele no DOM.
      expect(ultimo.closest('.aparelho-tela')!.firstElementChild!.lastElementChild!.contains(ultimo)).toBe(true)
    }
  })

  it('os celulares da Sessão mostram as ações da sessão em miniatura: Encerrar, Encerrar e anotar e Descartar', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const daSessao = [...container.querySelectorAll<HTMLElement>('[data-aparelho="celular"]')].filter(
      (c) => c.querySelector('[role="timer"]') !== null,
    )
    expect(daSessao).toHaveLength(2)
    for (const celular of daSessao) {
      const nomes = [...celular.querySelectorAll('button')].map((b) => b.textContent)
      expect(nomes).toEqual(['Encerrar', 'Encerrar e anotar', 'Descartar'])
      for (const botao of celular.querySelectorAll<HTMLButtonElement>('button')) {
        expect(botao.disabled).toBe(true)
        expect(botao.tabIndex).toBe(-1)
      }
    }
  })

  it('continuam inertes e sem ids', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    for (const aparelho of container.querySelectorAll('[data-aparelho]')) {
      expect(aparelho.hasAttribute('inert')).toBe(true)
      expect(aparelho.getAttribute('aria-hidden')).toBe('true')
      expect(aparelho.querySelector('[id]')).toBeNull()
    }
  })
})

describe('MAT-44 r3 #4: campo do cronômetro apertado', () => {
  function campoDaSessao() {
    const { container } = renderizarRota('/app/sessao')
    return container.querySelector('[role="timer"]')!.closest('[data-campo]') as HTMLElement
  }

  it('o rótulo vem logo acima do número, e a régua e as linhas de informação logo abaixo', () => {
    const campo = campoDaSessao()

    const [rotulo, numero, linhas] = [...campo.children] as HTMLElement[]
    expect(rotulo.textContent).toBe('Duração da sessão')
    expect(numero.getAttribute('role')).toBe('timer')
    expect(linhas.querySelectorAll('p.border-t').length).toBeGreaterThanOrEqual(1)
    expect(campo.children).toHaveLength(3)
  })

  it('o número não flutua: sem margem automática e com margem curta do rótulo', () => {
    const numero = campoDaSessao().querySelector('[role="timer"]')!

    expect(numero.className).not.toMatch(/\bm[ty]-auto\b/)
    expect(numero.className).toMatch(/\bmt-2\b/)
  })

  it('a altura do campo vem do conteúdo: não estica (sem flex-1) e tem respiro generoso', () => {
    const campo = campoDaSessao()

    expect(campo.classList.contains('flex-1')).toBe(false)
    expect(campo.className).toMatch(/\bpy-8\b/)
    expect(campo.parentElement!.classList.contains('flex-1')).toBe(false)
    expect(campo.parentElement!.parentElement!.classList.contains('flex-1')).toBe(false)
  })

  it('as ações continuam embaixo, empurradas ao pé da tela', () => {
    const { container } = renderizarRota('/app/sessao')

    const acoes = screen.getByRole('button', { name: 'Encerrar' }).closest('.mt-auto')
    expect(acoes).not.toBeNull()
    expect(container.querySelector('main')!.contains(acoes)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Rodada 4.

describe('MAT-44 r4 #1: a Sessão ocupa o vazio com uma ilustração do tipo da sessão', () => {
  const sessaoDe = (tipo: 'sono' | 'mamada' | 'tummy'): EstadoPrototipo => ({
    ...criarEstadoInicial(Date.now()),
    sessao: { tipo, inicio: Date.now() - 60_000, pessoa: 'Ana' },
  })

  for (const [tipo, ilustracao] of [
    ['sono', 'berco'],
    ['tummy', 'tapete'],
    ['mamada', 'mamada'],
  ] as const) {
    for (const [tema, madrugadaLigada] of [
      ['claro', false],
      ['madrugada', true],
    ] as const) {
      it(`${tipo} (${tema}): a ilustração é "${ilustracao}", decorativa e do tema`, () => {
        const estado = { ...sessaoDe(tipo), madrugada: madrugadaLigada }
        const { container } = renderizarRota('/app/sessao', { estadoInicial: estado })

        const figuras = container.querySelectorAll('main [data-ilustracao]')
        expect(figuras).toHaveLength(1)
        expect(figuras[0].getAttribute('data-ilustracao')).toBe(ilustracao)
        expect(figuras[0].getAttribute('aria-hidden')).toBe('true')
      })
    }
  }

  it('fica entre o campo e as ações, numa área que cresce sem empurrar as ações', () => {
    const { container } = renderizarRota('/app/sessao')

    const campo = container.querySelector('[role="timer"]')!.closest('[data-campo]')!
    const figura = container.querySelector('main [data-ilustracao]')!
    const acoes = screen.getByRole('button', { name: 'Encerrar' }).closest('.mt-auto')!
    expect(campo.compareDocumentPosition(figura) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(figura.compareDocumentPosition(acoes) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)

    // A área é flex-1 com min-h-0: com pouca altura ela vai a zero antes de empurrar as ações.
    const area = figura.parentElement!
    expect(area.classList.contains('flex-1')).toBe(true)
    expect(area.classList.contains('min-h-0')).toBe(true)
    expect(area.classList.contains('relative')).toBe(true)
    // A figura se ajusta à altura da área e tem um teto de tamanho médio.
    const cl = figura.getAttribute('class')!
    expect(cl).toMatch(/\bh-full\b/)
    expect(cl).toMatch(/\bmax-h-\[16rem\]/)
    expect(cl).toMatch(/\bmax-w-\[16rem\]/)
  })

  it('nenhuma ilustração nova: o total de distintas continua em 5', async () => {
    const nomes = new Set<string>()
    for (const [caminho, estado] of [
      ['/', claro()],
      ['/app/hoje', claro()],
      ['/app/sessao', sessaoDe('sono')],
      ['/app/sessao', sessaoDe('tummy')],
      ['/app/sessao', sessaoDe('mamada')],
      ['/app/sessao', semSessao()],
    ] as const) {
      const { container, unmount } = renderizarRota(caminho, { estadoInicial: estado })
      await screen.findAllByRole('heading')
      for (const f of container.querySelectorAll('[data-ilustracao]')) nomes.add(f.getAttribute('data-ilustracao')!)
      unmount()
    }
    expect([...nomes].sort()).toEqual(['berco', 'colo', 'mamada', 'passeio', 'tapete'])
  })
})

describe('MAT-44 r4 #2: campo da madrugada recomposto', () => {
  async function secaoMadrugada() {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    return container.querySelector<HTMLElement>('#secao-madrugada')!
  }

  it('em coluna única a ordem é título e texto, ilustração, celular e legenda', async () => {
    const secao = await secaoMadrugada()

    const filhos = [...secao.children] as HTMLElement[]
    expect(filhos).toHaveLength(4)
    expect(filhos[0].querySelector('#titulo-madrugada')).not.toBeNull()
    expect(filhos[0].textContent).toContain('O modo madrugada escurece a tela')
    expect(filhos[1].getAttribute('data-ilustracao')).toBe('mamada')
    expect(filhos[2].classList.contains('madrugada-celular')).toBe(true)
    expect(filhos[3].classList.contains('madrugada-legenda')).toBe(true)
  })

  it('cada filho tem a sua área da grade, e a grade larga põe o texto no alto e a ilustração na base do celular', () => {
    const css = semComentarios(estiloGlobal)

    expect(css).toMatch(/grid-template-areas:\s*"texto celular"\s*"ilustracao celular"\s*"\. legenda"/)
    expect(css).toMatch(/grid-template-rows:\s*auto 1fr auto/)
    for (const [classe, area] of [
      ['madrugada-texto', 'texto'],
      ['madrugada-ilustracao', 'ilustracao'],
      ['madrugada-celular', 'celular'],
      ['madrugada-legenda', 'legenda'],
    ]) {
      expect(css, classe).toMatch(new RegExp(`\\.${classe}\\s*\\{[^}]*grid-area:\\s*${area}\\s*;`))
    }
    const ilustracao = regrasDe(estiloGlobal).filter((r) => r.seletor === '.madrugada-ilustracao').map((r) => r.corpo).join('')
    expect(ilustracao).toMatch(/align-self:\s*end/)
  })

  it('a legenda tem a largura do celular e não alarga a coluna', () => {
    const regras = regrasDe(estiloGlobal).filter((r) => r.seletor === '.madrugada-legenda').map((r) => r.corpo).join('')

    expect(regras).toMatch(/width:\s*0\s*;/)
    expect(regras).toMatch(/min-width:\s*100%/)
  })

  it('o título e o texto, a ilustração, o celular e a legenda são do mesmo campo', async () => {
    const secao = await secaoMadrugada()

    expect(secao.classList.contains('madrugada-grade')).toBe(true)
    expect(secao.querySelector('.madrugada-texto')).not.toBeNull()
    expect(secao.querySelector('.madrugada-ilustracao')).not.toBeNull()
  })
})

describe('MAT-44 r2 A3: texto de interface do Início mora em textos.ts', () => {
  const paginas = listarFontes(pastaSrc).filter((f) => f.nome.startsWith('paginas/') && f.nome.endsWith('.tsx'))

  /** Frases de interface soltas em literais: string com espaço e mais de 12 caracteres, fora de atributos técnicos. */
  function frasesSoltas(texto: string): string[] {
    const limpo = semComentarios(texto)
    const achadas: string[] = []
    // Percorre os literais da esquerda para a direita, para que as aspas casem em pares.
    for (const m of limpo.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
      if (m[2].length < 13 || !m[2].includes(' ')) continue
      const antes = limpo.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0)
      if (/(className|aria-[\w-]+|href|to|id|key|role|data-[\w-]+)\s*=\s*\{?\s*$/.test(antes)) continue
      achadas.push(m[2])
    }
    return achadas
  }

  it('encontra as páginas', () => {
    expect(paginas.map((p) => p.nome).sort()).toEqual([
      'paginas/Hoje.tsx',
      'paginas/Inicio.tsx',
      'paginas/NaoEncontrada.tsx',
      'paginas/Sessao.tsx',
    ])
  })

  it('nenhum arquivo de paginas/ declara frase de interface em literal', () => {
    const achados = paginas.flatMap((p) => frasesSoltas(p.texto).map((frase) => `${p.nome}: ${frase}`))
    expect(achados).toEqual([])
  })

  it('o detector enxerga uma constante de texto', () => {
    expect(frasesSoltas(`const LEGENDA = 'No celular, a mesma sessão de tummy time'`)).toHaveLength(1)
    expect(frasesSoltas(`<div className="flex flex-wrap gap-2" aria-label="Seções da página" />`)).toEqual([])
  })

  it('o Início importa os rótulos do cabeçalho e a legenda da madrugada de textos.ts e os renderiza', async () => {
    const textos = (await import('./conteudo/textos.ts')) as Record<string, unknown>
    const navegacao = textos.NAVEGACAO as ReadonlyArray<{ rotulo: string; alvo: string }>
    const legenda = textos.LEGENDA_MADRUGADA as string
    expect(Array.isArray(navegacao)).toBe(true)
    expect(typeof legenda).toBe('string')

    const inicio = paginas.find((p) => p.nome === 'paginas/Inicio.tsx')!.texto
    expect(inicio).toMatch(/NAVEGACAO[\s\S]*from '\.\.\/conteudo\/textos\.ts'/)
    expect(inicio).toMatch(/LEGENDA_MADRUGADA[\s\S]*from '\.\.\/conteudo\/textos\.ts'/)

    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    expect([...container.querySelectorAll('header a')].map((a) => a.textContent)).toEqual(navegacao.map((n) => n.rotulo))
    expect([...container.querySelectorAll('header a')].map((a) => a.getAttribute('href'))).toEqual(
      navegacao.map((n) => `#${n.alvo}`),
    )
    expect(screen.getByText(legenda)).toBeTruthy()
  })

  it('os textos movidos são exatamente os aprovados', async () => {
    const textos = (await import('./conteudo/textos.ts')) as Record<string, unknown>
    expect((textos.NAVEGACAO as ReadonlyArray<{ rotulo: string }>).map((n) => n.rotulo)).toEqual([
      'As telas',
      'Para que serve',
      'Madrugada',
    ])
    expect(textos.LEGENDA_MADRUGADA).toBe(
      'No celular, a mesma sessão de tummy time no modo madrugada: tela escura, cronômetro grande e botões maiores.',
    )
  })
})
