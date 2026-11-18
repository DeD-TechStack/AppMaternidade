import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'

// BASE-DEF-1: a legenda da tabela de comparação e os títulos de duas linhas do Início, medidos num Chrome de
// verdade (o jsdom não tem layout). Como em casca/geometria.test.tsx: a página que o site renderiza no jsdom vira
// um html com o CSS já construído (web/dist/assets/*.css), e o Chrome sem janela mede com getBoundingClientRect
// depois que as fontes carregam. Sem o Chrome ou sem o build, os testes de geometria pulam e dizem por quê.
// AUD-01 (a área que rola recebe foco e tem nome) é DOM puro e roda sempre.

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const TOLERANCIA = 0.5

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

const motivoDoPulo: string | null = !existsSync(CHROME)
  ? `Chrome não encontrado em ${CHROME}`
  : arquivosCss().length === 0
    ? 'sem web/dist/assets/*.css: rode `npm run build` antes'
    : null

interface Legenda {
  texto: string
  right: number
  scrollWidth: number
  clientWidth: number
  rolagemLeft: number
  rolagemRight: number
}

interface Titulo {
  texto: string
  /** A largura somada de cada linha visual, de cima para baixo. */
  linhas: number[]
  /** A largura útil da coluna do título: a caixa do h1/h2 sem o padding, arredondada. */
  coluna: number
  /** Quantas palavras ficam partidas em mais de uma linha visual. */
  palavrasQuebradas: number
}

interface Medida {
  erro?: string
  innerWidth: number
  fontes: string
  faces: string[]
  scrollWidth: number
  legendas: Legenda[]
  titulos: Titulo[]
}

// O script de dentro da página: espera as fontes e escreve a medida em JSON num <pre> escondido (--dump-dom).
const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  const responder = (texto) => { saida.textContent = texto; if (window.parent !== window) window.parent.postMessage(texto, '*') }
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const legendas = [...document.querySelectorAll('table.cm-tabela caption')].map((c) => {
      const b = c.getBoundingClientRect()
      const rolagem = c.closest('.cm-tabela-rolagem').getBoundingClientRect()
      return { texto: c.textContent.trim(), right: b.right, scrollWidth: c.scrollWidth, clientWidth: c.clientWidth, rolagemLeft: rolagem.left, rolagemRight: rolagem.right }
    })
    // As linhas animadas do título (aria-hidden): a largura de cada linha visual, agrupando os retângulos pelo topo.
    const titulos = [...document.querySelectorAll('h1, h2')].filter((t) => t.textContent.trim().length > 0 && t.getClientRects().length > 0 && !t.classList.contains('sr-only')).map((t) => {
      const partes = t.querySelectorAll('[aria-hidden="true"]').length > 0 ? [...t.querySelectorAll('[aria-hidden="true"]')] : [t]
      const porTopo = new Map()
      // Só os retângulos do texto: selectNodeContents(span) devolve também a caixa do próprio span de bloco
      // (a coluna inteira), que somada ao texto inflava a linha acima da coluna.
      for (const parte of partes) {
        const andadorDeLinhas = document.createTreeWalker(parte, NodeFilter.SHOW_TEXT)
        for (let no = andadorDeLinhas.nextNode(); no; no = andadorDeLinhas.nextNode()) {
          const faixa = document.createRange()
          faixa.selectNodeContents(no)
          for (const r of faixa.getClientRects()) {
            if (r.width < 1) continue
            const topo = [...porTopo.keys()].find((k) => Math.abs(k - r.top) < r.height / 2) ?? r.top
            porTopo.set(topo, (porTopo.get(topo) ?? 0) + r.width)
          }
        }
      }
      const linhas = [...porTopo.entries()].sort((a, b) => a[0] - b[0]).map((e) => Math.round(e[1]))
      // A coluna: a caixa do título sem o padding. As palavras partidas: cada palavra vira um Range, e ela está
      // partida quando os retângulos dela caem em dois ou mais topos distintos (a mesma regra de agrupar das linhas).
      const estilo = getComputedStyle(t)
      const coluna = Math.round(t.getBoundingClientRect().width - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight))
      let palavrasQuebradas = 0
      for (const parte of partes) {
        const andador = document.createTreeWalker(parte, NodeFilter.SHOW_TEXT)
        for (let no = andador.nextNode(); no; no = andador.nextNode()) {
          for (const palavra of no.textContent.matchAll(/\\S+/g)) {
            const faixaDaPalavra = document.createRange()
            faixaDaPalavra.setStart(no, palavra.index)
            faixaDaPalavra.setEnd(no, palavra.index + palavra[0].length)
            const topos = []
            for (const r of faixaDaPalavra.getClientRects()) {
              if (r.width < 1) continue
              if (!topos.some((k) => Math.abs(k - r.top) < r.height / 2)) topos.push(r.top)
            }
            if (topos.length >= 2) palavrasQuebradas += 1
          }
        }
      }
      return { texto: t.textContent.trim(), linhas, coluna, palavrasQuebradas }
    })
    responder(JSON.stringify({
      innerWidth: window.innerWidth,
      fontes: document.fonts.status,
      faces: [...document.fonts].map((f) => f.family + ':' + f.status),
      scrollWidth: document.documentElement.scrollWidth,
      legendas,
      titulos,
    }))
  } catch (e) {
    responder(JSON.stringify({ erro: String(e), innerWidth: 0, fontes: '', faces: [], scrollWidth: 0, legendas: [], titulos: [] }))
  }
})()
`

// Sem animação nem transição: a medida é do estado final, e a faixa de selos (animação infinita) não prende o tempo virtual.
const SEM_MOVIMENTO = '<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>'

/**
 * O CSS do build aponta as fontes por `/assets/...` ou, com o subcaminho do Pages (vite.config.ts), por
 * `/AppMaternidade/assets/...`: numa página file:// as duas formas passam a apontar para web/dist/assets.
 */
// A limpeza da pasta temporária do Chrome nunca decide o resultado do teste: no Windows o Chrome pode segurar o perfil
// e o `rmSync` lançaria EPERM do `finally`. A falha vira só um aviso (caminho, código e mensagem), sem throw.
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

function cssComFontesDoDist(nome: string): string {
  const base = `${pathToFileURL(PASTA_CSS).href}/`
  return readFileSync(join(PASTA_CSS, nome), 'utf8').replace(/url\((["']?)\/(?!\/)(?:[^)"'/]+\/)*?assets\//g, (_t, aspas: string) => `url(${aspas}${base}`)
}

function medirNoChrome(corpoHtml: string, largura: number, altura: number): Medida {
  const pasta = mkdtempSync(join(tmpdir(), 'cm-tabela-geometria-'))
  try {
    const perfil = join(pasta, 'perfil')
    mkdirSync(perfil)
    const folhas = arquivosCss().map((nome, i) => {
      const arquivo = join(pasta, `folha-${i}.css`)
      writeFileSync(arquivo, cssComFontesDoDist(nome), 'utf8')
      return `<link rel="stylesheet" href="${pathToFileURL(arquivo).href}">`
    })
    const pagina = join(pasta, 'pagina.html')
    writeFileSync(
      pagina,
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}${SEM_MOVIMENTO}</head>` +
        `<body><div id="root">${corpoHtml}</div><pre id="geometria" hidden></pre><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    // O Chrome sem janela não passa de ~500 px de largura: abaixo disso a página vai num iframe da largura pedida.
    let alvo = pagina
    if (largura < 500) {
      alvo = join(pasta, 'envoltorio.html')
      writeFileSync(
        alvo,
        `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;width:${largura}px;height:${altura}px"></iframe><pre id="geometria" hidden></pre>` +
          `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
        'utf8',
      )
    }
    const resultado = spawnSync(
      CHROME,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-crashpad-for-testing',
        '--no-first-run',
        '--allow-file-access-from-files',
        '--hide-scrollbars',
        `--user-data-dir=${perfil}`,
        '--force-device-scale-factor=1',
        // O Chrome sem janela soma 16 px de moldura: com +16 o innerWidth fica igual à largura pedida.
        `--window-size=${Math.max(largura, 600) + 16},${altura}`,
        '--virtual-time-budget=5000',
        '--dump-dom',
        pathToFileURL(alvo).href,
      ],
      { encoding: 'utf8', timeout: 100_000, maxBuffer: 128 * 1024 * 1024 },
    )
    // Falha fechada: status diferente de 0, sinal ou medida ausente param o teste.
    if (resultado.status !== 0 || resultado.signal) {
      throw new Error(`O Chrome saiu com status ${resultado.status} e sinal ${resultado.signal}: ${resultado.stderr ?? ''}`)
    }
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.stdout ?? '')
    if (!achado || achado[1].trim() === '') {
      throw new Error(`O Chrome não devolveu a medida (erro ${resultado.error?.message ?? 'nenhum'}): ${resultado.stderr ?? ''}`)
    }
    return JSON.parse(achado[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')) as Medida
  } finally {
    limparPasta(pasta)
  }
}

async function medirRota(caminho: string, largura: number, altura: number): Promise<Medida> {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  renderizarRota(caminho, { sessao: null })
  await aguardarCarga()
  const medida = medirNoChrome(document.querySelector('main')!.outerHTML, largura, altura)
  expect(medida.erro).toBeUndefined()
  expect(medida.innerWidth).toBe(largura)
  expect(medida.fontes).toBe('loaded')
  expect(medida.faces.some((face) => face.endsWith(':loaded')), medida.faces.join(', ')).toBe(true)
  return medida
}

/** Duas linhas no máximo, ou cada linha com pelo menos 40 % da mais larga (o card BASE-DEF-1, I-1). */
function equilibrado(linhas: number[]): boolean {
  if (linhas.length <= 2) return linhas.every((l) => l > 0)
  const maior = Math.max(...linhas)
  return linhas.every((l) => l >= 0.4 * maior)
}

/** Nenhuma linha passa da coluna (com 1 px de folga de arredondamento) e nenhuma palavra fica partida no meio. */
function semEstouro(titulo: { linhas: number[]; coluna: number; palavrasQuebradas: number }): boolean {
  return titulo.linhas.every((l) => l <= titulo.coluna + 1) && titulo.palavrasQuebradas === 0
}

describe('a área que rola a tabela de comparação (AUD-01)', () => {
  afterEach(cleanup)

  for (const caminho of ['/sistema', '/']) {
    it(`em ${caminho}: recebe o foco do Tab e tem o papel de região com o nome da legenda`, async () => {
      renderizarRota(caminho, { sessao: null })
      await aguardarCarga()
      const tabela = screen.getByRole('table')
      const legenda = tabela.querySelector('caption')!.textContent
      const rolagem = tabela.closest('.cm-tabela-rolagem')!
      expect(rolagem.getAttribute('tabindex')).toBe('0')
      expect(rolagem.getAttribute('role')).toBe('region')
      expect(rolagem.getAttribute('aria-label')).toBe(legenda)
      expect(screen.getByRole('region', { name: legenda! })).toBe(rolagem)
    })
  }
})

describe('o controle negativo da regra de equilíbrio', () => {
  it('reprova "De madrugada, / com uma / mão só." e aprova duas linhas', () => {
    expect(equilibrado([263, 120, 98])).toBe(false)
    expect(equilibrado([264, 285])).toBe(true)
    expect(equilibrado([385, 663, 476])).toBe(true)
    expect(equilibrado([])).toBe(true)
  })
})

describe('o controle negativo da regra de estouro', () => {
  it('reprova a linha mais larga que a coluna e a palavra partida, e aprova o título que cabe', () => {
    expect(semEstouro({ linhas: [641, 1131, 311], coluna: 1200, palavrasQuebradas: 0 })).toBe(true)
    expect(semEstouro({ linhas: [641, 1331, 311], coluna: 1200, palavrasQuebradas: 0 })).toBe(false)
    expect(semEstouro({ linhas: [100], coluna: 1200, palavrasQuebradas: 1 })).toBe(false)
  })
})

describe(`a geometria da legenda e dos títulos no Chrome${motivoDoPulo ? ` (pulado: ${motivoDoPulo})` : ''}`, () => {
  const LARGURA_ORIGINAL = window.innerWidth
  afterEach(() => {
    cleanup()
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: LARGURA_ORIGINAL })
  })

  for (const [largura, altura] of [
    [390, 844],
    [320, 256],
  ] as const) {
    it.skipIf(motivoDoPulo !== null)(
      `/sistema em ${largura}: a legenda cabe inteira na área visível da tabela e a página não rola para os lados`,
      async () => {
        const medida = await medirRota('/sistema', largura, altura)
        expect(medida.legendas).toHaveLength(1)
        const [legenda] = medida.legendas
        expect(legenda.texto).toMatch(/caderno/)
        expect(legenda.right, `a borda direita da legenda (${legenda.right}) passa da janela de ${largura}`).toBeLessThanOrEqual(largura + TOLERANCIA)
        expect(legenda.right, `a borda direita da legenda (${legenda.right}) passa da área visível (${legenda.rolagemRight})`).toBeLessThanOrEqual(
          legenda.rolagemRight + TOLERANCIA,
        )
        expect(legenda.scrollWidth, 'texto cortado dentro da legenda').toBeLessThanOrEqual(legenda.clientWidth)
        expect(medida.scrollWidth, `a página rola para os lados em ${largura}`).toBeLessThanOrEqual(largura)
      },
      120_000,
    )
  }

  for (const [largura, altura] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    it.skipIf(motivoDoPulo !== null)(
      `Início em ${largura}: o título da madrugada quebra em linhas equilibradas e o h1 não estoura a coluna nem parte uma palavra`,
      async () => {
        const medida = await medirRota('/', largura, altura)
        const madrugada = medida.titulos.find((t) => t.texto.startsWith('De madrugada'))
        const heroi = medida.titulos.find((t) => t.texto.startsWith('A rotina do bebê'))
        for (const titulo of [madrugada, heroi]) {
          expect(titulo, 'título não encontrado').toBeDefined()
          expect(titulo!.linhas.length).toBeGreaterThan(0)
        }
        expect(equilibrado(madrugada!.linhas), `${madrugada!.texto}: linhas ${madrugada!.linhas.join(' / ')}`).toBe(true)
        expect(semEstouro(heroi!), 'h1 estoura a coluna ou quebra uma palavra: ' + JSON.stringify(heroi)).toBe(true)
      },
      120_000,
    )
  }
})
