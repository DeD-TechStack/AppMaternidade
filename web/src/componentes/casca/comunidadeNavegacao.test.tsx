import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderizarRota } from '../../teste/renderizarRota.tsx'

// MAT-40a, RF-18: o cabeçalho logado tem o item "Comunidade", logo depois de Hoje e Sessão.

describe('cabeçalho logado: item Comunidade', () => {
  it('tem o link "Comunidade" que leva a /app/comunidade, depois de Hoje e Sessão', () => {
    const { container } = renderizarRota('/app/hoje')
    const cabecalho = container.querySelector<HTMLElement>('header[data-cabecalho]')!
    const nav = within(cabecalho).getByRole('navigation', { name: 'Site' })
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Hoje', 'Sessão', 'Comunidade', 'Família'])
    expect(within(nav).getByRole('link', { name: 'Comunidade' }).getAttribute('href')).toBe('/app/comunidade')
  })
})
