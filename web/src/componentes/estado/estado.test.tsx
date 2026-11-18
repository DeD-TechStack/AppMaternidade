import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRef } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { simularFalha as simularFalhaConta, criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { simularFalha as simularFalhaComunidade } from '../../dados/comunidade.memoria.ts'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import { HISTORICO, HOJE, NOTAS } from '../../conteudo/rotina.ts'
import { criarComunidadeDeTeste } from '../../teste/comunidade.fixture.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { renderizarRota, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'
import { Carregando } from './Carregando.tsx'
import { ErroDeLeitura } from './ErroDeLeitura.tsx'
import { PainelVazio } from './PainelVazio.tsx'

// Os três estados de leitura que as telas repetiam (carregando, erro de leitura e vazio), numa peça só. As frases
// vêm de quem chama (o catálogo da área): aqui os textos são de teste.

afterEach(() => {
  vi.useRealTimers()
})

describe('Carregando', () => {
  it('texto: role=status com aria-busy, o texto de quem chama, e o h1 da página continua ao lado', () => {
    render(
      <main>
        <h1>Hoje</h1>
        <Carregando texto="Carregando…" />
      </main>,
    )
    const estado = screen.getByRole('status')
    expect(estado.getAttribute('aria-busy')).toBe('true')
    expect(estado.textContent).toBe('Carregando…')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(within(estado).queryByRole('heading')).toBeNull()
  })

  it('esqueleto: some nos primeiros 300 ms, aparece depois, e é estático (sem animação)', () => {
    vi.useFakeTimers()
    const { container } = render(
      <main>
        <h1>Comunidade</h1>
        <Carregando linhas={3} />
      </main>,
    )
    expect(container.querySelector('[data-esqueleto]')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(container.querySelector('[data-esqueleto]')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    const esqueleto = container.querySelector<HTMLElement>('[data-esqueleto]')!
    expect(esqueleto).not.toBeNull()
    expect(esqueleto.getAttribute('role')).toBe('status')
    expect(esqueleto.getAttribute('aria-busy')).toBe('true')
    const barras = esqueleto.querySelectorAll('[aria-hidden="true"]')
    expect(barras).toHaveLength(3)
    expect(container.innerHTML).not.toMatch(/animate-|shimmer|pulse/)
    // O h1 da página fica onde estava, e a peça não cria outro.
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(esqueleto.querySelector('h1, h2, h3')).toBeNull()
  })

  it('esqueleto: o relógio de 300 ms é desfeito ao sair da tela', () => {
    vi.useFakeTimers()
    const { unmount } = render(<Carregando linhas={2} />)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('esqueleto com texto: o texto vai só para o leitor de tela', () => {
    vi.useFakeTimers()
    const { container } = render(<Carregando linhas={2} texto="Carregando…" />)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(container.querySelector('[data-esqueleto]')!.textContent).toBe('Carregando…')
    expect(container.querySelector('[data-esqueleto] .sr-only')).not.toBeNull()
  })
})

describe('ErroDeLeitura', () => {
  it('erro: role=alert focável por código, com o texto e o ícone escondido do leitor', () => {
    const { container } = render(<ErroDeLeitura texto="Não deu para carregar." />)
    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('Não deu para carregar.')
    expect(alerta.getAttribute('tabindex')).toBe('-1')
    expect(alerta.classList.contains('alvo-foco')).toBe(true)
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('com a ação: o botão leva o rótulo de quem chama e chama a ação', () => {
    const aoTentarDeNovo = vi.fn()
    render(<ErroDeLeitura texto="Falhou." aoTentarDeNovo={aoTentarDeNovo} rotuloDeNovo="Tentar de novo" />)
    const botao = screen.getByRole('button', { name: 'Tentar de novo' })
    expect(botao.getAttribute('data-tamanho')).toBe('app')
    fireEvent.click(botao)
    expect(aoTentarDeNovo).toHaveBeenCalledTimes(1)
  })

  it('sem a ação: não há botão', () => {
    render(<ErroDeLeitura texto="Falhou." rotuloDeNovo="Tentar de novo" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('o filho extra (um link) aparece dentro do alerta', () => {
    render(
      <ErroDeLeitura texto="Excluído.">
        <a href="/app/lixeira">Abrir a lixeira</a>
      </ErroDeLeitura>,
    )
    expect(within(screen.getByRole('alert')).getByRole('link', { name: 'Abrir a lixeira' })).toBeTruthy()
  })

  it('repassa data-*, className e o ref do elemento', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ErroDeLeitura texto="Falhou." data-erro-rotina="rede" className="max-w-md" refErro={ref} />)
    const alerta = screen.getByRole('alert')
    expect(alerta.getAttribute('data-erro-rotina')).toBe('rede')
    expect(alerta.classList.contains('max-w-md')).toBe(true)
    expect(ref.current).toBe(alerta)
  })

  it('o contorno vem da cor de erro do tema, com a tinta do texto de reserva, e o texto quebra em palavra longa', () => {
    render(<ErroDeLeitura texto="Falhou." />)
    const alerta = screen.getByRole('alert')
    expect(alerta.className).toContain('var(--cor-erro,var(--cor-texto))')
    expect(alerta.className).toContain('bg-(--cor-cartao)')
    expect(alerta.innerHTML).toContain('wrap-anywhere')
  })
})

describe('PainelVazio', () => {
  it('vazio: um título, a frase e a ação', () => {
    render(
      <PainelVazio titulo="Nenhum tópico">
        <a href="/novo">Novo tópico</a>
      </PainelVazio>,
    )
    const painel = document.querySelector('[data-estado="vazio"]')!
    expect(painel.tagName).toBe('SECTION')
    expect(within(painel as HTMLElement).getByRole('heading', { level: 2, name: 'Nenhum tópico' })).toBeTruthy()
    expect(within(painel as HTMLElement).getByRole('link', { name: 'Novo tópico' })).toBeTruthy()
  })

  it('a frase explicativa vem do texto, e o nível do título é uma escolha', () => {
    render(<PainelVazio titulo="Vazio" nivel={3} texto="Ainda não há nada aqui." />)
    expect(screen.getByRole('heading', { level: 3, name: 'Vazio' })).toBeTruthy()
    expect(screen.getByText('Ainda não há nada aqui.')).toBeTruthy()
  })

  it('sem título (a tela não tinha um): nenhum título é inventado, e a frase fica', () => {
    render(<PainelVazio texto="Nenhum item." />)
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByText('Nenhum item.')).toBeTruthy()
    expect(document.querySelector('[data-estado="vazio"]')).not.toBeNull()
  })
})

// ---- a medida no Chrome: o erro está na primeira tela de um celular (390x844) -------------------------------------
// Mesmo método do `erroNaPrimeiraTela.geometria.test.tsx`: o jsdom não tem layout, então o HTML da peça vai para um
// arquivo que liga o CSS do build (web/dist/assets/*.css) e o Chrome sem janela mede. NÃO PULA: sem Chrome ou sem
// `npm run build`, falha.

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PASTA_DIST = resolve(import.meta.dirname, '..', '..', '..', 'dist')
const PASTA_CSS = join(PASTA_DIST, 'assets')
const TELA = { largura: 390, altura: 844 }

const SCRIPT_DE_MEDIDA = `
(async () => {
  const saida = document.getElementById('geometria')
  try {
    document.body.offsetWidth
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 100))
    const alerta = document.querySelector('[role="alert"]')
    const botao = alerta ? alerta.querySelector('button') : null
    const caixa = (el) => (el ? { top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom } : null)
    const texto = JSON.stringify({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      larguraDoDocumento: document.documentElement.scrollWidth,
      alerta: caixa(alerta),
      botao: caixa(botao),
    })
    saida.textContent = texto
    window.parent.postMessage(texto, '*')
  } catch (e) {
    const texto = JSON.stringify({ erro: String(e) })
    saida.textContent = texto
    window.parent.postMessage(texto, '*')
  }
})()
`

interface Medida {
  erro?: string
  innerWidth: number
  innerHeight: number
  larguraDoDocumento: number
  alerta: { top: number; bottom: number } | null
  botao: { top: number; bottom: number } | null
}

function arquivosCss(): string[] {
  return existsSync(PASTA_CSS) ? readdirSync(PASTA_CSS).filter((nome) => nome.endsWith('.css')) : []
}

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
  const base = `${pathToFileURL(PASTA_DIST).href}/`
  return readFileSync(join(PASTA_CSS, nome), 'utf8').replace(/url\((["']?)\/(?!\/)/g, (_t, aspas: string) => `url(${aspas}${base}`)
}

function executarChrome(argumentos: string[], pasta: string): SpawnSyncReturns<string> {
  const arquivoDeSaida = join(pasta, 'medicao.stdout.txt')
  const arquivoDeErros = join(pasta, 'medicao.stderr.txt')
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

function medirNoChrome(html: string): Medida {
  const pasta = mkdtempSync(join(tmpdir(), 'estado-primeira-tela-'))
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
        `<body><div id="root">${html}</div><pre id="geometria" hidden></pre><script>${SCRIPT_DE_MEDIDA}</script></body></html>`,
      'utf8',
    )
    // A página vai num iframe do tamanho exato da tela: as media queries respondem a ele e o innerHeight é 844.
    const alvo = join(pasta, 'envoltorio.html')
    writeFileSync(
      alvo,
      `<!doctype html><html><body style="margin:0"><iframe src="${pathToFileURL(pagina).href}" style="border:0;display:block;width:${TELA.largura}px;height:${TELA.altura}px"></iframe><pre id="geometria" hidden></pre>` +
        `<script>addEventListener('message', (e) => { document.getElementById('geometria').textContent = e.data })</script></body></html>`,
      'utf8',
    )
    const resultado = executarChrome(
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-crashpad-for-testing',
        '--no-first-run',
        '--allow-file-access-from-files',
        `--user-data-dir=${perfil}`,
        '--force-device-scale-factor=1',
        `--window-size=${Math.max(TELA.largura, 600) + 16},${TELA.altura + 300}`,
        '--virtual-time-budget=3000',
        '--dump-dom',
        pathToFileURL(alvo).href,
      ],
      pasta,
    )
    if (resultado.status !== 0 || resultado.error || resultado.signal) {
      throw new Error(`O Chrome não terminou limpo (status ${resultado.status}, sinal ${resultado.signal ?? 'nenhum'}): ${resultado.stderr ?? ''}`)
    }
    const achado = /<pre id="geometria"[^>]*>([\s\S]*?)<\/pre>/.exec(resultado.stdout ?? '')
    if (!achado) throw new Error(`O Chrome não devolveu a medida: ${resultado.stderr ?? ''}`)
    return JSON.parse(achado[1]) as Medida
  } finally {
    limparPasta(pasta)
  }
}

describe('ErroDeLeitura no Chrome (390x844)', () => {
  it('o alerta e o "Tentar de novo" ficam dentro da primeira tela, mesmo com uma frase longa e uma palavra sem espaço', () => {
    if (!existsSync(CHROME)) throw new Error(`Chrome não encontrado em ${CHROME}`)
    if (arquivosCss().length === 0) throw new Error('Sem web/dist/assets/*.css: rode `npm run build` antes.')
    const longa = `Não deu para carregar os dados. Confira a conexão e tente de novo em instantes. ${'x'.repeat(60)}`
    const { container } = render(
      <main>
        <h1>Histórico</h1>
        <ErroDeLeitura texto={longa} aoTentarDeNovo={() => undefined} rotuloDeNovo="Tentar de novo" />
      </main>,
    )
    const medida = medirNoChrome(container.innerHTML)
    expect(medida.erro).toBeUndefined()
    expect(medida.innerWidth).toBe(TELA.largura)
    expect(medida.innerHeight).toBe(TELA.altura)
    expect(medida.alerta).not.toBeNull()
    expect(medida.botao).not.toBeNull()
    expect(medida.alerta!.top).toBeGreaterThanOrEqual(0)
    expect(medida.botao!.bottom).toBeLessThanOrEqual(TELA.altura)
    // Sem rolagem para os lados: a palavra longa quebra dentro do cartão.
    expect(medida.larguraDoDocumento).toBeLessThanOrEqual(TELA.largura)
  }, 90_000)
})

// ---- uma tela real de cada área, nos estados de erro e de carregando ---------------------------------------------

const ESPERA_ETERNA = () => new Promise<never>(() => undefined)

/** O alerta é desta peça (e não de uma cópia local): leva a marca e está dentro da página, antes de qualquer lista. */
function alertaDaPeca(dentro: HTMLElement): HTMLElement {
  const alerta = dentro.querySelector<HTMLElement>('[role="alert"][data-estado="erro-de-leitura"]')
  expect(alerta, 'o alerta da peça ErroDeLeitura').not.toBeNull()
  expect(alerta!.getAttribute('tabindex')).toBe('-1')
  return alerta!
}

describe('Rotina: o detalhe do registro usa as peças', () => {
  const MAMADA = 'a0000000-0000-7000-8000-000000000003'

  it('erro de leitura: a peça de erro, dentro do main, com "Tentar de novo"', async () => {
    const mundo = criarMundoDeTeste()
    simularFalhaRotina(mundo.rotina, 'registro', 'rede')
    renderizarRota(`/app/registro/${MAMADA}`, { mundo })
    const alerta = await screen.findByRole('alert')
    const principal = document.querySelector('main') as HTMLElement
    expect(principal.contains(alerta)).toBe(true)
    expect(alertaDaPeca(principal)).toBe(alerta)
    expect(alerta.getAttribute('data-erro-rotina')).toBe('rede')
    expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })

  it('carregando: a peça de carregando, com aria-busy, e o h1 da página no lugar', async () => {
    const mundo = criarMundoDeTeste()
    vi.spyOn(mundo.rotina, 'registro').mockImplementation(ESPERA_ETERNA)
    renderizarRota(`/app/registro/${MAMADA}`, { mundo })
    await waitFor(() => expect(document.querySelector('[data-estado="carregando"][role="status"][aria-busy="true"]')).not.toBeNull())
    const principal = document.querySelector('main') as HTMLElement
    expect(within(principal).getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(within(principal).getByText('Carregando…')).toBeTruthy()
  })
})

describe('Comunidade: a lista de tópicos de um espaço usa as peças', () => {
  it('erro de leitura: a peça de erro vem antes do filtro de faixa', async () => {
    const comunidade = criarComunidadeDeTeste(PESSOAS.juliana.id)
    simularFalhaComunidade(comunidade.dados, 'listarTopicos', 'rede')
    renderizarRota('/app/comunidade/sono', { comunidade: comunidade.dados })
    const alerta = await screen.findByRole('alert')
    expect(alertaDaPeca(document.body)).toBe(alerta)
    const filtro = screen.getByRole('group', { name: /faixa/i })
    expect(alerta.compareDocumentPosition(filtro) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })

  it('carregando: o esqueleto da peça aparece depois de 300 ms, com aria-busy e sem animação', async () => {
    const comunidade = criarComunidadeDeTeste(PESSOAS.juliana.id)
    vi.spyOn(comunidade.dados, 'listarTopicos').mockImplementation(ESPERA_ETERNA)
    renderizarRota('/app/comunidade/sono', { comunidade: comunidade.dados })
    await waitFor(() => expect(document.querySelector('[data-esqueleto][role="status"][aria-busy="true"]')).not.toBeNull(), { timeout: 3000 })
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(document.body.innerHTML).not.toMatch(/animate-pulse/)
  })
})

describe('Rotina: os vazios das listas usam o PainelVazio', () => {
  /** O vazio é desta peça (e não um parágrafo local): leva a marca, a frase do catálogo e nenhum título próprio. */
  function vazioDaPeca(dentro: Element, frase: string): HTMLElement {
    const painel = dentro.querySelector<HTMLElement>('[data-estado="vazio"]')
    expect(painel, 'o painel da peça PainelVazio').not.toBeNull()
    expect(painel!.textContent).toBe(frase)
    expect(painel!.querySelector('h1, h2, h3, h4')).toBeNull()
    return painel!
  }

  it('Histórico, vista do dia: o vazio da lista, e o h1 e o h2 "Registros do dia" continuam', async () => {
    await renderizarRotaPronta('/app/historico', { semRegistros: true })
    const secao = document.querySelector<HTMLElement>('[data-registros-do-dia]')!
    vazioDaPeca(secao, HISTORICO.semRegistros)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(within(secao).getByRole('heading', { level: 2, name: HISTORICO.registrosDoDia })).toBeTruthy()
    expect(secao.getAttribute('aria-labelledby')).toBe('historico-registros')
  })

  it('Histórico, vista da semana: o vazio da semana, e o h1 e a lista "Resumo da semana" continuam', async () => {
    await renderizarRotaPronta('/app/historico?vista=semana', { semRegistros: true })
    const principal = document.querySelector('main') as HTMLElement
    vazioDaPeca(principal, HISTORICO.semRegistrosNaSemana)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(within(principal).getByRole('list', { name: HISTORICO.resumoDaSemana })).toBeTruthy()
  })

  it('Hoje, "Últimos": o vazio dentro da seção, com o h2 dos Últimos no lugar', async () => {
    await renderizarRotaPronta('/app/hoje', { semRegistros: true })
    const secao = document.querySelector<HTMLElement>('main #ultimos')!
    expect(secao.hasAttribute('data-ultimos')).toBe(true)
    vazioDaPeca(secao, HOJE.semRegistros)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(within(secao).getByRole('heading', { level: 2, name: HOJE.ultimos })).toBeTruthy()
  })

  it('Notas: o vazio da lista, com o h1 e o h2 da lista no lugar', async () => {
    await renderizarRotaPronta('/app/notas', { semRegistros: true })
    const secao = document.querySelector<HTMLElement>('[data-notas-da-familia]')!
    vazioDaPeca(secao, NOTAS.vazia)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(within(secao).getByRole('heading', { level: 2, name: NOTAS.lista })).toBeTruthy()
    expect(secao.querySelector('ul')).toBeNull()
  })
})

describe('Família e Conta: a Família usa as peças', () => {
  const abrir = (dados: ReturnType<typeof criarDadosContaMemoria>) => renderizarComDados('/app/familia', { dados, sessao: 'juliana' })
  const nova = () => criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))

  it('erro de leitura: a peça de erro, dentro do main, com "Tentar de novo"', async () => {
    const dados = nova()
    simularFalhaConta(dados, 'detalheFamilia', 'rede')
    abrir(dados)
    const alerta = await screen.findByRole('alert')
    expect(alertaDaPeca(document.querySelector('main') as HTMLElement)).toBe(alerta)
    expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })

  it('carregando: a peça de carregando, com aria-busy', async () => {
    const dados = nova()
    vi.spyOn(dados, 'detalheFamilia').mockImplementation(ESPERA_ETERNA)
    abrir(dados)
    await waitFor(() => expect(document.querySelector('[data-estado="carregando"][role="status"][aria-busy="true"]')).not.toBeNull())
    expect(screen.getByText('Carregando…')).toBeTruthy()
  })
})
