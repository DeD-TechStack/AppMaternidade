import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { act, useRef, type ReactNode } from 'react'
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

  it('a espera das linhas é legível (POL-S1 A-1a, VIS-1 R1): o texto nunca desbota, a opacidade da espera é 1', () => {
    expect(CATALOGO.M4.opacidadeDe).toBe(1)
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

// VIS-1 R1: o texto é legível em todo estado em que a entrada pode deixá-lo (espera, durante, final,
// sem hidratação, impressão, nunca rolado) e o título nunca encosta no bloco seguinte.
const lerTokens = () => readFileSync(resolve(__dirname, '../styles/tokens.css'), 'utf8')
const corDoToken = (nome: string) => {
  const achado = new RegExp(`--color-${nome}:\\s*#([0-9a-fA-F]{6})`).exec(lerTokens())
  if (!achado) throw new Error(`token --color-${nome} não encontrado`)
  const n = parseInt(achado[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const luminancia = ([r, g, b]: number[]) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
/** Contraste do texto `cacau` com a opacidade dada sobre o fundo (composição alfa). */
const contraste = (opacidade: number, fundo: string) => {
  const t = corDoToken('cacau')
  const f = corDoToken(fundo)
  const mistura = t.map((v, i) => v * opacidade + f[i] * (1 - opacidade))
  const [a, b] = [luminancia(mistura), luminancia(f)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}
const deslocamentoDe = (no: Element | null) => {
  const achado = /translateY\((-?[\d.]+)px\)/.exec((no as HTMLElement | null)?.style.transform ?? '')
  return achado ? Number(achado[1]) : 0
}
/** O jsdom não faz layout: o teste diz onde cada caixa está, pela marca data-caixa="topo,base". */
function comCaixas() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const marca = this.closest('[data-caixa]')?.getAttribute('data-caixa') ?? '0,0'
    const [top, bottom] = marca.split(',').map(Number)
    return { top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect
  })
}

describe('espera legível e sem colisão (VIS-1 R1)', () => {
  it.each(['papel', 'mel', 'areia'])('o texto de cacau da espera passa de 4,5:1 sobre %s', (fundo) => {
    comObservador()
    consultas({})
    const { getByText } = render(
      <EntradaSuave deslocamentoPx={24} duracaoMs={700} curva="linear">
        <p>número</p>
      </EntradaSuave>,
    )
    expect(contraste(opacidadeDe(getByText('número').parentElement), fundo)).toBeGreaterThanOrEqual(4.5)
  })

  it('controle negativo: a espera antiga (opacidade 0,5) reprova o mesmo cálculo (3,06 / 2,71 / 2,89)', () => {
    expect(contraste(0.5, 'papel')).toBeLessThan(4.5)
    expect(contraste(0.5, 'mel')).toBeLessThan(3)
    expect(contraste(0.5, 'areia')).toBeLessThan(3)
  })

  const pausa = () => act(async () => { await new Promise((r) => setTimeout(r, 80)) })

  it('a espera nunca desloca o bloco além da folga até o bloco seguinte: sobreposição 0', async () => {
    comObservador()
    consultas({})
    comCaixas()
    const { container } = render(
      <div>
        <div data-caixa="0,100">
          <EntradaSuave deslocamentoPx={24} duracaoMs={700} curva="linear">
            <h2>título</h2>
          </EntradaSuave>
        </div>
        <div data-caixa="108,200">
          <p>parágrafo</p>
        </div>
      </div>,
    )
    const bloco = container.querySelector('h2')!.parentElement
    // O valor escrito pelo motion chega no próximo quadro: espera o 8 (folga) e depois confere que não passou.
    await waitFor(() => expect(deslocamentoDe(bloco)).toBe(8))
    await pausa()
    expect(deslocamentoDe(bloco)).toBeLessThanOrEqual(8)
    vi.restoreAllMocks()
  })

  it('sem folga (bloco seguinte encostado) a espera fica no lugar', async () => {
    comObservador()
    consultas({})
    comCaixas()
    const { container } = render(
      <div>
        <div data-caixa="0,100">
          <EntradaSuave deslocamentoPx={24} duracaoMs={700} curva="linear">
            <h2>título</h2>
          </EntradaSuave>
        </div>
        <div data-caixa="100,200">
          <p>parágrafo</p>
        </div>
      </div>,
    )
    await pausa()
    expect(deslocamentoDe(container.querySelector('h2')!.parentElement)).toBe(0)
    vi.restoreAllMocks()
  })

  it('com folga maior que o deslocamento o bloco espera nos 24 px do catálogo e entra uma vez', async () => {
    comObservador()
    consultas({})
    comCaixas()
    const { container } = render(
      <div>
        <div data-caixa="0,100">
          <EntradaSuave deslocamentoPx={24} duracaoMs={700} curva="linear">
            <h2>título</h2>
          </EntradaSuave>
        </div>
        <div data-caixa="160,200">
          <p>parágrafo</p>
        </div>
      </div>,
    )
    await waitFor(() => expect(deslocamentoDe(container.querySelector('h2')!.parentElement)).toBe(24))
    // Entra uma vez: ao chegar na janela o bloco vai ao lugar e, ao sair, não volta à espera.
    const observador = ObservadorFalso.todos[0]
    observador.disparar(true)
    await waitFor(() => expect(deslocamentoDe(container.querySelector('h2')!.parentElement)).toBe(0), { timeout: 2000 })
    observador.disparar(false)
    await pausa()
    expect(deslocamentoDe(container.querySelector('h2')!.parentElement)).toBe(0)
    vi.restoreAllMocks()
  })
})

// VIS-1 R2-F1: na impressão o bloco já carregado e nunca visto está no estado final (sem deslocamento).
describe('impressão: estado final também num bloco carregado que nunca entrou na janela (R2-F1)', () => {
  const caixas = (filho: ReactNode) => (
    <div>
      <div data-caixa="0,100">{filho}</div>
      <div data-caixa="160,200">
        <p>parágrafo</p>
      </div>
    </div>
  )
  const imprimir = (evento: 'beforeprint' | 'afterprint') => act(async () => { window.dispatchEvent(new Event(evento)) })

  it('EntradaSuave: a espera de 24 px vai a 0 em beforeprint e volta à espera em afterprint', async () => {
    comObservador()
    consultas({})
    comCaixas()
    const { container } = render(
      caixas(
        <EntradaSuave deslocamentoPx={24} duracaoMs={700} curva="linear">
          <h2>título</h2>
        </EntradaSuave>,
      ),
    )
    const bloco = () => container.querySelector('h2')!.parentElement
    await waitFor(() => expect(deslocamentoDe(bloco())).toBe(24))
    await imprimir('beforeprint')
    await waitFor(() => expect(deslocamentoDe(bloco())).toBe(0))
    expect(opacidadeDe(bloco())).toBe(1)
    await imprimir('afterprint')
    await waitFor(() => expect(deslocamentoDe(bloco())).toBe(24))
    vi.restoreAllMocks()
  })

  it('TextoAnimado: cada linha vai a 0 em beforeprint', async () => {
    comObservador()
    consultas({})
    comCaixas()
    const { container } = render(
      caixas(
        <TextoAnimado as="h2" deslocamentoPx={24} duracaoMs={700} curva="linear" escalonamentoMs={80}>
          {'linha um\nlinha dois'}
        </TextoAnimado>,
      ),
    )
    const linhas = () => [...container.querySelectorAll('[aria-hidden="true"]')]
    await waitFor(() => linhas().forEach((linha) => expect(deslocamentoDe(linha)).toBe(24)))
    await imprimir('beforeprint')
    await waitFor(() => linhas().forEach((linha) => expect(deslocamentoDe(linha)).toBe(0)))
    linhas().forEach((linha) => expect(opacidadeDe(linha)).toBe(1))
    await imprimir('afterprint')
    vi.restoreAllMocks()
  })

  it('a mídia print ativa na montagem também deixa as duas peças no estado final', async () => {
    comObservador()
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta === 'print',
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    comCaixas()
    const { container } = render(
      caixas(
        <>
          <EntradaSuave deslocamentoPx={24} duracaoMs={700} curva="linear">
            <h2>título</h2>
          </EntradaSuave>
          <TextoAnimado deslocamentoPx={24} duracaoMs={700} curva="linear" escalonamentoMs={80}>
            {'linha'}
          </TextoAnimado>
        </>,
      ),
    )
    await act(async () => { await new Promise((r) => setTimeout(r, 80)) })
    expect(deslocamentoDe(container.querySelector('h2')!.parentElement)).toBe(0)
    expect(deslocamentoDe(container.querySelector('[aria-hidden="true"]'))).toBe(0)
    vi.restoreAllMocks()
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
