import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_CASCA } from '../componentes/demo-telefone/textosCasca.ts'
import { INI, INI_FATOS, INI_HORAS, INI_PERGUNTAS, INI_REF } from '../conteudo/inicio.ts'
import { INICIO as INICIO_ANTIGO } from '../conteudo/textos.ts'
import { aguardarCarga, renderizarRota } from '../teste/renderizarRota.tsx'

// The Início (`/`) in its composition "a luz, pela hora" (card COMP-PORT, palette A only), rendered in jsdom.
//   COMP-01  the structure: one [data-casa] > .co, the three scenes of the strip, the four bands, in order.
//   COMP-02  the images: every alt is a COPY constant (the Família screen has a real one), every file exists.
//   COMP-03  the copy: every text node and alt is a `conteudo/inicio.ts` constant; the 15:00 caption is absent.
//   COMP-04  one h1 with two spans; the header pill is quiet or filled by the page (`data-inicio-heroi`).
//   COMP-05  palette A only: nothing of palette B is left in the sources, the styles or the exports.
//   COMP-06  the stylesheet: one literal query for the wide strip, scroll motion only without a reduced-motion
//            preference, no raw colour, no !important, no `transition: all`.
//
// The wide strip (scenes 1 to 3 pinned) and the stacked page are one DOM: CSS alone chooses between them, so a
// width never changes what jsdom renders (COMP-01 proves it). What only a render shows (pinned frames, 200 % text,
// no horizontal scroll) is checked in captures, not here.

const PASTA_WEB = process.cwd()
const PASTA_SRC = join(PASTA_WEB, 'src')
const ARQUIVO_PAGINA = join(PASTA_SRC, 'paginas', 'Inicio.tsx')
const ARQUIVO_CSS = join(PASTA_SRC, 'componentes', 'inicio-composicao', 'composicao.css')
const ARQUIVO_COPY = join(PASTA_SRC, 'conteudo', 'inicio.ts')

/** The wide-strip query, written literally in Inicio.tsx (`LARGA`) and in composicao.css (CSS has no variable there). */
const CONSULTA_LARGA = '(min-width: 69em) and (min-aspect-ratio: 1/1)'

// The COPY strings these assertions name; no other pt-BR text is introduced here.
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
  altTela3:
    'Tela Família do site num celular. Em Membros, Juliana, responsável, e Ícaro, cuidador, cada um com o botão de mudar o papel. Em Convites, um de observador que ainda vale e um de cuidador que já venceu.',
}

const norm = (texto: string | null | undefined) => (texto ?? '').replace(/\s+/g, ' ').trim()

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

/** pt-BR literals in a source: a quoted string with an accented letter, or text written between JSX tags. */
function literaisPtBr(fonte: string): string[] {
  const limpo = semComentarios(fonte)
  const entre = [...limpo.matchAll(/>\s*([^<>{}\n]*[A-Za-zÀ-ÿ]{2,}[^<>{}\n]*)\s*</g)].map((m) => norm(m[1]))
  const acentuadas = [...literais(fonte)].filter((texto) => /[À-ÿ]/.test(texto))
  // Text between tags counts when it carries an accented letter or reads as two words of three letters or more.
  return [...entre.filter((texto) => /[À-ÿ]/.test(texto) || /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(texto)), ...acentuadas]
}

const lerCss = (arquivo: string) => readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n')
const semComentarioCss = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The lines that match `padrao` while the nearest top-level at-rule is not `@media (prefers-reduced-motion: no-preference)`
 * (a top-level plain rule resets the at-rule). Used to prove scroll motion exists only for people who did not ask for less.
 */
function usosForaDoMovimentoLivre(css: string, padrao: RegExp): string[] {
  const fora: string[] = []
  let arroba = ''
  for (const linha of css.split('\n')) {
    if (linha.startsWith('@')) arroba = linha
    else if (/^[^\s}]/.test(linha)) arroba = ''
    if (padrao.test(linha) && !arroba.includes('prefers-reduced-motion: no-preference')) fora.push(linha.trim())
  }
  return fora
}

/** The URLs a rendered subtree asks the server for (img src and srcset, source srcset), without the host. */
function urlsDeImagens(raiz: ParentNode): string[] {
  const urls: string[] = []
  for (const no of raiz.querySelectorAll('img, source')) {
    const src = no.getAttribute('src')
    if (src) urls.push(src)
    for (const candidato of (no.getAttribute('srcset') ?? '').split(',')) {
      const url = candidato.trim().split(/\s+/)[0]
      if (url) urls.push(url)
    }
  }
  return urls
}

// ---------------------------------------------------------------------------------------------
// COMP-01: structure
// ---------------------------------------------------------------------------------------------

describe('COMP-01 composition of /: one [data-casa] > .co, three scenes in one strip, four bands, in order', () => {
  it('COMP-01 /: one main with exactly one [data-casa] that holds one .co', async () => {
    await abrir(1440)
    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(principal().querySelectorAll('[data-casa]')).toHaveLength(1)
    const casa = principal().querySelector('[data-casa]')!
    expect(casa.querySelectorAll('.co')).toHaveLength(1)
    expect(casa.firstElementChild?.classList.contains('co')).toBe(true)
  })

  it('COMP-01 /: the three scenes (16:00, 17:30, 20:30) are the panels of one strip, and the four bands follow it in order', async () => {
    await abrir(1440)
    const paineis = [...principal().querySelectorAll<HTMLElement>('.co-fita > .co-painel')]
    expect(paineis.map((p) => [...p.classList].find((c) => /^co-p\d$/.test(c)))).toEqual(['co-p1', 'co-p2', 'co-p3'])
    const faixas = [...principal().querySelectorAll<HTMLElement>('.co > section.co-faixa')]
    expect(faixas.map((f) => [...f.classList].find((c) => c !== 'co-faixa'))).toEqual(['co-so', 'co-prova', 'co-perg', 'co-fecho'])
    const ordem: Element[] = [...paineis, ...faixas]
    for (let i = 1; i < ordem.length; i += 1) {
      const depois = ordem[i - 1].compareDocumentPosition(ordem[i]) & Node.DOCUMENT_POSITION_FOLLOWING
      expect(depois, `band ${i + 1} follows band ${i}`).toBeTruthy()
    }
    // The strip and its hour rail sit before the first band; the hero is the first panel.
    expect(principal().querySelector('.co-fita > .co-p1')!.hasAttribute('data-cena-heroi')).toBe(true)
    expect(principal().querySelectorAll('[data-cena-heroi]')).toHaveLength(1)
  })

  it('COMP-01 /: the questions carry id="perguntas" (the anchor of the nav) and it is the questions band', async () => {
    await abrir(1440)
    const alvo = document.getElementById('perguntas')
    expect(alvo).not.toBeNull()
    expect(alvo!.classList.contains('co-perg')).toBe(true)
    expect(alvo!.querySelectorAll('dt')).toHaveLength(INI_PERGUNTAS.length)
  })

  it('COMP-01 /: every section is named by a heading of the page (aria-labelledby resolves), and the headings come in order', async () => {
    await abrir(1440)
    const secoes = [...principal().querySelectorAll<HTMLElement>('section')]
    expect(secoes).toHaveLength(7)
    for (const secao of secoes) {
      const id = secao.getAttribute('aria-labelledby')
      expect(id, secao.className).toBeTruthy()
      const titulo = document.getElementById(id!)
      expect(titulo, id!).not.toBeNull()
      expect(secao.contains(titulo)).toBe(true)
      expect(/^H[12]$/.test(titulo!.tagName)).toBe(true)
    }
    const h2 = [...principal().querySelectorAll('h2')].map((h) => norm(h.textContent))
    expect(h2).toEqual([COPY.h2Noite, COPY.h2Tela, COPY.h2So, COPY.h2Prova, COPY.h2Perg, COPY.h2Fecho])
  })

  it('COMP-01 /: the hour rail lists the three hours, hidden from assistive tech (the headings and captions already say them)', async () => {
    await abrir(1440)
    const regua = principal().querySelector('ol.co-regua')!
    expect(regua.getAttribute('aria-hidden')).toBe('true')
    expect([...regua.querySelectorAll('li')].map((li) => norm(li.textContent))).toEqual([...INI_HORAS])
    const fantasmas = [...principal().querySelectorAll('.co-fantasma')]
    expect(fantasmas.map((f) => norm(f.textContent))).toEqual([INI_HORAS[0], INI_HORAS[1]])
    for (const fantasma of fantasmas) expect(fantasma.getAttribute('aria-hidden')).toBe('true')
  })

  it('COMP-01 /: the two signed captions read "hour, text" as one sentence (the comma is for screen readers only)', async () => {
    await abrir(1440)
    const legendas = [...principal().querySelectorAll<HTMLElement>('p[data-legenda]')]
    expect(legendas.map((l) => norm(l.textContent))).toEqual([COPY.leg1, COPY.leg2])
    for (const legenda of legendas) {
      expect(legenda.querySelector('.co-leg-hora')!.textContent).toMatch(/^\d{2}:\d{2}$/)
      expect(legenda.querySelector('.sr-only')!.textContent).toBe(', ')
    }
  })

  it('COMP-01 /: the four facts and the four questions are real lists, in the deck order', async () => {
    await abrir(1440)
    expect([...principal().querySelectorAll('ul.co-fatos > li')].map((li) => norm(li.textContent))).toEqual([...INI_FATOS])
    const dl = principal().querySelector('dl.co-perguntas')!
    expect([...dl.querySelectorAll('dt')].map((e) => norm(e.textContent))).toEqual(INI_PERGUNTAS.map((p) => p.pergunta))
    expect([...dl.querySelectorAll('dd')].map((e) => norm(e.textContent))).toEqual(INI_PERGUNTAS.map((p) => p.resposta))
  })

  it('COMP-01 /: the two pieces of art that are still missing are labelled slots, never hidden and never product copy', async () => {
    await abrir(1440)
    const vagas = [...principal().querySelectorAll('[data-aguarda-arte]')]
    expect(vagas.map((v) => norm(v.textContent))).toEqual([INI_REF.slotBerco, INI_REF.slotPorta])
    expect(vagas[0].closest('.co-p3')).not.toBeNull()
    expect(vagas[1].closest('.co-perg')).not.toBeNull()
    for (const texto of Object.values(INI)) expect(texto).not.toContain('Aguarda arte')
  })

  for (const largura of [320, 390, 768, 1024, 1440]) {
    it(`COMP-01 at ${largura} the page is the same DOM as at 1440: CSS alone picks the stacked or the wide composition`, async () => {
      const assinatura = () =>
        [...principal().querySelectorAll('*')].map((e) => `${e.tagName}.${[...e.classList].join('.')}`).join('|')
      const { unmount } = await abrir(1440)
      const larga = assinatura()
      unmount()
      await abrir(largura)
      expect(assinatura()).toBe(larga)
    })
  }

  it('COMP-01 /: nothing of the old Início renders (numbers, seals, quotes, marquee, pinned night sheet, CSS-drawn device, framed screens)', async () => {
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
      '[data-faixa]',
      '[data-troca-palco]',
      '[data-troca-noite]',
      '[data-troca-legenda]',
      '[data-produto-tela]',
      '[data-produto-moldura-arte]',
      '.ic-aparelho',
      '.ic-legenda',
    ]
    for (const seletor of velhos) expect(principal().querySelector(seletor), seletor).toBeNull()
    const texto = norm(principal().textContent)
    expect(texto).not.toContain(INICIO_ANTIGO.heroi.titulo[0])
    expect(texto).not.toContain(INICIO_ANTIGO.heroi.primario.rotulo)
    expect(texto).not.toContain(INICIO_ANTIGO.turno.titulo[0])
  })

  it('COMP-01 the page source takes only the ids and the header hook from the old inicio-casa folder, and nothing from movimento/troca', () => {
    const fonte = readFileSync(ARQUIVO_PAGINA, 'utf8')
    expect(fonte).toContain('PaginaCasa')
    expect(fonte).toContain("import '../componentes/inicio-composicao/composicao.css'")
    const importados = [...fonte.matchAll(/from '([^']*)'/g)].map((m) => m[1]).filter((origem) => /inicio-casa|movimento\/troca/.test(origem))
    expect(importados.sort()).toEqual(['../componentes/inicio-casa/ids.ts', '../componentes/inicio-casa/usoDaCasa.ts'])
    expect(fonte).not.toMatch(/componentes\/inicio\//)
    expect(fonte).not.toContain('CenaEstudio')
    expect(fonte).not.toMatch(/AparelhoEmCss|ic-aparelho/)
  })
})

// ---------------------------------------------------------------------------------------------
// COMP-02: images
// ---------------------------------------------------------------------------------------------

describe('COMP-02 images: every picture of content has a real alt from the copy file, decoration is empty, every file exists', () => {
  it('COMP-02 /: the non-empty alts are the eight COPY alts, in page order (the Família screen has its own)', async () => {
    await abrir(1440)
    const alts = [...principal().querySelectorAll('img')].map((i) => i.getAttribute('alt')).filter((alt) => alt !== '')
    expect(alts).toEqual([INI.altCena1, COPY.altTela1, INI.altCena2, COPY.altTela2, COPY.altTela3, INI.altCena3, INI.altNotas, INI.altPorta])
    expect(new Set(alts).size).toBe(alts.length)
  })

  it('COMP-02 /: the Família capture is described by its own alt (members and roles, the two invites), not by another screen\'s', async () => {
    await abrir(1440)
    const familia = principal().querySelector<HTMLImageElement>('.co-so-fone img')!
    expect(familia.getAttribute('src')).toBe('/composicao/a/familia-780w.webp')
    expect(familia.getAttribute('alt')).toBe(INI.altTela3)
    expect(INI.altTela3).toBe(COPY.altTela3)
    expect(INI.altTela3).not.toBe(INI.altTela1)
    expect(INI.altTela3).not.toBe(INI.altTela2)
    expect(INI.altTela3).toMatch(/Família/)
    expect(INI.altTela3).toMatch(/Juliana/)
    expect(INI.altTela3).toMatch(/Ícaro/)
    expect(INI.altTela3.length).toBeGreaterThan(80)
    expect(norm(familia.getAttribute('alt')).length).toBeGreaterThan(0)
  })

  it('COMP-02 /: the lights, the street and the slots\' frames are decorative (empty alt), and nothing has an alt that only repeats a file name', async () => {
    await abrir(1440)
    const luzes = [...principal().querySelectorAll('img.co-luz')]
    expect(luzes).toHaveLength(3)
    for (const luz of luzes) expect(luz.getAttribute('alt')).toBe('')
    const rua = principal().querySelector('.co-rua img:not(.co-luz)')!
    expect(rua.getAttribute('alt')).toBe('')
    for (const imagem of principal().querySelectorAll('img')) {
      expect(imagem.hasAttribute('alt'), imagem.getAttribute('src')!).toBe(true)
      expect(imagem.getAttribute('alt')).not.toMatch(/\.(webp|png|avif|jpe?g)$/i)
    }
  })

  it('COMP-02 /: the four phones are 390 x 844 captures with a 780w and a 1170w file, and every image states its size', async () => {
    await abrir(1440)
    const fones = [...principal().querySelectorAll<HTMLImageElement>('figure.co-fone img')]
    expect(fones.map((i) => i.getAttribute('src'))).toEqual([
      '/composicao/a/historico-780w.webp',
      '/composicao/a/hoje-n-780w.webp',
      '/composicao/a/familia-780w.webp',
      '/composicao/a/notas-780w.webp',
    ])
    for (const fone of fones) {
      const nome = fone.getAttribute('src')!.replace('-780w.webp', '')
      expect(fone.getAttribute('srcset')).toBe(`${nome}-780w.webp 780w, ${nome}-1170w.webp 1170w`)
      expect([fone.getAttribute('width'), fone.getAttribute('height')]).toEqual(['390', '844'])
      expect(fone.getAttribute('sizes')).toContain(CONSULTA_LARGA)
      expect(fone.getAttribute('loading')).toBe('lazy')
    }
    for (const imagem of principal().querySelectorAll('img')) {
      expect(imagem.getAttribute('width'), imagem.getAttribute('src')!).toMatch(/^\d+$/)
      expect(imagem.getAttribute('height'), imagem.getAttribute('src')!).toMatch(/^\d+$/)
    }
  })

  it('COMP-02 /: the first scene is a picture (the wide cut-out under the wide query, the phone one below it) and is not lazy', async () => {
    await abrir(1440)
    const quadro = principal().querySelector('.co-m05 picture')!
    const fonte = quadro.querySelector('source')!
    expect(fonte.getAttribute('media')).toBe(CONSULTA_LARGA)
    expect(fonte.getAttribute('srcset')).toBe('/composicao/a/m05.webp')
    const img = quadro.querySelector('img')!
    expect(img.getAttribute('src')).toBe('/composicao/a/m05m.webp')
    expect(img.getAttribute('loading')).not.toBe('lazy')
  })

  it('COMP-02 /: every file the page asks for exists under web/public, and every one of them is of palette A (or a shared lamp light)', async () => {
    await abrir(1440)
    const urls = [...new Set(urlsDeImagens(principal()))]
    expect(urls.length).toBeGreaterThan(15)
    for (const url of urls) {
      expect(url.startsWith('/'), url).toBe(true)
      expect(existsSync(join(PASTA_WEB, 'public', url)), url).toBe(true)
      expect(/^\/(composicao\/a|cenas\/inicio|cenas\/inicio-faixas)\//.test(url), url).toBe(true)
    }
    expect(urls.some((url) => url.startsWith('/composicao/a/'))).toBe(true)
  })

  it('COMP-02 the manifest of the cut-outs lists only palette A, and the page asks for no file the manifest does not know', () => {
    const medidas = JSON.parse(readFileSync(join(PASTA_WEB, 'public', 'composicao', 'medidas.json'), 'utf8')) as unknown
    expect(JSON.stringify(medidas)).not.toMatch(/bytes_b|composicao\/b|hora-azul/)
  })
})

// ---------------------------------------------------------------------------------------------
// COMP-03: copy
// ---------------------------------------------------------------------------------------------

describe('COMP-03 copy: every rendered text and alt is a COPY constant, ini.leg3 is absent, no literal in the page sources', () => {
  it('COMP-03 conteudo/inicio.ts holds the deck strings the page needs, and the new Família alt', () => {
    expect(existsSync(ARQUIVO_COPY)).toBe(true)
    const constantes = literais(readFileSync(ARQUIVO_COPY, 'utf8'))
    for (const texto of [COPY.h1, COPY.lede, COPY.cta1, COPY.cta2, COPY.leg1, COPY.h2Noite, COPY.leg2, COPY.h2Tela, COPY.h2So, COPY.h2Prova, COPY.h2Perg, COPY.h2Fecho, COPY.altTela1, COPY.altTela2, COPY.altTela3]) {
      expect(constantes.has(norm(texto)), texto).toBe(true)
    }
  })

  it('COMP-03 every text node of main and every non-empty alt equals a COPY constant (or a run of one, split by a span)', async () => {
    expect(existsSync(ARQUIVO_COPY)).toBe(true)
    const constantes = [...literais(readFileSync(ARQUIVO_COPY, 'utf8')), DEMO_CASCA.experimentar].filter((texto) => texto !== '')
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

  it('COMP-03 ini.leg3 (15:00) is not rendered and no caption or heading carries an hour before 16:00', async () => {
    await abrir(1440)
    expect(norm(principal().textContent)).not.toContain(COPY.leg3)
    const horas = [...principal().querySelectorAll('[data-legenda], h1, h2')].flatMap((e) => norm(e.textContent).match(/\b\d{1,2}:\d{2}\b/g) ?? [])
    expect(horas).not.toContain('15:00')
    expect(horas.length).toBeGreaterThan(0)
  })

  it('COMP-03 no pt-BR literal in the page source (Inicio.tsx), and the detector sees one', () => {
    // The detector's own controls.
    expect(literaisPtBr("const x = 'Não'")).toContain('Não')
    expect(literaisPtBr('<p>Olá mundo</p>')).toHaveLength(1)
    expect(literaisPtBr("const c = 'cm-botao cm-botao-mel'")).toEqual([])
    expect(literaisPtBr('// uma nota com acento: ação')).toEqual([])
    // The real source.
    expect(literaisPtBr(readFileSync(ARQUIVO_PAGINA, 'utf8'))).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// COMP-04: one h1, the header pill
// ---------------------------------------------------------------------------------------------

const pilulaDoCabecalho = () => document.querySelector<HTMLAnchorElement>('header[data-cabecalho] a[data-cabecalho-pilula]')
const ganchoDoHeroi = () => document.documentElement.dataset.inicioHeroi

describe('COMP-04 one h1 with two spans, and the header pill quiet or filled by the page', () => {
  it('COMP-04 /: one h1 with exactly two child spans, whole text equal to ini.h1, inside the hero', async () => {
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

  for (const largura of [320, 390, 768, 1024, 1440]) {
    it(`COMP-04 at ${largura} the hero has the mel pill "Criar conta" right after the value sentence, the text link beside it, and the header pill is quiet while it is in view`, async () => {
      await abrir(largura)
      const pilula = document.querySelector<HTMLAnchorElement>(PILULA_DO_HEROI)
      expect(pilula).not.toBeNull()
      expect(norm(pilula!.textContent)).toBe(COPY.cta1)
      expect(pilula!.getAttribute('href')).toBe('/criar-conta')
      // Under the value sentence: the lede and the pill share the text block, the lede first.
      const lede = [...document.querySelectorAll('[data-cena-heroi] p')].find((p) => norm(p.textContent) === COPY.lede)!
      expect(lede.compareDocumentPosition(pilula!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(lede.parentElement!.contains(pilula)).toBe(true)
      // The link is the pill's sibling in the same row of actions.
      const link = [...document.querySelectorAll<HTMLAnchorElement>('[data-cena-heroi] a')].find((a) => norm(a.textContent) === COPY.cta2)
      expect(link?.getAttribute('href')).toBe('/como-funciona')
      expect(link?.parentElement).toBe(pilula!.parentElement)
      expect(pilulaDoCabecalho()).not.toBeNull()
      expect(ganchoDoHeroi()).toBe('visivel')
      expect(principal().hasAttribute('data-cta-cabecalho')).toBe(false)
      expect(avisarPilulaDoHeroi(false)).toBeGreaterThan(0)
      expect(ganchoDoHeroi()).toBeUndefined()
      expect(avisarPilulaDoHeroi(true)).toBeGreaterThan(0)
      expect(ganchoDoHeroi()).toBe('visivel')
      // The hero pill and the closing one, and no other filled action.
      expect(principal().querySelectorAll('[data-botao-mel]')).toHaveLength(2)
      expect(principal().querySelector('.co-fecho [data-botao-mel]')).not.toBeNull()
      expect(principal().querySelector('.co-fecho [data-botao-mel]')!.getAttribute('href')).toBe('/criar-conta')
    })
  }

  it('COMP-04 the observer on the hero pill keeps a -72 px top root margin, and the mark is removed on unmount', async () => {
    const { unmount } = await abrir(1440)
    const dele = ObservadorFalso.todos.find((o) => [...o.alvos].some((alvo) => alvo.matches(PILULA_DO_HEROI)))
    expect(dele?.rootMargin.split(/\s+/)[0]).toBe('-72px')
    expect(ganchoDoHeroi()).toBe('visivel')
    unmount()
    expect(ganchoDoHeroi()).toBeUndefined()
  })

  it('COMP-04 the page stylesheet quiets the shell pill only under html[data-inicio-heroi], at every width, with no !important', () => {
    const css = semComentarioCss(lerCss(ARQUIVO_CSS))
    const inicio = css.indexOf('html[data-inicio-heroi')
    expect(inicio).toBeGreaterThan(-1)
    const bloco = css.slice(inicio)
    // The quiet rule is the first one under the mark, and no width query gates it (the pill is in the hero at 320 too).
    expect(bloco.startsWith("html[data-inicio-heroi='visivel'] header[data-cabecalho]:not([data-tom='noite']) a[data-cabecalho-pilula] {")).toBe(true)
    expect(bloco).not.toMatch(/@media \((min|max)-width/)
    expect(css).not.toContain('data-cta-cabecalho')
    // The hover only where there is a hover.
    expect(bloco).toMatch(/@media \(hover: hover\) \{\s*html\[data-inicio-heroi='visivel'\][^{]*a\[data-cabecalho-pilula\]:hover \{/)
  })
})

// ---------------------------------------------------------------------------------------------
// COMP-05: palette A only
// ---------------------------------------------------------------------------------------------

describe('COMP-05 palette A only: nothing of palette B is left in the sources, the tokens, the exports or the page', () => {
  const ARQUIVOS_DA_PALETA = [
    ARQUIVO_PAGINA,
    ARQUIVO_CSS,
    join(PASTA_SRC, 'styles', 'tokens.css'),
    join(PASTA_WEB, 'scripts', 'composicao', 'exportar_recortes.py'),
  ]

  /** The names of palette B in a source: the token block, the attribute that picked it, the folder of its cut-outs. */
  const achaPaletaB = (fonte: string) => fonte.match(/hora-azul|composicao\/b\b|data-paleta=["']hora|dataset\.paleta|searchParams[^)]*paleta|bytes_b/g) ?? []

  it('COMP-05 the detector sees palette B in a sample (negative control) and not in palette A\'s names', () => {
    expect(achaPaletaB('html[data-paleta="hora-azul"] { --co-breu: #000 }')).toEqual(['data-paleta="hora'])
    expect(achaPaletaB('--paleta: hora-azul')).toEqual(['hora-azul'])
    expect(achaPaletaB('const pasta = `${RAIZ}composicao/b`')).toEqual(['composicao/b'])
    expect(achaPaletaB('const ARTE = `${RAIZ}composicao/a`')).toEqual([])
    expect(achaPaletaB('{"bytes_b": 1}')).toEqual(['bytes_b'])
  })

  it('COMP-05 the page, the stylesheet, the tokens and the export script name no palette B', () => {
    for (const arquivo of ARQUIVOS_DA_PALETA) {
      expect(existsSync(arquivo), arquivo).toBe(true)
      expect(achaPaletaB(readFileSync(arquivo, 'utf8')), arquivo).toEqual([])
    }
  })

  it('COMP-05 the page reads no colour choice from the URL or the DOM, and its one art folder is composicao/a', () => {
    const fonte = semComentarios(readFileSync(ARQUIVO_PAGINA, 'utf8'))
    expect(fonte).not.toMatch(/useSearchParams|URLSearchParams|location\.search|pastaDaArte|\bpaleta\b|\bazul\b/i)
    expect(fonte).toContain('composicao/a')
  })

  it('COMP-05 /: no palette attribute on <html>, <main> or the page, and the wall tokens are the page\'s own', async () => {
    await abrir(1440)
    expect(document.documentElement.hasAttribute('data-paleta')).toBe(false)
    expect(principal().querySelector('[data-paleta]')).toBeNull()
    const tokens = readFileSync(join(PASTA_SRC, 'styles', 'tokens.css'), 'utf8')
    expect(tokens).not.toContain('--co-breu')
    expect(lerCss(ARQUIVO_CSS)).toMatch(/\.co \{[^}]*--co-breu:\s*#18110F;/i)
  })
})

// ---------------------------------------------------------------------------------------------
// COMP-06: the stylesheet
// ---------------------------------------------------------------------------------------------

describe('COMP-06 stylesheet: one literal query, scroll motion only for who did not ask for less, tokens only', () => {
  const css = lerCss(ARQUIVO_CSS)
  const limpo = semComentarioCss(css)

  it('COMP-06 the wide query is the same literal in Inicio.tsx and composicao.css (CSS has no variable in a media query)', () => {
    expect(readFileSync(ARQUIVO_PAGINA, 'utf8')).toContain(`const LARGA = '${CONSULTA_LARGA}'`)
    expect(limpo).toContain(`@media ${CONSULTA_LARGA} {`)
    expect(limpo).toContain(`@media ${CONSULTA_LARGA} and (min-height: 40em) and (prefers-reduced-motion: no-preference) {`)
  })

  it('COMP-06 the helper tells a scroll animation outside the no-preference block from one inside it (negative control)', () => {
    const fora = '.a {\n  animation-timeline: view();\n}\n'
    const dentro = '@media (prefers-reduced-motion: no-preference) {\n  @supports (animation-timeline: view()) {\n    .a {\n      animation-timeline: view();\n    }\n  }\n}\n.b {\n  color: red;\n}\n'
    const depois = '@media (prefers-reduced-motion: no-preference) {\n  .a {\n    color: red;\n  }\n}\n.b {\n  animation-timeline: view();\n}\n'
    expect(usosForaDoMovimentoLivre(fora, /animation-timeline:/)).toHaveLength(1)
    expect(usosForaDoMovimentoLivre(dentro, /animation-timeline: view\(\);$/)).toEqual([])
    expect(usosForaDoMovimentoLivre(depois, /animation-timeline:/)).toHaveLength(1)
  })

  it('COMP-06 every scroll timeline, view timeline and the sticky pin sit inside @media (prefers-reduced-motion: no-preference), so reduced motion shows the stacked still composition', () => {
    expect(usosForaDoMovimentoLivre(limpo, /animation-timeline:|view-timeline:|timeline-scope:|position: sticky/)).toEqual([])
    // And they are there at all (the motion was not simply dropped).
    expect(limpo).toMatch(/animation-timeline: view\(\);/)
    expect(limpo).toMatch(/animation-timeline: --co-fita;/)
    // Each use is behind feature detection (a browser without scroll timelines keeps the stacked still page).
    expect(limpo.match(/@supports \(\(animation-timeline: view\(\)\) and \(animation-range: entry\)\)/g)).toHaveLength(2)
  })

  it('COMP-06 no raw colour, no !important, no transition: all, no outline removed, no px font size', () => {
    // The one exemption: the floor line's own declaration (--co-breu, A05) lives on .co, not in the shared tokens.
    expect(limpo.replace('--co-breu: #18110F;', '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(limpo).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(/)
    expect(limpo).not.toContain('!important')
    expect(limpo).not.toMatch(/transition:\s*all/)
    expect(limpo).not.toMatch(/outline:\s*(none|0)\b/)
    expect(limpo).not.toMatch(/font-size:\s*[\d.]+px/)
  })

  it('COMP-06 the page never scrolls sideways by itself: the wide strip is clipped by its own stage, and the root clips only on x', () => {
    expect(limpo).toMatch(/\.co \{[^}]*overflow-x: clip;/)
    expect(limpo).toMatch(/\.co-palco \{[^}]*overflow: clip;/)
  })

  it('COMP-06 the stylesheet names no palette B and no file of the retired composition (inicio-casa, troca)', () => {
    expect(limpo).not.toMatch(/hora-azul|composicao\/b|\.ic-|data-troca|data-produto-tela/)
  })
})

describe('COMP-06 the page directory holds no source file besides the stylesheet and the pieces, and no test reads one that is gone', () => {
  it('COMP-06 the composition folder is only its stylesheet and the pieces module (the page is paginas/Inicio.tsx)', () => {
    const pasta = join(PASTA_SRC, 'componentes', 'inicio-composicao')
    expect(statSync(pasta).isDirectory()).toBe(true)
    expect(readdirSync(pasta)).toEqual(['composicao.css', 'pecas.tsx'])
  })
})
