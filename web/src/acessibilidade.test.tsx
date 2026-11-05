import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import axe from 'axe-core'
import { criarEstadoInicial, type EstadoPrototipo } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

const claro = (): EstadoPrototipo => criarEstadoInicial(Date.now())
const madrugada = (): EstadoPrototipo => ({ ...criarEstadoInicial(Date.now()), madrugada: true })

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await axe.run(container, {
    rules: {
      // O jsdom não calcula cores nem layout, então a regra de contraste do axe
      // não tem como avaliar a página. O contraste é conferido em estilo.test.ts.
      'color-contrast': { enabled: false },
    },
  })
  // `incomplete` fica de fora de propósito: só violações confirmadas reprovam.
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)
}

describe('acessibilidade (axe-core)', () => {
  it('não tem violações no Início', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    expect(await violacoes(container)).toEqual([])
  })

  it('não tem violações na rota inexistente', async () => {
    const { container } = renderizarRota('/qualquer-coisa')
    await screen.findByRole('heading', { level: 1 })

    expect(await violacoes(container)).toEqual([])
  })

  const temas: Array<[string, () => EstadoPrototipo]> = [
    ['claro', claro],
    ['madrugada', madrugada],
  ]

  for (const [tema, estado] of temas) {
    it(`não tem violações no Hoje (${tema})`, async () => {
      const { container } = renderizarRota('/app/hoje', { estadoInicial: estado() })
      await screen.findByRole('heading', { level: 1 })
      expect(document.documentElement.hasAttribute('data-tema')).toBe(tema === 'madrugada')

      expect(await violacoes(container)).toEqual([])
    })

    it(`não tem violações na Sessão (${tema})`, async () => {
      const { container } = renderizarRota('/app/sessao', { estadoInicial: estado() })
      await screen.findByRole('heading', { level: 1 })
      expect(document.documentElement.hasAttribute('data-tema')).toBe(tema === 'madrugada')

      expect(await violacoes(container)).toEqual([])
    })
  }

  it('não tem violações na Sessão vazia', async () => {
    const { container } = renderizarRota('/app/sessao', { estadoInicial: { ...claro(), sessao: null } })
    await screen.findByRole('heading', { level: 1 })

    expect(await violacoes(container)).toEqual([])
  })

  it('não tem violações no Hoje com a escolha de fralda aberta e a confirmação na tela', async () => {
    const { container } = renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Lia' }))
    expect(await violacoes(container)).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: 'Xixi' }))
    expect(screen.getByRole('status').textContent).toContain('Fralda registrada: Xixi')
    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    expect(await violacoes(container)).toEqual([])
  })

  it('não tem violações na Sessão com a nota e com a pergunta de descarte abertas', async () => {
    const { container } = renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))
    expect(await violacoes(container)).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.getByText('Descartar esta sessão?')).toBeTruthy()
    expect(await violacoes(container)).toEqual([])
  })
})
