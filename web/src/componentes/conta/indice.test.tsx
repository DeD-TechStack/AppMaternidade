import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { margemDoIndice } from './indice.ts'

// R6 do revisor: um percentual vertical de `rootMargin` usa a LARGURA da raiz, não a altura. Em
// 1440 × 900 o `-66%` virava −950 px e eliminava a faixa observada. A faixa passa a ser calculada
// em pixels, a partir da altura real da janela, e recalculada no resize.

class ObservadorFalso {
  static todos: ObservadorFalso[] = []
  observados: Element[] = []
  desconectado = false
  chamar: IntersectionObserverCallback
  opcoes: IntersectionObserverInit | undefined
  constructor(chamar: IntersectionObserverCallback, opcoes?: IntersectionObserverInit) {
    this.chamar = chamar
    this.opcoes = opcoes
    ObservadorFalso.todos.push(this)
  }
  observe = (alvo: Element) => {
    this.observados.push(alvo)
  }
  unobserve = () => undefined
  disconnect = () => {
    this.desconectado = true
  }
  takeRecords = () => []
  avisar(visiveis: Element[]) {
    const entradas = this.observados.map((alvo) => ({ target: alvo, isIntersecting: visiveis.includes(alvo) }))
    this.chamar(entradas as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
  }
}

const alturaOriginal = window.innerHeight
function definirAltura(altura: number) {
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: altura })
}

// A rolagem simulada: o jsdom não rola nem mede, então `scrollY`, `innerHeight` e `scrollHeight`
// são dados por aqui. Em jsdom puro `scrollHeight` é 0 e a janela já "está no fim".
const scrollYOriginal = Object.getOwnPropertyDescriptor(window, 'scrollY')
function definirRolagem(rolado: number, janela: number, total: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: rolado })
  definirAltura(janela)
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: total })
}
function rolar() {
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

beforeEach(() => {
  ObservadorFalso.todos = []
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  definirAltura(alturaOriginal)
  if (scrollYOriginal) Object.defineProperty(window, 'scrollY', scrollYOriginal)
  delete (document.documentElement as unknown as Record<string, unknown>).scrollHeight
})

describe('margemDoIndice: a faixa observada em pixels', () => {
  it('observa só o terço de cima: a margem de baixo é dois terços da altura da janela, em px', () => {
    expect(margemDoIndice(900)).toBe('0px 0px -600px 0px')
    expect(margemDoIndice(768)).toBe('0px 0px -512px 0px')
    expect(margemDoIndice(844)).toBe('0px 0px -563px 0px')
  })

  it('nunca usa percentual', () => {
    for (const altura of [320, 568, 768, 900, 1080, 2160]) {
      expect(margemDoIndice(altura)).not.toContain('%')
      expect(margemDoIndice(altura)).toMatch(/^0px 0px -\d+px 0px$/)
    }
  })

  it('a faixa que sobra tem sempre um terço da altura (a margem nunca come a janela)', () => {
    for (const altura of [500, 768, 900, 1440]) {
      const baixo = Number(/-(\d+)px 0px$/.exec(margemDoIndice(altura))![1])
      expect(altura - baixo).toBeGreaterThanOrEqual(Math.floor(altura / 3))
      expect(altura - baixo).toBeLessThanOrEqual(Math.ceil(altura / 3) + 1)
    }
  })
})

describe('o observador do índice da Conta', () => {
  const titulo = () => screen.findByRole('heading', { level: 1, name: 'Conta' })

  it('nasce com a margem calculada pela altura real da janela', async () => {
    definirAltura(900)
    vi.stubGlobal('IntersectionObserver', ObservadorFalso)
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo()
    await waitFor(() => expect(ObservadorFalso.todos.length).toBeGreaterThan(0))

    expect(ObservadorFalso.todos.at(-1)!.opcoes?.rootMargin).toBe('0px 0px -600px 0px')
  })

  it('no resize recalcula a faixa: o observador antigo sai e o novo leva a margem nova', async () => {
    definirAltura(900)
    vi.stubGlobal('IntersectionObserver', ObservadorFalso)
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo()
    await waitFor(() => expect(ObservadorFalso.todos.length).toBeGreaterThan(0))
    const antigo = ObservadorFalso.todos.at(-1)!

    definirAltura(768)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    const novo = ObservadorFalso.todos.at(-1)!
    expect(novo).not.toBe(antigo)
    expect(antigo.desconectado).toBe(true)
    expect(novo.desconectado).toBe(false)
    expect(novo.opcoes?.rootMargin).toBe('0px 0px -512px 0px')
    expect(novo.observados).toHaveLength(antigo.observados.length)
  })

  it('um resize que não muda a altura não recria o observador', async () => {
    definirAltura(900)
    vi.stubGlobal('IntersectionObserver', ObservadorFalso)
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo()
    await waitFor(() => expect(ObservadorFalso.todos.length).toBeGreaterThan(0))
    const total = ObservadorFalso.todos.length

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(ObservadorFalso.todos).toHaveLength(total)
  })

  it('ao desmontar, o observador sai e o ouvinte de resize também', async () => {
    definirAltura(900)
    vi.stubGlobal('IntersectionObserver', ObservadorFalso)
    const retirar = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo()
    await waitFor(() => expect(ObservadorFalso.todos.length).toBeGreaterThan(0))
    const observador = ObservadorFalso.todos.at(-1)!
    const total = ObservadorFalso.todos.length

    unmount()

    expect(observador.desconectado).toBe(true)
    expect(retirar.mock.calls.some(([tipo]) => tipo === 'resize')).toBe(true)
    definirAltura(600)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(ObservadorFalso.todos).toHaveLength(total)
    retirar.mockRestore()
  })

  it('sem IntersectionObserver (o jsdom), não há ouvinte de resize nem erro', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const colocar = vi.spyOn(window, 'addEventListener')
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo()

    expect(colocar.mock.calls.some(([tipo]) => tipo === 'resize')).toBe(false)
    expect(document.querySelector('nav[aria-label="Nesta página"] [aria-current]')!.textContent).toBe('Perfil')
    colocar.mockRestore()
  })
})

// Medido no navegador: no fim da página "Privacidade", "Sair" e "Excluir conta" ficam todas
// visíveis e nenhuma chega ao terço de cima, então o índice ficava parado numa das primeiras.
// No fim da página a seção ativa é a última; ao sair do fim, vale de novo o que o observador disse.
describe('o índice da Conta no fim da página', () => {
  const titulo = () => screen.findByRole('heading', { level: 1, name: 'Conta' })
  const atual = () => document.querySelector('nav[aria-label="Nesta página"] [aria-current]')!.textContent
  const secao = (id: string) => document.getElementById(id)!.closest('section')!

  async function abrir() {
    vi.stubGlobal('IntersectionObserver', ObservadorFalso)
    const resultado = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo()
    await waitFor(() => expect(ObservadorFalso.todos.length).toBeGreaterThan(0))
    return { ...resultado, observador: ObservadorFalso.todos.at(-1)! }
  }

  it('no fim da página, a última seção fica ativa', async () => {
    const { observador } = await abrir()
    definirRolagem(1800, 900, 2700)
    act(() => observador.avisar([secao('privacidade')]))
    expect(atual()).toBe('Privacidade')

    definirRolagem(1800, 900, 2700)
    rolar()

    expect(atual()).toBe('Excluir conta')
    expect(document.querySelectorAll('nav[aria-label="Nesta página"] [aria-current]')).toHaveLength(1)
  })

  it('a folga de 2 px conta como fim; 3 px acima do fim, não', async () => {
    const { observador } = await abrir()
    definirRolagem(1000, 900, 1902)
    act(() => observador.avisar([secao('exportar')]))
    rolar()
    expect(atual()).toBe('Excluir conta')

    definirRolagem(1000, 900, 1903)
    rolar()
    expect(atual()).toBe('Seus dados')
  })

  it('ao sair do fim, volta a seção que o observador tinha dito', async () => {
    const { observador } = await abrir()
    definirRolagem(300, 900, 2700)
    act(() => observador.avisar([secao('exportar')]))
    expect(atual()).toBe('Seus dados')

    definirRolagem(1800, 900, 2700)
    rolar()
    expect(atual()).toBe('Excluir conta')

    definirRolagem(1200, 900, 2700)
    rolar()
    expect(atual()).toBe('Seus dados')
  })

  it('no fim, um aviso do observador não tira a última seção', async () => {
    const { observador } = await abrir()
    definirRolagem(1800, 900, 2700)
    rolar()
    expect(atual()).toBe('Excluir conta')

    act(() => observador.avisar([secao('privacidade')]))
    expect(atual()).toBe('Excluir conta')

    definirRolagem(1200, 900, 2700)
    rolar()
    expect(atual()).toBe('Privacidade')
  })

  it('o clique manda por 600 ms; depois disso o scroll decide de novo', async () => {
    await abrir()
    definirRolagem(1800, 900, 2700)
    const agora = vi.spyOn(Date, 'now')
    agora.mockReturnValue(10_000)
    rolar()
    expect(atual()).toBe('Excluir conta')

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Nesta página' })).getByRole('link', { name: 'Privacidade' }))
    expect(atual()).toBe('Privacidade')

    agora.mockReturnValue(10_300)
    rolar()
    expect(atual()).toBe('Privacidade')

    agora.mockReturnValue(10_700)
    rolar()
    expect(atual()).toBe('Excluir conta')
  })

  it('o clique fora do fim também segura o destaque pelos 600 ms', async () => {
    const { observador } = await abrir()
    definirRolagem(300, 900, 2700)
    act(() => observador.avisar([secao('perfil')]))
    const agora = vi.spyOn(Date, 'now')
    agora.mockReturnValue(5_000)

    fireEvent.click(within(screen.getByRole('navigation', { name: 'Nesta página' })).getByRole('link', { name: 'Sair' }))
    definirRolagem(1800, 900, 2700)
    agora.mockReturnValue(5_200)
    rolar()
    expect(atual()).toBe('Sair')

    agora.mockReturnValue(5_601)
    rolar()
    expect(atual()).toBe('Excluir conta')
  })

  it('o ouvinte de scroll é passivo e sai no desmonte, junto com o de resize', async () => {
    const colocar = vi.spyOn(window, 'addEventListener')
    const retirar = vi.spyOn(window, 'removeEventListener')
    vi.stubGlobal('IntersectionObserver', ObservadorFalso)
    const { unmount } = renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo()
    await waitFor(() => expect(ObservadorFalso.todos.length).toBeGreaterThan(0))

    const posto = colocar.mock.calls.find(([tipo]) => tipo === 'scroll')
    expect(posto).toBeDefined()
    expect(posto![2]).toEqual({ passive: true })

    unmount()

    const tirado = retirar.mock.calls.find(([tipo]) => tipo === 'scroll')
    expect(tirado).toBeDefined()
    expect(tirado![1]).toBe(posto![1])
    expect(retirar.mock.calls.some(([tipo]) => tipo === 'resize')).toBe(true)
  })

  it('sem IntersectionObserver (o jsdom), não há ouvinte de scroll e o ativo segue Perfil', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const colocar = vi.spyOn(window, 'addEventListener')
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo()

    definirRolagem(1800, 900, 2700)
    rolar()

    expect(colocar.mock.calls.some(([tipo]) => tipo === 'scroll')).toBe(false)
    expect(atual()).toBe('Perfil')
  })

  it('a entrada em /app/conta#exportar continua focando o título de "Seus dados"', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    renderizarComDados('/app/conta#exportar', { sessao: 'juliana' })
    await titulo()

    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('exportar')))
  })
})
