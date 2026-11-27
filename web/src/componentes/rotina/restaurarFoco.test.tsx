import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { simularFalhaRotina, type FixtureRotina } from '../../dados/rotina.memoria.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'

const INSTANTE = new Date('2026-11-05T10:00:00')
const MAMADA = 'a0000000-0000-7000-8000-000000000003'
const FRALDA = 'a0000000-0000-7000-8000-000000000002'
const DETALHE = `/app/registro/${MAMADA}`
const REDE = 'Não deu para confirmar com o servidor. Tente de novo. Se já tiver sido salvo, nada fica repetido.'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const status = () => screen.getByRole('status')
const frase = () => status().querySelector('p')?.textContent
const titulo = () => screen.getByRole('heading', { level: 1 })
const botaoDoStatus = (name: string) => within(status()).getByRole('button', { name })
const idsDaLixeira = () => [...document.querySelectorAll('[data-lixeira] [data-registro]')].map((item) => item.getAttribute('data-registro'))
const excluidos = (outroRegistro = false) => (fixture: FixtureRotina): FixtureRotina => ({
  ...fixture,
  registros: fixture.registros.map((registro) => registro.id === MAMADA || (outroRegistro && registro.id === FRALDA)
    ? { ...registro, excluidoEm: new Date(INSTANTE.getTime() - 60_000).toISOString(), excluidoPor: PESSOAS.juliana.id }
    : registro),
})

async function ativar(controle: HTMLElement) {
  controle.focus()
  expect(document.activeElement).toBe(controle)
  fireEvent.click(controle)
  await aguardarCarga()
}

/** O foco que um efeito move depois de um passo assíncrono nunca se afirma de forma síncrona. */
async function focoNoTitulo() {
  // O relógio é falso: o `waitFor` só tenta de novo (e só estoura o prazo) se o relógio andar; por isso o
  // avanço em passos curtos dentro de `act`, até a asserção passar ou o prazo de 1 s falso acabar.
  const espera = waitFor(() => expect(document.activeElement).toBe(titulo()), { timeout: 1000, interval: 50 })
  espera.catch(() => undefined)
  for (let passo = 0; passo < 25; passo++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
  }
  await espera
  expect(document.activeElement?.tagName).toBe('H1')
}

function confirmarRestaurado() {
  expect(frase()).toBe('Registro restaurado.')
  expect(within(status()).queryByRole('button', { name: 'Desfazer' })).toBeNull()
  expect(within(status()).getByRole('link', { name: 'Ver no Histórico' }).getAttribute('href')).toBe('/app/historico?dia=2026-11-05')
}

describe('LIX-INH-01', () => {
  it.each([false, true])('keeps H1 focus after the focused retry removes its row (remaining row: %s)', async (outroRegistro) => {
    const mundo = criarMundoDeTeste({ ajustarRotina: excluidos(outroRegistro) })
    const restaurar = vi.spyOn(mundo.rotina, 'restaurarRegistro')
    const { roteador } = await renderizarRotaPronta('/app/lixeira', { mundo })
    const antes = await mundo.rotina.registro(MAMADA)
    simularFalhaRotina(mundo.rotina, 'restaurarRegistro', 'rede')

    await ativar(screen.getByRole('button', { name: 'Restaurar mamada de 05/11 às 07:32' }))
    expect(frase()).toBe(REDE)
    expect(await mundo.rotina.registro(MAMADA)).toEqual(antes)
    const repetir = botaoDoStatus('Tentar de novo')
    await ativar(repetir)

    expect(repetir.isConnected).toBe(false)
    expect(restaurar.mock.calls).toEqual([[MAMADA], [MAMADA]])
    const depois = await mundo.rotina.registro(MAMADA)
    expect(depois.ok && depois.valor).toMatchObject({ id: MAMADA, tipo: 'mamada', excluidoEm: null, excluidoPor: null })
    expect(idsDaLixeira()).toEqual(outroRegistro ? [FRALDA] : [])
    if (!outroRegistro) expect(screen.getByText('A lixeira está vazia.')).toBeTruthy()
    confirmarRestaurado()
    expect(roteador.state.location.pathname).toBe('/app/lixeira')
    expect(roteador.state.location.search).toBe('')
    await focoNoTitulo()
  })
})

it('RESTORE-SAME-CLASS: detail retry preserves its route and restored controls with H1 focus', async () => {
  const mundo = criarMundoDeTeste({ ajustarRotina: excluidos() })
  const restaurar = vi.spyOn(mundo.rotina, 'restaurarRegistro')
  const { roteador } = await renderizarRotaPronta(DETALHE, { mundo })
  simularFalhaRotina(mundo.rotina, 'restaurarRegistro', 'rede')
  await ativar(screen.getByRole('button', { name: 'Restaurar' }))
  expect(frase()).toBe(REDE)
  const repetir = botaoDoStatus('Tentar de novo')
  await ativar(repetir)

  expect(repetir.isConnected).toBe(false)
  expect(restaurar.mock.calls).toEqual([[MAMADA], [MAMADA]])
  const registro = await mundo.rotina.registro(MAMADA)
  expect(registro.ok && registro.valor).toMatchObject({ id: MAMADA, excluidoEm: null, excluidoPor: null })
  expect(document.querySelector('[data-registro-na-lixeira]')).toBeNull()
  expect(screen.getByRole('link', { name: 'Editar mamada' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Excluir' })).toBeTruthy()
  confirmarRestaurado()
  expect(roteador.state.location.pathname).toBe(DETALHE)
  expect(roteador.state.location.search).toBe('')
  await focoNoTitulo()
})

const lixeiraComFalhas = async (falhas: number) => {
  const mundo = criarMundoDeTeste({ ajustarRotina: excluidos() })
  const original = mundo.rotina.restaurarRegistro.bind(mundo.rotina)
  const restaurar = vi.spyOn(mundo.rotina, 'restaurarRegistro')
  const resultado = await renderizarRotaPronta('/app/lixeira', { mundo })
  const antes = await mundo.rotina.registro(MAMADA)
  for (let i = 0; i < falhas; i++) simularFalhaRotina(mundo.rotina, 'restaurarRegistro', 'rede')
  await ativar(screen.getByRole('button', { name: 'Restaurar mamada de 05/11 às 07:32' }))
  expect(frase()).toBe(REDE)
  return { ...resultado, mundo, original, restaurar, antes }
}

describe('LIX-INH-01: variações da mesma regra', () => {
  it('a segunda falha mantém erro, Tentar de novo e dados; a repetição seguinte restaura com foco no H1', async () => {
    const { mundo, restaurar, antes } = await lixeiraComFalhas(2)
    await ativar(botaoDoStatus('Tentar de novo'))

    expect(restaurar.mock.calls).toEqual([[MAMADA], [MAMADA]])
    expect(frase()).toBe(REDE)
    expect(await mundo.rotina.registro(MAMADA)).toEqual(antes)
    expect(idsDaLixeira()).toEqual([MAMADA])
    const outra = botaoDoStatus('Tentar de novo')
    await ativar(outra)

    expect(outra.isConnected).toBe(false)
    expect(restaurar.mock.calls).toEqual([[MAMADA], [MAMADA], [MAMADA]])
    const depois = await mundo.rotina.registro(MAMADA)
    expect(depois.ok && depois.valor).toMatchObject({ id: MAMADA, excluidoEm: null, excluidoPor: null })
    confirmarRestaurado()
    await focoNoTitulo()
  })

  it('a resposta atrasada não rouba o foco que a pessoa levou a um link que continua na tela', async () => {
    const { mundo, original, restaurar } = await lixeiraComFalhas(1)
    let liberar: () => void = () => undefined
    const porta = new Promise<void>((resolve) => {
      liberar = resolve
    })
    restaurar.mockImplementationOnce(async (id) => {
      await porta
      return original(id)
    })
    const repetir = botaoDoStatus('Tentar de novo')
    repetir.focus()
    fireEvent.click(repetir)
    await act(async () => {
      await Promise.resolve()
    })

    expect(restaurar.mock.calls).toEqual([[MAMADA], [MAMADA]])
    expect(repetir.isConnected).toBe(true)
    expect(frase()).toBe(REDE)
    const voltar = screen.getByRole('link', { name: 'Voltar para o Histórico' })
    voltar.focus()
    expect(document.activeElement).toBe(voltar)
    liberar()
    await aguardarCarga()

    confirmarRestaurado()
    const restaurado = await mundo.rotina.registro(MAMADA)
    expect(restaurado.ok && restaurado.valor).toMatchObject({ id: MAMADA, excluidoEm: null, excluidoPor: null })
    expect(document.activeElement).toBe(voltar)
  })

  it('Fechar depois do sucesso não faz nova escrita', async () => {
    const { mundo, restaurar } = await lixeiraComFalhas(1)
    await ativar(botaoDoStatus('Tentar de novo'))
    confirmarRestaurado()
    const antes = await mundo.rotina.registro(MAMADA)
    const escritas = vi.spyOn(mundo.rotina, 'excluirRegistro')

    await ativar(botaoDoStatus('Fechar'))

    expect(status().textContent).toBe('')
    expect(restaurar.mock.calls).toEqual([[MAMADA], [MAMADA]])
    expect(escritas).not.toHaveBeenCalled()
    expect(await mundo.rotina.registro(MAMADA)).toEqual(antes)
  })

  it('o erro do restaurar levado pela navegação ao Hoje: a repetição foca o H1 do Hoje', async () => {
    const { mundo, restaurar, roteador } = await lixeiraComFalhas(1)
    const hoje = within(screen.getByRole('navigation', { name: 'Site' })).getByRole('link', { name: 'Hoje' })
    fireEvent.click(hoje)
    await aguardarCarga()
    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect(frase()).toBe(REDE)
    const repetir = botaoDoStatus('Tentar de novo')
    await ativar(repetir)

    expect(repetir.isConnected).toBe(false)
    expect(restaurar.mock.calls).toEqual([[MAMADA], [MAMADA]])
    const depois = await mundo.rotina.registro(MAMADA)
    expect(depois.ok && depois.valor).toMatchObject({ id: MAMADA, excluidoEm: null, excluidoPor: null })
    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect(frase()).toBe('Registro restaurado.')
    await focoNoTitulo()
    expect(titulo().textContent).toBe('Hoje')
  })
})
