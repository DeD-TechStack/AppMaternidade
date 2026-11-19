import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ROTULO_MENU } from '../componentes/casca/textos.ts'
import { aguardarCarga, renderizarRota } from './renderizarRota.tsx'

// HEADER-200: com a raiz a 200 % o cabeçalho tem de caber na janela. O jsdom não faz layout: aqui vai só o que ele
// enxerga (a faixa que é o container, o botão do menu e o CSS). A geometria é do medidor, no Chrome
// (`node .oc/medir.mjs`), em 320, 390, 768 e 1440, a 100 % e a 200 %.

const PASTA = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(PASTA, '../styles/site.css'), 'utf8').replaceAll('\r\n', '\n').replace(/\/\*[\s\S]*?\*\//g, '')

const cabecalho = () => document.querySelector<HTMLElement>('header[data-cabecalho]')!

describe('HEADER-200 a marcação do cabeçalho', () => {
  it('só a linha do cabeçalho fica dentro da faixa; o menu do celular e o alerta ficam fora dela', async () => {
    renderizarRota('/', { sessao: null })
    await aguardarCarga()
    const faixa = cabecalho().querySelector<HTMLElement>('.cm-cab-faixa')
    expect(faixa).not.toBeNull()
    // A faixa é filha direta do <header> e leva a linha (.cm-cab-miolo) e nada além dela.
    expect(faixa!.parentElement).toBe(cabecalho())
    expect([...faixa!.children].map((filho) => filho.className)).toEqual(['cm-cab-miolo'])
    // `container-type` faz da faixa o bloco de contenção de filhos fixed/absolute: o menu fica fora.
    const menu = cabecalho().querySelector('[data-menu-celular]')
    expect(menu).not.toBeNull()
    expect(faixa!.contains(menu)).toBe(false)
  })

  it('o botão do menu guarda aria-expanded e aria-controls, e vem depois da pílula na ordem do DOM', async () => {
    renderizarRota('/', { sessao: null })
    await aguardarCarga()
    const botao = within(cabecalho()).getByRole('button', { name: ROTULO_MENU })
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    const idDoMenu = botao.getAttribute('aria-controls')
    expect(idDoMenu).toBeTruthy()
    expect(document.getElementById(idDoMenu!)).not.toBeNull()
    const pilula = cabecalho().querySelector('a[data-cabecalho-pilula]')!
    expect(pilula.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('HEADER-200 o CSS do cabeçalho', () => {
  it('a faixa é um container de largura (inline-size) com nome, e ocupa a altura do cabeçalho', () => {
    const regra = /\.cm-cab-faixa\s*\{([^{}]*)\}/.exec(css)
    expect(regra, 'a regra .cm-cab-faixa').not.toBeNull()
    expect(regra![1]).toMatch(/container\s*:\s*cm-cab\s*\/\s*inline-size/)
    expect(regra![1]).toMatch(/height\s*:\s*100%/)
  })

  it('a linha de links de 1100 px também exige 67 rem de faixa (consulta em rem: segue a letra da raiz)', () => {
    const texto = css.replace(/\s+/g, ' ')
    expect(texto).toMatch(/@media \(min-width: 1100px\) \{ @container cm-cab \(min-width: 67rem\) \{ \.cm-cab-miolo \{ gap: 24px;/)
    // O botão do menu só some dentro das duas condições.
    expect(texto).toMatch(/@container cm-cab \(min-width: 67rem\) \{[^@]*\.sb-cab-menu \{ display: none;/)
  })

  it('a pílula compacta da faixa estreita usa unidades de container, sem largura fixa em px e sem esconder o texto', () => {
    const achada = /@container cm-cab \(max-width: 16rem\)\s*\{((?:[^{}]*\{[^{}]*\})+)\s*\}/.exec(css)
    expect(achada, 'o @container (max-width: 16rem)').not.toBeNull()
    const corpo = achada![1]
    // A conta com cqw mora num token local `--texto-*` (o lint de harmonia só aceita `var(--texto-*)` em font-size).
    expect(corpo).toMatch(/--texto-cab-pilula-tamanho\s*:\s*min\(var\(--texto-pequeno-tamanho\),\s*[\d.]+cqw\)/)
    expect(corpo).toMatch(/font-size\s*:\s*var\(--texto-cab-pilula-tamanho\)/)
    // O recuo é em `em`: encolhe junto com a letra.
    expect(corpo).toMatch(/padding\s*:\s*0\s+[\d.]+em\b/)
    expect(corpo).not.toMatch(/display\s*:\s*none|visibility\s*:\s*hidden|overflow\s*:|text-overflow|(?<![-\w])(?:min-|max-)?width\s*:/i)
    // 16 rem são 256 px a 100 %: nenhuma janela de 320 em diante cai nesta regra com a letra normal.
    expect(16 * 16).toBeLessThan(320)
  })
})
