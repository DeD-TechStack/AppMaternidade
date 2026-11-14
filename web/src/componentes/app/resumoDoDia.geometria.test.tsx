import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import { adiarRotina } from '../../teste/adiado.ts'
import { renderizarRota, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'

// "Hoje até agora" (ResumoDoDia) num Chrome de verdade. O jsdom não tem layout: aqui o #root inteiro de
// /app/hoje (a página real, com a casca, o quadro e o CSS já construído em web/dist/assets) vira um html, e o
// Chrome sem janela mede as quatro células e a lista com getBoundingClientRect. Esperado: quatro células
// iguais numa linha em 1440 e uma grade 2x2 em 390. Só caixas medidas contam, nunca nomes de classe.
// Sem Chrome ou sem o build, o teste FALHA (não pula): `npm run build` antes.

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const TOLERANCIA = 1
const CELULAS = 4

interface Janela {
  largura: number
  altura: number
}
const CELULAR: Janela = { largura: 390, altura: 844 }
const DESKTOP: Janela = { largura: 1440, altura: 900 }

interface Celula {
  x: number
  right: number
  y: number
  bottom: number
  width: number
  height: number
}

interface Medida {
  erro?: string
  innerWidth: number
  innerHeight: number
  scrollWidth: number
  fontes: string
  faces: string[]
  lista: Celula | null
  celulas: Celula[]
}

// O script de dentro da página: espera as fontes (depois de forçar o primeiro layout) e escreve a medida em
// JSON num <pre> escondido, que o --dump-dom devolve.
const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  const caixa = (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height }
  }
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const lista = document.querySelector('section[data-resumo] ul')
    const texto = JSON.stringify({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      fontes: document.fonts.status,
      faces: [...document.fonts].map((f) => f.family + ':' + f.status),
      lista: lista ? caixa(lista) : null,
      celulas: lista ? [...lista.querySelectorAll(':scope > li')].map(caixa) : [],
    })
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  } catch (e) {
    const texto = JSON.stringify({ erro: String(e), innerWidth: 0, innerHeight: 0, scrollWidth: 0, fontes: '', faces: [], lista: null, celulas: [] })
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  }
})()
`

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

/** O CSS do build aponta as fontes por `/assets/...`: numa página file:// isso vira a raiz do disco, então as URLs absolutas passam a apontar para o dist. */
function cssComFontesDoDist(nome: string): string {
  const base = `${pathToFileURL(PASTA_DIST).href}/`
  return readFileSync(join(PASTA_CSS, nome), 'utf8').replace(/url\((["']?)\/(?!\/)/g, (_t, aspas: string) => `url(${aspas}${base}`)
}

function exigirAmbiente() {
  if (!existsSync(CHROME)) throw new Error(`Chrome não encontrado em ${CHROME}`)
  if (arquivosCss().length === 0) throw new Error('Sem web/dist/assets/*.css: rode `npm run build` antes.')
}

/** Grava a página (e, abaixo de 500 px, o iframe da largura pedida) numa pasta temporária e roda o Chrome sobre ela. */
function comPaginaNoChrome<T>(raizHtml: string, janela: Janela, argumentosExtras: (pasta: string) => string[], aoTerminar: (saida: string, pasta: string) => T): T {
  exigirAmbiente()
  const pasta = mkdtempSync(join(tmpdir(), 'resumo-geometria-'))
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
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        `<body><div id="root">${raizHtml}</div><pre id="geometria" hidden></pre><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    // O Chrome sem janela não passa de ~500 px de largura: abaixo disso a página vai num iframe da largura (e da
    // altura) pedida, e devolve a medida por postMessage.
    let alvo = pagina
    if (janela.largura < 500) {
      alvo = join(pasta, 'envoltorio.html')
      writeFileSync(
        alvo,
        `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;display:block;width:${janela.largura}px;height:${janela.altura}px"></iframe><pre id="geometria" hidden></pre>` +
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
        `--user-data-dir=${perfil}`,
        '--force-device-scale-factor=1',
        // O Chrome sem janela soma 16 px de moldura: com +16 o innerWidth fica igual à largura pedida.
        `--window-size=${Math.max(janela.largura, 600) + 16},${janela.altura}`,
        '--virtual-time-budget=3000',
        ...argumentosExtras(pasta),
        pathToFileURL(alvo).href,
      ],
      { encoding: 'utf8', timeout: 45_000, maxBuffer: 64 * 1024 * 1024 },
    )
    return aoTerminar(resultado.stdout ?? '', pasta)
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

function medirNoChrome(raizHtml: string, janela: Janela): Medida {
  return comPaginaNoChrome(
    raizHtml,
    janela,
    () => ['--dump-dom'],
    (saida) => {
      const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(saida)
      if (!achado || achado[1].trim() === '') {
        throw new Error(`O Chrome não devolveu a medida em ${janela.largura}x${janela.altura}.`)
      }
      // O --dump-dom serializa o texto do <pre> com entidades HTML (aspas, &, <).
      const json = achado[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      return JSON.parse(json) as Medida
    },
  )
}

function capturarNoChrome(raizHtml: string, janela: Janela, destino: string) {
  mkdirSync(resolve(destino, '..'), { recursive: true })
  comPaginaNoChrome(
    raizHtml,
    janela,
    () => [`--screenshot=${destino}`],
    () => {
      if (!existsSync(destino)) throw new Error(`O Chrome não gravou a captura em ${destino}.`)
    },
  )
}

const PASTA_DAS_CAPTURAS = process.env.AUD_CAPTURAS

/** O #root do jsdom é o `container` do render: a página inteira, como a pessoa a vê. */
function raizDaPagina(container: HTMLElement): string {
  expect(container.querySelector('section[data-resumo] ul'), 'a página não tem a grade de "Hoje até agora"').not.toBeNull()
  return container.innerHTML
}

function conferirMedida(medida: Medida, janela: Janela) {
  expect(medida.erro, 'o script de medida falhou no Chrome').toBeUndefined()
  expect(medida.innerWidth, 'a largura da janela do Chrome').toBe(janela.largura)
  expect(medida.fontes, 'as fontes carregaram').toBe('loaded')
  expect(medida.faces.some((face) => face.endsWith(':loaded'))).toBe(true)
  expect(medida.lista, 'a lista de "Hoje até agora" não foi medida').not.toBeNull()
}

/** I-3: nada passa da lista e a página não rola na horizontal. Vale para toda medida. */
function conferirSemEstouro(medida: Medida) {
  const lista = medida.lista!
  for (const [i, celula] of medida.celulas.entries()) {
    expect(celula.right, `a célula ${i + 1} (direita ${celula.right}) passa da lista (direita ${lista.right})`).toBeLessThanOrEqual(lista.right + TOLERANCIA)
  }
  expect(medida.scrollWidth, `scrollWidth ${medida.scrollWidth} passa de innerWidth ${medida.innerWidth}`).toBeLessThanOrEqual(medida.innerWidth + TOLERANCIA)
}

const iguais = (valores: number[]) => Math.max(...valores) - Math.min(...valores) <= TOLERANCIA
const dizer = (valores: number[]) => valores.map((valor) => Math.round(valor * 10) / 10).join(' / ')

function conferirUmaLinha(medida: Medida) {
  expect(medida.celulas, 'quantas células mediu').toHaveLength(CELULAS)
  const larguras = medida.celulas.map((celula) => celula.width)
  const topos = medida.celulas.map((celula) => celula.y)
  expect(iguais(larguras), `as 4 células têm a mesma largura (medido: ${dizer(larguras)})`).toBe(true)
  expect(iguais(topos), `as 4 células ficam numa linha só (topos: ${dizer(topos)})`).toBe(true)
}

function conferirGrade2x2(medida: Medida) {
  expect(medida.celulas, 'quantas células mediu').toHaveLength(CELULAS)
  const [a, b, c, d] = medida.celulas
  const larguras = medida.celulas.map((celula) => celula.width)
  expect(iguais(larguras), `as 4 células têm a mesma largura (medido: ${dizer(larguras)})`).toBe(true)
  const topos = medida.celulas.map((celula) => celula.y)
  expect(Math.abs(a.y - b.y), `1ª e 2ª na mesma linha (topos: ${dizer(topos)})`).toBeLessThanOrEqual(TOLERANCIA)
  expect(Math.abs(c.y - d.y), `3ª e 4ª na mesma linha (topos: ${dizer(topos)})`).toBeLessThanOrEqual(TOLERANCIA)
  expect(c.y - a.y, `a 2ª linha fica abaixo da 1ª (topos: ${dizer(topos)})`).toBeGreaterThan(TOLERANCIA)
  const esquerdas = medida.celulas.map((celula) => celula.x)
  expect(Math.abs(a.x - c.x), `1ª e 3ª na mesma coluna (esquerdas: ${dizer(esquerdas)})`).toBeLessThanOrEqual(TOLERANCIA)
  expect(Math.abs(b.x - d.x), `2ª e 4ª na mesma coluna (esquerdas: ${dizer(esquerdas)})`).toBeLessThanOrEqual(TOLERANCIA)
}

const CASOS = [
  { nome: 'dia preenchido', opcoes: { sessao: 'juliana', diaCompleto: true } as const, captura: true },
  { nome: 'dia vazio (zeros)', opcoes: { sessao: 'juliana', semRegistros: true } as const, captura: false },
]

describe('a geometria de "Hoje até agora" no Chrome', () => {
  for (const caso of CASOS) {
    it(
      `${caso.nome}, 1440x900: quatro células iguais numa linha`,
      async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', caso.opcoes)
        const raiz = raizDaPagina(container)
        if (caso.captura && PASTA_DAS_CAPTURAS) capturarNoChrome(raiz, DESKTOP, join(PASTA_DAS_CAPTURAS, 'hoje-1440x900.png'))
        const medida = medirNoChrome(raiz, DESKTOP)
        conferirMedida(medida, DESKTOP)
        conferirSemEstouro(medida)
        conferirUmaLinha(medida)
      },
      60_000,
    )

    it(
      `${caso.nome}, 390x844: grade 2x2`,
      async () => {
        const { container } = await renderizarRotaPronta('/app/hoje', caso.opcoes)
        const raiz = raizDaPagina(container)
        if (caso.captura && PASTA_DAS_CAPTURAS) capturarNoChrome(raiz, CELULAR, join(PASTA_DAS_CAPTURAS, 'hoje-390x844.png'))
        const medida = medirNoChrome(raiz, CELULAR)
        conferirMedida(medida, CELULAR)
        conferirSemEstouro(medida)
        conferirGrade2x2(medida)
      },
      60_000,
    )
  }
})

describe('"Hoje até agora" sem as quatro células enquanto a leitura não termina', () => {
  it('carregando: a seção existe como esqueleto e não tem lista de células', async () => {
    const mundo = criarMundoDeTeste({ sessao: 'juliana', diaCompleto: true })
    const adiada = adiarRotina(mundo.rotina)
    adiada.adiar('doDia')
    const { container } = renderizarRota('/app/hoje', { mundo: { ...mundo, rotina: adiada.dados } })

    // O esqueleto de "Hoje até agora" só aparece com o bebê ativo lido; a leitura do dia segue presa.
    await waitFor(() => expect(container.querySelector('[data-secao-estado="carregando"]'), 'o esqueleto de carregando não apareceu').not.toBeNull())
    expect(adiada.presas('doDia'), 'a leitura do dia deveria estar presa').toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-resumo] li')).toHaveLength(0)
    expect(container.querySelector('[data-resumo] ul')).toBeNull()
    adiada.liberarTodas('doDia')
  })

  it('erro: a falha da leitura do dia mostra o aviso e nenhuma célula', async () => {
    const mundo = criarMundoDeTeste({ sessao: 'juliana', diaCompleto: true })
    simularFalhaRotina(mundo.rotina, 'doDia', 'rede')
    const { container } = await renderizarRotaPronta('/app/hoje', { mundo })

    expect(container.querySelector('[data-secao-estado="erro"]'), 'o estado de erro da seção não apareceu').not.toBeNull()
    expect(container.querySelectorAll('[data-resumo] li')).toHaveLength(0)
    expect(container.querySelector('[data-resumo] ul')).toBeNull()
  })
})
