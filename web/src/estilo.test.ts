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

  it('o bloco @theme tem as 20 cores do DESIGN.md', () => {
    expect(Object.keys(cores).sort()).toEqual(
      [
        'primary', 'neutral', 'accent', 'on-accent', 'info', 'line', 'focus', 'paper-deep',
        'field-1', 'field-2',
        'night-primary', 'night-neutral', 'night-accent', 'night-on-accent', 'night-info',
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

  it('o corpo do texto fica entre 16 e 18 px', () => {
    const body = /(?:^|[\s}])body\s*\{([^}]*)\}/.exec(estiloGlobal)
    expect(body).not.toBeNull()
    const tamanho = /font-size:\s*(\d+(?:\.\d+)?)(rem|px)/.exec(body![1])
    expect(tamanho).not.toBeNull()
    const px = parseFloat(tamanho![1]) * (tamanho![2] === 'rem' ? 16 : 1)
    expect(px).toBeGreaterThanOrEqual(16)
    expect(px).toBeLessThanOrEqual(18)
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
      '@fontsource/fraunces/latin-600.css',
      '@fontsource/fraunces/latin-800.css',
      '@fontsource/fraunces/latin-400-italic.css',
      '@fontsource/instrument-sans/latin-400.css',
      '@fontsource/instrument-sans/latin-500.css',
      '@fontsource/instrument-sans/latin-600.css',
    ])
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
