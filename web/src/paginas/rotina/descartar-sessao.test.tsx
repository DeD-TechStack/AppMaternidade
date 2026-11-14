import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { simularRespostaPerdidaRotina } from '../../dados/rotina.memoria.ts'
import { ID_BEBE, comSessaoEmAndamento } from '../../teste/rotina.fixture.ts'

// A11Y-F6 / A11Y-024: descartar a sessão anuncia "Esta sessão foi descartada." com Desfazer e Fechar, na
// região de status única, e o aviso sobrevive à ida ao Hoje. Desfazer restaura a MESMA sessão (mesmo id,
// mesmo início, ainda sem fim), anuncia o desfeito e leva o foco ao h1 do Hoje.

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
})

const botao = (nome: string) => screen.getByRole('button', { name: nome })
const status = () => screen.getByRole('status')
async function clicar(elemento: HTMLElement) {
  elemento.focus()
  fireEvent.click(elemento)
  await aguardarCarga()
}

type Mundo = Awaited<ReturnType<typeof renderizarRotaPronta>>

async function descartarNaSessao(opcoes: Parameters<typeof renderizarRotaPronta>[1] = {}) {
  const mundo = await renderizarRotaPronta('/app/sessao', opcoes)
  const antes = await sessaoEmAndamento(mundo)
  fireEvent.click(botao('Descartar'))
  await clicar(within(screen.getByRole('group', { name: 'Descartar esta sessão?' })).getByRole('button', { name: 'Descartar' }))
  return { mundo, antes }
}

async function sessaoEmAndamento(mundo: Mundo) {
  const lidas = await mundo.rotina.emAndamento(ID_BEBE)
  if (!lidas.ok) throw new Error('Leitura das sessões em andamento falhou.')
  return lidas.valor.itens[0]
}

describe('Descartar na Sessão anuncia e oferece Desfazer', () => {
  it('(a) depois de confirmar, o status diz "Esta sessão foi descartada." com Desfazer, no Hoje, e continua depois de 3 s', async () => {
    const { mundo } = await descartarNaSessao()

    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    expect(status().textContent).toContain('Esta sessão foi descartada.')
    expect(within(status()).getByRole('button', { name: 'Desfazer' })).toBeTruthy()
    expect(within(status()).getByRole('button', { name: 'Fechar' })).toBeTruthy()
    act(() => vi.advanceTimersByTime(3_001))
    expect(status().textContent).toContain('Esta sessão foi descartada.')
    expect(within(status()).getByRole('button', { name: 'Desfazer' })).toBeTruthy()
  })

  it('(b) Desfazer restaura a mesma sessão (id, início, detalhes, sem fim), anuncia o desfeito e leva o foco ao h1', async () => {
    const { mundo, antes } = await descartarNaSessao()
    expect(antes.tipo).toBe('sono')

    await clicar(botao('Desfazer'))

    const lido = await mundo.rotina.registro(antes.id)
    expect(lido.ok && lido.valor).toBeTruthy()
    const depois = lido.ok && lido.valor
    if (!depois) throw new Error('A sessão não voltou.')
    expect(depois.id).toBe(antes.id)
    expect(depois.inicio).toBe(antes.inicio)
    expect(depois.detalhes).toEqual(antes.detalhes)
    expect(depois.fim).toBeNull()
    expect(depois.excluidoEm).toBeNull()
    expect((await sessaoEmAndamento(mundo)).id).toBe(antes.id)
    expect(status().textContent).toContain('Registro desfeito: sono.')
    expect(status().textContent).not.toContain('Esta sessão foi descartada.')
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hoje')
  })

  it('(c) Desfazer com a resposta perdida mostra o erro com Tentar de novo, que restaura e deixa o foco no h1', async () => {
    const { mundo, antes } = await descartarNaSessao()
    simularRespostaPerdidaRotina(mundo.rotina, 'restaurarRegistro')

    await clicar(botao('Desfazer'))

    expect(status().textContent).not.toContain('Registro desfeito')
    expect(within(status()).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()

    await clicar(botao('Tentar de novo'))

    expect(status().textContent).toContain('Registro desfeito: sono.')
    expect((await sessaoEmAndamento(mundo)).id).toBe(antes.id)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })

  it('(d) Fechar fecha o status e não restaura nada', async () => {
    const { mundo } = await descartarNaSessao()

    await clicar(botao('Fechar'))

    expect(status().textContent).toBe('')
    expect(screen.queryByRole('button', { name: 'Desfazer' })).toBeNull()
    const lidas = await mundo.rotina.emAndamento(ID_BEBE)
    expect(lidas.ok && lidas.valor.itens).toHaveLength(0)
  })

  it('o foco depois do descarte continua no cartão da sessão do Hoje', async () => {
    const { mundo } = await descartarNaSessao()

    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    expect(document.activeElement).not.toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).not.toBe(screen.getByRole('heading', { level: 1 }))
  })

  it.each([
    ['mamada', 'Registro desfeito: mamada.'],
    ['tummy', 'Registro desfeito: tummy time.'],
  ] as const)('(e) a sessão de %s também anuncia, volta igual e leva o foco ao h1', async (tipo, desfeito) => {
    const { mundo, antes } = await descartarNaSessao({ ajustarRotina: comSessaoEmAndamento(tipo, 20 * 60_000) })
    expect(antes.tipo).toBe(tipo)

    expect(status().textContent).toContain('Esta sessão foi descartada.')
    act(() => vi.advanceTimersByTime(3_001))
    expect(status().textContent).toContain('Esta sessão foi descartada.')

    await clicar(botao('Desfazer'))

    const volta = await sessaoEmAndamento(mundo)
    expect(volta.id).toBe(antes.id)
    expect(volta.inicio).toBe(antes.inicio)
    expect(volta.detalhes).toEqual(antes.detalhes)
    expect(volta.fim).toBeNull()
    expect(status().textContent).toContain(desfeito)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })

  it('a falha do descarte continua com Tentar de novo repetindo o descarte (e, ao dar certo, anuncia e leva ao Hoje)', async () => {
    const mundo = await renderizarRotaPronta('/app/sessao')
    simularRespostaPerdidaRotina(mundo.rotina, 'excluirRegistro')

    fireEvent.click(botao('Descartar'))
    await clicar(within(screen.getByRole('group', { name: 'Descartar esta sessão?' })).getByRole('button', { name: 'Descartar' }))

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(mundo.roteador.state.location.pathname).toBe('/app/sessao')
    expect(screen.queryByText('Esta sessão foi descartada.')).toBeNull()

    await clicar(botao('Tentar de novo'))

    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    expect(status().textContent).toContain('Esta sessão foi descartada.')
  })
})
