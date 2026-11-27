import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// D-1 (MAT-37b g3): o erro da guarda também tem o seu h1 (o axe acusa `page-has-heading-one`).

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('GuardaSessao: leitura da sessão falhando', () => {
  it.each(['/app/familia', '/app/conta', '/app/comecar'])('%s mostra um só h1, o aviso e "Tentar de novo"', async (caminho) => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    dados.sessaoParaTeste('juliana@exemplo.invalid')
    simularFalha(dados, 'sessaoAtual', 'rede')
    const { container } = renderizarComDados(caminho, { dados })

    await screen.findByRole('alert')
    const titulos = screen.getAllByRole('heading', { level: 1 })
    expect(titulos).toHaveLength(1)
    expect(titulos[0].classList.contains('cm-h1')).toBe(true)
    expect(titulos[0].textContent).toBe('Não foi possível abrir a sua conta.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
    // O h1 vem antes do aviso de erro.
    const aviso = screen.getByRole('alert')
    expect(titulos[0].compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelectorAll('h1')).toHaveLength(1)
  })
})
