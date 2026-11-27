import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INI, INI_FATOS, INI_PERGUNTAS, INI_REF } from '../conteudo/inicio.ts'
import { aguardarCarga, renderizarRota } from '../teste/renderizarRota.tsx'

// The scenes 3 to 7 of the Início composition (the 20:30 hour, the lone carer, the proof, the questions, the closing),
// at source level (card COMP-PORT). Scenes 1 and 2, the header pill and the images as a whole are in inicio.test.tsx.
// jsdom has no layout and no scroll-driven animation, so the CSS is read as text and the page as DOM; the browser
// numbers (frame sizes, pixels, getAnimations) are the render's job and are printed in the handoff.

const PASTA_SRC = join(process.cwd(), 'src')
const lerTexto = (caminho: string) => readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const colapsar = (texto: string) => texto.replace(/\s+/g, ' ').trim()
const norm = (texto: string | null | undefined) => (texto ?? '').replace(/\s+/g, ' ').trim()
const CSS_DA_COMPOSICAO = () => lerTexto(join(PASTA_SRC, 'componentes', 'inicio-composicao', 'composicao.css'))

// The alts of the leader's humanizer pass (COPY_HUMANIZER_SECOND_HALF.md), verbatim, and the Família one (COMP-PORT).
const ALT_BANDA_4 = 'Heloísa de bruços no tapete, de cabeça erguida e sorrindo. Juliana está deitada ao lado dela, também de bruços, olhando para a bebê.'
const ALT_NOTAS = 'Tela de Notas do AppMaternidade com a nota de Juliana em destaque: “Pomada só à noite.” Abaixo, uma nota de Ícaro: “Fraldas P no armário de cima.”'
const ALT_PORTA = 'Uma mão põe a chave na fechadura de uma porta fechada, num corredor à noite.'

interface Declaracao {
  prop: string
  valor: string
  seletor: string
  pilha: string[]
}

/** Every declaration of a stylesheet with its rule's selector and the at-rule preludes around it. */
function declaracoes(css: string): Declaracao[] {
  const saida: Declaracao[] = []
  const pilha: string[] = []
  let atual = ''
  const registrar = () => {
    const i = atual.indexOf(':')
    const topo = pilha[pilha.length - 1]
    if (i > 0 && topo !== undefined && !topo.startsWith('@layer') && !topo.startsWith('@media') && !topo.startsWith('@supports')) {
      saida.push({ prop: colapsar(atual.slice(0, i)), valor: colapsar(atual.slice(i + 1)), seletor: topo, pilha: [...pilha] })
    }
    atual = ''
  }
  for (const c of semComentarios(css)) {
    if (c === '{') {
      pilha.push(colapsar(atual))
      atual = ''
    } else if (c === '}') {
      registrar()
      pilha.pop()
    } else if (c === ';') registrar()
    else atual += c
  }
  return saida
}

// ---- window and observer stubs ------------------------------------------------------------------------------------

const LARGURA_ORIGINAL = window.innerWidth
const MATCHMEDIA_ORIGINAL = window.matchMedia

function fixarJanela(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (consulta: string) => {
      const numero = /(\d+(?:\.\d+)?)(px|rem|em)/.exec(consulta)
      const px = numero ? Number(numero[1]) * (numero[2] === 'px' ? 1 : 16) : Number.NaN
      let matches = false
      if (/min-width/.test(consulta)) matches = largura >= px
      else if (/max-width/.test(consulta)) matches = largura <= px
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
  chamada: IntersectionObserverCallback
  constructor(chamada: IntersectionObserverCallback) {
    this.chamada = chamada
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
  fixarJanela(largura)
  const resultado = renderizarRota('/', { sessao: null })
  await aguardarCarga()
  return resultado
}

const principal = () => document.querySelector<HTMLElement>('main')!
const banda = (classe: string) => principal().querySelector<HTMLElement>(`section.${classe}`)!
const antes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

// ---- the copy -----------------------------------------------------------------------------------------------------

describe('SH-copy: the alts of scenes 4 to 6 come from conteudo/inicio.ts, verbatim', () => {
  it('altCena3 (lone carer), altNotas (proof) and altPorta (questions) are the humanizer strings', () => {
    expect(INI.altCena3).toBe(ALT_BANDA_4)
    expect(INI.altNotas).toBe(ALT_NOTAS)
    expect(INI.altPorta).toBe(ALT_PORTA)
  })

  it('no other copy of those alts, or of the Família one, exists in the page source or the stylesheet', () => {
    for (const fonte of ['paginas/Inicio.tsx', 'componentes/inicio-composicao/composicao.css']) {
      const texto = lerTexto(join(PASTA_SRC, fonte))
      for (const alt of [ALT_BANDA_4, ALT_NOTAS, ALT_PORTA, INI.altTela3]) expect(texto, fonte).not.toContain(alt)
    }
  })
})

// ---- the page ------------------------------------------------------------------------------------------------------

describe('SH-1 no floor strip: the page holds no .ic-chao node and no rule names it', () => {
  for (const largura of [390, 1440]) {
    it(`at ${largura} document.querySelectorAll('[data-casa] .ic-chao') is empty`, async () => {
      await abrir(largura)
      expect(document.querySelectorAll('[data-casa] .ic-chao')).toHaveLength(0)
      expect(document.querySelectorAll('[data-casa] [class^="ic-"], [data-casa] [class*=" ic-"]')).toHaveLength(0)
    })
  }

  it('composicao.css has no .ic-chao rule', () => {
    expect(semComentarios(CSS_DA_COMPOSICAO())).not.toContain('ic-chao')
  })
})

describe('SH-2 scene 3 (20:30): the hour as type, the Hoje screen, and the cradle that waits for art', () => {
  it('one h2 with the deck string and no <br>, the sentence under it, then the scene with the slot and the Hoje phone', async () => {
    await abrir(1440)
    const cena = banda('co-p3')
    const titulo = cena.querySelector('h2')!
    expect(norm(titulo.textContent)).toBe(INI.h2Tela)
    expect(titulo.classList.contains('co-h2-hora')).toBe(true)
    expect(titulo.querySelector('br')).toBeNull()
    expect(cena.querySelectorAll('h2')).toHaveLength(1)
    const frase = cena.querySelector('.co-p3-texto p')!
    expect(norm(frase.textContent)).toBe(INI.pTela)
    const vaga = cena.querySelector('[data-aguarda-arte]')!
    const fone = cena.querySelector<HTMLImageElement>('figure.co-fone img')!
    expect(norm(vaga.textContent)).toBe(INI_REF.slotBerco)
    expect(fone.getAttribute('alt')).toBe(INI.altTela2)
    expect(antes(titulo, frase) && antes(frase, vaga) && antes(vaga, fone)).toBe(true)
    // No picture of a person is invented for the slot: the scene holds one image, the phone.
    expect(cena.querySelectorAll('img')).toHaveLength(1)
  })

  it('no animation is declared for the 20:30 scene itself', () => {
    const doTres = declaracoes(CSS_DA_COMPOSICAO()).filter((d) => /\.co-p3\b/.test(d.seletor) && /^animation/.test(d.prop))
    expect(doTres).toEqual([])
  })
})

describe('SH-3 scene 4 (the lone carer): the text, the Família screen and the cut-out, with their own alts', () => {
  it('one h2, one sentence, then the Família phone (altTela3) and the M04 figure (altCena3)', async () => {
    await abrir(1440)
    const cena = banda('co-so')
    expect(cena.querySelectorAll('h2')).toHaveLength(1)
    expect(norm(cena.querySelector('h2')!.textContent)).toBe(INI.h2So)
    expect(norm(cena.querySelector('.co-so-texto p')!.textContent)).toBe(INI.pSo)
    const fone = cena.querySelector<HTMLImageElement>('figure.co-so-fone img')!
    const figura = cena.querySelector<HTMLImageElement>('figure.co-m04 img')!
    expect(fone.getAttribute('alt')).toBe(INI.altTela3)
    expect(figura.getAttribute('alt')).toBe(INI.altCena3)
    expect(figura.getAttribute('loading')).toBe('lazy')
    expect(antes(cena.querySelector('.co-so-texto')!, fone.closest('figure')!)).toBe(true)
    expect(antes(fone.closest('figure')!, figura.closest('figure')!)).toBe(true)
    expect(cena.querySelectorAll('img')).toHaveLength(2)
  })
})

describe('SH-4 scene 5 (the proof): the statement, the four facts as a list, and the Notas capture', () => {
  it('the heading, the sentence and the four facts in the deck order, then the one capture with its alt', async () => {
    await abrir(1440)
    const cena = banda('co-prova')
    expect(norm(cena.querySelector('h2')!.textContent)).toBe(INI.h2Prova)
    expect(norm(cena.querySelector('.co-prova-texto > p')!.textContent)).toBe(INI.pProva)
    const itens = [...cena.querySelectorAll('ul.co-fatos > li')]
    expect(itens.map((li) => norm(li.textContent))).toEqual([...INI_FATOS])
    expect(itens).toHaveLength(4)
    const nota = cena.querySelector<HTMLImageElement>('figure.co-prova-fone img')!
    expect(nota.getAttribute('alt')).toBe(INI.altNotas)
    expect(nota.getAttribute('src')).toBe('/composicao/a/notas-780w.webp')
    expect(cena.querySelectorAll('img')).toHaveLength(1)
    expect(antes(cena.querySelector('ul.co-fatos')!, nota)).toBe(true)
  })
})

describe('SH-5 scene 6 (the questions): four questions with open answers, and the door', () => {
  it('four dt/dd pairs in the deck order, always open (no aria-expanded, no details), the heading kept in the tree', async () => {
    await abrir(1440)
    const cena = banda('co-perg')
    expect(norm(cena.querySelector('h2')!.textContent)).toBe(INI.h2Perg)
    const pares = [...cena.querySelectorAll('dl.co-perguntas > div')]
    expect(pares).toHaveLength(INI_PERGUNTAS.length)
    pares.forEach((par, i) => {
      expect(norm(par.querySelector('dt')!.textContent)).toBe(INI_PERGUNTAS[i].pergunta)
      expect(norm(par.querySelector('dd')!.textContent)).toBe(INI_PERGUNTAS[i].resposta)
    })
    expect(cena.querySelector('[aria-expanded], details, summary, [hidden]')).toBeNull()
  })

  it('the door is one figure after the text block, with the humanizer alt, and its full-body replacement waits as a labelled slot on it', async () => {
    await abrir(1440)
    const cena = banda('co-perg')
    const porta = cena.querySelector<HTMLImageElement>('figure.co-porta img')!
    expect(porta.getAttribute('alt')).toBe(INI.altPorta)
    expect(porta.getAttribute('src')).toBe('/composicao/a/porta.webp')
    expect(antes(cena.querySelector('.co-perg-texto')!, porta)).toBe(true)
    const vaga = cena.querySelector('figure.co-porta [data-aguarda-arte]')!
    expect(norm(vaga.textContent)).toBe(INI_REF.slotPorta)
  })
})

describe('SH-6 scene 7 (the closing): the heading, one mel pill, and the street at dusk as decoration', () => {
  it('one h2, one link (the pill to /criar-conta), then the street and its light layer, both with an empty alt', async () => {
    await abrir(1440)
    const cena = banda('co-fecho')
    expect(norm(cena.querySelector('h2')!.textContent)).toBe(INI.h2Fecho)
    const links = [...cena.querySelectorAll<HTMLAnchorElement>('a')]
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/criar-conta')
    expect(norm(links[0].textContent)).toBe(INI.cta3)
    expect(links[0].hasAttribute('data-botao-mel')).toBe(true)
    const imagens = [...cena.querySelectorAll('img')]
    expect(imagens.map((i) => i.getAttribute('alt'))).toEqual(['', ''])
    expect(imagens[1].classList.contains('co-luz')).toBe(true)
    expect(antes(links[0], imagens[0])).toBe(true)
  })

  it('it is the last band of the page: nothing but the shell follows it inside main', async () => {
    await abrir(1440)
    const faixas = principal().querySelectorAll('.co > section')
    expect(faixas[faixas.length - 1].classList.contains('co-fecho')).toBe(true)
    expect(principal().querySelector('.co')!.lastElementChild).toBe(faixas[faixas.length - 1])
    expect(principal().querySelectorAll('.co-fecho')).toHaveLength(1)
  })
})

// ---- motion --------------------------------------------------------------------------------------------------------

/** The scroll-timeline declarations whose enclosing at-rules do not include both gates (no reduced-motion preference, @supports). */
function semAsDuasPortas(css: string): string[] {
  return declaracoes(css)
    .filter((d) => d.prop === 'animation-timeline')
    .filter(
      (d) =>
        !d.pilha.some((p) => p.startsWith('@media') && p.includes('prefers-reduced-motion: no-preference')) ||
        !d.pilha.some((p) => p.startsWith('@supports') && p.includes('animation-timeline: view()')),
    )
    .map((d) => `${d.seletor} { ${d.prop}: ${d.valor} }`)
}

describe('SH-7 motion: every scroll timeline of the page sits under both gates, and moves only what is cheap', () => {
  it('the gate checker flags a timeline outside either gate (negative control) and passes one inside both', () => {
    const solto = '.a {\n  animation-timeline: view();\n}\n'
    const so_reduzido = '@media (prefers-reduced-motion: no-preference) {\n  .a {\n    animation-timeline: view();\n  }\n}\n'
    const so_suporte = '@supports ((animation-timeline: view()) and (animation-range: entry)) {\n  .a {\n    animation-timeline: view();\n  }\n}\n'
    const ok =
      '@media (prefers-reduced-motion: no-preference) {\n  @supports ((animation-timeline: view()) and (animation-range: entry)) {\n    .a {\n      animation-timeline: view();\n    }\n  }\n}\n'
    expect(semAsDuasPortas(solto)).toHaveLength(1)
    expect(semAsDuasPortas(so_reduzido)).toHaveLength(1)
    expect(semAsDuasPortas(so_suporte)).toHaveLength(1)
    expect(semAsDuasPortas(ok)).toEqual([])
  })

  it('every animation-timeline of composicao.css sits inside @media (prefers-reduced-motion: no-preference) and @supports (animation-timeline: view())', () => {
    const css = CSS_DA_COMPOSICAO()
    expect(declaracoes(css).filter((d) => d.prop === 'animation-timeline').length).toBeGreaterThanOrEqual(8)
    expect(semAsDuasPortas(css)).toEqual([])
  })

  it('every animation shorthand is `<name> linear both` (driven by the scroll, not a clock) or `none`', () => {
    const atalhos = declaracoes(CSS_DA_COMPOSICAO()).filter((d) => d.prop === 'animation')
    expect(atalhos.length).toBeGreaterThan(0)
    for (const atalho of atalhos) expect(atalho.valor, atalho.seletor).toMatch(/^(co-[a-z-]+ linear both|none)$/)
  })

  it('the keyframes move only clip-path, opacity, object-position and transform (no layout property)', () => {
    const passos = declaracoes(CSS_DA_COMPOSICAO()).filter((d) => d.pilha[0]?.startsWith('@keyframes'))
    expect(new Set(passos.map((d) => d.pilha[0].replace('@keyframes ', ''))).size).toBe(6)
    const props = new Set(passos.map((d) => d.prop))
    for (const prop of props) expect(['clip-path', 'opacity', 'object-position', 'transform'], prop).toContain(prop)
  })

  it('no vw unit and no italic in the page rules (the text size follows the root; the width follows the container)', () => {
    const limpo = semComentarios(CSS_DA_COMPOSICAO())
    expect(limpo).not.toMatch(/\d\s*vw\b/)
    expect(limpo).not.toMatch(/font-style:\s*italic/)
  })
})

// ---- type ----------------------------------------------------------------------------------------------------------

describe('SH-9 type: every font-size and line-height reads a token, and no raw colour is written', () => {
  it('no font-size or line-height of the page is a px, rem or em length (token variables, or multiples of them)', () => {
    const tipo = declaracoes(CSS_DA_COMPOSICAO()).filter((d) => d.prop === 'font-size' || d.prop === 'line-height')
    expect(tipo.length).toBeGreaterThan(10)
    for (const d of tipo) {
      expect(d.valor, `${d.seletor} { ${d.prop} }`).not.toMatch(/\d(px|rem|em)\b/)
      if (d.prop === 'font-size') expect(d.valor, d.seletor).toMatch(/var\(--texto-/)
    }
  })

  it('the type check sees a px size and a rem line height (negative control)', () => {
    const amostra = '.a {\n  font-size: 17px;\n  line-height: 1.5rem;\n}\n.b {\n  font-size: var(--texto-corpo-tamanho);\n}\n'
    const tipo = declaracoes(amostra).filter((d) => /\d(px|rem|em)\b/.test(d.valor))
    expect(tipo.map((d) => d.prop)).toEqual(['font-size', 'line-height'])
  })

  it('no raw hex or rgb colour in composicao.css', () => {
    const limpo = semComentarios(CSS_DA_COMPOSICAO())
    // The one exemption: the floor line's own declaration (--co-breu, A05) lives on .co, not in the shared tokens.
    expect(limpo.replace('--co-breu: #18110F;', '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(limpo).not.toMatch(/\brgba?\(/)
  })
})
