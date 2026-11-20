import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
import { EMAIL_CONTATO } from '../../conteudo/publicas-texto.ts'

// REP-T2: o modelo T2 assinado (`.oc/ref/t2.md`): a faixa de cacau da abertura (400 px no mínimo em 1440), a placa da
// rua rente à borda direita e ao pé dela, o `h1` e a coluna de leitura na mesma borda esquerda, o índice à direita da
// coluna em 1440 e o primeiro título do documento dentro da primeira dobra, sem rolagem horizontal em 390 e 1440.
// VIS-4, as seis páginas de texto: a abertura (título, frase, botão e placa) medida num Chrome de
// verdade. O jsdom não tem layout: o corpo serializado vai para uma página com o CSS e as imagens do build
// (`web/dist`), numa janela de 1440 x 900 (a leitura no computador) e de 390 x 844 (o celular). Sem Chrome ou
// sem build o teste pula e diz por quê; em CI falha. O executor do Chrome repete o de `casca/geometria.test.tsx`:
// um auxiliar compartilhado seria um arquivo novo fora do que esta unidade pode editar.
// VIS-4-r3: a medida de leitura conta as linhas cheias de todo parágrafo que quebra em 2 linhas ou mais (I-03), as
// linhas do h1 têm de caber na coluna do h1 a 1100 e a 1440 (I-02), e controles negativos puros provam as duas réguas (I-04).

const CANDIDATOS_DO_CHROME: Record<string, string[]> = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
}
const BUSCADOS = [
  ...(process.env.CHROME_PATH ? [process.env.CHROME_PATH] : []),
  ...(CANDIDATOS_DO_CHROME[process.platform] ?? []),
]
const CHROME: string = BUSCADOS.find((caminho) => existsSync(caminho)) ?? BUSCADOS[0] ?? 'chrome'
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const PASTA_DAS_FOTOS = resolve(import.meta.dirname, '..', '..', '..', '..', '.oc', 'olhar', 'texto')
const ALTURA_DA_FOTO = 2600
// Cada medida abre o Chrome (e, com a pasta das fotos, uma segunda vez): numa máquina carregada passa de 60 s.
const TEMPO_DO_CHROME = 240_000

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

const motivoDoPulo: string | null = !existsSync(CHROME)
  ? `Chrome não encontrado (buscado em: ${BUSCADOS.join(', ') || 'nenhum caminho para ' + process.platform}; defina CHROME_PATH)`
  : arquivosCss().length === 0
    ? 'sem web/dist/assets/*.css: rode `npm run build` antes'
    : null
const exigirNoCI = Boolean(process.env.CI)

const PAGINAS = [
  '/regras-da-comunidade',
  '/privacidade',
  '/termos',
  '/exclusao-de-conta',
  '/contato',
  '/sobre',
] as const

interface Caixa {
  x: number
  right: number
  y: number
  bottom: number
  width: number
  height: number
}

/** Uma linha do h1: o texto e o menor left e o maior right das letras dela. */
interface LinhaDoH1 {
  texto: string
  esquerda: number
  direita: number
}

/** O h1 da abertura: a caixa de conteúdo (sem padding nem borda) e cada linha com seus limites. */
interface H1Medido {
  colunaEsquerda: number
  colunaDireita: number
  linhas: LinhaDoH1[]
}

interface Medida {
  erro?: string
  innerWidth: number
  innerHeight: number
  fontes: string
  scrollWidth: number
  /** A faixa de cacau da abertura (`.pt-abertura`) e a placa da rua dentro dela (`.pt-placa`). */
  abertura: Caixa
  placa: Caixa
  /** A coluna do texto da abertura (`.pt-cabeca`). */
  cabeca: Caixa
  /** O índice "Nesta página" (`.pt-indice`), a coluna de leitura (`.pt-leitura`) e o primeiro `h2` dela. */
  indice: Caixa
  leitura: Caixa
  primeiroH2: Caixa
  /** O tamanho de letra computado do `h1` e o maior entre as demais letras de `main`. */
  h1Tamanho: number
  maiorOutroTamanho: number
  /** O primeiro `p` de mais de 60 letras da segunda seção da página (a de leitura); o `cm-lide` conta quando é longo. */
  primeiroParagrafo: Caixa | null
  /** O `text-wrap` computado do primeiro parágrafo de leitura e do primeiro `h2`. */
  quebraDoParagrafo: string
  quebraDoTitulo: string
  /** Letras por linha (média) dos parágrafos de leitura de mais de 150 letras. */
  letrasPorLinha: number[]
  /**
   * Os parágrafos de `.pt-texto p` da segunda seção que quebram em 2 linhas ou mais: para cada um, as letras de cada
   * linha (`trim().length`, a mesma unidade do total), em ordem. Só letras visíveis (retângulo com largura).
   */
  linhasDosParagrafos: number[][]
  /** O h1 da abertura: a coluna dele e as linhas medidas letra a letra. */
  h1: H1Medido
  /** O bloco de e-mail, o botão, o endereço e as linhas do endereço: só em /contato, null nas outras páginas. */
  email: Caixa | null
  emailBotao: Caixa | null
  emailEndereco: Caixa | null
  enderecoLinhas: number | null
}

// O script de dentro da página: espera as fontes e as imagens e escreve a medida em JSON num <pre>.
const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  const emitir = (objeto) => {
    const texto = JSON.stringify(objeto)
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  }
  try {
    document.body.offsetWidth
    for (const img of document.images) img.loading = 'eager'
    await document.fonts.ready
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r }))))
    await new Promise((r) => setTimeout(r, 100))
    const caixa = (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height }
    }
    const um = (seletor) => {
      const el = document.querySelector(seletor)
      if (!el) throw new Error('sem ' + seletor)
      return el
    }
    const segundaSecao = document.querySelector('main').children[1]
    const paragrafo = [...segundaSecao.querySelectorAll('p')].find((p) => p.textContent.trim().length > 60) ?? null
    const letrasPorLinha = []
    for (const p of segundaSecao.querySelectorAll('.pt-texto p')) {
      const total = p.textContent.trim().length
      if (total <= 150) continue
      const intervalo = document.createRange()
      intervalo.selectNodeContents(p)
      const topos = new Set([...intervalo.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)))
      letrasPorLinha.push(total / Math.max(1, topos.size))
    }
    // VIS-4-r3-I-03: todo parágrafo de leitura da segunda seção, de qualquer tamanho. Cada letra visível vai para a
    // linha do seu topo; o texto de cada linha sai em ordem do DOM e conta por trim().length.
    const linhasDosParagrafos = []
    for (const p of segundaSecao.querySelectorAll('.pt-texto p')) {
      const porTopoDoParagrafo = new Map()
      const caminhante = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
      while (caminhante.nextNode()) {
        const no = caminhante.currentNode
        const faixa = document.createRange()
        for (let i = 0; i < no.length; i++) {
          faixa.setStart(no, i)
          faixa.setEnd(no, i + 1)
          const retangulos = [...faixa.getClientRects()].filter((r) => r.width > 0)
          if (retangulos.length === 0) continue
          const topo = Math.round(retangulos[0].top)
          porTopoDoParagrafo.set(topo, (porTopoDoParagrafo.get(topo) || '') + no.data[i])
        }
      }
      const linhasDoParagrafo = [...porTopoDoParagrafo.entries()].sort((a, b) => a[0] - b[0]).map((par) => par[1].trim().length)
      if (linhasDoParagrafo.length >= 2) linhasDosParagrafos.push(linhasDoParagrafo)
    }
    // VIS-4-r3-I-02: o h1 letra a letra (o método de escalaTipo.geometria.test.tsx): cada linha por Math.round(top),
    // com o menor left e o maior right; a coluna é a caixa do h1 sem padding nem borda.
    const h1 = um('main .pt-abertura h1')
    const linhasDoH1 = new Map()
    const limitesDoH1 = new Map()
    const caminhanteDoH1 = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT)
    while (caminhanteDoH1.nextNode()) {
      const no = caminhanteDoH1.currentNode
      if (no.parentElement.closest('.sr-only')) continue
      const faixa = document.createRange()
      for (let i = 0; i < no.length; i++) {
        faixa.setStart(no, i)
        faixa.setEnd(no, i + 1)
        const retangulos = faixa.getClientRects()
        if (retangulos.length === 0) continue
        const topo = Math.round(retangulos[0].top)
        linhasDoH1.set(topo, (linhasDoH1.get(topo) || '') + no.data[i])
        const limite = limitesDoH1.get(topo) || { esquerda: Infinity, direita: -Infinity }
        for (const retangulo of retangulos) {
          limite.esquerda = Math.min(limite.esquerda, retangulo.left)
          limite.direita = Math.max(limite.direita, retangulo.right)
        }
        limitesDoH1.set(topo, limite)
      }
    }
    const arredondar = (n) => Math.round(n * 10) / 10
    const estiloDoH1 = getComputedStyle(h1)
    const caixaDoH1 = h1.getBoundingClientRect()
    const h1Medido = {
      colunaEsquerda: arredondar(caixaDoH1.left + parseFloat(estiloDoH1.paddingLeft) + parseFloat(estiloDoH1.borderLeftWidth)),
      colunaDireita: arredondar(caixaDoH1.right - parseFloat(estiloDoH1.paddingRight) - parseFloat(estiloDoH1.borderRightWidth)),
      linhas: [...linhasDoH1.entries()].sort((a, b) => a[0] - b[0]).map((par) => ({
        texto: par[1].trim(),
        esquerda: arredondar(limitesDoH1.get(par[0]).esquerda),
        direita: arredondar(limitesDoH1.get(par[0]).direita),
      })),
    }
    // REP-T2: o h1 é a maior letra da página? O maior tamanho computado entre os elementos de main que têm texto próprio
    // (o h1 e o que está dentro dele ficam de fora).
    let maiorOutroTamanho = 0
    for (const el of document.querySelectorAll('main *')) {
      if (el.closest('h1')) continue
      const temTexto = [...el.childNodes].some((no) => no.nodeType === 3 && no.data.trim().length > 0)
      if (temTexto) maiorOutroTamanho = Math.max(maiorOutroTamanho, parseFloat(getComputedStyle(el).fontSize))
    }
    const talvezCaixa = (seletor) => {
      const el = document.querySelector(seletor)
      return el ? caixa(el) : null
    }
    // VIS-4-r4-I-04: o cartão de e-mail (só em /contato; null nas outras): o botão, o endereço e as linhas do endereço.
    let enderecoLinhas = null
    const enderecoEl = document.querySelector('main .pt-email address')
    if (enderecoEl) {
      const topos = new Set()
      const caminhanteDoEndereco = document.createTreeWalker(enderecoEl, NodeFilter.SHOW_TEXT)
      while (caminhanteDoEndereco.nextNode()) {
        const no = caminhanteDoEndereco.currentNode
        const faixa = document.createRange()
        for (let i = 0; i < no.length; i++) {
          faixa.setStart(no, i)
          faixa.setEnd(no, i + 1)
          for (const r of faixa.getClientRects()) if (r.width > 0) topos.add(Math.round(r.top))
        }
      }
      enderecoLinhas = topos.size
    }
    emitir({
      email: talvezCaixa('main .pt-email'),
      emailBotao: talvezCaixa('main .pt-email a'),
      emailEndereco: talvezCaixa('main .pt-email address'),
      enderecoLinhas,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      fontes: document.fonts.status,
      scrollWidth: document.documentElement.scrollWidth,
      abertura: caixa(um('main .pt-abertura')),
      placa: caixa(um('main .pt-placa')),
      cabeca: caixa(um('main .pt-cabeca')),
      indice: caixa(um('main .pt-indice')),
      leitura: caixa(um('main .pt-leitura')),
      primeiroH2: caixa(um('main .pt-leitura h2')),
      h1Tamanho: parseFloat(estiloDoH1.fontSize),
      maiorOutroTamanho,
      primeiroParagrafo: paragrafo ? caixa(paragrafo) : null,
      quebraDoParagrafo: paragrafo ? getComputedStyle(paragrafo).textWrap : '',
      quebraDoTitulo: getComputedStyle(um('main h2')).textWrap,
      letrasPorLinha,
      linhasDosParagrafos,
      h1: h1Medido,
    })
  } catch (e) {
    emitir({ erro: String(e) })
  }
})()
`

/** O CSS do build aponta fontes e imagens por `/...`: numa página file:// isso vira a raiz do disco, então apontam para o dist. */
function comArquivosDoDist(texto: string): string {
  const base = `${pathToFileURL(PASTA_DIST).href}/`
  return texto.replace(/url\((["']?)\/(?!\/)/g, (_t, aspas: string) => `url(${aspas}${base}`)
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

interface ResultadoDoChrome {
  status: number | null
  erro: string | null
  expirou: boolean
  saida: string
  erroPadrao: string
}

/**
 * Roda o Chrome com spawn assíncrono, saída em arquivos (nunca em pipes: os filhos do Chrome que sobrevivem não seguram
 * nada que nos bloqueie), grupo de processos próprio morto inteiro no fim e todo await limitado no tempo (45 s + 3 s).
 */
async function executarChrome(argumentos: string[], arquivoDeSaida: string, arquivoDeErro: string): Promise<ResultadoDoChrome> {
  const fdSaida = openSync(arquivoDeSaida, 'w')
  const fdErro = openSync(arquivoDeErro, 'w')
  let filho: ChildProcess | null = null
  let terminou: Promise<{ status: number | null; erro: string | null }> | null = null
  let expirou = false
  // O resultado do filho fica aqui assim que ele termina: depois do limite e da limpeza nunca se espera de novo uma promise pendente.
  let final: { status: number | null; erro: string | null } | null = null
  try {
    const alvoDoFilho = spawn(CHROME, argumentos, {
      stdio: ['ignore', fdSaida, fdErro],
      detached: process.platform !== 'win32',
      windowsHide: true,
    })
    filho = alvoDoFilho
    terminou = new Promise((resolver) => {
      alvoDoFilho.once('error', (erro) => {
        final = { status: null, erro: erro.message }
        resolver(final)
      })
      alvoDoFilho.once('exit', (status) => {
        final = { status, erro: null }
        resolver(final)
      })
    })
    let relogio: NodeJS.Timeout | undefined
    const limite = new Promise<'tempo'>((resolver) => {
      relogio = setTimeout(() => resolver('tempo'), 45_000)
    })
    expirou = (await Promise.race([terminou, limite]).finally(() => clearTimeout(relogio))) === 'tempo'
  } finally {
    if (filho?.pid !== undefined) matarGrupo(filho.pid, filho)
    // Depois do kill, espera o exit por um instante antes de fechar os arquivos.
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
  // Sem await: se o Chrome não emitiu exit nem error mesmo depois do kill e dos 3 s de espera, falha aqui com mensagem clara.
  const resultado = final as { status: number | null; erro: string | null } | null
  if (!resultado) throw new Error('o Chrome não encerrou nem depois do kill (sem exit/error em 3 s)')
  return {
    status: resultado.status,
    erro: resultado.erro,
    expirou,
    saida: readFileSync(arquivoDeSaida, 'utf8'),
    erroPadrao: readFileSync(arquivoDeErro, 'utf8'),
  }
}

async function medirNoChrome(corpoHtml: string, largura: number, altura: number, foto: string | null): Promise<Medida> {
  const pasta = mkdtempSync(join(tmpdir(), 'cm-abertura-'))
  try {
    const perfil = join(pasta, 'perfil')
    mkdirSync(perfil)
    const folhas = arquivosCss().map((nome, i) => {
      const arquivo = join(pasta, `folha-${i}.css`)
      writeFileSync(arquivo, comArquivosDoDist(readFileSync(join(PASTA_CSS, nome), 'utf8')), 'utf8')
      return `<link rel="stylesheet" href="${pathToFileURL(arquivo).href}">`
    })
    const base = `${pathToFileURL(PASTA_DIST).href}/`
    // `assets`: a placa da rua (vite-imagetools) sai do build em /assets/, com hash no nome.
    const corpo = corpoHtml.replace(/(["'\s,])\/(ilustracoes|cenas|assets)\//g, (_t, antes: string, pasta2: string) => `${antes}${base}${pasta2}/`)
    const pagina = join(pasta, 'pagina.html')
    writeFileSync(
      pagina,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        `<body>${corpo}<pre id="geometria" hidden></pre><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    // O Chrome sem janela não passa de ~500 px de largura: a página vai num iframe da largura e da altura pedidas
    // (as media queries respondem à largura do iframe) e devolve a medida por postMessage.
    const envoltorio = join(pasta, 'envoltorio.html')
    writeFileSync(
      envoltorio,
      `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;width:${largura}px;height:${altura}px"></iframe><pre id="geometria" hidden></pre>` +
        `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
      'utf8',
    )
    const resultado = await executarChrome(
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        ...(process.platform === 'win32' ? ['--disable-crashpad-for-testing'] : []),
        '--no-first-run',
        '--allow-file-access-from-files',
        `--user-data-dir=${perfil}`,
        '--force-device-scale-factor=1',
        `--window-size=${Math.max(largura, 600) + 16},${altura + 100}`,
        '--virtual-time-budget=4000',
        '--dump-dom',
        pathToFileURL(envoltorio).href,
      ],
      join(pasta, 'saida.txt'),
      join(pasta, 'erro.txt'),
    )
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.saida)
    if (!achado) {
      const mensagem = resultado.erro ?? (resultado.expirou ? 'tempo esgotado (45000 ms)' : 'nenhum')
      throw new Error(`O Chrome não devolveu a medida (status ${resultado.status}, erro ${mensagem}): ${resultado.erroPadrao}`)
    }
    const texto = achado[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    if (foto && existsSync(PASTA_DAS_FOTOS)) {
      // Só na máquina de quem tem a pasta `.oc/olhar` (o conferidor de telas do cartão): a página inteira num PNG,
      // para olhar. Em CI a pasta não existe e nada é escrito.
      const alta = join(pasta, 'alta.html')
      writeFileSync(
        alta,
        `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;width:${largura}px;height:${ALTURA_DA_FOTO}px"></iframe></body></html>`,
        'utf8',
      )
      await executarChrome(
        [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          ...(process.platform === 'win32' ? ['--disable-crashpad-for-testing'] : []),
          '--no-first-run',
          '--allow-file-access-from-files',
          `--user-data-dir=${join(pasta, 'perfil-foto')}`,
          '--force-device-scale-factor=1',
          `--window-size=${Math.max(largura, 600) + 16},${ALTURA_DA_FOTO + 16}`,
          '--virtual-time-budget=4000',
          `--screenshot=${join(PASTA_DAS_FOTOS, foto)}`,
          pathToFileURL(alta).href,
        ],
        join(pasta, 'foto-saida.txt'),
        join(pasta, 'foto-erro.txt'),
      )
    }
    return JSON.parse(texto) as Medida
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

/**
 * O jsdom não tem `matchMedia`, e o índice "Nesta página" decide por ele se é uma lista aberta ou um `<details>`
 * fechado. Aqui ele responde `max-width` e `min-width` pela largura da janela medida, como o Chrome responderá.
 */
function consultaPelaLargura(largura: number) {
  return (consulta: string) => {
    // O índice consulta a largura em rem (69,5 rem); 1 rem = 16 px.
    const pixels = (numero: string, unidade: string) => Number(numero) * (unidade === 'rem' ? 16 : 1)
    const maxima = /\(max-width:\s*([\d.]+)(px|rem)\)/.exec(consulta)
    const minima = /\(min-width:\s*([\d.]+)(px|rem)\)/.exec(consulta)
    const casa = maxima ? largura <= pixels(maxima[1], maxima[2]) : minima ? largura >= pixels(minima[1], minima[2]) : false
    return { matches: casa, media: consulta, addEventListener: () => {}, removeEventListener: () => {} }
  }
}

async function medirPagina(caminho: string, largura: number, altura: number, foto = false, trocar?: [string, string]): Promise<Medida> {
  vi.stubGlobal('matchMedia', consultaPelaLargura(largura))
  let corpo: string
  try {
    renderizarRota(caminho)
    corpo = document.body.innerHTML
    // VIS-4-r4-I-04: o texto trocado no corpo serializado (o endereço de e-mail mais longo que o real).
    if (trocar) {
      expect(corpo, `o texto "${trocar[0]}" existe no corpo de ${caminho}`).toContain(trocar[0])
      corpo = corpo.replaceAll(trocar[0], trocar[1])
    }
  } finally {
    vi.unstubAllGlobals()
  }
  const medida = await medirNoChrome(corpo, largura, altura, foto ? `${caminho.slice(1)}_${largura}.png` : null)
  expect(medida.erro, `${caminho} a ${largura}`).toBeUndefined()
  expect(medida.innerWidth).toBe(largura)
  expect(medida.innerHeight).toBe(altura)
  expect(medida.fontes).toBe('loaded')
  return medida
}

/**
 * VIS-4-r3-I-03, a régua da medida de leitura (pura, sem Chrome). Recebe, por parágrafo que quebra em 2 linhas ou
 * mais, as letras de cada linha. Linha cheia = toda linha menos a última de cada parágrafo. Três partes:
 * (b1) nenhuma linha cheia passa de `maximo` letras; (b2) a mediana das linhas cheias da página é menor que
 * `limiteDaMediana` (com número par de linhas, a média dos dois valores do meio); (b3) há ao menos 1 linha cheia,
 * senão a medida não mediu nada (e só essa mensagem sai). Devolve as mensagens (lista vazia = ok).
 */
function violacoesDasLinhasCheias(caminho: string, paragrafos: number[][], maximo = 90, limiteDaMediana = 80): string[] {
  const mensagens: string[] = []
  const cheias: number[] = []
  paragrafos.forEach((linhas, p) => {
    linhas.slice(0, -1).forEach((letras, l) => {
      cheias.push(letras)
      if (letras > maximo) {
        mensagens.push(`${caminho}: o parágrafo ${p} a linha cheia ${l} tem ${letras} letras (limite: no máximo ${maximo})`)
      }
    })
  })
  if (cheias.length === 0) {
    return [`${caminho}: nenhum parágrafo de leitura quebra em 2 linhas ou mais; a medida não mediu nada`]
  }
  const ordenadas = [...cheias].sort((a, b) => a - b)
  const meio = Math.floor(ordenadas.length / 2)
  const mediana = ordenadas.length % 2 === 1 ? ordenadas[meio] : (ordenadas[meio - 1] + ordenadas[meio]) / 2
  if (mediana >= limiteDaMediana) {
    mensagens.push(`${caminho}: a mediana das linhas cheias é ${mediana} letras (limite: abaixo de ${limiteDaMediana})`)
  }
  return mensagens
}

/** VIS-4-r3-I-02, a régua da coluna do h1 (pura): as linhas cujas letras passam da coluna, com `tolerancia` px de folga. */
function linhasForaDaColuna(h1: H1Medido, tolerancia = 1): LinhaDoH1[] {
  return h1.linhas.filter(
    (linha) => linha.esquerda < h1.colunaEsquerda - tolerancia || linha.direita > h1.colunaDireita + tolerancia,
  )
}

/** Dois valores de px iguais, com folga de `folga` px. */
const igual = (a: number, b: number, folga: number) => Math.abs(a - b) <= folga

/**
 * REP-T2 a 1440 (régua pura, sem Chrome): a faixa de cacau tem 400 px no mínimo; a placa de 340 px fica rente à borda
 * direita e ao pé da faixa e o texto não passa por baixo dela; o `h1` e a coluna de leitura (640 no máximo) têm a mesma
 * borda esquerda; o índice fica à direita da coluna, na mesma altura; o primeiro `h2` do documento está dentro da
 * primeira dobra (900); o `h1` é a maior letra; nenhuma rolagem horizontal. Devolve as mensagens (vazio = ok).
 */
function violacoesDoT2Largo(rotulo: string, m: Medida): string[] {
  const problemas: string[] = []
  const { abertura, placa, cabeca, indice, leitura, primeiroH2 } = m
  if (abertura.height < 399.5) problemas.push(`${rotulo}: a faixa de cacau tem ${abertura.height.toFixed(1)} px de altura (mínimo 400)`)
  if (!igual(placa.right, abertura.right, 0.5)) {
    problemas.push(`${rotulo}: a placa acaba em ${placa.right.toFixed(1)} e a faixa em ${abertura.right.toFixed(1)} (esperado: rente à borda direita)`)
  }
  if (!igual(placa.bottom, abertura.bottom, 0.5)) {
    problemas.push(`${rotulo}: a placa acaba em ${placa.bottom.toFixed(1)} e a faixa em ${abertura.bottom.toFixed(1)} (esperado: rente ao pé)`)
  }
  if (!igual(placa.width, 340, 1)) problemas.push(`${rotulo}: a placa tem ${placa.width.toFixed(1)} px de largura (esperado 340, a densidade nativa)`)
  if (cabeca.right > placa.x + 0.5) {
    problemas.push(`${rotulo}: a coluna do texto acaba em ${cabeca.right.toFixed(1)}, depois do começo da placa (${placa.x.toFixed(1)})`)
  }
  if (!igual(m.h1.colunaEsquerda, leitura.x, 1)) {
    problemas.push(`${rotulo}: o h1 começa em ${m.h1.colunaEsquerda} e a coluna de leitura em ${leitura.x.toFixed(1)} (esperado: a mesma borda esquerda)`)
  }
  if (leitura.width > 640.5) problemas.push(`${rotulo}: a coluna de leitura tem ${leitura.width.toFixed(1)} px (máximo 640)`)
  if (indice.x < leitura.right - 0.5) {
    problemas.push(`${rotulo}: o índice começa em ${indice.x.toFixed(1)}, antes do fim da coluna de leitura (${leitura.right.toFixed(1)}): não está à direita dela`)
  }
  if (indice.right > m.innerWidth + 0.5) problemas.push(`${rotulo}: o índice acaba em ${indice.right.toFixed(1)}, fora da janela de ${m.innerWidth} px`)
  if (!(indice.y < leitura.bottom && leitura.y < indice.bottom)) {
    problemas.push(`${rotulo}: o índice (${indice.y.toFixed(1)} a ${indice.bottom.toFixed(1)}) não está na altura da leitura (${leitura.y.toFixed(1)} a ${leitura.bottom.toFixed(1)})`)
  }
  if (primeiroH2.y >= 900) problemas.push(`${rotulo}: o primeiro título do documento está em y ${primeiroH2.y.toFixed(1)} (esperado: dentro dos 900 da primeira dobra)`)
  if (m.h1Tamanho <= m.maiorOutroTamanho) problemas.push(`${rotulo}: o h1 tem ${m.h1Tamanho} px e há letra de ${m.maiorOutroTamanho} px na página (o h1 deve ser a maior)`)
  if (m.scrollWidth > m.innerWidth) problemas.push(`${rotulo}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
  return problemas
}

/**
 * REP-T2 a 390 (régua pura): a faixa empilhada (texto e, embaixo, a placa rente à borda direita e ao pé), depois o
 * índice em fluxo e só então o documento; o `h1` é a maior letra; nenhuma rolagem horizontal.
 */
function violacoesDoT2Estreito(rotulo: string, m: Medida): string[] {
  const problemas: string[] = []
  const { abertura, placa, cabeca, indice, leitura } = m
  if (placa.y < cabeca.bottom - 0.5) {
    problemas.push(`${rotulo}: a placa começa em y ${placa.y.toFixed(1)}, antes do fim do texto (${cabeca.bottom.toFixed(1)}): devia ficar embaixo dele`)
  }
  if (!igual(placa.right, abertura.right, 0.5)) {
    problemas.push(`${rotulo}: a placa acaba em ${placa.right.toFixed(1)} e a faixa em ${abertura.right.toFixed(1)} (esperado: rente à borda direita)`)
  }
  if (!igual(placa.bottom, abertura.bottom, 0.5)) {
    problemas.push(`${rotulo}: a placa acaba em ${placa.bottom.toFixed(1)} e a faixa em ${abertura.bottom.toFixed(1)} (esperado: rente ao pé)`)
  }
  if (indice.y < abertura.bottom - 0.5) problemas.push(`${rotulo}: o índice começa em y ${indice.y.toFixed(1)}, dentro da faixa (que acaba em ${abertura.bottom.toFixed(1)})`)
  if (indice.bottom > leitura.y + 0.5) {
    problemas.push(`${rotulo}: o índice acaba em y ${indice.bottom.toFixed(1)}, depois do começo do documento (${leitura.y.toFixed(1)}): devia vir antes dele, em fluxo`)
  }
  if (m.h1Tamanho <= m.maiorOutroTamanho) problemas.push(`${rotulo}: o h1 tem ${m.h1Tamanho} px e há letra de ${m.maiorOutroTamanho} px na página (o h1 deve ser a maior)`)
  if (m.scrollWidth > m.innerWidth) problemas.push(`${rotulo}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
  return problemas
}

/** Uma medida de 1440 que passa nas réguas do T2 (para os controles negativos): cada controle muda um só campo. */
function medidaT2Larga(): Medida {
  const caixa = (x: number, y: number, width: number, height: number): Caixa => ({ x, y, width, height, right: x + width, bottom: y + height })
  return {
    innerWidth: 1440,
    innerHeight: 900,
    fontes: 'loaded',
    scrollWidth: 1440,
    abertura: caixa(0, 88, 1440, 400),
    placa: caixa(1100, 125, 340, 363),
    cabeca: caixa(120, 160, 640, 250),
    indice: caixa(840, 552, 320, 400),
    leitura: caixa(120, 552, 640, 1500),
    primeiroH2: caixa(120, 552, 640, 42),
    h1Tamanho: 80,
    maiorOutroTamanho: 36,
    primeiroParagrafo: null,
    quebraDoParagrafo: 'pretty',
    quebraDoTitulo: 'balance',
    letrasPorLinha: [],
    linhasDosParagrafos: [],
    h1: { colunaEsquerda: 120, colunaDireita: 760, linhas: [] },
    email: null,
    emailBotao: null,
    emailEndereco: null,
    enderecoLinhas: null,
  }
}

const descreve = `a abertura das seis páginas de texto no Chrome${motivoDoPulo ? ` (pulado: ${motivoDoPulo})` : ''}`

describe(descreve, () => {
  if (exigirNoCI && motivoDoPulo !== null) {
    it('a geometria roda em CI', () => {
      throw new Error('geometria exigida em CI e não pôde rodar: ' + motivoDoPulo)
    })
  }
  const roda = it.skipIf(motivoDoPulo !== null && !exigirNoCI)

  // VIS-4-r3-I-04: controles negativos das duas réguas, nas funções puras (sem Chrome, fora do skipIf).
  it('VIS-4-r3-I-04 um parágrafo cuja primeira linha cheia tem 91 letras é apontado', () => {
    // As outras duas linhas cheias (70) mantêm a mediana abaixo de 80: só o teto (b1) fala.
    const mensagens = violacoesDasLinhasCheias('/sobre', [[91, 40], [70, 40], [70, 40]])
    expect(mensagens).toHaveLength(1)
    expect(mensagens[0]).toContain('/sobre')
    expect(mensagens[0]).toContain('91')
  })

  it('VIS-4-r3-I-04 uma linha cheia de 85 letras não é apontada pelo teto de 90 quando a mediana da página fica abaixo de 80', () => {
    expect(violacoesDasLinhasCheias('/privacidade', [[85, 40], [70, 40], [70, 40]])).toEqual([])
  })

  it('VIS-4-r3-I-04 uma página cuja mediana das linhas cheias é 80 falha e nomeia a página e a mediana', () => {
    const mensagens = violacoesDasLinhasCheias('/termos', [[78, 10], [80, 10], [82, 10]])
    expect(mensagens).toHaveLength(1)
    expect(mensagens[0]).toContain('/termos')
    expect(mensagens[0]).toContain('mediana')
    expect(mensagens[0]).toContain('80')
  })

  it('VIS-4-r3-I-04 parágrafos de uma linha só não são medidos: o conjunto sem linha cheia falha só com a mensagem da página', () => {
    const mensagens = violacoesDasLinhasCheias('/contato', [[60], [120]])
    expect(mensagens).toHaveLength(1)
    expect(mensagens[0]).toContain('/contato')
    expect(mensagens[0]).toContain('não mediu nada')
  })

  it('VIS-4-r3-I-04 a última linha de um parágrafo não conta: 3 linhas com 70, 70 e 95 não são apontadas', () => {
    expect(violacoesDasLinhasCheias('/exclusao-de-conta', [[70, 70, 95]])).toEqual([])
  })

  it('VIS-4-r3-I-04 um conjunto medido vazio falha e nomeia a página', () => {
    const mensagens = violacoesDasLinhasCheias('/regras-da-comunidade', [])
    expect(mensagens).toHaveLength(1)
    expect(mensagens[0]).toContain('/regras-da-comunidade')
    expect(mensagens[0]).toContain('não mediu nada')
  })

  it('VIS-4-r3-I-04 uma linha do h1 15 px além da coluna é apontada; uma dentro (com 1 px de folga) não', () => {
    const coluna = { colunaEsquerda: 100, colunaDireita: 668 }
    const fora = linhasForaDaColuna({
      ...coluna,
      linhas: [
        { texto: 'Regras', esquerda: 100, direita: 300 },
        { texto: 'da comunidade', esquerda: 100, direita: 683 },
      ],
    })
    expect(fora.map((l) => l.texto)).toEqual(['da comunidade'])
    const dentro = linhasForaDaColuna({
      ...coluna,
      linhas: [
        { texto: 'Regras', esquerda: 99.5, direita: 668.8 },
        { texto: 'da comunidade', esquerda: 100, direita: 600 },
      ],
    })
    expect(dentro).toEqual([])
  })

  // REP-T2: controles negativos das réguas do modelo, nas funções puras (sem Chrome, fora do skipIf). Cada controle
  // muda um só campo de uma medida que passa, e a régua tem de apontar exatamente esse campo.
  it('REP-T2 controle: a medida de 1440 de referência passa nas réguas do modelo', () => {
    expect(violacoesDoT2Largo('/privacidade a 1440', medidaT2Larga())).toEqual([])
  })

  it('REP-T2 controle: faixa de 399 px, placa fora da borda direita ou do pé, índice à esquerda e título fora da dobra são apontados', () => {
    const base = medidaT2Larga()
    const mudar = (parcial: Partial<Medida>) => violacoesDoT2Largo('/x a 1440', { ...base, ...parcial })
    expect(mudar({ abertura: { ...base.abertura, height: 399, bottom: 487 } })).toHaveLength(2)
    expect(mudar({ placa: { ...base.placa, x: 1090, right: 1430 } })).toHaveLength(1)
    expect(mudar({ placa: { ...base.placa, y: 115, bottom: 478 } })).toHaveLength(1)
    expect(mudar({ placa: { ...base.placa, width: 400, x: 1040 } })).toHaveLength(1)
    expect(mudar({ indice: { ...base.indice, x: 100, right: 420 } })).toHaveLength(1)
    expect(mudar({ primeiroH2: { ...base.primeiroH2, y: 900 } })).toHaveLength(1)
    expect(mudar({ h1: { ...base.h1, colunaEsquerda: 130 } })).toHaveLength(1)
    expect(mudar({ h1Tamanho: 36 })).toHaveLength(1)
    expect(mudar({ scrollWidth: 1441 })).toHaveLength(1)
  })

  it('REP-T2 controle: a 390 a placa acima do fim do texto, o índice dentro da faixa ou depois do documento e a rolagem horizontal são apontados', () => {
    const caixa = (x: number, y: number, width: number, height: number): Caixa => ({ x, y, width, height, right: x + width, bottom: y + height })
    const base: Medida = {
      ...medidaT2Larga(),
      innerWidth: 390,
      innerHeight: 844,
      scrollWidth: 390,
      h1Tamanho: 44,
      maiorOutroTamanho: 28,
      abertura: caixa(0, 72, 390, 561),
      cabeca: caixa(20, 96, 350, 220),
      placa: caixa(50, 360, 340, 273),
      indice: caixa(20, 680, 350, 48),
      leitura: caixa(20, 760, 350, 1500),
    }
    expect(violacoesDoT2Estreito('/x a 390', base)).toEqual([])
    const mudar = (parcial: Partial<Medida>) => violacoesDoT2Estreito('/x a 390', { ...base, ...parcial })
    expect(mudar({ placa: { ...base.placa, y: 300, bottom: 573 } })).toHaveLength(2)
    expect(mudar({ placa: { ...base.placa, x: 40, right: 380 } })).toHaveLength(1)
    expect(mudar({ indice: { ...base.indice, y: 600, bottom: 648 } })).toHaveLength(1)
    expect(mudar({ indice: { ...base.indice, y: 740, bottom: 788 } })).toHaveLength(1)
    expect(mudar({ scrollWidth: 391 })).toHaveLength(1)
  })

  // VIS-4-r4-I-04: o cartão de e-mail de /contato fica numa linha só de 1280 em diante, mesmo com um endereço mais longo.
  const ENDERECO_LONGO = 'contato@appmaternidade.example'
  const afirmarCartaoEmUmaLinha = (rotulo: string, m: Medida): string[] => {
    const problemas: string[] = []
    if (!m.email || !m.emailBotao || !m.emailEndereco || m.enderecoLinhas === null) {
      return [`${rotulo}: o cartão de e-mail, o botão ou o endereço não foi medido`]
    }
    const { email, emailBotao, emailEndereco } = m
    const sobreposto = emailBotao.y < emailEndereco.bottom && emailEndereco.y < emailBotao.bottom
    if (!sobreposto) {
      problemas.push(
        `${rotulo}: o botão (${emailBotao.y.toFixed(1)}-${emailBotao.bottom.toFixed(1)}) e o endereço (${emailEndereco.y.toFixed(1)}-${emailEndereco.bottom.toFixed(1)}) não se sobrepõem na vertical: o cartão quebrou em duas linhas`,
      )
    }
    if (emailBotao.x < emailEndereco.right) {
      problemas.push(`${rotulo}: o botão começa em ${emailBotao.x.toFixed(1)}, antes do fim do endereço (${emailEndereco.right.toFixed(1)})`)
    }
    if (m.enderecoLinhas !== 1) problemas.push(`${rotulo}: o endereço tem ${m.enderecoLinhas} linhas (esperado 1)`)
    if (email.right > m.cabeca.right + 0.5) {
      problemas.push(`${rotulo}: o cartão termina em ${email.right.toFixed(1)}, além da coluna do texto (${m.cabeca.right.toFixed(1)})`)
    }
    if (m.cabeca.width > 640) problemas.push(`${rotulo}: a coluna do texto tem ${m.cabeca.width.toFixed(1)} px (máximo 640)`)
    const fora = linhasForaDaColuna(m.h1)
    if (fora.length > 0) problemas.push(`${rotulo}: linha(s) do h1 fora da coluna: ${fora.map((l) => `"${l.texto}"`).join('; ')}`)
    if (m.scrollWidth > m.innerWidth) problemas.push(`${rotulo}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
    return problemas
  }

  roda(
    'VIS-4-r4-I-04 /contato a 1280 e a 1440: o cartão de e-mail é uma linha só, com o endereço de hoje e com um mais longo',
    async () => {
      const problemas: string[] = []
      for (const largura of [1280, 1440]) {
        problemas.push(...afirmarCartaoEmUmaLinha(`/contato a ${largura}`, await medirPagina('/contato', largura, 900)))
        problemas.push(
          ...afirmarCartaoEmUmaLinha(
            `/contato a ${largura} com ${ENDERECO_LONGO}`,
            await medirPagina('/contato', largura, 900, false, [EMAIL_CONTATO, ENDERECO_LONGO]),
          ),
        )
      }
      expect(problemas).toEqual([])
    },
    TEMPO_DO_CHROME,
  )

  roda(
    'VIS-4-r4-I-04 /contato a 1100: sem rolagem horizontal e o cartão de e-mail dentro da janela (pode quebrar)',
    async () => {
      const problemas: string[] = []
      for (const trocar of [undefined, [EMAIL_CONTATO, ENDERECO_LONGO] as [string, string]]) {
        const rotulo = trocar ? `/contato a 1100 com ${ENDERECO_LONGO}` : '/contato a 1100'
        const m = await medirPagina('/contato', 1100, 900, false, trocar)
        if (m.scrollWidth > m.innerWidth) problemas.push(`${rotulo}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
        if (!m.email) problemas.push(`${rotulo}: o cartão de e-mail não foi medido`)
        else if (m.email.x < 0 || m.email.right > m.innerWidth) {
          problemas.push(`${rotulo}: o cartão (${m.email.x.toFixed(1)} a ${m.email.right.toFixed(1)}) sai da janela de ${m.innerWidth} px`)
        }
      }
      expect(problemas).toEqual([])
    },
    TEMPO_DO_CHROME,
  )

  for (const caminho of PAGINAS) {
    // REP-T2 a 1440: a faixa de cacau (400 px no mínimo), a placa rente à borda direita e ao pé, o h1 e a coluna de leitura
    // na mesma borda esquerda, o índice à direita da coluna e o primeiro título do documento dentro dos 900 da dobra.
    roda(
      `REP-T2 ${caminho} a 1440: faixa de 400 px, placa rente à direita e ao pé, h1 e leitura na mesma borda, índice à direita, primeiro título na dobra`,
      async () => {
        const m = await medirPagina(caminho, 1440, 900, true)
        expect(violacoesDoT2Largo(`${caminho} a 1440`, m)).toEqual([])
      },
      TEMPO_DO_CHROME,
    )

    // REP-T2 a 390: a faixa empilhada (texto e, embaixo, a placa), o índice em fluxo, depois o documento; sem rolagem horizontal.
    roda(
      `REP-T2 ${caminho} a 390: faixa empilhada com a placa embaixo, índice antes do documento, sem rolagem horizontal`,
      async () => {
        const m = await medirPagina(caminho, 390, 844, true)
        expect(violacoesDoT2Estreito(`${caminho} a 390`, m)).toEqual([])
      },
      TEMPO_DO_CHROME,
    )

    // O texto de leitura: menos de 80 letras por linha; parágrafo com `pretty` e título com `balance`.
    roda(
      `${caminho} a 1440: menos de 80 letras por linha, parágrafos com text-wrap pretty e títulos com balance`,
      async () => {
        const m = await medirPagina(caminho, 1440, 900)
        expect(violacoesDasLinhasCheias(caminho, m.linhasDosParagrafos)).toEqual([])
        for (const letras of m.letrasPorLinha) expect(letras).toBeLessThan(80)
        expect(m.quebraDoParagrafo).toBe('pretty')
        expect(m.quebraDoTitulo).toBe('balance')
      },
      TEMPO_DO_CHROME,
    )

    // VIS-4-r3-I-02: nenhuma linha do h1 passa da própria coluna (que divide a faixa com a placa), e a coluna do h1
    // não passa da medida de leitura (640 px).
    roda(
      `VIS-4-r3-I-02 ${caminho} a 1100 e 1440: as linhas do h1 ficam dentro da coluna do h1 e a coluna não passa de 640 px`,
      async () => {
        // As duas larguras são medidas antes de afirmar, para a mensagem nomear todas as que falham.
        const problemas: string[] = []
        for (const largura of [1100, 1440]) {
          const m = await medirPagina(caminho, largura, 900)
          const fora = linhasForaDaColuna(m.h1)
          const coluna = m.h1.colunaDireita - m.h1.colunaEsquerda
          if (fora.length > 0) {
            problemas.push(
              `${caminho} em ${largura}: linha(s) do h1 fora da coluna (${m.h1.colunaEsquerda} a ${m.h1.colunaDireita}, ${coluna.toFixed(1)} px): ` +
                fora.map((l) => `"${l.texto}" ${l.esquerda} a ${l.direita} (${(l.direita - l.esquerda).toFixed(1)} px)`).join('; '),
            )
          }
          if (coluna > 641) problemas.push(`${caminho} em ${largura}: a coluna do h1 tem ${coluna.toFixed(1)} px (máximo 640)`)
          if (m.scrollWidth > m.innerWidth) problemas.push(`${caminho} em ${largura}: rolagem horizontal (${m.scrollWidth} > ${m.innerWidth})`)
        }
        expect(problemas).toEqual([])
      },
      TEMPO_DO_CHROME,
    )

  }
})
