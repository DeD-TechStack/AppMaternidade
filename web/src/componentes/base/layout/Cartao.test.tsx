import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Cartao } from './Cartao.tsx'
import { corpoDe, declara } from './cssDoLayout.ts'
import * as primitivas from './index.ts'

// H3:RF-01, Cartao: padding = espaco-painel nos quatro lados, raio de hoje (cartão, 20), data-h com vários valores.

describe('Cartao: markup', () => {
  it('é um <div data-h="cartao"> com className e props repassadas', () => {
    const { container } = render(
      <Cartao className="k" id="c">
        <p>x</p>
      </Cartao>,
    )
    const cartao = container.firstElementChild!
    expect(cartao.tagName).toBe('DIV')
    expect(cartao.getAttribute('data-h')).toBe('cartao')
    expect(cartao.classList.contains('k')).toBe(true)
    expect(cartao.id).toBe('c')
  })

  it('data-h aceita mais de um valor, como "coluna cartao", e a medida acha pelo ~=', () => {
    const { container } = render(<Cartao dataH="coluna">x</Cartao>)
    const cartao = container.firstElementChild!
    expect(cartao.getAttribute('data-h')).toBe('coluna cartao')
    expect(cartao.matches("[data-h~='cartao']")).toBe(true)
    expect(cartao.matches("[data-h='cartao']")).toBe(false)
  })

  it.each(['article', 'li', 'section'] as const)('aceita as="%s"', (como) => {
    const { container } = render(
      como === 'li' ? (
        <ul>
          <Cartao as="li">x</Cartao>
        </ul>
      ) : (
        <Cartao as={como}>x</Cartao>
      ),
    )
    expect(container.querySelector(como)!.getAttribute('data-h')).toBe('cartao')
  })
})

describe('Cartao: padding e raio (layout.css)', () => {
  it('o padding é espaco-painel em volta e o raio é o do cartão', () => {
    const corpo = corpoDe("[data-h~='cartao']")
    expect(declara(corpo, 'padding', 'var(--espaco-painel)')).toBe(true)
    expect(declara(corpo, 'border-radius', 'var(--radius-cartao)')).toBe(true)
    expect(declara(corpo, 'box-sizing', 'border-box')).toBe(true)
  })
})

describe('index.ts', () => {
  it('exporta as cinco primitivas', () => {
    for (const nome of ['Secao', 'QuadroLayout', 'Pilha', 'Colunas', 'Cartao']) {
      expect(typeof (primitivas as Record<string, unknown>)[nome], nome).toBe('function')
    }
  })
})
