import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { simularFalha } from '../dados/comunidade.memoria.ts'
import { simularFalhaRotina } from '../dados/rotina.memoria.ts'
import { aguardarCarga, renderizarRota } from '../teste/renderizarRota.tsx'
import { criarComunidadeDeTeste } from '../teste/comunidade.fixture.ts'
import { PESSOAS } from '../teste/renderizarComDados.tsx'
import { criarMundoDeTeste } from '../teste/rotina.fixture.ts'

// Uma leitura que falha deixa o aviso (role=alert) e o "Tentar de novo" na primeira tela. O jsdom não tem layout, então
// aqui a tela real de cada rota, com a leitura falhando, vira um arquivo html que liga o CSS já construído
// (web/dist/assets/*.css), e o Chrome sem janela mede o alerta e o botão com getBoundingClientRect, em 390x844 e em
// 1440x900. Layout real, nada simulado. NÃO PULA: sem o Chrome, sem o CSS do build (`npm run build`) ou com menos de 6
// medições feitas, o teste FALHA. Com `AUD_CAPTURAS=<pasta>`, cada medição também grava a captura
// `<rota>_<largura>x<altura>.png` nessa pasta.

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const TENTAR_DE_NOVO = 'Tentar de novo'

interface Tela {
  largura: number
  altura: number
}

const TELAS: Tela[] = [
  { largura: 390, altura: 844 },
  { largura: 1440, altura: 900 },
]

interface Rota {
  nome: string
  caminho: string
  /** Monta a tela com a leitura falhando e espera o erro aparecer. */
  abrir: () => Promise<HTMLElement>
}

const ROTAS: Rota[] = [
  {
    // O bloco de tummy time lê o contexto da rotina por conta própria; a página lê a conta, que segue boa.
    nome: 'desenvolvimento',
    caminho: '/app/desenvolvimento',
    abrir: async () => {
      const mundo = criarMundoDeTeste()
      simularFalhaRotina(mundo.rotina, 'contexto', 'rede')
      const { container } = renderizarRota('/app/desenvolvimento', { mundo })
      await aguardarCarga()
      await screen.findByText('Não deu para carregar os dados. Confira a conexão.')
      return container
    },
  },
  {
    nome: 'comunidade-sono',
    caminho: '/app/comunidade/sono',
    abrir: async () => {
      const comunidade = criarComunidadeDeTeste(PESSOAS.juliana.id)
      simularFalha(comunidade.dados, 'listarTopicos', 'rede')
      const { container } = renderizarRota('/app/comunidade/sono', { comunidade: comunidade.dados })
      await aguardarCarga()
      await screen.findByRole('alert')
      return container
    },
  },
  {
    nome: 'historico',
    caminho: '/app/historico',
    abrir: async () => {
      const mundo = criarMundoDeTeste({ diaCompleto: true })
      simularFalhaRotina(mundo.rotina, 'doDia', 'rede')
      const { container } = renderizarRota('/app/historico', { mundo })
      await aguardarCarga()
      await screen.findByRole('alert')
      return container
    },
  },
]

interface Caixa {
  top: number
  bottom: number
}

interface Medida {
  erro?: string
  innerWidth: number
  innerHeight: number
  fontes: string
  faces: string[]
  alertas: number
  botoes: number
  alerta: Caixa | null
  botao: Caixa | null
}

// O script de dentro da página: espera as fontes (depois de forçar o primeiro layout, que é quando elas começam a
// carregar) e escreve a medida em JSON num <pre> escondido, que o --dump-dom devolve.
const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const alertas = [...document.querySelectorAll('[role="alert"]')]
    const botoes = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === ${JSON.stringify(TENTAR_DE_NOVO)})
    const caixa = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom }
    }
    const texto = JSON.stringify({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      fontes: document.fonts.status,
      faces: [...document.fonts].map((f) => f.family + ':' + f.status),
      alertas: alertas.length,
      botoes: botoes.length,
      alerta: caixa(alertas[0]),
      botao: caixa(botoes[0]),
    })
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  } catch (e) {
    const texto = JSON.stringify({ erro: String(e), innerWidth: 0, innerHeight: 0, fontes: '', faces: [], alertas: 0, botoes: 0, alerta: null, botao: null })
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  }
})()
`

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

/** Sem o Chrome ou sem o CSS do build, o teste falha: não há pulo. */
function exigirAmbiente(): void {
  if (!existsSync(CHROME)) throw new Error(`Chrome não encontrado em ${CHROME}`)
  if (arquivosCss().length === 0) throw new Error('Sem web/dist/assets/*.css: rode `npm run build` antes.')
}

/** O CSS do build aponta as fontes por `/assets/...`: numa página file:// isso vira a raiz do disco, então as URLs absolutas passam a apontar para o dist. */
function cssComFontesDoDist(nome: string): string {
  const base = `${pathToFileURL(PASTA_DIST).href}/`
  return readFileSync(join(PASTA_CSS, nome), 'utf8').replace(/url\((["']?)\/(?!\/)/g, (_t, aspas: string) => `url(${aspas}${base}`)
}

function argumentosDoChrome(perfil: string, tela: Tela, alvo: string, saida: string[]): string[] {
  return [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-crashpad-for-testing',
    '--no-first-run',
    '--allow-file-access-from-files',
    `--user-data-dir=${perfil}`,
    '--force-device-scale-factor=1',
    // A janela é maior que o iframe (a moldura do Chrome sem janela come largura e altura): o iframe cabe inteiro.
    `--window-size=${Math.max(tela.largura, 600) + 16},${tela.altura + 300}`,
    '--virtual-time-budget=3000',
    ...saida,
    pathToFileURL(alvo).href,
  ]
}

function medirNoChrome(telaHtml: string, tela: Tela, nomeDaRota: string): Medida {
  const pasta = mkdtempSync(join(tmpdir(), 'erro-primeira-tela-'))
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
        `<body><div id="root">${telaHtml}</div><pre id="geometria" hidden></pre><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    // A página vai num iframe da largura E da altura pedidas, nas duas telas: as media queries respondem ao iframe, e o
    // innerHeight dele é a altura da tela (844 ou 900). Numa janela direta, o Chrome sem janela desconta a moldura da
    // altura (900 pedidos viram 749 de innerHeight) e abaixo de ~500 px de largura nem chega à largura pedida.
    // A medida volta por postMessage.
    const alvo = join(pasta, 'envoltorio.html')
    writeFileSync(
      alvo,
      `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;display:block;width:${tela.largura}px;height:${tela.altura}px"></iframe><pre id="geometria" hidden></pre>` +
        `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
      'utf8',
    )
    const resultado = spawnSync(CHROME, argumentosDoChrome(perfil, tela, alvo, ['--dump-dom']), {
      encoding: 'utf8',
      timeout: 45_000,
      maxBuffer: 64 * 1024 * 1024,
    })
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.stdout ?? '')
    if (!achado) {
      throw new Error(`O Chrome não devolveu a medida (status ${resultado.status}, erro ${resultado.error?.message ?? 'nenhum'}): ${resultado.stderr ?? ''}`)
    }

    const pastaDasCapturas = process.env.AUD_CAPTURAS
    if (pastaDasCapturas) {
      mkdirSync(pastaDasCapturas, { recursive: true })
      const png = resolve(pastaDasCapturas, `${nomeDaRota}_${tela.largura}x${tela.altura}.png`)
      const perfilDaCaptura = join(pasta, 'perfil-captura')
      mkdirSync(perfilDaCaptura)
      const captura = spawnSync(CHROME, argumentosDoChrome(perfilDaCaptura, tela, alvo, [`--screenshot=${png}`]), {
        encoding: 'utf8',
        timeout: 45_000,
        maxBuffer: 64 * 1024 * 1024,
      })
      if (!existsSync(png)) {
        throw new Error(`O Chrome não gravou a captura ${png} (status ${captura.status}, erro ${captura.error?.message ?? 'nenhum'}): ${captura.stderr ?? ''}`)
      }
    }
    return JSON.parse(achado[1]) as Medida
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

/** As medições que de fato rodaram no Chrome (rota@largura x altura): o último teste confere as 6. */
const FEITAS: string[] = []

describe('o erro de leitura na primeira tela, no Chrome (390x844 e 1440x900)', () => {
  const LARGURA_ORIGINAL = window.innerWidth
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: LARGURA_ORIGINAL })
  })

  for (const rota of ROTAS) {
    for (const tela of TELAS) {
      it(
        `${rota.caminho} em ${tela.largura}x${tela.altura}: o alerta começa dentro da janela e o "Tentar de novo" termina dentro dela`,
        async () => {
          exigirAmbiente()
          // Abaixo do ponto de quebra o jsdom também tem de estar na largura da tela (o menu e as regras por JS leem o innerWidth).
          Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: tela.largura })
          const container = await rota.abrir()
          // O jsdom já tem exatamente um alerta e um "Tentar de novo": a medida de fora não é de outra coisa.
          expect(container.querySelectorAll('[role="alert"]'), 'alertas no jsdom').toHaveLength(1)
          expect(
            [...container.querySelectorAll('button')].filter((b) => b.textContent?.trim() === TENTAR_DE_NOVO),
            '"Tentar de novo" no jsdom',
          ).toHaveLength(1)

          const medida = medirNoChrome(container.innerHTML, tela, rota.nome)

          expect(medida.erro).toBeUndefined()
          expect(medida.innerWidth).toBe(tela.largura)
          // A altura da janela medida é a da tela pedida (no iframe, a do iframe).
          expect(medida.innerHeight).toBe(tela.altura)
          expect(medida.fontes).toBe('loaded')
          // As fontes do build chegaram de fato (senão a medida seria a da fonte reserva).
          expect(medida.faces.some((face) => face.endsWith(':loaded'))).toBe(true)
          expect(medida.alertas, 'alertas no Chrome').toBe(1)
          expect(medida.botoes, '"Tentar de novo" no Chrome').toBe(1)
          expect(medida.alerta).not.toBeNull()
          expect(medida.botao).not.toBeNull()
          // A medição valeu: conta antes das comparações de posição, para o RED não esconder a contagem.
          FEITAS.push(`${rota.nome}@${tela.largura}x${tela.altura}`)

          expect(medida.alerta!.top, `${rota.caminho}: o topo do alerta`).toBeGreaterThanOrEqual(0)
          expect(
            medida.botao!.bottom,
            `${rota.caminho}: a borda de baixo do "Tentar de novo" (${medida.botao!.bottom}) passa da janela de altura ${medida.innerHeight} (alerta em ${medida.alerta!.top})`,
          ).toBeLessThanOrEqual(medida.innerHeight)
        },
        90_000,
      )
    }
  }

  it('as 6 medições (3 rotas x 2 telas) rodaram no Chrome', () => {
    const esperadas = ROTAS.flatMap((rota) => TELAS.map((tela) => `${rota.nome}@${tela.largura}x${tela.altura}`))
    expect(FEITAS).toHaveLength(6)
    expect([...FEITAS].sort()).toEqual([...esperadas].sort())
  })
})
