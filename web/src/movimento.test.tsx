import { readFileSync } from 'node:fs'
import type { ReactElement } from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { cn } from './componentes/terceiros/cn.ts'
import { EntradaSuave } from './componentes/terceiros/EntradaSuave.tsx'
import { TextoAnimado } from './componentes/terceiros/TextoAnimado.tsx'
import { CamadaHover } from './movimento/CamadaHover.tsx'
import {
  type RegistroMovimento,
  CATALOGO,
  TETO_ABERTURA_MS,
  TETO_DESTAQUE,
  TETO_FORA_DE_DESTAQUE,
  fimDaAbertura,
} from './movimento/catalogo.ts'
import { Cortina } from './movimento/Cortina.tsx'
import { LinhasEscalonadas } from './movimento/LinhasEscalonadas.tsx'
import { LinkComSeta } from './movimento/LinkComSeta.tsx'
import { RevelaNaRolagem } from './movimento/RevelaNaRolagem.tsx'
import { RevelacaoPorBaixo } from './movimento/RevelacaoPorBaixo.tsx'
import { TracoDesenhado } from './movimento/TracoDesenhado.tsx'
import { usePrefereMovimentoReduzido, useSemHover, useTelaLarga } from './movimento/reduzido.ts'
import { listarFontes, pastaSrcDe } from './teste/fontes.ts'

// VIS4-20 (MAT-44c-2a): as primitivas de movimento e os dois componentes adaptados do Magic UI.
// Este arquivo não importa motion/react: testa as peças pela interface (papéis, textos, estilos).
// Nenhuma página usa as peças ainda.

const pastaSrc = pastaSrcDe(import.meta.url)
const lerTexto = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')
const fontesDe = (...prefixos: string[]) =>
  listarFontes(pastaSrc).filter((f) => prefixos.some((p) => f.nome.startsWith(p)))
const pecasDoMovimento = () => fontesDe('movimento/', 'componentes/terceiros/')

// ---------------------------------------------------------------------------
// Simulações do navegador que o jsdom não traz.

type ChaveDeMidia = 'reduzido' | 'semHover' | 'largo'

function simularMidia(inicial: Partial<Record<ChaveDeMidia, boolean>> = {}) {
  const estado: Record<ChaveDeMidia, boolean> = { reduzido: false, semHover: false, largo: true, ...inicial }
  const ouvintes: Record<ChaveDeMidia, Set<() => void>> = {
    reduzido: new Set(),
    semHover: new Set(),
    largo: new Set(),
  }
  const chaveDe = (consulta: string): ChaveDeMidia | null => {
    if (consulta.includes('prefers-reduced-motion')) return 'reduzido'
    if (consulta.includes('hover: none')) return 'semHover'
    if (consulta.includes('min-width')) return 'largo'
    return null
  }
  vi.stubGlobal('matchMedia', (consulta: string) => {
    const chave = chaveDe(consulta)
    return {
      get matches() {
        return chave === null ? false : estado[chave]
      },
      media: consulta,
      addEventListener: (_tipo: string, ouvinte: () => void) => {
        if (chave) ouvintes[chave].add(ouvinte)
      },
      removeEventListener: (_tipo: string, ouvinte: () => void) => {
        if (chave) ouvintes[chave].delete(ouvinte)
      },
    }
  })
  return {
    definir(chave: ChaveDeMidia, valor: boolean) {
      estado[chave] = valor
      act(() => {
        for (const ouvinte of ouvintes[chave]) ouvinte()
      })
    },
  }
}

class ObservadorVazio {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', ObservadorVazio)
  vi.stubGlobal('ResizeObserver', ObservadorVazio)
  window.sessionStorage.clear()
})

// ---------------------------------------------------------------------------
// 1. Catálogo

describe('VIS4-20: catálogo de movimento', () => {
  const registros: Array<[string, RegistroMovimento]> = Object.entries(CATALOGO)

  it('todo registro tem id de M1 a M21, igual à chave', () => {
    expect(registros.length).toBeGreaterThan(0)
    for (const [chave, registro] of registros) {
      expect(registro.id).toBe(chave)
      const numero = Number(/^M(\d+)$/.exec(chave)?.[1])
      expect(numero, chave).toBeGreaterThanOrEqual(1)
      expect(numero, chave).toBeLessThanOrEqual(21)
    }
  })

  it('os valores decididos estão no catálogo, nos tipos certos', () => {
    expect(Object.keys(CATALOGO)).toEqual(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M12', 'M13'])
    for (const id of ['M3', 'M6', 'M7'] as const) {
      expect(CATALOGO[id].tipo).toBe('rolagem')
      expect(CATALOGO[id].duracaoMs).toBeNull()
    }
    expect(CATALOGO.M3.janelaPx).toBe(360)
    expect(CATALOGO.M6.deslocamentoPct).toBe(50)
    expect(CATALOGO.M7.deslocamentoPct).toBe(30)
    expect(CATALOGO.M2.colunas).toEqual({ largo: 6, estreito: 4 })
    expect(CATALOGO.M5).toEqual({ ...CATALOGO.M4, id: 'M5' })
  })

  it('os de destaque respeitam os tetos de destaque', () => {
    const destaques = registros.filter(([, r]) => r.destaque)
    expect(destaques.length).toBeGreaterThan(0)
    for (const [id, r] of destaques) {
      if (r.duracaoMs !== null) expect(r.duracaoMs, id).toBeLessThanOrEqual(TETO_DESTAQUE.duracaoMs)
      expect(r.deslocamentoPx, id).toBeLessThanOrEqual(TETO_DESTAQUE.deslocamentoPx)
      expect(r.deslocamentoPct, id).toBeLessThanOrEqual(TETO_DESTAQUE.deslocamentoPct)
      expect(r.escala.de, id).toBeGreaterThanOrEqual(TETO_DESTAQUE.escalaMinima)
      expect(r.escala.de, id).toBeLessThanOrEqual(TETO_DESTAQUE.escalaMaxima)
      expect(r.escala.para, id).toBeGreaterThanOrEqual(TETO_DESTAQUE.escalaMinima)
      expect(r.escala.para, id).toBeLessThanOrEqual(TETO_DESTAQUE.escalaMaxima)
      expect(Math.abs(r.rotacaoGraus), id).toBeLessThanOrEqual(TETO_DESTAQUE.rotacaoGraus)
    }
  })

  it('o deslocamento em % da altura só aparece onde há recipiente que corta (M2, M6 e M7)', () => {
    const comPorcento = registros.filter(([, r]) => r.deslocamentoPct > 0).map(([id]) => id)
    expect(comPorcento).toEqual(['M2', 'M6', 'M7'])
  })

  it('os outros só movem opacidade e até 16 px, em até 300 ms', () => {
    const comuns = registros.filter(([, r]) => !r.destaque)
    expect(comuns.length).toBeGreaterThan(0)
    for (const [id, r] of comuns) {
      expect(r.duracaoMs ?? 0, id).toBeLessThanOrEqual(TETO_FORA_DE_DESTAQUE.duracaoMs)
      expect(r.duracaoSaidaMs ?? 0, id).toBeLessThanOrEqual(TETO_FORA_DE_DESTAQUE.duracaoMs)
      expect(r.deslocamentoPx, id).toBeLessThanOrEqual(TETO_FORA_DE_DESTAQUE.deslocamentoPx)
      expect(r.deslocamentoPct, id).toBe(0)
      expect(r.escala, id).toEqual({ de: 1, para: 1 })
      expect(r.rotacaoGraus, id).toBe(0)
    }
  })

  it('a sequência de abertura (M1 + M2) termina em até 1500 ms, com o traço parado 100 ms antes da cortina', () => {
    const { M1, M2 } = CATALOGO
    expect(M2.atrasoMs - (M1.atrasoMs + (M1.duracaoMs ?? 0))).toBe(100)
    expect(fimDaAbertura()).toBe(500 + 5 * 60 + 120 + 500)
    expect(fimDaAbertura()).toBeLessThanOrEqual(TETO_ABERTURA_MS)
    const estreita = M2.atrasoMs + (M2.colunas.estreito - 1) * M2.escalonamentoMs + M2.atrasoCamadaMs + M2.duracaoMs
    expect(estreita).toBeLessThanOrEqual(fimDaAbertura())
  })

  it('nenhum registro repete e nenhum é um laço', () => {
    for (const [id, r] of registros) {
      expect(r.repetir, id).toBe(false)
      expect(r.tipo, id).not.toBe('laco')
    }
  })
})

// ---------------------------------------------------------------------------
// Os hooks de preferência do navegador

function Sonda() {
  return <p data-testid="sonda">{[usePrefereMovimentoReduzido(), useSemHover(), useTelaLarga()].join(',')}</p>
}

describe('VIS4-20: hooks de preferência', () => {
  it('sem matchMedia valem os padrões: movimento normal, com hover, tela estreita', () => {
    vi.stubGlobal('matchMedia', undefined)
    render(<Sonda />)
    expect(screen.getByTestId('sonda').textContent).toBe('false,false,false')
  })

  it('leem o matchMedia e acompanham o evento change', () => {
    const midia = simularMidia({ reduzido: true, largo: true })
    render(<Sonda />)
    expect(screen.getByTestId('sonda').textContent).toBe('true,false,true')
    midia.definir('reduzido', false)
    midia.definir('semHover', true)
    midia.definir('largo', false)
    expect(screen.getByTestId('sonda').textContent).toBe('false,true,false')
  })

  it('cn junta as classes e ignora os falsos', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
    expect(cn()).toBe('')
  })
})

// ---------------------------------------------------------------------------
// 2 e 3. Movimento reduzido e troca no meio

interface Peca {
  nome: string
  ui: () => ReactElement
  textos: string[]
  /** Como saber que a peça está animada (antes de a preferência ligar); `null` se o DOM é o mesmo. */
  animada: ((raiz: HTMLElement) => boolean) | null
  /** Elementos que podem ter estilo no estado final (seletor). */
  ignorarEstilo?: string
}

const comEstilo = (raiz: HTMLElement) => raiz.querySelectorAll('[style]').length > 0
const { deslocamentoPx, duracaoMs, curva, escalonamentoMs } = CATALOGO.M4

const pecas: Peca[] = [
  {
    nome: 'TracoDesenhado',
    ui: () => <TracoDesenhado />,
    textos: [],
    animada: comEstilo,
  },
  { nome: 'Cortina', ui: () => <Cortina comTraco />, textos: [], animada: (raiz) => raiz.firstChild !== null },
  {
    nome: 'RevelaNaRolagem',
    ui: () => (
      <RevelaNaRolagem>
        <p>Mídia da rolagem</p>
      </RevelaNaRolagem>
    ),
    textos: ['Mídia da rolagem'],
    animada: comEstilo,
  },
  {
    nome: 'LinhasEscalonadas',
    ui: () => <LinhasEscalonadas linhas={['Primeira linha', 'Segunda linha']} />,
    textos: ['Primeira linha', 'Segunda linha'],
    animada: comEstilo,
  },
  {
    nome: 'RevelacaoPorBaixo',
    ui: () => (
      <RevelacaoPorBaixo variante="M6">
        <p>Seção revelada</p>
      </RevelacaoPorBaixo>
    ),
    textos: ['Seção revelada'],
    animada: comEstilo,
  },
  {
    nome: 'LinkComSeta',
    ui: () => (
      <LinkComSeta href="/destino" icone={<span>↗</span>}>
        Ver o projeto
      </LinkComSeta>
    ),
    textos: ['Ver o projeto'],
    animada: null,
  },
  {
    nome: 'CamadaHover',
    ui: () => (
      <CamadaHover camada={<p>Resumo do cartão</p>}>
        <p>Cartão</p>
      </CamadaHover>
    ),
    textos: ['Cartão'],
    animada: null,
    // A camada fechada tem opacidade 0 por definição (é o repouso dela); o resto fica sem estilo.
    ignorarEstilo: '[data-aberta]',
  },
  {
    nome: 'EntradaSuave',
    ui: () => (
      <EntradaSuave deslocamentoPx={deslocamentoPx} duracaoMs={duracaoMs} curva={curva}>
        <p>Bloco que entra</p>
      </EntradaSuave>
    ),
    textos: ['Bloco que entra'],
    animada: comEstilo,
  },
  {
    nome: 'TextoAnimado',
    ui: () => (
      <TextoAnimado
        as="h2"
        deslocamentoPx={deslocamentoPx}
        duracaoMs={duracaoMs}
        curva={curva}
        escalonamentoMs={escalonamentoMs}
      >
        {'Título de uma linha\nTítulo de outra linha'}
      </TextoAnimado>
    ),
    textos: ['Título de uma linha', 'Título de outra linha'],
    animada: comEstilo,
  },
]

/** O estado final: nenhuma opacidade, transformação, clip-path nem traço parcial no DOM. */
function esperarEstadoFinal(raiz: HTMLElement, textos: string[], ignorar?: string) {
  const comEstiloAgora = [...raiz.querySelectorAll('[style]')].filter((n) => !ignorar || !n.matches(ignorar))
  expect(comEstiloAgora).toHaveLength(0)
  for (const texto of textos) expect(screen.getByText(texto)).toBeTruthy()
}

describe('VIS4-20: movimento reduzido', () => {
  for (const peca of pecas) {
    it(`${peca.nome} renderiza o estado final, sem estilo de animação`, () => {
      simularMidia({ reduzido: true })
      const { container } = render(peca.ui())

      esperarEstadoFinal(container, peca.textos, peca.ignorarEstilo)
    })
  }

  it('a Cortina não renderiza nada e avisa que terminou', () => {
    simularMidia({ reduzido: true })
    const aoTerminar = vi.fn()
    const { container } = render(<Cortina aoTerminar={aoTerminar} comTraco />)

    expect(container.firstChild).toBeNull()
    expect(aoTerminar).toHaveBeenCalledTimes(1)
  })

  it('a linha do traço fica inteira, parada, sem componente de movimento', () => {
    simularMidia({ reduzido: true })
    const { container } = render(<TracoDesenhado />)

    const linha = container.firstElementChild!
    expect(container.children).toHaveLength(1)
    expect(linha.tagName.toLowerCase()).toBe('span')
    expect(linha.getAttribute('aria-hidden')).toBe('true')
    expect(linha.hasAttribute('style')).toBe(false)
    expect(linha.getAttribute('style') ?? '').not.toContain('scaleX')
  })

  it('TextoAnimado em texto comum continua um título com o texto inteiro', () => {
    simularMidia({ reduzido: true })
    render(pecas.find((p) => p.nome === 'TextoAnimado')!.ui())

    expect(screen.getByRole('heading', { level: 2, name: 'Título de uma linha Título de outra linha' })).toBeTruthy()
  })
})

describe('VIS4-20: a preferência liga no meio da sessão', () => {
  for (const peca of pecas) {
    it(`${peca.nome} passa ao estado final quando a preferência liga`, () => {
      const midia = simularMidia({ reduzido: false })
      const { container } = render(peca.ui())
      if (peca.animada) expect(peca.animada(container), 'antes: animada').toBe(true)

      midia.definir('reduzido', true)

      esperarEstadoFinal(container, peca.textos, peca.ignorarEstilo)
    })
  }

  it('a Cortina some do DOM e avisa que terminou', () => {
    const midia = simularMidia({ reduzido: false })
    const aoTerminar = vi.fn()
    const { container } = render(<Cortina aoTerminar={aoTerminar} />)
    expect(container.firstChild).not.toBeNull()
    expect(aoTerminar).not.toHaveBeenCalled()

    midia.definir('reduzido', true)

    expect(container.firstChild).toBeNull()
    expect(aoTerminar).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// 4 e 5. Regras de código: laço e destaque

describe('VIS4-20: nada em laço, nada de destaque decidido pela peça', () => {
  it('encontra os arquivos das duas pastas', () => {
    const nomes = pecasDoMovimento().map((f) => f.nome)
    expect(nomes).toEqual(
      expect.arrayContaining([
        'movimento/catalogo.ts',
        'movimento/Cortina.tsx',
        'componentes/terceiros/EntradaSuave.tsx',
        'componentes/terceiros/TextoAnimado.tsx',
        'componentes/terceiros/cn.ts',
      ]),
    )
  })

  it('nenhum arquivo põe repeat: Infinity nem repeat: com valor maior que 0', () => {
    for (const { nome, texto } of pecasDoMovimento()) {
      expect(texto, nome).not.toMatch(/repeat\s*:\s*Infinity/)
      for (const [, valor] of texto.matchAll(/\brepeat\s*:\s*([^,}\s]+)/g)) {
        expect(valor, `${nome}: repeat`).toBe('0')
      }
    }
  })

  it('nenhum arquivo põe data-destaque: isso é de quem usa a peça', () => {
    const achados = pecasDoMovimento()
      .filter((f) => f.texto.includes('data-destaque'))
      .map((f) => f.nome)
    expect(achados).toEqual([])
  })

  it('Hoje, Sessão e o protótipo não importam as peças de movimento', () => {
    const consumidores = listarFontes(pastaSrc).filter(
      (f) => f.nome === 'paginas/Hoje.tsx' || f.nome === 'paginas/Sessao.tsx' || f.nome.startsWith('prototipo/'),
    )
    expect(consumidores.length).toBeGreaterThan(0)
    const achados = consumidores
      .filter((f) => /from\s+['"][^'"]*\/(movimento|terceiros)\//.test(f.texto))
      .map((f) => f.nome)
    expect(achados).toEqual([])
  })

})

// ---------------------------------------------------------------------------
// 6. CSS global

describe('VIS4-20: o CSS global continua zerando animação e transição', () => {
  it('o bloco prefers-reduced-motion de index.css zera animation e transition', () => {
    const bloco = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}\s*$/.exec(lerTexto('index.css'))
    expect(bloco).not.toBeNull()
    expect(bloco![1]).toMatch(/animation:\s*none\s*!important/)
    expect(bloco![1]).toMatch(/transition:\s*none\s*!important/)
  })
})

// ---------------------------------------------------------------------------
// 7. Interação

describe('VIS4-20: interação', () => {
  it('LinkComSeta é um link com o texto como nome, e a seta fica fora do nome', () => {
    simularMidia()
    render(
      <LinkComSeta href="/projeto" icone={<span>↗</span>}>
        Ver o projeto
      </LinkComSeta>,
    )

    const link = screen.getByRole('link', { name: 'Ver o projeto' })
    expect(link.getAttribute('href')).toBe('/projeto')
    expect(link.classList.contains('alvo-toque')).toBe(true)
    expect(link.querySelector('[aria-hidden="true"]')!.textContent).toBe('↗')
  })

  for (const reduzido of [false, true]) {
    const modo = reduzido ? 'com movimento reduzido' : 'sem movimento reduzido'

    describe(`CamadaHover ${modo}`, () => {
      const cartao = () => (
        <>
          <CamadaHover camada={<a href="#detalhes">Ver detalhes</a>}>
            <p>Cartão</p>
          </CamadaHover>
          <button type="button">Fora do cartão</button>
        </>
      )
      const camadaDe = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-aberta]')!

      it('a camada fechada continua no documento, com o link recebendo foco pelo teclado', () => {
        simularMidia({ reduzido })
        const { container } = render(cartao())

        expect(camadaDe(container).getAttribute('data-aberta')).toBe('false')
        expect(getComputedStyle(camadaDe(container)).opacity).toBe('0')
        expect(getComputedStyle(camadaDe(container)).pointerEvents).toBe('none')
        const link = screen.getByRole('link', { name: 'Ver detalhes' })
        act(() => link.focus())

        expect(document.activeElement).toBe(link)
      })

      it('abre quando o foco entra no link de dentro da camada e fecha quando o foco sai do cartão', async () => {
        simularMidia({ reduzido })
        const { container } = render(cartao())

        act(() => screen.getByRole('link', { name: 'Ver detalhes' }).focus())
        expect(camadaDe(container).getAttribute('data-aberta')).toBe('true')
        await waitFor(() => expect(getComputedStyle(camadaDe(container)).opacity).toBe('1'))
        expect(getComputedStyle(camadaDe(container)).pointerEvents).toBe('auto')

        act(() => screen.getByRole('button', { name: 'Fora do cartão' }).focus())
        expect(camadaDe(container).getAttribute('data-aberta')).toBe('false')
        await waitFor(() => expect(getComputedStyle(camadaDe(container)).opacity).toBe('0'))
        expect(getComputedStyle(camadaDe(container)).pointerEvents).toBe('none')
      })

      it('mantém a camada aberta quando o foco passa de um focável a outro dentro do cartão', () => {
        simularMidia({ reduzido })
        const { container } = render(
          <CamadaHover camada={<a href="#detalhes">Ver detalhes</a>}>
            <button type="button">Primeiro</button>
          </CamadaHover>,
        )

        act(() => screen.getByRole('button', { name: 'Primeiro' }).focus())
        expect(camadaDe(container).getAttribute('data-aberta')).toBe('true')
        act(() => screen.getByRole('link', { name: 'Ver detalhes' }).focus())

        expect(camadaDe(container).getAttribute('data-aberta')).toBe('true')
      })

      it('abre no hover e fecha quando o ponteiro sai', () => {
        simularMidia({ reduzido })
        const { container } = render(cartao())
        const raiz = container.firstElementChild!

        act(() => {
          raiz.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
        })
        expect(camadaDe(container).getAttribute('data-aberta')).toBe('true')

        act(() => {
          raiz.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }))
        })
        expect(camadaDe(container).getAttribute('data-aberta')).toBe('false')
      })

      it('em aparelho de toque o resumo fica visível sem hover', () => {
        simularMidia({ reduzido, semHover: true })
        const { container } = render(cartao())

        expect(screen.getByText('Cartão')).toBeTruthy()
        expect(screen.getByRole('link', { name: 'Ver detalhes' })).toBeTruthy()
        expect(camadaDe(container).getAttribute('data-aberta')).toBe('true')
        expect(getComputedStyle(camadaDe(container)).opacity).not.toBe('0')
      })
    })

    describe(`TextoAnimado ${modo}`, () => {
      for (const como of ['p', 'h2'] as const) {
        it(`as="${como}": o texto inteiro está uma vez fora de aria-hidden, sem aria-label`, () => {
          simularMidia({ reduzido })
          const { container } = render(
            <TextoAnimado
              as={como}
              deslocamentoPx={deslocamentoPx}
              duracaoMs={duracaoMs}
              curva={curva}
              escalonamentoMs={escalonamentoMs}
            >
              {'Primeira linha\nSegunda linha\nTerceira linha'}
            </TextoAnimado>,
          )

          const inteiro = screen.getAllByText('Primeira linha Segunda linha Terceira linha')
          expect(inteiro).toHaveLength(1)
          expect(inteiro[0].closest('[aria-hidden="true"]')).toBeNull()
          expect(inteiro[0].classList.contains('sr-only')).toBe(true)
          expect(container.querySelectorAll('[aria-label]')).toHaveLength(0)
          const escondidas = [...container.querySelectorAll('[aria-hidden="true"]')]
          expect(escondidas.map((n) => n.textContent)).toEqual(['Primeira linha', 'Segunda linha', 'Terceira linha'])
          if (como === 'h2') {
            expect(
              screen.getByRole('heading', { level: 2, name: 'Primeira linha Segunda linha Terceira linha' }),
            ).toBeTruthy()
          }
        })
      }
    })
  }

  it('o traço é uma linha que começa em scaleX(0), à esquerda, e a linha inteira com movimento reduzido', () => {
    simularMidia({ reduzido: false })
    const { container } = render(<TracoDesenhado />)

    const linha = container.firstElementChild as HTMLElement
    expect(container.children).toHaveLength(1)
    expect(linha.tagName.toLowerCase()).toBe('span')
    expect(linha.getAttribute('aria-hidden')).toBe('true')
    expect(linha.getAttribute('style')).toContain('scaleX(0)')
    expect(linha.classList.contains('origin-left')).toBe(true)
    expect(linha.classList.contains('block')).toBe(true)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('nenhum arquivo de movimento/ nem de componentes/terceiros/ cria SVG, de nenhuma forma', () => {
    const formas: Array<[string, RegExp]> = [
      ['<svg', /<svg\b/i],
      ['motion.svg', /\bmotion\.svg\b/],
      ['createElement com svg', /createElement\(\s*['"`]svg['"`]/],
      ['literal "svg" ou \'svg\'', /['"`]svg['"`]/],
      ['elemento SVG por nome', /createElementNS|SVGElement/],
    ]
    for (const { nome, texto } of pecasDoMovimento()) {
      for (const [forma, regex] of formas) expect(texto, `${nome}: ${forma}`).not.toMatch(regex)
    }
  })

  it('LinhasEscalonadas renderiza cada linha na ordem', () => {
    simularMidia()
    render(
      <LinhasEscalonadas
        linhas={[<p key="1">Linha um</p>, <p key="2">Linha dois</p>, <p key="3">Linha três</p>]}
      />,
    )

    expect(screen.getAllByText(/^Linha /).map((n) => n.textContent)).toEqual(['Linha um', 'Linha dois', 'Linha três'])
  })

  it('a Cortina é uma sobreposição fixa, escondida do leitor de tela, que não pega clique', () => {
    simularMidia()
    const { container } = render(<Cortina comTraco />)

    const cortina = container.firstElementChild!
    expect(cortina.getAttribute('aria-hidden')).toBe('true')
    expect(cortina.className).toMatch(/\bfixed\b/)
    expect(cortina.className).toMatch(/\binset-0\b/)
    expect(cortina.className).toMatch(/\bpointer-events-none\b/)
    expect(cortina.className).toMatch(/\boverflow-hidden\b/)
    // Largo: 6 colunas de duas camadas, mais a camada do traço.
    expect(cortina.querySelectorAll(':scope > .relative')).toHaveLength(CATALOGO.M2.colunas.largo)
    expect(cortina.querySelector('span[aria-hidden="true"].origin-left')).not.toBeNull()
    expect(cortina.querySelector('svg')).toBeNull()
  })

  it('a Cortina usa 4 colunas na tela estreita', () => {
    simularMidia({ largo: false })
    const { container } = render(<Cortina />)

    expect(container.firstElementChild!.querySelectorAll(':scope > .relative')).toHaveLength(CATALOGO.M2.colunas.estreito)
  })

  it('a Cortina não repete na segunda montagem da mesma sessão', () => {
    simularMidia()
    const primeira = render(<Cortina />)
    expect(primeira.container.firstChild).not.toBeNull()
    expect(window.sessionStorage.length).toBe(1)
    primeira.unmount()

    const aoTerminar = vi.fn()
    const segunda = render(<Cortina aoTerminar={aoTerminar} />)

    expect(segunda.container.firstChild).toBeNull()
    expect(aoTerminar).toHaveBeenCalledTimes(1)
  })

  it('a Cortina não recomeça quando a aba volta do segundo plano', () => {
    simularMidia()
    const { container } = render(<Cortina />)
    const antes = container.firstElementChild

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(container.firstElementChild).toBe(antes)
    expect(container.querySelectorAll(':scope > [aria-hidden="true"]')).toHaveLength(1)
  })

  it('a Cortina some do DOM no fim e chama aoTerminar uma vez', async () => {
    simularMidia()
    const aoTerminar = vi.fn()
    const { container } = render(<Cortina aoTerminar={aoTerminar} />)

    await waitFor(() => expect(container.firstChild).toBeNull(), { timeout: 4000 })
    expect(aoTerminar).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// 8. Exportações

describe('VIS4-20: exportações', () => {
  it('toda exportação de movimento/ e componentes/terceiros/ é importada por este teste', () => {
    const exportacao = /^export\s+(?:async\s+)?(?:const|let|function|class|interface|type)\s+([A-Za-z0-9_]+)/gm
    const importacao = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'(\.[^']+)'/g
    const meu = lerTexto('movimento.test.tsx')

    const importados = new Set<string>()
    for (const [, lista, origem] of meu.matchAll(importacao)) {
      const arquivo = origem.replace(/^\.\//, '')
      for (const item of lista.split(',')) {
        const limpo = item.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]
        if (limpo) importados.add(`${arquivo}::${limpo}`)
      }
    }

    const sobrando: string[] = []
    for (const { nome, texto } of pecasDoMovimento()) {
      for (const [, exportado] of texto.matchAll(exportacao)) {
        if (!importados.has(`${nome}::${exportado}`)) sobrando.push(`${nome}: ${exportado}`)
      }
    }
    expect(sobrando).toEqual([])
  })
})
