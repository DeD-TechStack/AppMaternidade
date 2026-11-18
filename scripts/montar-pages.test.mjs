// Teste de scripts/montar-pages.mjs e do desenho do workflow .github/workflows/pages.yml.
// Rode da raiz: node --test scripts/montar-pages.test.mjs
// Cada caso cria fixtures numa pasta temporária do sistema e a apaga no fim.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(AQUI, 'montar-pages.mjs')
const WORKFLOW = join(AQUI, '..', '.github', 'workflows', 'pages.yml')

const SHA = '0123456789abcdef0123456789abcdef01234567'
const SHA7 = '0123456'
const ROBOTS = '<meta name="robots" content="noindex, nofollow">'
const CRACHA =
  '<div data-previa role="note" aria-label="Prévia do site em construção" style="position:fixed;bottom:8px;left:8px;z-index:2147483647;font:600 12px/1.2 system-ui,sans-serif;background:#2B2320;color:#FFF7EC;padding:4px 8px;border-radius:4px;pointer-events:none">Prévia · ' +
  SHA7 +
  '</div>'

const ROTAS_OBRIGATORIAS = [
  'como-funciona',
  'cuidado-compartilhado',
  'desenvolvimento',
  'regras-da-comunidade',
  'privacidade',
  'termos',
  'exclusao-de-conta',
  'contato',
  'sobre',
  'entrar',
  'criar-conta',
  'app/conta',
  'app/comunidade',
  'app/desenvolvimento',
  'moderacao',
]

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

function escrever(base, rel, conteudo) {
  const destino = join(base, ...rel.split('/'))
  mkdirSync(dirname(destino), { recursive: true })
  writeFileSync(destino, conteudo)
}

function html(titulo, { head = true, corpo = true } = {}) {
  const cabeca = head ? '<head><title>' + titulo + '</title></head>' : ''
  const fim = corpo ? '</body>' : ''
  return '<!doctype html><html lang="pt-BR">' + cabeca + '<body><main>' + titulo + '</main>' + fim + '</html>\n'
}

// Gera um arquivo-fonte de rotas com `path: '<x>'` para cada caminho dado.
function fonteRotas(caminhos) {
  return caminhos.map((c) => `  { path: '${c}', element: null },`).join('\n') + '\n'
}

// Conta os elementos meta robots de verdade (autofechado ou não, qualquer ordem de atributos,
// aspas simples ou duplas, caixa qualquer). Nunca conta o literal que o script injeta.
function contaRobots(texto) {
  return (texto.match(/<meta\b[^>]*\bname\s*=\s*["']?robots["']?[^>]*>/gi) ?? []).length
}

function elementosRobots(texto) {
  return texto.match(/<meta\b[^>]*\bname\s*=\s*["']?robots["']?[^>]*>/gi) ?? []
}

function criarFixture(t, { rotasTsx, rotasExtra, previaExtra, indexPrevia } = {}) {
  const pasta = mkdtempSync(join(tmpdir(), 'montar-pages-'))
  t.after(() => rmSync(pasta, { recursive: true, force: true }))
  const raiz = join(pasta, 'dist-main')
  const previa = join(pasta, 'dist-int')
  const saida = join(pasta, '_site')
  const rotas = join(pasta, 'web-src')

  const binario = Buffer.from([0x00, 0xff, 0x10, 0x80, 0x7f, 0x0d, 0x0a, 0xfe, 0x00, 0x01])
  escrever(raiz, 'index.html', html('raiz'))
  escrever(raiz, 'assets/logo.bin', binario)
  escrever(raiz, 'assets/nested/app.js', 'console.log("raiz")\r\n')
  escrever(raiz, 'sobre/index.html', html('sobre da raiz'))

  escrever(previa, 'index.html', indexPrevia ?? html('previa'))
  escrever(previa, 'assets/previa.js', 'console.log("previa")\n')
  escrever(previa, 'nested/pagina.html', html('aninhada'))
  for (const [rel, conteudo] of Object.entries(previaExtra ?? {})) escrever(previa, rel, conteudo)

  const todas = rotasTsx ?? fonteRotas(ROTAS_OBRIGATORIAS)
  escrever(rotas, 'rotas.tsx', todas)
  for (const [rel, conteudo] of Object.entries(rotasExtra ?? {})) escrever(rotas, rel, conteudo)

  return { pasta, raiz, previa, saida, rotas, binario }
}

function rodar(f, { env = {}, sha = SHA } = {}) {
  return spawnSync(
    process.execPath,
    [SCRIPT, '--raiz', f.raiz, '--previa', f.previa, '--saida', f.saida, '--sha', sha, '--rotas', f.rotas],
    { encoding: 'utf8', env: { ...process.env, MONTAR_PAGES_TESTE_MUTAR: '', ...env } },
  )
}

function listar(base, rel = '') {
  const lista = []
  for (const e of readdirSync(join(base, rel), { withFileTypes: true })) {
    const caminho = rel === '' ? e.name : rel + '/' + e.name
    if (e.isDirectory()) lista.push(...listar(base, caminho))
    else lista.push(caminho)
  }
  return lista.sort()
}

function conta(texto, trecho) {
  return texto.split(trecho).length - 1
}

test('PREV-I-01 a raiz sai byte a byte igual e o resumo traz o hash da raiz', (t) => {
  const f = criarFixture(t)
  const r = rodar(f)
  assert.equal(r.status, 0, r.stderr)

  const arquivosRaiz = listar(f.raiz)
  assert.equal(arquivosRaiz.length, 4)
  for (const rel of arquivosRaiz) {
    const original = readFileSync(join(f.raiz, ...rel.split('/')))
    const copia = readFileSync(join(f.saida, ...rel.split('/')))
    assert.ok(original.equals(copia), `${rel} diferente na saída`)
  }
  assert.ok(readFileSync(join(f.saida, 'assets', 'logo.bin')).equals(f.binario))

  const linhas = arquivosRaiz.map((rel) => `${rel} ${sha256(readFileSync(join(f.raiz, ...rel.split('/'))))}\n`)
  const esperado = sha256(Buffer.from(linhas.sort().join(''), 'utf8'))
  const resumo = JSON.parse(r.stdout)
  assert.equal(resumo.raizArquivos, 4)
  assert.equal(resumo.raizSha256, esperado)
  assert.ok(Array.isArray(resumo.rotasEscritas))
  assert.equal(typeof resumo.previaArquivos, 'number')

  // Na raiz da saída, só os arquivos da raiz e a pasta previa/.
  const naRaizDaSaida = listar(f.saida).filter((rel) => !rel.startsWith('previa/'))
  assert.deepEqual(naRaizDaSaida, arquivosRaiz)
  assert.ok(existsSync(join(f.saida, 'previa', 'index.html')))
})

test('PREV-I-01 controle negativo: byte mudado na raiz da saída reprova e nomeia o arquivo', (t) => {
  const f = criarFixture(t)
  const r = rodar(f, { env: { MONTAR_PAGES_TESTE_MUTAR: 'assets/logo.bin' } })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /assets\/logo\.bin/)
})

test('PREV-I-01 diretório de entrada ausente sai com erro', (t) => {
  const f = criarFixture(t)
  rmSync(f.previa, { recursive: true, force: true })
  const r = rodar(f)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /previa/i)
})

test('PREV-I-02 a prévia ganha robots e selo uma vez; a raiz não', (t) => {
  const f = criarFixture(t)
  const r = rodar(f)
  assert.equal(r.status, 0, r.stderr)

  for (const rel of ['previa/index.html', 'previa/nested/pagina.html', 'previa/sobre/index.html']) {
    const texto = readFileSync(join(f.saida, ...rel.split('/')), 'utf8')
    assert.equal(contaRobots(texto), 1, `${rel}: robots`)
    assert.ok(texto.includes('<head>' + ROBOTS), `${rel}: robots logo após <head>`)
    assert.equal(conta(texto, CRACHA), 1, `${rel}: selo`)
    assert.ok(texto.includes(CRACHA + '</body>'), `${rel}: selo logo antes de </body>`)
    assert.ok(texto.includes('Prévia · ' + SHA7 + '<'))
    assert.ok(!texto.includes(SHA7 + '8'))
  }

  for (const rel of ['index.html', 'sobre/index.html']) {
    const texto = readFileSync(join(f.saida, ...rel.split('/')), 'utf8')
    assert.equal(contaRobots(texto), 0, `${rel}: raiz com robots`)
    assert.ok(!texto.includes('noindex'), `${rel}: raiz com robots`)
    assert.ok(!texto.includes('data-previa'), `${rel}: raiz com selo`)
  }
})

test('PREV-I-02 robots existente: a prévia fica com um único robots canônico em todo html', (t) => {
  // Molde do index real do int/refazer: já traz o robots autofechado.
  const indexReal =
    '<!doctype html>\n<html lang="pt-BR">\n<head>\n  <meta charset="UTF-8" />\n' +
    '  <meta name="robots" content="noindex, nofollow" />\n  <title>previa real</title>\n</head>\n' +
    '<body><div id="raiz"></div></body>\n</html>\n'
  const comHead = (meta) => `<!doctype html><html><head>${meta}<title>x</title></head><body>x</body></html>\n`
  const extras = {
    'ordem-inversa.html': comHead('<meta content="index, follow" name="robots">'),
    'aspas-simples.html': comHead("<meta name='robots' content='all'/>"),
    'maiusculas.html': comHead('<META NAME="ROBOTS" CONTENT="noindex">'),
    'dois-robots.html': comHead('<meta name="robots" content="index"><meta name="robots" content="all" />'),
  }
  const f = criarFixture(t, { indexPrevia: indexReal, previaExtra: extras })
  const r = rodar(f)
  assert.equal(r.status, 0, r.stderr)

  const htmls = listar(join(f.saida, 'previa')).filter((rel) => rel.endsWith('.html'))
  for (const esperado of ['index.html', 'nested/pagina.html', 'sobre/index.html', 'app/conta/index.html', ...Object.keys(extras)]) {
    assert.ok(htmls.includes(esperado), `faltou ${esperado} na saída`)
  }
  for (const rel of htmls) {
    const texto = readFileSync(join(f.saida, 'previa', ...rel.split('/')), 'utf8')
    assert.equal(contaRobots(texto), 1, `previa/${rel}: deve ter exatamente um robots`)
    assert.ok(/noindex,\s*nofollow/i.test(elementosRobots(texto)[0]), `previa/${rel}: conteúdo noindex, nofollow`)
    assert.ok(texto.includes('<head>' + ROBOTS), `previa/${rel}: robots canônico logo após <head>`)
  }

  const indexRaiz = readFileSync(join(f.saida, 'index.html'), 'utf8')
  assert.equal(contaRobots(indexRaiz), 0)
})

test('PREV-I-02 negativo: html da prévia sem </body> sai com erro', (t) => {
  const f = criarFixture(t, { previaExtra: { 'quebrado.html': html('x', { corpo: false }) } })
  const r = rodar(f)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /quebrado\.html/)
  assert.match(r.stderr, /<\/body>/)
})

test('PREV-I-02 negativo: html da prévia sem <head> sai com erro', (t) => {
  const f = criarFixture(t, { previaExtra: { 'sem-head.html': html('x', { head: false }) } })
  const r = rodar(f)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /sem-head\.html/)
  assert.match(r.stderr, /<head>/)
})

test('PREV-I-03 as rotas viram pastas com o index da prévia, aninhadas incluídas', (t) => {
  const aninhada = [
    "export const rotas = [",
    "  { path: 'app', children: [",
    "    { path: 'conta', element: null },",
    '    { path: "comunidade", element: null },',
    "    { path: ':id', element: null },",
    '  ] },',
    "  { path: '*', element: null },",
    "  { path: '/termos/', element: null },",
    "  { path: 'usuarios/:id', element: null },",
    ']',
    '',
  ].join('\n')
  const resto = ROTAS_OBRIGATORIAS.filter((c) => !['app/conta', 'app/comunidade', 'termos'].includes(c))
  const f = criarFixture(t, {
    rotasTsx: aninhada,
    rotasExtra: {
      'rotas/x.tsx': fonteRotas(resto) + "  { path: 'extra-x', element: null },\n",
      'rotas/y.test.tsx': fonteRotas(['ignorada-por-ser-teste']),
    },
  })
  const r = rodar(f)
  assert.equal(r.status, 0, r.stderr)

  const indexPrevia = readFileSync(join(f.saida, 'previa', 'index.html'), 'utf8')
  const esperadas = [...ROTAS_OBRIGATORIAS, 'app', 'extra-x']
  for (const rota of esperadas) {
    const arquivo = join(f.saida, 'previa', ...rota.split('/'), 'index.html')
    assert.ok(existsSync(arquivo), `faltou a pasta ${rota}`)
    assert.equal(readFileSync(arquivo, 'utf8'), indexPrevia, `${rota} deve ser cópia do index da prévia`)
  }
  assert.ok(!existsSync(join(f.saida, 'previa', 'usuarios')))
  assert.ok(!existsSync(join(f.saida, 'previa', 'app', ':id')))
  assert.ok(!existsSync(join(f.saida, 'previa', '*')))
  assert.ok(!existsSync(join(f.saida, 'previa', 'ignorada-por-ser-teste')))

  const resumo = JSON.parse(r.stdout)
  assert.deepEqual([...resumo.rotasEscritas].sort(), [...esperadas].sort())
})

test('PREV-I-03 negativo: rota obrigatória ausente sai com 2 e a nomeia', (t) => {
  const f = criarFixture(t, { rotasTsx: fonteRotas(ROTAS_OBRIGATORIAS.filter((c) => c !== 'moderacao' && c !== 'contato')) })
  const r = rodar(f)
  assert.equal(r.status, 2)
  assert.match(r.stderr, /moderacao/)
  assert.match(r.stderr, /contato/)
  assert.ok(!existsSync(f.saida) || listar(f.saida).length === 0, 'nada deve ser escrito quando faltam rotas')
})

test('PREV-I-03 pasta de rota que já existe na prévia não é sobrescrita', (t) => {
  const f = criarFixture(t, { previaExtra: { 'privacidade/index.html': '<!doctype html><head></head><body>feito pelo build</body>\n' } })
  const r = rodar(f)
  assert.equal(r.status, 0, r.stderr)
  const texto = readFileSync(join(f.saida, 'previa', 'privacidade', 'index.html'), 'utf8')
  assert.ok(texto.includes('feito pelo build'))
  assert.ok(texto.includes(CRACHA), 'o html existente segue recebendo o selo da etapa (c)')
  const resumo = JSON.parse(r.stdout)
  assert.ok(!resumo.rotasEscritas.includes('privacidade'))
})

// Confere o desenho do workflow como texto. Devolve a lista de falhas (vazia = ok).
function verificarWorkflow(texto) {
  const falhas = []
  const exige = (ok, mensagem) => {
    if (!ok) falhas.push(mensagem)
  }
  const normal = texto.replace(/\r\n/g, '\n')

  exige(
    /^ {2}push:\n {4}branches:\n {6}- main\n {4}paths:\n {6}- ["']web\/\*\*["']\n {6}- ["']web\/package\*\.json["']\n {6}- ["']\.github\/workflows\/pages\.yml["']\n/m.test(normal),
    'push em main com a lista de paths antiga',
  )
  exige(
    /^ {2}workflow_run:\n {4}workflows:\n {6}- CI\n {4}types:\n {6}- completed\n {4}branches:\n {6}- int\/refazer\n/m.test(normal),
    'workflow_run do CI, completed, branch int/refazer',
  )
  exige(/^ {2}workflow_dispatch:/m.test(normal), 'workflow_dispatch')
  exige(
    /^concurrency:\n {2}group: pages\n {2}cancel-in-progress: false\n/m.test(normal),
    'concurrency group pages com cancel-in-progress: false',
  )

  const inicio = normal.indexOf('\n  construir:')
  const fimConstruir = normal.indexOf('\n  publicar:')
  const construir = inicio >= 0 && fimConstruir > inicio ? normal.slice(inicio, fimConstruir) : ''
  exige(construir !== '', 'jobs construir e publicar')
  exige(/\n {4}if: [\s\S]*?conclusion == 'success'/.test(construir), "if do construir com conclusion == 'success'")
  exige(/^ {10}BASE_SITE: \$\{\{ steps\.pages\.outputs\.base_path \}\}$/m.test(construir), 'build da raiz com BASE_SITE do Pages')
  exige(/run: npm run check\n/.test(construir), 'npm run check na raiz')
  exige(
    /^ {10}BASE_SITE: \$\{\{ steps\.pages\.outputs\.base_path \}\}\/previa$/m.test(construir),
    'build da prévia com BASE_SITE .../previa',
  )
  exige(/^ {10}path: _site$/m.test(construir), 'upload com path: _site')
  exige(/node scripts\/montar-pages\.mjs\s/.test(construir), 'montagem pelo scripts/montar-pages.mjs')
  return falhas
}

test('PREV-I-04 o workflow pages.yml tem o desenho combinado', () => {
  const texto = readFileSync(WORKFLOW, 'utf8')
  assert.deepEqual(verificarWorkflow(texto), [])
})

test('PREV-I-04 negativo: o verificador reprova um workflow alterado', () => {
  const texto = readFileSync(WORKFLOW, 'utf8')
  const mutacoes = [
    texto.replace('cancel-in-progress: false', 'cancel-in-progress: true'),
    texto.replace("conclusion == 'success'", "conclusion == 'failure'"),
    texto.replace('path: _site', 'path: web/dist'),
    texto.replace('/previa', ''),
    texto.replace('- int/refazer', '- outra'),
  ]
  for (const mutada of mutacoes) {
    assert.notEqual(mutada, texto)
    assert.notDeepEqual(verificarWorkflow(mutada), [])
  }
})
