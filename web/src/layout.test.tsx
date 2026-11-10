import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { BotoesRapidos } from './prototipo/BotoesRapidos.tsx'
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
    // O alvo do cabeçalho e do rodapé novos vem de --alvo-toque (estilo.test.ts) e é medido em G11.
    .filter((elemento) => elemento.closest('[data-cabecalho], [data-rodape]') === null)
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

      fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Heloísa' }))
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
// R2 (substitui o antigo G3-2, que decidia pela altura atual da barra)

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

/** Avisa o ResizeObserver, como o navegador faria quando a barra muda de tamanho. */
function avisarOObservador() {
  act(() => {
    for (const aoMedir of observadores) aoMedir()
  })
}

/** Simula uma nova medida da barra e da janela. */
function medir(barra: number, janela: number) {
  alturaDaBarra = barra
  definirAlturaDaJanela(janela)
  avisarOObservador()
}

const definirFonteRaiz = (valor: string) => document.documentElement.style.setProperty('font-size', valor)
const paddingDeRolagem = () => document.documentElement.style.getPropertyValue('scroll-padding-bottom')
const barraDe = (container: HTMLElement) => container.querySelector('.barra-inferior')!
const estaFixa = (container: HTMLElement) => barraDe(container).classList.contains('barra-fixa')

// R2: a decisão depende da JANELA e da FONTE RAIZ (uma janela de pelo menos 40 rem de altura),
// nunca da altura atual da barra. Confirmação e painéis fazem a barra crescer no uso normal e
// não podem tirá-la da janela.
describe('R2: a barra de baixo fica fixa em janela de 40 rem ou mais, qualquer que seja a altura da barra', () => {
  beforeEach(() => {
    observadores.length = 0
    alturaDaBarra = 420
    definirAlturaDaJanela(844)
    definirFonteRaiz('16px')
    vi.stubGlobal('ResizeObserver', ObservadorFalso)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({ width: 390, height: alturaDaBarra, top: 0, left: 0, right: 390, bottom: alturaDaBarra, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
    )
  })

  afterEach(() => {
    definirAlturaDaJanela(alturaOriginalDaJanela)
    document.documentElement.style.removeProperty('font-size')
  })

  for (const [tela, caminho] of [
    ['Hoje', '/app/hoje'],
    ['Sessão', '/app/sessao'],
  ] as const) {
    describe(tela, () => {
      it('janela de 844 px com fonte de 16 px: fixa, e reserva a altura medida mais 8 px de rolagem', () => {
        const { container } = renderizarRota(caminho)

        medir(170, 844)

        expect(estaFixa(container)).toBe(true)
        expect(paddingDeRolagem()).toBe('178px')
      })

      it('uma barra de 766 px numa janela de 844 px com fonte de 16 px continua fixa', () => {
        const { container } = renderizarRota(caminho)

        medir(766, 844)

        expect(estaFixa(container)).toBe(true)
        expect(paddingDeRolagem()).toBe('774px')
      })

      it('fonte raiz em 200% (32 px) numa janela de 844 px: estática e sem reserva de rolagem', () => {
        const { container } = renderizarRota(caminho)
        medir(170, 844)
        expect(estaFixa(container)).toBe(true)

        definirFonteRaiz('32px')
        avisarOObservador()

        expect(estaFixa(container)).toBe(false)
        expect(paddingDeRolagem()).toBe('')
      })

      it('fonte raiz em 200% numa janela de 900 px: estática', () => {
        const { container } = renderizarRota(caminho)
        definirFonteRaiz('32px')

        medir(370, 900)

        expect(estaFixa(container)).toBe(false)
      })

      it('zoom de 200% em 1440 × 900 (janela de 450 px com fonte de 16 px): estática', () => {
        const { container } = renderizarRota(caminho)

        medir(170, 450)

        expect(estaFixa(container)).toBe(false)
        expect(paddingDeRolagem()).toBe('')
      })

      it('1440 × 900 com fonte de 16 px: fixa', () => {
        const { container } = renderizarRota(caminho)

        medir(170, 900)

        expect(estaFixa(container)).toBe(true)
      })

      it('volta a ficar fixa quando a fonte volta a 16 px', () => {
        const { container } = renderizarRota(caminho)
        definirFonteRaiz('32px')
        medir(300, 844)
        expect(estaFixa(container)).toBe(false)

        definirFonteRaiz('16px')
        avisarOObservador()

        expect(estaFixa(container)).toBe(true)
        expect(paddingDeRolagem()).toBe('308px')
      })

      it('mede de novo quando a janela muda de tamanho (resize)', () => {
        const { container } = renderizarRota(caminho)
        alturaDaBarra = 170
        definirAlturaDaJanela(844)
        act(() => {
          window.dispatchEvent(new Event('resize'))
        })
        expect(estaFixa(container)).toBe(true)

        definirAlturaDaJanela(400)
        act(() => {
          window.dispatchEvent(new Event('resize'))
        })

        expect(estaFixa(container)).toBe(false)
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

  // A barra de 420 px (mais de 35% de 844 px) é a medida de uma confirmação com o painel aberto.
  const agir = (nome: string) => fireEvent.click(screen.getByRole('button', { name: nome }))
  const estados: Array<[string, () => void]> = [
    ['estado inicial', () => {}],
    ['painel Fralda aberto', () => agir('Registrar fralda de Heloísa')],
    [
      'Fralda confirmada',
      () => {
        agir('Registrar fralda de Heloísa')
        agir('Xixi')
      },
    ],
    ['"+ Mais" aberto', () => agir('Mais registros')],
    ...['Mamadeira', 'Alimentação sólida', 'Observação'].map((item): [string, () => void] => [
      `${item} confirmada`,
      () => {
        agir('Mais registros')
        agir(item)
      },
    ]),
    ['depois de Encerrar', () => agir('Encerrar')],
    [
      'depois de Desfazer',
      () => {
        agir('Encerrar')
        agir('Desfazer')
      },
    ],
    [
      'depois de Fechar',
      () => {
        agir('Mais registros')
        agir('Mamadeira')
        agir('Fechar')
      },
    ],
  ]

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    for (const [nome, preparar] of estados) {
      it(`Hoje (${tema}), ${nome}: a barra continua fixa (barra de 420 px, janela de 844 px, fonte de 16 px)`, () => {
        const { container } = renderizarRota('/app/hoje', { estadoInicial: estado() })

        preparar()
        avisarOObservador()

        expect(estaFixa(container)).toBe(true)
      })
    }

    it(`Hoje (${tema}), com fonte raiz de 32 px, a barra não é fixa`, () => {
      const { container } = renderizarRota('/app/hoje', { estadoInicial: estado() })
      definirFonteRaiz('32px')

      avisarOObservador()

      expect(estaFixa(container)).toBe(false)
    })
  }

  it('sem ResizeObserver (jsdom, navegadores muito antigos) a barra continua fixa', () => {
    vi.unstubAllGlobals()
    const { container } = renderizarRota('/app/hoje')

    expect(estaFixa(container)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// R1

describe('R1: navegação inferior', () => {
  for (const [tela, caminho] of [
    ['Hoje', '/app/hoje'],
    ['Sessão', '/app/sessao'],
  ] as const) {
    for (const [tema, estado] of [
      ['claro', claro],
      ['madrugada', madrugada],
    ] as const) {
      describe(`${tela} (${tema})`, () => {
        it('os filhos da nav seguem a ordem visual: Hoje, "Em breve", Histórico, Desenvolvimento, Comunidade, Família', () => {
          renderizarRota(caminho, { estadoInicial: estado() })
          const nav = screen.getByRole('navigation', { name: 'Principal' })

          expect([...nav.children].map((filho) => filho.textContent?.trim())).toEqual([
            'Hoje',
            'Em breve',
            'Histórico',
            'Desenvolvimento',
            'Comunidade',
            'Família',
          ])
        })

        it('nenhum texto da navegação contém U+00AD', () => {
          renderizarRota(caminho, { estadoInicial: estado() })
          const nav = screen.getByRole('navigation', { name: 'Principal' })

          expect(nav.textContent).not.toContain('­')
        })

        it('só "Desenvolvimento" tem a classe de hifenização', () => {
          renderizarRota(caminho, { estadoInicial: estado() })
          const nav = screen.getByRole('navigation', { name: 'Principal' })

          expect([...nav.querySelectorAll('.nav-item-hifeniza')].map((i) => i.textContent)).toEqual([
            'Desenvolvimento',
          ])
        })

        it('a nav fica dentro da barra, que é o contêiner de largura', () => {
          const { container } = renderizarRota(caminho, { estadoInicial: estado() })

          expect(container.querySelector('.barra-inferior nav.nav-inferior')).not.toBeNull()
        })

        it('mantém aria-disabled, aria-describedby para "Em breve" e, no Hoje, aria-current', () => {
          renderizarRota(caminho, { estadoInicial: estado() })
          const nav = screen.getByRole('navigation', { name: 'Principal' })
          const legenda = within(nav).getByText('Em breve')

          for (const botao of nav.querySelectorAll('button')) {
            expect(botao.getAttribute('aria-disabled')).toBe('true')
            expect(botao.getAttribute('aria-describedby')).toBe(legenda.id)
            expect(botao.hasAttribute('aria-label')).toBe(false)
          }
          expect(within(nav).getByRole('link', { name: 'Hoje' }).hasAttribute('aria-current')).toBe(
            tela === 'Hoje',
          )
        })
      })
    }
  }
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
      // Nada de tela fica fora da coluna (o cabeçalho e o rodapé do site ficam fora de propósito).
      const daTela = [...container.querySelectorAll('header, main, nav')].filter(
        (peca) => peca.closest('[data-cabecalho], [data-rodape]') === null,
      )
      expect(daTela).toHaveLength(coluna.querySelectorAll('header, main, nav').length)
    })
  }

  it('no Hoje os botões rápidos ficam na mesma barra da navegação', () => {
    const { container } = renderizarRota('/app/hoje')

    const barra = container.querySelector('.coluna-app .barra-inferior')!
    expect(within(barra as HTMLElement).getByRole('button', { name: 'Iniciar sono de Heloísa' })).toBeTruthy()
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
  // R1b: os limiares são da largura do componente (contêiner), em rem, nunca da janela.
  expect(grade.classList.contains('@min-[36rem]:grid-cols-5')).toBe(true)
  expect(grade.classList.contains('@max-[17rem]:grid-cols-1')).toBe(true)

  const botoes = [...grade.querySelectorAll<HTMLElement>(':scope > button')]
  expect(botoes.map((b) => b.textContent)).toEqual(['Sono', 'Mamada', 'Fralda', 'Tummy time', '+ Mais'])
  // Primeira linha: três botões de 2 colunas. Segunda linha: dois botões de 3 colunas.
  expect(botoes.map((b) => (b.classList.contains('col-span-2') ? 2 : b.classList.contains('col-span-3') ? 3 : 0))).toEqual([
    2, 2, 2, 3, 3,
  ])
  for (const botao of botoes) {
    expect(botao.classList.contains('@min-[36rem]:col-span-1'), botao.outerHTML).toBe(true)
    expect(botao.classList.contains('@max-[17rem]:col-span-1'), botao.outerHTML).toBe(true)
    expect(botao.classList.contains('whitespace-nowrap'), botao.outerHTML).toBe(true)
    expect(botao.classList.contains('@max-[17rem]:whitespace-normal'), botao.outerHTML).toBe(true)
  }
}

describe('D4: botões rápidos com a mesma altura', () => {
  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`no Hoje (${tema}) a grade é de 6 colunas: 2+2+2 e 3+3`, () => {
      renderizarRota('/app/hoje', { estadoInicial: estado() })

      conferirGrade(screen.getByRole('button', { name: 'Iniciar sono de Heloísa' }).parentElement!)
    })
  }

  it('a miniatura do Início usa a mesma grade', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const sono = container.querySelector<HTMLElement>('[inert] button[aria-label="Iniciar sono de Heloísa"]')!
    conferirGrade(sono.parentElement!)
  })
})

// ---------------------------------------------------------------------------
// R1b: os botões rápidos decidem o layout pela largura do próprio componente

/** `@min-[46rem]/pagina:grid-cols-12` → 'pagina'; `@max-[17rem]:grid-cols-1` → '' (sem nome); outro token → null. */
const VARIANTE_DE_CONTEINER = /^@[a-z0-9-]*(?:\[[^\]]*\])?(?:\/([A-Za-z0-9_-]+))?:/

function nomeDoContainerExigido(token: string): string | null {
  const achado = VARIANTE_DE_CONTEINER.exec(token)
  return achado ? (achado[1] ?? '') : null
}

/** Algum ancestral (sem contar o próprio elemento) é o contêiner que a variante consulta? */
function temContainerAcima(elemento: Element, nome: string): boolean {
  for (let acima = elemento.parentElement; acima; acima = acima.parentElement) {
    for (const token of acima.classList) {
      // Variante sem nome consulta o contêiner mais próximo, nomeado ou não; com nome, só esse.
      if (nome === '' ? token === '@container' || token.startsWith('@container/') : token === `@container/${nome}`) {
        return true
      }
    }
  }
  return false
}

/** Elementos com variante de contêiner (@max-[…]:, @min-[…]:, com ou sem /nome) sem o contêiner acima. */
function variantesSemContainer(container: HTMLElement): string[] {
  const problemas: string[] = []
  for (const elemento of container.querySelectorAll<HTMLElement>('[class]')) {
    // O contêiner tem de estar ACIMA: `temContainerAcima` não conta o próprio elemento.
    const semContainer = [...elemento.classList].filter((token) => {
      const nome = nomeDoContainerExigido(token)
      return nome !== null && !temContainerAcima(elemento, nome)
    })
    if (semContainer.length > 0) {
      problemas.push(`${elemento.tagName.toLowerCase()} [${semContainer.join(' ')}] sem contêiner acima`)
    }
  }
  return problemas
}

describe('R1b: toda variante de contêiner tem um contêiner acima, onde quer que seja montada', () => {
  it('no Início, incluindo a miniatura inerte', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('[inert] button')).not.toBeNull()

    expect(variantesSemContainer(container)).toEqual([])
  })

  for (const [tema, estado] of [
    ['claro', claro],
    ['madrugada', madrugada],
  ] as const) {
    it(`no Hoje (${tema}), com a escolha de fralda e depois o "+ Mais" abertos`, () => {
      const { container } = renderizarRota('/app/hoje', { estadoInicial: estado() })
      expect(variantesSemContainer(container)).toEqual([])

      fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Heloísa' }))
      expect(variantesSemContainer(container)).toEqual([])

      fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
      expect(variantesSemContainer(container)).toEqual([])
    })

    it(`na Sessão (${tema})`, () => {
      const { container } = renderizarRota('/app/sessao', { estadoInicial: estado() })

      expect(variantesSemContainer(container)).toEqual([])
    })
  }

  it('o detector enxerga um elemento com variante e sem contêiner', () => {
    const { container } = render(<div className="@max-[17rem]:grid-cols-1" />)

    expect(variantesSemContainer(container)).toHaveLength(1)
  })
})

describe('R1b: BotoesRapidos não depende da janela', () => {
  const semAcao = () => undefined

  for (const desativado of [false, true]) {
    describe(desativado ? 'desativado (miniatura)' : 'ativo (Hoje)', () => {
      it('o div raiz declara o contêiner (@container)', () => {
        const { container } = render(
          <BotoesRapidos
            aoIniciarSessao={semAcao}
            aoRegistrarFralda={semAcao}
            aoRegistrarMais={semAcao}
            desativado={desativado}
          />,
        )

        expect(container.firstElementChild!.classList.contains('@container')).toBe(true)
      })

      it('nenhum descendente usa variante de janela (sm:, md:, lg:, xl:, 2xl:)', () => {
        const { container } = render(
          <BotoesRapidos
            aoIniciarSessao={semAcao}
            aoRegistrarFralda={semAcao}
            aoRegistrarMais={semAcao}
            desativado={desativado}
          />,
        )
        fireEvent.click(container.querySelector('button[aria-label="Mais registros"]')!)

        const deJanela = [...container.querySelectorAll<HTMLElement>('[class]')].flatMap((elemento) =>
          [...elemento.classList].filter((c) => /^(sm|md|lg|xl|2xl):/.test(c)),
        )
        expect(deJanela).toEqual([])
      })

      it('as variantes de contêiner têm contêiner acima, dentro do próprio componente', () => {
        const { container } = render(
          <BotoesRapidos
            aoIniciarSessao={semAcao}
            aoRegistrarFralda={semAcao}
            aoRegistrarMais={semAcao}
            desativado={desativado}
          />,
        )

        expect(variantesSemContainer(container)).toEqual([])
      })
    })
  }
})

// ---------------------------------------------------------------------------
// R4: o Início decide as colunas pelo espaço em rem da página, não pela janela

describe('R4: o Início decide as colunas pela largura da página em rem', () => {
  const rotaDoInicio = async () => {
    const resultado = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })
    return resultado.container
  }
  const raizDaPagina = (container: HTMLElement) => container.querySelector<HTMLElement>('[class~="@container/pagina"]')
  const VARIANTE_DE_JANELA = /(^|:)(sm|md|lg|xl|2xl):/

  it('o div raiz declara o contêiner nomeado @container/pagina', async () => {
    const container = await rotaDoInicio()

    const raiz = raizDaPagina(container)
    expect(raiz, 'nenhum elemento tem @container/pagina').not.toBeNull()
    // O raiz é a tela, entre o cabeçalho e o rodapé do site (a casca do Layout).
    expect(raiz!.parentElement!.classList.contains('sb-casca')).toBe(true)
    expect(raiz!.previousElementSibling!.matches('[data-cabecalho]')).toBe(true)
    expect(raiz!.nextElementSibling!.matches('[data-rodape]')).toBe(true)
  })

  it('só o raiz tem variante de janela (o padding lateral), inclusive fora da miniatura e dentro dela', async () => {
    const container = await rotaDoInicio()
    const raiz = raizDaPagina(container)

    const deJanela = [...container.querySelectorAll<HTMLElement>('[class]')]
      .filter((elemento) => elemento !== raiz)
      .flatMap((elemento) => [...elemento.classList].filter((token) => VARIANTE_DE_JANELA.test(token)))
    expect(deJanela).toEqual([])
    expect(container.querySelector('[inert] [class]')).not.toBeNull()
  })

  it('a única variante de janela do raiz é o padding lateral md:px-[2%]', async () => {
    const container = await rotaDoInicio()

    const doRaiz = [...(raizDaPagina(container)?.classList ?? [])].filter((token) => VARIANTE_DE_JANELA.test(token))
    expect(doRaiz).toEqual(['md:px-[2%]'])
  })

  it('toda variante …/pagina: tem o @container/pagina num ancestral, incluindo a miniatura inerte', async () => {
    const container = await rotaDoInicio()

    const usadas = [...container.querySelectorAll<HTMLElement>('[class]')].flatMap((elemento) =>
      [...elemento.classList].filter((token) => nomeDoContainerExigido(token) === 'pagina'),
    )
    expect(usadas.length).toBeGreaterThan(10)
    expect(variantesSemContainer(container)).toEqual([])
    const dentroDaMiniatura = container.querySelectorAll('[inert] [class*="/pagina:"]')
    expect(dentroDaMiniatura.length).toBeGreaterThan(0)
  })

  it('o limiar é 46 rem em todas as variantes nomeadas', async () => {
    const container = await rotaDoInicio()

    const limiares = new Set(
      [...container.querySelectorAll<HTMLElement>('[class]')].flatMap((elemento) =>
        [...elemento.classList]
          .filter((token) => nomeDoContainerExigido(token) === 'pagina')
          .map((token) => /^@(?:min|max)-\[([^\]]+)\]/.exec(token)?.[1] ?? token),
      ),
    )
    expect([...limiares]).toEqual(['46rem'])
  })

  it('as telas logadas e a rota inexistente não usam o contêiner da página', () => {
    for (const caminho of ['/app/hoje', '/app/sessao', '/qualquer-coisa']) {
      const { container, unmount } = renderizarRota(caminho)
      expect(container.querySelector('[class*="/pagina"]'), caminho).toBeNull()
      unmount()
    }
  })

  describe('o detector de contêiner (variantesSemContainer) entende nomes', () => {
    it('variante nomeada sem contêiner acima é achada', () => {
      const { container } = render(<div className="@min-[46rem]/pagina:flex" />)

      expect(variantesSemContainer(container)).toHaveLength(1)
    })

    it('variante nomeada com contêiner de outro nome acima é achada', () => {
      const { container } = render(
        <div className="@container/outro">
          <div className="@min-[46rem]/pagina:flex" />
        </div>,
      )

      expect(variantesSemContainer(container)).toHaveLength(1)
    })

    it('variante nomeada com o contêiner certo acima passa', () => {
      const { container } = render(
        <div className="@container/pagina">
          <p className="@min-[46rem]/pagina:first:pl-0" />
        </div>,
      )

      expect(variantesSemContainer(container)).toEqual([])
    })

    it('o próprio elemento não conta como seu contêiner', () => {
      const { container } = render(<div className="@container/pagina @min-[46rem]/pagina:flex" />)

      expect(variantesSemContainer(container)).toHaveLength(1)
    })

    it('variante sem nome aceita @container e @container/qualquer-nome acima', () => {
      const { container } = render(
        <>
          <div className="@container">
            <p className="@max-[17rem]:grid-cols-1" />
          </div>
          <div className="@container/pagina">
            <p className="@max-[17rem]:grid-cols-1" />
          </div>
        </>,
      )

      expect(variantesSemContainer(container)).toEqual([])
    })

    it('@container/pagina não conta como contêiner da variante @container/outro', () => {
      const { container } = render(
        <div className="@container/pagina">
          <p className="@min-[46rem]/outro:flex" />
        </div>,
      )

      expect(variantesSemContainer(container)).toHaveLength(1)
    })
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

      fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Heloísa' }))
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
