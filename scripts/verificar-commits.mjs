#!/usr/bin/env node
// Confere a política de commits do AppMaternidade num intervalo <base>..<head>.
// Uso: node scripts/verificar-commits.mjs <base>..<head>
// Saída: 0 quando todos os commits passam; 1 quando algum reprova; 2 em erro de uso ou de git.
// Só Node e git, sem dependências.

import { spawnSync } from 'node:child_process'

const AUTOR_NOME = 'Daniel Macedo'
const AUTOR_EMAIL = 'danielmacedosilva11@gmail.com'
const LIMITE_TITULO = 72
// Exceção aprovada em 20/11 (PAGES, comentário 2942): apenas o comprimento do
// título destes commits já publicados. O intervalo e as demais regras não mudam.
const TITULOS_HISTORICOS_LONGOS = new Set([
  '3ed702da371db7628bcd7f67622e18aaf64979ea',
  '65f13bcbf2c14478b92ccf6c3515bb16f848a6e6',
  '751586dd479a559539f7c36eca994d83d6020e72',
  'baf3d5df7d499a8dc6319a1338280acf61ba03d5',
  'c1a71192c4e273e5237e4a3ffae8e9bd7b2f0b8b',
  '8fc6b72bb868d51668c840c930305efb12d594f2',
  '21f5bd26f49bafb26747dfcb49eaa2d79717d9f9',
  '2c1faeb17cc2af4707ea0b71807c508f7a754fe0',
  'f7d0f4c36b0723a878899d51ce7189956c968d70',
  '7274aa93d348e637e6f04ded587950baccf264d9',
])

function erro(mensagem) {
  process.stderr.write(`erro: ${mensagem}\n`)
  process.exit(2)
}

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.error) erro(`não foi possível executar o git (${r.error.message})`)
  return r
}

function gitOk(args, mensagemErro) {
  const r = git(args)
  if (r.status !== 0) erro(mensagemErro)
  return r.stdout
}

const args = process.argv.slice(2)
if (args.length !== 1) {
  erro('informe exatamente um intervalo no formato <base>..<head>')
}

const intervalo = args[0]
const posicao = intervalo.indexOf('..')
if (posicao === -1 || posicao !== intervalo.lastIndexOf('..')) {
  erro(`intervalo inválido "${intervalo}": use exatamente um ".." entre base e head`)
}
const base = intervalo.slice(0, posicao)
const head = intervalo.slice(posicao + 2)
if (base === '' || head === '') {
  erro(`intervalo inválido "${intervalo}": base e head precisam estar preenchidos`)
}

if (git(['rev-parse', '--git-dir']).status !== 0) {
  erro('a pasta atual não é um repositório git')
}

function resolver(ref) {
  const r = git(['rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`])
  if (r.status !== 0) erro(`o git não resolveu a referência "${ref}"`)
  return r.stdout.trim()
}
const baseSha = resolver(base)
const headSha = resolver(head)

const commits = gitOk(
  ['rev-list', '--reverse', `${baseSha}..${headSha}`],
  `o git não listou os commits de "${intervalo}"`,
)
  .split('\n')
  .map((linha) => linha.trim())
  .filter(Boolean)

const reprovacoes = []

for (const sha of commits) {
  // Nome, e-mail e pais numa linha cada; a mensagem inteira (%B) vem por último.
  const dados = gitOk(
    ['show', '-s', '--format=%an%n%ae%n%P%n%B', sha],
    `o git não leu o commit ${sha}`,
  )
  const [nome, email, pais, ...mensagem] = dados.split('\n')
  const titulo = (mensagem[0] ?? '').trim()
  const regras = []

  if (nome !== AUTOR_NOME || email !== AUTOR_EMAIL) regras.push('autor')

  const merge = pais.trim().split(/\s+/).filter(Boolean).length > 1
  if (merge) {
    regras.push('merge')
  } else {
    const arquivos = gitOk(
      ['diff-tree', '--root', '--no-commit-id', '-r', '--name-only', sha],
      `o git não leu as mudanças do commit ${sha}`,
    )
    if (arquivos.trim() === '') regras.push('vazio')
  }

  if (titulo === '') {
    regras.push('título vazio')
  } else {
    if ([...titulo].length > LIMITE_TITULO && (merge || !TITULOS_HISTORICOS_LONGOS.has(sha))) {
      regras.push('título longo')
    }
    if (!/^\p{Lu}/u.test(titulo)) regras.push('maiúscula')
  }

  for (const regra of regras) {
    reprovacoes.push(`${sha.slice(0, 12)} ${regra}: ${titulo}`)
  }
}

if (reprovacoes.length > 0) {
  process.stderr.write(`${reprovacoes.join('\n')}\n`)
  process.exit(1)
}

process.stdout.write(`OK: ${commits.length} commits verificados em ${intervalo}\n`)
