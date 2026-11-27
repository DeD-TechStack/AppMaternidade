import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { simularRespostaPerdidaRotina } from '../../dados/rotina.memoria.ts'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
})

const botao = (nome: string) => screen.getByRole('button', { name: nome })
async function clicar(elemento: HTMLElement) {
  elemento.focus()
  fireEvent.click(elemento)
  await aguardarCarga()
}

async function registroNaSessao() {
  const mundo = await renderizarRotaPronta('/app/hoje')
  await clicar(botao('Registrar fralda de Heloísa'))
  await clicar(botao('Xixi'))
  await clicar(screen.getByRole('link', { name: 'Ver sessão' }))
  expect(mundo.roteador.state.location.pathname).toBe('/app/sessao')
  expect(screen.getByRole('status').textContent).toContain('Fralda registrada: Xixi')
  return mundo
}

it('Desfazer vindo do Hoje na Sessão anuncia o desfeito por 3 s e leva o foco ao h1 (A11Y-004)', async () => {
  await registroNaSessao()
  await clicar(botao('Desfazer'))
  expect(screen.getByRole('status').textContent).toContain('Registro desfeito: fralda.')
  act(() => vi.advanceTimersByTime(3_001))
  expect(screen.getByRole('status').textContent).toContain('Registro desfeito: fralda.')
  expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
})

it('Tentar de novo do Desfazer na Sessão anuncia o desfeito e deixa o foco no h1 (A11Y-004)', async () => {
  const mundo = await registroNaSessao()
  simularRespostaPerdidaRotina(mundo.rotina, 'excluirRegistro')
  await clicar(botao('Desfazer'))
  expect(screen.getByRole('status').textContent).not.toContain('Registro desfeito')
  await clicar(botao('Tentar de novo'))
  expect(screen.getByRole('status').textContent).toContain('Registro desfeito: fralda.')
  expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
})
