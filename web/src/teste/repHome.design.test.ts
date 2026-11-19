import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// REP-HOME, round 1: the design-side contracts of the rebuilt `/`, read from disk (node:fs and
// node:crypto only, so a missing file is an assertion failure and never a missing module).
//   REPH-I-15  no forbidden library or effect in package.json or in the sources of `/`.
//   REPH-I-17  display variants A/B/C, the boot read of `?exibicao=b|c`, the M PLUS Rounded 1c package,
//              its licence, its PROVENANCE line and the meter's FONTES allow-list.
//   REPH-I-21  DESIGN.md: a Motion row per moment 1-3 and a note on the variants.
//   REPH-I-22  catalogo.ts: the records M15-M17 hold every motion number of the spec section 3.3.
// The page sources are the ones the card creates: `paginas/Inicio.tsx`, `componentes/inicio-casa/**`
// and `movimento/troca/**`.

const PASTA_WEB = process.cwd()
const SRC = join(PASTA_WEB, 'src')
const lerWeb = (...partes: string[]) => readFileSync(join(PASTA_WEB, ...partes), 'utf8')
const lerSrc = (...partes: string[]) => readFileSync(join(SRC, ...partes), 'utf8')

const PASTAS_DA_PAGINA = [join(SRC, 'componentes', 'inicio-casa'), join(SRC, 'movimento', 'troca')]

function arquivosDe(pasta: string): string[] {
  if (!existsSync(pasta)) return []
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivosDe(caminho) : [caminho]
  })
}

/** The page's own sources (not its tests): the page file plus the two folders. */
const fontesDaPagina = () => [join(SRC, 'paginas', 'Inicio.tsx'), ...PASTAS_DA_PAGINA.flatMap(arquivosDe)].filter((arquivo) => !/\.test\.tsx?$/.test(arquivo))

const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')

// ---------------------------------------------------------------------------------------------
// REPH-I-15
// ---------------------------------------------------------------------------------------------

const PACOTES_PROIBIDOS =
  /^(gsap|lenis|@studio-freight\/lenis|three|@react-three\/.+|@rive-app\/.+|lottie-web|@lottiefiles\/.+|@splinetool\/.+)$/

/** Forbidden packages named in a package.json text (dependencies, devDependencies, peer and optional). */
function pacotesProibidos(packageJson: string): string[] {
  const dados = JSON.parse(packageJson) as Record<string, Record<string, string> | undefined>
  const nomes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].flatMap((chave) => Object.keys(dados[chave] ?? {}))
  return nomes.filter((nome) => PACOTES_PROIBIDOS.test(nome))
}

const EFEITOS_PROIBIDOS: Array<[nome: string, padrao: RegExp]> = [
  ['backdrop-filter', /backdrop-filter/],
  ['filter: blur()', /blur\(/],
  ['gradient', /-gradient\(/],
  ['infinite loop', /iteration-count\s*:\s*infinite|\binfinite\b/],
  ['letreiro (marquee)', /cm-letreiro/],
  ['3D transform', /perspective|preserve-3d|translate3d|rotate[XYZ]\(|scale3d|matrix3d/],
  ['forbidden library import', /(?:from\s+|import\(\s*|require\(\s*)['"](?:gsap|lenis|@studio-freight\/lenis|three|@react-three\/[^'"]+|@rive-app\/[^'"]+|lottie-web|@lottiefiles\/[^'"]+|@splinetool\/[^'"]+)['"]/],
]

/** The forbidden effects a source text carries (comments removed). */
const efeitosProibidos = (texto: string) => EFEITOS_PROIBIDOS.filter(([, padrao]) => padrao.test(semComentarios(texto))).map(([nome]) => nome)

describe('REPH-I-15 no forbidden library or effect on /', () => {
  it('REPH-I-15 package.json has no forbidden package, the page sources exist and carry no forbidden effect, and the scanner sees each one', () => {
    // Controls of the scanners.
    expect(pacotesProibidos('{"dependencies":{"gsap":"3.0.0"}}')).toEqual(['gsap'])
    expect(pacotesProibidos('{"devDependencies":{"@react-three/fiber":"1"}}')).toEqual(['@react-three/fiber'])
    expect(pacotesProibidos('{"dependencies":{"motion":"12.43.0"}}')).toEqual([])
    expect(efeitosProibidos('.a { backdrop-filter: blur(4px) }')).toEqual(expect.arrayContaining(['backdrop-filter', 'filter: blur()']))
    expect(efeitosProibidos('.a { animation: x 1s infinite }')).toContain('infinite loop')
    expect(efeitosProibidos('.a { background: linear-gradient(red, blue) }')).toContain('gradient')
    expect(efeitosProibidos('.a { transform: perspective(10px) }')).toContain('3D transform')
    expect(efeitosProibidos("import gsap from 'gsap'")).toContain('forbidden library import')
    expect(efeitosProibidos('/* infinite */ .a { color: red }')).toEqual([])
    // The real thing.
    expect(pacotesProibidos(lerWeb('package.json'))).toEqual([])
    for (const pasta of PASTAS_DA_PAGINA) expect(existsSync(pasta), pasta).toBe(true)
    const fontes = fontesDaPagina()
    expect(fontes.length).toBeGreaterThan(2)
    for (const arquivo of fontes) expect(efeitosProibidos(readFileSync(arquivo, 'utf8')), arquivo).toEqual([])
  })

  it('REPH-I-15 the motion library is motion 12.43.0 (exact) and the page imports only from motion/react', () => {
    const pacote = JSON.parse(lerWeb('package.json')) as { dependencies?: Record<string, string> }
    expect(pacote.dependencies?.motion).toBe('12.43.0')
    for (const pasta of PASTAS_DA_PAGINA) expect(existsSync(pasta), pasta).toBe(true)
    for (const arquivo of fontesDaPagina().filter((f) => /\.tsx?$/.test(f))) {
      const importados = [...semComentarios(readFileSync(arquivo, 'utf8')).matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
      for (const modulo of importados.filter((m) => /^(motion|framer-motion)(\/|$)/.test(m))) {
        expect(modulo, arquivo).toBe('motion/react')
      }
    }
  })

  it('REPH-I-15 the troca stylesheet has no infinite loop and no cm-letreiro rule exists for /', () => {
    const css = arquivosDe(join(SRC, 'movimento', 'troca')).filter((f) => f.endsWith('.css'))
    expect(css.length).toBeGreaterThan(0)
    for (const arquivo of css) expect(semComentarios(readFileSync(arquivo, 'utf8')), arquivo).not.toMatch(/infinite/)
    const casa = arquivosDe(join(SRC, 'componentes', 'inicio-casa')).filter((f) => f.endsWith('.css'))
    expect(casa.length).toBeGreaterThan(0)
    for (const arquivo of casa) expect(semComentarios(readFileSync(arquivo, 'utf8')), arquivo).not.toMatch(/cm-letreiro/)
  })
})

// ---------------------------------------------------------------------------------------------
// REPH-I-17
// ---------------------------------------------------------------------------------------------

/** The body of the first rule whose selector matches `seletor` (a regex source), or null. */
function bloco(css: string, seletor: string): string | null {
  const m = new RegExp(`${seletor}\\s*\\{([^}]*)\\}`).exec(semComentarios(css))
  return m ? m[1] : null
}

const PACOTE_FONTE = '@fontsource/m-plus-rounded-1c'
const LICENCA_FONTE = join('licencas', 'fontsource-m-plus-rounded-1c.txt')

describe('REPH-I-17 display variants A/B/C and the M PLUS Rounded 1c package', () => {
  it('REPH-I-17 tokens.css: variant A is the default block, B and C are html[data-exibicao] blocks with their faces, weights and sizes', () => {
    const tokens = lerSrc('styles', 'tokens.css')
    // A: the default token block keeps Literata 600 (the first declarations, before any variant block).
    const padrao = semComentarios(tokens).split(/html\[data-exibicao/)[0]
    expect(padrao).toMatch(/--fonte-exibicao:\s*'Literata Variable',\s*serif/)
    expect(padrao).toMatch(/--peso-exibicao:\s*600/)
    expect(padrao).toMatch(/--peso-titulo:\s*600/)
    // B: M PLUS Rounded 1c, weights 800 (exibicao) and 700 (titulo), same sizes as A.
    const b = bloco(tokens, `html\\[data-exibicao=["']b["']\\]`)
    expect(b, 'html[data-exibicao="b"] block').not.toBeNull()
    expect(b).toMatch(/--fonte-exibicao:\s*['"]M PLUS Rounded 1c['"]/)
    expect(b).toMatch(/--peso-exibicao:\s*800/)
    expect(b).toMatch(/--peso-titulo:\s*700/)
    // C: Literata 600 at 64/68 (1440) and 40/44 (390).
    const c = bloco(tokens, `html\\[data-exibicao=["']c["']\\]`)
    expect(c, 'html[data-exibicao="c"] block').not.toBeNull()
    expect(c).toMatch(/--fonte-exibicao:\s*['"]Literata Variable['"]/)
    expect(c).toMatch(/--peso-exibicao:\s*600/)
    for (const medida of [/(64px|4rem)\b/, /(68px|4\.25rem)\b/, /(40px|2\.5rem)\b/, /(44px|2\.75rem)\b/]) expect(c).toMatch(medida)
    // The variants are blocks of tokens: nothing else selects on the attribute.
    expect([...semComentarios(tokens).matchAll(/data-exibicao/g)]).toHaveLength(2)
  })

  it('REPH-I-17 main.tsx reads ?exibicao=b|c once at boot, sets data-exibicao on html, and does not persist it', () => {
    const principal = lerSrc('main.tsx')
    expect(principal).toMatch(/URLSearchParams|searchParams/)
    expect(principal).toMatch(/exibicao/)
    expect(principal).toMatch(/['"]b['"]/)
    expect(principal).toMatch(/['"]c['"]/)
    expect(principal).toMatch(/dataset\.exibicao|setAttribute\(\s*['"]data-exibicao['"]/)
    expect(principal).toMatch(/documentElement/)
    const linhas = principal.split(/\r?\n/).filter((linha) => /exibicao/.test(linha))
    expect(linhas.filter((linha) => /localStorage|sessionStorage|cookie/.test(linha))).toEqual([])
    expect(linhas.length).toBeGreaterThan(0)
  })

  it('REPH-I-17 @fontsource/m-plus-rounded-1c is 5.3.0 exactly, with only latin 700 and 800 imported, its licence copied and its PROVENANCE line written', () => {
    const pacote = JSON.parse(lerWeb('package.json')) as { dependencies?: Record<string, string> }
    expect(pacote.dependencies?.[PACOTE_FONTE]).toBe('5.3.0')
    const trava = JSON.parse(lerWeb('package-lock.json')) as { packages?: Record<string, { version?: string }> }
    expect(trava.packages?.[`node_modules/${PACOTE_FONTE}`]?.version).toBe('5.3.0')

    // The licence copy, and the PROVENANCE row that points at it with its sha256.
    expect(existsSync(join(PASTA_WEB, LICENCA_FONTE))).toBe(true)
    const licenca = readFileSync(join(PASTA_WEB, LICENCA_FONTE))
    expect(licenca.toString('utf8')).toMatch(/SIL OPEN FONT LICENSE/i)
    const hash = createHash('sha256').update(licenca).digest('hex')
    const linha = lerWeb('PROVENANCE.md')
      .split(/\r?\n/)
      .find((l) => l.includes(PACOTE_FONTE))
    expect(linha, `a PROVENANCE.md line for ${PACOTE_FONTE} (licence sha256 ${hash})`).toBeDefined()
    expect(linha).toContain('5.3.0')
    expect(linha).toContain('OFL-1.1')
    expect(linha).toContain('web/licencas/fontsource-m-plus-rounded-1c.txt')
    expect(linha).toContain(hash)
    expect(linha).toMatch(/latin/i)
    expect(linha).toMatch(/700/)
    expect(linha).toMatch(/800/)

    // Only the latin 700 and 800 files are imported.
    const css = lerSrc('index.css')
    const importados = [...css.matchAll(/['"]([^'"]*m-plus-rounded-1c[^'"]*)['"]/g)].map((m) => m[1]).sort()
    expect(importados).toEqual([`${PACOTE_FONTE}/latin-700.css`, `${PACOTE_FONTE}/latin-800.css`])
  })

  it('REPH-I-17 the meter FONTES allow-list names M PLUS Rounded 1c next to Literata and Outfit', () => {
    const medidor = readFileSync(join(PASTA_WEB, 'scripts', 'medir-dom.mjs'), 'utf8')
    const lista = /export const FAMILIAS_PERMITIDAS = \[([^\]]*)\]/.exec(medidor)
    expect(lista).not.toBeNull()
    for (const familia of ['Literata', 'Outfit', 'M PLUS Rounded 1c']) expect(lista![1]).toContain(`'${familia}'`)
  })
})

describe('REP-HOME-R1-01 the M06 plate is the containing block of its light group', () => {
  it('REP-HOME-R1-01 the narrow-width .ic-m06 rule is positioned (relative) and the desktop one stays absolute', () => {
    const css = semComentarios(lerSrc('componentes', 'inicio-casa', 'inicio-casa.css'))
    const regras = [...css.matchAll(/\[data-casa\] \.ic-m06\s*\{([^}]*)\}/g)].map((m) => m[1])
    expect(regras).toHaveLength(2)
    const [estreita, larga] = regras
    expect(estreita).toMatch(/position:\s*relative\b/)
    expect(larga).toMatch(/position:\s*absolute\b/)
  })
})

// ---------------------------------------------------------------------------------------------
// REPH-I-21
// ---------------------------------------------------------------------------------------------

/** The text of the `## <titulo>` section of a markdown file, up to the next `## `. */
function secao(markdown: string, titulo: string): string {
  const inicio = markdown.search(new RegExp(`^## ${titulo}\\s*$`, 'm'))
  if (inicio === -1) return ''
  const resto = markdown.slice(inicio + 1)
  const fim = resto.search(/^## /m)
  return fim === -1 ? resto : resto.slice(0, fim)
}

describe('REPH-I-21 DESIGN.md: a Motion row per moment 1-3 and a note on the variants', () => {
  it('REPH-I-21 the Motion table has rows for M15 (lamp), M16 (night wipe) and M17 (caption) with their numbers and a reduced-motion cell', () => {
    const movimento = secao(lerWeb('DESIGN.md'), 'Motion')
    const linhas = movimento.split(/\r?\n/).filter((linha) => linha.startsWith('|'))
    const linhaDe = (id: string) => linhas.find((linha) => new RegExp(`\\b${id}\\b`).test(linha))
    const m15 = linhaDe('M15')
    const m16 = linhaDe('M16')
    const m17 = linhaDe('M17')
    expect(m15, 'a Motion row for M15').toBeDefined()
    expect(m16, 'a Motion row for M16').toBeDefined()
    expect(m17, 'a Motion row for M17').toBeDefined()
    for (const numero of ['240', '320', '300', '80']) expect(m15).toMatch(new RegExp(`\\b${numero}\\b`))
    for (const numero of ['600', '480', '360']) expect(m16).toMatch(new RegExp(`\\b${numero}\\b`))
    for (const numero of ['160', '220']) expect(m17).toMatch(new RegExp(`\\b${numero}\\b`))
    expect(m17).toMatch(/\b6\b/)
    // Three cells at least (where | movement | reduced motion), the last one not empty.
    for (const linha of [m15!, m16!, m17!]) {
      const celulas = linha.split('|').slice(1, -1).map((c) => c.trim())
      expect(celulas.length, linha).toBeGreaterThanOrEqual(3)
      expect(celulas[celulas.length - 1], linha).not.toBe('')
    }
  })

  it('REPH-I-21 the Typography section carries a note on the three variant blocks', () => {
    const tipografia = secao(lerWeb('DESIGN.md'), 'Typography')
    expect(tipografia).toContain('data-exibicao')
    expect(tipografia).toContain('M PLUS Rounded 1c')
    expect(tipografia).toMatch(/\bB\b/)
    expect(tipografia).toMatch(/\bC\b/)
    // The note for the variants is temporary (FG-2b removes the losing blocks): the line says so.
    const notas = tipografia.split(/\r?\n/).filter((linha) => linha.includes('data-exibicao'))
    expect(notas.some((linha) => /FG-2b|tempor/i.test(linha))).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------------
// REPH-I-22
// ---------------------------------------------------------------------------------------------

/** The body of the record `Mnn: { ... }` in catalogo.ts: from its key to the next record key or the end of the object. */
function registro(catalogo: string, id: string): string | null {
  // The body starts after the opening brace of the key (an indented line is fine) and stops at the next record key
  // or at the closing of the object (`as const` or `satisfies`).
  const abre = new RegExp(`^[ \\t]*${id}:\\s*\\{`, 'm').exec(catalogo)
  if (!abre) return null
  const resto = catalogo.slice(abre.index + abre[0].length)
  const fim = resto.search(/^[ \t]*M\d+:\s*\{|^\}\s*(?:as const|satisfies)/m)
  const corpo = fim === -1 ? resto : resto.slice(0, fim)
  return `${id}: {${corpo}`
}

describe('REPH-I-22 catalogo.ts: M15 (lamp), M16 (night wipe) and M17 (caption) hold every number of the section 3.3 table', () => {
  const catalogo = () => lerSrc('movimento', 'catalogo.ts')

  it('REPH-I-22 M15 is the lamp: cone 240 ms, pool 320 ms, 80 ms stagger, 300 ms delay, curve (0.16, 1, 0.3, 1), opacity only', () => {
    const m15 = registro(catalogo(), 'M15')
    expect(m15, 'record M15').not.toBeNull()
    expect(m15).toMatch(/id:\s*'M15'/)
    expect(m15).toMatch(/tipo:\s*'tempo'/)
    for (const numero of ['240', '320']) expect(m15).toMatch(new RegExp(`\\b${numero}\\b`))
    expect(m15).toMatch(/escalonamentoMs:\s*80\b/)
    expect(m15).toMatch(/atrasoMs:\s*300\b/)
    expect(m15).toMatch(/\[\s*0\.16,\s*1,\s*0\.3,\s*1\s*\]/)
  })

  it('REPH-I-22 M16 is the night wipe: a scroll record with the pin distances 600 (1440), 480 (1024-1279) and 360 (below 1024), the svh equivalent in a comment', () => {
    const m16 = registro(catalogo(), 'M16')
    expect(m16, 'record M16').not.toBeNull()
    expect(m16).toMatch(/id:\s*'M16'/)
    expect(m16).toMatch(/tipo:\s*'rolagem'/)
    for (const numero of ['600', '480', '360']) expect(m16).toMatch(new RegExp(`\\b${numero}\\b`))
    expect(m16).toMatch(/janelaPx/)
    expect(m16).toMatch(/svh/)
  })

  it('REPH-I-22 M17 is the caption: out 160 ms, in 220 ms, 6 px, curve (0.4, 0, 0.2, 1)', () => {
    const m17 = registro(catalogo(), 'M17')
    expect(m17, 'record M17').not.toBeNull()
    expect(m17).toMatch(/id:\s*'M17'/)
    expect(m17).toMatch(/duracaoSaidaMs:\s*160\b/)
    expect(m17).toMatch(/duracaoMs:\s*220\b/)
    expect(m17).toMatch(/deslocamentoPx:\s*6\b/)
    expect(m17).toMatch(/\[\s*0\.4,\s*0,\s*0\.2,\s*1\s*\]/)
  })

  it('REPH-I-22 the records are in the catalogue object and the page reads them (no loose motion number in the troca sources)', () => {
    const texto = catalogo()
    for (const id of ['M15', 'M16', 'M17']) expect(registro(texto, id), id).not.toBeNull()
    expect(PASTAS_DA_PAGINA.every((pasta) => existsSync(pasta))).toBe(true)
    const usos = arquivosDe(join(SRC, 'movimento', 'troca'))
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n')
    for (const id of ['M15', 'M16', 'M17']) expect(usos, id).toMatch(new RegExp(`CATALOGO\\.${id}\\b`))
  })
})
