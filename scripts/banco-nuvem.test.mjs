// Teste de scripts/banco-nuvem.mjs.
// Rode da raiz: node --test scripts/banco-nuvem.test.mjs
// Sem rede e sem chamar a CLI do Supabase: a CLI e o fetch são falsos. Os únicos arquivos
// criados são os temporários do próprio script, no diretório temporário do sistema, e todos
// são apagados.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ErroScript,
  classificarSaida,
  comArquivoTemporario,
  conferirAmbiente,
  conferirApi,
  conferirVersao,
  consultarAuth,
  consultarTabela,
  executar,
  lerContaAdmin,
  migracoesPendentes,
  montarSql,
  motivoDoErro,
  projetoConfere,
} from './banco-nuvem.mjs'

const PASTA = dirname(fileURLToPath(import.meta.url))
const MODELO_REAL = readFileSync(join(PASTA, 'dados-nuvem.sql'), 'utf8')

const ID = '11111111-1111-4111-8111-111111111111'
const BASE = 'https://exemplo.invalid'
const CHAVE = 'chave-de-teste'

const titulo = (anotacao) => /^::error title=([^:]+)::/.exec(anotacao)?.[1]

// ---------------------------------------------------------------------------------------------
// Textos esperados, copiados da spec (não vêm do módulo, de propósito)

const MSG_PERMISSAO = {
  link: '::error title=Permissão do token::O SUPABASE_ACCESS_TOKEN não tem uma permissão que o passo link pede. A CLI 3.0.0 pede: project_admin_read (obrigatória); projects_read e database_pooling_config_read (podem ser pedidas). Crie um token novo com essas permissões, atualize o secret e rode o workflow de novo.',
  push: '::error title=Permissão do token::O SUPABASE_ACCESS_TOKEN não tem uma permissão que o passo push pede. A CLI 3.0.0 pede: database_pooling_config_read e projects_read (podem ser pedidas). Crie um token novo com essas permissões, atualize o secret e rode o workflow de novo.',
  conferir:
    '::error title=Permissão do token::O SUPABASE_ACCESS_TOKEN não tem uma permissão que o passo conferir pede. A CLI 3.0.0 pede: database_pooling_config_read e projects_read (podem ser pedidas). Crie um token novo com essas permissões, atualize o secret e rode o workflow de novo.',
  dados:
    '::error title=Permissão do token::O SUPABASE_ACCESS_TOKEN não tem uma permissão que o passo dados pede. A CLI 3.0.0 pede: database_read (obrigatória); database_write (pode ser pedida). Crie um token novo com essas permissões, atualize o secret e rode o workflow de novo.',
}
const MSG_SENHA =
  '::error title=Senha do banco::SUPABASE_DB_PASSWORD não confere com a senha do banco. Troque a senha em Project Settings > Database, atualize o secret e rode o workflow de novo.'
const MSG_CONTA_INEXISTENTE =
  '::error title=Conta inexistente::o id informado em conta_admin não é de nenhuma conta do projeto. Crie a conta pelo site, copie o Id da sua conta na tela Conta e rode de novo.'
const MSG_PAUSADO =
  '::error title=Projeto pausado::O projeto Supabase está pausado (o plano Free pausa depois de 1 semana sem uso). Restaure no painel do Supabase e rode o workflow de novo.'
const MSG_ID_CONTA =
  '::error title=Id da conta::conta_admin precisa ser um id de conta no formato 8-4-4-4-12, com números e letras de a a f, copiado da tela Conta (Id da sua conta).'
const MSG_PROJETO_DIFERENTE =
  '::error title=Projeto diferente::VITE_SUPABASE_URL não aponta para o projeto de SUPABASE_PROJECT_REF (o host esperado é o ref seguido de .supabase.co).'
const MOTIVO_MODELO =
  'o modelo scripts/dados-nuvem.sql precisa ter __CONTA_ADMIN__ uma vez só'

const LINHA_PROJETO = 'Projeto: VITE_SUPABASE_URL e SUPABASE_PROJECT_REF são o mesmo projeto.'
const LINHA_DATA_API =
  'Data API: respondeu e negou ao anon as tabelas espacos, bebes e registros (401, 42501).'
const LINHA_AUTH = 'Auth: login por e-mail ligado e confirmação de e-mail desligada.'

// ---------------------------------------------------------------------------------------------
// Ajudantes

const json = (status, corpo) => new Response(JSON.stringify(corpo), { status })
const texto = (status, conteudo) => new Response(conteudo, { status })
const AUTH_OK = { external: { email: true }, mailer_autoconfirm: true }

const ok = (stdout = '') => ({ codigo: 0, stdout, stderr: '', saida: stdout })
const falha = (codigo, conteudo) => ({ codigo, stdout: '', stderr: conteudo, saida: conteudo })

// fetch que responde certo: tabelas negadas e Auth com e-mail ligado e sem confirmação.
const fetchCerto = async (url) =>
  String(url).includes('/auth/v1/settings') ? json(200, AUTH_OK) : json(401, { code: '42501' })

function criarContexto({ env = {}, responder = () => ok(), fetchFn, versao = '3.0.0' } = {}) {
  const linhas = []
  const chamadas = []
  const repassado = []
  const deps = {
    env,
    log: (linha) => linhas.push(linha),
    repassar: (conteudo) => repassado.push(conteudo),
    cli: async (args) => {
      chamadas.push(args)
      if (args.length === 1 && args[0] === '--version') return ok(`${versao}\n`)
      return responder(args)
    },
    fetchFn:
      fetchFn ??
      (async () => {
        throw new TypeError('rede não esperada')
      }),
    pausa: async () => {},
    lerPacote: () => ({ devDependencies: { supabase: '3.0.0' } }),
    lerModelo: async () => MODELO_REAL,
  }
  return { deps, linhas, chamadas, repassado }
}

// ---------------------------------------------------------------------------------------------
// 1. Regra de classificação

const CASOS_CLASSIFICACAO = [
  ['FATAL: password authentication failed for user "postgres"', 'Senha do banco'],
  ['ERROR: conta inexistente (SQLSTATE P0001)', 'Conta inexistente'],
  ['Project is PAUSED. Restore it first.', 'Projeto pausado'],
  ['the project is inactive', 'Projeto pausado'],
  ['unexpected status 403: access denied', 'Permissão do token'],
  ['Unexpected error: 401', 'Permissão do token'],
  ['Forbidden', 'Permissão do token'],
  ['Unauthorized request', 'Permissão do token'],
  ['network is unreachable', 'link falhou'],
]

for (const [saida, esperado] of CASOS_CLASSIFICACAO) {
  test(`classificação: "${saida}" vira ${esperado}`, () => {
    assert.equal(titulo(classificarSaida(saida, 'link', 2)), esperado)
  })
}

test('classificação: senha e 403 juntos valem a regra 1', () => {
  const saida = 'status 403 ... password authentication failed for user "postgres"'
  assert.equal(classificarSaida(saida, 'push', 1), MSG_SENHA)
})

test('classificação: a ordem das regras vale (conta inexistente antes de 403)', () => {
  assert.equal(classificarSaida('403 conta inexistente', 'dados', 1), MSG_CONTA_INEXISTENTE)
})

test('classificação: 401 e 403 só contam como número isolado', () => {
  const saida = 'aplicando 20261101403055_x.sql e 1403 e 4010'
  assert.equal(
    classificarSaida(saida, 'push', 7),
    '::error title=push falhou::a CLI saiu com 7; o erro está nas linhas acima.',
  )
})

test('classificação: qualquer outro caso diz o código da CLI', () => {
  assert.equal(
    classificarSaida('algo deu errado', 'conferir', 3),
    '::error title=conferir falhou::a CLI saiu com 3; o erro está nas linhas acima.',
  )
})

test('classificação: as mensagens fixas saem com o texto exato', () => {
  assert.equal(classificarSaida('password authentication failed', 'push', 1), MSG_SENHA)
  assert.equal(classificarSaida('conta inexistente', 'dados', 1), MSG_CONTA_INEXISTENTE)
  assert.equal(classificarSaida('paused', 'link', 1), MSG_PAUSADO)
})

// ---------------------------------------------------------------------------------------------
// 2. Lista de permissões de cada subcomando

for (const sub of ['link', 'push', 'conferir', 'dados']) {
  test(`permissão do token: texto exato de ${sub}`, () => {
    assert.equal(classificarSaida('HTTP 403 forbidden', sub, 1), MSG_PERMISSAO[sub])
    assert.equal(classificarSaida('unauthorized', sub, 1), MSG_PERMISSAO[sub])
  })
}

// ---------------------------------------------------------------------------------------------
// 3. Secret ausente

const PEDIDAS = {
  link: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF'],
  push: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD'],
  conferir: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD'],
  api: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_PROJECT_REF'],
  dados: ['SUPABASE_ACCESS_TOKEN'],
}

for (const [sub, nomes] of Object.entries(PEDIDAS)) {
  for (const nome of nomes) {
    for (const estado of ['ausente', 'vazia']) {
      test(`Secret ausente: ${sub} com ${nome} ${estado}`, () => {
        const env = {}
        for (const outro of nomes) env[outro] = `valor-de-${outro}`
        if (estado === 'ausente') delete env[nome]
        else env[nome] = ''
        const { anotacoes } = conferirAmbiente(sub, false, env)
        assert.deepEqual(anotacoes, [
          `::error title=Secret ausente::${nome} está vazio ou não foi cadastrado em Settings > Secrets and variables > Actions.`,
        ])
        for (const outro of nomes) {
          assert.ok(!anotacoes.join('\n').includes(`valor-de-${outro}`))
        }
      })
    }
  }

  test(`Secret ausente: ${sub} com tudo ausente lista todas as variáveis, na ordem`, () => {
    const { anotacoes } = conferirAmbiente(sub, false, {})
    assert.equal(anotacoes.length, nomes.length)
    nomes.forEach((nome, i) => assert.ok(anotacoes[i].includes(`::${nome} está vazio`)))
  })
}

test('Secret ausente: com --local nenhuma variável é pedida', () => {
  for (const sub of ['conferir', 'api', 'dados']) {
    assert.deepEqual(conferirAmbiente(sub, true, {}), { anotacoes: [], contaAdmin: null })
  }
})

// ---------------------------------------------------------------------------------------------
// 4. CONTA_ADMIN

test('CONTA_ADMIN: vazia e ausente dão "sem admin"', () => {
  assert.deepEqual(lerContaAdmin(undefined), { id: null })
  assert.deepEqual(lerContaAdmin(''), { id: null })
  assert.deepEqual(lerContaAdmin('   '), { id: null })
  const base = { SUPABASE_ACCESS_TOKEN: 'x' }
  assert.deepEqual(conferirAmbiente('dados', false, base), { anotacoes: [], contaAdmin: null })
  assert.deepEqual(conferirAmbiente('dados', false, { ...base, CONTA_ADMIN: '' }), {
    anotacoes: [],
    contaAdmin: null,
  })
})

test('CONTA_ADMIN: id válido passa; espaços e maiúsculas saem normalizados', () => {
  assert.deepEqual(lerContaAdmin(ID), { id: ID })
  const comLetras = 'abcdef01-2345-4678-8abc-def012345678'
  assert.deepEqual(lerContaAdmin(`  ${comLetras.toUpperCase()}\n `), { id: comLetras })
  const env = { SUPABASE_ACCESS_TOKEN: 'x', CONTA_ADMIN: ` ${comLetras.toUpperCase()} ` }
  assert.deepEqual(conferirAmbiente('dados', false, env), { anotacoes: [], contaAdmin: comLetras })
})

const IDS_INVALIDOS = [
  'nao-e-uuid',
  ID.slice(0, 35),
  ID.replace('8111', 'g111'),
  `${ID}'; drop table x; --`,
  ID.replace('4111', '4１11'),
]

for (const invalido of IDS_INVALIDOS) {
  test(`CONTA_ADMIN: reprova ${JSON.stringify(invalido)} com Id da conta`, () => {
    assert.deepEqual(lerContaAdmin(invalido), { invalido: true })
    const env = { SUPABASE_ACCESS_TOKEN: 'x', CONTA_ADMIN: invalido }
    assert.deepEqual(conferirAmbiente('dados', false, env), {
      anotacoes: [MSG_ID_CONTA],
      contaAdmin: null,
    })
  })
}

// ---------------------------------------------------------------------------------------------
// 5. Montagem do modelo

test('modelo real: o marcador aparece uma vez só e não há comando destrutivo', () => {
  assert.equal(MODELO_REAL.split('__CONTA_ADMIN__').length - 1, 1)
  assert.ok(!/\b(delete|truncate|drop)\b/i.test(MODELO_REAL))
  assert.ok(!/\bauth\./i.test(MODELO_REAL))
})

test('montarSql: com id, o SQL tem o id entre aspas uma vez e nenhum marcador', () => {
  const sql = montarSql(MODELO_REAL, ID)
  assert.equal(sql.split(`'${ID}'`).length - 1, 1)
  assert.ok(sql.includes(`v_conta uuid := '${ID}';`))
  assert.ok(!sql.includes('__CONTA_ADMIN__'))
})

test('montarSql: sem id, o SQL tem null no lugar do marcador', () => {
  const sql = montarSql(MODELO_REAL, null)
  assert.ok(sql.includes('v_conta uuid := null;'))
  assert.ok(!sql.includes('__CONTA_ADMIN__'))
})

for (const [nome, modelo] of [
  ['zero ocorrências', 'select 1;'],
  ['duas ocorrências', 'a __CONTA_ADMIN__ b __CONTA_ADMIN__ c'],
]) {
  test(`montarSql: recusa modelo com ${nome}`, () => {
    for (const conta of [null, ID]) {
      assert.throws(
        () => montarSql(modelo, conta),
        (erro) => erro instanceof ErroScript && erro.motivo === MOTIVO_MODELO,
      )
    }
  })
}

test('montarSql: recusa conta que não é id válido, mesmo se chamada direto', () => {
  assert.throws(() => montarSql(MODELO_REAL, "x'; drop table y; --"), TypeError)
})

// ---------------------------------------------------------------------------------------------
// 6. Arquivo temporário

test('arquivo temporário: nome com prefixo em os.tmpdir(), conteúdo gravado e apagado no fim', async () => {
  let caminho
  const devolvido = await comArquivoTemporario('select 1;', async (c) => {
    caminho = c
    assert.ok(existsSync(c))
    assert.ok(basename(c).startsWith('banco-nuvem-dados-'))
    assert.equal(resolve(dirname(c)), resolve(tmpdir()))
    assert.equal(readFileSync(c, 'utf8'), 'select 1;')
    return 'devolvido'
  })
  assert.equal(devolvido, 'devolvido')
  assert.equal(existsSync(caminho), false)
})

test('arquivo temporário: dois arquivos têm nomes diferentes', async () => {
  const nomes = []
  for (let i = 0; i < 2; i += 1) {
    await comArquivoTemporario('x', async (c) => nomes.push(c))
  }
  assert.notEqual(nomes[0], nomes[1])
})

test('arquivo temporário: se a função lança erro, o arquivo não existe depois', async () => {
  let caminho
  await assert.rejects(
    comArquivoTemporario('select 1;', async (c) => {
      caminho = c
      throw new Error('falhou de propósito')
    }),
    /falhou de propósito/,
  )
  assert.ok(caminho)
  assert.equal(existsSync(caminho), false)
})

test(
  'arquivo temporário: permissão 0600',
  {
    skip:
      process.platform === 'win32'
        ? 'o Windows não tem permissões POSIX; o runner Linux roda este teste'
        : false,
  },
  async () => {
    await comArquivoTemporario('select 1;', async (c) => {
      assert.equal(statSync(c).mode & 0o777, 0o600)
    })
  },
)

test('arquivo temporário: pasta que não existe vira "arquivo temporário (código)"', async () => {
  await assert.rejects(
    comArquivoTemporario('x', async () => 'nunca', {
      pasta: join(tmpdir(), 'banco-nuvem-pasta-que-nao-existe', 'x'),
    }),
    (erro) => erro instanceof ErroScript && erro.motivo === 'arquivo temporário (ENOENT)',
  )
})

// ---------------------------------------------------------------------------------------------
// 7. Migração pendente

test('migrações pendentes: lista os nomes no formato <14 dígitos>_<nome>.sql', () => {
  const saida = [
    'Would push these migrations:',
    ' • 20261106127100_rotina_lixeira.sql',
    ' • 29991231000000_x.sql',
    ' • 29991231000000_x.sql',
  ].join('\n')
  assert.deepEqual(migracoesPendentes(saida), [
    '20261106127100_rotina_lixeira.sql',
    '29991231000000_x.sql',
  ])
})

test('migrações pendentes: saída sem nome não lista nada', () => {
  assert.deepEqual(migracoesPendentes('Remote database is up to date.'), [])
  assert.deepEqual(migracoesPendentes('123_curto.sql e 202611061271_12dig.sql'), [])
})

test('conferir: pendência reprova e lista os dois nomes; sem nome passa', async () => {
  const pendente = criarContexto({
    env: { SUPABASE_ACCESS_TOKEN: 'x', SUPABASE_DB_PASSWORD: 'y' },
    responder: () =>
      ok('Would push these migrations:\n • 20261106127100_rotina_lixeira.sql\n • 29991231000000_x.sql\n'),
  })
  assert.equal(await executar(['conferir'], pendente.deps), 1)
  assert.deepEqual(pendente.linhas, [
    '::error title=Migração pendente::depois do push, a CLI ainda lista 20261106127100_rotina_lixeira.sql, 29991231000000_x.sql.',
  ])

  const limpo = criarContexto({
    env: { SUPABASE_ACCESS_TOKEN: 'x', SUPABASE_DB_PASSWORD: 'y' },
    responder: () => ok('Remote database is up to date.\n'),
  })
  assert.equal(await executar(['conferir'], limpo.deps), 0)
  assert.deepEqual(limpo.linhas, ['Migrações: nenhuma pendente.'])
})

test('conferir --local: sem variáveis, banco local, mesma regra', async () => {
  const c = criarContexto({ responder: () => ok('Remote database is up to date.\n') })
  assert.equal(await executar(['conferir', '--local'], c.deps), 0)
  assert.deepEqual(c.chamadas, [['--version'], ['db', 'push', '--dry-run']])
  assert.deepEqual(c.linhas, ['Migrações: nenhuma pendente.'])

  const p = criarContexto({ responder: () => ok('• 29991231000000_x.sql') })
  assert.equal(await executar(['conferir', '--local'], p.deps), 1)
  assert.equal(titulo(p.linhas[0]), 'Migração pendente')
})

// ---------------------------------------------------------------------------------------------
// 8. Versão da CLI

test('versão da CLI: 3.0.0 contra 3.0.0 passa', () => {
  assert.equal(conferirVersao('3.0.0', '3.0.0'), null)
  assert.equal(conferirVersao('3.0.0\n', '3.0.0'), null)
})

test('versão da CLI: 2.99.0 contra 3.0.0 reprova com a mensagem exata', () => {
  assert.equal(
    conferirVersao('2.99.0', '3.0.0'),
    '::error title=Versão da CLI::a CLI instalada é 2.99.0, mas o package.json pede 3.0.0.',
  )
})

test('versão da CLI: versão errada para o subcomando antes de qualquer outra chamada', async () => {
  const c = criarContexto({
    env: { SUPABASE_ACCESS_TOKEN: 'x', SUPABASE_PROJECT_REF: 'ref' },
    versao: '2.99.0',
  })
  assert.equal(await executar(['link'], c.deps), 1)
  assert.deepEqual(c.chamadas, [['--version']])
  assert.deepEqual(c.linhas, [
    '::error title=Versão da CLI::a CLI instalada é 2.99.0, mas o package.json pede 3.0.0.',
  ])
})

// ---------------------------------------------------------------------------------------------
// 9. Conferência de projeto

test('projeto: o host tem de ser o ref seguido de .supabase.co', () => {
  assert.equal(projetoConfere('https://abcdefghijklmnopqrst.supabase.co', 'abcdefghijklmnopqrst'), true)
  assert.equal(projetoConfere('https://ABCDEFGHIJKLMNOPQRST.supabase.co', 'abcdefghijklmnopqrst'), true)
  assert.equal(projetoConfere('https://abcdefghijklmnopqrst.supabase.co', 'outroprojetoxxxxxxxx'), false)
  assert.equal(
    projetoConfere('https://abcdefghijklmnopqrst.supabase.co.exemplo.invalid', 'abcdefghijklmnopqrst'),
    false,
  )
  assert.equal(projetoConfere('nao-e-url', 'abcdefghijklmnopqrst'), false)
})

for (const [nome, url, ref] of [
  ['outro ref', 'https://abcdefghijklmnopqrst.supabase.co', 'outroprojetoxxxxxxxx'],
  [
    'host com sufixo',
    'https://abcdefghijklmnopqrst.supabase.co.exemplo.invalid',
    'abcdefghijklmnopqrst',
  ],
  ['não é URL', 'nao-e-url', 'abcdefghijklmnopqrst'],
]) {
  test(`api: ${nome} dá Projeto diferente, sem nenhuma requisição`, async () => {
    let requisicoes = 0
    const c = criarContexto({
      env: { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: CHAVE, SUPABASE_PROJECT_REF: ref },
      fetchFn: async () => {
        requisicoes += 1
        return json(200, {})
      },
    })
    assert.equal(await executar(['api'], c.deps), 1)
    assert.deepEqual(c.linhas, [MSG_PROJETO_DIFERENTE])
    assert.equal(requisicoes, 0)
    assert.deepEqual(c.chamadas, [])
  })
}

// ---------------------------------------------------------------------------------------------
// 10. Respostas da Data API e do Auth (fetch falso)

test('Data API: 401 com 42501 passa', async () => {
  const r = await consultarTabela({
    fetchFn: async () => json(401, { code: '42501', message: 'permission denied' }),
    base: BASE,
    chave: CHAVE,
    tabela: 'espacos',
  })
  assert.deepEqual(r, { ok: true })
})

const CASOS_DATA_API = [
  ['404 com PGRST205', () => json(404, { code: 'PGRST205' }), 'esperado 401 com código 42501; veio 404 PGRST205'],
  ['200 com lista', () => json(200, []), 'esperado 401 com código 42501; veio 200 sem código'],
  ['401 com JSON sem code', () => json(401, { message: 'x' }), 'esperado 401 com código 42501; veio 401 sem código'],
  ['corpo que não é JSON', () => texto(502, '<html>erro</html>'), 'esperado 401 com código 42501; veio 502 sem código'],
  ['corpo vazio', () => texto(401, ''), 'esperado 401 com código 42501; veio 401 sem código'],
  ['200 com 42501', () => json(200, { code: '42501' }), 'esperado 401 com código 42501; veio 200 42501'],
  [
    'code com texto estranho',
    () => json(401, { code: 'https://sentinela.invalid/x' }),
    'esperado 401 com código 42501; veio 401 sem código',
  ],
  [
    'erro de rede',
    () => {
      throw new TypeError('fetch failed')
    },
    'sem resposta (conexão falhou)',
  ],
  [
    'TimeoutError',
    () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    },
    'sem resposta (tempo esgotado)',
  ],
]

for (const [nome, resposta, motivo] of CASOS_DATA_API) {
  test(`Data API: ${nome} reprova`, async () => {
    const r = await consultarTabela({
      fetchFn: async () => resposta(),
      base: BASE,
      chave: CHAVE,
      tabela: 'bebes',
    })
    assert.deepEqual(r, { ok: false, motivo })
  })
}

test('Data API: a requisição usa só apikey, sem Authorization, com limite de tempo', async () => {
  const vistas = []
  await consultarTabela({
    fetchFn: async (url, opcoes) => {
      vistas.push({ url, opcoes })
      return json(401, { code: '42501' })
    },
    base: BASE,
    chave: CHAVE,
    tabela: 'registros',
  })
  assert.equal(vistas.length, 1)
  assert.equal(vistas[0].url, `${BASE}/rest/v1/registros?select=*&limit=1`)
  assert.deepEqual(vistas[0].opcoes.headers, { apikey: CHAVE })
  assert.ok(vistas[0].opcoes.signal instanceof AbortSignal)
})

test('Data API: até 5 tentativas por tabela, a 3 segundos uma da outra', async () => {
  const urls = []
  const pausas = []
  const r = await conferirApi({
    fetchFn: async (url) => {
      urls.push(String(url))
      if (String(url).includes('/auth/v1/settings')) return json(200, AUTH_OK)
      return json(404, { code: 'PGRST205' })
    },
    base: BASE,
    chave: CHAVE,
    pausa: async (ms) => {
      pausas.push(ms)
    },
  })
  for (const tabela of ['espacos', 'bebes', 'registros']) {
    assert.equal(urls.filter((u) => u.includes(`/rest/v1/${tabela}?`)).length, 5)
  }
  assert.deepEqual(pausas, Array(12).fill(3000))
  assert.deepEqual(r.sucessos, [LINHA_AUTH])
  assert.deepEqual(r.falhas, [
    '::error title=Data API::espacos: esperado 401 com código 42501; veio 404 PGRST205.',
    '::error title=Data API::bebes: esperado 401 com código 42501; veio 404 PGRST205.',
    '::error title=Data API::registros: esperado 401 com código 42501; veio 404 PGRST205.',
  ])
})

test('Data API: passa na terceira tentativa e as tabelas vão na ordem espacos, bebes, registros', async () => {
  const tabelas = []
  let tentativasEspacos = 0
  const r = await conferirApi({
    fetchFn: async (url) => {
      const u = String(url)
      if (u.includes('/auth/v1/settings')) return json(200, AUTH_OK)
      tabelas.push(/\/rest\/v1\/([a-z]+)\?/.exec(u)[1])
      if (u.includes('/espacos?')) {
        tentativasEspacos += 1
        if (tentativasEspacos < 3) throw new TypeError('fetch failed')
      }
      return json(401, { code: '42501' })
    },
    base: BASE,
    chave: CHAVE,
    pausa: async () => {},
  })
  assert.deepEqual(r, { sucessos: [LINHA_DATA_API, LINHA_AUTH], falhas: [] })
  assert.deepEqual(tabelas, ['espacos', 'espacos', 'espacos', 'bebes', 'registros'])
})

test('Data API: depois da 5ª tentativa a anotação traz o resultado da última', async () => {
  let chamadas = 0
  const r = await conferirApi({
    fetchFn: async (url) => {
      const u = String(url)
      if (u.includes('/auth/v1/settings')) return json(200, AUTH_OK)
      if (!u.includes('/espacos?')) return json(401, { code: '42501' })
      chamadas += 1
      if (chamadas < 5) return json(404, { code: 'PGRST205' })
      throw new DOMException('timeout', 'TimeoutError')
    },
    base: BASE,
    chave: CHAVE,
    pausa: async () => {},
  })
  assert.equal(chamadas, 5)
  assert.deepEqual(r.falhas, ['::error title=Data API::espacos: sem resposta (tempo esgotado).'])
})

test('Auth: settings com e-mail ligado e confirmação desligada passa', async () => {
  const r = await consultarAuth({ fetchFn: async () => json(200, AUTH_OK), base: BASE, chave: CHAVE })
  assert.deepEqual(r, { ok: true })
})

const CASOS_AUTH = [
  ['status 500', () => json(500, {}), 'respondeu 500'],
  ['status 401', () => json(401, { message: 'x' }), 'respondeu 401'],
  ['200 sem JSON', () => texto(200, 'não é json'), 'respondeu sem JSON'],
  [
    'e-mail desligado',
    () => json(200, { external: { email: false }, mailer_autoconfirm: true }),
    'login por e-mail desligado',
  ],
  ['sem external', () => json(200, { mailer_autoconfirm: true }), 'login por e-mail desligado'],
  [
    'confirmação ligada',
    () => json(200, { external: { email: true }, mailer_autoconfirm: false }),
    'confirmação de e-mail ligada',
  ],
  ['sem mailer_autoconfirm', () => json(200, { external: { email: true } }), 'confirmação de e-mail ligada'],
  [
    'erro de rede',
    () => {
      throw new TypeError('fetch failed')
    },
    'sem resposta (conexão falhou)',
  ],
  [
    'TimeoutError',
    () => {
      throw new DOMException('timeout', 'TimeoutError')
    },
    'sem resposta (tempo esgotado)',
  ],
]

for (const [nome, resposta, motivo] of CASOS_AUTH) {
  test(`Auth: ${nome} reprova com o texto exato`, async () => {
    const vistas = []
    const r = await conferirApi({
      fetchFn: async (url, opcoes) => {
        if (String(url).includes('/auth/v1/settings')) {
          vistas.push({ url: String(url), opcoes })
          return resposta()
        }
        return json(401, { code: '42501' })
      },
      base: BASE,
      chave: CHAVE,
      pausa: async () => {},
    })
    assert.equal(vistas.length, 1, 'o Auth tem uma tentativa só')
    assert.equal(vistas[0].url, `${BASE}/auth/v1/settings`)
    assert.deepEqual(vistas[0].opcoes.headers, { apikey: CHAVE })
    assert.deepEqual(r.sucessos, [LINHA_DATA_API])
    assert.deepEqual(r.falhas, [`::error title=Auth::${motivo}.`])
  })
}

test('api (nuvem): linhas de sucesso na ordem Projeto, Data API, Auth', async () => {
  const c = criarContexto({
    env: {
      // Endereço com barra no fim, montado por concatenação.
      VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co' + '/',
      VITE_SUPABASE_ANON_KEY: CHAVE,
      SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
    },
    fetchFn: fetchCerto,
  })
  assert.equal(await executar(['api'], c.deps), 0)
  assert.deepEqual(c.linhas, [LINHA_PROJETO, LINHA_DATA_API, LINHA_AUTH])
  assert.deepEqual(c.chamadas, [], 'a conferência da API não chama a CLI')
})

test('api --local: lê API_URL e ANON_KEY do supabase status, sem a linha de Projeto', async () => {
  const urls = []
  const c = criarContexto({
    responder: (args) => {
      assert.deepEqual(args, ['status', '-o', 'env'])
      return ok('DB_URL="postgresql://x"\nAPI_URL="http://127.0.0.1:54321"\nANON_KEY="chave-local"\n')
    },
    fetchFn: async (url, opcoes) => {
      urls.push(String(url))
      assert.deepEqual(opcoes.headers, { apikey: 'chave-local' })
      return fetchCerto(url)
    },
  })
  assert.equal(await executar(['api', '--local'], c.deps), 0)
  assert.deepEqual(c.linhas, [LINHA_DATA_API, LINHA_AUTH])
  assert.ok(urls.every((u) => u.startsWith('http://127.0.0.1:54321/')))
})

test('api --local: sem API_URL ou ANON_KEY dá Banco local e lista só os nomes das chaves', async () => {
  const c = criarContexto({
    responder: () => ok('DB_URL="postgresql://segredo@host/db"\nANON_KEY="chave-local"\n'),
  })
  assert.equal(await executar(['api', '--local'], c.deps), 1)
  assert.deepEqual(c.linhas, [
    '::error title=Banco local::supabase status não trouxe API_URL e ANON_KEY; vieram: DB_URL, ANON_KEY.',
  ])
  assert.ok(!c.linhas.join('\n').includes('segredo'))
})

// A saída do `supabase status -o env` (stdout e stderr) fica só em memória, também quando a
// CLI falha: nada dela chega ao log, às anotações nem ao canal `repassar`.
const MARCADOR_STATUS = 'MARCADOR-STATUS-48b'

const saidaStatus = (codigo, stdout, stderr) => ({
  codigo,
  stdout,
  stderr,
  saida: stdout + stderr,
})

const CASOS_STATUS_FALHA = [
  ['stderr só, código 1', 1, '', `erro: ${MARCADOR_STATUS}\n`],
  ['stderr só, código 2', 2, '', `erro: ${MARCADOR_STATUS}\n`],
  ['stdout só, código 1', 1, `${MARCADOR_STATUS}\n`, ''],
  ['stdout só, código 2', 2, `${MARCADOR_STATUS}\n`, ''],
  ['stdout e stderr, código 1', 1, `${MARCADOR_STATUS}\n`, `erro: ${MARCADOR_STATUS}\n`],
  ['stdout e stderr, código 2', 2, `${MARCADOR_STATUS}\n`, `erro: ${MARCADOR_STATUS}\n`],
]

for (const [nome, codigo, stdout, stderr] of CASOS_STATUS_FALHA) {
  test(`api --local: status -o env falhando (${nome}) não deixa a saída em lugar nenhum`, async () => {
    const c = criarContexto({ responder: () => saidaStatus(codigo, stdout, stderr) })
    assert.equal(await executar(['api', '--local'], c.deps), codigo)
    assert.deepEqual(c.chamadas, [['--version'], ['status', '-o', 'env']])
    assert.deepEqual(c.linhas, [
      `::error title=api falhou::a CLI saiu com ${codigo}; o erro está nas linhas acima.`,
    ])
    assert.deepEqual(c.repassado, [], 'nada da saída silenciosa pode ser repassado')
    const tudo = [...c.linhas, ...c.repassado].join('\n')
    assert.ok(!tudo.includes(MARCADOR_STATUS), 'o marcador vazou')
  })
}

test('api --local: status sai com 0 mas sem API_URL e ANON_KEY (controle): nada repassado', async () => {
  const c = criarContexto({
    responder: () => saidaStatus(0, `${MARCADOR_STATUS}\n`, `aviso: ${MARCADOR_STATUS}\n`),
  })
  assert.equal(await executar(['api', '--local'], c.deps), 1)
  assert.deepEqual(c.linhas, [
    '::error title=Banco local::supabase status não trouxe API_URL e ANON_KEY; vieram: nenhuma.',
  ])
  assert.deepEqual(c.repassado, [])
  const tudo = [...c.linhas, ...c.repassado].join('\n')
  assert.ok(!tudo.includes(MARCADOR_STATUS), 'o marcador vazou')
})

test('api --local: status com exit 0 e marcador nos dois canais (controle de sucesso)', async () => {
  const consultas = []
  const c = criarContexto({
    responder: () =>
      saidaStatus(
        0,
        `${MARCADOR_STATUS}\nAPI_URL="http://127.0.0.1:54321"\nANON_KEY="chave-local"\n`,
        `aviso: ${MARCADOR_STATUS}\n`,
      ),
    fetchFn: async (url, opcoes) => {
      consultas.push({ url: String(url), opcoes })
      return fetchCerto(url)
    },
  })
  assert.equal(await executar(['api', '--local'], c.deps), 0)
  assert.equal(consultas.length, 4, 'três tabelas e o Auth, uma consulta cada')
  assert.deepEqual(c.linhas, [LINHA_DATA_API, LINHA_AUTH])
  assert.deepEqual(c.repassado, [])
  const tudo = [...c.linhas, ...c.repassado].join('\n')
  assert.ok(!tudo.includes(MARCADOR_STATUS), 'o marcador vazou')
})

test('versão da CLI: a falha do --version continua repassando o stderr', async () => {
  const c = criarContexto({ env: { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF: 'r' } })
  c.deps.cli = async (args) => {
    c.chamadas.push(args)
    return saidaStatus(5, '', 'erro da versão\n')
  }
  assert.equal(await executar(['link'], c.deps), 5)
  assert.deepEqual(c.repassado, ['erro da versão\n'])
  assert.deepEqual(c.linhas, [
    '::error title=link falhou::a CLI saiu com 5; o erro está nas linhas acima.',
  ])
})

// ---------------------------------------------------------------------------------------------
// Fluxos de link, push e dados (CLI falsa)

test('link e push: argumentos da CLI e nenhuma linha de sucesso extra', async () => {
  const l = criarContexto({ env: { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF: ' abc ' } })
  assert.equal(await executar(['link'], l.deps), 0)
  assert.deepEqual(l.chamadas, [['--version'], ['link', '--project-ref', 'abc']])
  assert.deepEqual(l.linhas, [])

  const p = criarContexto({ env: { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_DB_PASSWORD: 'senha' } })
  assert.equal(await executar(['push'], p.deps), 0)
  assert.deepEqual(p.chamadas, [
    ['--version'],
    ['db', 'push', '--remote', '--password', 'senha', '--yes'],
  ])
  assert.deepEqual(p.linhas, [])
})

test('CLI com código diferente de 0: anotação pela regra e saída com o código da CLI', async () => {
  const c = criarContexto({
    env: { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_DB_PASSWORD: 's' },
    responder: () => falha(3, 'algo deu errado'),
  })
  assert.equal(await executar(['push'], c.deps), 3)
  assert.deepEqual(c.linhas, [
    '::error title=push falhou::a CLI saiu com 3; o erro está nas linhas acima.',
  ])

  const s = criarContexto({
    env: { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_DB_PASSWORD: 's' },
    responder: () => falha(1, 'FATAL: password authentication failed'),
  })
  assert.equal(await executar(['push'], s.deps), 1)
  assert.deepEqual(s.linhas, [MSG_SENHA])
})

test('faltou secret: sai com 1 sem chamar a CLI', async () => {
  const c = criarContexto({ env: { SUPABASE_ACCESS_TOKEN: 't' } })
  assert.equal(await executar(['push'], c.deps), 1)
  assert.deepEqual(c.chamadas, [])
  assert.equal(titulo(c.linhas[0]), 'Secret ausente')
})

test('dados: o SQL vai para um arquivo temporário 0600 que some no fim', async () => {
  let visto
  const c = criarContexto({
    env: { SUPABASE_ACCESS_TOKEN: 't', CONTA_ADMIN: ` ${ID.toUpperCase()} ` },
    responder: (args) => {
      const caminho = args.at(-1)
      visto = { args, caminho, sql: readFileSync(caminho, 'utf8') }
      if (process.platform !== 'win32') assert.equal(statSync(caminho).mode & 0o777, 0o600)
      return ok('')
    },
  })
  assert.equal(await executar(['dados'], c.deps), 0)
  assert.deepEqual(visto.args.slice(0, -1), ['db', 'query', '--remote', '-f'])
  assert.ok(basename(visto.caminho).startsWith('banco-nuvem-dados-'))
  assert.ok(visto.sql.includes(`'${ID}'`))
  assert.equal(existsSync(visto.caminho), false)
  assert.deepEqual(c.linhas, ['Dados: há uma versão vigente dos termos; admin concedido à conta informada.'])
})

test('dados --local sem CONTA_ADMIN: só os termos, admin não pedido', async () => {
  let visto
  const c = criarContexto({
    responder: (args) => {
      visto = { args, sql: readFileSync(args.at(-1), 'utf8') }
      return ok('')
    },
  })
  assert.equal(await executar(['dados', '--local'], c.deps), 0)
  assert.deepEqual(visto.args.slice(0, -1), ['db', 'query', '-f'])
  assert.ok(visto.sql.includes('v_conta uuid := null;'))
  assert.deepEqual(c.linhas, ['Dados: há uma versão vigente dos termos; admin não pedido.'])
})

test('dados: conta inexistente vira a anotação Conta inexistente e o arquivo some', async () => {
  let caminho
  const c = criarContexto({
    env: { SUPABASE_ACCESS_TOKEN: 't', CONTA_ADMIN: ID },
    responder: (args) => {
      caminho = args.at(-1)
      return falha(1, 'ERROR: conta inexistente (SQLSTATE P0001)')
    },
  })
  assert.equal(await executar(['dados'], c.deps), 1)
  assert.deepEqual(c.linhas, [MSG_CONTA_INEXISTENTE])
  assert.equal(existsSync(caminho), false)
})

test('dados: id inválido não chama a CLI', async () => {
  const c = criarContexto({ env: { SUPABASE_ACCESS_TOKEN: 't', CONTA_ADMIN: 'nao-e-uuid' } })
  assert.equal(await executar(['dados'], c.deps), 1)
  assert.deepEqual(c.linhas, [MSG_ID_CONTA])
  assert.deepEqual(c.chamadas, [])
})

test('dados: modelo com duas ocorrências sai com o motivo do modelo, sem chamar a CLI', async () => {
  const c = criarContexto({ env: { SUPABASE_ACCESS_TOKEN: 't' } })
  c.deps.lerModelo = async () => 'a __CONTA_ADMIN__ b __CONTA_ADMIN__'
  assert.equal(await executar(['dados'], c.deps), 1)
  assert.deepEqual(c.linhas, [
    '::error title=dados falhou::o modelo scripts/dados-nuvem.sql precisa ter __CONTA_ADMIN__ uma vez só.',
  ])
  assert.deepEqual(c.chamadas, [])
})

test('CLI que não inicia e erro inesperado viram "<subcomando> falhou"', async () => {
  const naoInicia = criarContexto({
    env: { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF: 'r' },
    responder: () => {
      throw new ErroScript('cli', Object.assign(new Error('spawn x ENOENT'), { code: 'ENOENT' }))
    },
  })
  assert.equal(await executar(['link'], naoInicia.deps), 1)
  assert.deepEqual(naoInicia.linhas, ['::error title=link falhou::a CLI não iniciou (ENOENT).'])

  const inesperado = criarContexto({
    env: { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF: 'r' },
    responder: () => {
      throw new TypeError('mensagem que não deve aparecer')
    },
  })
  assert.equal(await executar(['link'], inesperado.deps), 1)
  assert.deepEqual(inesperado.linhas, ['::error title=link falhou::erro inesperado (TypeError).'])
})

test('uso errado: subcomando desconhecido, --local em link e flag desconhecida', async () => {
  for (const argv of [[], ['nada'], ['link', '--local'], ['push', '--local'], ['api', '--x'], ['constructor']]) {
    const c = criarContexto()
    assert.equal(await executar(argv, c.deps), 1)
    assert.deepEqual(c.chamadas, [])
    assert.equal(c.linhas.length, 1)
    assert.ok(c.linhas[0].startsWith('Uso:'))
  }
})

// ---------------------------------------------------------------------------------------------
// 11. Nada de valor sensível nas mensagens

const SENTINELA = {
  token: 'SENTINELA-TOKEN-48b',
  senha: 'SENTINELA-SENHA-48b',
  chave: 'SENTINELA-CHAVE-48b',
  url: 'https://sentinela48b.supabase.co',
  ref: 'sentinela48b',
}
const ENV_SENTINELA = {
  SUPABASE_ACCESS_TOKEN: SENTINELA.token,
  SUPABASE_DB_PASSWORD: SENTINELA.senha,
  SUPABASE_PROJECT_REF: SENTINELA.ref,
  VITE_SUPABASE_URL: SENTINELA.url,
  VITE_SUPABASE_ANON_KEY: SENTINELA.chave,
  CONTA_ADMIN: ID,
}
const temSentinela = (linha) => /sentinela/i.test(linha)

const CENARIOS_SENTINELA = [
  ['link certo', ['link'], {}],
  ['push com senha errada', ['push'], { responder: () => falha(1, 'password authentication failed') }],
  ['push com 403', ['push'], { responder: () => falha(1, 'HTTP 403') }],
  ['push com saída qualquer', ['push'], { responder: () => falha(9, `erro ${SENTINELA.token}`) }],
  ['conferir com pendência', ['conferir'], { responder: () => ok('• 29991231000000_x.sql') }],
  ['conferir limpo', ['conferir'], {}],
  ['versão errada', ['link'], { versao: '1.0.0' }],
  ['api certo', ['api'], { fetchFn: fetchCerto }],
  ['api com projeto diferente', ['api'], { env: { ...ENV_SENTINELA, SUPABASE_PROJECT_REF: 'outro' } }],
  [
    'api com Data API e Auth falhando',
    ['api'],
    { fetchFn: async () => json(404, { code: 'PGRST205', message: SENTINELA.url }) },
  ],
  [
    'api com erro de rede cuja mensagem tem o endereço',
    ['api'],
    {
      fetchFn: async () => {
        throw new Error(`falha em ${SENTINELA.url} com ${SENTINELA.chave}`)
      },
    },
  ],
  ['dados certo', ['dados'], {}],
  ['dados com id inválido', ['dados'], { env: { ...ENV_SENTINELA, CONTA_ADMIN: `${ID}' ${SENTINELA.token}` } }],
  ['dados com conta inexistente', ['dados'], { responder: () => falha(1, 'conta inexistente') }],
  [
    'erro inesperado com sentinela na mensagem',
    ['link'],
    {
      responder: () => {
        throw new Error(`falha ${SENTINELA.token} ${SENTINELA.url}`)
      },
    },
  ],
  [
    'faltou secret',
    ['push'],
    { env: { SUPABASE_PROJECT_REF: SENTINELA.ref, SUPABASE_DB_PASSWORD: SENTINELA.senha } },
  ],
]

for (const [nome, argv, opcoes] of CENARIOS_SENTINELA) {
  test(`sentinela: "${nome}" não deixa valor de ambiente em nenhuma linha`, async () => {
    const c = criarContexto({ env: ENV_SENTINELA, ...opcoes })
    await executar(argv, c.deps)
    assert.ok(c.linhas.length > 0 || nome === 'link certo')
    for (const linha of c.linhas) {
      assert.ok(!temSentinela(linha), `a linha traz valor sensível: ${linha}`)
    }
  })
}

test('sentinela: o motivo "erro inesperado" traz só o nome do erro', () => {
  const erro = new TypeError(`mensagem com ${SENTINELA.token} e ${SENTINELA.url}`)
  assert.equal(motivoDoErro(erro), 'erro inesperado (TypeError)')
  assert.equal(motivoDoErro(new Error(SENTINELA.url)), 'erro inesperado (Error)')
  assert.equal(motivoDoErro('texto solto'), 'erro inesperado (Error)')
  const estranho = Object.assign(new Error('x'), { name: `Nome ${SENTINELA.token}` })
  assert.ok(!temSentinela(motivoDoErro(estranho)))
})

test('sentinela: o código do sistema só entra se tiver o formato de código', () => {
  const erro = new ErroScript('cli', { code: SENTINELA.token })
  assert.equal(erro.motivo, 'a CLI não iniciou (desconhecido)')
  assert.equal(new ErroScript('arquivo', { code: 'EACCES' }).motivo, 'arquivo temporário (EACCES)')
  assert.equal(new ErroScript('modelo').motivo, MOTIVO_MODELO)
})
