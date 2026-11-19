import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro } from '../../dados/rotina.tipos.ts'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
import { criarMundoDeTeste, type Mundo } from '../../teste/rotina.fixture.ts'

// QH-07: o nome de quem NÃO é a pessoa que olha a tela tem 5000 letras e não pode estourar a largura da página. Carla
// (outra pessoa da família) é renomeada pela camada de dados em memória e passa a ser autora de um registro de hoje, de
// uma nota em destaque e de uma sessão em andamento (as sessões em paralelo). O jsdom não tem layout: a tela real de
// /app/hoje e de /app/historico vira um arquivo html que liga o CSS já construído (web/dist/assets/*.css), e o Chrome
// sem janela mede a rolagem horizontal do documento e a caixa do botão do menu, em 390x844 e em 1440x900. Layout real,
// nada simulado. NÃO PULA: sem o Chrome, sem o CSS do build (`npm run build`) ou com menos de 4 medições feitas, o
// teste FALHA. Com `AUD_CAPTURAS` não há captura aqui: a medida é numérica.

const CANDIDATOS_NO_LINUX = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]
const CHROME =
  process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : (process.env.CHROME_PATH ?? CANDIDATOS_NO_LINUX.find((caminho) => existsSync(caminho)) ?? CANDIDATOS_NO_LINUX[0])
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const NOME_LONGO = 'Q'.repeat(5000)
const MINUTO = 60_000
// O fuso do aparelho e o relógio ficam fixos: o dia do cenário (e quem está depois do marco de Juliana) não muda com a
// máquina nem com a hora em que o teste roda. Só `Date` é falso: o Chrome (processo filho) e os temporizadores seguem reais.
const FUSO = 'America/Sao_Paulo'
const INSTANTE = new Date('2026-11-18T15:00:00.000Z')
const TZ_ORIGINAL = process.env.TZ

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
}

const ROTAS: Rota[] = [
  { nome: 'hoje', caminho: '/app/hoje' },
  { nome: 'historico', caminho: '/app/historico' },
]

interface Medida {
  erro?: string
  innerWidth: number
  innerHeight: number
  fontes: string
  faces: string[]
  scrollWidth: number
  clientWidth: number
  menu: { left: number; right: number; width: number } | null
  culpado: string
  culpadoDireita: number
}

// O script de dentro da página: espera as fontes (depois de forçar o primeiro layout) e escreve a medida em JSON
// num <pre> escondido. O elemento mais largo é o de maior `right` do corpo, escrito como um seletor curto.
const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const raiz = document.documentElement
    const seletor = (el) => {
      const partes = []
      for (let atual = el; atual && atual !== document.body && partes.length < 4; atual = atual.parentElement) {
        const classes = [...atual.classList].slice(0, 3).map((c) => '.' + c).join('')
        partes.unshift(atual.tagName.toLowerCase() + (atual.id ? '#' + atual.id : '') + classes)
      }
      return partes.join(' > ')
    }
    let culpado = null
    let maior = -Infinity
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('#geometria') || el.tagName === 'SCRIPT') continue
      const direita = el.getBoundingClientRect().right
      if (direita > maior) { maior = direita; culpado = el }
    }
    const botao = document.querySelector('button.sb-cab-menu')
    const r = botao ? botao.getBoundingClientRect() : null
    const texto = JSON.stringify({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      fontes: document.fonts.status,
      faces: [...document.fonts].map((f) => f.family + ':' + f.status),
      scrollWidth: raiz.scrollWidth,
      clientWidth: raiz.clientWidth,
      menu: r ? { left: r.left, right: r.right, width: r.width } : null,
      culpado: culpado ? seletor(culpado) : '(nenhum)',
      culpadoDireita: Number.isFinite(maior) ? maior : 0,
    })
    saida.textContent = texto
    if (window.parent !== window) window.parent.postMessage(texto, '*')
  } catch (e) {
    const texto = JSON.stringify({ erro: String(e), innerWidth: 0, innerHeight: 0, fontes: '', faces: [], scrollWidth: 0, clientWidth: 0, menu: null, culpado: '', culpadoDireita: 0 })
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

/** A janela da medição (--dump-dom): maior que o iframe, porque a moldura do Chrome sem janela come largura e altura. */
function janelaDaMedicao(tela: Tela): Tela {
  return { largura: Math.max(tela.largura, 600) + 16, altura: tela.altura + 300 }
}

function argumentosDoChrome(perfil: string, janela: Tela, alvo: string): string[] {
  return [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    // CI-UBUNTU: no Chrome 157 do Linux esta opção mata o processo ("FD ownership violation"); no Windows ela fica.
    ...(process.platform === 'win32' ? ['--disable-crashpad-for-testing'] : []),
    '--no-first-run',
    '--allow-file-access-from-files',
    `--user-data-dir=${perfil}`,
    '--force-device-scale-factor=1',
    `--window-size=${janela.largura},${janela.altura}`,
    '--virtual-time-budget=3000',
    '--dump-dom',
    pathToFileURL(alvo).href,
  ]
}

/** O subprocesso do Chrome tem de ter terminado limpo: status 0, sem sinal e sem erro de spawn. Senão, a saída dele não vale. */
function exigirExecucaoLimpa(resultado: SpawnSyncReturns<string>, rotulo: string): void {
  if (resultado.status === 0 && !resultado.error && !resultado.signal) return
  throw new Error(
    `${rotulo}: o Chrome não terminou limpo (status ${resultado.status}, sinal ${resultado.signal ?? 'nenhum'}, erro ${resultado.error?.message ?? 'nenhum'}): ${resultado.stderr ?? ''}`,
  )
}

/** Roda o Chrome com a saída em arquivos, não em pipes: filhos do Chrome que sobram vivos seguram o pipe aberto. */
function executarChrome(argumentos: string[], pasta: string, nome: string): SpawnSyncReturns<string> {
  const arquivoDeSaida = join(pasta, `${nome}.stdout.txt`)
  const arquivoDeErros = join(pasta, `${nome}.stderr.txt`)
  const saida = openSync(arquivoDeSaida, 'w')
  const erros = openSync(arquivoDeErros, 'w')
  try {
    const resultado = spawnSync(CHROME, argumentos, { stdio: ['ignore', saida, erros], timeout: 45_000, windowsHide: true })
    const stdout = readFileSync(arquivoDeSaida, 'utf8')
    const stderr = readFileSync(arquivoDeErros, 'utf8')
    return { ...resultado, output: [null, stdout, stderr], stdout, stderr }
  } finally {
    closeSync(saida)
    closeSync(erros)
  }
}

function medirNoChrome(telaHtml: string, tela: Tela, nomeDaRota: string): Medida {
  const pasta = mkdtempSync(join(tmpdir(), 'nome-longo-'))
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
    // A página vai num iframe da largura E da altura pedidas: as media queries respondem ao iframe e a medida volta por postMessage.
    const alvo = join(pasta, 'envoltorio.html')
    writeFileSync(
      alvo,
      `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;display:block;width:${tela.largura}px;height:${tela.altura}px"></iframe><pre id="geometria" hidden></pre>` +
        `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
      'utf8',
    )
    const resultado = executarChrome(argumentosDoChrome(perfil, janelaDaMedicao(tela), alvo), pasta, 'medicao')
    exigirExecucaoLimpa(resultado, `${nomeDaRota} ${tela.largura}x${tela.altura} --dump-dom`)
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.stdout ?? '')
    if (!achado) {
      throw new Error(`O Chrome não devolveu a medida (status ${resultado.status}, erro ${resultado.error?.message ?? 'nenhum'}): ${resultado.stderr ?? ''}`)
    }
    return JSON.parse(achado[1]) as Medida
  } finally {
    rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

const idDeTeste = (numero: number) => `a0000000-0000-7000-8000-${String(numero).padStart(12, '0')}`

/**
 * O mundo de teste com Carla (que não é Juliana, quem olha a tela) autora de: um registro de hoje depois do marco de
 * Juliana (o "Desde o seu último registro"), a nota em destaque da fixture e uma sessão de mamada em andamento. A de
 * sono de Ícaro (a mais nova) fica como a principal do Hoje; a de Carla, mais antiga, cai em "Outras sessões" (as
 * sessões em paralelo, que só aparecem com mais de uma sessão). Depois, ela é renomeada pela camada de dados da conta
 * (a única que muda um nome: a conta entrada muda o próprio) e a sessão volta a ser a de Juliana.
 */
async function mundoComNomeLongo(): Promise<Mundo> {
  const agora = Date.now()
  const mundo = criarMundoDeTeste({
    fusoDaFamilia: FUSO,
    diaCompleto: true,
    ajustarRotina: (fixture) => {
      const fralda = fixture.registros.find((registro) => registro.tipo === 'fralda')!
      const sono = fixture.registros.find((registro) => registro.tipo === 'sono' && registro.fim === null)!
      const inicioDoRegistro = new Date(agora - 30 * MINUTO).toISOString()
      const inicioDaSessao = new Date(agora - 100 * MINUTO).toISOString()
      const registroDeCarla: Registro = {
        ...fralda,
        id: idDeTeste(777),
        criadoPor: PESSOAS.carla.id,
        inicio: inicioDoRegistro,
        recebidoEm: inicioDoRegistro,
        atualizadoEm: inicioDoRegistro,
      }
      const sessaoDeCarla: Registro = {
        ...sono,
        id: idDeTeste(778),
        tipo: 'mamada',
        criadoPor: PESSOAS.carla.id,
        inicio: inicioDaSessao,
        recebidoEm: inicioDaSessao,
        atualizadoEm: inicioDaSessao,
      }
      return { ...fixture, registros: [...fixture.registros, registroDeCarla, sessaoDeCarla] }
    },
  })
  mundo.conta.sessaoParaTeste(PESSOAS.carla.email)
  const renomeada = await mundo.conta.atualizarMinhaConta(NOME_LONGO, FUSO)
  expect(renomeada.ok, 'a camada de dados renomeia Carla').toBe(true)
  mundo.conta.sessaoParaTeste(PESSOAS.juliana.email)
  return mundo
}

/** As medições que de fato rodaram no Chrome (rota@largura x altura): o último teste confere as 4. */
const FEITAS: string[] = []

describe('o nome de 5000 letras de outra pessoa da família, no Chrome (390x844 e 1440x900)', () => {
  const LARGURA_ORIGINAL = window.innerWidth
  beforeAll(() => {
    process.env.TZ = FUSO
  })
  // O `setup.ts` volta ao relógio real depois de cada teste: o relógio falso é ligado a cada teste, o fuso uma vez.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(INSTANTE)
  })
  afterAll(() => {
    vi.useRealTimers()
    if (TZ_ORIGINAL === undefined) delete process.env.TZ
    else process.env.TZ = TZ_ORIGINAL
  })
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: LARGURA_ORIGINAL })
  })

  for (const rota of ROTAS) {
    for (const tela of TELAS) {
      it(
        `${rota.caminho} em ${tela.largura}x${tela.altura}: a página não rola na horizontal${tela.largura === 390 ? ' e o botão do menu fica dentro da janela' : ''}`,
        async () => {
          exigirAmbiente()
          Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: tela.largura })
          const mundo = await mundoComNomeLongo()
          const { container } = renderizarRota(rota.caminho, { mundo })
          await aguardarCarga()
          // O nome longo chegou à tela: a medida de fora é a do cenário, não a de uma tela sem ele.
          expect(container.textContent ?? '', `${rota.caminho}: o nome longo de Carla na tela do jsdom`).toMatch(/Q{20,}/)
          if (rota.nome === 'hoje') {
            // Cada linha de autor do cenário existe na tela e leva o nome longo: senão a medida não cobre aquela linha.
            const linhasDeAutor: Array<[string, string]> = [
              ['[data-notas]', 'a nota em destaque ("Carla, HH:MM")'],
              ['[data-desde]', 'o registro depois do marco ("por Carla")'],
              ['[data-sessoes-em-paralelo]', 'a sessão em andamento ("por Carla")'],
            ]
            for (const [seletor, descricao] of linhasDeAutor) {
              const bloco = container.querySelector(seletor)
              expect(bloco, `${rota.caminho}: o bloco ${seletor} existe (${descricao})`).not.toBeNull()
              expect(bloco!.textContent ?? '', `${rota.caminho}: ${seletor} traz o nome longo de Carla em ${descricao}`).toMatch(/Q{20,}/)
            }
          } else {
            // O Histórico: a linha "por <autor>" da LinhaDoDia leva o nome longo e quebra em qualquer ponto (`wrap-anywhere`).
            const linhasDoAutor = [...container.querySelectorAll('p')].filter((p) => /Q{20,}/.test(p.textContent ?? ''))
            expect(linhasDoAutor.length, `${rota.caminho}: ao menos um <p> com o nome longo de Carla ("por Carla")`).toBeGreaterThan(0)
            expect(
              linhasDoAutor.some((p) => p.classList.contains('wrap-anywhere')),
              `${rota.caminho}: a linha "por <autor>" com o nome longo tem a classe wrap-anywhere`,
            ).toBe(true)
          }

          const medida = medirNoChrome(container.innerHTML, tela, rota.nome)

          expect(medida.erro).toBeUndefined()
          expect(medida.innerWidth).toBe(tela.largura)
          expect(medida.innerHeight).toBe(tela.altura)
          expect(medida.fontes).toBe('loaded')
          expect(medida.faces.some((face) => face.endsWith(':loaded'))).toBe(true)
          // A medição valeu: conta antes das comparações, para o RED não esconder a contagem.
          FEITAS.push(`${rota.nome}@${tela.largura}x${tela.altura}`)

          const excesso = medida.scrollWidth - medida.clientWidth
          expect.soft(
            excesso,
            `${rota.caminho} em ${tela.largura}x${tela.altura}: a página rola ${excesso} px na horizontal (scrollWidth ${medida.scrollWidth} - clientWidth ${medida.clientWidth}); o elemento mais largo é "${medida.culpado}" e termina em x=${medida.culpadoDireita}`,
          ).toBeLessThanOrEqual(0)

          if (tela.largura === 390) {
            expect(medida.menu, `${rota.caminho}: o botão do menu (button.sb-cab-menu) existe a 390 px`).not.toBeNull()
            expect.soft(
              medida.menu!.right,
              `${rota.caminho}: o botão do menu termina em x=${medida.menu!.right}, fora da janela de ${tela.largura} px (começa em ${medida.menu!.left}, largura ${medida.menu!.width}); o elemento mais largo é "${medida.culpado}"`,
            ).toBeLessThanOrEqual(tela.largura)
          }
        },
        90_000,
      )
    }
  }

  it('as 4 medições (2 rotas x 2 telas) rodaram no Chrome', () => {
    const esperadas = ROTAS.flatMap((rota) => TELAS.map((tela) => `${rota.nome}@${tela.largura}x${tela.altura}`))
    expect(FEITAS).toHaveLength(4)
    expect([...FEITAS].sort()).toEqual([...esperadas].sort())
  })
})
