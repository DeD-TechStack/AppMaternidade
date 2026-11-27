import { existsSync, readFileSync } from 'node:fs'
import { posix } from 'node:path'
import { parse } from 'postcss'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { cn } from './componentes/terceiros/cn.ts'
import { INI_FATOS } from './conteudo/inicio.ts'
import { CamadaHover } from './movimento/CamadaHover.tsx'
import { CATALOGO, fimDaCortina } from './movimento/catalogo.ts'
import { Cortina } from './movimento/Cortina.tsx'
import { EntradaCena } from './movimento/EntradaCena.tsx'
import { RevelaNaRolagem } from './movimento/RevelaNaRolagem.tsx'
import { RevelacaoPorBaixo } from './movimento/RevelacaoPorBaixo.tsx'
import { usePrefereMovimentoReduzido, useSemHover, useTelaLarga } from './movimento/reduzido.ts'
import { listarFontes, pastaSrcDe } from './teste/fontes.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

// Compatibilidade VIS4-20: as peças aposentadas não voltam a ser usadas. As garantias de
// primeira pintura, ordem, nome acessível e foco são conferidas nas rotas que as entregam.
const pastaSrc = pastaSrcDe(import.meta.url)
const lerTexto = (relativo: string) => readFileSync(pastaSrc + relativo, 'utf8')
const fontesDe = (...prefixos: string[]) =>
  listarFontes(pastaSrc).filter((f) => prefixos.some((p) => f.nome.startsWith(p)))
const pecasDoMovimento = () => fontesDe('movimento/', 'componentes/terceiros/')

function conferirVisivel(no: Element) {
  expect(no.isConnected).toBe(true)
  for (let atual: Element | null = no; atual; atual = atual.parentElement) {
    expect(atual.matches('[hidden], [aria-hidden="true"]')).toBe(false)
    const estilo = getComputedStyle(atual)
    expect(estilo.display).not.toBe('none')
    expect(estilo.visibility).not.toMatch(/^(hidden|collapse)$/)
    expect(estilo.opacity === '' || Number(estilo.opacity) > 0).toBe(true)
  }
}

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
  // Projeção estrutural checada, sem importar o tipo privado do catálogo.
  const registros: Array<[string, (typeof CATALOGO)[keyof typeof CATALOGO]]> = Object.entries(CATALOGO)
  const destaque = new Set(['M2', 'M3', 'M7', 'M8', 'M16'])
  const tetoDestaque = { duracaoMs: 1200, deslocamentoPx: 120, deslocamentoPct: 100, escalaMinima: 0.8, escalaMaxima: 1.1, rotacaoGraus: 8 }
  const tetoComum = { duracaoMs: 300, deslocamentoPx: 16 }

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
    expect(Object.keys(CATALOGO)).toEqual(['M2', 'M3', 'M7', 'M8', 'M13', 'M14', 'M15', 'M16', 'M17', 'M11'])
    for (const id of ['M3', 'M7', 'M16'] as const) {
      expect(CATALOGO[id].tipo).toBe('rolagem')
      expect(CATALOGO[id].duracaoMs).toBeNull()
    }
    expect(CATALOGO.M3.janelaPx).toBe(360)
    expect(CATALOGO.M3.escala).toEqual({ de: 0.9, para: 1 })
    expect(CATALOGO.M3.mola).toEqual({ stiffness: 120, damping: 30 })
    expect(CATALOGO.M7.deslocamentoPct).toBe(30)
    expect(CATALOGO.M2.colunas).toEqual({ largo: 6, estreito: 4 })
    expect(CATALOGO.M13.duracaoMs).toBe(100)
    expect(CATALOGO.M13.duracaoSaidaMs).toBe(110)
  })

  it('os destaques respeitam os mesmos tetos de movimento', () => {
    const destaques = registros.filter(([id]) => destaque.has(id))
    expect(destaques).toHaveLength(destaque.size)
    for (const [id, r] of destaques) {
      expect(r.duracaoMs ?? 0, id).toBeLessThanOrEqual(tetoDestaque.duracaoMs)
      expect(r.deslocamentoPx, id).toBeLessThanOrEqual(tetoDestaque.deslocamentoPx)
      expect(r.deslocamentoPct, id).toBeLessThanOrEqual(tetoDestaque.deslocamentoPct)
      for (const escala of [r.escala.de, r.escala.para]) {
        expect(escala, id).toBeGreaterThanOrEqual(tetoDestaque.escalaMinima)
        expect(escala, id).toBeLessThanOrEqual(tetoDestaque.escalaMaxima)
      }
      if ('rotacaoGraus' in r) {
        expect(typeof r.rotacaoGraus, id).toBe('number')
        if (typeof r.rotacaoGraus === 'number') expect(Math.abs(r.rotacaoGraus), id).toBeLessThanOrEqual(tetoDestaque.rotacaoGraus)
      }
    }
  })

  it('porcentagem só na cortina, no recorte M7 estacionado e no letreiro CSS M14', () => {
    expect(registros.filter(([, r]) => r.deslocamentoPct > 0).map(([id]) => id)).toEqual(['M2', 'M7', 'M14'])
    expect(CATALOGO.M2.deslocamentoPct).toBe(100)
    expect(CATALOGO.M14.deslocamentoPct).toBe(50)
    expect(CATALOGO.M14.duracaoMs).toBe(60000)
  })

  it('em todo o catálogo: escala entre 0,8 e 1,1, deslocamento até 120 px e até 100%', () => {
    for (const [id, r] of registros) {
      expect(r.escala.de, id).toBeGreaterThanOrEqual(0.8)
      expect(r.escala.de, id).toBeLessThanOrEqual(1.1)
      expect(r.escala.para, id).toBeGreaterThanOrEqual(0.8)
      expect(r.escala.para, id).toBeLessThanOrEqual(1.1)
      expect(r.deslocamentoPx, id).toBeLessThanOrEqual(120)
      expect(r.deslocamentoPct, id).toBeLessThanOrEqual(100)
    }
  })

  it('os outros só movem opacidade e até 16 px, em até 300 ms', () => {
    // M14 é a exceção CSS documentada, e a luz M15 não desloca conteúdo.
    const comuns = registros.filter(([id]) => !destaque.has(id) && id !== 'M14')
    expect(comuns.map(([id]) => id)).toEqual(['M13', 'M15', 'M17', 'M11'])
    for (const [id, r] of comuns) {
      expect(r.duracaoMs ?? 0, id).toBeLessThanOrEqual(tetoComum.duracaoMs)
      if ('duracaoSaidaMs' in r) expect(r.duracaoSaidaMs, id).toBeLessThanOrEqual(tetoComum.duracaoMs)
      expect(r.deslocamentoPx, id).toBeLessThanOrEqual(tetoComum.deslocamentoPx)
      expect(r.deslocamentoPct, id).toBe(0)
      expect(r.escala, id).toEqual({ de: 1, para: 1 })
      if ('rotacaoGraus' in r) expect(r.rotacaoGraus, id).toBe(0)
    }
  })

  it('a sobreposição da abertura termina em até 1500 ms nas duas larguras', () => {
    const { M2, M8 } = CATALOGO
    expect(M2.atrasoMs).toBe(0) // não há mais espera pelo traço M1
    expect(M2.duracaoMs).toBe(500)
    expect(M2.curva).toEqual([0.16, 1, 0.3, 1])
    expect(M2.escalonamentoMs).toBe(90)
    expect(M2.atrasoCamadaMs).toBe(120)
    expect(fimDaCortina()).toBe(5 * 90 + 120 + 500)
    expect(fimDaCortina()).toBeLessThanOrEqual(1500)
    const estreita = (M2.colunas.estreito - 1) * M2.escalonamentoMs + M2.atrasoCamadaMs + M2.duracaoMs
    expect(estreita).toBe(3 * 90 + 120 + 500)
    expect(estreita).toBeLessThanOrEqual(1500)
    expect(M8.escala).toEqual({ de: 0.94, para: 1 })
    expect(M8.duracaoMs).toBe(800) // cena decorativa posterior, não a sobreposição
  })

  it('nenhum movimento do catálogo repete além do letreiro CSS M14', () => {
    expect(registros.filter(([, r]) => r.tipo === 'laco').map(([id]) => id)).toEqual(['M14'])
    for (const [id, r] of registros) {
      if ('repetir' in r) expect(r.repetir, id).toBe(false)
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

const pecas: Peca[] = [
  {
    nome: 'Cortina', ui: () => <Cortina />, textos: [], animada: (raiz) => raiz.querySelector('[data-cortina]') !== null,
  },
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
    nome: 'RevelacaoPorBaixo M7 (estacionada)',
    ui: () => <RevelacaoPorBaixo variante="M7"><p>Seção revelada</p></RevelacaoPorBaixo>,
    textos: ['Seção revelada'],
    animada: comEstilo,
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
    nome: 'EntradaCena',
    ui: () => <EntradaCena pronta={false}><p>Cena da abertura</p></EntradaCena>,
    textos: ['Cena da abertura'],
    animada: (raiz) => raiz.querySelector('[data-entrada-cena="espera"][style*="opacity: 0"]') !== null,
  },
]

/**
 * O que, no `style` dos elementos, foge do estado final: opacidade diferente de 1 e transformação
 * diferente da identidade (translate 0, scale 1). Lista vazia = estado final.
 */
function desviosDoEstadoFinal(raiz: HTMLElement, ignorar?: string): string[] {
  const desvios: string[] = []
  for (const no of [raiz, ...raiz.querySelectorAll<HTMLElement>('[style]')]) {
    if (ignorar && no.matches(ignorar)) continue
    const { opacity, transform } = no.style
    if (opacity !== '' && opacity !== '1') desvios.push(`${no.tagName.toLowerCase()} opacity: ${opacity}`)
    const resto = transform
      .replace(/\btranslate(?:3d|[XYZ])?\(\s*0(?:px|%)?(?:\s*,\s*0(?:px|%)?)*\s*\)/g, '')
      .replace(/\bscale(?:3d|[XYZ])?\(\s*1(?:\s*,\s*1)*\s*\)/g, '')
      .replace(/\bnone\b/g, '')
      .trim()
    if (resto) desvios.push(`${no.tagName.toLowerCase()} transform: ${transform}`)
  }
  return desvios
}

/** O estado final, esperando o quadro em que o motion aplica a troca (a troca é sem animação). */
async function esperarEstadoFinal(raiz: HTMLElement, textos: string[], ignorar?: string) {
  await waitFor(() => expect(desviosDoEstadoFinal(raiz, ignorar)).toEqual([]))
  for (const texto of textos) expect(screen.getByText(texto)).toBeTruthy()
}

describe('VIS4-20: movimento reduzido', () => {
  for (const peca of pecas) {
    it(`${peca.nome} renderiza o estado final desde o primeiro quadro`, () => {
      simularMidia({ reduzido: true })
      const { container } = render(peca.ui())

      expect(desviosDoEstadoFinal(container, peca.ignorarEstilo)).toEqual([])
      for (const texto of peca.textos) expect(screen.getByText(texto)).toBeTruthy()
    })
  }

  it('a Cortina não renderiza nada e avisa que terminou', () => {
    simularMidia({ reduzido: true })
    const aoTerminar = vi.fn()
    const { container } = render(<Cortina aoTerminar={aoTerminar} />)

    expect(container.firstChild).toBeNull()
    expect(aoTerminar).toHaveBeenCalledTimes(1)
  })

  it('no Sistema a cena nasce final e a cortina não existe, sem retirar o título da árvore', () => {
    simularMidia({ reduzido: true })
    const { container } = renderizarRota('/sistema')
    expect(container.querySelector('[data-cortina]')).toBeNull()
    const cena = container.querySelector('[data-entrada-cena="final"]')
    expect(cena).not.toBeNull()
    conferirVisivel(screen.getByRole('heading', { level: 1, name: 'Campo de mel, a base do site.' }))
    if (!(cena instanceof HTMLElement)) throw new Error('A cena final precisa estar montada')
    conferirVisivel(cena)
    expect(cena.style.transform).toMatch(/^(|none)$/)
  })
})

describe('VIS4-20: a preferência liga no meio da sessão', () => {
  for (const peca of pecas) {
    it(`${peca.nome} passa ao estado final quando a preferência liga`, async () => {
      const midia = simularMidia({ reduzido: false })
      const { container } = render(peca.ui())
      if (peca.animada) expect(peca.animada(container), 'antes: animada').toBe(true)

      midia.definir('reduzido', true)

      await esperarEstadoFinal(container, peca.textos, peca.ignorarEstilo)
    })

    if (peca.nome === 'Cortina') continue

    it(`${peca.nome} mantém o mesmo elemento raiz nos dois sentidos da troca`, () => {
      const midia = simularMidia({ reduzido: false })
      const { container } = render(peca.ui())
      const raiz = container.firstElementChild

      midia.definir('reduzido', true)
      expect(container.firstElementChild).toBe(raiz)
      midia.definir('reduzido', false)
      expect(container.firstElementChild).toBe(raiz)
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
// Bordas do matchMedia: ausente, e antigo (Safari < 14: só addListener e removeListener).

describe('VIS4-20: sem matchMedia', () => {
  for (const peca of pecas) {
    it(`${peca.nome} monta sem erro, mostra o conteúdo e fica no movimento normal`, () => {
      vi.stubGlobal('matchMedia', undefined)
      const { container } = render(peca.ui())

      for (const texto of peca.textos) expect(screen.getByText(texto)).toBeTruthy()
      // Movimento normal por padrão: a peça animada traz o estilo inicial dela; a Cortina aparece.
      if (peca.animada) expect(peca.animada(container), 'movimento normal').toBe(true)
      if (peca.nome === 'Cortina') expect(container.firstChild).not.toBeNull()
    })
  }

})

type OuvinteAntigo = () => void

/** Um matchMedia de navegador antigo: o MediaQueryList só tem addListener e removeListener. */
function simularMidiaAntiga(inicial = false) {
  let reduzido = inicial
  const ouvintes = new Set<OuvinteAntigo>()
  const chamadas = { addListener: 0, removeListener: 0 }
  vi.stubGlobal('matchMedia', (consulta: string) => {
    const reduz = consulta.includes('prefers-reduced-motion')
    return {
      get matches() {
        return reduz ? reduzido : false
      },
      media: consulta,
      addListener: (ouvinte: OuvinteAntigo) => {
        if (!reduz) return
        chamadas.addListener++
        ouvintes.add(ouvinte)
      },
      removeListener: (ouvinte: OuvinteAntigo) => {
        if (!reduz) return
        chamadas.removeListener++
        ouvintes.delete(ouvinte)
      },
    }
  })
  return {
    chamadas,
    ouvintes,
    definir(valor: boolean) {
      reduzido = valor
      act(() => {
        for (const ouvinte of [...ouvintes]) ouvinte()
      })
    },
  }
}

function SondaDoReduzido() {
  return <p data-testid="reduzido">{String(usePrefereMovimentoReduzido())}</p>
}

describe('VIS4-20: matchMedia antigo (só addListener e removeListener)', () => {
  it('lê o valor ao montar, sem quebrar', () => {
    simularMidiaAntiga(true)
    render(<SondaDoReduzido />)

    expect(screen.getByTestId('reduzido').textContent).toBe('true')
  })

  it('acompanha a troca no meio da sessão, nos dois sentidos, pelo ouvinte do addListener', () => {
    const midia = simularMidiaAntiga(false)
    render(<SondaDoReduzido />)
    expect(screen.getByTestId('reduzido').textContent).toBe('false')
    expect(midia.ouvintes.size).toBe(1)

    midia.definir(true)
    expect(screen.getByTestId('reduzido').textContent).toBe('true')
    midia.definir(false)
    expect(screen.getByTestId('reduzido').textContent).toBe('false')
  })

  it('remove o ouvinte na desmontagem (removeListener chamado e nenhum ouvinte sobra)', () => {
    const midia = simularMidiaAntiga(false)
    const { unmount } = render(<SondaDoReduzido />)
    expect(midia.chamadas.addListener).toBeGreaterThan(0)

    unmount()

    expect(midia.chamadas.removeListener).toBe(midia.chamadas.addListener)
    expect(midia.ouvintes.size).toBe(0)
  })

  it('uma peça montada passa ao estado final quando a preferência liga, pelo ouvinte antigo', async () => {
    const midia = simularMidiaAntiga(false)
    const { container } = render(
      <EntradaCena pronta={false}><p>Bloco antigo</p></EntradaCena>,
    )

    midia.definir(true)

    await esperarEstadoFinal(container, ['Bloco antigo'])
  })

  it('sem addEventListener nem addListener: não assina, devolve o valor lido e não quebra', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('prefers-reduced-motion'),
      media: consulta,
    }))
    const { unmount } = render(<SondaDoReduzido />)

    expect(screen.getByTestId('reduzido').textContent).toBe('true')
    expect(() => unmount()).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// R1: trocar a preferência de movimento não desmonta o conteúdo, não perde estado nem foco.

function Conteudo() {
  const [conta, setConta] = useState(0)
  return (
    <>
      <button type="button" onClick={() => setConta((c) => c + 1)}>
        Contagem {conta}
      </button>
      <input aria-label="Anotação" defaultValue="" />
    </>
  )
}

const involucros: Array<[string, (conteudo: ReactElement) => ReactElement]> = [
  ['EntradaCena', (c) => <EntradaCena pronta={true}>{c}</EntradaCena>],
  ['RevelaNaRolagem', (c) => <RevelaNaRolagem>{c}</RevelaNaRolagem>],
  ['RevelacaoPorBaixo M7', (c) => <RevelacaoPorBaixo variante="M7">{c}</RevelacaoPorBaixo>],
  ['CamadaHover (conteúdo na camada)', (c) => <CamadaHover camada={c}><p>Cartão</p></CamadaHover>],
  ['CamadaHover (conteúdo nos children)', (c) => <CamadaHover camada={<p>Resumo</p>}>{c}</CamadaHover>],
]

describe('R1: a troca da preferência preserva o estado e o foco do conteúdo', () => {
  /** Clica o contador, digita no campo e foca o campo; devolve o campo e a conferência. */
  function preparar() {
    fireEvent.click(screen.getByRole('button', { name: 'Contagem 0' }))
    const campo = screen.getByRole('textbox', { name: 'Anotação' })
    if (!(campo instanceof HTMLInputElement)) throw new Error('Anotação não é um campo de entrada')
    fireEvent.change(campo, { target: { value: 'Registro de Heloísa' } })
    act(() => campo.focus())
    return () => {
      expect(screen.getByRole('textbox', { name: 'Anotação' })).toBe(campo)
      expect(campo.value).toBe('Registro de Heloísa')
      expect(screen.getByRole('button', { name: 'Contagem 1' })).toBeTruthy()
      expect(document.activeElement).toBe(campo)
    }
  }

  for (const [nome, envolver] of involucros) {
    it(`${nome}: normal → reduzido → normal conserva o valor, a contagem e o foco`, async () => {
      const midia = simularMidia({ reduzido: false })
      const { container } = render(envolver(<Conteudo />))
      const conferir = preparar()

      midia.definir('reduzido', true)
      conferir()
      await esperarEstadoFinal(container, [], '[data-aberta]')

      midia.definir('reduzido', false)
      conferir()
    })

    it(`${nome}: montado já reduzido, depois normal, conserva o valor, a contagem e o foco`, () => {
      const midia = simularMidia({ reduzido: true })
      const { container } = render(envolver(<Conteudo />))
      expect(desviosDoEstadoFinal(container, '[data-aberta]')).toEqual([])
      const conferir = preparar()

      midia.definir('reduzido', false)
      conferir()
      midia.definir('reduzido', true)
      conferir()
    })
  }

  it('o CTA real do Início mantém o nó, o foco e o destino nos dois sentidos', () => {
    const midia = simularMidia()
    const { container } = renderizarRota('/')
    const heroi = within(screen.getByRole('main'))
    const link = heroi.getByRole('link', { name: 'Ver como funciona' })
    act(() => link.focus())
    expect(document.activeElement).toBe(link)
    for (const reduzido of [true, false]) {
      midia.definir('reduzido', reduzido)
      expect(heroi.getByRole('link', { name: 'Ver como funciona' })).toBe(link)
      expect(document.activeElement).toBe(link)
      expect(link.getAttribute('href')).toBe('/como-funciona')
      expect(link.classList.contains('alvo-toque')).toBe(true)
    }
    expect(container.querySelector('.co-acoes .cm-botao-texto')).toBe(link)
    // A seta de hover saiu: o comportamento vigente é só sublinhar, sem mover o alvo.
    const css = parse(lerTexto('styles/site.css'))
    const hover: string[] = []
    css.walkRules((regra) => {
      if (!regra.selectors.includes('.cm-botao-texto:hover')) return
      regra.walkDecls((d) => { hover.push(`${d.prop}: ${d.value}`) })
    })
    expect(hover).toEqual(['text-decoration-color: currentColor'])
    const alvos: string[] = []
    css.walkRules('.cm-botao-texto', (regra) => {
      regra.walkDecls('min-height', (d) => { alvos.push(d.value) })
    })
    expect(alvos).toEqual(['44px'])
  })

  it('o título e a lista do Início já visíveis não rearmam a entrada ao mudar a preferência', async () => {
    const midia = simularMidia()
    const { container } = renderizarRota('/')
    const titulo = screen.getByRole('heading', { level: 1, name: 'Ela mamou que horas?' })
    const lista = container.querySelector('.co-fatos')
    if (!(lista instanceof HTMLElement)) throw new Error('Lista da seção de Notas ausente')
    const itens = within(lista).getAllByRole('listitem')
    expect(desviosDoEstadoFinal(titulo.parentElement!)).toEqual([])
    midia.definir('reduzido', true)
    midia.definir('reduzido', false)
    await act(async () => { await new Promise((resolver) => setTimeout(resolver, 120)) })
    expect(screen.getByRole('heading', { level: 1, name: 'Ela mamou que horas?' })).toBe(titulo)
    expect(within(lista).getAllByRole('listitem')).toEqual(itens)
    expect(desviosDoEstadoFinal(titulo.parentElement!)).toEqual([])
    expect(desviosDoEstadoFinal(lista.parentElement!)).toEqual([])
    for (const no of [titulo, ...itens]) conferirVisivel(no)
  })

  it('controle: o mesmo conteúdo sem invólucro preserva tudo', () => {
    const midia = simularMidia({ reduzido: false })
    render(<Conteudo />)
    const conferir = preparar()

    midia.definir('reduzido', true)
    conferir()
    midia.definir('reduzido', false)
    conferir()
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
        'movimento/EntradaCena.tsx',
        'movimento/RevelaNaRolagem.tsx',
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
    const telas = ['paginas/rotina/Hoje.tsx', 'paginas/rotina/Sessao.tsx']
    const consumidores = listarFontes(pastaSrc).filter(
      (f) => telas.includes(f.nome) || f.nome.startsWith('prototipo/'),
    )
    expect(consumidores.map((f) => f.nome)).toEqual(expect.arrayContaining(telas))
    expect(consumidores.some((f) => f.nome.startsWith('prototipo/'))).toBe(true)
    const achados = consumidores
      .filter((f) => /from\s+['"][^'"]*\/(movimento|terceiros)\//.test(f.texto))
      .map((f) => f.nome)
    expect(achados).toEqual([])
  })

  it('as peças aposentadas não voltam como cópias nem são importadas pelo produto', () => {
    const aposentadas = ['EntradaSuave', 'TextoAnimado', 'LinhasEscalonadas', 'LinkComSeta', 'TracoDesenhado']
    for (const nome of aposentadas) {
      expect(existsSync(`${pastaSrc}movimento/${nome}.tsx`), nome).toBe(false)
      expect(existsSync(`${pastaSrc}componentes/terceiros/${nome}.tsx`), nome).toBe(false)
    }
    const importa = new RegExp(`from\\s+['"][^'"]*/(${aposentadas.join('|')})(?:\\.tsx)?['"]`)
    expect(listarFontes(pastaSrc).filter(({ texto }) => importa.test(texto)).map(({ nome }) => nome)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 6. CSS global

describe('VIS4-20: o CSS global continua zerando animação e transição', () => {
  it('o bloco reduce desliga animation e transition no elemento e nos pseudo-elementos', () => {
    const css = parse(lerTexto('index.css'))
    const reducao = css.nodes.find((n) => n.type === 'atrule' && n.name === 'media' && n.params === '(prefers-reduced-motion: reduce)')
    if (reducao?.type !== 'atrule') throw new Error('Falta @media de movimento reduzido')
    const universal = reducao.nodes?.find((n) => n.type === 'rule' && n.selectors.includes('*'))
    if (universal?.type !== 'rule') throw new Error('Falta regra universal no bloco reduce')
    expect(universal.selectors).toEqual(['*', '*::before', '*::after'])
    for (const prop of ['animation', 'transition']) {
      const valor = universal.nodes.filter((n) => n.type === 'decl' && n.prop === prop)
      expect(valor).toMatchObject([{ value: 'none', important: true }])
    }
  })
})

// ---------------------------------------------------------------------------
// 7. Interação

describe('VIS4-20: interação', () => {
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

      for (const semHover of [false, true]) {
        it(`${semHover ? 'no ramo de toque' : 'no ramo com hover'} a camada herda o arredondamento do cartão, sem cortar o cartão`, () => {
          simularMidia({ reduzido, semHover })
          const { container } = render(cartao())

          expect(camadaDe(container).classList.contains('rounded-[inherit]')).toBe(true)
          // Sem overflow no cartão: ele cortaria o anel de foco dos focáveis de dentro.
          const raiz = container.firstElementChild!
          expect([...raiz.classList].filter((c) => /(^|:)overflow-/.test(c))).toEqual([])
        })
      }
    })

    it(`Início ${modo}: título único e lista de Notas inteira, na ordem, sem cópias ocultas`, () => {
      simularMidia({ reduzido })
      const { container } = renderizarRota('/')
      const main = screen.getByRole('main')
      const titulo = within(main).getByRole('heading', { level: 1, name: 'Ela mamou que horas?' })
      expect(titulo.textContent).toBe('Ela mamou que horas?')
      expect(titulo.hasAttribute('aria-label')).toBe(false)
      expect([...titulo.children].map((n) => n.textContent)).toEqual(['Ela mamou', 'que horas?'])
      expect(titulo.querySelector('[aria-hidden="true"], .sr-only')).toBeNull()
      conferirVisivel(titulo)
      const prova = within(main).getByRole('region', { name: 'Ninguém dá nota para o seu dia.' })
      const lista = within(prova).getByRole('list')
      expect(within(lista).getAllByRole('listitem').map((n) => n.textContent)).toEqual(INI_FATOS)
      for (const item of within(lista).getAllByRole('listitem')) conferirVisivel(item)
      expect(desviosDoEstadoFinal(prova)).toEqual([])
      expect(container.querySelector('[data-cortina], [data-revela]')).toBeNull()
    })

    it(`Início ${modo}: o rodapé e a rua da faixa final não têm a revelação M6/M7`, () => {
      simularMidia({ reduzido })
      const { container } = renderizarRota('/')
      const rodape = screen.getByRole('contentinfo')
      conferirVisivel(rodape)
      const rua = container.querySelector('.co-fecho .co-rua')
      if (!(rua instanceof HTMLElement)) throw new Error('Placa da rua ausente')
      const imagens = rua.querySelectorAll('img')
      expect(imagens).toHaveLength(2)
      for (const img of imagens) {
        expect(img.getAttribute('alt')).toBe('')
        conferirVisivel(img)
      }
      expect(desviosDoEstadoFinal(rua.parentElement!)).toEqual([])
      expect(desviosDoEstadoFinal(rodape)).toEqual([])
    })
  }

  it('a luz decorativa da rua anima só com suporte à linha do tempo e sem redução', () => {
    const css = parse(lerTexto('componentes/inicio-composicao/composicao.css'))
    const animacoes: string[] = []
    css.walkRules((regra) => {
      if (!regra.selectors.includes('.co-rua .co-luz')) return
      regra.walkDecls(/^animation(?:-|$)/, (d) => {
        const suporte = regra.parent
        const midia = suporte?.parent
        expect(suporte?.type === 'atrule' && suporte.name === 'supports' && suporte.params)
          .toBe('((animation-timeline: view()) and (animation-range: entry))')
        expect(midia?.type === 'atrule' && midia.name === 'media' && midia.params)
          .toBe('(prefers-reduced-motion: no-preference)')
        animacoes.push(`${d.prop}: ${d.value}`)
      })
    })
    expect(animacoes).toEqual([
      'animation: co-acende linear both', 'animation-timeline: view()',
      'animation-range: entry 45% cover 42%', 'animation-range: entry 70% entry 130%',
    ])
  })

  it('em todas as peças sem movimento reduzido, nenhum style traz escala fora de 0,8 a 1,1', () => {
    simularMidia({ reduzido: false })
    for (const peca of pecas) {
      const { container, unmount } = render(peca.ui())
      for (const no of container.querySelectorAll<HTMLElement>('[style]')) {
        for (const [, valores] of no.style.transform.matchAll(/\bscale(?:X|Y|3d)?\(([^)]*)\)/g)) {
          for (const valor of valores.split(',').map(Number)) {
            expect(valor, `${peca.nome}: ${no.style.transform}`).toBeGreaterThanOrEqual(0.8)
            expect(valor, `${peca.nome}: ${no.style.transform}`).toBeLessThanOrEqual(1.1)
          }
        }
      }
      unmount()
    }
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

  it('a Cortina é uma sobreposição fixa, escondida do leitor de tela, que não pega clique', () => {
    simularMidia()
    const { container } = render(<Cortina />)

    const cortina = container.firstElementChild!
    expect(cortina.getAttribute('aria-hidden')).toBe('true')
    expect(cortina.className).toMatch(/\bfixed\b/)
    expect(cortina.className).toMatch(/\binset-0\b/)
    expect(cortina.className).toMatch(/\bpointer-events-none\b/)
    expect(cortina.className).toMatch(/\boverflow-hidden\b/)
    // Largo: exatamente as 6 colunas de 2 camadas. Nenhum traço ou camada extra.
    expect(cortina.children).toHaveLength(6)
    for (const coluna of cortina.children) {
      expect(coluna.classList.contains('relative')).toBe(true)
      expect(coluna.children).toHaveLength(2)
      expect(coluna.children[0].classList.contains('bg-mel')).toBe(true)
      expect(coluna.children[1].classList.contains('bg-cacau')).toBe(true)
    }
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
  it('toda exportação de movimento/ e componentes/terceiros/ tem consumidor ou teste real na árvore', () => {
    const exportacao = /^export\s+(?:async\s+)?(?:const|let|function|class|interface|type)\s+([A-Za-z0-9_]+)/gm
    const importacao = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'(\.[^']+)'/g

    const importados = new Set<string>()
    for (const { nome, texto } of listarFontes(pastaSrc, true)) {
      for (const [, lista, origem] of texto.matchAll(importacao)) {
        const caminho = posix.join(posix.dirname(nome), origem)
        for (const item of lista.split(',')) {
          const limpo = item.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]
          if (limpo) importados.add(`${caminho}::${limpo}`)
        }
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
