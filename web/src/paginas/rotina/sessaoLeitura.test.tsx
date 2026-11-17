import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import { aguardarCarga, renderizarRota, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste, semSessaoEmAndamento } from '../../teste/rotina.fixture.ts'

// A falha da primeira leitura da Sessão mostra só o erro: nunca o estado vazio, que seria uma afirmação falsa.

const INSTANTE = new Date('2026-11-05T10:00:00')
const FRASE_DE_LEITURA = 'Não foi possível falar com o servidor. Verifique a conexão.'
const TITULO_VAZIO = 'Nenhuma sessão em andamento'
const SUBTITULO_VAZIO = 'Comece uma sessão pela barra Registrar no Hoje.'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const botao = (nome: string) => screen.getByRole('button', { name: nome })

function esperarSoOErro() {
  expect(screen.queryByText(TITULO_VAZIO)).toBeNull()
  expect(screen.queryByText(SUBTITULO_VAZIO)).toBeNull()
  expect(screen.queryByText('Sessões anteriores')).toBeNull()
  expect(document.querySelector('[data-anteriores]')).toBeNull()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sessão')
  const alerta = screen.getByRole('alert')
  expect(alerta.textContent).toContain(FRASE_DE_LEITURA)
  expect(alerta.textContent).toContain('Tentar de novo')
}

describe('Sessão: a leitura segurada mantém o h1 "Sessão"', () => {
  function segurarLeitura(mundo: ReturnType<typeof criarMundoDeTeste>) {
    const original = mundo.rotina.emAndamento.bind(mundo.rotina)
    let liberar: () => void = () => {}
    vi.spyOn(mundo.rotina, 'emAndamento').mockImplementation((bebeId) => new Promise((resolver) => (liberar = () => resolver(original(bebeId)))))
    return () => liberar()
  }
  const esvaziar = () =>
    act(async () => {
      for (let passo = 0; passo < 8; passo++) await Promise.resolve()
    })

  it('carregando: um só h1 "Sessão" no main aria-busy, com "Carregando…"; depois da leitura o aria-busy some', async () => {
    const mundo = criarMundoDeTeste()
    const liberar = segurarLeitura(mundo)
    renderizarRota('/app/sessao', { mundo })
    await esvaziar()

    const ocupado = document.querySelector('main[aria-busy="true"][data-tela="sessao"]') as HTMLElement
    expect(ocupado).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Sessão'])
    expect(within(ocupado).getByRole('heading', { level: 1 })).toBeTruthy()
    expect(within(ocupado).getByText('Carregando…')).toBeTruthy()
    expect(screen.queryByText(TITULO_VAZIO)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()

    liberar()
    await aguardarCarga()
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Sono de Heloísa'])
  })

  it('sem sessão no servidor: depois da leitura, um só h1 com o estado vazio e sem aria-busy', async () => {
    const mundo = criarMundoDeTeste({ ajustarRotina: semSessaoEmAndamento })
    const liberar = segurarLeitura(mundo)
    renderizarRota('/app/sessao', { mundo })
    await esvaziar()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Sessão'])

    liberar()
    await aguardarCarga()
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([TITULO_VAZIO])
  })

  it('o erro continua com o h1 "Sessão" e o alerta, sem o estado vazio', async () => {
    const mundo = criarMundoDeTeste({ ajustarRotina: semSessaoEmAndamento })
    simularFalhaRotina(mundo.rotina, 'emAndamento', 'rede')
    await renderizarRotaPronta('/app/sessao', { mundo })

    esperarSoOErro()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })
})

describe('Sessão: a falha da leitura inicial mostra só o erro', () => {
  it('com uma sessão aberta no servidor: título "Sessão" e o erro; "Tentar de novo" mostra a sessão', async () => {
    const mundo = criarMundoDeTeste()
    simularFalhaRotina(mundo.rotina, 'emAndamento', 'rede')
    await renderizarRotaPronta('/app/sessao', { mundo })

    esperarSoOErro()
    expect(screen.getByRole('link', { name: 'Voltar para Hoje' })).toBeTruthy()

    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
  })

  it('sem sessão no servidor: o erro primeiro; depois do "Tentar de novo" aparece o estado vazio', async () => {
    const mundo = criarMundoDeTeste({ ajustarRotina: semSessaoEmAndamento })
    simularFalhaRotina(mundo.rotina, 'emAndamento', 'rede')
    await renderizarRotaPronta('/app/sessao', { mundo })

    esperarSoOErro()

    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TITULO_VAZIO)
  })

  it('?tipo=sono com a leitura falhando não começa sessão nenhuma', async () => {
    const mundo = criarMundoDeTeste({ ajustarRotina: semSessaoEmAndamento })
    const gravar = vi.spyOn(mundo.rotina, 'gravarRegistro')
    simularFalhaRotina(mundo.rotina, 'emAndamento', 'rede')
    await renderizarRotaPronta('/app/sessao?tipo=sono', { mundo })

    esperarSoOErro()
    expect(gravar).not.toHaveBeenCalled()
  })
})
