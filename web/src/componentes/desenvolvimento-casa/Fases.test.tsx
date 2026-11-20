// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FASES, IDEIAS } from '../../conteudo/desenvolvimento/itens.ts'
import { ROTULOS_FONTES } from '../../conteudo/desenvolvimento/pagina.ts'
import { Fases } from './Fases.tsx'
import '../../teste/setup.ts'

describe('índice nativo das fases', () => {
  it('oferece um link visível por fase, na ordem, para cada ID existente e único', () => {
    const { container } = render(<Fases />)
    const indice = screen.getByRole('navigation', { name: IDEIAS.rotuloSeletor })
    expect(within(indice).getByText(IDEIAS.rotuloSeletor)).toBeTruthy()
    const links = within(indice).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(FASES.map((fase) => fase.titulo))
    for (const [i, fase] of FASES.entries()) {
      expect(links[i].getAttribute('href')).toBe(`#${fase.id}`)
      expect(links[i].tagName).toBe('A')
      expect(links[i].tabIndex).toBe(0)
      const destinos = container.querySelectorAll(`[id="${fase.id}"]`)
      expect(destinos).toHaveLength(1)
      expect(within(destinos[0] as HTMLElement).getByRole('heading', { level: 3 }).textContent).toBe(fase.titulo)
    }
    const lista = container.querySelector('[data-fases]')!
    expect(indice.compareDocumentPosition(lista) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })

  it('preserva uma lista aberta com os itens, fontes e datas originais na mesma ordem', () => {
    const { container } = render(<Fases />)
    const listas = container.querySelectorAll('[data-fases]')
    expect(listas).toHaveLength(1)
    const fases = [...listas[0].children] as HTMLElement[]
    expect(fases.map((fase) => fase.id)).toEqual(FASES.map((fase) => fase.id))
    for (const [i, fase] of fases.entries()) {
      expect(within(fase).getByRole('heading', { level: 3, name: FASES[i].titulo })).toBeTruthy()
      expect([...fase.querySelectorAll('.dc-itens > li')].map((item) => item.textContent)).toEqual(FASES[i].itens)
      expect(within(fase).getAllByRole('link').map((link) => ({
        nome: link.textContent,
        url: link.getAttribute('href'),
      }))).toEqual(FASES[i].fontes.map(({ nome, url }) => ({ nome, url })))
      expect(within(fase).getByText(`${ROTULOS_FONTES.consultadas} ${FASES[i].consultadoEm}`)).toBeTruthy()
    }
    expect(container.querySelector('[hidden], [inert], [aria-hidden="true"], [role="tab"], [role="tablist"], select, details')).toBeNull()
  })
})
