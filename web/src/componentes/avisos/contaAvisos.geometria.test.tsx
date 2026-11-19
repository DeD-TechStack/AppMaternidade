import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AVISOS_TEXTOS } from '../../conteudo/avisos.ts'
import { ContextoDadosAvisos, type DadosAvisos, type EstadoDosAvisos } from '../../dados/avisos.ts'
import type { Resultado } from '../../dados/comum.ts'
import { criarRotasProntas } from '../../teste/rotasProntas.ts'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'
import { ProvedorDadosConta } from '../conta/sessao.tsx'
import { ProvedorDadosRotina } from '../rotina/dadosRotina.tsx'

// RF14: a geometria da seção "Avisos de outros cuidadores" da Conta. O jsdom não tem layout: como em
// `paginaAvisos.geometria.test.tsx`, confere-se a estrutura e as classes que produzem a geometria (a linha da
// caixa é o rótulo, com o piso de 44 px lido do próprio index.css) e que nada força largura a 390 px, sem
// as medidas em pixel reais (essas ficam para a captura no navegador). O arquivo prova que as conferências
// reprovam: tela errada e limite plantado.

const ler = (...partes: string[]) => readFileSync(join(process.cwd(), 'src', ...partes), 'utf8').replace(/\r\n/g, '\n')
const INDEX = ler('index.css')

const ALVO_MINIMO = 44
const LARGURA_DO_CELULAR = 390
const LARGURA_DO_DESKTOP = 1440

const ok = <T,>(valor: T): Resultado<T> => ({ ok: true, valor })

const LARGURA_ORIGINAL = window.innerWidth

function fixarLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
}

afterEach(() => {
  cleanup()
  fixarLargura(LARGURA_ORIGINAL)
  document.documentElement.style.fontSize = ''
  vi.unstubAllGlobals()
})

async function montar(opcoes: { largura: number; sessao?: 'juliana' | null }) {
  fixarLargura(opcoes.largura)
  const mundo = criarMundoDeTeste({ sessao: opcoes.sessao === undefined ? 'juliana' : opcoes.sessao })
  const estado: EstadoDosAvisos = { ligados: false, avisos: [], maisDe50: false }
  const dados: DadosAvisos = {
    lerEstado: vi.fn(async () => ok(estado)),
    definirLigados: vi.fn(() => new Promise<Resultado<null>>(() => undefined)),
    marcarVistos: vi.fn(async () => ok(null)),
  }
  vi.stubGlobal('scrollTo', vi.fn())
  const roteador = createMemoryRouter(criarRotasProntas(), { initialEntries: ['/app/conta'] })
  render(
    <ProvedorDadosConta dados={mundo.conta}>
      <ProvedorDadosRotina dados={mundo.rotina}>
        <ContextoDadosAvisos value={dados}>
          <RouterProvider router={roteador} />
        </ContextoDadosAvisos>
      </ProvedorDadosRotina>
    </ProvedorDadosConta>,
  )
  await screen.findByRole('heading', { level: 1 })
  return { roteador }
}

/** /app/* nunca termina em /entrar: a tela errada reprova antes de qualquer medida. */
function conferirTela(roteador: { state: { location: { pathname: string } } }) {
  if (roteador.state.location.pathname !== '/app/conta') throw new Error(`Tela errada: ${roteador.state.location.pathname}`)
  if (screen.getByRole('heading', { level: 1 }).textContent !== 'Conta') throw new Error('h1 errado')
}

/** O `min-height` (px) que o CSS dá a uma classe. */
function pisoDoCss(seletor: RegExp): number {
  const bloco = INDEX.match(new RegExp(`${seletor.source}(?![\\w-])[^{}]*\\{([^}]*)\\}`))
  const altura = bloco?.[1].match(/min-height:\s*(\d+)px/)
  return altura ? Number(altura[1]) : 0
}

function pisoDoElemento(elemento: Element): number {
  return elemento.classList.contains('alvo-toque') ? pisoDoCss(/:where\(\.alvo-toque\)/) : 0
}

function conferirAlvo(elemento: Element, minimo: number) {
  const piso = pisoDoElemento(elemento)
  if (piso < minimo) throw new Error(`Alvo de ${piso} px, abaixo de ${minimo} px: ${elemento.className}`)
}

async function linhaDaCaixa() {
  const secao = (await screen.findByRole('heading', { level: 2, name: AVISOS_TEXTOS.secaoTitulo })).closest('section')!
  const caixa = await within(secao).findByRole('checkbox', { name: AVISOS_TEXTOS.rotuloDaCaixa })
  const linha = caixa.closest('label')!
  return { secao, caixa, linha }
}

describe('o próprio teste reprova o que deve reprovar', () => {
  it('a tela errada reprova: sem sessão, /app/conta termina em /entrar', async () => {
    const { roteador } = await montar({ largura: LARGURA_DO_DESKTOP, sessao: null })
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'))
    expect(() => conferirTela(roteador)).toThrow('Tela errada')
  })

  it('um limite plantado de 45 px reprova o alvo de 44 px', async () => {
    const { roteador } = await montar({ largura: LARGURA_DO_DESKTOP })
    conferirTela(roteador)
    const { linha } = await linhaDaCaixa()

    expect(pisoDoElemento(linha)).toBe(ALVO_MINIMO)
    expect(() => conferirAlvo(linha, ALVO_MINIMO + 1)).toThrow('Alvo de')
    expect(() => conferirAlvo(linha, ALVO_MINIMO)).not.toThrow()
  })

  it('uma linha sem a classe do alvo reprova', () => {
    const solta = document.createElement('label')
    expect(() => conferirAlvo(solta, ALVO_MINIMO)).toThrow('Alvo de 0 px')
  })
})

describe('a linha da caixa', () => {
  for (const largura of [LARGURA_DO_CELULAR, LARGURA_DO_DESKTOP]) {
    it(`a ${largura} px: a linha (o rótulo, que é a área de toque) tem pelo menos 44 px de altura e leva a caixa e o texto`, async () => {
      const { roteador } = await montar({ largura })
      conferirTela(roteador)
      const { caixa, linha } = await linhaDaCaixa()

      conferirAlvo(linha, ALVO_MINIMO)
      expect(linha.tagName).toBe('LABEL')
      expect(linha.contains(caixa)).toBe(true)
      expect(linha.textContent).toBe(AVISOS_TEXTOS.rotuloDaCaixa)
      // A própria caixa tem pelo menos 24 px (WCAG 2.5.8) e a linha inteira é clicável.
      expect(caixa.classList.contains('size-6')).toBe(true)
      expect(linha.classList.contains('cursor-pointer')).toBe(true)
    })
  }

  it('a 390 px com o texto a 200%: nada força largura (quebra em qualquer ponto, colunas sem mínimo, sem largura fixa)', async () => {
    const { roteador } = await montar({ largura: LARGURA_DO_CELULAR })
    conferirTela(roteador)
    document.documentElement.style.fontSize = '200%'
    const { secao, linha } = await linhaDaCaixa()

    const texto = linha.querySelector('span')!
    expect(texto.classList.contains('wrap-anywhere')).toBe(true)
    expect(texto.classList.contains('min-w-0')).toBe(true)
    for (const elemento of secao.querySelectorAll('*')) {
      const classes = [...elemento.classList]
      expect(classes.filter((classe) => /^whitespace-nowrap$|^(min-)?w-\[\d/.test(classe))).toEqual([])
    }
    // As duas colunas da seção são `minmax(0, ...)`: o texto largo não as alarga.
    const linhaDeColunas = secao.firstElementChild as HTMLElement
    expect(linhaDeColunas.style.getPropertyValue('--h-colunas').replace(/\s+/g, ' ').trim()).toBe('minmax(0, 5fr) minmax(0, 7fr)')
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  })
})
