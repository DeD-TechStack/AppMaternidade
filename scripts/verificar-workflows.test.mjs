// Teste de scripts/verificar-workflows.mjs e dos workflows do repositório.
// Rode da raiz: node --test scripts/verificar-workflows.test.mjs
// Os casos negativos usam workflows em memória com segredos sintéticos; nenhum valor real.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
  assert.match(problemas[0], /^x\.yml:9: uses sem pin por SHA de 40 hex: actions\/setup-node@v5$/)
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
  assert.match(ruim.stderr, /ruim\.yml:9: uses sem pin/)
  assert.match(ruim.stderr, /ruim\.yml:9: checkout no job a sem persist-credentials/)

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
