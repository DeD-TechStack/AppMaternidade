import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'

// R2-01 (QA-F1): a geometria do cabeçalho logado num Chrome de verdade. O jsdom não tem layout, então a
// largura dos itens nunca foi medida: aqui o `<Cabecalho>` real (a pessoa entrada, em /app/hoje) vira um
// arquivo html que liga o CSS já construído (web/dist/assets/*.css), e o Chrome sem janela mede cada item
// com getBoundingClientRect depois que as fontes carregam. Layout real, nada simulado. O teste só roda com o
// Chrome instalado e o build feito (`npm run build`); sem um dos dois, pula e diz por quê. O `check` faz o
// build antes de testar; em CI (qualquer sistema), Chrome ou build ausente falha em vez de pular.
// O Chrome roda com spawn assíncrono, saída em arquivos e grupo de processos próprio, morto inteiro no fim, com todo
// await limitado no tempo. HIPÓTESE (não provada): no ubuntu do CI o "Killed" veio de um Chrome (ou filhos dele) que
// ficou vivo e segurou os pipes do spawnSync ou a memória do runner; a mudança elimina esses dois caminhos, mas a causa
// só se confirma com a telemetria do passo de diagnóstico do job ubuntu (.github/workflows/ci.yml).

const CANDIDATOS_DO_CHROME: Record<string, string[]> = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
}
const CHROME_DO_AMBIENTE = process.env.CHROME_PATH
const BUSCADOS = [
  ...(CHROME_DO_AMBIENTE ? [CHROME_DO_AMBIENTE] : []),
  ...(CANDIDATOS_DO_CHROME[process.platform] ?? []),
]
const CHROME: string = BUSCADOS.find((caminho) => existsSync(caminho)) ?? BUSCADOS[0] ?? 'chrome'
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const LARGURAS = [390, 768, 1024, 1100, 1280, 1440]
const PONTO_DE_QUEBRA = 1100
const TEMAS = ['claro', 'madrugada'] as const
type Tema = (typeof TEMAS)[number]
const TOLERANCIA = 0.5
// Uma linha de links: 48 px de dia; na madrugada todo alvo do cabeçalho tem 56 (campo.css), e duas linhas passariam de 100.
const ALTURA_MAXIMA_DA_NAVEGACAO: Record<Tema, number> = { claro: 48, madrugada: 56 }

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

const motivoDoPulo: string | null = !existsSync(CHROME)
  ? `Chrome não encontrado (buscado em: ${BUSCADOS.join(', ') || 'nenhum caminho para ' + process.platform}; defina CHROME_PATH)`
  : arquivosCss().length === 0
    ? 'sem web/dist/assets/*.css: rode `npm run build` antes'
    : null

const exigirNoCI = Boolean(process.env.CI)

interface Caixa {
  rotulo: string
  seletor: string
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
  fontes: string
  faces: string[]
  caixas: Caixa[]
  /** Os rótulos de tudo que existe no painel do menu (visível ou não): o que o CSS esconde não some da lista. */
  menuExistentes: string[]
  navegacao: { height: number } | null
}

// O script de dentro da página: espera as fontes (depois de forçar o primeiro layout, que é quando elas
// começam a carregar) e escreve a medida em JSON num <pre> escondido, que o --dump-dom devolve.
const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const visivel = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
    const seletores = ['.cm-marca', '.cm-cab-links>a', '.cm-cab-acoes>a', '.cm-cab-acoes>button', '.cm-menu-acoes a, .cm-menu-acoes button']
    const caixas = []
    const menuExistentes = []
    for (const seletor of seletores) {
      for (const el of document.querySelectorAll(seletor)) {
        if (seletor.startsWith('.cm-menu-acoes')) menuExistentes.push(el.getAttribute('aria-label') || el.textContent.trim())
        if (!visivel(el)) continue
        const r = el.getBoundingClientRect()
        caixas.push({
          rotulo: el.getAttribute('aria-label') || el.textContent.trim(),
          seletor,
          x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height,
        })
      }
    }
    const nav = document.querySelector('.cm-cab-links')
    const texto = JSON.stringify({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      fontes: document.fonts.status,
      faces: [...document.fonts].map((f) => f.family + ':' + f.status),
      caixas,
      menuExistentes,
      navegacao: nav && visivel(nav) ? { height: nav.getBoundingClientRect().height } : null,
    })
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  } catch (e) {
    const texto = JSON.stringify({ erro: String(e), innerWidth: 0, innerHeight: 0, fontes: '', faces: [], caixas: [], menuExistentes: [], navegacao: null })
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  }
})()
`

/** O CSS do build aponta as fontes por `/assets/...`: numa página file:// isso vira a raiz do disco, então as URLs absolutas passam a apontar para o dist. */
function cssComFontesDoDist(nome: string): string {
  const base = `${pathToFileURL(PASTA_DIST).href}/`
  return readFileSync(join(PASTA_CSS, nome), 'utf8').replace(/url\((["']?)\/(?!\/)/g, (_t, aspas: string) => `url(${aspas}${base}`)
}

async function medirNoChrome(cabecalhoHtml: string, largura: number, tema: Tema): Promise<Medida> {
  const pasta = mkdtempSync(join(tmpdir(), 'cm-geometria-'))
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
      // A madrugada é o `data-tema="madrugada"` na raiz (luaDoCabecalho.ts): sem ele o CSS de cacau não se aplica.
      `<!doctype html><html lang="pt-BR"${tema === 'madrugada' ? ' data-tema="madrugada"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${folhas.join('')}</head>` +
        `<body><div id="root">${cabecalhoHtml}</div><pre id="geometria" hidden></pre><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    // O Chrome sem janela não passa de ~500 px de largura: abaixo disso a página vai num iframe da largura pedida
    // (as media queries respondem à largura do iframe) e devolve a medida por postMessage.
    let alvo = pagina
    if (largura < 500) {
      alvo = join(pasta, 'envoltorio.html')
      writeFileSync(
        alvo,
        `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;width:${largura}px;height:700px"></iframe><pre id="geometria" hidden></pre>` +
          `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
        'utf8',
      )
    }
    // Saída em arquivos, nunca em pipes: os filhos do Chrome que sobrevivem não seguram nada que nos bloqueie.
    const arquivoDeSaida = join(pasta, 'saida.txt')
    const arquivoDeErro = join(pasta, 'erro.txt')
    const fdSaida = openSync(arquivoDeSaida, 'w')
    const fdErro = openSync(arquivoDeErro, 'w')
    let filho: ChildProcess | null = null
    let terminou: Promise<{ status: number | null; erro: string | null }> | null = null
    let expirou = false
    // O resultado do filho fica aqui assim que ele termina: depois do limite e da limpeza nunca se espera de novo uma promise pendente.
    let final: { status: number | null; erro: string | null } | null = null
    try {
      const alvoDoFilho = spawn(
        CHROME,
        [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          // CI-UBUNTU: no Chrome 157 do Linux esta opção mata o processo com "FD ownership violation", então o Chrome
          // nunca devolve a medida, cada queda aciona o apport e o runner morre sem memória. No Windows ela fica.
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
          // No Linux não há moldura, então o innerWidth já é igual à largura da janela.
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
        relogio = setTimeout(() => resolver('tempo'), 45_000)
      })
      expirou = (await Promise.race([terminou, limite]).finally(() => clearTimeout(relogio))) === 'tempo'
    } finally {
      if (filho?.pid !== undefined) matarGrupo(filho.pid, filho)
      // Depois do kill, espera o exit por um instante antes de apagar a pasta.
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
    // Sem await: se o Chrome não emitiu exit nem error mesmo depois do kill e dos 3 s de espera, rejeita aqui (a pasta é limpa no finally externo).
    const resultado = final ?? { status: null, erro: 'o Chrome não encerrou nem depois do kill (sem exit/error em 3 s)' }
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(readFileSync(arquivoDeSaida, 'utf8'))
    if (!achado) {
      const mensagem = resultado.erro ?? (expirou ? 'tempo esgotado (45000 ms)' : 'nenhum')
      throw new Error(`O Chrome não devolveu a medida (status ${resultado.status}, erro ${mensagem}): ${readFileSync(arquivoDeErro, 'utf8')}`)
    }
    return JSON.parse(achado[1]) as Medida
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
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

const sobrepoe = (a: Caixa, b: Caixa) =>
  Math.min(a.right, b.right) - Math.max(a.x, b.x) > TOLERANCIA && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > TOLERANCIA

const doMenu = (caixa: Caixa) => caixa.seletor.startsWith('.cm-menu-acoes')

describe(`a geometria do cabeçalho logado no Chrome${motivoDoPulo ? ` (pulado: ${motivoDoPulo})` : ''}`, () => {
  const LARGURA_ORIGINAL = window.innerWidth
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: LARGURA_ORIGINAL })
  })

  if (exigirNoCI && motivoDoPulo !== null) {
    it('a geometria roda em CI', () => {
      throw new Error('geometria exigida em CI e não pôde rodar: ' + motivoDoPulo)
    })
  }

  for (const tema of TEMAS) {
    for (const largura of LARGURAS) {
      it.skipIf(motivoDoPulo !== null && !exigirNoCI)(
        `em ${largura} (${tema}): todo item visível cabe na janela, sem corte nem sobreposição, e Conta e Sair estão à vista`,
        async () => {
          // Abaixo do ponto de quebra o jsdom também tem de estar nessa largura (o menu só abre e fica aberto assim).
          Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
          renderizarRota('/app/hoje', { sessao: 'juliana' })
          await aguardarCarga()
          // A lua só existe com a sessão lida: liga a madrugada pelo botão do cabeçalho, como a pessoa.
          if (tema === 'madrugada') {
            fireEvent.click(screen.getByRole('button', { name: 'Modo madrugada' }))
            await aguardarCarga()
          }
          expect(document.documentElement.getAttribute('data-tema')).toBe(tema === 'madrugada' ? 'madrugada' : null)

          // Abaixo de 1100 "Conta" e "Sair" moram no menu, que só existe aberto: abre antes de serializar.
          if (largura < PONTO_DE_QUEBRA) {
            const botaoDoMenu = screen.getByRole('button', { name: 'Menu' })
            fireEvent.click(botaoDoMenu)
            expect(botaoDoMenu.getAttribute('aria-expanded')).toBe('true')
            expect(document.querySelector('[data-menu-celular] .cm-menu-acoes')).not.toBeNull()
          }
          const cabecalho = document.querySelector<HTMLElement>('header[data-cabecalho]')!

          const medida = await medirNoChrome(cabecalho.outerHTML, largura, tema)

          expect(medida.erro).toBeUndefined()
          expect(medida.innerWidth).toBe(largura)
          expect(medida.fontes).toBe('loaded')
          // As fontes do build chegaram de fato (senão a medida seria a da fonte reserva).
          expect(medida.faces.some((face) => face.endsWith(':loaded'))).toBe(true)

          expect(medida.caixas.length).toBeGreaterThan(0)
          for (const caixa of medida.caixas) {
            expect(caixa.x, `${caixa.rotulo}: a borda esquerda`).toBeGreaterThanOrEqual(0)
            expect(caixa.right, `${caixa.rotulo}: a borda direita (${caixa.right}) passa da janela de ${largura}`).toBeLessThanOrEqual(medida.innerWidth)
          }
          // Sem sobreposição entre os itens do cabeçalho e, à parte, entre as ações do painel do menu.
          for (const grupo of [medida.caixas.filter((caixa) => !doMenu(caixa)), medida.caixas.filter(doMenu)]) {
            for (let i = 0; i < grupo.length; i++) {
              for (let j = i + 1; j < grupo.length; j++) {
                expect(sobrepoe(grupo[i], grupo[j]), `${grupo[i].rotulo} sobre ${grupo[j].rotulo}`).toBe(false)
              }
            }
          }

          if (largura >= PONTO_DE_QUEBRA) {
            expect(medida.navegacao).not.toBeNull()
            expect(medida.navegacao!.height).toBeLessThanOrEqual(ALTURA_MAXIMA_DA_NAVEGACAO[tema])
            expect(medida.menuExistentes).toEqual([])
          } else {
            // O menu aberto tem as duas ações no DOM, e esconder uma por CSS apareceria aqui como ausente das caixas.
            expect(medida.menuExistentes).toEqual(expect.arrayContaining(['Conta', 'Sair']))
          }

          // Em todas as larguras: Conta e Sair visíveis, com tamanho, inteiros dentro da janela (no cabeçalho
          // de 1100 para cima; no menu aberto abaixo disso).
          const dasAcoes = medida.caixas.filter((caixa) => (largura >= PONTO_DE_QUEBRA ? !doMenu(caixa) : doMenu(caixa)))
          for (const rotulo of ['Conta', 'Sair']) {
            const caixa = dasAcoes.find((item) => item.rotulo === rotulo)
            expect(caixa, `${rotulo}: não está visível em ${largura}`).toBeDefined()
            expect(caixa!.x, `${rotulo}: a borda esquerda`).toBeGreaterThanOrEqual(0)
            expect(caixa!.right, `${rotulo}: a borda direita passa da janela de ${largura}`).toBeLessThanOrEqual(medida.innerWidth)
            expect(caixa!.width, `${rotulo}: sem largura`).toBeGreaterThan(0)
            expect(caixa!.bottom, `${rotulo}: sem altura`).toBeGreaterThan(caixa!.y)
            expect(caixa!.y, `${rotulo}: o alto fora da janela`).toBeGreaterThanOrEqual(0)
            expect(medida.innerHeight, 'a janela sem altura medida').toBeGreaterThan(0)
            expect(caixa!.bottom, `${rotulo}: a borda de baixo (${caixa!.bottom}) passa da janela de altura ${medida.innerHeight}`).toBeLessThanOrEqual(
              medida.innerHeight,
            )
          }
        },
        60_000,
      )
    }
  }
})
