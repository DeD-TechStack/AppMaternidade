import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderizarRota } from '../../teste/renderizarRota.tsx'
import { ITENS_DO_CABECALHO } from './textos.ts'

// MAT-39a, DES-01 item 4: o cabeçalho logado tem o item "Desenvolvimento", entre Sessão e Comunidade, e ele
// leva a /app/desenvolvimento. A ordem esperada está escrita aqui, não calculada do código.

const ORDEM_ESPERADA = ['Hoje', 'Sessão', 'Desenvolvimento', 'Comunidade', 'Família']

describe('cabeçalho logado: item Desenvolvimento', () => {
  it('a lista do cabeçalho logado tem Desenvolvimento depois de Sessão e antes de Comunidade', () => {
    expect(ITENS_DO_CABECALHO.logado.map((item) => item.rotulo)).toEqual(ORDEM_ESPERADA)
    expect(ITENS_DO_CABECALHO.logado.find((item) => item.rotulo === 'Desenvolvimento')?.para).toBe('/app/desenvolvimento')
  })

  it('o link "Desenvolvimento" do cabeçalho leva a /app/desenvolvimento', () => {
    const { container } = renderizarRota('/app/hoje')
    const cabecalho = container.querySelector<HTMLElement>('header[data-cabecalho]')!
    const nav = within(cabecalho).getByRole('navigation', { name: 'Site' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(ORDEM_ESPERADA)
    expect(within(nav).getByRole('link', { name: 'Desenvolvimento' }).getAttribute('href')).toBe('/app/desenvolvimento')
  })
})
