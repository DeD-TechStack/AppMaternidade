import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { corpoDe, declara } from './cssDoLayout.ts'
import { QuadroLayout } from './QuadroLayout.tsx'

// H3:RF-01, QuadroLayout (o nome evita a confusão com componentes/comunidade/Quadro.tsx).

describe('QuadroLayout: markup', () => {
  it('é um <div data-h="quadro"> de largura "quadro" por padrão, com className e props repassadas', () => {
    const { container } = render(
      <QuadroLayout className="x" id="q" data-teste="1">
        <p>a</p>
      </QuadroLayout>,
    )
    const quadro = container.firstElementChild!
    expect(quadro.tagName).toBe('DIV')
    expect(quadro.getAttribute('data-h')).toBe('quadro')
    expect(quadro.getAttribute('data-h-largura')).toBe('quadro')
    expect(quadro.classList.contains('x')).toBe(true)
    expect(quadro.id).toBe('q')
    expect(quadro.getAttribute('data-teste')).toBe('1')
  })

  it.each(['quadro', 'medio', 'leitura'] as const)('largura="%s" vai em data-h-largura', (largura) => {
    const { container } = render(<QuadroLayout largura={largura}>x</QuadroLayout>)
    expect(container.firstElementChild!.getAttribute('data-h-largura')).toBe(largura)
  })

  it('data-h aceita mais de um valor (dataH) e a medida acha pelo ~=', () => {
    const { container } = render(<QuadroLayout dataH="coluna">x</QuadroLayout>)
    const quadro = container.firstElementChild!
    expect(quadro.getAttribute('data-h')).toBe('coluna quadro')
    expect(quadro.matches("[data-h~='quadro']")).toBe(true)
  })

  it('aceita as="header" e as="nav" (o cabeçalho põe o conteúdo dentro do quadro)', () => {
    const { container } = render(<QuadroLayout as="nav">x</QuadroLayout>)
    expect(container.firstElementChild!.tagName).toBe('NAV')
  })
})

describe('QuadroLayout: largura e calha (layout.css)', () => {
  it('a largura útil é min(quadro-largura, 100vw - 2 x calha), centrada', () => {
    const corpo = corpoDe("[data-h~='quadro']")
    expect(declara(corpo, 'width', 'min(var(--quadro-largura), 100vw - 2 * var(--quadro-calha))')).toBe(true)
    expect(declara(corpo, 'margin-inline', 'auto')).toBe(true)
  })

  // As contas abaixo usam os tokens do tema gerado (FLUID-DS): a calha é a reta de 20 (390) a 32 (1440), parada em
  // 320 e em 1920; a largura do quadro é 1200 até 1440 e a reta até 1600 em 2560.
  const calha = (janela: number) => {
    const reta = (j: number) => 20 + ((j - 390) * 12) / 1050
    return Math.min(reta(1920), Math.max(reta(320), reta(janela)))
  }
  const quadroLargura = (janela: number) => Math.min(1600, Math.max(1200, 1200 + ((janela - 1440) * 400) / 1120))
  const quadro = (janela: number) => Math.min(quadroLargura(janela), janela - 2 * calha(janela))

  it('a conta: em 390 o quadro tem 350 e em 1440 tem 1200 (calha de 20 e de 32), os números de antes', () => {
    expect(quadro(390)).toBe(350)
    expect(quadro(1440)).toBe(1200)
  })

  it('a conta: em 320 o quadro tem 281,6 (calha de 19,2), sem estourar a janela', () => {
    expect(quadro(320)).toBeCloseTo(281.6, 6)
  })

  it('a conta: em 1920 o quadro cresce para ~1371 e em 2560 para no teto de 1600', () => {
    expect(quadro(1920)).toBeCloseTo(1200 + (400 * 480) / 1120, 6)
    expect(quadro(2560)).toBe(1600)
  })

  it('medio e leitura limitam a largura com os tokens do DESIGN.md e ficam na borda esquerda do quadro, sem centrar', () => {
    for (const [largura, token] of [
      ['medio', '--medio'],
      ['leitura', '--leitura'],
    ] as const) {
      const corpo = corpoDe(`[data-h~='quadro'][data-h-largura='${largura}']`)
      expect(declara(corpo, 'max-width', `var(${token})`), largura).toBe(true)
      // borda esquerda do quadro = max(calha, (página - 1200) / 2); a direita fica livre (auto).
      expect(
        declara(corpo, 'margin-inline', 'max(var(--quadro-calha), (100% - var(--quadro-largura)) / 2) auto'),
        largura,
      ).toBe(true)
    }
  })

  it('a borda esquerda de medio e leitura é a do quadro de 320 a 2560', () => {
    const bordaDoQuadro = (janela: number) => (janela - quadro(janela)) / 2
    const bordaDaMargem = (janela: number) => Math.max(calha(janela), (janela - quadroLargura(janela)) / 2)
    expect(bordaDaMargem(320)).toBeCloseTo(bordaDoQuadro(320), 6)
    for (const janela of [390, 1000, 1250, 1440]) {
      expect(bordaDaMargem(janela), String(janela)).toBeCloseTo(bordaDoQuadro(janela), 6)
    }
    expect(bordaDaMargem(1920)).toBeCloseTo(bordaDoQuadro(1920), 6)
    expect(bordaDaMargem(2560)).toBeCloseTo(bordaDoQuadro(2560), 6)
  })
})
