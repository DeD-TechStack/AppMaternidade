import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { INI } from '../conteudo/inicio.ts'
import { renderizarRota } from './renderizarRota.tsx'

// As 9 rotas públicas do Campo de mel (MAT-49a), o Início mínimo e a rota inexistente.

const PAGINAS: ReadonlyArray<[string, string]> = [
  ['/como-funciona', 'Deixa que eu anoto.'],
  ['/cuidado-compartilhado', 'A babá vê o quê?'],
  ['/desenvolvimento', 'Ela já devia rolar?'],
  ['/regras-da-comunidade', 'Regras da comunidade'],
  ['/privacidade', 'Privacidade'],
  ['/termos', 'Termos de uso'],
  ['/exclusao-de-conta', 'Exclusão de conta'],
  ['/contato', 'Contato'],
  ['/sobre', 'Sobre'],
]

describe('rotas públicas', () => {
  for (const [caminho, titulo] of PAGINAS) {
    it(`${caminho} mostra só o <main> com o h1 "${titulo}", dentro da casca`, () => {
      const { container } = renderizarRota(caminho)
      const principal = container.querySelectorAll('main')
      expect(principal).toHaveLength(1)
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1.textContent).toBe(titulo)
      expect(principal[0].contains(h1)).toBe(true)
      expect(principal[0].previousElementSibling!.matches('header[data-cabecalho]')).toBe(true)
      expect(principal[0].nextElementSibling!.matches('footer[data-rodape]')).toBe(true)
    })
  }
})

describe('Início (MAT-49c)', () => {
  // REP-HOME: one h1 in two plain spans (no italic line) and the primary action, "Criar conta" to /criar-conta (the hero
  // one exists only from 1024 px; this jsdom run is narrower, so the closing band's is the one found).
  it('tem um h1 em dois spans, sem itálico, e a ação primária para /criar-conta', () => {
    const { container } = renderizarRota('/')
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe(INI.h1)
    expect(h1.querySelector('[data-h1-dia]')!.textContent).toBe(INI.h1Dia)
    expect(h1.querySelector('[data-h1-noite]')!.textContent).toBe(INI.h1Noite)
    expect(h1.querySelector('.cm-segunda-linha, em, i')).toBeNull()
    expect(container.querySelector('main')!.contains(h1)).toBe(true)
    const primarios = within(container.querySelector('main')!).getAllByRole('link', { name: 'Criar conta' })
    expect(primarios.length).toBeGreaterThan(0)
    for (const primario of primarios) {
      expect(primario.getAttribute('href')).toBe('/criar-conta')
      expect(primario.hasAttribute('data-botao-largo')).toBe(true)
    }
    expect(screen.getByRole('link', { name: 'Ver como funciona' }).getAttribute('href')).toBe('/como-funciona')
  })

  it('não traz mais aparelhos em CSS nem molduras da mídia antiga', () => {
    const { container } = renderizarRota('/')
    expect(container.querySelector('[data-aparelho], [data-midia], .vitrine, svg.ilu')).toBeNull()
  })
})

describe('rota inexistente', () => {
  it('tem o título em Literata e o primário de volta ao início', () => {
    renderizarRota('/nao-existe')
    const h1 = screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })
    expect(h1.classList.contains('cm-h1')).toBe(true)
    const voltar = screen.getByRole('link', { name: 'Voltar ao início' })
    expect(voltar.getAttribute('href')).toBe('/')
    expect(voltar.getAttribute('data-botao')).toBe('primario')
  })
})
