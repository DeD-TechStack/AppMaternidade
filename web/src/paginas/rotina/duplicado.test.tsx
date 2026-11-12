import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import type { FixtureRotina } from '../../dados/rotina.memoria.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { ID_BEBE, semSessaoEmAndamento } from '../../teste/rotina.fixture.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'

// O possível duplicado ao iniciar uma sessão (R38-09, Offline 7.2): outro registro do mesmo tipo, de outra
// pessoa, com início a até 10 minutos do novo (inclusive). A confirmação diz quem registrou e troca
// "Desfazer" por "Manter os dois" e "Excluir este". Relógio falso às 10:00 de 5/11/2026.

const MIN = 60_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
})

const ID_OUTRA = 'c9999999-9999-4999-8999-999999999999'

/** Sem a sessão em andamento, e com uma sessão já encerrada de `tipo`, iniciada há `haMs` (dura 2 min). */
const comSessaoConcluida =
  (tipo: 'mamada' | 'sono', autor: string, haMs: number) =>
  (fixture: FixtureRotina): FixtureRotina => {
    const base = semSessaoEmAndamento(fixture)
    const modelo = base.registros.find((r) => r.tipo === 'mamada' && r.fim !== null)!
    const inicio = new Date(Date.now() - haMs).toISOString()
    const fim = new Date(Date.now() - haMs + 2 * MIN).toISOString()
    return {
      ...base,
      registros: [...base.registros, { ...modelo, id: ID_OUTRA, tipo, detalhes: {}, nota: null, inicio, fim, recebidoEm: inicio, criadoPor: autor, encerradoPor: autor }],
    }
  }

const botao = (nome: string) => screen.getByRole('button', { name: nome })
const status = () => screen.getByRole('status')

async function iniciarMamada(ajuste: (f: FixtureRotina) => FixtureRotina) {
  const mundo = await renderizarRotaPronta('/app/hoje', { ajustarRotina: ajuste })
  fireEvent.click(botao('Iniciar mamada de Heloísa'))
  await aguardarCarga()
  return mundo
}

describe('iniciar uma sessão quando já há um registro parecido de outra pessoa', () => {
  it('a Sessão abre e a confirmação cita quem registrou e a hora, com "Manter os dois", "Excluir este" e "Fechar"', async () => {
    const mundo = await iniciarMamada(comSessaoConcluida('mamada', PESSOAS.bruno.id, 5 * MIN))

    expect(mundo.roteador.state.location.pathname).toBe('/app/sessao')
    expect(status().querySelector('p')!.textContent).toBe('Bruno registrou mamada às 09:55.')
    expect(within(status()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Manter os dois', 'Excluir este', 'Fechar'])
    expect(within(status()).queryByRole('button', { name: 'Desfazer' })).toBeNull()
  })

  it('exatamente 10 minutos conta como parecido; 10 minutos e 1 segundo, não', async () => {
    await iniciarMamada(comSessaoConcluida('mamada', PESSOAS.bruno.id, 10 * MIN))
    expect(status().querySelector('p')!.textContent).toBe('Bruno registrou mamada às 09:50.')
  })

  it('"Manter os dois" fecha a confirmação e as duas sessões ficam', async () => {
    const mundo = await iniciarMamada(comSessaoConcluida('mamada', PESSOAS.bruno.id, 5 * MIN))

    fireEvent.click(botao('Manter os dois'))
    await aguardarCarga()

    expect(status().textContent).toBe('')
    expect(mundo.roteador.state.location.pathname).toBe('/app/sessao')
    const lixeira = await mundo.rotina.lixeira(ID_BEBE)
    expect(lixeira.ok && lixeira.valor.itens).toEqual([])
    const andamento = await mundo.rotina.emAndamento(ID_BEBE)
    expect(andamento.ok && andamento.valor.itens.map((r) => r.tipo)).toEqual(['mamada'])
  })

  it('"Excluir este" exclui a sessão nova (vai para a lixeira) e volta ao Hoje; a de Bruno fica', async () => {
    const mundo = await iniciarMamada(comSessaoConcluida('mamada', PESSOAS.bruno.id, 5 * MIN))

    fireEvent.click(botao('Excluir este'))
    await aguardarCarga()

    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    const lixeira = await mundo.rotina.lixeira(ID_BEBE)
    expect(lixeira.ok && lixeira.valor.itens.map((r) => [r.tipo, r.origem])).toEqual([['mamada', 'ao_vivo']])
    const andamento = await mundo.rotina.emAndamento(ID_BEBE)
    expect(andamento.ok && andamento.valor.itens).toEqual([])
    const dele = await mundo.rotina.registro(ID_OUTRA)
    expect(dele.ok && dele.valor && dele.valor.excluidoEm).toBeNull()
  })
})

describe('iniciar uma sessão sem registro parecido', () => {
  it.each([
    ['do mesmo autor', 'mamada', PESSOAS.juliana.id, 5 * MIN],
    ['de outro tipo', 'sono', PESSOAS.bruno.id, 5 * MIN],
    ['a mais de 10 minutos', 'mamada', PESSOAS.bruno.id, 10 * MIN + 1000],
  ] as const)('%s: nenhuma confirmação', async (_titulo, tipo, autor, ha) => {
    const mundo = await iniciarMamada(comSessaoConcluida(tipo, autor, ha))

    expect(mundo.roteador.state.location.pathname).toBe('/app/sessao')
    expect(status().textContent).toBe('')
  })
})
