import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { AreaDoLoginSocial } from './AreaDoLoginSocial.tsx'

// O lugar do login social: acima do formulário de /entrar e de /criar-conta, separado dele, e
// invisível enquanto não houver o botão (sem banco, o "Entrar com Google" não existe).

describe('AreaDoLoginSocial', () => {
  it('sem filhos não renderiza nada', () => {
    const { container } = render(<AreaDoLoginSocial />)
    expect(container.innerHTML).toBe('')
  })

  it('com um botão, renderiza um contêiner próprio com ele e o texto que o separa do formulário', () => {
    const { container } = render(
      <AreaDoLoginSocial>
        <button type="button">Botão de teste</button>
      </AreaDoLoginSocial>,
    )
    const area = container.querySelector('[data-area="login-social"]')!
    expect(area).not.toBeNull()
    expect(area.querySelector('button')!.textContent).toBe('Botão de teste')
    expect(area.querySelectorAll('button')).toHaveLength(1)
    const separador = [...area.querySelectorAll('p')].find((p) => p.textContent === 'ou use e-mail e senha')!
    expect(separador).toBeTruthy()
    expect(separador.querySelector('a, button, input')).toBeNull()
  })

  it('o contêiner quebra o botão e o separador numa coluna', () => {
    const { container } = render(
      <AreaDoLoginSocial>
        <button type="button">Botão de teste</button>
      </AreaDoLoginSocial>,
    )
    expect(container.querySelector('[data-area="login-social"]')!.className).toContain('flex-col')
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

  it('sem banco (modo demonstração) as duas telas não mostram nada nesse lugar', async () => {
    for (const caminho of ['/entrar', '/criar-conta']) {
      const { container, unmount } = renderizarComDados(caminho)
      await screen.findByRole('heading', { level: 1 })
      expect(container.querySelector('[data-area="login-social"]'), caminho).toBeNull()
      unmount()
    }
  })

  describe('com banco', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('as duas telas mostram o botão "Entrar com Google" nesse lugar', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-ficticia')
      for (const caminho of ['/entrar', '/criar-conta']) {
        const { container, unmount } = renderizarComDados(caminho)
        await screen.findByRole('heading', { level: 1 })
        const area = container.querySelector('[data-area="login-social"]')!
        expect(area, caminho).not.toBeNull()
        expect(area.querySelector('button')!.textContent, caminho).toBe('Entrar com Google')
        unmount()
      }
    })
  })
})
