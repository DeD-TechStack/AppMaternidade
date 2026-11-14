import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { simularRespostaPerdidaRotina } from '../../dados/rotina.memoria.ts'
import { relogioDoTeste } from '../../teste/relogio.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { ID_BEBE } from '../../teste/rotina.fixture.ts'

// R1 e R2: "Tentar de novo" repete o comando ORIGINAL, com o mesmo id, o mesmo momento e a mesma nota da 1ª
// tentativa, também depois de a tela reler e achar a sessão já encerrada ou excluída (a resposta se perdeu,
// mas a mudança foi aplicada). O relógio falso anda entre as tentativas: um momento novo seria visto.

const INSTANTE = new Date('2026-11-05T10:00:00')
const FRASE_DE_REDE = 'Não deu para confirmar com o servidor. Tente de novo: se já tiver sido salvo, não duplica.'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const campo = (rotulo: string) => screen.getByLabelText(rotulo) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
const digitar = (rotulo: string, valor: string) => fireEvent.change(campo(rotulo), { target: { value: valor } })
const botao = (nome: string) => screen.getByRole('button', { name: nome })
const status = () => screen.getByRole('status')

type Mundo = Awaited<ReturnType<typeof renderizarRotaPronta>>
const idDoSono = (mundo: Mundo) => mundo.fixture.registros.find((r) => r.tipo === 'sono' && r.fim === null)!.id
const depoisDeUmTempo = (mudarRelogio: (data: Date) => void) => mudarRelogio(new Date('2026-11-05T10:03:00'))

describe('R1: a Sessão repete o comando original', () => {
  it('R1: Encerrar e anotar, com a resposta perdida: repete o mesmo fim e a mesma nota, e a nota continua visível depois da releitura', async () => {
    const mudarRelogio = relogioDoTeste()
    const mundo = await renderizarRotaPronta('/app/sessao')
    const encerrar = vi.spyOn(mundo.rotina, 'encerrarSessao')
    const gravarNota = vi.spyOn(mundo.rotina, 'gravarNota')
    simularRespostaPerdidaRotina(mundo.rotina, 'encerrarSessao')

    fireEvent.click(botao('Encerrar e anotar'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nota' }), { target: { value: 'Dormiu bem' } })
    fireEvent.click(botao('Salvar'))
    await aguardarCarga()

    // A releitura já mostra a sessão encerrada, mas a recuperação continua na tela, com a nota digitada.
    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_REDE)
    expect(within(screen.getByRole('alert')).getByText('Dormiu bem')).toBeTruthy()
    expect(mundo.roteador.state.location.pathname).toBe('/app/sessao')
    expect(gravarNota).not.toHaveBeenCalled()

    depoisDeUmTempo(mudarRelogio)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    expect(encerrar).toHaveBeenCalledTimes(2)
    expect(encerrar.mock.calls[1]).toEqual(encerrar.mock.calls[0])
    expect(gravarNota).toHaveBeenCalledTimes(1)
    expect(gravarNota.mock.calls[0][0]).toMatchObject({ texto: 'Dormiu bem' })
    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    expect(status().querySelector('p')!.textContent).toMatch(/^Sessão encerrada: .*, com nota$/)
  })

  it('R1: com a nota perdida junto, a nota é gravada uma vez só e com o mesmo id nas duas tentativas', async () => {
    const mudarRelogio = relogioDoTeste()
    const mundo = await renderizarRotaPronta('/app/sessao')
    const gravarNota = vi.spyOn(mundo.rotina, 'gravarNota')
    simularRespostaPerdidaRotina(mundo.rotina, 'encerrarSessao')
    simularRespostaPerdidaRotina(mundo.rotina, 'gravarNota')

    fireEvent.click(botao('Encerrar e anotar'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nota' }), { target: { value: 'Mamou pouco' } })
    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    depoisDeUmTempo(mudarRelogio)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(status().querySelector('p')!.textContent).toBe(FRASE_DE_REDE)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    expect(gravarNota).toHaveBeenCalledTimes(2)
    expect(gravarNota.mock.calls[1][0]).toEqual(gravarNota.mock.calls[0][0])
    const notas = await mundo.rotina.notas(mundo.fixture.registros[0].familiaId, ID_BEBE)
    expect(notas.ok && notas.valor.itens.filter((n) => n.texto === 'Mamou pouco')).toHaveLength(1)
  })

  it('R1: Encerrar (sem nota), com a resposta perdida: repete o mesmo fim, e a tela não diz "já tinha sido encerrada"', async () => {
    const mudarRelogio = relogioDoTeste()
    const mundo = await renderizarRotaPronta('/app/sessao')
    const encerrar = vi.spyOn(mundo.rotina, 'encerrarSessao')
    simularRespostaPerdidaRotina(mundo.rotina, 'encerrarSessao')

    fireEvent.click(botao('Encerrar'))
    await aguardarCarga()
    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_REDE)
    depoisDeUmTempo(mudarRelogio)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    expect(encerrar.mock.calls[1]).toEqual(encerrar.mock.calls[0])
    expect(status().querySelector('p')!.textContent).toMatch(/^Sessão encerrada: /)
    expect(status().textContent).not.toMatch(/já tinha sido encerrada/)
  })

  it('R1: Encerrar em outro horário, com a resposta perdida: repete o horário escolhido, não o relógio de agora', async () => {
    const mudarRelogio = relogioDoTeste()
    const mundo = await renderizarRotaPronta('/app/sessao')
    const id = idDoSono(mundo)
    const encerrar = vi.spyOn(mundo.rotina, 'encerrarSessao')
    // O aparelho marca 08:45; a sessão começou às 08:48: abre o painel do outro horário.
    mudarRelogio(new Date('2026-11-05T08:45:00'))
    fireEvent.click(botao('Encerrar'))
    await aguardarCarga()
    fireEvent.click(botao('Encerrar em outro horário, sono'))
    digitar('Fim: hora', '08:49')
    simularRespostaPerdidaRotina(mundo.rotina, 'encerrarSessao')
    fireEvent.click(within(screen.getByRole('group', { name: 'Encerrar em outro horário' })).getByRole('button', { name: 'Encerrar' }))
    await aguardarCarga()

    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_REDE)
    mudarRelogio(new Date('2026-11-05T08:50:00'))
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    const escolhido = new Date('2026-11-05T08:49:00').toISOString()
    expect(encerrar).toHaveBeenCalledTimes(2)
    expect(encerrar.mock.calls[0]).toEqual([id, escolhido])
    expect(encerrar.mock.calls[1]).toEqual([id, escolhido])
    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    const lido = await mundo.rotina.registro(id)
    expect(lido.ok && lido.valor && lido.valor.fim).toBe(escolhido)
  })

  it('R1: Descartar, com a resposta perdida: "Tentar de novo" repete o descarte (não o encerramento), mesmo com a sessão já excluída na releitura', async () => {
    const mundo = await renderizarRotaPronta('/app/sessao')
    const id = idDoSono(mundo)
    const excluir = vi.spyOn(mundo.rotina, 'excluirRegistro')
    const encerrar = vi.spyOn(mundo.rotina, 'encerrarSessao')
    simularRespostaPerdidaRotina(mundo.rotina, 'excluirRegistro')

    fireEvent.click(botao('Descartar'))
    fireEvent.click(within(screen.getByRole('group', { name: 'Descartar esta sessão?' })).getByRole('button', { name: 'Descartar' }))
    await aguardarCarga()

    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_REDE)
    expect(mundo.roteador.state.location.pathname).toBe('/app/sessao')
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    expect(excluir).toHaveBeenCalledTimes(2)
    expect(excluir.mock.calls[1]).toEqual([id])
    expect(encerrar).not.toHaveBeenCalled()
    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('R1: depois de a recuperação dar certo, o aviso de erro sai da tela e a tela segue para o Hoje', async () => {
    const mundo = await renderizarRotaPronta('/app/sessao')
    simularRespostaPerdidaRotina(mundo.rotina, 'encerrarSessao')
    fireEvent.click(botao('Encerrar'))
    await aguardarCarga()
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
  })
})

describe('R1: o Hoje repete o comando original', () => {
  it('R1: Encerrar no cartão, com a resposta perdida: repete o mesmo fim e conclui com "Sessão encerrada"', async () => {
    const mudarRelogio = relogioDoTeste()
    const mundo = await renderizarRotaPronta('/app/hoje')
    const encerrar = vi.spyOn(mundo.rotina, 'encerrarSessao')
    simularRespostaPerdidaRotina(mundo.rotina, 'encerrarSessao')

    fireEvent.click(botao('Encerrar'))
    await aguardarCarga()
    expect(status().querySelector('p')!.textContent).toBe(FRASE_DE_REDE)
    depoisDeUmTempo(mudarRelogio)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    expect(encerrar).toHaveBeenCalledTimes(2)
    expect(encerrar.mock.calls[1]).toEqual(encerrar.mock.calls[0])
    expect(status().querySelector('p')!.textContent).toMatch(/^Sessão encerrada: /)
    expect(status().textContent).not.toMatch(/já tinha sido encerrada/)
  })

  it('R1: a recuperação continua na barra depois da releitura, e repetir de novo depois de outra falha usa ainda o mesmo fim', async () => {
    const mudarRelogio = relogioDoTeste()
    const mundo = await renderizarRotaPronta('/app/hoje')
    const encerrar = vi.spyOn(mundo.rotina, 'encerrarSessao')
    simularRespostaPerdidaRotina(mundo.rotina, 'encerrarSessao')
    simularRespostaPerdidaRotina(mundo.rotina, 'encerrarSessao')

    fireEvent.click(botao('Encerrar'))
    await aguardarCarga()
    depoisDeUmTempo(mudarRelogio)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()
    expect(status().querySelector('p')!.textContent).toBe(FRASE_DE_REDE)
    mudarRelogio(new Date('2026-11-05T10:06:00'))
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    expect(encerrar).toHaveBeenCalledTimes(3)
    expect(encerrar.mock.calls[2]).toEqual(encerrar.mock.calls[0])
    expect(encerrar.mock.calls[1]).toEqual(encerrar.mock.calls[0])
  })
})

describe('R2: o formulário repete a chamada completa', () => {
  async function falharAoSalvarUmaFralda() {
    const mundo = await renderizarRotaPronta('/app/registro/novo')
    const gravar = vi.spyOn(mundo.rotina, 'gravarRegistro')
    digitar('Tipo do registro', 'fralda')
    digitar('Conteúdo', 'xixi')
    simularRespostaPerdidaRotina(mundo.rotina, 'gravarRegistro')
    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    expect(screen.getByRole('alert').textContent).toContain(FRASE_DE_REDE)
    return { mundo, gravar }
  }

  it('R2: mudar o tipo depois da falha não altera a repetição (mesmo id, tipo, bebê e detalhes)', async () => {
    const { gravar } = await falharAoSalvarUmaFralda()

    digitar('Tipo do registro', 'sono')
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    expect(gravar).toHaveBeenCalledTimes(2)
    expect(gravar.mock.calls[1][0]).toEqual(gravar.mock.calls[0][0])
    expect(gravar.mock.calls[1][0]).toMatchObject({ tipo: 'fralda', bebeId: ID_BEBE, detalhes: { conteudo: 'xixi' } })
  })

  it('R2: mudar o conteúdo, o horário e a nota depois da falha também não altera a repetição', async () => {
    const { gravar } = await falharAoSalvarUmaFralda()

    digitar('Conteúdo', 'coco')
    digitar('Nota', 'Muito')
    digitar('Horário: hora', '09:40')
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    expect(gravar.mock.calls[1][0]).toEqual(gravar.mock.calls[0][0])
  })

  it('R2: salvar os valores corrigidos é outra criação, com outro id, e o registro corrigido existe', async () => {
    const { mundo, gravar } = await falharAoSalvarUmaFralda()

    digitar('Conteúdo', 'coco')
    fireEvent.click(botao('Salvar'))
    await aguardarCarga()

    expect(gravar).toHaveBeenCalledTimes(2)
    expect(gravar.mock.calls[1][0].id).not.toBe(gravar.mock.calls[0][0].id)
    expect(gravar.mock.calls[1][0]).toMatchObject({ tipo: 'fralda', detalhes: { conteudo: 'coco' } })
    const lista = await mundo.rotina.doIntervalo(ID_BEBE, new Date(Date.now() - 60 * 60_000).toISOString(), new Date(Date.now() + 60 * 60_000).toISOString())
    const novos = lista.ok ? lista.valor.itens.filter((r) => r.origem === 'retroativo') : []
    expect(novos.map((r) => r.detalhes.conteudo).sort()).toEqual(['coco', 'xixi'])
  })

  it('R2: salvar sem corrigir nada repete o mesmo id (é a mesma criação, não duplica)', async () => {
    const { mundo, gravar } = await falharAoSalvarUmaFralda()

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()

    expect(gravar.mock.calls[1][0]).toEqual(gravar.mock.calls[0][0])
    const lista = await mundo.rotina.doIntervalo(ID_BEBE, new Date(Date.now() - 60 * 60_000).toISOString(), new Date(Date.now() + 60 * 60_000).toISOString())
    expect(lista.ok && lista.valor.itens.filter((r) => r.origem === 'retroativo')).toHaveLength(1)
  })
})
