import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { criarRotas } from './rotas.tsx'
import { criarEstadoInicial, type EstadoPrototipo } from './prototipo/estado.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

const INSTANTE = new Date('2026-11-05T10:00:00')

/** Relógio falso parado em INSTANTE; o estado inicial nasce nele. */
function relogioFalso() {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
}

function sessaoHa(ms: number): EstadoPrototipo {
  const agora = Date.now()
  return {
    ...criarEstadoInicial(agora),
    sessao: { tipo: 'sono', inicio: agora - ms, pessoa: 'Bruno' },
  }
}

function itensDeUltimos(): string[] {
  const secao = screen.getByRole('heading', { name: 'Últimos' }).closest('section')!
  return within(secao)
    .getAllByRole('listitem')
    .map((li) => li.textContent ?? '')
}

function avancar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('cronômetro', () => {
  it('mostra 00:59 para uma sessão iniciada há 59 s', () => {
    relogioFalso()
    renderizarRota('/app/sessao', { estadoInicial: sessaoHa(59_000) })

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('00:59')
  })

  it('mostra 1:01:00 para uma sessão iniciada há 61 min', () => {
    relogioFalso()
    renderizarRota('/app/sessao', { estadoInicial: sessaoHa(61 * 60_000) })

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('1:01:00')
  })

  it('avançar 10 s leva 1:01:00 a 1:01:10, contado a partir do início', () => {
    relogioFalso()
    renderizarRota('/app/sessao', { estadoInicial: sessaoHa(61 * 60_000) })

    avancar(10_000)

    expect(screen.getByRole('timer', { name: 'Duração da sessão' }).textContent).toBe('1:01:10')
  })

  it('o cronômetro não é anunciado a cada segundo', () => {
    relogioFalso()
    renderizarRota('/app/sessao', { estadoInicial: sessaoHa(5_000) })

    expect(screen.getByRole('timer').getAttribute('aria-live')).toBe('off')
    expect(screen.getByText('Duração da sessão')).toBeTruthy()
  })

  it('mostra a hora de início e quem começou', () => {
    relogioFalso()
    renderizarRota('/app/sessao', { estadoInicial: sessaoHa(72 * 60_000) })

    expect(screen.getByText('Iniciado às 08:48 por Bruno')).toBeTruthy()
  })

  it('o cartão do Hoje conta os minutos a partir do início', () => {
    relogioFalso()
    renderizarRota('/app/hoje')

    expect(screen.getByText('1 h 12 min')).toBeTruthy()
    avancar(60_000)
    expect(screen.getByText('1 h 13 min')).toBeTruthy()
  })
})

describe('fralda', () => {
  function abrirFralda() {
    const gatilho = screen.getByRole('button', { name: 'Registrar fralda de Lia' })
    fireEvent.click(gatilho)
    return gatilho
  }

  it('escolher Xixi mostra a confirmação e põe "Fralda agora" em Últimos', () => {
    renderizarRota('/app/hoje')
    expect(itensDeUltimos()).toContain('Fralda há 50 min')

    abrirFralda()
    fireEvent.click(screen.getByRole('button', { name: 'Xixi' }))

    expect(screen.getByRole('status').textContent).toContain('Fralda registrada: Xixi')
    expect(itensDeUltimos()).toContain('Fralda agora')
    expect(itensDeUltimos()).not.toContain('Fralda há 50 min')
    expect(screen.queryByRole('button', { name: 'Xixi' })).toBeNull()
  })

  it('a escolha oferece Xixi, Cocô, Ambos e Cancelar', () => {
    renderizarRota('/app/hoje')
    abrirFralda()

    const grupo = screen.getByRole('group', { name: 'Fralda de Lia' })
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Xixi',
      'Cocô',
      'Ambos',
      'Cancelar',
    ])
  })

  it('"Desfazer" devolve Últimos ao que era e limpa a confirmação', () => {
    renderizarRota('/app/hoje')
    abrirFralda()
    fireEvent.click(screen.getByRole('button', { name: 'Cocô' }))
    expect(screen.getByRole('status').textContent).toContain('Fralda registrada: Cocô')

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))

    expect(itensDeUltimos()).toEqual(['Mamada há 2 h 10 min', 'Fralda há 50 min', 'Tummy time ontem 17:30'])
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('a confirmação continua presente depois de 60 s', () => {
    relogioFalso()
    renderizarRota('/app/hoje')
    abrirFralda()
    fireEvent.click(screen.getByRole('button', { name: 'Ambos' }))

    avancar(60_000)

    expect(screen.getByRole('status').textContent).toContain('Fralda registrada: Ambos')
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeTruthy()
  })

  it('"Fechar" tira a confirmação sem mexer em Últimos', () => {
    renderizarRota('/app/hoje')
    abrirFralda()
    fireEvent.click(screen.getByRole('button', { name: 'Xixi' }))

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.getByRole('status').textContent).toBe('')
    expect(itensDeUltimos()).toContain('Fralda agora')
  })

  it('Esc fecha a escolha e devolve o foco ao botão Fralda', () => {
    renderizarRota('/app/hoje')
    const gatilho = abrirFralda()
    expect(gatilho.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Xixi' }))

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(screen.queryByRole('group', { name: 'Fralda de Lia' })).toBeNull()
    expect(gatilho.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(gatilho)
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('"Cancelar" fecha a escolha, devolve o foco e não registra nada', () => {
    renderizarRota('/app/hoje')
    const gatilho = abrirFralda()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('group', { name: 'Fralda de Lia' })).toBeNull()
    expect(document.activeElement).toBe(gatilho)
    expect(itensDeUltimos()).toContain('Fralda há 50 min')
  })

  it('a confirmação não toma o foco do teclado', () => {
    renderizarRota('/app/hoje')
    const gatilho = abrirFralda()
    fireEvent.click(screen.getByRole('button', { name: 'Xixi' }))

    expect(document.activeElement).toBe(gatilho)
    expect(screen.getByRole('status').contains(document.activeElement)).toBe(false)
  })

  it('"+ Mais" abre um disclosure e cada item registra com confirmação', () => {
    renderizarRota('/app/hoje')
    const mais = screen.getByRole('button', { name: 'Mais registros' })
    expect(mais.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(mais)
    expect(mais.getAttribute('aria-expanded')).toBe('true')
    const grupo = screen.getByRole('group', { name: 'Outros registros de Lia' })
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Mamadeira',
      'Alimentação sólida',
      'Observação',
    ])

    fireEvent.click(within(grupo).getByRole('button', { name: 'Mamadeira' }))
    expect(screen.getByRole('status').textContent).toContain('Mamadeira registrada')
    expect(itensDeUltimos()[0]).toBe('Mamadeira agora')

    fireEvent.click(mais)
    fireEvent.click(screen.getByRole('button', { name: 'Observação' }))
    expect(screen.getByRole('status').textContent).toContain('Observação registrada')
    expect(screen.getByRole('status').textContent).not.toContain('Mamadeira')
    expect(itensDeUltimos().slice(0, 2)).toEqual(['Observação agora', 'Mamadeira agora'])

    fireEvent.click(mais)
    fireEvent.click(screen.getByRole('button', { name: 'Alimentação sólida' }))
    expect(screen.getByRole('status').textContent).toContain('Alimentação sólida registrada')
  })

  it('os botões rápidos têm os nomes acessíveis pedidos', () => {
    renderizarRota('/app/hoje')

    const nomes: Array<[string, string]> = [
      ['Iniciar sono de Lia', 'Sono'],
      ['Iniciar mamada de Lia', 'Mamada'],
      ['Registrar fralda de Lia', 'Fralda'],
      ['Iniciar tummy time de Lia', 'Tummy time'],
      ['Mais registros', '+ Mais'],
    ]
    for (const [nome, visivel] of nomes) {
      expect(screen.getByRole('button', { name: nome }).textContent).toBe(visivel)
    }
  })
})

describe('sessões', () => {
  it('encerrar no Hoje mostra "Sessão encerrada: 1 h 12 min"', () => {
    relogioFalso()
    renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))

    expect(screen.getByRole('status').textContent).toContain('Sessão encerrada: 1 h 12 min')
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()
  })

  it('"Desfazer" devolve a sessão de Bruno com o mesmo início', () => {
    relogioFalso()
    renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))
    avancar(5 * 60_000)

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))

    // 72 min do início original + 5 min que passaram = 77 min: o início não mudou.
    expect(screen.getByText('1 h 17 min')).toBeTruthy()
    expect(screen.getByText('por Bruno')).toBeTruthy()
    expect(screen.getByText('Sono', { selector: 'p' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('iniciar tummy time com o Sono em andamento abre o Sono com o aviso', async () => {
    renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar tummy time de Lia' }))

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Sono de Lia')
    expect(screen.getByText('Já há uma sessão de Sono em andamento.')).toBeTruthy()
  })

  it('o aviso some quando se chega à Sessão por "Ver sessão"', async () => {
    renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('link', { name: 'Ver sessão' }))

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Sono de Lia')
    expect(screen.queryByText(/Já há uma sessão/)).toBeNull()
  })

  it('sem sessão, o botão rápido começa uma sessão por Ana e abre a Sessão', async () => {
    renderizarRota('/app/hoje', { estadoInicial: { ...criarEstadoInicial(Date.now()), sessao: null } })
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mamada de Lia' }))

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Mamada de Lia')
    expect(screen.getByText(/por Ana$/)).toBeTruthy()
    expect(screen.queryByText(/Já há uma sessão/)).toBeNull()
  })

  // Nos testes que navegam o relógio é o real: a navegação do roteador é assíncrona e o
  // relógio falso travaria o findBy. A sessão de Bruno começou há 72 min e o clique vem
  // milissegundos depois, então a duração continua "1 h 12 min".
  it('"Encerrar" na Sessão volta ao Hoje com a confirmação', async () => {
    renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Hoje')
    expect(screen.getByRole('status').textContent).toContain('Sessão encerrada: 1 h 12 min')
  })

  it('"Encerrar e anotar" abre o campo Nota e "Salvar" encerra com nota', async () => {
    renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))
    const campo = screen.getByRole('textbox', { name: 'Nota' })
    expect(document.activeElement).toBe(campo)
    fireEvent.change(campo, { target: { value: 'Dormiu bem' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Hoje')
    expect(screen.getByRole('status').textContent).toContain('Sessão encerrada: 1 h 12 min, com nota')
    // O texto da nota não aparece em lugar nenhum.
    expect(document.body.textContent).not.toContain('Dormiu bem')
  })

  it('"Salvar" com o campo vazio encerra sem o "com nota"', async () => {
    renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar e anotar' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nota' }), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    const texto = screen.getByRole('status').textContent
    expect(texto).toContain('Sessão encerrada: 1 h 12 min')
    expect(texto).not.toContain('com nota')
  })

  it('"Cancelar" fecha o campo, mantém a sessão e devolve o foco', () => {
    renderizarRota('/app/sessao')
    const abrir = screen.getByRole('button', { name: 'Encerrar e anotar' })

    fireEvent.click(abrir)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('textbox', { name: 'Nota' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Lia')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Encerrar e anotar' }))
  })

  it('"Descartar" pergunta e "Manter" mantém a sessão', () => {
    renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.getByText('Descartar esta sessão?')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Manter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Manter' }))

    expect(screen.queryByText('Descartar esta sessão?')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Lia')
  })

  it('"Descartar" confirmado volta ao Hoje sem registro e sem confirmação', async () => {
    renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    const pergunta = screen.getByRole('group', { name: 'Descartar esta sessão?' })
    fireEvent.click(within(pergunta).getByRole('button', { name: 'Descartar' }))

    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    expect(screen.getByRole('status').textContent).toBe('')
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()
  })

  it('o StrictMode não começa duas sessões com ?tipo=', async () => {
    const roteador = createMemoryRouter(
      criarRotas({ ...criarEstadoInicial(Date.now()), sessao: null }),
      { initialEntries: ['/app/sessao?tipo=sono'] },
    )
    render(
      <StrictMode>
        <RouterProvider router={roteador} />
      </StrictMode>,
    )

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Sono de Lia')
    expect(screen.getAllByRole('timer')).toHaveLength(1)
    // O ?tipo= sai da URL depois de começar.
    await waitFor(() => expect(roteador.state.location.search).toBe(''))
  })

  it('encerrar uma sessão iniciada por ?tipo= não começa outra', async () => {
    const { roteador } = renderizarRota('/app/sessao?tipo=mamada', {
      estadoInicial: { ...criarEstadoInicial(Date.now()), sessao: null },
    })
    await screen.findByRole('heading', { name: 'Mamada de Lia' })

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))

    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    expect(roteador.state.location.pathname).toBe('/app/hoje')
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()
  })

  it('o estado fica só na memória: nada vai para o navegador', async () => {
    renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))

    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })
})

describe('madrugada', () => {
  it('o botão alterna aria-pressed e o data-tema do <html>', () => {
    renderizarRota('/app/hoje')
    const botao = screen.getByRole('button', { name: 'Modo madrugada' })
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)

    fireEvent.click(botao)
    expect(botao.getAttribute('aria-pressed')).toBe('true')
    expect(document.documentElement.getAttribute('data-tema')).toBe('madrugada')

    fireEvent.click(botao)
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)
  })

  it('o modo continua na Sessão e sai ao ir para o Início', async () => {
    const { roteador } = renderizarRota('/app/hoje')
    fireEvent.click(screen.getByRole('button', { name: 'Modo madrugada' }))

    fireEvent.click(screen.getByRole('link', { name: 'Ver sessão' }))
    await screen.findByRole('heading', { name: 'Sono de Lia' })
    expect(document.documentElement.getAttribute('data-tema')).toBe('madrugada')

    await act(async () => {
      await roteador.navigate('/')
    })
    await screen.findByRole('heading', { level: 1, name: /turno/ })
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)

    // O modo também desligou: ao voltar ao Hoje, o botão está solto.
    await act(async () => {
      await roteador.navigate('/app/hoje')
    })
    const botao = await screen.findByRole('button', { name: 'Modo madrugada' })
    expect(botao.getAttribute('aria-pressed')).toBe('false')
  })

  it('começar em madrugada põe o tema logo na primeira tela', () => {
    renderizarRota('/app/sessao', { estadoInicial: { ...criarEstadoInicial(Date.now()), madrugada: true } })

    expect(document.documentElement.getAttribute('data-tema')).toBe('madrugada')
  })
})
