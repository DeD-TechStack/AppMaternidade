import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createBrowserRouter, createMemoryRouter, RouterProvider } from 'react-router'
import { ProvedorDadosConta } from '../../componentes/conta/sessao.tsx'
import { LOGIN_GOOGLE, TEXTOS_ERRO, TITULOS } from '../../conteudo/conta.ts'
import type { Resultado } from '../../dados/comum.ts'
import { SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarDadosContaSupabase } from '../../dados/conta.supabase.ts'
import { criarClienteFalso, criarFixtureDeTeste, renderizarComDados, USUARIO_FALSO } from '../../teste/renderizarComDados.tsx'
import { criarRotasProntas } from '../../teste/rotasProntas.ts'

// "Entrar com Google" em /entrar e /criar-conta (OAuth do Supabase, PKCE): o botão só existe com
// banco; o clique pede o login ao banco uma vez, com o retorno sob a base do site; e o erro que o
// Supabase põe na URL ao voltar aparece com a frase do catálogo, nunca com o texto cru. Sem rede:
// a memória é injetada e `entrarComGoogle` é um espião.

const BASE = `${window.location.origin}${import.meta.env.BASE_URL}`
const TELAS = ['/entrar', '/criar-conta'] as const
const ERRO_DA_URL =
  'error=access_denied&error_code=bad_oauth_callback&error_description=Texto+cru+do+provedor'

const criarCliente = vi.hoisted(() => vi.fn())
vi.mock('@supabase/supabase-js', () => ({ createClient: criarCliente }))

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function comBanco() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('o teste chamou a rede')
    }),
  )
  vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-ficticia')
}

type RespostaDoLogin = Resultado<null> | Promise<Resultado<null>>

/** A memória dos testes, com `entrarComGoogle` espiado (nada vai à rede). */
function memoriaComEspiao(resposta: RespostaDoLogin = { ok: true, valor: null }) {
  const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  const espiao = vi.spyOn(dados, 'entrarComGoogle').mockImplementation(() => Promise.resolve(resposta))
  return { dados, espiao }
}

const botaoGoogle = () => screen.queryByRole('button', { name: LOGIN_GOOGLE.botao })
const area = (container: HTMLElement) => container.querySelector('[data-area="login-social"]')
const textoDaPagina = () => document.body.textContent ?? ''

describe('com banco: o botão', () => {
  for (const tela of TELAS) {
    it(`${tela}: aparece na área do login social, acima do formulário, e o envio do formulário segue o principal`, async () => {
      comBanco()
      const { dados } = memoriaComEspiao()
      const { container } = renderizarComDados(tela, { dados })
      const botao = await screen.findByRole('button', { name: 'Entrar com Google' })
      expect(area(container)!.contains(botao)).toBe(true)
      expect(botao.getAttribute('type')).toBe('button')
      const formulario = container.querySelector('form')!
      expect(botao.compareDocumentPosition(formulario) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(formulario.contains(botao)).toBe(false)
      // O envio do formulário é a ação principal; o do Google é o secundário.
      const envio = within(formulario).getByRole('button', { name: tela === '/entrar' ? 'Entrar' : 'Criar conta' })
      expect(envio.className).toContain('cm-botao-primario')
      expect(botao.className).toContain('cm-botao-contorno')
      // O separador é texto, sem controle.
      const separador = within(area(container) as HTMLElement).getByText(LOGIN_GOOGLE.ou)
      expect(separador.closest('button, a, input')).toBeNull()
    })

    it(`${tela}: o clique pede o login uma vez, com o retorno em ${BASE}entrar`, async () => {
      comBanco()
      const { dados, espiao } = memoriaComEspiao()
      renderizarComDados(tela, { dados })
      fireEvent.click(await screen.findByRole('button', { name: 'Entrar com Google' }))
      await waitFor(() => expect(espiao).toHaveBeenCalledTimes(1))
      expect(espiao).toHaveBeenCalledWith(`${BASE}entrar`)
    })

    it(`${tela}: o volta válido viaja no retorno; um volta inválido é ignorado`, async () => {
      comBanco()
      const valido = memoriaComEspiao()
      const primeira = renderizarComDados(`${tela}?volta=%2Fapp%2Fhoje`, { dados: valido.dados })
      fireEvent.click(await screen.findByRole('button', { name: 'Entrar com Google' }))
      await waitFor(() => expect(valido.espiao).toHaveBeenCalledTimes(1))
      expect(valido.espiao).toHaveBeenCalledWith(`${BASE}entrar?volta=%2Fapp%2Fhoje`)
      primeira.unmount()

      const invalido = memoriaComEspiao()
      renderizarComDados(`${tela}?volta=https%3A%2F%2Fmal.invalid%2F`, { dados: invalido.dados })
      fireEvent.click(await screen.findByRole('button', { name: 'Entrar com Google' }))
      await waitFor(() => expect(invalido.espiao).toHaveBeenCalledTimes(1))
      expect(invalido.espiao).toHaveBeenCalledWith(`${BASE}entrar`)
    })

    it(`${tela}: em andamento, o botão e o envio do formulário ficam travados e dizem "Abrindo o Google…"`, async () => {
      comBanco()
      let liberar!: (resultado: Resultado<null>) => void
      const pendente = new Promise<Resultado<null>>((resolver) => {
        liberar = resolver
      })
      const { dados, espiao } = memoriaComEspiao(pendente)
      const { container } = renderizarComDados(tela, { dados })
      fireEvent.click(await screen.findByRole('button', { name: 'Entrar com Google' }))

      const ocupado = (await screen.findByRole('button', { name: LOGIN_GOOGLE.abrindo })) as HTMLButtonElement
      expect(ocupado.disabled).toBe(true)
      expect(ocupado.getAttribute('aria-busy')).toBe('true')
      const envio = container.querySelector('form button[type="submit"]') as HTMLButtonElement
      expect(envio.disabled).toBe(true)
      fireEvent.click(ocupado)
      expect(espiao).toHaveBeenCalledTimes(1)

      await act(async () => liberar({ ok: true, valor: null }))
      await waitFor(() => expect(botaoGoogle()).not.toBeNull())
    })

    it(`${tela}: o erro do clique usa o catálogo, leva o foco ao resumo e deixa tentar de novo`, async () => {
      comBanco()
      const { dados, espiao } = memoriaComEspiao({ ok: false, erro: erroDaChave('rede') })
      renderizarComDados(tela, { dados })
      fireEvent.click(await screen.findByRole('button', { name: 'Entrar com Google' }))

      const alerta = await screen.findByRole('alert')
      expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
      await waitFor(() => expect(document.activeElement).toBe(alerta))
      expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
      expect((botaoGoogle() as HTMLButtonElement).disabled).toBe(false)

      fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
      await waitFor(() => expect(espiao).toHaveBeenCalledTimes(2))
    })

    it(`${tela}: um erro sem linha própria no catálogo mostra a frase de "desconhecido", sem o texto original`, async () => {
      comBanco()
      const erro = { ...erroDaChave('desconhecido'), mensagemOriginal: 'segredo do provedor' }
      const { dados } = memoriaComEspiao({ ok: false, erro })
      renderizarComDados(tela, { dados })
      fireEvent.click(await screen.findByRole('button', { name: 'Entrar com Google' }))
      const alerta = await screen.findByRole('alert')
      expect(alerta.textContent).toContain(TEXTOS_ERRO.desconhecido)
      expect(textoDaPagina()).not.toContain('segredo do provedor')
    })
  }
})

describe('modo demonstração (sem banco): o botão não existe', () => {
  for (const tela of TELAS) {
    it(`${tela}: nem o botão, nem a área, nem o separador, e o formulário segue igual`, async () => {
      const { container } = renderizarComDados(tela)
      await screen.findByRole('button', { name: tela === '/entrar' ? 'Entrar' : 'Criar conta' })
      expect(botaoGoogle()).toBeNull()
      expect(screen.queryByRole('button', { name: LOGIN_GOOGLE.abrindo })).toBeNull()
      expect(area(container)).toBeNull()
      expect(textoDaPagina()).not.toContain('Google')
      expect(textoDaPagina()).not.toContain(LOGIN_GOOGLE.ou)
    })

    it(`${tela}: um erro de OAuth na URL não mostra a frase do Google quando não há banco`, async () => {
      renderizarComDados(`${tela}?${ERRO_DA_URL}`)
      await screen.findByRole('heading', { level: 1 })
      expect(textoDaPagina()).not.toContain(TEXTOS_ERRO.login_google)
      expect(textoDaPagina()).not.toContain(TEXTOS_ERRO.login_google_cancelado)
      expect(textoDaPagina()).not.toContain('Texto cru')
    })
  }

  // "Explorar a demonstração" (cartão t_e4c70309) não existe nesta base: o que vale aqui é o que existe.
  // Sem as variáveis do banco o site fica em memória: sem botão do Google, e o formulário de demonstração segue igual.
  it('/entrar sem as variáveis do banco: sem Google, e o login de demonstração (memória) funciona como sempre', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    const { roteador } = renderizarComDados('/entrar')
    fireEvent.change(await screen.findByLabelText(/^E-mail/, { selector: 'input' }), { target: { value: 'juliana@exemplo.invalid' } })
    fireEvent.change(screen.getByLabelText(/^Senha/, { selector: 'input' }), { target: { value: SENHA_DEMONSTRACAO } })
    expect(botaoGoogle()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/app/familia'), { timeout: 3000 })
  })

  it('com as variáveis do banco o botão aparece nas duas telas (e só então)', async () => {
    comBanco()
    for (const tela of TELAS) {
      const { unmount } = renderizarComDados(tela)
      expect(await screen.findByRole('button', { name: 'Entrar com Google' })).toBeTruthy()
      unmount()
    }
    vi.unstubAllEnvs()
    for (const tela of TELAS) {
      const { unmount } = renderizarComDados(tela)
      await screen.findByRole('heading', { level: 1 })
      expect(botaoGoogle()).toBeNull()
      unmount()
    }
  })
})

describe('com banco: o erro que o Supabase põe na URL ao voltar', () => {
  const CANCELADO = TEXTOS_ERRO.login_google_cancelado
  const GERAL = TEXTOS_ERRO.login_google
  const FORMAS: Array<[string, (tela: string) => string, string]> = [
    ['access_denied na busca', (tela) => `${tela}?${ERRO_DA_URL}`, CANCELADO],
    ['access_denied no fragmento', (tela) => `${tela}#${ERRO_DA_URL}`, CANCELADO],
    ['access_denied na busca, junto do volta', (tela) => `${tela}?volta=%2Fapp%2Fhoje&${ERRO_DA_URL}`, CANCELADO],
    ['erro desconhecido na busca', (tela) => `${tela}?error=server_error&error_description=boom`, GERAL],
    ['erro desconhecido no fragmento', (tela) => `${tela}#error=server_error&error_description=boom`, GERAL],
    ['só o código do erro', (tela) => `${tela}?error_code=unexpected_failure`, GERAL],
    ['só o erro, sem descrição', (tela) => `${tela}?error=server_error`, GERAL],
  ]

  for (const tela of TELAS) {
    for (const [forma, caminho, frase] of FORMAS) {
      it(`${tela}, ${forma}: mostra a frase do catálogo, com o foco nela, e nunca o texto cru`, async () => {
        comBanco()
        const { dados } = memoriaComEspiao()
        renderizarComDados(caminho(tela), { dados })
        const alerta = await screen.findByRole('alert')
        expect(alerta.textContent).toBe(frase)
        await waitFor(() => expect(document.activeElement).toBe(alerta))
        for (const cru of ['Texto cru', 'boom', 'access_denied', 'bad_oauth_callback', 'server_error', 'unexpected_failure', 'error_description']) {
          expect(textoDaPagina(), cru).not.toContain(cru)
        }
        // O botão continua ali, para tentar de novo.
        expect(botaoGoogle()).not.toBeNull()
      })
    }

    it(`${tela}: sem erro na URL não há alerta, e ?code= de uma volta com sucesso também não`, async () => {
      comBanco()
      const { dados } = memoriaComEspiao()
      renderizarComDados(`${tela}?code=abc123`, { dados })
      await screen.findByRole('button', { name: 'Entrar com Google' })
      expect(screen.queryByRole('alert')).toBeNull()
    })
  }

  it('as duas frases são as do pedido, e cada uma tem a sua linha no catálogo', () => {
    expect(TEXTOS_ERRO.login_google).toBe('Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha.')
    expect(TEXTOS_ERRO.login_google_cancelado).toBe('Você cancelou a entrada com o Google. Se quiser, tente de novo ou use e-mail e senha.')
  })

  it('o clique no botão depois do erro segue o fluxo normal e pede o login de novo', async () => {
    comBanco()
    const { dados, espiao } = memoriaComEspiao()
    renderizarComDados(`/entrar?${ERRO_DA_URL}`, { dados })
    fireEvent.click(await screen.findByRole('button', { name: 'Entrar com Google' }))
    await waitFor(() => expect(espiao).toHaveBeenCalledTimes(1))
  })
})

describe('depois da volta, o endereço fica limpo', () => {
  const BASE = import.meta.env.BASE_URL
  const inicio = window.location.href
  let roteadorAberto: ReturnType<typeof createBrowserRouter> | null = null

  afterEach(() => {
    roteadorAberto?.dispose()
    roteadorAberto = null
    window.history.replaceState(null, '', inicio)
  })

  const abrir = (tela: string, resto: string, dados = memoriaComEspiao().dados) => {
    vi.stubGlobal('scrollTo', vi.fn())
    window.history.replaceState(null, '', `${BASE}${tela.slice(1)}${resto}`)
    const roteador = createBrowserRouter(criarRotasProntas(), { basename: BASE })
    roteadorAberto = roteador
    render(
      <ProvedorDadosConta dados={dados}>
        <RouterProvider router={roteador} />
      </ProvedorDadosConta>,
    )
    return roteador
  }

  for (const tela of TELAS) {
    it(`${tela}: consome o retorno no roteador e a mensagem não volta depois de tentar de novo`, async () => {
      comBanco()
      const { dados, espiao } = memoriaComEspiao()
      const sufixo = `?${ERRO_DA_URL}&volta=/app/hoje&outro=1#detalhes`
      const antes = window.history.length
      const roteador = abrir(tela, sufixo, dados)
      const alerta = await screen.findByRole('alert')
      await waitFor(() => {
        expect(roteador.state.location.search).toBe('?volta=/app/hoje&outro=1')
        expect(window.location.search).toBe('?volta=/app/hoje&outro=1')
        expect(document.activeElement).toBe(alerta)
      })
      expect(roteador.state.location.hash).toBe('#detalhes')
      expect(window.history.length).toBe(antes)
      expect(alerta.textContent).toBe(TEXTOS_ERRO.login_google_cancelado)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: LOGIN_GOOGLE.botao }))
      })
      expect(espiao).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.getByRole('button', { name: LOGIN_GOOGLE.botao })).toBeTruthy()

      await act(async () => { await roteador.navigate('/recuperar-acesso') })
      await act(async () => { await roteador.navigate(-1) })
      await screen.findByRole('button', { name: LOGIN_GOOGLE.botao })
      expect(roteador.state.location.search).toBe('?volta=/app/hoje&outro=1')
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it(`${tela}: falha da sessão suspende as duas formas de entrada até a releitura`, async () => {
      comBanco()
      const { dados, espiao } = memoriaComEspiao()
      vi.spyOn(dados, 'sessaoAtual').mockResolvedValueOnce({ ok: false, erro: erroDaChave('rede') })
      const { container } = renderizarComDados(`${tela}?${ERRO_DA_URL}`, { dados })
      const repetir = await screen.findByRole('button', { name: 'Tentar de novo' })
      expect(screen.getByRole('alert').textContent).toContain(TEXTOS_ERRO.rede)
      expect(botaoGoogle()).toBeNull()
      expect(container.querySelector('form')).toBeNull()
      expect(espiao).not.toHaveBeenCalled()

      fireEvent.click(repetir)
      await screen.findByRole('button', { name: LOGIN_GOOGLE.botao })
      await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(TEXTOS_ERRO.login_google_cancelado))
      expect(container.querySelector('form')).not.toBeNull()
      expect(document.activeElement).toBe(screen.getByRole('alert'))
    })

    it(`${tela}: ?code= e o fragmento com tokens somem, o volta fica, e o histórico não ganha entrada`, async () => {
      comBanco()
      const antes = window.history.length
      abrir(tela, '?code=x&volta=/app/hoje#access_token=a&refresh_token=b&token_type=bearer')
      await screen.findByRole('button', { name: 'Entrar com Google' })

      await waitFor(() => expect(window.location.hash).toBe(''))
      expect(window.location.pathname).toBe(`${BASE}${tela.slice(1)}`)
      expect(window.location.search).toBe('?volta=/app/hoje')
      expect(window.location.href).not.toMatch(/code=|access_token|refresh_token|token_type/)
      expect(window.history.length).toBe(antes)
    })

    it(`${tela}: o erro da volta é mostrado e, em seguida, sai da barra de endereço (sem o texto cru)`, async () => {
      comBanco()
      const antes = window.history.length
      abrir(tela, '?volta=/app/hoje&error=server_error&error_code=unexpected_failure&error_description=boom')

      // O erro é lido da URL antes da limpeza: a frase continua na tela depois dela.
      const alerta = await screen.findByRole('alert')
      await waitFor(() => expect(window.location.search).toBe('?volta=/app/hoje'))
      expect(alerta.textContent).toBe(TEXTOS_ERRO.login_google)
      expect(screen.getByRole('alert').textContent).toBe(TEXTOS_ERRO.login_google)
      expect(window.location.href).not.toMatch(/error|boom/)
      expect(window.history.length).toBe(antes)
    })

    it(`${tela}: um erro no fragmento também é lido e limpo`, async () => {
      comBanco()
      abrir(tela, '#error=access_denied&error_code=bad_oauth_callback&error_description=boom')

      expect((await screen.findByRole('alert')).textContent).toBe(TEXTOS_ERRO.login_google_cancelado)
      await waitFor(() => expect(window.location.hash).toBe(''))
    })
  }
})

describe('SDK Supabase instalado, OAuth PKCE sem rede', () => {
  const inicio = window.location.href

  afterEach(() => {
    window.history.replaceState(null, '', inicio)
  })

  it.each(['access_denied', 'server_error'])('o SDK lê %s e a tela consome a mensagem antes de uma tentativa explícita', async (codigo) => {
    comBanco()
    vi.stubGlobal('scrollTo', vi.fn())
    const rede = vi.fn<typeof fetch>(() => { throw new Error('Rede proibida neste teste') })
    const { createClient: criarSdk } = await vi.importActual<typeof import('@supabase/supabase-js')>('@supabase/supabase-js')
    const base = import.meta.env.BASE_URL
    const estadoDaEntrada = { origem: 'fixture' }
    window.history.replaceState({ usr: estadoDaEntrada, key: 'sdk-teste', idx: 0 }, '', `${base}entrar?volta=/app/conta&error=${codigo}`)
    const entradas = window.history.length
    const sdk = criarSdk('https://oauth.exemplo.invalid', 'chave-ficticia', {
      auth: { flowType: 'pkce', detectSessionInUrl: true, autoRefreshToken: false, persistSession: false, storageKey: `sdk-teste-${codigo}` },
      global: { fetch: rede },
    })
    const original = sdk.auth.signInWithOAuth.bind(sdk.auth)
    const oauth = vi.spyOn(sdk.auth, 'signInWithOAuth').mockImplementation((pedido) =>
      original({ ...pedido, options: { ...pedido.options, skipBrowserRedirect: true } }),
    )
    const roteador = createBrowserRouter(criarRotasProntas(), { basename: base })
    const substituir = vi.spyOn(window.history, 'replaceState')
    try {
      const { error } = await sdk.auth.initialize()
      expect(error).toMatchObject({ name: 'AuthImplicitGrantRedirectError', details: { error: codigo } })
      render(
        <ProvedorDadosConta dados={criarDadosContaSupabase(sdk)}>
          <RouterProvider router={roteador} />
        </ProvedorDadosConta>,
      )
      const alerta = await screen.findByRole('alert')
      expect(alerta.textContent).toBe(codigo === 'access_denied' ? TEXTOS_ERRO.login_google_cancelado : TEXTOS_ERRO.login_google)
      expect(document.activeElement).toBe(alerta)
      expect(roteador.state.location.search).toBe('?volta=/app/conta')
      expect(window.location.search).toBe('?volta=/app/conta')
      expect(roteador.state.location.pathname).toBe(`${base}entrar`)
      expect(roteador.state.location.state).toEqual(estadoDaEntrada)
      expect(window.history.length).toBe(entradas)
      expect(substituir).toHaveBeenCalledTimes(1)
      expect(oauth).not.toHaveBeenCalled()

      await act(async () => { fireEvent.click(screen.getByRole('button', { name: LOGIN_GOOGLE.botao })) })
      expect(oauth).toHaveBeenCalledExactlyOnceWith({
        provider: 'google',
        options: { redirectTo: `${BASE}entrar?volta=%2Fapp%2Fconta`, queryParams: { prompt: 'select_account' } },
      })
      const resultado = await oauth.mock.results[0].value
      expect(resultado.error).toBeNull()
      const pedido = new URL(resultado.data.url!)
      expect(pedido.searchParams.get('prompt')).toBe('select_account')
      expect(pedido.searchParams.has('code_challenge')).toBe(true)
      expect(screen.queryByRole('alert')).toBeNull()
      expect(rede).not.toHaveBeenCalled()
    } finally {
      roteador.dispose()
      await sdk.auth.stopAutoRefresh()
    }
  })
})

describe('a sessão que o Google deixa é reconhecida pelo site', () => {
  const BASE = import.meta.env.BASE_URL
  const LARGURA = window.innerWidth
  const inicio = window.location.href
  const LINHA_CONTA = { id: USUARIO_FALSO.id, nome_privado: 'Juliana', fuso: 'America/Sao_Paulo', criada_em: '2026-10-01T10:00:00+00:00' }
  const contaPronta = { contas: [{ data: LINHA_CONTA, error: null }] }

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: LARGURA })
    window.history.replaceState(null, '', inicio)
  })

  /** O site inteiro com o adaptador do banco (cliente falso, sem rede): o que o `detectSessionInUrl` entrega é a sessão do cliente. */
  function abrirSite(caminho: string, falso: ReturnType<typeof criarClienteFalso>, largura = 1440) {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
    vi.stubGlobal('scrollTo', vi.fn())
    const roteador = createMemoryRouter(criarRotasProntas(), { initialEntries: [caminho] })
    render(
      <ProvedorDadosConta dados={criarDadosContaSupabase(falso.cliente)}>
        <RouterProvider router={roteador} />
      </ProvedorDadosConta>,
    )
    return roteador
  }

  const cabecalho = () => within(document.querySelector<HTMLElement>('header[data-cabecalho]')!)
  const SEM_SESSAO = { entrar: true, criarConta: true, conta: false, sair: false }
  const COM_SESSAO = { entrar: false, criarConta: false, conta: true, sair: true }
  const itens = (escopo: ReturnType<typeof within>) => ({
    entrar: escopo.queryByRole('link', { name: 'Entrar' }) !== null,
    criarConta: escopo.queryByRole('link', { name: 'Criar conta' }) !== null,
    conta: escopo.queryByRole('link', { name: 'Conta' }) !== null,
    sair: escopo.queryByRole('button', { name: 'Sair' }) !== null,
  })

  for (const tela of TELAS) {
    it(`${tela}?code=: o cliente já trocou o código (sessão pronta na primeira leitura): a tela vai ao destino e o cabeçalho mostra Conta e Sair`, async () => {
      const falso = criarClienteFalso({ tabelas: contaPronta })
      const roteador = abrirSite(`${tela}?code=abc&volta=%2Fapp%2Fconta`, falso)

      await waitFor(() => expect(roteador.state.location.pathname).toBe('/app/conta'), { timeout: 5000 })
      await waitFor(() => expect(itens(cabecalho())).toEqual(COM_SESSAO))
      expect(falso.auth.signInWithOAuth).not.toHaveBeenCalled()
    })

    it(`${tela}: sem volta, o destino é o do RF-10 (conta completa: a Família, que sem família leva ao Começar)`, async () => {
      const falso = criarClienteFalso({ tabelas: contaPronta })
      const roteador = abrirSite(`${tela}?code=abc`, falso)

      await waitFor(() => expect(roteador.state.location.pathname).toMatch(/^\/app\/(familia|comecar)$/), { timeout: 5000 })
      await waitFor(() => expect(itens(cabecalho())).toEqual(COM_SESSAO))
    })
  }

  it('a sessão que chega depois de montar (evento SIGNED_IN do cliente) troca o cabeçalho e leva ao destino', async () => {
    const falso = criarClienteFalso({ usuario: null, tabelas: contaPronta })
    const roteador = abrirSite('/entrar?volta=%2Fapp%2Fconta', falso)
    await waitFor(() => expect(itens(cabecalho())).toEqual(SEM_SESSAO))
    expect(roteador.state.location.pathname).toBe('/entrar')

    falso.auth.getSession.mockResolvedValue({ data: { session: { user: USUARIO_FALSO } }, error: null })
    act(() => falso.emitirAuth('SIGNED_IN', { user: USUARIO_FALSO }))

    await waitFor(() => expect(roteador.state.location.pathname).toBe('/app/conta'), { timeout: 5000 })
    await waitFor(() => expect(itens(cabecalho())).toEqual(COM_SESSAO))
  })

  it('no menu do celular (390) também: Conta e Sair, sem Entrar nem Criar conta', async () => {
    const falso = criarClienteFalso({ usuario: null, tabelas: contaPronta })
    const roteador = abrirSite('/entrar?volta=%2Fapp%2Fconta', falso, 390)
    await screen.findByRole('button', { name: 'Menu' })
    await waitFor(() => expect(itens(cabecalho())).toEqual(SEM_SESSAO))

    falso.auth.getSession.mockResolvedValue({ data: { session: { user: USUARIO_FALSO } }, error: null })
    act(() => falso.emitirAuth('SIGNED_IN', { user: USUARIO_FALSO }))
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/app/conta'), { timeout: 5000 })
    await screen.findByRole('heading', { level: 1, name: TITULOS.conta })

    const menu = cabecalho().getByRole('button', { name: 'Menu', expanded: false })
    const painel = document.getElementById(menu.getAttribute('aria-controls')!)!
    fireEvent.click(menu)

    expect(menu.getAttribute('aria-expanded')).toBe('true')
    expect(painel.hidden).toBe(false)
    expect(itens(within(painel))).toEqual(COM_SESSAO)
    expect(document.activeElement).toBe(within(painel).getAllByRole('link')[0])
  })

  it('a volta com erro não cria sessão: continua visitante, na tela de entrar', async () => {
    const falso = criarClienteFalso({ usuario: null })
    vi.stubGlobal('scrollTo', vi.fn())
    window.history.replaceState(null, '', `${BASE}entrar?error=access_denied`)
    const roteador = createBrowserRouter(criarRotasProntas(), { basename: BASE })
    try {
      render(
        <ProvedorDadosConta dados={criarDadosContaSupabase(falso.cliente)}>
          <RouterProvider router={roteador} />
        </ProvedorDadosConta>,
      )

      await waitFor(() => expect(itens(cabecalho())).toEqual(SEM_SESSAO))
      expect(roteador.state.location.pathname).toBe(`${BASE}entrar`)
      await waitFor(() => expect(window.location.search).toBe(''))
    } finally {
      roteador.dispose()
    }
  })

  it('no roteador do navegador, o cliente sob demanda lê o retorno antes da limpeza e a sessão segue o volta', async () => {
    comBanco()
    vi.stubGlobal('scrollTo', vi.fn())
    const falso = criarClienteFalso({ usuario: null, tabelas: contaPronta })
    const busca = '?%63ode=codigo-falso&sb_flow_id=fluxo-falso&volta=/app/conta'
    let concluirInicializacao!: () => void
    const inicializacao = new Promise<void>((resolver) => { concluirInicializacao = resolver })
    criarCliente.mockImplementationOnce(() => {
      expect(window.location.search).toBe(busca)
      return falso.cliente
    })
    falso.auth.getSession.mockImplementation(async () => {
      await inicializacao
      return { data: { session: { user: USUARIO_FALSO } }, error: null }
    })
    window.history.replaceState(null, '', `${BASE}entrar${busca}#exportar`)
    const antes = window.history.length
    const roteador = createBrowserRouter(criarRotasProntas(), { basename: BASE })
    const substituir = vi.spyOn(window.history, 'replaceState')
    try {
      render(<RouterProvider router={roteador} />)
      await waitFor(() => expect(falso.auth.getSession).toHaveBeenCalled())
      expect(window.location.search).toBe(busca)
      expect(botaoGoogle()).toBeNull()

      await act(async () => concluirInicializacao())
      await waitFor(() => expect(window.location.pathname).toBe(`${BASE}app/conta`))
      expect(substituir.mock.calls[0]?.[2]).toBe(`${BASE}entrar?volta=/app/conta#exportar`)
      expect(window.location.search).toBe('')
      expect(window.history.length).toBe(antes)
      expect(itens(cabecalho())).toEqual(COM_SESSAO)
    } finally {
      concluirInicializacao()
      roteador.dispose()
    }
  })
})
