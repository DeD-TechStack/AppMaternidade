import { useMemo, useRef } from 'react'
import { act, render, renderHook } from '@testing-library/react'
import { useScroll } from 'motion/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { alturaMinimaDoFixo } from './medidas.ts'
import { CONDICAO_NATIVA, useNoitePresa, usePalcoFixo } from './usarPalco.ts'

// The real `useScroll`, behind a spy: the driver must read the scroll through it (the card's contract).
vi.mock('motion/react', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('motion/react')>()
  return { ...real, useScroll: vi.fn(real.useScroll) }
})

// Pins of the night-sheet scroll driver (moment 2 of the Início): what it writes on the two boxes of the sheet and on the
// markers at fixed scroll offsets (the JS fallback, which these tests select by stubbing `CSS.supports`), that it writes
// NOTHING where the browser scrubs the CSS timeline, the caption side as an attribute, the in-view flag, the cleanup, and
// the windows where the hook is inactive. jsdom has no layout, so the layout is modelled with real coordinates: the
// document scrolls (`scrollTop`, `clientHeight` of the scrolling element), the track sits at `TOPO_DA_TRILHA` in the
// document and is `ALTURA_DA_TRILHA` tall, the stage is `ALTURA_DO_PALCO` tall, so D is their difference (600), the way
// the driver measures it. The stage's width and the seam are faked on the elements. A "track top" below is
// `TOPO_DA_TRILHA - scrollTop`, and the sticky top is 24 px (the stage's inline `top`).

// jsdom has no `document.scrollingElement`, and Motion's scroll tracker (the one `useScroll` uses) is a no-op without it.
if (!document.scrollingElement) {
  Object.defineProperty(document, 'scrollingElement', { configurable: true, get: () => document.documentElement })
}

const TOPO_DA_TRILHA = 2000
const ALTURA_DA_TRILHA = 1500
const ALTURA_DO_PALCO = 900
const TOPO_COLADO = 24

const LARGURA_ORIGINAL = window.innerWidth
const ALTURA_ORIGINAL = window.innerHeight
const MATCHMEDIA_ORIGINAL = window.matchMedia

/** How far the document is scrolled, as the scrolling element reports it. */
let rolagem = 0

function fixarJanela(largura: number, altura: number, reduzido = false) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: altura })
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: altura })
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

beforeEach(() => {
  vi.useRealTimers()
  // The default browser here has no scroll-driven animations (the JS fallback); the native tests stub the support.
  vi.stubGlobal('CSS', { supports: () => false })
  rolagem = 0
  Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, get: () => rolagem })
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document.documentElement, 'scrollTop')
  Reflect.deleteProperty(document.documentElement, 'clientHeight')
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: LARGURA_ORIGINAL })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: ALTURA_ORIGINAL })
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: MATCHMEDIA_ORIGINAL })
})

interface Medidas {
  largura: number
  costura: number
}

function Palco({ ativo, aoMudarLado }: { ativo: boolean; aoMudarLado: (lado: 1 | 2) => void }) {
  const palco = useRef<HTMLDivElement>(null)
  const folha = useRef<HTMLDivElement>(null)
  const interior = useRef<HTMLDivElement>(null)
  const costura = useRef<HTMLSpanElement>(null)
  const alvos = useMemo(() => ({ palco, folha, interior, costura }), [])
  useNoitePresa(alvos, ativo, aoMudarLado)
  return (
    <div data-faixa data-teste-trilha>
      <div ref={palco} data-teste-palco style={{ top: `${TOPO_COLADO}px` }}>
        <span ref={costura} data-teste-costura />
        <span data-vez data-teste-vez="dia" />
        <div ref={folha} data-teste-folha>
          <div ref={interior} data-teste-interior />
          <span data-vez data-teste-vez="gemea" />
        </div>
      </div>
    </div>
  )
}

const achar = (seletor: string) => document.querySelector<HTMLElement>(seletor)!

const retangulo = (top: number, height: number, largura: number) =>
  ({ top, bottom: top + height, left: 0, right: largura, width: largura, height, x: 0, y: top, toJSON: () => ({}) }) as DOMRect

async function montar({ largura, altura }: { largura: number; altura: number }, medidas: Medidas, ativo = true) {
  fixarJanela(largura, altura)
  const lados: Array<1 | 2> = []
  const aoMudarLado = (lado: 1 | 2) => lados.push(lado)
  const resultado = render(<Palco ativo={ativo} aoMudarLado={aoMudarLado} />)
  const fixar = (no: HTMLElement, campo: string, valor: number) => Object.defineProperty(no, campo, { configurable: true, value: valor })
  fixar(achar('[data-teste-palco]'), 'clientWidth', medidas.largura)
  fixar(achar('[data-teste-costura]'), 'offsetLeft', medidas.costura)
  // The track's place in the document (what Motion's offset resolver reads) and the two rects D is measured from.
  fixar(achar('[data-teste-trilha]'), 'offsetTop', TOPO_DA_TRILHA)
  fixar(achar('[data-teste-trilha]'), 'clientHeight', ALTURA_DA_TRILHA)
  achar('[data-teste-palco]').getBoundingClientRect = () => retangulo(TOPO_COLADO, ALTURA_DO_PALCO, largura)
  achar('[data-teste-trilha]').getBoundingClientRect = () => retangulo(TOPO_DA_TRILHA - rolagem, ALTURA_DA_TRILHA, largura)
  // Re-measure now that the stage's numbers are faked.
  await act(async () => {
    window.dispatchEvent(new Event('resize'))
  })
  const rolar = async (topo: number) => {
    rolagem = TOPO_DA_TRILHA - topo
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      await new Promise((resolver) => setTimeout(resolver, 80))
    })
  }
  return { ...resultado, lados, rolar }
}

/** Two animation frames and then some: jsdom ticks rAF at about 16 ms, and a loaded runner is slower. */
const doisQuadros = () =>
  act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 400))
  })

const valor = (no: HTMLElement) => Number.parseFloat(/translateX\((-?[\d.]+)%\)/.exec(no.style.transform)?.[1] ?? 'NaN')
const passo = (no: HTMLElement) => Number.parseFloat(/\* (-?[\d.]+)\)$/.exec(no.style.translate)?.[1] ?? 'NaN')
const folha = () => achar('[data-teste-folha]')
const interior = () => achar('[data-teste-interior]')
const marcadores = () => [...document.querySelectorAll<HTMLElement>('[data-vez]')]

// [track top, p]: with the sticky top at 24 and D 600, p = (24 - top) / 600.
const NA_1440 = { largura: 1440, altura: 900 }
const MEDIDAS_1440: Medidas = { largura: 1440, costura: 553 }
const NA_1180 = { largura: 1180, altura: 800 }
const MEDIDAS_1180: Medidas = { largura: 1180, costura: 421 }

/** The edge as a percent of the stage width: the seam share, times how much of the run (p 0.10 to 0.70) is left. */
const esperado = ({ largura, costura }: Medidas, p: number) => (costura / largura) * 100 * (1 - Math.min(1, Math.max(0, (p - 0.1) / 0.6)))

describe('useNoitePresa (JS fallback): translateX of the night sheet at fixed scroll offsets', () => {
  it('1440 x 900: 38.40 / 38.40 / 28.80 / 12.80 / 0 / 0 % at p 0 / 0.05 / 0.25 / 0.5 / 0.7 / 1, inner box the negative', async () => {
    const { rolar } = await montar(NA_1440, MEDIDAS_1440)
    const casos: Array<[number, number]> = [
      [24, 38.4],
      [-6, 38.4],
      [-126, 28.8],
      [-276, 12.8],
      [-396, 0],
      [-576, 0],
    ]
    for (const [topo, esperadoEmPercentual] of casos) {
      await rolar(topo)
      expect(valor(folha()), `top ${topo}`).toBeCloseTo(esperadoEmPercentual, 1)
      expect(valor(interior()), `top ${topo} inner`).toBeCloseTo(-esperadoEmPercentual, 1)
    }
  })

  it('1440 x 900: the holds (seam to p 0.10, left edge from p 0.70), the line between, and the clamp past both ends', async () => {
    const { rolar } = await montar(NA_1440, MEDIDAS_1440)
    await rolar(-36) // p 0.10
    expect(valor(folha())).toBeCloseTo(esperado(MEDIDAS_1440, 0.1), 3)
    await rolar(-216) // p 0.40: no hold on the frame's centre line, the edge is still moving
    expect(valor(folha())).toBeCloseTo(esperado(MEDIDAS_1440, 0.4), 3)
    await rolar(-336) // p 0.60
    expect(valor(folha())).toBeCloseTo(esperado(MEDIDAS_1440, 0.6), 3)
    await rolar(-396) // p 0.70
    expect(valor(folha())).toBeCloseTo(0, 6)
    await rolar(-4000) // far past the end
    expect(valor(folha())).toBeCloseTo(0, 6)
    await rolar(500) // before the pin
    expect(valor(folha())).toBeCloseTo(38.4, 1)
  })

  it('1180 x 800 (the narrow room, seam 421): the seam share at p 0 and zero at p 0.7', async () => {
    const { rolar } = await montar(NA_1180, MEDIDAS_1180)
    await rolar(24)
    expect(valor(folha())).toBeCloseTo((421 / 1180) * 100, 1)
    await rolar(-396)
    expect(valor(folha())).toBeCloseTo(0, 6)
  })

  it('writes the first state at mount, before any scroll: the sheet at the seam, the caption on side 1, data-troca-lado 1, no --troca-d', async () => {
    const { lados } = await montar(NA_1440, MEDIDAS_1440)
    expect(folha().style.transform).toMatch(/^translateX\(/)
    expect(interior().style.transform).toMatch(/^translateX\(/)
    expect(lados).toEqual([1])
    expect(achar('[data-teste-palco]').getAttribute('data-troca-lado')).toBe('1')
    expect(achar('[data-teste-trilha]').style.getPropertyValue('--troca-d')).toBe('')
  })

  it('a resize re-measures: a new stage width gives a new percent at the same scroll offset', async () => {
    const { rolar } = await montar(NA_1440, MEDIDAS_1440)
    await rolar(24)
    expect(valor(folha())).toBeCloseTo(38.4, 1)
    Object.defineProperty(achar('[data-teste-palco]'), 'clientWidth', { configurable: true, value: 1000 })
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
      await new Promise((resolver) => setTimeout(resolver, 80))
    })
    expect(valor(folha())).toBeCloseTo((553 / 1000) * 100, 1)
  })

  it('D is measured from the rects (track height minus stage height), never written: a 614.4 px pin moves p as 1/614.4', async () => {
    const { rolar, lados } = await montar({ largura: 1366, altura: 768 }, { largura: 1366, costura: 500 })
    achar('[data-teste-palco]').getBoundingClientRect = () => retangulo(TOPO_COLADO, ALTURA_DA_TRILHA - 614.4, 1366)
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })
    await rolar(24 - 0.49 * 614.4)
    expect(lados).toEqual([1])
    await rolar(24 - 0.51 * 614.4)
    expect(lados).toEqual([1, 2])
    expect(achar('[data-teste-trilha]').style.getPropertyValue('--troca-d')).toBe('')
  })
})

describe('useNoitePresa (JS fallback): the marker steps one row between p 0.485 and p 0.515', () => {
  it('writes the same inline translate on every [data-vez] in the stage, from passoDaVez', async () => {
    const { rolar } = await montar(NA_1440, MEDIDAS_1440)
    expect(marcadores()).toHaveLength(2)
    await rolar(24) // p 0
    for (const m of marcadores()) expect(m.style.translate).toBe('0 calc(var(--vez-passo) * -1)')
    await rolar(24 - 0.485 * 600)
    for (const m of marcadores()) expect(passo(m)).toBeCloseTo(-1, 3)
    await rolar(24 - 0.5 * 600)
    for (const m of marcadores()) expect(passo(m)).toBeCloseTo(-0.5, 3)
    await rolar(24 - 0.515 * 600)
    for (const m of marcadores()) expect(passo(m)).toBeCloseTo(0, 3)
    await rolar(24 - 0.9 * 600)
    for (const m of marcadores()) expect(passo(m)).toBeCloseTo(0, 3)
  })
})

describe('useNoitePresa (native): where the browser scrubs the CSS timeline the driver writes nothing', () => {
  const NATIVO = { supports: (condicao: string) => condicao === CONDICAO_NATIVA }

  it('CONDICAO_NATIVA is the exact feature test of the CSS (view() and animation-range: entry)', () => {
    expect(CONDICAO_NATIVA).toBe('(animation-timeline: view()) and (animation-range: entry)')
  })

  it('no transform on the sheet, no translate on the markers, at mount and while scrolling; data-troca-lado still follows p', async () => {
    vi.stubGlobal('CSS', NATIVO)
    const { rolar, lados } = await montar(NA_1440, MEDIDAS_1440)
    expect(folha().style.transform).toBe('')
    expect(interior().style.transform).toBe('')
    for (const m of marcadores()) expect(m.style.translate).toBe('')
    expect(achar('[data-teste-palco]').getAttribute('data-troca-lado')).toBe('1')
    await rolar(-276) // p 0.5
    expect(folha().style.transform).toBe('')
    expect(interior().style.transform).toBe('')
    for (const m of marcadores()) expect(m.style.translate).toBe('')
    expect(achar('[data-teste-palco]').getAttribute('data-troca-lado')).toBe('2')
    expect(lados).toEqual([1, 2])
  })

  it('a live timeline (currentTime is a number) is trusted: still nothing written', async () => {
    vi.stubGlobal('CSS', NATIVO)
    const original = Element.prototype.getAnimations
    Element.prototype.getAnimations = function () {
      return [{ timeline: { currentTime: 12 } } as unknown as Animation]
    }
    try {
      const { rolar } = await montar(NA_1440, MEDIDAS_1440)
      await rolar(-276)
      expect(folha().style.transform).toBe('')
    } finally {
      if (original) Element.prototype.getAnimations = original
      else Reflect.deleteProperty(Element.prototype, 'getAnimations')
    }
  })

  it('a dead timeline (currentTime null) while the stage is in view: the driver writes the JS fallback', async () => {
    vi.stubGlobal('CSS', NATIVO)
    const original = Element.prototype.getAnimations
    Element.prototype.getAnimations = function () {
      return [{ timeline: { currentTime: null } } as unknown as Animation]
    }
    try {
      const { rolar } = await montar(NA_1440, MEDIDAS_1440)
      await rolar(-276)
      await doisQuadros() // a dead reading is confirmed two frames later
      expect(valor(folha())).toBeCloseTo(12.8, 1)
      for (const m of marcadores()) expect(passo(m)).toBeCloseTo(-0.5, 3)
    } finally {
      if (original) Element.prototype.getAnimations = original
      else Reflect.deleteProperty(Element.prototype, 'getAnimations')
    }
  })

  it('a timeline that reads null once and is alive two frames later (its first frame had not run) is NOT dead: nothing written', async () => {
    vi.stubGlobal('CSS', NATIVO)
    const original = Element.prototype.getAnimations
    let leituras = 0
    const cancelar = vi.fn()
    Element.prototype.getAnimations = function () {
      leituras += 1
      return [{ timeline: { currentTime: leituras === 1 ? null : 12 }, cancel: cancelar } as unknown as Animation]
    }
    try {
      const { rolar } = await montar(NA_1440, MEDIDAS_1440)
      await rolar(-276)
      await doisQuadros()
      expect(leituras).toBeGreaterThan(1)
      expect(cancelar).not.toHaveBeenCalled()
      expect(folha().style.transform).toBe('')
    } finally {
      if (original) Element.prototype.getAnimations = original
      else Reflect.deleteProperty(Element.prototype, 'getAnimations')
    }
  })

  it('an animation with NO timeline (the named one did not resolve; it sits at its end state) is dead too: cancelled, and the JS fallback is written', async () => {
    vi.stubGlobal('CSS', NATIVO)
    const original = Element.prototype.getAnimations
    const cancelar = vi.fn()
    Element.prototype.getAnimations = function () {
      return [{ timeline: null, cancel: cancelar } as unknown as Animation]
    }
    try {
      const { rolar } = await montar(NA_1440, MEDIDAS_1440)
      await rolar(-276)
      await doisQuadros()
      expect(cancelar).toHaveBeenCalled()
      expect(valor(folha())).toBeCloseTo(12.8, 1)
    } finally {
      if (original) Element.prototype.getAnimations = original
      else Reflect.deleteProperty(Element.prototype, 'getAnimations')
    }
  })
})

describe('useNoitePresa: the scroll is read through Motion useScroll', () => {
  it('calls useScroll with a target that resolves to the [data-faixa] track and with an offset', async () => {
    vi.mocked(useScroll).mockClear()
    await montar(NA_1440, MEDIDAS_1440)
    const chamadas = vi.mocked(useScroll).mock.calls
    expect(chamadas.length).toBeGreaterThan(0)
    const opcoes = chamadas[chamadas.length - 1][0]
    expect(opcoes?.target?.current).toBe(achar('[data-teste-trilha]'))
    expect(opcoes?.target?.current?.hasAttribute('data-faixa')).toBe(true)
    expect(opcoes?.offset).toEqual(['start end', 'end start'])
  })

  it('a sticky top of 24 px moves p 0 to a track top of 24: p is 0.4967 at -274, 0.5017 at -277, 0 at 24 and before', async () => {
    const { rolar, lados } = await montar(NA_1440, MEDIDAS_1440)
    await rolar(-274) // p (24 + 274) / 600 = 0.4967
    expect(lados).toEqual([1])
    await rolar(-277) // p 0.5017
    expect(lados).toEqual([1, 2])
    await rolar(24) // p 0, at the sticky top
    expect(lados).toEqual([1, 2, 1])
    await rolar(600) // before the pin
    expect(valor(folha())).toBeCloseTo(38.4, 1)
  })
})

describe('useNoitePresa: caption side, in-view flag, cleanup', () => {
  it('calls aoMudarLado once at mount and only when p crosses 0.5, either way, and data-troca-lado is set BEFORE the call', async () => {
    fixarJanela(1440, 900)
    const vistos: string[] = []
    const aoMudarLado = (lado: 1 | 2) => vistos.push(`${lado}:${document.querySelector('[data-teste-palco]')?.getAttribute('data-troca-lado')}`)
    render(<Palco ativo aoMudarLado={aoMudarLado} />)
    const fixar = (no: HTMLElement, campo: string, valorFixo: number) => Object.defineProperty(no, campo, { configurable: true, value: valorFixo })
    fixar(achar('[data-teste-trilha]'), 'offsetTop', TOPO_DA_TRILHA)
    fixar(achar('[data-teste-trilha]'), 'clientHeight', ALTURA_DA_TRILHA)
    achar('[data-teste-palco]').getBoundingClientRect = () => retangulo(TOPO_COLADO, ALTURA_DO_PALCO, 1440)
    achar('[data-teste-trilha]').getBoundingClientRect = () => retangulo(TOPO_DA_TRILHA - rolagem, ALTURA_DA_TRILHA, 1440)
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })
    const rolar = async (topo: number) => {
      rolagem = TOPO_DA_TRILHA - topo
      await act(async () => {
        window.dispatchEvent(new Event('scroll'))
        await new Promise((resolver) => setTimeout(resolver, 80))
      })
    }
    expect(vistos).toEqual(['1:1'])
    await rolar(-100)
    await rolar(-260) // p 0.473
    expect(vistos).toEqual(['1:1'])
    await rolar(-276) // p 0.5
    expect(vistos).toEqual(['1:1', '2:2'])
    await rolar(-600)
    expect(vistos).toEqual(['1:1', '2:2'])
    await rolar(-250)
    expect(vistos).toEqual(['1:1', '2:2', '1:1'])
    await rolar(24)
    expect(vistos).toEqual(['1:1', '2:2', '1:1'])
  })

  it('marks the stage data-troca-visivel while the track is in the window, and not when it is above or below', async () => {
    const { rolar } = await montar(NA_1440, MEDIDAS_1440)
    const palco = achar('[data-teste-palco]')
    await rolar(-300)
    expect(palco.hasAttribute('data-troca-visivel')).toBe(true)
    await rolar(-1600) // bottom -100: gone above
    expect(palco.hasAttribute('data-troca-visivel')).toBe(false)
    await rolar(-300)
    expect(palco.hasAttribute('data-troca-visivel')).toBe(true)
    await rolar(900) // top = window height: still below
    expect(palco.hasAttribute('data-troca-visivel')).toBe(false)
  })

  it('unmount removes the inline transforms and translates, data-troca-lado and data-troca-visivel, and a later scroll writes nothing', async () => {
    const { rolar, unmount } = await montar(NA_1440, MEDIDAS_1440)
    await rolar(-300)
    const nos = { folha: folha(), interior: interior(), palco: achar('[data-teste-palco]'), marcadores: marcadores() }
    expect(nos.folha.style.transform).not.toBe('')
    expect(nos.marcadores[0].style.translate).not.toBe('')
    unmount()
    expect(nos.folha.style.transform).toBe('')
    expect(nos.interior.style.transform).toBe('')
    for (const m of nos.marcadores) expect(m.style.translate).toBe('')
    expect(nos.palco.hasAttribute('data-troca-visivel')).toBe(false)
    expect(nos.palco.hasAttribute('data-troca-lado')).toBe(false)
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('resize'))
      await new Promise((resolver) => setTimeout(resolver, 80))
    })
    expect(nos.folha.style.transform).toBe('')
    expect(nos.palco.hasAttribute('data-troca-visivel')).toBe(false)
    expect(nos.palco.hasAttribute('data-troca-lado')).toBe(false)
  })
})

describe('useNoitePresa: inactive (not `ativo`) is the finished rest state', () => {
  it('writes nothing, never calls aoMudarLado and sets no attribute, whatever the scroll does', async () => {
    const { rolar, lados } = await montar(NA_1440, MEDIDAS_1440, false)
    await rolar(-300)
    await rolar(-600)
    expect(folha().style.transform).toBe('')
    expect(interior().style.transform).toBe('')
    for (const m of marcadores()) expect(m.style.translate).toBe('')
    expect(achar('[data-teste-palco]').hasAttribute('data-troca-visivel')).toBe(false)
    expect(achar('[data-teste-palco]').hasAttribute('data-troca-lado')).toBe(false)
    expect(achar('[data-teste-trilha]').style.getPropertyValue('--troca-d')).toBe('')
    expect(lados).toEqual([])
  })

  it('turning `ativo` off in the middle of the session restores the rest state', async () => {
    fixarJanela(1440, 900)
    const aoMudarLado = vi.fn()
    const { rerender } = render(<Palco ativo aoMudarLado={aoMudarLado} />)
    expect(folha().style.transform).toMatch(/^translateX\(/)
    rerender(<Palco ativo={false} aoMudarLado={aoMudarLado} />)
    expect(folha().style.transform).toBe('')
    expect(interior().style.transform).toBe('')
    expect(achar('[data-teste-palco]').hasAttribute('data-troca-lado')).toBe(false)
  })
})

describe('usePalcoFixo: where the pin is built', () => {
  const pino = (largura: number, altura: number, reduzido = false) => {
    fixarJanela(largura, altura, reduzido)
    return renderHook(() => usePalcoFixo()).result.current
  }

  it('is built at 1440 x 900, 1366 x 768 and at the measured gate (the M16 height)', () => {
    expect(pino(1440, 900)).toBe(true)
    expect(pino(1366, 768)).toBe(true)
    expect(pino(1440, alturaMinimaDoFixo())).toBe(true)
  })

  it('is not built at 390 x 844 (a phone), one px under the measured gate, or with reduced motion', () => {
    expect(pino(390, 844)).toBe(false)
    expect(pino(1440, alturaMinimaDoFixo() - 1)).toBe(false)
    expect(pino(1440, 639)).toBe(false)
    expect(pino(1440, 900, true)).toBe(false)
    expect(pino(1366, 768, true)).toBe(false)
  })
})
