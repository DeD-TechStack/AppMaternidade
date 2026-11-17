import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { cleanup } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { aguardarCarga, renderizarRota } from './renderizarRota.tsx'

// TYPE-1: a escala de tipo medida num Chrome de verdade. O jsdom não tem layout: cada página pública real vira um
// arquivo html que liga o CSS já construído (web/dist/assets/*.css), e o Chrome sem janela mede o h1, os h2 de seção,
// os acentos em itálico e a rolagem horizontal. Layout real, nada simulado. Este arquivo NUNCA pula: sem o Chrome ou
// sem o build (`npm run build`), ele falha com o motivo. O Chrome roda com spawn assíncrono, saída em arquivos e grupo
// de processos próprio, morto inteiro no fim (a mesma cerca de componentes/casca/geometria.test.tsx).

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
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')

const PAGINAS = [
  '/',
  '/como-funciona',
  '/cuidado-compartilhado',
  '/desenvolvimento',
  '/privacidade',
  '/termos',
  '/regras-da-comunidade',
  '/exclusao-de-conta',
  '/sobre',
  '/contato',
  '/rota-que-nao-existe',
]
const LARGURAS = [390, 768, 1024, 1440]
const TELA_DE_ACESSO = '/entrar'

interface Acento {
  tag: string
  classe: string
  dentroDoH1: boolean
  irmaoDoH1: boolean
}
interface Medida {
  erro?: string
  innerWidth: number
  fontes: string
  scrollWidth: number
  clientWidth: number
  largos: string[]
  h1: { fontSize: number; classe: string; texto: string; linhas: string[] } | null
  h2: Array<{ texto: string; fontSize: number }>
  acentos: Acento[]
}

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

/** Sem o Chrome ou sem o build, quem mede falha: nunca pula. */
function exigirAmbiente(): void {
  if (!existsSync(CHROME)) {
    throw new Error(`Chrome não encontrado (buscado em: ${BUSCADOS.join(', ') || 'nenhum caminho para ' + process.platform}; defina CHROME_PATH)`)
  }
  if (arquivosCss().length === 0) throw new Error('sem web/dist/assets/*.css: rode `npm --prefix web run build` antes')
}

// O script de dentro da página: espera as fontes e escreve a medida em JSON num <pre> escondido, que o --dump-dom
// devolve. Sem crase nem `${` aqui dentro: o texto é um template literal do TypeScript.
const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('escala')
  const gravar = (objeto) => {
    const texto = JSON.stringify(objeto)
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  }
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const visivel = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
    const h1 = document.querySelector('main h1')
    let infoH1 = null
    if (h1) {
      // Cada letra visível vai para a linha do seu topo: o texto de cada linha mostra se alguma tem uma palavra só.
      const porTopo = new Map()
      let textoDoH1 = ''
      const caminhante = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT)
      while (caminhante.nextNode()) {
        const no = caminhante.currentNode
        if (no.parentElement.closest('.sr-only')) continue
        textoDoH1 += no.data + ' '
        const faixa = document.createRange()
        for (let i = 0; i < no.length; i++) {
          faixa.setStart(no, i)
          faixa.setEnd(no, i + 1)
          const retangulos = faixa.getClientRects()
          if (retangulos.length === 0) continue
          const topo = Math.round(retangulos[0].top)
          porTopo.set(topo, (porTopo.get(topo) || '') + no.data[i])
        }
      }
      infoH1 = {
        fontSize: parseFloat(getComputedStyle(h1).fontSize),
        classe: h1.className,
        texto: textoDoH1,
        linhas: [...porTopo.entries()].sort((a, b) => a[0] - b[0]).map((par) => par[1]),
      }
    }
    const principal = document.querySelector('main')
    const h2 = []
    for (const el of principal ? principal.querySelectorAll('.cm-h2') : []) {
      if (!visivel(el)) continue
      h2.push({ texto: el.textContent.trim().slice(0, 40), fontSize: parseFloat(getComputedStyle(el).fontSize) })
    }
    const eAcento = (el) => {
      if (!el || el === principal) return false
      if (el.closest('blockquote, .in-relatos, .cm-depoimento, .sr-only')) return false
      if (!visivel(el) || !el.textContent.trim()) return false
      const estilo = getComputedStyle(el)
      return estilo.fontStyle === 'italic' && /literata/i.test(estilo.fontFamily) && parseFloat(estilo.fontSize) >= 19
    }
    const acentos = []
    for (const el of principal ? principal.querySelectorAll('*') : []) {
      // Um bloco em itálico com filhos também em itálico conta uma vez só: o mais externo.
      if (!eAcento(el) || eAcento(el.parentElement)) continue
      acentos.push({
        tag: el.tagName.toLowerCase(),
        classe: String(el.className),
        dentroDoH1: Boolean(h1 && h1.contains(el)),
        irmaoDoH1: Boolean(h1 && h1.nextElementSibling === el),
      })
    }
    // Quem passa da largura útil (só para o diagnóstico da rolagem horizontal).
    const largos = []
    const util = document.documentElement.clientWidth
    for (const el of document.body.querySelectorAll('*')) {
      const direita = el.getBoundingClientRect().right
      if (direita > util + 1 && visivel(el) && largos.length < 6) {
        largos.push(el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 60) + ' direita=' + Math.round(direita))
      }
    }
    gravar({
      largos,
      innerWidth: window.innerWidth,
      fontes: document.fonts.status,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      h1: infoH1,
      h2,
      acentos,
    })
  } catch (e) {
    gravar({ erro: String(e), innerWidth: 0, fontes: '', scrollWidth: 0, clientWidth: 0, largos: [], h1: null, h2: [], acentos: [] })
  }
})()
`

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

async function medirNoChrome(conteudoHtml: string, largura: number): Promise<Medida> {
  const pasta = mkdtempSync(join(tmpdir(), 'cm-escala-'))
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
        `<body><div id="root">${conteudoHtml}</div><pre id="escala" hidden></pre><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    // O Chrome sem janela não passa de ~500 px de largura: abaixo disso a página vai num iframe da largura pedida
    // (as media queries respondem à largura do iframe) e devolve a medida por postMessage.
    let alvo = pagina
    if (largura < 500) {
      alvo = join(pasta, 'envoltorio.html')
      writeFileSync(
        alvo,
        `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;width:${largura}px;height:900px"></iframe><pre id="escala" hidden></pre>` +
          `<script>addEventListener('message', (e) => { document.getElementById('escala').textContent = e.data })</script></body></html>`,
        'utf8',
      )
    }
    const arquivoDeSaida = join(pasta, 'saida.txt')
    const arquivoDeErro = join(pasta, 'erro.txt')
    const fdSaida = openSync(arquivoDeSaida, 'w')
    const fdErro = openSync(arquivoDeErro, 'w')
    let filho: ChildProcess | null = null
    let terminou: Promise<{ status: number | null; erro: string | null }> | null = null
    let expirou = false
    let final: { status: number | null; erro: string | null } | null = null
    const inicio = Date.now()
    try {
      const alvoDoFilho = spawn(
        CHROME,
        [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          // No Chrome 157 do Linux esta opção mata o processo (CI-UBUNTU). No Windows ela fica.
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
          // A moldura de 16 px é a do headless do Windows: com +16 o innerWidth fica igual à largura pedida.
          `--window-size=${Math.max(largura, 600) + (process.platform === 'win32' ? 16 : 0)},900`,
          '--virtual-time-budget=3000',
          '--dump-dom',
          pathToFileURL(alvo).href,
        ],
        { stdio: ['ignore', fdSaida, fdErro], detached: process.platform !== 'win32', windowsHide: true },
      )
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
        relogio = setTimeout(() => resolver('tempo'), 60_000)
      })
      expirou = (await Promise.race([terminou, limite]).finally(() => clearTimeout(relogio))) === 'tempo'
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
    const resultado = final ?? { status: null, erro: 'o Chrome não encerrou nem depois do kill (sem exit/error em 3 s)' }
    const situacao = `status ${resultado.status}, erro ${resultado.erro ?? (expirou ? 'tempo esgotado (60000 ms)' : 'nenhum')}`
    // O Chrome tem de ter terminado sozinho, com status 0, e escrito a saída agora (arquivo novo e não vazio).
    if (expirou || resultado.status !== 0) {
      throw new Error(`O Chrome não terminou bem (${situacao}): ${readFileSync(arquivoDeErro, 'utf8')}`)
    }
    const dados = statSync(arquivoDeSaida)
    if (dados.size === 0 || dados.mtimeMs < inicio - 1_000) throw new Error(`O Chrome não escreveu a saída (${situacao})`)
    const achado = /<pre id="escala"[^>]*>([\s\S]*?)<\/pre>/.exec(readFileSync(arquivoDeSaida, 'utf8'))
    if (!achado) throw new Error(`O Chrome não devolveu a medida (${situacao}): ${readFileSync(arquivoDeErro, 'utf8')}`)
    const texto = achado[1].replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
    const medida = JSON.parse(texto) as Medida
    if (medida.erro) throw new Error(`a medida falhou na página: ${medida.erro}`)
    return medida
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

type Medidas = Map<string, Medida>
const chave = (caminho: string, largura: number) => `${caminho}@${largura}`
let todasAsMedidas: Promise<Medidas> | null = null

/** Renderiza cada rota no jsdom (uma de cada vez, o documento é um só) e mede todas no Chrome, em lotes. Feito uma vez e dividido pelos testes. */
function medirTudo(): Promise<Medidas> {
  todasAsMedidas ??= (async () => {
    exigirAmbiente()
    const htmls = new Map<string, string>()
    for (const caminho of [...PAGINAS, TELA_DE_ACESSO]) {
      const { container } = renderizarRota(caminho)
      await aguardarCarga()
      htmls.set(caminho, container.innerHTML)
      cleanup()
    }
    const pedidos: Array<[string, number]> = []
    for (const caminho of PAGINAS) for (const largura of LARGURAS) pedidos.push([caminho, largura])
    for (const largura of [390, 1440]) pedidos.push([TELA_DE_ACESSO, largura])
    const medidas: Medidas = new Map()
    const LOTE = 4
    for (let i = 0; i < pedidos.length; i += LOTE) {
      await Promise.all(
        pedidos.slice(i, i + LOTE).map(async ([caminho, largura]) => {
          try {
            medidas.set(chave(caminho, largura), await medirNoChrome(htmls.get(caminho)!, largura))
          } catch (erro) {
            throw new Error(`${caminho} em ${largura}: ${erro instanceof Error ? erro.message : String(erro)}`, { cause: erro })
          }
        }),
      )
    }
    return medidas
  })()
  return todasAsMedidas
}

function medida(medidas: Medidas, caminho: string, largura: number): Medida {
  const achada = medidas.get(chave(caminho, largura))
  if (!achada) throw new Error(`sem medida de ${caminho} em ${largura}`)
  expect(achada.innerWidth, `${caminho}: a janela de ${largura}`).toBe(largura)
  expect(achada.fontes, `${caminho}: as fontes em ${largura}`).toBe('loaded')
  return achada
}

const TEMPO = 900_000

// pre-existing at BASE, owner CONTENT-1/page cards: o scroll horizontal destas páginas não é do TYPE-1; só a checagem
// de rolagem é pulada (e só aqui, por nome). As checagens do h1 seguem valendo para elas.
const ROLAGEM_ANTERIOR_AO_BASE: ReadonlyArray<{ caminho: string; largura: number }> = [{ caminho: '/como-funciona', largura: 390 }]

/** As palavras de um trecho, em minúsculas, sem espaço (comum ou nbsp) nem pontuação no começo ou no fim. */
function palavrasDaLinha(trecho: string): string[] {
  return trecho
    .split(/\s+/)
    .map((palavra) => palavra.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').toLowerCase())
    .filter(Boolean)
}

/** Os pedaços das linhas que não são palavra inteira do texto do h1: uma palavra partida no meio por `overflow-wrap: anywhere` aparece aqui. */
function palavrasPartidas(linhas: readonly string[], textoDoH1: string): string[] {
  const inteiras = new Set(palavrasDaLinha(textoDoH1))
  return linhas.flatMap((linha) => palavrasDaLinha(linha)).filter((palavra) => !inteiras.has(palavra))
}

/** O resíduo de linhas com uma palavra só (aceitas) vai para `.oc/medidas/residuo_uma_palavra.json` e para o console. */
function escreverResiduo(residuo: unknown[]): void {
  const pasta = resolve(import.meta.dirname, '..', '..', '..', '.oc', 'medidas')
  mkdirSync(pasta, { recursive: true })
  writeFileSync(join(pasta, 'residuo_uma_palavra.json'), JSON.stringify(residuo, null, 2) + '\n', 'utf8')
  console.info(`residuo_uma_palavra (${residuo.length}): ${JSON.stringify(residuo)}`)
}

describe('TYPE-1: a escala de tipo medida no Chrome', () => {
  it(
    'tamanhos',
    async () => {
      const medidas = await medirTudo()
      for (const caminho of PAGINAS) {
        const minimo: Array<[number, number]> = [
          [1440, 72],
          [390, 40],
        ]
        for (const [largura, tamanhoMinimo] of minimo) {
          const m = medida(medidas, caminho, largura)
          expect(m.h1, `${caminho}: sem h1 em ${largura}`).not.toBeNull()
          expect(m.h1!.fontSize, `${caminho}: o h1 em ${largura}`).toBeGreaterThanOrEqual(tamanhoMinimo)
        }
        for (const h2 of medida(medidas, caminho, 1440).h2) {
          expect(h2.fontSize, `${caminho}: o h2 de seção "${h2.texto}" em 1440`).toBeGreaterThanOrEqual(40)
        }
      }
      // A tela de acesso mantém o h1 de `titulo-1`.
      expect(medida(medidas, TELA_DE_ACESSO, 1440).h1!.fontSize, `${TELA_DE_ACESSO}: o h1 em 1440`).toBe(48)
      expect(medida(medidas, TELA_DE_ACESSO, 390).h1!.fontSize, `${TELA_DE_ACESSO}: o h1 em 390`).toBe(34)
    },
    TEMPO,
  )

  it(
    'italico',
    async () => {
      const medidas = await medirTudo()
      // Junta todos os achados antes de afirmar: uma rodada mostra a lista inteira, não só o primeiro.
      const achados: string[] = []
      for (const caminho of PAGINAS) {
        for (const largura of [1440, 390]) {
          const { acentos } = medida(medidas, caminho, largura)
          if (acentos.length > 1) achados.push(`${caminho} em ${largura}: ${acentos.length} acentos em itálico ${JSON.stringify(acentos)}`)
          if (acentos.length === 1 && !(acentos[0].dentroDoH1 || acentos[0].irmaoDoH1)) {
            achados.push(`${caminho} em ${largura}: o único acento não está no h1 nem logo depois dele ${JSON.stringify(acentos[0])}`)
          }
        }
      }
      expect(achados, achados.join('\n')).toEqual([])
    },
    TEMPO,
  )

  it(
    'quebra',
    async () => {
      const medidas = await medirTudo()
      const achados: string[] = []
      const umaPalavra: Array<{ caminho: string; largura: number; linha: string; linhas: string[] }> = []
      for (const caminho of PAGINAS) {
        for (const largura of LARGURAS) {
          const m = medida(medidas, caminho, largura)
          // Sem rolagem horizontal: o conteúdo cabe na largura útil (a barra vertical, quando existe, já está fora de clientWidth).
          expect(m.clientWidth, `${caminho}: a largura útil em ${largura}`).toBeGreaterThan(0)
          const anterior = ROLAGEM_ANTERIOR_AO_BASE.some((item) => item.caminho === caminho && item.largura === largura)
          if (!anterior && m.scrollWidth > m.clientWidth) {
            achados.push(`${caminho} em ${largura}: rolagem horizontal (${m.scrollWidth} > ${m.clientWidth}): ${JSON.stringify(m.largos)}`)
          }
          expect(m.h1, `${caminho}: sem h1 em ${largura}`).not.toBeNull()
          const { linhas, texto } = m.h1!
          expect(linhas.length, `${caminho}: o h1 sem linhas em ${largura}`).toBeGreaterThan(0)
          // Nenhuma palavra partida dentro dela (overflow-wrap: anywhere): cada pedaço de linha é palavra inteira do h1.
          for (const fragmento of palavrasPartidas(linhas, texto)) {
            achados.push(`${caminho} em ${largura}: palavra partida "${fragmento}" (linhas: ${JSON.stringify(linhas)})`)
          }
          // Um h1 de uma linha só (uma palavra, como "Contato") não tem linha solta: o teste vale para h1 de várias linhas.
          if (linhas.length > 1) {
            for (const linha of linhas) {
              const palavras = linha.split(/[\s\u00a0]+/).filter(Boolean)
              // Uma linha com uma palavra só é aceita; vai para o resíduo, para a revisão olhar.
              if (palavras.length === 1) umaPalavra.push({ caminho, largura, linha: linha.trim(), linhas })
            }
          }
        }
      }
      escreverResiduo(umaPalavra)
      expect(achados, achados.join('\n')).toEqual([])
    },
    TEMPO,
  )

  it('quebra: o controle negativo acusa uma palavra partida dentro dela', () => {
    // Palavra partida: "Exclus" + "ão" não são palavras do h1.
    expect(palavrasPartidas(['Exclus', 'ão da conta'], 'Exclusão da conta')).toEqual(['exclus', 'ão'])
    // Linhas inteiras, com pontuação no fim e uma palavra só numa linha: nada a acusar.
    expect(palavrasPartidas(['Exclusão ', 'da conta.'], 'Exclusão da conta.')).toEqual([])
    expect(palavrasPartidas(['A rotina ', 'do bebê,', ' dividida com ', 'carinho.'], 'A rotina do bebê,  dividida com carinho. ')).toEqual([])
  })
})
