import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { COLUNAS_DO_RODAPE } from './textos.ts'

// FOOTER-2 (a grade do rodapé): a geometria do rodapé público num Chrome de verdade, com o CSS construído de novo a
// cada execução (vite build numa pasta temporária: nunca um web/dist velho). O jsdom não tem layout: cada página
// pública, renderizada pelo roteador, vira um arquivo html que liga o CSS recém-construído, e o Chrome sem janela mede
// o rodapé em quatro larguras (390, 768, 1024 e 1440) de uma vez, cada uma num iframe da largura pedida, nos dois
// temas. Cada regra é uma função que devolve as violações de uma medida; cada função tem o controle dela: a mesma
// medida torcida de propósito TEM de violar (senão a regra não prova nada).
//
// FALHA FECHADA (como o rodapeDieta.geometria.test.tsx): nunca pula. Chrome ausente, build que falha, Chrome com
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

// A página comum, a rota inexistente (a página curta: item 5) e a de fecho de cacau (item 6).
const PAGINAS = ['/privacidade', '/como-funciona', '/cuidado-compartilhado', '/rota-que-nao-existe']
const PAGINA_CURTA = '/rota-que-nao-existe'
const PAGINA_DE_CACAU = '/cuidado-compartilhado'
const PAGINA_DE_PAPEL = '/privacidade'
// 1099 e 1100 são os dois lados do ponto em que o nome do rodapé passa para a esquerda da grade.
// 320 é o celular mais estreito que importa; 389 e 390 são os dois lados do ponto em que três colunas iguais deixam de
// comportar "Desenvolvimento".
const LARGURAS = [320, 389, 390, 768, 1024, 1099, 1100, 1440]
const ALTURA_DA_JANELA: Record<number, number> = { 320: 568, 389: 844, 390: 844, 768: 900, 1024: 900, 1099: 900, 1100: 900, 1440: 900 }
const TEMAS = ['claro', 'madrugada'] as const
type Tema = (typeof TEMAS)[number]

const PAPEL = '#F8F6EB'
const NOITE_2 = '#B9C09F'
const RESPIRO = 64
const TETO_DA_ALTURA = (largura: number) => (largura >= 768 ? 440 : 480)
const DISTANCIA_DO_FECHO = 96
const TOLERANCIA = 1
const LINKS_ESPERADOS = COLUNAS_DO_RODAPE.flatMap((coluna) => coluna.links.map((link) => link.rotulo))

interface Caixa {
  x: number
  right: number
  y: number
  bottom: number
  width: number
  height: number
}
interface Texto {
  texto: string
  cor: string
}
/** Uma palavra de um link: a largura natural dela (sem quebra) e em quantos trechos de linha ela foi desenhada (1 = inteira). */
interface Palavra {
  texto: string
  largura: number
  trechos: number
}
interface Quadro {
  erro?: string
  nonce: string
  innerWidth: number
  innerHeight: number
  scrollHeight: number
  scrollWidth: number
  fontes: string
  espacoBloco: number
  entreSecoes: number
  rodape: Caixa & { margemTopo: number; bordaTopo: number; fundo: string }
  nome: Caixa
  titulos: (Caixa & Texto)[]
  grupos: Caixa[]
  links: (Caixa & Texto & { linhas: number; palavras: Palavra[] })[]
  /** Os parágrafos de baixo: o aviso e, por último, a linha do ©. */
  base: (Caixa & Texto)[]
  textos: Texto[]
  main: { bottom: number; ultimaEhSecao: boolean } | null
  ultimaFaixa: (Caixa & { fundo: string; bordaBaixo: number; cta: Caixa | null }) | null
}

// O script de dentro de cada página: espera as fontes, mede o rodapé e a última faixa do main e devolve o JSON ao
// iframe de fora por postMessage.
const SCRIPT_DE_MEDIDA = (nonce: string) => `
(async () => {
  const NONCE = ${JSON.stringify(nonce)}
  const emitir = (obj) => window.parent.postMessage(JSON.stringify(obj), '*')
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const caixa = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height } }
    const px = (variavel) => {
      const sonda = document.createElement('div')
      sonda.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0'
      sonda.style.setProperty('padding-left', 'var(' + variavel + ')')
      document.body.appendChild(sonda)
      const valor = parseFloat(getComputedStyle(sonda).paddingLeft)
      sonda.remove()
      return valor
    }
    const rodape = document.querySelector('footer[data-rodape]')
    const main = document.querySelector('main')

    const textos = []
    const vistos = new Set()
    const andador = document.createTreeWalker(rodape, NodeFilter.SHOW_TEXT)
    for (let no = andador.nextNode(); no; no = andador.nextNode()) {
      const texto = no.textContent.trim()
      const pai = no.parentElement
      if (!texto || vistos.has(pai)) continue
      const r = pai.getBoundingClientRect()
      if (r.width <= 1 || r.height <= 1) continue
      vistos.add(pai)
      textos.push({ texto, cor: getComputedStyle(pai).color })
    }
    const comCor = (el) => ({ texto: el.textContent.trim(), cor: getComputedStyle(el).color, ...caixa(el) })

    let ultima = null
    if (main) {
      const casa = main.querySelector(':scope > [data-casa]')
      const raiz = casa || main
      const el = raiz.lastElementChild
      if (el) {
        const c = getComputedStyle(el)
        const links = el.querySelectorAll('a')
        ultima = { ...caixa(el), fundo: c.backgroundColor, bordaBaixo: parseFloat(c.borderBottomWidth), cta: links.length ? caixa(links[links.length - 1]) : null }
      }
    }

    emitir({
      nonce: NONCE,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      fontes: document.fonts.status,
      espacoBloco: px('--espaco-bloco'),
      entreSecoes: px('--cm-entre-secoes'),
      rodape: { ...caixa(rodape), margemTopo: parseFloat(getComputedStyle(rodape).marginTop), bordaTopo: parseFloat(getComputedStyle(rodape).borderTopWidth), fundo: getComputedStyle(rodape).backgroundColor },
      nome: caixa(rodape.querySelector('[data-nome-rodape]')),
      titulos: [...rodape.querySelectorAll('h2')].map(comCor),
      grupos: [...rodape.querySelectorAll('[data-rodape-grupo]')].map(caixa),
      links: [...rodape.querySelectorAll('a')].map((a) => {
        const intervalo = document.createRange()
        intervalo.selectNodeContents(a)
        const linhas = new Set([...intervalo.getClientRects()].map((r) => Math.round(r.top))).size
        // Cada palavra: quantos trechos de linha o Range dela ocupa (mais de 1 = a palavra foi partida) e a largura que
        // ela teria inteira (um span sem quebra, na mesma fonte).
        const no = a.firstChild
        const palavras = []
        if (no && no.nodeType === 3) {
          const estilo = getComputedStyle(a)
          let inicio = 0
          for (const palavra of no.textContent.split(' ')) {
            if (palavra.length > 0) {
              const r = document.createRange()
              r.setStart(no, inicio)
              r.setEnd(no, inicio + palavra.length)
              const sonda = document.createElement('span')
              sonda.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + estilo.font + ';letter-spacing:' + estilo.letterSpacing
              sonda.textContent = palavra
              document.body.appendChild(sonda)
              const largura = sonda.getBoundingClientRect().width
              sonda.remove()
              palavras.push({ texto: palavra, largura, trechos: r.getClientRects().length })
            }
            inicio += palavra.length + 1
          }
        }
        return { ...comCor(a), linhas, palavras }
      }),
      base: [...rodape.querySelectorAll('.cm-rodape-base > p')].map(comCor),
      textos,
      main: main ? { bottom: main.getBoundingClientRect().bottom, ultimaEhSecao: main.lastElementChild ? main.lastElementChild.matches('[data-h~="secao"]') : false } : null,
      ultimaFaixa: ultima,
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

async function medirNoChrome(dist: string, corpoHtml: string, tema: Tema): Promise<Quadro[]> {
  exigirChrome()
  const nonce = randomUUID()
  const pasta = mkdtempSync(join(tmpdir(), 'cm-rodape-grade-'))
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
    const corpo = corpoHtml.replace(/\b(src|srcset)="\/(?!\/)/g, (_t, atributo: string) => `${atributo}="${base}`)
    const pagina = join(pasta, 'pagina.html')
    writeFileSync(
      pagina,
      `<!doctype html><html lang="pt-BR"${tema === 'madrugada' ? ' data-tema="madrugada"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        `<body><div id="root">${corpo}</div><script>${SCRIPT_DE_MEDIDA(nonce)}</script></body></html>`,
      'utf8',
    )
    // Cada largura num iframe da largura (e da altura de janela) pedida: as media queries e o `svh` respondem a ele.
    const iframes = LARGURAS.map(
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

async function htmlDaPagina(caminho: string): Promise<string> {
  const { container, unmount } = renderizarRota(caminho, { sessao: null })
  await aguardarCarga()
  const html = container.innerHTML
  unmount()
  return html
}

// ---- As regras: cada uma devolve as violações de UMA medida (lista vazia = cumpre) ----

const hex = (cor: string): string => {
  const n = (cor.match(/-?[\d.]+/g) ?? []).map(Number)
  if (n.length < 3) return cor
  return '#' + n.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()
}
const agrupar = (valores: number[]): number[][] => {
  const ordenados = [...valores].sort((a, b) => a - b)
  const grupos: number[][] = []
  for (const v of ordenados) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && v - ultimo[ultimo.length - 1] <= TOLERANCIA) ultimo.push(v)
    else grupos.push([v])
  }
  return grupos
}
const amplitude = (valores: number[]) => (valores.length === 0 ? 0 : Math.max(...valores) - Math.min(...valores))

/** Item 1: a grade. De 768 em diante quatro colunas iguais com um vão só (o `espaco-bloco`); abaixo, três colunas iguais. */
function violacoesDaGrade(q: Quadro): string[] {
  const v: string[] = []
  if (q.innerWidth >= 768) {
    if (q.grupos.length !== 4) return [`${q.grupos.length} grupos (são quatro)`]
    const lefts = q.grupos.map((g) => g.x)
    const degraus = lefts.slice(1).map((x, i) => x - lefts[i])
    if (amplitude(degraus) > TOLERANCIA) v.push(`o degrau entre as bordas esquerdas dos grupos varia ${amplitude(degraus).toFixed(2)} px (${degraus.map((d) => d.toFixed(1)).join(', ')})`)
    if (amplitude(q.grupos.map((g) => g.width)) > TOLERANCIA) v.push(`os grupos têm larguras diferentes (${q.grupos.map((g) => g.width.toFixed(1)).join(', ')})`)
    const vaos = q.grupos.slice(1).map((g, i) => g.x - q.grupos[i].right)
    for (const vao of vaos) if (Math.abs(vao - q.espacoBloco) > TOLERANCIA) v.push(`vão de ${vao.toFixed(1)} px entre grupos (o espaco-bloco é ${q.espacoBloco.toFixed(1)})`)
    if (amplitude(q.titulos.map((t) => t.y)) > TOLERANCIA) v.push('os títulos dos grupos não estão na mesma linha')
    // Cada link começa na borda esquerda do grupo dele.
    const porGrupo = COLUNAS_DO_RODAPE.map((c) => c.links.length)
    let indice = 0
    for (const [g, quantos] of porGrupo.entries()) {
      for (const link of q.links.slice(indice, indice + quantos)) {
        if (Math.abs(link.x - q.grupos[g].x) > TOLERANCIA) v.push(`"${link.texto}" começa em x ${link.x.toFixed(1)} e o grupo em ${q.grupos[g].x.toFixed(1)}`)
      }
      indice += quantos
    }
  } else {
    const colunas = agrupar(q.links.map((l) => l.x))
    // De 390 a 767 são três colunas IGUAIS (exigido). Abaixo de 390 três colunas iguais não comportam a palavra mais larga
    // ("Desenvolvimento", ~115 px): ali as três colunas se dividem pela palavra mais larga de cada uma, sem ser iguais.
    if (colunas.length !== 3) v.push(`${colunas.length} inícios de coluna (são três): ${colunas.map((c) => c[0].toFixed(1)).join(', ')}`)
    else if (q.innerWidth >= 390) {
      const inicios = colunas.map((c) => c[0])
      const degraus = [inicios[1] - inicios[0], inicios[2] - inicios[1]]
      if (amplitude(degraus) > TOLERANCIA) v.push(`as três colunas não são iguais: degraus de ${degraus.map((d) => d.toFixed(1)).join(' e ')} px`)
    }
    for (const coluna of agrupar(q.links.map((l) => l.x))) if (amplitude(coluna) > TOLERANCIA) v.push('um início de coluna varia')
  }
  return v
}

/** Item 2: os 11 links dos quatro grupos, sem Entrar nem Criar conta. */
function violacoesDosLinks(q: Quadro): string[] {
  const v: string[] = []
  const rotulos = q.links.map((l) => l.texto)
  if (JSON.stringify(rotulos) !== JSON.stringify(LINKS_ESPERADOS)) v.push(`links ${JSON.stringify(rotulos)}`)
  if (q.links.length !== 11) v.push(`${q.links.length} links (são 11)`)
  for (const proibido of ['Entrar', 'Criar conta']) if (rotulos.includes(proibido)) v.push(`o rodapé ainda tem "${proibido}"`)
  if (q.grupos.length !== 4) v.push(`${q.grupos.length} grupos (são quatro)`)
  return v
}

/** Item 3: 64 px de respiro em cima (até o nome) e embaixo (a partir da linha do ©), e o teto de altura. */
function violacoesDoRespiro(q: Quadro): string[] {
  const v: string[] = []
  const copia = q.base[q.base.length - 1]
  const topo = q.nome.y - q.rodape.y
  const baixo = q.rodape.bottom - copia.bottom
  if (topo < RESPIRO - 0.5) v.push(`o nome fica a ${topo.toFixed(1)} px do topo do rodapé (mínimo ${RESPIRO})`)
  if (baixo < RESPIRO - 0.5) v.push(`a linha do © fica a ${baixo.toFixed(1)} px da base do rodapé (mínimo ${RESPIRO})`)
  if (q.rodape.height > TETO_DA_ALTURA(q.innerWidth)) v.push(`QUESTION FOR LEADER: rodape ${q.innerWidth} ${Math.round(q.rodape.height)}px passa do teto de ${TETO_DA_ALTURA(q.innerWidth)}`)
  return v
}

/**
 * Os links continuam legíveis na grade nova: uma linha de 1024 em diante (duas abaixo: em 768 a coluna tem ~155 px, e
 * "Cuidado compartilhado", de ~160 px, quebra em duas linhas dentro da caixa de 44 px), alvo de 44 px (56 na madrugada), dentro da
 * janela e sem se sobrepor.
 */
function violacoesDosAlvos(q: Quadro, tema: Tema): string[] {
  const v: string[] = []
  const alvo = tema === 'madrugada' ? 56 : 44
  for (const link of q.links) {
    if (link.linhas > (q.innerWidth >= 1024 ? 1 : 2)) v.push(`"${link.texto}" quebra em ${link.linhas} linhas (caixa de ${Math.round(link.width)} px)`)
    // FOOT2-R1-01: nenhuma palavra de nenhum link se parte ("Desenvolvimento" não vira "Desenvolviment" + "o"), em largura
    // nenhuma. Cada palavra é medida pelo próprio Range: mais de um trecho de linha é palavra partida.
    if (link.palavras.length === 0) v.push(`"${link.texto}": as palavras não foram medidas`)
    for (const palavra of link.palavras) {
      if (palavra.trechos > 1) v.push(`a palavra "${palavra.texto}" (${Math.round(palavra.largura)} px) de "${link.texto}" está partida em ${palavra.trechos} trechos (caixa de ${Math.round(link.width)} px)`)
    }
    if (link.height < alvo - 0.5) v.push(`"${link.texto}" tem ${link.height.toFixed(1)} px de altura (alvo de ${alvo})`)
    if (link.x < 0 || link.right > q.innerWidth) v.push(`"${link.texto}" passa da janela`)
  }
  for (let i = 0; i < q.links.length; i++) {
    for (let j = i + 1; j < q.links.length; j++) {
      const a = q.links[i]
      const b = q.links[j]
      if (Math.min(a.right, b.right) - Math.max(a.x, b.x) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 0.5) v.push(`"${a.texto}" sobre "${b.texto}"`)
    }
  }
  return v
}

/** Item 4: só dois tons de texto, papel (nome e links) e noite-2 (títulos, aviso e ©). */
function violacoesDosTons(q: Quadro): string[] {
  const v: string[] = []
  const papel = [...q.links, { texto: 'nome', cor: q.textos.find((t) => t.texto === 'AppMaternidade')?.cor ?? '' }]
  const noite = [...q.titulos, ...q.base]
  for (const t of papel) if (hex(t.cor) !== PAPEL) v.push(`"${t.texto}" é ${hex(t.cor)} (devia ser papel ${PAPEL})`)
  for (const t of noite) if (hex(t.cor) !== NOITE_2) v.push(`"${t.texto.slice(0, 30)}" é ${hex(t.cor)} (devia ser noite-2 ${NOITE_2})`)
  for (const t of q.textos) if (![PAPEL, NOITE_2].includes(hex(t.cor))) v.push(`texto "${t.texto.slice(0, 30)}" com o tom ${hex(t.cor)} fora dos dois`)
  // O nome, os 11 links, o aviso e o © (14); de 768 em diante os quatro títulos também (abaixo disso são só para o leitor de tela).
  const minimo = q.innerWidth >= 768 ? 18 : 14
  if (q.textos.length < minimo) v.push(`só ${q.textos.length} textos medidos (o mínimo é ${minimo})`)
  return v
}

/** Item 5: numa página curta o rodapé começa na altura da janela ou depois, a linha do © inteira dentro dele, sem papel embaixo. */
function violacoesDaPaginaCurta(q: Quadro): string[] {
  const v: string[] = []
  const copia = q.base[q.base.length - 1]
  if (q.rodape.y < q.innerHeight - 0.5) v.push(`o rodapé começa em y ${q.rodape.y.toFixed(1)}, acima da altura da janela (${q.innerHeight})`)
  if (copia.y < q.rodape.y - 0.5 || copia.bottom > q.rodape.bottom + 0.5) v.push('a linha do © não está inteira dentro do rodapé')
  if (q.scrollHeight > q.rodape.bottom + TOLERANCIA) v.push(`há ${(q.scrollHeight - q.rodape.bottom).toFixed(1)} px de página depois do rodapé (uma faixa de papel embaixo)`)
  return v
}

/** Item 6, última faixa de cacau: o rodapé começa na base dela, sem vão, sem fio, e o botão fica a 96 px ou mais do nome. */
function violacoesDoFechoDeCacau(q: Quadro): string[] {
  const v: string[] = []
  const faixa = q.ultimaFaixa
  if (!faixa) return ['sem última faixa no main']
  if (hex(faixa.fundo) !== '#2B2320') v.push(`a última faixa é ${hex(faixa.fundo)}, não cacau`)
  const vao = q.rodape.y - faixa.bottom
  if (Math.abs(vao) > 0.5) v.push(`${vao.toFixed(1)} px entre a base da faixa e o topo do rodapé (devia ser 0)`)
  if (q.rodape.bordaTopo !== 0 || faixa.bordaBaixo !== 0) v.push('há um fio na junção')
  if (!faixa.cta) v.push('sem o botão do fecho')
  else if (q.nome.y - faixa.cta.bottom < DISTANCIA_DO_FECHO - 0.5) v.push(`o botão fica a ${(q.nome.y - faixa.cta.bottom).toFixed(1)} px do nome (mínimo ${DISTANCIA_DO_FECHO})`)
  return v
}

/** Item 6, última faixa que não é de cacau: a junção de hoje (margem de respiro, ou nenhuma quando o fim é uma Secao). */
function violacoesDaJuncaoDePapel(q: Quadro): string[] {
  const v: string[] = []
  const faixa = q.ultimaFaixa
  if (!faixa || !q.main) return ['sem última faixa no main']
  if (hex(faixa.fundo) === '#2B2320') v.push('a última faixa devia ser de papel nesta página')
  const esperado = q.main.ultimaEhSecao ? 0 : q.entreSecoes
  const vao = q.rodape.y - q.main.bottom
  if (Math.abs(vao - esperado) > 0.5) v.push(`${vao.toFixed(1)} px entre o main e o rodapé (a junção de hoje é ${esperado.toFixed(1)})`)
  return v
}

const medidas = new Map<string, Map<number, Quadro>>()
const chave = (caminho: string, tema: Tema) => `${caminho}|${tema}`
const quadro = (caminho: string, tema: Tema, largura: number): Quadro => {
  const achado = medidas.get(chave(caminho, tema))?.get(largura)
  if (!achado) throw new Error(`sem medida de ${caminho} (${tema}) em ${largura}`)
  return achado
}
const paraCadaCaso = (caminhos: readonly string[], larguras: readonly number[], corpo: (q: Quadro, rotulo: string, tema: Tema) => void) => {
  for (const caminho of caminhos) {
    for (const tema of TEMAS) for (const largura of larguras) corpo(quadro(caminho, tema, largura), `${caminho} (${tema}, ${largura})`, tema)
  }
}
const copiar = (q: Quadro): Quadro => structuredClone(q)

describe('a grade do rodapé público no Chrome (FOOTER-2)', () => {
  let pastaDoCss = ''
  beforeAll(async () => {
    exigirChrome()
    pastaDoCss = mkdtempSync(join(tmpdir(), 'cm-rodape-grade-css-'))
    construirOCss(pastaDoCss)
    for (const caminho of PAGINAS) {
      const html = await htmlDaPagina(caminho)
      for (const tema of TEMAS) {
        try {
          const quadros = await medirNoChrome(pastaDoCss, html, tema)
          medidas.set(chave(caminho, tema), new Map(quadros.map((q) => [q.innerWidth, q])))
        } catch (erro) {
          throw new Error(`${caminho} (${tema}): ${erro instanceof Error ? erro.message : String(erro)}`, { cause: erro })
        }
      }
    }
  }, 1_800_000)

  // O teste não deixa lixo: a pasta do CSS construído some ao fim, passando ou não.
  afterAll(() => {
    if (pastaDoCss) rmSync(pastaDoCss, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  })

  it('o Chrome mediu as oito rodadas (quatro páginas, dois temas) com as fontes carregadas e sem rolagem lateral', () => {
    expect(medidas.size).toBe(PAGINAS.length * TEMAS.length)
    paraCadaCaso(PAGINAS, LARGURAS, (q, rotulo) => {
      expect(q.fontes, rotulo).toBe('loaded')
      expect(q.innerHeight, rotulo).toBe(ALTURA_DA_JANELA[q.innerWidth])
      expect(q.scrollWidth, `${rotulo}: scrollWidth`).toBe(q.innerWidth)
    })
  })

  it('1 grade: quatro colunas iguais com um vão só de 768 em diante, três colunas iguais abaixo (controle: uma coluna deslocada falha)', () => {
    paraCadaCaso(PAGINAS, LARGURAS, (q, rotulo) => expect(violacoesDaGrade(q), rotulo).toEqual([]))
    const larga = quadro(PAGINA_DE_PAPEL, 'claro', 1440)
    const estreita = quadro(PAGINA_DE_PAPEL, 'claro', 390)
    expect(violacoesDaGrade(larga)).toEqual([])
    const deslocada = copiar(larga)
    deslocada.grupos[2].x += 6
    expect(violacoesDaGrade(deslocada), 'controle: o degrau variou 6 px').not.toEqual([])
    const larguraDiferente = copiar(larga)
    larguraDiferente.grupos[1].width += 6
    expect(violacoesDaGrade(larguraDiferente), 'controle: um grupo mais largo').not.toEqual([])
    const vaoErrado = copiar(larga)
    vaoErrado.espacoBloco += 8
    expect(violacoesDaGrade(vaoErrado), 'controle: vão que não é o espaco-bloco').not.toEqual([])
    const colunaTorta = copiar(estreita)
    colunaTorta.links[5].x += 5
    expect(violacoesDaGrade(colunaTorta), 'controle: um link fora da coluna').not.toEqual([])
    const colunasDesiguais = copiar(estreita)
    for (const link of colunasDesiguais.links) if (link.x > estreita.links[0].x + 100) link.x += 8
    expect(violacoesDaGrade(colunasDesiguais), 'controle: terceira coluna deslocada').not.toEqual([])
  })

  it('2 links: 11 links nos quatro grupos, sem Entrar nem Criar conta (controle: um link a mais falha)', () => {
    paraCadaCaso(PAGINAS, LARGURAS, (q, rotulo) => expect(violacoesDosLinks(q), rotulo).toEqual([]))
    const base = quadro(PAGINA_DE_PAPEL, 'claro', 1440)
    const comEntrar = copiar(base)
    comEntrar.links.unshift({ ...comEntrar.links[0], texto: 'Entrar' })
    expect(violacoesDosLinks(comEntrar), 'controle: Entrar de volta').not.toEqual([])
    const semUm = copiar(base)
    semUm.links.pop()
    expect(violacoesDosLinks(semUm), 'controle: dez links').not.toEqual([])
  })

  it('2b alvos: cada link numa linha de 1024 em diante (duas abaixo), com alvo de 44 px (56 na madrugada) e sem sobreposição (controle: quebra e alvo baixo falham)', () => {
    paraCadaCaso(PAGINAS, LARGURAS, (q, rotulo, tema) => expect(violacoesDosAlvos(q, tema), rotulo).toEqual([]))
    const base = quadro(PAGINA_DE_PAPEL, 'madrugada', 1440)
    const quebra = copiar(base)
    quebra.links[1].linhas = 2
    expect(violacoesDosAlvos(quebra, 'madrugada'), 'controle: um link em duas linhas em 1440').not.toEqual([])
    for (const largura of [320, 390, 768]) {
      for (const tema of TEMAS) {
        const q = quadro(PAGINA_DE_PAPEL, tema, largura)
        const quebradas = q.links.flatMap((l) => l.palavras.filter((p) => p.trechos > 1).map((p) => p.texto))
        expect(quebradas, `${tema}, ${largura}: palavras partidas`).toEqual([])
        // O controle da mesma medida: a palavra mais larga de "Desenvolvimento" partida em dois trechos viola.
        const partida = copiar(q)
        partida.links.find((l) => l.texto === 'Desenvolvimento')!.palavras[0].trechos = 2
        expect(violacoesDosAlvos(partida, tema), `controle: "Desenvolvimento" partida em ${largura}`).not.toEqual([])
      }
    }
    // Registrado para citar no relatório: a palavra mais larga de cada coluna (três colunas, quatro links cada, o último com três).
    const largas = [0, 4, 8].map((inicio, i) => {
      const links = quadro(PAGINA_DE_PAPEL, 'claro', 320).links.slice(inicio, i === 2 ? 11 : inicio + 4)
      const maior = links.flatMap((l) => l.palavras).reduce((a, b) => (b.largura > a.largura ? b : a))
      return `${maior.texto} ${maior.largura.toFixed(1)}px`
    })
    process.stdout.write(`PALAVRA_MAIS_LARGA_POR_COLUNA ${largas.join(' | ')}\n`)
    const composta = copiar(quadro(PAGINA_DE_PAPEL, 'claro', 390))
    composta.links.find((l) => l.texto === 'Cuidado compartilhado')!.palavras[1].trechos = 3
    expect(violacoesDosAlvos(composta, 'claro'), 'controle: "compartilhado" partida num link de duas palavras').not.toEqual([])
    const semMedida = copiar(quadro(PAGINA_DE_PAPEL, 'claro', 390))
    semMedida.links[0].palavras = []
    expect(violacoesDosAlvos(semMedida, 'claro'), 'controle: palavras não medidas falham fechado').not.toEqual([])
    const baixo = copiar(base)
    baixo.links[0].height = 44
    expect(violacoesDosAlvos(baixo, 'madrugada'), 'controle: alvo de 44 px na madrugada').not.toEqual([])
    const sobre = copiar(base)
    sobre.links[1].y = sobre.links[0].y
    sobre.links[1].x = sobre.links[0].x
    expect(violacoesDosAlvos(sobre, 'madrugada'), 'controle: dois links no mesmo lugar').not.toEqual([])
  })

  it('3 respiro e altura: 64 px em cima e embaixo e até 440 px de 768 em diante, 480 abaixo (controle: 40 px falha)', () => {
    paraCadaCaso(PAGINAS, LARGURAS, (q, rotulo) => expect(violacoesDoRespiro(q), rotulo).toEqual([]))
    // Registrado para citar no relatório: a maior altura medida de cada largura e tema.
    const resumo: string[] = []
    for (const tema of TEMAS) {
      for (const largura of LARGURAS) resumo.push(`${largura} ${tema} ${Math.round(Math.max(...PAGINAS.map((p) => quadro(p, tema, largura).rodape.height)))}px`)
    }
    process.stdout.write(`ALTURA_RODAPE ${resumo.join(' | ')}\n`)
    const base = quadro(PAGINA_DE_PAPEL, 'madrugada', 1440)
    const apertado = copiar(base)
    apertado.nome.y = apertado.rodape.y + 40
    expect(violacoesDoRespiro(apertado), 'controle: respiro de cima de 40 px').not.toEqual([])
    const baixo = copiar(base)
    baixo.base[baixo.base.length - 1].bottom = baixo.rodape.bottom - 40
    expect(violacoesDoRespiro(baixo), 'controle: respiro de baixo de 40 px').not.toEqual([])
    const alto = copiar(base)
    alto.rodape.height = 441
    expect(violacoesDoRespiro(alto), 'controle: 441 px passa do teto').not.toEqual([])
    const celularAlto = copiar(quadro(PAGINA_DE_PAPEL, 'madrugada', 390))
    celularAlto.rodape.height = 481
    expect(violacoesDoRespiro(celularAlto), 'controle: 481 px em 390 passa do teto').not.toEqual([])
  })

  it('4 tons: todo texto do rodapé é papel (nome, links) ou noite-2 (títulos, aviso, ©), nos dois temas (controle: um terceiro tom falha)', () => {
    paraCadaCaso(PAGINAS, LARGURAS, (q, rotulo) => expect(violacoesDosTons(q), rotulo).toEqual([]))
    const base = quadro(PAGINA_DE_PAPEL, 'claro', 1440)
    const aviso = copiar(base)
    aviso.base[0].cor = 'rgb(110, 101, 96)'
    expect(violacoesDosTons(aviso), 'controle: aviso em outro tom').not.toEqual([])
    const link = copiar(base)
    link.links[3].cor = 'rgb(185, 192, 159)'
    expect(violacoesDosTons(link), 'controle: link em noite-2').not.toEqual([])
    const titulo = copiar(base)
    titulo.titulos[0].cor = 'rgb(248, 246, 235)'
    expect(violacoesDosTons(titulo), 'controle: título em papel').not.toEqual([])
  })

  it('5 página curta: em /rota-que-nao-existe o rodapé começa na altura da janela, com o © inteiro dentro dele e sem papel embaixo (controle: rodapé alto demais falha)', () => {
    for (const tema of TEMAS) {
      for (const largura of [390, 1440]) {
        const q = quadro(PAGINA_CURTA, tema, largura)
        expect(q.innerHeight, 'janela de 390x844 e 1440x900').toBe(largura === 390 ? 844 : 900)
        expect(violacoesDaPaginaCurta(q), `${PAGINA_CURTA} (${tema}, ${largura})`).toEqual([])
      }
    }
    const base = quadro(PAGINA_CURTA, 'claro', 1440)
    const cedo = copiar(base)
    cedo.rodape.y = cedo.innerHeight - 100
    expect(violacoesDaPaginaCurta(cedo), 'controle: rodapé começa acima do fim da janela').not.toEqual([])
    const copiaFora = copiar(base)
    copiaFora.base[copiaFora.base.length - 1].bottom = copiaFora.rodape.bottom + 10
    expect(violacoesDaPaginaCurta(copiaFora), 'controle: © fora do rodapé').not.toEqual([])
    const faixaDePapel = copiar(base)
    faixaDePapel.scrollHeight = faixaDePapel.rodape.bottom + 60
    expect(violacoesDaPaginaCurta(faixaDePapel), 'controle: 60 px de papel embaixo').not.toEqual([])
  })

  it('6 fecho de cacau: sem vão nem fio, botão a 96 px do nome; a última faixa de papel guarda a junção de hoje (controles: vão e botão colado falham)', () => {
    for (const tema of TEMAS) {
      for (const largura of LARGURAS) {
        const rotulo = `${tema}, ${largura}`
        expect(violacoesDoFechoDeCacau(quadro(PAGINA_DE_CACAU, tema, largura)), `${PAGINA_DE_CACAU} (${rotulo})`).toEqual([])
        expect(violacoesDaJuncaoDePapel(quadro(PAGINA_DE_PAPEL, tema, largura)), `${PAGINA_DE_PAPEL} (${rotulo})`).toEqual([])
      }
    }
    const cacau = quadro(PAGINA_DE_CACAU, 'claro', 390)
    const comVao = copiar(cacau)
    comVao.rodape.y += 40
    expect(violacoesDoFechoDeCacau(comVao), 'controle: 40 px de vão').not.toEqual([])
    const comFio = copiar(cacau)
    comFio.rodape.bordaTopo = 1
    expect(violacoesDoFechoDeCacau(comFio), 'controle: fio na junção').not.toEqual([])
    const colado = copiar(cacau)
    colado.ultimaFaixa!.cta!.bottom = colado.nome.y - 40
    expect(violacoesDoFechoDeCacau(colado), 'controle: botão a 40 px do nome').not.toEqual([])
    const papelSemMargem = copiar(quadro(PAGINA_DE_PAPEL, 'claro', 1440))
    papelSemMargem.rodape.y = papelSemMargem.main!.bottom + 1
    expect(violacoesDaJuncaoDePapel(papelSemMargem), 'controle: a junção de papel mudou').not.toEqual([])
    const faixaDeCacau = copiar(quadro(PAGINA_DE_PAPEL, 'claro', 1440))
    faixaDeCacau.ultimaFaixa!.fundo = 'rgb(43, 35, 32)'
    expect(violacoesDaJuncaoDePapel(faixaDeCacau), 'controle: a faixa de papel virou cacau').not.toEqual([])
  })
})
