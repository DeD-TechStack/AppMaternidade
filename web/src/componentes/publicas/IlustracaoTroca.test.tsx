import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { IlustracaoColo } from '../../prototipo/IlustracaoColo.tsx'
import { IlustracaoTroca } from './IlustracaoTroca.tsx'

// Correção 5: a ilustração da troca mostra dois adultos e um bebê enrolado nos braços entre eles,
// na mesma escala do bebê do colo. O jsdom não pinta: o que se confere é a geometria do desenho.

const numero = (elemento: Element, atributo: string) => parseFloat(elemento.getAttribute(atributo)!)

function desenhar(componente: React.ReactElement) {
  const { container } = render(componente)
  return container.querySelector('svg')!
}

/** O bebê enrolado: a elipse inclinada (rotate) que cobre o corpo. */
const mantaDe = (svg: Element) => svg.querySelector('ellipse[transform^="rotate("]')!
/** A cabeça do bebê: o círculo cor de barro (os adultos têm a cabeça de papel). */
const cabecaDoBebeDe = (svg: Element) => svg.querySelector('circle.ilu-barro')!
const cabecasDosAdultos = (svg: Element) => [...svg.querySelectorAll('circle.ilu-papel')].filter((c) => numero(c, 'r') >= 15)

describe('IlustracaoTroca', () => {
  it('é uma ilustração decorativa, com viewBox justo e o chão de borda a borda', () => {
    const svg = desenhar(<IlustracaoTroca />)

    expect(svg.getAttribute('data-ilustracao')).toBe('troca')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    const [, y, largura, altura] = svg.getAttribute('viewBox')!.split(/\s+/).map(Number)
    expect(y + altura).toBeGreaterThanOrEqual(221)
    expect(y + altura).toBeLessThanOrEqual(223)
    expect(largura).toBeLessThan(240)
    expect(svg.querySelector('path[d="M0 220H240"]')).not.toBeNull()
  })

  it('tem dois adultos, e o bebê enrolado fica entre eles', () => {
    const svg = desenhar(<IlustracaoTroca />)

    const adultos = cabecasDosAdultos(svg)
    expect(adultos).toHaveLength(2)
    const [esquerda, direita] = adultos.map((c) => numero(c, 'cx')).sort((a, b) => a - b)
    const manta = mantaDe(svg)
    const cabeca = cabecaDoBebeDe(svg)
    expect(manta).not.toBeNull()
    expect(cabeca).not.toBeNull()
    expect(numero(manta, 'cx')).toBeGreaterThan(esquerda)
    expect(numero(manta, 'cx')).toBeLessThan(direita)
    expect(numero(cabeca, 'cx')).toBeGreaterThan(esquerda)
    expect(numero(cabeca, 'cx')).toBeLessThan(direita)
  })

  it('o bebê tem a escala do bebê do colo (pelo menos 90% da manta e da cabeça)', () => {
    const colo = desenhar(<IlustracaoColo />)
    const troca = desenhar(<IlustracaoTroca />)

    expect(numero(mantaDe(troca), 'rx')).toBeGreaterThanOrEqual(0.9 * numero(mantaDe(colo), 'rx'))
    expect(numero(mantaDe(troca), 'ry')).toBeGreaterThanOrEqual(0.9 * numero(mantaDe(colo), 'ry'))
    expect(numero(cabecaDoBebeDe(troca), 'r')).toBeGreaterThanOrEqual(0.9 * numero(cabecaDoBebeDe(colo), 'r'))
  })

  it('cada adulto tem um braço que chega ao bebê: o braço termina numa mão sob a manta', () => {
    const svg = desenhar(<IlustracaoTroca />)

    const manta = mantaDe(svg)
    const centro = numero(manta, 'cx')
    const baixo = numero(manta, 'cy') + numero(manta, 'ry')
    // As mãos são os círculos pequenos de papel; uma de cada lado do centro do bebê, rente à base da manta.
    const maos = [...svg.querySelectorAll('circle.ilu-papel')].filter((c) => numero(c, 'r') < 10)
    expect(maos.filter((m) => numero(m, 'cx') < centro)).toHaveLength(1)
    expect(maos.filter((m) => numero(m, 'cx') > centro)).toHaveLength(1)
    for (const mao of maos) expect(Math.abs(numero(mao, 'cy') - baixo)).toBeLessThanOrEqual(8)
  })
})
