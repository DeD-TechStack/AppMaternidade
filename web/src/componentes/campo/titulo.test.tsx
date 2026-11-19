import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Titulo } from './Titulo.tsx'

// MOTION-1: o título é texto comum. Sem cópia só para leitor de tela e sem linhas escondidas dele.

describe('Titulo', () => {
  it('renderiza um h2 só, com o texto das duas linhas separado por um espaço, e a segunda linha em um span próprio (sem itálico, DS1:RF-06)', () => {
    const { container } = render(<Titulo nivel="h2" linhas={['Uma linha', 'outra linha.']} />)
    const titulos = container.querySelectorAll('h2')
    expect(titulos).toHaveLength(1)
    expect(titulos[0].textContent).toBe('Uma linha outra linha.')
    expect(screen.getByRole('heading', { name: 'Uma linha outra linha.' })).toBe(titulos[0])
    const segunda = titulos[0].querySelector('span.cm-segunda-linha')
    expect(segunda).not.toBeNull()
    expect(segunda!.textContent).toBe('outra linha.')
  })

  it('não leva texto só para leitor de tela nem linha escondida dele', () => {
    const { container } = render(<Titulo nivel="h2" linhas={['Uma linha', 'outra linha.']} />)
    const titulo = container.querySelector('h2')!
    expect(titulo.querySelector('.sr-only')).toBeNull()
    expect(titulo.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('com uma linha só, o título é só essa linha', () => {
    const { container } = render(<Titulo nivel="h3" linhas={['Só uma linha']} />)
    expect(container.querySelector('h3')!.textContent).toBe('Só uma linha')
    expect(container.querySelector('.cm-segunda-linha')).toBeNull()
  })
})
