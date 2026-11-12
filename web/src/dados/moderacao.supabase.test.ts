import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Resultado } from './comum.ts'
import { criarDadosModeracaoSupabase } from './moderacao.supabase.ts'

// MAT-40, teste 2 (parte 40b): a implementação do banco do painel com um cliente falso (um objeto que grava
// as chamadas, sem rede). Cada operação chama o recurso da sua tabela ou função, com os nomes de parâmetro e
// as colunas exatos, e nunca lê `denuncias` com `select *`.

type Resposta = { data?: unknown; error?: unknown }
type Passo = [string, unknown[]]

interface Chamada {
  tipo: 'from' | 'rpc'
  alvo: string
  passos: Passo[]
  argumentos?: unknown
}

const CONTA = 'a0000000-0000-4000-8000-000000000001'
const OUTRA_CONTA = 'a0000000-0000-4000-8000-000000000002'
const PERFIL = 'a0000000-0000-4000-8000-0000000000a1'
const TOPICO = 'a0000000-0000-4000-8000-0000000000b1'
const RESPOSTA = 'a0000000-0000-4000-8000-0000000000c1'
const ESPACO = 'a0000000-0000-4000-8000-0000000000e1'
const DENUNCIA = 'a0000000-0000-4000-8000-0000000000d1'
const AGORA = '2026-11-05T14:30:00.123456+00:00'

const TABELAS_PERMITIDAS = ['denuncias', 'auditoria_moderacao', 'papeis_plataforma', 'topicos', 'respostas']
const FUNCOES_PERMITIDAS = ['moderar_conteudo', 'decidir_denuncia', 'conceder_papel_plataforma', 'revogar_papel_plataforma']

interface Opcoes {
  tabelas?: Record<string, Resposta[]>
  rpc?: Record<string, Resposta>
  sessao?: boolean
  mfa?: Record<string, unknown>
}

/** Um cliente do Supabase feito à mão: grava cada chamada e devolve as respostas em ordem (a última se repete). */
function criarClienteFalso({ tabelas = {}, rpc = {}, sessao = true, mfa = {} }: Opcoes = {}) {
  const chamadas: Chamada[] = []
  const filas = new Map(Object.entries(tabelas).map(([tabela, fila]) => [tabela, [...fila]]))
  const vazia: Resposta = { data: [], error: null }

  const from = vi.fn((tabela: string) => {
    const chamada: Chamada = { tipo: 'from', alvo: tabela, passos: [] }
    chamadas.push(chamada)
    const fila = filas.get(tabela)
    const resposta = fila && fila.length > 1 ? fila.shift()! : (fila?.[0] ?? vazia)
    const resolver = async () => resposta
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
    return rpc[nome] ?? { data: null, error: null }
  })

  const chamadasDoMfa: Array<[string, unknown]> = []
  const registrar = (nome: string, padrao: unknown) =>
    vi.fn(async (argumento?: unknown) => {
      chamadasDoMfa.push([nome, argumento])
      return (mfa[nome] as unknown) ?? padrao
    })
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: sessao ? { user: { id: CONTA } } : null }, error: null })),
    mfa: {
      getAuthenticatorAssuranceLevel: registrar('getAuthenticatorAssuranceLevel', { data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
      listFactors: registrar('listFactors', { data: { all: [], totp: [] }, error: null }),
      unenroll: registrar('unenroll', { data: { id: 'x' }, error: null }),
      enroll: registrar('enroll', { data: { id: 'f-novo', totp: { qr_code: 'data:image/png;base64,AAAA', secret: 'CHAVE' } }, error: null }),
      challengeAndVerify: registrar('challengeAndVerify', { data: {}, error: null }),
    },
  }
  return { cliente: { auth, from, rpc: funcao } as unknown as SupabaseClient, chamadas, chamadasDoMfa }
}

const passo = (chamada: Chamada, nome: string) => chamada.passos.find(([n]) => n === nome)?.[1]
const passos = (chamada: Chamada, nome: string) => chamada.passos.filter(([n]) => n === nome).map(([, argumentos]) => argumentos)
const doRecurso = (chamadas: Chamada[], alvo: string) => chamadas.filter((c) => c.alvo === alvo)

const linhaDaDenuncia = (extras: Record<string, unknown> = {}) => ({
  id: DENUNCIA,
  topico_id: TOPICO,
  resposta_id: null,
  perfil_id: null,
  motivo: 'outro',
  texto: null,
  estado: 'aberta',
  decidida_em: null,
  criada_em: AGORA,
  ...extras,
})

const linhaDaAuditoria = (extras: Record<string, unknown> = {}) => ({
  id: 'a0000000-0000-4000-8000-0000000000f1',
  ator_id: CONTA,
  acao: 'ocultar',
  alvo_tipo: 'topico',
  alvo_id: TOPICO,
  estado_anterior: 'visivel',
  estado_novo: 'oculto',
  motivo: 'Motivo',
  denuncia_id: null,
  conteudo: null,
  valido_ate: null,
  criado_em: AGORA,
  ...extras,
})

const linhaDoTopico = (extras: Record<string, unknown> = {}) => ({
  id: TOPICO,
  espaco_id: ESPACO,
  autor_id: PERFIL,
  titulo: 'Título',
  corpo: 'Corpo',
  faixa_etaria: null,
  estado: 'oculto',
  motivo_moderacao: 'Motivo',
  criado_em: AGORA,
  editado_em: null,
  ...extras,
})

function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`esperava sucesso: ${resultado.erro.chave} ${resultado.erro.mensagemOriginal}`)
  return resultado.valor
}

function erro<T>(resultado: Resultado<T>) {
  if (resultado.ok) throw new Error('esperava erro')
  return resultado.erro
}

const muitas = (quantas: number) =>
  Array.from({ length: quantas }, (_, indice) => linhaDaDenuncia({ id: `a0000000-0000-4000-8000-${String(indice + 1000).padStart(12, '0')}` }))

describe('a fila de denúncias', () => {
  it('uma consulta por grupo de prioridade, na ordem dos grupos, com as colunas escritas e a ordem pedida', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      tabelas: {
        denuncias: [
          { data: [linhaDaDenuncia({ id: 'a0000000-0000-4000-8000-000000000d01', motivo: 'risco_autolesao' })], error: null },
          { data: [linhaDaDenuncia({ id: 'a0000000-0000-4000-8000-000000000d02', motivo: 'ataque_assedio' })], error: null },
          { data: [linhaDaDenuncia({ id: 'a0000000-0000-4000-8000-000000000d03', motivo: 'outro' })], error: null },
        ],
      },
    })
    const fila = valor(await criarDadosModeracaoSupabase(cliente).filaDeDenuncias({ estados: ['aberta', 'em_analise'], motivo: null }, 0))
    expect(fila.itens.map((d) => d.motivo)).toEqual(['risco_autolesao', 'ataque_assedio', 'outro'])
    expect(fila.haMais).toBe(false)

    const consultas = doRecurso(chamadas, 'denuncias')
    expect(consultas).toHaveLength(3)
    for (const consulta of consultas) {
      expect(passo(consulta, 'select')).toEqual(['id, topico_id, resposta_id, perfil_id, motivo, texto, estado, decidida_em, criada_em'])
      expect(passos(consulta, 'in')[0]).toEqual(['estado', ['aberta', 'em_analise']])
      expect(passos(consulta, 'order')).toEqual([['criada_em', { ascending: true }], ['id', { ascending: true }]])
      expect(passo(consulta, 'range')).toEqual([0, 49])
    }
    expect(passos(consultas[0], 'in')[1]).toEqual(['motivo', ['risco_autolesao', 'exposicao_crianca', 'conteudo_sexual']])
    expect(passos(consultas[1], 'in')[1]).toEqual(['motivo', ['ataque_assedio', 'dados_pessoais']])
    expect(passos(consultas[2], 'in')[1]).toEqual(['motivo', ['saude_perigosa', 'spam_venda', 'outro']])
  })

  it('nenhuma caixa marcada equivale às quatro, e um motivo só consulta o grupo dele', async () => {
    const { cliente, chamadas } = criarClienteFalso({ tabelas: { denuncias: [{ data: [linhaDaDenuncia()], error: null }] } })
    valor(await criarDadosModeracaoSupabase(cliente).filaDeDenuncias({ estados: [], motivo: 'outro' }, 0))
    const consultas = doRecurso(chamadas, 'denuncias')
    expect(consultas).toHaveLength(1)
    expect(passos(consultas[0], 'in')[0]).toEqual(['estado', ['aberta', 'em_analise', 'procedente', 'improcedente']])
    expect(passo(consultas[0], 'eq')).toEqual(['motivo', 'outro'])
  })

  it('páginas de 50: "haMais" só com a página cheia, e a 2ª página pede as 100 primeiras de cada grupo', async () => {
    const { cliente, chamadas } = criarClienteFalso({ tabelas: { denuncias: [{ data: muitas(50), error: null }] } })
    const dados = criarDadosModeracaoSupabase(cliente)
    const primeira = valor(await dados.filaDeDenuncias({ estados: ['aberta'], motivo: null }, 0))
    expect(primeira.itens).toHaveLength(50)
    expect(primeira.haMais).toBe(true)
    valor(await dados.filaDeDenuncias({ estados: ['aberta'], motivo: null }, 1))
    expect(passo(doRecurso(chamadas, 'denuncias').at(-1)!, 'range')).toEqual([0, 99])
  })

  it('uma linha fora do formato é falha de leitura (desconhecido), nunca dado parcial', async () => {
    const { cliente } = criarClienteFalso({ tabelas: { denuncias: [{ data: [linhaDaDenuncia({ motivo: 'inventado' })], error: null }] } })
    const falha = erro(await criarDadosModeracaoSupabase(cliente).filaDeDenuncias({ estados: [], motivo: null }, 0))
    expect(falha.chave).toBe('desconhecido')
  })

  it('"lerDenuncia": colunas escritas, o id pedido, e nulo quando o banco não devolve a linha', async () => {
    const { cliente, chamadas } = criarClienteFalso({ tabelas: { denuncias: [{ data: linhaDaDenuncia(), error: null }] } })
    const lida = valor(await criarDadosModeracaoSupabase(cliente).lerDenuncia(DENUNCIA))
    expect(lida?.id).toBe(DENUNCIA)
    expect(passo(chamadas[0], 'select')).toEqual(['id, topico_id, resposta_id, perfil_id, motivo, texto, estado, decidida_em, criada_em'])
    expect(passo(chamadas[0], 'eq')).toEqual(['id', DENUNCIA])

    const vazio = criarClienteFalso({ tabelas: { denuncias: [{ data: null, error: null }] } })
    expect(valor(await criarDadosModeracaoSupabase(vazio.cliente).lerDenuncia(DENUNCIA))).toBeNull()
  })
})

describe('as quatro funções de ação, com os nomes de parâmetro escritos', () => {
  it('moderar_conteudo: tipo, id, estado, motivo e a denúncia (nula quando não há)', async () => {
    const { cliente, chamadas } = criarClienteFalso({ rpc: { moderar_conteudo: { data: DENUNCIA, error: null } } })
    const dados = criarDadosModeracaoSupabase(cliente)
    expect(valor(await dados.moderarConteudo({ tipo: 'topico', id: TOPICO }, 'oculto', 'Motivo', DENUNCIA))).toBe(DENUNCIA)
    valor(await dados.moderarConteudo({ tipo: 'resposta', id: RESPOSTA }, 'visivel', 'Outro motivo', null))
    expect(chamadas[0].argumentos).toEqual({
      p_alvo_tipo: 'topico',
      p_alvo_id: TOPICO,
      p_novo_estado: 'oculto',
      p_motivo: 'Motivo',
      p_denuncia_id: DENUNCIA,
    })
    expect(chamadas[1].argumentos).toEqual({
      p_alvo_tipo: 'resposta',
      p_alvo_id: RESPOSTA,
      p_novo_estado: 'visivel',
      p_motivo: 'Outro motivo',
      p_denuncia_id: null,
    })
  })

  it('decidir_denuncia, conceder_papel_plataforma e revogar_papel_plataforma', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      rpc: {
        decidir_denuncia: { data: DENUNCIA, error: null },
        conceder_papel_plataforma: { data: DENUNCIA, error: null },
        revogar_papel_plataforma: { data: DENUNCIA, error: null },
      },
    })
    const dados = criarDadosModeracaoSupabase(cliente)
    valor(await dados.decidirDenuncia(DENUNCIA, 'procedente', 'Motivo'))
    valor(await dados.concederPapel(OUTRA_CONTA, 'moderador', 'Motivo', '2027-01-01T00:00:00.000Z'))
    valor(await dados.concederPapel(OUTRA_CONTA, 'admin', 'Motivo', null))
    valor(await dados.revogarPapel(OUTRA_CONTA, 'moderador', 'Motivo'))
    expect(chamadas.map((c) => [c.alvo, c.argumentos])).toEqual([
      ['decidir_denuncia', { p_denuncia_id: DENUNCIA, p_decisao: 'procedente', p_motivo: 'Motivo' }],
      ['conceder_papel_plataforma', { p_conta: OUTRA_CONTA, p_papel: 'moderador', p_motivo: 'Motivo', p_valido_ate: '2027-01-01T00:00:00.000Z' }],
      ['conceder_papel_plataforma', { p_conta: OUTRA_CONTA, p_papel: 'admin', p_motivo: 'Motivo', p_valido_ate: null }],
      ['revogar_papel_plataforma', { p_conta: OUTRA_CONTA, p_papel: 'moderador', p_motivo: 'Motivo' }],
    ])
  })

  it('os erros das funções viram a chave do catálogo (P0001 pela mensagem, 42501, P0002)', async () => {
    const casos: Array<[string, string, string]> = [
      ['P0001', 'estado igual', 'estado_igual'],
      ['P0001', 'denuncia ja decidida', 'denuncia_ja_decidida'],
      ['P0001', 'conflito de interesse', 'conflito_de_interesse'],
      ['P0001', 'ultimo admin', 'ultimo_admin'],
      ['P0002', 'conta inexistente', 'conta_inexistente'],
      ['42501', 'sem papel de plataforma', 'sem_papel'],
    ]
    for (const [code, message, chave] of casos) {
      const { cliente } = criarClienteFalso({ rpc: { moderar_conteudo: { data: null, error: { code, message } } } })
      const falha = erro(await criarDadosModeracaoSupabase(cliente).moderarConteudo({ tipo: 'topico', id: TOPICO }, 'oculto', 'M', null))
      expect(falha.chave, `${code} ${message}`).toBe(chave)
    }
  })

  it('uma resposta da função que não é um id é falha (desconhecido), e a rede é "rede"', async () => {
    const semId = criarClienteFalso({ rpc: { decidir_denuncia: { data: null, error: null } } })
    expect(erro(await criarDadosModeracaoSupabase(semId.cliente).decidirDenuncia(DENUNCIA, 'procedente', 'M')).chave).toBe('desconhecido')
    const semRede = criarClienteFalso({ rpc: { decidir_denuncia: { data: null, error: { name: 'TypeError', message: 'Failed to fetch' } } } })
    expect(erro(await criarDadosModeracaoSupabase(semRede.cliente).decidirDenuncia(DENUNCIA, 'procedente', 'M')).chave).toBe('rede')
  })
})

describe('auditoria, papéis e histórico', () => {
  it('"auditoria": as 12 colunas, a mais nova primeiro, em páginas de 50', async () => {
    const { cliente, chamadas } = criarClienteFalso({ tabelas: { auditoria_moderacao: [{ data: [linhaDaAuditoria()], error: null }] } })
    const pagina = valor(await criarDadosModeracaoSupabase(cliente).auditoria(2))
    expect(pagina.itens[0].acao).toBe('ocultar')
    expect(pagina.haMais).toBe(false)
    const consulta = chamadas[0]
    expect(passo(consulta, 'select')).toEqual([
      'id, ator_id, acao, alvo_tipo, alvo_id, estado_anterior, estado_novo, motivo, denuncia_id, conteudo, valido_ate, criado_em',
    ])
    expect(passos(consulta, 'order')).toEqual([['criado_em', { ascending: false }], ['id', { ascending: false }]])
    expect(passo(consulta, 'range')).toEqual([100, 149])
  })

  it('"papeis": as colunas escritas, da concessão mais nova à mais antiga', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      tabelas: {
        papeis_plataforma: [
          { data: [{ conta_id: CONTA, papel: 'admin', concedido_por: null, concedido_em: AGORA, valido_ate: null }], error: null },
        ],
      },
    })
    const papeis = valor(await criarDadosModeracaoSupabase(cliente).papeis())
    expect(papeis).toEqual([{ contaId: CONTA, papel: 'admin', concedidoPor: null, concedidoEm: AGORA, validoAte: null }])
    expect(passo(chamadas[0], 'select')).toEqual(['conta_id, papel, concedido_por, concedido_em, valido_ate'])
    expect(passo(chamadas[0], 'order')).toEqual(['concedido_em', { ascending: false }])
  })

  it('"historicoDoPerfil": tópicos e respostas do perfil (20 de cada) e a auditoria deles (50)', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      tabelas: {
        topicos: [{ data: [linhaDoTopico()], error: null }],
        respostas: [{ data: [], error: null }],
        auditoria_moderacao: [{ data: [linhaDaAuditoria()], error: null }],
      },
    })
    const historico = valor(await criarDadosModeracaoSupabase(cliente).historicoDoPerfil(PERFIL))
    expect(historico.conteudos.map((c) => c.id)).toEqual([TOPICO])
    expect(historico.auditoria).toHaveLength(1)
    expect(passo(doRecurso(chamadas, 'topicos')[0], 'eq')).toEqual(['autor_id', PERFIL])
    expect(passo(doRecurso(chamadas, 'topicos')[0], 'limit')).toEqual([20])
    expect(passo(doRecurso(chamadas, 'respostas')[0], 'limit')).toEqual([20])
    const auditoria = doRecurso(chamadas, 'auditoria_moderacao')[0]
    expect(passo(auditoria, 'in')).toEqual(['alvo_id', [TOPICO]])
    expect(passo(auditoria, 'limit')).toEqual([50])
  })

  it('sem conteúdo no histórico, a auditoria nem é consultada', async () => {
    const { cliente, chamadas } = criarClienteFalso()
    const historico = valor(await criarDadosModeracaoSupabase(cliente).historicoDoPerfil(PERFIL))
    expect(historico).toEqual({ conteudos: [], auditoria: [] })
    expect(doRecurso(chamadas, 'auditoria_moderacao')).toHaveLength(0)
  })

  it('"lerConteudo" é a leitura da Comunidade (tópico e resposta, em qualquer estado)', async () => {
    const { cliente } = criarClienteFalso({
      tabelas: {
        topicos: [{ data: linhaDoTopico(), error: null }],
        respostas: [{ data: null, error: null }],
      },
    })
    const dados = criarDadosModeracaoSupabase(cliente)
    const topico = valor(await dados.lerConteudo('topico', TOPICO))
    expect(topico?.tipo).toBe('topico')
    expect(valor(await dados.lerConteudo('resposta', RESPOSTA))).toBeNull()
  })
})

describe('a verificação em duas etapas chama o Auth', () => {
  it('"nivelDaSessao" lê o nível; só aal2 é aal2', async () => {
    const aal2 = criarClienteFalso({ mfa: { getAuthenticatorAssuranceLevel: { data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null } } })
    expect(valor(await criarDadosModeracaoSupabase(aal2.cliente).nivelDaSessao())).toBe('aal2')
    const aal1 = criarClienteFalso()
    expect(valor(await criarDadosModeracaoSupabase(aal1.cliente).nivelDaSessao())).toBe('aal1')
  })

  it('"fatores" só devolve TOTP, com o estado de verificação', async () => {
    const { cliente } = criarClienteFalso({
      mfa: {
        listFactors: {
          data: {
            all: [
              { id: 'f1', factor_type: 'totp', status: 'verified' },
              { id: 'f2', factor_type: 'totp', status: 'unverified' },
              { id: 'f3', factor_type: 'phone', status: 'verified' },
            ],
          },
          error: null,
        },
      },
    })
    expect(valor(await criarDadosModeracaoSupabase(cliente).fatores())).toEqual([
      { id: 'f1', verificado: true },
      { id: 'f2', verificado: false },
    ])
  })

  it('"cadastrarFator" remove os TOTP não verificados antes de cadastrar e devolve o QR e a chave', async () => {
    const { cliente, chamadasDoMfa } = criarClienteFalso({
      mfa: {
        listFactors: {
          data: { all: [{ id: 'velho', factor_type: 'totp', status: 'unverified' }, { id: 'bom', factor_type: 'totp', status: 'verified' }] },
          error: null,
        },
      },
    })
    const novo = valor(await criarDadosModeracaoSupabase(cliente).cadastrarFator())
    expect(novo).toEqual({ id: 'f-novo', chave: 'CHAVE', qr: 'data:image/png;base64,AAAA' })
    expect(chamadasDoMfa.map(([nome]) => nome)).toEqual(['listFactors', 'unenroll', 'enroll'])
    expect(chamadasDoMfa[1][1]).toEqual({ factorId: 'velho' })
    expect(chamadasDoMfa[2][1]).toEqual({ factorType: 'totp' })
  })

  it('"confirmarCodigo" usa challengeAndVerify; o código recusado é codigo_invalido e qualquer outra recusa é mfa_indisponivel', async () => {
    const certo = criarClienteFalso()
    valor(await criarDadosModeracaoSupabase(certo.cliente).confirmarCodigo('f1', '123456'))
    expect(certo.chamadasDoMfa[0]).toEqual(['challengeAndVerify', { factorId: 'f1', code: '123456' }])

    const recusado = criarClienteFalso({
      mfa: { challengeAndVerify: { data: null, error: { name: 'AuthApiError', code: 'mfa_verification_failed', status: 400, message: 'Invalid TOTP code entered' } } },
    })
    expect(erro(await criarDadosModeracaoSupabase(recusado.cliente).confirmarCodigo('f1', '000000')).chave).toBe('codigo_invalido')

    const desligado = criarClienteFalso({
      mfa: { enroll: { data: null, error: { name: 'AuthApiError', code: 'mfa_totp_enroll_not_enabled', status: 400, message: 'MFA enroll is disabled for TOTP' } } },
    })
    expect(erro(await criarDadosModeracaoSupabase(desligado.cliente).cadastrarFator()).chave).toBe('mfa_indisponivel')
  })

  it('a rede, no Auth, é "rede"', async () => {
    const { cliente } = criarClienteFalso({ mfa: { listFactors: { data: null, error: { name: 'TypeError', message: 'Failed to fetch' } } } })
    expect(erro(await criarDadosModeracaoSupabase(cliente).fatores()).chave).toBe('rede')
  })
})

describe('a lista fechada de chamadas', () => {
  it('nenhuma operação toca tabela ou função fora da lista da 40b, e `denuncias` nunca usa select *', async () => {
    const { cliente, chamadas } = criarClienteFalso({
      tabelas: {
        denuncias: [{ data: [linhaDaDenuncia()], error: null }],
        auditoria_moderacao: [{ data: [linhaDaAuditoria()], error: null }],
        topicos: [{ data: linhaDoTopico(), error: null }],
        papeis_plataforma: [{ data: [], error: null }],
      },
      rpc: {
        moderar_conteudo: { data: DENUNCIA, error: null },
        decidir_denuncia: { data: DENUNCIA, error: null },
        conceder_papel_plataforma: { data: DENUNCIA, error: null },
        revogar_papel_plataforma: { data: DENUNCIA, error: null },
      },
    })
    const dados = criarDadosModeracaoSupabase(cliente)
    await dados.filaDeDenuncias({ estados: [], motivo: null }, 0)
    await dados.lerDenuncia(DENUNCIA)
    await dados.lerConteudo('topico', TOPICO)
    await dados.historicoDoPerfil(PERFIL)
    await dados.moderarConteudo({ tipo: 'topico', id: TOPICO }, 'oculto', 'M', null)
    await dados.decidirDenuncia(DENUNCIA, 'procedente', 'M')
    await dados.auditoria(0)
    await dados.papeis()
    await dados.concederPapel(OUTRA_CONTA, 'moderador', 'M', null)
    await dados.revogarPapel(OUTRA_CONTA, 'moderador', 'M')

    for (const chamada of chamadas) {
      if (chamada.tipo === 'from') expect(TABELAS_PERMITIDAS, chamada.alvo).toContain(chamada.alvo)
      else expect(FUNCOES_PERMITIDAS, chamada.alvo).toContain(chamada.alvo)
    }
    for (const chamada of doRecurso(chamadas, 'denuncias')) {
      expect(String(passo(chamada, 'select')?.[0])).not.toMatch(/\*/)
    }
  })

  it('sem sessão, uma operação do Auth devolve a sessão encerrada', async () => {
    const { cliente } = criarClienteFalso({ sessao: false })
    expect(erro(await criarDadosModeracaoSupabase(cliente).nivelDaSessao()).classe).toBe('sessao_encerrada')
  })
})
