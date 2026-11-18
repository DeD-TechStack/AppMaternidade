import { spawn, spawnSync, type ChildProcess, type SpawnSyncReturns } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ErroDados } from '../../dados/comum.ts'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import { renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'
import { AvisoDeErro } from '../rotina/AvisoDeErro.tsx'

// O erro dentro do cartão "Em andamento" do Hoje tem de parecer com os outros cartões de erro da página
// (`AvisoDeErro`): mesmo peso de contorno, mesma cor, mesmo raio. E o anel de foco continua sendo só do teclado.
// O HTML vem da rota REAL (`/app/hoje` com a leitura da sessão falhando), não de uma peça montada à mão: se o Hoje
// deixar de passar a classe do erro aninhado, o teste fica vermelho. O jsdom não tem layout: o HTML vai para um
// arquivo que liga o CSS do build (web/dist/assets/*.css) e o Chrome sem janela mede. NÃO PULA: sem Chrome ou sem
// `npm run build`, falha.

const CANDIDATOS_DO_CHROME: Record<string, string[]> = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
}
const CHROME_DO_AMBIENTE = process.env.CHROME_PATH
// Com CHROME_PATH definido só ele vale: um caminho que não existe falha, em vez de cair noutro Chrome.
const BUSCADOS = CHROME_DO_AMBIENTE ? [CHROME_DO_AMBIENTE] : (CANDIDATOS_DO_CHROME[process.platform] ?? [])
const CHROME: string = BUSCADOS.find((caminho) => existsSync(caminho)) ?? BUSCADOS[0] ?? 'chrome'
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const TELA = { largura: 390, altura: 844 }
const TEMAS = ['claro', 'madrugada'] as const

type Tema = (typeof TEMAS)[number]

const ERRO: ErroDados = { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: 'falhou' }

const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  try {
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const medir = (el) => {
      if (!el) return null
      const c = getComputedStyle(el)
      return {
        borderTopWidth: c.borderTopWidth,
        borderTopColor: c.borderTopColor,
        borderTopLeftRadius: c.borderTopLeftRadius,
      }
    }
    const aninhado = document.querySelector('[data-andamento] [role="alert"]')
    const irmao = document.querySelector('[data-pagina-erro] [role="alert"]')
    const texto = JSON.stringify({ aninhado: medir(aninhado), irmao: medir(irmao) })
    saida.textContent = texto
    window.parent.postMessage(texto, '*')
  } catch (e) {
    const texto = JSON.stringify({ erro: String(e) })
    saida.textContent = texto
    window.parent.postMessage(texto, '*')
  }
})()
`

// O foco de verdade: o Chrome é dirigido pelo protocolo DevTools (clique do mouse e tecla Tab reais), porque o
// `:focus-visible` depende de como o foco chegou ao elemento e o jsdom não tem essa regra. O script roda num Node à
// parte (só módulos `node:`), imprime uma linha de JSON e sempre fecha o Chrome. `String.raw` mantém as barras do
// script como estão; ele não usa crase nem interpolação.
const SCRIPT_DE_FOCO = String.raw`
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as esperar } from 'node:timers/promises'

const [, , CAMINHO_DO_CHROME, URL_DA_PAGINA, PERFIL, TEMA] = process.argv
const SELETOR = '[data-andamento] [role="alert"]'

let chrome = null
let socket = null
let proximoId = 0
const pendentes = new Map()

function enviar(metodo, parametros) {
  return new Promise((resolver, rejeitar) => {
    const id = ++proximoId
    pendentes.set(id, { resolver, rejeitar })
    socket.send(JSON.stringify({ id, method: metodo, params: parametros || {} }))
  })
}

async function avaliar(expressao) {
  const r = await enviar('Runtime.evaluate', { expression: expressao, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('Runtime.evaluate: ' + JSON.stringify(r.exceptionDetails))
  return r.result.value
}

// As funções abaixo rodam dentro da página: vão como texto e voltam com o valor.
function noDocumento(funcao, ...argumentos) {
  return avaliar('(' + funcao.toString() + ').apply(null, ' + JSON.stringify(argumentos) + ')')
}

function lerEstado(seletor) {
  const el = document.querySelector(seletor)
  if (!el) return { achou: false }
  const sonda = document.createElement('span')
  sonda.style.color = 'var(--cor-foco)'
  document.body.appendChild(sonda)
  const daSonda = getComputedStyle(sonda)
  const esperada = daSonda.color
  const variavel = daSonda.getPropertyValue('--cor-foco').trim()
  sonda.remove()
  const c = getComputedStyle(el)
  return {
    achou: true,
    ativo: document.activeElement === el,
    focusVisible: el.matches(':focus-visible'),
    outlineStyle: c.outlineStyle,
    outlineWidth: c.outlineWidth,
    outlineColor: c.outlineColor,
    esperada: esperada,
    variavel: variavel,
  }
}

function mostrar(seletor) {
  const el = document.querySelector(seletor)
  el.scrollIntoView({ block: 'center', behavior: 'instant' })
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, largura: r.width, altura: r.height }
}

function soltar(seletor) {
  document.querySelector(seletor).blur()
}

function focar(seletor) {
  document.querySelector(seletor).focus()
}

async function clicar(x, y) {
  await enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x, y: y })
  await enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x: x, y: y, button: 'left', clickCount: 1 })
  await enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x, y: y, button: 'left', clickCount: 1 })
}

async function teclaTab() {
  const tecla = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }
  await enviar('Input.dispatchKeyEvent', Object.assign({ type: 'rawKeyDown' }, tecla))
  await enviar('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, tecla))
}

// Encerramento do Chrome: o filho direto é só a raiz da árvore. No Windows, os processos filhos seguram arquivos do
// perfil aberto e só o taskkill /T derruba a árvore inteira.
function chromeSaiu() {
  return !chrome || !chrome.pid || chrome.exitCode !== null || chrome.signalCode !== null
}

function esperarSaida(ms) {
  if (chromeSaiu()) return Promise.resolve()
  return Promise.race([new Promise((ok) => chrome.once('exit', ok)), esperar(ms)])
}

function matarArvore() {
  if (!chrome || !chrome.pid) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  } else {
    chrome.kill()
  }
}

// Leitura do DevToolsActivePort. Os controles negativos simulam um EBUSY (arquivo preso por antivírus ou indexador).
let leiturasDaPorta = 0

function lerPortaDoChrome(arquivo) {
  leiturasDaPorta++
  const controle = process.env.ERRO_ANINHADO_CONTROLE
  if (controle === 'porta-sempre-ocupada' || (controle === 'porta-ocupada' && leiturasDaPorta <= 3)) {
    throw Object.assign(new Error('EBUSY: resource busy or locked, open ' + arquivo), { code: 'EBUSY' })
  }
  const incompleta = /^porta-ocupada-incompleta-(EBUSY|EPERM|EACCES)$/.exec(controle || '')
  if (incompleta) {
    // Primeira leitura presa com o código pedido; as seguintes veem o arquivo incompleto (1 linha).
    if (leiturasDaPorta === 1) {
      throw Object.assign(new Error(incompleta[1] + ': operation not permitted, open ' + arquivo), { code: incompleta[1] })
    }
    return '12345\n'
  }
  return readFileSync(arquivo, 'utf8')
}

let codigo = 0
let linha = ''
const vigia = setTimeout(() => {
  console.error('Tempo esgotado no script de foco.')
  matarArvore()
  process.exit(1)
}, 75000)

try {
  chrome = spawn(
    CAMINHO_DO_CHROME,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--allow-file-access-from-files',
      '--remote-allow-origins=*',
      '--remote-debugging-port=0',
      '--user-data-dir=' + PERFIL,
      '--force-device-scale-factor=1',
      '--window-size=406,1144',
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true },
  )

  const arquivoDaPorta = join(PERFIL, 'DevToolsActivePort')
  let porta = null
  let ultimoCodigo = null
  for (let i = 0; i < 200 && porta === null; i++) {
    if (existsSync(arquivoDaPorta)) {
      let conteudo = null
      try {
        conteudo = lerPortaDoChrome(arquivoDaPorta)
      } catch (e) {
        // Arquivo preso por outro processo (antivírus, indexador): ainda não está pronto, tenta de novo.
        if (e && (e.code === 'EBUSY' || e.code === 'EPERM' || e.code === 'EACCES')) ultimoCodigo = e.code
        else throw e
      }
      if (conteudo !== null) {
        // O Chrome escreve a porta e depois o caminho: com menos de 2 linhas o arquivo ainda está incompleto.
        const linhas = conteudo.split(/\r?\n/).filter(Boolean)
        const primeira = (linhas[0] || '').trim()
        if (linhas.length >= 2 && /^[0-9]+$/.test(primeira)) porta = primeira
      }
    }
    if (porta === null) await esperar(100)
  }
  if (porta === null) {
    throw new Error(
      'O Chrome não publicou a porta do DevTools em 20 s (' + arquivoDaPorta + ', último erro: ' + (ultimoCodigo || 'incompleto') + ').',
    )
  }

  let alvo = null
  for (let i = 0; i < 100 && alvo === null; i++) {
    try {
      const lista = await (await fetch('http://127.0.0.1:' + porta + '/json/list')).json()
      alvo = lista.find((a) => a.type === 'page') || null
    } catch (e) {
      alvo = null
    }
    if (alvo === null) await esperar(100)
  }
  if (alvo === null) throw new Error('O Chrome não abriu uma página.')

  socket = new WebSocket(alvo.webSocketDebuggerUrl)
  socket.addEventListener('message', (evento) => {
    const mensagem = JSON.parse(evento.data)
    const pendente = pendentes.get(mensagem.id)
    if (!pendente) return
    pendentes.delete(mensagem.id)
    if (mensagem.error) pendente.rejeitar(new Error(JSON.stringify(mensagem.error)))
    else pendente.resolver(mensagem.result)
  })
  await new Promise((ok, falha) => {
    socket.addEventListener('open', ok, { once: true })
    socket.addEventListener('error', () => falha(new Error('O WebSocket do DevTools não abriu.')), { once: true })
  })

  await enviar('Page.enable')
  // Sem isso a janela sem tela não conta como focada e o :focus nunca casa.
  await enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
  await enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false })
  await enviar('Page.navigate', { url: URL_DA_PAGINA })

  const pronta = '(document.readyState === "complete" && document.querySelector(' + JSON.stringify(SELETOR) + ') !== null)'
  let carregou = false
  for (let i = 0; i < 200 && !carregou; i++) {
    carregou = (await avaliar(pronta)) === true
    if (!carregou) await esperar(100)
  }
  if (!carregou) throw new Error('A página não carregou (sem o erro aninhado).')
  await avaliar('document.fonts.ready.then(() => true)')
  await esperar(100)

  // Controle negativo documentado: uma regra posterior que apaga o anel. O teste de foco TEM de ficar vermelho.
  if (process.env.ERRO_ANINHADO_CONTROLE === 'sem-anel') {
    await avaliar(
      '(() => { const s = document.createElement("style"); s.textContent = "[data-andamento] [role=\\"alert\\"].alvo-foco:focus-visible{outline:none!important}"; document.head.appendChild(s); return true })()',
    )
  }

  // A. Ponteiro: clique de verdade na área de respiro do alerta (longe do botão).
  const caixa = await noDocumento(mostrar, SELETOR)
  await clicar(caixa.x + 6, caixa.y + 6)
  const ponteiro = await noDocumento(lerEstado, SELETOR)

  // B. Por programa, sem teclado: tira o foco, clica num ponto neutro e só então chama focus().
  await noDocumento(soltar, SELETOR)
  await clicar(2, 2)
  await noDocumento(focar, SELETOR)
  const programatico = await noDocumento(lerEstado, SELETOR)

  // C. Teclado: tira o foco, aperta Tab de verdade e então leva o foco ao alerta.
  await noDocumento(soltar, SELETOR)
  await teclaTab()
  await noDocumento(focar, SELETOR)
  const teclado = await noDocumento(lerEstado, SELETOR)

  linha = JSON.stringify({ tema: TEMA, ponteiro: ponteiro, programatico: programatico, teclado: teclado })
} catch (erro) {
  console.error(String((erro && erro.stack) || erro))
  codigo = 1
} finally {
  clearTimeout(vigia)
  try {
    if (socket) await Promise.race([enviar('Browser.close'), esperar(2000)])
  } catch (e) {
    // O Chrome pode fechar a conexão antes de responder.
  }
  try {
    if (socket) socket.close()
  } catch (e) {
    // Já fechado.
  }
  if (chrome) {
    await esperarSaida(5000)
    if (!chromeSaiu()) {
      matarArvore()
      await esperarSaida(2000)
    }
  }
  const sair = () => process.exit(codigo)
  if (linha) process.stdout.write(linha + '\n', sair)
  else sair()
}
`

interface Caixa {
  borderTopWidth: string
  borderTopColor: string
  borderTopLeftRadius: string
}

interface Medida {
  erro?: string
  aninhado: Caixa | null
  irmao: Caixa | null
}

interface EstadoDoFoco {
  achou: boolean
  ativo: boolean
  focusVisible: boolean
  outlineStyle: string
  outlineWidth: string
  outlineColor: string
  esperada: string
  variavel: string
}

interface MedidaDeFoco {
  ponteiro: EstadoDoFoco
  programatico: EstadoDoFoco
  teclado: EstadoDoFoco
}

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

function cssComFontesDoDist(nome: string): string {
  const base = `${pathToFileURL(PASTA_DIST).href}/`
  return readFileSync(join(PASTA_CSS, nome), 'utf8').replace(/url\((["']?)\/(?!\/)/g, (_t, aspas: string) => `url(${aspas}${base}`)
}

function executarChrome(argumentos: string[], pasta: string): SpawnSyncReturns<string> {
  const arquivoDeSaida = join(pasta, 'medicao.stdout.txt')
  const arquivoDeErros = join(pasta, 'medicao.stderr.txt')
  const saida = openSync(arquivoDeSaida, 'w')
  const erros = openSync(arquivoDeErros, 'w')
  try {
    const resultado = spawnSync(CHROME, argumentos, { stdio: ['ignore', saida, erros], timeout: 45_000, windowsHide: true })
    const stdout = readFileSync(arquivoDeSaida, 'utf8')
    const stderr = readFileSync(arquivoDeErros, 'utf8')
    return { ...resultado, output: [null, stdout, stderr], stdout, stderr }
  } finally {
    closeSync(saida)
    closeSync(erros)
  }
}

/** A página que o Chrome abre: o HTML da tela, o CSS do build e o tema no `<html>`. Com `script`, a medida roda nela. */
function montarPagina(html: string, tema: Tema, pasta: string, script?: string): string {
  const folhas = arquivosCss().map((nome, i) => {
    const arquivo = join(pasta, `folha-${i}.css`)
    writeFileSync(arquivo, cssComFontesDoDist(nome), 'utf8')
    return `<link rel="stylesheet" href="${pathToFileURL(arquivo).href}">`
  })
  const atributoDoTema = tema === 'madrugada' ? ' data-tema="madrugada"' : ''
  const medicao = script ? `<pre id="geometria" hidden></pre><script>${script}</script>` : ''
  const pagina = join(pasta, 'pagina.html')
  writeFileSync(
    pagina,
    `<!doctype html><html lang="pt-BR"${atributoDoTema}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
      `<body><div id="root">${html}</div>${medicao}</body></html>`,
    'utf8',
  )
  return pagina
}

/*
 * Limpeza da pasta temporária do Chrome. Ela NUNCA decide o resultado do teste: no Windows, processos filhos do Chrome
 * podem segurar arquivos do perfil e o `rmSync` lança EPERM; um throw no `finally` mascararia o erro real da medida
 * (ou reprovaria um teste que passou). Por isso a falha vira só um `console.warn` com o caminho e o código do erro.
 *
 * Controles negativos, lidos de `ERRO_ANINHADO_CONTROLE` (o condutor roda cada um):
 * - `sem-anel`: lido no script de foco; uma regra posterior apaga o anel e o teste de foco TEM de ficar vermelho.
 * - `trava`: segura `perfil/trava.lock` aberto durante TODA a limpeza (num PowerShell filho, porque o `openSync` do
 *   Node compartilha DELETE no Windows e não bloqueia a remoção). O teste TEM de continuar verde e a limpeza TEM de
 *   avisar com o caminho (que contém `erro-aninhado`), sem lançar. Depois a trava é solta e a pasta removida.
 * - `porta-ocupada`: lido no script de foco; as 3 primeiras leituras do `DevToolsActivePort` veem um EBUSY simulado
 *   e o teste TEM de continuar verde.
 * - `porta-sempre-ocupada`: lido no script de foco; toda leitura do `DevToolsActivePort` é um EBUSY simulado e o
 *   teste TEM de ficar vermelho, com a mensagem citando `DevToolsActivePort` e `EBUSY`.
 * - `porta-ocupada-incompleta-EBUSY`, `porta-ocupada-incompleta-EPERM` e `porta-ocupada-incompleta-EACCES`: lidos no
 *   script de foco; a primeira leitura do `DevToolsActivePort` lança o código do nome e as seguintes devolvem
 *   `12345\n` (arquivo incompleto, 1 linha). O teste TEM de ficar vermelho, com a mensagem citando
 *   `DevToolsActivePort` e esse código (o código do erro não se perde nas leituras incompletas).
 *
 * Cada remoção tenta por ~5 s no máximo (6 tentativas, espera linear de 250 ms vezes a tentativa), para um perfil
 * travado não custar minutos. O aviso sai por `console.warn` e também direto no descritor 2: o Vitest captura o
 * console do teste e, num teste que passa, o aviso não aparecia na saída da execução.
 */
function avisar(texto: string): void {
  console.warn(texto)
  try {
    writeSync(2, `${texto}\n`)
  } catch (erro) {
    console.error(`Aviso: não deu para escrever no stderr (${String(erro)}); o aviso era: ${texto}`)
  }
}

function limparPasta(pasta: string, comTentativas = true): void {
  try {
    rmSync(pasta, comTentativas ? { recursive: true, force: true, maxRetries: 6, retryDelay: 250 } : { recursive: true, force: true })
  } catch (erro) {
    const e = erro as NodeJS.ErrnoException
    avisar(`Aviso: não deu para remover a pasta temporária ${pasta} (${e.code ?? 'sem código'}): ${e.message}`)
  }
}

function pausar(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function travarPerfil(perfil: string): ChildProcess | null {
  if (process.env.ERRO_ANINHADO_CONTROLE !== 'trava') return null
  const arquivo = join(perfil, 'trava.lock')
  const caminho = arquivo.replace(/'/g, "''")
  const filho = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', `$f=[IO.File]::Open('${caminho}','OpenOrCreate','ReadWrite','None');Start-Sleep -Seconds 120`],
    { stdio: 'ignore', windowsHide: true },
  )
  for (let i = 0; i < 100 && !existsSync(arquivo); i++) pausar(100)
  if (!existsSync(arquivo)) {
    soltarTrava(filho)
    throw new Error(`O controle "trava" não conseguiu criar ${arquivo} em 10 s.`)
  }
  return filho
}

function soltarTrava(filho: ChildProcess | null): void {
  if (!filho || filho.pid === undefined) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(filho.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
  } else {
    filho.kill()
  }
  for (let i = 0; i < 100; i++) {
    try {
      process.kill(filho.pid, 0)
    } catch {
      return // ESRCH: o processo já morreu
    }
    pausar(100)
  }
  avisar(`Aviso: o processo que segurava a trava (pid ${filho.pid}) não morreu em 10 s.`)
}

function medirNoChrome(html: string, tema: Tema): Medida {
  const pasta = mkdtempSync(join(tmpdir(), 'erro-aninhado-'))
  let trava: ChildProcess | null = null
  try {
    const perfil = join(pasta, 'perfil')
    mkdirSync(perfil)
    trava = travarPerfil(perfil)
    const pagina = montarPagina(html, tema, pasta, SCRIPT_DE_MEDIDA)
    const alvo = join(pasta, 'envoltorio.html')
    writeFileSync(
      alvo,
      `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;display:block;width:${TELA.largura}px;height:${TELA.altura}px"></iframe><pre id="geometria" hidden></pre>` +
        `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
      'utf8',
    )
    const resultado = executarChrome(
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-crashpad-for-testing',
        '--no-first-run',
        '--allow-file-access-from-files',
        `--user-data-dir=${perfil}`,
        '--force-device-scale-factor=1',
        `--window-size=${Math.max(TELA.largura, 600) + 16},${TELA.altura + 300}`,
        '--virtual-time-budget=3000',
        '--dump-dom',
        pathToFileURL(alvo).href,
      ],
      pasta,
    )
    if (resultado.status !== 0 || resultado.error || resultado.signal) {
      throw new Error(`O Chrome não terminou limpo (status ${resultado.status}, sinal ${resultado.signal ?? 'nenhum'}): ${resultado.stderr ?? ''}`)
    }
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.stdout ?? '')
    if (!achado) throw new Error(`O Chrome não devolveu a medida: ${resultado.stderr ?? ''}`)
    return JSON.parse(achado[1]) as Medida
  } finally {
    limparPasta(pasta)
    soltarTrava(trava)
    if (trava) limparPasta(pasta, false)
  }
}

function focoNoChrome(html: string, tema: Tema): MedidaDeFoco {
  const pasta = mkdtempSync(join(tmpdir(), 'erro-aninhado-foco-'))
  let trava: ChildProcess | null = null
  try {
    const perfil = join(pasta, 'perfil')
    mkdirSync(perfil)
    trava = travarPerfil(perfil)
    const pagina = montarPagina(html, tema, pasta)
    const script = join(pasta, 'foco.mjs')
    writeFileSync(script, SCRIPT_DE_FOCO, 'utf8')
    const resultado = spawnSync(process.execPath, [script, CHROME, pathToFileURL(pagina).href, perfil, tema], {
      encoding: 'utf8',
      timeout: 90_000,
      windowsHide: true,
      env: process.env,
    })
    if (resultado.status !== 0 || resultado.error || resultado.signal) {
      throw new Error(`O script de foco não terminou limpo (status ${resultado.status}, sinal ${resultado.signal ?? 'nenhum'}): ${resultado.stderr ?? ''}${resultado.error ?? ''}`)
    }
    const ultimaLinha = resultado.stdout.trim().split(/\r?\n/).pop() ?? ''
    return JSON.parse(ultimaLinha) as MedidaDeFoco
  } finally {
    limparPasta(pasta)
    soltarTrava(trava)
    if (trava) limparPasta(pasta, false)
  }
}

function exigirAmbiente(): void {
  if (!existsSync(CHROME)) throw new Error(`Chrome não encontrado. Defina CHROME_PATH ou instale o Chrome. Procurado: ${BUSCADOS.join(', ')}`)
  if (arquivosCss().length === 0) throw new Error('Sem web/dist/assets/*.css: rode `npm run build` antes.')
}

/**
 * O Hoje de verdade, sem sessão guardada e com a leitura da sessão em andamento falhando (o erro cai dentro do cartão
 * "Em andamento"), mais o outro cartão de erro da página (`AvisoDeErro`) ao lado. Devolve o HTML dos dois.
 */
async function renderizarHojeComErro(): Promise<string> {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
  try {
    const mundo = criarMundoDeTeste()
    simularFalhaRotina(mundo.rotina, 'emAndamento', 'rede')
    const { container } = await renderizarRotaPronta('/app/hoje', { mundo })
    const pagina = container.innerHTML
    const { container: irmao } = render(<AvisoDeErro erro={ERRO} papel="responsavel" aoTentarDeNovo={() => undefined} />)
    return `${pagina}<div data-pagina-erro="">${irmao.innerHTML}</div>`
  } finally {
    vi.useRealTimers()
  }
}

describe('erro aninhado no cartão "Em andamento" (rota real /app/hoje, Chrome, 390x844)', () => {
  for (const tema of TEMAS) {
    it(`aninhado: contorno, cor e raio iguais aos do AvisoDeErro (${tema})`, async () => {
      exigirAmbiente()
      const medida = medirNoChrome(await renderizarHojeComErro(), tema)
      expect(medida.erro).toBeUndefined()
      expect(medida.aninhado).not.toBeNull()
      expect(medida.irmao).not.toBeNull()
      const a = medida.aninhado!
      const b = medida.irmao!
      expect(a.borderTopWidth).toBe(b.borderTopWidth)
      expect(a.borderTopColor).toBe(b.borderTopColor)
      expect(a.borderTopLeftRadius).toBe(b.borderTopLeftRadius)
    }, 90_000)
  }

  for (const tema of TEMAS) {
    it(`foco (${tema}): o anel de 2 px só aparece com o teclado; clique e foco por programa não o mostram (WCAG 2.4.7)`, async () => {
      exigirAmbiente()
      const medida = focoNoChrome(await renderizarHojeComErro(), tema)
      const { ponteiro, programatico, teclado } = medida
      for (const estado of [ponteiro, programatico, teclado]) {
        expect(estado.achou).toBe(true)
        expect(estado.ativo).toBe(true)
      }
      // A cor esperada vem do token do tema (`--cor-foco`), lida num elemento de prova na mesma página.
      expect(teclado.variavel).not.toBe('')
      expect(teclado.esperada).not.toBe('')

      // Ponteiro: o clique leva o foco ao alerta, mas sem `:focus-visible` e sem anel.
      expect(ponteiro.focusVisible).toBe(false)
      expect(ponteiro.outlineStyle).toBe('none')

      // Por programa, depois de um clique e sem tecla: também sem anel.
      expect(programatico.focusVisible).toBe(false)
      expect(programatico.outlineStyle).toBe('none')

      // Teclado: o anel é de 2 px, contínuo, na cor do foco do tema.
      expect(teclado.focusVisible).toBe(true)
      expect(teclado.outlineStyle).toBe('solid')
      expect(teclado.outlineWidth).toBe('2px')
      expect(teclado.outlineColor).toBe(teclado.esperada)
    }, 120_000)
  }
})
