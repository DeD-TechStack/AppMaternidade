import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { criarEstadoInicial, type EstadoPrototipo } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

// O jsdom não mede layout. Estes testes conferem a regra no código: a classe aplicada,
// a estrutura do DOM e as medidas simuladas. O que o navegador pinta fica para o portão visual.

const claro = (): EstadoPrototipo => criarEstadoInicial(Date.now())
const madrugada = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), madrugada: true })
const semSessao = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), sessao: null })

const CLASSE_DE_ALVO = /(^|\s)(alvo-toque|botao|nav-item)(\s|$)/

// ---------------------------------------------------------------------------
// G3-1

function semAlvoDe44(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('a, button, textarea, input, select')]
    .filter((elemento) => elemento.closest('p, [inert]') === null)
    .filter((elemento) =>
      elemento.tagName === 'TEXTAREA'
        ? !elemento.className.includes('min-h-[6rem]')
        : !CLASSE_DE_ALVO.test(elemento.className),
    )
    .map((elemento) => elemento.outerHTML)
}

describe('G3-1: alvo de toque de 44 px', () => {
  it('no Início, todo link e botão fora de parágrafo tem a classe de alvo', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    expect(semAlvoDe44(container)).toEqual([])
  })

  it('na rota inexistente também', async () => {
    const { container } = renderizarRota('/qualquer-coisa')
    await screen.findByRole('heading', { level: 1 })

    expect(semAlvoDe44(container)).toEqual([])
  })

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`no Hoje (${tema}), com a escolha de fralda e o "+ Mais" abertos`, () => {
      const { container } = renderizarRota('/app/hoje', { estadoInicial: estado() })
      expect(semAlvoDe44(container)).toEqual([])

      fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Lia' }))
      expect(semAlvoDe44(container)).toEqual([])

      fireEvent.click(screen.getByRole('button', { name: 'Xixi' }))
      fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
      expect(semAlvoDe44(container)).toEqual([])
    })

    it(`na Sessão (${tema}), com a nota e a pergunta de descarte abertas`, () => {
      const { container } = renderizarRota('/app/sessao', { estadoInicial: estado() })
      expect(semAlvoDe44(container)).toEqual([])

      fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))
      expect(semAlvoDe44(container)).toEqual([])

      fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
      expect(semAlvoDe44(container)).toEqual([])
    })
  }

  it('na Sessão vazia', () => {
    const { container } = renderizarRota('/app/sessao', { estadoInicial: semSessao() })

    expect(semAlvoDe44(container)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// G3-2

const observadores: Array<() => void> = []

class ObservadorFalso {
  constructor(aoMedir: ResizeObserverCallback) {
    observadores.push(() => aoMedir([], this as unknown as ResizeObserver))
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const alturaOriginalDaJanela = window.innerHeight
let alturaDaBarra = 0

function definirAlturaDaJanela(valor: number) {
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: valor })
}

/** Simula uma nova medida e avisa o ResizeObserver, como o navegador faria. */
function medir(barra: number, janela: number) {
  alturaDaBarra = barra
  definirAlturaDaJanela(janela)
  act(() => {
    for (const aoMedir of observadores) aoMedir()
  })
}

const paddingDeRolagem = () => document.documentElement.style.getPropertyValue('scroll-padding-bottom')

describe('G3-2: a barra de baixo só fica fixa se sobrar tela', () => {
  beforeEach(() => {
    observadores.length = 0
    vi.stubGlobal('ResizeObserver', ObservadorFalso)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({ width: 390, height: alturaDaBarra, top: 0, left: 0, right: 390, bottom: alturaDaBarra, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
    )
  })

  afterEach(() => {
    definirAlturaDaJanela(alturaOriginalDaJanela)
  })

  for (const [tela, caminho] of [
    ['Hoje', '/app/hoje'],
    ['Sessão', '/app/sessao'],
  ] as const) {
    describe(tela, () => {
      const barra = (container: HTMLElement) => container.querySelector('.barra-inferior')!

      it('com 170 px numa janela de 844 px fica fixa e reserva 178 px de rolagem', () => {
        const { container } = renderizarRota(caminho)

        medir(170, 844)

        expect(barra(container).classList.contains('barra-fixa')).toBe(true)
        expect(paddingDeRolagem()).toBe('178px')
      })

      it('com 370 px numa janela de 900 px (fonte em 200%) fica estática e não reserva rolagem', () => {
        const { container } = renderizarRota(caminho)
        medir(170, 844)

        medir(370, 900)

        expect(barra(container).classList.contains('barra-fixa')).toBe(false)
        expect(paddingDeRolagem()).toBe('')
      })

      it('com 766 px numa janela de 844 px (celular em 200%) fica estática', () => {
        const { container } = renderizarRota(caminho)

        medir(766, 844)

        expect(barra(container).classList.contains('barra-fixa')).toBe(false)
        expect(paddingDeRolagem()).toBe('')
      })

      it('volta a ficar fixa quando a janela cresce', () => {
        const { container } = renderizarRota(caminho)
        medir(300, 450)
        expect(barra(container).classList.contains('barra-fixa')).toBe(false)

        medir(300, 1000)

        expect(barra(container).classList.contains('barra-fixa')).toBe(true)
        expect(paddingDeRolagem()).toBe('308px')
      })

      it('mede de novo quando a janela muda de tamanho (resize)', () => {
        const { container } = renderizarRota(caminho)
        alturaDaBarra = 170
        definirAlturaDaJanela(844)
        act(() => {
          window.dispatchEvent(new Event('resize'))
        })
        expect(barra(container).classList.contains('barra-fixa')).toBe(true)

        definirAlturaDaJanela(400)
        act(() => {
          window.dispatchEvent(new Event('resize'))
        })

        expect(barra(container).classList.contains('barra-fixa')).toBe(false)
      })

      it('ao sair da tela, remove a reserva de rolagem', () => {
        const { unmount } = renderizarRota(caminho)
        medir(170, 844)
        expect(paddingDeRolagem()).toBe('178px')

        unmount()

        expect(paddingDeRolagem()).toBe('')
      })
    })
  }

  it('sem ResizeObserver (jsdom, navegadores muito antigos) a barra continua fixa', () => {
    vi.unstubAllGlobals()
    const { container } = renderizarRota('/app/hoje')

    expect(container.querySelector('.barra-inferior')!.classList.contains('barra-fixa')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// D2

describe('D2: telas logadas numa coluna única', () => {
  const casos: Array<[string, string, () => EstadoPrototipo]> = [
    ['Hoje', '/app/hoje', claro],
    ['Sessão com sessão', '/app/sessao', claro],
    ['Sessão vazia', '/app/sessao', semSessao],
  ]

  for (const [nome, caminho, estado] of casos) {
    it(`${nome}: faixa, main, barra e navegação ficam dentro do mesmo contêiner de coluna`, () => {
      const { container } = renderizarRota(caminho, { estadoInicial: estado() })

      const colunas = container.querySelectorAll('.coluna-app')
      expect(colunas).toHaveLength(1)
      const coluna = colunas[0]
      expect(coluna.querySelector('header')).not.toBeNull()
      expect(coluna.querySelector('main')).not.toBeNull()
      expect(coluna.querySelector('.barra-inferior')).not.toBeNull()
      expect(coluna.querySelector('.barra-inferior nav[aria-label="Principal"]')).not.toBeNull()
      // Nada de tela fica fora da coluna.
      expect(container.querySelectorAll('header, main, nav')).toHaveLength(
        coluna.querySelectorAll('header, main, nav').length,
      )
    })
  }

  it('no Hoje os botões rápidos ficam na mesma barra da navegação', () => {
    const { container } = renderizarRota('/app/hoje')

    const barra = container.querySelector('.coluna-app .barra-inferior')!
    expect(within(barra as HTMLElement).getByRole('button', { name: 'Iniciar sono de Lia' })).toBeTruthy()
    expect(within(barra as HTMLElement).getByRole('navigation', { name: 'Principal' })).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// D3

describe('D3: faixa de fatos', () => {
  it('os 4 valores usam a mesma classe de valor e nenhuma outra', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const secao = screen.getByRole('heading', { name: 'O que o app faz' }).closest('section')!
    const valores = [...secao.querySelectorAll<HTMLElement>('li > p:first-child')]
    expect(valores.map((v) => v.textContent)).toEqual(['7', 'Autoria', 'Convites', 'Lembretes'])
    expect(valores.map((v) => v.className)).toEqual(Array(4).fill('numero-fato'))
    expect(container.querySelectorAll('.numero-fato')).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// D4

function conferirGrade(grade: HTMLElement) {
  expect(grade.classList.contains('grid')).toBe(true)
  expect(grade.classList.contains('grid-cols-6')).toBe(true)
  expect(grade.classList.contains('md:grid-cols-5')).toBe(true)

  const botoes = [...grade.querySelectorAll<HTMLElement>(':scope > button')]
  expect(botoes.map((b) => b.textContent)).toEqual(['Sono', 'Mamada', 'Fralda', 'Tummy time', '+ Mais'])
  // Primeira linha: três botões de 2 colunas. Segunda linha: dois botões de 3 colunas.
  expect(botoes.map((b) => (b.classList.contains('col-span-2') ? 2 : b.classList.contains('col-span-3') ? 3 : 0))).toEqual([
    2, 2, 2, 3, 3,
  ])
  for (const botao of botoes) {
    expect(botao.classList.contains('md:col-span-1'), botao.outerHTML).toBe(true)
    expect(botao.classList.contains('whitespace-nowrap'), botao.outerHTML).toBe(true)
  }
}

describe('D4: botões rápidos com a mesma altura', () => {
  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`no Hoje (${tema}) a grade é de 6 colunas: 2+2+2 e 3+3`, () => {
      renderizarRota('/app/hoje', { estadoInicial: estado() })

      conferirGrade(screen.getByRole('button', { name: 'Iniciar sono de Lia' }).parentElement!)
    })
  }

  it('a miniatura do Início usa a mesma grade', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const sono = container.querySelector<HTMLElement>('[inert] button[aria-label="Iniciar sono de Lia"]')!
    conferirGrade(sono.parentElement!)
  })
})

// ---------------------------------------------------------------------------
// D5

const NOMES_DA_NAVEGACAO = ['Hoje', 'Histórico', 'Desenvolvimento', 'Comunidade', 'Família']

describe('D5: nomes da navegação inferior', () => {
  for (const [tela, caminho] of [
    ['Hoje', '/app/hoje'],
    ['Sessão', '/app/sessao'],
  ] as const) {
    it(`${tela}: o nome acessível dos 5 itens não tem hífen opcional`, () => {
      renderizarRota(caminho)
      const nav = screen.getByRole('navigation', { name: 'Principal' })

      for (const nome of NOMES_DA_NAVEGACAO) {
        // `name` como texto exato: um ­ no nome acessível faria a busca falhar.
        const item = within(nav).getByRole(nome === 'Hoje' ? 'link' : 'button', { name: nome })
        expect(item).toBeTruthy()
      }
    })

    it(`${tela}: só "Desenvolvimento" tem a classe de hifenização`, () => {
      renderizarRota(caminho)
      const nav = screen.getByRole('navigation', { name: 'Principal' })

      const hifenizados = [...nav.querySelectorAll('.nav-item-hifeniza')].map((item) => item.textContent)
      expect(hifenizados).toEqual(['Desenvolvimento'])
      // Todos os outros itens seguem com hifens manuais (a classe base, sem o modificador).
      expect(nav.querySelectorAll('.nav-item')).toHaveLength(5)
    })
  }
})

// ---------------------------------------------------------------------------
// G3-4

/** O texto que a pessoa vê: sem os descendentes aria-hidden, com os espaços normalizados. */
function textoVisivel(elemento: Element): string {
  const copia = elemento.cloneNode(true) as Element
  for (const escondido of copia.querySelectorAll('[aria-hidden="true"]')) escondido.remove()
  return (copia.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Controles cujo texto visível não está no nome acessível (WCAG 2.5.3), ou que têm U+00AD. */
function nomesQueDivergem(container: HTMLElement): string[] {
  const problemas: string[] = []
  for (const controle of container.querySelectorAll('button, a, [role="button"]')) {
    if ((controle.textContent ?? '').includes('­')) {
      problemas.push(`hífen opcional (U+00AD) no texto: ${controle.outerHTML}`)
    }
    const rotulo = controle.getAttribute('aria-label')
    if (rotulo !== null && !rotulo.toLowerCase().includes(textoVisivel(controle).toLowerCase())) {
      problemas.push(`"${textoVisivel(controle)}" não está em aria-label="${rotulo}"`)
    }
  }
  return problemas
}

describe('G3-4: o texto visível está no nome acessível', () => {
  it('no Início, incluindo a miniatura inerte', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('[inert] button')).not.toBeNull()

    expect(nomesQueDivergem(container)).toEqual([])
  })

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`no Hoje (${tema}), com a escolha de fralda e depois o "+ Mais" abertos`, () => {
      const { container } = renderizarRota('/app/hoje', { estadoInicial: estado() })
      expect(nomesQueDivergem(container)).toEqual([])

      fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Lia' }))
      expect(nomesQueDivergem(container)).toEqual([])

      fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
      expect(nomesQueDivergem(container)).toEqual([])
    })

    it(`na Sessão (${tema})`, () => {
      const { container } = renderizarRota('/app/sessao', { estadoInicial: estado() })
      expect(nomesQueDivergem(container)).toEqual([])
    })
  }

  // Num contêiner flex (todo .botao é inline-flex), o texto solto ao lado de um filho vira um
  // item anônimo e o espaço da frente some: "+ Mais" apareceria como "+Mais". O conteúdo de um
  // controle que tem descendente aria-hidden fica dentro de um único elemento inline.
  function comTextoSoltoAoLadoDeAriaHidden(container: HTMLElement): string[] {
    return [...container.querySelectorAll('button, a, [role="button"]')]
      .filter((controle) => controle.querySelector('[aria-hidden="true"]') !== null)
      .filter((controle) =>
        [...controle.childNodes].some(
          (no) => no.nodeType === Node.TEXT_NODE && (no.textContent ?? '').trim() !== '',
        ),
      )
      .map((controle) => controle.outerHTML)
  }

  it('no Início, incluindo a miniatura, o texto não fica solto ao lado de um aria-hidden', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('[inert] [aria-hidden="true"]')).not.toBeNull()

    expect(comTextoSoltoAoLadoDeAriaHidden(container)).toEqual([])
  })

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    for (const caminho of ['/app/hoje', '/app/sessao']) {
      it(`${caminho} (${tema}): o texto não fica solto ao lado de um aria-hidden`, () => {
        const { container } = renderizarRota(caminho, { estadoInicial: estado() })

        expect(comTextoSoltoAoLadoDeAriaHidden(container)).toEqual([])
      })
    }
  }

  it('o botão "Mais registros" mostra exatamente "+ Mais"', () => {
    renderizarRota('/app/hoje')

    const mais = screen.getByRole('button', { name: 'Mais registros' })
    expect((mais.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe('+ Mais')
  })

  it('o texto visível ignora o que é aria-hidden e normaliza espaços', () => {
    const { container } = renderizarRota('/app/hoje')
    const mais = screen.getByRole('button', { name: 'Mais registros' })

    expect(textoVisivel(mais)).toBe('Mais')
    expect(mais.textContent).toBe('+ Mais')
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// D6

describe('D6: cronômetro', () => {
  it('o da Sessão usa a classe .cronometro, sem modificador de miniatura', () => {
    renderizarRota('/app/sessao')

    const cronometro = screen.getByRole('timer', { name: 'Duração da sessão' })
    expect(cronometro.classList.contains('cronometro')).toBe(true)
    expect(cronometro.classList.contains('cronometro-mini')).toBe(false)
  })

  it('o da miniatura do Início usa a mesma classe, com o modificador menor', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const cronometro = container.querySelector('[inert] [role="timer"]')!
    expect(cronometro.classList.contains('cronometro')).toBe(true)
    expect(cronometro.classList.contains('cronometro-mini')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// D7

describe('D7: "Em breve"', () => {
  for (const [tela, caminho] of [
    ['Hoje', '/app/hoje'],
    ['Sessão', '/app/sessao'],
  ] as const) {
    it(`${tela}: aparece uma vez, na legenda que cobre Histórico até Família`, () => {
      renderizarRota(caminho)
      const nav = screen.getByRole('navigation', { name: 'Principal' })

      const legendas = within(nav).getAllByText('Em breve')
      expect(legendas).toHaveLength(1)
      expect(legendas[0].classList.contains('nav-legenda')).toBe(true)

      // A ordem do DOM põe Histórico logo depois de Hoje: a legenda (colunas 2 a 5) cobre os 4.
      const itens = [...nav.querySelectorAll('.nav-item')].map((i) => i.getAttribute('aria-label') ?? i.textContent?.replace('­', ''))
      expect(itens).toEqual(NOMES_DA_NAVEGACAO)
    })
  }
})
