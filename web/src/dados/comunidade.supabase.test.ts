import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from './comum.ts'
import { criarDadosComunidadeSupabase } from './comunidade.supabase.ts'

// MAT-40, teste 2: a implementação do banco com um cliente falso (um objeto que grava as chamadas, sem
// rede). Cada operação chama o recurso da sua tabela, com os nomes de parâmetro e as colunas exatos, e
// nenhuma chamada sai da lista da MAT-40:RF-14.

type Resposta = { data?: unknown; error?: unknown; count?: number | null }
type Passo = [string, unknown[]]

interface Chamada {
  tipo: 'from' | 'rpc'
  alvo: string
  passos: Passo[]
  argumentos?: unknown
}

const CONTA = 'a0000000-0000-4000-8000-000000000001'
const PERFIL = 'a0000000-0000-4000-8000-0000000000a1'
const OUTRO_PERFIL = 'a0000000-0000-4000-8000-0000000000a2'
const TOPICO = 'a0000000-0000-4000-8000-0000000000b1'
const ESPACO = 'a0000000-0000-4000-8000-0000000000e1'
const AGORA = '2026-11-05T14:30:00.123456+00:00'

const TABELAS_DA_COMUNIDADE = [
  'perfis_publicos',
  'versoes_termos',
  'aceites_termos',
  'espacos',
  'topicos',
  'respostas',
  'denuncias',
  'bloqueios',
  'papeis_plataforma',
  'auditoria_moderacao',
]
const FUNCOES_DA_COMUNIDADE = [
  'meu_perfil_id',
  'aceite_vigente',
  'aceitar_termos',
  'denunciar',
  'minhas_denuncias',
  'moderar_conteudo',
  'decidir_denuncia',
  'conceder_papel_plataforma',
  'revogar_papel_plataforma',
]

interface Opcoes {
  tabelas?: Record<string, Resposta[]>
  rpc?: Record<string, Resposta>
  sessao?: boolean
}

/** Um cliente do Supabase feito à mão: grava cada chamada e devolve as respostas em ordem (a última se repete). */
function criarClienteFalso({ tabelas = {}, rpc = {}, sessao = true }: Opcoes = {}) {
  const chamadas: Chamada[] = []
  const filas = new Map(Object.entries(tabelas).map(([tabela, fila]) => [tabela, [...fila]]))
  const vazia: Resposta = { data: [], error: null }

  const from = vi.fn((tabela: string) => {
    const chamada: Chamada = { tipo: 'from', alvo: tabela, passos: [] }
    chamadas.push(chamada)
    const fila = filas.get(tabela)
    const resposta = fila && fila.length > 1 ? fila.shift()! : (fila?.[0] ?? vazia)
    const resolver = async () => {
      if (typeof resposta === 'function') return (resposta as () => Resposta)()
      return resposta
    }
    const construtor: Record<string, unknown> = new Proxy(
      {},
      {
        get(_alvo, nome: string) {
          if (nome === 'then') return (cumprir: (v: unknown) => unknown, falhar: (e: unknown) => unknown) => resolver().then(cumprir, falhar)
          if (nome === 'maybeSingle' || nome === 'single') {
            return () => {
              chamada.passos.push([nome, []])
              return resolver()
            }
          }
          return (...argumentos: unknown[]) => {
            chamada.passos.push([nome, argumentos])
            return construtor
          }
        },
      },
    )
    return construtor
  })

  const funcao = vi.fn(async (nome: string, argumentos?: unknown): Promise<Resposta> => {
    chamadas.push({ tipo: 'rpc', alvo: nome, passos: [], argumentos })
    const resposta = rpc[nome] ?? { data: null, error: null }
    return typeof resposta === 'function' ? (resposta as () => Resposta)() : resposta
  })

  const auth = {
    getSession: vi.fn(async () => ({ data: { session: sessao ? { user: { id: CONTA } } : null }, error: null })),
  }
  return { cliente: { auth, from, rpc: funcao } as unknown as SupabaseClient, chamadas }
}

const passo = (chamada: Chamada, nome: string) => chamada.passos.find(([n]) => n === nome)?.[1]
const doRecurso = (chamadas: Chamada[], alvo: string) => chamadas.filter((c) => c.alvo === alvo)

const linhaDoTopico = (extras: Record<string, unknown> = {}) => ({
  id: TOPICO,
  espaco_id: ESPACO,
  autor_id: PERFIL,
  titulo: 'Título',
  corpo: 'Corpo',
  faixa_etaria: null,
  estado: 'visivel',
  motivo_moderacao: null,
  criado_em: AGORA,
  editado_em: null,
  ...extras,
})

const linhaDaResposta = (extras: Record<string, unknown> = {}) => ({
  id: 'a0000000-0000-4000-8000-0000000000c1',
  topico_id: TOPICO,
  autor_id: PERFIL,
  resposta_a: null,
  corpo: 'Resposta',
  estado: 'visivel',
  motivo_moderacao: null,
  criado_em: AGORA,
  editado_em: null,
  ...extras,
})

const linhaDoPerfil = (extras: Record<string, unknown> = {}) => ({ id: PERFIL, apelido: 'apelido_um', bio: null, faixa_bebe: null, criado_em: AGORA, ...extras })

function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`esperava sucesso: ${resultado.erro.chave} ${resultado.erro.mensagemOriginal}`)
  return resultado.valor
}

function erro<T>(resultado: Resultado<T>) {
  if (resultado.ok) throw new Error('esperava erro')
  return resultado.erro
}

afterEach(() => {
  vi.useRealTimers()
})

describe('cada operação chama o recurso da sua tabela, com as colunas e os parâmetros escritos', () => {
  it('situação da conta: meu_perfil_id, a versão vigente, aceite_vigente e os papéis da conta da sessão', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      rpc: { meu_perfil_id: { data: PERFIL, error: null }, aceite_vigente: { data: true, error: null } },
      tabelas: {
        versoes_termos: [{ data: { versao: '2026-11-05' }, error: null }],
        papeis_plataforma: [{ data: [{ papel: 'moderador', valido_ate: null }], error: null }],
      },
    })
    const situacao = valor(await criarDadosComunidadeSupabase(cliente).situacaoDaConta())
    expect(situacao).toEqual({ perfilId: PERFIL, versaoVigente: '2026-11-05', aceiteVigente: true, papeis: ['moderador'] })

    const versoes = doRecurso(chamadas, 'versoes_termos')[0]
    expect(passo(versoes, 'select')).toEqual(['versao'])
    expect(passo(versoes, 'eq')).toEqual(['vigente', true])
    const papeis = doRecurso(chamadas, 'papeis_plataforma')[0]
    expect(passo(papeis, 'select')).toEqual(['papel, valido_ate'])
    expect(passo(papeis, 'eq')).toEqual(['conta_id', CONTA])
    expect(chamadas.filter((c) => c.tipo === 'rpc').map((c) => c.alvo).sort()).toEqual(['aceite_vigente', 'meu_perfil_id'])
  })

  it('o papel só vale sem validade ou com validade no futuro, pelo relógio do aparelho; validade ilegível não conta (PR-45)', async () => {
    const limite = Date.parse('2026-11-05T12:00:00Z')
    vi.useFakeTimers()
    const situacaoComRelogio = async (instante: number) => {
      vi.setSystemTime(instante)
      const { cliente } = criarClienteFalso({
        rpc: { meu_perfil_id: { data: null, error: null }, aceite_vigente: { data: false, error: null } },
        tabelas: {
          versoes_termos: [{ data: null, error: null }],
          papeis_plataforma: [
            {
              data: [
                { papel: 'moderador', valido_ate: new Date(limite).toISOString() },
                { papel: 'admin', valido_ate: 'não é uma data' },
              ],
              error: null,
            },
          ],
        },
      })
      return valor(await criarDadosComunidadeSupabase(cliente).situacaoDaConta())
    }
    expect((await situacaoComRelogio(limite - 60_000)).papeis).toEqual(['moderador'])
    expect((await situacaoComRelogio(limite + 60_000)).papeis).toEqual([])
    expect((await situacaoComRelogio(limite)).papeis).toEqual([])
    const sem = await situacaoComRelogio(limite - 60_000)
    expect(sem).toMatchObject({ perfilId: null, versaoVigente: null, aceiteVigente: false })
  })

  it('aceitar termos: rpc aceitar_termos(p_versao)', async () => {
    const { cliente, chamadas } = criarClienteFalso()
    expect(valor(await criarDadosComunidadeSupabase(cliente).aceitarTermos('2026-11-05'))).toBeNull()
    expect(chamadas).toEqual([{ tipo: 'rpc', alvo: 'aceitar_termos', passos: [], argumentos: { p_versao: '2026-11-05' } }])
  })

  it('criar perfil: insert em perfis_publicos (conta_id, apelido, bio, faixa_bebe), com conta_id = a conta da sessão', async () => {
    const { cliente, chamadas } = criarClienteFalso()
    await criarDadosComunidadeSupabase(cliente).criarPerfil('apelido_um', 'bio', '3_6_meses')
    expect(chamadas[0].alvo).toBe('perfis_publicos')
    expect(passo(chamadas[0], 'insert')).toEqual([{ conta_id: CONTA, apelido: 'apelido_um', bio: 'bio', faixa_bebe: '3_6_meses' }])
  })

  it('editar perfil: update de apelido, bio e faixa_bebe no id do perfil próprio, devolvendo id; zero linhas é "nao_editavel"', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      rpc: { meu_perfil_id: { data: PERFIL, error: null } },
      tabelas: { perfis_publicos: [{ data: [{ id: PERFIL }], error: null }] },
    })
    expect(valor(await criarDadosComunidadeSupabase(cliente).editarPerfil('apelido_dois', null, null))).toBe(PERFIL)
    const atualizacao = doRecurso(chamadas, 'perfis_publicos')[0]
    expect(passo(atualizacao, 'update')).toEqual([{ apelido: 'apelido_dois', bio: null, faixa_bebe: null }])
    expect(passo(atualizacao, 'eq')).toEqual(['id', PERFIL])
    expect(passo(atualizacao, 'select')).toEqual(['id'])

    const vazio = criarClienteFalso({ rpc: { meu_perfil_id: { data: PERFIL, error: null } }, tabelas: { perfis_publicos: [{ data: [], error: null }] } })
    expect(erro(await criarDadosComunidadeSupabase(vazio.cliente).editarPerfil('a', null, null))).toMatchObject({ classe: 'nao_encontrado', chave: 'nao_editavel' })
  })

  it('ler perfis: só id, apelido, bio, faixa_bebe e criado_em (nunca *, nunca conta_id)', async () => {
    const { cliente, chamadas } = criarClienteFalso({ tabelas: { perfis_publicos: [{ data: [linhaDoPerfil()], error: null }] } })
    const perfis = valor(await criarDadosComunidadeSupabase(cliente).lerPerfis([PERFIL, PERFIL, OUTRO_PERFIL]))
    expect(perfis).toEqual([{ id: PERFIL, apelido: 'apelido_um', bio: null, faixa: null, criadoEm: AGORA }])
    expect(passo(chamadas[0], 'select')).toEqual(['id, apelido, bio, faixa_bebe, criado_em'])
    expect(passo(chamadas[0], 'in')).toEqual(['id', [PERFIL, OUTRO_PERFIL]])
    expect(valor(await criarDadosComunidadeSupabase(criarClienteFalso().cliente).lerPerfis([]))).toEqual([])
  })

  it('listar espaços: id, slug, nome e ordem, em ordem', async () => {
    const { cliente, chamadas } = criarClienteFalso({ tabelas: { espacos: [{ data: [{ id: ESPACO, slug: 'sono', nome: 'Sono', ordem: 1 }], error: null }] } })
    expect(valor(await criarDadosComunidadeSupabase(cliente).listarEspacos())).toEqual([{ id: ESPACO, slug: 'sono', nome: 'Sono', ordem: 1 }])
    expect(passo(chamadas[0], 'select')).toEqual(['id, slug, nome, ordem'])
    expect(passo(chamadas[0], 'order')).toEqual(['ordem'])
  })

  it('listar tópicos: 20 por página, criado_em e id decrescentes, filtro de faixa, autores e contagem de respostas', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      tabelas: {
        topicos: [{ data: [linhaDoTopico()], error: null }],
        perfis_publicos: [{ data: [linhaDoPerfil()], error: null }],
        respostas: [{ data: null, count: 2, error: null }],
      },
    })
    const pagina = valor(await criarDadosComunidadeSupabase(cliente).listarTopicos(ESPACO, 2, '3_6_meses'))
    expect(pagina.haMais).toBe(false)
    expect(pagina.itens[0]).toMatchObject({ id: TOPICO, respostas: 2, autor: { apelido: 'apelido_um' } })

    const topicos = doRecurso(chamadas, 'topicos')[0]
    expect(passo(topicos, 'select')).toEqual(['id, espaco_id, autor_id, titulo, corpo, faixa_etaria, estado, motivo_moderacao, criado_em, editado_em'])
    expect(topicos.passos.filter(([n]) => n === 'eq')).toEqual([['eq', ['espaco_id', ESPACO]], ['eq', ['faixa_etaria', '3_6_meses']]])
    expect(topicos.passos.filter(([n]) => n === 'order')).toEqual([['order', ['criado_em', { ascending: false }]], ['order', ['id', { ascending: false }]]])
    expect(passo(topicos, 'range')).toEqual([40, 59])
    // Uma contagem por tópico, só o cabeçalho (sem linhas): nenhum limite de 1000 linhas entra no número.
    const contagem = doRecurso(chamadas, 'respostas')
    expect(contagem).toHaveLength(1)
    expect(passo(contagem[0], 'select')).toEqual(['id', { count: 'exact', head: true }])
    expect(passo(contagem[0], 'eq')).toEqual(['topico_id', TOPICO])
  })

  it('a contagem de respostas é uma por tópico, e a que não é número dá erro `desconhecido`', async () => {
    const vinte = Array.from({ length: 3 }, (_, n) => linhaDoTopico({ id: `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}` }))
    const { cliente, chamadas } = criarClienteFalso({
      tabelas: { topicos: [{ data: vinte, error: null }], respostas: [{ data: null, count: 1500, error: null }] },
    })
    const pagina = valor(await criarDadosComunidadeSupabase(cliente).listarTopicos(ESPACO, 0, null))
    expect(pagina.itens.map((t) => t.respostas)).toEqual([1500, 1500, 1500])
    expect(doRecurso(chamadas, 'respostas')).toHaveLength(3)
    const quebrada = criarClienteFalso({ tabelas: { topicos: [{ data: vinte, error: null }], respostas: [{ data: [], error: null }] } })
    expect(erro(await criarDadosComunidadeSupabase(quebrada.cliente).listarTopicos(ESPACO, 0, null)).chave).toBe('desconhecido')
  })

  it('uma página cheia (20) diz que pode haver mais', async () => {
    const vinte = Array.from({ length: 20 }, (_, n) => linhaDoTopico({ id: `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}` }))
    const { cliente } = criarClienteFalso({
      tabelas: { topicos: [{ data: vinte, error: null }], respostas: [{ data: null, count: 0, error: null }] },
    })
    expect(valor(await criarDadosComunidadeSupabase(cliente).listarTopicos(ESPACO, 0, null)).haMais).toBe(true)
  })

  it('ler tópico e respostas: as colunas escritas, respostas por criado_em e id crescentes, 100 por página', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      tabelas: { topicos: [{ data: linhaDoTopico(), error: null }], respostas: [{ data: [linhaDaResposta()], error: null }] },
    })
    const dados = criarDadosComunidadeSupabase(cliente)
    expect(valor(await dados.lerTopico(TOPICO))?.titulo).toBe('Título')
    expect(valor(await dados.lerRespostas(TOPICO, 1)).itens).toHaveLength(1)
    const [topico, respostas] = chamadas
    expect(passo(topico, 'maybeSingle')).toEqual([])
    expect(passo(topico, 'eq')).toEqual(['id', TOPICO])
    expect(passo(respostas, 'select')).toEqual(['id, topico_id, autor_id, resposta_a, corpo, estado, motivo_moderacao, criado_em, editado_em'])
    expect(respostas.passos.filter(([n]) => n === 'order')).toEqual([['order', ['criado_em', { ascending: true }]], ['order', ['id', { ascending: true }]]])
    expect(passo(respostas, 'range')).toEqual([100, 199])
    const vazio = criarClienteFalso({ tabelas: { topicos: [{ data: null, error: null }] } })
    expect(valor(await criarDadosComunidadeSupabase(vazio.cliente).lerTopico(TOPICO))).toBeNull()
  })

  it('ler resposta: a resposta e o título do tópico dela', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      tabelas: { respostas: [{ data: linhaDaResposta(), error: null }], topicos: [{ data: { id: TOPICO, titulo: 'Título' }, error: null }] },
    })
    expect(valor(await criarDadosComunidadeSupabase(cliente).lerResposta('a0000000-0000-4000-8000-0000000000c1'))).toMatchObject({ topicoTitulo: 'Título' })
    expect(passo(doRecurso(chamadas, 'topicos')[0], 'select')).toEqual(['id, titulo'])
  })

  it('conferir envio: o perfil próprio e os mesmos campos do envio, do mais novo ao mais antigo', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      rpc: { meu_perfil_id: { data: PERFIL, error: null } },
      tabelas: { topicos: [{ data: [{ id: TOPICO }], error: null }], respostas: [{ data: [{ id: 'a0000000-0000-4000-8000-0000000000c1' }], error: null }] },
    })
    const dados = criarDadosComunidadeSupabase(cliente)
    expect(valor(await dados.conferirTopicos(ESPACO, 'Título', 'Corpo', null))).toEqual([TOPICO])
    const topicos = doRecurso(chamadas, 'topicos')[0]
    expect(passo(topicos, 'select')).toEqual(['id'])
    expect(topicos.passos.filter(([n]) => n === 'eq')).toEqual([['eq', ['autor_id', PERFIL]], ['eq', ['espaco_id', ESPACO]], ['eq', ['titulo', 'Título']], ['eq', ['corpo', 'Corpo']]])
    expect(passo(topicos, 'is')).toEqual(['faixa_etaria', null])
    expect(valor(await dados.conferirRespostas(TOPICO, TOPICO, 'Resposta'))).toHaveLength(1)
    expect(doRecurso(chamadas, 'respostas')[0].passos.filter(([n]) => n === 'eq')).toContainEqual(['eq', ['resposta_a', TOPICO]])
  })

  it('criar tópico e responder: insert das colunas escritas SEM pedir a linha de volta; o id vem da leitura depois, o que não estava antes', async () => {
    const velho = 'a0000000-0000-4000-8000-0000000000b0'
    const respostaVelha = 'a0000000-0000-4000-8000-0000000000c0'
    const respostaNova = 'a0000000-0000-4000-8000-0000000000c1'
    const { cliente, chamadas } = criarClienteFalso({
      rpc: { meu_perfil_id: { data: PERFIL, error: null } },
      tabelas: {
        // antes (um igual já existia), o insert, depois (o novo, mais recente, vem primeiro).
        topicos: [{ data: [{ id: velho }], error: null }, { data: null, error: null }, { data: [{ id: TOPICO }, { id: velho }], error: null }],
        respostas: [{ data: [{ id: respostaVelha }], error: null }, { data: null, error: null }, { data: [{ id: respostaNova }, { id: respostaVelha }], error: null }],
      },
    })
    const dados = criarDadosComunidadeSupabase(cliente)
    expect(valor(await dados.criarTopico(ESPACO, 'Título', 'Corpo', '0_3_meses'))).toBe(TOPICO)
    expect(valor(await dados.responder(TOPICO, null, 'Resposta'))).toBe(respostaNova)

    for (const [tabela, colunasDoInsert] of [
      ['topicos', { espaco_id: ESPACO, autor_id: PERFIL, titulo: 'Título', corpo: 'Corpo', faixa_etaria: '0_3_meses' }],
      ['respostas', { topico_id: TOPICO, autor_id: PERFIL, resposta_a: null, corpo: 'Resposta' }],
    ] as const) {
      const [antes, insercao, depois] = doRecurso(chamadas, tabela)
      expect(passo(insercao, 'insert')).toEqual([colunasDoInsert])
      // Sem `.select()` nem `.single()`: a política de leitura não vê a linha do mesmo comando.
      expect(insercao.passos.map(([nome]) => nome)).toEqual(['insert'])
      expect(passo(antes, 'select')).toEqual(['id'])
      expect(passo(depois, 'select')).toEqual(['id'])
    }
  })

  it('o insert que grava e não aparece na leitura depois é `desconhecido`; o erro do insert passa como veio', async () => {
    const sumida = criarClienteFalso({
      rpc: { meu_perfil_id: { data: PERFIL, error: null } },
      tabelas: { topicos: [{ data: [], error: null }] },
    })
    expect(erro(await criarDadosComunidadeSupabase(sumida.cliente).criarTopico(ESPACO, 'Título', 'Corpo', null)).chave).toBe('desconhecido')
    const negada = criarClienteFalso({
      rpc: { meu_perfil_id: { data: PERFIL, error: null } },
      tabelas: { respostas: [{ data: [], error: null }, { data: null, error: { code: '42501', message: 'new row violates row-level security policy for table "respostas"' } }] },
    })
    expect(erro(await criarDadosComunidadeSupabase(negada.cliente).responder(TOPICO, null, 'Resposta'))).toMatchObject({ chave: 'sem_permissao', codigo: '42501' })
  })

  it('sem perfil próprio, publicar dá "sem perfil" (o mesmo erro do banco)', async () => {
    const { cliente } = criarClienteFalso({ rpc: { meu_perfil_id: { data: null, error: null } } })
    expect(erro(await criarDadosComunidadeSupabase(cliente).criarTopico(ESPACO, 'Título', 'Corpo', null))).toMatchObject({ chave: 'sem_perfil', codigo: 'P0001' })
  })

  it('editar tópico e resposta: update das colunas escritas, devolvendo id; zero linhas é "nao_editavel"', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      tabelas: { topicos: [{ data: [{ id: TOPICO }], error: null }], respostas: [{ data: [], error: null }] },
    })
    const dados = criarDadosComunidadeSupabase(cliente)
    expect(valor(await dados.editarTopico(TOPICO, 'Novo', 'Corpo novo', null))).toBe(TOPICO)
    expect(passo(doRecurso(chamadas, 'topicos')[0], 'update')).toEqual([{ titulo: 'Novo', corpo: 'Corpo novo', faixa_etaria: null }])
    expect(erro(await dados.editarResposta('a0000000-0000-4000-8000-0000000000c1', 'Novo')).chave).toBe('nao_editavel')
    expect(passo(doRecurso(chamadas, 'respostas')[0], 'update')).toEqual([{ corpo: 'Novo' }])
  })

  it('denunciar: rpc denunciar com p_motivo, p_topico_id, p_resposta_id, p_perfil_id e p_texto', async () => {
    const { cliente, chamadas } = criarClienteFalso({ rpc: { denunciar: { data: TOPICO, error: null } } })
    const dados = criarDadosComunidadeSupabase(cliente)
    await dados.denunciar('spam_venda', { tipo: 'topico', id: TOPICO }, 'Propaganda.')
    await dados.denunciar('outro', { tipo: 'resposta', id: TOPICO }, null)
    await dados.denunciar('risco_autolesao', { tipo: 'perfil', id: PERFIL }, null)
    expect(chamadas.map((c) => c.argumentos)).toEqual([
      { p_motivo: 'spam_venda', p_topico_id: TOPICO, p_resposta_id: null, p_perfil_id: null, p_texto: 'Propaganda.' },
      { p_motivo: 'outro', p_topico_id: null, p_resposta_id: TOPICO, p_perfil_id: null, p_texto: null },
      { p_motivo: 'risco_autolesao', p_topico_id: null, p_resposta_id: null, p_perfil_id: PERFIL, p_texto: null },
    ])
  })

  it('minhas denúncias e os alvos delas: a rpc, o título dos tópicos, o corpo das respostas e o apelido dos perfis', async () => {
    const denuncia = { id: 'a0000000-0000-4000-8000-0000000000d1', topico_id: TOPICO, resposta_id: null, perfil_id: null, motivo: 'outro', texto: null, estado: 'aberta', criada_em: AGORA, decidida_em: null }
    const { cliente, chamadas } = criarClienteFalso({
      rpc: { minhas_denuncias: { data: [denuncia, { ...denuncia, id: 'a0000000-0000-4000-8000-0000000000d2', topico_id: null, resposta_id: 'a0000000-0000-4000-8000-0000000000c1' }, { ...denuncia, id: 'a0000000-0000-4000-8000-0000000000d3', topico_id: null, perfil_id: PERFIL }], error: null } },
      tabelas: {
        topicos: [{ data: [{ id: TOPICO, titulo: 'Título' }], error: null }],
        respostas: [{ data: [{ id: 'a0000000-0000-4000-8000-0000000000c1', corpo: 'Resposta' }], error: null }],
        perfis_publicos: [{ data: [linhaDoPerfil()], error: null }],
      },
    })
    const dados = criarDadosComunidadeSupabase(cliente)
    const minhas = valor(await dados.minhasDenuncias())
    expect(minhas).toHaveLength(3)
    expect(Object.keys(minhas[0]).sort()).toEqual(['criadaEm', 'decididaEm', 'estado', 'id', 'motivo', 'perfilId', 'respostaId', 'texto', 'topicoId'])
    expect(valor(await dados.alvosDasDenuncias(minhas))).toEqual({
      topicos: { [TOPICO]: 'Título' },
      respostas: { 'a0000000-0000-4000-8000-0000000000c1': 'Resposta' },
      perfis: { [PERFIL]: 'apelido_um' },
    })
    expect(passo(doRecurso(chamadas, 'topicos')[0], 'select')).toEqual(['id, titulo'])
    expect(passo(doRecurso(chamadas, 'respostas')[0], 'select')).toEqual(['id, corpo'])
  })

  it('bloquear, desbloquear e listar bloqueios: bloqueador_id e bloqueado_id, sem confirmar a mais', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      rpc: { meu_perfil_id: { data: PERFIL, error: null } },
      tabelas: { bloqueios: [{ data: [{ bloqueado_id: OUTRO_PERFIL, criado_em: AGORA }], error: null }] },
    })
    const dados = criarDadosComunidadeSupabase(cliente)
    await dados.bloquear(OUTRO_PERFIL)
    await dados.desbloquear(OUTRO_PERFIL)
    expect(valor(await dados.listarBloqueios())).toEqual([{ perfilId: OUTRO_PERFIL, criadoEm: AGORA }])
    const [inserir, apagar, listar] = doRecurso(chamadas, 'bloqueios')
    expect(passo(inserir, 'insert')).toEqual([{ bloqueador_id: PERFIL, bloqueado_id: OUTRO_PERFIL }])
    expect(apagar.passos.map(([n]) => n)).toEqual(['delete', 'eq', 'eq'])
    expect(apagar.passos.filter(([n]) => n === 'eq')).toEqual([['eq', ['bloqueador_id', PERFIL]], ['eq', ['bloqueado_id', OUTRO_PERFIL]]])
    expect(passo(listar, 'select')).toEqual(['bloqueado_id, criado_em'])
    expect(passo(listar, 'order')).toEqual(['criado_em', { ascending: false }])
  })

  it('nenhuma chamada sai da lista da MAT-40:RF-14, e perfis_publicos e denuncias nunca são lidas com *', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      rpc: {
        meu_perfil_id: { data: PERFIL, error: null },
        aceite_vigente: { data: true, error: null },
        denunciar: { data: TOPICO, error: null },
        minhas_denuncias: { data: [], error: null },
      },
      tabelas: { versoes_termos: [{ data: null, error: null }], topicos: [{ data: [linhaDoTopico()], error: null }, { data: { id: TOPICO }, error: null }], respostas: [{ data: [], error: null }] },
    })
    const dados = criarDadosComunidadeSupabase(cliente)
    await dados.situacaoDaConta()
    await dados.aceitarTermos('v')
    await dados.criarPerfil('apelido_um', null, null)
    await dados.editarPerfil('apelido_um', null, null)
    await dados.lerPerfis([PERFIL])
    await dados.listarEspacos()
    await dados.listarTopicos(ESPACO, 0, null)
    await dados.lerTopico(TOPICO)
    await dados.lerRespostas(TOPICO, 0)
    await dados.criarTopico(ESPACO, 'Título', 'Corpo', null)
    await dados.denunciar('outro', { tipo: 'topico', id: TOPICO }, null)
    await dados.minhasDenuncias()
    await dados.alvosDasDenuncias([])
    await dados.bloquear(OUTRO_PERFIL)
    await dados.desbloquear(OUTRO_PERFIL)
    await dados.listarBloqueios()

    for (const chamada of chamadas) {
      if (chamada.tipo === 'from') expect(TABELAS_DA_COMUNIDADE, chamada.alvo).toContain(chamada.alvo)
      else expect(FUNCOES_DA_COMUNIDADE, chamada.alvo).toContain(chamada.alvo)
    }
    for (const chamada of chamadas.filter((c) => c.alvo === 'perfis_publicos' || c.alvo === 'denuncias')) {
      const colunas = passo(chamada, 'select')?.[0]
      if (colunas !== undefined) {
        expect(colunas).not.toBe('*')
        expect(String(colunas)).not.toContain('conta_id')
      }
    }
    expect(chamadas.map((c) => c.alvo)).not.toContain('contas')
  })
})

describe('erros, rede e respostas fora do formato (nenhuma operação lança)', () => {
  it('um erro do banco vira o erro do catálogo, com o código e a mensagem originais', async () => {
    const { cliente } = criarClienteFalso({ rpc: { aceitar_termos: { error: { code: 'P0001', message: 'versao nao vigente' } } } })
    expect(erro(await criarDadosComunidadeSupabase(cliente).aceitarTermos('v'))).toMatchObject({
      chave: 'versao_nao_vigente',
      codigo: 'P0001',
      mensagemOriginal: 'versao nao vigente',
    })
  })

  it('o cliente que lança (rede) vira o erro `rede`; sem sessão, `sessao_encerrada`', async () => {
    const { cliente } = criarClienteFalso({ rpc: { aceitar_termos: (() => { throw new TypeError('Failed to fetch') }) as unknown as Resposta } })
    expect(erro(await criarDadosComunidadeSupabase(cliente).aceitarTermos('v')).classe).toBe('rede')
    const semSessao = criarClienteFalso({ sessao: false })
    expect(erro(await criarDadosComunidadeSupabase(semSessao.cliente).criarPerfil('apelido_um', null, null)).classe).toBe('sessao_encerrada')
  })

  it('resposta fora do formato: erro `desconhecido`, nunca sucesso com dado parcial', async () => {
    const malformadas: Array<[string, Opcoes, (d: ReturnType<typeof criarDadosComunidadeSupabase>) => Promise<Resultado<unknown>>]> = [
      ['tópico sem título', { tabelas: { topicos: [{ data: [linhaDoTopico({ titulo: undefined })], error: null }] } }, (d) => d.listarTopicos(ESPACO, 0, null)],
      ['estado fora dos valores', { tabelas: { topicos: [{ data: linhaDoTopico({ estado: 'apagado' }), error: null }] } }, (d) => d.lerTopico(TOPICO)],
      ['data ilegível', { tabelas: { respostas: [{ data: [linhaDaResposta({ criado_em: 'ontem' })], error: null }] } }, (d) => d.lerRespostas(TOPICO, 0)],
      ['lista que não é lista', { tabelas: { espacos: [{ data: { id: 1 }, error: null }] } }, (d) => d.listarEspacos()],
      ['aceite que não é booleano', { rpc: { meu_perfil_id: { data: null, error: null }, aceite_vigente: { data: 'sim', error: null } }, tabelas: { versoes_termos: [{ data: null, error: null }] } }, (d) => d.situacaoDaConta()],
      ['papel desconhecido', { rpc: { meu_perfil_id: { data: null, error: null }, aceite_vigente: { data: true, error: null } }, tabelas: { versoes_termos: [{ data: null, error: null }], papeis_plataforma: [{ data: [{ papel: 'dono', valido_ate: null }], error: null }] } }, (d) => d.situacaoDaConta()],
      ['denúncia sem motivo', { rpc: { minhas_denuncias: { data: [{ id: TOPICO }], error: null } } }, (d) => d.minhasDenuncias()],
      ['id devolvido vazio', { rpc: { meu_perfil_id: { data: PERFIL, error: null } }, tabelas: { topicos: [{ data: { id: '' }, error: null }] } }, (d) => d.criarTopico(ESPACO, 'Título', 'Corpo', null)],
      ['perfil devolvido como número', { rpc: { meu_perfil_id: { data: 7, error: null } } }, (d) => d.conferirRespostas(TOPICO, null, 'x')],
    ]
    for (const [nome, opcoes, operacao] of malformadas) {
      const resultado = await operacao(criarDadosComunidadeSupabase(criarClienteFalso(opcoes).cliente))
      expect(resultado.ok, nome).toBe(false)
      if (!resultado.ok) expect(resultado.erro.chave, nome).toBe('desconhecido')
    }
  })
})
