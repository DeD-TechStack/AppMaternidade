import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderizarRota } from '../teste/renderizarRota.tsx'

// MOTION-1: o conteúdo do <main> nasce visível. Nenhum título, parágrafo, item, cartão ou imagem espera
// uma rolagem: com ou sem movimento, rolado ou não, está no estado final já na primeira pintura. A única
// exceção é a cena da abertura (M8) sob a cortina (M2), em `/` e `/sistema`, na primeira visita da sessão.

const ROTAS = [
  '/',
  '/como-funciona',
  '/cuidado-compartilhado',
  '/desenvolvimento',
  '/sistema',
  '/privacidade',
  '/rota-que-nao-existe',
] as const

const COM_CORTINA = ['/', '/sistema']
const MARCA_DA_CORTINA = 'cortina-vista'

function consultas(reduzido: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('prefers-reduced-motion') ? reduzido : consulta.includes('min-width: 46rem'),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }))
}

/** Um IntersectionObserver que nunca avisa de interseção nenhuma: quem espera por ele espera para sempre. */
function observadorMudo() {
  class Mudo {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  vi.stubGlobal('IntersectionObserver', Mudo)
}

/** Os números de uma lista de funções ou de um valor de CSS ("translateY(48px)", "0px 24px"). */
const numeros = (texto: string) => (texto.match(/-?\d*\.?\d+/g) ?? []).map(Number)

/**
 * Por que o elemento espera (o que o esconde ou o desloca no estilo em linha), ou `null` se está no estado
 * final. Opacidade abaixo de 1 e qualquer deslocamento (translate, translateX/Y/Z, translate3d, matrix, a
 * propriedade `translate`) contam; `scale` (a mídia presa à rolagem, M3) e `rotate` (o giro do cartão) não.
 */
function espera(elemento: Element): string | null {
  const css = elemento.getAttribute('style') ?? ''
  const opacidade = /(?:^|;)\s*opacity\s*:\s*([\d.]+)/.exec(css)
  if (opacidade && Number(opacidade[1]) < 1) return `opacity: ${opacidade[1]}`
  for (const [, valor] of css.matchAll(/(?:^|;)\s*transform\s*:\s*([^;]+)/g)) {
    for (const [, argumentos] of valor.matchAll(/translate(?:3d|X|Y|Z)?\(([^)]*)\)/g)) {
      if (numeros(argumentos).some((n) => n !== 0)) return `transform: ${valor.trim()}`
    }
    for (const [, argumentos] of valor.matchAll(/matrix(?:3d)?\(([^)]*)\)/g)) {
      const n = numeros(argumentos)
      const deslocamento = n.length === 6 ? n.slice(4) : n.slice(12, 15)
      if (deslocamento.some((v) => v !== 0)) return `transform: ${valor.trim()}`
    }
  }
  for (const [, valor] of css.matchAll(/(?:^|;)\s*translate\s*:\s*([^;]+)/g)) {
    if (numeros(valor).some((n) => n !== 0)) return `translate: ${valor.trim()}`
  }
  return null
}

/**
 * Os elementos do <main> que esperam. `[data-entrada-cena]` (M8) é isento só quando `cena` vale `true`; a
 * camada de resumo do hover (M13, `[data-aberta]`) nasce com opacidade 0 por contrato e é sempre isenta.
 */
function emEspera(container: HTMLElement, cena: boolean): string[] {
  const principal = container.querySelector('main')
  expect(principal, 'a rota tem um <main>').not.toBeNull()
  const achados: string[] = []
  for (const elemento of principal!.querySelectorAll('*')) {
    if (elemento.closest('[data-aberta]')) continue
    if (cena && elemento.closest('[data-entrada-cena]')) continue
    const motivo = espera(elemento)
    if (motivo) {
      const marca = elemento.getAttribute('class') ?? elemento.getAttribute('data-entrada-cena') ?? ''
      achados.push(`<${elemento.tagName.toLowerCase()} class="${marca}"> ${motivo}`)
    }
  }
  return achados
}

beforeEach(() => {
  window.sessionStorage.clear()
  observadorMudo()
})

afterEach(() => {
  window.sessionStorage.clear()
})

describe('segunda visita', () => {
  for (const rota of ROTAS) {
    it(`${rota}: nada no <main> espera (sem opacidade abaixo de 1, sem deslocamento), com um observador que nunca avisa`, () => {
      window.sessionStorage.setItem(MARCA_DA_CORTINA, '1')
      consultas(false)
      const { container } = renderizarRota(rota)
      expect(container.querySelector('[data-cortina]')).toBeNull()
      expect(emEspera(container, false)).toEqual([])
    })
  }
})

describe('primeira visita', () => {
  for (const rota of ROTAS) {
    const abre = COM_CORTINA.includes(rota)
    it(
      abre
        ? `${rota}: a cortina roda e só a cena da abertura espera; o resto do <main> está no estado final`
        : `${rota}: nada no <main> espera`,
      () => {
        consultas(false)
        const { container } = renderizarRota(rota)
        if (abre) expect(container.querySelector('[data-cortina]')).not.toBeNull()
        // Controle negativo: a cena da abertura (M8) nasce com opacity 0 sob a cortina.
        if (abre) expect(emEspera(container, false).length).toBeGreaterThan(0)
        expect(emEspera(container, abre)).toEqual([])
      },
    )
  }
})

describe('movimento reduzido', () => {
  for (const rota of ROTAS) {
    it(`${rota}: sem cortina e sem nada à espera no <main>`, () => {
      consultas(true)
      const { container } = renderizarRota(rota)
      expect(container.querySelector('[data-cortina]')).toBeNull()
      expect(emEspera(container, false)).toEqual([])
    })
  }
})
