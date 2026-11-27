import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import { comSessaoEmAndamento, criarMundoDeTeste, semSessaoEmAndamento } from '../../teste/rotina.fixture.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'

// Caracterização do cartão da sessão do Hoje (a seção "Em andamento"): trava o que a tela mostra com sessão,
// sem sessão e com a leitura falha, para a extração do cartão em `hoje/CartaoDaSessao.tsx` não mudar nada.
// O relógio é o falso, parado às 10:00 de 5/11/2026 (hora do aparelho).

const INSTANTE = new Date('2026-11-05T10:00:00')
const VAZIO = 'Nenhuma sessão em andamento.'
const PERGUNTA = 'A sessão durou menos de 1 minuto. Salvar mesmo assim?'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

const cartao = (container: HTMLElement) => container.querySelector<HTMLElement>('main [data-andamento]')!
const digitos = (timer: HTMLElement) => timer.querySelector('[aria-hidden="true"]')!.textContent

describe('Hoje: o cartão da sessão (caracterização)', () => {
  it('com sessão: seção focável "Em andamento" com o tipo, o tempo, o autor, Encerrar e Ver sessão', async () => {
    const { container, fixture } = await renderizarRotaPronta('/app/hoje')

    const bloco = cartao(container)
    expect(bloco.tagName).toBe('SECTION')
    expect(bloco.getAttribute('tabindex')).toBe('-1')
    expect(bloco.hasAttribute('aria-busy')).toBe(false)
    const titulo = within(bloco).getByRole('heading', { name: 'Em andamento' })
    expect(bloco.getAttribute('aria-labelledby')).toBe(titulo.id)
    expect(within(bloco).getByText('Sono', { selector: 'p' })).toBeTruthy()
    expect(digitos(within(bloco).getByRole('timer', { name: 'Tempo de sono' }))).toBe('1:12:00')
    expect(within(bloco).getByText('por Ícaro')).toBeTruthy()
    expect(within(bloco).getByRole('button', { name: 'Encerrar' }).matches('[data-botao="primario"]')).toBe(true)
    const aberta = fixture.registros.find((r) => r.tipo === 'sono' && r.fim === null)!
    expect(within(bloco).getByRole('link', { name: 'Ver sessão' }).getAttribute('href')).toBe(`/app/sessao?id=${aberta.id}`)
    expect(bloco.querySelectorAll('button, a')).toHaveLength(2)
    expect(within(bloco).queryByRole('alert')).toBeNull()
    expect(document.body.textContent).not.toContain(VAZIO)
    // O envoltório do cartão é a Pilha da coluna e leva a classe de posição da grade.
    const pilha = bloco.closest('[data-h~="coluna"]')!
    expect(pilha.classList.contains('lg:col-start-1')).toBe(true)
    expect(pilha.classList.contains('lg:row-start-1')).toBe(true)
    expect(pilha.contains(bloco)).toBe(true)
  })

  it('com sessão: "Encerrar" com 1 minuto ou mais encerra de uma vez, e o cartão passa a dizer "Nenhuma sessão em andamento."', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))
    expect(document.activeElement).toBe(cartao(container))
    await aguardarCarga()

    expect(cartao(container).textContent).toContain(VAZIO)
    expect(screen.getByRole('status').textContent).toContain('Sessão encerrada: 1 h 12 min')
  })

  it('com sessão de menos de 1 minuto: "Encerrar" pergunta no cartão, Esc devolve o foco ao Encerrar e "Salvar" encerra', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { ajustarRotina: comSessaoEmAndamento('sono', 30_000) })
    const encerrar = within(cartao(container)).getByRole('button', { name: 'Encerrar' })

    fireEvent.click(encerrar)
    const pergunta = screen.getByRole('group', { name: PERGUNTA })
    expect(cartao(container).contains(pergunta)).toBe(true)
    expect(within(pergunta).getAllByRole('button').map((b) => b.textContent)).toEqual(['Salvar', 'Descartar'])
    expect(document.activeElement).toBe(within(pergunta).getByRole('button', { name: 'Salvar' }))

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: PERGUNTA })).toBeNull()
    expect(document.activeElement).toBe(encerrar)

    fireEvent.click(encerrar)
    fireEvent.click(within(screen.getByRole('group', { name: PERGUNTA })).getByRole('button', { name: 'Salvar' }))
    await aguardarCarga()

    expect(screen.queryByRole('group', { name: PERGUNTA })).toBeNull()
    expect(cartao(container).textContent).toContain(VAZIO)
    expect(screen.getByRole('status').textContent).toContain('Sessão encerrada')
  })

  it('observador: o cartão mostra a sessão sem o botão Encerrar', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { sessao: 'davi', papelDeDavi: 'observador' })

    expect(within(cartao(container)).getByRole('timer')).toBeTruthy()
    expect(within(cartao(container)).queryByRole('button', { name: 'Encerrar' })).toBeNull()
    expect(within(cartao(container)).getByRole('link', { name: 'Ver sessão' })).toBeTruthy()
  })

  it('sem sessão: "Nenhuma sessão em andamento." e nenhum botão, link nem erro', async () => {
    const { container } = await renderizarRotaPronta('/app/hoje', { ajustarRotina: semSessaoEmAndamento })

    const bloco = cartao(container)
    expect(bloco.tagName).toBe('SECTION')
    expect(bloco.getAttribute('tabindex')).toBe('-1')
    expect(within(bloco).getByRole('heading', { name: 'Em andamento' })).toBeTruthy()
    expect(within(bloco).getByText(VAZIO)).toBeTruthy()
    expect(bloco.querySelectorAll('button, a')).toHaveLength(0)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Outras sessões em andamento' })).toBeNull()
  })

  it('erro de leitura de emAndamento: o erro ocupa o cartão (alert e "Tentar de novo"), nunca "Nenhuma sessão em andamento."', async () => {
    const mundo = criarMundoDeTeste()
    simularFalhaRotina(mundo.rotina, 'emAndamento', 'rede')
    const { container } = await renderizarRotaPronta('/app/hoje', { mundo })

    const bloco = cartao(container)
    expect(bloco.tagName).toBe('SECTION')
    expect(bloco.getAttribute('tabindex')).toBe('-1')
    expect(bloco.hasAttribute('aria-busy')).toBe(false)
    expect(bloco.classList.contains('alvo-foco')).toBe(true)
    expect(within(bloco).getByRole('heading', { name: 'Em andamento' })).toBeTruthy()
    expect(within(bloco).getByRole('alert')).toBeTruthy()
    expect(within(bloco).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
    expect(within(bloco).queryByRole('timer')).toBeNull()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(document.body.textContent).not.toContain(VAZIO)

    fireEvent.click(within(bloco).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()

    expect(digitos(within(cartao(container)).getByRole('timer'))).toBe('1:12:00')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
