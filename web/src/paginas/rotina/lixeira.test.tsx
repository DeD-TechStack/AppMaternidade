import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import type { FixtureRotina } from '../../dados/rotina.memoria.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'

// A lixeira (MAT-38b, R38-23), com o relógio falso às 10:00 de 5/11/2026 (hora do aparelho). Os ids são os da
// fixture de teste: 2 é a fralda de Bruno, 3 é a mamada de Bruno e 4 é o tummy de Carla, de ontem.

const INSTANTE = new Date('2026-11-05T10:00:00')
const DIA = 86_400_000
const id = (numero: number) => `a0000000-0000-7000-8000-${String(numero).padStart(12, '0')}`
const iso = (instante: number) => new Date(instante).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const status = () => screen.getByRole('status')
const itens = () => [...document.querySelectorAll('[data-lixeira] li')] as HTMLElement[]
const idsDaLista = () => itens().map((li) => li.getAttribute('data-registro'))

/** Exclui registros da fixture: `numero` → quem excluiu e há quantos ms. */
const excluindo =
  (exclusoes: Record<number, { por: string; haMs: number }>) =>
  (fixture: FixtureRotina): FixtureRotina => ({
    ...fixture,
    registros: fixture.registros.map((registro) => {
      const exclusao = Object.entries(exclusoes).find(([numero]) => id(Number(numero)) === registro.id)?.[1]
      return exclusao ? { ...registro, excluidoEm: iso(INSTANTE.getTime() - exclusao.haMs), excluidoPor: exclusao.por } : registro
    }),
  })

const TRES = excluindo({
  2: { por: PESSOAS.bruno.id, haMs: 3 * DIA },
  3: { por: PESSOAS.juliana.id, haMs: 60 * 60_000 },
  4: { por: PESSOAS.carla.id, haMs: 2 * 60 * 60_000 },
})

describe('R38-23: a lista da lixeira', () => {
  it('um main, um h1, a frase dos 30 dias e os excluídos do mais recente para o mais antigo, com quem excluiu e o prazo', async () => {
    await renderizarRotaPronta('/app/lixeira', { ajustarRotina: TRES })

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Lixeira'])
    expect(screen.getByText('Os registros excluídos ficam aqui por 30 dias.')).toBeTruthy()
    expect(idsDaLista()).toEqual([id(3), id(4), id(2)])

    const [mamada, tummy, fralda] = itens()
    expect(mamada.textContent).toContain('Mamada')
    expect(mamada.textContent).toContain('05/11 às 07:32')
    expect(mamada.textContent).toContain('excluído por Juliana em 05/11 às 09:00')
    expect(mamada.textContent).toContain('pode ser restaurado até 05/12 às 09:00')
    expect(tummy.textContent).toContain('excluído por Carla em 05/11 às 08:00')
    expect(fralda.textContent).toContain('excluído por Bruno em 02/11 às 10:00')
    expect(fralda.textContent).toContain('pode ser restaurado até 02/12 às 10:00')
  })

  it('o link Voltar para o Histórico leva ao Histórico, com o foco no h1 dele', async () => {
    const { roteador } = await renderizarRotaPronta('/app/lixeira', { ajustarRotina: TRES })

    fireEvent.click(screen.getByRole('link', { name: 'Voltar para o Histórico' }))
    await aguardarCarga()

    expect(roteador.state.location.pathname).toBe('/app/historico')
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Histórico' }))
  })

  it('sem nenhum excluído: a frase da lixeira vazia', async () => {
    await renderizarRotaPronta('/app/lixeira')

    expect(screen.getByText('A lixeira está vazia.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Restaurar/ })).toBeNull()
  })

  it('o que passou de 30 dias já não aparece', async () => {
    await renderizarRotaPronta('/app/lixeira', { ajustarRotina: excluindo({ 2: { por: PESSOAS.bruno.id, haMs: 31 * DIA }, 3: { por: PESSOAS.bruno.id, haMs: 29 * DIA } }) })

    expect(idsDaLista()).toEqual([id(3)])
  })

  it('a autoria de quem já não é da família é `ex-membro da família`', async () => {
    await renderizarRotaPronta('/app/lixeira', { ajustarRotina: excluindo({ 3: { por: PESSOAS.davi.id, haMs: 60 * 60_000 } }) })

    expect(itens()[0].textContent).toContain('excluído por ex-membro da família')
  })

  it('lista com mais de 200 itens: o aviso da lista incompleta com o limite', async () => {
    await renderizarRotaPronta('/app/lixeira', {
      ajustarRotina: (fixture) => {
        const modelo = fixture.registros.find((registro) => registro.id === id(3))!
        const muitos = Array.from({ length: 201 }, (_, indice) => ({
          ...modelo,
          id: `a0000000-0000-7000-8000-${String(20_000 + indice).padStart(12, '0')}`,
          excluidoEm: iso(INSTANTE.getTime() - 60_000),
          excluidoPor: PESSOAS.juliana.id,
        }))
        return { ...fixture, registros: [...fixture.registros, ...muitos] }
      },
    })

    expect(document.querySelector('[data-lista-incompleta="lixeira"]')!.textContent).toBe('Esta lista mostra só os primeiros 200 itens.')
    expect(itens()).toHaveLength(200)
  })

  it('falha de rede na leitura: a frase do catálogo e Tentar de novo, que relê', async () => {
    const mundo = criarMundoDeTeste({ ajustarRotina: TRES })
    simularFalhaRotina(mundo.rotina, 'lixeira', 'rede')
    await renderizarRotaPronta('/app/lixeira', { mundo })

    expect(screen.getByRole('alert').textContent).toContain('Não foi possível falar com o servidor. Verifique a conexão.')
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()

    expect(idsDaLista()).toEqual([id(3), id(4), id(2)])
  })
})

describe('R38-23: quem pode restaurar', () => {
  it('o responsável restaura qualquer um; cada botão diz o que restaura', async () => {
    await renderizarRotaPronta('/app/lixeira', { ajustarRotina: TRES })

    expect(screen.getAllByRole('button', { name: /^Restaurar / })).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Restaurar mamada de 05/11 às 07:32' })).toBeTruthy()
  })

  it('o cuidador restaura só o que ele mesmo fez', async () => {
    await renderizarRotaPronta('/app/lixeira', { ajustarRotina: TRES, sessao: 'bruno' })

    expect(idsDaLista()).toEqual([id(3), id(4), id(2)])
    expect(within(itens()[0]).getByRole('button', { name: /^Restaurar / })).toBeTruthy()
    expect(within(itens()[1]).queryByRole('button')).toBeNull()
    expect(within(itens()[2]).getByRole('button', { name: /^Restaurar / })).toBeTruthy()
  })

  it('o observador vê a lista e nenhum botão', async () => {
    await renderizarRotaPronta('/app/lixeira', { ajustarRotina: TRES, papelDeBruno: 'observador', sessao: 'bruno' })

    expect(itens()).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Restaurar/ })).toBeNull()
  })
})

describe('R38-23: restaurar', () => {
  it('Restaurar tira o item da lista, mostra `Registro restaurado.` com o link para o Histórico do dia, e o foco vai ao h1', async () => {
    const mundo = await renderizarRotaPronta('/app/lixeira', { ajustarRotina: TRES })

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar mamada de 05/11 às 07:32' }))
    await aguardarCarga()

    expect(idsDaLista()).toEqual([id(4), id(2)])
    expect(status().textContent).toContain('Registro restaurado.')
    expect(within(status()).getByRole('link', { name: 'Ver no Histórico' }).getAttribute('href')).toBe('/app/historico?dia=2026-11-05')
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Lixeira' }))
    expect(mundo.rotina).toBeTruthy()

    fireEvent.click(within(status()).getByRole('link', { name: 'Ver no Histórico' }))
    await aguardarCarga()
    expect(document.querySelector('[data-registros-do-dia]')!.textContent).toContain('Mamada')
  })

  it('o prazo vence entre a leitura e o toque: a frase do catálogo e o item sai da lista', async () => {
    await renderizarRotaPronta('/app/lixeira', { ajustarRotina: excluindo({ 3: { por: PESSOAS.juliana.id, haMs: 30 * DIA - 60_000 } }) })
    expect(idsDaLista()).toEqual([id(3)])

    vi.setSystemTime(new Date(INSTANTE.getTime() + 2 * 60_000))
    fireEvent.click(screen.getByRole('button', { name: /^Restaurar / }))
    await aguardarCarga()

    expect(status().textContent).toContain('Passaram-se mais de 30 dias. Este registro não pode mais ser restaurado.')
    expect(idsDaLista()).toEqual([])
    expect(screen.getByText('A lixeira está vazia.')).toBeTruthy()
  })

  it('sem resposta do servidor: a frase de escrita e Tentar de novo, que restaura de verdade', async () => {
    const mundo = criarMundoDeTeste({ ajustarRotina: TRES })
    await renderizarRotaPronta('/app/lixeira', { mundo })
    simularFalhaRotina(mundo.rotina, 'restaurarRegistro', 'rede')

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar mamada de 05/11 às 07:32' }))
    await aguardarCarga()

    expect(status().textContent).toContain('Não deu para confirmar com o servidor.')
    expect(idsDaLista()).toContain(id(3))
    fireEvent.click(within(status()).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()

    expect(idsDaLista()).toEqual([id(4), id(2)])
    expect(status().textContent).toContain('Registro restaurado.')
  })
})

describe('R38-23: sem bebê, sem família e bebê arquivado', () => {
  it('sem bebê: a tela de família sem bebê, sem lixeira', async () => {
    await renderizarRotaPronta('/app/lixeira', { semBebes: true })

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(document.querySelector('[data-lixeira]')).toBeNull()
  })

  it('bebê arquivado: a lista aparece e o botão Restaurar não, porque o banco recusa', async () => {
    await renderizarRotaPronta('/app/lixeira', { ajustarRotina: TRES, bebeArquivado: true })

    expect(itens()).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Restaurar/ })).toBeNull()
  })
})
