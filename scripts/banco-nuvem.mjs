#!/usr/bin/env node
// Banco na nuvem (MAT-48b): liga a CLI do Supabase ao projeto, aplica as migrações, confere o
// resultado e garante os dados iniciais. Só a biblioteca padrão do Node 24.
//
// Uso (da raiz do repositório): node scripts/banco-nuvem.mjs <subcomando> [--local]
//   link | push | conferir [--local] | api [--local] | dados [--local]
//
// Regras que valem para tudo aqui:
// - nenhuma mensagem nem linha de sucesso traz valor de variável de ambiente, endereço do
//   projeto, token, chave, senha ou id de conta; o corpo de resposta HTTP nunca é impresso;
// - a CLI é a do pacote npm `supabase` da raiz (process.execPath + dist/supabase.js, sem shell);
// - importado pelo teste, o arquivo só exporta funções; só roda quando é chamado direto.

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PASTA_SCRIPTS = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(PASTA_SCRIPTS, '..')
const CLI_JS = join(RAIZ, 'node_modules', 'supabase', 'dist', 'supabase.js')
const MODELO_DADOS = join(PASTA_SCRIPTS, 'dados-nuvem.sql')
const PACOTE = join(RAIZ, 'package.json')

export const MARCADOR_CONTA = '__CONTA_ADMIN__'
export const TABELAS = ['espacos', 'bebes', 'registros']
export const TENTATIVAS_TABELA = 5
export const INTERVALO_TENTATIVA_MS = 3000
export const LIMITE_REQUISICAO_MS = 10000

const REGEX_CONTA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const PREFIXO_TEMPORARIO = 'banco-nuvem-dados-'

// Variáveis que cada subcomando exige. `local: null` quer dizer que o subcomando não tem --local.
export const SUBCOMANDOS = {
  link: { remoto: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF'], local: null },
  push: { remoto: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD'], local: null },
  conferir: { remoto: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD'], local: [] },
  api: {
    remoto: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_PROJECT_REF'],
    local: [],
  },
  dados: { remoto: ['SUPABASE_ACCESS_TOKEN'], local: [], contaAdmin: true },
}

const LISTA_LINK =
  'project_admin_read (obrigatória); projects_read e database_pooling_config_read (podem ser pedidas)'
const LISTA_PUSH = 'database_pooling_config_read e projects_read (podem ser pedidas)'
const LISTA_DADOS = 'database_read (obrigatória); database_write (pode ser pedida)'

export const LISTAS_PERMISSOES = {
  link: LISTA_LINK,
  push: LISTA_PUSH,
  conferir: LISTA_PUSH,
  dados: LISTA_DADOS,
}

// ---------------------------------------------------------------------------------------------
// Mensagens (texto exato da spec)

export function anotacao(titulo, texto) {
  return `::error title=${titulo}::${texto}`
}

export function msgSecretAusente(nome) {
  return anotacao(
    'Secret ausente',
    `${nome} está vazio ou não foi cadastrado em Settings > Secrets and variables > Actions.`,
  )
}

export function msgIdConta() {
  return anotacao(
    'Id da conta',
    'conta_admin precisa ser um id de conta no formato 8-4-4-4-12, com números e letras de a a f, copiado da tela Conta (Id da sua conta).',
  )
}

function versaoLegivel(valor) {
  const texto = String(valor ?? '').trim()
  return /^[0-9A-Za-z.+_-]{1,40}$/.test(texto) ? texto : 'desconhecida'
}

export function msgVersaoCli(vista, pedida) {
  return anotacao(
    'Versão da CLI',
    `a CLI instalada é ${versaoLegivel(vista)}, mas o package.json pede ${versaoLegivel(pedida)}.`,
  )
}

export function msgSenhaBanco() {
  return anotacao(
    'Senha do banco',
    'SUPABASE_DB_PASSWORD não confere com a senha do banco. Troque a senha em Project Settings > Database, atualize o secret e rode o workflow de novo.',
  )
}

export function msgContaInexistente() {
  return anotacao(
    'Conta inexistente',
    'o id informado em conta_admin não é de nenhuma conta do projeto. Crie a conta pelo site, copie o Id da sua conta na tela Conta e rode de novo.',
  )
}

export function msgProjetoPausado() {
  return anotacao(
    'Projeto pausado',
    'O projeto Supabase está pausado (o plano Free pausa depois de 1 semana sem uso). Restaure no painel do Supabase e rode o workflow de novo.',
  )
}

export function msgPermissaoToken(subcomando) {
  return anotacao(
    'Permissão do token',
    `O SUPABASE_ACCESS_TOKEN não tem uma permissão que o passo ${subcomando} pede. A CLI 3.0.0 pede: ${LISTAS_PERMISSOES[subcomando]}. Crie um token novo com essas permissões, atualize o secret e rode o workflow de novo.`,
  )
}

export function msgFalhou(subcomando, motivo) {
  return anotacao(`${subcomando} falhou`, `${motivo}.`)
}

export function msgMigracaoPendente(nomes) {
  return anotacao('Migração pendente', `depois do push, a CLI ainda lista ${nomes.join(', ')}.`)
}

export function msgBancoLocal(chaves) {
  const nomes = chaves.length > 0 ? chaves.join(', ') : 'nenhuma'
  return anotacao('Banco local', `supabase status não trouxe API_URL e ANON_KEY; vieram: ${nomes}.`)
}

export function msgProjetoDiferente() {
  return anotacao(
    'Projeto diferente',
    'VITE_SUPABASE_URL não aponta para o projeto de SUPABASE_PROJECT_REF (o host esperado é o ref seguido de .supabase.co).',
  )
}

export function msgDataApi(tabela, motivo) {
  return anotacao('Data API', `${tabela}: ${motivo}.`)
}

export function msgAuth(motivo) {
  return anotacao('Auth', `${motivo}.`)
}

export const LINHA_SEM_PENDENCIA = 'Migrações: nenhuma pendente.'
export const LINHA_PROJETO = 'Projeto: VITE_SUPABASE_URL e SUPABASE_PROJECT_REF são o mesmo projeto.'
export const LINHA_DATA_API =
  'Data API: respondeu e negou ao anon as tabelas espacos, bebes e registros (401, 42501).'
export const LINHA_AUTH = 'Auth: login por e-mail ligado e confirmação de e-mail desligada.'

export function linhaDados(comAdmin) {
  const admin = comAdmin ? 'concedido à conta informada' : 'não pedido'
  return `Dados: há uma versão vigente dos termos; admin ${admin}.`
}

// ---------------------------------------------------------------------------------------------
// Erros de fluxo

// Falha prevista, com as anotações prontas e o código de saída.
export class Encerrar extends Error {
  constructor(anotacoes, codigo = 1) {
    super('encerrar')
    this.name = 'Encerrar'
    this.anotacoes = anotacoes
    this.codigo = codigo
  }
}

function codigoDoSistema(causa) {
  const codigo = causa && causa.code
  return typeof codigo === 'string' && /^[A-Z0-9_]{1,30}$/.test(codigo) ? codigo : 'desconhecido'
}

// Falha com motivo fixo da lista de mensagens. A causa original só entra pelo código do sistema.
export class ErroScript extends Error {
  constructor(tipo, causa) {
    super(tipo)
    this.name = 'ErroScript'
    this.tipo = tipo
    if (tipo === 'cli') {
      this.motivo = `a CLI não iniciou (${codigoDoSistema(causa)})`
    } else if (tipo === 'arquivo') {
      this.motivo = `arquivo temporário (${codigoDoSistema(causa)})`
    } else {
      this.motivo = `o modelo scripts/dados-nuvem.sql precisa ter ${MARCADOR_CONTA} uma vez só`
    }
  }
}

export function motivoDoErro(erro) {
  if (erro instanceof ErroScript) return erro.motivo
  const nome =
    erro && typeof erro.name === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(erro.name)
      ? erro.name
      : 'Error'
  return `erro inesperado (${nome})`
}

// ---------------------------------------------------------------------------------------------
// Ambiente

// CONTA_ADMIN: vazia ou ausente = sem admin; preenchida tem de ser id válido (só ASCII).
export function lerContaAdmin(valor) {
  if (valor === undefined || valor === null) return { id: null }
  const texto = String(valor).trim()
  if (texto === '') return { id: null }
  if (!/^[\x20-\x7e]+$/.test(texto)) return { invalido: true }
  const id = texto.toLowerCase()
  return REGEX_CONTA.test(id) ? { id } : { invalido: true }
}

function vazia(valor) {
  return valor === undefined || valor === null || String(valor).trim() === ''
}

export function conferirAmbiente(subcomando, local, env) {
  const definicao = SUBCOMANDOS[subcomando]
  const nomes = (local ? definicao.local : definicao.remoto) ?? []
  const anotacoes = []
  for (const nome of nomes) {
    if (vazia(env[nome])) anotacoes.push(msgSecretAusente(nome))
  }
  let contaAdmin = null
  if (definicao.contaAdmin) {
    const conta = lerContaAdmin(env.CONTA_ADMIN)
    if (conta.invalido) anotacoes.push(msgIdConta())
    else contaAdmin = conta.id
  }
  return { anotacoes, contaAdmin }
}

// ---------------------------------------------------------------------------------------------
// Saída da CLI

// A primeira regra que casar vence (sem diferenciar maiúsculas).
export function classificarSaida(saida, subcomando, codigo) {
  const texto = String(saida ?? '').toLowerCase()
  if (texto.includes('password authentication failed')) return msgSenhaBanco()
  if (texto.includes('conta inexistente')) return msgContaInexistente()
  if (texto.includes('paused') || texto.includes('inactive')) return msgProjetoPausado()
  if (
    Object.hasOwn(LISTAS_PERMISSOES, subcomando) &&
    (/\b(401|403)\b/.test(texto) || texto.includes('forbidden') || texto.includes('unauthorized'))
  ) {
    return msgPermissaoToken(subcomando)
  }
  return msgFalhou(subcomando, `a CLI saiu com ${codigo}; o erro está nas linhas acima`)
}

export function migracoesPendentes(saida) {
  const achados = String(saida ?? '').match(/(?<![0-9])[0-9]{14}_[A-Za-z0-9_-]+\.sql/g) ?? []
  return [...new Set(achados)]
}

export function conferirVersao(vista, pedida) {
  return String(vista ?? '').trim() === String(pedida ?? '').trim() ? null : msgVersaoCli(vista, pedida)
}

// `supabase status -o env`: linhas CHAVE="valor".
export function lerSaidaEnv(texto) {
  const chaves = Object.create(null)
  for (const linha of String(texto ?? '').split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(linha.trim())
    if (!m) continue
    let valor = m[2].trim()
    if (valor.length >= 2 && valor.startsWith('"') && valor.endsWith('"')) {
      valor = valor.slice(1, -1)
    }
    chaves[m[1]] = valor
  }
  return chaves
}

// ---------------------------------------------------------------------------------------------
// Dados iniciais

export function montarSql(modelo, contaAdmin) {
  const partes = String(modelo).split(MARCADOR_CONTA)
  if (partes.length !== 2) throw new ErroScript('modelo')
  if (contaAdmin !== null && !REGEX_CONTA.test(contaAdmin)) {
    throw new TypeError('conta inválida')
  }
  const valor = contaAdmin === null ? 'null' : `'${contaAdmin}'`
  return partes[0] + valor + partes[1]
}

// Grava o SQL num arquivo de nome aleatório (modo 0600), chama `usar(caminho)` e apaga o arquivo
// com sucesso ou erro.
export async function comArquivoTemporario(conteudo, usar, { pasta = tmpdir() } = {}) {
  const caminho = join(pasta, `${PREFIXO_TEMPORARIO}${randomBytes(12).toString('hex')}.sql`)
  try {
    await writeFile(caminho, conteudo, { mode: 0o600, flag: 'wx' })
  } catch (erro) {
    await rm(caminho, { force: true }).catch(() => {})
    throw new ErroScript('arquivo', erro)
  }
  try {
    return await usar(caminho)
  } finally {
    try {
      await unlink(caminho)
    } catch (erro) {
      throw new ErroScript('arquivo', erro)
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Projeto, Data API e Auth

export function projetoConfere(url, ref) {
  try {
    const host = new URL(String(url).trim()).hostname.toLowerCase()
    const esperado = `${String(ref).trim()}.supabase.co`.toLowerCase()
    return host === esperado
  } catch {
    return false
  }
}

async function requisitar(fetchFn, url, chave) {
  try {
    const resposta = await fetchFn(url, {
      headers: { apikey: chave },
      signal: AbortSignal.timeout(LIMITE_REQUISICAO_MS),
    })
    const texto = await resposta.text()
    return { status: resposta.status, texto }
  } catch (erro) {
    return { falha: erro && erro.name === 'TimeoutError' ? 'tempo esgotado' : 'conexão falhou' }
  }
}

function lerJson(texto) {
  try {
    return { corpo: JSON.parse(texto) }
  } catch {
    return { corpo: undefined }
  }
}

function codigoDaResposta(corpo) {
  const codigo = corpo && typeof corpo === 'object' ? corpo.code : undefined
  return typeof codigo === 'string' && /^[A-Za-z0-9_]{1,20}$/.test(codigo) ? codigo : undefined
}

// Uma consulta à tabela, sem Authorization. Passa com 401 e código 42501.
export async function consultarTabela({ fetchFn, base, chave, tabela }) {
  const r = await requisitar(fetchFn, `${base}/rest/v1/${tabela}?select=*&limit=1`, chave)
  if (r.falha) return { ok: false, motivo: `sem resposta (${r.falha})` }
  const codigo = codigoDaResposta(lerJson(r.texto).corpo)
  if (r.status === 401 && codigo === '42501') return { ok: true }
  return {
    ok: false,
    motivo: `esperado 401 com código 42501; veio ${r.status} ${codigo ?? 'sem código'}`,
  }
}

// Uma tentativa em /auth/v1/settings.
export async function consultarAuth({ fetchFn, base, chave }) {
  const r = await requisitar(fetchFn, `${base}/auth/v1/settings`, chave)
  if (r.falha) return { ok: false, motivo: `sem resposta (${r.falha})` }
  if (r.status !== 200) return { ok: false, motivo: `respondeu ${r.status}` }
  const { corpo } = lerJson(r.texto)
  if (corpo === undefined) return { ok: false, motivo: 'respondeu sem JSON' }
  if (corpo?.external?.email !== true) return { ok: false, motivo: 'login por e-mail desligado' }
  if (corpo?.mailer_autoconfirm !== true) {
    return { ok: false, motivo: 'confirmação de e-mail ligada' }
  }
  return { ok: true }
}

function dormir(ms) {
  return new Promise((concluir) => setTimeout(concluir, ms))
}

export async function conferirTabelaComTentativas({ fetchFn, base, chave, tabela, pausa }) {
  let ultimo
  for (let tentativa = 1; tentativa <= TENTATIVAS_TABELA; tentativa += 1) {
    ultimo = await consultarTabela({ fetchFn, base, chave, tabela })
    if (ultimo.ok) return ultimo
    if (tentativa < TENTATIVAS_TABELA) await pausa(INTERVALO_TENTATIVA_MS)
  }
  return ultimo
}

// Devolve as linhas de sucesso e as anotações de falha, nesta ordem: Data API, Auth.
export async function conferirApi({ fetchFn, base, chave, pausa = dormir }) {
  const sucessos = []
  const falhas = []

  let dataApiOk = true
  for (const tabela of TABELAS) {
    const r = await conferirTabelaComTentativas({ fetchFn, base, chave, tabela, pausa })
    if (!r.ok) {
      dataApiOk = false
      falhas.push(msgDataApi(tabela, r.motivo))
    }
  }
  if (dataApiOk) sucessos.push(LINHA_DATA_API)

  const auth = await consultarAuth({ fetchFn, base, chave })
  if (auth.ok) sucessos.push(LINHA_AUTH)
  else falhas.push(msgAuth(auth.motivo))

  return { sucessos, falhas }
}

// ---------------------------------------------------------------------------------------------
// CLI do Supabase

// Chama a CLI do pacote npm da raiz. Com `silencioso`, nada vai para o log (o `status -o env`
// traz chaves). Resolve com { codigo, stdout, stderr, saida }; rejeita se a CLI não inicia.
export function cliReal(args, { silencioso = false } = {}) {
  return new Promise((concluir, rejeitar) => {
    if (!existsSync(CLI_JS)) {
      rejeitar(new ErroScript('cli', { code: 'ENOENT' }))
      return
    }
    let filho
    try {
      filho = spawn(process.execPath, [CLI_JS, ...args], {
        cwd: RAIZ,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
        windowsHide: true,
      })
    } catch (erro) {
      rejeitar(new ErroScript('cli', erro))
      return
    }
    const stdout = []
    const stderr = []
    const saida = []
    filho.stdout.on('data', (pedaco) => {
      stdout.push(pedaco)
      saida.push(pedaco)
      if (!silencioso) process.stdout.write(pedaco)
    })
    filho.stderr.on('data', (pedaco) => {
      stderr.push(pedaco)
      saida.push(pedaco)
      if (!silencioso) process.stderr.write(pedaco)
    })
    filho.on('error', (erro) => rejeitar(new ErroScript('cli', erro)))
    filho.on('close', (codigo) => {
      concluir({
        codigo: codigo ?? 1,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        saida: Buffer.concat(saida).toString('utf8'),
      })
    })
  })
}

function lerPacote() {
  return JSON.parse(readFileSync(PACOTE, 'utf8'))
}

function lerModelo() {
  return readFile(MODELO_DADOS, 'utf8')
}

// ---------------------------------------------------------------------------------------------
// Execução

const USO = 'Uso: node scripts/banco-nuvem.mjs <link|push|conferir|api|dados> [--local]'

async function chamarCli(ctx, args, opcoes = {}) {
  const { d } = ctx
  if (!ctx.versaoConferida) {
    const v = await d.cli(['--version'], { silencioso: true })
    if (v.codigo !== 0) {
      d.repassar(v.stderr)
      throw new Encerrar([classificarSaida(v.saida, ctx.sub, v.codigo)], v.codigo || 1)
    }
    const pedida = d.lerPacote()?.devDependencies?.supabase
    const falha = conferirVersao(v.stdout, pedida)
    if (falha) throw new Encerrar([falha], 1)
    ctx.versaoConferida = true
  }
  // Chamada silenciosa (`status -o env`): stdout e stderr ficam só em memória, com sucesso ou
  // erro. A anotação de falha vem de classificarSaida e nunca traz a saída.
  return d.cli(args, opcoes)
}

function exigirSucesso(ctx, r) {
  if (r.codigo !== 0) {
    throw new Encerrar([classificarSaida(r.saida, ctx.sub, r.codigo)], r.codigo || 1)
  }
}

async function rodar(ctx, local) {
  const { d, sub } = ctx
  const env = d.env

  const { anotacoes, contaAdmin } = conferirAmbiente(sub, local, env)
  if (anotacoes.length > 0) throw new Encerrar(anotacoes, 1)

  if (sub === 'link') {
    const r = await chamarCli(ctx, ['link', '--project-ref', String(env.SUPABASE_PROJECT_REF).trim()])
    exigirSucesso(ctx, r)
    return
  }

  if (sub === 'push') {
    const r = await chamarCli(ctx, [
      'db',
      'push',
      '--remote',
      '--password',
      env.SUPABASE_DB_PASSWORD,
      '--yes',
    ])
    exigirSucesso(ctx, r)
    return
  }

  if (sub === 'conferir') {
    const args = local
      ? ['db', 'push', '--dry-run']
      : ['db', 'push', '--remote', '--dry-run', '--password', env.SUPABASE_DB_PASSWORD, '--yes']
    const r = await chamarCli(ctx, args)
    exigirSucesso(ctx, r)
    const pendentes = migracoesPendentes(r.saida)
    if (pendentes.length > 0) throw new Encerrar([msgMigracaoPendente(pendentes)], 1)
    d.log(LINHA_SEM_PENDENCIA)
    return
  }

  if (sub === 'api') {
    let base
    let chave
    if (local) {
      const r = await chamarCli(ctx, ['status', '-o', 'env'], { silencioso: true })
      exigirSucesso(ctx, r)
      const chaves = lerSaidaEnv(r.stdout)
      if (!chaves.API_URL || !chaves.ANON_KEY) {
        throw new Encerrar([msgBancoLocal(Object.keys(chaves))], 1)
      }
      base = chaves.API_URL
      chave = chaves.ANON_KEY
    } else {
      if (!projetoConfere(env.VITE_SUPABASE_URL, env.SUPABASE_PROJECT_REF)) {
        throw new Encerrar([msgProjetoDiferente()], 1)
      }
      d.log(LINHA_PROJETO)
      base = String(env.VITE_SUPABASE_URL).trim()
      chave = String(env.VITE_SUPABASE_ANON_KEY).trim()
    }
    base = base.replace(/\/+$/, '')
    const { sucessos, falhas } = await conferirApi({
      fetchFn: d.fetchFn,
      base,
      chave,
      pausa: d.pausa,
    })
    for (const linha of sucessos) d.log(linha)
    if (falhas.length > 0) throw new Encerrar(falhas, 1)
    return
  }

  // dados
  const sql = montarSql(await d.lerModelo(), contaAdmin)
  const args = local ? ['db', 'query', '-f'] : ['db', 'query', '--remote', '--yes', '-f']
  const r = await comArquivoTemporario(sql, (caminho) => chamarCli(ctx, [...args, caminho]))
  exigirSucesso(ctx, r)
  d.log(linhaDados(contaAdmin !== null))
}

// Roda um subcomando e devolve o código de saída. Nunca lança: o catch final transforma
// qualquer exceção em anotação.
export async function executar(argv, deps = {}) {
  const d = {
    env: process.env,
    cli: cliReal,
    fetchFn: globalThis.fetch,
    pausa: dormir,
    log: (linha) => console.log(linha),
    repassar: (texto) => {
      if (texto) process.stderr.write(texto)
    },
    lerPacote,
    lerModelo,
    ...deps,
  }

  const [sub, ...resto] = argv
  const local = resto.includes('--local')
  const invalido =
    typeof sub !== 'string' ||
    !Object.hasOwn(SUBCOMANDOS, sub) ||
    resto.some((arg) => arg !== '--local') ||
    (local && SUBCOMANDOS[sub].local === null)
  if (invalido) {
    d.log(USO)
    return 1
  }

  const ctx = { d, sub, versaoConferida: false }
  try {
    await rodar(ctx, local)
    return 0
  } catch (erro) {
    if (erro instanceof Encerrar) {
      for (const linha of erro.anotacoes) d.log(linha)
      return erro.codigo
    }
    d.log(msgFalhou(sub, motivoDoErro(erro)))
    return 1
  }
}

const chamadoDireto =
  typeof process.argv[1] === 'string' &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (chamadoDireto) {
  process.exitCode = await executar(process.argv.slice(2))
}
