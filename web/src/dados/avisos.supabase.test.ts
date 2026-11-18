import { describe, expect, it } from 'vitest'
import { criarClienteFalso } from '../teste/renderizarComDados.tsx'
import { criarDadosAvisosSupabase } from './avisos.supabase.ts'
import type { DadosAvisos } from './avisos.ts'

// O adaptador do banco (RF14:RF-03, RF-10, RN-04, RN-06): uma chamada por leitura e por escrita, o valor
// guardado chega como veio, o instante vai sem mudar e nenhum erro carrega texto de nota ou nome.

const INSTANTE = '2026-11-15T10:00:00.123456Z'

function aviso(extra: Record<string, unknown> = {}) {
  return {
    id: 'a2000000-0000-7000-8000-000000000001',
    texto: 'Fraldas P no armário de cima.',
    criada_em: INSTANTE,
    destaque_ate: null,
    autor: 'nome',
    autor_nome: 'Ícaro',
    familia_nome: 'Família Exemplo',
    familia_fuso: 'America/Sao_Paulo',
    ...extra,
  }
}

const estado = (ligados: boolean, avisos: unknown[] = [], maisDe50 = false) => ({
  data: { ligados, mais_de_50: maisDe50, avisos },
  error: null,
})

function criar(rpc: Record<string, { data?: unknown; error?: unknown }>) {
  const falso = criarClienteFalso({ rpc })
  return { ...falso, dados: criarDadosAvisosSupabase(falso.cliente) }
}

describe('RF14:RF-03 o adaptador mostra o valor que o banco guardou', () => {
  async function conferir(guardado: boolean, devolvidoPeloBanco: boolean) {
    const { dados } = criar({ avisos_ler_estado: estado(devolvidoPeloBanco) })
    const lido = await dados.lerEstado()
    expect(lido.ok && lido.valor.ligados).toBe(guardado)
  }

  it('ligado e desligado saem como estão guardados', async () => {
    await conferir(true, true)
    await conferir(false, false)
  })

  it('controle negativo: um banco que devolve o valor contrário faz a conferência falhar', async () => {
    await expect(conferir(true, false)).rejects.toThrow()
    await expect(conferir(false, true)).rejects.toThrow()
  })
})

describe('RF14:RN-04 uma chamada por leitura e por escrita', () => {
  const operacoes: Array<[string, (dados: DadosAvisos) => Promise<unknown>]> = [
    ['avisos_ler_estado', (dados) => dados.lerEstado()],
    ['avisos_definir_ligados', (dados) => dados.definirLigados(true)],
    ['avisos_marcar_vistos', (dados) => dados.marcarVistos(INSTANTE)],
  ]

  async function contarChamadas(duplicar: boolean) {
    for (const [nome, executar] of operacoes) {
      const { cliente, rpc } = criar({ avisos_ler_estado: estado(true) })
      const dados = criarDadosAvisosSupabase(
        duplicar
          ? ({
              ...cliente,
              rpc: async (...args: unknown[]) => {
                await (rpc as (...a: unknown[]) => Promise<unknown>)(...args)
                return (rpc as (...a: unknown[]) => Promise<unknown>)(...args)
              },
            } as unknown as typeof cliente)
          : cliente,
      )
      await executar(dados)
      expect(rpc, nome).toHaveBeenCalledTimes(1)
      expect(rpc.mock.calls[0][0]).toBe(nome)
    }
  }

  it('cada leitura de estado (preferência inclusive) e cada escrita é uma chamada', async () => {
    await contarChamadas(false)
  })

  it('controle negativo: um cliente que conta duas chamadas faz a conferência falhar', async () => {
    await expect(contarChamadas(true)).rejects.toThrow()
  })

  it('a leitura devolve no máximo 50 avisos e a marca; mais que isso é resposta fora do formato', async () => {
    const cinquenta = Array.from({ length: 50 }, (_, i) => aviso({ id: `a2000000-0000-7000-8000-${String(i + 1).padStart(12, '0')}` }))
    const cheio = await criar({ avisos_ler_estado: estado(true, cinquenta, true) }).dados.lerEstado()
    expect(cheio.ok && cheio.valor.avisos).toHaveLength(50)
    expect(cheio.ok && cheio.valor.maisDe50).toBe(true)
    const demais = await criar({ avisos_ler_estado: estado(true, [...cinquenta, aviso({ id: 'a2000000-0000-7000-8000-000000000099' })], true) }).dados.lerEstado()
    expect(demais.ok).toBe(false)
  })

  it('o estado desligado traz zero avisos e a marca falsa', async () => {
    const lido = await criar({ avisos_ler_estado: estado(false) }).dados.lerEstado()
    expect(lido).toEqual({ ok: true, valor: { ligados: false, avisos: [], maisDe50: false } })
  })
})

describe('RF14:RF-10 o instante vai ao banco como está', () => {
  async function conferir(normalizar: boolean) {
    const { dados, rpc } = criar({})
    const enviado = normalizar ? new Date(INSTANTE).toISOString() : INSTANTE
    await dados.marcarVistos(enviado)
    expect(rpc).toHaveBeenCalledWith('avisos_marcar_vistos', { p_ate: INSTANTE })
  }

  it('o texto do instante, com os microssegundos, chega sem mudar', async () => {
    await conferir(false)
  })

  it('controle negativo: um instante normalizado para milissegundos faz a conferência falhar', async () => {
    await expect(conferir(true)).rejects.toThrow()
  })

  it('o instante de criação do aviso volta como o banco o mandou', async () => {
    const lido = await criar({ avisos_ler_estado: estado(true, [aviso()]) }).dados.lerEstado()
    expect(lido.ok && lido.valor.avisos[0].criadaEm).toBe(INSTANTE)
  })

  it('definirLigados manda o valor pedido, uma vez, e devolve null', async () => {
    const { dados, rpc } = criar({})
    expect(await dados.definirLigados(true)).toEqual({ ok: true, valor: null })
    expect(rpc).toHaveBeenCalledWith('avisos_definir_ligados', { p_ligados: true })
  })
})

describe('RF14:RF-09 o autor de cada aviso', () => {
  it('nome só para quem tem vínculo ativo; removido e saiu não trazem nome', async () => {
    const lido = await criar({
      avisos_ler_estado: estado(true, [
        aviso(),
        aviso({ id: 'a2000000-0000-7000-8000-000000000002', autor: 'removido', autor_nome: null }),
        aviso({ id: 'a2000000-0000-7000-8000-000000000003', autor: 'saiu', autor_nome: null, destaque_ate: INSTANTE }),
      ]),
    }).dados.lerEstado()
    expect(lido.ok && lido.valor.avisos.map((a) => a.autor)).toEqual([{ tipo: 'nome', nome: 'Ícaro' }, { tipo: 'removido' }, { tipo: 'saiu' }])
    expect(lido.ok && lido.valor.avisos[0]).toMatchObject({ familiaNome: 'Família Exemplo', familiaFuso: 'America/Sao_Paulo', destaqueAte: null })
    expect(lido.ok && lido.valor.avisos[2].destaqueAte).toBe(INSTANTE)
  })
})

describe('RF14:RN-06 e RF-07 os erros chegam a quem chamou, sem texto de nota nem nome', () => {
  const MARCADOR = 'TEXTO-SECRETO-DA-NOTA'

  it('uma resposta fora do formato é erro, e o erro não carrega o texto nem o nome', async () => {
    const quebrado = { ...aviso({ texto: MARCADOR, autor_nome: 'NOME-SECRETO' }), id: null }
    const lido = await criar({ avisos_ler_estado: estado(true, [quebrado]) }).dados.lerEstado()
    expect(lido.ok).toBe(false)
    expect(JSON.stringify(lido)).not.toContain(MARCADOR)
    expect(JSON.stringify(lido)).not.toContain('NOME-SECRETO')
  })

  it('a preferência de outro tipo, o autor desconhecido e a lista que não é lista são erro, nunca valor solto', async () => {
    for (const data of [
      { ligados: 'sim', mais_de_50: false, avisos: [] },
      { ligados: true, mais_de_50: false, avisos: [aviso({ autor: 'alguem' })] },
      { ligados: true, mais_de_50: false, avisos: {} },
      { ligados: true, mais_de_50: 'não', avisos: [] },
      null,
    ]) {
      const lido = await criar({ avisos_ler_estado: { data, error: null } }).dados.lerEstado()
      expect(lido.ok, JSON.stringify(data)).toBe(false)
    }
  })

  it('sessão encerrada, sem permissão e rede têm a classe de sempre', async () => {
    const sessao = await criar({ avisos_ler_estado: { data: null, error: { code: 'PGRST301', message: 'JWT expired', status: 401 } } }).dados.lerEstado()
    expect(!sessao.ok && sessao.erro.classe).toBe('sessao_encerrada')
    const anon = await criar({ avisos_definir_ligados: { data: null, error: { code: '42501', message: 'permission denied for function' } } }).dados.definirLigados(true)
    expect(!anon.ok && anon.erro.classe).toBe('sem_permissao')
    const rede = await criar({ avisos_marcar_vistos: { data: null, error: new TypeError('Failed to fetch') } }).dados.marcarVistos(INSTANTE)
    expect(!rede.ok && rede.erro.classe).toBe('rede')
  })

  describe('nenhum erro devolvido carrega a mensagem de origem', () => {
    const MARCADOR = 'MARCADOR-NOTA-E-NOME'
    const serializar = (valor: unknown) =>
      JSON.stringify(valor, (_chave, item) => (item instanceof Error ? { nome: item.name, mensagem: item.message } : item))

    const operacoes: Array<[string, (dados: DadosAvisos) => Promise<{ ok: boolean; erro?: { classe: string; chave: string; codigo: string } }>]> = [
      ['lerEstado', (dados) => dados.lerEstado()],
      ['definirLigados', (dados) => dados.definirLigados(true)],
      ['marcarVistos', (dados) => dados.marcarVistos(INSTANTE)],
    ]

    const origens: Array<[string, () => Promise<unknown>, { classe: string; chave: string; codigo: string }]> = [
      [
        'o rpc responde com erro do Postgres',
        async () => ({ data: null, error: { code: 'XX000', message: MARCADOR } }),
        { classe: 'desconhecido', chave: 'desconhecido', codigo: 'XX000' },
      ],
      ['o rpc rejeita com um Error', () => Promise.reject(new Error(MARCADOR)), { classe: 'desconhecido', chave: 'desconhecido', codigo: '' }],
      [
        'o rpc rejeita com um erro já classificado',
        () => Promise.reject({ classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: MARCADOR }),
        { classe: 'rede', chave: 'rede', codigo: 'rede' },
      ],
    ]

    for (const [nomeDaOperacao, executar] of operacoes) {
      for (const [nomeDaOrigem, rpc, classificacao] of origens) {
        it(`${nomeDaOperacao}: ${nomeDaOrigem}; devolve erro sem o marcador e com a classificação mantida`, async () => {
          const { cliente } = criarClienteFalso({})
          const dados = criarDadosAvisosSupabase({ ...cliente, rpc } as unknown as typeof cliente)
          const resultado = await executar(dados).then(
            (lido) => lido,
            (lancado: unknown) => ({ ok: true, erro: undefined, lancou: serializar(lancado) }),
          )
          expect(resultado.ok).toBe(false)
          expect(serializar(resultado)).not.toContain(MARCADOR)
          expect(resultado.erro).toMatchObject(classificacao)
        })
      }
    }
  })

  it('um cliente que lança também vira erro, sem lançar para a tela', async () => {
    const { cliente } = criarClienteFalso({})
    const quebrado = criarDadosAvisosSupabase({ ...cliente, rpc: () => Promise.reject(new TypeError('Failed to fetch')) } as unknown as typeof cliente)
    for (const resultado of await Promise.all([quebrado.lerEstado(), quebrado.definirLigados(false), quebrado.marcarVistos(INSTANTE)])) {
      expect(resultado.ok).toBe(false)
    }
  })
})
