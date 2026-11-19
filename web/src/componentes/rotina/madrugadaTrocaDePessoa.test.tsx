import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { NOMES_DO_H1 } from '../../conteudo/conta.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'

// QH-06: depois de "Sair", quem entra em seguida na mesma página começa com a madrugada desligada. A casca
// continua montada durante a saída, então a escolha da pessoa anterior não pode ficar guardada nela.
// O relógio é o falso, às 10:00 de 5/11/2026.

const INSTANTE = new Date('2026-11-05T10:00:00')

const LARGURA_ORIGINAL = window.innerWidth

function fixarLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

afterEach(() => {
  fixarLargura(LARGURA_ORIGINAL)
})

const lua = () => screen.getByRole('button', { name: 'Modo madrugada' })
const tema = () => document.documentElement.getAttribute('data-tema')
const cabecalho = () => document.querySelector<HTMLElement>('header[data-cabecalho]')!
const painel = () => document.querySelector<HTMLElement>('[data-menu-celular]')!

async function ir(roteador: { navigate: (caminho: string) => Promise<void> }, caminho: string) {
  await act(async () => {
    await roteador.navigate(caminho)
  })
  await aguardarCarga()
}

function clicarEmSair(largura: number) {
  if (largura >= 1000) {
    fireEvent.click(within(cabecalho()).getByRole('button', { name: 'Sair' }))
  } else {
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(within(painel()).getByRole('button', { name: 'Sair' }))
  }
}

describe('QH-06: a madrugada não passa de uma pessoa para a outra', () => {
  it.each([1440, 390])(
    'Sair e entrar como outra pessoa começa com a madrugada desligada (%i px)',
    async (largura) => {
      fixarLargura(largura)
      const { roteador, conta } = await renderizarRotaPronta('/app/hoje', { madrugada: true })
      expect(tema()).toBe('madrugada')
      expect(lua().getAttribute('aria-pressed')).toBe('true')

      clicarEmSair(largura)
      // Com o relógio falso, `findByRole` não avança sozinho: esvazia as microtarefas e lê o h1.
      await aguardarCarga()
      expect(screen.getByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })).toBeTruthy()
      expect(roteador.state.location.pathname).toBe('/entrar')
      expect(tema()).toBeNull()

      // `sessaoParaTeste` não emite o evento `entrou`: o provedor da sessão só reler a conta com a entrada real.
      await act(async () => {
        await conta.entrar(PESSOAS.icaro.email, SENHA_DEMONSTRACAO)
      })
      await aguardarCarga()
      await ir(roteador, '/app/hoje')

      // A sequência é real: Ícaro está na sessão e a página é o Hoje.
      const sessao = await conta.sessaoAtual()
      expect(sessao.ok && sessao.valor?.id).toBe(PESSOAS.icaro.id)
      expect(roteador.state.location.pathname).toBe('/app/hoje')
      expect(tema()).toBeNull()
      expect(lua().getAttribute('aria-pressed')).toBe('false')
    },
  )

  it('sem trocar de pessoa a lua continua funcionando', async () => {
    const { roteador } = await renderizarRotaPronta('/app/hoje')
    expect(tema()).toBeNull()
    expect(lua().getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(lua())
    expect(tema()).toBe('madrugada')
    expect(lua().getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(lua())
    expect(tema()).toBeNull()
    expect(lua().getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(lua())
    expect(tema()).toBe('madrugada')

    await ir(roteador, '/app/conta')
    expect(tema()).toBeNull()
  })
})
