import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LISTA, TOPICO } from '../../conteudo/comunidade.ts'
import { criarDadosComunidade, informarContaDaSessao } from '../../dados/comunidade.ts'
import { obterReacoesDaDemonstracao } from '../../dados/comunidade.visitante.ts'
import { criarClienteFalso, renderizarComDados } from '../../teste/renderizarComDados.tsx'

const obterCliente = vi.hoisted(() => vi.fn())
vi.mock('../../dados/cliente.ts', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../../dados/cliente.ts')>()),
  obterCliente,
}))

// COMUNIDADE-DEMO: sem as variáveis do banco, quem não tem conta abre a Comunidade de demonstração (os 7
// espaços, os tópicos de exemplo e as respostas) sem passar por /entrar. Com o banco, a guarda continua.
// Nada aqui depende do relógio nem do fuso: as datas não entram nas asserções.

process.env.DEBUG_PRINT_LIMIT = '300'

const TOPICO_SONECAS = '47000000-0000-4000-8000-000000000021'
const CAMINHO_DO_TOPICO = `/app/comunidade/topico/${TOPICO_SONECAS}`
const REACAO = 'Apoiar na demonstração'
const semCarregando = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
const listaDeEspacos = () => within(screen.getByRole('region', { name: LISTA.espacos })).findByRole('list')

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
  informarContaDaSessao(null)
  obterCliente.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('modo demonstração, sem conta', () => {
  it('/app/comunidade mostra os 7 espaços, sem ir a /entrar, com um só aviso de demonstração fora do main', async () => {
    const { roteador, container } = renderizarComDados('/app/comunidade', { sessao: null })
    await screen.findByRole('heading', { level: 1 })
    await semCarregando()
    const lista = await listaDeEspacos()
    await waitFor(() => expect(within(lista).getAllByRole('listitem')).toHaveLength(7))
    expect(roteador.state.location.pathname).toBe('/app/comunidade')
    expect(roteador.state.location.search).toBe('')
    expect(container.querySelectorAll('main')).toHaveLength(1)

    const avisos = container.querySelectorAll('[data-aviso="demonstracao"]')
    expect(avisos).toHaveLength(1)
    expect(container.querySelector('main')!.contains(avisos[0])).toBe(false)
    // Quem não escreve vê o caminho para entrar na comunidade.
    expect(screen.getByRole('link', { name: LISTA.entrar })).toBeTruthy()
  })

  it.each([
    ['sono', /Sonecas curtas de manhã/],
    ['alimentacao', /Mamadeira de madrugada/],
    ['organizacao-da-rotina', /Resumo da nossa semana/],
  ])('o espaço %s lista o tópico de exemplo, sem ir a /entrar', async (slug, titulo) => {
    const caminho = `/app/comunidade/${slug}`
    const { roteador } = renderizarComDados(caminho, { sessao: null })
    await screen.findByRole('link', { name: titulo }, { timeout: 4000 })
    expect(roteador.state.location.pathname).toBe(caminho)
  })

  it('o tópico mostra o texto e as respostas, e o caminho "entrar para responder", não um formulário', async () => {
    const { roteador, container } = renderizarComDados(`/app/comunidade/topico/${TOPICO_SONECAS}`, { sessao: null })
    await screen.findByRole('heading', { level: 1, name: 'Sonecas curtas de manhã' }, { timeout: 4000 })
    await semCarregando()
    expect(roteador.state.location.pathname).toBe(`/app/comunidade/topico/${TOPICO_SONECAS}`)
    expect(screen.getByText(/As sonecas da manhã duram uns 30 minutos/)).toBeTruthy()
    await screen.findByText(/Aqui foi igual até uns 4 meses/)
    expect(screen.getByRole('link', { name: TOPICO.paraEntrar })).toBeTruthy()
    expect(container.querySelector('form')).toBeNull()
    expect(container.querySelector('textarea')).toBeNull()
    expect(container.querySelectorAll('[data-aviso="demonstracao"]')).toHaveLength(1)
  })

  it('as rotas de escrita e da pessoa continuam atrás da guarda: /app/comunidade/perfil vai a /entrar?volta=...', async () => {
    const { roteador } = renderizarComDados('/app/comunidade/perfil', { sessao: null })
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'))
    expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent('/app/comunidade/perfil')}`)
  })

  it('a leitura do visitante não mostra erro nenhum (nem de sessão encerrada)', async () => {
    renderizarComDados('/app/comunidade', { sessao: null })
    await screen.findByRole('region', { name: LISTA.espacos })
    await listaDeEspacos()
    await semCarregando()
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })

  it('a reação sem conta fica na memória da página e pode ser desfeita', async () => {
    const primeira = renderizarComDados(CAMINHO_DO_TOPICO, { sessao: null })
    const botao = await screen.findByRole('button', { name: REACAO })
    expect(botao.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(botao)
    expect(botao.getAttribute('aria-pressed')).toBe('true')
    primeira.unmount()

    renderizarComDados(CAMINHO_DO_TOPICO, { sessao: null })
    const depois = await screen.findByRole('button', { name: REACAO })
    expect(depois.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(depois)
    expect(depois.getAttribute('aria-pressed')).toBe('false')
    expect(obterCliente).not.toHaveBeenCalled()
  })
})

describe('modo Supabase, sem sessão (contraste: a guarda continua)', () => {
  it('/app/comunidade vai a /entrar?volta=... e a demonstração não é mostrada', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-publica-de-teste')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('o teste chamou a rede')
      }),
    )
    const { roteador } = renderizarComDados('/app/comunidade', { sessao: null })
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'))
    expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent('/app/comunidade')}`)
    expect(screen.queryByText(/Sonecas curtas de manhã/)).toBeNull()
    expect(obterCliente).not.toHaveBeenCalled()
  })
})

it('no modo Supabase, a mesma URL usa o adaptador real sem semear tópicos ou emitir escritas de demonstração', async () => {
  const demo = renderizarComDados(CAMINHO_DO_TOPICO, { sessao: null })
  const botao = await screen.findByRole('button', { name: REACAO })
  fireEvent.click(botao)
  expect(botao.getAttribute('aria-pressed')).toBe('true')
  expect(obterCliente).not.toHaveBeenCalled()
  const reacoes = obterReacoesDaDemonstracao(criarDadosComunidade())
  demo.unmount()

  vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-publica-de-teste')
  expect(obterReacoesDaDemonstracao(criarDadosComunidade())).toBeUndefined()
  const titulo = 'Tópico do cliente falso'
  const banco = criarClienteFalso({
    tabelas: {
      espacos: [{ data: [] }],
      bloqueios: [{ data: [] }],
      papeis_plataforma: [{ data: [] }],
      respostas: [{ data: [] }],
      topicos: [{
        data: {
          id: TOPICO_SONECAS,
          espaco_id: '47000000-0000-4000-8000-0000000000e1',
          autor_id: null,
          titulo,
          corpo: 'Conteúdo do cliente falso.',
          faixa_etaria: null,
          estado: 'visivel',
          motivo_moderacao: null,
          criado_em: '2026-11-05T12:00:00Z',
          editado_em: null,
        },
      }],
    },
    rpc: { aceite_vigente: { data: false } },
  })
  const consultar = banco.from.getMockImplementation()!
  banco.from.mockImplementation((tabela) => {
    const consulta = consultar(tabela)
    return Object.assign(consulta, { range: vi.fn(() => consulta) })
  })
  obterCliente.mockResolvedValue(banco.cliente)
  const bancoNaTela = renderizarComDados(CAMINHO_DO_TOPICO, { sessao: 'juliana' })
  await screen.findByRole('heading', { level: 1, name: titulo })
  await waitFor(() => expect(banco.from).toHaveBeenCalledWith('respostas'))
  await semCarregando()
  expect(screen.queryByRole('heading', { name: 'Sonecas curtas de manhã' })).toBeNull()
  expect(screen.queryByText(/Aqui foi igual até uns 4 meses/)).toBeNull()
  expect(screen.queryByRole('button', { name: REACAO })).toBeNull()
  bancoNaTela.unmount()
  informarContaDaSessao(null)
  expect(reacoes?.alternar(TOPICO_SONECAS)).toBe(false)
  expect(banco.rpc.mock.calls.map(([nome]) => nome).sort()).toEqual(['aceite_vigente', 'avisos_ler_estado', 'meu_perfil_id'])
  for (const { value: consulta } of banco.from.mock.results) {
    expect(consulta.insert).not.toHaveBeenCalled()
    expect(consulta.update).not.toHaveBeenCalled()
  }
})
