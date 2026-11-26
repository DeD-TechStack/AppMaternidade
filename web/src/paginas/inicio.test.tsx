import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INI } from '../conteudo/inicio.ts'
import { INICIO as INICIO_ANTIGO } from '../conteudo/textos.ts'
import { CATALOGO } from '../movimento/catalogo.ts'
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

// jsdom has no `document.scrollingElement`, and Motion's scroll tracker (the one `useScroll` uses, read by the night
// sheet's driver in `movimento/troca/usarPalco.ts`) is a no-op without it. Every browser has it.
if (!document.scrollingElement) {
  Object.defineProperty(document, 'scrollingElement', { configurable: true, get: () => document.documentElement })
}

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

  it('REPH-I-01 /: three framed real screens (one per fold: Histórico, Hoje, Notas), each a [data-produto-tela] with its deck alt', async () => {
    // HOME-SECOND-HALF (AVALIACAO S-16, FREEZE 1.5 exception E38): band 5 adds the Notas capture to the two of the stage and band 3.
    await abrir(1440)
    const telas = [...principal().querySelectorAll<HTMLImageElement>('[data-produto-tela]')]
    expect(telas.map((t) => t.getAttribute('alt'))).toEqual([COPY.altTela1, COPY.altTela2, INI.altNotas])
  })

  it('REPH-I-01 /: each framed screen is a real capture under ASSET-1\'s frame raster (day on band 2, night on band 3, day on band 5), and no device is drawn in CSS', async () => {
    await abrir(1440)
    const artes = [...principal().querySelectorAll<HTMLImageElement>('[data-produto-moldura-arte]')]
    expect(artes.map((a) => a.tagName)).toEqual(['IMG', 'IMG', 'IMG'])
    expect(artes.map((a) => a.getAttribute('src'))).toEqual(['/molduras/moldura-dia.png', '/molduras/moldura-noite.png', '/molduras/moldura-dia.png'])
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
    // The two night frames (the hero's, then band 3's), then band 5's day frame on the areia rug.
    expect(artes.map((a) => a.getAttribute('src'))).toEqual(['/molduras/moldura-noite.png', '/molduras/moldura-noite.png', '/molduras/moldura-dia.png'])
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

// STAGE (25/11/2026): the edge holds at the seam to p 0.10, runs linearly to the left edge at p 0.70 and holds there (the
// hold on the frame's centre line, 0.45-0.55, and the r4 numbers 556.5 / 354.9 are gone). The seam is the 553 of 1440 x 900.
const BORDAS_STAGE = [553, 553, 414.75, 184.33, 0, 0]
const TRADUCOES_STAGE = [38.4, 38.4, 28.8, 12.8, 0, 0]
const PASSOS = [0, 0.1, 0.25, 0.5, 0.7, 1]

describe('REPH-I-11 pure arithmetic of the pin: progress, edge stops, translateX, pin distance, caption side', () => {
  it('REPH-I-11 the edge stops at p 0 / .1 / .25 / .5 / .7 / 1 are the STAGE numbers (seam 553)', async () => {
    const { bordaDaNoite } = await import('../movimento/troca/medidas.ts')
    PASSOS.forEach((p, i) => expect(bordaDaNoite(p, 553), `p ${p}`).toBeCloseTo(BORDAS_STAGE[i], 1))
  })

  it('REPH-I-11 the two holds: 0-0.10 at the seam, 0.70-1 at the left edge, and the edge still moves across the frame centre (0.45-0.55)', async () => {
    const { bordaDaNoite } = await import('../movimento/troca/medidas.ts')
    for (const p of [0, 0.05, 0.1]) expect(bordaDaNoite(p, 553)).toBe(553)
    for (const p of [0.7, 0.85, 0.95, 1]) expect(bordaDaNoite(p, 553)).toBe(0)
    expect(bordaDaNoite(0.45, 553)).toBeGreaterThan(bordaDaNoite(0.5, 553))
    expect(bordaDaNoite(0.5, 553)).toBeGreaterThan(bordaDaNoite(0.55, 553))
  })

  it('REPH-I-11 the edge is linear in p between the holds (no smoothing)', async () => {
    const { bordaDaNoite } = await import('../movimento/troca/medidas.ts')
    const a = bordaDaNoite(0.2, 553)
    const b = bordaDaNoite(0.3, 553)
    const c = bordaDaNoite(0.4, 553)
    expect(a - b).toBeCloseTo(b - c, 6)
  })

  it('REPH-I-11 translateX of the outer box is the edge as a percent of the stage width (38.40 / 38.40 / 28.80 / 12.80 / 0 / 0 at 1440)', async () => {
    const { bordaDaNoite, traducaoEmPercentual } = await import('../movimento/troca/medidas.ts')
    PASSOS.forEach((p, i) =>
      expect(traducaoEmPercentual(bordaDaNoite(p, 553), 1440), `p ${p}`).toBeCloseTo(TRADUCOES_STAGE[i], 1),
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

  it('REPH-I-11 the pin distance is one rule of the window height, clamp(600, 80svh, 900), and the pin needs the measured height of a 240 px phone (STAGE)', async () => {
    const { pinoDoPalco, alturaMinimaDoFixo } = await import('../movimento/troca/medidas.ts')
    expect(pinoDoPalco(900)).toBe(720)
    expect(pinoDoPalco(768)).toBeCloseTo(614.4, 6)
    expect(pinoDoPalco(800)).toBeCloseTo(640, 6)
    expect(pinoDoPalco(1080)).toBeCloseTo(864, 6)
    expect(pinoDoPalco(1440)).toBe(900)
    expect(pinoDoPalco(600)).toBe(600)
    expect(alturaMinimaDoFixo()).toBe(CATALOGO.M16.alturaMinimaPx)
    expect(alturaMinimaDoFixo()).toBeGreaterThan(640)
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

// jsdom has no layout. The night track's scroll is modelled with real coordinates, the ones Motion's `useScroll` reads:
// the document scrolls (`scrollTop` and `clientHeight` of the scrolling element) and the track stands at `TOPO_DA_FAIXA`
// in the document, `ALTURA_DA_FAIXA` tall (`offsetTop`, `clientHeight`). A track top of `t` px in the window is a
// `scrollTop` of `TOPO_DA_FAIXA - t`.
const TOPO_DA_FAIXA = 2000
const ALTURA_DA_FAIXA = 1500
let rolagemDoDocumento = 0

afterEach(() => {
  rolagemDoDocumento = 0
  Reflect.deleteProperty(document.documentElement, 'scrollTop')
  Reflect.deleteProperty(document.documentElement, 'clientHeight')
})

/** Gives the night track and the document the layout above; the window is `altura` tall. Measures again afterwards. */
async function modelarRolagem(faixa: HTMLElement, altura = 900) {
  rolagemDoDocumento = 0
  // STAGE: the pin D is MEASURED from two rects (the track's height less the stage's), and the browser here is one with no
  // scroll-driven animations (the JS fallback is what writes the sheet, the markers and the caption's side). D is 600.
  vi.stubGlobal('CSS', { supports: () => false })
  const retangulo = (top: number, height: number) =>
    ({ top, bottom: top + height, left: 0, right: 1440, width: 1440, height, x: 0, y: top, toJSON: () => ({}) }) as DOMRect
  faixa.getBoundingClientRect = () => retangulo(TOPO_DA_FAIXA - rolagemDoDocumento, ALTURA_DA_FAIXA)
  faixa.querySelector<HTMLElement>('.ic-estagio')!.getBoundingClientRect = () => retangulo(0, ALTURA_DA_FAIXA - 600)
  Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, get: () => rolagemDoDocumento })
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: altura })
  Object.defineProperty(faixa, 'offsetTop', { configurable: true, value: TOPO_DA_FAIXA })
  Object.defineProperty(faixa, 'clientHeight', { configurable: true, value: ALTURA_DA_FAIXA })
  await act(async () => {
    window.dispatchEvent(new Event('resize'))
  })
}

/** Scrolls the document until the night track's top is `topo` px from the window's top, and lets the frames run. */
async function rolarAteTopo(topo: number, esperaMs: number) {
  rolagemDoDocumento = TOPO_DA_FAIXA - topo
  await act(async () => {
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolver) => setTimeout(resolver, esperaMs))
  })
}

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
    // The twin is invisible to the tree: only the day frame counts as a framed real screen. The page holds three (the
    // stage's, band 3's and, since HOME-SECOND-HALF, band 5's Notas capture: FREEZE 1.5 exception E38).
    expect(principal().querySelectorAll('[data-produto-tela]')).toHaveLength(3)
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

  it('REPH-I-11 /: the pin starts at p 0 with the outer box at +t and the inner box at -t (the two cancel; the JS fallback writes them)', async () => {
    vi.stubGlobal('CSS', { supports: () => false }) // no scroll-driven animations: the hook writes the sheet itself
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
    await modelarRolagem(faixaDaNoite())
    const rolar = (topo: number) => rolarAteTopo(topo, 60)
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

  it('REPH-I-11 /: scrolling writes the STAGE translateX on the two boxes (12.80 % at p 0.5, 0 from p 0.7), with no centre hold', async () => {
    vi.stubGlobal('CSS', { supports: () => false }) // before the page mounts: the support is read once, by the layout effect
    await abrirJanela({ largura: 1440 })
    const faixa = faixaDaNoite()
    const palco = principal().querySelector<HTMLElement>('[data-troca-palco]')!
    const marcador = principal().querySelector<HTMLElement>('.ic-medida')!
    const fixar = (no: HTMLElement, campo: string, valor: number) => Object.defineProperty(no, campo, { configurable: true, value: valor })
    fixar(palco, 'clientWidth', 1440)
    fixar(marcador, 'offsetLeft', 553)
    await modelarRolagem(faixa) // also measures the stage's widths faked above
    const rolar = (topo: number) => rolarAteTopo(topo, 60)
    const folha = principal().querySelector<HTMLElement>('[data-troca-noite]')!
    const interior = principal().querySelector<HTMLElement>('[data-troca-noite-interior]')!
    const valor = (no: HTMLElement) => Number.parseFloat(/translateX\((-?[\d.]+)%\)/.exec(no.style.transform)?.[1] ?? 'NaN')
    await rolar(-300) // p 0.5
    expect(valor(folha)).toBeCloseTo(12.8, 1)
    expect(valor(interior)).toBeCloseTo(-12.8, 1)
    await rolar(-270) // p 0.45: the edge is still moving across the frame's centre line
    expect(valor(folha)).toBeGreaterThan(12.8)
    await rolar(-420) // p 0.70
    expect(valor(folha)).toBeCloseTo(0, 6)
    await rolar(-600)
    expect(valor(folha)).toBeCloseTo(0, 6)
    await rolar(0)
    expect(valor(folha)).toBeCloseTo(38.4, 1)
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

  it('REPH-I-13 /: a window one px under the measured height gate at 1440 rests too (no pin, no swap node, two static captions)', async () => {
    await abrirJanela({ largura: 1440, altura: CATALOGO.M16.alturaMinimaPx - 1 })
    expect(principal().querySelector('[data-troca-fixo]')).toBeNull()
    expect(principal().querySelector('[data-troca-legenda]')).toBeNull()
    expect(legendasEmTela()).toEqual(expect.arrayContaining([COPY.leg1, COPY.leg2]))
    expect(legendasEmTela()).toHaveLength(2)
  })

  it('REPH-I-13 /: at the measured height gate exactly the pin is built', async () => {
    await abrirJanela({ largura: 1440, altura: CATALOGO.M16.alturaMinimaPx })
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

  it('REPH-I-14 /: M06 is in the page at every width; its lamp is watched where the page is stacked (10 % of the plate in view) and lit by the crossing where it is pinned (STAGE)', async () => {
    await abrirJanela({ largura: 1179 })
    expect(principal().querySelectorAll('.ic-m06')).toHaveLength(1)
    const observadoresDeM06 = ObservadorFalso.todos.filter((o) => [...o.alvos].some((alvo) => alvo.closest('.ic-m06') !== null))
    expect(observadoresDeM06.length).toBeGreaterThan(0)
  })

  it('REPH-I-14 /: at 1440 the pinned M06 lamp watches nothing: it lights at the same instant as the caption swap (data-troca-lado)', async () => {
    await abrirJanela({ largura: 1440 })
    expect(principal().querySelectorAll('.ic-m06')).toHaveLength(1)
    const observadoresDeM06 = ObservadorFalso.todos.filter((o) => [...o.alvos].some((alvo) => alvo.closest('.ic-m06') !== null))
    expect(observadoresDeM06).toHaveLength(0)
    expect(principal().querySelector('.ic-m06 [data-luz-estado]')!.getAttribute('data-luz-estado')).toBe('apagada')
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

  it('the closing band stands A05 (the unlit street, edge to edge, decorative, empty alt) on the band edge, after the closing block', async () => {
    // HOME-SECOND-HALF (AVALIACAO S-09): no floor node; the street is the last box of the band and its own bottom is the band's.
    await abrir(1440)
    const fecho = principal().querySelector('.ic-fecho')!
    expect(fecho.querySelector('[data-fechamento]')).not.toBeNull()
    const janela = fecho.querySelector<HTMLImageElement>('.ic-fecho-cena img:not([data-luz])')!
    // A05 comes from vite-imagetools (LIB-IMG): a generated URL, the 1672w file of its own srcset.
    expect(janela.getAttribute('src')).toMatch(/^\/@imagetools\/[\w-]+$/)
    expect(janela.getAttribute('srcset')).toContain(`${janela.getAttribute('src')!} 1672w`)
    expect(janela.getAttribute('alt')).toBe('')
    expect([janela.getAttribute('width'), janela.getAttribute('height')]).toEqual(['1672', '642'])
    expect(janela.getAttribute('loading')).toBe('lazy')
    expect(fecho.lastElementChild!.classList.contains('ic-fecho-cena')).toBe(true)
    expect(fecho.querySelector('.ic-chao')).toBeNull()
  })

  it('the sleep band stands its frame on the band edge: the frame is its last box and no floor node follows it', async () => {
    await abrir(1440)
    const tela = principal().querySelector('.ic-tela')!
    expect(tela.querySelector('[data-produto-moldura]')).not.toBeNull()
    expect(tela.lastElementChild!.hasAttribute('data-produto-moldura')).toBe(true)
    expect(tela.querySelector('.ic-chao')).toBeNull()
  })

  it('F1: the sleep frame shows the whole 390:880 Hoje capture (640 x 1444), contained on the app paper, never cropped', async () => {
    await abrir(1440)
    const hoje = principal().querySelector<HTMLImageElement>(`.ic-tela [data-produto-tela][alt="${COPY.altTela2}"]`)!
    expect(hoje.getAttribute('src')).toBe('/telas/casa/hoje-n-320w.webp')
    expect([hoje.getAttribute('width'), hoje.getAttribute('height')]).toEqual(['1170', '2640'])
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
    // The screen layer reads the Início container (cqi), not the window (HOME-WIDTH); the travel keeps its window ramp.
    expect(css).toContain('--produto-tela: clamp(280px, calc(280px + (100cqi - 390px) * 40 / 1050), 320px);')
    expect(css).not.toContain('--produto-tela: clamp(280px, calc(280px + (100vw - 390px) * 40 / 1050), 320px);')
    // The shared frame rule (`[data-casa] .cm-produto-moldura`) keeps the travel exactly as before HOME-WIDTH...
    expect(css).toContain(
      '--produto-rolagem: min( clamp( calc(var(--produto-rolagem-390, 0) * 1px), calc(var(--produto-rolagem-390, 0) * 1px + (var(--produto-rolagem-1440, 0) - var(--produto-rolagem-390, 0)) * (100vw - 390px) / 1050), calc(var(--produto-rolagem-1440, 0) * 1px) ), var(--produto-tela) );',
    )
    // ...and the stage rule (`.ic-estagio .cm-produto-moldura`) scales it with the room (k), next to it, not instead of it.
    expect(css).toContain(
      '--produto-rolagem: min( calc( clamp( calc(var(--produto-rolagem-390, 0) * 1px), calc(var(--produto-rolagem-390, 0) * 1px + (var(--produto-rolagem-1440, 0) - var(--produto-rolagem-390, 0)) * (100vw - 390px) / 1050), calc(var(--produto-rolagem-1440, 0) * 1px) ) * var(--heroi-k) ), var(--produto-tela) );',
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

describe('HOME-FINAL F3 the signed caption: the hour heavy, the name upright, no stroke', () => {
  for (const largura of [390, 1440]) {
    it(`F3: at ${largura} each caption is the copy string in three runs, the hour and the author spans, and no stroke`, async () => {
      await abrirJanela({ largura, reduzido: true })
      const legendas = [...principal().querySelectorAll<HTMLElement>('p[data-legenda]')]
      expect(legendas.map((p) => norm(p.textContent))).toEqual([COPY.leg1, COPY.leg2])
      for (const [p, copia] of legendas.map((p, i) => [p, [COPY.leg1, COPY.leg2][i]] as const)) {
        expect([...p.querySelectorAll('[data-legenda-hora]')].map((s) => s.textContent)).toEqual([horaDe(copia)])
        const autores = [...p.querySelectorAll('[data-legenda-autor]')]
        expect(autores.map((s) => norm(s.textContent))).toEqual([autorDe(copia)])
        expect(p.querySelectorAll('[data-legenda-traco]')).toHaveLength(0)
        expect(p.querySelectorAll('.ic-legenda-traco')).toHaveLength(0)
      }
    })
  }

  it('F3: the stylesheet gives the hour Literata 800 in tabular lining figures at 1.5 x the caption size, and the name Literata upright, with no stroke rule', () => {
    const css = norm(readFileSync(CSS_DA_CASA, 'utf8'))
    expect(css).toContain(
      '[data-casa] .ic-legenda-hora { font-family: var(--fonte-exibicao); font-size: calc(var(--texto-abertura-tamanho) * 1.5); font-weight: 800; font-variant-numeric: tabular-nums lining-nums; line-height: calc(var(--texto-abertura-tamanho) * 0.5); }',
    )
    expect(css).toContain(
      '[data-casa] .ic-legenda-autor { display: inline-block; padding-block-end: 2px; font-family: var(--fonte-exibicao); font-size: var(--texto-abertura-tamanho); font-weight: var(--peso-titulo); font-style: normal; text-decoration: none; }',
    )
    expect(css).not.toContain('ic-legenda-traco')
    expect(css).not.toMatch(/\.ic-legenda-autor[^{]*\{[^}]*(text-decoration: underline|border-bottom)/)
  })

  it('F3: with reduced motion every caption is signed at once (data-assinada), and no observer waits for it', async () => {
    await abrirJanela({ largura: 1440, reduzido: true })
    const legendas = [...principal().querySelectorAll<HTMLElement>('p[data-legenda]')]
    expect(legendas).toHaveLength(2)
    for (const p of legendas) expect(p.hasAttribute('data-assinada')).toBe(true)
    expect(avisarLegendas(true)).toBe(0)
  })

  it('F3: the caption is signed once, when it is first whole in view, and stays signed after it leaves', async () => {
    await abrirJanela({ largura: 390 })
    const legendas = () => [...principal().querySelectorAll<HTMLElement>('p[data-legenda]')]
    expect(legendas()).toHaveLength(2)
    for (const p of legendas()) expect(p.hasAttribute('data-assinada')).toBe(false)
    // Out of view: nothing draws.
    expect(avisarLegendas(false)).toBe(2)
    for (const p of legendas()) expect(p.hasAttribute('data-assinada')).toBe(false)
    // First whole in view: the caption is signed, and the observer lets go (once).
    expect(avisarLegendas(true)).toBe(2)
    for (const p of legendas()) expect(p.hasAttribute('data-assinada')).toBe(true)
    expect(avisarLegendas(false)).toBe(0)
    expect(avisarLegendas(true)).toBe(0)
    for (const p of legendas()) expect(p.hasAttribute('data-assinada')).toBe(true)
  })

  it('F3: in the pinned stage the swap node is signed too, with the hour and the author spans and no stroke', async () => {
    await abrirJanela({ largura: 1440 })
    const no = principal().querySelector<HTMLElement>('p[data-troca-legenda]')!
    expect(no.hasAttribute('data-assinada')).toBe(false)
    avisarLegendas(true)
    expect(no.hasAttribute('data-assinada')).toBe(true)
    expect(no.querySelectorAll('[data-legenda-hora]')).toHaveLength(1)
    expect(no.querySelectorAll('[data-legenda-autor]')).toHaveLength(1)
    expect(no.querySelectorAll('[data-legenda-traco]')).toHaveLength(0)
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
    expect(css).toContain(
      '--palco-placa-alto: calc(320px * var(--heroi-k) * var(--moldura-razao) + var(--palco-quadro-livre) - var(--palco-topo));',
    )
    expect(css).toContain('--palco-alto: min(calc(100svh - var(--palco-topo)), var(--palco-placa-alto));')
    expect(css).toMatch(/@media \(max-height: 520px\) and \(orientation: landscape\) \{[^}]*\.cm-cena-placa \{ max-block-size: 50svh; \}/)
  })
})

// ---------------------------------------------------------------------------------------------
// HOME-SEAMS: every floor, plate edge and divider meets its neighbour without a step, a box or a cut
// ---------------------------------------------------------------------------------------------

const MIDIA_DA_CASA = join(PASTA_SRC, 'componentes', 'inicio-casa', 'midia.ts')
const cssDaCasa = () => norm(readFileSync(CSS_DA_CASA, 'utf8'))

describe('HOME-SEAMS S2 (superseded by HOME-SECOND-HALF, AVALIACAO S-09): band 4 has no floor; the band line cuts the mat', () => {
  it('.ic-so ends in the scene or the text and holds no .ic-chao node', async () => {
    await abrir(1440)
    const so = principal().querySelector('.ic-so')!
    expect(so.querySelector('.ic-chao')).toBeNull()
    expect(so.querySelector('.ic-so-cena')).not.toBeNull()
    expect(so.lastElementChild!.classList.contains('ic-so-cena')).toBe(true)
  })

  it('the stylesheet gives the band no bottom padding and shows rows 0-832 of the plate (1200 / 832), clipped', () => {
    const css = cssDaCasa()
    expect(css).toMatch(/\[data-faixa\]:has\(\.ic-so\)[^{]*\{ padding-bottom: 0; \}/)
    expect(css).toMatch(/\[data-casa\] \.ic-so-cena \{[^}]*aspect-ratio: 1200 \/ 832;[^}]*overflow: clip;/)
  })
})

describe('HOME-SEAMS S1: below 1180 the M06 floor runs on to both edges at the plate\'s own floor line', () => {
  it('a floor layer behind the plate, in token texto-2, from the floor line down, 300 vw wide, in the stacked block only', () => {
    const css = cssDaCasa()
    const regra = /\[data-casa\] \.ic-m06::before \{([^}]*)\}/.exec(css)
    expect(regra, '.ic-m06::before rule').not.toBeNull()
    expect(regra![1]).toContain('top: calc(var(--m06-chao-fracao) * 100%);')
    expect(regra![1]).toContain('bottom: 0;')
    expect(regra![1]).toContain('left: -100vw;')
    expect(regra![1]).toContain('width: 300vw;')
    expect(regra![1]).toContain('background-color: var(--color-texto-2);')
    expect(regra![1]).toContain('z-index: -1;')
    expect(css).toContain('--m06-chao-fracao: 0.8599;')
    const empilhada = css.indexOf('@media not all and (min-width: 1180px) and (min-aspect-ratio: 1/1) {')
    const curta = css.indexOf('/* Short landscape windows')
    const posicao = css.indexOf('[data-casa] .ic-m06::before {')
    expect(posicao).toBeGreaterThan(empilhada)
    expect(posicao).toBeLessThan(curta)
    // The plate opens its own stacking context, so the layer at z -1 stays above the band's wall.
    const estreita = /\[data-casa\] \.ic-m06 \{([^}]*)\}/.exec(css)!
    expect(estreita[1]).toContain('isolation: isolate;')
  })
})

describe('HOME-SEAMS S4: the hero floors end on the hero foot, not 65 px under the plate', () => {
  it('bottom = 100% less the hero foot measured from the plate top, in the room block, and no --heroi-chao-extra left', () => {
    const css = cssDaCasa()
    expect(css).toContain(
      "[data-casa] [aria-labelledby='ic-titulo'] [data-camada='chao-esquerda'], [data-casa] [aria-labelledby='ic-titulo'] [data-camada='chao-direita'] { bottom: calc(100% - (var(--heroi-alto) - var(--heroi-placa-topo))); }",
    )
    expect(css).not.toContain('--heroi-chao-extra')
    // At 1440 (k = 1): the plate is 506.5 tall, so the layer ends 64.5 px under it, at the hero's 723 (not at 723.5).
    expect(152 + 506.5 + (506.5 - (723 - 152)) * -1).toBeCloseTo(723, 5)
    const sala = css.indexOf('@media (min-width: 1180px) and (min-aspect-ratio: 1/1) { /* The hero')
    const regra = css.indexOf("[data-camada='chao-direita'] { bottom: calc(100% -")
    expect(regra).toBeGreaterThan(sala)
  })
})

// HOME-SEAMS-G3: the M04 and M05 plates are FIXED files under src/assets/cenas/inicio (AVIF 4:4:4 calibrated on the decoded
// ground, WebP fallback tiers), imported as plain Vite assets. The build never re-transcodes them, so the decoded ground the
// page serves is the ground the export script measured (PROVENANCE.md there).
const PLACAS_FIXAS = [
  { chave: 'M05', base: 'm05-sol', larguras: [900, 1672], alturas: [507, 941], sizes: '(min-width: 1440px) min(62.5vw, 1600px), (min-width: 1180px) 62.5vw, min(100vw, 760px)', tamanho: [1672, 941], src: 900 },
  { chave: 'M05_390', base: 'm05-sol-390c', larguras: [390, 780, 1170], alturas: [306, 612, 918], sizes: '100vw', tamanho: [1170, 918], src: 390 },
  { chave: 'M04', base: 'm04-recorte', larguras: [350, 600, 700, 1200], alturas: [254, 435, 508, 870], sizes: '(min-width: 1024px) 600px, 100vw', tamanho: [1200, 870], src: 600 },
] as const
const PASTA_PLACAS = join(PASTA_SRC, 'assets', 'cenas', 'inicio')

/** The `url wN` entries of a srcset, in order. */
function degraus(srcSet: string | undefined) {
  return (srcSet ?? '').split(',').map((parte) => {
    const [url, descritor] = parte.trim().split(/\s+/)
    return { url, largura: Number((descritor ?? '').replace(/w$/, '')) }
  })
}

/** Width and height the file itself states: the `ispe` box of an AVIF, the VP8 / VP8X chunk of a WebP. */
function dimensoesDoArquivo(arquivo: string): { formato: 'avif' | 'webp'; largura: number; altura: number } {
  const bytes = readFileSync(arquivo)
  if (bytes.subarray(4, 12).toString('latin1') === 'ftypavif') {
    const caixa = bytes.indexOf('ispe', 0, 'latin1')
    return { formato: 'avif', largura: bytes.readUInt32BE(caixa + 8), altura: bytes.readUInt32BE(caixa + 12) }
  }
  expect(bytes.subarray(0, 4).toString('latin1'), arquivo).toBe('RIFF')
  expect(bytes.subarray(8, 12).toString('latin1'), arquivo).toBe('WEBP')
  const pedaco = bytes.subarray(12, 16).toString('latin1')
  if (pedaco === 'VP8X') return { formato: 'webp', largura: bytes.readUIntLE(24, 3) + 1, altura: bytes.readUIntLE(27, 3) + 1 }
  expect(pedaco, arquivo).toBe('VP8 ')
  return { formato: 'webp', largura: bytes.readUInt16LE(26) & 0x3fff, altura: bytes.readUInt16LE(28) & 0x3fff }
}

describe('HOME-SEAMS-G3 S3 / S2: M04 and M05 are fixed files (an AVIF ladder and a WebP ladder), not build transcodes', () => {
  it('M05 and M04 serve plain asset URLs: no @imagetools URL, both ladders on the same widths, sizes and size unchanged', async () => {
    const midia = await import('../componentes/inicio-casa/midia.ts')
    for (const { chave, base, larguras, sizes, tamanho, src } of PLACAS_FIXAS) {
      const imagem = midia[chave]
      const webp = degraus(imagem.srcSet)
      const avif = degraus(imagem.avif)
      expect(webp.map((d) => d.largura), `${chave}: WebP widths`).toEqual(larguras)
      expect(avif.map((d) => d.largura), `${chave}: AVIF widths`).toEqual(larguras)
      for (const { url, largura } of webp) {
        expect(url, `${chave} ${largura}w WebP`).toMatch(new RegExp(`^/(?:src/assets/cenas/inicio|assets)/${base}-${largura}w(?:-[\\w-]+)?\\.webp$`))
      }
      for (const { url, largura } of avif) {
        expect(url, `${chave} ${largura}w AVIF`).toMatch(new RegExp(`^/(?:src/assets/cenas/inicio|assets)/${base}-${largura}w(?:-[\\w-]+)?\\.avif$`))
      }
      expect(new Set([...webp, ...avif].map((d) => d.url)).size, `${chave}: one distinct URL per format and width`).toBe(larguras.length * 2)
      expect(`${imagem.src}${imagem.srcSet}${imagem.avif}`, chave).not.toContain('@imagetools')
      expect(imagem.src, `${chave}: src is the ${src}w WebP`).toBe(webp.find((d) => d.largura === src)?.url)
      expect([imagem.largura, imagem.altura], `${chave}: size of the largest file`).toEqual(tamanho)
      expect(imagem.sizes, `${chave}: sizes`).toBe(sizes)
    }
  })

  it('every file of both ladders exists under src/assets/cenas/inicio, in its format, with the exact width and height of its tier', () => {
    for (const { base, larguras, alturas } of PLACAS_FIXAS) {
      larguras.forEach((largura, i) => {
        for (const formato of ['avif', 'webp'] as const) {
          const arquivo = join(PASTA_PLACAS, `${base}-${largura}w.${formato}`)
          expect(existsSync(arquivo), arquivo).toBe(true)
          expect(dimensoesDoArquivo(arquivo), `${base}-${largura}w.${formato}`).toEqual({ formato, largura, altura: alturas[i] })
        }
      })
    }
    // Negative control: a width that is not in a ladder is not a file, so the dimension check above cannot pass by accident.
    expect(existsSync(join(PASTA_PLACAS, 'm05-sol-901w.avif'))).toBe(false)
  })

  it('M05_390 is a fixed-file plate with an AVIF and a WebP ladder (390, 780, 1170); M06 keeps the build ladder; midia.ts holds no lossless query', async () => {
    const { M05_390, M06 } = await import('../componentes/inicio-casa/midia.ts')
    const { placa } = await import('../componentes/campo/imagens.ts')
    const phone = await import('../assets/cenas/inicio/m05-sol-390c-780w.webp?w=390;780&format=avif;webp&as=picture')
    const original = placa(phone.default, '100vw', 390)
    expect(M05_390.avif).toBeTruthy()
    const webp = degraus(M05_390.srcSet)
    const avif = degraus(M05_390.avif)
    expect(webp.map((d) => d.largura)).toEqual([390, 780, 1170])
    expect(avif.map((d) => d.largura)).toEqual([390, 780, 1170])
    expect(new Set([...webp, ...avif].map((d) => d.url)).size).toBe(6)
    expect(M05_390.src).toBe(webp[0].url)
    expect([M05_390.largura, M05_390.altura, M05_390.sizes]).toEqual([1170, 918, '100vw'])
    // Negative control: the shared helper still exposes an AVIF alternative that differs from its own WebP srcset.
    expect(original.avif).toBeTruthy()
    expect(original.avif).not.toBe(original.srcSet)
    expect(M05_390.avif).not.toBe(M05_390.srcSet)
    expect(M06.avif).toBeTruthy()
    // HOME-SECOND-HALF: the one exception is the band 4 and band 7 plates of inicio-faixas, whose grounds the card checks
    // on the decoded file (a lossless WebP keeps the exact ground); every `lossless=true` sits on such an import line.
    const comLossless = readFileSync(MIDIA_DA_CASA, 'utf8')
      .split('\n')
      .filter((linha) => linha.includes('lossless=true'))
    expect(comLossless.every((linha) => linha.includes('assets/cenas/inicio-faixas/'))).toBe(true)
  })

  it('renders the phone AVIF and WebP sources, then the M05 AVIF source, and the lossless M04_FAIXA plate (no AVIF) in band 4', async () => {
    const { M05, M05_390, M04_FAIXA } = await import('../componentes/inicio-casa/midia.ts')
    await abrir(1440)
    const hero = principal().querySelector('.cm-cena-placa > picture')!
    const avif = hero.querySelectorAll('source[type="image/avif"]')
    expect(avif).toHaveLength(2)
    expect(avif[0].getAttribute('media')).toBe('(max-width: 767px)')
    expect(avif[0].getAttribute('srcset')).toBe(M05_390.avif)
    expect(avif[1].getAttribute('srcset')).toBe(M05.avif)
    expect(avif[1].hasAttribute('media')).toBe(false)
    const celular = hero.querySelectorAll('source[media="(max-width: 767px)"]')
    expect(celular).toHaveLength(2)
    expect(celular[1].hasAttribute('type')).toBe(false)
    expect(celular[1].getAttribute('srcset')).toBe(M05_390.srcSet)
    expect(hero.querySelector('img')?.getAttribute('srcset')).toBe(M05.srcSet)
    expect(hero.querySelector('img')?.getAttribute('src')).toBe(M05.src)
    const so = principal().querySelector('.ic-so-cena')!
    expect(so.querySelector('source[type="image/avif"]')).toBeNull()
    expect(so.querySelector('img')?.getAttribute('src')).toBe(M04_FAIXA.src)
    expect(so.querySelector('img')?.getAttribute('srcset')).toBe(M04_FAIXA.srcSet)
  })
})

describe('HOME-SEAMS S7: every lamp-light file named in midia.ts exists in web/public', () => {
  it('M05 serves both delivered 2x tiers; M06 keeps its approved capped ladder', async () => {
    const { LUZ_M05, LUZ_M05_390, LUZ_M06 } = await import('../componentes/inicio-casa/midia.ts')
    expect(LUZ_M05.srcSet).toBe('/cenas/inicio/m05-luz-900w.png 900w, /cenas/inicio/m05-luz-1672w.png 1672w')
    expect(LUZ_M05.sizes).toBe('(min-width: 1440px) min(62.5vw, 1600px), (min-width: 1180px) 62.5vw, min(100vw, 760px)')
    expect(LUZ_M05_390.srcSet).toBe('/cenas/inicio/m05-luz-390c-390w.png 390w, /cenas/inicio/m05-luz-390c-780w.png 780w, /cenas/inicio/m05-luz-390c-1170w.png 1170w')
    expect(LUZ_M05_390.sizes).toBe('100vw')
    expect(LUZ_M06.srcSet).toBe('/cenas/inicio/m06-luz-300w.png 300w, /cenas/inicio/m06-luz-396w.png 396w, /cenas/inicio/m06-luz-600w.png 600w, /cenas/inicio/m06-luz-792w.png 792w')
  })

  it('LUZ_M05, LUZ_M05_390 and LUZ_M06 point at existing files', async () => {
    const { LUZ_M05, LUZ_M05_390, LUZ_M06 } = await import('../componentes/inicio-casa/midia.ts')
    for (const luz of [LUZ_M05, LUZ_M05_390, LUZ_M06]) {
      const urls = [luz.src, ...(luz.srcSet ?? '').split(',').map((item) => item.trim().split(' ')[0])].filter((url) => url !== '')
      expect(urls.length).toBeGreaterThan(0)
      for (const url of urls) expect(existsSync(join(PASTA_WEB, 'public', url.replace(/^\//, ''))), url).toBe(true)
    }
  })
})

describe('HOME-RHYTHM the room scales with the quadro by one unitless number, and the preview label leaves the picture', () => {
  it('the scale --heroi-k is 1 at 1440 (the quadro is 1200 px), the smallest of the width, first-screen and seam terms, clamped to [0.9, 1.78]', () => {
    const css = norm(readFileSync(CSS_DA_CASA, 'utf8'))
    expect(css).toContain('--heroi-k-largura: tan(atan2(var(--quadro-largura), 1200px));')
    expect(css).toContain('--heroi-k-altura: tan(atan2(calc(100svh - var(--cabecalho-alto)), 723px));')
    expect(css).toContain(
      '--heroi-k-costura: tan(atan2(var(--heroi-costura-x), calc(489.87 * min(100cqi, 1440px) / 1440)));',
    )
    expect(css).toContain(
      '--heroi-k: clamp(0.9, min(var(--heroi-k-largura), var(--heroi-k-altura), var(--heroi-k-costura)), 1.78);',
    )
    // The two ratios are numbers, so no length is divided by a length anywhere in the sheet.
    expect(css).not.toMatch(/\d+px \/ \d+px/)
  })

  it('the frozen 1440 lengths of the room are that number times the measured ones (723 px stays 723 at k = 1)', () => {
    const css = norm(readFileSync(CSS_DA_CASA, 'utf8'))
    for (const [nome, px] of [
      ['--heroi-alto', '723px'],
      ['--heroi-titulo-topo', '32px'],
      ['--heroi-placa-topo', '152px'],
      ['--heroi-leg-topo', '666.5px'],
      ['--palco-chao', '108px'],
      ['--palco-m06-largura', '395.5px'],
      ['--palco-m06-chao', '555.2px'],
    ] as const) {
      expect(css, nome).toContain(`${nome}: calc(${px} * var(--heroi-k));`)
    }
    // The lede block is anchored to the hero's foot (W1), not to a top offset: no `--heroi-lede-topo` is left behind.
    expect(css).toContain('--heroi-texto-fundo: calc((723px - 556.8px + 28px) * var(--heroi-k));')
    expect(css).not.toContain('--heroi-lede-topo')
    // The plate is as wide as `--cena-largura-max` at 1440 times k, on its seam; the measure of the text does not scale.
    expect(css).toContain('width: calc(var(--cena-largura-max) * min(100cqi, 1440px) / 1440 * var(--heroi-k));')
    expect(css).toContain('--heroi-medida: 388px;')
    // Band 3's frame follows the quadro by the width ratio only (1 up to 1440), so its gap to the heading stays closed.
    expect(css).toContain(
      '--produto-tela: calc(clamp(280px, calc(280px + (100cqi - 390px) * 40 / 1050), 320px) * var(--heroi-k-largura));',
    )
    // The rule never reads `dvh`, and the hero keeps its pin formula.
    expect(css).not.toContain('dvh')
    expect(css).toContain('min-height: calc(var(--palco-alto) + var(--troca-d, 0px));')
  })

  it('the preview label has one visually-hidden rule, on the note only (the form wrappers carry data-previa without a role)', () => {
    const css = norm(readFileSync(join(PASTA_SRC, 'styles', 'site.css'), 'utf8'))
    const regras = [...css.matchAll(/(\[data-previa[^{]*)\{([^}]*)\}/g)]
    expect(regras).toHaveLength(1)
    expect(regras[0][1].trim()).toBe("[data-previa][role='note']")
    const corpo = regras[0][2]
    for (const declaracao of [
      'position: absolute !important',
      'width: 1px !important',
      'height: 1px !important',
      'margin: -1px !important',
      'padding: 0 !important',
      'overflow: hidden !important',
      'clip: rect(0 0 0 0) !important',
      'white-space: nowrap !important',
    ]) {
      expect(corpo, declaracao).toContain(declaracao)
    }
    // It is not display:none or visibility:hidden, so a screen reader still reads it.
    expect(corpo).not.toMatch(/display:\s*none|visibility:\s*hidden/)
  })
})

// WIDTH-2 (WCAG 1.4.4): the room (the plate on the seam, the lede on a two-line row) is drawn for a 16 px root. With a larger
// root the hero leaves the room on any window: the CSS hand-over (inicio-casa.css, a container query with a text-size bonus)
// and the page script must agree, so the page renders the stacked DOM (the stage in the hero, no room layers) whenever the root
// text is above 16 px, and the room DOM at 16 px.
describe('WIDTH-2: with the root text above 16 px the page renders the stacked DOM on a room-sized window', () => {
  const raiz = () => document.documentElement
  afterEach(() => {
    raiz().style.removeProperty('font-size')
  })

  const ehSala = () => principal().querySelector('.ic-medida') !== null
  const palcoDoHeroi = () => principal().querySelector('[data-cena-heroi] [data-troca-palco]')

  it('at 1440 x 900 with a 16 px root the room DOM stands: the stage is band 2, the hero holds none', async () => {
    raiz().style.fontSize = '16px'
    await abrirJanela({ largura: 1440 })
    expect(ehSala()).toBe(true)
    expect(palcoDoHeroi()).toBeNull()
    expect(faixaDaNoite().querySelector('[data-troca-palco]')).not.toBeNull()
    expect(principal().querySelector('[data-troca-fixo]')).not.toBeNull()
  })

  it('a root under 16 px (a smaller browser text size) keeps the room: the CSS bound is negative there too', async () => {
    raiz().style.fontSize = '14px'
    await abrirJanela({ largura: 1440 })
    expect(ehSala()).toBe(true)
    expect(palcoDoHeroi()).toBeNull()
  })

  for (const tamanho of ['17px', '20px', '32px']) {
    it(`at 1440 x 900 with a ${tamanho} root the stacked DOM stands: the night frame in the hero, no room layers, no pin`, async () => {
      raiz().style.fontSize = tamanho
      await abrirJanela({ largura: 1440 })
      expect(ehSala()).toBe(false)
      expect(principal().querySelector('.ic-piso-dia')).toBeNull()
      expect(principal().querySelector('[data-troca-noite]')).toBeNull()
      expect(principal().querySelector('[data-troca-fixo]')).toBeNull()
      expect(principal().querySelector('[data-troca-gemea-tela]')).toBeNull()
      expect(faixaDaNoite().querySelector('[data-troca-palco]')).toBeNull()
      // The one stage is the hero's, with the NIGHT frame raster (a day frame would vanish on the cacau band).
      expect(principal().querySelectorAll('[data-troca-palco]')).toHaveLength(1)
      const palco = palcoDoHeroi()!
      expect(palco).not.toBeNull()
      expect(palco.classList.contains('ic-palco')).toBe(true)
      expect(palco.querySelector('img[data-produto-moldura-arte]')!.getAttribute('src')).toBe('/molduras/moldura-noite.png')
      // Both captions are static, as in any stacked page.
      expect(legendasEmTela()).toHaveLength(2)
    })
  }

  it('the 2560 x 1440 window at a 32 px root (200 %) is the stacked DOM too: the switch is the text size, not the width', async () => {
    raiz().style.fontSize = '32px'
    await abrirJanela({ largura: 2560, altura: 1440 })
    expect(ehSala()).toBe(false)
    expect(palcoDoHeroi()).not.toBeNull()
  })

  it('a window under 1180 px never was the room: 16 px or 20 px, the same stacked DOM', async () => {
    raiz().style.fontSize = '20px'
    await abrirJanela({ largura: 1179 })
    expect(ehSala()).toBe(false)
    expect(palcoDoHeroi()).not.toBeNull()
  })

  it('a change of the browser text size after mount (no change of width) switches the composition on the next resize', async () => {
    raiz().style.fontSize = '16px'
    await abrirJanela({ largura: 1440 })
    expect(ehSala()).toBe(true)
    raiz().style.fontSize = '24px'
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(ehSala()).toBe(false)
    expect(palcoDoHeroi()).not.toBeNull()
    raiz().style.fontSize = '16px'
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(ehSala()).toBe(true)
    expect(palcoDoHeroi()).toBeNull()
  })
})
