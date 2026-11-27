// node --test web/scripts/baseDoSite.test.mjs   (from the worktree root; it spawns `vite build` once, ~10-30 s)
//
// Gate for "every public image URL goes through the site base". It builds the site the way the Pages workflow does
// (BASE_SITE=/AppMaternidade/previa/) into a temporary folder and scans dist/**/*.{js,css,html} for a root-absolute
// public asset URL (`"/cenas/x"`, `url(/molduras/x)`, `/cenas/a.webp 900w, /cenas/b.webp 1672w` in a srcset): on a
// subpath deploy that URL asks the host root and 404s. `/AppMaternidade/previa/cenas/x` is fine.
//
// What counts as a hit in the JS: a root-absolute public path inside a string literal. The sources legitimately keep
// such literals as the INPUT of the base-aware helpers (`imagemPublica({ src: '/cenas/x' })`, `urlPublica('/cenas/x')`,
// `srcSetWebp('/cenas/x')`) and as the `base` stem of a scene (`base: '/cenas/acesso/porta'`, later passed through
// `urlPublica`). Those inputs survive in the bundle as plain strings, so a text scan cannot tell them from a raw URL.
// The scan therefore parses each chunk (vite's own `parseAst`; the build runs with `--minify false` so the helper names
// survive) and ignores a literal that is an argument of one of those helpers, or the value of a `base` property or
// variable (the stem a component suffixes with `@1x.webp` and sends through `urlPublica`). Any
// other literal, in particular an exported `Imagem` constant that was not wrapped, is a hit. The rendered result of
// those helpers is checked page by page in src/teste/baseDoSite.test.tsx.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import process from 'node:process'
import { after, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const WEB = fileURLToPath(new URL('..', import.meta.url))
const BASE = '/AppMaternidade/previa/'
const AJUDANTES = /^(imagemPublica|urlPublica|srcSetWebp)(\$\d+)?$/

/** The top folders of web/public (cenas, telas, molduras, ilustracoes, ...), read from the directory. */
export function pastasPublicas(publico = join(WEB, 'public')) {
  return readdirSync(publico, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
}

/**
 * Every root-absolute public asset URL in `texto`: a `/<folder>/` whose previous character is a quote, a backtick,
 * `(`, a space or a comma. `/AppMaternidade/previa/cenas/` does not match (the slash before `cenas` follows an `a`).
 * Returns `{ indice, trecho }` for each hit.
 */
export function acharUrlsRaizAbsolutas(texto, pastas) {
  const alvo = new RegExp(`(?<=["'\`(\\s,])/(?:${pastas.join('|')})/[^\\s"'\`),]*`, 'g')
  return [...texto.matchAll(alvo)].map((achado) => ({ indice: achado.index, trecho: achado[0] }))
}

function nomeDoChamado(chamado) {
  if (chamado.type === 'Identifier') return chamado.name
  if (chamado.type === 'MemberExpression' && !chamado.computed) return chamado.property.name
  return ''
}

/** The string-like ranges of a chunk and the ranges of the helper arguments / `base` values, from its AST. */
function mapaDoJs(codigo) {
  const { parseAst } = globalThis.__vite
  const textos = []
  const isentos = []
  const visitar = (no) => {
    if (Array.isArray(no)) return no.forEach(visitar)
    if (no === null || typeof no !== 'object') return
    if (no.type === 'Literal' && typeof no.value === 'string') textos.push([no.start, no.end])
    if (no.type === 'TemplateElement') textos.push([no.start, no.end])
    if (no.type === 'CallExpression' && AJUDANTES.test(nomeDoChamado(no.callee))) {
      for (const argumento of no.arguments) isentos.push([argumento.start, argumento.end])
    }
    if (no.type === 'Property' && !no.computed) {
      const chave = no.key.type === 'Identifier' ? no.key.name : no.key.value
      if (chave === 'base') isentos.push([no.value.start, no.value.end])
    }
    if (no.type === 'VariableDeclarator' && no.id.type === 'Identifier' && /^base(\$\d+)?$/.test(no.id.name) && no.init) {
      isentos.push([no.init.start, no.init.end])
    }
    for (const filho of Object.values(no)) visitar(filho)
  }
  visitar(parseAst(codigo, { lang: 'js' }))
  return { textos, isentos }
}

/** The hits of a JS chunk: inside a string literal and outside every helper argument / `base` value. */
export function acharNoJs(codigo, pastas) {
  const { textos, isentos } = mapaDoJs(codigo)
  const dentro = (faixas, indice) => faixas.some(([ini, fim]) => indice >= ini && indice < fim)
  return acharUrlsRaizAbsolutas(codigo, pastas).filter(
    ({ indice }) => dentro(textos, indice) && !dentro(isentos, indice),
  )
}

globalThis.__vite = await import(pathToFileURL(join(WEB, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href)

const PASTAS = pastasPublicas()

test('a pasta public tem as pastas esperadas', () => {
  for (const pasta of ['cenas', 'telas', 'molduras', 'ilustracoes']) assert.ok(PASTAS.includes(pasta), pasta)
})

test('controle negativo: o detector pega a URL raiz-absoluta e deixa passar a que leva a base', () => {
  const ruins = [
    '"/cenas/x.webp"',
    "'/telas/casa/x.webp'",
    '`/molduras/moldura-dia.png`',
    'background:url(/molduras/x.png)',
    'background:url("/ilustracoes/x.webp")',
    'srcset="/cenas/a.webp 900w, /cenas/b.webp 1672w"',
    '<img src="/telas/t1i/x.webp">',
  ]
  for (const texto of ruins) assert.ok(acharUrlsRaizAbsolutas(texto, PASTAS).length > 0, texto)
  assert.equal(acharUrlsRaizAbsolutas('srcset="/cenas/a.webp 900w, /cenas/b.webp 1672w"', PASTAS).length, 2)
  const bons = [
    `"${BASE}cenas/x.webp"`,
    `url(${BASE}molduras/x.png)`,
    `srcset="${BASE}cenas/a.webp 900w, ${BASE}cenas/b.webp 1672w"`,
    '"/assets/index-abc.js"',
    '"/outra-coisa/cenas/x"',
  ]
  for (const texto of bons) assert.deepEqual(acharUrlsRaizAbsolutas(texto, PASTAS), [], texto)
})

test('controle negativo do JS: literal solto é achado; argumento de ajudante, valor de base e comentário não são', () => {
  assert.equal(acharNoJs('export const A = { src: "/cenas/x.webp", largura: 1 };', PASTAS).length, 1)
  assert.equal(acharNoJs('const a = ["/cenas/a.webp 1w", "/cenas/b.webp 2w"].join(", ");', PASTAS).length, 2)
  assert.equal(acharNoJs('export const A = imagemPublica({ src: "/cenas/x.webp", srcSet: "/cenas/x.webp 1w" });', PASTAS).length, 0)
  assert.equal(acharNoJs('const u = urlPublica("/cenas/x.webp"); const v = srcSetWebp$1("/cenas/y");', PASTAS).length, 0)
  assert.equal(acharNoJs('const c = { base: "/cenas/acesso/porta", largura: 1 };', PASTAS).length, 0)
  assert.equal(acharNoJs('const base = `/ilustracoes/${nome}`;', PASTAS).length, 0)
  assert.equal(acharNoJs('// a imagem em "/cenas/x.webp"\nconst a = 1;', PASTAS).length, 0)
  assert.equal(acharNoJs(`const a = imagemPublica({ src: "/cenas/x" }), b = "/cenas/y";`, PASTAS).length, 1)
})

const saida = mkdtempSync(join(tmpdir(), 'base-do-site-'))
after(() => rmSync(saida, { recursive: true, force: true }))

function arquivosDe(pasta, extensoes) {
  const achados = []
  for (const entrada of readdirSync(pasta, { withFileTypes: true, recursive: true })) {
    if (!entrada.isFile() || !extensoes.some((e) => entrada.name.endsWith(e))) continue
    achados.push(join(entrada.parentPath, entrada.name))
  }
  return achados
}

test(`vite build com BASE_SITE=${BASE}: nenhuma URL pública raiz-absoluta em dist/**/*.{js,css,html}`, { timeout: 600_000 }, () => {
  const resultado = spawnSync(
    process.execPath,
    [
      join(WEB, 'node_modules', 'vite', 'bin', 'vite.js'),
      'build',
      '--outDir',
      saida,
      '--emptyOutDir',
      '--minify',
      'false',
      '--logLevel',
      'warn',
    ],
    { cwd: WEB, env: { ...process.env, BASE_SITE: BASE }, encoding: 'utf8', shell: false, timeout: 540_000 },
  )
  assert.equal(resultado.status, 0, `vite build falhou (${resultado.status}):\n${resultado.stdout}\n${resultado.stderr}`)

  const arquivos = arquivosDe(saida, ['.js', '.css', '.html'])
  assert.ok(arquivos.some((a) => a.endsWith('.js')), 'o build não gerou JS')
  assert.ok(arquivos.some((a) => a.endsWith('.css')), 'o build não gerou CSS')
  assert.ok(arquivos.some((a) => a.endsWith('index.html')), 'o build não gerou index.html')

  const achados = []
  for (const arquivo of arquivos) {
    const texto = readFileSync(arquivo, 'utf8')
    const hits = arquivo.endsWith('.js') ? acharNoJs(texto, PASTAS) : acharUrlsRaizAbsolutas(texto, PASTAS)
    for (const { indice, trecho } of hits) {
      const linha = texto.slice(0, indice).split('\n').length
      achados.push(`${relative(saida, arquivo)}:${linha} ${trecho}`)
    }
  }
  assert.ok(achados.length === 0, `URL pública raiz-absoluta no build (${achados.length}):\n${achados.slice(0, 40).join('\n')}`)
})
