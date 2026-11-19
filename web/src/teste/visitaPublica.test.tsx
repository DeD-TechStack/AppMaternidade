import { act, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvedorDadosConta, useDadosConta } from '../componentes/conta/sessao.tsx'
import { SENHA_DEMONSTRACAO } from '../dados/conta.demonstracao.ts'
import type { DadosConta } from '../dados/conta.ts'
import { criarClienteFalso } from './renderizarComDados.tsx'
import { criarRotasProntas } from './rotasProntas.ts'

// LIB-ROUTES: uma visita anônima nova a uma página pública não carrega nada privado (em tempo de execução).
//  - Modo Supabase, sem sessão guardada e sem link de autenticação na URL: o pacote do Supabase nem é pedido.
//  - Com uma sessão guardada (`sb-...-auth-token`): o pacote é pedido na hora, como sempre foi.
//  - Modo memória: o motor da rotina em memória, a fixture de demonstração e os avisos em memória só são
//    carregados quando alguém usa a rotina ou os avisos (ou exporta/exclui a conta), não ao abrir uma página pública.
// Os módulos do motor são espionados sem trocar o código deles: o espião registra a primeira carga do módulo.

// Contadores simples (não `vi.fn`): o `vi.restoreAllMocks()` do setup, depois de cada teste, apagaria o histórico de um
// espião, e a carga de um módulo estático acontece antes do primeiro teste.
const espioes = vi.hoisted(() => ({
  createClient: vi.fn(),
  cargas: { rotinaMemoria: 0, rotinaDemonstracao: 0, avisosMemoria: 0 },
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: espioes.createClient }))
vi.mock('../dados/rotina.memoria.ts', async (importarOriginal) => {
  espioes.cargas.rotinaMemoria += 1
  return importarOriginal()
})
vi.mock('../dados/rotina.demonstracao.ts', async (importarOriginal) => {
  espioes.cargas.rotinaDemonstracao += 1
  return importarOriginal()
})
vi.mock('../dados/avisos.memoria.ts', async (importarOriginal) => {
  espioes.cargas.avisosMemoria += 1
  return importarOriginal()
})

let contaFalsa = criarClienteFalso({ usuario: null })

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.stubGlobal('scrollTo', vi.fn())
  contaFalsa = criarClienteFalso({ usuario: null })
  espioes.createClient.mockReset()
  espioes.createClient.mockImplementation(() => contaFalsa.cliente)
})

afterEach(() => {
  vi.unstubAllEnvs()
  window.localStorage.clear()
})

// Deixa as promessas e os `import()` em curso terminarem (sem relógio falso: os testes deste arquivo usam o real).
async function assentar() {
  for (let passo = 0; passo < 8; passo++) {
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 0))
    })
  }
}

function abrir(caminho: string) {
  const roteador = createMemoryRouter(criarRotasProntas(), { initialEntries: [caminho] })
  return render(<RouterProvider router={roteador} />)
}

function usarBanco(sufixo: string) {
  // Um par de variáveis novo por caso: o cliente e a instância de dados da página são guardados por par.
  vi.stubEnv('VITE_SUPABASE_URL', `https://visita-${sufixo}.invalid`)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', `chave-${sufixo}`)
}

describe('modo Supabase: visita anônima a uma página pública', () => {
  it('/ sem sessão guardada não pede o pacote do Supabase', async () => {
    usarBanco('inicio')
    abrir('/')
    await screen.findByRole('heading', { level: 1 })
    await assentar()
    expect(espioes.createClient).not.toHaveBeenCalled()
  })

  it('/como-funciona sem sessão guardada não pede o pacote do Supabase', async () => {
    usarBanco('como-funciona')
    abrir('/como-funciona')
    await screen.findByRole('heading', { level: 1, name: 'Deixa que eu anoto.' })
    await assentar()
    expect(espioes.createClient).not.toHaveBeenCalled()
  })

  it('com uma sessão guardada (sb-...-auth-token), / pede o pacote e lê a sessão', async () => {
    usarBanco('guardada')
    window.localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x' }))
    abrir('/')
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => expect(espioes.createClient).toHaveBeenCalled())
    await assentar()
    expect(contaFalsa.auth.getSession).toHaveBeenCalled()
    expect(contaFalsa.auth.onAuthStateChange).toHaveBeenCalled()
  })
})

describe('modo memória: visita anônima a uma página pública', () => {
  it('/ e /como-funciona não carregam o motor da rotina, a fixture da demonstração nem os avisos em memória', async () => {
    const primeira = abrir('/')
    await screen.findByRole('heading', { level: 1 })
    await assentar()
    primeira.unmount()

    abrir('/como-funciona')
    await screen.findByRole('heading', { level: 1, name: 'Deixa que eu anoto.' })
    await assentar()

    expect(espioes.cargas).toEqual({ rotinaMemoria: 0, rotinaDemonstracao: 0, avisosMemoria: 0 })
    expect(espioes.createClient).not.toHaveBeenCalled()
  })

  it('entrar na demonstração e exportar pela Conta, antes de qualquer visita à rotina, leva os registros da rotina', async () => {
    let dados: DadosConta | null = null
    function Captura() {
      dados = useDadosConta()
      return null
    }
    render(
      <ProvedorDadosConta>
        <Captura />
      </ProvedorDadosConta>,
    )
    expect(dados).not.toBeNull()
    const conta = dados as unknown as DadosConta

    const entrada = await conta.entrar('juliana@exemplo.invalid', SENHA_DEMONSTRACAO)
    expect(entrada.ok).toBe(true)

    const exportacao = await conta.exportarDados()
    expect(exportacao.ok).toBe(true)
    if (!exportacao.ok) return
    const json = exportacao.valor as { familias: Array<{ registros: unknown[]; notas: unknown[] }> }
    const registros = json.familias.flatMap((familia) => familia.registros)
    const notas = json.familias.flatMap((familia) => familia.notas)
    expect(registros.length).toBeGreaterThan(0)
    expect(notas.length).toBeGreaterThan(0)
  })
})
