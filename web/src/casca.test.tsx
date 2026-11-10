import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Abertura } from './componentes/base/Abertura.tsx'
import { Botao } from './componentes/base/Botao.tsx'
import { Campo } from './componentes/base/Campo.tsx'
import { Etiqueta } from './componentes/base/Etiqueta.tsx'
import { LinhaRotuloTexto } from './componentes/base/LinhaRotuloTexto.tsx'
import { FaixaNumeros } from './componentes/base/FaixaNumeros.tsx'
import { Cabecalho } from './componentes/casca/Cabecalho.tsx'
import { ROTULO_MADRUGADA, ROTULO_MADRUGADA_CURTO } from './componentes/casca/textos.ts'
import { renderizarRota } from './teste/renderizarRota.tsx'

// MAT-44d, cartão 1 (SB-4): o cabeçalho, o menu do celular, o submenu "+ Em breve" e as peças de
// base. O jsdom não mede layout: o que o navegador mede (G1 a G12) está em web/scripts/medir-dom.mjs.

function cabecalho(contexto: 'publico' | 'logado', madrugada = false, aoAlternar = () => undefined) {
  return render(
    <MemoryRouter>
      <Cabecalho contexto={contexto} madrugada={madrugada} aoAlternarMadrugada={aoAlternar} />
    </MemoryRouter>,
  )
}

const painelDoMenu = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-menu-celular]')!

/**
 * A largura da janela no jsdom (que parte de 1024 e não faz layout). O menu do celular só existe
 * abaixo de 768: os testes dele declaram 390. `avisar` dispara o `resize`, como o navegador.
 * O `afterEach` abaixo devolve 1024 (o valor do jsdom) depois de cada teste deste arquivo.
 */
function larguraDaJanela(largura: number, avisar = false) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
  if (avisar) act(() => void window.dispatchEvent(new Event('resize')))
}

afterEach(() => larguraDaJanela(1024))

describe('cabeçalho: contexto', () => {
  it('o logado mostra Hoje, + Em breve, Conta e o botão "Modo madrugada" com aria-pressed', () => {
    cabecalho('logado')
    const nav = screen.getByRole('navigation', { name: 'Site' })

    expect([...nav.children].map((filho) => filho.textContent)).toEqual(['Hoje', '+ Em breve', 'Conta'])
    expect(within(nav).getByRole('link', { name: 'Hoje' }).getAttribute('href')).toBe('/app/hoje')
    expect(within(nav).getByRole('link', { name: 'Conta' }).getAttribute('href')).toBe('/app/conta')
    const botao = screen.getByRole('button', { name: 'Modo madrugada' })
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  it('o botão "Modo madrugada" chama o alternador e acompanha o estado em aria-pressed', () => {
    const alternar = vi.fn()
    const { rerender } = cabecalho('logado', false, alternar)

    fireEvent.click(screen.getByRole('button', { name: 'Modo madrugada' }))
    expect(alternar).toHaveBeenCalledTimes(1)

    rerender(
      <MemoryRouter>
        <Cabecalho contexto="logado" madrugada aoAlternarMadrugada={alternar} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Modo madrugada' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('o público mostra Início, Protótipo, + Em breve e o link "Entrar", sem "Modo madrugada"', () => {
    cabecalho('publico')
    const nav = screen.getByRole('navigation', { name: 'Site' })

    expect([...nav.children].map((filho) => filho.textContent)).toEqual(['Início', 'Protótipo', '+ Em breve'])
    expect(within(nav).getByRole('link', { name: 'Início' }).getAttribute('href')).toBe('/')
    expect(within(nav).getByRole('link', { name: 'Protótipo' }).getAttribute('href')).toBe('/app/hoje')
    expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/entrar')
    expect(screen.queryByRole('button', { name: 'Modo madrugada' })).toBeNull()
  })

  it('o nome do site e os marcadores do medidor estão no lugar', () => {
    const { container } = cabecalho('publico')

    const nome = container.querySelector('[data-nome-site]')!
    expect(nome.textContent).toBe('AppMaternidade')
    expect(container.querySelectorAll('header[data-cabecalho]')).toHaveLength(1)
    expect(screen.getByRole('banner')).toBe(container.querySelector('[data-cabecalho]'))
  })

  it('o botão do cabeçalho é de moldura dupla: borda por fora e um miolo por dentro', () => {
    cabecalho('logado')

    const botao = screen.getByRole('button', { name: 'Modo madrugada' })
    expect(botao.hasAttribute('data-moldura-dupla')).toBe(true)
    expect(botao.querySelector(':scope > .sb-moldura-miolo')).not.toBeNull()
  })
})

describe('cabeçalho: o botão "Modo madrugada" (D7 e D9)', () => {
  it('D9: o botão tem o rótulo longo e o curto, os dois de textos.ts, e o nome acessível continua "Modo madrugada"', () => {
    cabecalho('logado')

    expect(ROTULO_MADRUGADA).toBe('Modo madrugada')
    expect(ROTULO_MADRUGADA_CURTO).toBe('Madrugada')
    const botao = screen.getByRole('button', { name: 'Modo madrugada' })
    expect(botao.getAttribute('aria-label')).toBe('Modo madrugada')
    expect(botao.querySelector('.sb-cab-rotulo-longo')!.textContent).toBe(ROTULO_MADRUGADA)
    expect(botao.querySelector('.sb-cab-rotulo-curto')!.textContent).toBe(ROTULO_MADRUGADA_CURTO)
    // O curto é o texto com M maiúsculo; nada é feito por CSS, então o innerText de 390 é o do DOM.
    expect(ROTULO_MADRUGADA_CURTO[0]).toBe('M')
  })

  it('D9: o rótulo curto é uma duplicata visual (aria-hidden), então o texto visível segue contido no nome acessível (WCAG 2.5.3)', () => {
    cabecalho('logado')

    const botao = screen.getByRole('button', { name: 'Modo madrugada' })
    expect(botao.querySelector('.sb-cab-rotulo-curto')!.getAttribute('aria-hidden')).toBe('true')
    expect(botao.querySelector('.sb-cab-rotulo-longo')!.hasAttribute('aria-hidden')).toBe(false)
    // O texto visível (sem os aria-hidden) é o rótulo longo, que é o próprio nome acessível.
    const copia = botao.cloneNode(true) as Element
    for (const escondido of copia.querySelectorAll('[aria-hidden="true"]')) escondido.remove()
    expect(copia.textContent).toBe(ROTULO_MADRUGADA)
    // E o curto, "Madrugada", também está contido no nome acessível, sem diferença de caixa.
    expect(ROTULO_MADRUGADA.toLowerCase()).toContain(ROTULO_MADRUGADA_CURTO.toLowerCase())
  })

  it('D9: o texto visível do botão só existe nos dois rótulos (nenhum texto solto fora deles)', () => {
    cabecalho('logado')

    const miolo = screen.getByRole('button', { name: 'Modo madrugada' }).querySelector('.sb-moldura-miolo')!
    const filhos = [...miolo.children]
    expect(filhos.map((filho) => filho.className)).toEqual(['sb-cab-rotulo-longo', 'sb-cab-rotulo-curto'])
    expect([...miolo.childNodes].filter((no) => no.nodeType === Node.TEXT_NODE)).toHaveLength(0)
  })

  it('D7: ligado traz data-ligado e aria-pressed="true"; desligado não traz data-ligado', () => {
    const { unmount } = cabecalho('logado', false)
    const desligado = screen.getByRole('button', { name: 'Modo madrugada' })
    expect(desligado.getAttribute('aria-pressed')).toBe('false')
    expect(desligado.hasAttribute('data-ligado')).toBe(false)
    unmount()

    cabecalho('logado', true)
    const ligado = screen.getByRole('button', { name: 'Modo madrugada' })
    expect(ligado.getAttribute('aria-pressed')).toBe('true')
    expect(ligado.hasAttribute('data-ligado')).toBe(true)
    expect(ligado.hasAttribute('data-moldura-dupla')).toBe(true)
    expect(ligado.querySelector(':scope > .sb-moldura-miolo')).not.toBeNull()
  })
})

describe('submenu "+ Em breve"', () => {
  it('abre por clique, com as quatro áreas e a etiqueta "Em breve" dentro de cada item', () => {
    cabecalho('logado')
    const gatilho = screen.getByRole('button', { name: '+ Em breve' })
    expect(gatilho.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Comunidade')).toBeNull()

    fireEvent.click(gatilho)

    expect(gatilho.getAttribute('aria-expanded')).toBe('true')
    const painel = document.getElementById(gatilho.getAttribute('aria-controls')!)!
    const itens = [...painel.querySelectorAll('li')]
    expect(itens.map((item) => item.firstElementChild!.textContent)).toEqual(['Comunidade', 'Lembretes', 'Convites', 'Relatórios'])
    for (const item of itens) expect(within(item).getByText('Em breve')).toBeTruthy()
    expect(painel.hasAttribute('data-moldura-dupla')).toBe(true)
  })

  it('abre pela seta para baixo no teclado', () => {
    cabecalho('publico')
    const gatilho = screen.getByRole('button', { name: '+ Em breve' })
    gatilho.focus()

    fireEvent.keyDown(gatilho, { key: 'ArrowDown' })

    expect(gatilho.getAttribute('aria-expanded')).toBe('true')
  })

  it('fecha com Esc e devolve o foco ao botão', () => {
    cabecalho('logado')
    const gatilho = screen.getByRole('button', { name: '+ Em breve' })
    fireEvent.click(gatilho)
    expect(gatilho.getAttribute('aria-expanded')).toBe('true')

    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(gatilho.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(gatilho)
    expect(screen.queryByText('Comunidade')).toBeNull()
  })

  it('fecha ao clicar fora e continua aberto ao clicar dentro', () => {
    cabecalho('logado')
    const gatilho = screen.getByRole('button', { name: '+ Em breve' })
    fireEvent.click(gatilho)

    fireEvent.pointerDown(screen.getByText('Comunidade'))
    expect(gatilho.getAttribute('aria-expanded')).toBe('true')

    fireEvent.pointerDown(document.body)
    expect(gatilho.getAttribute('aria-expanded')).toBe('false')
  })

  it('o clique no botão alterna: abre e fecha', () => {
    cabecalho('logado')
    const gatilho = screen.getByRole('button', { name: '+ Em breve' })

    fireEvent.click(gatilho)
    fireEvent.click(gatilho)

    expect(gatilho.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('menu do celular', () => {
  beforeEach(() => larguraDaJanela(390))

  it('começa fechado, com aria-expanded="false" e aria-controls apontando para o painel', () => {
    const { container } = cabecalho('logado')
    const botao = screen.getByRole('button', { name: 'Menu' })

    expect(botao.getAttribute('aria-expanded')).toBe('false')
    const painel = painelDoMenu(container)
    expect(botao.getAttribute('aria-controls')).toBe(painel.id)
    expect(painel.hasAttribute('hidden')).toBe(true)
    expect(painel.children).toHaveLength(0)
  })

  it('abre com os itens centrados em grupos, as áreas futuras e o foco no primeiro item', () => {
    const { container } = cabecalho('logado')
    const botao = screen.getByRole('button', { name: 'Menu' })

    fireEvent.click(botao)

    expect(botao.getAttribute('aria-expanded')).toBe('true')
    const painel = painelDoMenu(container)
    expect(painel.hasAttribute('hidden')).toBe(false)
    const grupos = [...painel.querySelectorAll('ul')]
    expect(grupos.map((g) => [...g.querySelectorAll('li')].map((li) => li.firstElementChild!.textContent))).toEqual([
      ['Hoje'],
      ['Comunidade', 'Lembretes', 'Convites', 'Relatórios'],
      ['Conta'],
    ])
    expect(grupos.every((g) => g.classList.contains('sb-menu-grupo'))).toBe(true)
    expect(document.activeElement).toBe(within(painel).getByRole('link', { name: 'Hoje' }))
  })

  it('prende o foco: Tab no último item volta ao botão do menu, e Shift+Tab nele vai ao último item', () => {
    const { container } = cabecalho('logado')
    const botao = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(botao)
    const painel = painelDoMenu(container)
    const ultimo = within(painel).getByRole('link', { name: 'Conta' })

    ultimo.focus()
    fireEvent.keyDown(ultimo, { key: 'Tab' })
    expect(document.activeElement).toBe(botao)

    fireEvent.keyDown(botao, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(ultimo)
  })

  it('no meio da volta o Tab é conduzido, não solto: cancela o padrão e põe o foco no próximo elemento do cabeçalho', () => {
    // Antes (rodada 4) o Tab no meio da volta seguia livre; o defeito medido no Chrome mostrou que a
    // lista artificial [botão, ...painel] não é contígua no DOM. Agora todo Tab é explícito.
    const { container } = cabecalho('logado')
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const primeiro = within(painelDoMenu(container)).getByRole('link', { name: 'Hoje' })
    primeiro.focus()

    const naoCancelado = fireEvent.keyDown(primeiro, { key: 'Tab' })

    expect(naoCancelado).toBe(false)
    expect(document.activeElement).toBe(within(painelDoMenu(container)).getByRole('link', { name: 'Conta' }))
  })

  it('fecha com Esc e devolve o foco ao botão do menu', () => {
    const { container } = cabecalho('publico')
    const botao = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(botao)
    expect(painelDoMenu(container).hasAttribute('hidden')).toBe(false)

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })

    expect(botao.getAttribute('aria-expanded')).toBe('false')
    expect(painelDoMenu(container).hasAttribute('hidden')).toBe(true)
    expect(document.activeElement).toBe(botao)
  })

  it('o clique no botão alterna e o clique num link fecha o menu', () => {
    const { container } = cabecalho('publico')
    const botao = screen.getByRole('button', { name: 'Menu' })

    fireEvent.click(botao)
    fireEvent.click(botao)
    expect(botao.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(botao)
    fireEvent.click(within(painelDoMenu(container)).getByRole('link', { name: 'Início' }))
    expect(botao.getAttribute('aria-expanded')).toBe('false')
  })

  it('depois de fechado, o Tab volta a ser livre (nenhum ouvinte sobra)', () => {
    cabecalho('logado')
    const botao = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(botao)
    fireEvent.click(botao)
    botao.focus()

    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    botao.dispatchEvent(evento)

    expect(evento.defaultPrevented).toBe(false)
  })
})

// R1 (rodada de correção 1): com o menu aberto, o foco gira em volta fechada por TODOS os focáveis
// visíveis do cabeçalho, na ordem do DOM. Os links de nav.sb-cab-links ficam fora (somem abaixo de 768).
describe('menu do celular: a volta do foco cobre o cabeçalho inteiro', () => {
  beforeEach(() => larguraDaJanela(390))

  const ESPERADO = {
    publico: { acao: ['link', 'Entrar'], painel: ['Início', 'Protótipo'] },
    logado: { acao: ['button', 'Modo madrugada'], painel: ['Hoje', 'Conta'] },
  } as const

  /** Abre o menu e devolve os elementos da volta na ordem em que o DOM os apresenta. */
  function abrirEMontarVolta(contexto: 'publico' | 'logado') {
    const { container } = cabecalho(contexto)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const banner = container.querySelector<HTMLElement>('header[data-cabecalho]')!
    const painel = painelDoMenu(container)
    const [papelAcao, nomeAcao] = ESPERADO[contexto].acao
    const volta: HTMLElement[] = [
      within(banner).getByRole('button', { name: 'Menu' }),
      within(banner).getByRole('link', { name: 'AppMaternidade' }),
      within(banner).getByRole(papelAcao, { name: nomeAcao }),
      ...ESPERADO[contexto].painel.map((nome) => within(painel).getByRole('link', { name: nome })),
    ]
    // A lista acima precisa estar na ordem do documento: é a ordem que o Tab do navegador segue.
    for (let i = 1; i < volta.length; i += 1) {
      expect(volta[i - 1].compareDocumentPosition(volta[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `posição ${i}`).not.toBe(0)
    }
    return { container, volta }
  }

  const tab = (de: HTMLElement, shiftKey = false) => fireEvent.keyDown(de, { key: 'Tab', shiftKey })

  for (const contexto of ['publico', 'logado'] as const) {
    it(`${contexto}: de cada elemento, Tab vai ao próximo e Shift+Tab ao anterior, em volta fechada`, () => {
      const { volta } = abrirEMontarVolta(contexto)
      const n = volta.length

      volta.forEach((elemento, i) => {
        elemento.focus()
        expect(tab(elemento), `Tab em ${i}`).toBe(false)
        expect(document.activeElement, `Tab em ${i}`).toBe(volta[(i + 1) % n])

        elemento.focus()
        expect(tab(elemento, true), `Shift+Tab em ${i}`).toBe(false)
        expect(document.activeElement, `Shift+Tab em ${i}`).toBe(volta[(i - 1 + n) % n])
      })
    })

    it(`${contexto}: N Tabs passam por todos os N elementos exatamente uma vez, nos dois sentidos, sem tocar a nav escondida`, () => {
      const { container, volta } = abrirEMontarVolta(contexto)
      const n = volta.length

      for (const shiftKey of [false, true]) {
        volta[0].focus()
        const vistos: Element[] = []
        for (let passo = 0; passo < n; passo += 1) {
          tab(document.activeElement as HTMLElement, shiftKey)
          const atual = document.activeElement!
          expect(volta, 'o foco saiu da volta').toContain(atual)
          expect(atual.closest('.sb-cab-links'), 'o foco entrou em nav.sb-cab-links').toBeNull()
          vistos.push(atual)
        }
        expect(new Set(vistos).size).toBe(n)
        expect(vistos[n - 1]).toBe(volta[0])
      }
      expect(container.querySelector('.sb-cab-links')).not.toBeNull()
    })

    it(`${contexto}: com o foco fora da volta, Tab leva ao primeiro e Shift+Tab ao último`, () => {
      const { volta } = abrirEMontarVolta(contexto)
      const fora = document.createElement('button')
      document.body.append(fora)
      try {
        fora.focus()
        expect(tab(fora)).toBe(false)
        expect(document.activeElement).toBe(volta[0])

        fora.focus()
        expect(tab(fora, true)).toBe(false)
        expect(document.activeElement).toBe(volta[volta.length - 1])
      } finally {
        fora.remove()
      }
    })
  }

  it('o que está [hidden] ou [inert] não entra na volta', () => {
    const { volta } = abrirEMontarVolta('logado')
    const [menu, nome, acao, hoje, conta] = volta
    nome.setAttribute('inert', '')
    acao.setAttribute('hidden', '')

    menu.focus()
    tab(menu)
    expect(document.activeElement).toBe(hoje)

    conta.focus()
    tab(conta)
    expect(document.activeElement).toBe(menu)

    hoje.focus()
    tab(hoje, true)
    expect(document.activeElement).toBe(menu)
  })

  it('Ctrl+Tab e Alt+Tab não são interceptados (são do navegador e do sistema)', () => {
    const { volta } = abrirEMontarVolta('logado')
    volta[1].focus()

    expect(fireEvent.keyDown(volta[1], { key: 'Tab', ctrlKey: true })).toBe(true)
    expect(fireEvent.keyDown(volta[1], { key: 'Tab', altKey: true })).toBe(true)
    expect(document.activeElement).toBe(volta[1])
  })

  it('preserva o Esc (fecha e devolve o foco ao botão) e o foco no primeiro item ao abrir', () => {
    const { container, volta } = abrirEMontarVolta('publico')
    expect(document.activeElement).toBe(volta[3])
    expect(volta[0].getAttribute('aria-expanded')).toBe('true')
    expect(volta[0].getAttribute('aria-controls')).toBe(painelDoMenu(container).id)

    fireEvent.keyDown(volta[4], { key: 'Escape' })

    expect(volta[0].getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(volta[0])
  })
})

// Rodada de correção 2, achado A: o menu acompanha o ponto de quebra (768). Ao ampliar a janela com o
// menu aberto, ele fecha, o ouvinte do Tab sai, e o Tab da navegação de computador não é cancelado.
describe('menu do celular: o ponto de quebra', () => {
  beforeEach(() => larguraDaJanela(390))

  /** O link da navegação de computador que cada contexto tem (nav.sb-cab-links). */
  const LINK_DESKTOP = { publico: 'Início', logado: 'Conta' } as const

  type OuvinteDeMidia = (evento: { matches: boolean }) => void
  /** Um matchMedia que guarda os ouvintes de `change`, para o teste disparar a mudança. */
  function stubarMatchMedia(ouvintes: Set<OuvinteDeMidia>, consultas: string[] = []) {
    vi.stubGlobal('matchMedia', (consulta: string) => {
      consultas.push(consulta)
      return {
        matches: false,
        media: consulta,
        addEventListener: (_tipo: string, ouvinte: OuvinteDeMidia) => ouvintes.add(ouvinte),
        removeEventListener: (_tipo: string, ouvinte: OuvinteDeMidia) => ouvintes.delete(ouvinte),
      }
    })
  }

  function abrirEm390(contexto: 'publico' | 'logado') {
    const { container, unmount } = cabecalho(contexto)
    const botao = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(botao)
    expect(botao.getAttribute('aria-expanded')).toBe('true')
    const linkDesktop = within(container.querySelector<HTMLElement>('nav.sb-cab-links')!).getByRole('link', {
      name: LINK_DESKTOP[contexto],
    })
    return { container, unmount, botao, linkDesktop }
  }

  for (const contexto of ['publico', 'logado'] as const) {
    it(`${contexto}: 390 → 1440 com o menu aberto: o menu fecha e o Tab e o Shift+Tab no link de computador não são cancelados`, () => {
      const { container, botao, linkDesktop } = abrirEm390(contexto)

      larguraDaJanela(1440, true)

      expect(botao.getAttribute('aria-expanded')).toBe('false')
      expect(painelDoMenu(container).hasAttribute('hidden')).toBe(true)
      expect(painelDoMenu(container).children).toHaveLength(0)
      linkDesktop.focus()
      expect(document.activeElement).toBe(linkDesktop)
      for (const shiftKey of [false, true]) {
        const evento = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })
        linkDesktop.dispatchEvent(evento)
        expect(evento.defaultPrevented, shiftKey ? 'Shift+Tab' : 'Tab').toBe(false)
      }
      expect(document.activeElement).toBe(linkDesktop)
    })
  }

  it('ao sair do ponto de quebra o foco NÃO volta ao botão do menu (ele está oculto)', () => {
    const { botao } = abrirEm390('logado')
    expect(document.activeElement).not.toBe(botao)

    larguraDaJanela(1440, true)

    expect(document.activeElement).not.toBe(botao)
  })

  it('mudar a largura sem abrir o menu antes não quebra nada, e o menu abre normalmente ao voltar a 390', () => {
    const { container, botao, linkDesktop } = abrirEm390('logado')
    fireEvent.click(botao) // fecha
    expect(botao.getAttribute('aria-expanded')).toBe('false')

    larguraDaJanela(1440, true)
    larguraDaJanela(1100, true)
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    linkDesktop.focus()
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    linkDesktop.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(false)

    larguraDaJanela(390, true)
    fireEvent.click(botao)
    expect(botao.getAttribute('aria-expanded')).toBe('true')
    expect(painelDoMenu(container).hasAttribute('hidden')).toBe(false)
  })

  it('controle: um resize que continua abaixo de 768 mantém o menu aberto e o ciclo ativo', () => {
    const { container, botao } = abrirEm390('logado')

    larguraDaJanela(600, true)

    expect(botao.getAttribute('aria-expanded')).toBe('true')
    const conta = within(painelDoMenu(container)).getByRole('link', { name: 'Conta' })
    conta.focus()
    expect(fireEvent.keyDown(conta, { key: 'Tab' })).toBe(false)
    expect(document.activeElement).toBe(botao)
  })

  it('390 → 1440 → 390: o menu volta fechado, abre de novo com o foco no primeiro item e o Tab cicla', () => {
    const { container, botao } = abrirEm390('logado')

    larguraDaJanela(1440, true)
    larguraDaJanela(390, true)

    expect(botao.getAttribute('aria-expanded')).toBe('false')
    expect(painelDoMenu(container).hasAttribute('hidden')).toBe(true)

    fireEvent.click(botao)

    expect(botao.getAttribute('aria-expanded')).toBe('true')
    const painel = painelDoMenu(container)
    const primeiro = within(painel).getByRole('link', { name: 'Hoje' })
    const ultimo = within(painel).getByRole('link', { name: 'Conta' })
    expect(document.activeElement).toBe(primeiro)
    ultimo.focus()
    expect(fireEvent.keyDown(ultimo, { key: 'Tab' })).toBe(false)
    expect(document.activeElement).toBe(botao)
    expect(fireEvent.keyDown(botao, { key: 'Tab', shiftKey: true })).toBe(false)
    expect(document.activeElement).toBe(ultimo)
    fireEvent.keyDown(ultimo, { key: 'Escape' })
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(botao)
  })

  it('com matchMedia, o evento change do (min-width: 768px) fecha o menu', () => {
    const ouvintes = new Set<OuvinteDeMidia>()
    const consultas: string[] = []
    stubarMatchMedia(ouvintes, consultas)
    const { container, botao, linkDesktop } = abrirEm390('logado')
    expect(consultas).toContain('(min-width: 768px)')
    expect(ouvintes.size).toBeGreaterThan(0)

    larguraDaJanela(1440)
    act(() => ouvintes.forEach((ouvinte) => ouvinte({ matches: true })))

    expect(botao.getAttribute('aria-expanded')).toBe('false')
    expect(painelDoMenu(container).hasAttribute('hidden')).toBe(true)
    linkDesktop.focus()
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    linkDesktop.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(false)
  })

  it('ao desmontar, os ouvintes do resize, do matchMedia e do keydown saem', () => {
    const ouvintes = new Set<OuvinteDeMidia>()
    stubarMatchMedia(ouvintes)
    const noWindow = vi.spyOn(window, 'addEventListener')
    const foraDoWindow = vi.spyOn(window, 'removeEventListener')
    const noDocument = vi.spyOn(document, 'addEventListener')
    const foraDoDocument = vi.spyOn(document, 'removeEventListener')
    const { unmount } = abrirEm390('logado')
    const resizes = noWindow.mock.calls.filter(([tipo]) => tipo === 'resize')
    expect(resizes.length).toBeGreaterThan(0)
    expect(ouvintes.size).toBeGreaterThan(0)

    unmount()

    for (const [, ouvinte] of resizes) expect(foraDoWindow).toHaveBeenCalledWith('resize', ouvinte)
    expect(ouvintes.size).toBe(0)
    const teclas = noDocument.mock.calls.filter(([tipo]) => tipo === 'keydown')
    expect(teclas.length).toBeGreaterThan(0)
    for (const [, ouvinte] of teclas) expect(foraDoDocument).toHaveBeenCalledWith('keydown', ouvinte)
  })

  it('defesa: com a janela já em 1440 e o menu aberto à força, o Tab no link de computador não é cancelado', () => {
    larguraDaJanela(1440)
    const { container } = cabecalho('logado')
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const conta = within(container.querySelector<HTMLElement>('nav.sb-cab-links')!).getByRole('link', { name: 'Conta' })
    conta.focus()

    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    conta.dispatchEvent(evento)

    expect(evento.defaultPrevented).toBe(false)
  })

  it('defesa: a volta do foco só conta focáveis realmente visíveis (checkVisibility), não só os fora de [hidden] e [inert]', () => {
    const prototipo = Element.prototype as unknown as { checkVisibility?: (this: Element) => boolean }
    prototipo.checkVisibility = function (this: Element) {
      return !this.closest('[data-oculto]')
    }
    try {
      const { container } = cabecalho('logado')
      const botao = screen.getByRole('button', { name: 'Menu' })
      fireEvent.click(botao)
      const banner = container.querySelector<HTMLElement>('header[data-cabecalho]')!
      const nome = within(banner).getByRole('link', { name: 'AppMaternidade' })
      const acao = within(banner).getByRole('button', { name: 'Modo madrugada' })
      nome.setAttribute('data-oculto', '')

      botao.focus()
      expect(fireEvent.keyDown(botao, { key: 'Tab' })).toBe(false)

      expect(document.activeElement).toBe(acao)
    } finally {
      delete prototipo.checkVisibility
    }
  })
})

describe('Campo', () => {
  it('o erro vem em corpo-p abaixo do campo, ligado por aria-describedby, e o campo fica inválido', () => {
    render(<Campo id="e" rotulo="E-mail" tipo="email" erro="Falta o arroba." />)

    const campo = screen.getByLabelText('E-mail')
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(campo.getAttribute('aria-describedby')).toBe('e-erro')
    const erro = document.getElementById('e-erro')!
    expect(erro.textContent).toBe('Falta o arroba.')
    expect(erro.classList.contains('t-corpo-p')).toBe(true)
    expect(campo.closest('.sb-campo')!.lastElementChild).toBe(erro)
  })

  it('sem erro, o campo não é inválido e não aponta para ninguém', () => {
    render(<Campo id="n" rotulo="Nome" />)

    const campo = screen.getByLabelText('Nome')
    expect(campo.hasAttribute('aria-invalid')).toBe(false)
    expect(campo.hasAttribute('aria-describedby')).toBe(false)
  })

  it('a ajuda e o erro entram juntos no aria-describedby', () => {
    render(<Campo id="a" rotulo="Apelido" ajuda="Como a família chama." erro="Já existe." />)

    expect(screen.getByLabelText('Apelido').getAttribute('aria-describedby')).toBe('a-erro a-ajuda')
  })

  it('a senha tem o botão de mostrar, com aria-label fixo e aria-pressed, que troca o tipo do campo', () => {
    render(<Campo id="s" rotulo="Senha" tipo="senha" />)

    const campo = screen.getByLabelText('Senha') as HTMLInputElement
    const botao = screen.getByRole('button', { name: 'Mostrar senha' })
    expect(campo.type).toBe('password')
    expect(botao.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(botao)
    expect(campo.type).toBe('text')
    expect(botao.getAttribute('aria-pressed')).toBe('true')
    expect(botao.getAttribute('aria-label')).toBe('Mostrar senha')

    fireEvent.click(botao)
    expect(campo.type).toBe('password')
  })

  it('os outros tipos não têm botão de mostrar senha', () => {
    render(<Campo id="t" rotulo="Texto" />)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('o select tem as opções, o mesmo rótulo e a marca de select', () => {
    render(
      <Campo
        id="p"
        rotulo="Papel"
        tipo="select"
        opcoes={[
          { valor: 'a', rotulo: 'Cuidador' },
          { valor: 'b', rotulo: 'Responsável' },
        ]}
      />,
    )

    const select = screen.getByLabelText('Papel')
    expect(select.tagName).toBe('SELECT')
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Cuidador', 'Responsável'])
    expect(select.closest('.sb-campo-controle')!.hasAttribute('data-select')).toBe(true)
  })
})

describe('Botao', () => {
  it('o primário é urucum, o de moldura dupla traz o miolo, e cada um leva o seu marcador', () => {
    render(
      <>
        <Botao>Registrar</Botao>
        <Botao variante="moldura" alto>
          Histórico
        </Botao>
      </>,
    )

    const primario = screen.getByRole('button', { name: 'Registrar' })
    expect(primario.getAttribute('data-botao')).toBe('primario')
    expect(primario.hasAttribute('data-moldura-dupla')).toBe(false)
    const moldura = screen.getByRole('button', { name: 'Histórico' })
    expect(moldura.getAttribute('data-botao')).toBe('moldura')
    expect(moldura.hasAttribute('data-moldura-dupla')).toBe(true)
    expect(moldura.hasAttribute('data-alto')).toBe(true)
    expect(moldura.firstElementChild!.classList.contains('sb-moldura-miolo')).toBe(true)
  })

  it('desativado: aria-disabled="true", o motivo ao lado ligado por aria-describedby, e o clique não faz nada', () => {
    const aoClicar = vi.fn()
    render(
      <Botao desativado motivo="Disponível em breve." onClick={aoClicar}>
        Convidar
      </Botao>,
    )

    const botao = screen.getByRole('button', { name: 'Convidar' })
    expect(botao.getAttribute('aria-disabled')).toBe('true')
    expect(botao.hasAttribute('disabled')).toBe(false)
    const motivo = document.getElementById(botao.getAttribute('aria-describedby')!)!
    expect(motivo.textContent).toBe('Disponível em breve.')

    fireEvent.click(botao)
    expect(aoClicar).not.toHaveBeenCalled()
  })

  it('ativo: chama o onClick e não leva aria-disabled', () => {
    const aoClicar = vi.fn()
    render(<Botao onClick={aoClicar}>Salvar</Botao>)

    const botao = screen.getByRole('button', { name: 'Salvar' })
    fireEvent.click(botao)

    expect(aoClicar).toHaveBeenCalledTimes(1)
    expect(botao.hasAttribute('aria-disabled')).toBe(false)
  })

  it('com `to` vira link de rota e com `href` vira link comum', () => {
    render(
      <MemoryRouter>
        <Botao to="/entrar">Entrar</Botao>
        <Botao href="https://exemplo.invalid/" variante="moldura">
          Fora
        </Botao>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/entrar')
    expect(screen.getByRole('link', { name: 'Fora' }).getAttribute('href')).toBe('https://exemplo.invalid/')
  })
})

describe('casca do site (Layout)', () => {
  it('o Início usa o cabeçalho público e o rodapé de borda a borda, com o aviso de protótipo', async () => {
    const { container } = renderizarRota('/')
    await screen.findByRole('heading', { level: 1 })

    const banner = container.querySelector<HTMLElement>('header[data-cabecalho]')!
    expect(within(banner).getByRole('link', { name: 'Entrar' })).toBeTruthy()
    expect(within(banner).queryByRole('button', { name: 'Modo madrugada' })).toBeNull()
    const rodape = container.querySelector('[data-rodape]')!
    expect(rodape.tagName).toBe('FOOTER')
    expect(container.querySelectorAll('footer')).toHaveLength(1)
    expect(within(rodape as HTMLElement).getByText('Protótipo em construção. Nada aqui é dado real.')).toBeTruthy()
    expect(rodape.querySelector('[data-nome-rodape]')!.textContent).toBe('AppMaternidade')
  })

  it('o rodapé vem depois de todo o conteúdo, com as colunas de links e o bloco das próximas áreas', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    const rodape = container.querySelector('[data-rodape]')!
    const main = container.querySelector('main')!
    expect(main.compareDocumentPosition(rodape) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    const colunas = within(rodape as HTMLElement).getByRole('navigation', { name: 'Rodapé' })
    expect([...colunas.querySelectorAll('a')].map((a) => a.textContent)).toEqual([
      'Início', 'Sistema', 'Hoje', 'Sessão', 'Entrar', 'Conta',
    ])
    expect(within(rodape as HTMLElement).getByText('Próximas áreas')).toBeTruthy()
  })

  it('a área logada e a página de amostra usam o cabeçalho logado; a rota inexistente, o público', async () => {
    for (const [caminho, logado] of [
      ['/app/hoje', true],
      ['/app/sessao', true],
      ['/sistema', true],
      ['/qualquer-coisa', false],
      ['/', false],
    ] as const) {
      const { container, unmount } = renderizarRota(caminho)
      await screen.findByRole('heading', { level: 1 })

      const banner = container.querySelector<HTMLElement>('header[data-cabecalho]')!
      expect(within(banner).queryByRole('button', { name: 'Modo madrugada' }) !== null, caminho).toBe(logado)
      expect(within(banner).queryByRole('link', { name: 'Entrar' }) !== null, caminho).toBe(!logado)
      unmount()
    }
  })

  it('o botão do cabeçalho liga e desliga o modo madrugada no <html>', async () => {
    renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })
    const botao = screen.getByRole('button', { name: 'Modo madrugada' })

    fireEvent.click(botao)
    expect(botao.getAttribute('aria-pressed')).toBe('true')
    expect(document.documentElement.getAttribute('data-tema')).toBe('madrugada')

    fireEvent.click(botao)
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    expect(document.documentElement.hasAttribute('data-tema')).toBe(false)
  })
})

describe('rota /sistema', () => {
  it('tem um h1 único ("Sistema") e uma só região principal', async () => {
    renderizarRota('/sistema')

    const titulos = await screen.findAllByRole('heading', { level: 1 })
    expect(titulos).toHaveLength(1)
    expect(titulos[0].textContent).toBe('Sistema')
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('todo filho direto do <main> é uma área útil, na ordem do contrato', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    const filhos = [...container.querySelector('main')!.children]
    expect(filhos.length).toBeGreaterThanOrEqual(7)
    for (const filho of filhos) expect(filho.classList.contains('sb-area'), filho.outerHTML.slice(0, 60)).toBe(true)
    expect(filhos[0].querySelector('h1')).not.toBeNull()
    expect(filhos[1].querySelector('[data-numero]')).not.toBeNull()
    expect(filhos[2].querySelector('[data-midia]')).not.toBeNull()
    expect(filhos[3].querySelectorAll('h2')).toHaveLength(3)
    expect(filhos[4].querySelector('.sb-galeria')).not.toBeNull()
  })

  it('a abertura tem o título, a linha sob ele, 2 etiquetas na coluna lateral e a faixa tem 3 números', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    expect(container.querySelectorAll('.sb-abertura-lateral .sb-etiqueta')).toHaveLength(2)
    expect([...container.querySelectorAll('[data-numero]')].map((n) => n.textContent)).toEqual(['7', '2', '0'])
    expect(container.querySelector('.sb-numeros')!.textContent).toContain('metas ou comparações')
  })

  it('D3: a coluna lateral da abertura está na mesma grade do título (c9–c10), e o elemento do fio não a contém', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    const abertura = container.querySelector('.sb-abertura')!
    const h1 = abertura.querySelector('h1')!
    const lateral = abertura.querySelector<HTMLElement>('.sb-abertura-lateral')!
    expect(lateral.classList.contains('col-c9-c10')).toBe(true)
    expect(h1.closest('.col-c1-c8')).not.toBeNull()
    expect(lateral.parentElement).toBe(h1.closest('.grade-10'))
    expect(lateral.closest('.sb-abertura-base')).toBeNull()
    // O título vem antes da coluna lateral no DOM (a leitura de tela segue a ordem visual).
    expect(h1.compareDocumentPosition(lateral) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    // O `.sb-abertura-base` só carrega o fio horizontal (e, por pseudo-elemento, o vertical).
    const baseDoFio = abertura.querySelector('.sb-abertura-base')!
    expect(baseDoFio.childElementCount).toBe(0)
    expect(baseDoFio.hasAttribute('aria-hidden')).toBe(true)
    expect(baseDoFio.compareDocumentPosition(lateral) & Node.DOCUMENT_POSITION_PRECEDING).not.toBe(0)
  })

  it('D3: as 2 etiquetas e o link da abertura são itens de uma lista, uma sob a outra, e a abertura sem lateral não cria a lista', async () => {
    const { container, unmount } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })
    const itens = [...container.querySelectorAll('.sb-abertura-lateral > li')]
    expect(itens.map((li) => li.textContent)).toEqual(['Base visual', 'Em construção', 'Ir aos campos'])
    unmount()

    const { container: sem } = render(<Abertura titulo="Hoje" subtitulo="A linha sob o título." />)
    expect(sem.querySelector('.sb-abertura-lateral')).toBeNull()
    expect(sem.querySelector('.sb-abertura-base')).not.toBeNull()
  })

  it('V2: a lateral da amostra tem um link âncora real ("Ir aos campos") para uma seção da própria página, depois das etiquetas', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    const lateral = container.querySelector<HTMLElement>('.sb-abertura-lateral')!
    const link = within(lateral).getByRole('link', { name: 'Ir aos campos' })
    expect(within(lateral).getAllByRole('link')).toHaveLength(1)
    expect(link.tagName).toBe('A')
    const href = link.getAttribute('href')!
    expect(href).toMatch(/^#[a-z][a-z0-9-]*$/)
    const alvo = container.querySelector<HTMLElement>(`#${href.slice(1)}`)!
    expect(alvo, 'a seção alvo do link').not.toBeNull()
    expect(alvo.tagName).toBe('SECTION')
    expect(alvo.closest('main')).not.toBeNull()
    expect(alvo.contains(screen.getByLabelText('E-mail'))).toBe(true)
    // O link é o último item, depois das 2 etiquetas, dentro de um `li` da lista.
    expect(link.parentElement!.tagName).toBe('LI')
    expect(link.parentElement).toBe(lateral.lastElementChild)
    expect(link.classList.contains('sb-abertura-link')).toBe(true)
    expect(link.hasAttribute('tabindex')).toBe(false)
    expect(link.hasAttribute('onclick')).toBe(false)
  })

  it('V2: o recuo é da lateral inteira: uma lateral só de etiquetas e uma com etiquetas e link têm a mesma estrutura (ul > li), sem recuo em cada item', () => {
    const itensDe = (lateral: HTMLElement) => [...lateral.children]
    const apenasEtiquetas = render(
      <Abertura
        titulo="Hoje"
        subtitulo="A linha sob o título."
        lateral={[
          <li key="a"><Etiqueta>Primeira</Etiqueta></li>,
          <li key="b"><Etiqueta>Em construção</Etiqueta></li>,
        ]}
      />,
    )
    const comLink = render(
      <Abertura
        titulo="Hoje"
        subtitulo="A linha sob o título."
        lateral={[
          <li key="a"><Etiqueta>Primeira</Etiqueta></li>,
          <li key="b"><a className="sb-abertura-link t-corpo" href="#algum">Ir adiante</a></li>,
        ]}
      />,
    )

    for (const { container } of [apenasEtiquetas, comLink]) {
      const lateral = container.querySelector<HTMLElement>('ul.sb-abertura-lateral.col-c9-c10')!
      expect(lateral, 'a lista da lateral').not.toBeNull()
      expect(lateral.getAttribute('style')).toBeNull()
      expect(itensDe(lateral).every((item) => item.tagName === 'LI' && item.getAttribute('style') === null)).toBe(true)
      expect(itensDe(lateral).every((item) => item.className === '')).toBe(true)
      expect(lateral.parentElement!.classList.contains('grade-10')).toBe(true)
    }
    expect(within(apenasEtiquetas.container).queryByRole('link')).toBeNull()
    expect(within(comLink.container).getByRole('link', { name: 'Ir adiante' }).getAttribute('href')).toBe('#algum')
  })

  it('D5: a linha rótulo + texto ocupa c2–c8, para o fio de baixo terminar no início de c9, como o do campo', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    const linhas = [...container.querySelectorAll<HTMLElement>('.sb-linha')]
    expect(linhas.length).toBeGreaterThanOrEqual(3)
    for (const linha of linhas) {
      expect(linha.classList.contains('col-c2-c8'), linha.className).toBe(true)
      expect(linha.classList.contains('col-c2-c9'), linha.className).toBe(false)
      expect(linha.parentElement!.classList.contains('grade-10')).toBe(true)
      // O contrato da linha segue: o rótulo, depois o texto com o fio vertical.
      expect([...linha.children].map((filho) => filho.className.split(' ')[0])).toEqual(['sb-linha-rotulo', 'sb-linha-texto'])
    }
    // O campo ocupa c4–c8 de uma grade de 10 colunas: o fim dele é o início de c9.
    expect(container.querySelector('.sb-campo-controle')).not.toBeNull()
  })

  it('V4: o fio vertical é da caixa do texto em toda linha, qualquer que seja o tamanho do texto ou a posição na pilha (sem classe nem estilo por posição)', () => {
    const curto = 'Uma frase curta.'
    const medio = 'Um texto que ocupa mais de uma linha de texto na coluna de quinhentos e sessenta pixels, com folga para quebrar. '.repeat(2)
    const longo = 'Um texto longo, de várias linhas, para a caixa do texto ficar mais alta que o rótulo ao lado. '.repeat(6)
    const sozinha = render(<LinhaRotuloTexto rotulo="Só">{curto}</LinhaRotuloTexto>)
    const pilha = render(
      <div>
        <LinhaRotuloTexto rotulo="Primeira">{curto}</LinhaRotuloTexto>
        <LinhaRotuloTexto rotulo="Do meio">{medio}</LinhaRotuloTexto>
        <LinhaRotuloTexto rotulo="Última">{longo}</LinhaRotuloTexto>
      </div>,
    )

    const linhas = [
      ...sozinha.container.querySelectorAll<HTMLElement>('.sb-linha'),
      ...pilha.container.querySelectorAll<HTMLElement>('.sb-linha'),
    ]
    expect(linhas).toHaveLength(4)
    for (const linha of linhas) {
      // Estrutura única: o rótulo, depois a caixa do texto (que carrega o fio vertical por CSS) com o parágrafo.
      expect([...linha.children].map((filho) => filho.className)).toEqual(['sb-linha-rotulo t-rotulo', 'sb-linha-texto t-corpo'])
      expect(linha.getAttribute('style')).toBeNull()
      for (const filho of linha.children) expect(filho.getAttribute('style')).toBeNull()
      const texto = linha.querySelector<HTMLElement>('.sb-linha-texto')!
      expect([...texto.children].map((filho) => filho.tagName)).toEqual(['P'])
      expect(linha.parentElement!.className).toBe('grade-10')
      expect(linha.className).toBe('sb-linha col-c2-c8')
    }
  })

  it('D2: a faixa de números tem 3 itens, cada um com o número em Zilla Slab e a legenda, na ordem 7, 2, 0', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    const itens = [...container.querySelectorAll('.sb-numeros > .sb-numeros-item')]
    expect(itens).toHaveLength(3)
    expect(itens.map((item) => item.querySelector('[data-numero]')!.textContent)).toEqual(['7', '2', '0'])
    for (const item of itens) {
      expect([...item.children].map((filho) => filho.className.split(' ')[0])).toEqual(['sb-numeros-valor', 'sb-numeros-legenda'])
    }
  })

  it('V1: a faixa vem logo depois da abertura como a primeira coisa do bloco (é o contexto que apaga o fio), e o componente não leva marca própria', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    const abertura = container.querySelector('.sb-abertura')!
    const faixa = container.querySelector<HTMLElement>('.sb-numeros')!
    expect(abertura.nextElementSibling!.firstElementChild).toBe(faixa)
    // A supressão do fio é do contexto (o seletor irmão em index.css): o componente é o mesmo de sempre.
    expect(faixa.className).toBe('sb-numeros')
    expect([...faixa.querySelectorAll('.sb-numeros-item')].every((item) => item.className === 'sb-numeros-item')).toBe(true)
    expect([...faixa.attributes].map((atributo) => atributo.name).sort()).toEqual(['class', 'data-bloco'])
  })

  it('V1: a faixa fora de uma abertura é o mesmo componente, sem abertura antes dela (o fio do topo continua valendo)', () => {
    const { container } = render(
      <section>
        <p>Antes dela, outro conteúdo.</p>
        <FaixaNumeros
          itens={[
            { valor: '7', legenda: 'um' },
            { valor: '2', legenda: 'dois' },
            { valor: '0', legenda: 'zero' },
          ]}
        />
      </section>,
    )

    const faixa = container.querySelector<HTMLElement>('.sb-numeros')!
    expect(container.querySelector('.sb-abertura')).toBeNull()
    expect(faixa.className).toBe('sb-numeros')
    expect(faixa.matches('.sb-abertura + * > .sb-numeros:first-child')).toBe(false)
    expect(faixa.closest('section')!.previousElementSibling).toBeNull()
  })

  it('toda mídia é uma moldura sem texto, com a descrição em aria-label', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    const midias = [...container.querySelectorAll<HTMLElement>('[data-midia]')]
    expect(midias).toHaveLength(5)
    for (const midia of midias) {
      expect(midia.getAttribute('role')).toBe('img')
      expect(midia.getAttribute('aria-label')).toBeTruthy()
      expect(midia.textContent).toBe('')
      expect(['barro', 'lavanda']).toContain(midia.getAttribute('data-fundo'))
    }
  })

  it('traz dois campos (um com erro ligado ao campo), os três botões e as etiquetas', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    expect(screen.getByLabelText('E-mail').getAttribute('aria-describedby')).toBe('amostra-email-erro')
    expect(container.querySelectorAll('.sb-campo')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Registrar sono' }).getAttribute('data-botao')).toBe('primario')
    expect(screen.getByRole('button', { name: 'Ver histórico' }).hasAttribute('data-moldura-dupla')).toBe(true)
    expect(screen.getByRole('button', { name: 'Convidar' }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByText('Disponível em breve.')).toBeTruthy()
    expect(container.querySelectorAll('main .sb-etiqueta').length).toBeGreaterThanOrEqual(5)
  })

  it('nenhum texto da página usa caixa alta nem fica solto dentro de uma mídia', async () => {
    const { container } = renderizarRota('/sistema')
    await screen.findByRole('heading', { level: 1 })

    const texto = container.querySelector('main')!.textContent!
    expect(texto).not.toMatch(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}\b/)
  })
})
