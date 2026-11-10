import type { SupabaseClient } from '@supabase/supabase-js'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ProvedorDadosConta } from '../componentes/conta/sessao.tsx'
import { PESSOAS_DEMONSTRACAO, criarFixtureDemonstracao } from '../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria, type DadosContaMemoria, type FixtureConta } from '../dados/conta.memoria.ts'
import type { EstadoPrototipo } from '../prototipo/estado.ts'
import { criarRotas } from '../rotas.tsx'

// As pessoas dos testes de tela: os mesmos ids e papéis da fixture de demonstração
// (`conta.demonstracao.ts`, que tem os ids do seed local e os nomes de exemplo de Daniel).
export const PESSOAS = {
  juliana: { id: PESSOAS_DEMONSTRACAO.responsavel.id, email: 'juliana@exemplo.invalid', nome: 'Juliana' },
  bruno: PESSOAS_DEMONSTRACAO.bruno,
  carla: PESSOAS_DEMONSTRACAO.carla,
  davi: PESSOAS_DEMONSTRACAO.davi,
} as const

/** A fixture de demonstração, com a responsável Juliana e a bebê Heloísa. */
export function criarFixtureDeTeste(agora: number): FixtureConta {
  const base = criarFixtureDemonstracao(agora)
  return {
    ...base,
    usuarios: base.usuarios.map((u) => (u.id === PESSOAS.juliana.id ? { ...u, email: PESSOAS.juliana.email } : u)),
    contas: base.contas.map((c) => (c.id === PESSOAS.juliana.id ? { ...c, nome: PESSOAS.juliana.nome } : c)),
    bebes: base.bebes.map((b) => ({ ...b, nome: 'Heloísa' })),
  }
}

/** Uma resposta do cliente falso: o par `{ data, error }`, ou uma função que o devolve (ou lança). */
export type RespostaFalsa = { data?: unknown; error?: unknown } | (() => { data?: unknown; error?: unknown })

interface OpcoesClienteFalso {
  /** O usuário da sessão; `null` é sem sessão. Sem a opção, vale a Juliana. */
  usuario?: Record<string, unknown> | null
  /** Por tabela, as respostas das consultas em ordem; a última se repete. Sem fila: `{ data: null, error: null }`. */
  tabelas?: Record<string, RespostaFalsa[]>
  /** Por nome, a resposta da `rpc`. Sem entrada: `{ data: null, error: null }`. */
  rpc?: Record<string, RespostaFalsa>
}

export const USUARIO_FALSO = {
  id: PESSOAS.juliana.id,
  email: PESSOAS.juliana.email,
  user_metadata: { nome_privado: PESSOAS.juliana.nome },
}

const ENCADEAVEIS = ['select', 'eq', 'in', 'order', 'insert', 'update'] as const

function consultaFalsa(resolver: () => Promise<unknown>) {
  const consulta: Record<string, unknown> = {}
  for (const metodo of ENCADEAVEIS) consulta[metodo] = vi.fn(() => consulta)
  consulta.maybeSingle = vi.fn(resolver)
  consulta.single = vi.fn(resolver)
  // Como o do Supabase, a consulta se espera direto (`await cliente.from(...).select(...)`).
  consulta.then = (aoCumprir: (valor: unknown) => unknown, aoFalhar: (erro: unknown) => unknown) =>
    resolver().then(aoCumprir, aoFalhar)
  return consulta
}

/**
 * Um cliente do Supabase feito à mão (`auth`, `from`, `rpc`), sem rede e sem `createClient`. Cada
 * método é um `vi.fn`: o teste troca a resposta do que quiser e confere as chamadas.
 */
export function criarClienteFalso(opcoes: OpcoesClienteFalso = {}) {
  const usuario = opcoes.usuario === undefined ? USUARIO_FALSO : opcoes.usuario
  const filas = new Map(Object.entries(opcoes.tabelas ?? {}).map(([tabela, fila]) => [tabela, [...fila]]))
  const entregar = (resposta: RespostaFalsa | undefined) =>
    typeof resposta === 'function' ? resposta() : (resposta ?? { data: null, error: null })

  // Os eventos do Auth (`PASSWORD_RECOVERY`, `SIGNED_OUT`...): o teste os dispara com `emitirAuth`.
  const ouvintesDoAuth = new Set<(evento: string, sessao: unknown) => void>()
  // Cada método devolve `Promise<unknown>`: o teste troca a resposta por qualquer forma.
  const auth = {
    getSession: vi.fn(async (): Promise<unknown> => ({ data: { session: usuario ? { user: usuario } : null }, error: null })),
    signInWithPassword: vi.fn(async (): Promise<unknown> => ({ data: { user: USUARIO_FALSO, session: {} }, error: null })),
    signUp: vi.fn(async (): Promise<unknown> => ({ data: { user: USUARIO_FALSO, session: null }, error: null })),
    resetPasswordForEmail: vi.fn(async (): Promise<unknown> => ({ data: {}, error: null })),
    updateUser: vi.fn(async (): Promise<unknown> => ({ data: { user: USUARIO_FALSO }, error: null })),
    signOut: vi.fn(async (): Promise<unknown> => ({ error: null })),
    onAuthStateChange: vi.fn((ouvinte: (evento: string, sessao: unknown) => void) => {
      ouvintesDoAuth.add(ouvinte)
      return { data: { subscription: { unsubscribe: () => ouvintesDoAuth.delete(ouvinte) } } }
    }),
  }
  const emitirAuth = (evento: string, sessao: unknown) => {
    for (const ouvinte of [...ouvintesDoAuth]) ouvinte(evento, sessao)
  }
  const from = vi.fn((tabela: string) =>
    consultaFalsa(async () => {
      const fila = filas.get(tabela)
      return entregar(fila && fila.length > 1 ? fila.shift() : fila?.[0])
    }),
  )
  const rpc = vi.fn(async (nome: string): Promise<unknown> => entregar(opcoes.rpc?.[nome]))
  return { cliente: { auth, from, rpc } as unknown as SupabaseClient, auth, from, rpc, emitirAuth }
}

interface Opcoes {
  /** A memória em uso; sem ela, vale uma memória nova com a fixture dos testes. */
  dados?: DadosContaMemoria
  /**
   * A pessoa que já está entrada; `null` é ninguém. Sem a opção, a sessão fica como a memória
   * dada a deixou (numa memória nova, ninguém entrou).
   */
  sessao?: keyof typeof PESSOAS | null
  /** Estado inicial do protótipo; a madrugada se liga com `madrugada: true`. */
  estadoInicial?: EstadoPrototipo
}

// Renderiza as rotas reais num roteador em memória, dentro do `ProvedorDadosConta`. O provedor de
// dados fica fora do roteador: desmontar e montar o `ProvedorSessao` não troca a instância.
export function renderizarComDados(caminho: string, opcoes: Opcoes = {}) {
  const dados = opcoes.dados ?? criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  if (opcoes.sessao !== undefined) {
    dados.sessaoParaTeste(opcoes.sessao ? PESSOAS[opcoes.sessao].email : null)
  }

  // O jsdom não implementa `window.scrollTo`: a rolagem ao topo vira um espião.
  const rolarAoTopo = vi.fn()
  vi.stubGlobal('scrollTo', rolarAoTopo)

  const roteador = createMemoryRouter(criarRotas(opcoes.estadoInicial), { initialEntries: [caminho] })
  const resultado = render(
    <ProvedorDadosConta dados={dados}>
      <RouterProvider router={roteador} />
    </ProvedorDadosConta>,
  )
  return { ...resultado, roteador, dados, rolarAoTopo }
}
