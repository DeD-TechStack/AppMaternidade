import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PROMESSA } from '../conteudo/textos.ts'
import { renderizarRota } from './renderizarRota.tsx'

// As 9 rotas públicas do Campo de mel (MAT-49a), o Início mínimo e a rota inexistente.

const PAGINAS: ReadonlyArray<[string, string]> = [
  ['/como-funciona', 'Do primeiro dia à troca de turno.Do primeiro diaà troca de turno.'],
  ['/cuidado-compartilhado', 'Um bebê, vários adultos.Um bebê,vários adultos.'],
  ['/desenvolvimento', 'Cada fase, no tempo do bebê.Cada fase,no tempo do bebê.'],
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
  it('tem um h1 de duas linhas, com a segunda em itálico, e o primário para /app/hoje', () => {
    const { container } = renderizarRota('/')
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe(PROMESSA)
    expect(h1.firstChild!.textContent).toBe('A rotina do bebê,')
    const segunda = h1.querySelector('.cm-segunda-linha')!
    expect(segunda.textContent!.trim()).toBe('dividida com carinho.')
    const primarios = screen.getAllByRole('link', { name: 'Começar grátis' })
    expect(primarios.length).toBeGreaterThan(0)
    for (const primario of primarios) {
      expect(primario.getAttribute('href')).toBe('/app/hoje')
      expect(primario.getAttribute('data-botao')).toBe('primario')
    }
    expect(h1.closest('section')!.contains(primarios[0])).toBe(true)
    expect(screen.getByRole('link', { name: 'Ver como funciona' }).getAttribute('href')).toBe('/como-funciona')
    expect(container.querySelector('main [data-numeros]')!.querySelectorAll('li')).toHaveLength(3)
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
