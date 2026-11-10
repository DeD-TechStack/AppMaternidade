import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Botao } from './componentes/base/Botao.tsx'
import { Campo } from './componentes/base/Campo.tsx'
import { Cabecalho } from './componentes/casca/Cabecalho.tsx'
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
