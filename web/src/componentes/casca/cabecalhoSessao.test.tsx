import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvedorDadosConta } from '../conta/sessao.tsx'
import { ProvedorDadosRotina } from '../rotina/dadosRotina.tsx'
import { NOMES_DO_H1, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria, type EstadoComunidade } from '../../dados/comunidade.memoria.ts'
import { ProvedorDadosComunidade } from '../../dados/comunidade.ts'
import { simularFalha } from '../../dados/conta.memoria.ts'
import { criarDadosModeracaoMemoria } from '../../dados/moderacao.memoria.ts'
import { ProvedorDadosModeracao } from '../../dados/moderacao.ts'
import { criarRotas } from '../../rotas.tsx'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
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

// O site real com os quatro provedores (conta, rotina, Comunidade e moderação), todos em memória. A pessoa
// entrada é sempre a Juliana (conta completa, com família): o membro não tem papel na plataforma, o
// moderador tem o papel `moderador` (por isso as telas do app abrem para os dois no mesmo caminho).
function renderizar(caminho: string, quem: Quem) {
  const mundo = criarMundoDeTeste({ sessao: quem === 'nenhuma' ? null : 'juliana' })
  const juliana = PESSOAS.juliana.id
  const elenco = criarElenco()
  const estado: EstadoComunidade = {
    ...elenco,
    contas: [...elenco.contas, juliana],
    papeis:
      quem === 'moderador'
        ? [...elenco.papeis, { contaId: juliana, papel: 'moderador', concedidoPor: null, concedidoEm: new Date().toISOString(), validoAte: null }]
        : elenco.papeis,
  }
  vi.stubGlobal('scrollTo', vi.fn())
  const roteador = createMemoryRouter(criarRotas(), { initialEntries: [caminho] })
  const resultado = render(
    <ProvedorDadosConta dados={mundo.conta}>
      <ProvedorDadosRotina dados={mundo.rotina}>
        <ProvedorDadosComunidade dados={criarDadosComunidadeMemoria(estado, juliana)}>
          <ProvedorDadosModeracao dados={criarDadosModeracaoMemoria(estado, juliana)}>
            <RouterProvider router={roteador} />
          </ProvedorDadosModeracao>
        </ProvedorDadosComunidade>
      </ProvedorDadosRotina>
    </ProvedorDadosConta>,
  )
  return { ...resultado, roteador }
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

// A matriz A-F1-1: toda rota × toda pessoa (ninguém, membro, moderador) × as duas larguras. Cada rota tem um tipo:
// pública (abre para todos), da Rotina (a lua vive nela), do app (logada, sem lua) e da Moderação (logada, só
// abre para quem tem papel). Quem não tem sessão é levado pela guarda a `/entrar?volta=<caminho>`; o membro na
// Moderação fica no mesmo caminho, com o estado "sem permissão" (o painel não redireciona).
type Tipo = 'publica' | 'rotina' | 'app' | 'moderacao'

const ROTAS: Array<[string, Tipo]> = [
  ['/', 'publica'],
  ['/desenvolvimento', 'publica'],
  ['/app/hoje', 'rotina'],
  ['/app/sessao', 'rotina'],
  ['/app/historico', 'rotina'],
  ['/app/lixeira', 'rotina'],
  ['/app/notas', 'rotina'],
  ['/app/registro/novo', 'rotina'],
  ['/app/comunidade', 'app'],
  ['/app/desenvolvimento', 'app'],
  ['/app/familia', 'app'],
  ['/app/conta', 'app'],
  ['/app/comecar', 'app'],
  ['/moderacao', 'moderacao'],
  ['/moderacao/auditoria', 'moderacao'],
]
const PESSOAS_DA_MATRIZ: Quem[] = ['nenhuma', 'membro', 'moderador']

const CASOS: Array<[Quem, string, Tipo]> = PESSOAS_DA_MATRIZ.flatMap((quem) =>
  ROTAS.map(([caminho, tipo]): [Quem, string, Tipo] => [quem, caminho, tipo]),
)

const TEMPO_DA_MATRIZ = 15_000

/** Onde a pessoa termina: a guarda leva quem não tem sessão de uma página logada a /entrar. */
function destinoDe(quem: Quem, caminho: string, tipo: Tipo): string {
  return tipo !== 'publica' && quem === 'nenhuma' ? '/entrar' : caminho
}

/** O que a matriz confere fora do cabeçalho: o destino e, na Moderação, o estado "sem permissão". */
async function conferirDestino(roteador: { state: { location: { pathname: string; search: string } } }, quem: Quem, caminho: string, tipo: Tipo) {
  // A guarda navega depois da leitura da sessão: espera o destino antes de olhar o cabeçalho (ou abrir o menu).
  await waitFor(() => expect(roteador.state.location.pathname).toBe(destinoDe(quem, caminho, tipo)))
  await aguardarCarga()
  if (tipo !== 'publica' && quem === 'nenhuma') {
    expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent(caminho)}`)
  }
  if (tipo === 'moderacao' && quem === 'membro') {
    await waitFor(() => expect(document.querySelector('[data-estado="sem-permissao"]')).not.toBeNull())
  }
  if (tipo === 'moderacao' && quem === 'moderador') {
    expect(document.querySelector('[data-estado="sem-permissao"]')).toBeNull()
  }
}

/** Onde o cabeçalho mostra a lua: só nas páginas da Rotina, e só para quem chega a elas. */
const comLuaEsperada = (quem: Quem, tipo: Tipo) => tipo === 'rotina' && quem !== 'nenhuma'

describe('o espaço da conta no cabeçalho, em 1440', () => {
  it.each(CASOS)(
    '%s em %s (%s): os itens seguem a sessão, o destino é o esperado e a lua só vive na Rotina',
    async (quem, caminho, tipo) => {
      const { roteador } = await montar(caminho, quem, 1440)

      await conferirDestino(roteador, quem, caminho, tipo)
      expect(leitura(cabecalho())).toEqual(quem === 'nenhuma' ? VISITANTE : COM_SESSAO)
      expect(lua() !== null).toBe(comLuaEsperada(quem, tipo))
    },
    TEMPO_DA_MATRIZ,
  )

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
  it.each(CASOS)(
    '%s em %s (%s): o menu aberto traz os itens da sessão, o destino é o esperado e a lua só vive na Rotina',
    async (quem, caminho, tipo) => {
      const { roteador } = await montar(caminho, quem, 390)
      await conferirDestino(roteador, quem, caminho, tipo)
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

      expect(leitura(painel())).toEqual(quem === 'nenhuma' ? VISITANTE : COM_SESSAO)
      expect(lua() !== null).toBe(comLuaEsperada(quem, tipo))
    },
    TEMPO_DA_MATRIZ,
  )

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

// QA-03 (D3): "visitante" é só a ausência de usuário. Com a sessão válida e a leitura da conta falhando (o estado
// `erro` da sessão, com o usuário conhecido), a pessoa continua entrada: "Conta" e "Sair", nunca "Entrar".
describe('com a sessão válida e a leitura da conta falhando', () => {
  function comFalhaNaConta() {
    const mundo = criarMundoDeTeste()
    simularFalha(mundo.conta, 'minhaConta', 'rede')
    return mundo
  }

  it('em /sobre, a 1440: Conta e Sair no cabeçalho, sem Entrar nem "Criar conta"', async () => {
    fixarLargura(1440)
    renderizarRota('/sobre', { mundo: comFalhaNaConta() })
    await aguardarCarga()

    expect(leitura(cabecalho())).toEqual(COM_SESSAO)
    expect(lua()).toBeNull()
  })

  it('em /sobre, a 390: o menu aberto traz Conta e Sair, sem Entrar nem "Criar conta"', async () => {
    fixarLargura(390)
    renderizarRota('/sobre', { mundo: comFalhaNaConta() })
    await aguardarCarga()
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    expect(leitura(painel())).toEqual(COM_SESSAO)
  })

  it('Sair continua sendo uma saída pedida: em /app/conta leva a /entrar com "Você saiu da conta."', async () => {
    fixarLargura(1440)
    const { roteador } = renderizarRota('/app/conta', { mundo: comFalhaNaConta() })
    await aguardarCarga()
    expect(leitura(cabecalho())).toEqual(COM_SESSAO)

    fireEvent.click(within(cabecalho()).getByRole('button', { name: 'Sair' }))

    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(roteador.state.location.pathname).toBe('/entrar')
    expect((await screen.findByRole('status')).textContent).toBe('Você saiu da conta.')
    expect(leitura(cabecalho())).toEqual(VISITANTE)
  })

  it('controle: sem sessão nenhuma, /sobre mostra Entrar e "Criar conta" (a leitura da sessão não falhou)', async () => {
    fixarLargura(1440)
    renderizarRota('/sobre', { sessao: null })
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
