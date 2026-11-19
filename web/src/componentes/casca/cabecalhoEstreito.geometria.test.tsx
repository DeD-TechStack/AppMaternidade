import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'

// HEADER-375: a geometria do cabeçalho em celular estreito (320 a 390) num Chrome de verdade, com o CSS construído de
// novo a cada execução (vite build numa pasta temporária: nunca um web/dist velho). O jsdom não tem layout: o
// `<header>` real de cada página (o do visitante, o de noite e o da pessoa entrada com a lua) vira um arquivo html que
// liga o CSS recém-construído, e o Chrome sem janela mede cada item do cabeçalho em sete larguras de uma vez, cada
// uma num iframe da largura pedida. Cada regra é uma função que devolve as violações de uma medida; cada função
// tem o controle dela: a mesma medida torcida de propósito TEM de violar (senão a regra não prova nada).
//
// FALHA FECHADA (como o rodapeGrade.geometria.test.tsx): nunca pula. Chrome ausente, build que falha, Chrome com
// status diferente de 0, tempo esgotado ou sem a medida desta rodada (código de verificação) derrubam os testes.

const CHROME_DO_AMBIENTE = process.env.CHROME_PATH
const CANDIDATOS_DO_CHROME: Record<string, string[]> = {
  win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
}
const BUSCADOS = CHROME_DO_AMBIENTE ? [CHROME_DO_AMBIENTE] : (CANDIDATOS_DO_CHROME[process.platform] ?? [])
const CHROME: string = BUSCADOS.find((caminho) => existsSync(caminho)) ?? BUSCADOS[0] ?? 'chrome'
const PASTA_WEB = resolve(import.meta.dirname, '..', '..', '..')
const VITE = join(PASTA_WEB, 'node_modules', 'vite', 'bin', 'vite.js')

// 320, 360, 375 e 390 são os do cartão; 340 e 359 ficam no meio e do lado de baixo do ponto em que a pílula sai da
// linha (360); 389 é o último pixel antes de o cabeçalho voltar ao desenho de 390.
const LARGURAS = [320, 340, 359, 360, 375, 389, 390]
const ALTURA_DA_JANELA = 300
const PONTO_DA_PILULA = 360
const PONTO_DO_DESENHO_ANTIGO = 390
const ALVO_MINIMO = 44
const TOLERANCIA = 0.5
// Duas caixas vizinhas da linha ficam a 4 px ou mais uma da outra (o menor vão do desenho: entre a pílula e o menu).
const VAO_MINIMO = 4

type Tema = 'claro' | 'madrugada'
type Tipo = 'marca' | 'pilula' | 'lua' | 'menu' | 'outro'

interface Caso {
  rotulo: string
  caminho: string
  sessao: 'juliana' | null
  tema: Tema
  contexto: 'publico' | 'logado'
  tom: 'dia' | 'noite'
}
// O visitante de dia, o visitante de noite (a página de faixa de cacau liga `useCabecalhoNoite()`), e a pessoa entrada
// com a lua nos dois temas. O público na madrugada não existe: o tema escuro só liga nas páginas da Rotina.
const CASOS: Caso[] = [
  { rotulo: 'visitante de dia', caminho: '/', sessao: null, tema: 'claro', contexto: 'publico', tom: 'dia' },
  { rotulo: 'visitante de noite', caminho: '/como-funciona', sessao: null, tema: 'claro', contexto: 'publico', tom: 'noite' },
  { rotulo: 'logado claro', caminho: '/app/hoje', sessao: 'juliana', tema: 'claro', contexto: 'logado', tom: 'dia' },
  { rotulo: 'logado madrugada', caminho: '/app/hoje', sessao: 'juliana', tema: 'madrugada', contexto: 'logado', tom: 'dia' },
]

interface Caixa {
  x: number
  right: number
  y: number
  bottom: number
  width: number
  height: number
}
interface Item extends Caixa {
  tipo: Tipo
  rotulo: string
  fontSize: number
}
interface Quadro {
  erro?: string
  nonce: string
  innerWidth: number
  innerHeight: number
  scrollWidth: number
  fontes: string
  tom: string | null
  contexto: string | null
  cabecalho: Caixa
  /** Todo item visível do cabeçalho: a marca e as ações da linha (lua, pílula, menu). O que o CSS esconde não está aqui. */
  itens: Item[]
  /** A pílula existe no DOM (visível ou não): o que o CSS esconde não some da árvore. */
  pilulasNoDom: number
}

// O script de dentro de cada página: espera as fontes, mede o cabeçalho e devolve o JSON ao iframe de fora por postMessage.
const SCRIPT_DE_MEDIDA = (nonce: string) => `
(async () => {
  const NONCE = ${JSON.stringify(nonce)}
  const emitir = (obj) => window.parent.postMessage(JSON.stringify(obj), '*')
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const caixa = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height } }
    const visivel = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
    const cabecalho = document.querySelector('header[data-cabecalho]')
    const itens = []
    const marca = cabecalho.querySelector('.cm-marca')
    if (marca && visivel(marca)) itens.push({ tipo: 'marca', rotulo: marca.textContent.trim(), fontSize: parseFloat(getComputedStyle(marca).fontSize), ...caixa(marca) })
    for (const el of cabecalho.querySelectorAll('.cm-cab-acoes > *')) {
      if (!visivel(el)) continue
      const tipo = el.hasAttribute('data-cabecalho-pilula') ? 'pilula' : el.classList.contains('sb-cab-menu') ? 'menu' : el.classList.contains('cm-cab-madrugada') ? 'lua' : 'outro'
      itens.push({ tipo, rotulo: el.getAttribute('aria-label') || el.textContent.trim(), fontSize: parseFloat(getComputedStyle(el).fontSize), ...caixa(el) })
    }
    emitir({
      nonce: NONCE,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      fontes: document.fonts.status,
      tom: cabecalho.getAttribute('data-tom'),
      contexto: cabecalho.getAttribute('data-contexto'),
      cabecalho: caixa(cabecalho),
      itens,
      pilulasNoDom: cabecalho.querySelectorAll('[data-cabecalho-pilula]').length,
    })
  } catch (e) {
    emitir({ erro: String(e), nonce: NONCE, innerWidth: 0 })
  }
})()
`

/** Constrói o CSS (vite build) numa pasta temporária: o teste mede o CSS do código de agora, nunca um dist velho. */
function construirOCss(saida: string): void {
  if (!existsSync(VITE)) throw new Error(`vite não encontrado em ${VITE}: rode npm install`)
  const env: NodeJS.ProcessEnv = { ...process.env }
  delete env.BASE_SITE
  const resultado = spawnSync(process.execPath, [VITE, 'build', '--outDir', saida, '--emptyOutDir', '--logLevel', 'error'], {
    cwd: PASTA_WEB,
    env,
    encoding: 'utf8',
    timeout: 300_000,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  })
  if (resultado.error || resultado.status !== 0) {
    throw new Error(`o vite build falhou (status ${resultado.status}): ${resultado.error?.message ?? ''}${resultado.stderr.slice(0, 2000)}${resultado.stdout.slice(0, 1000)}`)
  }
  const css = existsSync(join(saida, 'assets')) ? readdirSync(join(saida, 'assets')).filter((nome) => nome.endsWith('.css')) : []
  if (css.length === 0) throw new Error('o vite build não gerou CSS em assets/')
}

/** Mata o Chrome e todos os filhos: o grupo inteiro no POSIX (spawn detached), a árvore no Windows. */
function matarGrupo(pid: number, filho: ChildProcess): void {
  if (process.platform === 'win32') {
    try {
      filho.kill()
    } catch {
      // já terminou
    }
    try {
      spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, timeout: 5_000 })
    } catch {
      // já terminou
    }
    return
  }
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    // grupo já terminou
  }
}

function exigirChrome(): void {
  if (!existsSync(CHROME)) {
    throw new Error(`Chrome não encontrado em ${CHROME} (CHROME_PATH=${CHROME_DO_AMBIENTE ?? 'não definido'}; buscados: ${BUSCADOS.join(', ') || 'nenhum caminho para ' + process.platform})`)
  }
}

async function medirNoChrome(dist: string, cabecalhoHtml: string, tema: Tema): Promise<Quadro[]> {
  exigirChrome()
  const nonce = randomUUID()
  const pasta = mkdtempSync(join(tmpdir(), 'cm-cabecalho-estreito-'))
  try {
    const perfil = join(pasta, 'perfil')
    mkdirSync(perfil)
    const base = `${pathToFileURL(dist).href}/`
    const css = join(dist, 'assets')
    const folhas = readdirSync(css)
      .filter((nome) => nome.endsWith('.css'))
      .map((nome, i) => {
        const arquivo = join(pasta, `folha-${i}.css`)
        // O CSS do build aponta as fontes por `/assets/...`: numa página file:// isso vira a raiz do disco.
        writeFileSync(arquivo, readFileSync(join(css, nome), 'utf8').replace(/url\((["']?)\/(?!\/)/g, (_t, aspas: string) => `url(${aspas}${base}`), 'utf8')
        return `<link rel="stylesheet" href="${pathToFileURL(arquivo).href}">`
      })
    const pagina = join(pasta, 'pagina.html')
    writeFileSync(
      pagina,
      // A madrugada é o `data-tema="madrugada"` na raiz (luaDoCabecalho.ts): sem ele o CSS de cacau não se aplica.
      `<!doctype html><html lang="pt-BR"${tema === 'madrugada' ? ' data-tema="madrugada"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        `<body><div id="root">${cabecalhoHtml}</div><script>${SCRIPT_DE_MEDIDA(nonce)}</script></body></html>`,
      'utf8',
    )
    // O Chrome sem janela não passa de ~500 px de largura: cada largura vai num iframe da largura pedida (as media
    // queries respondem à largura do iframe) e devolve a medida por postMessage.
    const iframes = LARGURAS.map(
      (largura) => `<iframe src="${pathToFileURL(pagina).href}" scrolling="no" style="display:block;border:0;width:${largura}px;height:${ALTURA_DA_JANELA}px"></iframe>`,
    )
    const envoltorio = join(pasta, 'envoltorio.html')
    writeFileSync(
      envoltorio,
      `<!doctype html><html><body style="margin:0">${iframes.join('')}<pre id="geometria" hidden></pre>` +
        `<script>const quadros = []; addEventListener('message', (e) => { quadros.push(JSON.parse(e.data)); document.getElementById('geometria').textContent = JSON.stringify(quadros) })</script></body></html>`,
      'utf8',
    )

    // Saída em arquivos, nunca em pipes: os filhos do Chrome que sobrevivem não seguram nada que nos bloqueie.
    const arquivoDeSaida = join(pasta, 'saida.txt')
    const arquivoDeErro = join(pasta, 'erro.txt')
    const fdSaida = openSync(arquivoDeSaida, 'w')
    const fdErro = openSync(arquivoDeErro, 'w')
    let filho: ChildProcess | null = null
    let terminou: Promise<void> | null = null
    let expirou = false
    let final: { status: number | null; sinal: NodeJS.Signals | null; erro: string | null } | null = null
    try {
      const alvoDoFilho = spawn(
        CHROME,
        [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          // CI-UBUNTU: no Chrome 157 do Linux esta opção mata o processo com "FD ownership violation". No Windows ela fica.
          ...(process.platform === 'win32' ? ['--disable-crashpad-for-testing'] : []),
          '--no-first-run',
          '--allow-file-access-from-files',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-component-update',
          '--disable-sync',
          '--disable-software-rasterizer',
          '--mute-audio',
          '--no-default-browser-check',
          `--user-data-dir=${perfil}`,
          '--force-device-scale-factor=1',
          '--window-size=600,900',
          '--virtual-time-budget=5000',
          '--dump-dom',
          pathToFileURL(envoltorio).href,
        ],
        { stdio: ['ignore', fdSaida, fdErro], detached: process.platform !== 'win32', windowsHide: true },
      )
      filho = alvoDoFilho
      terminou = new Promise((resolver) => {
        alvoDoFilho.once('error', (erro) => {
          final = { status: null, sinal: null, erro: erro.message }
          resolver()
        })
        alvoDoFilho.once('exit', (status, sinal) => {
          final = { status, sinal, erro: null }
          resolver()
        })
      })
      let relogio: NodeJS.Timeout | undefined
      const limite = new Promise<'tempo'>((resolver) => {
        relogio = setTimeout(() => resolver('tempo'), 60_000)
      })
      expirou = (await Promise.race([terminou.then(() => 'fim' as const), limite]).finally(() => clearTimeout(relogio))) === 'tempo'
    } finally {
      if (filho?.pid !== undefined) matarGrupo(filho.pid, filho)
      if (terminou) {
        let espera: NodeJS.Timeout | undefined
        await Promise.race([
          terminou,
          new Promise((resolver) => {
            espera = setTimeout(resolver, 3_000)
          }),
        ]).finally(() => clearTimeout(espera))
      }
      closeSync(fdSaida)
      closeSync(fdErro)
    }

    const resultado = final as { status: number | null; sinal: NodeJS.Signals | null; erro: string | null } | null
    const saida = readFileSync(arquivoDeSaida, 'utf8')
    const erroDoChrome = readFileSync(arquivoDeErro, 'utf8').slice(0, 2000)
    if (expirou) throw new Error(`O Chrome estourou o tempo (60000 ms): ${erroDoChrome}`)
    if (!resultado) throw new Error('O Chrome não encerrou nem depois do kill (sem exit/error em 3 s)')
    if (resultado.erro !== null) throw new Error(`O Chrome não abriu: ${resultado.erro}`)
    if (resultado.status !== 0 || resultado.sinal !== null) throw new Error(`O Chrome terminou com status ${resultado.status} e sinal ${resultado.sinal}: ${erroDoChrome}`)
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(saida)
    if (!achado) throw new Error(`O Chrome não devolveu a medida: ${erroDoChrome}`)
    const texto = achado[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
    const quadros = JSON.parse(texto) as Quadro[]
    for (const medido of quadros) {
      if (medido.erro) throw new Error(`erro dentro da página: ${medido.erro}`)
      if (medido.nonce !== nonce) throw new Error('a medida não é desta execução (código de verificação diferente)')
    }
    const larguras = quadros.map((q) => q.innerWidth).sort((a, b) => a - b)
    if (JSON.stringify(larguras) !== JSON.stringify(LARGURAS)) throw new Error(`faltou medida: esperadas ${LARGURAS.join(', ')}, vieram ${larguras.join(', ') || 'nenhuma'}`)
    return quadros
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

/** O `<header>` real da rota, serializado com o menu fechado (o painel do menu mora fora da linha e não entra na medida). */
async function cabecalhoDaRota(caso: Caso): Promise<string> {
  const { unmount } = renderizarRota(caso.caminho, { sessao: caso.sessao })
  await aguardarCarga()
  const cabecalho = document.querySelector<HTMLElement>('header[data-cabecalho]')
  if (!cabecalho) throw new Error(`${caso.caminho}: a página não tem <header data-cabecalho>`)
  const html = cabecalho.outerHTML
  unmount()
  return html
}

// ---- As regras: cada uma devolve as violações de UMA medida (lista vazia = cumpre) ----

const doTipo = (q: Quadro, tipo: Tipo) => q.itens.filter((item) => item.tipo === tipo)
const sobrepoe = (a: Caixa, b: Caixa) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > TOLERANCIA && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > TOLERANCIA

/** O botão do menu existe em toda largura e é um alvo inteiro: 44 x 44 ou mais (o de 48 do desenho não encolhe). */
function violacoesDoMenu(q: Quadro): string[] {
  const menus = doTipo(q, 'menu')
  if (menus.length !== 1) return [`${menus.length} botões de menu à vista (é um)`]
  const { width, height } = menus[0]
  const v: string[] = []
  if (width < ALVO_MINIMO - TOLERANCIA) v.push(`o botão do menu tem ${width.toFixed(1)} px de largura (mínimo ${ALVO_MINIMO})`)
  if (height < ALVO_MINIMO - TOLERANCIA) v.push(`o botão do menu tem ${height.toFixed(1)} px de altura (mínimo ${ALVO_MINIMO})`)
  return v
}

/** Nada do cabeçalho passa da janela, nem à direita nem à esquerda, nem do alto do próprio cabeçalho; a página não rola de lado. */
function violacoesDoTransbordo(q: Quadro): string[] {
  const v: string[] = []
  if (q.itens.length === 0) return ['nenhum item medido no cabeçalho']
  for (const item of q.itens) {
    if (item.x < -TOLERANCIA) v.push(`"${item.rotulo}" começa em x ${item.x.toFixed(1)}, antes da janela`)
    if (item.right > q.innerWidth + TOLERANCIA) v.push(`"${item.rotulo}" acaba em x ${item.right.toFixed(1)}, depois da janela de ${q.innerWidth}`)
    if (item.y < q.cabecalho.y - TOLERANCIA || item.bottom > q.cabecalho.bottom + TOLERANCIA) v.push(`"${item.rotulo}" passa do alto ou da base do cabeçalho`)
  }
  if (q.scrollWidth > q.innerWidth) v.push(`a página rola de lado (scrollWidth ${q.scrollWidth} > ${q.innerWidth})`)
  return v
}

/** Sem sobreposição e sem encostar: duas caixas vizinhas da linha guardam 4 px ou mais entre si. */
function violacoesDeSobreposicao(q: Quadro): string[] {
  const v: string[] = []
  const ordenados = [...q.itens].sort((a, b) => a.x - b.x)
  for (let i = 0; i < ordenados.length; i++) {
    for (let j = i + 1; j < ordenados.length; j++) {
      if (sobrepoe(ordenados[i], ordenados[j])) v.push(`"${ordenados[i].rotulo}" sobre "${ordenados[j].rotulo}"`)
    }
  }
  for (let i = 1; i < ordenados.length; i++) {
    const vao = ordenados[i].x - ordenados[i - 1].right
    if (vao < VAO_MINIMO - TOLERANCIA) v.push(`"${ordenados[i - 1].rotulo}" e "${ordenados[i].rotulo}" ficam a ${vao.toFixed(1)} px (mínimo ${VAO_MINIMO})`)
  }
  return v
}

/** A marca guarda o token (min(20 px, 5,3 vw) no público; min(24 px, 6,4 vw) no logado, abaixo de 640) e nunca some. */
function violacoesDaMarca(q: Quadro, contexto: Caso['contexto']): string[] {
  const marcas = doTipo(q, 'marca')
  if (marcas.length !== 1) return [`${marcas.length} marcas à vista (é uma)`]
  const esperado = contexto === 'publico' ? Math.min(20, q.innerWidth * 0.053) : Math.min(24, q.innerWidth * 0.064)
  return Math.abs(marcas[0].fontSize - esperado) > 0.05 ? [`a marca tem ${marcas[0].fontSize.toFixed(2)} px e o token é ${esperado.toFixed(2)} px em ${q.innerWidth}`] : []
}

/**
 * A pílula "Criar conta" do visitante: de 360 em diante está na linha, com 44 px de altura ou mais e o rótulo inteiro; abaixo
 * de 360 sai da linha (não cabe com a marca e o menu) mas continua na árvore. Quem tem sessão nunca a tem.
 */
function violacoesDaPilula(q: Quadro, caso: Caso): string[] {
  const v: string[] = []
  const pilulas = doTipo(q, 'pilula')
  if (caso.contexto === 'logado') return pilulas.length === 0 && q.pilulasNoDom === 0 ? [] : ['a pessoa entrada não tem a pílula']
  if (q.pilulasNoDom !== 1) v.push(`${q.pilulasNoDom} pílulas na árvore (é uma)`)
  if (q.innerWidth >= PONTO_DA_PILULA) {
    if (pilulas.length !== 1) return [...v, `${pilulas.length} pílulas à vista em ${q.innerWidth} (é uma)`]
    if (pilulas[0].height < ALVO_MINIMO - TOLERANCIA) v.push(`a pílula tem ${pilulas[0].height.toFixed(1)} px de altura (mínimo ${ALVO_MINIMO})`)
    if (pilulas[0].width < ALVO_MINIMO) v.push(`a pílula tem ${pilulas[0].width.toFixed(1)} px de largura`)
  } else if (pilulas.length !== 0) {
    v.push(`a pílula ainda está na linha em ${q.innerWidth} (sai abaixo de ${PONTO_DA_PILULA})`)
  }
  return v
}

/** A lua da pessoa entrada fica à vista e inteira (48 px de largura, ou 56 na madrugada); só existe no logado. */
function violacoesDaLua(q: Quadro, caso: Caso): string[] {
  const luas = doTipo(q, 'lua')
  if (caso.contexto === 'publico') return luas.length === 0 ? [] : ['o visitante tem a lua']
  if (luas.length !== 1) return [`${luas.length} luas à vista (é uma)`]
  const minimo = caso.tema === 'madrugada' ? 56 : 48
  return luas[0].width < minimo - TOLERANCIA ? [`a lua tem ${luas[0].width.toFixed(1)} px de largura (mínimo ${minimo})`] : []
}

const medidas = new Map<string, Map<number, Quadro>>()
const quadro = (caso: Caso, largura: number): Quadro => {
  const achado = medidas.get(caso.rotulo)?.get(largura)
  if (!achado) throw new Error(`sem medida de "${caso.rotulo}" em ${largura}`)
  return achado
}
const paraCadaCaso = (larguras: readonly number[], corpo: (q: Quadro, rotulo: string, caso: Caso) => void) => {
  for (const caso of CASOS) for (const largura of larguras) corpo(quadro(caso, largura), `${caso.rotulo} (${largura})`, caso)
}
const copiar = (q: Quadro): Quadro => structuredClone(q)

describe('o cabeçalho em celular estreito no Chrome (HEADER-375)', () => {
  let pastaDoCss = ''
  beforeAll(async () => {
    exigirChrome()
    pastaDoCss = mkdtempSync(join(tmpdir(), 'cm-cabecalho-estreito-css-'))
    construirOCss(pastaDoCss)
    for (const caso of CASOS) {
      const html = await cabecalhoDaRota(caso)
      try {
        const quadros = await medirNoChrome(pastaDoCss, html, caso.tema)
        medidas.set(caso.rotulo, new Map(quadros.map((q) => [q.innerWidth, q])))
      } catch (erro) {
        throw new Error(`${caso.rotulo}: ${erro instanceof Error ? erro.message : String(erro)}`, { cause: erro })
      }
    }
  }, 1_800_000)

  // O teste não deixa lixo: a pasta do CSS construído some ao fim, passando ou não.
  afterAll(() => {
    if (pastaDoCss) rmSync(pastaDoCss, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  })

  it('o Chrome mediu os quatro casos nas sete larguras, com as fontes carregadas, o tom certo e o cabeçalho certo', () => {
    expect(medidas.size).toBe(CASOS.length)
    paraCadaCaso(LARGURAS, (q, rotulo, caso) => {
      expect(q.fontes, rotulo).toBe('loaded')
      expect(q.innerHeight, rotulo).toBe(ALTURA_DA_JANELA)
      // O caso de noite é de noite de verdade (a página liga `useCabecalhoNoite()`), e o de dia, de dia.
      expect(q.tom, `${rotulo}: tom do cabeçalho`).toBe(caso.tom)
      expect(q.contexto, `${rotulo}: contexto do cabeçalho`).toBe(caso.contexto)
    })
  })

  it('1 menu: o botão tem 44 x 44 ou mais em toda largura, também em 320 (controle: um botão espremido a 30 px falha)', () => {
    paraCadaCaso(LARGURAS, (q, rotulo) => expect(violacoesDoMenu(q), rotulo).toEqual([]))
    // Registrado para citar no relatório: o menor botão de menu medido em cada largura.
    const menores = LARGURAS.map((largura) => `${largura} ${Math.min(...CASOS.map((caso) => doTipo(quadro(caso, largura), 'menu')[0].width)).toFixed(1)}px`)
    process.stdout.write(`MENU_LARGURA_MINIMA ${menores.join(' | ')}\n`)
    const espremido = copiar(quadro(CASOS[0], 375))
    const menu = doTipo(espremido, 'menu')[0]
    menu.width = 30
    menu.x = menu.right - 30
    expect(violacoesDoMenu(espremido), 'controle: botão de menu de 30 px de largura').not.toEqual([])
    const baixo = copiar(quadro(CASOS[0], 320))
    doTipo(baixo, 'menu')[0].height = 30
    expect(violacoesDoMenu(baixo), 'controle: botão de menu de 30 px de altura').not.toEqual([])
    const semMenu = copiar(quadro(CASOS[0], 320))
    semMenu.itens = semMenu.itens.filter((item) => item.tipo !== 'menu')
    expect(violacoesDoMenu(semMenu), 'controle: sem botão de menu falha fechado').not.toEqual([])
  })

  it('2 transbordo: nenhum item do cabeçalho passa da janela e a página não rola de lado (controle: um item 10 px fora falha)', () => {
    paraCadaCaso(LARGURAS, (q, rotulo) => expect(violacoesDoTransbordo(q), rotulo).toEqual([]))
    const base = quadro(CASOS[0], 360)
    const fora = copiar(base)
    doTipo(fora, 'menu')[0].right = fora.innerWidth + 10
    expect(violacoesDoTransbordo(fora), 'controle: o menu passa 10 px da borda direita').not.toEqual([])
    const antes = copiar(base)
    doTipo(antes, 'marca')[0].x = -5
    expect(violacoesDoTransbordo(antes), 'controle: a marca começa antes da janela').not.toEqual([])
    const rolagem = copiar(base)
    rolagem.scrollWidth = rolagem.innerWidth + 1
    expect(violacoesDoTransbordo(rolagem), 'controle: a página rola 1 px de lado').not.toEqual([])
    const vazio = copiar(base)
    vazio.itens = []
    expect(violacoesDoTransbordo(vazio), 'controle: sem item medido falha fechado').not.toEqual([])
  })

  it('3 sobreposição: marca, lua, pílula e menu não se tocam e guardam 4 px entre si (controle: sobreposição e encosto falham)', () => {
    paraCadaCaso(LARGURAS, (q, rotulo) => expect(violacoesDeSobreposicao(q), rotulo).toEqual([]))
    // Registrado para citar no relatório: o menor vão entre dois itens vizinhos em cada largura.
    const vaos = LARGURAS.map((largura) => {
      const todos = CASOS.flatMap((caso) => {
        const ordenados = [...quadro(caso, largura).itens].sort((a, b) => a.x - b.x)
        return ordenados.slice(1).map((item, i) => item.x - ordenados[i].right)
      })
      return `${largura} ${Math.min(...todos).toFixed(1)}px`
    })
    process.stdout.write(`VAO_MINIMO_ENTRE_ITENS ${vaos.join(' | ')}\n`)
    const base = quadro(CASOS[0], 375)
    const sobre = copiar(base)
    doTipo(sobre, 'pilula')[0].right = doTipo(sobre, 'menu')[0].x + 12
    expect(violacoesDeSobreposicao(sobre), 'controle: a pílula entra 12 px no menu').not.toEqual([])
    const marcaSobre = copiar(base)
    doTipo(marcaSobre, 'marca')[0].right = doTipo(marcaSobre, 'pilula')[0].x + 20
    expect(violacoesDeSobreposicao(marcaSobre), 'controle: a marca entra 20 px na pílula').not.toEqual([])
    const colado = copiar(base)
    doTipo(colado, 'pilula')[0].right = doTipo(colado, 'menu')[0].x - 1
    expect(violacoesDeSobreposicao(colado), 'controle: a pílula a 1 px do menu (sem tocar) falha').not.toEqual([])
  })

  it('4 marca: guarda o token (5,3 vw no público, 6,4 vw no logado, tetos de 20 e 24 px) em toda largura (controle: marca menor falha)', () => {
    paraCadaCaso(LARGURAS, (q, rotulo, caso) => expect(violacoesDaMarca(q, caso.contexto), rotulo).toEqual([]))
    const menor = copiar(quadro(CASOS[0], 360))
    doTipo(menor, 'marca')[0].fontSize -= 2
    expect(violacoesDaMarca(menor, 'publico'), 'controle: a marca 2 px menor que o token').not.toEqual([])
    const semMarca = copiar(quadro(CASOS[0], 360))
    semMarca.itens = semMarca.itens.filter((item) => item.tipo !== 'marca')
    expect(violacoesDaMarca(semMarca, 'publico'), 'controle: sem marca').not.toEqual([])
  })

  it('5 pílula: de 360 em diante o visitante a tem na linha, com 44 px de altura; abaixo de 360 ela sai da linha e fica na árvore; o 390 é o de hoje (controle: pílula que some em 375 falha)', () => {
    paraCadaCaso(LARGURAS, (q, rotulo, caso) => expect(violacoesDaPilula(q, caso), rotulo).toEqual([]))
    // Abaixo de 360 a pílula sai; ela nunca sai de 360 em diante.
    for (const largura of LARGURAS) {
      for (const caso of CASOS.filter((c) => c.contexto === 'publico')) {
        const q = quadro(caso, largura)
        expect(doTipo(q, 'pilula').length, `${caso.rotulo} (${largura})`).toBe(largura >= PONTO_DA_PILULA ? 1 : 0)
      }
    }
    // O desenho de 390: as medidas de hoje (marca de 20 px, recuo de 22 px na pílula de 126 px ou mais, vão de 8 entre os botões).
    for (const caso of CASOS.filter((c) => c.contexto === 'publico')) {
      const q = quadro(caso, PONTO_DO_DESENHO_ANTIGO)
      const pilula = doTipo(q, 'pilula')[0]
      const menu = doTipo(q, 'menu')[0]
      const marca = doTipo(q, 'marca')[0]
      expect(pilula.width, `${caso.rotulo}: a pílula de 390 guarda o recuo de 22 px`).toBeGreaterThan(120)
      expect(menu.x - pilula.right, `${caso.rotulo}: o vão entre a pílula e o menu de 390`).toBeCloseTo(8, 0)
      expect(pilula.x - marca.right, `${caso.rotulo}: o vão entre a marca e a pílula de 390`).toBeGreaterThanOrEqual(16 - TOLERANCIA)
    }
    const base = quadro(CASOS[0], 375)
    const sumiu = copiar(base)
    sumiu.itens = sumiu.itens.filter((item) => item.tipo !== 'pilula')
    expect(violacoesDaPilula(sumiu, CASOS[0]), 'controle: a pílula some em 375').not.toEqual([])
    const baixa = copiar(base)
    doTipo(baixa, 'pilula')[0].height = 36
    expect(violacoesDaPilula(baixa, CASOS[0]), 'controle: pílula de 36 px de altura').not.toEqual([])
    const ficou = copiar(quadro(CASOS[0], 340))
    ficou.itens.push({ ...doTipo(base, 'pilula')[0] })
    expect(violacoesDaPilula(ficou, CASOS[0]), 'controle: a pílula ainda na linha em 340').not.toEqual([])
    const comPilula = copiar(quadro(CASOS[2], 375))
    comPilula.itens.push({ ...doTipo(base, 'pilula')[0] })
    expect(violacoesDaPilula(comPilula, CASOS[2]), 'controle: a pessoa entrada com a pílula').not.toEqual([])
  })

  it('6 lua: a pessoa entrada tem a lua inteira (48 px, 56 na madrugada) ao lado da marca e do menu em toda largura (controle: lua espremida falha)', () => {
    paraCadaCaso(LARGURAS, (q, rotulo, caso) => expect(violacoesDaLua(q, caso), rotulo).toEqual([]))
    const espremida = copiar(quadro(CASOS[2], 320))
    doTipo(espremida, 'lua')[0].width = 30
    expect(violacoesDaLua(espremida, CASOS[2]), 'controle: a lua de 30 px').not.toEqual([])
    const madrugada = copiar(quadro(CASOS[3], 320))
    doTipo(madrugada, 'lua')[0].width = 48
    expect(violacoesDaLua(madrugada, CASOS[3]), 'controle: a lua de 48 px na madrugada (o piso é 56)').not.toEqual([])
    const semLua = copiar(quadro(CASOS[2], 320))
    semLua.itens = semLua.itens.filter((item) => item.tipo !== 'lua')
    expect(violacoesDaLua(semLua, CASOS[2]), 'controle: sem lua falha fechado').not.toEqual([])
  })
})
