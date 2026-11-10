import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
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
    expect(grupo.querySelector('button[aria-label="Iniciar sono de Heloísa"]')).not.toBeNull()
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

  it('o cabeçalho é o do site (Layout, 64 px, medido em G2) e os links-âncora da página têm alvo de 44 px', async () => {
    const container = await inicio()

    expect(container.querySelectorAll('header')).toHaveLength(1)
    const cabecalho = container.querySelector('header')!
    expect(cabecalho.hasAttribute('data-cabecalho')).toBe(true)
    expect(cabecalho.classList.contains('sb-cabecalho')).toBe(true)
    const links = [...container.querySelectorAll('nav[aria-label="Seções da página"] a')]
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

describe('MAT-44: âncoras do Início (nav "Seções da página", que antes ficava no <header> da página)', () => {
  it('cada link começa com #, aponta para um id existente e é único', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const hrefs = [...container.querySelectorAll('nav[aria-label="Seções da página"] a')].map((a) => a.getAttribute('href')!)
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

    expect([...container.querySelectorAll('nav[aria-label="Seções da página"] a')].map((a) => a.textContent)).toEqual([
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
    // O Hoje do 44d-2 não tem cartão nem data-campo: o único bloco de cor é o Em andamento, e o tema vem
    // das variáveis de uso (--cor-campo-sessao: urucum de dia, o bloco escuro na madrugada).
    it(`Hoje (${tema}): o único bloco de cor é o Em andamento, sem cartão e sem data-campo`, () => {
      const { container } = renderizarRota('/app/hoje', { estadoInicial: estado() })

      expect(container.querySelectorAll('.cartao')).toHaveLength(0)
      expect(container.querySelectorAll('[data-campo]')).toHaveLength(0)
      expect(container.querySelectorAll('[data-andamento]')).toHaveLength(1)
      expect(document.documentElement.hasAttribute('data-tema')).toBe(tema === 'madrugada')
    })

    // MAT-44d-2: o bloco do cronômetro é o bloco de cor da Sessão e o tema vem das variáveis de uso.
    it(`Sessão (${tema}): o cronômetro (data-cronometro) fica no bloco de cor (data-andamento), sem data-campo`, () => {
      const { container } = renderizarRota('/app/sessao', { estadoInicial: estado() })

      expect(container.querySelector('[role="timer"]')!.closest('[data-andamento]')).not.toBeNull()
      expect(container.querySelector('[role="timer"]')!.hasAttribute('data-cronometro')).toBe(true)
      expect(container.querySelectorAll('[data-campo]')).toHaveLength(0)
      expect(document.documentElement.hasAttribute('data-tema')).toBe(tema === 'madrugada')
    })
  }

  it('o cronômetro tem números tabulares e pelo menos 48 px', () => {
    const corpo = /\.cronometro\s*\{([^}]*)\}/.exec(estiloGlobal)![1]
    expect(corpo).toMatch(/font-variant-numeric:\s*tabular-nums/)
    const minimo = /clamp\(\s*([\d.]+)rem/.exec(corpo)![1]
    expect(parseFloat(minimo) * 16).toBeGreaterThanOrEqual(48)
  })

  it('o Hoje não tem ícone: a barra Registrar é só de texto', () => {
    const { container } = renderizarRota('/app/hoje')

    expect(container.querySelectorAll('svg')).toHaveLength(0)
  })

  // MAT-44d-2: sem navegação inferior, a Sessão também ficou sem ícone lucide (o ícone da área logada só
  // existia na navegação inferior e nos botões rápidos). A regra "ícone sempre com rótulo de texto
  // visível" continua valendo onde houver ícone (o `BotoesRapidos` do Início, conferido em r3/r5).
  it('a Sessão, com e sem sessão, não tem nenhum ícone lucide', () => {
    for (const estado of [claro(), semSessao()]) {
      const { container, unmount } = renderizarRota('/app/sessao', { estadoInicial: estado })

      expect(container.querySelectorAll('svg.lucide'), 'ícone lucide na Sessão').toHaveLength(0)
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
      // O Hoje do 44d-2 não tem ícone nem ilustração: nada a conferir nele.
      if (caminho !== '/app/hoje') expect(svgs.length, caminho).toBeGreaterThan(0)
      for (const svg of svgs) {
        const decorativo = svg.getAttribute('aria-hidden') === 'true'
        const nomeado = svg.hasAttribute('aria-label') || svg.hasAttribute('aria-labelledby') || svg.querySelector('title') !== null
        expect(decorativo || nomeado, `${caminho}: ${svg.outerHTML.slice(0, 80)}`).toBe(true)
      }
      unmount()
    }
  })

  it('motion entra com versão exata da major 12, framer-motion não é dependência direta, e só os arquivos da VIS4-20 importam motion/react', () => {
    const pacote = JSON.parse(readFileSync(pastaSrc + '../package.json', 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    expect(pacote.dependencies?.motion).toMatch(/^12\.\d+\.\d+$/)
    expect(pacote.dependencies).not.toHaveProperty('framer-motion')
    expect(pacote.devDependencies).not.toHaveProperty('framer-motion')

    const arquivos = listarFontes(pastaSrc, true).filter((f) => f.nome !== 'visual.test.tsx')
    const importaDe = (f: { texto: string }, pacotes: string) =>
      new RegExp(`from\\s+['"](${pacotes})['"]`).test(f.texto)

    const importamOsPacotesAntigos = arquivos.filter((f) => importaDe(f, 'motion|framer-motion')).map((f) => f.nome)
    expect(importamOsPacotesAntigos).toEqual([])

    const importamMotionReact = arquivos.filter((f) => importaDe(f, 'motion/react')).map((f) => f.nome)
    expect(importamMotionReact.length).toBeGreaterThan(0)
    for (const nome of importamMotionReact) {
      expect(
        /^(movimento\/|componentes\/terceiros\/|componentes\/vitrine\/)/.test(nome) || nome === 'paginas/Inicio.tsx',
        nome,
      ).toBe(true)
    }
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

  it('só BotoesRapidos.tsx importa de lucide-react (a navegação inferior saiu com o 44d-2)', () => {
    expect(importam.map((f) => f.nome).sort()).toEqual(['prototipo/BotoesRapidos.tsx'])
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

  // R3 (rodada 5): antes o celular da Sessão sumia em página estreita; agora os dois celulares e o
  // notebook ficam em toda largura, cada um com posição e escala próprias na faixa estreita.
  it('em página estreita os dois celulares continuam: cada um tem posição e escala sem variante', async () => {
    const { celulares } = await aparelhosDoTopo()

    expect(celulares).toHaveLength(2)
    for (const celular of celulares) {
      const classe = celular.getAttribute('class')!
      expect(classe).not.toMatch(/(?:^|\s)hidden(?:\s|$)/)
      expect(classe).toMatch(/(?:^|\s)left-\[[\d.]+rem\]/)
      expect(classe).toMatch(/(?:^|\s)top-\[[\d.]+rem\]/)
      expect(classe).toMatch(/(?:^|\s)scale-\[[\d.]+\]/)
    }
  })

  it('o notebook tem margens laterais largas, que é onde os celulares se sobrepõem', () => {
    const corpo = regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-notebook .aparelho-tela')!.corpo
    const [, vertical, lateral] = /padding:\s*([\d.]+)rem\s+([\d.]+)rem/.exec(corpo)!
    expect(parseFloat(vertical)).toBeLessThan(parseFloat(lateral))
    expect(parseFloat(lateral)).toBeGreaterThanOrEqual(6)
  })

  // R1 (rodada 5): o palco passou a ter o tamanho natural em variáveis do .vitrine, trocadas em
  // 46 rem; o ajuste de cada degrau à largura é conferido no bloco "r5 R1".
  it('o palco encolhe por degraus: o valor sem condição já cabe na menor largura, e cada degrau só muda variáveis', () => {
    const regras = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.vitrine')
    const base = regras.find((r) => r.condicao === null && '--escala' in r.props)!
    expect(parseFloat(base.props['--escala']) * parseFloat(base.props['--palco-largura'])).toBeLessThanOrEqual(6)
    const degraus = regras.filter((r) => r.condicao !== null)
    expect(degraus.length).toBeGreaterThanOrEqual(15)
    for (const degrau of degraus) {
      expect(Object.keys(degrau.props).every((p) => p.startsWith('--')), degrau.condicao!).toBe(true)
    }
    expect(vitrineEm(22.4).escala * vitrineEm(22.4).largura).toBeLessThanOrEqual(22.4)
  })

  it('o campo da vitrine não tem sombra: a profundidade vem da sobreposição e da escala', () => {
    expect(estiloGlobal).not.toMatch(/box-shadow/)
  })
})

describe('MAT-44 r2 B2: cena de ilustrações do campo de barro', () => {
  // Rodada 6: as figuras não se sobrepõem (antes a regra era "mesma largura e sobrepostas"); a
  // escala igual das pessoas e a ausência de margem negativa estão no bloco "r6 #2 e #3".
  it('as três ilustrações ficam no mesmo recipiente, na ordem, e cada uma com largura em porcentagem', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const campo = container.querySelector('main > section[data-campo="field-1"]')!
    const figuras = [...campo.querySelectorAll<SVGElement>('[data-ilustracao]')]
    expect(figuras.map((f) => f.getAttribute('data-ilustracao'))).toEqual(['colo', 'tapete', 'passeio'])
    expect(new Set(figuras.map((f) => f.parentElement)).size).toBe(1)
    for (const figura of figuras) {
      expect(figura.getAttribute('class')).toMatch(/(?:^|\s)w-\[[\d.]+%\]/)
      expect(figura.getAttribute('class')).toMatch(/@min-\[46rem\]\/pagina:w-\[[\d.]+%\]/)
    }
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

// MAT-44d-2: a Sessão é a abertura, o bloco do cronômetro e a mídia (sessao.test.tsx confere cada
// bloco). Aqui ficam as regras de composição que estas rodadas já tinham, na forma nova.
describe('MAT-44 r2 B3 e B4: Sessão', () => {
  it('as informações da sessão (início e atividade) ficam no cabeçalho e no bloco do cronômetro, sem as linhas com régua do campo antigo', () => {
    const { container } = renderizarRota('/app/sessao', {
      estadoInicial: { ...criarEstadoInicial(Date.now()), sessao: { tipo: 'tummy', inicio: Date.now() - 60_000, pessoa: 'Juliana' } },
    })

    expect(container.querySelector('.sb-abertura-subtitulo')!.textContent).toMatch(/^Iniciado às \d{2}:\d{2} por Juliana$/)
    const bloco = container.querySelector('[role="timer"]')!.closest('[data-andamento]')!
    expect(within(bloco as HTMLElement).getByText('Atividade sugerida: Espelho no chão')).toBeTruthy()
    expect(container.querySelectorAll('p.border-t')).toHaveLength(0)
  })

  it('as ações ficam no bloco do cronômetro, depois dele na ordem do DOM está só a mídia', () => {
    const { container } = renderizarRota('/app/sessao')

    const bloco = container.querySelector('[role="timer"]')!.closest('[data-andamento]')!
    const acoes = screen.getByRole('button', { name: 'Encerrar' })
    expect(bloco.contains(acoes)).toBe(true)
    expect(bloco.closest('main')!.contains(acoes)).toBe(true)
    expect(acoes.closest('.mt-auto')).toBeNull()
    expect(bloco.nextElementSibling!.querySelector('[data-midia]')).not.toBeNull()
  })

  it('o estado vazio tem a ilustração do berço, própria dele, dentro da moldura de mídia em barro', () => {
    const { container } = renderizarRota('/app/sessao', { estadoInicial: semSessao() })

    const berco = container.querySelector('[data-ilustracao="berco"]')!
    expect(berco).not.toBeNull()
    expect(berco.getAttribute('aria-hidden')).toBe('true')
    const moldura = berco.closest('[data-midia]')!
    expect(moldura.getAttribute('data-fundo')).toBe('barro')
    expect(container.querySelector('[data-ilustracao="colo"]')).toBeNull()
  })

  it('"Voltar para Hoje" é um link de texto da coluna lateral da abertura (estilo do sistema), com o mesmo destino e o mesmo nome', () => {
    renderizarRota('/app/sessao', { estadoInicial: semSessao() })

    const voltar = screen.getByRole('link', { name: 'Voltar para Hoje' })
    expect(voltar.getAttribute('href')).toBe('/app/hoje')
    expect(voltar.classList.contains('sb-abertura-link')).toBe(true)
    expect(voltar.classList.contains('botao')).toBe(false)
    expect(voltar.closest('.sb-abertura-lateral')).not.toBeNull()
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

  // Rodada 7: a escala do celular deixou de ser uma classe do JSX (0,75 e 0,85 fixos) e passou a ser
  // a variável --celular-escala, trocada em degraus de @container; onde o celular já cabia a
  // escala é a mesma de antes. A conferência de que ele cabe em toda largura está no bloco "r7 #1".
  it('o celular tem escala de pelo menos 0,75 onde cabe (o texto da miniatura fica com 12 px ou mais) e 0,85 na página larga', async () => {
    const secao = await madrugadaDoInicio()

    const celular = secao.querySelector('[data-aparelho="celular"]')!
    expect(celular.getAttribute('class')).toContain('[scale:var(--celular-escala)]')
    const escalas = regrasComContexto(estiloGlobal)
      .filter((r) => r.seletor === '.madrugada-celular' && '--celular-escala' in r.props)
      .map((r) => ({ condicao: r.condicao, escala: parseFloat(r.props['--celular-escala']) }))
    const larga = escalas.filter((e) => e.condicao && /min-width:\s*46rem/.test(e.condicao))
    const cabe = escalas.filter((e) => e.condicao && /min-width:\s*21rem/.test(e.condicao))
    expect(cabe.length).toBe(1)
    expect(cabe[0].escala * 16).toBeGreaterThanOrEqual(12)
    expect(larga.length).toBe(1)
    expect(larga[0].escala).toBeGreaterThanOrEqual(0.85)
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

// MAT-44d-2: o Hoje deixou de ter campo de lavanda, lista e cartão. A nota é uma linha rótulo + texto
// da base, os Últimos são a faixa de 3 números, e o único bloco de cor é o Em andamento (hoje.test.tsx
// confere cada bloco; aqui ficam as regras de cor e de ordem de leitura que estas rodadas já tinham).
describe('MAT-44 r3 #1: o Hoje sem campo de lavanda, em papel, na ordem de leitura', () => {
  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`(${tema}) "Para você saber" fica em papel, sem data-campo nem cartão, com a nota e o autor`, () => {
      renderizarRota('/app/hoje', { estadoInicial: estado() })

      const secao = screen.getByRole('heading', { name: 'Para você saber' }).closest('section')!
      expect(secao.hasAttribute('data-campo')).toBe(false)
      expect(secao.querySelector('.cartao')).toBeNull()
      expect(secao.textContent).toContain('Pomada só à noite.')
      expect(secao.textContent).toContain('Carla, 22:40')
    })
  }

  it('"Últimos" fica em papel, com os tempos tabulares em Zilla Slab (t-numero) e a legenda de 20 px', () => {
    renderizarRota('/app/hoje')

    const secao = screen.getByRole('heading', { name: 'Últimos' }).closest('section')!
    expect(secao.hasAttribute('data-campo')).toBe(false)
    const itens = secao.querySelectorAll('.sb-numeros-item')
    expect(itens).toHaveLength(3)
    for (const item of itens) {
      expect(item.querySelector('p.t-numero')).not.toBeNull()
      expect(item.querySelector('p.t-corpo')).not.toBeNull()
    }
  })

  it('a ordem de leitura é: Em andamento, Últimos e Para você saber', () => {
    const { container } = renderizarRota('/app/hoje')

    const andamento = container.querySelector('[data-andamento]')!
    const ultimos = screen.getByRole('heading', { name: 'Últimos' })
    const nota = screen.getByRole('heading', { name: 'Para você saber' })
    expect(container.querySelectorAll('[data-andamento]')).toHaveLength(1)
    expect(andamento.compareDocumentPosition(ultimos) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(ultimos.compareDocumentPosition(nota) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })
})

describe('MAT-44 r3 #2: botões rápidos com o mesmo tratamento em toda largura e tema', () => {
  // R2 (rodada 5): as miniaturas do Início (página pública) não têm ícone. MAT-44d-2: a barra Registrar
  // do Hoje também é só de texto (os 4 botões iguais, Sono, Mamada, Fralda e Mais), sem ícone e sem o
  // sinal "+". O tratamento com ícone e o "+ Mais" ficam no `BotoesRapidos`, que só o Início usa.
  const casos: Array<[string, string, () => EstadoPrototipo]> = [
    ['Hoje (claro)', '/app/hoje', claro],
    ['Hoje (madrugada)', '/app/hoje', madrugada],
  ]

  for (const [nome, caminho, estado] of casos) {
    it(`${nome}: Sono, Mamada, Fralda e Mais são só texto, num <span>, sem ícone e sem nada aria-hidden`, async () => {
      const { container } = renderizarRota(caminho, { estadoInicial: estado() })
      await screen.findAllByRole('heading')

      const sono = container.querySelector('button[aria-label="Iniciar sono de Heloísa"]')!
      const botoes = [...sono.parentElement!.children] as HTMLElement[]
      expect(botoes.map((b) => b.textContent)).toEqual(['Sono', 'Mamada', 'Fralda', 'Mais'])
      for (const botao of botoes) {
        expect(botao.querySelectorAll('svg'), botao.textContent!).toHaveLength(0)
        expect(botao.querySelectorAll('[aria-hidden="true"]'), botao.textContent!).toHaveLength(0)
        expect([...botao.children].map((filho) => filho.tagName), botao.textContent!).toEqual(['SPAN'])
      }
    })

    it(`${nome}: o botão do Mais não leva o sinal "+": o rótulo é "Mais" e o nome acessível, "Mais registros"`, async () => {
      const { container } = renderizarRota(caminho, { estadoInicial: estado() })
      await screen.findAllByRole('heading')

      const mais = container.querySelector('button[aria-label="Mais registros"]')!
      expect(mais.querySelectorAll('svg')).toHaveLength(0)
      expect(mais.textContent).toBe('Mais')
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

describe('MAT-44 r3 #4: bloco do cronômetro apertado', () => {
  function colunaDoTempo() {
    const { container } = renderizarRota('/app/sessao')
    return container.querySelector('[role="timer"]')!.parentElement as HTMLElement
  }

  it('o rótulo vem logo acima do número, e a atividade (quando há) logo abaixo, na mesma coluna', () => {
    const coluna = colunaDoTempo()

    const [rotulo, numero] = [...coluna.children] as HTMLElement[]
    expect(rotulo.textContent).toBe('Duração da sessão')
    expect(numero.getAttribute('role')).toBe('timer')
    expect(coluna.children).toHaveLength(2)
  })

  it('o número não flutua: sem margem automática, e a margem curta do rótulo é do CSS do bloco (8 px)', () => {
    const numero = colunaDoTempo().querySelector('[role="timer"]')!

    expect(numero.className).not.toMatch(/\bm[ty]-auto\b/)
    expect(/\.ha-cron-valor\s*\{[^}]*margin:\s*8px 0 0/.exec(estiloGlobal)).not.toBeNull()
  })

  it('a altura do bloco vem do conteúdo: nada estica (sem flex-1) e o respiro de 64 é do CSS', () => {
    const coluna = colunaDoTempo()

    for (let no: HTMLElement | null = coluna; no && no.tagName !== 'MAIN'; no = no.parentElement) {
      expect(no.classList.contains('flex-1'), no.className).toBe(false)
    }
    expect(/\.ha-cron-tempo\s*\{[^}]*padding:\s*64px/.exec(estiloGlobal)).not.toBeNull()
  })

  it('as ações ficam na coluna ao lado do cronômetro, e nada é empurrado ao pé da tela (sem .mt-auto)', () => {
    const { container } = renderizarRota('/app/sessao')

    expect(screen.getByRole('button', { name: 'Encerrar' }).closest('.mt-auto')).toBeNull()
    expect(container.querySelector('main .mt-auto')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Rodada 4.

describe('MAT-44 r4 #1: a Sessão ocupa o vazio com uma ilustração do tipo da sessão', () => {
  const sessaoDe = (tipo: 'sono' | 'mamada' | 'tummy'): EstadoPrototipo => ({
    ...criarEstadoInicial(Date.now()),
    sessao: { tipo, inicio: Date.now() - 60_000, pessoa: 'Juliana' },
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

  // MAT-44d-2: a ilustração é a mídia larga da Sessão (96 px abaixo do bloco do cronômetro), que ela
  // cobre inteira: `h-full w-full` e `slice`, sem o teto de 16 rem nem a área `flex-1` da coluna única.
  it('fica depois do bloco do cronômetro, dentro da moldura de mídia, e a cobre sem distorcer (slice)', () => {
    const { container } = renderizarRota('/app/sessao')

    const bloco = container.querySelector('[role="timer"]')!.closest('[data-andamento]')!
    const figura = container.querySelector('main [data-ilustracao]')!
    expect(bloco.compareDocumentPosition(figura) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(figura.parentElement!.hasAttribute('data-midia')).toBe(true)
    const cl = figura.getAttribute('class')!
    expect(cl).toMatch(/\bh-full\b/)
    expect(cl).toMatch(/\bw-full\b/)
    expect(cl).not.toMatch(/\bmax-[hw]-\[16rem\]/)
    expect(figura.getAttribute('preserveAspectRatio')).toMatch(/slice$/)
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
    expect(filhos[1].querySelector('[data-ilustracao="mamada"]')).not.toBeNull()
    expect(filhos[2].classList.contains('madrugada-celular')).toBe(true)
    expect(filhos[3].classList.contains('madrugada-legenda')).toBe(true)
  })

  it('cada filho tem a sua área da grade, e a grade larga põe o texto no alto e a ilustração na base do celular', () => {
    const css = semComentarios(estiloGlobal)

    expect(css).toMatch(/grid-template-areas:\s*"texto celular"\s*"cena celular"\s*"\. legenda"/)
    expect(css).toMatch(/grid-template-rows:\s*auto 1fr auto/)
    for (const [classe, area] of [
      ['madrugada-texto', 'texto'],
      ['madrugada-cena', 'cena'],
      ['madrugada-celular', 'celular'],
      ['madrugada-legenda', 'legenda'],
    ]) {
      expect(css, classe).toMatch(new RegExp(`\\.${classe}\\s*\\{[^}]*grid-area:\\s*${area}\\s*;`))
    }
    const cena = regrasDe(estiloGlobal).filter((r) => r.seletor === '.madrugada-cena').map((r) => r.corpo).join('')
    expect(cena).toMatch(/align-self:\s*end/)
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
    expect(secao.querySelector('.madrugada-cena [data-ilustracao]')).not.toBeNull()
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
    expect(paginas.map((p) => p.nome)).toEqual(
      expect.arrayContaining([
        'paginas/Hoje.tsx',
        'paginas/Inicio.tsx',
        'paginas/NaoEncontrada.tsx',
        'paginas/Sessao.tsx',
      ]),
    )
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
    const ancoras = () => container.querySelectorAll('nav[aria-label="Seções da página"] a')
    expect([...ancoras()].map((a) => a.textContent)).toEqual(navegacao.map((n) => n.rotulo))
    expect([...ancoras()].map((a) => a.getAttribute('href'))).toEqual(
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

// ---------------------------------------------------------------------------
// Rodada 5: correção pedida pela revisão.

interface RegraCss {
  seletor: string
  props: Record<string, string>
  /** O texto do at-rule condicional (@media ou @container) que envolve a regra, se houver. */
  condicao: string | null
  /** Posição da regra no arquivo. */
  ordem: number
}

/** Lê o CSS como texto, com o contexto de cada regra (dentro de @media/@container ou não). */
function regrasComContexto(css: string): RegraCss[] {
  const saida: RegraCss[] = []
  let ordem = 0
  function percorrer(trecho: string, condicao: string | null) {
    let i = 0
    while (i < trecho.length) {
      const abre = trecho.indexOf('{', i)
      if (abre === -1) break
      let fundo = 1
      let j = abre + 1
      while (j < trecho.length && fundo > 0) {
        if (trecho[j] === '{') fundo++
        else if (trecho[j] === '}') fundo--
        j++
      }
      const prelude = trecho.slice(i, abre)
      const cabeca = prelude.slice(prelude.lastIndexOf(';') + 1).trim()
      const corpo = trecho.slice(abre + 1, j - 1)
      i = j
      if (cabeca.startsWith('@keyframes')) continue
      if (cabeca.startsWith('@media') || cabeca.startsWith('@container')) {
        percorrer(corpo, cabeca)
      } else if (cabeca.startsWith('@')) {
        percorrer(corpo, condicao)
      } else {
        const props: Record<string, string> = {}
        for (const declaracao of corpo.split(';')) {
          const meio = declaracao.indexOf(':')
          if (meio > 0) props[declaracao.slice(0, meio).trim()] = declaracao.slice(meio + 1).trim()
        }
        for (const seletor of cabeca.split(',')) {
          saida.push({ seletor: seletor.trim().replace(/\s+/g, ' '), props, condicao, ordem })
        }
        ordem++
      }
    }
  }
  percorrer(semComentarios(css), null)
  return saida
}

/** Seletores cuja propriedade é redeclarada, sem condição, DEPOIS de um bloco condicional que a muda. */
function cascataDesfeita(css: string): string[] {
  const regras = regrasComContexto(css)
  const achados: string[] = []
  for (const condicional of regras.filter((r) => r.condicao !== null)) {
    for (const propriedade of Object.keys(condicional.props)) {
      const depois = regras.filter(
        (r) => r.condicao === null && r.seletor === condicional.seletor && propriedade in r.props && r.ordem > condicional.ordem,
      )
      if (depois.length > 0) achados.push(`${condicional.seletor} { ${propriedade} } em ${condicional.condicao}`)
    }
  }
  return [...new Set(achados)]
}

describe('MAT-44 r5 R1: a cascata não desfaz a medida dentro de @container ou @media', () => {
  it('nenhum seletor declara sem condição, depois de um bloco condicional, a propriedade que ele muda', () => {
    expect(cascataDesfeita(estiloGlobal)).toEqual([])
  })

  it('o detector enxerga a regra sem condição que vem depois do bloco condicional', () => {
    const ruim = `
      @container pagina (min-width: 46rem) { .palco { width: 72rem; } }
      .palco { width: 58rem; }
    `
    const bom = `
      .palco { width: 58rem; }
      @container pagina (min-width: 46rem) { .palco { width: 72rem; } }
    `
    expect(cascataDesfeita(ruim)).toEqual(['.palco { width } em @container pagina (min-width: 46rem)'])
    expect(cascataDesfeita(bom)).toEqual([])
  })
})

/** O que vale em cada largura de página (em rem) para a vitrine: escala do palco e tamanho natural dele. */
function vitrineEm(largura: number) {
  const regras = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.vitrine')
  const valores: Record<string, number> = {}
  for (const regra of regras.sort((a, b) => a.ordem - b.ordem)) {
    if (regra.condicao) {
      const minimo = /min-width:\s*([\d.]+)rem/.exec(regra.condicao)
      if (!minimo || largura < parseFloat(minimo[1])) continue
    }
    for (const nome of ['--escala', '--palco-largura', '--palco-altura']) {
      if (nome in regra.props) valores[nome] = parseFloat(regra.props[nome])
    }
  }
  return { escala: valores['--escala'], largura: valores['--palco-largura'], altura: valores['--palco-altura'] }
}

describe('MAT-44 r5 R1: o conjunto de aparelhos cabe no campo, centrado, em toda largura', () => {
  it('o palco é centrado pela própria largura (não por um valor fixo que a cascata possa trocar)', () => {
    const palco = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.vitrine-palco')
    expect(palco.every((r) => r.condicao === null)).toBe(true)
    const corpo = palco.map((r) => r.props)
    expect(corpo.some((p) => p['left'] === '50%')).toBe(true)
    expect(corpo.some((p) => /^calc\(var\(--palco-largura\)\s*\/\s*-2\)$/.test(p['margin-left'] ?? ''))).toBe(true)
    expect(corpo.some((p) => p['width'] === 'var(--palco-largura)')).toBe(true)
  })

  it('de 6 rem (fonte raiz em 200% numa janela de celular, ou zoom alto) a 140 rem, o palco escalado cabe na largura', () => {
    for (let largura = 6; largura <= 140; largura += 0.25) {
      const { escala, largura: palco } = vitrineEm(largura)
      expect(escala, `escala em ${largura} rem`).toBeGreaterThan(0)
      expect(palco * escala, `palco de ${palco} rem × ${escala} em ${largura} rem`).toBeLessThanOrEqual(largura + 1e-9)
    }
  })

  it('a escala só cresce com a largura, dentro de cada faixa (sem degrau para trás, salvo na troca de palco em 46 rem)', () => {
    let anterior = 0
    for (let largura = 6; largura <= 140; largura += 0.25) {
      const { escala } = vitrineEm(largura)
      if (Math.abs(largura - 46) < 1e-9) {
        anterior = 0
        continue
      }
      expect(escala, `${largura} rem`).toBeGreaterThanOrEqual(anterior)
      anterior = escala
    }
  })

  it('a altura do campo cabe na janela: no máximo 0,95 de 900 px em 1440 px', () => {
    const { escala, altura } = vitrineEm(86.4)
    expect(altura * escala * 16).toBeLessThanOrEqual(0.95 * 900)
  })

  interface Retangulo { x: number; y: number; largura: number; altura: number }

  const numero = (classe: string, prefixo: string, variante = ''): number | undefined => {
    const m = new RegExp(`(?:^|\\s)${variante.replace(/[[\]/]/g, '\\$&')}${prefixo}-\\[(-?[\\d.]+)(?:rem)?\\]`).exec(classe)
    return m ? parseFloat(m[1]) : undefined
  }

  async function retangulos(faixa: 'estreita' | 'larga'): Promise<{ palco: { largura: number; altura: number }; itens: Array<Retangulo & { tela: string }> }> {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const palco = vitrineEm(faixa === 'larga' ? 70 : 30)
    const largura = parseFloat(/width:\s*([\d.]+)rem/.exec(regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-celular')!.corpo)![1])
    const proporcao = /aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/.exec(regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-celular')!.corpo)!
    const alturaCelular = largura * (parseFloat(proporcao[2]) / parseFloat(proporcao[1]))
    const larguraNotebook = parseFloat(/width:\s*([\d.]+)rem/.exec(regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-notebook')!.corpo)![1])
    const baseCorpo = regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-base')!.corpo
    // A base do notebook sai da moldura pelos dois lados (margin-inline negativa).
    const extensaoDaBase = -parseFloat(/margin-inline:\s*(-[\d.]+)rem/.exec(baseCorpo)![1])
    const alturaBase = parseFloat(/height:\s*([\d.]+)rem/.exec(baseCorpo)![1])
    const variante = faixa === 'larga' ? '@min-[46rem]/pagina:' : ''

    const itens = [...container.querySelectorAll<HTMLElement>('#secao-telas [data-aparelho]')].map((aparelho) => {
      const classe = aparelho.getAttribute('class')!
      const pega = (prefixo: string) => numero(classe, prefixo, variante) ?? numero(classe, prefixo)!
      const escala = pega('scale')
      const x = pega('left')
      const y = pega('top')
      if (aparelho.getAttribute('data-aparelho') === 'notebook') {
        const altura = (larguraNotebook * 10) / 16 + alturaBase + 0.25
        return {
          tela: aparelho.getAttribute('data-tela')!,
          x: x - extensaoDaBase * escala,
          y,
          largura: (larguraNotebook + 2 * extensaoDaBase) * escala,
          altura: altura * escala,
        }
      }
      return { tela: aparelho.getAttribute('data-tela')!, x, y, largura: largura * escala, altura: alturaCelular * escala }
    })
    return { palco: { largura: palco.largura, altura: palco.altura }, itens }
  }

  for (const faixa of ['estreita', 'larga'] as const) {
    it(`faixa ${faixa}: nenhum aparelho passa da borda do palco e há folga de pelo menos 2 rem dos quatro lados`, async () => {
      const { palco, itens } = await retangulos(faixa)

      expect(itens.length).toBeGreaterThanOrEqual(2)
      const esquerda = Math.min(...itens.map((i) => i.x))
      const direita = palco.largura - Math.max(...itens.map((i) => i.x + i.largura))
      const topo = Math.min(...itens.map((i) => i.y))
      const base = palco.altura - Math.max(...itens.map((i) => i.y + i.altura))
      expect(esquerda, 'folga à esquerda').toBeGreaterThanOrEqual(2)
      expect(direita, 'folga à direita').toBeGreaterThanOrEqual(2)
      expect(topo, 'folga em cima').toBeGreaterThanOrEqual(2)
      expect(base, 'folga embaixo').toBeGreaterThanOrEqual(2)
      // Centrado: as folgas laterais diferem em até 1 rem.
      expect(Math.abs(esquerda - direita), `esquerda ${esquerda}, direita ${direita}`).toBeLessThanOrEqual(1)
    })
  }
})

describe('MAT-44 r5 R2: nenhum ícone na página pública', () => {
  for (const caminho of ['/', '/qualquer-coisa', '/outra/rota/que/nao/existe']) {
    it(`${caminho}: zero svg.lucide no documento inteiro, inclusive dentro de [inert]`, async () => {
      const { container } = renderizarRota(caminho)
      await screen.findByRole('heading', { level: 1 })

      expect(container.querySelectorAll('svg.lucide')).toHaveLength(0)
      expect(document.querySelectorAll('svg.lucide')).toHaveLength(0)
    })

    it(`${caminho}: os únicos svg são ilustrações (data-ilustracao)`, async () => {
      const { container } = renderizarRota(caminho)
      await screen.findByRole('heading', { level: 1 })

      const outros = [...container.querySelectorAll('svg')].filter((s) => !s.hasAttribute('data-ilustracao'))
      expect(outros).toEqual([])
    })
  }

  it('as miniaturas do Início mostram os mesmos botões rápidos, na mesma ordem e com os mesmos rótulos, sem ícone', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const grades = [...container.querySelectorAll('[inert] button[aria-label="Iniciar sono de Heloísa"]')].map((b) => b.parentElement!)
    expect(grades.length).toBeGreaterThanOrEqual(2)
    for (const grade of grades) {
      expect([...grade.children].map((b) => b.textContent)).toEqual(['Sono', 'Mamada', 'Fralda', 'Tummy time', '+ Mais'])
      expect([...grade.children].map((b) => b.getAttribute('aria-label'))).toEqual([
        'Iniciar sono de Heloísa',
        'Iniciar mamada de Heloísa',
        'Registrar fralda de Heloísa',
        'Iniciar tummy time de Heloísa',
        'Mais registros',
      ])
    }
  })

  // MAT-44d-2: a navegação inferior saiu do Hoje e da Sessão (era o teste "a navegação inferior continua
  // com ícone e rótulo visível"). Fica o que o substitui: nenhuma tela logada tem ícone lucide.
  for (const caminho of ['/app/hoje', '/app/sessao']) {
    for (const [tema, estado] of [
      ['claro', claro],
      ['madrugada', madrugada],
    ] as const) {
      it(`${caminho} (${tema}): sem navegação inferior e sem nenhum ícone lucide`, () => {
        const { container } = renderizarRota(caminho, { estadoInicial: estado() })

        expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
        expect(container.querySelectorAll('.nav-item, svg.lucide')).toHaveLength(0)
      })
    }
  }

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`/app/hoje (${tema}): os quatro botões da barra Registrar têm rótulo visível e nenhum ícone`, () => {
      renderizarRota('/app/hoje', { estadoInicial: estado() })

      for (const nome of ['Iniciar sono de Heloísa', 'Iniciar mamada de Heloísa', 'Registrar fralda de Heloísa', 'Mais registros']) {
        const botao = screen.getByRole('button', { name: nome })
        expect(botao.querySelectorAll('svg.lucide'), nome).toHaveLength(0)
        expect(botao.querySelector('span')!.textContent!.trim(), nome).not.toBe('')
      }
    })
  }
})

describe('MAT-44 r5 R3: a vitrine mostra as telas que a legenda anuncia, em toda largura', () => {
  async function vitrine() {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    return container.querySelector<HTMLElement>('#secao-telas')!
  }

  it('cada aparelho diz que tela mostra, e há um notebook, uma tela Hoje e uma tela Sessão', async () => {
    const secao = await vitrine()

    const aparelhos = [...secao.querySelectorAll<HTMLElement>('[data-aparelho]')]
    expect(aparelhos.length).toBeGreaterThanOrEqual(2)
    for (const aparelho of aparelhos) expect(['hoje', 'sessao']).toContain(aparelho.getAttribute('data-tela'))
    expect(aparelhos.some((a) => a.getAttribute('data-aparelho') === 'notebook')).toBe(true)
    expect(aparelhos.some((a) => a.getAttribute('data-tela') === 'hoje')).toBe(true)
    expect(aparelhos.some((a) => a.getAttribute('data-tela') === 'sessao')).toBe(true)
  })

  it('a tela marcada é a que o aparelho mostra: sessao tem o cronômetro, hoje tem o cartão Em andamento', async () => {
    const secao = await vitrine()

    for (const aparelho of secao.querySelectorAll<HTMLElement>('[data-aparelho]')) {
      const tela = aparelho.getAttribute('data-tela')
      expect(aparelho.querySelector('[role="timer"]') !== null, tela!).toBe(tela === 'sessao')
      expect(aparelho.querySelector('.campo-andamento') !== null, tela!).toBe(tela === 'hoje')
    }
  })

  it('nenhum aparelho, nem ancestral dele dentro da seção, tem classe que o esconda em alguma faixa', async () => {
    const secao = await vitrine()

    const esconde = /(^|:)(hidden|invisible|sr-only|opacity-0|collapse)$/
    for (const aparelho of secao.querySelectorAll<HTMLElement>('[data-aparelho]')) {
      for (let no: HTMLElement | null = aparelho; no && no !== secao.parentElement; no = no.parentElement) {
        const tokens = [...no.classList].filter((t) => esconde.test(t))
        expect(tokens, `${no.tagName.toLowerCase()}.${no.className}`).toEqual([])
      }
    }
  })

  it('nenhuma regra do CSS da vitrine ou dos aparelhos esconde o que quer que seja', () => {
    const escondem = regrasComContexto(estiloGlobal)
      .filter((r) => /\.(vitrine|aparelho)/.test(r.seletor))
      .filter((r) => r.props['display'] === 'none' || r.props['visibility'] === 'hidden' || r.props['opacity'] === '0')
      .map((r) => r.seletor)
    expect(escondem).toEqual([])
  })

  it('em 390 px os celulares são lidos de relance: pelo menos 9 rem de largura efetiva (eram 7,3)', async () => {
    const secao = await vitrine()

    const { escala } = vitrineEm(22.4)
    const celulares = [...secao.querySelectorAll<HTMLElement>('[data-aparelho="celular"]')]
    expect(celulares.length).toBeGreaterThanOrEqual(2)
    for (const celular of celulares) {
      const proprio = /(?:^|\s)scale-\[([\d.]+)\]/.exec(celular.getAttribute('class')!)
      expect(proprio).not.toBeNull()
      expect(24 * parseFloat(proprio![1]) * escala, celular.getAttribute('data-tela')!).toBeGreaterThanOrEqual(9)
    }
  })
})

// ---------------------------------------------------------------------------
// Rodada 6: regras de composição do Início. Medidas de gosto (tamanhos, paddings, vãos) não são
// fixadas em teste: são conferidas em captura. Aqui só o que é regra: nenhuma figura cobre outra,
// as pessoas têm a mesma escala, a ordem do DOM e a estrutura das áreas.

describe('MAT-44 r6 #1: madrugada em duas colunas, sem nada atrás do celular', () => {
  async function secaoMadrugada() {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    return container.querySelector<HTMLElement>('#secao-madrugada')!
  }

  it('a ordem do DOM é título e texto, cena (ilustração), celular e legenda', async () => {
    const secao = await secaoMadrugada()

    const filhos = [...secao.children] as HTMLElement[]
    expect(filhos).toHaveLength(4)
    expect(filhos[0].querySelector('#titulo-madrugada')).not.toBeNull()
    expect(filhos[1].classList.contains('madrugada-cena')).toBe(true)
    expect(filhos[1].querySelector('[data-ilustracao="mamada"]')).not.toBeNull()
    expect(filhos[2].classList.contains('madrugada-celular')).toBe(true)
    expect(filhos[3].classList.contains('madrugada-legenda')).toBe(true)
  })

  it('nenhuma parte da ilustração fica atrás do celular: sem margem negativa e sem camada (z-*)', async () => {
    const secao = await secaoMadrugada()

    for (const seletor of ['.madrugada-cena', '.madrugada-celular', '.madrugada-legenda', '[data-ilustracao="mamada"]']) {
      const elemento = secao.querySelector(seletor)!
      const classe = elemento.getAttribute('class')!
      expect(classe, seletor).not.toMatch(/(?:^|\s|:)-m[trblxy]?-/)
      expect(classe, seletor).not.toMatch(/(?:^|\s|:)z-/)
    }
    const negativas = regrasComContexto(estiloGlobal)
      .filter((r) => r.seletor.includes('.madrugada-') || r.seletor.includes('data-ilustracao'))
      .flatMap((r) => Object.entries(r.props).map(([p, v]) => `${r.seletor} { ${p}: ${v} }`))
      .filter((d) => /\{\s*margin[a-z-]*:\s*-/.test(d) || /\{\s*z-index:/.test(d))
    expect(negativas).toEqual([])
  })

  it('cena e celular ocupam áreas diferentes da grade, e a grade larga os alinha pela base', () => {
    const css = semComentarios(estiloGlobal)
    expect(css).toMatch(/grid-template-areas:\s*"texto celular"\s*"cena celular"\s*"\. legenda"/)
    for (const [classe, area] of [
      ['madrugada-texto', 'texto'],
      ['madrugada-cena', 'cena'],
      ['madrugada-celular', 'celular'],
      ['madrugada-legenda', 'legenda'],
    ]) {
      expect(css, classe).toMatch(new RegExp(`\\.${classe}\\s*\\{[^}]*grid-area:\\s*${area}\\s*;`))
    }
    const larga = regrasComContexto(estiloGlobal).filter((r) => r.condicao !== null)
    for (const seletor of ['.madrugada-cena', '.madrugada-celular']) {
      expect(larga.some((r) => r.seletor === seletor && r.props['align-self'] === 'end'), seletor).toBe(true)
    }
  })

  it('na grade larga a ilustração ocupa a largura da coluna da esquerda', () => {
    const larga = regrasComContexto(estiloGlobal).filter(
      (r) => r.condicao !== null && /min-width:\s*64rem/.test(r.condicao) && r.seletor === '.madrugada-cena > svg',
    )
    expect(larga.some((r) => r.props['width'] === '100%')).toBe(true)
  })

  it('o desenho termina no chão: o viewBox da ilustração larga acaba na linha do chão, na base do celular', async () => {
    const secao = await secaoMadrugada()

    const desenho = secao.querySelector('[data-ilustracao="mamada"]')!
    const [, , largura, altura] = desenho.getAttribute('viewBox')!.split(/\s+/).map(Number)
    expect(largura / altura).toBeGreaterThan(1.5)
    expect(altura).toBeLessThanOrEqual(223)
    expect(desenho.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('MAT-44 r6 #2 e #3: campo de barro com as pessoas na mesma escala e nada sobreposto', () => {
  async function cenaDoBarro() {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const campo = container.querySelector('main > section[data-campo="field-1"]')!
    const cena = campo.querySelector('[data-ilustracao]')!.parentElement as HTMLElement
    const figuras = [...cena.querySelectorAll<SVGElement>('[data-ilustracao]')]
    return { cena, figuras }
  }

  const larguraDoDesenho = (figura: Element) => Number(figura.getAttribute('viewBox')!.split(/\s+/)[2])
  const porcento = (figura: Element, variante: string) => {
    const classe = figura.getAttribute('class')!
    const re = variante
      ? /@min-\[46rem\]\/pagina:w-\[([\d.]+)%\]/
      : /(?:^|\s)w-\[([\d.]+)%\]/
    return parseFloat(re.exec(classe)![1])
  }

  it('as três figuras: colo, tapete e passeio, no mesmo recipiente, na ordem', async () => {
    const { cena, figuras } = await cenaDoBarro()

    expect(figuras.map((f) => f.getAttribute('data-ilustracao'))).toEqual(['colo', 'tapete', 'passeio'])
    expect(new Set(figuras.map((f) => f.parentElement)).size).toBe(1)
    expect(cena.className).toMatch(/\bmx-auto\b/)
  })

  it('nenhuma figura, nem o recipiente, usa margem negativa em nenhuma faixa (nada cobre nada)', async () => {
    const { cena, figuras } = await cenaDoBarro()

    for (const elemento of [cena, ...figuras]) {
      expect(elemento.getAttribute('class'), elemento.getAttribute('data-ilustracao') ?? 'recipiente').not.toMatch(
        /(?:^|\s|:)-m[trblxy]?-/,
      )
    }
  })

  it('as pessoas têm a mesma escala: a largura de cada figura é proporcional à largura do desenho dela, em cada faixa', async () => {
    const { figuras } = await cenaDoBarro()

    for (const variante of ['', '@min']) {
      const escalas = figuras.map((f) => porcento(f, variante) / larguraDoDesenho(f))
      for (const escala of escalas) {
        expect(Math.abs(escala / escalas[0] - 1), `faixa ${variante || 'estreita'}: ${escalas.join(', ')}`).toBeLessThan(0.02)
      }
    }
  })

  it('o desenho é cortado rente ao chão e à figura (viewBox justo): termina na linha do chão', async () => {
    const { figuras } = await cenaDoBarro()

    for (const figura of figuras) {
      const [x, y, largura, altura] = figura.getAttribute('viewBox')!.split(/\s+/).map(Number)
      expect(y + altura, figura.getAttribute('data-ilustracao')!).toBeLessThanOrEqual(223)
      expect(y + altura).toBeGreaterThanOrEqual(221)
      expect(x + largura).toBeLessThanOrEqual(240)
      expect(largura).toBeLessThan(240)
      expect(altura).toBeLessThan(200)
    }
  })

  it('cada linha cabe na largura (sem rolagem horizontal): colo+passeio e o tapete, e as três na faixa larga', async () => {
    const { figuras } = await cenaDoBarro()

    const [colo, tapete, passeio] = figuras
    expect(porcento(colo, '') + porcento(passeio, '')).toBeLessThanOrEqual(100)
    expect(porcento(tapete, '')).toBeLessThanOrEqual(100)
    expect(figuras.reduce((soma, f) => soma + porcento(f, '@min'), 0)).toBeLessThanOrEqual(100)
  })

  it('o tapete, sozinho na segunda linha, fica centrado, e as duas linhas ficam próximas (vão de até 16 px)', async () => {
    const { cena, figuras } = await cenaDoBarro()

    expect(figuras[1].getAttribute('class')).toMatch(/\bmx-auto\b/)
    const vao = /(?:^|\s)gap-y-(\d+)(?:\s|$)/.exec(cena.className)
    expect(vao).not.toBeNull()
    expect(parseInt(vao![1], 10)).toBeLessThanOrEqual(4)
  })
})

// ---------------------------------------------------------------------------
// Rodada 7: rolagem horizontal no Início com a fonte ampliada. Com a fonte raiz em 200% a página
// tem metade das rem (390 px = 12 rem de largura, menos as margens); tudo o que tem tamanho fixo em
// rem, ou margem negativa, ou uma palavra comprida sem quebra, passa da largura. As regras abaixo
// valem para a classe do defeito, em toda largura, e não fixam medida estética.

describe('MAT-44 r7 #1: o celular da madrugada escala com a largura da página, em rem', () => {
  const celularEm = (largura: number, seletor = '.madrugada-celular'): number => {
    const regras = regrasComContexto(estiloGlobal)
      .filter((r) => r.seletor === seletor)
      .sort((a, b) => a.ordem - b.ordem)
    let escala = Number.NaN
    for (const regra of regras) {
      if (regra.condicao) {
        const minimo = /min-width:\s*([\d.]+)rem/.exec(regra.condicao)
        if (!minimo || largura < parseFloat(minimo[1])) continue
      }
      if ('--celular-escala' in regra.props) escala = parseFloat(regra.props['--celular-escala'])
    }
    return escala
  }
  const larguraNatural = () =>
    parseFloat(/width:\s*([\d.]+)rem/.exec(regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-celular')!.corpo)![1])

  async function paddingLateral(): Promise<{ estreita: number; larga: number }> {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    const classe = container.querySelector('#secao-madrugada')!.getAttribute('class')!
    const base = /(?:^|\s)px-(\d+)(?:\s|$)/.exec(classe)![1]
    const larga = /@min-\[46rem\]\/pagina:px-(\d+)/.exec(classe)![1]
    return { estreita: parseInt(base, 10) / 4, larga: parseInt(larga, 10) / 4 }
  }

  it('de 6 a 140 rem, a caixa do celular mais o padding lateral da seção cabe na largura da página', async () => {
    const padding = await paddingLateral()

    for (let largura = 6; largura <= 140; largura += 0.25) {
      const escala = celularEm(largura)
      expect(escala, `escala em ${largura} rem`).toBeGreaterThan(0)
      const caixa = larguraNatural() * escala
      const lateral = 2 * (largura >= 46 ? padding.larga : padding.estreita)
      expect(caixa, `caixa de ${caixa} rem em ${largura} rem de página (padding ${lateral})`).toBeLessThanOrEqual(
        largura - lateral + 1e-9,
      )
    }
  })

  it('nas larguras em que já cabia, o tamanho é o de antes: 18 rem abaixo de 46 rem e 20,4 rem a partir de 46 rem', () => {
    for (let largura = 21; largura < 46; largura += 0.25) {
      expect(larguraNatural() * celularEm(largura), `${largura} rem`).toBeCloseTo(18, 6)
    }
    for (let largura = 46; largura <= 140; largura += 0.25) {
      expect(larguraNatural() * celularEm(largura), `${largura} rem`).toBeCloseTo(20.4, 6)
    }
  })

  it('a escala só cresce com a largura dentro de cada faixa (a troca em 46 rem reinicia a contagem)', () => {
    let anterior = 0
    for (let largura = 6; largura <= 140; largura += 0.25) {
      const escala = celularEm(largura)
      if (Math.abs(largura - 46) < 1e-9) anterior = 0
      expect(escala, `${largura} rem`).toBeGreaterThanOrEqual(anterior)
      anterior = escala
    }
  })

  it('a caixa e a altura leem a escala por variável, e a altura segue a proporção do aparelho', () => {
    const regras = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.madrugada-celular' && r.condicao === null)
    const natural = larguraNatural()
    const proporcao = /aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/.exec(regrasDe(estiloGlobal).find((r) => r.seletor === '.aparelho-celular')!.corpo)!
    const alturaNatural = natural * (parseFloat(proporcao[2]) / parseFloat(proporcao[1]))

    const largura = regras.map((r) => /^calc\(([\d.]+)rem \* var\(--celular-escala\)\)$/.exec(r.props['width'] ?? '')).find(Boolean)
    const altura = regras.map((r) => /^calc\(([\d.]+)rem \* var\(--celular-escala\)\)$/.exec(r.props['height'] ?? '')).find(Boolean)
    expect(largura, 'width calc(natural * escala)').toBeTruthy()
    expect(altura, 'height calc(natural * escala)').toBeTruthy()
    expect(parseFloat(largura![1])).toBeCloseTo(natural, 6)
    expect(parseFloat(altura![1])).toBeCloseTo(alturaNatural, 2)
  })

  it('no JSX não sobra medida fixa em rem nem escala numérica para o celular da madrugada', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const caixa = container.querySelector('.madrugada-celular')!
    expect(caixa.getAttribute('class')).not.toMatch(/(?:^|\s|:)[wh]-\[[\d.]+rem\]/)
    const celular = caixa.querySelector('[data-aparelho="celular"]')!
    expect(celular.getAttribute('class')).not.toMatch(/(?:^|\s|:)scale-\[[\d.]+\]/)
    expect(celular.getAttribute('class')).toContain('[scale:var(--celular-escala)]')
  })

  it('a legenda tem a largura do celular em toda largura: mesma escala e largura máxima pela variável', () => {
    for (let largura = 6; largura <= 140; largura += 0.25) {
      expect(celularEm(largura, '.madrugada-legenda'), `${largura} rem`).toBe(celularEm(largura))
    }
    const base = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.madrugada-legenda' && r.condicao === null)
    expect(base.some((r) => /^calc\([\d.]+rem \* var\(--celular-escala\)\)$/.test(r.props['max-width'] ?? ''))).toBe(true)
  })
})

describe('MAT-44 r7 #2: a etiqueta nunca passa da largura da linha', () => {
  it('.etiqueta limita a largura a 100% e quebra a palavra dentro dela, com hífen automático', () => {
    const regras = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.etiqueta')
    const props = Object.assign({}, ...regras.map((r) => r.props)) as Record<string, string>

    expect(props['max-width']).toBe('100%')
    expect(props['hyphens']).toBe('auto')
    expect(props['overflow-wrap']).toMatch(/^(anywhere|break-word)$/)
  })

  it('as etiquetas do Início são itens de uma linha que quebra (flex-wrap), com a classe .etiqueta', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const etiquetas = [...container.querySelectorAll('li.etiqueta')]
    expect(etiquetas.map((e) => e.textContent)).toEqual(['Rotina', 'Desenvolvimento', 'Cuidado compartilhado', 'Comunidade'])
    for (const etiqueta of etiquetas) expect(etiqueta.parentElement!.className).toMatch(/\bflex-wrap\b/)
    expect(document.documentElement.getAttribute('lang') ?? 'pt-BR').toBe('pt-BR')
    expect(lerTexto('../index.html')).toContain('lang="pt-BR"')
  })
})

describe('MAT-44 r7 #3: nenhuma margem negativa leva um item da página pública para além da borda', () => {
  it('no Início, nenhum elemento fora dos aparelhos usa margem negativa em nenhuma faixa', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const achados = [...container.querySelectorAll<HTMLElement>('[class]')]
      .filter((e) => e.closest('[inert]') === null)
      .flatMap((e) => [...e.classList].filter((t) => /(^|:)-m[trblxyse]?-/.test(t)).map((t) => `${e.tagName.toLowerCase()} ${t}`))
    expect(achados).toEqual([])
  })

  it('a navegação do topo continua com os três links e alvos de pelo menos 44 px', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const links = [...container.querySelectorAll('nav[aria-label="Seções da página"] a')]
    expect(links).toHaveLength(3)
    for (const link of links) expect(link.classList.contains('alvo-toque')).toBe(true)
    const alvo = regrasComContexto(estiloGlobal).filter((r) => r.seletor === '.alvo-toque').map((r) => r.props)
    expect(alvo.some((p) => p['min-width'] === '44px' && p['min-height'] === '44px')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Rodada 8: nenhum texto do Início passa da própria caixa, em toda largura e com a fonte ampliada.
// A regra é uma só, na raiz do Início, e herdada: quebra de palavra só quando a palavra não cabe
// (overflow-wrap: break-word, a classe break-words do Tailwind). Sem hífen automático nos títulos,
// sem overflow-wrap: anywhere (que muda a largura mínima de itens de grade e de flex) e sem
// esconder nada. O Hoje e a Sessão não recebem a regra.

describe('MAT-44 r8: a raiz do Início quebra a palavra que não cabe, e só ela', () => {
  async function raizDoInicio() {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    // A raiz do Início é a tela, entre o cabeçalho e o rodapé do site (a casca do Layout).
    return container.querySelector('[class~="@container/pagina"]') as HTMLElement
  }

  /** Os tokens de classe sem a variante (@min-[…]/pagina:, hover:, …). */
  const semVariante = (token: string) => token.slice(token.lastIndexOf(':') + 1)

  it('o contêiner raiz do Início declara a quebra (break-words) e continua sendo o contêiner da página', async () => {
    const raiz = await raizDoInicio()

    expect(raiz.matches('[class~="@container/pagina"]')).toBe(true)
    expect(raiz.classList.contains('break-words')).toBe(true)
  })

  it('a quebra é a de palavra que não cabe: sem anywhere, sem hífen automático e sem esconder nada na raiz', async () => {
    const raiz = await raizDoInicio()

    const tokens = [...raiz.classList].map(semVariante)
    for (const proibido of ['wrap-anywhere', '[overflow-wrap:anywhere]', 'hyphens-auto', '[hyphens:auto]', 'break-all', 'break-keep']) {
      expect(tokens, proibido).not.toContain(proibido)
    }
    expect(tokens.filter((t) => /^overflow(-[xy])?-(hidden|clip)$/.test(t))).toEqual([])
    expect(tokens.filter((t) => /^(invisible|hidden|sr-only)$/.test(t))).toEqual([])
  })

  it('nenhum elemento do Início fora dos aparelhos desfaz a quebra pelas classes', async () => {
    const raiz = await raizDoInicio()

    const desfazem = /^(break-normal|wrap-normal|whitespace-nowrap|text-nowrap|whitespace-pre|\[overflow-wrap:normal\]|\[white-space:nowrap\]|\[word-break:keep-all\])$/
    const achados = [...raiz.querySelectorAll<HTMLElement>('[class]')]
      .filter((e) => e.closest('[inert]') === null)
      .flatMap((e) => [...e.classList].filter((t) => desfazem.test(semVariante(t))).map((t) => `${e.tagName.toLowerCase()} ${t}`))
    expect(achados).toEqual([])
  })

  it('nenhuma classe do CSS usada no Início, fora dos aparelhos, desfaz a quebra', async () => {
    const raiz = await raizDoInicio()

    const usadas = new Set(
      [...raiz.querySelectorAll<HTMLElement>('[class]')]
        .filter((e) => e.closest('[inert]') === null)
        .flatMap((e) => [...e.classList]),
    )
    const achados = regrasComContexto(estiloGlobal)
      .filter((r) => [...r.seletor.matchAll(/\.([\w-]+)/g)].some((m) => usadas.has(m[1])))
      .filter(
        (r) =>
          r.props['overflow-wrap'] === 'normal' ||
          /^(nowrap|pre)$/.test(r.props['white-space'] ?? '') ||
          r.props['word-break'] === 'keep-all',
      )
      .map((r) => r.seletor)
    expect(achados).toEqual([])
  })

  it('o Hoje e a Sessão não recebem a regra: nenhum elemento tem break-words, nem no layout compartilhado', async () => {
    for (const caminho of ['/app/hoje', '/app/sessao']) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findByRole('heading', { level: 1 })
      expect(container.querySelectorAll('.break-words'), caminho).toHaveLength(0)
      unmount()
    }
    // O ColunaApp saiu da lista: o 44d-2 o aposentou (ver o teste "peças que saíram" em sessao.test.tsx).
    for (const arquivo of ['componentes/Layout.tsx', 'paginas/Hoje.tsx', 'paginas/Sessao.tsx']) {
      expect(lerTexto(arquivo), arquivo).not.toContain('break-words')
    }
  })

  it('nem o html, nem o body, nem o seletor universal declaram quebra ou escondem o excesso', () => {
    const globais = regrasComContexto(estiloGlobal).filter((r) => ['html', 'body', '*', ':root'].includes(r.seletor))
    for (const regra of globais) {
      for (const propriedade of ['overflow-wrap', 'word-break', 'overflow', 'overflow-x', 'hyphens']) {
        expect(regra.props, `${regra.seletor} { ${propriedade} }`).not.toHaveProperty(propriedade)
      }
    }
  })
})
