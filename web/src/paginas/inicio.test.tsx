import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INICIO as INICIO_ANTIGO } from '../conteudo/textos.ts'
import { aguardarCarga, renderizarRota } from '../teste/renderizarRota.tsx'

// REP-HOME, round 1 (card t_7afd7849), test-first: the rebuilt `/` (Inicio) rendered in jsdom.
//   REPH-I-01  band order and components inside one [data-casa]; no retired piece.
//   REPH-I-02  every rendered text node and alt is a COPY constant; `ini.leg3` is absent; no literal in
//              the page sources; `CenaEstudio` is not used.
//   REPH-I-31  one h1 with exactly two child spans; the header pill is quiet or filled by the page.
//
// Nothing here imports a file the implementation has yet to create: `conteudo/inicio.ts` and the new
// source folders are read from disk with node:fs, so at the base each test fails on an assertion.
//
// Contract the implementation must meet (leader ruling, round 4; casca/** is not edited):
//   - The page sets `document.documentElement.dataset.inicioHeroi = "visivel"` while the hero's mel pill
//     (`[data-cena-heroi] a[data-botao-mel]`) is in view under the header (IntersectionObserver, top root
//     margin -72 px), deletes it when the pill leaves view and on unmount. `<main>` carries no such state.
//   - The quiet / filled CSS of `a[data-cabecalho-pilula]` lives in `inicio-casa.css`, scoped by
//     `html[data-inicio-heroi="visivel"]`, at every width.
//   - HOME-FINAL (19/11/2026): the hero holds the mel pill "Criar conta" under the value sentence at EVERY width
//     (judge point "restore the yellow 'Criar conta' button" and responsive audit #7), with the text link beside it.
//   - The composition switch is a `matchMedia` query (`(min-width: 1180px) and (min-aspect-ratio: 1/1)`), so jsdom
//     can drive it (the stub reads the first width in the query).

const PASTA_WEB = process.cwd()
const PASTA_SRC = join(PASTA_WEB, 'src')

// The COPY strings (deck COPY_inicio.md, §2) these assertions name; no other pt-BR text is introduced here.
const COPY = {
  h1: 'Ela mamou que horas?',
  h1Spans: ['Ela mamou', 'que horas?'],
  lede: 'Quem cuida do bebê anota o que fez. Quem chega vê a hora e o nome.',
  cta1: 'Criar conta',
  cta2: 'Ver como funciona',
  leg1: '16:00, mamada, anotada por Ju',
  h2Noite: 'Agora é comigo.',
  leg2: '17:30, fralda, anotada por Ícaro',
  h2Tela: 'Dormiu às 20:30.',
  h2So: 'E quando sou só eu?',
  leg3: '15:00, tummy time, anotado por Ju',
  h2Prova: 'Ninguém dá nota para o seu dia.',
  h2Perg: 'Perguntas de quem chega agora.',
  h2Fecho: 'Da próxima vez, já está anotado.',
  altTela1:
    'Tela do Histórico do site num celular. Na lista do dia, a mamada das 16:00 está anotada por Juliana e a fralda das 17:30, por Ícaro.',
  altTela2: 'Tela Hoje do site num celular, no modo madrugada: sono em andamento, com início às 20:30, por Ícaro.',
}

const norm = (texto: string | null | undefined) => (texto ?? '').replace(/\s+/g, ' ').trim()
/** The hour that opens a caption ("16:00") and its author, the last two words ("por Ju"), read from the COPY string. */
const horaDe = (legenda: string) => legenda.slice(0, legenda.indexOf(','))
const autorDe = (legenda: string) => legenda.split(' ').slice(-2).join(' ')

// ---- width and observer stubs ----

const LARGURA_ORIGINAL = window.innerWidth
const MATCHMEDIA_ORIGINAL = window.matchMedia

function fixarLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (consulta: string) => {
      const numero = /(\d+(?:\.\d+)?)(px|rem|em)/.exec(consulta)
      const px = numero ? Number(numero[1]) * (numero[2] === 'px' ? 1 : 16) : Number.NaN
      const matches = /min-width/.test(consulta) ? largura >= px : /max-width/.test(consulta) ? largura <= px : false
      return {
        matches,
        media: consulta,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }
    },
  })
}

class ObservadorFalso {
  static todos: ObservadorFalso[] = []
  alvos = new Set<Element>()
  root = null
  rootMargin = ''
  thresholds: number[] = []
  chamada: IntersectionObserverCallback
  constructor(chamada: IntersectionObserverCallback, opcoes?: IntersectionObserverInit) {
    this.chamada = chamada
    this.rootMargin = opcoes?.rootMargin ?? ''
    ObservadorFalso.todos.push(this)
  }
  observe(alvo: Element) {
    this.alvos.add(alvo)
  }
  unobserve(alvo: Element) {
    this.alvos.delete(alvo)
  }
  disconnect() {
    this.alvos.clear()
  }
  takeRecords() {
    return []
  }
}

const PILULA_DO_HEROI = '[data-cena-heroi] a[data-botao-mel]'

/** Tells every observer that watches the hero pill whether it is in view; returns how many were told. */
function avisarPilulaDoHeroi(visivel: boolean): number {
  let avisados = 0
  act(() => {
    for (const observador of ObservadorFalso.todos) {
      const alvos = [...observador.alvos].filter((alvo) => alvo.matches(PILULA_DO_HEROI))
      if (alvos.length === 0) continue
      avisados += 1
      observador.chamada(
        alvos.map((target) => ({ target, isIntersecting: visivel, intersectionRatio: visivel ? 1 : 0 }) as unknown as IntersectionObserverEntry),
        observador as unknown as IntersectionObserver,
      )
    }
  })
  return avisados
}

beforeEach(() => {
  ObservadorFalso.todos = []
  vi.stubGlobal('IntersectionObserver', ObservadorFalso)
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: LARGURA_ORIGINAL })
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: MATCHMEDIA_ORIGINAL })
})

async function abrir(largura: number) {
  fixarLargura(largura)
  const resultado = renderizarRota('/', { sessao: null })
  await aguardarCarga()
  return resultado
}

const principal = () => document.querySelector<HTMLElement>('main')!

// ---- reading the page sources ----

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
}

/** Every quoted string literal of a source file (comments removed), with whitespace folded. */
function literais(fonte: string): Set<string> {
  const achadas = new Set<string>()
  const limpo = semComentarios(fonte)
  for (const m of limpo.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    achadas.add(norm(m[1] ?? m[2] ?? m[3]))
  }
  return achadas
}

function arquivosDe(pasta: string): string[] {
  if (!existsSync(pasta)) return []
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) return arquivosDe(caminho)
    return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })
}

/** pt-BR literals in a source: a quoted string with an accented letter, or text written between JSX tags. */
function literaisPtBr(fonte: string): string[] {
  const limpo = semComentarios(fonte)
  const entre = [...limpo.matchAll(/>\s*([^<>{}\n]*[A-Za-zÀ-ÿ]{2,}[^<>{}\n]*)\s*</g)].map((m) => norm(m[1]))
  const acentuadas = [...literais(fonte)].filter((texto) => /[À-ÿ]/.test(texto))
  // Text between tags counts when it carries an accented letter or reads as two words of three letters or more.
  return [...entre.filter((texto) => /[À-ÿ]/.test(texto) || /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(texto)), ...acentuadas]
}

// ---------------------------------------------------------------------------------------------
// REPH-I-01
// ---------------------------------------------------------------------------------------------

describe('REPH-I-01 composition of /: one [data-casa], the seven bands in order, no retired piece', () => {
  it('REPH-I-01 /: one main with exactly one [data-casa] that holds every band', async () => {
    await abrir(1440)
    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(principal().querySelectorAll('[data-casa]')).toHaveLength(1)
    const casa = principal().querySelector('[data-casa]')!
    for (const seletor of ['[data-cena-heroi]', '[data-faixa-prova]', '[data-perguntas]', '[data-fechamento]']) {
      expect(casa.querySelectorAll(seletor), seletor).toHaveLength(1)
    }
  })

  it('REPH-I-01 /: the bands come in order (hero, night, screen, only me, proof, questions, closing)', async () => {
    await abrir(1440)
    const faixas = [...principal().querySelectorAll<HTMLElement>('[data-faixa]')]
    // RECUT §8.3 / RF-11: the night (split papel | cacau at the seam from 1024, cacau below), the screen band on cacau,
    // "só eu" on papel, then the proof (areia), the questions (papel) and the closing (cacau), each on its own faixa.
    expect(faixas.map((f) => f.dataset.faixaFundo)).toEqual(['papel', 'cacau', 'papel', 'areia', 'papel', 'cacau'])
    const bandas: Element[] = [
      principal().querySelector('[data-cena-heroi]')!,
      faixas[0],
      faixas[1],
      faixas[2],
      principal().querySelector('[data-faixa-prova]')!,
      principal().querySelector('#perguntas [data-perguntas]')!,
      principal().querySelector('[data-fechamento]')!,
    ]
    for (const banda of bandas) expect(banda).not.toBeNull()
    for (let i = 1; i < bandas.length; i += 1) {
      const depois = bandas[i - 1].compareDocumentPosition(bandas[i]) & Node.DOCUMENT_POSITION_FOLLOWING
      expect(depois, `band ${i + 1} follows band ${i}`).toBeTruthy()
    }
  })

  it('REPH-I-01 /: the questions sit in a page-owned wrapper with id="perguntas" and the closing band is the night one', async () => {
    await abrir(1440)
    const alvo = document.getElementById('perguntas')
    expect(alvo).not.toBeNull()
    expect(alvo!.querySelector('[data-perguntas]')).not.toBeNull()
    expect(principal().querySelectorAll('[data-fechamento]')).toHaveLength(1)
    expect(principal().querySelector('[data-fechamento]')!.getAttribute('data-tom')).toBe('noite')
  })

  it('REPH-I-01 /: two framed real screens, each a [data-produto-tela] with its deck alt', async () => {
    await abrir(1440)
    const telas = [...principal().querySelectorAll<HTMLImageElement>('[data-produto-tela]')]
    expect(telas.map((t) => t.getAttribute('alt'))).toEqual([COPY.altTela1, COPY.altTela2])
  })

  it('REPH-I-01 /: each framed screen is a real capture under ASSET-1\'s frame raster (day on band 2, night on band 3), and no device is drawn in CSS', async () => {
    await abrir(1440)
    const artes = [...principal().querySelectorAll<HTMLImageElement>('[data-produto-moldura-arte]')]
    expect(artes.map((a) => a.tagName)).toEqual(['IMG', 'IMG'])
    expect(artes.map((a) => a.getAttribute('src'))).toEqual(['/molduras/moldura-dia.png', '/molduras/moldura-noite.png'])
    for (const arte of artes) {
      expect(arte.getAttribute('alt')).toBe('')
      expect(arte.getAttribute('aria-hidden')).toBe('true')
      expect([arte.getAttribute('width'), arte.getAttribute('height')]).toEqual(['678', '1423'])
    }
    expect(principal().querySelector('.ic-aparelho, .ic-aparelho-corpo, [data-corpo]')).toBeNull()
  })

  it('REPH-I-01 at 390 the first frame is the night raster on the cacau wall, and no device is drawn in CSS', async () => {
    await abrir(390)
    const artes = [...principal().querySelectorAll<HTMLImageElement>('[data-produto-moldura-arte]')]
    expect(artes.map((a) => a.getAttribute('src'))).toEqual(['/molduras/moldura-noite.png', '/molduras/moldura-noite.png'])
    expect(principal().querySelector('.ic-aparelho, .ic-aparelho-corpo, [data-corpo]')).toBeNull()
  })

  it('REPH-I-01 the page sources and stylesheet no longer name the CSS-drawn device (ic-aparelho, AparelhoEmCss)', () => {
    const fontes = [join(PASTA_SRC, 'paginas', 'Inicio.tsx'), ...PASTAS_DA_CASA.flatMap(arquivosDe)].filter((f) => !/AparelhoEmCss\.tsx$/.test(f))
    for (const arquivo of fontes) expect(readFileSync(arquivo, 'utf8'), arquivo).not.toMatch(/AparelhoEmCss|ic-aparelho/)
    expect(readFileSync(CSS_DA_CASA, 'utf8')).not.toContain('ic-aparelho')
  })

  it('REPH-I-01 /: no retired piece of the old home renders (numbers, seals, shift card, table, quotes, marquee, three-phone scene)', async () => {
    await abrir(1440)
    const velhos = [
      '.in-pagina',
      '.in-faixa-numeros',
      '.in-numeros',
      '.in-selos',
      '.in-citacao',
      '.cm-letreiro',
      '[data-cena]',
      '.cm-cena',
      '[data-revela]',
    ]
    for (const seletor of velhos) expect(principal().querySelector(seletor), seletor).toBeNull()
    const texto = norm(principal().textContent)
    expect(texto).not.toContain(INICIO_ANTIGO.heroi.titulo[0])
    expect(texto).not.toContain(INICIO_ANTIGO.heroi.primario.rotulo)
    expect(texto).not.toContain(INICIO_ANTIGO.turno.titulo[0])
  })

  it('REPH-I-01 /: the page is built from the shared bands and page-owned wrappers (the old inicio components are gone)', () => {
    const fonte = readFileSync(join(PASTA_SRC, 'paginas', 'Inicio.tsx'), 'utf8')
    expect(fonte).toContain('PaginaCasa')
    expect(fonte).toContain('CenaHeroi')
    expect(fonte).toContain('FaixaInteira')
    expect(fonte).toContain('FaixaProva')
    expect(fonte).toContain('Perguntas')
    expect(fonte).toContain('Fechamento')
    expect(fonte).not.toMatch(/componentes\/inicio\//)
    expect(fonte).not.toMatch(/campo\/(FaixaSelos|Citacao)/)
    for (const antigo of ['HeroiInicio', 'SecaoTurno', 'FaixaMadrugada', 'DepoimentosInicio', 'PerguntasInicio', 'SecaoTabela', 'NumerosInicio']) {
      expect(existsSync(join(PASTA_SRC, 'componentes', 'inicio', `${antigo}.tsx`)), antigo).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// REPH-I-02
// ---------------------------------------------------------------------------------------------

const ARQUIVO_COPY = join(PASTA_SRC, 'conteudo', 'inicio.ts')
const PASTAS_DA_CASA = [join(PASTA_SRC, 'componentes', 'inicio-casa'), join(PASTA_SRC, 'movimento', 'troca')]

describe('REPH-I-02 copy: every rendered text and alt is a COPY constant, ini.leg3 is absent, no literal in the page sources', () => {
  it('REPH-I-02 conteudo/inicio.ts exists and holds the deck strings the page needs', () => {
    expect(existsSync(ARQUIVO_COPY)).toBe(true)
    const constantes = literais(readFileSync(ARQUIVO_COPY, 'utf8'))
    for (const texto of [COPY.h1, COPY.lede, COPY.cta1, COPY.cta2, COPY.leg1, COPY.h2Noite, COPY.leg2, COPY.h2Tela, COPY.h2So, COPY.h2Prova, COPY.h2Perg, COPY.h2Fecho, COPY.altTela1, COPY.altTela2]) {
      expect(constantes.has(norm(texto)), texto).toBe(true)
    }
  })

  it('REPH-I-02 every text node of main and every non-empty alt equals a COPY constant (or a run of one, split by a span)', async () => {
    expect(existsSync(ARQUIVO_COPY)).toBe(true)
    const constantes = [...literais(readFileSync(ARQUIVO_COPY, 'utf8'))].filter((texto) => texto !== '')
    await abrir(1440)
    const estrangeiros: string[] = []
    const percurso = document.createTreeWalker(principal(), NodeFilter.SHOW_TEXT)
    for (let no = percurso.nextNode(); no; no = percurso.nextNode()) {
      if (no.parentElement?.closest('script, style')) continue
      const texto = norm(no.textContent)
      if (texto !== '' && !constantes.some((c) => c === texto || c.includes(texto))) estrangeiros.push(texto)
    }
    for (const imagem of principal().querySelectorAll('img[alt]')) {
      const alt = norm(imagem.getAttribute('alt'))
      if (alt !== '' && !constantes.includes(alt)) estrangeiros.push(`alt: ${alt}`)
    }
    expect(estrangeiros).toEqual([])
    // The page also shows the deck strings, whole, as one element each.
    const todos = [...principal().querySelectorAll('*')].map((e) => norm(e.textContent))
    for (const texto of [COPY.h1, COPY.lede, COPY.cta2, COPY.leg1, COPY.h2Noite, COPY.leg2, COPY.h2Tela, COPY.h2So, COPY.h2Prova, COPY.h2Perg, COPY.h2Fecho]) {
      expect(todos.includes(norm(texto)), texto).toBe(true)
    }
  })

  it('REPH-I-02 ini.leg3 (15:00) is not rendered and no caption or heading carries an hour before 16:00', async () => {
    await abrir(1440)
    expect(norm(principal().textContent)).not.toContain(COPY.leg3)
    const horas = [...principal().querySelectorAll('[data-legenda], h1, h2')].flatMap((e) => norm(e.textContent).match(/\b\d{1,2}:\d{2}\b/g) ?? [])
    expect(horas).not.toContain('15:00')
    expect(horas.length).toBeGreaterThan(0)
  })

  it('REPH-I-02 no pt-BR literal in the page sources (inicio-casa/** and movimento/troca/**), and the detector sees one', () => {
    // The detector's own controls.
    expect(literaisPtBr("const x = 'Não'")).toContain('Não')
    expect(literaisPtBr('<p>Olá mundo</p>')).toHaveLength(1)
    expect(literaisPtBr("const c = 'cm-botao cm-botao-mel'")).toEqual([])
    expect(literaisPtBr('// uma nota com acento: ação')).toEqual([])
    // The real sources.
    for (const pasta of PASTAS_DA_CASA) expect(existsSync(pasta), pasta).toBe(true)
    const arquivos = PASTAS_DA_CASA.flatMap(arquivosDe)
    expect(arquivos.length).toBeGreaterThan(0)
    for (const arquivo of arquivos) expect(literaisPtBr(readFileSync(arquivo, 'utf8')), arquivo).toEqual([])
  })

  it('REPH-I-02 CenaEstudio is not used by the page (source and rendered tree)', async () => {
    const fontes = [join(PASTA_SRC, 'paginas', 'Inicio.tsx'), ...PASTAS_DA_CASA.flatMap(arquivosDe)]
    expect(PASTAS_DA_CASA.every((pasta) => existsSync(pasta))).toBe(true)
    for (const arquivo of fontes) expect(readFileSync(arquivo, 'utf8'), arquivo).not.toContain('CenaEstudio')
    await abrir(1440)
    expect(principal().querySelector('[data-cena], .cm-cena')).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// REPH-I-31
// ---------------------------------------------------------------------------------------------

const pilulaDoCabecalho = () => document.querySelector<HTMLAnchorElement>('header[data-cabecalho] a[data-cabecalho-pilula]')
const ganchoDoHeroi = () => document.documentElement.dataset.inicioHeroi
const CSS_DA_CASA = join(PASTA_SRC, 'componentes', 'inicio-casa', 'inicio-casa.css')

describe('REPH-I-31 one h1 with two spans, and the header pill quiet or filled by the page', () => {
  it('REPH-I-31 /: one h1 with exactly two child spans, whole text equal to ini.h1', async () => {
    await abrir(1440)
    const h1s = document.querySelectorAll('h1')
    expect(h1s).toHaveLength(1)
    const h1 = h1s[0]
    expect(h1.children).toHaveLength(2)
    expect([...h1.children].map((filho) => filho.tagName)).toEqual(['SPAN', 'SPAN'])
    expect([...h1.children].map((filho) => norm(filho.textContent))).toEqual(COPY.h1Spans)
    expect(norm(h1.textContent)).toBe(COPY.h1)
    expect(h1.closest('[data-cena-heroi]')).not.toBeNull()
  })

  it('REPH-I-31 at 1440 the hero has the mel pill and the text link, and the header pill is quiet while the hero pill is in view', async () => {
    await abrir(1440)
    const pilula = document.querySelector<HTMLAnchorElement>(PILULA_DO_HEROI)
    expect(pilula).not.toBeNull()
    expect(norm(pilula!.textContent)).toBe(COPY.cta1)
    expect(pilula!.getAttribute('href')).toBe('/criar-conta')
    const link = [...document.querySelectorAll<HTMLAnchorElement>('[data-cena-heroi] a')].find((a) => norm(a.textContent) === COPY.cta2)
    expect(link?.getAttribute('href')).toBe('/como-funciona')
    expect(pilulaDoCabecalho()).not.toBeNull()
    expect(ganchoDoHeroi()).toBe('visivel')
    expect(principal().hasAttribute('data-cta-cabecalho')).toBe(false)
  })

  it('REPH-I-31 at 1440 the html mark goes away once the hero pill is scrolled past, and returns with the pill', async () => {
    await abrir(1440)
    expect(avisarPilulaDoHeroi(false)).toBeGreaterThan(0)
    expect(ganchoDoHeroi()).toBeUndefined()
    expect(avisarPilulaDoHeroi(true)).toBeGreaterThan(0)
    expect(ganchoDoHeroi()).toBe('visivel')
  })

  it('REPH-I-31 at 1440 the observer on the hero pill keeps a -72 px top root margin, and the mark is removed on unmount', async () => {
    const { unmount } = await abrir(1440)
    const dele = ObservadorFalso.todos.find((o) => [...o.alvos].some((alvo) => alvo.matches(PILULA_DO_HEROI)))
    expect(dele?.rootMargin.split(/\s+/)[0]).toBe('-72px')
    expect(ganchoDoHeroi()).toBe('visivel')
    unmount()
    expect(ganchoDoHeroi()).toBeUndefined()
  })

  it('REPH-I-31 the page stylesheet quiets the shell pill only under html[data-inicio-heroi], at every width, with no !important', () => {
    const css = readFileSync(CSS_DA_CASA, 'utf8').replace(/\r\n/g, '\n')
    const semComentario = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const inicio = semComentario.indexOf('html[data-inicio-heroi')
    expect(inicio).toBeGreaterThan(-1)
    const bloco = semComentario.slice(inicio, semComentario.indexOf('@media (prefers-reduced-motion', inicio))
    // The quiet rule is the first one under the mark, and no width query gates it (the pill is in the hero at 390 too).
    expect(bloco.startsWith("html[data-inicio-heroi='visivel'] header[data-cabecalho]:not([data-tom='noite']) a[data-cabecalho-pilula] {")).toBe(true)
    expect(bloco).not.toMatch(/@media \((min|max)-width/)
    expect(bloco).not.toMatch(/!important/)
    // Only the colours change, 160 ms; the filled return animates too through the transition rule of the page.
    const transicao = semComentario.slice(semComentario.indexOf("a[data-cabecalho-pilula] {\n    transition-property"))
    expect(transicao).toMatch(/transition-property: scale, background-color, color;/)
    expect(transicao).toMatch(/transition-duration: 120ms, 160ms, 160ms;/)
    expect(semComentario).not.toMatch(/transition:\s*all/)
    expect(semComentario).not.toContain('data-cta-cabecalho')
  })

  for (const largura of [390, 768, 1023, 1179]) {
    it(`REPH-I-31 at ${largura} the hero has the mel pill "Criar conta" right after the value sentence, the text link beside it, and the header pill is quiet while it is in view`, async () => {
      await abrir(largura)
      const pilula = document.querySelector<HTMLAnchorElement>(PILULA_DO_HEROI)
      expect(pilula).not.toBeNull()
      expect(norm(pilula!.textContent)).toBe(COPY.cta1)
      expect(pilula!.getAttribute('href')).toBe('/criar-conta')
      // Under the value sentence: the lede and the pill share the night block, the lede first.
      const lede = [...document.querySelectorAll('[data-cena-heroi] p')].find((p) => norm(p.textContent) === COPY.lede)!
      expect(lede.compareDocumentPosition(pilula!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(lede.parentElement!.contains(pilula)).toBe(true)
      // The link is the pill's sibling in the same row of actions.
      const link = [...document.querySelectorAll<HTMLAnchorElement>('[data-cena-heroi] a')].find((a) => norm(a.textContent) === COPY.cta2)
      expect(link?.parentElement).toBe(pilula!.parentElement)
      expect(pilulaDoCabecalho()).not.toBeNull()
      expect(ganchoDoHeroi()).toBe('visivel')
      expect(avisarPilulaDoHeroi(false)).toBeGreaterThan(0)
      expect(ganchoDoHeroi()).toBeUndefined()
      // The hero pill and the closing one.
      expect(principal().querySelectorAll('[data-botao-mel]')).toHaveLength(2)
      expect(principal().querySelector('[data-fechamento] [data-botao-mel]')).not.toBeNull()
    })
  }

  it('REPH-I-31 at 1440 the page has two mel buttons: the hero pill and the closing one', async () => {
    await abrir(1440)
    expect(principal().querySelectorAll('[data-botao-mel]')).toHaveLength(2)
    expect(principal().querySelector('[data-fechamento] [data-botao-mel]')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// REPH-I-11 / -12 / -13 / -14 (round 3): the pinned stage, the night sheet, the caption swap, reduced motion
// ---------------------------------------------------------------------------------------------

const BORDAS_R4 = [556.5, 470.1, 354.9, 118.3, 0]
const TRADUCOES_R4 = [38.65, 32.65, 24.65, 8.22, 0]
const PASSOS = [0, 0.25, 0.5, 0.75, 1]

describe('REPH-I-11 pure arithmetic of the pin: progress, edge stops, translateX, pin distance, caption side', () => {
  it('REPH-I-11 the edge stops at p 0 / .25 / .5 / .75 / 1 are the r4 numbers (seam 556.5, centre line 354.9)', async () => {
    const { bordaDaNoite } = await import('../movimento/troca/medidas.ts')
    PASSOS.forEach((p, i) => expect(bordaDaNoite(p, 556.5, 354.9), `p ${p}`).toBeCloseTo(BORDAS_R4[i], 0))
  })

  it('REPH-I-11 the three holds: 0-0.10 at the seam, 0.45-0.55 on the centre line, 0.85-1 at the left edge', async () => {
    const { bordaDaNoite } = await import('../movimento/troca/medidas.ts')
    for (const p of [0, 0.05, 0.1]) expect(bordaDaNoite(p, 556.5, 354.9)).toBe(556.5)
    for (const p of [0.45, 0.5, 0.55]) expect(bordaDaNoite(p, 556.5, 354.9)).toBe(354.9)
    for (const p of [0.85, 0.95, 1]) expect(bordaDaNoite(p, 556.5, 354.9)).toBe(0)
    expect(bordaDaNoite(0.3, 556.5, 354.9)).toBeLessThan(556.5)
    expect(bordaDaNoite(0.3, 556.5, 354.9)).toBeGreaterThan(354.9)
  })

  it('REPH-I-11 the edge is linear in p between the holds (no smoothing)', async () => {
    const { bordaDaNoite } = await import('../movimento/troca/medidas.ts')
    const a = bordaDaNoite(0.2, 556.5, 354.9)
    const b = bordaDaNoite(0.3, 556.5, 354.9)
    const c = bordaDaNoite(0.4, 556.5, 354.9)
    expect(a - b).toBeCloseTo(b - c, 6)
  })

  it('REPH-I-11 translateX of the outer box is the edge as a percent of the stage width (38.65 / 32.65 / 24.65 / 8.22 / 0 at 1440)', async () => {
    const { bordaDaNoite, traducaoEmPercentual } = await import('../movimento/troca/medidas.ts')
    PASSOS.forEach((p, i) =>
      expect(traducaoEmPercentual(bordaDaNoite(p, 556.5, 354.9), 1440), `p ${p}`).toBeCloseTo(TRADUCOES_R4[i], 1),
    )
    expect(traducaoEmPercentual(100, 0)).toBe(0)
  })

  it('REPH-I-11 progress is 0 when the track top is at the sticky top and 1 after D px, clamped, and 0 for a bad distance', async () => {
    const { progressoDoFixo } = await import('../movimento/troca/medidas.ts')
    expect(progressoDoFixo(24, 24, 600)).toBe(0)
    expect(progressoDoFixo(-276, 24, 600)).toBeCloseTo(0.5, 6)
    expect(progressoDoFixo(-576, 24, 600)).toBe(1)
    expect(progressoDoFixo(500, 24, 600)).toBe(0)
    expect(progressoDoFixo(-9999, 24, 600)).toBe(1)
    expect(progressoDoFixo(0, 0, 0)).toBe(0)
  })

  it('REPH-I-11 the pin distance is 600 from 1280, 480 from 1024 and the pin needs 640 px of height (HOME-FINAL F5)', async () => {
    const { distanciaDoFixo, alturaMinimaDoFixo } = await import('../movimento/troca/medidas.ts')
    expect(distanciaDoFixo(1440)).toBe(600)
    expect(distanciaDoFixo(1280)).toBe(600)
    expect(distanciaDoFixo(1279)).toBe(480)
    expect(distanciaDoFixo(1024)).toBe(480)
    expect(alturaMinimaDoFixo()).toBe(640)
  })

  it('REPH-I-12 the caption side is 1 while p is under 0.5 and 2 from 0.5', async () => {
    const { ladoDaLegenda } = await import('../movimento/troca/medidas.ts')
    expect(ladoDaLegenda(0)).toBe(1)
    expect(ladoDaLegenda(0.499)).toBe(1)
    expect(ladoDaLegenda(0.5)).toBe(2)
    expect(ladoDaLegenda(1)).toBe(2)
  })
})

interface OpcoesDaJanela {
  largura: number
  altura?: number
  reduzido?: boolean
}

/** A window of the given size whose matchMedia also answers min-height and prefers-reduced-motion. */
function fixarJanela({ largura, altura = 900, reduzido = false }: OpcoesDaJanela) {
  fixarLargura(largura)
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: altura })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (consulta: string) => {
      const numero = /(\d+(?:\.\d+)?)(px|rem|em)/.exec(consulta)
      const px = numero ? Number(numero[1]) * (numero[2] === 'px' ? 1 : 16) : Number.NaN
      let matches = false
      if (/prefers-reduced-motion/.test(consulta)) matches = reduzido
      else if (/min-width/.test(consulta)) matches = largura >= px
      else if (/max-width/.test(consulta)) matches = largura <= px
      else if (/min-height/.test(consulta)) matches = altura >= px
      return {
        matches,
        media: consulta,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }
    },
  })
}

async function abrirJanela(opcoes: OpcoesDaJanela) {
  fixarJanela(opcoes)
  const resultado = renderizarRota('/', { sessao: null })
  await aguardarCarga()
  return resultado
}

const faixaDaNoite = () => principal().querySelector<HTMLElement>("[data-faixa][aria-labelledby='ic-noite']")!
const legendasEmTela = () => [...principal().querySelectorAll('p[data-legenda]')].map((p) => norm(p.textContent))

describe('REPH-I-11 pinned stage (1440 x 900): one stage in band 2, one night sheet, one twin', () => {
  it('REPH-I-11 /: one [data-troca-palco] inside band 2 with the pin attribute, and the hero holds no stage', async () => {
    await abrirJanela({ largura: 1440 })
    const palcos = principal().querySelectorAll('[data-troca-palco]')
    expect(palcos).toHaveLength(1)
    expect(faixaDaNoite().contains(palcos[0])).toBe(true)
    expect(palcos[0].hasAttribute('data-troca-fixo')).toBe(true)
    expect(principal().querySelector('[data-cena-heroi] [data-troca-palco]')).toBeNull()
  })

  it('REPH-I-11 /: ONE night sheet [data-troca-noite] with an inner box, a wall, and an aria-hidden twin with an empty alt', async () => {
    await abrirJanela({ largura: 1440 })
    const folhas = principal().querySelectorAll<HTMLElement>('[data-troca-noite]')
    expect(folhas).toHaveLength(1)
    const folha = folhas[0]
    expect(folha.querySelectorAll('[data-troca-noite-interior]')).toHaveLength(1)
    expect(folha.querySelectorAll('[data-troca-noite-parede]')).toHaveLength(1)
    expect(folha.getAttribute('aria-hidden')).toBe('true')
    const gemeaTela = folha.querySelector<HTMLImageElement>('[data-troca-gemea-tela]')!
    expect(gemeaTela.getAttribute('alt')).toBe('')
    // The twin's body is ASSET-1's night frame raster, hidden from the tree, with an empty alt.
    const arte = folha.querySelector<HTMLImageElement>('[data-troca-gemea-arte]')!
    expect(arte.tagName).toBe('IMG')
    expect(arte.getAttribute('alt')).toBe('')
    expect(arte.getAttribute('aria-hidden')).toBe('true')
    expect(arte.getAttribute('src')).toBe('/molduras/moldura-noite.png')
    expect(gemeaTela.getAttribute('src')).toBe(principal().querySelector('[data-produto-tela]')!.getAttribute('src'))
    // None of the marks the meter counts a framed screen by.
    expect(folha.querySelector('[data-produto-tela], [data-produto-moldura], [data-produto-moldura-arte]')).toBeNull()
    // The twin is invisible to the tree: only the day frame counts as a framed real screen.
    expect(principal().querySelectorAll('[data-produto-tela]')).toHaveLength(2)
  })

  it('REPH-I-11 /: the sheet is never clipped by clip-path or sized by width in its inline style, only by transform', async () => {
    await abrirJanela({ largura: 1440 })
    const folha = principal().querySelector<HTMLElement>('[data-troca-noite]')!
    const interior = principal().querySelector<HTMLElement>('[data-troca-noite-interior]')!
    for (const no of [folha, interior]) {
      expect(no.style.clipPath).toBe('')
      expect(no.style.width).toBe('')
    }
  })

  it('REPH-I-11 /: the pin starts at p 0 with the outer box at +t and the inner box at -t (the two cancel)', async () => {
    await abrirJanela({ largura: 1440 })
    const folha = principal().querySelector<HTMLElement>('[data-troca-noite]')!
    const interior = principal().querySelector<HTMLElement>('[data-troca-noite-interior]')!
    const valor = (no: HTMLElement) => Number.parseFloat(/translateX\((-?[\d.]+)%\)/.exec(no.style.transform)?.[1] ?? 'NaN')
    expect(valor(folha) + valor(interior)).toBeCloseTo(0, 6)
  })
})

describe('REPH-I-12 caption swap: one node, one text, leg1 then leg2 as p crosses 0.5', () => {
  it('REPH-I-12 /: ONE p[data-legenda][data-troca-legenda] with aria-live="off" and ini.leg1 at p 0; leg2 is not on screen', async () => {
    await abrirJanela({ largura: 1440 })
    const nos = principal().querySelectorAll('p[data-legenda][data-troca-legenda]')
    expect(nos).toHaveLength(1)
    expect(nos[0].getAttribute('aria-live')).toBe('off')
    // HOME-FINAL moment 4: the one node holds the copy string in the three runs of the signed caption (the hour, the
    // middle, the author with the stroke); nothing is added to the text.
    expect(norm(nos[0].textContent)).toBe(COPY.leg1)
    expect([...nos[0].querySelectorAll('[data-legenda-hora]')].map((s) => s.textContent)).toEqual([horaDe(COPY.leg1)])
    expect([...nos[0].querySelectorAll('[data-legenda-autor]')].map((s) => norm(s.textContent))).toEqual([autorDe(COPY.leg1)])
    // The hero keeps its static leg1 under the plate (y 622 at 1440, out of the window when the stage starts to pin, at
    // scrollY 771); the swap node stands at stage y 812. There is no static leg2 beside the swap node.
    const heroi = principal().querySelector('[data-cena-heroi]')!
    const naFaixa = [...faixaDaNoite().querySelectorAll('p[data-legenda]')]
    expect(naFaixa).toHaveLength(1)
    expect(naFaixa[0]).toBe(nos[0])
    expect(legendasEmTela().filter((t) => t === COPY.leg2)).toHaveLength(0)
    expect(heroi.querySelectorAll('p[data-legenda]')).toHaveLength(1)
  })

  it('REPH-I-12 /: scrolling p across 0.5 swaps the text to leg2 and back, either way, with one node', async () => {
    await abrirJanela({ largura: 1440 })
    const faixa = faixaDaNoite()
    const noDoTopo = (topo: number) => {
      faixa.getBoundingClientRect = () => ({ top: topo, bottom: topo + 1500, left: 0, right: 1440, width: 1440, height: 1500, x: 0, y: topo, toJSON: () => ({}) })
    }
    const rolar = async (topo: number) => {
      noDoTopo(topo)
      await act(async () => {
        window.dispatchEvent(new Event('scroll'))
        await new Promise((resolver) => setTimeout(resolver, 60))
      })
    }
    const texto = () => norm(principal().querySelector('[data-troca-legenda]')!.textContent)
    await rolar(-330) // p 0.55 (D 600, sticky top 0 in jsdom)
    expect(texto()).toBe(COPY.leg2)
    await rolar(-290) // p 0.483
    expect(texto()).toBe(COPY.leg1)
    await rolar(-600)
    expect(texto()).toBe(COPY.leg2)
    await rolar(0)
    expect(texto()).toBe(COPY.leg1)
    expect(principal().querySelectorAll('[data-troca-legenda]')).toHaveLength(1)
    expect(faixaDaNoite().querySelectorAll('p[data-legenda]')).toHaveLength(1)
  })

  it('REPH-I-11 /: scrolling writes the r4 translateX on the two boxes (24.65 % at p 0.5, 0 at p 1)', async () => {
    await abrirJanela({ largura: 1440 })
    const faixa = faixaDaNoite()
    const palco = principal().querySelector<HTMLElement>('[data-troca-palco]')!
    const marcador = principal().querySelector<HTMLElement>('.ic-medida')!
    const quadro = palco.querySelector<HTMLElement>('[data-produto-moldura]')!
    const fixar = (no: HTMLElement, campo: string, valor: number) => Object.defineProperty(no, campo, { configurable: true, value: valor })
    fixar(palco, 'clientWidth', 1440)
    fixar(marcador, 'offsetLeft', 556.5)
    fixar(quadro, 'offsetLeft', 200)
    fixar(quadro, 'offsetWidth', 309.8)
    const rolar = async (topo: number) => {
      faixa.getBoundingClientRect = () => ({ top: topo, bottom: topo + 1500, left: 0, right: 1440, width: 1440, height: 1500, x: 0, y: topo, toJSON: () => ({}) })
      await act(async () => {
        window.dispatchEvent(new Event('resize'))
        await new Promise((resolver) => setTimeout(resolver, 60))
      })
    }
    const folha = principal().querySelector<HTMLElement>('[data-troca-noite]')!
    const interior = principal().querySelector<HTMLElement>('[data-troca-noite-interior]')!
    const valor = (no: HTMLElement) => Number.parseFloat(/translateX\((-?[\d.]+)%\)/.exec(no.style.transform)?.[1] ?? 'NaN')
    await rolar(-300)
    expect(valor(folha)).toBeCloseTo(24.65, 1)
    expect(valor(interior)).toBeCloseTo(-24.65, 1)
    await rolar(-600)
    expect(valor(folha)).toBeCloseTo(0, 6)
    await rolar(0)
    expect(valor(folha)).toBeCloseTo(38.65, 1)
  })
})

describe('REPH-I-13 reduced motion and short windows: the rest layout, decided before the first paint', () => {
  it('REPH-I-13 /: with reduced motion there is no pin, no swap node, no will-change flag, and both captions are static', async () => {
    await abrirJanela({ largura: 1440, reduzido: true })
    expect(principal().querySelector('[data-troca-fixo]')).toBeNull()
    expect(principal().querySelector('[data-troca-legenda]')).toBeNull()
    expect(principal().querySelector('[data-troca-visivel]')).toBeNull()
    const legendas = legendasEmTela()
    expect(legendas.filter((t) => t === COPY.leg1)).toHaveLength(1)
    expect(legendas.filter((t) => t === COPY.leg2)).toHaveLength(1)
    expect(principal().querySelector<HTMLElement>('[data-troca-noite]')!.style.transform).toBe('')
  })

  it('REPH-I-13 /: a window under 640 high at 1440 rests too (no pin, no swap node, two static captions)', async () => {
    await abrirJanela({ largura: 1440, altura: 639 })
    expect(principal().querySelector('[data-troca-fixo]')).toBeNull()
    expect(principal().querySelector('[data-troca-legenda]')).toBeNull()
    expect(legendasEmTela()).toEqual(expect.arrayContaining([COPY.leg1, COPY.leg2]))
    expect(legendasEmTela()).toHaveLength(2)
  })

  it('REPH-I-13 /: at 640 high exactly the pin is built', async () => {
    await abrirJanela({ largura: 1440, altura: 640 })
    expect(principal().querySelector('[data-troca-fixo]')).not.toBeNull()
  })
})

describe('REPH-I-14 stacked composition (below 1180): no pin, no sheet, no twin, no swap node; the frame rests in the hero', () => {
  for (const largura of [390, 768, 1023, 1179]) {
    it(`REPH-I-14 /: at ${largura} the stage is the hero's, with no sheet, no twin and two static captions`, async () => {
      await abrirJanela({ largura })
      const palcos = principal().querySelectorAll('[data-troca-palco]')
      expect(palcos).toHaveLength(1)
      expect(principal().querySelector('[data-cena-heroi]')!.contains(palcos[0])).toBe(true)
      expect(principal().querySelector('[data-troca-fixo]')).toBeNull()
      expect(principal().querySelector('[data-troca-noite]')).toBeNull()
      expect(principal().querySelector('[data-troca-gemea-tela]')).toBeNull()
      expect(principal().querySelector('[data-troca-legenda]')).toBeNull()
      expect(legendasEmTela()).toHaveLength(2)
    })
  }

  it('REPH-I-14 /: at 1180 x 900 the room stands (the stage in band 2, pinned)', async () => {
    await abrirJanela({ largura: 1180 })
    const palcos = principal().querySelectorAll('[data-troca-palco]')
    expect(palcos).toHaveLength(1)
    expect(faixaDaNoite().contains(palcos[0])).toBe(true)
    expect(palcos[0].hasAttribute('data-troca-fixo')).toBe(true)
  })

  it('REPH-I-14 /: M06 is in the page at every width, and its lamp is watched (lit when 10 % of the plate is in view)', async () => {
    await abrirJanela({ largura: 1440 })
    expect(principal().querySelectorAll('.ic-m06')).toHaveLength(1)
    const observadoresDeM06 = ObservadorFalso.todos.filter((o) => [...o.alvos].some((alvo) => alvo.closest('.ic-m06') !== null))
    expect(observadoresDeM06.length).toBeGreaterThan(0)
  })
})

describe('HOME-FINAL every phone shows a real app screen; the lower bands carry the house', () => {
  for (const largura of [390, 1440]) {
    it(`at ${largura} the Histórico frame (and the night twin) serve the Y_ALTA capture, whose top is a whole 390 x 844 screen with no site footer`, async () => {
      await abrirJanela({ largura })
      const historico = principal().querySelector<HTMLImageElement>(`[data-produto-tela][alt="${COPY.altTela1}"]`)!
      expect(historico.getAttribute('src')).toBe('/telas/casa/historico-y-alta-320w.webp')
      expect(historico.getAttribute('srcset')).toMatch(/historico-y-alta-640w\.webp 640w/)
      expect(historico.getAttribute('srcset')).not.toMatch(/historico-y-(280|320|560|640)w/)
      for (const gemea of principal().querySelectorAll<HTMLImageElement>('[data-troca-gemea-tela]')) {
        expect(gemea.getAttribute('src')).toBe(historico.getAttribute('src'))
      }
    })
  }

  it('the closing band stands M11 (the lit window, decorative, empty alt) on the night floor, after the closing block', async () => {
    await abrir(1440)
    const fecho = principal().querySelector('.ic-fecho')!
    expect(fecho.querySelector('[data-fechamento]')).not.toBeNull()
    const janela = fecho.querySelector<HTMLImageElement>('.ic-fecho-cena img')!
    expect(janela.getAttribute('src')).toBe('/cenas/nao-encontrada/m11-janela-542w.webp')
    expect(janela.getAttribute('alt')).toBe('')
    expect([janela.getAttribute('width'), janela.getAttribute('height')]).toEqual(['542', '421'])
    expect(janela.getAttribute('loading')).toBe('lazy')
    const chao = fecho.lastElementChild!
    expect(chao.classList.contains('ic-chao')).toBe(true)
    expect(chao.getAttribute('aria-hidden')).toBe('true')
  })

  it('the sleep band stands its frame on the night floor', async () => {
    await abrir(1440)
    const tela = principal().querySelector('.ic-tela')!
    expect(tela.querySelector('[data-produto-moldura]')).not.toBeNull()
    expect(tela.lastElementChild!.classList.contains('ic-chao')).toBe(true)
  })

  it('F1: the sleep frame shows the whole 390:880 Hoje capture (640 x 1444), contained on the app paper, never cropped', async () => {
    await abrir(1440)
    const hoje = principal().querySelector<HTMLImageElement>(`.ic-tela [data-produto-tela][alt="${COPY.altTela2}"]`)!
    expect(hoje.getAttribute('src')).toBe('/telas/casa/hoje-n-320w.webp')
    expect([hoje.getAttribute('width'), hoje.getAttribute('height')]).toEqual(['640', '1444'])
    expect(norm(readFileSync(CSS_DA_CASA, 'utf8'))).toContain(
      '[data-casa] .ic-tela [data-produto-tela] { object-fit: contain; background-color: var(--color-papel); }',
    )
  })
})

// ---------------------------------------------------------------------------------------------
// HOME-FINAL round 3 (review 1: F2, F3, F5)
// ---------------------------------------------------------------------------------------------

const MANIFESTO_DAS_TELAS = join(PASTA_WEB, 'public', 'telas', 'casa', 'MANIFESTO.json')

/** The manifest's Y_ALTA travel, keyed by width. */
function rolagemDoManifesto(): Record<390 | 1440, number> {
  const manifesto = JSON.parse(readFileSync(MANIFESTO_DAS_TELAS, 'utf8')) as { capturas: Array<{ id: string; rolagem_px: Record<string, number> }> }
  const alta = manifesto.capturas.find((c) => c.id === 'Y_ALTA')!
  return { 390: alta.rolagem_px['390'], 1440: alta.rolagem_px['1440'] }
}

describe('HOME-FINAL F2 the Histórico pan travels MANIFESTO rolagem_px: rest on the foot, active on the top', () => {
  it('F2: midia.ts ROLAGEM_PX is the manifest Y_ALTA rolagem_px (280 at 390, 320 at 1440)', async () => {
    const ROLAGEM_PX = (await import('../componentes/inicio-casa/midia.ts')).ROLAGEM_PX
    expect({ 390: ROLAGEM_PX[390], 1440: ROLAGEM_PX[1440] }).toEqual(rolagemDoManifesto())
    expect(rolagemDoManifesto()).toEqual({ 390: 280, 1440: 320 })
  })

  for (const largura of [390, 1440]) {
    it(`F2: at ${largura} the stage holding the Histórico frame carries the two ends of the pan from ROLAGEM_PX`, async () => {
      const ROLAGEM_PX = (await import('../componentes/inicio-casa/midia.ts')).ROLAGEM_PX
      await abrirJanela({ largura })
      const quadro = principal().querySelector(`[data-produto-tela][alt="${COPY.altTela1}"]`)!
      const palco = quadro.closest<HTMLElement>('[data-troca-palco]')!
      expect(palco.style.getPropertyValue('--produto-rolagem-390')).toBe(String(ROLAGEM_PX[390]))
      expect(palco.style.getPropertyValue('--produto-rolagem-1440')).toBe(String(ROLAGEM_PX[1440]))
      for (const gemea of principal().querySelectorAll('[data-troca-gemea-tela]')) expect(palco.contains(gemea)).toBe(true)
    })
  }

  it('F2: the declared travel equals rolagem_px at 390 and 1440 and is exactly the capture surplus over the screen layer', async () => {
    const ROLAGEM_PX = (await import('../componentes/inicio-casa/midia.ts')).ROLAGEM_PX
    const { CAPTURA_Y_ALTA, MOLDURA_DIA } = await import('../componentes/inicio-casa/midia.ts')
    const css = norm(readFileSync(CSS_DA_CASA, 'utf8'))
    // The screen layer's width and the travel, as the stylesheet declares them.
    expect(css).toContain('--produto-tela: clamp(280px, calc(280px + (100vw - 390px) * 40 / 1050), 320px);')
    expect(css).toContain(
      '--produto-rolagem: min( clamp( calc(var(--produto-rolagem-390, 0) * 1px), calc(var(--produto-rolagem-390, 0) * 1px + (var(--produto-rolagem-1440, 0) - var(--produto-rolagem-390, 0)) * (100vw - 390px) / 1050), calc(var(--produto-rolagem-1440, 0) * 1px) ), var(--produto-tela) );',
    )
    const tela = (w: number) => Math.min(Math.max(280 + ((w - 390) * 40) / 1050, 280), 320)
    const percurso = (w: number) =>
      Math.min(Math.min(Math.max(ROLAGEM_PX[390] + ((ROLAGEM_PX[1440] - ROLAGEM_PX[390]) * (w - 390)) / 1050, ROLAGEM_PX[390]), ROLAGEM_PX[1440]), tela(w))
    const manifesto = rolagemDoManifesto()
    for (const w of [390, 1440] as const) {
      expect(percurso(w), `travel at ${w}`).toBeCloseTo(manifesto[w], 6)
      // The screen layer (secoes.css): the frame is 1.06 x the screen wide and as tall as its raster; 3 % inset each side.
      const t = tela(w)
      const camada = (t * 1.06 * MOLDURA_DIA.altura) / MOLDURA_DIA.largura - 2 * 0.03 * t
      const exibida = (t * CAPTURA_Y_ALTA.altura) / CAPTURA_Y_ALTA.largura
      expect(Math.abs(exibida - camada - manifesto[w]), `surplus at ${w}`).toBeLessThanOrEqual(1)
    }
    // Rest: the image's top `--produto-rolagem` above the layer (the foot shows); active: the top. No percentage cap.
    expect(css).toContain('object-position: 50% calc(-1 * var(--produto-rolagem));')
    expect(css).toContain('object-position: 50% 0%;')
    expect(css).not.toContain('50% 40%')
  })
})

/** Tells every observer that watches a caption whether it is in view; returns how many observers were told. */
function avisarLegendas(visivel: boolean): number {
  let avisados = 0
  act(() => {
    for (const observador of ObservadorFalso.todos) {
      const alvos = [...observador.alvos].filter((alvo) => alvo.matches('p[data-legenda]'))
      if (alvos.length === 0) continue
      avisados += 1
      observador.chamada(
        alvos.map((target) => ({ target, isIntersecting: visivel, intersectionRatio: visivel ? 1 : 0 }) as unknown as IntersectionObserverEntry),
        observador as unknown as IntersectionObserver,
      )
    }
  })
  return avisados
}

describe('HOME-FINAL F3 the signed caption: the hour emphasised, the author subordinate, a stroke drawn once', () => {
  for (const largura of [390, 1440]) {
    it(`F3: at ${largura} each caption is the copy string in three runs, the author holding an aria-hidden stroke`, async () => {
      await abrirJanela({ largura, reduzido: true })
      const legendas = [...principal().querySelectorAll<HTMLElement>('p[data-legenda]')]
      expect(legendas.map((p) => norm(p.textContent))).toEqual([COPY.leg1, COPY.leg2])
      for (const [p, copia] of legendas.map((p, i) => [p, [COPY.leg1, COPY.leg2][i]] as const)) {
        expect([...p.querySelectorAll('[data-legenda-hora]')].map((s) => s.textContent)).toEqual([horaDe(copia)])
        const autores = [...p.querySelectorAll('[data-legenda-autor]')]
        expect(autores.map((s) => norm(s.textContent))).toEqual([autorDe(copia)])
        const tracos = p.querySelectorAll('[data-legenda-traco]')
        expect(tracos).toHaveLength(1)
        expect(autores[0].contains(tracos[0])).toBe(true)
        expect(tracos[0].getAttribute('aria-hidden')).toBe('true')
        expect(tracos[0].textContent).toBe('')
      }
    })
  }

  it('F3: the stylesheet gives the hour titulo-3, the title weight and tabular figures, and the stroke 400 ms scaleX from the left', () => {
    const css = norm(readFileSync(CSS_DA_CASA, 'utf8'))
    expect(css).toContain(
      '[data-casa] .ic-legenda-hora { font-size: var(--texto-titulo-3-tamanho); font-weight: var(--peso-titulo); font-variant-numeric: tabular-nums; }',
    )
    expect(css).toContain('[data-casa] .ic-legenda-autor { position: relative; display: inline-block; font-size: var(--texto-corpo-tamanho); }')
    expect(css).toContain('transform: scaleX(0); transform-origin: left; transition: transform 400ms var(--curva-padrao);')
    expect(css).toContain('[data-casa] [data-assinada] .ic-legenda-traco { transform: scaleX(1); }')
    expect(css).toContain('@media (prefers-reduced-motion: reduce) { [data-casa] .ic-legenda-traco { transform: none; transition: none; } }')
  })

  it('F3: with reduced motion every caption shows the finished stroke at once, and no observer waits for it', async () => {
    await abrirJanela({ largura: 1440, reduzido: true })
    const legendas = [...principal().querySelectorAll<HTMLElement>('p[data-legenda]')]
    expect(legendas).toHaveLength(2)
    for (const p of legendas) expect(p.hasAttribute('data-assinada')).toBe(true)
    expect(avisarLegendas(true)).toBe(0)
  })

  it('F3: the stroke plays once, when the caption is first whole in view, and stays drawn after it leaves', async () => {
    await abrirJanela({ largura: 390 })
    const legendas = () => [...principal().querySelectorAll<HTMLElement>('p[data-legenda]')]
    expect(legendas()).toHaveLength(2)
    for (const p of legendas()) expect(p.hasAttribute('data-assinada')).toBe(false)
    // Out of view: nothing draws.
    expect(avisarLegendas(false)).toBe(2)
    for (const p of legendas()) expect(p.hasAttribute('data-assinada')).toBe(false)
    // First whole in view: the stroke draws, and the observer lets go (once).
    expect(avisarLegendas(true)).toBe(2)
    for (const p of legendas()) expect(p.hasAttribute('data-assinada')).toBe(true)
    expect(avisarLegendas(false)).toBe(0)
    expect(avisarLegendas(true)).toBe(0)
    for (const p of legendas()) expect(p.hasAttribute('data-assinada')).toBe(true)
  })

  it('F3: in the pinned stage the swap node is signed too and keeps its stroke when the text swaps', async () => {
    await abrirJanela({ largura: 1440 })
    const no = principal().querySelector<HTMLElement>('p[data-troca-legenda]')!
    expect(no.hasAttribute('data-assinada')).toBe(false)
    avisarLegendas(true)
    expect(no.hasAttribute('data-assinada')).toBe(true)
    expect(no.querySelectorAll('[data-legenda-traco]')).toHaveLength(1)
  })
})

describe('HOME-FINAL F5 short desktop windows pin the stage; the stage is bounded by the window and the plate', () => {
  for (const [largura, altura] of [
    [1366, 768],
    [1280, 800],
    [1440, 900],
    [1536, 864],
  ] as const) {
    it(`F5: at ${largura} x ${altura} the pin is built`, async () => {
      await abrirJanela({ largura, altura })
      expect(principal().querySelector('[data-troca-fixo]')).not.toBeNull()
    })
  }

  it('F5: at 390 x 844 there is no pin (a phone is not the room)', async () => {
    await abrirJanela({ largura: 390, altura: 844 })
    expect(principal().querySelector('[data-troca-fixo]')).toBeNull()
  })

  it('F5: the stage is min(100svh - 24 px, the plate) tall, and the short-landscape rule holds the scene to 50svh', () => {
    const css = norm(readFileSync(CSS_DA_CASA, 'utf8'))
    expect(css).toContain('--palco-placa-alto: calc(320px * var(--moldura-razao) + var(--palco-quadro-livre) - var(--palco-topo));')
    expect(css).toContain('--palco-alto: min(calc(100svh - var(--palco-topo)), var(--palco-placa-alto));')
    expect(css).toMatch(/@media \(max-height: 520px\) and \(orientation: landscape\) \{[^}]*\.cm-cena-placa \{ max-block-size: 50svh; \}/)
  })
})
