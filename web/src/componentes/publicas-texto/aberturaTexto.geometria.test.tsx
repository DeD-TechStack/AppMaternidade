import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// VIS-4, as seis páginas de texto: a abertura (título, painel de mel, frase de apoio) medida num Chrome de
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
  abertura: Caixa
  /** As linhas de texto e os blocos (painel, botão, cartão) da abertura: o que não é vão. */
  blocos: Caixa[]
  /** A coluna da figura (`.pt-figura`), o painel de mel, a frase de apoio e o desenho. */
  figura: Caixa
  painel: Caixa
  apoio: Caixa
  desenho: Caixa
  /** A coluna do texto da abertura (`.pt-cabeca`). */
  cabeca: Caixa
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
    // O que a abertura ocupa de fato: as linhas de texto (uma caixa por linha, não a caixa de bloco, que vai até a
    // borda da coluna), o painel, o botão e o cartão de e-mail.
    const blocos = []
    const linhasDe = (el) => {
      const intervalo = document.createRange()
      intervalo.selectNodeContents(el)
      for (const r of intervalo.getClientRects()) if (r.width > 0 && r.height > 0) blocos.push({ x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height })
    }
    for (const el of document.querySelectorAll('main .pt-abertura h1, main .pt-abertura .pt-segunda-linha, main .pt-abertura .pt-apoio')) linhasDe(el)
    for (const el of document.querySelectorAll('main .pt-abertura .pt-painel, main .pt-abertura .pt-email, main .pt-abertura .pt-acao a')) blocos.push(caixa(el))
    emitir({
      blocos,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      fontes: document.fonts.status,
      scrollWidth: document.documentElement.scrollWidth,
      abertura: caixa(um('main .pt-abertura')),
      figura: caixa(um('main .pt-figura')),
      painel: caixa(um('main .pt-painel')),
      apoio: caixa(um('main .pt-apoio')),
      desenho: caixa(um('main .pt-ilustracao')),
      cabeca: caixa(um('main .pt-cabeca')),
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

function medirNoChrome(corpoHtml: string, largura: number, altura: number, foto: string | null): Medida {
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
    const corpo = corpoHtml.replace(/(["'\s,])\/(ilustracoes|cenas)\//g, (_t, antes: string, pasta2: string) => `${antes}${base}${pasta2}/`)
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
    const resultado = spawnSync(
      CHROME,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-crashpad-for-testing',
        '--no-first-run',
        '--allow-file-access-from-files',
        `--user-data-dir=${perfil}`,
        '--force-device-scale-factor=1',
        `--window-size=${Math.max(largura, 600) + 16},${altura + 100}`,
        '--virtual-time-budget=4000',
        '--dump-dom',
        pathToFileURL(envoltorio).href,
      ],
      { encoding: 'utf8', timeout: 45_000, maxBuffer: 64 * 1024 * 1024 },
    )
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.stdout ?? '')
    if (!achado) {
      throw new Error(`O Chrome não devolveu a medida (status ${resultado.status}, erro ${resultado.error?.message ?? 'nenhum'}): ${resultado.stderr ?? ''}`)
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
      spawnSync(
        CHROME,
        [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          '--disable-crashpad-for-testing',
          '--no-first-run',
          '--allow-file-access-from-files',
          `--user-data-dir=${join(pasta, 'perfil-foto')}`,
          '--force-device-scale-factor=1',
          `--window-size=${Math.max(largura, 600) + 16},${ALTURA_DA_FOTO + 16}`,
          '--virtual-time-budget=4000',
          `--screenshot=${join(PASTA_DAS_FOTOS, foto)}`,
          pathToFileURL(alta).href,
        ],
        { encoding: 'utf8', timeout: 45_000 },
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
    const maxima = /\(max-width:\s*([\d.]+)px\)/.exec(consulta)
    const minima = /\(min-width:\s*([\d.]+)px\)/.exec(consulta)
    const casa = maxima ? largura <= Number(maxima[1]) : minima ? largura >= Number(minima[1]) : false
    return { matches: casa, media: consulta, addEventListener: () => {}, removeEventListener: () => {} }
  }
}

function medirPagina(caminho: string, largura: number, altura: number, foto = false): Medida {
  vi.stubGlobal('matchMedia', consultaPelaLargura(largura))
  let corpo: string
  try {
    renderizarRota(caminho)
    corpo = document.body.innerHTML
  } finally {
    vi.unstubAllGlobals()
  }
  const medida = medirNoChrome(corpo, largura, altura, foto ? `${caminho.slice(1)}_${largura}.png` : null)
  expect(medida.erro, `${caminho} a ${largura}`).toBeUndefined()
  expect(medida.innerWidth).toBe(largura)
  expect(medida.innerHeight).toBe(altura)
  expect(medida.fontes).toBe('loaded')
  return medida
}

/**
 * O maior retângulo vazio da caixa da abertura (o que nenhuma linha de texto, painel, botão ou cartão toca), em
 * fração da área da abertura. Grade de 8 px e o algoritmo do maior retângulo de uns num histograma.
 */
function fracaoVazia(medida: Medida): number {
  const CELULA = 8
  const { abertura } = medida
  const colunas = Math.ceil(abertura.width / CELULA)
  const linhas = Math.ceil(abertura.height / CELULA)
  const livre = Array.from({ length: linhas }, (_l, l) =>
    Array.from({ length: colunas }, (_c, c) => {
      const caixa = {
        x: abertura.x + c * CELULA,
        right: abertura.x + (c + 1) * CELULA,
        y: abertura.y + l * CELULA,
        bottom: abertura.y + (l + 1) * CELULA,
      }
      return !medida.blocos.some((bloco) => bloco.x < caixa.right && caixa.x < bloco.right && bloco.y < caixa.bottom && caixa.y < bloco.bottom)
    }),
  )
  let melhor = 0
  const alturas = new Array<number>(colunas).fill(0)
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) alturas[c] = livre[l][c] ? alturas[c] + 1 : 0
    for (let c = 0; c < colunas; c++) {
      let minima = Infinity
      for (let d = c; d < colunas && alturas[d] > 0; d++) {
        minima = Math.min(minima, alturas[d])
        melhor = Math.max(melhor, minima * (d - c + 1))
      }
    }
  }
  return (melhor * CELULA * CELULA) / (colunas * CELULA * linhas * CELULA)
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

  for (const caminho of PAGINAS) {
    // B-1: a figura (painel de mel + frase de apoio) é uma coluna só: mesma borda esquerda e mesma largura, a frase
    // a no máximo 16 px do painel, e o painel ocupa pelo menos 60% da coluna (nenhuma ilha estreita no meio).
    roda(
      `${caminho} a 1440: o painel, a frase de apoio e a coluna da figura têm a mesma borda e a mesma largura; o painel enche a coluna`,
      () => {
        const m = medirPagina(caminho, 1440, 900, true)
        expect(m.painel.x, 'a borda esquerda do painel e a da coluna da figura').toBe(m.figura.x)
        expect(m.apoio.x, 'a borda esquerda da frase de apoio e a do painel').toBe(m.painel.x)
        expect(m.painel.width, 'a largura do painel e a da coluna da figura').toBe(m.figura.width)
        expect(m.apoio.width, 'a largura da frase de apoio e a do painel').toBe(m.painel.width)
        expect(m.painel.width / m.figura.width).toBeGreaterThanOrEqual(0.6)
        const vao = m.apoio.y - m.painel.bottom
        expect(vao, `a frase de apoio fica ${vao} px abaixo do painel`).toBeGreaterThanOrEqual(0)
        expect(vao).toBeLessThanOrEqual(16)
        // O desenho fica dentro do painel.
        expect(m.desenho.x).toBeGreaterThanOrEqual(m.painel.x)
        expect(m.desenho.right).toBeLessThanOrEqual(m.painel.right)
        expect(m.scrollWidth).toBeLessThanOrEqual(m.innerWidth)
      },
      TEMPO_DO_CHROME,
    )

    roda(
      `${caminho} a 1440: o maior vão vazio da abertura não passa de 25% da área dela`,
      () => {
        const m = medirPagina(caminho, 1440, 900)
        const vazio = fracaoVazia(m)
        expect(vazio, `o maior vão vazio da abertura: ${vazio.toFixed(3)} da área`).toBeLessThanOrEqual(0.25)
      },
      TEMPO_DO_CHROME,
    )

    // O texto de leitura: menos de 80 letras por linha; parágrafo com `pretty` e título com `balance`.
    roda(
      `${caminho} a 1440: menos de 80 letras por linha, parágrafos com text-wrap pretty e títulos com balance`,
      () => {
        const m = medirPagina(caminho, 1440, 900)
        expect(violacoesDasLinhasCheias(caminho, m.linhasDosParagrafos)).toEqual([])
        for (const letras of m.letrasPorLinha) expect(letras).toBeLessThan(80)
        expect(m.quebraDoParagrafo).toBe('pretty')
        expect(m.quebraDoTitulo).toBe('balance')
      },
      TEMPO_DO_CHROME,
    )

    // VIS-4-r3-I-02: a coluna de duas frações não pode deixar uma linha do h1 passar da própria coluna, e a coluna
    // do h1 não passa da medida de leitura (`max-w-leitura`, 640 px).
    roda(
      `VIS-4-r3-I-02 ${caminho} a 1100 e 1440: as linhas do h1 ficam dentro da coluna do h1 e a coluna não passa de 640 px`,
      () => {
        // As duas larguras são medidas antes de afirmar, para a mensagem nomear todas as que falham.
        const problemas: string[] = []
        for (const largura of [1100, 1440]) {
          const m = medirPagina(caminho, largura, 900)
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

    // B-2: no celular o primeiro parágrafo de leitura começa dentro da primeira tela.
    // Exclusão decidida (decisão do líder em 17/11, DIRECAO.md): SÓ a asserção de y (o primeiro parágrafo de leitura
    // começar na primeira tela) de /privacidade a 390 fica excluída, porque a ordem da cópia é protegida. Ela vira um
    // caso nomeado com `it.fails`, que deixa o VERMELHO visível e fica vermelho assim que a asserção passar a passar.
    // Todos os outros critérios de /privacidade a 390 (parágrafo existe, painel, eixos, vão vazio, rolagem) seguem como
    // portão comum. As outras cinco páginas afirmam tudo como antes.
    if (caminho === '/privacidade') {
      roda(
        `${caminho} a 390: o painel tem a largura da coluna do texto, o primeiro parágrafo de leitura existe e nenhum vão vazio passa de 25%`,
        () => {
          const m = medirPagina(caminho, 390, 844, true)
          expect(m.primeiroParagrafo, 'a segunda seção tem um parágrafo de leitura').not.toBeNull()
          expect(m.painel.width / m.cabeca.width, 'o painel enche a coluna do texto').toBeGreaterThanOrEqual(0.98)
          expect(m.painel.x).toBe(m.cabeca.x)
          expect(m.apoio.x).toBe(m.painel.x)
          expect(m.apoio.width).toBe(m.painel.width)
          const vazio = fracaoVazia(m)
          expect(vazio, `o maior vão vazio da abertura: ${vazio.toFixed(3)} da área`).toBeLessThanOrEqual(0.25)
          expect(m.scrollWidth).toBeLessThanOrEqual(m.innerWidth)
        },
        TEMPO_DO_CHROME,
      )
      roda.fails(
        'POL-TXT:A-2 @ /privacidade 390: excluded, protected copy order; recomposed by the visual reset (DIRECAO.md)',
        () => {
          const m = medirPagina(caminho, 390, 844, true)
          expect(m.primeiroParagrafo, 'a segunda seção tem um parágrafo de leitura').not.toBeNull()
          const marcos = `abertura ${Math.round(m.abertura.y)}-${Math.round(m.abertura.bottom)}, painel ${Math.round(m.painel.y)}-${Math.round(m.painel.bottom)}, apoio ${Math.round(m.apoio.y)}-${Math.round(m.apoio.bottom)}`
          expect(m.primeiroParagrafo!.y, `o primeiro parágrafo de leitura começa em ${Math.round(m.primeiroParagrafo!.y)} (${marcos})`).toBeLessThanOrEqual(844)
        },
        TEMPO_DO_CHROME,
      )
    } else {
      roda(
        `${caminho} a 390: o painel tem a largura da coluna do texto, o primeiro parágrafo de leitura começa na primeira tela e nenhum vão vazio passa de 25%`,
        () => {
          const m = medirPagina(caminho, 390, 844, true)
          expect(m.primeiroParagrafo, 'a segunda seção tem um parágrafo de leitura').not.toBeNull()
          const marcos = `abertura ${Math.round(m.abertura.y)}-${Math.round(m.abertura.bottom)}, painel ${Math.round(m.painel.y)}-${Math.round(m.painel.bottom)}, apoio ${Math.round(m.apoio.y)}-${Math.round(m.apoio.bottom)}`
          expect(m.primeiroParagrafo!.y, `o primeiro parágrafo de leitura começa em ${Math.round(m.primeiroParagrafo!.y)} (${marcos})`).toBeLessThanOrEqual(844)
          expect(m.painel.width / m.cabeca.width, 'o painel enche a coluna do texto').toBeGreaterThanOrEqual(0.98)
          expect(m.painel.x).toBe(m.cabeca.x)
          expect(m.apoio.x).toBe(m.painel.x)
          expect(m.apoio.width).toBe(m.painel.width)
          const vazio = fracaoVazia(m)
          expect(vazio, `o maior vão vazio da abertura: ${vazio.toFixed(3)} da área`).toBeLessThanOrEqual(0.25)
          expect(m.scrollWidth).toBeLessThanOrEqual(m.innerWidth)
        },
        TEMPO_DO_CHROME,
      )
    }
  }
})
