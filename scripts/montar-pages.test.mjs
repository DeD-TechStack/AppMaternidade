// Teste de scripts/montar-pages.mjs e do desenho do workflow .github/workflows/pages.yml.
// Rode da raiz: node --test scripts/montar-pages.test.mjs
// Cada caso cria fixtures no scratch do host (ou tmpdir) e a apaga no fim.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const AQUI = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(AQUI, 'montar-pages.mjs')
const WORKFLOW = join(AQUI, '..', '.github', 'workflows', 'pages.yml')

const SHA = '0123456789abcdef0123456789abcdef01234567'
const SHA7 = '0123456'
const ROBOTS = '<meta name="robots" content="noindex, nofollow">'
const CRACHA =
  '<div data-previa role="note" aria-label="Prévia do site em construção">Prévia · ' +
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
  const pasta = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'montar-pages-'))
  t.after(() => rmSync(pasta, { recursive: true, force: true }))
  const raiz = join(pasta, 'dist-main')
  const previa = join(pasta, 'dist-int')
  const saida = join(pasta, '_site')
  const rotas = join(pasta, 'web-src')

  const binario = Buffer.from([0x00, 0xff, 0x10, 0x80, 0x7f, 0x0d, 0x0a, 0xfe, 0x00, 0x01])
  prepararEntradas({ raiz, previa })
  escrever(raiz, 'assets/logo.bin', binario)
  escrever(raiz, 'assets/nested/app.js', 'console.log("raiz")\r\n')
  escrever(raiz, 'sobre/index.html', html('sobre da raiz'))

  if (indexPrevia !== undefined) escrever(previa, 'index.html', indexPrevia)
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

// Realistic Vite entry documents: distinct bundles, basenames and CSP.
function prepararEntradas(f, base = '/AppMaternidade/') {
  const documento = (nome, prefixo) => '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8">' +
    `<meta name="description" content="${nome === 'raiz' ? 'Protótipo da raiz.' : 'Prévia para a família e o bebê.'}">` +
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;self&#39;; script-src &#39;self&#39;; style-src &#39;self&#39;">' +
    `<script type="module" crossorigin src="${prefixo}assets/${nome}.js"></script>` +
    `<link rel="stylesheet" href="${prefixo}assets/${nome}.css"></head><body><div id="raiz"></div></body></html>`
  const raiz = documento('raiz', base)
  const previa = documento('previa', `${base}previa/`)
  for (const rel of ['index.html', '404.html']) {
    escrever(f.raiz, rel, raiz)
    escrever(f.previa, rel, previa)
  }
  escrever(f.raiz, 'sobre/index.html', raiz)
  return { raiz, previa, base }
}

// GitHub Pages serves the root 404, never a nested 404, for an absent path.
// Execute its parser-blocking bootstrap, if any, without mocking the selection rule.
function documentoServido(f, endereco, base = '/AppMaternidade/') {
  const url = new URL(endereco, 'https://example.test')
  const relativo = url.pathname.slice(base.length)
  const arquivo = join(f.saida, relativo.endsWith('.html') ? relativo : `${relativo}/index.html`)
  let documento = readFileSync(existsSync(arquivo) ? arquivo : join(f.saida, '404.html'), 'utf8')
  const bootstrap = /<script src="([^"]+pages-fallback\.js)"><\/script>/.exec(documento)
  if (bootstrap) {
    const fonte = readFileSync(join(f.saida, bootstrap[1].slice(base.length)), 'utf8')
    runInNewContext(fonte, {
      location: Object.freeze({ pathname: url.pathname }),
      document: { write: (html) => { documento = html } },
    })
  }
  return documento
}

test('R2-03 unknown preview paths select preview with their original route context', (t) => {
  const f = criarFixture(t)
  prepararEntradas(f)
  const r = rodar(f)
  assert.equal(r.status, 0, r.stderr)
  const esperado = readFileSync(join(f.saida, 'previa/404.html'), 'utf8')
  for (const caminho of ['review2-unknown-route', 'outra/pasta/ausente?origem=teste#secao']) {
    assert.equal(documentoServido(f, `/AppMaternidade/previa/${caminho}`), esperado, caminho)
  }
})

test('REVIEW2-PAGES-R1 declares UTF-8 before the classic bootstrap can decode either document', (t) => {
  const f = criarFixture(t)
  const { raiz } = prepararEntradas(f)
  const r = rodar(f)
  assert.equal(r.status, 0, r.stderr)
  const shell = readFileSync(join(f.saida, '404.html'), 'utf8')
  const charset = /<meta\s+charset=["']utf-8["']\s*\/?\s*>/i.exec(shell)
  assert.ok(charset, 'fallback must declare UTF-8 without relying on HTTP charset')
  const fimCharset = charset.index + charset[0].length
  assert.ok(Buffer.byteLength(shell.slice(0, fimCharset), 'utf8') <= 1024, 'charset is in the encoding prescan')
  assert.ok(fimCharset <= shell.indexOf('<script'), 'charset precedes the classic bootstrap')

  const previa = readFileSync(join(f.saida, 'previa/404.html'), 'utf8')
  assert.ok(previa.includes(CRACHA), 'exact accented note and aria-label are preserved')
  assert.ok(previa.includes('Prévia para a família e o bebê.'))
  assert.ok(raiz.includes('Protótipo da raiz.'))
  for (const rel of ['ausente', 'previa-limite/ausente', '']) {
    assert.equal(documentoServido(f, '/AppMaternidade/' + rel), raiz)
  }
  for (const rel of ['previa/ausente', 'previa/outra/pasta?origem=ação#bebê', 'previa/sobre']) {
    assert.equal(documentoServido(f, '/AppMaternidade/' + rel), previa)
  }
})

test('R2-03 boundaries, known paths, query, hash and URL-normalized traversal select only fixed documents', (t) => {
  for (const base of ['/AppMaternidade/', '/', '/site/nested/']) {
    const f = criarFixture(t)
    const { raiz } = prepararEntradas(f, base)
    const r = rodar(f)
    assert.equal(r.status, 0, r.stderr)
    const previa404 = readFileSync(join(f.saida, 'previa/404.html'), 'utf8')
    const previaIndex = readFileSync(join(f.saida, 'previa/index.html'), 'utf8')
    for (const rel of ['', 'sobre', 'ausente', 'previa-extra/ausente', 'previa.evil/x',
      'PREVIA/ausente', 'previa%2fescape', 'previa/../fora', 'previa/%2e%2e/fora',
      'ausente?next=/previa/injetada#previa', 'ausente?x=</script><script>alert(1)</script>']) {
      assert.equal(documentoServido(f, base + rel, base), raiz, base + rel)
    }
    for (const rel of ['previa', 'previa/', 'previa/sobre', 'previa/como-funciona', 'previa/app/conta']) {
      assert.equal(documentoServido(f, base + rel, base), previaIndex, base + rel)
    }
    for (const rel of ['previa/aleatoria/aninhada', 'previa/x?next=https://evil.test/#a',
      'previa/%3Cscript%3Ealert(1)%3C/script%3E', 'previa/%2f%2fevil.test', 'previa/%ZZ']) {
      assert.equal(documentoServido(f, base + rel, base), previa404, base + rel)
    }
  }
})

test('R2-03 rejects absent fallbacks, conflicting artifacts and noncanonical or mismatched build bases', (t) => {
  const casos = [
    (f) => rmSync(join(f.raiz, '404.html')),
    (f) => rmSync(join(f.previa, '404.html')),
    (f) => escrever(f.raiz, 'pages-fallback.js', 'original'),
    (f) => escrever(f.previa, '404.html', html('sem entrada')),
    ...['https://evil.test/previa/assets/previa.js', '//evil.test/previa/assets/previa.js',
      '/AppMaternidade/previa/../assets/previa.js', '/Outro/previa/assets/previa.js',
      '/AppMaternidade/previa/assets/previa.js?x=1'].map((src) => (f) => {
      const original = readFileSync(join(f.previa, '404.html'), 'utf8')
      escrever(f.previa, '404.html', original.replace('/AppMaternidade/previa/assets/previa.js', src))
    }),
  ]
  for (const alterar of casos) {
    const f = criarFixture(t)
    alterar(f)
    const r = rodar(f)
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /404\.html|pages-fallback|base/)
  }
})

test('PREV-I-01 só 404.html e pages-fallback.js são exceções; demais bytes e lista ficam iguais', (t) => {
  const f = criarFixture(t)
  const r = rodar(f)
  assert.equal(r.status, 0, r.stderr)

  const arquivosRaiz = listar(f.raiz)
  assert.equal(arquivosRaiz.length, 5)
  for (const rel of arquivosRaiz) {
    const original = readFileSync(join(f.raiz, ...rel.split('/')))
    const copia = readFileSync(join(f.saida, ...rel.split('/')))
    if (rel === '404.html') assert.ok(!original.equals(copia), '404 deve selecionar o documento')
    else assert.ok(original.equals(copia), `${rel} diferente na saída`)
  }
  assert.ok(readFileSync(join(f.saida, 'assets', 'logo.bin')).equals(f.binario))

  const linhas = arquivosRaiz.map((rel) => `${rel} ${sha256(readFileSync(join(f.raiz, ...rel.split('/'))))}\n`)
  const esperado = sha256(Buffer.from(linhas.sort().join(''), 'utf8'))
  const resumo = JSON.parse(r.stdout)
  assert.equal(resumo.raizArquivos, 5)
  assert.deepEqual(resumo.raizExcecoes, ['404.html', 'pages-fallback.js'])
  assert.equal(resumo.raizSha256, esperado)
  assert.ok(Array.isArray(resumo.rotasEscritas))
  assert.equal(typeof resumo.previaArquivos, 'number')

  // Na raiz da saída, só os arquivos da raiz e a pasta previa/.
  const naRaizDaSaida = listar(f.saida).filter((rel) => !rel.startsWith('previa/'))
  assert.deepEqual(naRaizDaSaida, [...arquivosRaiz, 'pages-fallback.js'].sort())
  assert.equal(documentoServido(f, '/AppMaternidade/ausente'), readFileSync(join(f.raiz, '404.html'), 'utf8'))
  assert.ok(existsSync(join(f.saida, 'previa', 'index.html')))
})

test('PREV-I-01 controle negativo: byte mudado na raiz da saída reprova e nomeia o arquivo', (t) => {
  for (const rel of ['index.html', 'assets/logo.bin', 'assets/nested/app.js', 'sobre/index.html', '404.html', 'pages-fallback.js']) {
    const f = criarFixture(t)
    const r = rodar(f, { env: { MONTAR_PAGES_TESTE_MUTAR: rel } })
    assert.equal(r.status, 1)
    assert.ok(r.stderr.includes(rel), r.stderr)
  }
})

test('PREV-I-01 controle negativo: arquivo inesperado na raiz continua reprovando', (t) => {
  const f = criarFixture(t)
  const r = rodar(f, { env: { MONTAR_PAGES_TESTE_MUTAR: 'inesperado.js' } })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /arquivo a mais na raiz da saída: inesperado\.js/)
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

  for (const rel of ['previa/index.html', 'previa/404.html', 'previa/nested/pagina.html', 'previa/sobre/index.html']) {
    const texto = readFileSync(join(f.saida, ...rel.split('/')), 'utf8')
    assert.equal(contaRobots(texto), 1, `${rel}: robots`)
    assert.ok(texto.includes('<head>' + ROBOTS), `${rel}: robots logo após <head>`)
    assert.equal(conta(texto, CRACHA), 1, `${rel}: selo`)
    assert.ok(texto.includes(CRACHA + '</body>'), `${rel}: selo logo antes de </body>`)
    assert.doesNotMatch(texto, /<div data-previa[^>]*\bstyle=/)
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
    /^ {2}push:\n {4}branches:\n {6}- main\n {4}paths:\n {6}- ["']web\/\*\*["']\n {6}- ["']scripts\/montar-pages\.mjs["']\n {6}- ["']\.github\/workflows\/pages\.yml["']\n/m.test(normal),
    'push em main com os paths do site, da montagem e do workflow',
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
  const condicao = /\n {4}if: >-\n((?: {6}\S[^\n]*\n)+)/.exec(construir)?.[1].trim().replace(/\s+/g, ' ')
  exige(
    condicao === [
      "github.event_name == 'push' ||",
      "github.event_name == 'workflow_dispatch' ||",
      "(github.event_name == 'workflow_run' &&",
      "github.event.workflow_run.conclusion == 'success' &&",
      "github.event.workflow_run.head_branch == 'int/refazer' &&",
      'github.event.workflow_run.head_repository.full_name == github.repository &&',
      "github.event.workflow_run.event == 'push')",
    ].join(' '),
    'if do construir restringe workflow_run ao CI bem-sucedido de push no int/refazer deste repositório',
  )
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
  const guarda = 'if do construir restringe workflow_run ao CI bem-sucedido de push no int/refazer deste repositório'
  const mutacoes = [
    ['"scripts/montar-pages.mjs"', '"web/package*.json"', 'push em main com os paths do site, da montagem e do workflow'],
    ['cancel-in-progress: false', 'cancel-in-progress: true', 'concurrency group pages com cancel-in-progress: false'],
    ["conclusion == 'success'", "conclusion == 'failure'", guarda],
    ["head_branch == 'int/refazer'", "head_branch == 'outra'", guarda],
    ['head_repository.full_name == github.repository', "head_repository.full_name != github.repository", guarda],
    ["workflow_run.event == 'push'", "workflow_run.event == 'pull_request'", guarda],
    ['github.repository &&', 'github.repository ||', guarda],
    ['path: _site', 'path: web/dist', 'upload com path: _site'],
    ['outputs.base_path }}/previa', 'outputs.base_path }}', 'build da prévia com BASE_SITE .../previa'],
    ['- int/refazer', '- outra', 'workflow_run do CI, completed, branch int/refazer'],
  ]
  for (const [original, substituto, falha] of mutacoes) {
    const mutada = texto.replace(original, substituto)
    assert.notEqual(mutada, texto, original)
    assert.deepEqual(verificarWorkflow(mutada), [falha], original)
  }
})
