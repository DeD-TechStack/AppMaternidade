import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { corpoDe, declara } from './cssDoLayout.ts'
import { Pilha } from './Pilha.tsx'

// H3:RF-01, Pilha: vão vertical igual ao token do papel (data-h-vao).

const VAOS = ['junto', 'pilha', 'grupo', 'bloco', 'midia'] as const

describe('Pilha: markup', () => {
  it('é um <div data-h="pilha" data-h-vao="pilha"> por padrão, com className e props repassadas', () => {
    const { container } = render(
      <Pilha className="p" id="pp">
        <p>a</p>
        <p>b</p>
      </Pilha>,
    )
    const pilha = container.firstElementChild!
    expect(pilha.tagName).toBe('DIV')
    expect(pilha.getAttribute('data-h')).toBe('pilha')
    expect(pilha.getAttribute('data-h-vao')).toBe('pilha')
    expect(pilha.classList.contains('p')).toBe(true)
    expect(pilha.id).toBe('pp')
    expect(pilha.children).toHaveLength(2)
  })

  it.each(VAOS)('vao="%s" vai em data-h-vao', (vao) => {
    const { container } = render(<Pilha vao={vao}>x</Pilha>)
    expect(container.firstElementChild!.getAttribute('data-h-vao')).toBe(vao)
  })

  it('data-h aceita mais de um valor (dataH) e aceita as="ul"', () => {
    const { container } = render(
      <Pilha as="ul" dataH="coluna">
        <li>a</li>
      </Pilha>,
    )
    const pilha = container.firstElementChild!
    expect(pilha.tagName).toBe('UL')
    expect(pilha.getAttribute('data-h')).toBe('coluna pilha')
    expect(pilha.matches("[data-h~='pilha']")).toBe(true)
  })
})

describe('Pilha: vão = token (layout.css)', () => {
  it('é uma coluna flex e o vão padrão é espaco-pilha', () => {
    const corpo = corpoDe("[data-h~='pilha']")
    expect(declara(corpo, 'display', 'flex')).toBe(true)
    expect(declara(corpo, 'flex-direction', 'column')).toBe(true)
    expect(declara(corpo, 'gap', 'var(--espaco-pilha)')).toBe(true)
  })

  it.each(VAOS)('data-h-vao="%s" usa var(--espaco-%s)', (vao) => {
    const corpo = corpoDe(`[data-h~='pilha'][data-h-vao='${vao}']`)
    expect(declara(corpo, 'gap', `var(--espaco-${vao})`)).toBe(true)
  })
})
