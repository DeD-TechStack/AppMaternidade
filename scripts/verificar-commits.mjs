#!/usr/bin/env node
// Confere a política de commits do AppMaternidade num intervalo <base>..<head>.
// Uso: node scripts/verificar-commits.mjs <base>..<head>
// Saída: 0 quando todos os commits passam; 1 quando algum reprova; 2 em erro de uso ou de git.
// Só Node e git, sem dependências.

import { spawnSync } from 'node:child_process'

const AUTOR_NOME = 'Daniel Macedo'
const AUTOR_EMAIL = 'danielmacedosilva11@gmail.com'
const LIMITE_TITULO = 72

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
    if ([...titulo].length > LIMITE_TITULO) regras.push('título longo')
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
