import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { act, useRef } from 'react'
import { CATALOGO, atrasoEscalonado, fimDaCortina } from '../movimento/catalogo.ts'
import { useNaJanela } from '../movimento/naJanela.ts'
import { LinhasEscalonadas } from '../movimento/LinhasEscalonadas.tsx'
import { EntradaSuave } from '../componentes/terceiros/EntradaSuave.tsx'
import { TextoAnimado } from '../componentes/terceiros/TextoAnimado.tsx'
import { Cortina } from '../movimento/Cortina.tsx'
import { EntradaCena } from '../movimento/EntradaCena.tsx'
import { RevelaNaRolagem } from '../movimento/RevelaNaRolagem.tsx'
import { RevelacaoPorBaixo } from '../movimento/RevelacaoPorBaixo.tsx'

// O movimento do Campo de mel (DESIGN.md 5). Substitui o antigo web/src/movimento.test.tsx (MAT-49a).

function consultas(regras: { reduzido?: boolean; largo?: boolean }) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches:
      (consulta.includes('prefers-reduced-motion') && Boolean(regras.reduzido)) ||
      (consulta.includes('min-width: 46rem') && Boolean(regras.largo)),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('catálogo (DESIGN.md 5)', () => {
  it('cortina: 6 colunas no largo e 4 no estreito, 0,5 s, curva [0.16,1,0.3,1], 90 ms entre colunas, mel 120 ms depois', () => {
    const { M2 } = CATALOGO
    expect(M2.colunas).toEqual({ largo: 6, estreito: 4 })
    expect(M2.duracaoMs).toBe(500)
    expect(M2.curva).toEqual([0.16, 1, 0.3, 1])
    expect(M2.escalonamentoMs).toBe(90)
    expect(M2.atrasoCamadaMs).toBe(120)
    expect(M2.deslocamentoPct).toBe(100)
    expect(fimDaCortina()).toBe(5 * 90 + 120 + 500)
  })

  it('painel com mídia: 0,9 → 1 nos primeiros 360 px, mola 120/30, cartão 120 ms depois', () => {
    const { M3 } = CATALOGO
    expect(M3.escala).toEqual({ de: 0.9, para: 1 })
    expect(M3.janelaPx).toBe(360)
    expect(M3.mola).toEqual({ stiffness: 120, damping: 30 })
    expect(M3.atrasoMs).toBe(120)
  })

  it('linhas (SPEC_MOVIMENTO D2): sobem 24 px em 700 ms, curva [0.165,0.84,0.44,1], 80 ms entre linhas, no máximo 3, uma vez', () => {
    const { M4 } = CATALOGO
    expect(M4.deslocamentoPx).toBe(24)
    expect(M4.duracaoMs).toBe(700)
    expect(M4.curva).toEqual([0.165, 0.84, 0.44, 1])
    expect(M4.escalonamentoMs).toBe(80)
    expect(M4.maxItensEscalonados).toBe(3)
    expect(M4.umaVez).toBe(true)
  })

  it('a espera das linhas já é legível (POL-S1 A-1a): começa com opacidade acima de 0,1 e abaixo de 1', () => {
    expect(CATALOGO.M4.opacidadeDe).toBeGreaterThan(0.1)
    expect(CATALOGO.M4.opacidadeDe).toBeLessThan(1)
  })

  it('escalonamento: 80 ms entre itens, e do terceiro em diante entram juntos (240 ms no total)', () => {
    expect([0, 1, 2, 3, 4, 7].map((i) => atrasoEscalonado(i))).toEqual([0, 80, 160, 160, 160, 160])
    expect(atrasoEscalonado(2, 50)).toBe(100)
    expect(atrasoEscalonado(5, 50)).toBe(100)
  })

  it('resposta a ação (SPEC_MOVIMENTO 2.1-2.4): feedback 150, painel 220/160 com 8 px, acordeão 280, rota 180, esqueleto 1500, toque 120', () => {
    const { M15, M16, M17, M18, M19, M20 } = CATALOGO
    expect([M15.tipo, M15.duracaoMs, M15.curva]).toEqual(['tempo', 150, [0.4, 0, 0.2, 1]])
    expect([M16.tipo, M16.duracaoMs, M16.duracaoSaidaMs, M16.curva, M16.deslocamentoPx]).toEqual(['tempo', 220, 160, [0.4, 0, 0.2, 1], 8])
    expect([M17.tipo, M17.duracaoMs, M17.curva]).toEqual(['tempo', 280, [0, 0, 0.2, 1]])
    expect([M18.tipo, M18.duracaoMs, M18.curva]).toEqual(['tempo', 180, [0, 0, 0.2, 1]])
    expect([M19.tipo, M19.duracaoMs, M19.curva]).toEqual(['laco', 1500, 'linear'])
    expect([M20.tipo, M20.duracaoMs, M20.escala]).toEqual(['tempo', 120, { de: 0.96, para: 1 }])
  })

  it('faixa de cacau de -30 % a 0 (era -50 %), rodapé de -30 % a 0, cena 0,94 → 1 em 0,8 s, selos 60 s, camada 100 ms', () => {
    expect(CATALOGO.M6.deslocamentoPct).toBe(30)
    expect(CATALOGO.M7.deslocamentoPct).toBe(30)
    expect(CATALOGO.M8.escala).toEqual({ de: 0.94, para: 1 })
    expect(CATALOGO.M8.duracaoMs).toBe(800)
    expect(CATALOGO.M14.duracaoMs).toBe(60000)
    expect(CATALOGO.M13.duracaoMs).toBe(100)
  })
})

describe('Cortina', () => {
  it('no largo tem 6 colunas, cada uma com a camada de cacau por cima da de mel, sem pegar clique', () => {
    window.sessionStorage.clear()
    consultas({ largo: true })
    const { container } = render(<Cortina />)
    const cortina = container.querySelector<HTMLElement>('[data-cortina]')!
    expect(cortina.getAttribute('aria-hidden')).toBe('true')
    expect(cortina.className).toMatch(/pointer-events-none/)
    expect(cortina.children).toHaveLength(6)
    const [mel, cacau] = [...cortina.children[0].children]
    expect(mel.className).toMatch(/bg-mel/)
    expect(cacau.className).toMatch(/bg-cacau/)
  })

  it('no estreito tem 4 colunas', () => {
    window.sessionStorage.clear()
    consultas({})
    const { container } = render(<Cortina />)
    expect(container.querySelector('[data-cortina]')!.children).toHaveLength(4)
  })

  it('roda uma vez por sessão, e com movimento reduzido nem aparece (e avisa que terminou)', () => {
    window.sessionStorage.clear()
    consultas({})
    const primeira = render(<Cortina />)
    expect(primeira.container.querySelector('[data-cortina]')).not.toBeNull()
    primeira.unmount()
    const aoTerminar = vi.fn()
    const segunda = render(<Cortina aoTerminar={aoTerminar} />)
    expect(segunda.container.querySelector('[data-cortina]')).toBeNull()
    expect(aoTerminar).toHaveBeenCalledTimes(1)
    segunda.unmount()

    window.sessionStorage.clear()
    consultas({ reduzido: true })
    const reduzida = vi.fn()
    const terceira = render(<Cortina aoTerminar={reduzida} />)
    expect(terceira.container.querySelector('[data-cortina]')).toBeNull()
    expect(reduzida).toHaveBeenCalledTimes(1)
  })
})

describe('peças com movimento reduzido', () => {
  it('a cena da abertura nasce no estado final', () => {
    consultas({ reduzido: true })
    const { container } = render(
      <EntradaCena pronta={false}>
        <p>cena</p>
      </EntradaCena>,
    )
    expect(container.firstElementChild!.getAttribute('data-entrada-cena')).toBe('final')
  })

  it('sem movimento reduzido, a cena espera a cortina', () => {
    consultas({})
    const { container } = render(
      <EntradaCena pronta={false}>
        <p>cena</p>
      </EntradaCena>,
    )
    expect(container.firstElementChild!.getAttribute('data-entrada-cena')).toBe('espera')
  })

  it('a mídia presa à rolagem fica em escala 1 e o conteúdo da revelação por baixo fica no lugar', () => {
    consultas({ reduzido: true })
    const { container } = render(
      <>
        <RevelaNaRolagem>
          <p>mídia</p>
        </RevelaNaRolagem>
        <RevelacaoPorBaixo variante="M7">
          <p>rodapé</p>
        </RevelacaoPorBaixo>
      </>,
    )
    const midia = container.querySelector<HTMLElement>('[data-revela]')!
    expect(['', 'none']).toContain(midia.style.transform)
    const conteudo = container.querySelector<HTMLElement>('.overflow-hidden > div')!
    expect(['', 'none']).toContain(conteudo.style.transform)
  })
})

// IntersectionObserver de mentira: guarda o callback para o teste dizer quando o elemento entra e sai.
class ObservadorFalso {
  static todos: ObservadorFalso[] = []
  desconectado = false
  private readonly aviso: IntersectionObserverCallback
  constructor(aviso: IntersectionObserverCallback) {
    this.aviso = aviso
    ObservadorFalso.todos.push(this)
  }
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
  disconnect() {
    this.desconectado = true
  }
  disparar(dentro: boolean) {
    if (this.desconectado) return
    act(() => this.aviso([{ isIntersecting: dentro } as IntersectionObserverEntry], this as unknown as IntersectionObserver))
  }
}

function comObservador() {
  ObservadorFalso.todos = []
  vi.stubGlobal('IntersectionObserver', ObservadorFalso)
}

// A opacidade escrita na própria peça; sem valor inline (peça errada) devolve NaN, e o teste falha.
const opacidadeDe = (no: Element | null) => {
  const valor = (no as HTMLElement | null)?.style.opacity ?? ''
  return valor === '' ? Number.NaN : Number(valor)
}

describe('primitivas de entrada: o primeiro quadro já é legível (POL-S1 A-1a, SPEC_MOVIMENTO 6.6)', () => {
  it('EntradaSuave fora da janela, sem movimento reduzido, nasce com opacidade acima de 0,1', () => {
    comObservador()
    consultas({})
    const { getByText } = render(
      <EntradaSuave deslocamentoPx={24} duracaoMs={700} curva="linear">
        <p>número</p>
      </EntradaSuave>,
    )
    expect(opacidadeDe(getByText('número').parentElement)).toBeGreaterThan(0.1)
  })

  it('LinhasEscalonadas fora da janela: cada linha nasce com opacidade acima de 0,1', () => {
    comObservador()
    consultas({})
    const { getByText } = render(<LinhasEscalonadas linhas={['primeira', 'segunda', 'terceira', 'quarta']} />)
    for (const texto of ['primeira', 'segunda', 'terceira', 'quarta']) {
      expect(opacidadeDe(getByText(texto))).toBeGreaterThan(0.1)
    }
  })

  it('TextoAnimado fora da janela: cada linha nasce com opacidade acima de 0,1', () => {
    comObservador()
    consultas({})
    const { container } = render(
      <TextoAnimado deslocamentoPx={24} duracaoMs={700} curva="linear" escalonamentoMs={80}>
        {'linha um\nlinha dois'}
      </TextoAnimado>,
    )
    const linhas = container.querySelectorAll('[aria-hidden="true"]')
    expect(linhas).toHaveLength(2)
    linhas.forEach((linha) => expect(opacidadeDe(linha)).toBeGreaterThan(0.1))
  })

  it('com movimento reduzido as três peças nascem inteiras: opacidade 1 e sem deslocamento (A-5)', () => {
    comObservador()
    consultas({ reduzido: true })
    const { getByText, container } = render(
      <>
        <EntradaSuave deslocamentoPx={24} duracaoMs={700} curva="linear">
          <p>número</p>
        </EntradaSuave>
        <LinhasEscalonadas linhas={['linha']} />
        <TextoAnimado deslocamentoPx={24} duracaoMs={700} curva="linear" escalonamentoMs={80}>
          {'título'}
        </TextoAnimado>
      </>,
    )
    const pecas = [getByText('número').parentElement, getByText('linha'), container.querySelector('[aria-hidden="true"]')]
    for (const peca of pecas) {
      expect(opacidadeDe(peca)).toBe(1)
      expect(['', 'none']).toContain((peca as HTMLElement).style.transform)
    }
  })
})

function Sonda({ umaVez }: { umaVez?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const dentro = useNaJanela(ref, umaVez === undefined ? undefined : { umaVez })
  return <div ref={ref} data-dentro={String(dentro)} />
}

describe('useNaJanela: entra uma vez e não rearma (SPEC_MOVIMENTO D2, 4)', () => {
  it('com umaVez, desliga o observador na primeira entrada e continua "dentro" ao sair', () => {
    comObservador()
    const { container } = render(<Sonda umaVez />)
    const sonda = container.firstElementChild!
    expect(sonda.getAttribute('data-dentro')).toBe('false')
    const [observador] = ObservadorFalso.todos
    observador.disparar(true)
    expect(sonda.getAttribute('data-dentro')).toBe('true')
    expect(observador.desconectado).toBe(true)
    observador.disparar(false)
    expect(sonda.getAttribute('data-dentro')).toBe('true')
  })

  it('controle: com umaVez falso, segue entrada e saída', () => {
    comObservador()
    const { container } = render(<Sonda umaVez={false} />)
    const sonda = container.firstElementChild!
    const [observador] = ObservadorFalso.todos
    observador.disparar(true)
    observador.disparar(false)
    expect(sonda.getAttribute('data-dentro')).toBe('false')
    expect(observador.desconectado).toBe(false)
  })

  it('sem IntersectionObserver vale "dentro" (conteúdo nunca fica à espera)', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = render(<Sonda umaVez />)
    expect(container.firstElementChild!.getAttribute('data-dentro')).toBe('true')
  })

  it('EntradaSuave e TextoAnimado usam umaVez por padrão: depois de entrar, sair da janela não desliga nada', () => {
    comObservador()
    consultas({})
    render(
      <>
        <EntradaSuave deslocamentoPx={24} duracaoMs={700} curva="linear">
          <p>número</p>
        </EntradaSuave>
        <TextoAnimado deslocamentoPx={24} duracaoMs={700} curva="linear" escalonamentoMs={80}>
          {'título'}
        </TextoAnimado>
      </>,
    )
    expect(ObservadorFalso.todos).toHaveLength(2)
    ObservadorFalso.todos.forEach((observador) => observador.disparar(true))
    expect(ObservadorFalso.todos.map((observador) => observador.desconectado)).toEqual([true, true])
  })
})
