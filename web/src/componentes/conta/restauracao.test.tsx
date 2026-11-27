import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { obterCliente } from '../../dados/cliente.ts'
import { Entrar } from '../../paginas/conta/Entrar.tsx'
import { Comecar } from '../../paginas/conta/Comecar.tsx'
import { GuardaSessao } from './guarda.tsx'
import { ProvedorSessao, useSessao } from './sessao.tsx'

// Real Supabase, adapter and route guard. Only HTTP, time and document visibility are synthetic.
const AGORA = Date.parse('2026-11-27T12:00:00Z')
const EXPIRA = AGORA / 1000 + 600
let caso = 0
const projeto = () => `sessao-teste-${caso}`
const origem = () => `https://${projeto()}.invalid`
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const json = (dados: unknown, status = 200) => Response.json(dados, { status })
const jwtRecusado = () => json({ code: 'PGRST301', message: 'JWT expired', details: null, hint: null }, 401)

function sessaoFicticia(id: string, expira = EXPIRA) {
  return {
    access_token: 'access-fixture', refresh_token: 'refresh-fixture', token_type: 'bearer', expires_in: expira - Date.now() / 1000,
    expires_at: expira, user: { id, email: `${id}@example.invalid`, user_metadata: {}, app_metadata: {} },
  }
}

function guardarSessao(id = A, expira = EXPIRA) {
  localStorage.setItem(`sb-${projeto()}-auth-token`, JSON.stringify(sessaoFicticia(id, expira)))
}

let visivel: boolean
let consultas: string[]
let inesperadas: string[]
let eventos: string[]
let ativos: NonNullable<Awaited<ReturnType<typeof obterCliente>>>[]
type Transporte = (url: URL) => Response | Promise<Response> | undefined

function transporte(responder?: Transporte) {
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const caminho = url.pathname
    consultas.push(caminho)
    if (url.origin !== origem()) {
      inesperadas.push('origem externa')
      throw new Error('Rede externa proibida neste teste')
    }
    const resposta = responder?.(url)
    if (resposta) return resposta
    if ((init?.method ?? 'GET') === 'GET' && caminho === '/rest/v1/contas') {
      const id = url.searchParams.get('id')?.slice(3)
      if (id === A || id === B) {
        return json([{ id, nome_privado: id === A ? 'Pessoa A' : 'Pessoa B', fuso: 'UTC', criada_em: '2026-10-01T00:00:00Z' }])
      }
    }
    if ((init?.method ?? 'GET') === 'GET' && caminho === '/rest/v1/vinculos') return json([])
    if (init?.method === 'POST' && caminho === '/auth/v1/logout') return new Response(null, { status: 204 })
    inesperadas.push(caminho)
    throw new Error('Rota não prevista na fixture')
  })
}

async function observarAuth() {
  const sdk = await obterCliente()
  if (!sdk) throw new Error('Falta o SDK do teste')
  ativos.push(sdk)
  sdk.auth.onAuthStateChange((evento) => { eventos.push(evento) })
  return sdk.auth
}

function SondaConta() {
  const sessao = useSessao()
  return <>
    <h1>{sessao.conta?.nome}</h1>
    <button type="button" onClick={() => void sessao.sair()}>Sair da sonda</button>
  </>
}

function abrir(caminho: string) {
  const roteador = createMemoryRouter([{
    element: <ProvedorSessao />,
    children: [
      { path: '/entrar', element: <Entrar /> },
      { element: <GuardaSessao />, children: [
        { path: '/app/conta', element: <SondaConta /> },
        { path: '/app/comecar', element: <Comecar /> },
      ] },
    ],
  }], { basename: '/previa', initialEntries: [`/previa${caminho}`] })
  render(<RouterProvider router={roteador} />)
  return roteador
}

async function mostrarAba(valor: boolean) {
  visivel = valor
  await act(async () => { document.dispatchEvent(new Event('visibilitychange', { bubbles: true })) })
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  caso += 1
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AGORA)
  vi.stubEnv('VITE_SUPABASE_URL', origem())
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_fixture')
  visivel = false
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visivel ? 'visible' : 'hidden')
  consultas = []
  inesperadas = []
  eventos = []
  ativos = []
})

afterEach(async () => {
  for (const sdk of ativos) await sdk.auth.dispose()
  expect(inesperadas).toEqual([])
  vi.unstubAllEnvs()
})

describe('restauração no primeiro acesso com o SDK Supabase', () => {
  it('aba nova sem sessão vai para a entrada sem encerrar nenhuma sessão', async () => {
    transporte()
    const rota = abrir('/app/conta')
    await waitFor(() => expect(rota.state.location.pathname).toBe('/previa/entrar'))
    expect(rota.state.location.search).toBe('?volta=%2Fapp%2Fconta')
    expect(rota.state.location.state).toBeNull()
    expect(consultas).toEqual([])
  })

  it.each(['offline', '503'])('um refresh %s não termina a sessão; a recuperação ao voltar à aba reabre a conta', async (falha) => {
    guardarSessao(A, AGORA / 1000 - 1)
    let respostaBoa = false
    transporte((url) => {
      if (url.pathname !== '/auth/v1/token' || url.searchParams.get('grant_type') !== 'refresh_token') return
      if (respostaBoa) return json(sessaoFicticia(A, Date.now() / 1000 + 600))
      // Consume the SDK retry budget without sleeping (the failure itself is still real SDK parsing).
      vi.setSystemTime(Date.now() + 31_000)
      if (falha === 'offline') throw new TypeError('Failed to fetch')
      return json({ message: 'Service unavailable' }, 503)
    })
    const auth = await observarAuth()
    const rota = abrir('/app/conta')
    expect((await screen.findByRole('alert')).textContent).toContain('conexão')
    expect(rota.state.location.pathname).toBe('/previa/app/conta')
    expect(eventos).toContain('INITIAL_SESSION')
    expect(eventos).not.toContain('SIGNED_OUT')
    expect(consultas).not.toContain('/auth/v1/logout')

    await mostrarAba(false)
    vi.setSystemTime(Date.now() + 61_000)
    respostaBoa = true
    await mostrarAba(true)
    await waitFor(() => expect(eventos).toContain('TOKEN_REFRESHED'))
    expect((await auth.getSession()).data.session?.user.id).toBe(A)
    expect(await screen.findByRole('heading', { name: 'Pessoa A' }, { timeout: 700 })).toBeTruthy()
  })

  it('401 da leitura da conta não anuncia logout enquanto o Auth ainda tem a sessão', async () => {
    guardarSessao()
    let recusar = true
    transporte((url) => url.pathname === '/rest/v1/contas' && recusar ? jwtRecusado() : undefined)
    const auth = await observarAuth()
    const rota = abrir('/app/conta')
    await waitFor(() => expect(consultas).toContain('/rest/v1/contas'))
    await waitFor(() => expect(screen.queryByRole('alert') !== null || rota.state.location.pathname === '/previa/entrar').toBe(true))
    expect((await auth.getSession()).data.session?.user.id).toBe(A)
    expect(eventos).not.toContain('SIGNED_OUT')
    expect(consultas).not.toContain('/auth/v1/logout')
    expect(rota.state.location.pathname).toBe('/previa/app/conta')
    recusar = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { name: 'Pessoa A' })).toBeTruthy()
  })

  it('401 da lista inicial de famílias permite repetir só a leitura na mesma conta', async () => {
    guardarSessao()
    let recusar = true
    transporte((url) => url.pathname === '/rest/v1/vinculos' && recusar ? jwtRecusado() : undefined)
    const auth = await observarAuth()
    const rota = abrir('/app/comecar')
    await waitFor(() => expect(consultas).toContain('/rest/v1/vinculos'))
    await waitFor(() => expect(screen.queryByRole('alert') !== null || rota.state.location.pathname === '/previa/entrar').toBe(true))
    expect((await auth.getSession()).data.session?.user.id).toBe(A)
    expect(eventos).not.toContain('SIGNED_OUT')
    expect(consultas).not.toContain('/auth/v1/logout')
    expect(rota.state.location.pathname).toBe('/previa/app/comecar')
    recusar = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(rota.state.location.pathname).toBe('/previa/app/comecar')
  })

  it('401 no refresh proativo não remove um token de acesso ainda válido', async () => {
    guardarSessao()
    transporte((url) => url.pathname === '/auth/v1/token'
      ? json({ error_code: 'refresh_token_not_found', message: 'Refresh not found' }, 401) : undefined)
    const auth = await observarAuth()
    const rota = abrir('/app/conta')
    await screen.findByRole('heading', { name: 'Pessoa A' })
    vi.setSystemTime(EXPIRA * 1000 - 30_000)
    await mostrarAba(true)
    expect(consultas).toContain('/auth/v1/token')
    expect((await auth.getSession()).data.session?.user.id).toBe(A)
    expect(rota.state.location.pathname).toBe('/previa/app/conta')
    expect(eventos).not.toContain('SIGNED_OUT')
  })

  it('401 do Auth no refresh após a expiração real emite SIGNED_OUT, sem chamar logout', async () => {
    guardarSessao()
    transporte((url) => url.pathname === '/auth/v1/token'
      ? json({ error_code: 'refresh_token_not_found', message: 'Refresh not found' }, 401) : undefined)
    const auth = await observarAuth()
    const rota = abrir('/app/conta')
    await screen.findByRole('heading', { name: 'Pessoa A' })
    vi.setSystemTime(EXPIRA * 1000 + 1000)
    await mostrarAba(true)
    await waitFor(() => expect(rota.state.location.pathname).toBe('/previa/entrar'))
    expect(rota.state.location.state).toEqual({ mensagem: 'sessao_encerrada' })
    expect(eventos).toContain('SIGNED_OUT')
    expect((await auth.getSession()).data.session).toBeNull()
    expect(consultas).not.toContain('/auth/v1/logout')
  })

  it('troca feita noutra aba é reconhecida ao voltar sem manter a conta anterior', async () => {
    guardarSessao()
    transporte()
    await observarAuth()
    const rota = abrir('/app/conta')
    await screen.findByRole('heading', { name: 'Pessoa A' })
    guardarSessao(B)
    await mostrarAba(true)
    await screen.findByRole('heading', { name: 'Pessoa B' })
    expect(screen.queryByRole('heading', { name: 'Pessoa A' })).toBeNull()
    expect(rota.state.location.pathname).toBe('/previa/app/conta')
    expect(eventos).toContain('SIGNED_IN')
    expect(consultas).not.toContain('/auth/v1/logout')
  })

  it('401 atrasado da lista de A não derruba a conta B já restaurada', async () => {
    guardarSessao()
    let liberar!: (resposta: Response) => void
    const pendente = new Promise<Response>((resolver) => { liberar = resolver })
    transporte((url) => url.pathname === '/rest/v1/vinculos' && url.searchParams.get('conta_id') === `eq.${A}`
      ? pendente : undefined)
    const auth = await observarAuth()
    const rota = abrir('/app/comecar')
    await waitFor(() => expect(consultas).toContain('/rest/v1/vinculos'))
    guardarSessao(B)
    await mostrarAba(true)
    await act(async () => { await rota.navigate('/app/conta') })
    await screen.findByRole('heading', { name: 'Pessoa B' })
    await act(async () => { liberar(jwtRecusado()) })
    expect((await auth.getSession()).data.session?.user.id).toBe(B)
    expect(rota.state.location.pathname).toBe('/previa/app/conta')
    expect(screen.getByRole('heading', { name: 'Pessoa B' })).toBeTruthy()
    expect(eventos).not.toContain('SIGNED_OUT')
  })

  it('saída pedida chama logout local e voltar à aba não restaura a conta', async () => {
    guardarSessao()
    transporte()
    const auth = await observarAuth()
    const rota = abrir('/app/conta')
    await screen.findByRole('heading', { name: 'Pessoa A' })
    fireEvent.click(screen.getByRole('button', { name: 'Sair da sonda' }))
    await waitFor(() => expect(rota.state.location.pathname).toBe('/previa/entrar'))
    expect(rota.state.location.state).toEqual({ mensagem: 'saiu' })
    expect(eventos).toContain('SIGNED_OUT')
    expect(consultas.filter((caminho) => caminho === '/auth/v1/logout')).toHaveLength(1)
    expect((await auth.getSession()).data.session).toBeNull()
    await mostrarAba(true)
    expect(rota.state.location.pathname).toBe('/previa/entrar')
  })
})
