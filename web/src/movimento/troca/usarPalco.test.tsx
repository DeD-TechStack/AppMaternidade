import { useMemo, useRef } from 'react'
import { act, render, renderHook } from '@testing-library/react'
import { useScroll } from 'motion/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNoitePresa, usePalcoFixo } from './usarPalco.ts'

// The real `useScroll`, behind a spy: the driver must read the scroll through it (the card's contract).
vi.mock('motion/react', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('motion/react')>()
  return { ...real, useScroll: vi.fn(real.useScroll) }
})

// Pins of the night-sheet scroll driver (moment 2 of the Início): the translateX written on the two boxes of the sheet at
// fixed scroll offsets, the caption side, the in-view flag, the cleanup, and the windows where the hook is inactive.
// jsdom has no layout, so the layout is modelled with real coordinates: the document scrolls (`scrollTop`, `clientHeight`
// of the scrolling element), the track sits at `TOPO_DA_TRILHA` in the document and is `ALTURA_DA_TRILHA` tall (`offsetTop`,
// `clientHeight`), exactly what Motion's offset resolver reads; the scroll is a window `scroll` event. The stage's own
// measures (width, seam, frame centre) are faked on the elements. A "track top" below is `TOPO_DA_TRILHA - scrollTop`.

// jsdom has no `document.scrollingElement`, and Motion's scroll tracker (the one `useScroll` uses) is a no-op without it.
// Every browser has it, and it is the element whose window `scroll` event the tracker listens to.
if (!document.scrollingElement) {
  Object.defineProperty(document, 'scrollingElement', { configurable: true, get: () => document.documentElement })
}

/** Where the track starts in the document and how tall it is (stage + D at 1440: 900 + 600). */
const TOPO_DA_TRILHA = 2000
const ALTURA_DA_TRILHA = 1500

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
  rolagem = 0
  Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, get: () => rolagem })
})

afterEach(() => {
  Reflect.deleteProperty(document.documentElement, 'scrollTop')
  Reflect.deleteProperty(document.documentElement, 'clientHeight')
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: LARGURA_ORIGINAL })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: ALTURA_ORIGINAL })
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: MATCHMEDIA_ORIGINAL })
})

interface Medidas {
  largura: number
  costura: number
  centro: number
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
      <div ref={palco} data-teste-palco>
        <span ref={costura} data-teste-costura />
        <div data-produto-moldura data-teste-quadro />
        <div ref={folha} data-teste-folha>
          <div ref={interior} data-teste-interior />
        </div>
      </div>
    </div>
  )
}

const achar = (seletor: string) => document.querySelector<HTMLElement>(seletor)!

async function montar({ largura, altura }: { largura: number; altura: number }, medidas: Medidas, ativo = true) {
  fixarJanela(largura, altura)
  const lados: Array<1 | 2> = []
  const aoMudarLado = (lado: 1 | 2) => lados.push(lado)
  const resultado = render(<Palco ativo={ativo} aoMudarLado={aoMudarLado} />)
  const fixar = (no: HTMLElement, campo: string, valor: number) => Object.defineProperty(no, campo, { configurable: true, value: valor })
  fixar(achar('[data-teste-palco]'), 'clientWidth', medidas.largura)
  fixar(achar('[data-teste-costura]'), 'offsetLeft', medidas.costura)
  fixar(achar('[data-teste-quadro]'), 'offsetLeft', medidas.centro - 50)
  fixar(achar('[data-teste-quadro]'), 'offsetWidth', 100)
  // The track's place in the document (what Motion's offset resolver reads).
  fixar(achar('[data-teste-trilha]'), 'offsetTop', TOPO_DA_TRILHA)
  fixar(achar('[data-teste-trilha]'), 'clientHeight', ALTURA_DA_TRILHA)
  // Re-measure now that the stage's numbers are faked.
  await act(async () => {
    window.dispatchEvent(new Event('resize'))
  })
  const rolar = async (topo: number) => {
    rolagem = TOPO_DA_TRILHA - topo
    achar('[data-teste-trilha]').getBoundingClientRect = () =>
      ({ top: topo, bottom: topo + ALTURA_DA_TRILHA, left: 0, right: largura, width: largura, height: ALTURA_DA_TRILHA, x: 0, y: topo, toJSON: () => ({}) }) as DOMRect
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      await new Promise((resolver) => setTimeout(resolver, 80))
    })
  }
  return { ...resultado, lados, rolar }
}

const valor = (no: HTMLElement) => Number.parseFloat(/translateX\((-?[\d.]+)%\)/.exec(no.style.transform)?.[1] ?? 'NaN')
const folha = () => achar('[data-teste-folha]')
const interior = () => achar('[data-teste-interior]')

// [track top, p, translateX of the outer box in %]. Sticky top is 0 in jsdom, so p = -top / D.
const NA_1440 = { largura: 1440, altura: 900 }
const MEDIDAS_1440: Medidas = { largura: 1440, costura: 556.5, centro: 354.9 }
const NA_1366 = { largura: 1366, altura: 768 }
const MEDIDAS_1366: Medidas = { largura: 1366, costura: 500, centro: 300 }
const NA_1180 = { largura: 1180, altura: 900 }
const MEDIDAS_1180: Medidas = { largura: 1180, costura: 400, centro: 250 }

describe('useNoitePresa: translateX of the night sheet at fixed scroll offsets', () => {
  it('1440 x 900 (D 600): 38.65 / 38.65 / 32.65 / 24.65 / 8.22 / 0 % at p 0 / 0.05 / 0.25 / 0.5 / 0.75 / 1, inner box the negative', async () => {
    const { rolar } = await montar(NA_1440, MEDIDAS_1440)
    const casos: Array<[number, number]> = [
      [0, 38.65],
      [-30, 38.65],
      [-150, 32.65],
      [-300, 24.65],
      [-450, 8.22],
      [-600, 0],
    ]
    for (const [topo, esperado] of casos) {
      await rolar(topo)
      expect(valor(folha()), `top ${topo}`).toBeCloseTo(esperado, 1)
      expect(valor(interior()), `top ${topo} inner`).toBeCloseTo(-esperado, 1)
    }
  })

  it('1440 x 900: the holds (p 0.10 at the seam, 0.45-0.55 on the centre line, 0.85 on at the left edge) and the clamp past both ends', async () => {
    const { rolar } = await montar(NA_1440, MEDIDAS_1440)
    await rolar(-60) // p 0.10
    expect(valor(folha())).toBeCloseTo(38.65, 1)
    await rolar(-270) // p 0.45
    expect(valor(folha())).toBeCloseTo(24.65, 1)
    await rolar(-330) // p 0.55
    expect(valor(folha())).toBeCloseTo(24.65, 1)
    await rolar(-510) // p 0.85
    expect(valor(folha())).toBeCloseTo(0, 6)
    await rolar(-4000) // far past the end
    expect(valor(folha())).toBeCloseTo(0, 6)
    await rolar(500) // before the pin
    expect(valor(folha())).toBeCloseTo(38.65, 1)
  })

  it('1366 x 768 (short window, D 600): 36.60 / 30.33 / 21.96 / 7.32 / 0 % at p 0 / 0.25 / 0.5 / 0.75 / 1', async () => {
    const { rolar } = await montar(NA_1366, MEDIDAS_1366)
    const casos: Array<[number, number]> = [
      [0, 36.6],
      [-150, 30.33],
      [-300, 21.96],
      [-450, 7.32],
      [-600, 0],
    ]
    for (const [topo, esperado] of casos) {
      await rolar(topo)
      expect(valor(folha()), `top ${topo}`).toBeCloseTo(esperado, 1)
      expect(valor(interior()), `top ${topo} inner`).toBeCloseTo(-esperado, 1)
    }
  })

  it('1180 x 900 (D 480): the distance follows the window width, p 0.5 is 240 px up', async () => {
    const { rolar } = await montar(NA_1180, MEDIDAS_1180)
    await rolar(-240)
    expect(valor(folha())).toBeCloseTo((250 / 1180) * 100, 1)
    await rolar(-480)
    expect(valor(folha())).toBeCloseTo(0, 6)
    expect(achar('[data-teste-trilha]').style.getPropertyValue('--troca-d')).toBe('480px')
  })

  it('writes the first state at mount, before any scroll: the sheet at the seam, the caption on side 1, --troca-d set', async () => {
    const { lados } = await montar(NA_1440, MEDIDAS_1440)
    expect(folha().style.transform).toMatch(/^translateX\(/)
    expect(interior().style.transform).toMatch(/^translateX\(/)
    expect(lados).toEqual([1])
    expect(achar('[data-teste-trilha]').style.getPropertyValue('--troca-d')).toBe('600px')
  })

  it('a resize re-measures: a new stage width gives a new percent at the same scroll offset', async () => {
    const { rolar } = await montar(NA_1440, MEDIDAS_1440)
    await rolar(-300)
    expect(valor(folha())).toBeCloseTo(24.65, 1)
    Object.defineProperty(achar('[data-teste-palco]'), 'clientWidth', { configurable: true, value: 1000 })
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
      await new Promise((resolver) => setTimeout(resolver, 80))
    })
    expect(valor(folha())).toBeCloseTo((354.9 / 1000) * 100, 1)
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
    achar('[data-teste-palco]').style.top = '24px'
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })
    await rolar(-274) // p (24 + 274) / 600 = 0.4967
    expect(lados).toEqual([1])
    await rolar(-277) // p 0.5017
    expect(lados).toEqual([1, 2])
    await rolar(24) // p 0, at the sticky top
    expect(lados).toEqual([1, 2, 1])
    await rolar(600) // before the pin
    expect(valor(folha())).toBeCloseTo(38.65, 1)
  })
})

describe('useNoitePresa: caption side, in-view flag, cleanup', () => {
  it('calls aoMudarLado once at mount and only when p crosses 0.5, either way', async () => {
    const { rolar, lados } = await montar(NA_1440, MEDIDAS_1440)
    expect(lados).toEqual([1])
    await rolar(-100)
    await rolar(-290) // p 0.483
    expect(lados).toEqual([1])
    await rolar(-300) // p 0.5
    expect(lados).toEqual([1, 2])
    await rolar(-600)
    expect(lados).toEqual([1, 2])
    await rolar(-290)
    expect(lados).toEqual([1, 2, 1])
    await rolar(0)
    expect(lados).toEqual([1, 2, 1])
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

  it('unmount removes the inline transforms, the attribute and --troca-d, and a later scroll writes nothing', async () => {
    const { rolar, unmount } = await montar(NA_1440, MEDIDAS_1440)
    await rolar(-300)
    const nos = { folha: folha(), interior: interior(), palco: achar('[data-teste-palco]'), trilha: achar('[data-teste-trilha]') }
    expect(nos.folha.style.transform).not.toBe('')
    unmount()
    expect(nos.folha.style.transform).toBe('')
    expect(nos.interior.style.transform).toBe('')
    expect(nos.palco.hasAttribute('data-troca-visivel')).toBe(false)
    expect(nos.trilha.style.getPropertyValue('--troca-d')).toBe('')
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('resize'))
      await new Promise((resolver) => setTimeout(resolver, 80))
    })
    expect(nos.folha.style.transform).toBe('')
    expect(nos.palco.hasAttribute('data-troca-visivel')).toBe(false)
  })
})

describe('useNoitePresa: inactive (not `ativo`) is the finished rest state', () => {
  it('writes nothing, never calls aoMudarLado and sets no --troca-d, whatever the scroll does', async () => {
    const { rolar, lados } = await montar(NA_1440, MEDIDAS_1440, false)
    await rolar(-300)
    await rolar(-600)
    expect(folha().style.transform).toBe('')
    expect(interior().style.transform).toBe('')
    expect(achar('[data-teste-palco]').hasAttribute('data-troca-visivel')).toBe(false)
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
    expect(achar('[data-teste-trilha]').style.getPropertyValue('--troca-d')).toBe('')
  })
})

describe('usePalcoFixo: where the pin is built', () => {
  const pino = (largura: number, altura: number, reduzido = false) => {
    fixarJanela(largura, altura, reduzido)
    return renderHook(() => usePalcoFixo()).result.current
  }

  it('is built at 1440 x 900 and at 1366 x 768', () => {
    expect(pino(1440, 900)).toBe(true)
    expect(pino(1366, 768)).toBe(true)
  })

  it('is not built at 390 x 844 (a phone), under 640 px tall, or with reduced motion', () => {
    expect(pino(390, 844)).toBe(false)
    expect(pino(1440, 639)).toBe(false)
    expect(pino(1440, 900, true)).toBe(false)
    expect(pino(1366, 768, true)).toBe(false)
  })
})
