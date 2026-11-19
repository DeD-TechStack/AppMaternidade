import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderizarRota } from './renderizarRota.tsx'

// /sistema, grade de ilustrações: em aparelho de toque (`(hover: none)`) o resumo fica abaixo do cartão,
// dentro do envoltório. O envoltório não pode ter a classe do cartão (altura fixa de 100%), senão o
// resumo transborda sobre a legenda de baixo. Com hover, o resumo é a camada absoluta por cima.

function simularMidia(casa: (consulta: string) => boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: casa(consulta),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('/sistema, grade de ilustrações', () => {
  it('sem hover (toque), o resumo não fica dentro de um elemento com a classe do cartão', () => {
    simularMidia((consulta) => consulta.includes('hover: none'))
    const { container } = renderizarRota('/sistema')
    const itens = [...container.querySelectorAll<HTMLElement>('ul.cm-ilustracoes > li')]
    expect(itens.length).toBeGreaterThan(0)
    for (const li of itens) {
      const resumo = li.querySelector<HTMLElement>('.cm-camada-resumo')
      expect(resumo, li.textContent ?? '').not.toBeNull()
      let ancestral = resumo!.parentElement
      while (ancestral !== null && ancestral !== li) {
        expect(ancestral.classList.contains('cm-ilustracao-cartao'), ancestral.className).toBe(false)
        ancestral = ancestral.parentElement
      }
      expect(ancestral).toBe(li)
    }
  })

  it('com hover, o resumo é a camada absoluta por cima do cartão', () => {
    simularMidia(() => false)
    const { container } = renderizarRota('/sistema')
    const itens = [...container.querySelectorAll<HTMLElement>('ul.cm-ilustracoes > li')]
    expect(itens.length).toBeGreaterThan(0)
    for (const li of itens) {
      const resumo = li.querySelector<HTMLElement>('.cm-camada-resumo')
      expect(resumo, li.textContent ?? '').not.toBeNull()
      expect(resumo!.classList.contains('absolute')).toBe(true)
    }
  })
})
