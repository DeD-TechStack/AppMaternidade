import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ROTULO_PULAR } from '../componentes/casca/textos.ts'
import { renderizarRotaPronta } from './renderizarRota.tsx'

// Polimento da casca (P-50): o link de pular para o conteúdo, a fonte a 200 % e os
// alvos da madrugada. As medidas de layout não existem no jsdom: o que
// depende delas é conferido nas regras do CSS, com a conta feita no teste.

const lerCss = (nome: string) =>
  readFileSync(join(process.cwd(), 'src', 'styles', nome), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const site = lerCss('site.css')
const campo = lerCss('campo.css')
const todoCss = `${site}\n${campo}`

interface Regra {
  seletor: string
  corpo: string
}
/** As regras de nível mais baixo (sem blocos dentro), com o seletor limpo. */
const regrasDe = (texto: string): Regra[] =>
  [...texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ seletor: m[1].trim().replace(/\s+/g, ' '), corpo: m[2] }))
const regras = regrasDe(todoCss)
const regraComSeletor = (seletor: string) =>
  regras.find((r) => r.seletor.split(',').some((s) => s.trim().replace(/\s+/g, ' ') === seletor))

describe('C-1 link "Pular para o conteúdo" (WCAG 2.4.1)', () => {
  const FOCAVEIS = 'a[href], button, input, select, textarea, [tabindex]'
  const primeiroDoTab = (raiz: HTMLElement) =>
    [...raiz.querySelectorAll<HTMLElement>(FOCAVEIS)].find(
      (el) => el.getAttribute('tabindex') !== '-1' && !el.hasAttribute('disabled') && el.closest('[hidden], [inert]') === null,
    )

  const FAMILIAS: Array<[string, string]> = [
    ['pública (Início)', '/'],
    ['pública (Como funciona)', '/como-funciona'],
    ['pública (Desenvolvimento)', '/desenvolvimento'],
    ['pública (Comunidade, regras)', '/regras-da-comunidade'],
    ['Acesso', '/entrar'],
    ['Conta', '/app/conta'],
    ['Rotina', '/app/hoje'],
    ['Desenvolvimento logado', '/app/desenvolvimento'],
    ['Comunidade logada', '/app/comunidade'],
    ['Moderação', '/moderacao'],
  ]

  it('o texto vem de textos.ts', () => {
    expect(ROTULO_PULAR).toBe('Pular para o conteúdo')
  })

  it.each(FAMILIAS)('em %s (%s) o primeiro Tab cai no link de pular', async (_nome, caminho) => {
    const { container } = await renderizarRotaPronta(caminho)
    const primeiro = primeiroDoTab(container)!
    expect(primeiro.tagName).toBe('A')
    expect(primeiro.textContent).toBe(ROTULO_PULAR)
    expect(primeiro.getAttribute('href')).toBe('#conteudo')
    expect(container.querySelectorAll('a[href="#conteudo"]')).toHaveLength(1)
  })

  it.each(FAMILIAS)('em %s (%s) ativar o link leva o foco ao <main>, sem mudar a rota', async (_nome, caminho) => {
    const rolar = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: rolar, configurable: true, writable: true })
    try {
      const { container, roteador } = await renderizarRotaPronta(caminho)
      const main = container.querySelector<HTMLElement>('main')!
      expect(main).not.toBeNull()
      const antes = roteador.state.location.pathname
      const link = screen.getByRole('link', { name: ROTULO_PULAR })
      link.focus()
      await act(async () => {
        fireEvent.click(link)
      })
      expect(document.activeElement).toBe(main)
      expect(main.id).not.toBe('')
      expect(link.getAttribute('href')).toBe(`#${main.id}`)
      expect(main.getAttribute('tabindex')).toBe('-1')
      expect(rolar).toHaveBeenCalled()
      expect(roteador.state.location.pathname).toBe(antes)
      expect(window.location.hash).toBe('')
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    }
  })

  it('não troca o id que o <main> já tem e não cria um segundo <main>', async () => {
    const { container } = await renderizarRotaPronta('/como-funciona')
    const main = container.querySelector<HTMLElement>('main')!
    main.id = 'meu-conteudo'
    fireEvent.click(screen.getByRole('link', { name: ROTULO_PULAR }))
    expect(main.id).toBe('meu-conteudo')
    expect(document.activeElement).toBe(main)
    expect(container.querySelectorAll('main')).toHaveLength(1)
  })

  it('o CSS esconde o link até o foco e o mostra com os tokens, sem cor solta', () => {
    const parado = regraComSeletor('.cm-pular')
    const focado = regraComSeletor('.cm-pular:focus')
    expect(parado, '.cm-pular').toBeDefined()
    expect(focado, '.cm-pular:focus').toBeDefined()
    expect(parado!.corpo).toMatch(/position:\s*(absolute|fixed)/)
    expect(focado!.corpo).toMatch(/var\(--/)
    expect(`${parado!.corpo}${focado!.corpo}`).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|display:\s*none/i)
    // Ao focar, sai do esconderijo e fica acima do cabeçalho (z-index 40).
    expect(focado!.corpo).toMatch(/z-index:\s*(4[1-9]|[5-9]\d|\d{3,})/)
  })

  it('o <main> focado por programa não ganha anel (não é um controle)', () => {
    expect(regraComSeletor("main[tabindex='-1']:focus")?.corpo).toMatch(/outline:\s*none/)
  })
})

describe('C-3 fonte a 200 % em 390 px', () => {
  it('a marca encolhe com a janela (min() com vw) e continua 24 px a 100 %', () => {
    const base = regras.find((r) => r.seletor === '.cm-marca' && /min-height:\s*44px/.test(r.corpo))!
    const vw = Number(/font-size:\s*min\(1\.5rem,\s*([\d.]+)vw\)/.exec(base.corpo)?.[1])
    expect(vw).toBeGreaterThan(0)
    // A 100 % em 390: o menor entre 24 e vw% de 390 continua 24.
    expect(Math.min(24, (vw / 100) * 390)).toBe(24)
  })

  it('a conta de 390 com a fonte a 200 %: marca + lua + menu cabem nos 350 px da área', () => {
    const base = regras.find((r) => r.seletor === '.cm-marca' && /min-height:\s*44px/.test(r.corpo))!
    const vw = Number(/min\(1\.5rem,\s*([\d.]+)vw\)/.exec(base.corpo)?.[1])
    const marca = 8.25 * Math.min(2 * 24, (vw / 100) * 390) // "AppMaternidade" mede 8,25 em (7,966 + tracking de -0,01 em)
    const acoes = 48 + 8 + (48 - 14.25) // lua 48, folga 8, menu 48 com o recuo de -14,25
    const area = 390 - 2 * 20
    expect(marca + 16 + acoes).toBeLessThanOrEqual(area)
  })

  it('o cabeçalho nunca passa da janela: max-width 100 % e overflow-x clip, e os filhos aceitam encolher', () => {
    const cab = regras.find((r) => r.seletor === '.cm-cabecalho')!
    expect(cab.corpo).toMatch(/max-width:\s*100%/)
    expect(cab.corpo).toMatch(/overflow-x:\s*clip/)
    expect(regras.find((r) => r.seletor === '.cm-cab-acoes' && /min-width:\s*0/.test(r.corpo))).toBeDefined()
    expect(regras.find((r) => r.seletor === '.cm-cab-miolo' && /min-width:\s*0/.test(r.corpo))).toBeDefined()
  })

  it('o rótulo longo da lua também respeita a janela a 200 % (de 640 para cima)', () => {
    // `[data-tamanho='app']`: empata em especificidade com `.cm-botao[data-tamanho='app']` (17 px) e vem depois dele.
    const regra = regras.find((r) => r.seletor === ".cm-cab-madrugada[data-tamanho='app']" && /font-size:\s*min\(/.test(r.corpo))
    expect(regra).toBeDefined()
    expect(regra!.corpo).toMatch(/font-size:\s*min\(1\.0625rem,\s*[\d.]+vw\)/)
  })
})

describe('C-4 alvos de 56 px na madrugada, só no contexto da Rotina', () => {
  // `includes` e não `split(',')`: o seletor traz `:is(a, button)`, com vírgula dentro.
  const daMadrugada = (seletor: string) => regras.find((r) => r.seletor.includes(seletor) && /min-height:\s*56px/.test(r.corpo))

  it("o link e o botão do cabeçalho (header nav a/button) e da barra da conta têm 56 px só com data-tema='madrugada'", () => {
    expect(daMadrugada(":root[data-tema='madrugada'] header[data-cabecalho] :is(a, button)")).toBeDefined()
    expect(daMadrugada(":root[data-tema='madrugada'] .cm-area > nav :is(a, button)")).toBeDefined()
  })

  it('nenhuma regra de cabeçalho ou de navegação com 56 px vale fora da madrugada', () => {
    const soltas = regras.filter(
      (r) => /min-height:\s*56px/.test(r.corpo) && /(^|[\s,])(header|nav|\.cm-cab|\.sb-cab|\.cm-marca)/.test(r.seletor) && !r.seletor.startsWith(":root[data-tema='madrugada']"),
    )
    expect(soltas.map((r) => r.seletor)).toEqual([])
  })

  it('a madrugada só vive nas rotas da Rotina: fora delas o botão nem existe e não há data-tema', async () => {
    for (const caminho of ['/app/conta', '/app/comunidade', '/app/familia', '/app/desenvolvimento']) {
      const { unmount } = await renderizarRotaPronta(caminho)
      expect(document.documentElement.getAttribute('data-tema'), caminho).toBeNull()
      expect(screen.queryByRole('button', { name: 'Modo madrugada' }), caminho).toBeNull()
      unmount()
    }
    await renderizarRotaPronta('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Modo madrugada' }))
    expect(document.documentElement.getAttribute('data-tema')).toBe('madrugada')
  })
})

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})
