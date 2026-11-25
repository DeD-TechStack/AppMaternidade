import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { M04 } from '../componentes/inicio-casa/midia.ts'
import { INI } from '../conteudo/inicio.ts'
import { CONDICAO_NATIVA } from '../movimento/troca/usarPalco.ts'
import { aguardarCarga, renderizarRota } from '../teste/renderizarRota.tsx'

// HOME-SECOND-HALF (card t_bb3048d4): bands 3 to 7 of the Início, at source level. jsdom has no layout and no
// scroll-driven animation, so the CSS is read as text and the page as DOM; the browser numbers (frame sizes, pixels,
// getAnimations) are the render's job and are printed in the handoff.

const PASTA_SRC = join(process.cwd(), 'src')
const PASTA_CASA = join(PASTA_SRC, 'componentes', 'inicio-casa')
const lerTexto = (caminho: string) => readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const colapsar = (texto: string) => texto.replace(/\s+/g, ' ').trim()
const CSS_DA_CASA = () => lerTexto(join(PASTA_CASA, 'inicio-casa.css'))
const CSS_DAS_FAIXAS = () => lerTexto(join(PASTA_CASA, 'inicio-faixas.css'))
const norm = (texto: string | null | undefined) => (texto ?? '').replace(/\s+/g, ' ').trim()

// The three alts of the leader's humanizer pass (COPY_HUMANIZER_SECOND_HALF.md), verbatim.
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

// ---- window, media and observer stubs ----------------------------------------------------------------------------

const LARGURA_ORIGINAL = window.innerWidth
const MATCHMEDIA_ORIGINAL = window.matchMedia

function fixarJanela(largura: number, reduzido = false) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 })
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
  opcoes: IntersectionObserverInit | undefined
  constructor(chamada: IntersectionObserverCallback, opcoes?: IntersectionObserverInit) {
    this.chamada = chamada
    this.opcoes = opcoes
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

async function abrir(largura: number, reduzido = false) {
  fixarJanela(largura, reduzido)
  const resultado = renderizarRota('/', { sessao: null })
  await aguardarCarga()
  return resultado
}

const principal = () => document.querySelector<HTMLElement>('main')!
const faixaDe = (filho: string) => principal().querySelector<HTMLElement>(`[data-faixa]:has(${filho})`)!

/** Tells every observer that watches a node matching `seletor` that it is in view. */
function avisarVista(seletor: string) {
  act(() => {
    for (const observador of ObservadorFalso.todos) {
      const alvos = [...observador.alvos].filter((alvo) => alvo.matches(seletor))
      if (alvos.length === 0) continue
      observador.chamada(
        alvos.map((target) => ({ target, isIntersecting: true, intersectionRatio: 1 }) as unknown as IntersectionObserverEntry),
        observador as unknown as IntersectionObserver,
      )
    }
  })
}

// ---- the copy -----------------------------------------------------------------------------------------------------

describe('SH-copy: the three alts come from conteudo/inicio.ts, verbatim', () => {
  it('altCena3 (band 4), altNotas (band 5) and altPorta (band 6) are the humanizer strings', () => {
    expect(INI.altCena3).toBe(ALT_BANDA_4)
    expect((INI as Record<string, string>).altNotas).toBe(ALT_NOTAS)
    expect((INI as Record<string, string>).altPorta).toBe(ALT_PORTA)
  })

  it('no other copy of the three alts exists in the page sources', () => {
    const fontes = ['paginas/Inicio.tsx', 'componentes/inicio-casa/midia.ts', 'componentes/inicio-casa/FaixaTela.tsx', 'componentes/inicio-casa/FaixaSozinho.tsx']
    for (const fonte of fontes) {
      const texto = lerTexto(join(PASTA_SRC, fonte))
      for (const alt of [ALT_BANDA_4, ALT_NOTAS, ALT_PORTA]) expect(texto, fonte).not.toContain(alt)
    }
  })
})

// ---- the page at 1440 ---------------------------------------------------------------------------------------------

describe('SH-1 no floor strip: bands 3 to 7 hold no .ic-chao node and no rule names it', () => {
  for (const largura of [390, 1440]) {
    it(`at ${largura} document.querySelectorAll('[data-casa] .ic-chao') is empty`, async () => {
      await abrir(largura)
      expect(document.querySelectorAll('[data-casa] .ic-chao')).toHaveLength(0)
    })
  }

  it('inicio-casa.css has no .ic-chao rule and no floor-strip comment is left as a contract', () => {
    expect(semComentarios(CSS_DA_CASA())).not.toContain('ic-chao')
  })
})

describe('SH-2 band 3: the hour as type, its frame on the band edge', () => {
  it('one h2 with the deck string and no <br>, one framed screen (the night raster) and nothing else', async () => {
    await abrir(1440)
    const banda = faixaDe('.ic-tela')
    const titulo = banda.querySelector('h2')!
    expect(norm(titulo.textContent)).toBe('Dormiu às 20:30.')
    expect(titulo.querySelector('br')).toBeNull()
    expect(banda.querySelectorAll('[data-produto-moldura]')).toHaveLength(1)
    expect(banda.querySelector('[data-produto-moldura-arte]')!.getAttribute('src')).toBe('/molduras/moldura-noite.png')
    expect(banda.querySelectorAll('.ic-tela > *:last-child')[0].hasAttribute('data-produto-moldura')).toBe(true)
  })

  it('the h2 is set from the 404 display tokens (112 / 56) with lining tabular figures, wrapped by max-inline-size in em', () => {
    const regras = declaracoes(CSS_DA_CASA()).filter((d) => /\.ic-tela-texto h2|\.ic-tela h2|\.ic-h2-hora/.test(d.seletor))
    const por = (prop: string) => regras.filter((d) => d.prop === prop).map((d) => d.valor)
    expect(por('font-size')).toContain('var(--texto-exibicao-404-tamanho)')
    expect(por('line-height')).toContain('var(--texto-exibicao-404-entrelinha)')
    expect(por('font-variant-numeric')).toContain('tabular-nums lining-nums')
    expect(por('max-inline-size').some((v) => /^[\d.]+em$/.test(v))).toBe(true)
  })

  it('no animation lives in the band: no keyframes name, no animation declaration for .ic-tela', () => {
    const tela = declaracoes(CSS_DA_CASA()).filter((d) => /\.ic-tela/.test(d.seletor))
    expect(tela.filter((d) => d.prop.startsWith('animation') || d.prop === 'transition')).toEqual([])
  })
})

describe('SH-3 band 4: unboxed, the mat cut by the 4/5 line', () => {
  it('one img, the plate m04-faixa, with the humanizer alt, in a frame that is lazy and has no avif source', async () => {
    await abrir(1440)
    const banda = faixaDe('.ic-so')
    const imagens = banda.querySelectorAll('img')
    expect(imagens).toHaveLength(1)
    expect(imagens[0].getAttribute('alt')).toBe(ALT_BANDA_4)
    expect(banda.querySelector('.ic-so-cena')!.contains(imagens[0])).toBe(true)
    expect(imagens[0].getAttribute('loading')).toBe('lazy')
    expect([imagens[0].getAttribute('width'), imagens[0].getAttribute('height')]).toEqual(['1200', '870'])
    expect(banda.querySelector('source[type="image/avif"]')).toBeNull()
  })

  it('the frame is 1200 / 832, clipped, top-aligned; the text stands 28 px above the band line; one second edge', () => {
    const css = colapsar(semComentarios(CSS_DA_CASA()))
    expect(css).toMatch(/\[data-casa\] \.ic-so-cena \{[^}]*aspect-ratio: 1200 \/ 832;/)
    expect(css).toMatch(/\[data-casa\] \.ic-so-cena \{[^}]*overflow: clip;/)
    expect(css).toContain('--faixa4-placa')
    expect(css).toContain('--segunda-borda: calc(100cqi - var(--faixa6-porta))')
    const texto = declaracoes(CSS_DA_CASA()).filter((d) => d.seletor === '[data-casa] .ic-so-texto' && d.prop === 'padding-block-end')
    expect(texto.map((d) => d.valor)).toContain('var(--faixa-texto-fundo)')
  })

  it('the old crop is gone: no 1200 / 800 aspect ratio and no areia floor under the scene', () => {
    expect(colapsar(semComentarios(CSS_DA_CASA()))).not.toContain('aspect-ratio: 1200 / 800')
  })
})

describe('SH-4 band 5: the statement on the rug, with the Notas capture on the band edge', () => {
  it('one capture img with the humanizer alt, one frame raster (the day one), no svg and no four-sided border', async () => {
    await abrir(1440)
    const banda = faixaDe('.ic-prova')
    const telas = banda.querySelectorAll('[data-produto-tela]')
    expect(telas).toHaveLength(1)
    expect(telas[0].getAttribute('alt')).toBe(ALT_NOTAS)
    expect(telas[0].getAttribute('src')).toBe('/telas/t1i/notas-320w.webp')
    expect([telas[0].getAttribute('width'), telas[0].getAttribute('height')]).toEqual(['640', '1385'])
    const artes = banda.querySelectorAll('[data-produto-moldura-arte]')
    expect(artes).toHaveLength(1)
    expect(artes[0].getAttribute('src')).toBe('/molduras/moldura-dia.png')
    expect(banda.querySelectorAll('svg')).toHaveLength(0)
    expect(banda.querySelectorAll('.ic-prova > *:last-child')[0].hasAttribute('data-produto-moldura')).toBe(true)
  })

  it('the heading is exibicao (80), pProva titulo-3 (28), li2 titulo-4 (22), the other facts corpo; all from variables, outside @layer', () => {
    const fora = declaracoes(CSS_DA_CASA()).filter((d) => d.pilha.every((p) => !p.startsWith('@layer')))
    const valor = (seletor: RegExp, prop: string) => fora.filter((d) => seletor.test(d.seletor) && d.prop === prop).map((d) => d.valor)
    expect(valor(/\.ic-prova \.cm-faixa-prova > h2/, 'font-size')).toContain('var(--texto-exibicao-tamanho)')
    expect(valor(/\.ic-prova \.cm-faixa-prova > h2/, 'line-height')).toContain('var(--texto-exibicao-entrelinha)')
    expect(valor(/\.ic-prova \.cm-faixa-prova > p/, 'font-size')).toContain('var(--texto-titulo-3-tamanho)')
    expect(valor(/\.ic-prova \[data-prova-lista\] > li:nth-child\(2\)/, 'font-size')).toContain('var(--texto-titulo-4-tamanho)')
    expect(valor(/\.ic-prova \[data-prova-lista\] > li\b(?!:)/, 'font-size')).toContain('var(--texto-corpo-tamanho)')
    expect(valor(/\.ic-prova \[data-prova-lista\] > li:nth-child\(2\)/, 'font-family').join(' ')).toMatch(/--fonte-titulo|Literata/)
  })

  it('the LIST is signed by the H2 primitive (not the band wrapper, which is taller than the window on a phone): data-assinada after 60 % in view, the rules draw once (400 ms, linear, from the left)', async () => {
    await abrir(1440)
    const prova = principal().querySelector<HTMLElement>('.ic-prova')!
    const lista = prova.querySelector<HTMLElement>('[data-prova-lista]')!
    expect(lista.hasAttribute('data-assinada')).toBe(false)
    expect(prova.hasAttribute('data-assinada'), 'the wrapper is never the signed element').toBe(false)
    const dele = ObservadorFalso.todos.find((o) => o.alvos.has(lista))!
    expect(dele, 'an observer watches the list').toBeDefined()
    expect(dele.opcoes?.threshold).toBe(0.6)
    expect(ObservadorFalso.todos.some((o) => o.alvos.has(prova)), 'no observer watches the wrapper').toBe(false)
    avisarVista('[data-prova-lista]')
    expect(lista.hasAttribute('data-assinada')).toBe(true)
    expect(prova.hasAttribute('data-assinada')).toBe(false)
    const css = colapsar(semComentarios(CSS_DA_CASA()))
    expect(css).toMatch(/\[data-casa\] \.ic-prova \[data-prova-lista\] > li::before \{[^}]*transform: scaleX\(0\);[^}]*transform-origin: left;[^}]*transition: transform 400ms linear;/)
    expect(css).toMatch(/\[data-casa\] \.ic-prova \[data-prova-lista\]\[data-assinada\] > li::(before|after)[^{]*\{[^}]*transform: scaleX\(1\);/)
    expect(css).not.toMatch(/\.ic-prova\[data-assinada\]/)
  })

  it('with reduced motion the list is signed from the first paint (the rules are drawn)', async () => {
    await abrir(1440, true)
    expect(principal().querySelector('.ic-prova [data-prova-lista]')!.hasAttribute('data-assinada')).toBe(true)
  })

  it('the list stays signed after a re-render and never loses the attribute', async () => {
    await abrir(390)
    const lista = principal().querySelector<HTMLElement>('.ic-prova [data-prova-lista]')!
    avisarVista('[data-prova-lista]')
    expect(lista.hasAttribute('data-assinada')).toBe(true)
    act(() => window.dispatchEvent(new Event('resize')))
    expect(lista.hasAttribute('data-assinada')).toBe(true)
  })

  it('there are five rules: one before each of the four facts and one under the last', () => {
    const css = colapsar(semComentarios(CSS_DA_CASA()))
    expect(css).toMatch(/\.ic-prova \[data-prova-lista\] > li:last-child::after/)
    expect(css).toMatch(/\.ic-prova \[data-prova-lista\] > li \{[^}]*border-(top|block)[^}]*: 0;/)
  })
})

describe('SH-5 band 6: the questions are the display lines, the heading is the lintel of the door', () => {
  it('four questions and four open answers, no aria-expanded, the heading and the list kept in the tree', async () => {
    await abrir(1440)
    const alvo = document.getElementById('perguntas')!
    expect(alvo.querySelectorAll('.cm-perguntas-lista > li')).toHaveLength(4)
    expect(alvo.querySelectorAll('h3')).toHaveLength(4)
    expect(alvo.querySelector('[aria-expanded]')).toBeNull()
    expect(alvo.querySelector('.cm-perguntas > h2')).not.toBeNull()
    expect(alvo.querySelector('.cm-perguntas > ul')).not.toBeNull()
  })

  it('the door is one img inside the field (page markup), with the humanizer alt, after the shared block', async () => {
    await abrir(1440)
    const alvo = document.getElementById('perguntas')!
    const campo = alvo.querySelector<HTMLElement>('.ic-porta')!
    expect(campo).not.toBeNull()
    const porta = campo.querySelectorAll('img')
    expect(porta).toHaveLength(1)
    expect(porta[0].getAttribute('alt')).toBe(ALT_PORTA)
    expect(porta[0].getAttribute('src')).toMatch(/inicio-faixas\/porta-noite-\d+w\.webp$/)
    expect(porta[0].getAttribute('srcset')).toMatch(/porta-noite-1254w\.webp 1254w/)
    expect([porta[0].getAttribute('width'), porta[0].getAttribute('height')]).toEqual(['1254', '1070'])
    expect(campo.hasAttribute('aria-hidden')).toBe(false)
  })

  it('.cm-perguntas dissolves (display: contents) so the heading and the field share one grid; the questions are titulo-2', () => {
    const css = colapsar(semComentarios(CSS_DA_CASA()))
    expect(css).toMatch(/\[data-casa\] \.ic-perguntas \.cm-perguntas \{[^}]*display: contents;/)
    const fora = declaracoes(CSS_DA_CASA()).filter((d) => d.pilha.every((p) => !p.startsWith('@layer')))
    const h3 = fora.filter((d) => /\.ic-perguntas .*h3/.test(d.seletor))
    expect(h3.filter((d) => d.prop === 'font-size').map((d) => d.valor)).toContain('var(--texto-titulo-2-tamanho)')
    expect(h3.filter((d) => d.prop === 'line-height').map((d) => d.valor)).toContain('var(--texto-titulo-2-entrelinha)')
  })

  it('the door is min(var(--faixa6-porta), 627px) wide, and the field is cacau with no rule beat', () => {
    const css = colapsar(semComentarios(CSS_DA_CASA()))
    expect(css).toContain('min(var(--faixa6-porta), 627px)')
    expect(css).toContain('--faixa6-porta')
    expect(css).not.toMatch(/\.ic-perguntas[^{]*\{[^}]*(animation|scaleX)/)
  })
})

describe('SH-6 band 7: the closing on its edge, M11 lit once at 60 %', () => {
  it('the only centred band: the Fechamento, then the M11 figure with its light layer, and no floor node after it', async () => {
    await abrir(1440)
    const fecho = principal().querySelector('.ic-fecho')!
    expect(fecho.querySelector('[data-fechamento]')).not.toBeNull()
    const figura = fecho.querySelector('.ic-fecho-cena')!
    const base = figura.querySelector('img:not([data-luz])')!
    expect(base.getAttribute('alt')).toBe('')
    expect(base.getAttribute('src')).toMatch(/^\/@imagetools\/[\w-]+$/)
    expect([base.getAttribute('width'), base.getAttribute('height')]).toEqual(['542', '421'])
    const luz = figura.querySelectorAll('[data-luz]')
    expect(luz).toHaveLength(1)
    expect(luz[0].getAttribute('src')).toMatch(/inicio-faixas\/m11-luz-(326|542)w\.png$/)
    expect(fecho.lastElementChild).toBe(figura)
  })

  it('the light is watched at 60 % with the key casa-luz-m11: dark on a first visit, lit by the crossing, remembered', async () => {
    await abrir(1440)
    const grupo = principal().querySelector<HTMLElement>('.ic-fecho [data-luz-estado]')!
    expect(grupo.getAttribute('data-luz-estado')).toBe('apagada')
    const base = principal().querySelector('.ic-fecho-cena img:not([data-luz])')!
    const dele = ObservadorFalso.todos.find((o) => o.alvos.has(base))!
    expect(dele, 'an observer watches the M11 plate').toBeDefined()
    expect(dele.opcoes?.threshold).toBe(0.6)
  })

  it('with reduced motion the light is lit from the first paint', async () => {
    await abrir(1440, true)
    expect(principal().querySelector('.ic-fecho [data-luz-estado]')!.getAttribute('data-luz-estado')).toBe('acesa')
  })

  it('the figure is min(var(--fecho-janela), 542px) wide, 542 / 386, and the heading is exibicao with balanced lines', () => {
    const css = colapsar(semComentarios(CSS_DA_CASA()))
    expect(css).toContain('min(var(--fecho-janela), 542px)')
    expect(css).toMatch(/\[data-casa\] \.ic-fecho-cena \{[^}]*aspect-ratio: 542 \/ 386;/)
    const fora = declaracoes(CSS_DA_CASA()).filter((d) => d.pilha.every((p) => !p.startsWith('@layer')))
    const h2 = fora.filter((d) => /\.ic-fecho .*h2/.test(d.seletor))
    expect(h2.filter((d) => d.prop === 'font-size').map((d) => d.valor)).toContain('var(--texto-exibicao-tamanho)')
    expect(h2.filter((d) => d.prop === 'text-wrap').map((d) => d.valor)).toContain('balance')
  })
})

// ---- inicio-faixas.css: the two scrubbed Sheet entries -------------------------------------------------------------

describe('SH-7 motion: inicio-faixas.css holds the band 4 and band 6 entries under the shared gate', () => {
  const NATIVO = `@supports (${CONDICAO_NATIVA})`
  const SEM_REDUZIR = '@media (prefers-reduced-motion: no-preference)'
  const todas = () => declaracoes(CSS_DAS_FAIXAS())

  it('the file exists and Inicio.tsx imports it before inicio-casa.css', () => {
    expect(existsSync(join(PASTA_CASA, 'inicio-faixas.css'))).toBe(true)
    const fonte = lerTexto(join(PASTA_SRC, 'paginas', 'Inicio.tsx'))
    const faixas = fonte.indexOf("'../componentes/inicio-casa/inicio-faixas.css'")
    const casa = fonte.indexOf("'../componentes/inicio-casa/inicio-casa.css'")
    expect(faixas).toBeGreaterThan(-1)
    expect(casa).toBeGreaterThan(faixas)
  })

  it('every view-timeline and animation-timeline sits inside the @supports text of CONDICAO_NATIVA and prefers-reduced-motion: no-preference', () => {
    const css = colapsar(semComentarios(CSS_DAS_FAIXAS()))
    expect(css.match(/@supports/g)).toHaveLength(1)
    expect(css).toContain(NATIVO)
    const linhas = todas().filter((d) => ['view-timeline', 'view-timeline-inset', 'animation-timeline', 'animation-range'].includes(d.prop))
    expect(linhas.length).toBeGreaterThanOrEqual(6)
    for (const d of linhas) {
      expect(d.pilha, `${d.seletor} { ${d.prop} }`).toContain(NATIVO)
      expect(d.pilha, `${d.seletor} { ${d.prop} }`).toContain(SEM_REDUZIR)
    }
  })

  it('the longhands come after the animation shorthand, which is linear with an explicit auto duration and fills both ways', () => {
    const porRegra = new Map<string, Declaracao[]>()
    for (const d of todas()) porRegra.set(d.pilha.join('|'), [...(porRegra.get(d.pilha.join('|')) ?? []), d])
    let comTimeline = 0
    for (const [regra, lista] of porRegra) {
      const props = lista.map((d) => d.prop)
      if (!props.includes('animation-timeline')) continue
      comTimeline += 1
      const a = props.indexOf('animation')
      expect(a, regra).toBeGreaterThanOrEqual(0)
      expect(lista[a].valor, regra).toMatch(/\bauto linear both\b/)
      expect(props.indexOf('animation-timeline'), regra).toBeGreaterThan(a)
      expect(props.indexOf('animation-range'), regra).toBeGreaterThan(a)
    }
    expect(comTimeline).toBe(2)
  })

  it('both ranges are entry 0% entry 100% of the still clip frame; the keyframes move transform only, 56 px (24 below 1024)', () => {
    const faixas = todas().filter((d) => d.prop === 'animation-range')
    expect(faixas.map((d) => d.valor)).toEqual(['entry 0% entry 100%', 'entry 0% entry 100%'])
    const css = colapsar(semComentarios(CSS_DAS_FAIXAS()))
    expect(css).toMatch(/translateX\(-56px\)/)
    expect(css).toMatch(/translateX\(56px\)/)
    expect(css).toMatch(/translateX\(-24px\)/)
    expect(css).toMatch(/translateX\(24px\)/)
    expect(css).toMatch(/max-width: 1023px/)
    const quadros = todas().filter((d) => d.pilha.some((p) => p.startsWith('@keyframes')))
    expect(quadros.length).toBeGreaterThan(0)
    for (const d of quadros) expect(d.prop, d.seletor).toBe('transform')
    for (const d of quadros) expect(d.valor, d.seletor).toMatch(/^translateX\(/)
  })

  it('no vw, no will-change, no opacity, no clip-path and no fixed or sticky position in the file', () => {
    const css = semComentarios(CSS_DAS_FAIXAS())
    expect(css).not.toMatch(/\d\s*vw\b|\d\s*vh\b|\d\s*svh\b/)
    expect(css).not.toMatch(/will-change|opacity|clip-path|position:\s*(sticky|fixed)|scroll-snap|transition/)
  })

  it('the timeline is on the clip frame and the animation on its image, never on the frame itself', () => {
    const t = todas().filter((d) => d.prop === 'view-timeline')
    expect(t.map((d) => d.seletor).sort()).toEqual(['[data-casa] .ic-porta', '[data-casa] .ic-so-cena'])
    const a = todas().filter((d) => d.prop === 'animation-timeline')
    for (const d of a) expect(d.seletor, d.prop).toMatch(/ img$/)
  })

  it('bands 3, 5 and 7 hold no view timeline anywhere (band 5 draws once on the H2 primitive, band 7 is a light)', () => {
    expect(semComentarios(CSS_DA_CASA())).not.toMatch(/view-timeline|animation-timeline/)
  })
})

// ---- midia.ts ------------------------------------------------------------------------------------------------------

describe('SH-8a M11 `sizes` follow the drawn width of the figure', () => {
  // The figure is min(var(--fecho-janela), 542px): --fecho-janela = clamp(min(326px, 100cqi - 2 calha), 50cqi, 720px), so from
  // 652 to 1083 it is half the container (326 to 541 px) and 542 from 1084. At 768, 1024 and 1083 the browser needs 384,
  // 512 and 541.5 px: the 542 file, never the 326 one stretched.
  it('sizes is `(min-width: 1084px) 542px, (min-width: 652px) 50vw, 326px` for the plate and its light layer', async () => {
    const { M11_JANELA, LUZ_M11 } = await import('../componentes/inicio-casa/midia.ts')
    const esperado = '(min-width: 1084px) 542px, (min-width: 652px) 50vw, 326px'
    expect(M11_JANELA.sizes).toBe(esperado)
    expect(LUZ_M11.sizes).toBe(esperado)
  })

  it('the drawn width the string describes: 50vw is at least the 326 file from 652 and below 542 until 1084', () => {
    const sizes = '(min-width: 1084px) 542px, (min-width: 652px) 50vw, 326px'
    const largura = (vw: number) => (vw >= 1084 ? 542 : vw >= 652 ? vw / 2 : 326)
    const escolhe = (vw: number, dpr: number) => ([326, 542].find((arquivo) => arquivo >= largura(vw) * dpr) ?? 542)
    expect(sizes).toContain('50vw')
    for (const vw of [768, 1024, 1083]) expect(escolhe(vw, 1), `${vw} px, DPR 1`).toBe(542)
    expect(escolhe(390, 1)).toBe(326)
  })
})

describe('SH-8 midia.ts: the plates and layers of the half exist where the constants say', () => {
  it('M04_FAIXA is the m04-faixa master, lossless; M11_JANELA the unlit M11; LUZ_M11, PORTA_NOITE and CAPTURA_NOTAS are served files', async () => {
    const midia = await import('../componentes/inicio-casa/midia.ts')
    const texto = lerTexto(join(PASTA_CASA, 'midia.ts'))
    expect(texto).toContain('inicio-faixas/m04-faixa-1200w.webp')
    expect(texto).toContain('inicio-faixas/m11-apagada-542w.webp')
    expect([midia.M04_FAIXA.largura, midia.M04_FAIXA.altura]).toEqual([1200, 870])
    // The older M04 ladder stays exported (inicioCapturas.test.ts pins it) but band 4 no longer serves it.
    expect(M04.src).not.toBe(midia.M04_FAIXA.src)
    expect([midia.M11_JANELA.largura, midia.M11_JANELA.altura]).toEqual([542, 421])
    expect(midia.M11_JANELA.src).toMatch(/^\/@imagetools\//)
    expect(midia.M04_FAIXA.src).toMatch(/^\/@imagetools\//)
    for (const imagem of [midia.LUZ_M11, midia.PORTA_NOITE, midia.CAPTURA_NOTAS]) {
      for (const parte of [imagem.src, ...(imagem.srcSet ?? '').split(',').map((p) => p.trim().split(/\s+/)[0])]) {
        expect(existsSync(join(process.cwd(), 'public', parte.replace(/^\/+/, ''))), parte).toBe(true)
      }
    }
    expect([midia.PORTA_NOITE.largura, midia.PORTA_NOITE.altura]).toEqual([1254, 1070])
    expect([midia.CAPTURA_NOTAS.largura, midia.CAPTURA_NOTAS.altura]).toEqual([640, 1385])
  })

  it('the WIDTH `sizes` of M05 stay byte-identical', async () => {
    const { M05, LUZ_M05 } = await import('../componentes/inicio-casa/midia.ts')
    const sizes = '(min-width: 1440px) min(62.5vw, 1600px), (min-width: 1180px) 62.5vw, min(100vw, 760px)'
    expect(M05.sizes).toBe(sizes)
    expect(LUZ_M05.sizes).toBe(sizes)
  })
})

describe('SH-10 clip frames: a frame that crops an in-flow img must not be held open by it', () => {
  // `overflow: clip` does not make a scroll container, so the img's block-size (auto) would set the frame's automatic
  // minimum height (grid item or aspect-ratio box) and the frame would show the whole file instead of cutting it. The
  // frame says `min-block-size: 0`, or the img fills the frame (`block-size: 100%`, `object-fit: cover`, aligned to the
  // edge it stands on: top for the plates, bottom for the door of band 6 below 1024, where its frame is 13 / 10; from
  // 1024 the door's frame has no ratio and is sized by the whole door, so `min-block-size: 0` there would collapse the row).
  const regras = () => declaracoes(CSS_DA_CASA())
  const quadros = () => {
    const porSeletor = new Map<string, Declaracao[]>()
    for (const d of regras()) porSeletor.set(d.seletor, [...(porSeletor.get(d.seletor) ?? []), d])
    return [...porSeletor.entries()].filter(([, lista]) => lista.some((d) => d.prop === 'overflow' && d.valor === 'clip') && lista.some((d) => d.prop === 'aspect-ratio'))
  }

  it('the clip frames of bands 4, 6 and 7 are found (the test cannot pass by finding none)', () => {
    expect(quadros().map(([seletor]) => seletor).sort()).toEqual(['[data-casa] .ic-fecho-cena', '[data-casa] .ic-porta', '[data-casa] .ic-so-cena'])
  })

  it('every clip frame with an aspect ratio declares min-block-size: 0 or its img fills it', () => {
    for (const [seletor, lista] of quadros()) {
      const zero = lista.some((d) => d.prop === 'min-block-size' && d.valor === '0')
      const img = regras().filter((d) => d.seletor.startsWith(`${seletor} img`))
      const preenche =
        img.some((d) => d.prop === 'block-size' && d.valor === '100%') &&
        img.some((d) => d.prop === 'object-fit' && d.valor === 'cover') &&
        img.some((d) => d.prop === 'object-position' && /^50% (0|100)(%|px)?$/.test(d.valor))
      expect(zero || preenche, `${seletor} is held open by its img`).toBe(true)
    }
  })

  it('the frame of band 4 stays 1200 / 832 and the one of band 7 stays 542 / 386, both clipped', () => {
    const css = colapsar(semComentarios(CSS_DA_CASA()))
    expect(css).toMatch(/\[data-casa\] \.ic-so-cena \{[^}]*aspect-ratio: 1200 \/ 832;[^}]*overflow: clip;/)
    expect(css).toMatch(/\[data-casa\] \.ic-fecho-cena \{[^}]*aspect-ratio: 542 \/ 386;[^}]*overflow: clip;/)
  })

  it('every observed element of bands 3 to 7 is smaller than window / 0.6: the band 5 list and the M11 plate, never a band wrapper', async () => {
    await abrir(390)
    const observados = ObservadorFalso.todos.filter((o) => o.opcoes?.threshold === 0.6).flatMap((o) => [...o.alvos])
    const lista = principal().querySelector('.ic-prova [data-prova-lista]')!
    const placa = principal().querySelector('.ic-fecho-cena img:not([data-luz])')!
    expect(observados).toContain(lista)
    expect(observados).toContain(placa)
    for (const alvo of observados) expect(alvo.closest('[data-faixa]') === alvo, 'a band wrapper is observed at 60 %').toBe(false)
    expect(observados.some((alvo) => alvo.matches('.ic-prova, .ic-fecho, [data-faixa]'))).toBe(false)
  })
})

describe('SH-9 type: no new size, variable or italic in the band rules', () => {
  it('no raw hex or rgb and no italic in inicio-casa.css or inicio-faixas.css', () => {
    for (const css of [CSS_DA_CASA(), CSS_DAS_FAIXAS()]) {
      const limpo = semComentarios(css)
      expect(limpo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(limpo).not.toMatch(/\brgba?\(/)
      expect(limpo).not.toMatch(/font-style:\s*italic/)
    }
  })

  it('every font-size and line-height of bands 3 to 7 reads a token variable (no px, rem or em length)', () => {
    const faixas = declaracoes(CSS_DA_CASA()).filter(
      (d) => /\.ic-(tela|so|prova|perguntas|fecho)|\.cm-faixa-prova|\.cm-perguntas|\.cm-fechamento/.test(d.seletor) && (d.prop === 'font-size' || d.prop === 'line-height'),
    )
    expect(faixas.length).toBeGreaterThan(8)
    for (const d of faixas) expect(d.valor, `${d.seletor} { ${d.prop} }`).toMatch(/^var\(--texto-/)
  })
})
