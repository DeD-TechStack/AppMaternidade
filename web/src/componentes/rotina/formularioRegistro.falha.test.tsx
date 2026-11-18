import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'

// ERR-2: uma promessa REJEITADA (não um `{ ok: false }`) na gravação, na edição ou na conferência prévia do
// formulário de registro termina no erro de escrita (ou de leitura, na conferência) do catálogo, e o formulário
// volta a ser usável. Sem `Salvando…` eterno e sem rejeição sem tratamento.

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Um `Error` comum: um `TypeError` seria classificado como falha de rede, e aqui o erro é inesperado.
const FALHA = () => new Error('falha inesperada')

const campo = (rotulo: string) => screen.getByLabelText(rotulo) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
const digitar = (rotulo: string, valor: string) => fireEvent.change(campo(rotulo), { target: { value: valor } })
const botao = (nome: string) => screen.getByRole('button', { name: nome })

function esperarFormularioUsavel() {
  expect(screen.queryByRole('button', { name: 'Salvando…' })).toBeNull()
  expect(screen.getByRole('alert').getAttribute('data-erro-rotina')).toBe('desconhecido')
  expect(botao('Salvar').getAttribute('aria-disabled')).not.toBe('true')
}

describe('o formulário de registro quando a chamada rejeita', () => {
  it('controle: a recusa do banco (resultado { ok: false }) mostra a frase e libera o Salvar', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=observacao')
    digitar('Texto', 'Tossiu à noite')
    simularFalhaRotina(rotina, 'gravarRegistro', 'bebe_arquivado')

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()

    expect(screen.getByRole('alert').textContent).toContain('arquivado')
    expect(botao('Salvar').getAttribute('aria-disabled')).not.toBe('true')
  })

  it('gravarRegistro rejeita: termina no erro de escrita desconhecido e o Salvar tenta de novo', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=observacao')
    digitar('Texto', 'Tossiu à noite')
    const gravar = vi.spyOn(rotina, 'gravarRegistro').mockRejectedValue(FALHA())

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    await aguardarCarga()

    esperarFormularioUsavel()
    expect(gravar).toHaveBeenCalledTimes(1)
    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    expect(gravar).toHaveBeenCalledTimes(2)
  })

  it('editarRegistro rejeita: termina no erro de escrita desconhecido e o formulário segue usável', async () => {
    const mundo = await renderizarRotaPronta('/app/hoje')
    const alvo = mundo.fixture.registros.find((r) => r.tipo === 'fralda' && r.criadoPor === PESSOAS.bruno.id)!
    mundo.unmount()
    await renderizarRotaPronta(`/app/registro/${alvo.id}/editar`, { mundo })
    digitar('Nota', 'Muito')
    const editar = vi.spyOn(mundo.rotina, 'editarRegistro').mockRejectedValue(FALHA())

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    await aguardarCarga()

    esperarFormularioUsavel()
    expect(editar).toHaveBeenCalledTimes(1)
  })

  it('a conferência prévia rejeita: mostra o erro desconhecido, nada é gravado e o Salvar volta', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=sono')
    digitar('Início: hora', '09:00')
    digitar('Fim: data', '2026-11-05')
    digitar('Fim: hora', '09:30')
    vi.spyOn(rotina, 'sessoesDaJanela').mockRejectedValue(FALHA())
    const gravar = vi.spyOn(rotina, 'gravarRegistro')

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    await aguardarCarga()

    esperarFormularioUsavel()
    expect(gravar).not.toHaveBeenCalled()
  })
})
