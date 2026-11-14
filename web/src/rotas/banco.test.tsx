import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createClient } from '@supabase/supabase-js'
import { AVISO_BANCO_DEMONSTRACAO, NOMES_DO_H1, TEXTOS_ERRO } from '../conteudo/conta.ts'
import { criarRotas } from '../rotas.tsx'
import { CHAVE_RECUPERACAO } from '../componentes/conta/armazenamento.ts'
import { criarClienteFalso, USUARIO_FALSO } from '../teste/renderizarComDados.tsx'
import { comObrigatorio } from '../paginas/conta/obrigatorio.ts'

// Qual banco as telas de acesso usam, pelas variáveis VITE_SUPABASE_*: sem as duas, a memória (com
// o aviso da demonstração); com as duas, o banco (aqui, um cliente feito à mão, sem rede) e o aviso
// do banco de demonstração. O provedor de dados não é injetado: é a escolha real da página.

const falso = vi.hoisted(() => ({ cliente: null as unknown }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => falso.cliente) }))

const BANCO = '[data-aviso="banco-de-demonstracao"]'
const MEMORIA = '[data-aviso="demonstracao"]'

let rodada = 0

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.mocked(createClient).mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function proibirARede() {
  const fetchProibido = vi.fn(() => {
    throw new Error('o teste chamou a rede')
  })
  vi.stubGlobal('fetch', fetchProibido)
  return fetchProibido
}

/** Valores novos a cada teste: o cliente guardado por `cliente.ts` não se mistura entre eles. */
function definirBanco() {
  rodada += 1
  vi.stubEnv('VITE_SUPABASE_URL', `https://banco-${rodada}.invalid`)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', `chave-${rodada}`)
}

function abrir(caminho: string) {
  window.scrollTo = vi.fn()
  const roteador = createMemoryRouter(criarRotas(), { initialEntries: [caminho] })
  return { roteador, ...render(<RouterProvider router={roteador} />) }
}

const campo = (rotulo: string) => screen.getByLabelText(['Seu nome', 'E-mail', 'Senha'].includes(rotulo) ? comObrigatorio(rotulo) : rotulo, { selector: 'input' }) as HTMLInputElement
const digitar = (rotulo: string, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })

describe('sem as variáveis: a memória', () => {
  const casos: Array<[string, string | undefined, string | undefined]> = [
    ['as duas ausentes', undefined, undefined],
    ['as duas vazias', '', ''],
    ['só a URL', 'https://so-a-url.invalid', ''],
    ['só a chave', '', 'so-a-chave'],
  ]

  for (const [nome, url, chave] of casos) {
    it(`${nome}: /entrar e /criar-conta abrem, só o aviso da demonstração aparece e nada chama o cliente nem a rede`, async () => {
      const fetchProibido = proibirARede()
      vi.stubEnv('VITE_SUPABASE_URL', url)
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', chave)

      for (const [caminho, botao] of [
        ['/entrar', 'Entrar'],
        ['/criar-conta', 'Criar conta'],
      ]) {
        const { container, unmount } = abrir(caminho)
        expect(await screen.findByRole('button', { name: botao }), caminho).toBeTruthy()
        expect(container.querySelectorAll(MEMORIA), caminho).toHaveLength(1)
        expect(container.querySelectorAll(BANCO), caminho).toHaveLength(0)
        unmount()
      }
      expect(createClient).not.toHaveBeenCalled()
      expect(fetchProibido).not.toHaveBeenCalled()
    })
  }

  it('as duas só com espaços: a memória, sem createClient (o aviso da demonstração lê as variáveis sem tirar os espaços: ver o relatório)', async () => {
    proibirARede()
    vi.stubEnv('VITE_SUPABASE_URL', '   ')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '   ')

    const { container } = abrir('/entrar')
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy()
    expect(container.querySelectorAll(BANCO)).toHaveLength(0)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('criar uma conta funciona na memória e leva à área logada', async () => {
    proibirARede()
    const { roteador } = abrir('/criar-conta')
    await screen.findByRole('button', { name: 'Criar conta' })

    digitar('Seu nome', 'Nova')
    digitar('E-mail', 'nova-banco@exemplo.invalid')
    digitar('Senha', 'senha-nova')
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() => expect(roteador.state.location.pathname.startsWith('/app/')).toBe(true))
    expect(createClient).not.toHaveBeenCalled()
  })
})

describe('R1: com o banco, a recuperação de senha concluída não volta a abrir o formulário sem novo link', () => {
  const LINHA_CONTA = { id: USUARIO_FALSO.id, nome_privado: 'Juliana', fuso: 'America/Sao_Paulo', criada_em: '2026-10-01T10:00:00+00:00' }
  const campoDeSenha = (rotulo: string) => screen.getByLabelText(rotulo, { selector: 'input' }) as HTMLInputElement

  async function abrirComLinkDeRecuperacao() {
    proibirARede()
    const { cliente, auth, emitirAuth } = criarClienteFalso({ tabelas: { contas: [{ data: LINHA_CONTA, error: null }] } })
    falso.cliente = cliente
    definirBanco()
    const aberto = abrir('/redefinir-senha')
    await screen.findByText(TEXTOS_ERRO.link_vencido)

    // O Auth avisa que a pessoa chegou pelo link do e-mail.
    await act(async () => {
      emitirAuth('PASSWORD_RECOVERY', { user: USUARIO_FALSO })
    })
    await screen.findByLabelText('Nova senha', { selector: 'input' })
    return { ...aberto, auth }
  }

  function salvar(nova: string) {
    fireEvent.change(campoDeSenha('Nova senha'), { target: { value: nova } })
    fireEvent.change(campoDeSenha('Repetir a senha'), { target: { value: nova } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha' }))
  }

  it('concluir, ir a /app/hoje (fora do provedor) e voltar a /redefinir-senha mostra o link vencido, sem o campo de senha', async () => {
    const { roteador, auth } = await abrirComLinkDeRecuperacao()

    salvar('senha-nova')
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'senha-nova' })

    await act(async () => {
      await roteador.navigate('/app/hoje')
    })
    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    await act(async () => {
      await roteador.navigate('/redefinir-senha')
    })

    expect(await screen.findByText(TEXTOS_ERRO.link_vencido)).toBeTruthy()
    expect(screen.queryByLabelText('Nova senha')).toBeNull()
    expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBeNull()
  })

  it('sem concluir, sair da tela e voltar (ou recarregar a aba) ainda mostra o formulário', async () => {
    const { roteador } = await abrirComLinkDeRecuperacao()

    await act(async () => {
      await roteador.navigate('/app/hoje')
    })
    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    await act(async () => {
      await roteador.navigate('/redefinir-senha')
    })

    expect(await screen.findByLabelText('Nova senha', { selector: 'input' })).toBeTruthy()
  })

  const MESMA_SENHA = {
    data: { user: null },
    error: { name: 'AuthApiError', code: 'same_password', status: 422, message: 'same_password' },
  }

  async function irEVoltarARedefinir(roteador: ReturnType<typeof abrir>['roteador']) {
    await act(async () => {
      await roteador.navigate('/app/hoje')
    })
    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    await act(async () => {
      await roteador.navigate('/redefinir-senha')
    })
  }

  it('resposta perdida (rede) e "Tentar de novo" com same_password conclui: sem formulário nem marca ao voltar a /redefinir-senha', async () => {
    const { roteador, auth } = await abrirComLinkDeRecuperacao()
    // A primeira chamada chega ao Auth e grava a senha, mas a resposta se perde; a repetição
    // responde que a senha já é a nova.
    auth.updateUser.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(MESMA_SENHA)

    salvar('senha-nova')
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))

    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Senha trocada.'))
    expect(auth.updateUser).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBeNull())

    await irEVoltarARedefinir(roteador)

    expect(await screen.findByText(TEXTOS_ERRO.link_vencido)).toBeTruthy()
    expect(screen.queryByLabelText('Nova senha')).toBeNull()
    expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBeNull()
  })

  it('senha_igual já na primeira tentativa: erro no campo, o formulário continua, a marca continua e o link ainda vale', async () => {
    const { roteador, auth } = await abrirComLinkDeRecuperacao()
    auth.updateUser.mockResolvedValueOnce(MESMA_SENHA)

    salvar('senha-nova')
    await waitFor(() => expect(campoDeSenha('Nova senha').getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByText(TEXTOS_ERRO.senha_igual)).toBeTruthy()
    expect(roteador.state.location.pathname).toBe('/redefinir-senha')
    expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBe(USUARIO_FALSO.id)

    await irEVoltarARedefinir(roteador)

    expect(await screen.findByLabelText('Nova senha', { selector: 'input' })).toBeTruthy()
    expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBe(USUARIO_FALSO.id)
  })

  it('resposta perdida e depois sucesso direto também fecha o link', async () => {
    const { roteador, auth } = await abrirComLinkDeRecuperacao()
    auth.updateUser.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    salvar('senha-nova')
    const alerta = await screen.findByRole('alert')
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    await irEVoltarARedefinir(roteador)

    expect(await screen.findByText(TEXTOS_ERRO.link_vencido)).toBeTruthy()
    expect(screen.queryByLabelText('Nova senha')).toBeNull()
  })

  it('a troca recusada pelo Auth mantém o formulário e não consome o replay', async () => {
    const { roteador, auth } = await abrirComLinkDeRecuperacao()
    auth.updateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { name: 'AuthApiError', code: 'weak_password', status: 422, message: 'x' },
    })

    salvar('abc')
    await waitFor(() => expect(campoDeSenha('Nova senha').getAttribute('aria-invalid')).toBe('true'))
    expect(roteador.state.location.pathname).toBe('/redefinir-senha')

    await act(async () => {
      await roteador.navigate('/app/hoje')
    })
    await screen.findByRole('heading', { level: 1, name: 'Hoje' })
    await act(async () => {
      await roteador.navigate('/redefinir-senha')
    })
    expect(await screen.findByLabelText('Nova senha', { selector: 'input' })).toBeTruthy()
  })
})

describe('com as duas variáveis (cliente falso): o banco', () => {
  it('/entrar e /criar-conta usam o cliente, mostram só o aviso do banco de demonstração e não chamam a rede', async () => {
    const fetchProibido = proibirARede()
    const { cliente, auth } = criarClienteFalso({ usuario: null })
    falso.cliente = cliente
    definirBanco()

    // O aviso do banco de demonstração é só de /criar-conta; o da memória some nas duas telas.
    for (const [caminho, botao, avisosDoBanco] of [
      ['/entrar', 'Entrar', 0],
      ['/criar-conta', 'Criar conta', 1],
    ] as const) {
      const { container, unmount } = abrir(caminho)
      expect(await screen.findByRole('button', { name: botao }), caminho).toBeTruthy()
      expect(container.querySelectorAll(BANCO), caminho).toHaveLength(avisosDoBanco)
      if (avisosDoBanco) expect(container.querySelector(BANCO)?.textContent, caminho).toBe(AVISO_BANCO_DEMONSTRACAO)
      expect(container.querySelectorAll(MEMORIA), caminho).toHaveLength(0)
      unmount()
    }
    expect(createClient).toHaveBeenCalledTimes(1)
    expect(auth.getSession).toHaveBeenCalled()
    expect(fetchProibido).not.toHaveBeenCalled()
  })

  it('/entrar manda o e-mail e a senha ao Auth do cliente, e um erro dele vira a frase da tela', async () => {
    proibirARede()
    const { cliente, auth } = criarClienteFalso({ usuario: null })
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' },
    })
    falso.cliente = cliente
    definirBanco()
    abrir('/entrar')
    await screen.findByRole('button', { name: 'Entrar' })

    digitar('E-mail', 'juliana@exemplo.invalid')
    digitar('Senha', 'senha-errada')
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect((await screen.findByRole('alert')).textContent).toContain(TEXTOS_ERRO.credenciais)
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'juliana@exemplo.invalid', password: 'senha-errada' })
  })

  it('uma sessão vencida no banco leva uma área logada a /entrar, e a rede que cai mostra o erro com "Tentar de novo"', async () => {
    proibirARede()
    const vencida = criarClienteFalso()
    vencida.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthApiError', code: 'session_expired', status: 403, message: 'sessao do teste' },
    })
    falso.cliente = vencida.cliente
    definirBanco()
    const primeira = abrir('/app/conta')
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })
    expect(screen.getByRole('status').textContent).toBe(TEXTOS_ERRO.sessao_encerrada)
    primeira.unmount()

    const semRede = criarClienteFalso()
    semRede.auth.getSession.mockRejectedValue(new TypeError('Failed to fetch'))
    falso.cliente = semRede.cliente
    definirBanco()
    abrir('/app/conta')
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })
})
