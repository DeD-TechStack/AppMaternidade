#!/usr/bin/env node
// Confere a política de commits do AppMaternidade num intervalo <base>..<head>.
// Uso: node scripts/verificar-commits.mjs <base>..<head>
// Saída: 0 quando todos os commits passam; 1 quando algum reprova; 2 em erro de uso ou de git.
// Só Node e git, sem dependências.

import { spawnSync } from 'node:child_process'

const AUTOR_NOME = 'Daniel Macedo'
const AUTOR_EMAIL = 'danielmacedosilva11@gmail.com'
const LIMITE_TITULO = 72
// Único merge aceito: 2 pais e título com um destes prefixos (autor e committer = Daniel).
const PREFIXOS_MERGE = ['Traz o int/refazer', 'Integra o int/refazer']
// Allowlist de merges extras aceitos pelo SHA completo (40 caracteres, nunca abreviado),
// além dos merges com prefixo acima. Cada entrada é `{ sha, motivo }`; o motivo registra
// quem pediu e quando. O merge da lista continua sujeito às demais regras (autor, committer,
// título com maiúscula etc.) e precisa ter exatamente 2 pais. Qualquer outro merge segue
// reprovado.
const MERGES_APROVADOS = [
  {
    sha: '81504a7a34fb803cd2108e64f1eb4756c052fe4d',
    motivo: 'merge da 37a aprovada pedido pelo líder na MAT-37r, 11/11/2026',
  },
]

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
  // Autor (nome, e-mail), committer (nome, e-mail) e pais numa linha cada; a mensagem
  // inteira (%B) vem por último.
  const dados = gitOk(
    ['show', '-s', '--format=%an%n%ae%n%cn%n%ce%n%P%n%B', sha],
    `o git não leu o commit ${sha}`,
  )
  const [nome, email, nomeCommitter, emailCommitter, pais, ...mensagem] = dados.split('\n')
  const titulo = (mensagem[0] ?? '').trim()
  const regras = []

  const quantidadePais = pais.trim().split(/\s+/).filter(Boolean).length
  const merge = quantidadePais > 1
  const mergeAceito =
    quantidadePais === 2 && PREFIXOS_MERGE.some((prefixo) => titulo.startsWith(prefixo))
  const mergeAprovado =
    quantidadePais === 2 && MERGES_APROVADOS.some((aprovado) => aprovado.sha === sha)

  if (nome !== AUTOR_NOME || email !== AUTOR_EMAIL) {
    regras.push('autor')
  } else if ((mergeAceito || mergeAprovado) && (nomeCommitter !== AUTOR_NOME || emailCommitter !== AUTOR_EMAIL)) {
    // O committer só é conferido nos merges aceitos.
    regras.push('autor')
  }

  if (merge) {
    if (!mergeAceito && !mergeAprovado) regras.push('merge')
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
    if (!mergeAceito && [...titulo].length > LIMITE_TITULO) regras.push('título longo')
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
