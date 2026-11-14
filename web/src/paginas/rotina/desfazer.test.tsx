import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { simularFalhaRotina, simularRespostaPerdidaRotina } from '../../dados/rotina.memoria.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { ID_BEBE } from '../../teste/rotina.fixture.ts'

// A11Y-004: depois de "Desfazer" a região `role="status"` anuncia `Registro desfeito: <tipo>.` (só com
// "Fechar", sem sumir sozinha) e o foco volta ao botão que criou o registro; sem esse botão na tela, vai ao h1.
// Uma superfície por teste: Hoje (fralda, mamadeira e sólido), formulário "Registro salvo.", detalhe e
// Histórico, Lixeira. Relógio falso às 10:00 de 5/11/2026.

const INSTANTE = new Date('2026-11-05T10:00:00')
const id = (numero: number) => `a0000000-0000-7000-8000-${String(numero).padStart(12, '0')}`
const MAMADA = id(3)
const FRASE_DE_REDE = 'Não deu para confirmar com o servidor. Tente de novo: se já tiver sido salvo, não duplica.'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const botao = (nome: string) => screen.getByRole('button', { name: nome })
const status = () => screen.getByRole('status')
const frase = () => status().querySelector('p')!.textContent
const botoesDoStatus = () => within(status()).getAllByRole('button').map((b) => b.textContent)
const h1 = () => screen.getByRole('heading', { level: 1 })

async function clicar(controle: HTMLElement) {
  fireEvent.click(controle)
  await aguardarCarga()
}

describe('A11Y-004, Hoje: a fralda', () => {
  it('"Desfazer" anuncia `Registro desfeito: fralda.` só com Fechar e leva o foco ao botão "Registrar fralda de Heloísa"', async () => {
    await renderizarRotaPronta('/app/hoje')
    await clicar(botao('Registrar fralda de Heloísa'))
    await clicar(botao('Xixi'))
    botao('Desfazer').focus()

    await clicar(botao('Desfazer'))

    expect(frase()).toBe('Registro desfeito: fralda.')
    expect(botoesDoStatus()).toEqual(['Fechar'])
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(document.activeElement).toBe(botao('Registrar fralda de Heloísa'))
    expect(document.activeElement).not.toBe(botao('Iniciar sono de Heloísa'))
  })

  it('o aviso não some sozinho: continua depois de 10 s, e só sai com "Fechar"', async () => {
    await renderizarRotaPronta('/app/hoje')
    await clicar(botao('Registrar fralda de Heloísa'))
    await clicar(botao('Xixi'))
    await clicar(botao('Desfazer'))

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(frase()).toBe('Registro desfeito: fralda.')
    await clicar(botao('Fechar'))
    expect(status().textContent).toBe('')
  })

  it('outro registro troca o aviso pela confirmação nova', async () => {
    await renderizarRotaPronta('/app/hoje')
    await clicar(botao('Registrar fralda de Heloísa'))
    await clicar(botao('Xixi'))
    await clicar(botao('Desfazer'))
    act(() => {
      vi.advanceTimersByTime(2_000)
    })

    await clicar(botao('Registrar fralda de Heloísa'))
    await clicar(botao('Cocô'))

    expect(frase()).toBe('Fralda registrada: Cocô')
  })

  it('sem o botão de origem na tela, o foco cai no h1 (nunca no primeiro botão da barra)', async () => {
    await renderizarRotaPronta('/app/hoje')
    await clicar(botao('Registrar fralda de Heloísa'))
    await clicar(botao('Xixi'))
    const origem = botao('Registrar fralda de Heloísa')
    origem.remove()

    await clicar(botao('Desfazer'))

    expect(frase()).toBe('Registro desfeito: fralda.')
    expect(document.activeElement).toBe(h1())
  })
})

describe('A11Y-004, Hoje: mamadeira e alimentação sólida, criadas no painel Mais', () => {
  it.each([
    ['Mamadeira', 'Registro desfeito: mamadeira.'],
    ['Alimentação sólida', 'Registro desfeito: alimentação sólida.'],
  ])('"Desfazer" depois de "%s" anuncia `%s` e leva o foco ao botão "Mais registros"', async (item, anuncio) => {
    await renderizarRotaPronta('/app/hoje')
    fireEvent.click(botao('Mais registros'))
    await clicar(botao(item))
    botao('Desfazer').focus()

    await clicar(botao('Desfazer'))

    expect(frase()).toBe(anuncio)
    expect(botoesDoStatus()).toEqual(['Fechar'])
    expect(document.activeElement).toBe(botao('Mais registros'))
    expect(document.activeElement).not.toBe(botao('Iniciar sono de Heloísa'))
  })

  it('a falta de resposta no Desfazer mantém o erro e "Tentar de novo"; ao dar certo, o aviso `Registro desfeito` entra e o foco fica na origem', async () => {
    const mundo = await renderizarRotaPronta('/app/hoje')
    fireEvent.click(botao('Mais registros'))
    await clicar(botao('Mamadeira'))
    simularRespostaPerdidaRotina(mundo.rotina, 'excluirRegistro')

    await clicar(botao('Desfazer'))

    expect(frase()).toBe(FRASE_DE_REDE)
    expect(status().textContent).not.toContain('Registro desfeito')
    expect(botoesDoStatus()).toEqual(['Tentar de novo', 'Fechar'])
    expect(document.activeElement).toBe(botao('Mais registros'))

    await clicar(botao('Tentar de novo'))

    expect(frase()).toBe('Registro desfeito: mamadeira.')
    expect(botoesDoStatus()).toEqual(['Fechar'])
    expect(document.activeElement).toBe(botao('Mais registros'))
  })

  it('uma recusa do servidor no Desfazer não anuncia nada de "desfeito"', async () => {
    const mundo = await renderizarRotaPronta('/app/hoje')
    await clicar(botao('Registrar fralda de Heloísa'))
    await clicar(botao('Xixi'))
    simularFalhaRotina(mundo.rotina, 'excluirRegistro', 'registro_excluido')

    await clicar(botao('Desfazer'))

    expect(status().textContent).toContain('Este registro foi excluído e não pode ser mudado.')
    expect(status().textContent).not.toContain('Registro desfeito')
  })
})

describe('A11Y-004, o formulário: "Registro salvo." com Desfazer', () => {
  it('"Desfazer" anuncia `Registro desfeito: fralda.` e, sem o botão de origem na tela, o foco fica no h1', async () => {
    const { rotina } = await renderizarRotaPronta('/app/registro/novo?tipo=fralda')
    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'ambos' } })
    await clicar(botao('Salvar'))
    expect(frase()).toBe('Registro salvo.')

    await clicar(botao('Desfazer'))

    expect(frase()).toBe('Registro desfeito: fralda.')
    expect(botoesDoStatus()).toEqual(['Fechar'])
    expect(document.activeElement).toBe(h1())
    const lixeira = await rotina.lixeira(ID_BEBE)
    expect(lixeira.ok && lixeira.valor.itens.map((r) => r.tipo)).toEqual(['fralda'])
  })

  it('"Tentar de novo" do Desfazer termina com o aviso `Registro desfeito: mamadeira.`', async () => {
    const mundo = await renderizarRotaPronta('/app/registro/novo?tipo=mamadeira')
    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'formula' } })
    await clicar(botao('Salvar'))
    simularRespostaPerdidaRotina(mundo.rotina, 'excluirRegistro')

    await clicar(botao('Desfazer'))
    expect(frase()).toBe(FRASE_DE_REDE)
    await clicar(botao('Tentar de novo'))

    expect(frase()).toBe('Registro desfeito: mamadeira.')
    expect(botoesDoStatus()).toEqual(['Fechar'])
  })
})

describe('A11Y-004, detalhe e Histórico: Excluir e Desfazer', () => {
  it('"Desfazer" restaura, anuncia `Registro desfeito: mamada.` só com Fechar e deixa o foco no h1', async () => {
    const mundo = await renderizarRotaPronta(`/app/registro/${MAMADA}`)
    await clicar(botao('Excluir'))
    expect(mundo.roteador.state.location.pathname).toBe('/app/historico')
    expect(frase()).toBe('Registro excluído.')

    await clicar(botao('Desfazer'))

    expect(frase()).toBe('Registro desfeito: mamada.')
    expect(botoesDoStatus()).toEqual(['Fechar'])
    expect(document.activeElement).toBe(h1())
    expect(document.querySelector(`[data-registro="${MAMADA}"]`)).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(frase()).toBe('Registro desfeito: mamada.')
  })

  it('a falta de resposta no restaurar mantém o erro com "Tentar de novo"; ao dar certo, entra o aviso `Registro desfeito`', async () => {
    const mundo = await renderizarRotaPronta(`/app/registro/${MAMADA}`)
    await clicar(botao('Excluir'))
    simularRespostaPerdidaRotina(mundo.rotina, 'restaurarRegistro')

    await clicar(botao('Desfazer'))
    expect(frase()).toBe(FRASE_DE_REDE)
    expect(status().textContent).not.toContain('Registro desfeito')
    expect(botoesDoStatus()).toEqual(['Tentar de novo', 'Fechar'])

    await clicar(botao('Tentar de novo'))

    expect(frase()).toBe('Registro desfeito: mamada.')
    expect(botoesDoStatus()).toEqual(['Fechar'])
    expect(document.activeElement).toBe(h1())
  })

  it('o tipo do aviso é o do registro restaurado (um sono em andamento fala "sono")', async () => {
    await renderizarRotaPronta(`/app/registro/${id(1)}`)
    await clicar(botao('Excluir'))

    await clicar(botao('Desfazer'))

    expect(frase()).toBe('Registro desfeito: sono.')
  })
})

describe('A11Y-004, Lixeira: o Desfazer que chega com a pessoa à lixeira', () => {
  it('"Desfazer" na Lixeira anuncia `Registro desfeito: mamada.` e leva o foco ao h1', async () => {
    const mundo = await renderizarRotaPronta(`/app/registro/${MAMADA}`)
    await clicar(botao('Excluir'))
    await clicar(screen.getByRole('link', { name: 'Lixeira' }))
    expect(mundo.roteador.state.location.pathname).toBe('/app/lixeira')
    expect(botoesDoStatus()).toEqual(['Desfazer', 'Fechar'])

    await clicar(botao('Desfazer'))

    expect(frase()).toBe('Registro desfeito: mamada.')
    expect(botoesDoStatus()).toEqual(['Fechar'])
    expect(document.activeElement).toBe(h1())
  })

  it('o "Restaurar" da Lixeira continua sem Desfazer: a frase de sempre, e o foco no h1', async () => {
    const mundo = await renderizarRotaPronta(`/app/registro/${MAMADA}`)
    await clicar(botao('Excluir'))
    await clicar(botao('Fechar'))
    await act(async () => {
      await mundo.roteador.navigate('/app/lixeira', { state: { foco: 'titulo' } })
    })
    await aguardarCarga()

    await clicar(screen.getByRole('button', { name: /^Restaurar mamada/ }))

    expect(frase()).toBe('Registro restaurado.')
    expect(within(status()).queryByRole('button', { name: 'Desfazer' })).toBeNull()
    expect(document.activeElement).toBe(h1())
  })
})
