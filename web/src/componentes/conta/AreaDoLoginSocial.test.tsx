import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { AreaDoLoginSocial } from './AreaDoLoginSocial.tsx'

// O lugar do login social (tarefa futura): acima do formulário de /entrar e de /criar-conta,
// separado dele, e invisível enquanto não houver o botão.

describe('AreaDoLoginSocial', () => {
  it('sem filhos não renderiza nada', () => {
    const { container } = render(<AreaDoLoginSocial />)
    expect(container.innerHTML).toBe('')
  })

  it('com um botão, renderiza um contêiner próprio com ele', () => {
    const { container } = render(
      <AreaDoLoginSocial>
        <button type="button">Botão futuro</button>
      </AreaDoLoginSocial>,
    )
    const area = container.querySelector('[data-area="login-social"]')!
    expect(area).not.toBeNull()
    expect(area.querySelector('button')!.textContent).toBe('Botão futuro')
  })
})

describe('o lugar nas telas', () => {
  const pasta = resolve(import.meta.dirname, '../../paginas/conta')

  it('/entrar e /criar-conta declaram a área antes do formulário', () => {
    for (const arquivo of ['Entrar.tsx', 'CriarConta.tsx']) {
      const fonte = readFileSync(resolve(pasta, arquivo), 'utf8')
      const area = fonte.indexOf('<AreaDoLoginSocial')
      const formulario = fonte.indexOf('<form')
      expect(area, arquivo).toBeGreaterThan(-1)
      expect(formulario, arquivo).toBeGreaterThan(area)
    }
  })

  it('hoje as duas telas não mostram nada nesse lugar', async () => {
    for (const caminho of ['/entrar', '/criar-conta']) {
      const { container, unmount } = renderizarComDados(caminho)
      await screen.findByRole('heading', { level: 1 })
      expect(container.querySelector('[data-area="login-social"]'), caminho).toBeNull()
      unmount()
    }
  })
})
