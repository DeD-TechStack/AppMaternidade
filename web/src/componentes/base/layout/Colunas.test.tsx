import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Colunas, Coluna, QUEBRAS_DE_COLUNAS, modeloDasColunas } from './Colunas.tsx'
import { blocoDe, condicoesDeMedia, corpoDe, cssDoLayout, declara } from './cssDoLayout.ts'

// H3:RF-01, Colunas: frações, vão (midia ou bloco) e o empilhamento nos pontos de quebra que o código já tem.

describe('Colunas: markup', () => {
  it('é um <div data-h="colunas"> com o vão de bloco e a quebra de 768 por padrão, e cada Coluna leva data-h="coluna"', () => {
    const { container } = render(
      <Colunas className="c" id="i">
        <Coluna>a</Coluna>
        <Coluna>b</Coluna>
      </Colunas>,
    )
    const colunas = container.firstElementChild!
    expect(colunas.getAttribute('data-h')).toBe('colunas')
    expect(colunas.getAttribute('data-h-vao')).toBe('bloco')
    expect(colunas.getAttribute('data-h-quebra')).toBe('768')
    expect(colunas.classList.contains('c')).toBe(true)
    expect(colunas.id).toBe('i')
    const filhas = [...colunas.children]
    expect(filhas.map((f) => f.getAttribute('data-h'))).toEqual(['coluna', 'coluna'])
  })

  it('vao="midia" (texto e mídia) e a quebra escolhida vão em atributos', () => {
    const { container } = render(
      <Colunas vao="midia" aPartirDe={1100} alinhar="centro">
        <Coluna>a</Coluna>
      </Colunas>,
    )
    const colunas = container.firstElementChild!
    expect(colunas.getAttribute('data-h-vao')).toBe('midia')
    expect(colunas.getAttribute('data-h-quebra')).toBe('1100')
    expect(colunas.getAttribute('data-h-alinhar')).toBe('centro')
  })

  it('as frações vão na variável --h-colunas, com minmax(0, ...) para o conteúdo nunca alargar a coluna', () => {
    const { container } = render(
      <Colunas fracoes="7fr 5fr">
        <Coluna>a</Coluna>
        <Coluna>b</Coluna>
      </Colunas>,
    )
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--h-colunas')).toBe(
      'minmax(0, 7fr) minmax(0, 5fr)',
    )
  })

  it('o modelo padrão é de duas colunas iguais, e medidas fixas (16rem 1fr) e modelos prontos são mantidos', () => {
    expect(modeloDasColunas(undefined)).toBe('minmax(0, 1fr) minmax(0, 1fr)')
    expect(modeloDasColunas('2fr 3fr')).toBe('minmax(0, 2fr) minmax(0, 3fr)')
    expect(modeloDasColunas('16rem 1fr')).toBe('16rem minmax(0, 1fr)')
    expect(modeloDasColunas('repeat(3, minmax(0, 1fr))')).toBe('repeat(3, minmax(0, 1fr))')
  })

  it('Coluna e Colunas aceitam dataH com mais de um valor, e a medida acha pelo ~=', () => {
    const { container } = render(
      <Colunas dataH="x">
        <Coluna dataH="cartao">a</Coluna>
      </Colunas>,
    )
    expect(container.firstElementChild!.getAttribute('data-h')).toBe('x colunas')
    expect(container.firstElementChild!.firstElementChild!.getAttribute('data-h')).toBe('cartao coluna')
    expect(container.querySelector("[data-h~='coluna']")).not.toBeNull()
  })
})

describe('Colunas: vão e quebra (layout.css)', () => {
  it('é uma grade de uma coluna (empilhada) com vão espaco-bloco, e o vão de midia vale também na vertical', () => {
    const base = corpoDe("[data-h~='colunas']")
    expect(declara(base, 'display', 'grid')).toBe(true)
    expect(declara(base, 'grid-template-columns', 'minmax(0, 1fr)')).toBe(true)
    // `gap` define a linha e a coluna: o mesmo vão vira vertical ao empilhar.
    expect(declara(base, 'gap', 'var(--espaco-bloco)')).toBe(true)
    expect(declara(corpoDe("[data-h~='colunas'][data-h-vao='midia']"), 'gap', 'var(--espaco-midia)')).toBe(true)
    expect(declara(corpoDe("[data-h~='colunas'][data-h-vao='bloco']"), 'gap', 'var(--espaco-bloco)')).toBe(true)
  })

  it('a coluna aceita encolher (min-width 0)', () => {
    expect(declara(corpoDe("[data-h~='coluna']"), 'min-width', '0')).toBe(true)
  })

  it('o alinhamento vertical tem centro, início, fim', () => {
    expect(declara(corpoDe("[data-h~='colunas'][data-h-alinhar='centro']"), 'align-items', 'center')).toBe(true)
    expect(declara(corpoDe("[data-h~='colunas'][data-h-alinhar='inicio']"), 'align-items', 'start')).toBe(true)
    expect(declara(corpoDe("[data-h~='colunas'][data-h-alinhar='fim']"), 'align-items', 'end')).toBe(true)
  })

  it('as quebras são só pontos de quebra que o código já tem hoje, e cada uma liga as frações a partir da largura dela', () => {
    expect([...QUEBRAS_DE_COLUNAS]).toEqual([768, 900, 992, 1024, 1100, 1200])
    for (const quebra of QUEBRAS_DE_COLUNAS) {
      const bloco = blocoDe(cssDoLayout, `@media (min-width: ${quebra}px)`)
      expect(bloco, String(quebra)).not.toBeNull()
      expect(
        declara(corpoDe(`[data-h~='colunas'][data-h-quebra='${quebra}']`, bloco!), 'grid-template-columns', 'var(--h-colunas)'),
        String(quebra),
      ).toBe(true)
    }
  })

  it('o arquivo não cria ponto de quebra: toda @media é uma das de hoje', () => {
    const existentes = QUEBRAS_DE_COLUNAS.map((q) => `(min-width: ${q}px)`)
    const condicoes = condicoesDeMedia()
    expect(condicoes.length).toBeGreaterThan(0)
    for (const condicao of condicoes) expect(existentes, condicao).toContain(condicao)
  })
})
