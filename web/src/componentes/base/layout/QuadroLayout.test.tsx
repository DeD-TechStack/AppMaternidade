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

  it('a conta: em 1440 o quadro tem 1200 e em 390 tem 350 (calha de 32 e de 20)', () => {
    const quadro = (janela: number, calha: number) => Math.min(1200, janela - 2 * calha)
    expect(quadro(1440, 32)).toBe(1200)
    expect(quadro(390, 20)).toBe(350)
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

  it('a borda esquerda de medio e leitura é a do quadro em 390, 1000, 1250 e 1440', () => {
    const calha = (janela: number) => Math.min(32, Math.max(20, 20 + ((janela - 390) * 12) / 1050))
    const bordaDoQuadro = (janela: number) => (janela - Math.min(1200, janela - 2 * calha(janela))) / 2
    const bordaDaMargem = (janela: number) => Math.max(calha(janela), (janela - 1200) / 2)
    for (const janela of [390, 1000, 1250, 1440]) {
      expect(bordaDaMargem(janela), String(janela)).toBeCloseTo(bordaDoQuadro(janela), 6)
    }
  })
})
