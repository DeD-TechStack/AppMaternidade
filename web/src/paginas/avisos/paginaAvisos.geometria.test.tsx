import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProvedorDadosConta } from '../../componentes/conta/sessao.tsx'
import { ProvedorDadosRotina } from '../../componentes/rotina/dadosRotina.tsx'
import { AVISOS_TEXTOS } from '../../conteudo/avisos.ts'
import { ContextoDadosAvisos, type Aviso, type DadosAvisos, type EstadoDosAvisos } from '../../dados/avisos.ts'
import type { Papel, Resultado } from '../../dados/comum.ts'
import { CABECALHO } from '../../conteudo/conta.ts'
import { NOTAS } from '../../conteudo/rotina.ts'
import { criarRotasProntas } from '../../teste/rotasProntas.ts'
import { aguardarCarga } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'

// RF14: a geometria da entrada "Avisos" e da página, como `molduraLogada.geometria.test.tsx`. O jsdom não tem
// layout: aqui se confere a estrutura e as classes que produzem a geometria, lendo os pisos dos próprios CSS
// (alvo de 44 px, foco na cor `--cor-foco`) e as cores dos tokens (contraste da pílula). As medidas em pixel
// reais ficam para a captura no navegador. O próprio arquivo prova que as conferências reprovam: caso que falta,
// tela errada e limite plantado.

const ler = (...partes: string[]) => readFileSync(join(process.cwd(), 'src', ...partes), 'utf8').replace(/\r\n/g, '\n')
const INDEX = ler('index.css')
const SITE = ler('styles', 'site.css')
const TOKENS = ler('styles', 'tokens.css')

const ALVO_MINIMO = 44
const CONTRASTE_MINIMO = 4.5
const LARGURA_DO_CELULAR = 390

const BASE = Date.parse('2026-11-15T13:00:00.000Z')

const ok = <T,>(valor: T): Resultado<T> => ({ ok: true, valor })

function aviso(numero: number, texto = `Nota ${numero}`): Aviso {
  return {
    id: `a2000000-0000-7000-8000-${String(numero).padStart(12, '0')}`,
    texto,
    criadaEm: new Date(BASE + numero * 60_000).toISOString(),
    destaqueAte: null,
    autor: { tipo: 'nome', nome: 'Ícaro' },
    familiaNome: 'Família Exemplo',
    familiaFuso: 'America/Sao_Paulo',
  }
}

const estado = (avisos: Aviso[], ligados = true): EstadoDosAvisos => ({ ligados, avisos, maisDe50: false })

function criarFalso(inicial: EstadoDosAvisos) {
  const dados: DadosAvisos = {
    lerEstado: vi.fn(async () => ok(inicial)),
    definirLigados: vi.fn(async () => ok(null)),
    marcarVistos: vi.fn(() => new Promise<Resultado<null>>(() => undefined)),
  }
  return { dados }
}

const LARGURA_ORIGINAL = window.innerWidth

function fixarLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
}

afterEach(() => {
  fixarLargura(LARGURA_ORIGINAL)
  vi.unstubAllGlobals()
})

async function montar(
  inicial: EstadoDosAvisos,
  opcoes: { sessao?: 'juliana' | 'icaro' | null; papelDeIcaro?: Papel; largura?: number } = {},
) {
  fixarLargura(opcoes.largura ?? 1440)
  const mundo = criarMundoDeTeste({
    sessao: opcoes.sessao === undefined ? 'juliana' : opcoes.sessao,
    papelDeIcaro: opcoes.papelDeIcaro,
  })
  vi.stubGlobal('scrollTo', vi.fn())
  const roteador = createMemoryRouter(criarRotasProntas(), { initialEntries: ['/app/avisos'] })
  render(
    <ProvedorDadosConta dados={mundo.conta}>
      <ProvedorDadosRotina dados={mundo.rotina}>
        <ContextoDadosAvisos value={criarFalso(inicial).dados}>
          <RouterProvider router={roteador} />
        </ContextoDadosAvisos>
      </ProvedorDadosRotina>
    </ProvedorDadosConta>,
  )
  await aguardarCarga()
  return { roteador }
}

// ---- o que os CSS garantem ----

/** O `min-height` (px) que o CSS dá a uma classe: o primeiro bloco `seletor { ... min-height: Npx }`. */
function pisoDoCss(css: string, seletor: RegExp): number {
  // O seletor não pode continuar em outro nome (`.cm-cab-link` não é `.cm-cab-links` nem `.cm-cab-link-x`).
  const bloco = css.match(new RegExp(`${seletor.source}(?![\\w-])[^{}]*\\{([^}]*)\\}`))
  const altura = bloco?.[1].match(/min-height:\s*(\d+)px/)
  return altura ? Number(altura[1]) : 0
}

/** A altura mínima de um elemento, pelas classes dele (a maior entre as regras que existem nos CSS). */
function pisoDoElemento(elemento: Element): number {
  const classes = new Set(elemento.classList)
  const pisos = [0]
  if (classes.has('alvo-toque')) pisos.push(pisoDoCss(INDEX, /:where\(\.alvo-toque\)/))
  if (classes.has('cm-cab-link')) pisos.push(pisoDoCss(SITE, /\.cm-cab-link/))
  if (classes.has('cm-botao')) pisos.push(pisoDoCss(SITE, /\.cm-botao/))
  return Math.max(...pisos)
}

function luminancia(cor: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const canal = parseInt(cor.slice(i, i + 2), 16) / 255
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}

const token = (nome: string) => TOKENS.match(new RegExp(`${nome}:\\s*(#[0-9A-Fa-f]{6})`))![1]

// ---- as conferências, por nome (o registro prova que um caso que falta reprova) ----

const cabecalho = () => document.querySelector<HTMLElement>('header[data-cabecalho]')!
const principal = () => screen.getByRole('main')
const CONTROLES = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

function conferirTela(roteador: { state: { location: { pathname: string } } }) {
  // /app/* nunca termina em /entrar: a tela errada reprova antes de qualquer medida.
  if (roteador.state.location.pathname !== '/app/avisos') {
    throw new Error(`Tela errada: ${roteador.state.location.pathname}`)
  }
  if (screen.getByRole('heading', { level: 1 }).textContent !== AVISOS_TEXTOS.h1) throw new Error('h1 errado')
}

function conferirAlvo(elemento: Element, minimo: number) {
  const piso = pisoDoElemento(elemento)
  if (piso < minimo) throw new Error(`Alvo de ${piso} px, abaixo de ${minimo} px: ${elemento.className}`)
}

const CASOS: Record<string, () => void> = {
  'o link do cabeçalho (linha) tem alvo de 44 px': () => {
    const link = within(cabecalho()).getByRole('link', { name: /^Avisos/ })
    conferirAlvo(link, ALVO_MINIMO)
  },
  'o botão e os links da página têm alvo de 44 px': () => {
    for (const controle of principal().querySelectorAll('a[href], button')) conferirAlvo(controle, ALVO_MINIMO)
  },
}

function conferir(nome: string) {
  const caso = CASOS[nome]
  if (!caso) throw new Error(`Caso sem conferência: ${nome}`)
  caso()
}

describe('o próprio teste reprova o que deve reprovar', () => {
  it('um caso que falta reprova', () => {
    expect(() => conferir('caso que não existe')).toThrow('Caso sem conferência')
  })

  it('a tela errada reprova: sem sessão, /app/avisos termina em /entrar', async () => {
    const { roteador } = await montar(estado([aviso(1)]), { sessao: null })
    await screen.findByRole('heading', { level: 1 })

    expect(roteador.state.location.pathname).toBe('/entrar')
    expect(() => conferirTela(roteador)).toThrow('Tela errada')
  })

  it('um limite plantado de 45 px reprova o alvo de 44 px', async () => {
    const { roteador } = await montar(estado([aviso(1)]))
    conferirTela(roteador)

    // O link do cabeçalho tem o piso de 44 px exatos (o do botão da página é maior): 45 plantado reprova.
    const link = within(cabecalho()).getByRole('link', { name: /^Avisos/ })
    expect(pisoDoElemento(link)).toBe(ALVO_MINIMO)
    expect(() => conferirAlvo(link, ALVO_MINIMO + 1)).toThrow('Alvo de')
    expect(() => conferirAlvo(link, ALVO_MINIMO)).not.toThrow()
  })

  it('o contraste reprova um par claro sobre claro (a conta distingue)', () => {
    expect(contraste(token('--color-mel'), token('--color-branco'))).toBeLessThan(CONTRASTE_MINIMO)
  })
})

describe('a entrada do cabeçalho', () => {
  it('na linha: alvo de 44 px, sem tirar o contorno de foco', async () => {
    const { roteador } = await montar(estado([aviso(1)]))
    conferirTela(roteador)

    conferir('o link do cabeçalho (linha) tem alvo de 44 px')
    const link = within(cabecalho()).getByRole('link', { name: /^Avisos/ })
    expect(link.className).not.toMatch(/outline-none|focus:outline/)
    link.focus()
    expect(document.activeElement).toBe(link)
  })

  it('no menu de 390: o link é o primeiro item e tem o alvo do botão do menu (56 px)', async () => {
    const { roteador } = await montar(estado([aviso(1)]), { largura: LARGURA_DO_CELULAR })
    conferirTela(roteador)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    const acoes = document.querySelector<HTMLElement>('[data-menu-celular] .cm-menu-acoes')!
    const link = within(acoes).getByRole('link', { name: /^Avisos/ })
    expect(acoes.firstElementChild).toBe(link)
    expect(pisoDoElemento(link)).toBeGreaterThanOrEqual(ALVO_MINIMO)
    expect(pisoDoElemento(link)).toBe(pisoDoElemento(within(acoes).getByRole('link', { name: 'Conta' })))
  })

  it('a pílula: mel com cacau passa de 4,5:1 e é só visual', async () => {
    await montar(estado([aviso(1), aviso(2)]))

    const pilula = within(cabecalho()).getByRole('link', { name: /^Avisos/ }).querySelector<HTMLElement>('[data-pilula-avisos]')!
    expect(pilula.classList.contains('bg-mel')).toBe(true)
    expect(pilula.classList.contains('text-cacau')).toBe(true)
    expect(pilula.getAttribute('aria-hidden')).toBe('true')
    expect(contraste(token('--color-cacau'), token('--color-mel'))).toBeGreaterThanOrEqual(CONTRASTE_MINIMO)
  })
})

describe('a página', () => {
  it('o botão tem alvo de 44 px e o link do estado desligado também', async () => {
    const { roteador } = await montar(estado([aviso(1)]))
    conferirTela(roteador)
    conferir('o botão e os links da página têm alvo de 44 px')
    expect(within(principal()).getByRole('button', { name: AVISOS_TEXTOS.botao })).toBeTruthy()
  })

  it('desligado: o link "Ligar os avisos na Conta" tem alvo de 44 px', async () => {
    const { roteador } = await montar(estado([], false))
    conferirTela(roteador)

    const ligar = within(principal()).getByRole('link', { name: AVISOS_TEXTOS.ligarNaConta })
    conferirAlvo(ligar, ALVO_MINIMO)
  })

  it('o foco do teclado usa --cor-foco, e nenhum controle da página o desliga', async () => {
    await montar(estado([aviso(1), aviso(2)]))

    expect(INDEX).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--cor-foco\)/)
    expect(INDEX).toMatch(/\.alvo-foco:focus-visible\s*\{[^}]*var\(--cor-foco\)/)
    for (const controle of principal().querySelectorAll<HTMLElement>(CONTROLES)) {
      expect(controle.className).not.toMatch(/outline-none|focus:outline/)
    }
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.classList.contains('alvo-foco')).toBe(true)
    expect(h1.getAttribute('tabindex')).toBe('-1')
  })

  it('o teclado chega ao botão antes da lista, e a lista não tem parada própria', async () => {
    await montar(estado([aviso(3), aviso(2), aviso(1)]))

    const paradas = [...principal().querySelectorAll<HTMLElement>(CONTROLES)]
    const botao = within(principal()).getByRole('button', { name: AVISOS_TEXTOS.botao })
    expect(paradas[0]).toBe(botao)
    const lista = principal().querySelector('ul')!
    expect(paradas.filter((parada) => lista.contains(parada))).toEqual([])
    expect(botao.compareDocumentPosition(lista) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })

  describe('390 com o texto a 200%: todo link e botão da página quebra a linha em vez de alargar a página', () => {
    const QUEBRA = ['max-w-full', 'whitespace-normal', 'wrap-anywhere']

    function conferirQuebra(esperados: string[]) {
      const controles = [...principal().querySelectorAll('a[href], button')]
      const nomes = controles.map((controle) => controle.textContent?.trim())
      for (const esperado of esperados) expect(nomes).toContain(esperado)
      for (const controle of controles) {
        const classes = [...controle.classList]
        expect(
          QUEBRA.filter((classe) => !classes.includes(classe)),
          `"${controle.textContent}" não quebra: ${controle.className}`,
        ).toEqual([])
      }
    }

    it('desligado: o link "Ligar os avisos na Conta"', async () => {
      await montar(estado([], false), { largura: LARGURA_DO_CELULAR })
      conferirQuebra([AVISOS_TEXTOS.ligarNaConta])
    })

    it('vazio, quem escreve na família: o link "Nova nota"', async () => {
      await montar(estado([]), { largura: LARGURA_DO_CELULAR })
      await within(principal()).findByRole('link', { name: NOTAS.nova })
      conferirQuebra([NOTAS.nova])
    })

    it('vazio, observador na família: o link "Ir para o Hoje"', async () => {
      await montar(estado([]), { largura: LARGURA_DO_CELULAR, sessao: 'icaro', papelDeIcaro: 'observador' })
      await within(principal()).findByRole('link', { name: CABECALHO.irParaHoje })
      conferirQuebra([CABECALHO.irParaHoje])
    })

    it('ligado, com lista: o botão de marcar', async () => {
      await montar(estado([aviso(2), aviso(1)]), { largura: LARGURA_DO_CELULAR })
      conferirQuebra([AVISOS_TEXTOS.botao])
    })
  })

  it('390 com o texto a 200%: nada força largura (quebra em qualquer ponto, colunas sem mínimo, sem largura fixa)', async () => {
    const longo = `${'x'.repeat(200)}\n${'palavra '.repeat(60)}`
    await montar(estado([aviso(3, longo), aviso(2, longo), aviso(1)]), { largura: LARGURA_DO_CELULAR })
    document.documentElement.style.fontSize = '200%'

    try {
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1.classList.contains('wrap-anywhere')).toBe(true)
      for (const item of within(principal()).getAllByRole('listitem')) {
        const [autor, texto, momento] = [...item.querySelectorAll('p')]
        for (const linha of [autor, texto, momento]) expect(linha.classList.contains('wrap-anywhere')).toBe(true)
        expect(texto.classList.contains('whitespace-pre-line')).toBe(true)
      }
      for (const elemento of principal().querySelectorAll('*')) {
        const classes = [...elemento.classList]
        expect(classes.filter((classe) => /^whitespace-nowrap$|^(min-)?w-\[\d/.test(classe))).toEqual([])
      }
      // A coluna do painel de mel é `minmax(0, ...)`: o texto largo não a alarga.
      const painel = within(principal()).getAllByRole('listitem')[0]
      expect(painel.className).toMatch(/minmax\(0/)
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
    } finally {
      document.documentElement.style.fontSize = ''
    }
  })
})
