import { createRef } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BarraRegistrar } from './componentes/registro/BarraRegistrar.tsx'

// A barra Registrar de 1 toque (EMENDAS E1): 4 botões numa barra fixa, com o painel (confirmação,
// escolha de fralda, lista do Mais) acima dela. O jsdom não mede layout: aqui vale o DOM e o
// comportamento; a geometria (64 px, x, larguras iguais) é do medidor e do CSS.

const NOMES = ['Iniciar sono de Heloísa', 'Iniciar mamada de Heloísa', 'Registrar fralda de Heloísa', 'Mais registros']

function montar(sobrescritas: Partial<Parameters<typeof BarraRegistrar>[0]> = {}) {
  const aoIniciarSessao = vi.fn()
  const aoRegistrarFralda = vi.fn()
  const aoRegistrarMais = vi.fn()
  const aoDesfazer = vi.fn()
  const aoFechar = vi.fn()
  const refSono = createRef<HTMLButtonElement>()
  const resultado = render(
    <BarraRegistrar
      aoIniciarSessao={aoIniciarSessao}
      aoRegistrarFralda={aoRegistrarFralda}
      aoRegistrarMais={aoRegistrarMais}
      refSono={refSono}
      texto={null}
      aoDesfazer={aoDesfazer}
      aoFechar={aoFechar}
      {...sobrescritas}
    />,
  )
  const barra = resultado.container.querySelector<HTMLElement>('[data-barra-registrar]')!
  return { ...resultado, barra, aoIniciarSessao, aoRegistrarFralda, aoRegistrarMais, aoDesfazer, aoFechar, refSono }
}

const botao = (nome: string) => screen.getByRole('button', { name: nome })

describe('BarraRegistrar: a barra e os 4 botões', () => {
  it('é um elemento fixo com data-barra-registrar e as classes registro-rapido, barra-registrar e barra-fixa', () => {
    const { barra, container } = montar()

    expect(container.querySelectorAll('[data-barra-registrar]')).toHaveLength(1)
    expect(barra).not.toBeNull()
    for (const classe of ['registro-rapido', 'barra-registrar', 'barra-fixa']) expect(barra.classList.contains(classe), classe).toBe(true)
  })

  it('tem exatamente 4 botões na fileira, Sono, Mamada, Fralda e Mais, com os nomes acessíveis de sempre', () => {
    const { barra } = montar()

    const fileira = barra.querySelector('[data-fileira]')!
    const botoes = [...fileira.querySelectorAll<HTMLButtonElement>(':scope > button')]
    expect(botoes.map((b) => b.textContent)).toEqual(['Sono', 'Mamada', 'Fralda', 'Mais'])
    expect(botoes.map((b) => b.getAttribute('aria-label'))).toEqual(NOMES)
    for (const nome of NOMES) expect(botao(nome)).toBeTruthy()
    expect(fileira.querySelectorAll('button')).toHaveLength(4)
    expect(botoes.every((b) => b.type === 'button')).toBe(true)
  })

  it('cada botão é um alvo de toque do sistema (classe alvo-toque) e nenhum leva ícone', () => {
    const { barra } = montar()

    for (const b of barra.querySelectorAll('[data-fileira] > button')) {
      expect(b.classList.contains('alvo-toque'), b.outerHTML).toBe(true)
      expect(b.querySelector('svg'), b.outerHTML).toBeNull()
    }
  })

  it('o texto de cada botão fica dentro de um <span>, sem texto solto ao lado de elemento aria-hidden', () => {
    const { barra } = montar()

    for (const b of barra.querySelectorAll('[data-fileira] > button')) {
      expect([...b.childNodes].filter((no) => no.nodeType === Node.TEXT_NODE && (no.textContent ?? '').trim() !== '')).toEqual([])
    }
  })

  it('o botão Sono recebe o refSono (o Hoje leva o foco a ele)', () => {
    const { refSono } = montar()

    expect(refSono.current).toBe(botao('Iniciar sono de Heloísa'))
  })

  it('Sono e Mamada iniciam a sessão com o tipo certo, na hora', () => {
    const { aoIniciarSessao } = montar()

    fireEvent.click(botao('Iniciar sono de Heloísa'))
    expect(aoIniciarSessao).toHaveBeenLastCalledWith('sono')
    fireEvent.click(botao('Iniciar mamada de Heloísa'))
    expect(aoIniciarSessao).toHaveBeenLastCalledWith('mamada')
    expect(aoIniciarSessao).toHaveBeenCalledTimes(2)
  })

  it('sem painel aberto e sem confirmação, não há grupo na tela', () => {
    montar()

    expect(screen.queryAllByRole('group')).toEqual([])
  })
})

describe('BarraRegistrar: Fralda', () => {
  it('abre o grupo "Fralda de Heloísa" com Xixi, Cocô, Ambos e Cancelar, e leva o foco ao primeiro', () => {
    montar()
    const gatilho = botao('Registrar fralda de Heloísa')

    fireEvent.click(gatilho)

    const grupo = screen.getByRole('group', { name: 'Fralda de Heloísa' })
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual(['Xixi', 'Cocô', 'Ambos', 'Cancelar'])
    expect(document.activeElement).toBe(within(grupo).getByRole('button', { name: 'Xixi' }))
  })

  it('a escolha chama aoRegistrarFralda, fecha o painel e devolve o foco ao botão Fralda', () => {
    const { aoRegistrarFralda } = montar()
    const gatilho = botao('Registrar fralda de Heloísa')
    fireEvent.click(gatilho)

    fireEvent.click(botao('Cocô'))

    expect(aoRegistrarFralda).toHaveBeenCalledTimes(1)
    expect(aoRegistrarFralda).toHaveBeenCalledWith('Cocô')
    expect(screen.queryByRole('group', { name: 'Fralda de Heloísa' })).toBeNull()
    expect(gatilho.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(gatilho)
  })

  it('cada uma das três escolhas chama aoRegistrarFralda com o próprio nome', () => {
    const { aoRegistrarFralda } = montar()

    for (const escolha of ['Xixi', 'Cocô', 'Ambos']) {
      fireEvent.click(botao('Registrar fralda de Heloísa'))
      fireEvent.click(botao(escolha))
      expect(aoRegistrarFralda).toHaveBeenLastCalledWith(escolha)
    }
    expect(aoRegistrarFralda).toHaveBeenCalledTimes(3)
  })

  it('Cancelar fecha, devolve o foco e não registra nada', () => {
    const { aoRegistrarFralda } = montar()
    const gatilho = botao('Registrar fralda de Heloísa')
    fireEvent.click(gatilho)

    fireEvent.click(botao('Cancelar'))

    expect(screen.queryByRole('group', { name: 'Fralda de Heloísa' })).toBeNull()
    expect(document.activeElement).toBe(gatilho)
    expect(aoRegistrarFralda).not.toHaveBeenCalled()
  })

  it('um segundo toque no Fralda fecha o painel', () => {
    montar()
    const gatilho = botao('Registrar fralda de Heloísa')

    fireEvent.click(gatilho)
    fireEvent.click(gatilho)

    expect(screen.queryByRole('group', { name: 'Fralda de Heloísa' })).toBeNull()
    expect(gatilho.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('BarraRegistrar: Mais', () => {
  it('abre o grupo "Outros registros de Heloísa" com Tummy time, Mamadeira, Alimentação sólida e Observação', () => {
    montar()

    fireEvent.click(botao('Mais registros'))

    const grupo = screen.getByRole('group', { name: 'Outros registros de Heloísa' })
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Tummy time',
      'Mamadeira',
      'Alimentação sólida',
      'Observação',
    ])
  })

  it('Tummy time inicia a sessão (aoIniciarSessao("tummy")), fecha o painel e não registra nada', () => {
    const { aoIniciarSessao, aoRegistrarMais } = montar()
    fireEvent.click(botao('Mais registros'))

    fireEvent.click(botao('Iniciar tummy time de Heloísa'))

    expect(aoIniciarSessao).toHaveBeenCalledTimes(1)
    expect(aoIniciarSessao).toHaveBeenCalledWith('tummy')
    expect(aoRegistrarMais).not.toHaveBeenCalled()
    expect(screen.queryByRole('group', { name: 'Outros registros de Heloísa' })).toBeNull()
  })

  it('os outros três itens chamam aoRegistrarMais com o item, devolvem o foco ao Mais e fecham', () => {
    const { aoRegistrarMais, aoIniciarSessao } = montar()
    const gatilho = botao('Mais registros')

    for (const [rotulo, chave] of [
      ['Mamadeira', 'mamadeira'],
      ['Alimentação sólida', 'solido'],
      ['Observação', 'observacao'],
    ] as const) {
      fireEvent.click(gatilho)
      fireEvent.click(screen.getByRole('button', { name: rotulo }))
      expect(aoRegistrarMais).toHaveBeenLastCalledWith({ chave, rotulo })
      expect(screen.queryByRole('group', { name: 'Outros registros de Heloísa' })).toBeNull()
      expect(document.activeElement).toBe(gatilho)
    }
    expect(aoRegistrarMais).toHaveBeenCalledTimes(3)
    expect(aoIniciarSessao).not.toHaveBeenCalled()
  })

  it('o botão do Mais não leva ícone nem o sinal "+": o texto é só "Mais"', () => {
    montar()

    expect(botao('Mais registros').textContent).toBe('Mais')
  })
})

describe('BarraRegistrar: teclado e estado dos painéis', () => {
  it('Esc fecha a escolha de fralda e devolve o foco ao botão que abriu', () => {
    montar()
    const gatilho = botao('Registrar fralda de Heloísa')
    fireEvent.click(gatilho)
    expect(document.activeElement).not.toBe(gatilho)

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(screen.queryByRole('group', { name: 'Fralda de Heloísa' })).toBeNull()
    expect(document.activeElement).toBe(gatilho)
  })

  it('Esc fecha a lista do Mais e devolve o foco ao botão Mais', () => {
    montar()
    const gatilho = botao('Mais registros')
    fireEvent.click(gatilho)

    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(screen.queryByRole('group', { name: 'Outros registros de Heloísa' })).toBeNull()
    expect(document.activeElement).toBe(gatilho)
  })

  it('outra tecla não fecha nada, e o Esc sem painel aberto não mexe no foco', () => {
    montar()
    fireEvent.click(botao('Mais registros'))
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(screen.getByRole('group', { name: 'Outros registros de Heloísa' })).toBeTruthy()
    fireEvent.keyDown(document.body, { key: 'Escape' })

    const sono = botao('Iniciar sono de Heloísa')
    sono.focus()
    fireEvent.keyDown(sono, { key: 'Escape' })
    expect(document.activeElement).toBe(sono)
  })

  it('aria-expanded acompanha o painel e aria-controls aponta para o grupo aberto', () => {
    montar()
    const fralda = botao('Registrar fralda de Heloísa')
    const mais = botao('Mais registros')
    expect([fralda, mais].map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'false'])
    expect(fralda.hasAttribute('aria-controls')).toBe(false)

    fireEvent.click(fralda)
    expect(fralda.getAttribute('aria-expanded')).toBe('true')
    expect(mais.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById(fralda.getAttribute('aria-controls')!)).toBe(screen.getByRole('group', { name: 'Fralda de Heloísa' }))

    fireEvent.click(mais)
    expect(fralda.getAttribute('aria-expanded')).toBe('false')
    expect(mais.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(mais.getAttribute('aria-controls')!)).toBe(screen.getByRole('group', { name: 'Outros registros de Heloísa' }))
  })

  it('só um painel fica aberto por vez, nos dois sentidos', () => {
    montar()

    fireEvent.click(botao('Registrar fralda de Heloísa'))
    fireEvent.click(botao('Mais registros'))
    expect(screen.queryByRole('group', { name: 'Fralda de Heloísa' })).toBeNull()
    expect(screen.getAllByRole('group')).toHaveLength(1)

    fireEvent.click(botao('Registrar fralda de Heloísa'))
    expect(screen.queryByRole('group', { name: 'Outros registros de Heloísa' })).toBeNull()
    expect(screen.getAllByRole('group')).toHaveLength(1)
  })

  it('iniciar uma sessão fecha o painel que estiver aberto', () => {
    montar()
    fireEvent.click(botao('Mais registros'))

    fireEvent.click(botao('Iniciar sono de Heloísa'))

    expect(screen.queryAllByRole('group')).toEqual([])
  })
})

describe('BarraRegistrar: a confirmação', () => {
  it('a região role="status" é única e existe vazia, dentro da barra', () => {
    const { barra } = montar()

    const regioes = screen.getAllByRole('status')
    expect(regioes).toHaveLength(1)
    expect(regioes[0].textContent).toBe('')
    expect(barra.contains(regioes[0])).toBe(true)
    expect(regioes[0].hasAttribute('tabindex')).toBe(false)
  })

  it('com texto, a mesma região mostra a frase, Desfazer e Fechar, e continua única', () => {
    const { aoDesfazer, aoFechar, barra } = montar({ texto: 'Fralda registrada: Xixi' })

    const regioes = screen.getAllByRole('status')
    expect(regioes).toHaveLength(1)
    expect(regioes[0].textContent).toContain('Fralda registrada: Xixi')
    expect(barra.contains(regioes[0])).toBe(true)
    fireEvent.click(within(regioes[0]).getByRole('button', { name: 'Desfazer' }))
    expect(aoDesfazer).toHaveBeenCalledTimes(1)
    fireEvent.click(within(regioes[0]).getByRole('button', { name: 'Fechar' }))
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('a confirmação nunca recebe o foco', () => {
    const { rerender, container, ...resto } = montar()
    const sono = botao('Iniciar sono de Heloísa')
    sono.focus()

    rerender(
      <BarraRegistrar
        aoIniciarSessao={resto.aoIniciarSessao}
        aoRegistrarFralda={resto.aoRegistrarFralda}
        aoRegistrarMais={resto.aoRegistrarMais}
        refSono={resto.refSono}
        texto="Mamadeira registrada"
        aoDesfazer={resto.aoDesfazer}
        aoFechar={resto.aoFechar}
      />,
    )

    expect(document.activeElement).toBe(sono)
    expect(container.querySelector('[role="status"]')!.contains(document.activeElement)).toBe(false)
  })

  it('o painel e a confirmação ficam num painel flutuante dentro do elemento fixo, antes da fileira', () => {
    const { barra } = montar({ texto: 'Observação registrada' })
    fireEvent.click(botao('Mais registros'))

    const painel = barra.querySelector('[data-painel]')!
    const fileira = barra.querySelector('[data-fileira]')!
    expect(painel.parentElement).toBe(barra)
    expect(painel.contains(screen.getByRole('status'))).toBe(true)
    expect(painel.contains(screen.getByRole('group', { name: 'Outros registros de Heloísa' }))).toBe(true)
    expect(fileira.parentElement).toBe(barra)
    expect(painel.compareDocumentPosition(fileira) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(painel.contains(fileira)).toBe(false)
  })

  it('o painel marca quando há algo para mostrar (data-aberto): vazio, sem texto e sem grupo, não marca', () => {
    const vazio = montar()
    expect(vazio.barra.querySelector('[data-painel]')!.hasAttribute('data-aberto')).toBe(false)
    vazio.unmount()

    const comTexto = montar({ texto: 'Fralda registrada: Ambos' })
    expect(comTexto.barra.querySelector('[data-painel]')!.hasAttribute('data-aberto')).toBe(true)
    comTexto.unmount()

    const comGrupo = montar()
    fireEvent.click(botao('Registrar fralda de Heloísa'))
    expect(comGrupo.barra.querySelector('[data-painel]')!.hasAttribute('data-aberto')).toBe(true)
  })

  it('os botões do painel (Desfazer, Fechar, escolhas) são alvos de toque do sistema', () => {
    const { barra } = montar({ texto: 'Fralda registrada: Xixi' })
    fireEvent.click(botao('Mais registros'))

    const doPainel = [...barra.querySelectorAll('[data-painel] button')]
    expect(doPainel.length).toBeGreaterThanOrEqual(6)
    for (const b of doPainel) expect(b.classList.contains('alvo-toque'), b.outerHTML).toBe(true)
  })
})

describe('BarraRegistrar: fixa ou no fluxo (useBarraFixa)', () => {
  const alturaOriginal = window.innerHeight

  function definirAltura(valor: number) {
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: valor })
  }

  it('numa janela de 40 rem ou mais de altura fica fixa; com menos, volta ao fluxo, e a reserva de rolagem acompanha', () => {
    document.documentElement.style.setProperty('font-size', '16px')
    definirAltura(844)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ width: 390, height: 64, top: 0, left: 0, right: 390, bottom: 64, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
    )
    const { barra } = montar()
    try {
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })
      expect(barra.classList.contains('barra-fixa')).toBe(true)
      expect(document.documentElement.style.getPropertyValue('scroll-padding-bottom')).toBe('72px')

      definirAltura(400)
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })
      expect(barra.classList.contains('barra-fixa')).toBe(false)
      expect(barra.classList.contains('barra-registrar')).toBe(true)
      expect(barra.hasAttribute('data-barra-registrar')).toBe(true)
      expect(document.documentElement.style.getPropertyValue('scroll-padding-bottom')).toBe('')
    } finally {
      definirAltura(alturaOriginal)
      document.documentElement.style.removeProperty('font-size')
    }
  })
})
