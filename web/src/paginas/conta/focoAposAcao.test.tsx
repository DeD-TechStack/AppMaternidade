import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderizarComDados } from '../../teste/renderizarComDados.tsx'

// A11Y-F4 (resíduo da A11Y-015): depois de enviar, cancelar ou confirmar nos formulários e caixas da
// Conta, o foco nunca cai no <body>.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const status = () => screen.getByRole('status')
const titulo = (id: string) => document.getElementById(id) as HTMLElement

async function abrir() {
  const renderizado = renderizarComDados('/app/familia', { sessao: 'juliana' })
  await screen.findByRole('heading', { level: 1, name: 'Família' })
  await screen.findByRole('heading', { level: 2, name: 'Bebês' })
  return renderizado
}

describe('FormularioBebe: "Cancelar"', () => {
  it('Editar bebê: o foco volta ao botão "Editar Heloísa"', async () => {
    await abrir()
    fireEvent.click(botao('Editar Heloísa'))
    fireEvent.click(botao('Cancelar'))

    const gatilho = botao('Editar Heloísa')
    await waitFor(() => expect(document.activeElement).toBe(gatilho))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('Adicionar bebê: o foco volta ao botão "Adicionar bebê"', async () => {
    await abrir()
    fireEvent.click(botao('Adicionar bebê'))
    fireEvent.click(botao('Cancelar'))

    const gatilho = botao('Adicionar bebê')
    await waitFor(() => expect(document.activeElement).toBe(gatilho))
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe('FormularioBebe: "Salvar"', () => {
  it('Editar bebê: o foco vai ao botão "Editar Heloísa", que continua na lista', async () => {
    await abrir()
    fireEvent.click(botao('Editar Heloísa'))
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(status().textContent).toBe('Dados de Heloísa salvos.'))
    const gatilho = botao('Editar Heloísa')
    await waitFor(() => expect(document.activeElement).toBe(gatilho))
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe('FormularioFamilia (Editar família)', () => {
  it('"Cancelar": o foco volta ao botão "Editar família"', async () => {
    await abrir()
    fireEvent.click(botao('Editar família'))
    fireEvent.click(botao('Cancelar'))

    const gatilho = botao('Editar família')
    await waitFor(() => expect(document.activeElement).toBe(gatilho))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('"Salvar": o foco vai ao botão "Editar família", que continua na tela', async () => {
    await abrir()
    fireEvent.click(botao('Editar família'))
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(status().textContent).toBe('Dados da família salvos.'))
    const gatilho = botao('Editar família')
    await waitFor(() => expect(document.activeElement).toBe(gatilho))
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe('DialogoDaFamilia: o foco depois de confirmar uma ação que tira o botão de origem', () => {
  it('Arquivar bebê: o botão some com o bebê da lista, e o foco vai ao título do bloco "Bebês"', async () => {
    await abrir()
    const origem = botao('Arquivar Heloísa')
    fireEvent.click(origem)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Arquivar Heloísa?' })).getByRole('button', { name: 'Arquivar' }))

    await waitFor(() => expect(status().textContent).toBe('Heloísa foi arquivado.'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(origem.isConnected).toBe(false)
    await waitFor(() => expect(document.activeElement).toBe(titulo('bebes')))
    expect(titulo('bebes').getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).not.toBe(document.body)
  })

  it('Remover acesso: o botão some com o membro, e o foco vai ao título do bloco "Membros"', async () => {
    await abrir()
    const origem = botao('Remover acesso de Bruno')
    fireEvent.click(origem)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover acesso' }))

    await waitFor(() => expect(status().textContent).toBe('O acesso de Bruno foi removido.'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(origem.isConnected).toBe(false)
    await waitFor(() => expect(document.activeElement).toBe(titulo('membros')))
    expect(titulo('membros').getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).not.toBe(document.body)
  })

  it('Cancelar convite: o botão some com o convite, e o foco vai ao título do bloco "Convites"', async () => {
    await abrir()
    const origem = screen.getAllByRole('button', { name: /^Cancelar convite de / })[0]
    fireEvent.click(origem)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar convite' }))

    await waitFor(() => expect(status().textContent).toBe('O convite foi cancelado.'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(origem.isConnected).toBe(false)
    await waitFor(() => expect(document.activeElement).toBe(titulo('convites')))
    expect(titulo('convites').getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).not.toBe(document.body)
  })
})
