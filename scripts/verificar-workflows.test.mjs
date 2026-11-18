// Teste de scripts/verificar-workflows.mjs e dos workflows do repositório.
// Rode da raiz: node --test scripts/verificar-workflows.test.mjs
// Os casos negativos usam workflows em memória com segredos sintéticos; nenhum valor real.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PASTA_WORKFLOWS, ambienteDoJob, verificarPasta, verificarTexto } from './verificar-workflows.mjs'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'verificar-workflows.mjs')
const SHA = 'fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09'

function workflow(job) {
  return ['name: Teste', 'on: push', 'permissions:', '  contents: read', 'jobs:', ...job].join('\n')
}

const CHECKOUT_OK = [
  `      - uses: actions/checkout@${SHA} # v5`,
  '        with:',
  '          persist-credentials: false',
]

// Controle negativo: cada regra precisa acusar o caso ruim.

test('acusa um uses fixado por tag', () => {
  const texto = workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/setup-node@v5'])
  const problemas = verificarTexto(texto, 'x.yml')
  assert.equal(problemas.length, 1)
  assert.match(problemas[0], /^x\.yml: job a, passo 1: uses sem pin por SHA de 40 hex: actions\/setup-node@v5$/)
})

test('acusa um SHA curto e aceita o SHA de 40 hex com comentário da tag', () => {
  const curto = workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/setup-node@a0853c2'])
  assert.equal(verificarTexto(curto).length, 1)
  const ok = workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', `      - name: Node`, `        uses: actions/setup-node@${SHA} # v5`])
  assert.deepEqual(verificarTexto(ok), [])
})

test('acusa um job que lê segredo do Supabase sem environment', () => {
  const texto = workflow([
    '  aplicar:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - run: echo ok',
    '        env:',
    '          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}',
  ])
  const problemas = verificarTexto(texto, 'b.yml')
  assert.equal(problemas.length, 1)
  assert.match(problemas[0], /job aplicar lê SUPABASE_ACCESS_TOKEN sem environment: banco-producao \(atual: nenhum\)/)
})

test('acusa um job com segredo num environment que não é o protegido', () => {
  const texto = workflow([
    '  aplicar:',
    '    runs-on: ubuntu-latest',
    '    environment:',
    '      name: github-pages',
    '    steps:',
    '      - run: echo ok',
    '        env:',
    '          SENHA: ${{ secrets.SUPABASE_DB_PASSWORD }}',
  ])
  const problemas = verificarTexto(texto)
  assert.equal(problemas.length, 1)
  assert.match(problemas[0], /\(atual: github-pages\)/)
})

test('acusa segredo lido por índice, por secrets: inherit e no env do workflow', () => {
  const indice = workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', "      - run: echo ${{ secrets['X'] }}"])
  assert.equal(verificarTexto(indice).length, 1)
  const herdado = workflow(['  a:', `    uses: org/repo/.github/workflows/w.yml@${SHA}`, '    secrets: inherit'])
  assert.equal(verificarTexto(herdado).length, 1)
  const global = ['on: push', 'env:', '  T: ${{ secrets.SUPABASE_ACCESS_TOKEN }}', 'jobs:', '  a:', '    runs-on: ubuntu-latest', '    steps:', '      - run: echo ok'].join('\n')
  const problemas = verificarTexto(global)
  assert.equal(problemas.length, 1)
  assert.match(problemas[0], /segredo lido fora de um job/)
})

test('aceita o job com environment: banco-producao, inline ou com name', () => {
  for (const amb of [['    environment: banco-producao'], ['    environment:', '      name: banco-producao']]) {
    const texto = workflow([
      '  aplicar:',
      '    runs-on: ubuntu-latest',
      ...amb,
      '    steps:',
      '      - run: echo ok',
      '        env:',
      '          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}',
    ])
    assert.deepEqual(verificarTexto(texto), [])
    assert.equal(ambienteDoJob(texto, 'aplicar'), 'banco-producao')
  }
})

test('aceita sem environment só GITHUB_TOKEN e as duas chaves públicas do site', () => {
  const texto = workflow([
    '  construir:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Exigir os segredos',
    '        env:',
    '          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}',
    '          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}',
    '        run: test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" || exit 1',
    '      - run: echo ok',
    '        env:',
    '          A: ${{ secrets.GITHUB_TOKEN }}',
    '          B: ${{ secrets.VITE_SUPABASE_URL }}',
    '          C: ${{ secrets.VITE_SUPABASE_ANON_KEY }}',
  ])
  assert.deepEqual(verificarTexto(texto), [])
})

test('acusa checkout sem persist-credentials: false, ou com true', () => {
  const sem = workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', `      - uses: actions/checkout@${SHA}`, '      - run: echo ok'])
  const p1 = verificarTexto(sem)
  assert.equal(p1.length, 1)
  assert.match(p1[0], /checkout no job a sem persist-credentials: false/)
  const verdadeiro = workflow([
    '  a:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    `      - uses: actions/checkout@${SHA}`,
    '        with:',
    '          persist-credentials: true',
  ])
  assert.equal(verificarTexto(verdadeiro).length, 1)
  // O persist-credentials de outro passo não vale para o checkout.
  const outroPasso = workflow([
    '  a:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    `      - uses: actions/checkout@${SHA}`,
    '      - run: echo ok',
    '        with:',
    '          persist-credentials: false',
  ])
  assert.equal(verificarTexto(outroPasso).length, 1)
  assert.deepEqual(verificarTexto(workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', ...CHECKOUT_OK])), [])
})

test('acusa arquivo sem jobs, que não foi entendido', () => {
  assert.equal(verificarTexto('name: vazio\non: push\n').length, 1)
})

test('a linha de comando falha fechado: pasta vazia, pasta inexistente e workflow ruim saem com 1', (t) => {
  const pasta = mkdtempSync(join(tmpdir(), 'verificar-workflows-'))
  t.after(() => rmSync(pasta, { recursive: true, force: true }))
  const rodar = (alvo) => spawnSync(process.execPath, [SCRIPT, alvo], { encoding: 'utf8' })

  const vazia = rodar(pasta)
  assert.equal(vazia.status, 1, vazia.stderr)
  assert.match(vazia.stderr, /nenhum workflow \.yml encontrado/)

  assert.equal(rodar(join(pasta, 'nao-existe')).status, 1)

  writeFileSync(join(pasta, 'ruim.yml'), workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v5']))
  const ruim = rodar(pasta)
  assert.equal(ruim.status, 1)
  assert.match(ruim.stderr, /ruim\.yml: job a, passo 1: uses sem pin/)
  assert.match(ruim.stderr, /ruim\.yml: job a, passo 1: checkout no job a sem persist-credentials/)

  writeFileSync(join(pasta, 'ruim.yml'), workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', ...CHECKOUT_OK]))
  const bom = rodar(pasta)
  assert.equal(bom.status, 0, bom.stderr)
})

// Os workflows reais do repositório.

test('os workflows do repositório passam nas três regras', () => {
  const { arquivos, problemas } = verificarPasta(PASTA_WORKFLOWS)
  assert.deepEqual(arquivos, ['banco-nuvem.yml', 'ci.yml', 'pages.yml'])
  assert.deepEqual(problemas, [])
})

test('banco-nuvem: aplicar e dados ficam no banco-producao; testar não tem environment nem segredo', () => {
  const texto = readFileSync(join(PASTA_WORKFLOWS, 'banco-nuvem.yml'), 'utf8')
  assert.equal(ambienteDoJob(texto, 'aplicar'), 'banco-producao')
  assert.equal(ambienteDoJob(texto, 'dados'), 'banco-producao')
  assert.equal(ambienteDoJob(texto, 'testar'), null)
})

test('o CI roda este teste ao lado do teste da política de commits e mantém o histórico completo', () => {
  const texto = readFileSync(join(PASTA_WORKFLOWS, 'ci.yml'), 'utf8')
  assert.match(texto, /run: node --test scripts\/verificar-commits\.test\.mjs/)
  assert.match(texto, /run: node --test scripts\/verificar-workflows\.test\.mjs/)
  assert.match(texto, /fetch-depth: 0/)
})

// Pages: falha fechado com segredo público do Supabase vazio (CODE-Q Q-3).

function blocoExigirSegredos() {
  const linhas = readFileSync(join(PASTA_WORKFLOWS, 'pages.yml'), 'utf8').split('\n').map((l) => l.replace(/\r$/, ''))
  const i = linhas.findIndex((l) => /name: Exigir os segredos do Supabase/.test(l))
  assert.notEqual(i, -1, 'pages.yml sem o passo "Exigir os segredos do Supabase"')
  const j = linhas.findIndex((l, k) => k > i && /^\s+run: \|\s*$/.test(l))
  assert.notEqual(j, -1)
  const recuoRun = linhas[j].search(/\S/)
  const corpo = []
  for (let k = j + 1; k < linhas.length; k++) {
    if (linhas[k].trim() !== '' && linhas[k].search(/\S/) <= recuoRun) break
    corpo.push(linhas[k].slice(recuoRun + 2))
  }
  return { passo: linhas.slice(i, j).join('\n'), script: corpo.join('\n') }
}

function rodarBloco(script, env) {
  return spawnSync('bash', ['-c', script], { encoding: 'utf8', env: { PATH: process.env.PATH, ...env } })
}

test('pages: o passo que exige os segredos lê os dois valores do ambiente e vem antes do build', () => {
  const texto = readFileSync(join(PASTA_WORKFLOWS, 'pages.yml'), 'utf8')
  const { passo } = blocoExigirSegredos()
  assert.match(passo, /VITE_SUPABASE_URL: \$\{\{ secrets\.VITE_SUPABASE_URL \}\}/)
  assert.match(passo, /VITE_SUPABASE_ANON_KEY: \$\{\{ secrets\.VITE_SUPABASE_ANON_KEY \}\}/)
  assert.ok(texto.indexOf('Exigir os segredos do Supabase') < texto.indexOf('npm run build'))
})

test('pages: segredo obrigatório vazio ou só com espaços sai com 1 e nomeia o segredo', () => {
  const { script } = blocoExigirSegredos()
  for (const [env, nome] of [
    [{ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: 'chave-sintetica' }, 'VITE_SUPABASE_URL'],
    [{ VITE_SUPABASE_URL: 'https://x.invalid', VITE_SUPABASE_ANON_KEY: '   ' }, 'VITE_SUPABASE_ANON_KEY'],
    [{}, 'VITE_SUPABASE_URL'],
  ]) {
    const r = rodarBloco(script, env)
    assert.equal(r.status, 1, r.stdout + r.stderr)
    assert.ok((r.stdout + r.stderr).includes(nome), `mensagem sem ${nome}`)
  }
})

test('pages: com os dois segredos preenchidos o passo passa', () => {
  const { script } = blocoExigirSegredos()
  const r = rodarBloco(script, { VITE_SUPABASE_URL: 'https://x.invalid', VITE_SUPABASE_ANON_KEY: 'chave-sintetica' })
  assert.equal(r.status, 0, r.stdout + r.stderr)
})

// R1: toda grafia YAML válida das chaves lidas pelo guard (nua, 'aspas simples', "aspas duplas",
// espaço antes dos dois-pontos) precisa ser entendida; o que não dá para classificar falha fechado.

const aspas = [
  ['nua', (k) => k],
  ['aspas simples', (k) => `'${k}'`],
  ['aspas duplas', (k) => `"${k}"`],
  ['espaço antes dos dois-pontos', (k) => `${k} `],
]

function jobCom({ usa = 'actions/checkout@v5', chave = (k) => k, persiste = true }) {
  const linhas = ['  a:', '    runs-on: ubuntu-latest', '    steps:', `      - ${chave('uses')}: ${usa}`]
  if (persiste) linhas.push(`        ${chave('with')}:`, `          ${chave('persist-credentials')}: false`)
  return workflow(linhas)
}

for (const [nome, chave] of aspas) {
  test(`R1 (${nome}): uses fixado por tag é acusado`, () => {
    const problemas = verificarTexto(jobCom({ chave }), 'q.yml')
    assert.ok(problemas.some((p) => /uses sem pin por SHA/.test(p)), problemas.join('\n'))
  })

  test(`R1 (${nome}): checkout sem persist-credentials é acusado`, () => {
    const problemas = verificarTexto(jobCom({ usa: `actions/checkout@${SHA}`, chave, persiste: false }), 'q.yml')
    assert.ok(problemas.some((p) => /sem persist-credentials: false/.test(p)), problemas.join('\n'))
  })

  test(`R1 (${nome}): checkout com SHA e persist-credentials false passa (controle positivo)`, () => {
    assert.deepEqual(verificarTexto(jobCom({ usa: `actions/checkout@${SHA}`, chave })), [])
  })

  test(`R1 (${nome}): environment banco-producao é aceito para job com segredo`, () => {
    const texto = workflow([
      '  aplicar:',
      '    runs-on: ubuntu-latest',
      `    ${chave('environment')}: banco-producao`,
      '    steps:',
      '      - run: echo ok',
      '        env:',
      '          T: ${{ secrets.SUPABASE_ACCESS_TOKEN }}',
    ])
    assert.deepEqual(verificarTexto(texto), [])
  })

  test(`R1 (${nome}): segredo sem environment continua acusado`, () => {
    const texto = workflow([
      '  aplicar:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: echo ok',
      '        env:',
      '          T: ${{ secrets.SUPABASE_ACCESS_TOKEN }}',
    ])
    assert.equal(verificarTexto(texto).length, 1)
  })
}

test('R1: persist-credentials entre aspas com valor true é acusado', () => {
  const ruim = jobCom({ usa: `actions/checkout@${SHA}` }).replace('persist-credentials: false', '"persist-credentials": true')
  assert.ok(verificarTexto(ruim).some((p) => /sem persist-credentials: false/.test(p)))
})

test('R1: passo em forma de fluxo ({ uses: ... }) é lido e julgado pelo conteúdo', () => {
  const ruins = [
    ['uses por tag', `      - { uses: actions/checkout@v5 }`, /uses sem pin por SHA/],
    ['checkout sem persist-credentials', `      - { "uses": "actions/checkout@${SHA}" }`, /sem persist-credentials: false/],
  ]
  for (const [, passo, esperado] of ruins) {
    const texto = workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', passo])
    const problemas = verificarTexto(texto, 'f.yml')
    assert.ok(problemas.some((p) => esperado.test(p)), problemas.join('\n'))
  }
  const seguro = workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', `      - { "uses": "actions/checkout@${SHA}", "with": { "persist-credentials": false } }`])
  assert.deepEqual(verificarTexto(seguro, 'f.yml'), [])
})

test('R1: a CLI sai com 1 para um checkout com "uses" entre aspas e sem persist-credentials', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'wf-'))
  try {
    writeFileSync(join(pasta, 'x.yml'), jobCom({ usa: `actions/checkout@${SHA}`, chave: (k) => `"${k}"`, persiste: false }))
    const r = spawnSync(process.execPath, [SCRIPT, pasta], { encoding: 'utf8' })
    assert.equal(r.status, 1, r.stdout + r.stderr)
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
})

// SEC-02r: o guard lê o YAML pelo pacote yaml e julga o objeto lido, não o texto.

function cli(texto, nome = 'x.yml') {
  const pasta = mkdtempSync(join(tmpdir(), 'wf-'))
  try {
    writeFileSync(join(pasta, nome), texto)
    return spawnSync(process.execPath, [SCRIPT, pasta], { encoding: 'utf8' })
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
}

const PASSO = (linhas) => workflow(['  a:', '    runs-on: ubuntu-latest', '    steps:', ...linhas])

test('SEC-02r: job em forma de fluxo com checkout fixado por tag é acusado', () => {
  const texto = ['on: push', `jobs: { a: { runs-on: ubuntu-latest, steps: [ { uses: 'actions/checkout@v5' } ] } }`].join('\n')
  const problemas = verificarTexto(texto, 'f.yml')
  assert.ok(problemas.some((p) => /^f\.yml: job a, passo 1: uses sem pin por SHA de 40 hex: actions\/checkout@v5$/.test(p)), problemas.join('\n'))
  assert.ok(problemas.some((p) => /checkout no job a sem persist-credentials: false/.test(p)), problemas.join('\n'))
})

test('SEC-02r: job em forma de fluxo seguro passa e com segredo sem environment é acusado', () => {
  const seguro = ['on: push', `jobs: { a: { runs-on: ubuntu-latest, steps: [ { uses: 'actions/checkout@${SHA}', with: { persist-credentials: false } } ] } }`].join('\n')
  assert.deepEqual(verificarTexto(seguro), [])
  const segredo = ['on: push', 'jobs: { a: { runs-on: ubuntu-latest, steps: [ { run: "echo ${{ secrets.X }}" } ] } }'].join('\n')
  assert.ok(verificarTexto(segredo).some((p) => /job a lê X sem environment: banco-producao \(atual: nenhum\)/.test(p)))
})

test('SEC-02r: chave com escape \\u é entendida (uses com tag acusado; persist-credentials escapado aceito)', () => {
  const tag = PASSO(['      - "\\u0075ses": actions/checkout@v5'])
  const p1 = verificarTexto(tag, 'e.yml')
  assert.ok(p1.some((p) => /uses sem pin por SHA de 40 hex: actions\/checkout@v5/.test(p)), p1.join('\n'))

  const sem = PASSO([`      - "\\u0075ses": actions/checkout@${SHA}`])
  assert.ok(verificarTexto(sem).some((p) => /sem persist-credentials: false/.test(p)))

  const ok = PASSO([`      - "\\u0075ses": actions/checkout@${SHA}`, '        with:', '          "persist\\u002dcredentials": false'])
  assert.deepEqual(verificarTexto(ok), [])

  const verdadeiro = PASSO([`      - "\\u0075ses": actions/checkout@${SHA}`, '        with:', '          "persist\\u002dcredentials": true'])
  assert.ok(verificarTexto(verdadeiro).some((p) => /sem persist-credentials: false/.test(p)))
})

test('SEC-02r: arquivo que o yaml não lê falha com o nome do arquivo, e a CLI sai com 1', () => {
  const textos = [
    ['colchete aberto', 'on: push\njobs:\n  a:\n    runs-on: x\n    steps: [ { run: ok '],
    ['recuo com tab', 'on: push\njobs:\n  a:\n\truns-on: x\n'],
    ['documento vazio', ''],
    ['dois documentos', 'on: push\n---\njobs: {}\n'],
  ]
  for (const [nome, texto] of textos) {
    const problemas = verificarTexto(texto, 'quebrado.yml')
    assert.ok(problemas.length > 0, `${nome} passou`)
    assert.ok(problemas.every((p) => p.startsWith('quebrado.yml')), problemas.join('\n'))
    const r = cli(texto, 'quebrado.yml')
    assert.equal(r.status, 1, `${nome}: ${r.stdout}${r.stderr}`)
    assert.match(r.stderr, /quebrado\.yml/)
  }
})

test('SEC-02r: uses que não é texto falha (número, lista, mapa, vazio), no passo e no job', () => {
  for (const valor of ['5', '[a]', '{ a: b }', '']) {
    const passo = verificarTexto(PASSO([`      - uses: ${valor}`]), 'n.yml')
    assert.ok(passo.some((p) => /uses sem pin por SHA de 40 hex: valor não é texto/.test(p)), `passo ${valor}: ${passo.join('\n')}`)
    const job = verificarTexto(workflow(['  a:', `    uses: ${valor}`]), 'n.yml')
    assert.ok(job.some((p) => /uses sem pin/.test(p)), `job ${valor}: ${job.join('\n')}`)
  }
})

test('SEC-02r: uses de job (workflow reutilizável) precisa de SHA; ./local é aceito', () => {
  assert.ok(verificarTexto(workflow(['  a:', '    uses: org/repo/.github/workflows/w.yml@v1'])).some((p) => /job a: uses sem pin/.test(p)))
  assert.deepEqual(verificarTexto(workflow(['  a:', `    uses: org/repo/.github/workflows/w.yml@${SHA}`])), [])
  assert.deepEqual(verificarTexto(workflow(['  a:', '    uses: ./.github/workflows/w.yml'])), [])
  assert.deepEqual(verificarTexto(PASSO(['      - uses: ./.github/actions/local'])), [])
})

test('SEC-02r: checkout em forma de fluxo sem persist-credentials falha; com false passa', () => {
  const sem = PASSO([`      - { uses: actions/checkout@${SHA} }`])
  assert.ok(verificarTexto(sem).some((p) => /sem persist-credentials: false/.test(p)))
  const com = PASSO([`      - { uses: actions/checkout@${SHA}, with: { persist-credentials: false } }`])
  assert.deepEqual(verificarTexto(com), [])
})

test('SEC-02r: persist-credentials só vale boolean false ou o texto false; with que não é mapa falha', () => {
  const checkout = (com) => PASSO([`      - uses: actions/checkout@${SHA}`, ...com])
  assert.deepEqual(verificarTexto(checkout(['        with:', "          persist-credentials: 'false'"])), [])
  for (const com of [
    ['        with:', "          persist-credentials: 'true'"],
    ['        with:', '          persist-credentials: 0'],
    ['        with:', '          persist-credentials:'],
    ['        with:', '          persist-credentials: [false]'],
    ['        with: false'],
    ['        with: [persist-credentials]'],
    ['        with:', '          fetch-depth: 0'],
    ['        with:', '          persist-credentials: false', '          Persist-Credentials: true'],
  ]) {
    const problemas = verificarTexto(checkout(com))
    assert.ok(problemas.some((p) => /sem persist-credentials: false/.test(p)), `${com.join(' | ')}: ${problemas.join('\n')}`)
  }
})

test('SEC-02r: chave duplicada no passo falha', () => {
  const texto = PASSO([`      - uses: actions/checkout@${SHA}`, '        with:', '          persist-credentials: false', '        uses: actions/setup-node@v5'])
  const problemas = verificarTexto(texto, 'd.yml')
  assert.ok(problemas.length > 0)
  assert.ok(problemas.every((p) => p.startsWith('d.yml')))
  const duasWith = PASSO([`      - uses: actions/checkout@${SHA}`, '        with:', '          persist-credentials: true', '          persist-credentials: false'])
  assert.ok(verificarTexto(duasWith).length > 0)
  assert.equal(cli(texto, 'd.yml').status, 1)
})

test('SEC-02r: tipos errados em jobs, job, steps e passo falham', () => {
  assert.ok(verificarTexto('on: push\njobs: [a]\n').length > 0)
  assert.ok(verificarTexto('on: push\njobs: x\n').length > 0)
  assert.ok(verificarTexto('on: push\njobs: {}\n').some((p) => /nenhum job encontrado/.test(p)))
  assert.ok(verificarTexto('on: push\njobs:\n  a: 5\n').length > 0)
  assert.ok(verificarTexto(workflow(['  a:', '    steps: 5'])).length > 0)
  assert.ok(verificarTexto(workflow(['  a:', '    steps:'])).length > 0)
  assert.ok(verificarTexto(PASSO(['      - actions/checkout@v5'])).length > 0)
  assert.ok(verificarTexto('- a\n- b\n').length > 0)
})

test('SEC-02r: environment de tipo errado falha; mapa sem name não vale como banco-producao', () => {
  const job = (env) => workflow(['  a:', '    runs-on: ubuntu-latest', ...env, '    steps:', '      - run: echo ${{ secrets.X }}'])
  for (const env of [['    environment: [banco-producao]'], ['    environment: 5'], ['    environment:', '      url: x'], ['    environment:', '      name: [banco-producao]']]) {
    assert.ok(verificarTexto(job(env)).some((p) => /environment/.test(p)), env.join('\n'))
  }
  assert.deepEqual(verificarTexto(job(['    environment:', '      name: "banco-producao"'])), [])
  assert.equal(ambienteDoJob(job(['    environment: "banco-producao"']), 'a'), 'banco-producao')
  assert.equal(ambienteDoJob(job([]), 'a'), null)
  assert.equal(ambienteDoJob(job([]), 'inexistente'), null)
})

test('SEC-02r: segredos lidos em chaves, por maiúsculas, objeto inteiro e secrets em mapa do job', () => {
  const lendo = (linha) => PASSO(['      - run: echo ok', '        env:', `          ${linha}`])
  for (const linha of ['T: ${{ SECRETS.TOKEN }}', 'T: ${{ secrets . TOKEN }}', 'T: ${{ toJSON(secrets) }}', 'T: ${{ secrets.* }}', '"${{ secrets.TOKEN }}": x']) {
    assert.ok(verificarTexto(lendo(linha)).some((p) => /sem environment: banco-producao/.test(p)), linha)
  }
  assert.deepEqual(verificarTexto(lendo('T: ${{ secrets.github_token }}')), [])
  const mapa = workflow(['  a:', `    uses: org/repo/.github/workflows/w.yml@${SHA}`, '    secrets:', '      TOKEN: x'])
  assert.ok(verificarTexto(mapa).some((p) => /job a lê TOKEN sem environment/.test(p)))
  const aninhado = PASSO([`      - uses: org/repo@${SHA}`, '        with:', '          secrets: inherit'])
  assert.ok(verificarTexto(aninhado).some((p) => /secrets: inherit/.test(p)))
})

test('SEC-02r: segredo fora de um job é acusado em qualquer chave do topo', () => {
  const texto = ['on: push', 'concurrency:', '  group: ${{ secrets.G }}', 'jobs:', '  a:', '    runs-on: ubuntu-latest', '    steps:', '      - run: echo ok'].join('\n')
  const problemas = verificarTexto(texto)
  assert.equal(problemas.length, 1)
  assert.match(problemas[0], /segredo lido fora de um job/)
})

test('SEC-02r: controles positivos: checkout seguro com chaves entre aspas e SHA passa', () => {
  const texto = PASSO([`      - "uses": "actions/checkout@${SHA}" # v5`, '        "with":', '          "persist-credentials": "false"'])
  assert.deepEqual(verificarTexto(texto), [])
})

test('SEC-02r: controles positivos: os três workflows reais passam, um a um', () => {
  for (const nome of ['banco-nuvem.yml', 'ci.yml', 'pages.yml']) {
    const texto = readFileSync(join(PASTA_WORKFLOWS, nome), 'utf8')
    assert.deepEqual(verificarTexto(texto, nome), [], nome)
  }
})

test('SEC-02r: sem o pacote yaml o guard não aprova nada (problema e saída 1)', (t) => {
  const raiz = mkdtempSync(join(tmpdir(), 'wf-sem-yaml-'))
  t.after(() => rmSync(raiz, { recursive: true, force: true }))
  mkdirSync(join(raiz, 'scripts'))
  mkdirSync(join(raiz, 'wf'))
  copyFileSync(SCRIPT, join(raiz, 'scripts', 'verificar-workflows.mjs'))
  writeFileSync(join(raiz, 'wf', 'ok.yml'), PASSO(['      - run: echo ok']))
  const r = spawnSync(process.execPath, [join(raiz, 'scripts', 'verificar-workflows.mjs'), join(raiz, 'wf')], { encoding: 'utf8' })
  assert.equal(r.status, 1, r.stdout + r.stderr)
  assert.match(r.stderr, /ok\.yml: não consegui carregar o pacote yaml/)
})

// Guard contra segredo vazio (SEC-02r-I-06): o passo que lê VITE_SUPABASE_* precisa de um passo
// anterior que falha com segredos vazios.

const PAGES = readFileSync(join(PASTA_WORKFLOWS, 'pages.yml'), 'utf8').replace(/\r\n/g, '\n')
const INI_GUARDA = '      - name: Exigir os segredos do Supabase\n'
const INI_BUILD = '      - name: Gerar o build com o subcaminho do Pages\n'
const INI_ENVIAR = '      - name: Enviar o site para o Pages\n'
for (const marca of [INI_GUARDA, INI_BUILD, INI_ENVIAR]) assert.notEqual(PAGES.indexOf(marca), -1, `pages.yml sem ${marca.trim()}`)
const BLOCO_GUARDA = PAGES.slice(PAGES.indexOf(INI_GUARDA), PAGES.indexOf(INI_BUILD))
const BLOCO_BUILD = PAGES.slice(PAGES.indexOf(INI_BUILD), PAGES.indexOf(INI_ENVIAR))
const PAGES_SEM_GUARDA = PAGES.replace(BLOCO_GUARDA, '')
const PAGES_GUARDA_DEPOIS = PAGES_SEM_GUARDA.replace(BLOCO_BUILD, BLOCO_BUILD + BLOCO_GUARDA)

test('segredos vazios: pages.yml sem o passo que exige os segredos é acusado e a CLI sai com 1', () => {
  const problemas = verificarTexto(PAGES_SEM_GUARDA, 'pages.yml')
  assert.equal(problemas.length, 1, problemas.join('\n'))
  assert.match(problemas[0], /^pages\.yml: job construir, passo \d+: lê VITE_SUPABASE_\* sem passo anterior que falha com segredos vazios$/)
  const r = cli(PAGES_SEM_GUARDA, 'pages.yml')
  assert.equal(r.status, 1, r.stdout + r.stderr)
  assert.match(r.stderr, /segredos vazios/)
})

test('segredos vazios: o pages.yml real passa', () => {
  assert.deepEqual(verificarTexto(PAGES, 'pages.yml'), [])
})

test('segredos vazios: o passo que exige os segredos DEPOIS do build é acusado', () => {
  const problemas = verificarTexto(PAGES_GUARDA_DEPOIS, 'pages.yml')
  assert.equal(problemas.length, 1, problemas.join('\n'))
  assert.match(problemas[0], /segredos vazios/)
})

test('segredos vazios: passo parecido com o guard mas sem exit, sem um dos segredos, com if ou com continue-on-error não vale', () => {
  const variantes = [
    ['sem exit', BLOCO_GUARDA.replace('exit $faltando', 'echo $faltando')],
    ['sem um dos segredos no env', BLOCO_GUARDA.replace('          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}\n', '')],
    ['com if', BLOCO_GUARDA.replace('        env:\n', "        if: always()\n        env:\n")],
    ['com continue-on-error', BLOCO_GUARDA.replace('        env:\n', '        continue-on-error: true\n        env:\n')],
  ]
  for (const [nome, bloco] of variantes) {
    assert.notEqual(bloco, BLOCO_GUARDA, `${nome}: a variante não mudou o bloco`)
    const problemas = verificarTexto(PAGES.replace(BLOCO_GUARDA, bloco), 'pages.yml')
    assert.ok(problemas.some((p) => /segredos vazios/.test(p)), `${nome}: ${problemas.join('\n')}`)
  }
})

test('segredos vazios: job no banco-producao (scripts que já exigem as variáveis) fica fora da regra', () => {
  const job = (env) => workflow(['  a:', '    runs-on: ubuntu-latest', ...env, '    steps:', '      - run: node scripts/banco-nuvem.mjs api', '        env:', '          U: ${{ secrets.VITE_SUPABASE_URL }}'])
  assert.deepEqual(verificarTexto(job(['    environment: banco-producao'])), [])
  assert.ok(verificarTexto(job([])).some((p) => /segredos vazios/.test(p)))
  assert.ok(verificarTexto(job(['    environment: github-pages'])).some((p) => /segredos vazios/.test(p)))
})

// SEC-02b: qualquer expressão que cite o contexto `secrets` é leitura de segredo; a mensagem
// nomeia o arquivo, o job e o texto da expressão. `if:` sem ${{ }} também é expressão.

const JOB_COM = (extra, passos) => workflow(['  a:', '    runs-on: ubuntu-latest', ...extra, '    steps:', ...passos])
const ENV_PASSO = (linha) => ['      - run: echo ok', '        env:', `          ${linha}`]
const SEM_AMBIENTE = / sem environment: banco-producao \(atual: nenhum\)$/
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function acusaLeitura(texto, expressao, rotulo) {
  const problemas = verificarTexto(texto, 'x.yml')
  assert.equal(problemas.length, 1, `${rotulo}: ${problemas.join('\n')}`)
  assert.match(problemas[0], new RegExp(`^x\\.yml: job a lê .*${escapar(expressao)}.*${SEM_AMBIENTE.source}`), rotulo)
}

test('SEC-02b: ${{ toJSON(secrets) }} no env de um passo é acusado com arquivo, job e expressão; com banco-producao passa', () => {
  acusaLeitura(JOB_COM([], ENV_PASSO('T: ${{ toJSON(secrets) }}')), '${{ toJSON(secrets) }}', 'sem environment')
  assert.deepEqual(verificarTexto(JOB_COM(['    environment: banco-producao'], ENV_PASSO('T: ${{ toJSON(secrets) }}'))), [])
})

test('SEC-02b: secrets[matrix.nome] e secrets[\'X\'] num passo são acusados com a expressão', () => {
  acusaLeitura(JOB_COM([], ENV_PASSO('T: ${{ secrets[matrix.nome] }}')), '${{ secrets[matrix.nome] }}', 'indice dinamico')
  acusaLeitura(JOB_COM([], ENV_PASSO("T: ${{ secrets['X'] }}")), "${{ secrets['X'] }}", 'indice literal')
  assert.deepEqual(verificarTexto(JOB_COM(['    environment: banco-producao'], ENV_PASSO('T: ${{ secrets[matrix.nome] }}'))), [])
})

test('SEC-02b: secrets.X dentro de format() é acusado e nomeia X; secrets[...] misturado mostra a expressão', () => {
  const nome = verificarTexto(JOB_COM([], ENV_PASSO("T: ${{ format('{0}', secrets.X) }}")), 'x.yml')
  assert.equal(nome.length, 1, nome.join('\n'))
  assert.match(nome[0], /^x\.yml: job a lê X sem environment: banco-producao/)
  acusaLeitura(JOB_COM([], ENV_PASSO("T: ${{ format('{0}', secrets.GITHUB_TOKEN, secrets[matrix.k]) }}")), '${{ format(', 'publico misturado com indice')
})

test('SEC-02b: toJSON(secrets) no env do job é acusado com a expressão', () => {
  acusaLeitura(JOB_COM(['    env:', '      T: ${{ toJSON(secrets) }}'], ['      - run: echo ok']), '${{ toJSON(secrets) }}', 'env do job')
})

test('SEC-02b: if do passo e if do job sem ${{ }} são lidos como expressão e mostram o texto', () => {
  acusaLeitura(JOB_COM([], ['      - run: echo ok', "        if: toJSON(secrets) != ''"]), "toJSON(secrets) != ''", 'if do passo')
  acusaLeitura(JOB_COM(["    if: secrets[matrix.n] != ''"], ['      - run: echo ok']), "secrets[matrix.n] != ''", 'if do job')
  const ok = JOB_COM(['    environment: banco-producao', "    if: secrets[matrix.n] != ''"], ['      - run: echo ok', "        if: toJSON(secrets) != ''"])
  assert.deepEqual(verificarTexto(ok), [])
})

test('SEC-02b: secrets.NOME num if sem ${{ }} continua nomeando o segredo', () => {
  const problemas = verificarTexto(JOB_COM([], ['      - run: echo ok', "        if: secrets.SUPABASE_DB_PASSWORD != ''"]), 'x.yml')
  assert.equal(problemas.length, 1, problemas.join('\n'))
  assert.match(problemas[0], /^x\.yml: job a lê SUPABASE_DB_PASSWORD sem environment: banco-producao/)
})

test('SEC-02b: if escrito com ${{ }} gera um único problema, sem mensagem duplicada', () => {
  for (const [rotulo, linha] of [
    ['com espaços', "        if: ${{ toJSON(secrets) != '' }}"],
    ['sem espaços', "        if: ${{toJSON(secrets)!=''}}"],
  ]) {
    const problemas = verificarTexto(JOB_COM([], ['      - run: echo ok', linha]), 'x.yml')
    assert.equal(problemas.length, 1, `${rotulo}: ${problemas.join('\n')}`)
    const lidos = problemas[0].match(/^x\.yml: job a lê (.*) sem environment: banco-producao/)
    assert.ok(lidos, `${rotulo}: ${problemas[0]}`)
    assert.ok(!lidos[1].includes('}}, '), `${rotulo}: a mesma expressão aparece duas vezes: ${problemas[0]}`)
    assert.equal(lidos[1].match(/toJSON\(secrets\)/g).length, 1, `${rotulo}: ${problemas[0]}`)
  }
})

test('SEC-02b: chamada reutilizável com secrets: inherit sem environment é acusada', () => {
  const texto = workflow(['  a:', `    uses: org/repo/.github/workflows/w.yml@${SHA}`, '    secrets: inherit'])
  const problemas = verificarTexto(texto, 'x.yml')
  assert.equal(problemas.length, 1, problemas.join('\n'))
  assert.match(problemas[0], /^x\.yml: job a lê secrets: inherit sem environment: banco-producao/)
})

test('SEC-02b: só GITHUB_TOKEN (em ${{ }} e em if) passa sem environment', () => {
  assert.deepEqual(verificarTexto(JOB_COM([], ENV_PASSO('T: ${{ secrets.GITHUB_TOKEN }}'))), [])
  assert.deepEqual(verificarTexto(JOB_COM([], ['      - run: echo ok', "        if: secrets.GITHUB_TOKEN != ''"])), [])
  assert.deepEqual(verificarTexto(JOB_COM(["    if: secrets.GITHUB_TOKEN != ''"], ['      - run: echo ok'])), [])
  assert.deepEqual(verificarTexto(JOB_COM([], ENV_PASSO('T: ${{ secrets . github_token }}'))), [])
})

test('SEC-02b: unclassified secrets expression fails', () => {
  acusaLeitura(JOB_COM([], ENV_PASSO('T: ${{ fromJSON(toJSON(secrets))[inputs.k] }}')), '${{ fromJSON(toJSON(secrets))[inputs.k] }}', 'fromJSON')
  acusaLeitura(JOB_COM([], ENV_PASSO('T: ${{ secrets.* }}')), '${{ secrets.* }}', 'secrets.*')
  acusaLeitura(JOB_COM([], ENV_PASSO('T: ${{ inputs.escolha && secrets }}')), '${{ inputs.escolha && secrets }}', 'secrets nu')
  // `}}` dentro de um literal não encerra a expressão: o que vem depois ainda é lido.
  const literal = verificarTexto(JOB_COM([], ENV_PASSO("T: ${{ format('}}', secrets.X) }}")), 'x.yml')
  assert.equal(literal.length, 1, literal.join('\n'))
  assert.match(literal[0], /^x\.yml: job a lê X sem environment/)
})

test('SEC-02b: a palavra secrets como texto puro num run: fora de ${{ }} não é leitura', () => {
  assert.deepEqual(verificarTexto(JOB_COM([], ['      - run: echo secrets'])), [])
  assert.deepEqual(verificarTexto(JOB_COM([], ['      - run: echo "secrets.X e secrets[0] são só texto"'])), [])
  assert.deepEqual(verificarTexto(JOB_COM([], ['      - name: rotina de secrets', '        run: echo ok'])), [])
})

test('SEC-02b: ler VITE_SUPABASE_* num if sem passo que exige os segredos continua acusado', () => {
  const passo = ['      - run: echo ok', "        if: secrets.VITE_SUPABASE_URL != ''"]
  assert.ok(verificarTexto(JOB_COM([], passo)).some((p) => /segredos vazios/.test(p)))
  assert.ok(verificarTexto(JOB_COM(["    if: secrets.VITE_SUPABASE_URL != ''"], ['      - run: echo ok'])).some((p) => /segredos vazios/.test(p)))
})

test('SEC-02b: a CLI sai com 1 e imprime a expressão para toJSON(secrets) sem environment', () => {
  const r = cli(JOB_COM([], ENV_PASSO('T: ${{ toJSON(secrets) }}')), 'x.yml')
  assert.equal(r.status, 1, r.stdout + r.stderr)
  assert.match(r.stderr, /x\.yml: job a lê .*\$\{\{ toJSON\(secrets\) \}\}/)
})

test('segredos vazios: leitura em env do job, em forma de fluxo ou no with de um passo sem guard é acusada', () => {
  const noJob = workflow(['  a:', '    runs-on: ubuntu-latest', '    env:', '      V: ${{ secrets.VITE_SUPABASE_URL }}', '    steps:', '      - run: echo ok'])
  assert.ok(verificarTexto(noJob).some((p) => /segredos vazios/.test(p)))
  const fluxo = PASSO(['      - { run: npm run build, env: { K: "${{ secrets.vite_supabase_anon_key }}" } }'])
  assert.ok(verificarTexto(fluxo).some((p) => /segredos vazios/.test(p)))
  const comWith = PASSO([`      - uses: org/repo@${SHA}`, '        with:', '          url: ${{ secrets.VITE_SUPABASE_URL }}'])
  assert.ok(verificarTexto(comWith).some((p) => /segredos vazios/.test(p)))
})
