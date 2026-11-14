import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { ID_FAMILIA } from '../../teste/rotina.fixture.ts'

// QA-01: a família sem bebê em toda rota da Rotina: a rota mantém o próprio h1, mostra a frase e leva ao
// cadastro do bebê na tela Família (a conta de Juliana é responsável; a de Davi pode ser só observador).

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
})

const ROTAS: Array<[string, string]> = [
  ['/app/hoje', 'Hoje'],
  ['/app/historico', 'Histórico'],
  ['/app/sessao', 'Sessão'],
  ['/app/lixeira', 'Lixeira'],
  ['/app/notas', 'Notas'],
  ['/app/registro/novo', 'Novo registro'],
]

describe('QA-01: família sem bebê em cada rota da Rotina', () => {
  it.each(ROTAS)('%s: h1 "%s", a frase e o botão "Cadastrar o bebê" para a tela Família', async (caminho, titulo) => {
    await renderizarRotaPronta(caminho, { semBebes: true })

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main').getAttribute('data-tela')).toBe('rotina-sem-bebe')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(titulo)
    expect(screen.getByText('Esta família ainda não tem bebê cadastrado.')).toBeTruthy()
    const botao = screen.getByRole('link', { name: 'Cadastrar o bebê' })
    expect(botao.getAttribute('href')).toBe(`/app/familia?familia=${ID_FAMILIA}`)
  })

  it.each(ROTAS)('%s: observador vê a frase e o h1, sem o botão', async (caminho, titulo) => {
    await renderizarRotaPronta(caminho, { semBebes: true, sessao: 'davi', papelDeDavi: 'observador' })

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(titulo)
    expect(screen.getByText('Esta família ainda não tem bebê cadastrado.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Cadastrar o bebê' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cadastrar o bebê' })).toBeNull()
  })

  it('sem família: o texto de sempre, sem botão', async () => {
    await renderizarRotaPronta('/app/historico', { sessao: 'davi' })

    expect(screen.getByText('Você ainda não faz parte de uma família.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Cadastrar o bebê' })).toBeNull()
  })
})
