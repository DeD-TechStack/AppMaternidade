import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { parse } from 'yaml'
import { Ilustracao, NOMES_ILUSTRACAO } from './componentes/campo/Ilustracao.tsx'
import { ITENS_DO_CABECALHO } from './componentes/casca/textos.ts'
import { CATALOGO } from './movimento/catalogo.ts'
import { describe, expect, it } from 'vitest'
import { listarFontes, pastaSrcDe } from './teste/fontes.ts'

// Lidos do disco: no Vitest, importar CSS (mesmo com ?raw) não devolve o texto do arquivo.
const pastaSrc = pastaSrcDe(import.meta.url)
const lerTexto = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')
const tokensCss = lerTexto('styles/tokens.css')
const temaCss = lerTexto('styles/tema.css')
const estiloGlobal = lerTexto('index.css')
const indexHtml = readFileSync(pastaSrc + '../index.html', 'utf8')


const harmoniaCss = lerTexto('styles/harmonia.gerado.css')
const siteCss = lerTexto('styles/site.css')
const campoCss = lerTexto('styles/campo.css')
const design = lerTexto('../DESIGN.md')
const semComentariosCss = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '')

function declaracao(corpo: string, propriedade: string): string | undefined {
  return new RegExp(`(?:^|;)\\s*${propriedade}\\s*:\\s*([^;{}]+)`).exec(semComentariosCss(corpo))?.[1].trim()
}

const claro = /(?:^|\n):root\s*\{([^}]*)\}/.exec(temaCss)?.[1] ?? ''
const madrugada = /:root\[data-tema='madrugada'\]\s*\{([^}]*)\}/.exec(temaCss)?.[1] ?? ''

function lerTokens(css: string): Record<string, string> {
  const bloco = /@theme static\s*\{([^}]*)\}/.exec(semComentariosCss(css))
  if (!bloco) throw new Error('bloco @theme static não encontrado em tokens.css')
  const cores: Record<string, string> = {}
  for (const [, nome, hex] of bloco[1].matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (nome in cores) throw new Error(`cor duplicada: ${nome}`)
    cores[nome] = hex.toLowerCase()
  }
  return cores
}

function corDe(papel: string, tema: string, tokens = tokensCss): string {
  const alias = declaracao(semComentariosCss(tema), `--cor-${papel}`)
  const token = /^var\(--color-([a-z0-9-]+)\)$/.exec(alias ?? '')?.[1]
  const hex = token && lerTokens(tokens)[token]
  if (!hex) throw new Error(`--cor-${papel} não resolve para uma cor da paleta: ${alias}`)
  return hex
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

const focoPrimarioNoturno = ":root[data-tema='madrugada'] .cm-botao-primario:focus-visible:where(:not(:hover, [data-forcar='hover'], [aria-disabled='true']))"

function contrasteDoFocoNoMel(cssSite: string, cssCampo: string): [number, number] {
  const regra = (css: string, seletor: string) => regras(semComentariosCss(css)).find((r) => r.seletor === seletor)?.corpo ?? ''
  const cor = (valor: string | undefined): string => {
    const chave = /^var\(--color-([a-z0-9-]+)\)$/.exec(valor ?? '')?.[1]
    const hex = chave && lerTokens(tokensCss)[chave]
    if (!hex) throw new Error(`cor de foco ou superfície não resolvida: ${valor}`)
    return hex
  }
  const foco = regra(cssSite, focoPrimarioNoturno)
  const contorno = regra(cssSite, ".cm-botao:focus-visible, .cm-botao[data-forcar='foco']")
  if (declaracao(contorno, 'outline') !== '2px solid var(--cor-foco)' ||
      declaracao(contorno, 'outline-offset') !== '3px' || declaracao(foco, 'outline-offset') !== '-4px') {
    throw new Error('o botão deve ter contorno visível, por dentro do preenchimento de mel')
  }
  const fundoPrimario = declaracao(regra(cssSite, '.cm-botao-primario'), 'background-color')
  if (fundoPrimario !== 'var(--cor-primario-fundo)') throw new Error('preenchimento do primário desligado do tema')
  const noite = regra(cssSite, ":root[data-tema='madrugada']")
  const painel = regra(cssCampo, '.cm-painel-mel')
  const focoPainel = regra(cssCampo, '.cm-painel-mel :focus-visible, .cm-painel-areia :focus-visible')
  const preenchimento = cor(declaracao(noite, '--cor-primario-fundo'))
  const superficie = cor(declaracao(painel, 'background-color'))
  const mel = corDe('destaque', madrugada)
  if (preenchimento !== mel || superficie !== mel) throw new Error('o primário noturno e o painel devem usar o mel')
  return [
    contraste(cor(declaracao(foco, 'outline-color')), preenchimento),
    contraste(cor(declaracao(focoPainel, 'outline-color')), superficie),
  ]
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


// DESIGN.md, Colors / Components: no papel lê-se tinta/links, não mel; mel é fundo com tinta de cacau.
// Os campos reais usam --cor-cartao; os painéis alternam --cor-campo-1/2 e --cor-campo-sessao.
describe('contraste e limites dos tokens', () => {
  it('a autoria de cores fica em tokens.css e a marca de geração fica em harmonia.gerado.css', () => {
    expect(tokensCss.split('*/')[0]).toContain('Escritos à mão')
    expect(harmoniaCss.split(/\r?\n/)[0]).toBe(
      '/* GERADO por web/scripts/gerar-tema.mjs a partir do front matter de web/DESIGN.md. NÃO EDITE À MÃO.',
    )
    expect(semComentariosCss(harmoniaCss)).not.toMatch(/--(?:color|cor)-/)
  })

  it('o bloco @theme static tem exatamente os 12 papéis e os valores do DESIGN.md', () => {
    const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(design)?.[1]
    const { colors } = parse(front ?? '') as { colors: Record<string, string> }
    expect(Object.keys(colors).sort()).toEqual([
      'areia', 'branco', 'cacau', 'mel', 'mel-claro', 'noite', 'noite-2', 'noite-cartao', 'oliva', 'oliva-tinta', 'papel', 'texto-2',
    ])
    expect(lerTokens(tokensCss)).toEqual(Object.fromEntries(Object.entries(colors).map(([nome, hex]) => [nome, hex.toLowerCase()])))
  })

  const paresDeTexto = [
    ['texto', 'fundo'], ['sobre-destaque', 'destaque'], ['link', 'fundo'], ['info', 'fundo'],
    ['texto', 'campo-1'], ['texto', 'campo-2'], ['texto', 'cartao'], ['numero-sessao', 'campo-sessao'],
    ['texto-botao-campo', 'botao-campo'],
  ] as const
  const paresDeFoco = ['fundo', 'destaque', 'campo-1', 'campo-2', 'cartao', 'campo-sessao']
  for (const [modo, tema] of [['dia', claro], ['madrugada', madrugada]] as const) {
    for (const [texto, fundo] of paresDeTexto) {
      it(`${modo}: ${texto} sobre ${fundo} tem contraste de pelo menos 4,5`, () => {
        expect(contraste(corDe(texto, tema), corDe(fundo, tema))).toBeGreaterThanOrEqual(4.5)
      })
    }
    for (const fundo of paresDeFoco) {
      // No mel da madrugada o foco é contextual; o alias global continua nos fundos escuros.
      if (modo === 'madrugada' && fundo === 'destaque') continue
      it(`${modo}: foco contra ${fundo} tem contraste de pelo menos 3`, () => {
        expect(contraste(corDe('foco', tema), corDe(fundo, tema))).toBeGreaterThanOrEqual(3)
      })
    }
  }

  it('madrugada: o foco contrasta pelo menos 3:1 com o mel adjacente no primário e no painel', () => {
    for (const razao of contrasteDoFocoNoMel(siteCss, campoCss)) expect(razao).toBeGreaterThanOrEqual(3)
  })

  it('rejeita anel mel sobre mel, seletor sem foco, contorno invisível e anel fora do preenchimento', () => {
    const siteLf = siteCss.replace(/\r\n/g, '\n')
    const melSobreMel = siteLf.replace(`${focoPrimarioNoturno} {\n    outline-color: var(--color-cacau)`,
      `${focoPrimarioNoturno} {\n    outline-color: var(--color-mel)`)
    expect(melSobreMel).not.toBe(siteLf)
    expect(contrasteDoFocoNoMel(melSobreMel, campoCss)[0]).toBeLessThan(3)
    expect(() => contrasteDoFocoNoMel(siteCss.replace(`${focoPrimarioNoturno} {`, '.regra-ausente {'), campoCss)).toThrow()
    expect(() => contrasteDoFocoNoMel(siteCss.replace(focoPrimarioNoturno, '.cm-botao-primario:hover'), campoCss)).toThrow()
    expect(() => contrasteDoFocoNoMel(siteCss.replace('outline: 2px solid var(--cor-foco)', 'outline: none'), campoCss)).toThrow()
    expect(() => contrasteDoFocoNoMel(siteCss.replace('outline-offset: -4px', 'outline-offset: 3px'), campoCss)).toThrow()
  })

  it('o leitor de contraste não confunde alias ausente, papel igual à tinta ou foco igual ao fundo com um tema válido', () => {
    expect(() => corDe('texto', '--cor-texto: var(--color-inexistente);')).toThrow(/não resolve/)
    const adulterado = claro.replace('--cor-texto: var(--color-cacau)', '--cor-texto: var(--color-papel)')
    expect(contraste(corDe('texto', adulterado), corDe('fundo', adulterado))).toBeLessThan(4.5)
    const semFoco = claro.replace('--cor-foco: var(--color-cacau)', '--cor-foco: var(--color-papel)')
    expect(contraste(corDe('foco', semFoco), corDe('fundo', semFoco))).toBeLessThan(3)
  })

  it('as linhas usam a cor da tinta', () => {
    for (const tema of [claro, madrugada]) expect(corDe('linha', tema)).toBe(corDe('texto', tema))
  })

  it('o papel é claro e quente, não branco', () => {
    const papel = corDe('fundo', claro)
    const [r, , b] = canais(papel)
    expect(luminancia(papel)).toBeGreaterThanOrEqual(0.85)
    expect(r).toBeGreaterThan(b)
    expect(papel).not.toBe('#ffffff')
  })

  it('a tinta é quase preta, não preta', () => {
    const tinta = corDe('texto', claro)
    expect(luminancia(tinta)).toBeLessThanOrEqual(0.03)
    expect(tinta).not.toBe('#000000')
  })

  it('o fundo da madrugada é escuro e quente', () => {
    const fundo = corDe('fundo', madrugada)
    const [r, , b] = canais(fundo)
    expect(luminancia(fundo)).toBeLessThanOrEqual(0.02)
    expect(r).toBeGreaterThanOrEqual(b)
  })

  it('o destaque da madrugada mantém o matiz do mel do dia (até 10°)', () => {
    expect(diferencaDeMatiz(corDe('destaque', claro), corDe('destaque', madrugada))).toBeLessThanOrEqual(10)
  })
})

// ---------------------------------------------------------------------------
// Limites do CSS (VIS-02 e VIS-08)

const fontes = listarFontes(pastaSrc)
const arquivosCss = fontes.filter((f) => f.nome.endsWith('.css'))
const arquivosTsx = fontes.filter((f) => f.nome.endsWith('.tsx'))
const composicao = 'componentes/inicio-composicao/composicao.css'
const cssSemCosturas = (texto: string) => texto.replace(
  /linear-gradient\(to right, (?:transparent|var\(--[\w-]+\)) 0 var\(--costura\), var\(--[\w-]+\) var\(--costura\)\)/g,
  '',
)

function blocosApos(css: string, inicio: RegExp): string[] {
  const limpo = semComentariosCss(css)
  return [...limpo.matchAll(inicio)].map((m) => {
    const de = m.index + m[0].length
    let nivel = 1
    let ate = de
    while (ate < limpo.length && nivel) {
      if (limpo[ate] === '{') nivel++
      if (limpo[ate] === '}') nivel--
      ate++
    }
    if (nivel) throw new Error(`bloco não fechado: ${m[0]}`)
    return limpo.slice(de, ate - 1)
  })
}

const movimentoPermitido = /@media\s+(?:\([^(){},]+\)\s+and\s+)*\(prefers-reduced-motion:\s*no-preference\)(?:\s+and\s+\([^(){},]+\))*\s*\{/g
const suporteTimeline = /@supports\s*\(\(animation-timeline:\s*view\(\)\) and \(animation-range:\s*entry\)\)\s*\{/g
const declaracaoTimeline = /(?:^|[;{}])\s*(?:(?:animation|scroll|view)-timeline(?:-name|-axis|-inset)?|timeline-scope)\s*:/g

function linhasDeRolagemNaoProtegidas(css: string): number {
  const total = semComentariosCss(css).match(declaracaoTimeline)?.length ?? 0
  const protegidas = [
    ...blocosApos(css, movimentoPermitido).flatMap((b) => blocosApos(b, suporteTimeline)),
    ...blocosApos(css, suporteTimeline).flatMap((b) => blocosApos(b, movimentoPermitido)),
  ].reduce((n, bloco) => n + (bloco.match(declaracaoTimeline)?.length ?? 0), 0)
  return total - protegidas
}

function imagensSemAlt(texto: string): string[] {
  const fonte = ts.createSourceFile('produto.tsx', texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const achados: string[] = []
  function visitar(no: ts.Node) {
    if ((ts.isJsxOpeningElement(no) || ts.isJsxSelfClosingElement(no)) && no.tagName.getText(fonte) === 'img') {
      const alt = no.attributes.properties.find((p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText(fonte) === 'alt')
      const valor = alt?.initializer
      if (!valor || (ts.isJsxExpression(valor) && (!valor.expression || /^(?:null|undefined)$/.test(valor.expression.getText(fonte))))) {
        achados.push(`linha ${fonte.getLineAndCharacterOfPosition(no.getStart(fonte)).line + 1}`)
      }
    }
    ts.forEachChild(no, visitar)
  }
  visitar(fonte)
  return achados
}

describe('limites do CSS', () => {
  it('encontra os arquivos que deve verificar', () => {
    const nomes = fontes.map((f) => f.nome)
    expect(nomes).toEqual(expect.arrayContaining(['index.css', 'styles/tokens.css', 'styles/tema.css']))
    expect(arquivosTsx.length).toBeGreaterThan(5)
  })

  const proibidos: Array<[string, RegExp]> = [
    ['backdrop-filter', /backdrop-filter/],
    ['backdrop-blur', /backdrop-blur/],
    ['filter: blur', /filter\s*:\s*blur/],
    ['blur(', /blur\(/],
    ['classe blur-', /(^|[^\w])blur-/],
    ['classe shadow- (exceto shadow-none)', /(^|[^\w-])shadow-(?!none)/],
    ['rolagem suave sequestrada', /scroll-behavior\s*:\s*smooth/],
  ]
  for (const [nome, regex] of proibidos) {
    it(`nenhum arquivo de web/src usa ${nome}`, () => {
      const achados = fontes.filter((f) => regex.test(f.texto)).map((f) => f.nome)
      expect(achados).toEqual([])
    })
  }


  it('não há mistura por gradiente: só os dois tokens e as paradas duras da composição', () => {
    for (const { nome, texto } of fontes) {
      let css = semComentariosCss(texto)
      if (nome === 'styles/tokens.css') {
        for (const papel of ['luz-estudio', 'brilho-mel']) {
          expect(css, papel).toMatch(new RegExp(`--${papel}:\\s*radial-gradient\\(`))
          css = css.replace(new RegExp(`--${papel}:\\s*radial-gradient\\([^;]+;`), '')
        }
      }
      if (nome === composicao) css = cssSemCosturas(css)
      expect(css, nome).not.toMatch(/-gradient\(|\bbg-(?:gradient|linear|radial|conic)\b/)
    }
  })

  it('mantém o limite de 4 px de desfoque avulso e aceita apenas as duas sombras normatizadas', () => {
    for (const { nome, texto } of arquivosCss) {
      for (const [, valor] of semComentariosCss(texto).matchAll(/box-shadow\s*:\s*([^;}]+)/g)) {
        if (/^(none|var\(--sombra-(flutuante|cartao)\))$/.test(valor.trim())) continue
        const medidas = /^(?:inset\s+)?-?[\d.]+(?:px)?\s+-?[\d.]+(?:px)?\s+([\d.]+)(px)?\b/.exec(valor.trim())
        expect(medidas, `${nome}: ${valor}`).not.toBeNull()
        expect(Number(medidas![1]), `${nome}: ${valor}`).toBeLessThanOrEqual(4)
        expect(valor, nome).not.toMatch(/\)\s*,/)
      }
    }
  })

  it('as imagens JSX declaram alt, inclusive alt vazio nas decorativas', () => {
    const achados = arquivosTsx.flatMap(({ nome, texto }) => imagensSemAlt(texto).map((local) => `${nome}: ${local}`))
    expect(achados).toEqual([])
    expect(imagensSemAlt('/* <img src="x" /> */ const elemento = <img alt="" src="x" />')).toEqual([])
    expect(imagensSemAlt('const elemento = <img src="x" />')).toEqual(['linha 1'])
    expect(imagensSemAlt('const elemento = <img src="x" alt={undefined} />')).toEqual(['linha 1'])
  })

  it('as imagens raster usam WebP/AVIF, salvo as camadas RGBA registradas no PROVENANCE', () => {
    const excecoes: Record<string, string[]> = {
      'paginas/Inicio.tsx': ['cenas/inicio/m05-luz-1672w.png', 'cenas/inicio/m05-luz-390c-1170w.png',
        'cenas/inicio/m06-luz-792w.png', 'cenas/inicio-faixas/a05-rua-luz-1672w.png'],
      'conteudo/casa/comoFunciona.ts': ['cenas/inicio/m06-luz-792w.png'],
      'conteudo/casa/desenvolvimento.ts': ['molduras/moldura-dia.png', 'molduras/moldura-dia-1356w.png'],
    }
    const arquivosForaDosFormatos = (nome: string, texto: string) => [...texto.matchAll(/[^\s'"`{}()]+\.(?:png|jpe?g)\b/gi)]
      .map(([url]) => url.replace(/^\//, ''))
      .filter((url) => !Object.hasOwn(excecoes, nome) || !excecoes[nome].includes(url))
    expect(fontes.flatMap(({ nome, texto }) => arquivosForaDosFormatos(nome, texto).map((url) => `${nome}: ${url}`))).toEqual([])
    for (const url of new Set(Object.values(excecoes).flat())) {
      expect(existsSync(pastaSrc + '../public/' + url), url).toBe(true)
      const pasta = url.slice(0, url.lastIndexOf('/'))
      expect(lerTexto(`../public/${pasta}/PROVENANCE.md`)).toContain(url.slice(pasta.length + 1))
    }
    expect(arquivosForaDosFormatos('paginas/Inicio.tsx', 'const foto = "cenas/inicio/extra.jpg"')).toEqual(['cenas/inicio/extra.jpg'])
    expect(arquivosForaDosFormatos('paginas/Sistema.tsx', 'const foto = "cenas/inicio/m06-luz-792w.png"')).toHaveLength(1)
  })

  it('não sequestra rolagem; timelines nativas exigem suporte e movimento permitido', () => {
    for (const { nome, texto } of arquivosCss) {
      expect(linhasDeRolagemNaoProtegidas(texto), nome).toBe(0)
      expect(semComentariosCss(texto), nome).not.toMatch(/background-attachment\s*:\s*fixed|scroll-snap/)
    }
    const regra = '.a { animation-timeline: view(); }'
    const suporte = (x: string) => `@supports ((animation-timeline: view()) and (animation-range: entry)) { ${x} }`
    const midia = (x: string) => `@media (prefers-reduced-motion: no-preference) { ${x} }`
    expect(linhasDeRolagemNaoProtegidas(suporte(midia(regra)))).toBe(0)
    expect(linhasDeRolagemNaoProtegidas(midia(suporte(regra)))).toBe(0)
    for (const alterado of [regra, suporte(regra), midia(regra), suporte(midia(regra)) + regra,
      suporte(`@media (prefers-reduced-motion: no-preference), (min-width: 1px) { ${regra} }`),
    ]) {
      expect(linhasDeRolagemNaoProtegidas(alterado)).toBe(1)
    }
  })

  it('zera animações e transições com prefers-reduced-motion', () => {
    const bloco = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}\s*$/.exec(estiloGlobal)
    expect(bloco).not.toBeNull()
    expect(bloco![1]).toMatch(/animation:\s*none\s*!important/)
    expect(bloco![1]).toMatch(/transition:\s*none\s*!important/)
  })


  it('a troca curta da legenda do palco dura até 300 ms e desloca até 16 px (DESIGN.md, M17)', () => {
    const { duracaoMs, duracaoSaidaMs, deslocamentoPx } = CATALOGO.M17
    for (const duracao of [duracaoMs, duracaoSaidaMs]) {
      expect(duracao).toBeGreaterThan(0)
      expect(duracao).toBeLessThanOrEqual(300)
    }
    expect(Math.abs(deslocamentoPx)).toBeGreaterThan(0)
    expect(Math.abs(deslocamentoPx)).toBeLessThanOrEqual(16)
  })

  it('o corpo usa a escala fluida, 17 px a 390 e 18 px a 1440 (DESIGN.md)', () => {
    const corpo = /(?:^|[\s}])body\s*\{([^}]*)\}/.exec(estiloGlobal)?.[1] ?? ''
    expect(declaracao(corpo, 'font-size')).toBe('var(--texto-corpo-tamanho)')
    const token = /--texto-corpo-tamanho:\s*([^;]+)/.exec(harmoniaCss)?.[1]
    const escala = /^clamp\(([\d.]+)rem, calc\(([\d.]+)rem \+ \(100vw - (\d+)px\) \* ([\d.]+) \/ (\d+)\), ([\d.]+)rem\)$/.exec(token ?? '')
    expect(escala).not.toBeNull()
    const [piso, base, ancora, ganho, intervalo, teto] = escala!.slice(1).map(Number)
    const px = (largura: number) => Math.min(teto * 16, Math.max(piso * 16, base * 16 + (largura - ancora) * ganho / intervalo))
    expect(px(320)).toBeGreaterThanOrEqual(16)
    expect(px(390)).toBeCloseTo(17, 4)
    expect(px(1440)).toBeCloseTo(18, 4)
    expect(piso * 16).toBeCloseTo(17, 4)
    expect(teto * 16).toBeCloseTo(18 + (1920 - 1440) / (1440 - 390), 4)
    expect(px(1920)).toBeCloseTo(teto * 16, 4)
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

  const importsDoCss = (css: string) =>
    [...css.replace(/\/\*[\s\S]*?\*\//g, ' ').matchAll(/@import\b\s*([^;]+)(?:;|$)/gi)].map((m) => m[1].trim())
  const importsEsperados = [
    "'tailwindcss'",
    "'./styles/tokens.css'",
    "'./styles/harmonia.gerado.css'",
    "'./styles/tema.css'",
    "'./styles/literata-latin-opsz.css'",
    "'./styles/literata-latin-wght-italic.css'",
    "'./styles/outfit-latin-wght.css'",
    "'./styles/site.css'",
    "'./styles/campo.css'",
    "'./styles/foco.css'",
    "'./styles/abrir-fechar.css'",
  ]

  it('importa, na ordem aprovada, Tailwind, folhas do site e as variantes de Literata e Outfit', () => {
    expect(importsDoCss(estiloGlobal)).toEqual(importsEsperados)
  })

  it('detecta import extra, ausente ou fora de ordem, e uma variante de fonte não aprovada', () => {
    const linhas = importsEsperados.map((alvo) => `@import ${alvo};`)
    const css = linhas.join('\n')
    expect(importsDoCss(css)).toEqual(importsEsperados)

    const foraDeOrdem = [linhas[0], linhas[1], linhas[3], linhas[2], ...linhas.slice(4)]

    for (const alterado of [
      `${css}\n@import url("./extra.css");`,
      `${css}\n@import './extra.css'`,
      ...linhas.map((_, i) => linhas.filter((_, indice) => indice !== i).join('\n')),
      foraDeOrdem.join('\n'),
      css.replace('./styles/literata-latin-opsz.css', '@fontsource-variable/literata/opsz.css'),
      css.replace('literata-latin-opsz.css', 'literata-latin-ext-opsz.css'),
    ]) {
      expect(importsDoCss(alterado)).not.toEqual(importsEsperados)
    }
  })


  const variantesLatin = [
    ['literata-latin-opsz', 'literata', 'Literata', 'opsz', 'normal', '200 900'],
    ['literata-latin-wght-italic', 'literata', 'Literata', 'wght', 'italic', '200 900'],
    ['outfit-latin-wght', 'outfit', 'Outfit', 'wght', 'normal', '100 900'],
  ] as const
  const assetLatin = (pacote: string, eixo: string, estilo: string) =>
    `@fontsource-variable/${pacote}/files/${pacote}-latin-${eixo}-${estilo}.woff2`

  function fontesLatinExtras(arquivos: typeof fontes): string[] {
    const aprovados = new Set<string>(variantesLatin.map(([folha]) => `styles/${folha}.css`))
    return arquivos.filter(({ nome, texto }) => !aprovados.has(nome) &&
      /@fontsource-variable\/(?:literata|outfit)\b/i.test(semComentariosCss(texto))).map(({ nome }) => nome)
  }

  function rostoLatin(css: string, asset: string): string {
    const corpo = /^\s*@font-face\s*\{([^{}]+)\}\s*$/.exec(semComentariosCss(css))?.[1] ?? ''
    if (declaracao(corpo, 'src') !== `url(${asset}) format('woff2-variations')` ||
        [...corpo.matchAll(/\burl\s*\(/gi)].length !== 1) throw new Error(`origem Latin inválida: ${asset}`)
    return corpo
  }

  it('as três variantes carregam apenas os WOFF2 Latin aprovados, sem importar outros subconjuntos nas páginas', () => {
    const resolver = createRequire(import.meta.url)
    for (const [folha, pacote, familia, eixo, estilo, peso] of variantesLatin) {
      const asset = assetLatin(pacote, eixo, estilo)
      const corpo = rostoLatin(lerTexto(`styles/${folha}.css`), asset)
      expect(declaracao(corpo, 'font-family')).toBe(`'${familia} Variable'`)
      expect(declaracao(corpo, 'font-style')).toBe(estilo)
      expect(declaracao(corpo, 'font-weight')).toBe(peso)
      expect(declaracao(corpo, 'font-display')).toBe('swap')
      expect(declaracao(corpo, 'unicode-range')).toMatch(/^U\+0000-00FF,/)
      expect(existsSync(resolver.resolve(asset)), asset).toBe(true)
    }
    expect(fontesLatinExtras(fontes)).toEqual([])
  })

  it('rejeita wrapper vazio, arquivo errado ou extra, e importação ampla na rota ou em outro CSS', () => {
    const src = lerTexto('styles/literata-latin-opsz.css')
    const asset = assetLatin('literata', 'opsz', 'normal')
    const casos = [
      ['vazio', ''],
      ['latin-ext', src.replace(asset, asset.replace('-latin-', '-latin-ext-'))],
      ['cirílico', src.replace(asset, asset.replace('-latin-', '-cyrillic-'))],
      ['eixo e estilo errados', src.replace(asset, asset.replace('opsz-normal', 'wght-italic'))],
      ['face extra', `${src}\n${src}`],
      ['URL extra', src.replace(`url(${asset})`, `url(${asset}), url(extra.woff2)`)],
    ]
    for (const [caso, css] of casos) expect(() => rostoLatin(css, asset), caso).toThrow(/origem Latin inválida/)
    expect(fontesLatinExtras([
      { nome: 'paginas/Inicio.tsx', texto: "import '@fontsource-variable/literata/opsz.css'" },
      { nome: 'styles/extra.css', texto: "@import '@fontsource-variable/outfit/wght.css';" },
    ])).toEqual(['paginas/Inicio.tsx', 'styles/extra.css'])
  })

  it('há de 3 a 6 desenhos de traço distintos; decoração fica muda e imagem informativa tem descrição', () => {
    expect(new Set(NOMES_ILUSTRACAO).size).toBe(NOMES_ILUSTRACAO.length)
    expect(NOMES_ILUSTRACAO.length).toBeGreaterThanOrEqual(3)
    expect(NOMES_ILUSTRACAO.length).toBeLessThanOrEqual(6)
    for (const nome of NOMES_ILUSTRACAO) {
      for (const decorativa of [true, false]) {
        const raiz = document.createElement('div')
        raiz.innerHTML = renderToStaticMarkup(createElement(Ilustracao, { nome, decorativa }))
        const imagem = raiz.querySelector('img')!
        expect(imagem.getAttribute('data-ilustracao')).toBe(nome)
        expect(imagem.getAttribute('alt'), nome).toMatch(decorativa ? /^$/ : /\S/)
        for (const escala of ['1x', '2x']) {
          const alvo = `/ilustracoes/${nome}@${escala}.webp`
          expect(imagem.getAttribute('srcset'), alvo).toContain(alvo)
          expect(existsSync(pastaSrc + '../public' + alvo), alvo).toBe(true)
        }
      }
    }
    expect(arquivosTsx.filter(({ texto }) => /<svg\b/.test(semComentariosCss(texto))).map((f) => f.nome)).toEqual([])
  })
})

describe('tema', () => {
  // Apelidos e tintas de DESIGN.md, Colors; `mel` é intencionalmente o mesmo nos dois modos.
  const usos = [
    ['fundo', 'papel', 'noite'], ['texto', 'cacau', 'papel'], ['destaque', 'mel', 'mel'],
    ['sobre-destaque', 'cacau', 'cacau'], ['info', 'oliva-tinta', 'noite-2'], ['linha', 'cacau', 'papel'],
    ['foco', 'cacau', 'mel'], ['papel-fundo', 'areia', 'noite-cartao'], ['campo-sessao', 'mel', 'noite-cartao'],
    ['cartao', 'branco', 'noite-cartao'], ['link', 'oliva-tinta', 'noite-2'],
  ] as const

  it('define as variáveis de uso do tema claro com os papéis do dia', () => {
    for (const [uso, dia] of usos) expect(declaracao(semComentariosCss(claro), `--cor-${uso}`), uso).toBe(`var(--color-${dia})`)
  })

  it('madrugada global e local usam o mesmo bloco e apontam os mesmos papéis para as tintas da noite', () => {
    expect(temaCss).toMatch(/\[data-tema-local='madrugada'\],\s*:root\[data-tema='madrugada'\]\s*\{/)
    for (const [uso, , noite] of usos) expect(declaracao(semComentariosCss(madrugada), `--cor-${uso}`), uso).toBe(`var(--color-${noite})`)
  })

  it('a madrugada aumenta o alvo rápido para 56 px', () => {
    expect(claro).toMatch(/--alvo-rapido:\s*48px/)
    expect(madrugada).toMatch(/--alvo-rapido:\s*56px/)
  })

  it('os componentes só usam cores da paleta, nunca cor crua ou token de cor desconhecido', () => {
    const papeis = new Set([...Object.keys(lerTokens(tokensCss)), 'transparent', 'current'])
    const achados = fontes.filter((f) => f.nome !== 'styles/tokens.css').flatMap(({ nome, texto }) => {
      let limpo = semComentariosCss(texto).replace(/(^|\s)\/\/.*$/gm, '$1')
      // A05: só o chão de breu aprovado para a composição (mesma exceção exata de teste/estilo.test.ts).
      if (nome === composicao) limpo = limpo.replace('--co-breu: #18110F;', '')
      return [...limpo.matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\s*\(|var\(--color-([\w-]+)/gi)]
        .filter(([, papel]) => !papel || !papeis.has(papel))
        .map(([valor]) => `${nome}: ${valor}`)
    })
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


const siteRegras = regras(semComentariosCss(siteCss))
const corpoNoSite = (seletor: string) => siteRegras.filter((r) => r.seletor === seletor).map((r) => r.corpo).join(';')

describe('G3-1: alvo de toque', () => {
  it('o piso de 44 × 44 px cobre .alvo-toque e .botao sem vencer o botão do site ou os links atuais', () => {
    const piso = corpoAgrupado(':where(.alvo-toque)', '.botao') ?? ''
    expect(declaracao(piso, 'min-width')).toBe('44px')
    expect(declaracao(piso, 'min-height')).toBe('44px')
    expect(piso).not.toContain('!important')
    for (const [seletor, altura] of [['.cm-botao', 56], ['.cm-cab-link', 44]]) {
      const corpo = corpoNoSite(String(seletor))
      expect(declaracao(corpo, 'min-width')).toBe('44px')
      expect(declaracao(corpo, 'min-height')).toBe(`${altura}px`)
    }
    expect(declaracao(corpoNoSite('.cm-menu-link'), 'min-height')).toBe('72px')
  })

  it('nenhuma regra isolada das classes de base reduz o alvo abaixo de 44 px', () => {
    for (const seletor of ['.botao', ':where(.alvo-toque)', '.cm-botao', '.cm-cab-link', '.cm-menu-link']) {
      const corpos = [...corposDe(seletor), ...siteRegras.filter((r) => r.seletor === seletor).map((r) => r.corpo)]
      for (const corpo of corpos) for (const eixo of ['min-width', 'min-height']) {
        const valor = declaracao(corpo, eixo)
        if (valor) {
          expect(valor, `${seletor} ${eixo}`).toMatch(/^\d+px$/)
          expect(Number.parseInt(valor), `${seletor} ${eixo}`).toBeGreaterThanOrEqual(44)
        }
      }
    }
  })
})

describe('G3-2: barra de baixo', () => {
  const barra = lerTexto('componentes/rotina/BarraRegistroRapido.tsx')
  it('a barra Registrar fixa só quando pedida e a versão sem fixa fica no fluxo', () => {
    expect(barra).toMatch(/fixa\s*\?\s*'barra-fixa fixed inset-x-0 bottom-0 z-30'\s*:\s*'relative'/)
  })

  it('reorganiza as ações pela largura do contêiner em rem, não pela altura da janela', () => {
    expect(barra).toContain('@container/barra')
    expect(barra).toMatch(/grid-cols-2\b[^"\n]+@min-\[17\.25rem\]\/barra:grid-cols-4/)
    expect(semComentarios).not.toMatch(/@media\s*\(\s*max-height/)
  })
})

describe('G3-3: respiro da barra inferior', () => {
  it('a barra Registrar, presa ao viewport, reserva 6 px ou a área segura, o que for maior', () => {
    const barra = lerTexto('componentes/rotina/BarraRegistroRapido.tsx')
    const seguro = /max\(\s*6px\s*,\s*env\(safe-area-inset-bottom(?:\s*,\s*0px)?\)\s*\)/
    const regrasDaBarra = arquivosCss.flatMap((f) => regras(semComentariosCss(f.texto)))
      .filter(({ seletor }) => ['[data-barra-registrar]', '[data-barra-registrar].barra-fixa', '.registro-rapido.barra-fixa'].includes(seletor))
    const utilitario = /data-barra-registrar=""\s*className=\{`[^`]*\bpb-\[([^\]]+)\]/.exec(barra)?.[1]?.replaceAll('_', ' ')
    const valores = [utilitario, ...regrasDaBarra.map(({ corpo }) => declaracao(corpo, 'padding-bottom'))]
    expect(valores.some((valor) => valor && seguro.test(valor)), 'BarraRegistroRapido: espaço inferior para área segura (não o padding do conteúdo/rodapé)').toBe(true)
  })
})

describe('G4-2: tipografia compartilhada', () => {
  it('a etiqueta sem tipografia própria compõe o nível pequeno .t-ui', () => {
    const corpo = corposDe('.sb-etiqueta').join('')
    expect(corpo).not.toBe('')
    expect(lerTexto('componentes/base/Etiqueta.tsx')).toContain('className="sb-etiqueta t-ui"')
    for (const propriedade of ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform']) {
      expect(declaracao(corpo, propriedade), propriedade).toBeUndefined()
    }
    expect(declaracao(corposDe('.t-ui').join(''), 'font-size')).toBe('var(--texto-pequeno-tamanho)')
  })

  it('a face de exibição tem uma origem no tema padrão; a casca pública a aplica com especificidade zero', () => {
    const padrao = blocosApos(tokensCss, /@theme static\s*\{/g).join('')
    expect(declaracao(padrao, '--fonte-exibicao')).toBe("'Literata Variable', serif")
    expect(declaracao(padrao, '--font-titulo')).toBe('var(--fonte-exibicao)')
    expect(declaracao(claro, '--fonte-titulo')).toBe('var(--font-titulo)')
    expect(declaracao(corpoNoSite(":where(.cm-casca[data-titulos='site']) :where(h1, h2, h3, h4)"), 'font-family')).toBe('var(--fonte-exibicao)')
  })

  it('o grupo compartilhado de títulos cobre h1–h4 e marca; cada tracking segue seu papel', () => {
    const grupo = siteRegras.find(({ corpo }) => declaracao(corpo, 'font-family') === 'var(--fonte-titulo)')
    expect(grupo?.seletor.split(/\s*,\s*/)).toEqual(['.cm-h1', '.cm-h2', '.cm-h3', '.cm-h4', '.cm-marca'])
    for (const [seletor, tracking] of [['.cm-h1', '-0.02em'], ['.cm-h2', '-0.015em'], ['.cm-h3', '-0.01em'], ['.cm-marca', '-0.01em']]) {
      expect(declaracao(corpoNoSite(seletor), 'letter-spacing'), seletor).toBe(tracking)
    }
  })
})

describe('D1: madrugada sem ponto claro', () => {
  it('a lua ligada da casca usa fundo escuro, contorno de destaque e texto legível', () => {
    const cabecalho = lerTexto('componentes/casca/Cabecalho.tsx')
    expect(cabecalho).toMatch(/variante="contorno"[^>]*className="cm-cab-madrugada"[^>]*aria-pressed=\{madrugada\}/)
    const base = corpoNoSite(".cm-botao-contorno[aria-pressed='true']")
    expect(base).not.toBe('')
    const seletorLua = /cm-cab-madrugada.*aria-pressed=.*true|aria-pressed=.*true.*cm-cab-madrugada/
    const sobrescritas = [siteCss, lerTexto('styles/campo.css')].flatMap((css) => regras(semComentariosCss(css)))
      .filter((r) => seletorLua.test(r.seletor)).map((r) => r.corpo)
    const estilo = [base, ...sobrescritas].join(';')
    const declarado = (nome: string) => estilo.split(';').map((d) => declaracao(d, nome)).filter(Boolean).at(-1)
    expect(declarado('background-color'), 'a lua não pode ficar papel sobre noite quando ligada').toBe('var(--cor-papel-fundo)')
    expect(declarado('color')).toBe('var(--cor-texto)')
    expect(declarado('border') ?? `${declarado('border-width')} solid ${declarado('border-color')}`).toBe('2px solid var(--cor-destaque)')
  })

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


describe('D2: quadro das telas logadas (DESIGN.md, Quadro e contêineres)', () => {
  const layout = lerTexto('componentes/base/layout/layout.css')
  const seletorQuadro = "[data-h~='quadro']"
  const corpo = regras(semComentariosCss(layout)).find((r) => r.seletor === seletorQuadro)?.corpo ?? ''

  it('Hoje e Sessão usam o quadro centrado com largura e calha do tema', () => {
    for (const tela of ['Hoje', 'Sessao']) expect(lerTexto(`paginas/rotina/${tela}.tsx`), tela).toMatch(/<QuadroLayout\b/)
    expect(declaracao(corpo, 'width')).toBe('min(var(--quadro-largura), 100vw - 2 * var(--quadro-calha))')
    expect(declaracao(corpo, 'margin-inline')).toBe('auto')
  })

  it('o quadro logado usa calha, não a moldura vertical do protótipo', () => {
    expect(corpo).not.toMatch(/\bborder(?:-inline|-left|-right)?\s*:/)
    expect(harmoniaCss).toMatch(/--quadro-calha:\s*clamp\(/)
    expect(layout).not.toMatch(/\.coluna-app\b/)
    expect(semComentarios).not.toMatch(/\.coluna-app\b/)
  })
})

describe('D5/R1: navegação da casca em largura e texto restritos', () => {
  const cabecalho = lerTexto('componentes/casca/Cabecalho.tsx')
  const menu = lerTexto('componentes/casca/MenuCelular.tsx')
  const folhas = [corpoNoSite('.cm-cab-link'), corpoNoSite('.cm-menu-link')]
  const desktop = blocosApos(siteCss, /@media\s*\(min-width:\s*1100px\)\s*\{/g)
    .flatMap((b) => blocosApos(b, /@container cm-cab\s*\(min-width:\s*67rem\)\s*\{/g)).join('')

  it('não hifeniza automaticamente os rótulos do cabeçalho nem do menu', () => {
    expect(cabecalho).not.toMatch(/hyphens-auto|\[hyphens:auto\]/)
    expect(menu).not.toMatch(/hyphens-auto|\[hyphens:auto\]/)
    for (const corpo of folhas) {
      expect(corpo).not.toBe('')
      expect(declaracao(corpo, 'hyphens') ?? 'manual').toBe('manual')
    }
  })

  it('o link da linha só usa nowrap onde a navegação cabe; o menu estreito deixa quebrar', () => {
    expect(declaracao(corpoNoSite('.cm-cab-link'), 'white-space')).toBe('nowrap')
    expect(declaracao(corpoNoSite('.cm-menu-link'), 'white-space') ?? 'normal').toBe('normal')
    expect(declaracao(corpoNoSite('.cm-h3'), 'white-space')).toBeUndefined()
    expect(siteCss).toMatch(/\.cm-h4\s*\{\s*overflow-wrap:\s*anywhere/)
    expect(menu).toContain('className="cm-menu-link cm-h3"')
  })

  it('o ancestral real da linha é um contêiner inline-size', () => {
    expect(cabecalho).toMatch(/<div className="cm-cab-faixa"[^>]*>[\s\S]*?<nav[^>]*className="cm-cab-links"/)
    expect(declaracao(corpoNoSite('.cm-cab-faixa'), 'container')).toBe('cm-cab / inline-size')
  })

  it('a linha começa recolhida e só substitui o botão Menu com as duas guardas: viewport e 67 rem', () => {
    expect(declaracao(corpoNoSite('.cm-cab-links').split(';').find((x) => /display:\s*none/.test(x)) ?? '', 'display')).toBe('none')
    const regrasDesktop = regras(desktop)
    expect(regrasDesktop.find((r) => r.seletor === '.cm-cab-links')?.corpo).toMatch(/display:\s*flex/)
    expect(regrasDesktop.find((r) => r.seletor === '.sb-cab-menu')?.corpo).toMatch(/display:\s*none/)
  })

  it('o menu estreito é uma lista vertical sem posições de grade que mudem a ordem de leitura', () => {
    expect(menu).toMatch(/<ul className="cm-menu-lista">[\s\S]*?<li key=\{item\.para\}>[\s\S]*?<NavLink to=\{item\.para\}/)
    expect(corpoNoSite('.cm-menu-lista')).not.toMatch(/grid-|flex-direction:\s*row/)
    expect(folhas.join('')).not.toMatch(/\b(?:grid-column|grid-row|order)\s*:/)
  })

  it('nas duas apresentações a lista é percorrida na mesma ordem e o link atual é diferenciado sem mudar a posição', () => {
    for (const jsx of [cabecalho, menu]) expect(jsx).toMatch(/ITENS_DO_CABECALHO\[contexto\]\.map\(/)
    expect(corpoNoSite(".cm-menu-link[aria-current='page']")).toMatch(/text-decoration:\s*underline/)
    expect(siteRegras.find((r) => r.seletor.includes(".cm-cab-link[aria-current='page']"))?.corpo).toMatch(/text-decoration-color:\s*currentColor/)
  })

  it('em 16 rem texto ampliado pode quebrar a linha de ações sem reorganizar os elementos', () => {
    const curto = blocosApos(siteCss, /@container cm-cab\s*\(max-width:\s*16rem\)\s*\{/g).join('')
    for (const alvo of ['.cm-cab-miolo', '.cm-cab-acoes']) {
      const regra = regras(curto).find((r) => r.seletor === alvo)?.corpo ?? ''
      expect(declaracao(regra, 'flex-wrap'), alvo).toBe('wrap')
      expect(declaracao(regra, 'order'), alvo).toBeUndefined()
    }
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


describe('D6: cronômetro legível', () => {
  const cronometro = lerTexto('componentes/app/CronometroSessao.tsx')
  it('Sessão mostra números tabulares, em Literata, na linha do tempo acessível', () => {
    expect(lerTexto('paginas/rotina/Sessao.tsx')).toMatch(/<CronometroSessao\b/)
    expect(cronometro).toMatch(/role="timer"[\s\S]*?className=\{`[^`]*\bfont-titulo\b[^`]*\bleading-none\b[^`]*\btabular-nums\b/)
  })

  it('o cronômetro longo usa uma variante menor nos dois tamanhos, sem depender da ordem das classes', () => {
    const tamanhos = /normal:\s*'text-\[(\d+)px\] lg:text-\[(\d+)px\]',\s*longo:\s*'text-\[(\d+)px\] lg:text-\[(\d+)px\]'/.exec(cronometro)
    expect(tamanhos).not.toBeNull()
    const [normal, normalLargo, longo, longoLargo] = tamanhos!.slice(1).map(Number)
    expect([normal, normalLargo, longo, longoLargo]).toEqual([72, 160, 56, 120])
    expect(longo).toBeLessThan(normal)
    expect(longoLargo).toBeLessThan(normalLargo)
    expect(cronometro).toContain('TAMANHO[tamanhoDoCronometro(cronometro)]')
    const cartaoHoje = lerTexto('componentes/app/CartaoSessao.tsx')
    expect(cartaoHoje).toMatch(/className=\{`[^`]*\bfont-titulo\b[^`]*text-\[64px\][^`]*\btabular-nums\b[^`]*lg:text-\[120px\]/)
    expect(64).toBeLessThan(normal)
    expect(120).toBeLessThan(normalLargo)
  })
})

describe('D7: sem destinos “Em breve” na casca atual', () => {
  it('cabeçalho e menu oferecem apenas as seis áreas reais, na ordem do produto', () => {
    expect(ITENS_DO_CABECALHO.logado.map((item) => [item.rotulo, item.para])).toEqual([
      ['Hoje', '/app/hoje'], ['Sessão', '/app/sessao'], ['Histórico', '/app/historico'],
      ['Desenvolvimento', '/app/desenvolvimento'], ['Comunidade', '/app/comunidade'], ['Família', '/app/familia'],
    ])
    expect(semComentarios).not.toMatch(/\.nav-legenda\b/)
  })
})

describe('index.html', () => {
  it('declara o idioma e o título', () => {
    expect(indexHtml).toContain('lang="pt-BR"')
    expect(indexHtml).toContain('<title>AppMaternidade</title>')
  })

  it('traz a descrição e a cor do tema', () => {
    expect(indexHtml).toContain('<meta name="description" content="Site para a família registrar a rotina do bebê, dividir os cuidados e acompanhar o desenvolvimento. Demonstração com dados fictícios." />')
    expect(indexHtml).toMatch(/<meta name="theme-color" content="#[0-9a-f]{6}" \/>/)
  })
})
