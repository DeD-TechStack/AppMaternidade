import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { listarFontes, pastaSrcDe } from './teste/fontes.ts'

// Lidos do disco: no Vitest, importar CSS (mesmo com ?raw) não devolve o texto do arquivo.
const pastaSrc = pastaSrcDe(import.meta.url)
const lerTexto = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')
const tokensCss = lerTexto('styles/tokens.css')
const temaCss = lerTexto('styles/tema.css')
const estiloGlobal = lerTexto('index.css')
const indexHtml = readFileSync(pastaSrc + '../index.html', 'utf8')

function lerTokens(css: string): Record<string, string> {
  const bloco = /@theme\s*\{([^}]*)\}/.exec(css)
  if (!bloco) throw new Error('bloco @theme não encontrado em tokens.css')
  const cores: Record<string, string> = {}
  for (const [, nome, hex] of bloco[1].matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/g)) {
    cores[nome] = hex
  }
  return cores
}

// Luminância relativa da WCAG 2.x (sRGB).
function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (clara + 0.05) / (escura + 0.05)
}

function canais(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

// Matiz HSL em graus.
function matiz(hex: string): number {
  const [r, g, b] = canais(hex).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const delta = max - Math.min(r, g, b)
  if (delta === 0) return 0
  let h: number
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  h *= 60
  return h < 0 ? h + 360 : h
}

function diferencaDeMatiz(a: string, b: string): number {
  const d = Math.abs(matiz(a) - matiz(b))
  return Math.min(d, 360 - d)
}

describe('contraste e limites dos tokens', () => {
  const cores = lerTokens(tokensCss)

  it('a primeira linha de tokens.css é a marca de arquivo gerado', () => {
    expect(tokensCss.split(/\r?\n/)[0]).toBe(
      '/* Gerado de web/DESIGN.md por designmd export; não editar à mão */',
    )
  })

  it('o bloco @theme tem as 22 cores do DESIGN.md', () => {
    expect(Object.keys(cores).sort()).toEqual(
      [
        'primary', 'neutral', 'accent', 'on-accent', 'secondary', 'info', 'line', 'focus', 'paper-deep',
        'field-1', 'field-2',
        'night-primary', 'night-neutral', 'night-accent', 'night-on-accent', 'night-secondary', 'night-info',
        'night-line', 'night-focus', 'night-paper-deep',
        'night-field-1', 'night-field-2',
      ].sort(),
    )
  })

  const paresDeTexto: Array<[string, string]> = [
    ['primary', 'neutral'],
    ['on-accent', 'accent'],
    ['accent', 'neutral'],
    ['info', 'neutral'],
    ['night-primary', 'night-neutral'],
    ['night-on-accent', 'night-accent'],
    ['night-accent', 'night-neutral'],
    ['night-info', 'night-neutral'],
    ['secondary', 'neutral'],
    ['secondary', 'paper-deep'],
    ['night-secondary', 'night-neutral'],
    ['night-primary', 'night-paper-deep'],
    ['primary', 'field-1'],
    ['primary', 'field-2'],
    ['night-primary', 'night-field-1'],
    ['night-primary', 'night-field-2'],
  ]
  for (const [texto, fundo] of paresDeTexto) {
    it(`${texto} sobre ${fundo} tem contraste de pelo menos 4,5`, () => {
      expect(contraste(cores[texto], cores[fundo])).toBeGreaterThanOrEqual(4.5)
    })
  }

  const paresDeFoco: Array<[string, string]> = [
    ['focus', 'neutral'],
    ['focus', 'accent'],
    ['night-focus', 'night-neutral'],
    ['night-focus', 'night-accent'],
    ['focus', 'field-1'],
    ['focus', 'field-2'],
    ['night-focus', 'night-field-1'],
    ['night-focus', 'night-field-2'],
  ]
  for (const [foco, fundo] of paresDeFoco) {
    it(`${foco} contra ${fundo} tem contraste de pelo menos 3`, () => {
      expect(contraste(cores[foco], cores[fundo])).toBeGreaterThanOrEqual(3)
    })
  }

  it('as linhas usam a cor da tinta', () => {
    expect(cores.line).toBe(cores.primary)
    expect(cores['night-line']).toBe(cores['night-primary'])
  })

  it('o papel é claro e quente, não branco', () => {
    const [r, , b] = canais(cores.neutral)
    expect(luminancia(cores.neutral)).toBeGreaterThanOrEqual(0.85)
    expect(r).toBeGreaterThan(b)
    expect(cores.neutral).not.toBe('#ffffff')
  })

  it('a tinta é quase preta, não preta', () => {
    expect(luminancia(cores.primary)).toBeLessThanOrEqual(0.03)
    expect(cores.primary).not.toBe('#000000')
  })

  it('o fundo da madrugada é escuro e quente', () => {
    const [r, , b] = canais(cores['night-neutral'])
    expect(luminancia(cores['night-neutral'])).toBeLessThanOrEqual(0.02)
    expect(r).toBeGreaterThanOrEqual(b)
  })

  it('o urucum da madrugada tem o mesmo matiz do urucum do dia (até 10°)', () => {
    expect(diferencaDeMatiz(cores.accent, cores['night-accent'])).toBeLessThanOrEqual(10)
  })
})

// ---------------------------------------------------------------------------
// Limites do CSS (VIS-02 e VIS-08)

const fontes = listarFontes(pastaSrc)
const arquivosCss = fontes.filter((f) => f.nome.endsWith('.css'))
const arquivosTsx = fontes.filter((f) => f.nome.endsWith('.tsx'))

describe('limites do CSS', () => {
  it('encontra os arquivos que deve verificar', () => {
    const nomes = fontes.map((f) => f.nome)
    expect(nomes).toEqual(expect.arrayContaining(['index.css', 'styles/tokens.css', 'styles/tema.css']))
    expect(arquivosTsx.length).toBeGreaterThan(5)
  })

  const proibidos: Array<[string, RegExp]> = [
    ['gradiente', /gradient\(/],
    ['backdrop-filter', /backdrop-filter/],
    ['backdrop-blur', /backdrop-blur/],
    ['filter: blur', /filter\s*:\s*blur/],
    ['blur(', /blur\(/],
    ['classe blur-', /(^|[^\w])blur-/],
    ['classe shadow- (exceto shadow-none)', /(^|[^\w-])shadow-(?!none)/],
    ['<img', /<img/],
    ['imagem raster', /\.(png|jpe?g|webp)\b/],
    ['paralaxe ou rolagem ligada à animação', /animation-timeline|scroll-timeline|background-attachment\s*:\s*fixed|scroll-snap/],
    ['rolagem suave sequestrada', /scroll-behavior\s*:\s*smooth/],
  ]
  for (const [nome, regex] of proibidos) {
    it(`nenhum arquivo de web/src usa ${nome}`, () => {
      const achados = fontes.filter((f) => regex.test(f.texto)).map((f) => f.nome)
      expect(achados).toEqual([])
    })
  }

  it('box-shadow só existe com desfoque de até 4 px', () => {
    for (const { nome, texto } of arquivosCss) {
      for (const [, valor] of texto.matchAll(/box-shadow\s*:\s*([^;}]+)/g)) {
        if (valor.trim() === 'none') continue
        const medidas = valor.split(/[\s,]+/).filter((t) => /^-?\d/.test(t))
        const desfoque = parseFloat(medidas[2] ?? '0')
        expect(desfoque, `${nome}: ${valor}`).toBeLessThanOrEqual(4)
      }
    }
  })

  it('zera animações e transições com prefers-reduced-motion', () => {
    const bloco = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}\s*$/.exec(estiloGlobal)
    expect(bloco).not.toBeNull()
    expect(bloco![1]).toMatch(/animation:\s*none\s*!important/)
    expect(bloco![1]).toMatch(/transition:\s*none\s*!important/)
  })

  it('a entrada dos blocos dura até 300 ms e desloca até 16 px', () => {
    const animacoes = [...estiloGlobal.matchAll(/animation\s*:\s*([^;]+);/g)]
      .map((m) => m[1])
      .filter((valor) => !/^\s*none\b/.test(valor))
    expect(animacoes.length).toBeGreaterThan(0)
    for (const valor of animacoes) {
      const duracao = /(\d+(?:\.\d+)?)(ms|s)\b/.exec(valor)
      expect(duracao, valor).not.toBeNull()
      const ms = parseFloat(duracao![1]) * (duracao![2] === 's' ? 1000 : 1)
      expect(ms, valor).toBeLessThanOrEqual(300)
    }
    const deslocamentos = [...estiloGlobal.matchAll(/translate[XY]?\(\s*(-?\d+(?:\.\d+)?)px/g)].map((m) =>
      Math.abs(parseFloat(m[1])),
    )
    expect(deslocamentos.length).toBeGreaterThan(0)
    for (const px of deslocamentos) expect(px).toBeLessThanOrEqual(16)
  })

  it('o corpo do texto é o `corpo` do sistema-base: 20/28 (17/24 abaixo de 768)', () => {
    const body = /(?:^|[\s}])body\s*\{([^}]*)\}/.exec(estiloGlobal)
    expect(body).not.toBeNull()
    const tamanho = /font-size:\s*(\d+(?:\.\d+)?)(rem|px)/.exec(body![1])
    expect(tamanho).not.toBeNull()
    const px = parseFloat(tamanho![1]) * (tamanho![2] === 'rem' ? 16 : 1)
    expect(px).toBe(20)
    expect(body![1]).toMatch(/line-height:\s*1\.75rem/)
    const celular = /@media\s*\(max-width:\s*767px\)\s*\{\s*body\s*\{([^}]*)\}/.exec(estiloGlobal)
    expect(celular).not.toBeNull()
    expect(celular![1]).toMatch(/font-size:\s*1\.0625rem/)
    expect(celular![1]).toMatch(/line-height:\s*1\.5rem/)
  })

  it('o body usa as variáveis de uso e a fonte de texto', () => {
    const body = /(?:^|[\s}])body\s*\{([^}]*)\}/.exec(estiloGlobal)![1]
    expect(body).toMatch(/background-color:\s*var\(--cor-fundo\)/)
    expect(body).toMatch(/(?:^|[\s;])color:\s*var\(--cor-texto\)/)
    expect(body).toMatch(/font-family:\s*var\(--fonte-texto\)/)
  })

  it('todo elemento focável tem contorno de foco de 2 px', () => {
    expect(estiloGlobal).toMatch(
      /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--cor-foco\);[^}]*outline-offset:\s*2px/,
    )
  })

  it('importa o Tailwind, os tokens, o tema e só o subconjunto latin das fontes', () => {
    const importados = [...estiloGlobal.matchAll(/@import\s+'([^']+)'/g)].map((m) => m[1])
    expect(importados).toEqual([
      'tailwindcss',
      './styles/tokens.css',
      './styles/tema.css',
      '@fontsource/fraunces/latin-400.css',
      '@fontsource/fraunces/latin-600.css',
      '@fontsource/fraunces/latin-800.css',
      '@fontsource/fraunces/latin-400-italic.css',
      '@fontsource/instrument-sans/latin-400.css',
      '@fontsource/instrument-sans/latin-500.css',
      '@fontsource/instrument-sans/latin-600.css',
      '@fontsource/instrument-serif/latin-400.css',
      '@fontsource/zilla-slab/latin-700.css',
    ])
  })

  it('a face Fraunces normal 400 (display-m, 2.2) está carregada, só no subset latin, e o pacote a declara como normal 400', () => {
    const importados = [...estiloGlobal.matchAll(/@import\s+'([^']+)'/g)].map((m) => m[1])
    expect(importados).toContain('@fontsource/fraunces/latin-400.css')
    // Os pesos que já existiam seguem carregados.
    for (const peso of ['latin-600', 'latin-800', 'latin-400-italic']) {
      expect(importados, peso).toContain(`@fontsource/fraunces/${peso}.css`)
    }
    // Só o subset latin, e nenhuma família de Fraunces fora do que o contrato usa.
    const fraunces = importados.filter((i) => i.startsWith('@fontsource/fraunces/'))
    expect(fraunces.every((i) => /\/latin-\d+(-italic)?\.css$/.test(i)), fraunces.join(', ')).toBe(true)
    const face = readFileSync(pastaSrc + '../node_modules/@fontsource/fraunces/latin-400.css', 'utf8')
    expect(face).toMatch(/font-family:\s*'Fraunces'/)
    expect(face).toMatch(/font-style:\s*normal/)
    expect(face).toMatch(/font-weight:\s*400/)
  })

  it('o display-m pede Fraunces normal 400, e é essa a face que o import novo entrega', () => {
    const display = /\.t-display-m\s*\{([^}]*)\}/.exec(semComentarios)
    expect(display).not.toBeNull()
    expect(display![1]).toMatch(/font-family:\s*var\(--fonte-sb-titulo\)/)
    expect(display![1]).toMatch(/font-weight:\s*400/)
    expect(display![1]).not.toMatch(/font-style:\s*italic/)
    expect(estiloGlobal.includes("@import '@fontsource/fraunces/latin-400.css';"), 'index.css importa a face 400 normal').toBe(true)
  })

  it('há de 3 a 6 ilustrações distintas (data-ilustracao), todas decorativas', () => {
    const svgs = arquivosTsx.flatMap((f) => [...f.texto.matchAll(/<svg\b[^>]*>/g)].map((m) => m[0]))
    expect(svgs.length).toBeGreaterThan(0)
    const nomes = new Set(svgs.map((abertura) => /data-ilustracao="([^"]+)"/.exec(abertura)?.[1]))
    expect(nomes.has(undefined), 'todo <svg> do produto é uma ilustração com data-ilustracao').toBe(false)
    expect(nomes.size).toBeGreaterThanOrEqual(3)
    expect(nomes.size).toBeLessThanOrEqual(6)
    for (const abertura of svgs) expect(abertura).toContain('aria-hidden="true"')
  })
})

describe('tema', () => {
  const usos = [
    'cor-fundo', 'cor-texto', 'cor-destaque', 'cor-sobre-destaque', 'cor-info',
    'cor-linha', 'cor-foco', 'cor-papel-fundo', 'cor-campo-sessao',
  ]
  const claro = /:root\s*\{([^}]*)\}/.exec(temaCss)![1]
  const madrugada = /\[data-tema=['"]madrugada['"]\]\s*\{([^}]*)\}/.exec(temaCss)![1]

  it('define as variáveis de uso do tema claro com as cores do dia', () => {
    for (const uso of usos) {
      expect(claro, uso).toMatch(new RegExp(`--${uso}:\\s*var\\(--color-(?!night-)[a-z0-9-]+\\)`))
    }
  })

  it('o bloco data-tema="madrugada" aponta as mesmas variáveis para as cores da noite', () => {
    for (const uso of usos) {
      expect(madrugada, uso).toMatch(new RegExp(`--${uso}:\\s*var\\(--color-night-[a-z0-9-]+\\)`))
    }
  })

  it('a madrugada aumenta o alvo rápido para 56 px', () => {
    expect(claro).toMatch(/--alvo-rapido:\s*48px/)
    expect(madrugada).toMatch(/--alvo-rapido:\s*56px/)
  })

  it('os componentes usam só as variáveis de uso, nunca --color-* nem hex', () => {
    const consumidores = fontes.filter(
      (f) => f.nome !== 'styles/tokens.css' && f.nome !== 'styles/tema.css',
    )
    const achados = consumidores
      .filter((f) => /--color-|#[0-9a-fA-F]{3,8}\b/.test(f.texto))
      .map((f) => f.nome)
    expect(achados).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Regras de layout que o jsdom não mede: conferidas no texto do CSS.

const semComentarios = estiloGlobal.replace(/\/\*[\s\S]*?\*\//g, '')

/** Todas as regras "seletor { corpo }" (sem aninhamento), com o seletor já aparado. */
function regras(css: string): Array<{ seletor: string; corpo: string }> {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, seletor, corpo]) => ({
    seletor: seletor.trim().replace(/\s+/g, ' '),
    corpo,
  }))
}

/** O corpo das regras cujo seletor é exatamente `seletor` (sem agrupar com outros). */
function corposDe(seletor: string): string[] {
  return regras(semComentarios)
    .filter((r) => r.seletor === seletor)
    .map((r) => r.corpo)
}

/** O corpo da regra cujo seletor agrupado contém todos os `trechos`. */
function corpoAgrupado(...trechos: string[]): string | undefined {
  return regras(semComentarios).find((r) => trechos.every((t) => r.seletor.split(/\s*,\s*/).includes(t)))?.corpo
}

describe('G3-1: alvo de toque', () => {
  it('uma regra única dá 44 × 44 px a .alvo-toque, .botao e .nav-item', () => {
    const corpo = corpoAgrupado('.alvo-toque', '.botao', '.nav-item')
    expect(corpo).toBeDefined()
    expect(corpo).toMatch(/min-width:\s*44px/)
    expect(corpo).toMatch(/min-height:\s*44px/)
  })

  it('nenhuma regra isolada reduz o alvo dessas classes', () => {
    for (const seletor of ['.botao', '.nav-item', '.alvo-toque']) {
      for (const corpo of corposDe(seletor)) {
        // `.nav-item` tem min-width: 0 de propósito (R1): é a rede de segurança contra o vazamento
        // do rótulo. A largura de 44 px é garantida pelo contêiner (22 rem ou mais = colunas de
        // pelo menos 69 px; abaixo disso a nav vira uma coluna). A altura continua valendo.
        if (seletor !== '.nav-item') expect(corpo, seletor).not.toMatch(/min-width:\s*0\b/)
        const altura = /min-height:\s*(\d+)px/.exec(corpo)
        if (altura) expect(Number(altura[1]), seletor).toBeGreaterThanOrEqual(44)
      }
    }
  })
})

describe('G3-2: barra de baixo', () => {
  it('não depende de media query de altura (ela usa o tamanho inicial da fonte)', () => {
    expect(semComentarios).not.toMatch(/@media\s*\(\s*max-height/)
  })

  it('só .barra-fixa é sticky; .barra-inferior sozinha fica no fluxo', () => {
    expect(corposDe('.barra-fixa').join('')).toMatch(/position:\s*sticky/)
    expect(corposDe('.barra-fixa').join('')).toMatch(/bottom:\s*0/)
    expect(corposDe('.barra-inferior').join('')).not.toMatch(/position:\s*sticky/)
  })
})

describe('G3-3: respiro da navegação inferior', () => {
  it('.nav-inferior reserva pelo menos 6 px embaixo, ou a área segura do aparelho', () => {
    expect(corposDe('.nav-inferior').join('')).toMatch(
      /padding-bottom:\s*max\(\s*6px\s*,\s*env\(safe-area-inset-bottom\)\s*\)/,
    )
  })
})

describe('G4-2: tipografia sem repetição', () => {
  it('.etiqueta não declara tipografia (vem de .rotulo)', () => {
    const corpo = corposDe('.etiqueta').join('')
    expect(corpo).not.toBe('')
    for (const propriedade of ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform']) {
      expect(corpo, propriedade).not.toContain(propriedade)
    }
  })

  it('a família de exibição e o espaçamento dos títulos são declarados uma vez só', () => {
    const conta = (padrao: RegExp) => (semComentarios.match(padrao) ?? []).length
    expect(conta(/font-family:\s*var\(--fonte-exibicao\)/g)).toBe(1)
    expect(conta(/letter-spacing:\s*-0\.01em/g)).toBe(1)
    expect(conta(/letter-spacing:\s*-0\.02em/g)).toBe(1)
  })

  it('o grupo da família de exibição cobre todas as classes de exibição', () => {
    const corpo = regras(semComentarios).find((r) => /font-family:\s*var\(--fonte-exibicao\)/.test(r.corpo))
    const seletores = corpo!.seletor.split(/\s*,\s*/)
    expect(seletores).toEqual(
      expect.arrayContaining(['.marca', '.promessa', '.titulo-secao', '.titulo-tela', '.titulo-linha', '.numero-fato', '.nota-italico']),
    )
  })
})

describe('D1: madrugada sem ponto claro', () => {
  it('um botão com aria-pressed="true" não usa a cor do texto como fundo', () => {
    const ligados = regras(semComentarios).filter((r) => /aria-pressed=['"]true['"]/.test(r.seletor))
    expect(ligados.length).toBeGreaterThan(0)
    for (const { seletor, corpo } of ligados) {
      expect(corpo, seletor).not.toMatch(/background(-color)?:\s*var\(--cor-texto\)/)
    }
  })

  it('o estado ligado é papel fundo, contorno de 2 px em destaque e texto na cor do texto', () => {
    const corpo = regras(semComentarios)
      .filter((r) => /\[aria-pressed=['"]true['"]\]/.test(r.seletor))
      .map((r) => r.corpo)
      .join('')
    expect(corpo).toMatch(/background-color:\s*var\(--cor-papel-fundo\)/)
    expect(corpo).toMatch(/border(?:-color)?:[^;]*var\(--cor-destaque\)/)
    expect(corpo).toMatch(/border(?:-width)?:\s*2px/)
    expect(corpo).toMatch(/(?:^|[\s;])color:\s*var\(--cor-texto\)/)
  })

  it('nenhuma regra da madrugada usa texto ou foco claros como fundo', () => {
    const daMadrugada = [...regras(semComentarios), ...regras(temaCss)].filter((r) => /data-tema/.test(r.seletor))
    expect(daMadrugada.length).toBeGreaterThan(0)
    for (const { seletor, corpo } of daMadrugada) {
      expect(corpo, seletor).not.toMatch(/background(-color)?:\s*var\(--(cor-texto|color-night-primary|color-night-focus|cor-foco)\)/)
    }
  })
})

describe('D2: coluna única das telas logadas', () => {
  it('.coluna-app tem largura máxima de 40 rem e fica centrada', () => {
    const corpo = corposDe('.coluna-app').join('')
    expect(corpo).toMatch(/max-width:\s*40rem/)
    expect(corpo).toMatch(/margin-inline:\s*auto/)
  })

  it('a partir de 48 rem a coluna ganha linhas verticais de 1 px na cor da linha', () => {
    const bloco = /@media\s*\(\s*min-width:\s*48rem\s*\)\s*\{\s*\.coluna-app\s*\{([^}]*)\}/.exec(semComentarios)
    expect(bloco).not.toBeNull()
    expect(bloco![1]).toMatch(/border-inline:\s*1px solid var\(--cor-linha\)/)
  })
})

describe('D5: hifenização da navegação', () => {
  it('.nav-item usa hifens manuais; só o modificador .nav-item-hifeniza hifeniza', () => {
    const corpo = corposDe('.nav-item').join('')
    expect(corpo).toMatch(/hyphens:\s*manual/)
    expect(corpo).not.toMatch(/hyphens:\s*auto/)
    expect(corposDe('.nav-item-hifeniza').join('')).toMatch(/hyphens:\s*auto/)
  })
})

describe('R1: navegação em uma coluna quando os rótulos não cabem', () => {
  it('.nav-item tem min-width: 0 e overflow-wrap: anywhere (a quebra nunca vaza da coluna)', () => {
    const corpo = corposDe('.nav-item').join('')
    expect(corpo).toMatch(/min-width:\s*0\b/)
    expect(corpo).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('um ancestral da navegação declara container-type: inline-size', () => {
    expect(corposDe('.barra-inferior').join('')).toMatch(/container-type:\s*inline-size/)
  })

  it('abaixo de 22rem do contêiner, @container põe .nav-inferior numa coluna', () => {
    const bloco = /@container\s*\(\s*max-width:\s*22rem\s*\)\s*\{\s*\.nav-inferior\s*\{([^}]*)\}/.exec(semComentarios)
    expect(bloco).not.toBeNull()
    expect(bloco![1]).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
  })

  it('na coluna única, a legenda e os itens perdem a posição explícita da grade de 5', () => {
    const bloco = /@container\s*\(\s*max-width:\s*22rem\s*\)\s*\{[\s\S]*?\.nav-legenda,\s*\.nav-item\s*\{([^}]*)\}/.exec(
      semComentarios,
    )
    expect(bloco).not.toBeNull()
    expect(bloco![1]).toMatch(/grid-column:\s*auto/)
    expect(bloco![1]).toMatch(/grid-row:\s*auto/)
  })

  it('na grade de 5 colunas a posição é explícita no CSS: legenda na linha 1, itens na linha 2', () => {
    expect(corposDe('.nav-legenda').join('')).toMatch(/grid-row:\s*1\b/)
    expect(corposDe('.nav-item').join('')).toMatch(/grid-row:\s*2\b/)
  })

  it('os traços do colchete não aparecem na coluna única', () => {
    const bloco = /@container\s*\(\s*max-width:\s*22rem\s*\)\s*\{[\s\S]*?\.nav-legenda::before,\s*\.nav-legenda::after\s*\{([^}]*)\}/.exec(
      semComentarios,
    )
    expect(bloco).not.toBeNull()
    expect(bloco![1]).toMatch(/display:\s*none/)
  })
})

describe('R3/W1: contorno de foco dos alvos de foco por programa, só para teclado', () => {
  it('.alvo-foco:focus-visible tem contorno de 2 px na cor de foco e afastamento de 2 px', () => {
    const corpo = regras(semComentarios)
      .filter((r) => r.seletor === '.alvo-foco:focus-visible')
      .map((r) => r.corpo)
      .join('')
    expect(corpo).toMatch(/outline:\s*2px solid var\(--cor-foco\)/)
    expect(corpo).toMatch(/outline-offset:\s*2px/)
  })

  it('não existe seletor .alvo-foco:focus sem o -visible (mouse e toque não desenham caixa)', () => {
    const seletores = regras(semComentarios).map((r) => r.seletor)
    expect(seletores.filter((s) => /\.alvo-foco:focus(?!-visible)/.test(s))).toEqual([])
  })
})

describe('D6: cronômetro grande', () => {
  it('.cronometro vai de 4,5 rem a 8 rem, com números tabulares', () => {
    const corpo = corposDe('.cronometro').join('')
    expect(corpo).toMatch(/font-size:\s*clamp\(\s*4\.5rem\s*,\s*21vw\s*,\s*8rem\s*\)/)
    expect(corpo).toMatch(/line-height:\s*1\s*;/)
    expect(corpo).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })

  it('a miniatura tem um modificador menor, que vem depois', () => {
    const lista = regras(semComentarios).map((r) => r.seletor)
    expect(lista.indexOf('.cronometro-mini')).toBeGreaterThan(lista.indexOf('.cronometro'))
    expect(corposDe('.cronometro-mini').join('')).toMatch(/font-size:\s*clamp\(/)
  })
})

describe('D7: legenda "Em breve"', () => {
  it('ocupa as colunas 2 a 5, alinhada à esquerda, com uma linha de 1 px embaixo', () => {
    const corpo = corposDe('.nav-legenda').join('')
    expect(corpo).toMatch(/grid-column:\s*2\s*\/\s*span 4/)
    expect(corpo).toMatch(/text-align:\s*left/)
    expect(corpo).not.toMatch(/text-align:\s*center/)
    expect(corpo).toMatch(/border-bottom:\s*1px solid var\(--cor-linha\)/)
  })
})

// ---------------------------------------------------------------------------
// Sistema-base (MAT-44d): o contrato da seção 2, conferido no texto do CSS novo (classes t-, sb-,
// grade- e col-). O que o navegador mede (G1 a G12) está em web/scripts/medir-dom.mjs.

describe('sistema-base: tipo, forma e espaço do CSS novo', () => {
  const novas = regras(semComentarios).filter((r) =>
    r.seletor.split(/\s*,\s*/).some((s) => /^\.(t|sb|grade|col)-/.test(s)),
  )
  const valoresDe = (propriedade: string) =>
    novas.flatMap((r) =>
      [...r.corpo.matchAll(new RegExp(`(?:^|[;\\s])${propriedade}\\s*:\\s*([^;]+)`, 'g'))].map((m) => ({
        seletor: r.seletor,
        valor: m[1].trim(),
      })),
    )
  const FONTES_PERMITIDAS = new Set([15, 17, 20, 24, 28, 32, 36, 48, 56, 72, 80, 88, 96, 112, 224])
  const emPx = (valor: string): number | null => {
    const m = /^(\d*\.?\d+)(rem|px)$/.exec(valor)
    return m ? parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1) : null
  }

  it('encontra as regras novas', () => {
    expect(novas.length).toBeGreaterThan(50)
  })

  it('nenhuma caixa alta e nenhum tracking diferente de 0', () => {
    expect(valoresDe('text-transform')).toEqual([])
    for (const { seletor, valor } of valoresDe('letter-spacing')) expect(valor, seletor).toBe('0')
  })

  it('todo font-size está no conjunto do item 2.2; só o nome do rodapé é fluido', () => {
    const fora = valoresDe('font-size')
      .filter(({ seletor, valor }) => !(seletor.includes('.sb-rodape-nome') && valor.startsWith('calc(100cqw')))
      .filter(({ valor }) => !FONTES_PERMITIDAS.has(emPx(valor) ?? -1))
    expect(fora).toEqual([])
  })

  it('a escala de tipo tem os 14 tokens, com o peso e a família do item 2.2', () => {
    const corpo = (classe: string) => novas.find((r) => r.seletor === classe)!.corpo
    const esperado: Array<[string, number, number, number]> = [
      ['.t-display-xl', 96, 96, 600], ['.t-display-m', 72, 72, 400], ['.t-citacao', 48, 58, 400],
      ['.t-secao', 56, 67, 400], ['.t-subtitulo', 48, 58, 400], ['.t-rotulo', 32, 38, 400],
      ['.t-nav-grande', 88, 88, 400], ['.t-corpo-g', 28, 39, 400], ['.t-corpo', 20, 28, 400],
      ['.t-corpo-p', 17, 24, 400], ['.t-ui', 15, 21, 400], ['.t-numero', 112, 90, 700],
      ['.t-cronometro', 224, 180, 700], ['.t-botao', 24, 24, 600],
    ]
    for (const [classe, tamanho, entrelinha, peso] of esperado) {
      const c = corpo(classe)
      expect(emPx(/font-size:\s*([^;]+)/.exec(c)![1].trim()), classe).toBe(tamanho)
      expect(Math.round(emPx(/line-height:\s*([^;]+)/.exec(c)![1].trim())!), classe).toBe(entrelinha)
      expect(Number(/font-weight:\s*(\d+)/.exec(c)![1]), classe).toBe(peso)
    }
    expect(corpo('.t-numero')).toMatch(/font-variant-numeric:\s*tabular-nums/)
  })

  it('os números em Zilla Slab pedem algarismos de capitular e tabulares (sem lining-nums o 7 desce e o 2 e o 0 ficam na altura do x)', () => {
    const corpoDe = (classe: string) => novas.find((r) => r.seletor === classe)!.corpo
    for (const classe of ['.t-numero', '.t-cronometro']) {
      const variante = /font-variant-numeric:\s*([^;]+)/.exec(corpoDe(classe))
      expect(variante, `${classe} declara font-variant-numeric`).not.toBeNull()
      expect(variante![1], classe).toMatch(/\blining-nums\b/)
      expect(variante![1], classe).toMatch(/\btabular-nums\b/)
      expect(variante![1], classe).not.toMatch(/oldstyle-nums/)
    }
  })

  it('toda regra do CSS e dos componentes que põe número na Zilla Slab pede lining-nums', () => {
    // `--fonte-sb-slab` é o único caminho para a Zilla Slab; quem o usa tem de pedir lining-nums.
    const usam = regras(semComentarios).filter((r) => /var\(--fonte-sb-slab\)/.test(r.corpo))
    expect(usam.map((r) => r.seletor).sort()).toEqual(['.t-cronometro', '.t-numero'])
    for (const { seletor, corpo } of usam) expect(corpo, seletor).toMatch(/font-variant-numeric:[^;]*\blining-nums\b/)
    // Nenhum componente nomeia a família nem a variável: a fonte dos números vem só das duas classes.
    const fora = arquivosTsx.filter((f) => /fonte-sb-slab|fontFamily|font-\[/.test(f.texto)).map((f) => f.nome)
    expect(fora).toEqual([])
  })

  it('sem sombra, sem filtro de fundo e com raio só em 0, 4, 8 e 50%', () => {
    expect(valoresDe('box-shadow')).toEqual([])
    expect(valoresDe('backdrop-filter')).toEqual([])
    for (const { seletor, valor } of valoresDe('border-radius')) expect(['0', '4px', '8px', '50%'], `${seletor}: ${valor}`).toContain(valor)
  })

  it('a grade é de 10 colunas iguais sem calha, e de 1 coluna abaixo de 768', () => {
    expect(corposDe('.grade-10').join('')).toMatch(/grid-template-columns:\s*repeat\(10,\s*minmax\(0,\s*1fr\)\)/)
    const celular = /@media\s*\(max-width:\s*767px\)\s*\{\s*\.grade-10\s*\{([^}]*)\}/.exec(semComentarios)
    expect(celular![1]).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(corposDe('.grade-10').join('')).not.toMatch(/(?:^|[;\s])gap:/)
    for (const [classe, colunas] of [
      ['.col-c1-c10', '1 / 11'], ['.col-c2-c8', '2 / 9'], ['.col-c4-c8', '4 / 9'],
      ['.col-c1-c8', '1 / 9'], ['.col-c9-c10', '9 / 11'], ['.col-c2-c3', '2 / 4'],
    ] as const) {
      expect(corposDe(classe).join(''), classe).toContain(`grid-column: ${colunas}`)
    }
  })

  it('a margem é 32, 24 e 16 px e a área útil vai a 1600 (640 abaixo de 768)', () => {
    const raiz = corposDe(':root').join('')
    expect(raiz).toMatch(/--margem:\s*32px/)
    expect(raiz).toMatch(/--area-util:\s*1600px/)
    expect(semComentarios).toMatch(/@media\s*\(max-width:\s*991px\)\s*\{\s*:root\s*\{[^}]*--margem:\s*24px/)
    expect(semComentarios).toMatch(/@media\s*\(max-width:\s*767px\)\s*\{\s*:root\s*\{[^}]*--margem:\s*16px[^}]*--area-util:\s*640px/)
  })

  it('o ritmo vertical (tabela 2.4) usa só valores da escala e os do celular', () => {
    const permitidos = new Set([8, 16, 24, 32, 48, 64, 96, 128, 160, 192])
    const blocos = [...semComentarios.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1])
    const medidas = blocos.flatMap((b) => [...b.matchAll(/--e-([a-z0-9-]+):\s*(\d+)px/g)])
    expect(medidas.length).toBeGreaterThan(15)
    for (const [, nome, valor] of medidas) {
      if (nome === 'cabecalho') expect([60, 64]).toContain(Number(valor))
      else expect(permitidos.has(Number(valor)), `--e-${nome}: ${valor}`).toBe(true)
    }
    const raiz = corposDe(':root').join('')
    for (const [nome, valor] of [
      ['cab-h1', 64], ['h1-sub', 8], ['fio-bloco', 32], ['midia-titulo', 128], ['par-numeros', 96],
      ['numeros-midia', 128], ['midia-linhas', 160], ['linhas', 32], ['rodape', 192],
    ] as const) {
      expect(raiz, nome).toContain(`--e-${nome}: ${valor}px`)
    }
  })

  it('o alvo de toque do cabeçalho, do menu e do rodapé vem de --alvo-toque (44 px; 56 na madrugada)', () => {
    expect(temaCss).toMatch(/:root\s*\{[^}]*--alvo-toque:\s*44px/)
    expect(temaCss).toMatch(/\[data-tema-local=['"]madrugada['"]\][^{]*\{[^}]*--alvo-toque:\s*56px/)
    for (const seletor of ['.sb-cab-link', '.sb-submenu-gatilho', '.sb-cab-nome', '.sb-rodape-link', '.sb-menu-link']) {
      const corpo = regras(semComentarios).find((r) => r.seletor.split(/\s*,\s*/).includes(seletor))!.corpo
      expect(corpo, seletor).toMatch(/min-height:\s*(var\(--alvo-toque\)|64px)/)
    }
    expect(corposDe('.sb-campo-olho').join('')).toMatch(/width:\s*44px[\s\S]*height:\s*var\(--alvo-toque\)/)
  })

  it('o cabeçalho é fixo no topo, opaco e sem fio embaixo; o rodapé é de borda a borda', () => {
    const cabecalho = corposDe('.sb-cabecalho').join('')
    expect(cabecalho).toMatch(/position:\s*sticky/)
    expect(cabecalho).toMatch(/top:\s*0/)
    expect(cabecalho).toMatch(/background-color:\s*var\(--cor-fundo\)/)
    expect(cabecalho).not.toMatch(/border/)
    const rodape = corposDe('.sb-rodape').join('')
    expect(rodape).toMatch(/background-color:\s*var\(--cor-rodape\)/)
    expect(rodape).not.toMatch(/(max-)?width:/)
  })

  it('o foco do h1 com tabIndex=-1 não mostra contorno, e o resto usa o anel de 2 px', () => {
    expect(regras(semComentarios).some((r) => r.seletor === 'h1:focus' && /outline:\s*none/.test(r.corpo))).toBe(true)
  })

  it('o fio de campo na madrugada é sólido (cor do texto) e os outros fios usam --cor-fio-suave', () => {
    expect(corposDe('.sb-campo-controle').join('')).toMatch(/border-bottom:\s*1px solid var\(--cor-texto\)/)
    expect(corposDe('.sb-fio-h').join('')).toMatch(/background-color:\s*var\(--cor-fio-suave\)/)
    expect(temaCss).toMatch(/--cor-fio-suave:\s*color-mix\(in srgb,\s*var\(--color-night-line\)\s*20%,\s*transparent\)/)
  })
})

// ---------------------------------------------------------------------------
// Rodada de correção 3 (D2, D3, D5): faixa de números, abertura e fio das linhas. O que depende de
// geometria (y do fio, x das etiquetas, legenda em 1 linha) é medido no navegador por
// `.oc/geo.mjs`; aqui ficam as regras de CSS lidas como texto, separando o que vale a partir de 768
// (fora da media query) do que vale abaixo (dentro de `@media (max-width: 767px)`).

/** O texto de dentro de cada bloco `@media` cuja consulta casa com `consulta` (chaves balanceadas). */
function blocosDeMedia(css: string, consulta: RegExp): string[] {
  const achados: string[] = []
  const abertura = /@media[^{]*\{/g
  for (let m = abertura.exec(css); m; m = abertura.exec(css)) {
    let nivel = 1
    let i = abertura.lastIndex
    while (i < css.length && nivel > 0) {
      if (css[i] === '{') nivel += 1
      else if (css[i] === '}') nivel -= 1
      i += 1
    }
    if (consulta.test(m[0])) achados.push(css.slice(abertura.lastIndex, i - 1))
  }
  return achados
}

/** O CSS sem nenhum bloco `@media`: as regras de base (de 768 para cima, o desktop primeiro). */
function semMedia(css: string): string {
  let resto = css
  for (let m = /@media[^{]*\{/.exec(resto); m; m = /@media[^{]*\{/.exec(resto)) {
    let nivel = 1
    let i = m.index + m[0].length
    while (i < resto.length && nivel > 0) {
      if (resto[i] === '{') nivel += 1
      else if (resto[i] === '}') nivel -= 1
      i += 1
    }
    resto = resto.slice(0, m.index) + resto.slice(i)
  }
  return resto
}

describe('rodada 3: faixa de números, abertura e linhas (regras de CSS)', () => {
  const base = semMedia(semComentarios)
  const celular = blocosDeMedia(semComentarios, /max-width:\s*767px/).join('\n')
  const corpoBase = (seletor: string) => regras(base).filter((r) => r.seletor === seletor).map((r) => r.corpo).join('')
  const corpoCelular = (seletor: string) => regras(celular).filter((r) => r.seletor === seletor).map((r) => r.corpo).join('')

  it('o auxiliar separa o que vale de 768 para cima do que vale abaixo', () => {
    expect(celular).toMatch(/\.sb-numeros-item/)
    expect(corpoBase('.sb-numeros')).toMatch(/repeat\(3,\s*minmax\(0,\s*1fr\)\)/)
    expect(corpoBase('.sb-numeros')).not.toMatch(/@media/)
  })

  describe('D2: a faixa de números empilha abaixo de 768', () => {
    it('de 768 para cima não muda: 3 colunas, fio no topo da faixa e 2 verticais entre os itens', () => {
      expect(corpoBase('.sb-numeros')).toMatch(/border-top:\s*1px solid var\(--cor-fio-suave\)/)
      expect(corpoBase('.sb-numeros-item')).toMatch(/padding:\s*32px 32px 32px 0/)
      const vertical = corpoBase('.sb-numeros-item + .sb-numeros-item')
      expect(vertical).toMatch(/border-left:\s*1px solid var\(--cor-fio-suave\)/)
      expect(vertical).toMatch(/padding-left:\s*32px/)
      expect(corpoBase('.sb-numeros-item')).not.toMatch(/border-top/)
    })

    it('abaixo de 768 os 3 itens ficam numa coluna só, com 24 px entre eles', () => {
      const faixa = corpoCelular('.sb-numeros')
      expect(faixa, 'regra de .sb-numeros abaixo de 768').not.toBe('')
      expect(faixa).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
      expect(faixa).toMatch(/(?:row-)?gap:\s*24px/)
    })

    it('abaixo de 768 cada item leva o seu fio no topo, e a faixa deixa de ter o fio único', () => {
      expect(corpoCelular('.sb-numeros')).toMatch(/border-top:\s*0/)
      expect(corpoCelular('.sb-numeros-item')).toMatch(/border-top:\s*1px solid var\(--cor-fio-suave\)/)
    })

    it('abaixo de 768 não há fio vertical nem recuo lateral nos itens', () => {
      const seguinte = corpoCelular('.sb-numeros-item + .sb-numeros-item')
      expect(seguinte, 'regra do item seguinte abaixo de 768').not.toBe('')
      expect(seguinte).toMatch(/border-left:\s*0/)
      expect(seguinte).toMatch(/padding-left:\s*0/)
      // O item não reserva 8 px dos lados (era para 3 colunas de 114 px) nem 16 px embaixo: o espaço
      // entre os itens é só o gap de 24 (24 + 16 daria 40, que está fora da escala).
      expect(corpoCelular('.sb-numeros-item')).not.toMatch(/padding:\s*16px 8px/)
      expect(corpoCelular('.sb-numeros-item')).toMatch(/padding:\s*16px 0 0/)
    })
  })

  describe('D3: a abertura sobe a coluna lateral para a altura do título', () => {
    it('o fio horizontal é a borda de baixo do `.sb-abertura-base`, que não tem mais 80 px de altura nem 64 de margem', () => {
      const corpo = corpoBase('.sb-abertura-base')
      expect(corpo).toMatch(/border-bottom:\s*1px solid var\(--cor-fio-suave\)/)
      expect(corpo).toMatch(/margin-top:\s*32px/)
      expect(corpo).toMatch(/position:\s*relative/)
      expect(corpo).not.toMatch(/height:\s*80px/)
      expect(corpo).not.toMatch(/margin-top:\s*64px/)
    })

    it('o fio vertical é um pseudo-elemento: em x de c9 (80% da área útil), só nos 80 px finais, encostado no horizontal', () => {
      const corpo = corpoBase('.sb-abertura-base::before')
      expect(corpo, 'regra de .sb-abertura-base::before').not.toBe('')
      expect(corpo).toMatch(/content:\s*''/)
      expect(corpo).toMatch(/position:\s*absolute/)
      expect(corpo).toMatch(/left:\s*80%/)
      expect(corpo).toMatch(/bottom:\s*0/)
      expect(corpo).toMatch(/width:\s*1px/)
      expect(corpo).toMatch(/height:\s*80px/)
      expect(corpo).toMatch(/background-color:\s*var\(--cor-fio-suave\)/)
    })

    it('a coluna lateral não tem mais o fio nem o recuo de 24 px (as etiquetas começam no x de c9) e empilha de cima para baixo', () => {
      const corpo = corpoBase('.sb-abertura-lateral')
      expect(corpo).not.toMatch(/border-left/)
      expect(corpo).not.toMatch(/padding:\s*0 0 0 24px/)
      expect(corpo).not.toMatch(/justify-content:\s*center/)
      expect(corpo).toMatch(/margin:\s*0/)
      expect(corpo).toMatch(/padding:\s*0\s*;/)
      expect(corpo).toMatch(/align-self:\s*start/)
      expect(corpoBase('.sb-abertura-lateral > li')).toMatch(/height:\s*32px/)
    })

    it('abaixo de 768 a abertura segue em uma coluna: o fio vertical some e os espaços de antes ficam (32 antes das etiquetas, 16 até o fio)', () => {
      expect(corpoCelular('.sb-abertura-base::before')).toMatch(/display:\s*none/)
      expect(corpoCelular('.sb-abertura-lateral')).toMatch(/margin-top:\s*32px/)
      expect(corpoCelular('.sb-abertura-base')).toMatch(/margin-top:\s*16px/)
    })
  })

  describe('D5: o fio da linha rótulo + texto termina no início de c9, como o do campo', () => {
    it('a grade interna da linha tem 7 colunas (c2 a c8), com o rótulo em c2–c3 e o texto em c4–c8 como antes', () => {
      expect(corpoBase('.sb-linha')).toMatch(/grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)/)
      expect(corpoBase('.sb-linha')).toMatch(/border-bottom:\s*1px solid var\(--cor-fio-suave\)/)
      expect(corpoBase('.sb-linha-rotulo')).toMatch(/grid-column:\s*1 \/ 3/)
      const texto = corpoBase('.sb-linha-texto')
      expect(texto).toMatch(/grid-column:\s*3 \/ 8/)
      expect(texto).toMatch(/max-width:\s*592px/)
      expect(texto).toMatch(/padding:\s*var\(--e-linhas\) 0 var\(--e-linhas\) 32px/)
      expect(texto).toMatch(/border-left:\s*1px solid var\(--cor-fio-suave\)/)
    })

    it('a classe de coluna `.col-c2-c8` existe (2 / 9) e vale em uma coluna abaixo de 768', () => {
      expect(corpoBase('.col-c2-c8')).toMatch(/grid-column:\s*2 \/ 9/)
      expect(celular).toMatch(/\.col-c2-c8/)
    })
  })
})

// ---------------------------------------------------------------------------
// Rodada de correção 4 (D4, D6, D7, D8, D9): cabeçalho de 768 para cima, botão desativado e botão
// "Modo madrugada" ligado na madrugada, rodapé em 390 e o rótulo curto do botão. As geometrias
// (folga em px, vãos, innerText) são medidas no navegador por `.oc/geo.mjs`; aqui ficam as regras
// de CSS lidas como texto e os contrastes calculados dos tokens.

/** Avalia `clamp(Apx, calc(Bpx + (100vw - 768px) * K), Cpx)` para uma largura de janela. */
function avaliarClamp(valor: string, largura: number): number {
  const m = /clamp\(\s*(\d+(?:\.\d+)?)px\s*,\s*calc\(\s*(\d+(?:\.\d+)?)px\s*\+\s*\(100vw\s*-\s*768px\)\s*\*\s*(\d+(?:\.\d+)?)\s*\)\s*,\s*(\d+(?:\.\d+)?)px\s*\)/.exec(
    valor,
  )
  if (!m) throw new Error(`clamp que o teste não entende: ${valor}`)
  const [minimo, inicio, taxa, maximo] = [m[1], m[2], m[3], m[4]].map(Number)
  return Math.min(maximo, Math.max(minimo, inicio + (largura - 768) * taxa))
}

describe('rodada 4: cabeçalho, desativado, modo madrugada, rodapé em 390 e rótulo curto (regras de CSS)', () => {
  const base = semMedia(semComentarios)
  const celular = blocosDeMedia(semComentarios, /max-width:\s*767px/).join('\n')
  const tablet = blocosDeMedia(semComentarios, /max-width:\s*991px/).join('\n')
  const corpoBase = (seletor: string) => regras(base).filter((r) => r.seletor === seletor).map((r) => r.corpo).join('')
  const corpoCelular = (seletor: string) => regras(celular).filter((r) => r.seletor === seletor).map((r) => r.corpo).join('')
  const cores = lerTokens(tokensCss)
  const claro = /:root\s*\{([^}]*)\}/.exec(temaCss)![1]
  const madrugada = /\[data-tema=['"]madrugada['"]\]\s*\{([^}]*)\}/.exec(temaCss)![1]
  /** O hex que uma variável de uso do tema aponta, pelo `var(--color-*)` do bloco. */
  const hexDe = (bloco: string, variavel: string): string | undefined => {
    const m = new RegExp(`${variavel}:\\s*var\\(--color-([a-z0-9-]+)\\)`).exec(bloco)
    return m ? cores[m[1]] : undefined
  }

  describe('D4: o botão do cabeçalho não fica colado no último link', () => {
    it('de 768 para cima o cabeçalho é uma linha flex (nome, links à direita e botão), sem a grade de 10 colunas', () => {
      const miolo = corpoBase('.sb-cab-miolo')
      expect(miolo).toMatch(/display:\s*flex/)
      expect(miolo).not.toMatch(/grid-template-columns/)
      expect(corpoBase('.sb-cab-nome')).not.toMatch(/grid-column|justify-self/)
      expect(corpoBase('.sb-cab-links')).not.toMatch(/grid-column|justify-self/)
      expect(corpoBase('.sb-cab-acao')).not.toMatch(/grid-column|justify-self/)
    })

    it('a faixa de 768 a 991 não troca o cabeçalho por outra regra (a de 24 px e `space-between` saiu)', () => {
      const seletores = regras(tablet).map((r) => r.seletor)
      expect(seletores).not.toContain('.sb-cab-miolo')
      expect(seletores).not.toContain('.sb-cab-links')
    })

    it('o gap entre os links e a folga do botão são proporcionais à largura: 16 px em 768, 48 e 32 px a partir de 992', () => {
      const miolo = corpoBase('.sb-cab-miolo')
      const gap = /--cab-gap-links:\s*([^;]+);/.exec(miolo)?.[1]
      const folga = /--cab-folga-acao:\s*([^;]+);/.exec(miolo)?.[1]
      expect(gap, '--cab-gap-links').toBeDefined()
      expect(folga, '--cab-folga-acao').toBeDefined()
      expect(avaliarClamp(gap!, 768)).toBe(16)
      expect(avaliarClamp(gap!, 1440)).toBe(48)
      expect(avaliarClamp(folga!, 1440)).toBeGreaterThanOrEqual(32)
      expect(avaliarClamp(folga!, 1024)).toBeGreaterThanOrEqual(32)
      expect(avaliarClamp(folga!, 768)).toBeGreaterThanOrEqual(16)
      // Nunca menos de 16 px entre os links, em nenhuma largura de 768 a 1600.
      for (let largura = 768; largura <= 1600; largura += 8) expect(avaliarClamp(gap!, largura), `${largura}`).toBeGreaterThanOrEqual(16)
    })

    it('os links vão para a direita (margin-left: auto), com o gap proporcional, e o botão fica a --cab-folga-acao do último', () => {
      const links = corpoBase('.sb-cab-links')
      expect(links).toMatch(/margin-left:\s*auto/)
      expect(links).toMatch(/gap:\s*var\(--cab-gap-links\)/)
      expect(links).toMatch(/flex:\s*none/)
      const acao = corpoBase('.sb-cab-acao')
      expect(acao).toMatch(/margin-left:\s*var\(--cab-folga-acao\)/)
      expect(acao).toMatch(/flex:\s*none/)
      expect(corpoBase('.sb-cab-nome')).toMatch(/flex:\s*none/)
    })

    it('os links e o gatilho do submenu não encolhem nem quebram (o texto não passa do box de 44 px)', () => {
      const grupo = regras(base).find((r) => r.seletor.split(/\s*,\s*/).includes('.sb-cab-link'))!
      expect(grupo.seletor.split(/\s*,\s*/)).toContain('.sb-submenu-gatilho')
      expect(grupo.corpo).toMatch(/flex:\s*none/)
      expect(grupo.corpo).toMatch(/white-space:\s*nowrap/)
      expect(corpoBase('.sb-cab-links > *')).toMatch(/flex:\s*none/)
    })

    it('o miolo do botão do cabeçalho encolhe o recuo de 24 para 12 px de 992 para 768, e abaixo de 768 volta ao de 12 px de sempre', () => {
      const miolo = corpoBase('.sb-cab-miolo')
      const recuo = /--cab-recuo-acao:\s*([^;]+);/.exec(miolo)?.[1]
      expect(recuo, '--cab-recuo-acao').toBeDefined()
      expect(avaliarClamp(recuo!, 768)).toBe(12)
      expect(avaliarClamp(recuo!, 1440)).toBe(24)
      expect(corpoBase('.sb-cab-acao .sb-moldura-miolo')).toMatch(/padding:\s*0 var\(--cab-recuo-acao\)/)
      expect(corpoCelular('.sb-cab-acao .sb-moldura-miolo')).toMatch(/padding:\s*0 12px/)
    })

    it('abaixo de 768 o cabeçalho segue em grade (menu, nome, botão), sem a folga do botão', () => {
      expect(corpoCelular('.sb-cab-miolo')).toMatch(/display:\s*grid/)
      expect(corpoCelular('.sb-cab-acao')).toMatch(/margin-left:\s*0/)
      expect(corpoCelular('.sb-cab-links')).toMatch(/display:\s*none/)
    })
  })

  describe('D6: o botão desativado da madrugada não é mais claro que o primário', () => {
    it('o botão desativado lê o fundo e o texto de variáveis do tema, sem opacidade nem tracejado', () => {
      const corpo = regras(base).find((r) => r.seletor.includes(".sb-botao[aria-disabled='true']"))!.corpo
      expect(corpo).toMatch(/background-color:\s*var\(--cor-desativado-fundo\)/)
      expect(corpo).toMatch(/(?:^|[\s;])color:\s*var\(--cor-desativado-texto\)/)
      expect(corpo).not.toMatch(/opacity|dashed|dotted|border/)
    })

    it('no tema claro o desativado segue como era: fundo secundário, texto papel, contraste de 6,38', () => {
      expect(hexDe(claro, '--cor-desativado-fundo')).toBe(cores.secondary)
      expect(hexDe(claro, '--cor-desativado-texto')).toBe(cores.neutral)
      expect(contraste(cores.neutral, cores.secondary)).toBeCloseTo(6.38, 1)
    })

    it('na madrugada o fundo do desativado tem luminância menor que a do primário, e o texto tem contraste de 4,5 ou mais', () => {
      const fundo = hexDe(madrugada, '--cor-desativado-fundo')
      const texto = hexDe(madrugada, '--cor-desativado-texto')
      expect(fundo, 'fundo do desativado na madrugada').toBeDefined()
      expect(texto, 'texto do desativado na madrugada').toBeDefined()
      expect(luminancia(fundo!)).toBeLessThan(luminancia(cores['night-accent']))
      expect(contraste(texto!, fundo!)).toBeGreaterThanOrEqual(4.5)
    })

    it('o desativado da madrugada também não é o bloco mais claro da tela (menos claro que o texto da página)', () => {
      expect(luminancia(hexDe(madrugada, '--cor-desativado-fundo')!)).toBeLessThan(luminancia(cores['night-primary']))
    })
  })

  describe('D7: "Modo madrugada" ligado se distingue do desligado', () => {
    it('desligado segue como era: fundo transparente e a moldura dupla de tinta', () => {
      const corpo = corpoBase('.sb-moldura')
      expect(corpo).toMatch(/background:\s*none/)
      expect(corpo).toMatch(/border:\s*1px solid var\(--cor-texto\)/)
    })

    it('ligado preenche o botão (não só o miolo) com o destaque e o texto sobre-destaque', () => {
      const corpo = corpoBase('.sb-moldura[data-ligado]')
      expect(corpo, 'regra de .sb-moldura[data-ligado]').not.toBe('')
      expect(corpo).toMatch(/background-color:\s*var\(--cor-destaque\)/)
      expect(corpo).toMatch(/(?:^|[\s;])color:\s*var\(--cor-sobre-destaque\)/)
    })

    it('ligado inverte a moldura dupla: o miolo ganha a linha na cor do texto sobre o destaque e perde o fundo próprio', () => {
      const corpo = corpoBase('.sb-moldura[data-ligado] .sb-moldura-miolo')
      expect(corpo).toMatch(/border-color:\s*var\(--cor-sobre-destaque\)/)
      expect(corpo).toMatch(/background-color:\s*transparent/)
      expect(corpo).not.toMatch(/papel-fundo/)
    })

    it('o fundo do botão ligado tem 3:1 ou mais contra a página e o texto tem 4,5:1 ou mais, no dia e na madrugada', () => {
      for (const [bloco, nome] of [
        [claro, 'dia'],
        [madrugada, 'madrugada'],
      ] as const) {
        const destaque = hexDe(bloco, '--cor-destaque')!
        const sobre = hexDe(bloco, '--cor-sobre-destaque')!
        const pagina = hexDe(bloco, '--cor-fundo')!
        expect(contraste(destaque, pagina), `${nome}: fundo do botão contra a página`).toBeGreaterThanOrEqual(3)
        expect(contraste(sobre, destaque), `${nome}: texto sobre o fundo do botão`).toBeGreaterThanOrEqual(4.5)
      }
    })

    it('o ligado inverte de novo ao passar o mouse (miolo escuro, texto no destaque), também abaixo de 768', () => {
      const corpo = corpoBase('.sb-moldura[data-ligado]:hover .sb-moldura-miolo')
      expect(corpo).toMatch(/background-color:\s*var\(--cor-sobre-destaque\)/)
      expect(corpo).toMatch(/(?:^|[\s;])color:\s*var\(--cor-destaque\)/)
      expect(corpo).not.toMatch(/papel-fundo|var\(--cor-texto\)/)
    })

    it('abaixo de 768 o ligado não depende só do fundo: a regra de miolo ligado do celular não pinta o miolo de outro urucum', () => {
      expect(celular).not.toMatch(/\.sb-cab-acao\[data-ligado\]\s+\.sb-moldura-miolo/)
    })
  })

  describe('D8: o rodapé em 390 não tem vão vertical maior que 96 px', () => {
    const valoresEmPx = (corpo: string, propriedade: string): number[] => {
      const declaracao = new RegExp(`(?:^|[;\\s])${propriedade}\\s*:\\s*([^;]+)`).exec(corpo)
      return declaracao ? [...declaracao[1].matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])) : []
    }

    it('os espaços do rodapé em 1440 não mudaram (96, 96, 160, 192, 96 e 32)', () => {
      expect(corpoBase('.sb-rodape')).toMatch(/padding-block:\s*96px 32px/)
      expect(corpoBase('.sb-rodape-nome')).toMatch(/margin:\s*96px 0 0/)
      expect(corpoBase('.sb-rodape-links')).toMatch(/margin-top:\s*160px/)
      expect(corpoBase('.sb-rodape-final')).toMatch(/margin:\s*192px 0 0/)
    })

    it('abaixo de 768 nenhum espaço do rodapé passa de 96 px: o de cima, o do nome, o dos links e o da linha final', () => {
      const pedidos: Array<[string, string]> = [
        ['.sb-rodape', 'padding-block'],
        ['.sb-rodape-nome', 'margin-top'],
        ['.sb-rodape-links', 'margin-top'],
        ['.sb-rodape-final', 'margin-top'],
        ['.sb-rodape-bloco', 'margin-top'],
        ['.sb-rodape-colunas', 'row-gap'],
      ]
      for (const [seletor, propriedade] of pedidos) {
        const valores = valoresEmPx(corpoCelular(seletor), propriedade)
        expect(valores.length, `${seletor} ${propriedade} abaixo de 768`).toBeGreaterThan(0)
        for (const valor of valores) expect(valor, `${seletor} ${propriedade}`).toBeLessThanOrEqual(96)
      }
    })

    it('abaixo de 768 o resto do CSS do rodapé também não abre vão maior que 96 px', () => {
      for (const { seletor, corpo } of regras(celular).filter((r) => r.seletor.includes('.sb-rodape'))) {
        for (const [, valor] of corpo.matchAll(/(?:margin|padding)[a-z-]*:\s*([^;]+)/g)) {
          for (const px of valor.matchAll(/(\d+(?:\.\d+)?)px/g)) expect(Number(px[1]), `${seletor}: ${valor}`).toBeLessThanOrEqual(96)
        }
      }
    })
  })

  describe('D9: o rótulo do botão abaixo de 768 é "Madrugada"', () => {
    it('há dois rótulos no botão: o longo de 768 para cima e o curto, com M maiúsculo, abaixo; sem text-transform', () => {
      expect(corpoBase('.sb-cab-rotulo-curto')).toMatch(/display:\s*none/)
      expect(corpoCelular('.sb-cab-rotulo-curto')).toMatch(/display:\s*inline/)
      expect(corpoCelular('.sb-cab-rotulo-longo')).toMatch(/display:\s*none/)
      expect(semComentarios).not.toMatch(/\.sb-cab-prefixo/)
      for (const seletor of ['.sb-cab-rotulo-longo', '.sb-cab-rotulo-curto']) {
        expect(corpoBase(seletor) + corpoCelular(seletor), seletor).not.toMatch(/text-transform/)
      }
    })
  })
})

describe('index.html', () => {
  it('declara o idioma e o título', () => {
    expect(indexHtml).toContain('lang="pt-BR"')
    expect(indexHtml).toContain('<title>AppMaternidade</title>')
  })

  it('traz a descrição e a cor do tema', () => {
    expect(indexHtml).toContain('<meta name="description" content="Protótipo do AppMaternidade." />')
    expect(indexHtml).toMatch(/<meta name="theme-color" content="#[0-9a-f]{6}" \/>/)
  })
})
