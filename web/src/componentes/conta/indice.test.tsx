import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { pastaSrcDe } from '../../teste/fontes.ts'
import { renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { margemDoIndice } from './indice.ts'

// R6 do revisor da 37a, aplicada ao índice novo da Conta (MAT-44d-3): o observador do índice nunca
// desfaz o item ativo depois de um clique, de uma entrada por `#id` ou de uma rolagem. Os testes usam
// um IntersectionObserver falso que entrega a leitura DEPOIS do clique, com o `scroll` da navegação
// no meio. Nenhum deles passa por falta de dado: sem observador, sem uma das 6 seções ou com
// `scrollHeight` 0, a abertura da tela já falha.

const ITENS = [
  ['Perfil', 'perfil'],
  ['Id da conta', 'id-conta'],
  ['Seus dados', 'exportar'],
  ['Privacidade', 'privacidade'],
  ['Sair', 'sair'],
  ['Excluir conta', 'excluir-conta'],
] as const

const ALTURA_DA_PAGINA = 2700
const JANELA = 900

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
  /** Entrega a leitura: só as seções de `visiveis` cruzam a faixa. */
  avisar(visiveis: Element[]) {
    const entradas = this.observados.map((alvo) => ({ target: alvo, isIntersecting: visiveis.includes(alvo) }))
    this.chamar(entradas as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
  }
}

const alturaOriginal = window.innerHeight
function definirAltura(altura: number) {
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: altura })
}

// O jsdom não rola nem mede: `scrollY`, `innerHeight` e `scrollHeight` são dados por aqui.
const scrollYOriginal = Object.getOwnPropertyDescriptor(window, 'scrollY')
function definirRolagem(rolado: number, janela = JANELA, total = ALTURA_DA_PAGINA) {
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: rolado })
  definirAltura(janela)
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: total })
}
const noFim = () => definirRolagem(ALTURA_DA_PAGINA - JANELA)
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
  delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView
})

const titulo = () => screen.findByRole('heading', { level: 1, name: 'Conta' })
const indice = () => within(screen.getByRole('navigation', { name: 'Nesta página' }))
const clicar = (nome: string) => fireEvent.click(indice().getByRole('link', { name: nome }))

function secao(id: string): HTMLElement {
  const alvo = document.getElementById(id)?.closest('section')
  if (!alvo) throw new Error(`a seção #${id} não existe na tela`)
  return alvo
}

/** O texto do único item ativo; falha se não houver exatamente um `aria-current="location"`. */
function atual(): string {
  const ativos = document.querySelectorAll('nav[aria-label="Nesta página"] [aria-current]')
  expect(ativos, 'um só item ativo').toHaveLength(1)
  expect(ativos[0].getAttribute('aria-current')).toBe('location')
  return ativos[0].textContent ?? ''
}

/** Abre a Conta com o observador falso e confere que há dado de verdade para os testes usarem. */
async function abrir(caminho = '/app/conta') {
  vi.stubGlobal('IntersectionObserver', ObservadorFalso)
  // A janela já tem a altura de 900 quando o observador nasce (a margem dele sai dela).
  definirAltura(JANELA)
  const renderizado = renderizarComDados(caminho, { sessao: 'juliana' })
  await titulo()
  await waitFor(() => expect(ObservadorFalso.todos.length).toBeGreaterThan(0))
  const observador = ObservadorFalso.todos.at(-1)!
  expect(observador.observados, 'o observador observa as 6 seções').toHaveLength(ITENS.length)
  for (const [, id] of ITENS) expect(secao(id)).toBeTruthy()
  expect(indice().getAllByRole('link').map((link) => link.textContent)).toEqual(ITENS.map(([rotulo]) => rotulo))
  definirRolagem(0)
  expect(document.documentElement.scrollHeight).toBeGreaterThan(0)
  return { ...renderizado, observador }
}

const outraQue = (id: string) => ITENS.find(([, outra]) => outra !== id)![1]

describe('margemDoIndice: a faixa observada em pixels', () => {
  it('observa o terço de cima: a margem de baixo é dois terços da altura real da janela, em px', () => {
    expect(margemDoIndice(900)).toBe('0px 0px -600px 0px')
    expect(margemDoIndice(768)).toBe('0px 0px -512px 0px')
    expect(margemDoIndice(844)).toBe('0px 0px -563px 0px')
  })

  it('nunca usa percentual (ele vale sobre a largura da raiz: em 1440 × 900, −66% virava −950 px)', () => {
    for (const altura of [320, 568, 768, 900, 1080, 2160]) {
      expect(margemDoIndice(altura)).not.toContain('%')
      expect(margemDoIndice(altura)).toMatch(/^0px 0px -\d+px 0px$/)
    }
  })

  it('a faixa que sobra tem sempre um terço da altura', () => {
    for (const altura of [500, 768, 900, 1440]) {
      const baixo = Number(/-(\d+)px 0px$/.exec(margemDoIndice(altura))![1])
      expect(altura - baixo).toBeGreaterThanOrEqual(Math.floor(altura / 3))
      expect(altura - baixo).toBeLessThanOrEqual(Math.ceil(altura / 3) + 1)
    }
  })
})

describe('o observador do índice: faixa, resize e desmonte', () => {
  it('nasce com a margem calculada pela altura real da janela', async () => {
    definirAltura(900)
    const { observador } = await abrir()
    expect(observador.opcoes?.rootMargin).toBe('0px 0px -600px 0px')
  })

  it('no resize que muda a altura, o observador antigo sai e o novo leva a margem nova com as mesmas seções', async () => {
    const { observador: antigo } = await abrir()

    definirAltura(768)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    const novo = ObservadorFalso.todos.at(-1)!
    expect(novo).not.toBe(antigo)
    expect(antigo.desconectado).toBe(true)
    expect(novo.desconectado).toBe(false)
    expect(novo.opcoes?.rootMargin).toBe('0px 0px -512px 0px')
    expect(novo.observados).toHaveLength(ITENS.length)
  })

  it('um resize que não muda a altura não recria o observador', async () => {
    await abrir()
    const total = ObservadorFalso.todos.length

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(ObservadorFalso.todos).toHaveLength(total)
  })

  it('ao desmontar, o observador sai e todos os ouvintes saem, os mesmos que entraram', async () => {
    const colocar = vi.spyOn(window, 'addEventListener')
    const retirar = vi.spyOn(window, 'removeEventListener')
    const { unmount, observador } = await abrir()
    const tipos = ['resize', 'scroll', 'wheel', 'touchmove', 'keydown', 'pointerdown']
    const postos = new Map(tipos.map((tipo) => [tipo, colocar.mock.calls.find(([t]) => t === tipo)]))
    for (const tipo of tipos) expect(postos.get(tipo), `${tipo} posto`).toBeDefined()
    expect(postos.get('scroll')![2]).toEqual({ passive: true })
    expect(postos.get('wheel')![2]).toEqual({ passive: true })
    expect(postos.get('touchmove')![2]).toEqual({ passive: true })
    const total = ObservadorFalso.todos.length

    unmount()

    expect(observador.desconectado).toBe(true)
    for (const tipo of tipos) {
      const tirado = retirar.mock.calls.find(([t]) => t === tipo)
      expect(tirado, `${tipo} tirado`).toBeDefined()
      expect(tirado![1], `${tipo} é o mesmo ouvinte`).toBe(postos.get(tipo)![1])
    }
    definirAltura(600)
    window.dispatchEvent(new Event('resize'))
    expect(ObservadorFalso.todos).toHaveLength(total)
  })

  it('sem IntersectionObserver (o jsdom puro), não há ouvinte nenhum e o ativo segue sendo Perfil', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const colocar = vi.spyOn(window, 'addEventListener')
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await titulo()

    for (const tipo of ['resize', 'scroll', 'wheel', 'touchmove', 'keydown', 'pointerdown']) {
      expect(colocar.mock.calls.some(([t]) => t === tipo), tipo).toBe(false)
    }
    expect(atual()).toBe('Perfil')
  })
})

describe('o índice no fim da página', () => {
  it('no fim, as últimas seções ficam todas visíveis e nenhuma chega à faixa: o ativo é o último da ordem', async () => {
    const { observador } = await abrir()
    definirRolagem(1000)
    act(() => observador.avisar([secao('privacidade')]))
    expect(atual()).toBe('Privacidade')

    noFim()
    rolar()

    expect(atual()).toBe('Excluir conta')
  })

  it('a folga de 2 px conta como fim; 3 px acima do fim, não', async () => {
    const { observador } = await abrir()
    definirRolagem(1000, JANELA, 1902)
    act(() => observador.avisar([secao('exportar')]))
    rolar()
    expect(atual()).toBe('Excluir conta')

    definirRolagem(1000, JANELA, 1903)
    rolar()
    expect(atual()).toBe('Seus dados')
  })

  it('ao sair do fim, volta a última leitura do observador', async () => {
    const { observador } = await abrir()
    definirRolagem(300)
    act(() => observador.avisar([secao('exportar')]))
    expect(atual()).toBe('Seus dados')

    noFim()
    rolar()
    expect(atual()).toBe('Excluir conta')

    definirRolagem(1200)
    rolar()
    expect(atual()).toBe('Seus dados')
  })

  it('no fim, um aviso do observador não tira a última seção', async () => {
    const { observador } = await abrir()
    noFim()
    rolar()
    act(() => observador.avisar([secao('privacidade')]))
    expect(atual()).toBe('Excluir conta')

    definirRolagem(1200)
    rolar()
    expect(atual()).toBe('Privacidade')
  })
})

// R6-click: o destino de um clique fica TRAVADO até a pessoa rolar por conta própria. Nem o scroll
// que a navegação causa nem o aviso tardio do observador o desfazem.
describe('R6: o clique trava o destino, a partir do topo e a partir do fim, em cada item', () => {
  for (const posicao of ['topo', 'fim'] as const) {
    for (const [rotulo, id] of ITENS) {
      it(`${rotulo}, a partir do ${posicao}: o scroll da navegação e a leitura tardia do observador não o desfazem`, async () => {
        const { observador } = await abrir()
        if (posicao === 'fim') {
          noFim()
          rolar()
          expect(atual()).toBe('Excluir conta')
        } else {
          act(() => observador.avisar([secao('perfil')]))
          expect(atual()).toBe('Perfil')
        }

        clicar(rotulo)
        expect(atual()).toBe(rotulo)

        // O scroll que a navegação causa (a página anda até a seção).
        definirRolagem(posicao === 'fim' ? 1200 : 700)
        rolar()
        expect(atual()).toBe(rotulo)

        // A leitura TARDIA: o observador entrega uma seção que não é a clicada.
        act(() => observador.avisar([secao(outraQue(id))]))
        expect(atual()).toBe(rotulo)

        // E cada uma das seções, uma depois da outra, depois de outro scroll.
        for (const [, outra] of ITENS) {
          rolar()
          act(() => observador.avisar([secao(outra)]))
          expect(atual()).toBe(rotulo)
        }

        // Se a navegação termina no fim da página, o scroll de lá também não o desfaz.
        noFim()
        rolar()
        expect(atual()).toBe(rotulo)
      })
    }
  }

  it('cliques em sequência: cada destino sobrevive ao aviso tardio, e o seguinte o substitui', async () => {
    const { observador } = await abrir()
    act(() => observador.avisar([secao('perfil')]))

    for (const [rotulo, id] of [ITENS[3], ITENS[5], ITENS[0], ITENS[4]]) {
      clicar(rotulo)
      definirRolagem(900)
      rolar()
      act(() => observador.avisar([secao(outraQue(id))]))
      expect(atual()).toBe(rotulo)
    }
  })

  it('o aviso do observador fica guardado: ao soltar a trava, o scroll aplica a última leitura', async () => {
    const { observador } = await abrir()
    clicar('Privacidade')
    act(() => observador.avisar([secao('exportar')]))
    expect(atual()).toBe('Privacidade')

    act(() => {
      window.dispatchEvent(new Event('wheel'))
    })
    definirRolagem(400)
    rolar()

    expect(atual()).toBe('Seus dados')
  })

  it('o resize que muda a altura recria o observador e a leitura do novo também não desfaz o destino', async () => {
    const { observador: antigo } = await abrir()
    clicar('Seus dados')

    definirAltura(768)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    const novo = ObservadorFalso.todos.at(-1)!
    expect(novo).not.toBe(antigo)
    expect(novo.observados).toHaveLength(ITENS.length)
    expect(atual()).toBe('Seus dados')

    act(() => novo.avisar([secao('perfil')]))
    expect(atual()).toBe('Seus dados')

    rolar()
    expect(atual()).toBe('Seus dados')
  })

  describe('a trava solta com entrada da pessoa e só com ela', () => {
    const soltadores: Array<[string, () => Event]> = [
      ['roda do mouse', () => new Event('wheel')],
      ['toque', () => new Event('touchmove')],
      ['seta para baixo', () => new KeyboardEvent('keydown', { key: 'ArrowDown' })],
      ['seta para cima', () => new KeyboardEvent('keydown', { key: 'ArrowUp' })],
      ['PageDown', () => new KeyboardEvent('keydown', { key: 'PageDown' })],
      ['PageUp', () => new KeyboardEvent('keydown', { key: 'PageUp' })],
      ['Home', () => new KeyboardEvent('keydown', { key: 'Home' })],
      ['End', () => new KeyboardEvent('keydown', { key: 'End' })],
      ['espaço', () => new KeyboardEvent('keydown', { key: ' ' })],
    ]

    for (const [nome, evento] of soltadores) {
      it(`${nome}: o observador volta a mandar`, async () => {
        const { observador } = await abrir()
        clicar('Excluir conta')
        act(() => observador.avisar([secao('exportar')]))
        expect(atual()).toBe('Excluir conta')

        act(() => {
          window.dispatchEvent(evento())
        })
        act(() => observador.avisar([secao('exportar')]))

        expect(atual()).toBe('Seus dados')
      })
    }

    it('a rolagem livre depois da trava: solta a trava e segue o que o observador e o fim da página dizem', async () => {
      const { observador } = await abrir()
      clicar('Sair')
      act(() => observador.avisar([secao('perfil')]))
      expect(atual()).toBe('Sair')

      act(() => {
        window.dispatchEvent(new Event('wheel'))
      })
      definirRolagem(200)
      rolar()
      expect(atual()).toBe('Perfil')

      noFim()
      rolar()
      expect(atual()).toBe('Excluir conta')
    })

    it('apertar o botão do mouse na barra de rolagem (fora da área do documento) solta; dentro dela, não', async () => {
      const { observador } = await abrir()
      Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1425 })
      Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 900 })
      try {
        clicar('Excluir conta')

        act(() => {
          window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 300, clientY: 300 }))
        })
        act(() => observador.avisar([secao('exportar')]))
        expect(atual()).toBe('Excluir conta')

        act(() => {
          window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 1432, clientY: 300 }))
        })
        act(() => observador.avisar([secao('exportar')]))
        expect(atual()).toBe('Seus dados')
      } finally {
        delete (document.documentElement as unknown as Record<string, unknown>).clientWidth
        delete (document.documentElement as unknown as Record<string, unknown>).clientHeight
      }
    })

    it('tecla que não rola (Tab, Enter, letra, Shift) não solta a trava', async () => {
      const { observador } = await abrir()
      clicar('Excluir conta')

      for (const tecla of ['Tab', 'Enter', 'a', 'Shift']) {
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: tecla }))
        })
      }
      act(() => observador.avisar([secao('exportar')]))

      expect(atual()).toBe('Excluir conta')
    })

    it('seta ou espaço dentro de um campo de texto não solta a trava (a tecla não rola a página)', async () => {
      const { observador } = await abrir()
      clicar('Excluir conta')
      const campo = screen.getByLabelText('Seu nome', { selector: 'input' })

      fireEvent.keyDown(campo, { key: 'ArrowDown' })
      fireEvent.keyDown(campo, { key: ' ' })
      act(() => observador.avisar([secao('exportar')]))

      expect(atual()).toBe('Excluir conta')
    })

    it('depois de soltar, um clique novo trava de novo', async () => {
      const { observador } = await abrir()
      clicar('Excluir conta')
      act(() => {
        window.dispatchEvent(new Event('wheel'))
      })
      clicar('Privacidade')
      act(() => observador.avisar([secao('exportar')]))
      expect(atual()).toBe('Privacidade')
    })
  })
})

describe('R6: a entrada por #id trava o destino como um clique', () => {
  for (const [rotulo, id] of ITENS) {
    it(`/app/conta#${id}: "${rotulo}" fica ativo; o scroll da entrada e a leitura tardia não o desfazem; a rolagem livre solta`, async () => {
      Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() })
      const { observador } = await abrir(`/app/conta#${id}`)

      await waitFor(() => expect(atual()).toBe(rotulo))
      definirRolagem(300)
      rolar()
      expect(atual()).toBe(rotulo)
      act(() => observador.avisar([secao(outraQue(id))]))
      expect(atual()).toBe(rotulo)

      act(() => {
        window.dispatchEvent(new Event('wheel'))
      })
      act(() => observador.avisar([secao(outraQue(id))]))
      expect(atual()).toBe(ITENS.find(([, i]) => i === outraQue(id))![0])
    })
  }

  it('um hash que não é de seção não trava nada: o ativo segue Perfil', async () => {
    const { observador } = await abrir('/app/conta#desconhecido')
    expect(atual()).toBe('Perfil')

    act(() => observador.avisar([secao('exportar')]))
    expect(atual()).toBe('Seus dados')
  })
})

// Defeito achado no navegador real: o clique num link `#id` mudava a localização e o
// `useFocoNoTitulo` devolvia a página ao topo e o foco ao `h1`, desfazendo a rolagem. Os links do
// índice têm de ROLAR até a seção e focar o título dela.
describe('cada item do índice rola até a seção, foca o título dela e a marca', () => {
  const focado = () => document.activeElement?.id

  function espiarRolagem() {
    const rolagem = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: rolagem })
    return rolagem
  }

  for (const [rotulo, id] of ITENS) {
    it(`${rotulo}: scrollIntoView no título, foco nele, um só aria-current e nenhum scrollTo(0, 0)`, async () => {
      const rolagem = espiarRolagem()
      const { rolarAoTopo } = await abrir()
      rolarAoTopo.mockClear()
      rolagem.mockClear()

      clicar(rotulo)

      await waitFor(() => expect(focado()).toBe(id))
      const alvo = document.getElementById(id)!
      expect(alvo.tagName).toBe('H2')
      expect(rolagem.mock.contexts).toContain(alvo)
      expect(rolarAoTopo).not.toHaveBeenCalled()
      expect(document.activeElement?.tagName).not.toBe('H1')
      expect(atual()).toBe(rotulo)
      expect(indice().getByRole('link', { name: rotulo }).getAttribute('aria-current')).toBe('location')
      expect(alvo.getAttribute('tabindex')).toBe('-1')
    })

    it(`${rotulo}: entrar por /app/conta#${id} faz o mesmo`, async () => {
      const rolagem = espiarRolagem()
      const { rolarAoTopo } = await abrir(`/app/conta#${id}`)

      await waitFor(() => expect(focado()).toBe(id))
      expect(rolagem.mock.contexts).toContain(document.getElementById(id)!)
      expect(rolarAoTopo).not.toHaveBeenCalled()
      expect(atual()).toBe(rotulo)
    })
  }

  it('Ctrl+clique deixa o navegador abrir o link: a tela não rola nem foca', async () => {
    const rolagem = espiarRolagem()
    await abrir()
    rolagem.mockClear()

    fireEvent.click(indice().getByRole('link', { name: 'Privacidade' }), { ctrlKey: true })

    expect(rolagem).not.toHaveBeenCalled()
    expect(atual()).toBe('Perfil')
  })

  it('um hash que não é de seção não marca nada', async () => {
    await abrir()
    expect(atual()).toBe('Perfil')
  })
})

// Em 768 ou mais o índice acompanha a rolagem: um `nav` filho do `main`, de altura da lista, puxado
// para cima pela margem negativa (não ocupa espaço), com a lista `position: sticky` dentro de uma
// caixa tão alta quanto o `main` ocupa. Abaixo de 768 fica na abertura, em linha, antes do fio.
describe('onde o índice mora', () => {
  function larguraDoComputador(largo: boolean) {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: largo && consulta.includes('min-width'),
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      onchange: null,
      dispatchEvent: () => false,
    }))
  }

  it('abaixo de 768 (e sem matchMedia) o índice fica dentro da abertura, antes do fio', async () => {
    larguraDoComputador(false)
    await abrir()

    const nav = screen.getByRole('navigation', { name: 'Nesta página' })
    expect(nav.closest('.sb-abertura')).not.toBeNull()
    expect(screen.getAllByRole('navigation', { name: 'Nesta página' })).toHaveLength(1)
    expect(nav.parentElement?.tagName).not.toBe('MAIN')
  })

  it('a partir de 768 o índice é o primeiro filho do main, fora da abertura, e continua um só', async () => {
    larguraDoComputador(true)
    const { container } = await abrir()

    const nav = screen.getByRole('navigation', { name: 'Nesta página' })
    expect(screen.getAllByRole('navigation', { name: 'Nesta página' })).toHaveLength(1)
    expect(nav.parentElement).toBe(container.querySelector('main'))
    expect(container.querySelector('main')!.firstElementChild).toBe(nav)
    expect(nav.closest('.sb-abertura')).toBeNull()
    expect(nav.querySelector('ul.sb-abertura-lateral')).not.toBeNull()
    expect(nav.querySelectorAll('a[href^="#"]')).toHaveLength(ITENS.length)
  })

  it('nos dois lugares o índice se comporta igual: o clique trava e a leitura tardia não o desfaz', async () => {
    larguraDoComputador(true)
    const { observador } = await abrir()

    clicar('Privacidade')
    definirRolagem(900)
    rolar()
    act(() => observador.avisar([secao('perfil')]))

    expect(atual()).toBe('Privacidade')
  })
})

// O sticky do índice (MAT-44d-3, passo 4). O jsdom não tem layout, então o comportamento real (o
// primeiro item preso em 72, nenhum link coberto pelo cabeçalho) é das sondas no Chrome. Aqui se
// proíbe a CAUSA do defeito medido: o recuo de cima da lista era a margem dela, que colapsa para fora
// do `nav` (sem padding, borda nem contexto de bloco), e o `nav` prendia no `top` sem o recuo: a
// lista ficava em y = 8, sob o cabeçalho de 64 px.
describe('o CSS do índice sticky', () => {
  const css = readFileSync(pastaSrcDe(import.meta.url) + '../../index.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

  /** As declarações da regra de seletor exato, na faixa de 768 para cima (a que tem o sticky). */
  function declaracoes(seletor: string) {
    const achados = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].trim() === seletor)
    const regra = achados.find((m) => m[2].includes('margin') || m[2].includes('position'))
    expect(regra, `regra ${seletor}`).toBeDefined()
    return Object.fromEntries(
      regra![2]
        .split(';')
        .map((d) => d.split(/:(.*)/s).map((p) => p.trim()))
        .filter((par) => par[0]),
    ) as Record<string, string>
  }

  const nav = declaracoes('.conta-indice-ao-lado')
  const lista = declaracoes('.conta-indice-ao-lado > .conta-indice-lista')

  it('o recuo de cima é o padding do nav, na variável do h1, e não a margem da lista', () => {
    expect(nav.position).toBe('sticky')
    expect(nav['padding-top']).toBe('var(--e-cab-h1)')
    expect(nav['box-sizing']).toBe('border-box')
    // A margem de cima da lista tem de ser 0: qualquer valor ali colapsa para fora do nav.
    expect(lista['margin-top'] ?? lista.margin.split(/\s+/)[0]).toBe('0')
    expect(lista.margin).not.toMatch(/--e-cab-h1/)
  })

  it('o top prende o recuo sob o cabeçalho (cabeçalho + 8 − recuo) e a altura soma o recuo e as 6 âncoras', () => {
    expect(nav.top).toBe('calc(var(--e-cabecalho) + 8px - var(--e-cab-h1))')
    expect(nav.height).toBe('calc(var(--e-cab-h1) + 192px)')
    expect(nav['margin-bottom']).toBe('calc(-1 * (var(--e-cab-h1) + 192px))')
  })

  it('nenhum valor do recuo é um número fixo: acompanha o h1 em todas as faixas', () => {
    expect(nav.top).not.toMatch(/(?<![\w-])\d+px\s*-\s*\d+px/)
    expect(nav['padding-top']).not.toMatch(/\d+px/)
  })
})

// O espaço entre as âncoras em linha (MAT-44d-3, defeito D-3). O jsdom não tem layout: o espaço visto
// é medido no Chrome (A-2 em 390, entre os retângulos do texto). Aqui se proíbe a CAUSA: o alvo de
// toque (`.alvo-toque`, `min-width: 44px`) fazia a caixa de uma âncora curta ("Sair", "Perfil") passar
// do texto, e o vão até a vizinha crescia só nela (24 px contra 38 em Privacidade → Sair → Excluir
// conta). Em 390 a largura da caixa passa a ser a do texto mais um recuo à direita que a margem
// negativa devolve ao fluxo: o alvo cresce para dentro do vão, e o vão visto fica o mesmo em todas.
describe('o CSS das âncoras do índice em linha (390)', () => {
  const css = readFileSync(pastaSrcDe(import.meta.url) + '../../index.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const SELETOR = '.conta-indice-lista > li > a'

  const regra = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => m[1].trim() === SELETOR)
  const declaracoes = Object.fromEntries(
    (regra?.[2] ?? '')
      .split(';')
      .map((d) => d.split(/:(.*)/s).map((p) => p.trim()))
      .filter((par) => par[0]),
  ) as Record<string, string>
  const px = (valor: string | undefined) => Number.parseFloat(valor ?? 'NaN')

  it('existe uma regra só das âncoras do índice, dentro da faixa de até 767 px', () => {
    expect(regra, `regra ${SELETOR}`).toBeDefined()
    const antes = css.slice(0, regra!.index)
    const ultimaMidia = antes.slice(antes.lastIndexOf('@media'))
    expect(ultimaMidia).toMatch(/^@media\s*\(max-width:\s*767px\)/)
  })

  it('a caixa não tem largura mínima: o texto manda no vão até a vizinha', () => {
    expect(declaracoes['min-width']).toBe('0')
  })

  it('o alvo de 44 de largura vem de um recuo à direita devolvido por uma margem negativa igual', () => {
    const recuo = px(declaracoes['padding-inline-end'])
    const margem = px(declaracoes['margin-inline-end'])
    expect(recuo).toBeGreaterThan(0)
    expect(margem).toBe(-recuo)
    // "Sair" tem ≈ 30 px de texto: com o recuo a caixa passa dos 44 do alvo de toque.
    expect(30 + recuo).toBeGreaterThanOrEqual(44)
  })

  it('o vão entre os itens continua o `column-gap` da lista e a altura do item não muda', () => {
    const lista = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => m[1].trim() === '.conta-indice-lista' && m[2].includes('column-gap'))
    expect(lista?.[2]).toMatch(/column-gap:\s*24px/)
    const item = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => m[1].trim() === '.conta-indice-lista > li' && m[2].includes('height: 44px'))
    expect(item).toBeDefined()
  })
})
