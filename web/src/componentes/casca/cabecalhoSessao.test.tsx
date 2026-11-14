import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NOMES_DO_H1, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { ELENCO, criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { criarDadosModeracaoMemoria } from '../../dados/moderacao.memoria.ts'
import { fixtureDeContasDoElenco, renderizarModeracao } from '../../paginas/moderacao/apoio.tsx'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'

// QA-F1: o cabeçalho segue a sessão. Com sessão, "Conta" e "Sair" em toda página (no cabeçalho em 1440 e
// no menu em 390) e nenhum "Entrar"/"Criar conta"; sem sessão, os dois links de visitante; enquanto a sessão
// carrega, nenhum dos dois pares. O "Modo madrugada" só existe nas páginas da Rotina. O menu é uma
// divulgação (disclosure): o Tab sai do cabeçalho e o Esc devolve o foco ao botão Menu.

type Quem = 'nenhuma' | 'membro' | 'moderador'

const LARGURA_ORIGINAL = window.innerWidth

function fixarLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  fixarLargura(LARGURA_ORIGINAL)
})

function renderizarComoModerador(caminho: string) {
  const estado = criarElenco()
  const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.moderador.conta)
  const moderacao = criarDadosModeracaoMemoria(estado, ELENCO.moderador.conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO.moderador.email)
  return renderizarModeracao(caminho, { contas, comunidade, moderacao })
}

function renderizar(caminho: string, quem: Quem) {
  if (quem === 'moderador') return renderizarComoModerador(caminho)
  return renderizarRota(caminho, { sessao: quem === 'membro' ? 'juliana' : null })
}

async function montar(caminho: string, quem: Quem, largura: number) {
  fixarLargura(largura)
  const resultado = renderizar(caminho, quem)
  await aguardarCarga()
  return resultado
}

const cabecalho = () => document.querySelector<HTMLElement>('header[data-cabecalho]')!
const painel = () => document.querySelector<HTMLElement>('[data-menu-celular]')!

interface Itens {
  entrar: boolean
  criarConta: boolean
  conta: boolean
  sair: boolean
}

function leitura(escopo: HTMLElement): Itens {
  return {
    entrar: within(escopo).queryByRole('link', { name: 'Entrar' }) !== null,
    criarConta: within(escopo).queryByRole('link', { name: 'Criar conta' }) !== null,
    conta: within(escopo).queryByRole('link', { name: 'Conta' }) !== null,
    sair: within(escopo).queryByRole('button', { name: 'Sair' }) !== null,
  }
}

const VISITANTE: Itens = { entrar: true, criarConta: true, conta: false, sair: false }
const COM_SESSAO: Itens = { entrar: false, criarConta: false, conta: true, sair: true }
const NENHUM: Itens = { entrar: false, criarConta: false, conta: false, sair: false }

const lua = () => screen.queryByRole('button', { name: 'Modo madrugada' })

const ROTINA = ['/app/hoje', '/app/sessao', '/app/historico', '/app/lixeira', '/app/notas', '/app/registro/novo']
const PUBLICAS = ['/', '/desenvolvimento']
const DO_APP = ['/app/comunidade', '/app/familia', '/app/conta', '/app/comecar', '/app/desenvolvimento']

const CASOS: Array<[Quem, string]> = [
  ...[...PUBLICAS, ...ROTINA, ...DO_APP, '/moderacao'].map((caminho): [Quem, string] => ['nenhuma', caminho]),
  ...[...PUBLICAS, ...ROTINA, ...DO_APP].map((caminho): [Quem, string] => ['membro', caminho]),
  ...[...PUBLICAS, '/app/comunidade', '/moderacao', '/moderacao/auditoria'].map((caminho): [Quem, string] => ['moderador', caminho]),
]

describe('o espaço da conta no cabeçalho, em 1440', () => {
  it.each(CASOS)('%s em %s: os itens seguem a sessão e a lua só vive na Rotina', async (quem, caminho) => {
    await montar(caminho, quem, 1440)

    expect(leitura(cabecalho())).toEqual(quem === 'nenhuma' ? VISITANTE : COM_SESSAO)
    expect(lua() !== null).toBe(quem !== 'nenhuma' && ROTINA.includes(caminho))
  })

  it('com sessão, "Conta" leva a /app/conta e "Sair" é um botão do cabeçalho', async () => {
    await montar('/sobre', 'membro', 1440)

    expect(within(cabecalho()).getByRole('link', { name: 'Conta' }).getAttribute('href')).toBe('/app/conta')
    expect(within(cabecalho()).getByRole('button', { name: 'Sair' }).getAttribute('type')).toBe('button')
  })

  it.each(['/app/conta', '/app/familia', '/app/comecar', '/app/comunidade'])(
    'com sessão, %s tem exatamente um "Sair" na página, o do cabeçalho',
    async (caminho) => {
      await montar(caminho, 'membro', 1440)

      const sairs = screen.getAllByRole('button', { name: 'Sair' })
      expect(sairs).toHaveLength(1)
      expect(cabecalho().contains(sairs[0])).toBe(true)
    },
  )

  it('na Moderação, com sessão, também há um só "Sair" e nenhum "Entrar" nem "Criar conta"', async () => {
    await montar('/moderacao', 'moderador', 1440)

    expect(screen.getAllByRole('button', { name: 'Sair' })).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Criar conta' })).toBeNull()
  })

  it('a barra da página logada não tem mais "Conta" nem "Sair"; "Ir para o Hoje" continua', async () => {
    await montar('/app/familia', 'membro', 1440)

    const barra = within(screen.getByRole('navigation', { name: 'Conta' }))
    expect(barra.queryByRole('link', { name: 'Conta' })).toBeNull()
    expect(barra.queryByRole('button', { name: 'Sair' })).toBeNull()
    expect(barra.getByRole('link', { name: 'Ir para o Hoje' })).toBeTruthy()
  })
})

describe('o espaço da conta no menu, em 390', () => {
  it.each(CASOS)('%s em %s: o menu aberto traz os itens da sessão', async (quem, caminho) => {
    await montar(caminho, quem, 390)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    expect(leitura(painel())).toEqual(quem === 'nenhuma' ? VISITANTE : COM_SESSAO)
    expect(lua() !== null).toBe(quem !== 'nenhuma' && ROTINA.includes(caminho))
  })

  it('com sessão, o menu aberto tem um só "Sair" e ele fica depois dos links da navegação', async () => {
    await montar('/app/conta', 'membro', 390)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    expect(within(painel()).getAllByRole('button', { name: 'Sair' })).toHaveLength(1)
    const ordem = [...painel().querySelectorAll<HTMLElement>('a[href], button')]
    const posicaoDoSair = ordem.findIndex((item) => item.textContent === 'Sair')
    const posicaoDoUltimoLink = ordem.findLastIndex((item) => item.closest('.cm-menu-lista') !== null)
    expect(posicaoDoSair).toBeGreaterThan(posicaoDoUltimoLink)
  })
})

describe('enquanto a sessão carrega', () => {
  it.each([['/'], ['/sobre'], ['/app/conta']])('em %s, o cabeçalho não mostra visitante nem conta', async (caminho) => {
    renderizarRota(caminho, { sessao: 'juliana' })

    expect(leitura(cabecalho())).toEqual(NENHUM)
    expect(lua()).toBeNull()
    await aguardarCarga()
  })

  it('o conteúdo da página pública não espera a sessão', async () => {
    renderizarRota('/sobre', { sessao: 'juliana' })

    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(leitura(cabecalho())).toEqual(NENHUM)
    await aguardarCarga()
  })

  it('no menu aberto também não há visitante nem conta', async () => {
    fixarLargura(390)
    renderizarRota('/', { sessao: 'juliana' })
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    expect(leitura(painel())).toEqual(NENHUM)
    await aguardarCarga()
  })

  it('sem sessão, ao terminar de carregar, os links de visitante aparecem', async () => {
    renderizarRota('/', { sessao: null })
    expect(leitura(cabecalho())).toEqual(NENHUM)

    await aguardarCarga()

    expect(leitura(cabecalho())).toEqual(VISITANTE)
  })
})

describe('Sair no cabeçalho', () => {
  it('em uma página logada encerra a sessão e leva a /entrar com "Você saiu da conta."', async () => {
    const { roteador } = await montar('/app/conta', 'membro', 1440)

    fireEvent.click(within(cabecalho()).getByRole('button', { name: 'Sair' }))

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(roteador.state.location.pathname).toBe('/entrar')
    expect((await screen.findByRole('status')).textContent).toBe('Você saiu da conta.')
    expect(leitura(cabecalho())).toEqual(VISITANTE)
  })

  it('no menu de 390 também sai e leva a /entrar com "Você saiu da conta."', async () => {
    const { roteador } = await montar('/app/conta', 'membro', 390)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    fireEvent.click(within(painel()).getByRole('button', { name: 'Sair' }))

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(roteador.state.location.pathname).toBe('/entrar')
    expect((await screen.findByRole('status')).textContent).toBe('Você saiu da conta.')
  })

  it('numa página pública a pessoa continua nela, e o cabeçalho passa a mostrar os links de visitante', async () => {
    const { roteador } = await montar('/sobre', 'membro', 1440)

    fireEvent.click(within(cabecalho()).getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(leitura(cabecalho())).toEqual(VISITANTE))
    expect(roteador.state.location.pathname).toBe('/sobre')
  })

  it('se a saída falhar, a pessoa continua entrada e o cabeçalho mostra um alerta com "Tentar de novo"', async () => {
    const mundo = criarMundoDeTeste()
    simularFalha(mundo.conta, 'sair', 'rede')
    fixarLargura(1440)
    const { roteador } = renderizarRota('/app/conta', { mundo })
    await aguardarCarga()

    fireEvent.click(within(cabecalho()).getByRole('button', { name: 'Sair' }))

    const alerta = await within(cabecalho()).findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    expect(roteador.state.location.pathname).toBe('/app/conta')
    expect(leitura(cabecalho()).sair).toBe(true)

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect((await screen.findByRole('status')).textContent).toBe('Você saiu da conta.')
  })
})

describe('o menu de 390 é uma divulgação: o Tab sai do cabeçalho', () => {
  const focaveis = (raiz: HTMLElement) =>
    [...raiz.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')]

  const CENARIOS: Array<[string, Quem, string]> = [
    ['menu público', 'nenhuma', '/'],
    ['menu logado', 'membro', '/app/conta'],
  ]

  it.each(CENARIOS)('%s: o Tab no último item não é desviado pelo cabeçalho e o próximo focável é da página', async (_nome, quem, caminho) => {
    await montar(caminho, quem, 390)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const itens = focaveis(painel())
    const ultimo = itens[itens.length - 1]
    ultimo.focus()

    const seguiu = fireEvent.keyDown(ultimo, { key: 'Tab' })

    // `fireEvent` devolve false quando o ouvinte chamou preventDefault: o navegador não seguiu a ordem natural.
    expect(seguiu).toBe(true)
    expect(document.activeElement).toBe(ultimo)
    const todos = focaveis(document.body)
    const proximo = todos[todos.indexOf(ultimo) + 1]
    expect(proximo).toBeDefined()
    expect(cabecalho().contains(proximo)).toBe(false)
  })

  it.each(CENARIOS)('%s: o Shift+Tab no primeiro item não é desviado para o fim do cabeçalho', async (_nome, quem, caminho) => {
    await montar(caminho, quem, 390)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const primeiro = focaveis(painel())[0]
    primeiro.focus()

    const seguiu = fireEvent.keyDown(primeiro, { key: 'Tab', shiftKey: true })

    expect(seguiu).toBe(true)
    expect(document.activeElement).toBe(primeiro)
  })

  it.each(CENARIOS)('%s: abrir leva o foco ao primeiro item e o Esc fecha e devolve o foco ao botão Menu', async (_nome, quem, caminho) => {
    await montar(caminho, quem, 390)
    const botao = screen.getByRole('button', { name: 'Menu' })
    expect(botao.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(botao)
    expect(botao.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(focaveis(painel())[0])

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    expect(painel().hidden).toBe(true)
    expect(document.activeElement).toBe(botao)
  })

  it('o Esc também fecha com o foco no "Sair" do menu', async () => {
    await montar('/app/conta', 'membro', 390)
    const botao = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(botao)
    const sair = within(painel()).getByRole('button', { name: 'Sair' })
    sair.focus()

    fireEvent.keyDown(sair, { key: 'Escape' })

    expect(painel().hidden).toBe(true)
    expect(document.activeElement).toBe(botao)
  })
})
