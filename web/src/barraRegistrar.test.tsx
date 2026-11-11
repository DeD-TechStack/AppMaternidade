import { createRef } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarraRegistrar } from './componentes/registro/BarraRegistrar.tsx'

// A barra Registrar de 1 toque (EMENDAS E1, redesenho do Campo de mel): 4 botões de 56 px com ícone numa
// barra fixa, com o cartão flutuante (confirmação, escolha de fralda, lista do Mais) acima dela. O jsdom
// não mede layout: aqui vale o DOM e o comportamento; a geometria é das capturas.

const NOMES = ['Iniciar sono de Heloísa', 'Iniciar mamada de Heloísa', 'Registrar fralda de Heloísa', 'Mais registros']

function montar(sobrescritas: Partial<Parameters<typeof BarraRegistrar>[0]> = {}) {
  const aoIniciarSessao = vi.fn()
  const aoRegistrarFralda = vi.fn()
  const aoAjustarFralda = vi.fn()
  const aoRegistrarMais = vi.fn()
  const aoDesfazer = vi.fn()
  const aoFechar = vi.fn()
  const refSono = createRef<HTMLButtonElement>()
  const resultado = render(
    <BarraRegistrar
      aoIniciarSessao={aoIniciarSessao}
      aoRegistrarFralda={aoRegistrarFralda}
      aoAjustarFralda={aoAjustarFralda}
      aoRegistrarMais={aoRegistrarMais}
      refSono={refSono}
      texto={null}
      aoDesfazer={aoDesfazer}
      aoFechar={aoFechar}
      {...sobrescritas}
    />,
  )
  const barra = resultado.container.querySelector<HTMLElement>('[data-barra-registrar]')!
  return {
    ...resultado,
    barra,
    aoIniciarSessao,
    aoRegistrarFralda,
    aoAjustarFralda,
    aoRegistrarMais,
    aoDesfazer,
    aoFechar,
    refSono,
  }
}

const TIPOS = ['Xixi', 'Cocô', 'Ambos']

const botao = (nome: string) => screen.getByRole('button', { name: nome })

describe('BarraRegistrar: a barra e os 4 botões', () => {
  it('é um elemento fixo com data-barra-registrar e as classes registro-rapido e barra-fixa (a captura a solta por barra-fixa)', () => {
    const { barra, container } = montar()

    expect(container.querySelectorAll('[data-barra-registrar]')).toHaveLength(1)
    expect(barra).not.toBeNull()
    for (const classe of ['registro-rapido', 'barra-fixa', 'fixed']) expect(barra.classList.contains(classe), classe).toBe(true)
    // O redesenho saiu das classes antigas da barra.
    expect([...barra.querySelectorAll('[class]'), barra].flatMap((e) => [...e.classList]).filter((c) => /^ha-|^barra-registrar$/.test(c))).toEqual([])
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

  it('cada botão é um alvo de toque do sistema (alvo-toque), de 56 px (h-14), com um ícone lucide escondido do leitor de tela', () => {
    const { barra } = montar()

    const icones: string[] = []
    for (const b of barra.querySelectorAll('[data-fileira] > button')) {
      expect(b.classList.contains('alvo-toque'), b.outerHTML).toBe(true)
      expect(b.classList.contains('h-14'), b.outerHTML).toBe(true)
      const svg = b.querySelector('svg')!
      expect(svg.getAttribute('aria-hidden')).toBe('true')
      icones.push([...svg.classList].find((c) => c.startsWith('lucide-'))!)
    }
    expect(icones).toEqual(['lucide-moon', 'lucide-milk', 'lucide-droplets', 'lucide-ellipsis'])
  })

  it('o botão da sessão em andamento fica em mel (data-ativo); sem sessão, nenhum', () => {
    const ativo = montar({ sessaoAtiva: 'mamada' })
    expect(botao('Iniciar mamada de Heloísa').hasAttribute('data-ativo')).toBe(true)
    expect(botao('Iniciar mamada de Heloísa').classList.contains('bg-mel')).toBe(true)
    expect(botao('Iniciar sono de Heloísa').hasAttribute('data-ativo')).toBe(false)
    ativo.unmount()

    const { barra } = montar()
    expect(barra.querySelectorAll('[data-ativo]')).toHaveLength(0)
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

// E5 (VOLTA1): Fralda com 1 toque. O toque registra na hora; a confirmação (com Desfazer e Fechar) traz
// a escolha opcional do tipo, que só ajusta o texto do registro já feito.
describe('BarraRegistrar: Fralda com 1 toque (E5)', () => {
  it('(a) um clique em "Registrar fralda de Heloísa" chama o registro uma vez, sem tipo e sem painel de escolha', () => {
    const { aoRegistrarFralda, aoAjustarFralda } = montar()

    fireEvent.click(botao('Registrar fralda de Heloísa'))

    expect(aoRegistrarFralda).toHaveBeenCalledTimes(1)
    expect(aoRegistrarFralda).toHaveBeenCalledWith()
    expect(aoAjustarFralda).not.toHaveBeenCalled()
    expect(screen.queryByRole('group', { name: 'Fralda de Heloísa' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull()
    for (const tipo of TIPOS) expect(screen.queryByRole('button', { name: tipo })).toBeNull()
  })

  it('(a) cada clique é um registro: três cliques, três chamadas', () => {
    const { aoRegistrarFralda } = montar()

    for (let i = 0; i < 3; i++) fireEvent.click(botao('Registrar fralda de Heloísa'))

    expect(aoRegistrarFralda).toHaveBeenCalledTimes(3)
  })

  it('o botão Fralda age na hora: não abre nada, então não leva aria-expanded nem aria-controls', () => {
    montar()
    const fralda = botao('Registrar fralda de Heloísa')

    fireEvent.click(fralda)

    expect(fralda.hasAttribute('aria-expanded')).toBe(false)
    expect(fralda.hasAttribute('aria-controls')).toBe(false)
  })

  it('(b) a confirmação da fralda mostra Desfazer, Fechar e as 3 escolhas de tipo, nesta ordem', () => {
    montar({ texto: 'Fralda registrada' })

    const status = screen.getByRole('status')
    expect(within(status).getAllByRole('button').map((b) => b.textContent)).toEqual(['Desfazer', 'Fechar', ...TIPOS])
    const grupo = within(status).getByRole('group', { name: 'Tipo da fralda' })
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual(TIPOS)
    expect(grupo.hasAttribute('data-largos')).toBe(false)
  })

  it('(b) com o tipo já escolhido ("Fralda registrada: Xixi") as escolhas continuam na tela', () => {
    montar({ texto: 'Fralda registrada: Xixi' })

    const grupo = screen.getByRole('group', { name: 'Tipo da fralda' })
    expect(within(grupo).getAllByRole('button').map((b) => b.textContent)).toEqual(TIPOS)
  })

  it('(b) as escolhas são alvos de toque do sistema (alvo-toque) e pílulas de contorno', () => {
    montar({ texto: 'Fralda registrada' })

    for (const tipo of TIPOS) {
      const b = botao(tipo)
      expect(b.classList.contains('alvo-toque'), b.outerHTML).toBe(true)
      expect(b.classList.contains('cm-botao-contorno'), b.outerHTML).toBe(true)
      expect(b.getAttribute('type')).toBe('button')
    }
  })

  it('só a confirmação da fralda traz as escolhas: Mamadeira, sessão encerrada e sem texto, não', () => {
    const { rerender, container, ...resto } = montar({ texto: 'Mamadeira registrada' })
    expect(screen.queryByRole('group', { name: 'Tipo da fralda' })).toBeNull()
    for (const tipo of TIPOS) expect(screen.queryByRole('button', { name: tipo })).toBeNull()
    expect(within(screen.getByRole('status')).getAllByRole('button').map((b) => b.textContent)).toEqual(['Desfazer', 'Fechar'])

    for (const texto of ['Sessão encerrada: 1 h 12 min', null]) {
      rerender(
        <BarraRegistrar
          aoIniciarSessao={resto.aoIniciarSessao}
          aoRegistrarFralda={resto.aoRegistrarFralda}
          aoAjustarFralda={resto.aoAjustarFralda}
          aoRegistrarMais={resto.aoRegistrarMais}
          refSono={resto.refSono}
          texto={texto}
          aoDesfazer={resto.aoDesfazer}
          aoFechar={resto.aoFechar}
        />,
      )
      expect(screen.queryByRole('group', { name: 'Tipo da fralda' }), String(texto)).toBeNull()
    }
    expect(container.querySelector('[role="status"]')).not.toBeNull()
  })

  it('(e) o role="status" continua único e no DOM, vazio ou com a confirmação da fralda e as escolhas', () => {
    const vazio = montar()
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status').textContent).toBe('')
    vazio.unmount()

    const { barra } = montar({ texto: 'Fralda registrada: Xixi' })
    const regioes = screen.getAllByRole('status')
    expect(regioes).toHaveLength(1)
    expect(barra.querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(regioes[0].textContent).toContain('Fralda registrada: Xixi')
    expect(regioes[0].contains(screen.getByRole('group', { name: 'Tipo da fralda' }))).toBe(true)
    expect(regioes[0].hasAttribute('tabindex')).toBe(false)
  })

  it('(c) escolher Xixi chama aoAjustarFralda("Xixi") uma vez e não chama o registro de novo', () => {
    const { aoRegistrarFralda, aoAjustarFralda } = montar({ texto: 'Fralda registrada' })

    fireEvent.click(botao('Xixi'))

    expect(aoAjustarFralda).toHaveBeenCalledTimes(1)
    expect(aoAjustarFralda).toHaveBeenCalledWith('Xixi')
    expect(aoRegistrarFralda).not.toHaveBeenCalled()
  })

  it('(c) cada uma das três escolhas ajusta com o próprio nome, e nenhuma registra', () => {
    const { aoRegistrarFralda, aoAjustarFralda } = montar({ texto: 'Fralda registrada' })

    for (const tipo of TIPOS) {
      fireEvent.click(botao(tipo))
      expect(aoAjustarFralda).toHaveBeenLastCalledWith(tipo)
    }
    expect(aoAjustarFralda).toHaveBeenCalledTimes(3)
    expect(aoRegistrarFralda).not.toHaveBeenCalled()
  })

  it('(c) a escolha vigente aparece marcada (aria-pressed e data-ligado) e as outras não', () => {
    montar({ texto: 'Fralda registrada: Cocô' })

    expect(TIPOS.map((tipo) => botao(tipo).getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false'])
    expect(TIPOS.map((tipo) => botao(tipo).hasAttribute('data-ligado'))).toEqual([false, true, false])
  })

  it('sem tipo escolhido nenhuma escolha está marcada', () => {
    montar({ texto: 'Fralda registrada' })

    expect(TIPOS.map((tipo) => botao(tipo).getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false'])
    expect(TIPOS.map((tipo) => botao(tipo).hasAttribute('data-ligado'))).toEqual([false, false, false])
  })

  it('escolher o tipo não tira Desfazer nem Fechar, e os dois chamam o que a página deu', () => {
    const { aoDesfazer, aoFechar } = montar({ texto: 'Fralda registrada: Xixi' })

    fireEvent.click(botao('Desfazer'))
    fireEvent.click(botao('Fechar'))

    expect(aoDesfazer).toHaveBeenCalledTimes(1)
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('(f) Esc fecha a confirmação da fralda (aoFechar) e devolve o foco ao botão Fralda', () => {
    const { aoFechar } = montar({ texto: 'Fralda registrada' })
    const fralda = botao('Registrar fralda de Heloísa')
    const xixi = botao('Xixi')
    xixi.focus()
    expect(document.activeElement).toBe(xixi)

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(aoFechar).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(fralda)
  })

  it('(f) Esc com o foco em outro botão da barra também leva o foco ao Fralda', () => {
    const { aoFechar } = montar({ texto: 'Fralda registrada: Ambos' })
    botao('Iniciar mamada de Heloísa').focus()

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(aoFechar).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(botao('Registrar fralda de Heloísa'))
  })

  it('(f) com o painel Mais aberto por cima, o primeiro Esc fecha o Mais (foco no Mais) e o segundo fecha a confirmação (foco no Fralda)', () => {
    const { aoFechar } = montar({ texto: 'Fralda registrada' })
    const mais = botao('Mais registros')
    fireEvent.click(mais)

    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Outros registros de Heloísa' })).toBeNull()
    expect(document.activeElement).toBe(mais)
    expect(aoFechar).not.toHaveBeenCalled()

    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(aoFechar).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(botao('Registrar fralda de Heloísa'))
  })

  it('(f) Esc não fecha uma confirmação que não é da fralda, nem mexe no foco', () => {
    const { aoFechar } = montar({ texto: 'Mamadeira registrada' })
    const sono = botao('Iniciar sono de Heloísa')
    sono.focus()

    fireEvent.keyDown(sono, { key: 'Escape' })

    expect(aoFechar).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(sono)
  })

  it('(f) Esc sem confirmação e sem painel não chama nada', () => {
    const { aoFechar } = montar()
    const sono = botao('Iniciar sono de Heloísa')
    sono.focus()

    fireEvent.keyDown(sono, { key: 'Escape' })

    expect(aoFechar).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(sono)
  })

  it('tocar em Fralda com o painel Mais aberto fecha o Mais e registra', () => {
    const { aoRegistrarFralda } = montar()
    fireEvent.click(botao('Mais registros'))
    expect(screen.getByRole('group', { name: 'Outros registros de Heloísa' })).toBeTruthy()

    fireEvent.click(botao('Registrar fralda de Heloísa'))

    expect(screen.queryByRole('group', { name: 'Outros registros de Heloísa' })).toBeNull()
    expect(botao('Mais registros').getAttribute('aria-expanded')).toBe('false')
    expect(aoRegistrarFralda).toHaveBeenCalledTimes(1)
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

  it('aria-expanded acompanha o painel do Mais e aria-controls aponta para o grupo aberto', () => {
    montar()
    const mais = botao('Mais registros')
    expect(mais.getAttribute('aria-expanded')).toBe('false')
    expect(mais.hasAttribute('aria-controls')).toBe(false)

    fireEvent.click(mais)
    expect(mais.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(mais.getAttribute('aria-controls')!)).toBe(screen.getByRole('group', { name: 'Outros registros de Heloísa' }))

    fireEvent.click(mais)
    expect(mais.getAttribute('aria-expanded')).toBe('false')
    expect(mais.hasAttribute('aria-controls')).toBe(false)
  })

  it('o painel do Mais é o único painel aberto pela barra: um segundo toque fecha, e Fralda não abre outro', () => {
    montar()

    fireEvent.click(botao('Mais registros'))
    expect(screen.getAllByRole('group')).toHaveLength(1)

    fireEvent.click(botao('Registrar fralda de Heloísa'))
    expect(screen.queryAllByRole('group')).toEqual([])

    fireEvent.click(botao('Mais registros'))
    fireEvent.click(botao('Mais registros'))
    expect(screen.queryAllByRole('group')).toEqual([])
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
        aoAjustarFralda={resto.aoAjustarFralda}
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

  it('o painel e a confirmação ficam num cartão flutuante dentro do elemento fixo, depois da fileira no DOM (o Tab chega a eles)', () => {
    const { barra } = montar({ texto: 'Observação registrada' })
    fireEvent.click(botao('Mais registros'))

    const painel = barra.querySelector<HTMLElement>('[data-painel]')!
    const fileira = barra.querySelector('[data-fileira]')!
    // Os dois são irmãos dentro do miolo posicionado: o painel flutua acima da fileira mesmo quando a
    // captura de página inteira solta a barra (`.barra-fixa { position: static }`).
    expect(painel.parentElement).toBe(fileira.parentElement)
    expect(painel.parentElement!.classList.contains('relative')).toBe(true)
    expect(barra.contains(painel)).toBe(true)
    expect(painel.classList.contains('bottom-full')).toBe(true)
    expect(painel.contains(screen.getByRole('status'))).toBe(true)
    expect(painel.contains(screen.getByRole('group', { name: 'Outros registros de Heloísa' }))).toBe(true)
    expect(fileira.compareDocumentPosition(painel) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
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
    fireEvent.click(botao('Mais registros'))
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

// E8 (VOLTA1): o painel "Mais" e a confirmação no teclado. O jsdom não anda com o Tab nem transforma Enter
// e Espaço em clique, e o `@testing-library/user-event` não está nas dependências do projeto: o `Tab` aqui
// anda pelos elementos tabuláveis na ordem do DOM (o que o navegador faz, sem tabindex positivo) e a
// ativação manda keydown, keyup e click no elemento focado, como o navegador faz num botão.
describe('BarraRegistrar: o painel Mais e a confirmação no teclado (E8)', () => {
  const OPCOES_MAIS = ['Tummy time', 'Mamadeira', 'Alimentação sólida', 'Observação']
  let rodape: HTMLAnchorElement

  function montarComRodape(sobrescritas: Partial<Parameters<typeof BarraRegistrar>[0]> = {}) {
    const resultado = montar(sobrescritas)
    // O próximo tabulável depois da barra (o rodapé da página): o que o Tab alcança ao sair do painel.
    rodape = document.createElement('a')
    rodape.href = '#rodape'
    rodape.textContent = 'Rodapé'
    document.body.append(rodape)
    return resultado
  }

  afterEach(() => {
    rodape?.remove()
  })

  function tabulaveis(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')].filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1' && !el.closest('[hidden], [inert]'),
    )
  }

  function tab(voltar = false) {
    const atual = document.activeElement as HTMLElement
    const lista = tabulaveis()
    const alvo = lista[lista.indexOf(atual) + (voltar ? -1 : 1)]
    fireEvent.keyDown(atual, { key: 'Tab', shiftKey: voltar })
    if (alvo) alvo.focus()
    else atual.blur()
  }

  function ativar(tecla: 'Enter' | ' ') {
    const atual = document.activeElement as HTMLElement
    fireEvent.keyDown(atual, { key: tecla })
    fireEvent.keyUp(atual, { key: tecla })
    fireEvent.click(atual)
  }

  const nomeDoFoco = () => (document.activeElement as HTMLElement).textContent

  /** Percorre `passos` Tabs e devolve o texto do elemento focado depois de cada um. */
  function percorrer(passos: number, voltar = false): Array<string | null> {
    const vistos: Array<string | null> = []
    for (let i = 0; i < passos; i++) {
      tab(voltar)
      vistos.push(nomeDoFoco())
    }
    return vistos
  }

  it('com o painel fechado a ordem do Tab é Sono, Mamada, Fralda, Mais e depois o que vem na página', () => {
    montarComRodape()
    botao('Iniciar sono de Heloísa').focus()

    expect(percorrer(4)).toEqual(['Mamada', 'Fralda', 'Mais', 'Rodapé'])
    expect(percorrer(4, true)).toEqual(['Mais', 'Fralda', 'Mamada', 'Sono'])
  })

  for (const [nome, tecla] of [
    ['Enter', 'Enter'],
    ['Espaço', ' '],
  ] as const) {
    it(`${nome} no botão "Mais registros" abre o painel e leva o foco à 1ª opção (Tummy time)`, () => {
      montarComRodape()
      const mais = botao('Mais registros')
      mais.focus()

      ativar(tecla)

      expect(mais.getAttribute('aria-expanded')).toBe('true')
      expect(screen.getByRole('group', { name: 'Outros registros de Heloísa' })).toBeTruthy()
      expect(document.activeElement).toBe(botao('Iniciar tummy time de Heloísa'))
      expect(nomeDoFoco()).toBe('Tummy time')
    })

    it(`${nome}: o Tab percorre Tummy time, Mamadeira, Alimentação sólida e Observação, sem pular nenhuma, e só depois sai do painel`, () => {
      montarComRodape()
      botao('Mais registros').focus()
      ativar(tecla)

      expect(nomeDoFoco()).toBe(OPCOES_MAIS[0])
      expect(percorrer(4)).toEqual([...OPCOES_MAIS.slice(1), 'Rodapé'])
    })

    it(`${nome}: o Shift+Tab percorre de volta Observação, Alimentação sólida, Mamadeira, Tummy time e o botão Mais`, () => {
      montarComRodape()
      botao('Mais registros').focus()
      ativar(tecla)
      percorrer(4) // até o rodapé

      expect(percorrer(5, true)).toEqual([...OPCOES_MAIS].reverse().concat('Mais'))
    })

    it(`${nome}: Esc fecha o painel, devolve o foco ao botão "Mais registros" e tira o aria-controls`, () => {
      montarComRodape()
      const mais = botao('Mais registros')
      mais.focus()
      ativar(tecla)
      percorrer(2) // o foco está no meio do painel

      fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

      expect(screen.queryByRole('group', { name: 'Outros registros de Heloísa' })).toBeNull()
      expect(document.activeElement).toBe(mais)
      expect(mais.getAttribute('aria-expanded')).toBe('false')
      expect(mais.hasAttribute('aria-controls')).toBe(false)
    })
  }

  it('o clique do mouse em "Mais registros" também leva o foco à 1ª opção', () => {
    montarComRodape()

    fireEvent.click(botao('Mais registros'))

    expect(document.activeElement).toBe(botao('Iniciar tummy time de Heloísa'))
  })

  it('aria-expanded e aria-controls: fechado sem controls; aberto, o controls aponta para o painel; fechado de novo, o controls some', () => {
    montarComRodape()
    const mais = botao('Mais registros')
    expect(mais.getAttribute('aria-expanded')).toBe('false')
    expect(mais.hasAttribute('aria-controls')).toBe(false)

    fireEvent.click(mais)
    const painel = screen.getByRole('group', { name: 'Outros registros de Heloísa' })
    expect(mais.getAttribute('aria-expanded')).toBe('true')
    expect(painel.id).not.toBe('')
    expect(mais.getAttribute('aria-controls')).toBe(painel.id)
    expect(document.getElementById(mais.getAttribute('aria-controls')!)).toBe(painel)

    fireEvent.click(mais)
    expect(screen.queryByRole('group', { name: 'Outros registros de Heloísa' })).toBeNull()
    expect(mais.getAttribute('aria-expanded')).toBe('false')
    expect(mais.hasAttribute('aria-controls')).toBe(false)
  })

  it('fechar o painel pelo próprio botão Mais deixa o foco no botão Mais', () => {
    montarComRodape()
    const mais = botao('Mais registros')
    fireEvent.click(mais)

    fireEvent.click(mais)

    expect(document.activeElement).toBe(mais)
  })

  it('o painel vem logo depois do gatilho no DOM: do botão Mais, o próximo Tab é a 1ª opção', () => {
    montarComRodape()
    const mais = botao('Mais registros')
    fireEvent.click(mais)
    mais.focus()

    expect(percorrer(1)).toEqual(['Tummy time'])
    expect(percorrer(1, true)).toEqual(['Mais'])
  })

  it('a confirmação da fralda também vem depois dos botões: o Tab do botão Fralda chega a Desfazer, Fechar, Xixi, Cocô e Ambos, sem pular nenhum', () => {
    montarComRodape({ texto: 'Fralda registrada' })
    botao('Registrar fralda de Heloísa').focus()

    expect(percorrer(7)).toEqual(['Mais', 'Desfazer', 'Fechar', 'Xixi', 'Cocô', 'Ambos', 'Rodapé'])
    expect(percorrer(6, true)).toEqual(['Ambos', 'Cocô', 'Xixi', 'Fechar', 'Desfazer', 'Mais'])
  })

  it('com a confirmação da fralda na tela, o painel Mais aberto ainda tem as 4 opções percorridas em ordem e só depois sai', () => {
    montarComRodape({ texto: 'Fralda registrada: Xixi' })
    const mais = botao('Mais registros')
    mais.focus()

    ativar('Enter')

    expect(nomeDoFoco()).toBe('Tummy time')
    expect(percorrer(4)).toEqual([...OPCOES_MAIS.slice(1), 'Rodapé'])
  })

  it('o role="status" continua único e no DOM com o painel Mais aberto e a confirmação na tela', () => {
    const { barra } = montarComRodape({ texto: 'Fralda registrada' })
    fireEvent.click(botao('Mais registros'))

    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(barra.querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(screen.getByRole('status').hasAttribute('tabindex')).toBe(false)
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
      expect(barra.classList.contains('fixed')).toBe(false)
      expect(barra.classList.contains('registro-rapido')).toBe(true)
      expect(barra.hasAttribute('data-barra-registrar')).toBe(true)
      expect(document.documentElement.style.getPropertyValue('scroll-padding-bottom')).toBe('')
    } finally {
      definirAltura(alturaOriginal)
      document.documentElement.style.removeProperty('font-size')
    }
  })
})
