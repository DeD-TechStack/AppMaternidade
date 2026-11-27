import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DadosComunidade, OperacaoComunidade } from './comunidade.ts'

// COMUNIDADE-DEMO: no modo memória, quem não tem conta lê a Comunidade de demonstração (visitante fixo,
// sem perfil, sem aceite, sem papel) e não escreve nada. No modo Supabase, a fixture de demonstração e o
// adaptador de memória nunca entram. O relógio e o fuso não mudam o resultado destes testes (só a ordem das
// linhas e os ids contam).

const lidas = vi.hoisted(() => ({ fixture: 0, adaptadorSupabase: 0, chamadasSupabase: 0 }))

vi.mock('./comunidade.demonstracao.ts', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('./comunidade.demonstracao.ts')>()
  return {
    get fixtureComunidadeDemonstracao() {
      lidas.fixture += 1
      return original.fixtureComunidadeDemonstracao
    },
  }
})

vi.mock('./comunidade.supabase.ts', () => {
  lidas.adaptadorSupabase += 1
  return {
    criarDadosComunidadeSupabase: () => {
      const operacao = () => {
        lidas.chamadasSupabase += 1
        return Promise.resolve({ ok: true, valor: [] })
      }
      // `then` fica de fora: o objeto é devolvido por uma função assíncrona e não pode parecer uma promessa.
      return new Proxy({}, { get: (_alvo, nome) => (nome === 'then' ? undefined : operacao) })
    },
  }
})

// No modo Supabase o cliente é falso: nada de rede nem do pacote do Supabase.
vi.mock('./cliente.ts', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('./cliente.ts')>()),
  obterCliente: () => Promise.resolve({}),
}))

const JULIANA = '11111111-1111-4111-8111-111111111111'
const TOPICO_SONECAS = '47000000-0000-4000-8000-000000000021'

/** Um módulo novo por caso: a instância em memória é do módulo e não pode vazar entre os testes. */
async function carregar() {
  vi.resetModules()
  return import('./comunidade.ts')
}

async function lerTudo(dados: DadosComunidade) {
  const espacos = await dados.listarEspacos()
  if (!espacos.ok) throw new Error('listarEspacos falhou')
  const topicos = []
  for (const espaco of espacos.valor) {
    const pagina = await dados.listarTopicos(espaco.id, 0, null)
    if (!pagina.ok) throw new Error('listarTopicos falhou')
    topicos.push(...pagina.valor.itens)
  }
  return { espacos: espacos.valor, topicos }
}

beforeEach(() => {
  lidas.fixture = 0
  lidas.adaptadorSupabase = 0
  lidas.chamadasSupabase = 0
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('modo demonstração, sem conta: o visitante lê', () => {
  it('a situação é de quem não tem perfil, aceite nem papel', async () => {
    const { criarDadosComunidade, informarContaDaSessao } = await carregar()
    informarContaDaSessao(null)
    const situacao = await criarDadosComunidade().situacaoDaConta()
    expect(situacao).toEqual({
      ok: true,
      valor: { perfilId: null, versaoVigente: '2026-11-05', aceiteVigente: false, papeis: [] },
    })
  })

  it('lista os 7 espaços e pelo menos 3 tópicos de exemplo, com autor e contagem de respostas', async () => {
    const { criarDadosComunidade, informarContaDaSessao } = await carregar()
    informarContaDaSessao(null)
    const { espacos, topicos } = await lerTudo(criarDadosComunidade())
    expect(espacos).toHaveLength(7)
    expect(topicos.length).toBeGreaterThanOrEqual(3)
    expect(topicos.every((t) => t.autor !== null)).toBe(true)
    expect(topicos.find((t) => t.id === TOPICO_SONECAS)?.respostas).toBe(1)
  })

  it('lê o tópico, o perfil do autor, as respostas e a lista de bloqueios (vazia)', async () => {
    const { criarDadosComunidade, informarContaDaSessao } = await carregar()
    informarContaDaSessao(null)
    const dados = criarDadosComunidade()
    const topico = await dados.lerTopico(TOPICO_SONECAS)
    expect(topico.ok && topico.valor?.titulo).toBe('Sonecas curtas de manhã')
    const respostas = await dados.lerRespostas(TOPICO_SONECAS, 0)
    expect(respostas.ok && respostas.valor.itens).toHaveLength(1)
    const autor = await dados.lerPerfis([(topico.ok && topico.valor?.autorId) || ''])
    expect(autor.ok && autor.valor.map((p) => p.apelido)).toEqual(['noites_em_claro'])
    expect(await dados.listarBloqueios()).toEqual({ ok: true, valor: [] })
  })

  it('o visitante é uma identidade só: sem perfil, aceite nem papel e nunca a de uma conta da fixture', async () => {
    const { criarDadosComunidade, estadoMemoriaDaPagina, informarContaDaSessao } = await carregar()
    const { fixtureComunidadeDemonstracao: fixture } = await import('./comunidade.demonstracao.ts')
    informarContaDaSessao(null)
    const dados = criarDadosComunidade()
    await lerTudo(dados)
    await dados.situacaoDaConta()
    const estado = estadoMemoriaDaPagina()!
    const novas = estado.contas.filter((id) => !fixture.contas.includes(id))
    expect(novas).toHaveLength(1)
    expect(estado.perfis.some((p) => p.contaId === novas[0])).toBe(false)
    expect(estado.aceites.some((a) => a.contaId === novas[0])).toBe(false)
    expect(estado.papeis.some((p) => p.contaId === novas[0])).toBe(false)
  })

  const ESCRITAS: Array<[OperacaoComunidade, (d: DadosComunidade) => Promise<unknown>]> = [
    ['aceitarTermos', (d) => d.aceitarTermos('2026-11-05')],
    ['criarPerfil', (d) => d.criarPerfil('visitante_novo', null, null)],
    ['editarPerfil', (d) => d.editarPerfil('visitante_novo', null, null)],
    ['criarTopico', (d) => d.criarTopico('47000000-0000-4000-8000-0000000000e1', 'Título', 'Corpo', null)],
    ['editarTopico', (d) => d.editarTopico(TOPICO_SONECAS, 'Outro', 'Corpo', null)],
    ['responder', (d) => d.responder(TOPICO_SONECAS, null, 'Oi')],
    ['editarResposta', (d) => d.editarResposta('47000000-0000-4000-8000-000000000031', 'Oi')],
    ['denunciar', (d) => d.denunciar('spam_venda', { tipo: 'topico', id: TOPICO_SONECAS }, null)],
    ['bloquear', (d) => d.bloquear('47000000-0000-4000-8000-000000000013')],
    ['desbloquear', (d) => d.desbloquear('47000000-0000-4000-8000-000000000013')],
  ]

  for (const [nome, chamar] of ESCRITAS) {
    it(`${nome} sem conta devolve sessao_encerrada e não muda nada`, async () => {
      const { criarDadosComunidade, estadoMemoriaDaPagina, informarContaDaSessao } = await carregar()
      informarContaDaSessao(null)
      const dados = criarDadosComunidade()
      const antes = JSON.stringify(estadoMemoriaDaPagina()!.topicos) + JSON.stringify(estadoMemoriaDaPagina()!.respostas)
      const resultado = (await chamar(dados)) as { ok: boolean; erro?: { classe: string } }
      expect(resultado.ok).toBe(false)
      expect(resultado.erro?.classe).toBe('sessao_encerrada')
      const estado = estadoMemoriaDaPagina()!
      expect(JSON.stringify(estado.topicos) + JSON.stringify(estado.respostas)).toBe(antes)
      expect(estado.perfis).toHaveLength(3)
      expect(estado.denuncias).toHaveLength(1)
      expect(estado.bloqueios).toHaveLength(0)
    })
  }
})

describe('modo demonstração, com conta de demonstração: a escrita vive só na memória da página', () => {
  it('a resposta feita por uma conta entrada aparece na leitura e some com a página nova', async () => {
    const primeira = await carregar()
    primeira.informarContaDaSessao(JULIANA)
    const dados = primeira.criarDadosComunidade()
    const feita = await dados.responder(TOPICO_SONECAS, null, 'Aqui também foi assim, só durante a demonstração.')
    expect(feita.ok).toBe(true)
    const lidas1 = await dados.lerRespostas(TOPICO_SONECAS, 0)
    expect(lidas1.ok && lidas1.valor.itens.map((r) => r.corpo)).toContain('Aqui também foi assim, só durante a demonstração.')

    // A mesma página, sem conta: o visitante lê o que a sessão da demonstração gravou.
    primeira.informarContaDaSessao(null)
    const visitante = await dados.lerRespostas(TOPICO_SONECAS, 0)
    expect(visitante.ok && visitante.valor.itens).toHaveLength(2)

    // Recarregar a página = módulo novo = fixture nova: a resposta se perdeu.
    const segunda = await carregar()
    segunda.informarContaDaSessao(JULIANA)
    const recarregada = await segunda.criarDadosComunidade().lerRespostas(TOPICO_SONECAS, 0)
    expect(recarregada.ok && recarregada.valor.itens.map((r) => r.corpo)).not.toContain(
      'Aqui também foi assim, só durante a demonstração.',
    )
    expect(recarregada.ok && recarregada.valor.itens).toHaveLength(1)
  })

  it('nenhuma escrita chama o adaptador do Supabase (que nem chega a ser importado)', async () => {
    const { criarDadosComunidade, informarContaDaSessao } = await carregar()
    informarContaDaSessao(JULIANA)
    const dados = criarDadosComunidade()
    expect((await dados.responder(TOPICO_SONECAS, null, 'Oi')).ok).toBe(true)
    informarContaDaSessao(null)
    const visitante = await dados.responder(TOPICO_SONECAS, null, 'Oi')
    expect(!visitante.ok && visitante.erro.classe).toBe('sessao_encerrada')
    await lerTudo(dados)
    expect(lidas.chamadasSupabase).toBe(0)
    expect(lidas.adaptadorSupabase).toBe(0)
  })
})

describe('modo Supabase: a demonstração nunca é lida nem misturada', () => {
  it('criar os dados e chamar operações não lê a fixture de demonstração e usa o adaptador do banco', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-publica-de-teste')
    const { criarDadosComunidade, estadoMemoriaDaPagina } = await carregar()
    const dados = criarDadosComunidade()
    await dados.listarEspacos()
    await dados.lerTopico(TOPICO_SONECAS)
    await dados.responder(TOPICO_SONECAS, null, 'Oi')
    expect(estadoMemoriaDaPagina()).toBeNull()
    expect(lidas.fixture).toBe(0)
    expect(lidas.chamadasSupabase).toBe(3)
  })
})
