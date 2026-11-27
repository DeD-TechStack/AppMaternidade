import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { rodarAxe } from './teste/axe.ts'
import { renderizarRota, renderizarRotaPronta, aguardarCarga } from './teste/renderizarRota.tsx'
import { semSessaoEmAndamento } from './teste/rotina.fixture.ts'

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await rodarAxe(container, {
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

  const temas: Array<[string, boolean]> = [
    ['claro', false],
    ['madrugada', true],
  ]

  for (const [tema, madrugada] of temas) {
    it(`não tem violações no Hoje (${tema})`, async () => {
      const { container } = await renderizarRotaPronta('/app/hoje', { madrugada })
      expect(document.documentElement.hasAttribute('data-tema')).toBe(madrugada)

      expect(await violacoes(container)).toEqual([])
    })

    it(`não tem violações na Sessão (${tema})`, async () => {
      const { container } = await renderizarRotaPronta('/app/sessao', { madrugada })
      expect(document.documentElement.hasAttribute('data-tema')).toBe(madrugada)

      expect(await violacoes(container)).toEqual([])
    })

    it(`não tem violações no formulário de registro (${tema})`, async () => {
      const { container } = await renderizarRotaPronta('/app/registro/novo?tipo=mamadeira', { madrugada })

      expect(await violacoes(container)).toEqual([])
    })
  }

  it('não tem violações na Sessão vazia', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao', { ajustarRotina: semSessaoEmAndamento })

    expect(await violacoes(container)).toEqual([])
  })

  it('não tem violações no Hoje com o painel da fralda, a fralda registrada (confirmação) e o Mais aberto', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar fralda de Heloísa' }))
    expect(screen.getByRole('group', { name: 'Fralda de Heloísa' })).toBeTruthy()
    expect(await violacoes(container)).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: 'Xixi' }))
    await aguardarCarga()
    expect(screen.getByRole('status').textContent).toContain('Fralda registrada: Xixi')
    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    expect(await violacoes(container)).toEqual([])
  })

  it('não tem violações na Sessão com a nota e com a pergunta de descarte abertas', async () => {
    const { container } = await renderizarRotaPronta('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))
    expect(await violacoes(container)).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.getByText('Descartar esta sessão?')).toBeTruthy()
    expect(await violacoes(container)).toEqual([])
  })
})

describe('foco do campo de data (A11Y-002)', () => {
  // O jsdom não calcula o `outline` de um campo de data de verdade: a prova é a regra no CSS compartilhado.
  const css = readFileSync(join(process.cwd(), 'src', 'styles', 'site.css'), 'utf8')

  it('há uma regra input[type=date]:focus-visible com anel de 3 px na cor de foco', () => {
    const regra = /input\[type=['"]date['"]\]:focus-visible\s*\{([^}]*)\}/.exec(css)
    expect(regra, "falta a regra `input[type='date']:focus-visible` em styles/site.css").not.toBeNull()
    expect(regra?.[1]).toMatch(/outline:\s*3px solid var\(--cor-foco\)/)
    expect(regra?.[1]).not.toMatch(/outline:\s*none/)
  })
})
