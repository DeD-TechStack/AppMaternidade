import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { act, within } from '@testing-library/react'
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
    expect(inset[1].seletor).toContain('.ic-palco')
  })
})

describe('F1 troca.css: the rest room (an .ic-estagio without data-troca-fixo) gets no timeline and no animation (acceptance 10, "no third state")', () => {
  const todas = () => declaracoes(CSS_DA_TROCA())
  const DE_ANIMACAO = ['view-timeline', 'view-timeline-inset', 'animation', 'animation-timeline', 'animation-range']
  const regrasDeAnimacao = () => todas().filter((d) => DE_ANIMACAO.includes(d.prop))

  /** The three rooms of the band as bare fixtures: pinned (fixo), rest (palco without fixo), stacked (.ic-palco, below 1024). */
  function montar(sala: 'fixa' | 'repouso' | 'empilhada') {
    document.body.innerHTML =
      sala === 'empilhada'
        ? '<div data-casa><div data-troca-palco class="ic-palco"><figure data-produto-moldura></figure><div data-vez-caixa class="cm-produto-moldura"><div data-vez-tela><span data-vez></span></div></div></div></div>'
        : `<div data-casa><div data-faixa><div class="ic-estagio" data-troca-palco${sala === 'fixa' ? ' data-troca-fixo' : ''}><div class="ic-folha"><div class="ic-folha-interior"></div></div><div data-vez-caixa class="cm-produto-moldura"><div data-vez-tela><span data-vez></span></div></div></div></div></div>`
    return document.body
  }
  const quemCasa = (d: Declaracao, raiz: HTMLElement) => {
    try {
      return Array.from(raiz.querySelectorAll(d.seletor))
    } catch {
      return []
    }
  }

  it('the two stacked rules (--vez timeline and ic-vez animation) are keyed on .ic-palco and on nothing that the rest room carries', () => {
    const empilhadas = regrasDeAnimacao().filter((d) => d.valor.includes('--vez') || (d.prop === 'animation-range' && d.valor === 'contain 45% contain 55%') || d.seletor.includes('[data-vez-caixa]'))
    expect(empilhadas.length).toBeGreaterThanOrEqual(5)
    for (const d of empilhadas) {
      expect(d.seletor, `${d.seletor} { ${d.prop} }`).toContain('.ic-palco')
      expect(d.seletor, `${d.seletor} { ${d.prop} }`).not.toContain('data-troca-palco')
      expect(d.seletor, `${d.seletor} { ${d.prop} }`).not.toContain(':not(')
    }
  })

  it('no timeline or animation declaration of troca.css is keyed on [data-troca-palco] (the stage carries it in every room from 1024 px)', () => {
    for (const d of regrasDeAnimacao()) expect(d.seletor, `${d.seletor} { ${d.prop} }`).not.toContain('data-troca-palco')
  })

  it('negative control: in the rest room no declaration that starts a timeline or an animation matches any node', () => {
    const raiz = montar('repouso')
    for (const d of regrasDeAnimacao()) expect(quemCasa(d, raiz), `${d.seletor} { ${d.prop} }`).toHaveLength(0)
  })

  it('positive controls: the pinned room matches the sheet and pinned-marker rules, the stacked room the --vez rules', () => {
    const fixa = montar('fixa')
    const nasFixas = regrasDeAnimacao().filter((d) => quemCasa(d, fixa).length > 0)
    expect(nasFixas.map((d) => d.seletor).some((s) => s.includes('.ic-folha-interior'))).toBe(true)
    expect(nasFixas.map((d) => d.seletor).some((s) => s.endsWith('[data-vez]'))).toBe(true)
    expect(nasFixas.some((d) => d.valor.includes('--vez'))).toBe(false)
    const empilhada = montar('empilhada')
    const nasEmpilhadas = regrasDeAnimacao().filter((d) => quemCasa(d, empilhada).length > 0)
    expect(nasEmpilhadas.some((d) => d.prop === 'view-timeline' && d.valor === '--vez block')).toBe(true)
    expect(nasEmpilhadas.some((d) => d.prop === 'animation-timeline' && d.valor === '--vez')).toBe(true)
    expect(nasEmpilhadas.some((d) => d.valor.includes('--palco'))).toBe(false)
  })

  it('the only rule keyed on [data-troca-palco] in troca.css and inicio-casa.css is the transform reset of a scrolled screen', () => {
    const todasAsRegras = [...declaracoes(CSS_DA_TROCA()), ...declaracoes(CSS_DA_CASA())]
    const chaveadas = todasAsRegras.filter((d) => d.seletor.includes('data-troca-palco'))
    expect(chaveadas.map((d) => `${d.prop}: ${d.valor}`)).toEqual(['transform: none'])
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

// COMP-PORT: the Início no longer builds a stage in script. Scenes 1 to 3 are one strip that CSS pins and walks with scroll
// timelines (composicao.css), so what the page renders in jsdom is the same still DOM in every window. Everything the
// retired stage wrote (the marker, the twin row, the night sheet, the caption swap, the lamp state) is gone from it.
const SOBRAS_DO_PALCO = [
  '[data-vez]',
  '[data-vez-caixa]',
  '[data-vez-tela]',
  '[data-troca-palco]',
  '[data-troca-fixo]',
  '[data-troca-noite]',
  '[data-troca-legenda]',
  '[data-troca-gemea-acao]',
  '[data-troca-gemea-tela]',
  '[data-troca-gemea-arte]',
  '[data-troca-lado]',
  '[data-troca-visivel]',
  '[data-luz-estado]',
  '[data-luz-direto]',
  '.ic-estagio',
  '.ic-palco',
  '.ic-gemea',
  '.ic-folha',
  '.ic-medida',
  '.ic-m06',
]

const PILULA_DO_HEROI = '[data-cena-heroi] a[data-botao-mel]'

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

describe('U6 the page at 1440 x 900 carries no stage: no marker, overlay, twin row, night sheet or frame buttons', () => {
  it('none of the nodes the retired stage wrote is in the page, and the strip is the three panels of the composition', async () => {
    await abrir({ largura: 1440 })
    for (const seletor of SOBRAS_DO_PALCO) expect(principal().querySelector(seletor), seletor).toBeNull()
    expect([...principal().querySelectorAll('.co-fita > .co-painel')].map((p) => p.className.split(' ').find((c) => /^co-p\d$/.test(c)))).toEqual([
      'co-p1',
      'co-p2',
      'co-p3',
    ])
  })

  it('the three strings of the old twin row (INI.acaoTela1, inicialTela1, detalheTela1) are not rendered and no button names them', async () => {
    await abrir({ largura: 1440 })
    const texto = colapsar(principal().textContent ?? '')
    for (const antigo of [INI.acaoTela1, INI.inicialTela1, INI.detalheTela1]) expect(texto).not.toContain(antigo)
    expect(within(principal()).queryAllByRole('button', { name: INI.acaoTela1 })).toHaveLength(0)
    // Os únicos botões de `<main>` antes da interação são os quatro gatilhos `Experimentar` da demo nos telefones.
    expect(principal().querySelectorAll('button:not(.dt-gatilho)')).toHaveLength(0)
  })

  it('the Histórico capture of scene 2 is a plain picture until activated: only the demo trigger sits in the slot', async () => {
    await abrir({ largura: 1440 })
    const fone = principal().querySelector<HTMLElement>('.co-p2-fone')!
    expect(fone.querySelector('img')!.getAttribute('alt')).toBe(INI.altTela1)
    expect(fone.querySelector('button:not(.dt-gatilho), [aria-pressed], [role="button"], [tabindex]')).toBeNull()
    expect(fone.querySelectorAll('button.dt-gatilho')).toHaveLength(1)
  })
})

describe('U7 the page at 390 x 844 is the same still DOM: no stacked frame with an overlay and a marker', () => {
  it('has none of the stage nodes, and the three scenes stack in order inside .co-fita', async () => {
    await abrir({ largura: 390, altura: 844 })
    for (const seletor of SOBRAS_DO_PALCO) expect(principal().querySelector(seletor), seletor).toBeNull()
    const paineis = [...principal().querySelectorAll('.co-fita > .co-painel')]
    expect(paineis).toHaveLength(3)
    for (let i = 1; i < paineis.length; i += 1) expect(paineis[i - 1].compareDocumentPosition(paineis[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('U8 the caption and the lamp are no longer state: both captions are in the page, signed once, and no lamp is remembered', () => {
  const chavesDasLuzes = ['casa-luz-m05', 'casa-luz-m06', 'casa-luz-a05', 'casa-luz-m11']

  it('both captions (16:00 and 17:30) are static paragraphs, no data-troca-lado exists, and nothing is stored for the lamps', async () => {
    await abrir({ largura: 1440 })
    const legendas = [...principal().querySelectorAll('p[data-legenda]')].map((p) => colapsar(p.textContent ?? ''))
    expect(legendas).toEqual([INI.leg1, INI.leg2])
    expect(document.querySelector('[data-troca-lado]')).toBeNull()
    for (const chave of chavesDasLuzes) expect(sessionStorage.getItem(chave), chave).toBeNull()
  })

  it('a scroll and a resize change nothing the page owns: the lamps stay decorative images lit by CSS, and no storage is written', async () => {
    await abrir({ largura: 1440 })
    const antes = principal().innerHTML
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('resize'))
    })
    expect(principal().innerHTML).toBe(antes)
    const luzes = [...principal().querySelectorAll('img.co-luz')]
    expect(luzes).toHaveLength(3)
    for (const luz of luzes) {
      expect(luz.getAttribute('alt')).toBe('')
      expect(luz.hasAttribute('data-luz-estado')).toBe(false)
    }
    for (const chave of chavesDasLuzes) expect(sessionStorage.getItem(chave), chave).toBeNull()
  })
})

describe('U9 reduced motion: the same still DOM, and nothing in the page writes a transform or a translate', () => {
  it('has no stage node, and no inline transform, translate or will-change on any element of main, with or without the preference', async () => {
    for (const reduzido of [true, false]) {
      const { unmount } = await abrir({ largura: 1440, reduzido })
      for (const seletor of SOBRAS_DO_PALCO) expect(principal().querySelector(seletor), `${seletor} (reduced: ${reduzido})`).toBeNull()
      for (const no of principal().querySelectorAll<HTMLElement>('[style]')) {
        expect(no.style.transform, no.className).toBe('')
        expect(no.style.translate, no.className).toBe('')
        expect(no.style.willChange, no.className).toBe('')
      }
      unmount()
    }
  })
})

describe('U10 H2: the signed captions have no script behind them, so no observer waits for them', () => {
  it('no IntersectionObserver of the page watches a caption, a lamp or any node of main but the hero pill', async () => {
    await abrir({ largura: 1440 })
    const nosDaPagina = ObservadorFalso.todos.flatMap((o) => [...o.alvos]).filter((alvo) => principal().contains(alvo))
    expect(nosDaPagina.filter((alvo) => alvo.matches('p[data-legenda], .co-luz, [data-legenda] *'))).toEqual([])
    for (const alvo of nosDaPagina) expect(alvo.matches(PILULA_DO_HEROI), alvo.className).toBe(true)
    expect(nosDaPagina.length).toBeGreaterThanOrEqual(1)
  })
})

describe('the sources of the retired stage are gone', () => {
  it('FaixaDaVez.tsx, LegendaDaTroca.tsx and LuzDaLampada.tsx no longer exist in movimento/troca', () => {
    for (const nome of ['FaixaDaVez.tsx', 'LegendaDaTroca.tsx', 'LuzDaLampada.tsx']) {
      expect(existsSync(join(TROCA, nome)), nome).toBe(false)
    }
    // Control: the check sees a file that is there.
    expect(existsSync(join(TROCA, 'vez.test.tsx'))).toBe(true)
  })
})
