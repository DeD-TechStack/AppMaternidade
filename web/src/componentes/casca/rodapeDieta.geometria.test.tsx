import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { COLUNAS_DO_RODAPE } from './textos.ts'

// FOOTER-1 (rodapé de dieta): a geometria do rodapé público num Chrome de verdade, com o CSS já construído
// (web/dist/assets/*.css). O jsdom não tem layout: aqui o site real (cada página pública, renderizada pelo roteador)
// vira um arquivo html que liga o CSS do build, e o Chrome sem janela mede o rodapé em quatro larguras (390, 768, 1024
// e 1440) de uma vez, cada uma num iframe da largura pedida. Duas rodadas por página (dia e madrugada).
//
// FALHA FECHADA: este arquivo nunca pula. Chrome ausente (CHROME_PATH apontando para um arquivo que não existe vale como
// ausente, sem cair nos caminhos padrão), `web/dist` sem CSS, o Chrome terminando com status diferente de 0, com sinal,
// por tempo esgotado ou sem devolver a medida desta rodada (um código de verificação por execução) derrubam os testes.
// Rode `npm run build` antes.

const CHROME_DO_AMBIENTE = process.env.CHROME_PATH
const CANDIDATOS_DO_CHROME: Record<string, string[]> = {
  win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
}
const BUSCADOS = CHROME_DO_AMBIENTE ? [CHROME_DO_AMBIENTE] : (CANDIDATOS_DO_CHROME[process.platform] ?? [])
const CHROME: string = BUSCADOS.find((caminho) => existsSync(caminho)) ?? BUSCADOS[0] ?? 'chrome'
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')

const PAGINAS = ['/', '/como-funciona', '/privacidade', '/contato', '/rota-que-nao-existe']
const LARGURAS = [390, 768, 1024, 1440]
const ALTURA_DA_JANELA: Record<number, number> = { 390: 844, 768: 900, 1024: 900, 1440: 900 }
const TEMAS = ['claro', 'madrugada'] as const
type Tema = (typeof TEMAS)[number]
// Guarda de regressão, não meta (FOOTER-3): abaixo de 768 os 11 links são duas colunas em seis fileiras, ~600 px em 320 na madrugada.
const TETO_DA_ALTURA: Record<number, number> = { 390: 640, 768: 440, 1024: 440, 1440: 440 }
const ALVO_MINIMO: Record<Tema, number> = { claro: 44, madrugada: 56 }
const MEL = ['rgb(242, 193, 78)', 'rgb(247, 214, 132)']
const TOLERANCIA = 0.5
const LINKS = COLUNAS_DO_RODAPE.flatMap((coluna) => coluna.links)

interface Caixa {
  x: number
  right: number
  y: number
  bottom: number
  width: number
  height: number
}
interface LinkMedido extends Caixa {
  rotulo: string
  para: string
  linhas: number
  entrelinha: number
}
interface TituloMedido extends Caixa {
  texto: string
  position: string
  visibility: string
  clip: string
  clipPath: string
}
interface TextoMedido {
  texto: string
  cor: string
  fundo: string
  razao: number
  px: number
}
interface Quadro {
  erro?: string
  nonce: string
  innerWidth: number
  innerHeight: number
  scrollWidth: number
  fontes: string
  rodape: Caixa | null
  h1: number | null
  nome: (Caixa & { px: number }) | null
  nav: Caixa | null
  maiorTexto: { px: number; texto: string }
  mel: string[]
  links: LinkMedido[]
  titulos: TituloMedido[]
  textos: TextoMedido[]
  com200: { direita: number; rodapeScrollWidth: number; rodapeClientWidth: number }
}

// O script de dentro de cada página: espera as fontes (depois de forçar o primeiro layout, quando elas começam a
// carregar), mede o rodapé e devolve o JSON ao iframe de fora por postMessage. A medida com o texto a 200 % vem por último.
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
    const numeros = (texto) => (texto.match(/-?[\\d.]+(?:e-?\\d+)?/g) || []).map(Number)
    const cor = (texto) => {
      const n = numeros(texto)
      const escala = texto.startsWith('color(') ? 255 : 1
      return { r: n[0] * escala, g: n[1] * escala, b: n[2] * escala, a: n.length > 3 ? n[3] : 1 }
    }
    const canal = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
    const luz = (c) => 0.2126 * canal(c.r) + 0.7152 * canal(c.g) + 0.0722 * canal(c.b)
    const fundoDe = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const c = getComputedStyle(e).backgroundColor
        if (cor(c).a > 0.99) return c
      }
      return 'rgb(255, 255, 255)'
    }
    const razao = (a, b) => { const x = luz(cor(a)), y = luz(cor(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

    const rodape = document.querySelector('footer[data-rodape]')
    const h1 = document.querySelector('main h1') || document.querySelector('h1')
    const nome = rodape && rodape.querySelector('[data-nome-rodape]')
    const nav = rodape && rodape.querySelector('nav')

    const textos = []
    let maiorTexto = { px: 0, texto: '' }
    const vistos = new Set()
    if (rodape) {
      const andador = document.createTreeWalker(rodape, NodeFilter.SHOW_TEXT)
      for (let no = andador.nextNode(); no; no = andador.nextNode()) {
        const texto = no.textContent.trim()
        if (!texto) continue
        const pai = no.parentElement
        const px = parseFloat(getComputedStyle(pai).fontSize)
        if (px > maiorTexto.px) maiorTexto = { px, texto }
        const r = pai.getBoundingClientRect()
        if (vistos.has(pai) || r.width <= 1 || r.height <= 1) continue
        vistos.add(pai)
        const c = getComputedStyle(pai).color
        const f = fundoDe(pai)
        textos.push({ texto, cor: c, fundo: f, razao: razao(c, f), px })
      }
    }

    const mel = []
    if (rodape) {
      for (const el of [rodape, ...rodape.querySelectorAll('*')]) {
        const fundo = getComputedStyle(el).backgroundColor
        if (fundo === 'rgb(242, 193, 78)' || fundo === 'rgb(247, 214, 132)') mel.push(el.tagName.toLowerCase() + '.' + el.className + ' ' + fundo)
      }
    }

    const links = rodape ? [...rodape.querySelectorAll('a')].map((a) => {
      const intervalo = document.createRange()
      intervalo.selectNodeContents(a)
      const linhas = new Set([...intervalo.getClientRects()].map((r) => Math.round(r.top))).size
      return { rotulo: a.textContent.trim(), para: a.getAttribute('href'), linhas, entrelinha: parseFloat(getComputedStyle(a).lineHeight), ...caixa(a) }
    }) : []

    const titulos = rodape ? [...rodape.querySelectorAll('h2')].map((h) => {
      const c = getComputedStyle(h)
      return { texto: h.textContent.trim(), position: c.position, visibility: c.visibility, clip: c.clip, clipPath: c.clipPath, ...caixa(h) }
    }) : []

    const base = {
      nonce: NONCE,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      fontes: document.fonts.status,
      rodape: rodape ? caixa(rodape) : null,
      h1: h1 ? parseFloat(getComputedStyle(h1).fontSize) : null,
      nome: nome ? { px: parseFloat(getComputedStyle(nome).fontSize), ...caixa(nome) } : null,
      nav: nav && visivel(nav) ? caixa(nav) : null,
      maiorTexto, mel, links, titulos, textos,
    }

    // Texto a 200 %: o rodapé pode crescer, mas nada passa da borda direita da janela.
    document.documentElement.style.fontSize = '200%'
    await new Promise((r) => setTimeout(r, 100))
    document.body.offsetWidth
    let direita = 0
    if (rodape) for (const el of [rodape, ...rodape.querySelectorAll('*')]) direita = Math.max(direita, el.getBoundingClientRect().right)
    emitir({ ...base, com200: { direita, rodapeScrollWidth: rodape ? rodape.scrollWidth : 0, rodapeClientWidth: rodape ? rodape.clientWidth : 0 } })
  } catch (e) {
    emitir({ erro: String(e), nonce: NONCE, innerWidth: 0, innerHeight: 0, scrollWidth: 0, fontes: '', rodape: null, h1: null, nome: null, nav: null, maiorTexto: { px: 0, texto: '' }, mel: [], links: [], titulos: [], textos: [], com200: { direita: 0, rodapeScrollWidth: 0, rodapeClientWidth: 0 } })
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

/** Antes de qualquer medida: sem Chrome ou sem build o teste FALHA (nunca pula). */
function exigirAmbiente(): void {
  if (!existsSync(CHROME)) {
    throw new Error(`Chrome não encontrado em ${CHROME} (CHROME_PATH=${CHROME_DO_AMBIENTE ?? 'não definido'}; buscados: ${BUSCADOS.join(', ') || 'nenhum caminho para ' + process.platform})`)
  }
  if (arquivosCss().length === 0) throw new Error('sem web/dist/assets/*.css: rode `npm run build` antes')
}

async function medirNoChrome(corpoHtml: string, tema: Tema): Promise<Quadro[]> {
  exigirAmbiente()
  const nonce = randomUUID()
  const pasta = mkdtempSync(join(tmpdir(), 'cm-rodape-dieta-'))
  try {
    const perfil = join(pasta, 'perfil')
    mkdirSync(perfil)
    const folhas = arquivosCss().map((nome, i) => {
      const arquivo = join(pasta, `folha-${i}.css`)
      writeFileSync(arquivo, cssComFontesDoDist(nome), 'utf8')
      return `<link rel="stylesheet" href="${pathToFileURL(arquivo).href}">`
    })
    const base = `${pathToFileURL(PASTA_DIST).href}/`
    const corpo = corpoHtml.replace(/\b(src|srcset)="\/(?!\/)/g, (_t, atributo: string) => `${atributo}="${base}`)
    const pagina = join(pasta, 'pagina.html')
    writeFileSync(
      pagina,
      // A madrugada é o `data-tema="madrugada"` na raiz (luaDoCabecalho.ts): sem ele o CSS de cacau não se aplica.
      `<!doctype html><html lang="pt-BR"${tema === 'madrugada' ? ' data-tema="madrugada"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        `<body><div id="root">${corpo}</div><script>${SCRIPT_DE_MEDIDA(nonce)}</script></body></html>`,
      'utf8',
    )
    // O Chrome sem janela não passa de ~500 px de largura: cada largura vai num iframe da largura pedida (as media
    // queries respondem à largura do iframe). Os quatro quadros devolvem a medida por postMessage; o envoltório
    // guarda tudo num <pre> que o --dump-dom entrega.
    const iframes = LARGURAS.map(
      // `scrolling="no"`: sem barra de rolagem na janela medida, para o scrollWidth do documento ser comparável ao innerWidth.
      (largura) => `<iframe src="${pathToFileURL(pagina).href}" scrolling="no" style="display:block;border:0;width:${largura}px;height:${ALTURA_DA_JANELA[largura]}px"></iframe>`,
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
          // A janela de fora só guarda os iframes: cada largura medida é a do iframe.
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
    if (resultado.status !== 0 || resultado.sinal !== null) {
      throw new Error(`O Chrome terminou com status ${resultado.status} e sinal ${resultado.sinal}: ${erroDoChrome}`)
    }
    if (saida.trim().length === 0) throw new Error('O Chrome terminou sem saída')
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(saida)
    if (!achado) throw new Error(`O Chrome não devolveu a medida: ${erroDoChrome}`)
    const texto = achado[1].replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
    const quadros = JSON.parse(texto) as Quadro[]
    // A medida tem de ser desta execução (o código de verificação) e dos quatro quadros.
    for (const medido of quadros) {
      if (medido.erro) throw new Error(`erro dentro da página: ${medido.erro}`)
      if (medido.nonce !== nonce) throw new Error('a medida não é desta execução (código de verificação diferente)')
    }
    const larguras = quadros.map((q) => q.innerWidth).sort((a, b) => a - b)
    if (JSON.stringify(larguras) !== JSON.stringify(LARGURAS)) {
      throw new Error(`faltou medida: esperadas as larguras ${LARGURAS.join(', ')}, vieram ${larguras.join(', ') || 'nenhuma'}`)
    }
    return quadros
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

// O site real, renderizado pelo roteador (visitante, sem sessão), uma vez por página; a mesma árvore serve às duas rodadas.
async function htmlDaPagina(caminho: string): Promise<string> {
  const { container, unmount } = renderizarRota(caminho, { sessao: null })
  await aguardarCarga()
  const html = container.innerHTML
  unmount()
  return html
}

const medidas = new Map<string, Map<number, Quadro>>()
const chave = (caminho: string, tema: Tema) => `${caminho}|${tema}`
const quadro = (caminho: string, tema: Tema, largura: number): Quadro => {
  const doTema = medidas.get(chave(caminho, tema))
  const achado = doTema?.get(largura)
  if (!achado) throw new Error(`sem medida de ${caminho} (${tema}) em ${largura}`)
  return achado
}
const sobrepoe = (a: Caixa, b: Caixa) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > TOLERANCIA && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > TOLERANCIA
const caso = (caminho: string, tema: Tema, largura: number) => `${caminho} (${tema}, ${largura})`
const paraCadaCaso = (temas: readonly Tema[], larguras: readonly number[], corpo: (q: Quadro, rotulo: string, tema: Tema, largura: number) => void) => {
  for (const caminho of PAGINAS) {
    for (const tema of temas) {
      for (const largura of larguras) corpo(quadro(caminho, tema, largura), caso(caminho, tema, largura), tema, largura)
    }
  }
}

describe('a geometria do rodapé público no Chrome (FOOTER-1)', () => {
  beforeAll(async () => {
    exigirAmbiente()
    for (const caminho of PAGINAS) {
      const html = await htmlDaPagina(caminho)
      for (const tema of TEMAS) {
        try {
          const quadros = await medirNoChrome(html, tema)
          medidas.set(chave(caminho, tema), new Map(quadros.map((q) => [q.innerWidth, q])))
        } catch (erro) {
          throw new Error(`${caminho} (${tema}): ${erro instanceof Error ? erro.message : String(erro)}`, { cause: erro })
        }
      }
    }
  }, 1_200_000)

  it('o Chrome mediu as dez rodadas (cinco páginas, dois temas) com as fontes do build carregadas', () => {
    expect(medidas.size).toBe(PAGINAS.length * TEMAS.length)
    paraCadaCaso(TEMAS, LARGURAS, (q, rotulo, _tema, largura) => {
      expect(q.innerWidth, rotulo).toBe(largura)
      expect(q.innerHeight, rotulo).toBe(ALTURA_DA_JANELA[largura])
      expect(q.fontes, rotulo).toBe('loaded')
      expect(q.rodape, `${rotulo}: sem o rodapé`).not.toBeNull()
      expect(q.h1, `${rotulo}: sem o h1 da página`).not.toBeNull()
    })
  })

  it('altura: o rodapé tem no máximo 640 px em 390x844 e 440 px de 768 em diante (1440x900), nas cinco páginas, de dia e na madrugada, sem rolagem lateral', () => {
    paraCadaCaso(TEMAS, LARGURAS, (q, rotulo, _tema, largura) => {
      expect(q.rodape!.height, `${rotulo}: altura do rodapé`).toBeLessThanOrEqual(TETO_DA_ALTURA[largura])
      expect(q.scrollWidth, `${rotulo}: scrollWidth do documento`).toBe(q.innerWidth)
      // Com o texto a 200 % o rodapé pode crescer, mas não passa da borda direita nem rola de lado.
      expect(q.com200.direita, `${rotulo}: a 200 % algo do rodapé passa da janela`).toBeLessThanOrEqual(q.innerWidth + TOLERANCIA)
      expect(q.com200.rodapeScrollWidth, `${rotulo}: a 200 % o rodapé rola de lado`).toBeLessThanOrEqual(q.com200.rodapeClientWidth)
    })
  })

  it('marca: o nome do site e todo texto do rodapé são no máximo do tamanho do h1 da página, em toda largura', () => {
    paraCadaCaso(TEMAS, LARGURAS, (q, rotulo) => {
      expect(q.nome, `${rotulo}: sem o nome do site`).not.toBeNull()
      expect(q.nome!.px, `${rotulo}: tamanho do nome`).toBeGreaterThan(0)
      expect(q.nome!.px, `${rotulo}: o nome (${q.nome!.px}px) passa do h1 (${q.h1}px)`).toBeLessThanOrEqual(q.h1! + 0.01)
      expect(q.maiorTexto.px, `${rotulo}: "${q.maiorTexto.texto}" (${q.maiorTexto.px}px) passa do h1 (${q.h1}px)`).toBeLessThanOrEqual(q.h1! + 0.01)
    })
  })

  it('sem mel: nenhum elemento do rodapé (ele incluído) tem fundo mel ou mel-claro, nas cinco páginas', () => {
    paraCadaCaso(TEMAS, LARGURAS, (q, rotulo) => {
      expect(q.mel, `${rotulo}: fundo de mel no rodapé (${MEL.join(' ou ')})`).toEqual([])
    })
  })

  it('links: 11 links de uma linha e 44 px de alvo, com o desenho abaixo de 768 livre (§3.8), numa fileira de quatro grupos com o nome de 768 em diante, sem caixas sobrepostas', () => {
    paraCadaCaso(TEMAS, LARGURAS, (q, rotulo, tema, largura) => {
      expect(q.links, `${rotulo}: os 11 links`).toHaveLength(11)
      expect(q.links.map((l) => l.rotulo), rotulo).toEqual(LINKS.map((l) => l.rotulo))
      for (const link of q.links) {
        // Uma linha de texto (o intervalo do texto do link ocupa uma só linha); o piso de 44 px (56 na madrugada, campo.css) vale para a caixa.
        // De 1024 em diante cada rótulo cabe em uma linha; abaixo de 768 (duas colunas, FOOTER-3; spec §3.8 e §3.12 "labels
        // wrap inside 44 px boxes") um rótulo largo quebra em duas linhas dentro da caixa de 44 px, e em 768 também
        // (FOOTER-2: quatro colunas iguais de ~155 px; "Cuidado compartilhado" pede ~160 px).
        expect(link.linhas, `${rotulo}: "${link.rotulo}" quebra em ${link.linhas} linhas (caixa ${Math.round(link.width)} px, nome ${Math.round(q.nome!.width)} px, navegação ${Math.round(q.nav?.width ?? 0)} px)`).toBeLessThanOrEqual(largura < 1024 ? 2 : 1)
        expect(link.height, `${rotulo}: "${link.rotulo}" altura`).toBeGreaterThanOrEqual(ALVO_MINIMO[tema])
        // Rótulo curto ("Sobre") também tem alvo de 44 px de largura.
        expect(link.width, `${rotulo}: "${link.rotulo}" largura (${link.width} px)`).toBeGreaterThanOrEqual(44)
        expect(link.x, `${rotulo}: "${link.rotulo}" borda esquerda`).toBeGreaterThanOrEqual(0)
        expect(link.right, `${rotulo}: "${link.rotulo}" borda direita`).toBeLessThanOrEqual(q.innerWidth)
      }
      for (let i = 0; i < q.links.length; i++) {
        for (let j = i + 1; j < q.links.length; j++) {
          expect(sobrepoe(q.links[i], q.links[j]), `${rotulo}: "${q.links[i].rotulo}" sobre "${q.links[j].rotulo}"`).toBe(false)
        }
      }

      expect(q.titulos.map((t) => t.texto), `${rotulo}: os títulos dos grupos ficam no DOM`).toEqual(COLUNAS_DO_RODAPE.map((c) => c.titulo))

      if (largura < 768) {
        // DS1:RF-04 / §3.8: o desenho abaixo de 768 é livre (FOOTER-3: duas colunas), dentro do teto de
        // 640 px. O que vale em toda largura: a ordem do DOM é a dos grupos (Produto, Conta, Ajuda, Legal), os 11 links
        // ficam dentro da janela e nenhum título de grupo some do DOM.
        expect(q.links.map((l) => l.rotulo), `${rotulo}: ordem do DOM`).toEqual(LINKS.map((l) => l.rotulo))
      } else {
        // O nome e os quatro grupos numa fileira só, com os títulos à vista.
        for (const titulo of q.titulos) {
          expect(titulo.width, `${rotulo}: "${titulo.texto}" largura`).toBeGreaterThan(8)
          expect(titulo.height, `${rotulo}: "${titulo.texto}" altura`).toBeGreaterThan(8)
          expect(titulo.visibility, rotulo).toBe('visible')
          expect(titulo.position, rotulo).not.toBe('absolute')
        }
        const topos = q.titulos.map((t) => t.y)
        expect(Math.max(...topos) - Math.min(...topos), `${rotulo}: os quatro grupos na mesma fileira`).toBeLessThanOrEqual(1)
        const lefts = q.titulos.map((t) => t.x)
        expect(lefts, `${rotulo}: grupos lado a lado`).toEqual([...lefts].sort((a, b) => a - b))
        expect(new Set(lefts.map(Math.round)).size, `${rotulo}: quatro colunas`).toBe(COLUNAS_DO_RODAPE.length)
        const nome = q.nome!
        if (largura >= 1100) {
          // O nome à esquerda, na fileira dos grupos (FOOTER-2: o ponto passou de 1024 para 1100; as larguras medidas aqui
          // são 390, 768, 1024 e 1440).
          expect(nome.right, `${rotulo}: o nome antes do primeiro grupo`).toBeLessThanOrEqual(Math.min(...q.links.map((l) => l.x)) + TOLERANCIA)
          expect(nome.y, `${rotulo}: o nome na fileira dos grupos`).toBeLessThan(q.nav!.bottom)
          expect(nome.bottom, `${rotulo}: o nome na fileira dos grupos`).toBeGreaterThan(q.nav!.y)
        } else {
          // Em 768 o nome (~185 px) e os quatro grupos (~565 px) não cabem lado a lado numa área de ~720 px: o nome fica sobre a fileira.
          expect(nome.bottom, `${rotulo}: o nome sobre a fileira dos grupos`).toBeLessThanOrEqual(q.nav!.y + TOLERANCIA)
        }
      }
    })
  })

  it('contraste: todo texto do rodapé tem 4,5:1 ou mais sobre o fundo do rodapé, de dia e na madrugada', () => {
    const resumo: string[] = []
    for (const tema of TEMAS) {
      let menor = Infinity
      let onde = ''
      paraCadaCaso([tema], LARGURAS, (q, rotulo) => {
        expect(q.textos.length, `${rotulo}: textos visíveis do rodapé`).toBeGreaterThan(9)
        for (const texto of q.textos) {
          expect(texto.razao, `${rotulo}: "${texto.texto.slice(0, 30)}" ${texto.cor} sobre ${texto.fundo}`).toBeGreaterThanOrEqual(4.5)
          if (texto.razao < menor) {
            menor = texto.razao
            onde = `"${texto.texto.slice(0, 30)}" ${texto.cor} sobre ${texto.fundo}`
          }
        }
      })
      resumo.push(`${tema}: menor razão ${menor.toFixed(2)}:1 (${onde})`)
    }
    // Registrado para citar no relatório.
    process.stdout.write(`CONTRASTE_RODAPE ${resumo.join(' | ')}\n`)
  })
})
