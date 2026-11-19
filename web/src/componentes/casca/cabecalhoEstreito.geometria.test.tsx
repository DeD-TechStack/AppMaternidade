import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { screen } from '@testing-library/react'
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

// 320, 360, 375 e 390 são os do cartão; 340 e 359 ficam no meio e do lado de baixo de 360 (onde a pílula "Criar conta"
// passa à forma compacta); 389 é o último pixel antes de o cabeçalho voltar ao desenho de 390.
const LARGURAS = [320, 340, 359, 360, 375, 389, 390]
// 568 é a janela do celular de 320 mais baixo que ainda circula (320 x 568): a "primeira dobra" é medida nela.
const ALTURA_DA_JANELA = 568
const PONTO_DA_PILULA = 360
const PONTO_DO_DESENHO_ANTIGO = 390
// A pílula compacta de 320 a 359 nunca fica abaixo de 15 px de letra (a regra de 15 px do DESIGN.md).
const LETRA_MINIMA = 15
const ALTURA_MAXIMA_DA_PILULA = 56
// Larguras em que se mede a primeira dobra das páginas que têm o próprio convite ao cadastro.
const LARGURAS_DA_DOBRA = [320, 359]
// (/desenvolvimento não está aqui: o herói dela não tem "Criar conta", só "Ver ideias para cada fase"; a pílula é o convite.)
const PAGINAS_COM_CONVITE = ['/como-funciona', '/cuidado-compartilhado']
// Os ganchos de página para os quais o site.css esconde a pílula abaixo de 360: só as páginas cujo convite está inteiro
// na primeira dobra de 320 x 568 (a medida da primeira dobra é a do teste 5c). Os outros ganchos (paginaCuidado,
// paginaDesenvolvimento) só aquietam a pílula (contorno): ela continua à vista até a dobra deles ser medida.
const GANCHOS_QUE_ESCONDEM = ['data-pagina-como-funciona']
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
  /** A página põe um gancho `data-pagina-*` no <html> (o convite ao cadastro dela está na primeira dobra)? */
  comGancho: boolean
}
// O visitante de dia (o Início: nenhum gancho de página, o convite ao cadastro é só a pílula do cabeçalho), o visitante
// de noite (a página de faixa de cacau liga `useCabecalhoNoite()`; é também a que põe o gancho paginaComoFunciona, que
// deixa a pílula sair abaixo de 360), o visitante numa página com um gancho que só aquieta a pílula (paginaCuidado:
// a pílula fica à vista) e a pessoa entrada com a lua nos dois temas. O público na madrugada não existe: o tema escuro
// só liga nas páginas da Rotina. O gancho é lido do <html> depois de a página montar (o caso declara o que espera; o
// teste confere que a página de verdade o pôs, ou não).
const CASOS: Caso[] = [
  { rotulo: 'visitante de dia', caminho: '/', sessao: null, tema: 'claro', contexto: 'publico', tom: 'dia', comGancho: false },
  { rotulo: 'visitante de noite', caminho: '/como-funciona', sessao: null, tema: 'claro', contexto: 'publico', tom: 'noite', comGancho: true },
  { rotulo: 'logado claro', caminho: '/app/hoje', sessao: 'juliana', tema: 'claro', contexto: 'logado', tom: 'dia', comGancho: false },
  { rotulo: 'logado madrugada', caminho: '/app/hoje', sessao: 'juliana', tema: 'madrugada', contexto: 'logado', tom: 'dia', comGancho: false },
  { rotulo: 'visitante com gancho que não esconde', caminho: '/cuidado-compartilhado', sessao: null, tema: 'claro', contexto: 'publico', tom: 'dia', comGancho: true },
]
const CASO_INICIO = CASOS[0]
const CASO_QUE_ESCONDE = CASOS[1]
const CASO_COM_GANCHO_QUIETO = CASOS[4]
const escondeAbaixoDe360 = (ganchos: readonly string[]) => ganchos.some((gancho) => GANCHOS_QUE_ESCONDEM.includes(gancho))

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
  /** O que o item tem a mais do que mostra (scrollWidth - clientWidth): letra cortada na caixa. */
  corte: number
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
  /** Os ganchos `data-pagina-*` que a página pôs no <html>. */
  ganchos: string[]
  /** O primeiro link para /criar-conta dentro do <main> (o convite da própria página), quando a medida leva a página inteira. */
  conviteDaPagina: Caixa | null
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
    if (marca && visivel(marca)) itens.push({ tipo: 'marca', rotulo: marca.textContent.trim(), fontSize: parseFloat(getComputedStyle(marca).fontSize), corte: marca.scrollWidth - marca.clientWidth, ...caixa(marca) })
    for (const el of cabecalho.querySelectorAll('.cm-cab-acoes > *')) {
      if (!visivel(el)) continue
      const tipo = el.hasAttribute('data-cabecalho-pilula') ? 'pilula' : el.classList.contains('sb-cab-menu') ? 'menu' : el.classList.contains('cm-cab-madrugada') ? 'lua' : 'outro'
      itens.push({ tipo, rotulo: el.getAttribute('aria-label') || el.textContent.trim(), fontSize: parseFloat(getComputedStyle(el).fontSize), corte: el.scrollWidth - el.clientWidth, ...caixa(el) })
    }
    const convite = document.querySelector('main a[href="/criar-conta"]')
    const ganchos = document.documentElement.getAttributeNames().filter((nome) => nome.startsWith('data-pagina'))
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
      ganchos,
      conviteDaPagina: convite ? caixa(convite) : null,
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

async function medirNoChrome(
  dist: string,
  cabecalhoHtml: string,
  tema: Tema,
  ganchos: readonly string[],
  larguras: readonly number[] = LARGURAS,
): Promise<Quadro[]> {
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
      // A madrugada é o `data-tema="madrugada"` na raiz (luaDoCabecalho.ts): sem ele o CSS de cacau não se aplica. Os
      // ganchos `data-pagina-*` são os que a página de verdade pôs no <html> (lidos do jsdom depois de ela montar).
      `<!doctype html><html lang="pt-BR"${tema === 'madrugada' ? ' data-tema="madrugada"' : ''}${ganchos.map((nome) => ` ${nome}=""`).join('')}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        // As imagens da página apontam `/cenas/...`: numa página file:// isso vira a raiz do disco (como as fontes do CSS).
        `<body><div id="root">${cabecalhoHtml.replace(/\b(src|srcset)="\/(?!\/)/g, (_t, atributo: string) => `${atributo}="${base}`)}</div><script>${SCRIPT_DE_MEDIDA(nonce)}</script></body></html>`,
      'utf8',
    )
    // O Chrome sem janela não passa de ~500 px de largura: cada largura vai num iframe da largura pedida (as media
    // queries respondem à largura do iframe) e devolve a medida por postMessage.
    const iframes = larguras.map(
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
    const medidas = quadros.map((q) => q.innerWidth).sort((a, b) => a - b)
    if (JSON.stringify(medidas) !== JSON.stringify([...larguras].sort((a, b) => a - b))) {
      throw new Error(`faltou medida: esperadas ${larguras.join(', ')}, vieram ${medidas.join(', ') || 'nenhuma'}`)
    }
    return quadros
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

interface RotaSerializada {
  html: string
  /** Os `data-pagina-*` que a página pôs no <html> enquanto montada. */
  ganchos: string[]
}

/**
 * A rota real montada, com as páginas preguiçosas já resolvidas (a primeira `h1` da página é a prova: nada de medir a
 * casca com o fallback). `paginaInteira` serializa o que a rota desenhou (cabeçalho, <main>, rodapé); sem ele, só o
 * `<header>` real com o menu fechado (o painel do menu mora fora da linha e não entra na medida).
 */
async function serializarRota(caminho: string, sessao: Caso['sessao'], paginaInteira: boolean): Promise<RotaSerializada> {
  const { unmount, container } = renderizarRota(caminho, { sessao })
  await screen.findAllByRole('heading', { level: 1 }, { timeout: 10_000 })
  await aguardarCarga()
  const cabecalho = document.querySelector<HTMLElement>('header[data-cabecalho]')
  if (!cabecalho) throw new Error(`${caminho}: a página não tem <header data-cabecalho>`)
  const ganchos = document.documentElement.getAttributeNames().filter((nome) => nome.startsWith('data-pagina'))
  const html = paginaInteira ? container.innerHTML : cabecalho.outerHTML
  unmount()
  return { html, ganchos }
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
 * A pílula "Criar conta" do visitante: está na linha em toda largura, com 44 px de altura ou mais, o rótulo inteiro numa
 * linha e letra de 15 px ou mais (de 320 a 359 numa forma compacta: menos recuo e letra menor, mas sempre a mesma pílula).
 * A única exceção é abaixo de 360 numa página que põe um dos ganchos `data-pagina-*` de GANCHOS_QUE_ESCONDEM no <html>
 * (ela traz o próprio convite na primeira dobra): ali a pílula sai da linha e continua na árvore. Quem tem sessão nunca a tem.
 */
function violacoesDaPilula(q: Quadro, caso: Caso): string[] {
  const v: string[] = []
  const pilulas = doTipo(q, 'pilula')
  if (caso.contexto === 'logado') return pilulas.length === 0 && q.pilulasNoDom === 0 ? [] : ['a pessoa entrada não tem a pílula']
  if (q.pilulasNoDom !== 1) v.push(`${q.pilulasNoDom} pílulas na árvore (é uma)`)
  const podeSair = q.innerWidth < PONTO_DA_PILULA && escondeAbaixoDe360(q.ganchos)
  if (podeSair) {
    if (pilulas.length !== 0) v.push(`a pílula ainda está na linha em ${q.innerWidth}, numa página com gancho (${q.ganchos.join(', ')})`)
    return v
  }
  if (pilulas.length !== 1) return [...v, `${pilulas.length} pílulas à vista em ${q.innerWidth} (é uma${escondeAbaixoDe360(q.ganchos) ? '' : ', e a página não tem gancho que esconda'})`]
  const { height, width, fontSize, corte } = pilulas[0]
  if (height < ALVO_MINIMO - TOLERANCIA) v.push(`a pílula tem ${height.toFixed(1)} px de altura (mínimo ${ALVO_MINIMO})`)
  if (height > ALTURA_MAXIMA_DA_PILULA + TOLERANCIA) v.push(`a pílula tem ${height.toFixed(1)} px de altura: o rótulo quebrou em duas linhas (máximo ${ALTURA_MAXIMA_DA_PILULA})`)
  if (width < ALVO_MINIMO) v.push(`a pílula tem ${width.toFixed(1)} px de largura`)
  if (fontSize < LETRA_MINIMA - 0.05) v.push(`a letra da pílula tem ${fontSize.toFixed(2)} px (mínimo ${LETRA_MINIMA})`)
  if (corte > TOLERANCIA) v.push(`o rótulo da pílula passa ${corte.toFixed(1)} px da caixa (cortado)`)
  return v
}

/** O primeiro convite ao cadastro do <main> está inteiro na primeira dobra (janela de 568 px): o que o gancho promete. */
function violacoesDaDobra(q: Quadro): string[] {
  if (!q.conviteDaPagina) return ['a página não tem link para /criar-conta no <main>']
  return q.conviteDaPagina.bottom > q.innerHeight + TOLERANCIA
    ? [`o convite da página acaba em y ${q.conviteDaPagina.bottom.toFixed(1)}, depois da primeira dobra de ${q.innerHeight}`]
    : []
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
const dobras = new Map<string, Map<number, Quadro>>()
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
      const { html, ganchos } = await serializarRota(caso.caminho, caso.sessao, false)
      try {
        const quadros = await medirNoChrome(pastaDoCss, html, caso.tema, ganchos)
        medidas.set(caso.rotulo, new Map(quadros.map((q) => [q.innerWidth, q])))
      } catch (erro) {
        throw new Error(`${caso.rotulo}: ${erro instanceof Error ? erro.message : String(erro)}`, { cause: erro })
      }
    }
    // A primeira dobra de cada página que tem o próprio convite: a página inteira, em 320 e 359, na janela de 568.
    for (const caminho of PAGINAS_COM_CONVITE) {
      const { html, ganchos } = await serializarRota(caminho, null, true)
      try {
        const quadros = await medirNoChrome(pastaDoCss, html, 'claro', ganchos, LARGURAS_DA_DOBRA)
        dobras.set(caminho, new Map(quadros.map((q) => [q.innerWidth, q])))
      } catch (erro) {
        throw new Error(`${caminho} (dobra): ${erro instanceof Error ? erro.message : String(erro)}`, { cause: erro })
      }
    }
  }, 1_800_000)

  // O teste não deixa lixo: a pasta do CSS construído some ao fim, passando ou não.
  afterAll(() => {
    if (pastaDoCss) rmSync(pastaDoCss, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  })

  it('o Chrome mediu os cinco casos nas sete larguras, com as fontes carregadas, o tom certo e o cabeçalho certo', () => {
    expect(medidas.size).toBe(CASOS.length)
    paraCadaCaso(LARGURAS, (q, rotulo, caso) => {
      expect(q.fontes, rotulo).toBe('loaded')
      expect(q.innerHeight, rotulo).toBe(ALTURA_DA_JANELA)
      // O caso de noite é de noite de verdade (a página liga `useCabecalhoNoite()`), e o de dia, de dia.
      expect(q.tom, `${rotulo}: tom do cabeçalho`).toBe(caso.tom)
      expect(q.contexto, `${rotulo}: contexto do cabeçalho`).toBe(caso.contexto)
      // O que o caso declara é o que a página de verdade fez: a que tem gancho o pôs no <html>, a que não tem, não.
      expect(q.ganchos.length > 0, `${rotulo}: o gancho data-pagina-* no <html> (${q.ganchos.join(', ') || 'nenhum'})`).toBe(caso.comGancho)
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

  it('5a pílula no Início (sem gancho de página): está na linha, inteira, sem sobrepor e sem transbordar, com o menu de 48, em 320 e 359 e em toda largura', () => {
    paraCadaCaso(LARGURAS, (q, rotulo, caso) => expect(violacoesDaPilula(q, caso), rotulo).toEqual([]))
    for (const largura of LARGURAS) {
      const q = quadro(CASO_INICIO, largura)
      const rotulo = `Início (${largura})`
      expect(q.ganchos, `${rotulo}: o Início não tem gancho`).toEqual([])
      expect(doTipo(q, 'pilula'), `${rotulo}: a pílula à vista`).toHaveLength(1)
      expect(violacoesDoTransbordo(q), rotulo).toEqual([])
      expect(violacoesDeSobreposicao(q), rotulo).toEqual([])
      expect(violacoesDaMarca(q, 'publico'), rotulo).toEqual([])
    }
    for (const largura of LARGURAS_DA_DOBRA) {
      const menu = doTipo(quadro(CASO_INICIO, largura), 'menu')[0]
      expect(menu.width, `Início (${largura}): o menu de 48`).toBeGreaterThanOrEqual(48 - TOLERANCIA)
      expect(menu.height, `Início (${largura}): o menu de 48`).toBeGreaterThanOrEqual(48 - TOLERANCIA)
    }
    const pequena = doTipo(quadro(CASO_INICIO, 320), 'pilula')[0]
    process.stdout.write(`PILULA_COMPACTA_320 ${pequena.width.toFixed(1)}x${pequena.height.toFixed(1)} letra ${pequena.fontSize.toFixed(2)}px\n`)
    // O controle da falha original (R1): a pílula escondida em 320, 340 e 359 no Início falha.
    for (const largura of [320, 340, 359]) {
      const escondida = copiar(quadro(CASO_INICIO, largura))
      escondida.itens = escondida.itens.filter((item) => item.tipo !== 'pilula')
      expect(violacoesDaPilula(escondida, CASO_INICIO), `controle: o Início sem a pílula em ${largura}`).not.toEqual([])
    }
    const larga = copiar(quadro(CASO_INICIO, 320))
    doTipo(larga, 'pilula')[0].corte = 12
    expect(violacoesDaPilula(larga, CASO_INICIO), 'controle: rótulo cortado').not.toEqual([])
    const letra = copiar(quadro(CASO_INICIO, 320))
    doTipo(letra, 'pilula')[0].fontSize = 13
    expect(violacoesDaPilula(letra, CASO_INICIO), 'controle: letra de 13 px').not.toEqual([])
    const quebrada = copiar(quadro(CASO_INICIO, 320))
    doTipo(quebrada, 'pilula')[0].height = 72
    expect(violacoesDaPilula(quebrada, CASO_INICIO), 'controle: rótulo em duas linhas').not.toEqual([])
  })

  it('5b pílula numa página com gancho que esconde (paginaComoFunciona): abaixo de 360 sai da linha e fica na árvore, e o menu de 48 e a marca ficam; de 360 em diante está na linha; com um gancho que só aquieta (paginaCuidado) ela fica à vista (controle: pílula que sobra à vista falha)', () => {
    for (const largura of LARGURAS) {
      const q = quadro(CASO_QUE_ESCONDE, largura)
      const rotulo = `${CASO_QUE_ESCONDE.rotulo} (${largura})`
      expect(q.ganchos, `${rotulo}: a página pôs paginaComoFunciona`).toContain('data-pagina-como-funciona')
      expect(doTipo(q, 'pilula').length, rotulo).toBe(largura >= PONTO_DA_PILULA ? 1 : 0)
      expect(q.pilulasNoDom, `${rotulo}: a pílula fica na árvore`).toBe(1)
      expect(violacoesDoMenu(q), rotulo).toEqual([])
      expect(doTipo(q, 'marca'), `${rotulo}: a marca à vista`).toHaveLength(1)
      expect(violacoesDoTransbordo(q), rotulo).toEqual([])
      if (largura < PONTO_DO_DESENHO_ANTIGO) expect(doTipo(q, 'menu')[0].width, `${rotulo}: o menu de 48`).toBeGreaterThanOrEqual(48 - TOLERANCIA)
    }
    for (const largura of LARGURAS) {
      const q = quadro(CASO_COM_GANCHO_QUIETO, largura)
      const rotulo = `${CASO_COM_GANCHO_QUIETO.rotulo} (${largura})`
      expect(q.ganchos, `${rotulo}: a página pôs paginaCuidado`).toContain('data-pagina-cuidado')
      expect(doTipo(q, 'pilula'), `${rotulo}: a pílula à vista`).toHaveLength(1)
      expect(violacoesDoMenu(q), rotulo).toEqual([])
      expect(doTipo(q, 'marca'), `${rotulo}: a marca à vista`).toHaveLength(1)
    }
    const ficou = copiar(quadro(CASO_QUE_ESCONDE, 340))
    ficou.itens.push({ ...doTipo(quadro(CASO_INICIO, 375), 'pilula')[0] })
    expect(violacoesDaPilula(ficou, CASO_QUE_ESCONDE), 'controle: a pílula ainda na linha em 340, numa página com gancho que esconde').not.toEqual([])
    const sumiu = copiar(quadro(CASO_QUE_ESCONDE, 375))
    sumiu.itens = sumiu.itens.filter((item) => item.tipo !== 'pilula')
    expect(violacoesDaPilula(sumiu, CASO_QUE_ESCONDE), 'controle: a pílula some em 375 mesmo com gancho').not.toEqual([])
    const quietaSumiu = copiar(quadro(CASO_COM_GANCHO_QUIETO, 320))
    quietaSumiu.itens = quietaSumiu.itens.filter((item) => item.tipo !== 'pilula')
    expect(violacoesDaPilula(quietaSumiu, CASO_COM_GANCHO_QUIETO), 'controle: o gancho que só aquieta não deixa a pílula sair').not.toEqual([])
  })

  it('5c primeira dobra: a página cujo gancho esconde a pílula traz o convite ao cadastro inteiro na janela de 568 em 320 e 359 (é o que deixa a pílula sair); as outras só são medidas e registradas (controle: convite fora da dobra falha)', () => {
    const lidas: string[] = []
    for (const caminho of PAGINAS_COM_CONVITE) {
      for (const largura of LARGURAS_DA_DOBRA) {
        const q = dobras.get(caminho)?.get(largura)
        if (!q) throw new Error(`sem medida da dobra de ${caminho} em ${largura}`)
        const dentro = violacoesDaDobra(q).length === 0
        lidas.push(`${caminho} ${largura} convite y ${q.conviteDaPagina?.y.toFixed(0)}-${q.conviteDaPagina?.bottom.toFixed(0)} ${dentro ? 'dentro' : 'FORA'} da dobra de ${q.innerHeight}`)
        expect(q.ganchos.length, `${caminho} (${largura}): a página põe o gancho`).toBeGreaterThan(0)
        // O que esconde a pílula tem de provar a dobra; o que só aquieta fica registrado para a próxima rodada.
        if (escondeAbaixoDe360(q.ganchos)) expect(violacoesDaDobra(q), `${caminho} (${largura})`).toEqual([])
      }
    }
    expect(PAGINAS_COM_CONVITE.some((caminho) => escondeAbaixoDe360(dobras.get(caminho)!.get(320)!.ganchos)), 'há uma página que esconde a pílula').toBe(true)
    process.stdout.write(`DOBRA_568 ${lidas.join(' | ')}\n`)
    const longe = copiar(dobras.get(PAGINAS_COM_CONVITE[0])!.get(320)!)
    longe.conviteDaPagina = { ...longe.conviteDaPagina!, y: 5444, bottom: 5500 }
    expect(violacoesDaDobra(longe), 'controle: convite a 5444 px').not.toEqual([])
    const semConvite = copiar(dobras.get(PAGINAS_COM_CONVITE[0])!.get(320)!)
    semConvite.conviteDaPagina = null
    expect(violacoesDaDobra(semConvite), 'controle: sem convite falha fechado').not.toEqual([])
  })

  it('5 pílula: o desenho de 390 é o de hoje (marca de 20 px, recuo de 22 px na pílula de 126 px ou mais, vão de 8 entre os botões; controle: pílula que some em 375 falha)', () => {
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
