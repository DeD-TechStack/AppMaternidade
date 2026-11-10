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

// A faixa "Últimos" tem 3 colunas: o tempo e a legenda de cada uma, na ordem de leitura
// ("50 min Fralda, tempo desde o registro", "agora Fralda").
function itensDeUltimos(): string[] {
  const secao = screen.getByRole('heading', { name: 'Últimos' }).closest('section')!
  return [...secao.querySelectorAll('.sb-numeros-item')].map((item) =>
    [...item.querySelectorAll('p')].map((p) => p.textContent).join(' '),
  )
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
    const gatilho = screen.getByRole('button', { name: 'Registrar fralda de Heloísa' })
    fireEvent.click(gatilho)
    return gatilho
  }

  it('escolher Xixi mostra a confirmação e põe "Fralda agora" em Últimos', () => {
    renderizarRota('/app/hoje')
    expect(itensDeUltimos()).toContain('50 min Fralda, tempo desde o registro')

    abrirFralda()
    fireEvent.click(screen.getByRole('button', { name: 'Xixi' }))

    expect(screen.getByRole('status').textContent).toContain('Fralda registrada: Xixi')
    expect(itensDeUltimos()).toContain('agora Fralda')
    expect(itensDeUltimos()).not.toContain('50 min Fralda, tempo desde o registro')
    expect(screen.queryByRole('button', { name: 'Xixi' })).toBeNull()
  })

  it('a escolha oferece Xixi, Cocô, Ambos e Cancelar', () => {
    renderizarRota('/app/hoje')
    abrirFralda()

    const grupo = screen.getByRole('group', { name: 'Fralda de Heloísa' })
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

    expect(itensDeUltimos()).toEqual([
      '2 h 10 Mamada, tempo desde o registro',
      '50 min Fralda, tempo desde o registro',
      '17:30 Tummy time, ontem',
    ])
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
    expect(itensDeUltimos()).toContain('agora Fralda')
  })

  it('Esc fecha a escolha e devolve o foco ao botão Fralda', () => {
    renderizarRota('/app/hoje')
    const gatilho = abrirFralda()
    expect(gatilho.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Xixi' }))

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(screen.queryByRole('group', { name: 'Fralda de Heloísa' })).toBeNull()
    expect(gatilho.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(gatilho)
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('"Cancelar" fecha a escolha, devolve o foco e não registra nada', () => {
    renderizarRota('/app/hoje')
    const gatilho = abrirFralda()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('group', { name: 'Fralda de Heloísa' })).toBeNull()
    expect(document.activeElement).toBe(gatilho)
    expect(itensDeUltimos()).toContain('50 min Fralda, tempo desde o registro')
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
    const grupo = screen.getByRole('group', { name: 'Outros registros de Heloísa' })
    // O Tummy time passou para dentro do Mais (a barra Registrar tem 4 botões): é o 1º da lista.
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Tummy time',
      'Mamadeira',
      'Alimentação sólida',
      'Observação',
    ])

    fireEvent.click(within(grupo).getByRole('button', { name: 'Mamadeira' }))
    expect(screen.getByRole('status').textContent).toContain('Mamadeira registrada')
    expect(itensDeUltimos()[0]).toBe('agora Mamadeira')

    fireEvent.click(mais)
    fireEvent.click(screen.getByRole('button', { name: 'Observação' }))
    expect(screen.getByRole('status').textContent).toContain('Observação registrada')
    expect(screen.getByRole('status').textContent).not.toContain('Mamadeira')
    expect(itensDeUltimos().slice(0, 2)).toEqual(['agora Observação', 'agora Mamadeira'])

    fireEvent.click(mais)
    fireEvent.click(screen.getByRole('button', { name: 'Alimentação sólida' }))
    expect(screen.getByRole('status').textContent).toContain('Alimentação sólida registrada')
  })

  it('os botões rápidos têm os nomes acessíveis pedidos', () => {
    renderizarRota('/app/hoje')

    const nomes: Array<[string, string]> = [
      ['Iniciar sono de Heloísa', 'Sono'],
      ['Iniciar mamada de Heloísa', 'Mamada'],
      ['Registrar fralda de Heloísa', 'Fralda'],
      ['Mais registros', 'Mais'],
    ]
    for (const [nome, visivel] of nomes) {
      expect(screen.getByRole('button', { name: nome }).textContent).toBe(visivel)
    }
    // O Tummy time mora no Mais e mantém o nome acessível de sempre.
    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    expect(screen.getByRole('button', { name: 'Iniciar tummy time de Heloísa' }).textContent).toBe('Tummy time')
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

    fireEvent.click(screen.getByRole('button', { name: 'Mais registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar tummy time de Heloísa' }))

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Sono de Heloísa')
    expect(screen.getByText('Já há uma sessão de Sono em andamento.')).toBeTruthy()
  })

  it('o aviso some quando se chega à Sessão por "Ver sessão"', async () => {
    renderizarRota('/app/hoje')

    fireEvent.click(screen.getByRole('link', { name: 'Ver sessão' }))

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Sono de Heloísa')
    expect(screen.queryByText(/Já há uma sessão/)).toBeNull()
  })

  it('sem sessão, o botão rápido começa uma sessão por Juliana e abre a Sessão', async () => {
    renderizarRota('/app/hoje', { estadoInicial: { ...criarEstadoInicial(Date.now()), sessao: null } })
    expect(screen.getByText('Nenhuma sessão em andamento.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mamada de Heloísa' }))

    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Mamada de Heloísa')
    expect(screen.getByText(/por Juliana$/)).toBeTruthy()
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
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Encerrar e anotar' }))
  })

  it('"Descartar" pergunta e "Manter" mantém a sessão', () => {
    renderizarRota('/app/sessao')

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.getByText('Descartar esta sessão?')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Manter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Manter' }))

    expect(screen.queryByText('Descartar esta sessão?')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sono de Heloísa')
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
    expect(titulo.textContent).toBe('Sono de Heloísa')
    expect(screen.getAllByRole('timer')).toHaveLength(1)
    // O ?tipo= sai da URL depois de começar.
    await waitFor(() => expect(roteador.state.location.search).toBe(''))
  })

  it('encerrar uma sessão iniciada por ?tipo= não começa outra', async () => {
    const { roteador } = renderizarRota('/app/sessao?tipo=mamada', {
      estadoInicial: { ...criarEstadoInicial(Date.now()), sessao: null },
    })
    await screen.findByRole('heading', { name: 'Mamada de Heloísa' })

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
    await screen.findByRole('heading', { name: 'Sono de Heloísa' })
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

// ---------------------------------------------------------------------------
// R3: toda ação que remove ou troca o controle que tem o foco leva o foco a um sucessor
// lógico e visível. A confirmação nunca recebe o foco.

const TABBABLE = 'a[href], button, textarea, input, select, [tabindex]'

/** Os controles que o Tab alcança, na ordem do DOM. */
function tabbables(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (e) => e.tabIndex >= 0 && !(e as HTMLButtonElement).disabled && e.closest('[inert]') === null,
  )
}

/** O primeiro controle que o Tab alcança depois de `atual`, na ordem do DOM. */
function proximoTabbable(atual: Element): HTMLElement | undefined {
  return tabbables().find(
    (e) => !atual.contains(e) && (atual.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
  )
}

/** O foco está num elemento da tela (nem body, nem a região de confirmação) e o Tab segue dali. */
function conferirFocoValido(container: HTMLElement) {
  const ativo = document.activeElement
  expect(ativo, 'activeElement').not.toBeNull()
  expect(ativo, 'o foco caiu no body').not.toBe(document.body)
  expect(container.contains(ativo), 'o foco saiu do documento renderizado').toBe(true)
  expect(ativo!.closest('[role="status"]'), 'o foco foi para a região de confirmação').toBeNull()
  const proximo = proximoTabbable(ativo!)
  expect(proximo, 'não há próximo controle focável').toBeDefined()
  expect(container.contains(proximo!)).toBe(true)
}

/** Foca o controle e o aciona, como Tab + Enter. */
function acionarComTeclado(controle: HTMLElement) {
  controle.focus()
  fireEvent.click(controle)
}

describe('R3: o foco acompanha ações que removem o controle focado', () => {
  for (const [tema, aplicar] of [
    ['claro', (e: EstadoPrototipo): EstadoPrototipo => e],
    ['madrugada', (e: EstadoPrototipo): EstadoPrototipo => ({ ...e, madrugada: true })],
  ] as const) {
    describe(tema, () => {
      const base = () => aplicar(criarEstadoInicial(Date.now()))
      const semSessao = () => ({ ...base(), sessao: null })
      const botao = (nome: string) => screen.getByRole('button', { name: nome })
      const cartao = (container: HTMLElement) => container.querySelector<HTMLElement>('main [data-andamento]')!

      it('Hoje: "Encerrar" leva o foco ao cartão "Em andamento"', () => {
        const { container } = renderizarRota('/app/hoje', { estadoInicial: base() })

        acionarComTeclado(botao('Encerrar'))

        expect(document.activeElement).toBe(cartao(container))
        expect(cartao(container).textContent).toContain('Nenhuma sessão em andamento.')
        conferirFocoValido(container)
      })

      it('Hoje: "Desfazer" depois de Encerrar leva o foco a "Iniciar sono de Heloísa"', () => {
        const { container } = renderizarRota('/app/hoje', { estadoInicial: base() })
        acionarComTeclado(botao('Encerrar'))

        acionarComTeclado(botao('Desfazer'))

        expect(document.activeElement).toBe(botao('Iniciar sono de Heloísa'))
        conferirFocoValido(container)
      })

      it('Hoje: "Desfazer" depois de Mamadeira leva o foco a "Iniciar sono de Heloísa"', () => {
        const { container } = renderizarRota('/app/hoje', { estadoInicial: base() })
        fireEvent.click(botao('Mais registros'))
        fireEvent.click(botao('Mamadeira'))

        acionarComTeclado(botao('Desfazer'))

        expect(document.activeElement).toBe(botao('Iniciar sono de Heloísa'))
        conferirFocoValido(container)
      })

      it('Hoje: "Desfazer" depois de Fralda leva o foco a "Iniciar sono de Heloísa"', () => {
        const { container } = renderizarRota('/app/hoje', { estadoInicial: base() })
        fireEvent.click(botao('Registrar fralda de Heloísa'))
        fireEvent.click(botao('Xixi'))

        acionarComTeclado(botao('Desfazer'))

        expect(document.activeElement).toBe(botao('Iniciar sono de Heloísa'))
        conferirFocoValido(container)
      })

      it('Hoje: "Fechar" depois de Mamadeira leva o foco a "Iniciar sono de Heloísa"', () => {
        const { container } = renderizarRota('/app/hoje', { estadoInicial: base() })
        fireEvent.click(botao('Mais registros'))
        fireEvent.click(botao('Mamadeira'))

        acionarComTeclado(botao('Fechar'))

        expect(document.activeElement).toBe(botao('Iniciar sono de Heloísa'))
        expect(screen.getByRole('status').textContent).toBe('')
        conferirFocoValido(container)
      })

      it('Hoje: Fralda → Xixi devolve o foco ao botão Fralda, e a região status não é focável', () => {
        const { container } = renderizarRota('/app/hoje', { estadoInicial: base() })
        expect(screen.getByRole('status').hasAttribute('tabindex')).toBe(false)

        fireEvent.click(botao('Registrar fralda de Heloísa'))
        fireEvent.click(botao('Xixi'))

        expect(document.activeElement).toBe(botao('Registrar fralda de Heloísa'))
        expect(screen.getByRole('status').hasAttribute('tabindex')).toBe(false)
        conferirFocoValido(container)
      })

      it('Sessão → "Encerrar" leva ao Hoje com o cartão focado', async () => {
        const { container } = renderizarRota('/app/sessao', { estadoInicial: base() })

        acionarComTeclado(botao('Encerrar'))

        await screen.findByRole('heading', { level: 1, name: 'Hoje' })
        await waitFor(() => expect(document.activeElement).toBe(cartao(container)))
        conferirFocoValido(container)
      })

      it('Sessão → "Salvar" com nota leva ao Hoje com o cartão focado', async () => {
        const { container } = renderizarRota('/app/sessao', { estadoInicial: base() })
        fireEvent.click(botao('Encerrar e anotar'))
        fireEvent.change(screen.getByRole('textbox', { name: 'Nota' }), { target: { value: 'Dormiu bem' } })

        acionarComTeclado(botao('Salvar'))

        await screen.findByRole('heading', { level: 1, name: 'Hoje' })
        await waitFor(() => expect(document.activeElement).toBe(cartao(container)))
        conferirFocoValido(container)
      })

      it('Sessão → "Salvar" sem nota leva ao Hoje com o cartão focado', async () => {
        const { container } = renderizarRota('/app/sessao', { estadoInicial: base() })
        fireEvent.click(botao('Encerrar e anotar'))

        acionarComTeclado(botao('Salvar'))

        await screen.findByRole('heading', { level: 1, name: 'Hoje' })
        await waitFor(() => expect(document.activeElement).toBe(cartao(container)))
        conferirFocoValido(container)
      })

      it('Sessão → "Descartar" e "Descartar" levam ao Hoje com o cartão focado', async () => {
        const { container } = renderizarRota('/app/sessao', { estadoInicial: base() })
        fireEvent.click(botao('Descartar'))

        acionarComTeclado(within(screen.getByRole('group', { name: 'Descartar esta sessão?' })).getByRole('button', { name: 'Descartar' }))

        await screen.findByRole('heading', { level: 1, name: 'Hoje' })
        await waitFor(() => expect(document.activeElement).toBe(cartao(container)))
        conferirFocoValido(container)
      })

      it('Hoje → atalho Sono sem sessão leva o foco ao h1 da Sessão', async () => {
        const { container } = renderizarRota('/app/hoje', { estadoInicial: semSessao() })

        acionarComTeclado(botao('Iniciar sono de Heloísa'))

        const titulo = await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
        await waitFor(() => expect(document.activeElement).toBe(titulo))
        conferirFocoValido(container)
      })

      it('Hoje → atalho com outra sessão em andamento leva o foco ao h1 da Sessão (com o aviso)', async () => {
        const { container } = renderizarRota('/app/hoje', { estadoInicial: base() })
        fireEvent.click(botao('Mais registros'))

        acionarComTeclado(botao('Iniciar tummy time de Heloísa'))

        const titulo = await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
        expect(screen.getByText('Já há uma sessão de Sono em andamento.')).toBeTruthy()
        await waitFor(() => expect(document.activeElement).toBe(titulo))
        conferirFocoValido(container)
      })

      it('Hoje → "Ver sessão" leva o foco ao h1 da Sessão', async () => {
        const { container } = renderizarRota('/app/hoje', { estadoInicial: base() })
        const ver = screen.getByRole('link', { name: 'Ver sessão' })
        ver.focus()

        fireEvent.click(ver)

        const titulo = await screen.findByRole('heading', { level: 1, name: 'Sono de Heloísa' })
        await waitFor(() => expect(document.activeElement).toBe(titulo))
        conferirFocoValido(container)
      })

      it('Sessão vazia → "Voltar para Hoje" leva o foco ao h1 "Hoje"', async () => {
        const { container } = renderizarRota('/app/sessao', { estadoInicial: semSessao() })

        const voltar = screen.getByRole('link', { name: 'Voltar para Hoje' })
        voltar.focus()
        fireEvent.click(voltar)

        const titulo = await screen.findByRole('heading', { level: 1, name: 'Hoje' })
        await waitFor(() => expect(document.activeElement).toBe(titulo))
        conferirFocoValido(container)
      })

      it('Sessão → item Hoje da navegação leva o foco ao h1 "Hoje"', async () => {
        const { container } = renderizarRota('/app/sessao', { estadoInicial: base() })
        const nav = screen.getByRole('navigation', { name: 'Principal' })
        const hoje = within(nav).getByRole('link', { name: 'Hoje' })
        hoje.focus()

        fireEvent.click(hoje)

        const titulo = await screen.findByRole('heading', { level: 1, name: 'Hoje' })
        await waitFor(() => expect(document.activeElement).toBe(titulo))
        conferirFocoValido(container)
      })

      it('carregar a URL direto não move o foco (Hoje, Sessão e Sessão vazia)', () => {
        for (const [caminho, estado] of [
          ['/app/hoje', base()],
          ['/app/sessao', base()],
          ['/app/sessao', semSessao()],
        ] as const) {
          const { unmount } = renderizarRota(caminho, { estadoInicial: estado })
          expect(document.activeElement, caminho).toBe(document.body)
          unmount()
        }
      })
    })
  }
})
