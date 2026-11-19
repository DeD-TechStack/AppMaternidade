import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { CHAVE_RECUPERACAO } from '../../componentes/conta/armazenamento.ts'
import { BOTAO_PRINCIPAL, LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { CONTA_EXCLUIDA, MANCHETES, NOMES_DO_H1, REDEFINIR, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { PESSOAS, renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga } from '../../teste/renderizarRota.tsx'

// VIS-4, telas de acesso: o polimento medido num Chrome de verdade (o jsdom não tem layout) e as regras de
// classe e de texto que o jsdom confere. O Chrome sem janela mede a página real (o corpo serializado do jsdom
// com o CSS e as imagens do build, `web/dist`), a 390 px de largura (um celular, ou 780 px com 200% de zoom) e
// 844 px de altura (a primeira tela). Sem Chrome ou sem build o teste pula e diz por quê; em CI falha.
// O executor do Chrome repete o de `casca/geometria.test.tsx` e o de `aberturaTexto.geometria.test.tsx`: um
// auxiliar compartilhado seria um arquivo novo fora do que esta unidade pode editar.

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
  scrollWidth: number
  /** Cada linha de texto do `h1` (uma caixa por linha de cada trecho de texto). */
  linhasDoH1: Caixa[]
  ilustracao: Caixa | null
  /** A frase logo abaixo do título. */
  lide: Caixa | null
  /** A ação principal que é um link (`a.cm-botao-primario`), quando a tela tem uma. */
  acaoPrincipal: (Caixa & { texto: string }) | null
  /** Os elementos do `main` que passam da borda direita da janela. */
  vazando: string[]
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
    const caixa = (r) => ({ x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width, height: r.height })
    const visivel = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
    const h1 = document.querySelector('main h1')
    const linhasDoH1 = []
    if (h1) {
      const andador = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT)
      for (let no = andador.nextNode(); no; no = andador.nextNode()) {
        if (!no.textContent.trim()) continue
        const intervalo = document.createRange()
        intervalo.selectNodeContents(no)
        for (const r of intervalo.getClientRects()) if (r.width > 0 && r.height > 0) linhasDoH1.push(caixa(r))
      }
    }
    const lideEl = document.querySelector('main p.cm-lide')
    const desenho = document.querySelector('main img[data-ilustracao]')
    const acao = document.querySelector('main a.cm-botao-primario')
    const principal = document.querySelector('main')
    const vazando = [...principal.querySelectorAll('*')]
      .filter((el) => visivel(el) && el.getBoundingClientRect().right > window.innerWidth + 0.5)
      .map((el) => el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 60))
    emitir({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      fontes: document.fonts.status,
      scrollWidth: document.documentElement.scrollWidth,
      linhasDoH1,
      ilustracao: desenho && visivel(desenho) ? caixa(desenho.getBoundingClientRect()) : null,
      lide: lideEl ? caixa(lideEl.getBoundingClientRect()) : null,
      acaoPrincipal: acao ? { ...caixa(acao.getBoundingClientRect()), texto: acao.textContent.trim() } : null,
      vazando,
    })
  } catch (e) {
    emitir({ erro: String(e), innerWidth: 0, innerHeight: 0, fontes: '', scrollWidth: 0, linhasDoH1: [], ilustracao: null, lide: null, acaoPrincipal: null, vazando: [] })
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

async function medirNoChrome(corpoHtml: string, largura: number, altura: number): Promise<Medida> {
  const pasta = mkdtempSync(join(tmpdir(), 'cm-acesso-'))
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
    return JSON.parse(texto) as Medida
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

/** A distância entre duas caixas (0 se se tocam ou se cruzam). */
function distancia(a: Caixa, b: Caixa): number {
  const dx = Math.max(0, a.x - b.right, b.x - a.right)
  const dy = Math.max(0, a.y - b.bottom, b.y - a.bottom)
  return Math.hypot(dx, dy)
}

const cruza = (a: Caixa, b: Caixa) => a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom

async function medirTela(caminho: string, largura = 390, altura = 844): Promise<Medida> {
  renderizarComDados(caminho)
  await aguardarCarga()
  const medida = await medirNoChrome(document.body.innerHTML, largura, altura)
  expect(medida.erro).toBeUndefined()
  expect(medida.innerWidth).toBe(largura)
  expect(medida.innerHeight).toBe(altura)
  expect(medida.fontes).toBe('loaded')
  return medida
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

const principal = () => within(document.querySelector('main')!)

describe(`telas de acesso no Chrome, a 390 px${motivoDoPulo ? ` (pulado: ${motivoDoPulo})` : ''}`, () => {
  if (exigirNoCI && motivoDoPulo !== null) {
    it('a geometria roda em CI', () => {
      throw new Error('geometria exigida em CI e não pôde rodar: ' + motivoDoPulo)
    })
  }
  const roda = it.skipIf(motivoDoPulo !== null && !exigirNoCI)

  // A-1: o desenho de traço do celular fica ao lado da segunda linha do título e não pode encostar no texto.
  for (const caminho of ['/criar-conta', '/entrar', '/recuperar-acesso']) {
    roda(
      `${caminho}: nenhuma linha do título cruza o desenho de traço e há 16 px (o vão pilha) entre eles`,
      async () => {
        const medida = await medirTela(caminho)
        expect(medida.ilustracao, 'o desenho de traço aparece no celular').not.toBeNull()
        expect(medida.linhasDoH1.length).toBeGreaterThan(1)
        for (const linha of medida.linhasDoH1) {
          expect(cruza(linha, medida.ilustracao!), `uma linha do título (${JSON.stringify(linha)}) cruza o desenho (${JSON.stringify(medida.ilustracao)})`).toBe(false)
          expect(distancia(linha, medida.ilustracao!), `o vão entre a linha do título e o desenho: ${JSON.stringify(linha)} / ${JSON.stringify(medida.ilustracao)}`).toBeGreaterThanOrEqual(16)
        }
        // A frase logo abaixo também não encosta no desenho (a segunda linha do título termina acima da frase).
        if (medida.lide) {
          expect(cruza(medida.lide, medida.ilustracao!), 'a frase cruza o desenho').toBe(false)
          expect(distancia(medida.lide, medida.ilustracao!), 'o vão entre o desenho e a frase').toBeGreaterThanOrEqual(8)
        }
      },
      60_000,
    )
  }

  // A11Y-ZOOM F-05: 390 px de janela é 200% de zoom em 780. Nada passa da borda e a página não rola de lado.
  for (const caminho of ['/entrar', '/criar-conta', '/recuperar-acesso', '/redefinir-senha', '/conta-excluida', '/convite']) {
    roda(
      `${caminho}: nada passa da borda direita nem rola de lado (200% de zoom)`,
      async () => {
        const medida = await medirTela(caminho)
        expect(medida.vazando, 'elementos além da borda direita').toEqual([])
        expect(medida.scrollWidth).toBeLessThanOrEqual(medida.innerWidth)
      },
      60_000,
    )
  }

  // A-3: a ação principal do estado "link vencido" e a da conta excluída estão na primeira tela de 390 x 844.
  for (const caminho of ['/redefinir-senha', '/conta-excluida']) {
    roda(
      `${caminho}: a ação principal (botão cheio) está inteira dentro da primeira tela de 390 x 844`,
      async () => {
        const medida = await medirTela(caminho)
        expect(medida.acaoPrincipal, 'a tela tem uma ação principal que é um botão cheio').not.toBeNull()
        expect(medida.acaoPrincipal!.y).toBeGreaterThanOrEqual(0)
        expect(medida.acaoPrincipal!.bottom, `${medida.acaoPrincipal!.texto} termina em ${medida.acaoPrincipal!.bottom}`).toBeLessThanOrEqual(medida.innerHeight)
      },
      60_000,
    )
  }
})

describe('/recuperar-acesso: os links são links sublinhados na régua, e só "Enviar link" é botão', () => {
  it('"Entrar" e "Criar conta" são <a> com LINK_ALVO e nenhuma classe de pílula na linha de links', async () => {
    renderizarComDados('/recuperar-acesso')
    await screen.findByRole('button', { name: 'Enviar link' })

    const entrar = principal().getByRole('link', { name: 'Entrar' })
    const criar = principal().getByRole('link', { name: 'Criar conta' })
    const linha = entrar.closest('.border-t')!
    expect(linha).not.toBeNull()
    expect(linha.contains(criar)).toBe(true)
    for (const link of [entrar, criar]) {
      expect(link.tagName).toBe('A')
      for (const classe of LINK_ALVO.split(' ')) expect(link.classList.contains(classe), classe).toBe(true)
    }
    expect(linha.querySelector('[class*="cm-botao"]')).toBeNull()
    expect(linha.querySelector('svg')).toBeNull()
    expect(entrar.getAttribute('href')).toBe('/entrar')
    expect(criar.getAttribute('href')).toBe('/criar-conta')
    // A única ação principal da tela é "Enviar link".
    const botoes = [...document.querySelectorAll('main .cm-botao')]
    expect(botoes.map((botao) => botao.textContent)).toEqual(['Enviar link'])
  })
})

describe('/redefinir-senha e /conta-excluida: uma só ação principal, preenchida', () => {
  it('link vencido: não diz "Escolha a senha nova", mantém a frase do link vencido e tem "Pedir outro link" como botão cheio', async () => {
    renderizarComDados('/redefinir-senha')
    await screen.findByText(TEXTOS_ERRO.link_vencido)

    expect(screen.queryByText(REDEFINIR.frase)).toBeNull()
    expect(document.querySelector('main')!.textContent).not.toContain('Escolha a senha nova')
    const pedir = principal().getByRole('link', { name: REDEFINIR.pedirOutroLink })
    expect(pedir.tagName).toBe('A')
    expect(pedir.getAttribute('href')).toBe('/recuperar-acesso')
    for (const classe of BOTAO_PRINCIPAL.split(' ').filter((c) => !c.startsWith('disabled:'))) {
      expect(pedir.classList.contains(classe), classe).toBe(true)
    }
    expect([...document.querySelectorAll('main .cm-botao')]).toEqual([pedir])
    expect(screen.queryByLabelText('Nova senha')).toBeNull()
  })

  it('carregando: sem formulário e sem a ação de pedir outro link; a frase da tela ainda não é a do link vencido', async () => {
    renderizarComDados('/redefinir-senha')
    expect(document.querySelector('main')!.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Carregando…')).toBeTruthy()
    expect(screen.queryByText(TEXTOS_ERRO.link_vencido)).toBeNull()
    expect(screen.queryByRole('link', { name: REDEFINIR.pedirOutroLink })).toBeNull()
    await screen.findByText(TEXTOS_ERRO.link_vencido)
  })

  it('com a marca válida: o formulário aparece com a frase "Escolha a senha nova…" e sem a ação de link vencido', async () => {
    sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
    renderizarComDados('/redefinir-senha', { sessao: 'juliana' })
    await screen.findByLabelText('Nova senha')

    expect(screen.getByText(REDEFINIR.frase)).toBeTruthy()
    expect(screen.queryByText(TEXTOS_ERRO.link_vencido)).toBeNull()
    expect(screen.queryByRole('link', { name: REDEFINIR.pedirOutroLink })).toBeNull()
    expect(screen.getByRole('button', { name: REDEFINIR.botao })).toBeTruthy()
  })

  it('erro: a nova senha igual à atual mostra o erro no campo, com o formulário e a frase de pé', async () => {
    sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
    renderizarComDados('/redefinir-senha', { sessao: 'juliana' })
    const nova = await screen.findByLabelText(/Nova senha/, { selector: 'input' })
    fireEvent.change(nova, { target: { value: 'senha-demonstracao-igual' } })
    fireEvent.change(screen.getByLabelText(/Repetir a senha/, { selector: 'input' }), { target: { value: 'outra' } })
    fireEvent.click(screen.getByRole('button', { name: REDEFINIR.botao }))

    await waitFor(() => expect(screen.getByText('As duas senhas precisam ser iguais.')).toBeTruthy())
    expect(screen.getByText(REDEFINIR.frase)).toBeTruthy()
  })

  it('/conta-excluida: o primeiro link (Início) é o botão cheio e o segundo (Criar conta) continua link de texto', async () => {
    renderizarComDados('/conta-excluida')
    await screen.findByText(CONTA_EXCLUIDA.frase)

    const inicio = principal().getByRole('link', { name: CONTA_EXCLUIDA.inicio })
    const criar = principal().getByRole('link', { name: CONTA_EXCLUIDA.criarConta })
    expect(inicio.getAttribute('href')).toBe('/')
    expect(criar.getAttribute('href')).toBe('/criar-conta')
    for (const classe of BOTAO_PRINCIPAL.split(' ').filter((c) => !c.startsWith('disabled:'))) {
      expect(inicio.classList.contains(classe), classe).toBe(true)
    }
    expect(criar.classList.contains('cm-botao')).toBe(false)
    for (const classe of LINK_ALVO.split(' ')) expect(criar.classList.contains(classe), classe).toBe(true)
    expect([...document.querySelectorAll('main .cm-botao')]).toEqual([inicio])
    expect(Boolean(inicio.compareDocumentPosition(criar) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })
})

describe('/convite: o título termina com ponto final, como as outras manchetes', () => {
  it('o h1 é "Convite para uma família." e a segunda linha leva o ponto', async () => {
    renderizarComDados('/convite')
    const titulo = await screen.findByRole('heading', { level: 1 })

    expect(titulo.textContent).toBe(`${MANCHETES.convite[0]} ${MANCHETES.convite[1]}.`)
    expect(titulo.textContent).toBe(`${NOMES_DO_H1.convite}.`)
    expect(titulo.textContent!.endsWith('família.')).toBe(true)
    expect(titulo.querySelector('.cm-segunda-linha')!.textContent!.trim()).toBe('uma família.')
  })
})
