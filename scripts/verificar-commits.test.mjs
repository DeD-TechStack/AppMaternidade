// Teste de scripts/verificar-commits.mjs.
// Rode da raiz: node --test scripts/verificar-commits.test.mjs
// Cada caso cria um repositório git temporário no diretório temporário do sistema, com a
// configuração do git da máquina isolada, e o apaga no fim.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'verificar-commits.mjs')
const DANIEL = { nome: 'Daniel Macedo', email: 'danielmacedosilva11@gmail.com' }
const FORMATO_LINHA = /^[0-9a-f]{12} [^:]+: /

function criarRepo(t) {
  const pasta = mkdtempSync(join(tmpdir(), 'verificar-commits-'))
  t.after(() => rmSync(pasta, { recursive: true, force: true }))

  const configVazia = join(pasta, 'gitconfig-vazio')
  writeFileSync(configVazia, '')
  const repo = join(pasta, 'repo')
  mkdirSync(repo)

  const ambiente = {}
  for (const [chave, valor] of Object.entries(process.env)) {
    if (!chave.toUpperCase().startsWith('GIT_')) ambiente[chave] = valor
  }
  Object.assign(ambiente, {
    GIT_CONFIG_GLOBAL: configVazia,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CEILING_DIRECTORIES: pasta,
  })

  let contador = 0

  function git(args, { autor = DANIEL, committer = autor } = {}) {
    const r = spawnSync('git', args, {
      cwd: repo,
      encoding: 'utf8',
      env: {
        ...ambiente,
        GIT_AUTHOR_NAME: autor.nome,
        GIT_AUTHOR_EMAIL: autor.email,
        GIT_COMMITTER_NAME: committer.nome,
        GIT_COMMITTER_EMAIL: committer.email,
      },
    })
    assert.equal(r.status, 0, `git ${args.join(' ')} falhou: ${r.stderr}`)
    return r.stdout.trim()
  }

  function alterar(arquivo = 'arquivo.txt') {
    contador += 1
    writeFileSync(join(repo, arquivo), `mudança ${contador}\n`)
    git(['add', arquivo])
  }

  function commitar(titulo, opcoes = {}, extras = []) {
    git(['commit', '-q', ...extras, '-m', titulo], opcoes)
    return git(['rev-parse', 'HEAD'])
  }

  function verificar(...argumentos) {
    const r = spawnSync(process.execPath, [SCRIPT, ...argumentos], {
      cwd: opcoesVerificar.cwd ?? repo,
      encoding: 'utf8',
      env: ambiente,
    })
    return { status: r.status, stdout: r.stdout, stderr: r.stderr }
  }
  const opcoesVerificar = {}

  git(['init', '-q', '-b', 'principal'])
  alterar()
  const base = commitar('Cria o repositório')

  return { pasta, repo, base, git, alterar, commitar, verificar, opcoesVerificar }
}

// Regras citadas nas linhas de reprovação, na ordem em que saíram.
function regras(stderr) {
  return stderr
    .split('\n')
    .filter(Boolean)
    .map((linha) => {
      assert.match(linha, FORMATO_LINHA)
      return linha.slice(13, linha.indexOf(': '))
    })
}

test('1. commit válido passa', (t) => {
  const r = criarRepo(t)
  r.alterar()
  r.commitar('Adiciona o arquivo')
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 0, saida.stderr)
  assert.equal(saida.stdout, `OK: 1 commits verificados em ${r.base}..HEAD\n`)
})

test('2. e-mail certo e nome errado reprova em autor', (t) => {
  const r = criarRepo(t)
  r.alterar()
  r.commitar('Adiciona o arquivo', { autor: { nome: 'Outra Pessoa', email: DANIEL.email } })
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['autor'])
})

test('3. nome certo e e-mail errado reprova em autor', (t) => {
  const r = criarRepo(t)
  r.alterar()
  r.commitar('Adiciona o arquivo', { autor: { nome: DANIEL.nome, email: 'outro@exemplo.invalid' } })
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['autor'])
})

test('4. committer diferente com autor certo passa', (t) => {
  const r = criarRepo(t)
  r.alterar()
  r.commitar('Adiciona o arquivo', {
    autor: DANIEL,
    committer: { nome: 'Robô', email: 'robo@exemplo.invalid' },
  })
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 0, saida.stderr)
})

test('5. commit vazio reprova em vazio', (t) => {
  const r = criarRepo(t)
  r.commitar('Registra nada', {}, ['--allow-empty'])
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['vazio'])
})

test('6. mudança só de permissão passa', (t) => {
  const r = criarRepo(t)
  r.git(['update-index', '--chmod=+x', 'arquivo.txt'])
  r.commitar('Torna o arquivo executável')
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 0, saida.stderr)
})

test('7. título vazio reprova só em título vazio', (t) => {
  const r = criarRepo(t)
  r.alterar()
  r.commitar('', {}, ['--allow-empty-message'])
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['título vazio'])
})

test('8. título minúsculo reprova em maiúscula', (t) => {
  const r = criarRepo(t)
  r.alterar()
  r.commitar('adiciona o arquivo')
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['maiúscula'])
})

test('9. título começando por número reprova em maiúscula', (t) => {
  const r = criarRepo(t)
  r.alterar()
  r.commitar('2 arquivos novos')
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['maiúscula'])
})

test('10. título começando por É passa', (t) => {
  const r = criarRepo(t)
  r.alterar()
  r.commitar('É assim que se registra')
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 0, saida.stderr)
})

test('11. título de 72 pontos de código com acentos passa', (t) => {
  const r = criarRepo(t)
  const titulo = 'Ação ' + 'é'.repeat(67)
  assert.equal([...titulo].length, 72)
  r.alterar()
  r.commitar(titulo)
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 0, saida.stderr)
})

test('12. título de 73 pontos de código reprova em título longo', (t) => {
  const r = criarRepo(t)
  const titulo = 'A' + 'b'.repeat(72)
  assert.equal([...titulo].length, 73)
  r.alterar()
  r.commitar(titulo)
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['título longo'])
})

test('13. merge reprova em merge', (t) => {
  const r = criarRepo(t)
  r.git(['checkout', '-q', '-b', 'lado'])
  r.alterar('lado.txt')
  r.commitar('Muda o lado')
  r.git(['checkout', '-q', 'principal'])
  r.alterar('principal.txt')
  r.commitar('Muda o principal')
  r.git(['merge', '-q', '--no-ff', '-m', 'Junta o lado', 'lado'])
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['merge'])
  assert.match(saida.stderr, / merge: Junta o lado\n$/)
})

// Prepara duas linhas divergentes (principal e lado) prontas para um merge sem conflito.
function prepararDivergencia(r, ramos = ['lado']) {
  for (const ramo of ramos) {
    r.git(['checkout', '-q', '-b', ramo, r.base])
    r.alterar(`${ramo}.txt`)
    r.commitar(`Muda o ${ramo}`)
  }
  r.git(['checkout', '-q', 'principal'])
  r.alterar('principal.txt')
  r.commitar('Muda o principal')
}

for (const titulo of ['Traz o int/refazer para o ramo do cartão', 'Integra o int/refazer no ramo']) {
  test(`13a. merge com 2 pais e título "${titulo}" passa`, (t) => {
    const r = criarRepo(t)
    prepararDivergencia(r)
    r.git(['merge', '-q', '--no-ff', '-m', titulo, 'lado'])
    const saida = r.verificar(`${r.base}..HEAD`)
    assert.equal(saida.status, 0, saida.stderr)
    assert.equal(saida.stdout, `OK: 3 commits verificados em ${r.base}..HEAD\n`)
  })
}

test('13b. merge aceito com título acima de 72 pontos de código passa', (t) => {
  const r = criarRepo(t)
  const titulo = 'Traz o int/refazer ' + 'x'.repeat(60)
  assert.ok([...titulo].length > 72)
  prepararDivergencia(r)
  r.git(['merge', '-q', '--no-ff', '-m', titulo, 'lado'])
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 0, saida.stderr)
})

test('13c. merge com outro título reprova em merge', (t) => {
  const r = criarRepo(t)
  prepararDivergencia(r)
  r.git(['merge', '-q', '--no-ff', '-m', 'Integra o outro ramo', 'lado'])
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['merge'])
  assert.match(saida.stderr, / merge: Integra o outro ramo\n$/)
})

test('13d. octopus de 3 pais com título aceito reprova em merge', (t) => {
  const r = criarRepo(t)
  prepararDivergencia(r, ['lado', 'outro'])
  r.git(['merge', '-q', '--no-ff', '-m', 'Traz o int/refazer em octopus', 'lado', 'outro'])
  const pais = r.git(['show', '-s', '--format=%P', 'HEAD']).split(' ')
  assert.equal(pais.length, 3)
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['merge'])
})

test('13e. merge aceito com autor errado reprova em autor', (t) => {
  const r = criarRepo(t)
  prepararDivergencia(r)
  r.git(['merge', '-q', '--no-ff', '-m', 'Traz o int/refazer para o ramo', 'lado'], {
    autor: { nome: 'Outra Pessoa', email: DANIEL.email },
    committer: DANIEL,
  })
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['autor'])
})

test('13f. merge aceito com committer errado reprova em autor', (t) => {
  const r = criarRepo(t)
  prepararDivergencia(r)
  r.git(['merge', '-q', '--no-ff', '-m', 'Integra o int/refazer no ramo', 'lado'], {
    autor: DANIEL,
    committer: { nome: 'Robô', email: 'robo@exemplo.invalid' },
  })
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['autor'])
})

test('13g. merge com prefixo aceito em minúscula reprova em merge e maiúscula', (t) => {
  const r = criarRepo(t)
  prepararDivergencia(r)
  r.git(['merge', '-q', '--no-ff', '-m', 'traz o int/refazer para o ramo', 'lado'])
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(regras(saida.stderr), ['merge', 'maiúscula'])
})

test('14. intervalo sem commits passa com 0 commits', (t) => {
  const r = criarRepo(t)
  const saida = r.verificar('HEAD..HEAD')
  assert.equal(saida.status, 0, saida.stderr)
  assert.equal(saida.stdout, 'OK: 0 commits verificados em HEAD..HEAD\n')
})

test('15. sem argumento sai com 2', (t) => {
  const r = criarRepo(t)
  const saida = r.verificar()
  assert.equal(saida.status, 2)
  assert.match(saida.stderr, /^erro: /)
})

test('16. argumento sem .. sai com 2', (t) => {
  const r = criarRepo(t)
  for (const argumento of ['HEAD', `${r.base}...HEAD`, '..HEAD', 'HEAD..']) {
    const saida = r.verificar(argumento)
    assert.equal(saida.status, 2, `argumento ${argumento}`)
    assert.match(saida.stderr, /^erro: /)
  }
})

test('17. referência inexistente sai com 2', (t) => {
  const r = criarRepo(t)
  const saida = r.verificar('HEAD..naoexiste')
  assert.equal(saida.status, 2)
  assert.match(saida.stderr, /^erro: /)
})

test('18. cada linha de reprovação tem hash de 12, regra e título', (t) => {
  const r = criarRepo(t)
  r.alterar()
  const sha = r.commitar('  minúsculo com espaços  ', {
    autor: { nome: 'Outra Pessoa', email: 'outro@exemplo.invalid' },
  })
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  const linhas = saida.stderr.split('\n').filter(Boolean)
  for (const linha of linhas) assert.match(linha, FORMATO_LINHA)
  assert.deepEqual(linhas, [
    `${sha.slice(0, 12)} autor: minúsculo com espaços`,
    `${sha.slice(0, 12)} maiúscula: minúsculo com espaços`,
  ])
})

test('extra: mais de um argumento sai com 2', (t) => {
  const r = criarRepo(t)
  const saida = r.verificar(`${r.base}..HEAD`, 'HEAD..HEAD')
  assert.equal(saida.status, 2)
  assert.match(saida.stderr, /^erro: /)
})

test('extra: pasta fora de repositório git sai com 2', (t) => {
  const r = criarRepo(t)
  r.opcoesVerificar.cwd = r.pasta
  const saida = r.verificar('HEAD..HEAD')
  assert.equal(saida.status, 2)
  assert.match(saida.stderr, /^erro: .*repositório git/)
})

test('extra: commits são conferidos do mais antigo ao mais novo', (t) => {
  const r = criarRepo(t)
  r.alterar()
  const primeiro = r.commitar('primeiro errado')
  r.alterar()
  const segundo = r.commitar('segundo errado')
  const saida = r.verificar(`${r.base}..HEAD`)
  assert.equal(saida.status, 1)
  assert.deepEqual(saida.stderr.split('\n').filter(Boolean), [
    `${primeiro.slice(0, 12)} maiúscula: primeiro errado`,
    `${segundo.slice(0, 12)} maiúscula: segundo errado`,
  ])
})
