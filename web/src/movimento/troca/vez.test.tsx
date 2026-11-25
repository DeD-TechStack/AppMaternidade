import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INI } from '../../conteudo/inicio.ts'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { CATALOGO } from '../catalogo.ts'
import { CONDICAO_NATIVA } from './usarPalco.ts'

// STAGE (card t_4401a4f4): the marker ("a faixa da vez"), the night twin of the action row, the pin as one CSS rule, the
// one-attribute hand-off of the caption and the lamp, and the CSS-text contracts of troca.css (ARQUITETURA_STAGE §7.1,
// U2 to U4 and U6 to U10, plus the property-owner and Motion-surface tests of the card). jsdom has no layout and no
// scroll-driven animation, so the CSS is read as text and the page as DOM; the browser numbers are the probes' job.

const PASTA_SRC = join(process.cwd(), 'src')
const TROCA = join(PASTA_SRC, 'movimento', 'troca')
const lerTexto = (caminho: string) => readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')
const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const colapsar = (texto: string) => texto.replace(/\s+/g, ' ').trim()
const CSS_DA_TROCA = () => lerTexto(join(TROCA, 'troca.css'))
const CSS_DA_CASA = () => lerTexto(join(PASTA_SRC, 'componentes', 'inicio-casa', 'inicio-casa.css'))

interface Declaracao {
  prop: string
  valor: string
  seletor: string
  pilha: string[]
}

/** Every declaration of a stylesheet with its rule's selector and the at-rule preludes around it (no nesting in this sheet). */
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

// ---- U2: the catalogue ----------------------------------------------------------------------------------------------

describe('U2 catalogue M16: the pin as one rule, two stops, the marker steps, one measured height gate', () => {
  const m16 = CATALOGO.M16
  it('holds pino, paradas (exactly repousoAte and fimDe), vez, vezEmpilhada and alturaMinimaPx, and no table by width', () => {
    expect(m16.pino).toEqual({ minPx: 600, svh: 80, maxPx: 900 })
    expect(Object.keys(m16.paradas).sort()).toEqual(['fimDe', 'repousoAte'])
    expect(m16.paradas).toEqual({ repousoAte: 0.1, fimDe: 0.7 })
    expect(m16.vez).toEqual({ de: 0.485, ate: 0.515 })
    expect(m16.vezEmpilhada).toEqual({ de: 0.45, ate: 0.55 })
    expect(m16.janelaPx).toBe(720)
    expect('janelaPxPorLargura' in m16).toBe(false)
    expect('centroDe' in m16.paradas).toBe(false)
  })

  it('alturaMinimaPx is the measured height of a 240 px phone (728), read by usePalcoFixo', () => {
    expect(m16.alturaMinimaPx).toBeGreaterThanOrEqual(720)
    expect(m16.alturaMinimaPx).toBeLessThanOrEqual(760)
  })
})

// ---- U3 / U4: the CSS text of troca.css -----------------------------------------------------------------------------

describe('U3 troca.css: the pin, the gate text, the order of the declarations, the ranges', () => {
  const todas = () => declaracoes(CSS_DA_TROCA())
  const NATIVO = `@supports (${CONDICAO_NATIVA})`
  const SEM_REDUZIR = '@media (prefers-reduced-motion: no-preference)'

  it('--palco-pino is clamp(minPx, svh, maxPx) of the catalogue and the track reads it as --troca-d (one declaration site)', () => {
    const { minPx, svh, maxPx } = CATALOGO.M16.pino
    const pino = todas().filter((d) => d.prop === '--palco-pino')
    expect(pino).toHaveLength(1)
    expect(pino[0].valor).toBe(`clamp(${minPx}px, ${svh}svh, ${maxPx}px)`)
    const d = todas().filter((x) => x.prop === '--troca-d')
    expect(d).toHaveLength(1)
    expect(d[0].valor).toBe('var(--palco-pino)')
    expect(d[0].seletor).toBe('[data-casa] [data-faixa]:has(.ic-estagio[data-troca-fixo])')
  })

  it('the @supports text is CONDICAO_NATIVA, and every timeline declaration sits inside it and inside prefers-reduced-motion: no-preference', () => {
    expect(CONDICAO_NATIVA).toBe('(animation-timeline: view()) and (animation-range: entry)')
    const css = colapsar(semComentarios(CSS_DA_TROCA()))
    expect(css.match(/@supports/g)).toHaveLength(1)
    expect(css).toContain(NATIVO)
    const linhas = todas().filter((d) => ['view-timeline', 'view-timeline-inset', 'animation-timeline', 'animation-range'].includes(d.prop))
    expect(linhas.length).toBeGreaterThanOrEqual(8)
    for (const d of linhas) {
      expect(d.pilha, `${d.seletor} { ${d.prop} }`).toContain(NATIVO)
      expect(d.pilha, `${d.seletor} { ${d.prop} }`).toContain(SEM_REDUZIR)
    }
  })

  it('in every rule animation-timeline and animation-range come after the animation shorthand, which carries an explicit auto duration', () => {
    const porRegra = new Map<string, Declaracao[]>()
    for (const d of todas()) porRegra.set(`${d.pilha.join('|')}`, [...(porRegra.get(`${d.pilha.join('|')}`) ?? []), d])
    let comTimeline = 0
    for (const [regra, lista] of porRegra) {
      const props = lista.map((d) => d.prop)
      if (!props.includes('animation-timeline')) continue
      comTimeline += 1
      const a = props.indexOf('animation')
      expect(a, regra).toBeGreaterThanOrEqual(0)
      expect(lista[a].valor, regra).toMatch(/\bauto\b/)
      expect(props.indexOf('animation-timeline'), regra).toBeGreaterThan(a)
      expect(props.indexOf('animation-range'), regra).toBeGreaterThan(a)
    }
    expect(comTimeline).toBe(4)
  })

  it('the ranges are the catalogue: the sheet 10 % to 70 %, the marker 48.5 % to 51.5 %, the stacked marker 45 % to 55 %', () => {
    const { paradas, vez, vezEmpilhada } = CATALOGO.M16
    const pc = (n: number) => `${Number((n * 100).toFixed(3))}%`
    const faixaPino = `contain ${pc(paradas.repousoAte)} contain ${pc(paradas.fimDe)}`
    const faixaVez = `contain ${pc(vez.de)} contain ${pc(vez.ate)}`
    const faixaEmpilhada = `contain ${pc(vezEmpilhada.de)} contain ${pc(vezEmpilhada.ate)}`
    expect(faixaPino).toBe('contain 10% contain 70%')
    expect(faixaVez).toBe('contain 48.5% contain 51.5%')
    expect(faixaEmpilhada).toBe('contain 45% contain 55%')
    const faixas = todas().filter((d) => d.prop === 'animation-range')
    expect(faixas.map((d) => d.valor).sort()).toEqual([faixaPino, faixaPino, faixaVez, faixaEmpilhada].sort())
    // The sheet's two boxes and the pinned marker read the SAME timeline (--palco); only the stacked marker reads --vez.
    const linhasDeTimeline = todas().filter((d) => d.prop === 'animation-timeline')
    expect(linhasDeTimeline.map((d) => d.valor).sort()).toEqual(['--palco', '--palco', '--palco', '--vez'])
  })

  it('the view timeline of the pin is --palco with the exact inset: contain 0 % is the sticky top, contain 100 % the release', () => {
    const t = todas().filter((d) => d.prop === 'view-timeline')
    expect(t.map((d) => d.valor)).toEqual(['--palco block', '--vez block'])
    const inset = todas().filter((d) => d.prop === 'view-timeline-inset')
    expect(inset).toHaveLength(2)
    expect(inset[0].valor).toBe('var(--palco-topo) calc(100% - var(--palco-topo) - var(--palco-alto))')
    // The stacked marker's timeline has no inset: `auto` would take the page's scroll-padding-top (the header, 104 px).
    expect(inset[1].valor).toBe('0')
    expect(inset[1].seletor).toContain('[data-vez-caixa]')
  })
})

describe('U4 troca.css: only transform and translate move, no stacking context between the marker and the frame, the sheet never takes the press', () => {
  const todas = () => declaracoes(CSS_DA_TROCA())

  it('the keyframes ic-folha, ic-folha-interior and ic-vez animate only transform and translate', () => {
    const quadros = todas().filter((d) => d.pilha.some((p) => /^@keyframes ic-(folha|folha-interior|vez)$/.test(p)))
    expect(new Set(quadros.map((d) => d.pilha.find((p) => p.startsWith('@keyframes'))))).toEqual(
      new Set(['@keyframes ic-folha', '@keyframes ic-folha-interior', '@keyframes ic-vez']),
    )
    for (const d of quadros) expect(['transform', 'translate'], `${d.pilha.join(' > ')}: ${d.prop}`).toContain(d.prop)
  })

  it('has no vw anywhere (100vw and 100cqi differ with a classic scrollbar)', () => {
    expect(semComentarios(CSS_DA_TROCA())).not.toMatch(/\d\s*vw\b/)
  })

  it('the overlay box and the screen hole create no stacking context: no will-change, opacity, filter, isolation, transform, translate or z-index but auto', () => {
    const proibidas = ['will-change', 'opacity', 'filter', 'isolation', 'transform', 'translate', 'backdrop-filter', 'mix-blend-mode', 'contain']
    const regras = todas().filter((d) => /\[data-vez-caixa\]|\[data-vez-tela\]/.test(d.seletor) && !/\[data-vez-caixa\]\s+\[data-vez\]/.test(d.seletor))
    expect(regras.length).toBeGreaterThan(0)
    for (const d of regras) {
      expect(proibidas, `${d.seletor} { ${d.prop} }`).not.toContain(d.prop)
      if (d.prop === 'z-index') expect(d.valor, d.seletor).toBe('auto')
    }
    // The marker itself has no will-change either (a scroll-driven animation is promoted while it runs).
    expect(todas().filter((d) => d.seletor.endsWith('[data-vez]') && d.prop === 'will-change')).toEqual([])
  })

  it('--vez-passo is 0.1875 of the screen (120 of 640 raster px) and --vez-linha the 17:30 rule (1879 of 640)', () => {
    const passo = todas().filter((d) => d.prop === '--vez-passo')
    const linha = todas().filter((d) => d.prop === '--vez-linha')
    expect(passo).toHaveLength(1)
    expect(passo[0].valor).toBe('calc(var(--produto-tela) * 120 / 640)')
    expect(linha).toHaveLength(1)
    expect(linha[0].valor).toBe('calc(var(--produto-tela) * 1879 / 640)')
    expect(passo[0].seletor).toBe('[data-casa] [data-vez-tela]')
  })

  it('.ic-folha takes no pointer events (the press reaches the real button), and forced-colors hides the marker', () => {
    const folha = todas().filter((d) => d.seletor === '[data-casa] .ic-folha' && d.prop === 'pointer-events')
    expect(folha.map((d) => d.valor)).toEqual(['none'])
    const forcadas = todas().filter((d) => d.pilha.includes('@media (forced-colors: active)') && d.seletor.includes('[data-vez]'))
    expect(forcadas.map((d) => `${d.prop}: ${d.valor}`)).toEqual(['display: none'])
  })

  it('the track has no overflow (a scroll container between the stage and the root would capture sticky and the timeline)', () => {
    const trilha = todas().filter((d) => d.seletor.includes('[data-faixa]') && d.prop.startsWith('overflow'))
    expect(trilha).toEqual([])
  })

  it('the marker rides the capture pan with its own transform and steps with its own translate', () => {
    const marcador = todas().filter((d) => d.seletor === '[data-casa] [data-vez]' && d.pilha.length === 2)
    const props = Object.fromEntries(marcador.map((d) => [d.prop, d.valor]))
    expect(props['mix-blend-mode']).toBe('multiply')
    expect(props['z-index']).toBe('1')
    expect(props.transform).toBe('translateY(calc(-1 * var(--produto-rolagem)))')
    expect(props.transition).toBe('transform 400ms var(--curva-padrao)')
    const reduzido = todas().filter((d) => d.pilha.includes('@media (prefers-reduced-motion: reduce)') && d.seletor.includes('[data-vez]'))
    expect(reduzido.map((d) => `${d.prop}: ${d.valor}`)).toEqual(['transition: none'])
  })
})

describe('property owners and the Motion surface of the Início', () => {
  it('inicio-casa.css declares neither --palco-pino nor --vez-passo (one declaration site each, in troca.css)', () => {
    const casa = declaracoes(CSS_DA_CASA())
    expect(casa.filter((d) => d.prop === '--palco-pino' || d.prop === '--vez-passo' || d.prop === '--vez-linha')).toEqual([])
    expect(casa.filter((d) => d.prop === '--troca-d')).toEqual([])
    expect(declaracoes(CSS_DA_TROCA()).filter((d) => d.prop === '--vez-passo')).toHaveLength(1)
  })

  it('the only motion/react imports under inicio-casa/** and movimento/troca/** are useScroll, useTransform and useMotionValue', () => {
    const arquivos = (pasta: string): string[] =>
      readdirSync(pasta).flatMap((nome) => {
        const caminho = join(pasta, nome)
        if (statSync(caminho).isDirectory()) return arquivos(caminho)
        return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
      })
    const pastas = [join(PASTA_SRC, 'componentes', 'inicio-casa'), TROCA]
    const permitidos = new Set(['useScroll', 'useTransform', 'useMotionValue'])
    const achados: string[] = []
    for (const arquivo of pastas.flatMap(arquivos)) {
      for (const m of lerTexto(arquivo).matchAll(/import\s+([^;]*?)\s+from\s+['"](motion(?:\/[\w-]+)?)['"]/g)) {
        const nomes = [...m[1].matchAll(/[\w$]+/g)].map((n) => n[0]).filter((n) => n !== 'type')
        for (const nome of nomes) if (m[2] !== 'motion/react' || !permitidos.has(nome)) achados.push(`${arquivo}: ${nome} from ${m[2]}`)
      }
    }
    expect(achados).toEqual([])
  })
})

// ---- the page, in jsdom ---------------------------------------------------------------------------------------------

const LARGURA_ORIGINAL = window.innerWidth
const ALTURA_ORIGINAL = window.innerHeight
const MATCHMEDIA_ORIGINAL = window.matchMedia
const principal = () => document.querySelector<HTMLElement>('main')!

if (!document.scrollingElement) {
  Object.defineProperty(document, 'scrollingElement', { configurable: true, get: () => document.documentElement })
}

class ObservadorFalso {
  static todos: Array<{ alvos: Set<Element>; opcoes: IntersectionObserverInit | undefined }> = []
  alvos = new Set<Element>()
  constructor(_chamada: IntersectionObserverCallback, opcoes?: IntersectionObserverInit) {
    ObservadorFalso.todos.push({ alvos: this.alvos, opcoes })
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

/** A window of the given size whose matchMedia answers width, aspect ratio, height and prefers-reduced-motion. */
function fixarJanela({ largura, altura = 900, reduzido = false }: { largura: number; altura?: number; reduzido?: boolean }) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: altura })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (consulta: string) => {
      const numero = /(\d+(?:\.\d+)?)(px|rem|em)/.exec(consulta)
      const px = numero ? Number(numero[1]) * (numero[2] === 'px' ? 1 : 16) : Number.NaN
      let matches = false
      if (/prefers-reduced-motion/.test(consulta)) matches = reduzido
      else if (/min-width/.test(consulta)) matches = largura >= px && (!/min-aspect-ratio/.test(consulta) || largura >= altura)
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

async function abrir(opcoes: { largura: number; altura?: number; reduzido?: boolean }) {
  fixarJanela(opcoes)
  const resultado = renderizarRota('/', { sessao: null })
  await aguardarCarga()
  return resultado
}

// The track stands at TOPO_DA_FAIXA in the document, ALTURA_DA_FAIXA tall, over a stage ALTURA_DO_PALCO tall: D is the
// difference (720, the 1440 x 900 pin), measured from the two rects the way the driver measures it.
const TOPO_DA_FAIXA = 2000
const ALTURA_DA_FAIXA = 1500
const ALTURA_DO_PALCO = 780
let rolagem = 0

const faixaDaNoite = () => principal().querySelector<HTMLElement>("[data-faixa][aria-labelledby='ic-noite']")!
const palco = () => principal().querySelector<HTMLElement>('.ic-estagio')!

async function modelar(altura = 900) {
  rolagem = 0
  Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, get: () => rolagem })
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: altura })
  const faixa = faixaDaNoite()
  Object.defineProperty(faixa, 'offsetTop', { configurable: true, value: TOPO_DA_FAIXA })
  Object.defineProperty(faixa, 'clientHeight', { configurable: true, value: ALTURA_DA_FAIXA })
  const retangulo = (top: number, height: number) =>
    ({ top, bottom: top + height, left: 0, right: 1440, width: 1440, height, x: 0, y: top, toJSON: () => ({}) }) as DOMRect
  palco().getBoundingClientRect = () => retangulo(24, ALTURA_DO_PALCO)
  faixa.getBoundingClientRect = () => retangulo(TOPO_DA_FAIXA - rolagem, ALTURA_DA_FAIXA)
  Object.defineProperty(palco(), 'clientWidth', { configurable: true, value: 1440 })
  Object.defineProperty(principal().querySelector('.ic-medida')!, 'offsetLeft', { configurable: true, value: 553 })
  palco().style.top = '24px'
  await act(async () => {
    window.dispatchEvent(new Event('resize'))
  })
}

/** Scrolls so that the pin is at p (the track top is at the sticky top 24 less p x D). */
async function irParaP(p: number, esperaMs = 60) {
  const distancia = ALTURA_DA_FAIXA - ALTURA_DO_PALCO
  rolagem = TOPO_DA_FAIXA - (24 - p * distancia)
  await act(async () => {
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolver) => setTimeout(resolver, esperaMs))
  })
}

const textoDaLegenda = () => colapsar(principal().querySelector('[data-troca-legenda]')?.textContent ?? '')

beforeEach(() => {
  ObservadorFalso.todos = []
  vi.stubGlobal('IntersectionObserver', ObservadorFalso)
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document.documentElement, 'scrollTop')
  Reflect.deleteProperty(document.documentElement, 'clientHeight')
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: LARGURA_ORIGINAL })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: ALTURA_ORIGINAL })
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: MATCHMEDIA_ORIGINAL })
})

describe('U6 markup at 1440 x 900: two markers, the overlay after the day frame, the twin row inside the night frame, one button', () => {
  it('has exactly two [data-vez] in the stage, one in the overlay and one in the twin', async () => {
    await abrir({ largura: 1440 })
    expect(palco().querySelectorAll('[data-vez]')).toHaveLength(2)
    expect(palco().querySelectorAll('[data-vez-caixa] [data-vez-tela] [data-vez]')).toHaveLength(1)
    expect(palco().querySelectorAll('.ic-gemea [data-vez-tela] [data-vez]')).toHaveLength(1)
  })

  it('the overlay [data-vez-caixa] follows the day figure[data-produto-moldura] and precedes [data-troca-noite]; it is a .cm-produto-moldura', async () => {
    await abrirJanelaPronta()
    const caixa = palco().querySelector<HTMLElement>('[data-vez-caixa]')!
    expect(caixa.classList.contains('cm-produto-moldura')).toBe(true)
    const dia = palco().querySelector<HTMLElement>('figure[data-produto-moldura]')!
    const folha = palco().querySelector<HTMLElement>('[data-troca-noite]')!
    expect(dia.nextElementSibling).toBe(caixa)
    expect(caixa.nextElementSibling).toBe(folha)
  })

  it('in .ic-gemea the order is: capture, [data-vez-tela], raster, twin row', async () => {
    await abrirJanelaPronta()
    const gemea = palco().querySelector<HTMLElement>('.ic-gemea')!
    const ordem = [...gemea.children].map((no) => {
      if (no.hasAttribute('data-troca-gemea-tela')) return 'captura'
      if (no.hasAttribute('data-vez-tela')) return 'vez'
      if (no.hasAttribute('data-troca-gemea-arte')) return 'moldura'
      if (no.hasAttribute('data-troca-gemea-acao')) return 'acao'
      return 'outro'
    })
    expect(ordem).toEqual(['captura', 'vez', 'moldura', 'acao'])
  })

  it('every new node is a decoration or an aria-hidden duplicate: the overlay, the holes, the markers, the twin row (inside the aria-hidden sheet)', async () => {
    await abrirJanelaPronta()
    for (const caixa of palco().querySelectorAll('[data-vez-caixa], [data-vez-tela]')) expect(caixa.getAttribute('aria-hidden')).toBe('true')
    const acao = palco().querySelector<HTMLElement>('[data-troca-gemea-acao]')!
    expect(acao.closest("[aria-hidden='true']")).not.toBeNull()
    expect(palco().querySelector('[data-troca-gemea-acao] button, [data-troca-gemea-acao] a')).toBeNull()
  })

  it('the twin row carries the three INI strings and nothing else', async () => {
    await abrirJanelaPronta()
    const acao = palco().querySelector<HTMLElement>('[data-troca-gemea-acao]')!
    expect(colapsar(acao.querySelector('[data-troca-gemea-rotulo]')!.textContent ?? '')).toBe(INI.acaoTela1)
    expect(colapsar(acao.querySelector("[data-troca-gemea-estado='inicial']")!.textContent ?? '')).toBe(INI.inicialTela1)
    expect(colapsar(acao.querySelector("[data-troca-gemea-estado='detalhe']")!.textContent ?? '')).toBe(INI.detalheTela1)
    expect(colapsar(acao.textContent ?? '')).toBe(`${INI.acaoTela1}${INI.inicialTela1}${INI.detalheTela1}`)
  })

  it('the accessibility tree keeps ONE button named "Explorar a tela"', async () => {
    await abrirJanelaPronta()
    const { getAllByRole } = await import('@testing-library/react').then((m) => m.within(principal()))
    expect(getAllByRole('button', { name: INI.acaoTela1 })).toHaveLength(1)
  })
})

async function abrirJanelaPronta() {
  return abrir({ largura: 1440 })
}

describe('U7 markup at 390 x 844: the stacked frame holds the figure then one overlay with one marker', () => {
  it('has .ic-palco > figure[data-produto-moldura] followed by one [data-vez-caixa] with one [data-vez]', async () => {
    await abrir({ largura: 390, altura: 844 })
    const palcoEmpilhado = principal().querySelector<HTMLElement>('.ic-palco')!
    const filhos = [...palcoEmpilhado.children]
    expect(filhos).toHaveLength(2)
    expect(filhos[0].matches('figure[data-produto-moldura]')).toBe(true)
    expect(filhos[1].matches('[data-vez-caixa]')).toBe(true)
    expect(filhos[1].querySelectorAll('[data-vez]')).toHaveLength(1)
    expect(filhos[1].getAttribute('aria-hidden')).toBe('true')
    expect(principal().querySelector('[data-troca-gemea-acao]')).toBeNull()
  })
})

describe('U8 one attribute at the crossing: data-troca-lado feeds the caption and the lamp of M06', () => {
  const lampada = () => principal().querySelector<HTMLElement>('.ic-m06 [data-luz-estado]')!

  it('p 0.55: lado 2, the caption is leg2, the lamp is lit and remembered; p 0.45: lado 1, leg1, the lamp stays lit; storage cleared at p 0.15: dark', async () => {
    await abrir({ largura: 1440 })
    await modelar()
    await irParaP(0.55)
    expect(palco().getAttribute('data-troca-lado')).toBe('2')
    expect(textoDaLegenda()).toBe(INI.leg2)
    expect(lampada().getAttribute('data-luz-estado')).toBe('acesa')
    expect(sessionStorage.getItem('casa-luz-m06')).toBe('1')
    await irParaP(0.45)
    expect(palco().getAttribute('data-troca-lado')).toBe('1')
    expect(textoDaLegenda()).toBe(INI.leg1)
    expect(lampada().getAttribute('data-luz-estado')).toBe('acesa')
  })

  it('on a first visit the lamp is dark before the crossing (p 0.15), with no light and no transition scheduled', async () => {
    await abrir({ largura: 1440 })
    await modelar()
    await irParaP(0.15)
    expect(palco().getAttribute('data-troca-lado')).toBe('1')
    expect(lampada().getAttribute('data-luz-estado')).toBe('apagada')
    expect(sessionStorage.getItem('casa-luz-m06')).toBeNull()
  })

  it('a stage that mounts at p >= 0.5 (a deep link, a restored scroll) shows the lamp lit at once, with no transition', async () => {
    // The page mounts, the driver reads p 0.6 from the track's first position, and the lamp is lit and marked "direct".
    fixarJanela({ largura: 1440 })
    const desfazer = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const retangulo = (top: number, height: number) =>
        ({ top, bottom: top + height, left: 0, right: 1440, width: 1440, height, x: 0, y: top, toJSON: () => ({}) }) as DOMRect
      if (this.matches('.ic-estagio')) return retangulo(24, ALTURA_DO_PALCO)
      if (this.matches("[data-faixa][aria-labelledby='ic-noite']")) return retangulo(24 - 0.6 * (ALTURA_DA_FAIXA - ALTURA_DO_PALCO), ALTURA_DA_FAIXA)
      return retangulo(0, 0)
    })
    try {
      renderizarRota('/', { sessao: null })
      await aguardarCarga()
      expect(palco().getAttribute('data-troca-lado')).toBe('2')
      expect(lampada().getAttribute('data-luz-estado')).toBe('acesa')
      expect(lampada().hasAttribute('data-luz-direto') || lampada().closest('[data-luz-direto]') !== null).toBe(true)
    } finally {
      desfazer.mockRestore()
    }
  })
})

describe('U9 reduced motion: the still (no data-troca-lado, no inline translate, both lamps lit, no pin)', () => {
  it('has no pin, no data-troca-lado, no inline translate or transform on the markers and the sheet, and both lamps are lit', async () => {
    await abrir({ largura: 1440, reduzido: true })
    expect(principal().querySelector('[data-troca-fixo]')).toBeNull()
    expect(palco().hasAttribute('data-troca-lado')).toBe(false)
    for (const marcador of principal().querySelectorAll<HTMLElement>('[data-vez]')) {
      expect(marcador.style.translate).toBe('')
      expect(marcador.style.transform).toBe('')
    }
    expect(principal().querySelector<HTMLElement>('[data-troca-noite]')!.style.transform).toBe('')
    const lampadas = [...principal().querySelectorAll('[data-luz-estado]')]
    expect(lampadas.length).toBeGreaterThanOrEqual(2)
    for (const lampada of lampadas) expect(lampada.getAttribute('data-luz-estado')).toBe('acesa')
  })
})

describe('U10 H2: the stroke starts when 60 % of the caption is in view', () => {
  it('every IntersectionObserver that watches a p[data-legenda] is created with threshold 0.6', async () => {
    await abrir({ largura: 1440 })
    const dasLegendas = ObservadorFalso.todos.filter((o) => [...o.alvos].some((alvo) => alvo.matches('p[data-legenda]')))
    expect(dasLegendas.length).toBeGreaterThanOrEqual(2)
    for (const o of dasLegendas) expect(o.opcoes?.threshold).toBe(0.6)
  })
})

describe('the sources of the stage exist where the card says', () => {
  it('FaixaDaVez.tsx exports FaixaDaVez and CaixaDaVez', () => {
    const arquivo = join(TROCA, 'FaixaDaVez.tsx')
    expect(existsSync(arquivo)).toBe(true)
    const fonte = lerTexto(arquivo)
    expect(fonte).toMatch(/export function FaixaDaVez\b/)
    expect(fonte).toMatch(/export function CaixaDaVez\b/)
  })
})
