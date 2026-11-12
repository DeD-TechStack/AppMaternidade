import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ID_BEBE, ID_FAMILIA, criarMundoDeTeste } from '../teste/rotina.fixture.ts'
import { PESSOAS } from '../teste/renderizarComDados.tsx'
import { criarDadosRotinaSupabase } from './rotina.supabase.ts'
import { LIMITES, type DadosRotina } from './rotina.tipos.ts'
import { uuidV7 } from './rotina.uuid.ts'

// A implementação do banco com um cliente falso injetado (R38-32, itens 2 e 3): o nome e os argumentos de
// cada função do Anexo A, os filtros e o `limit` de cada leitura, o mapeamento das linhas e o que acontece
// com erro, rede e resposta fora do formato. Não há rede.

type Resposta = { data?: unknown; error?: unknown }

interface Chamada {
  tabela?: string
  rpc?: string
  argumentos?: unknown
  metodos: Array<[string, unknown[]]>
}

function criarClienteFalso(responder: (chamada: Chamada) => Resposta | Promise<Resposta>) {
  const chamadas: Chamada[] = []
  // Cada `from` ou `rpc` abre uma chamada; todo método da cadeia a registra e devolve a mesma cadeia, que
  // se espera como o `PostgrestBuilder` (a resposta só sai no `then`).
  function encadear(base: Chamada): unknown {
    chamadas.push(base)
    const cadeia: unknown = new Proxy(
      {},
      {
        get(_, nome) {
          if (nome === 'then') {
            return (cumprir: (valor: unknown) => unknown, falhar: (erro: unknown) => unknown) =>
              Promise.resolve()
                .then(() => responder(base))
                .then((resposta) => ({ data: resposta.data ?? null, error: resposta.error ?? null }))
                .then(cumprir, falhar)
          }
          return (...argumentos: unknown[]) => {
            base.metodos.push([String(nome), argumentos])
            return cadeia
          }
        },
      },
    )
    return cadeia
  }
  const cliente = {
    from: (tabela: string) => encadear({ tabela, metodos: [] }),
    rpc: (nome: string, argumentos?: unknown) => encadear({ rpc: nome, argumentos, metodos: [] }),
  } as unknown as SupabaseClient
  return { cliente, chamadas }
}

const linhaDeRegistro = (extra: Record<string, unknown> = {}) => ({
  id: uuidV7(),
  familia_id: ID_FAMILIA,
  bebe_id: ID_BEBE,
  tipo: 'fralda',
  inicio: '2026-11-05T12:00:00+00:00',
  fim: null,
  detalhes: { conteudo: 'xixi' },
  nota: null,
  origem: 'ao_vivo',
  fuso: 'America/Sao_Paulo',
  deslocamento_min: -180,
  criado_por: PESSOAS.juliana.id,
  encerrado_por: null,
  versao: 1,
  recebido_em: '2026-11-05T12:00:01.5+00:00',
  atualizado_em: '2026-11-05T12:00:01.5+00:00',
  excluido_em: null,
  excluido_por: null,
  ...extra,
})

const linhaDeNota = (extra: Record<string, unknown> = {}) => ({
  id: uuidV7(),
  familia_id: ID_FAMILIA,
  bebe_id: null,
  texto: 'Pomada só à noite.',
  destaque_ate: null,
  criado_por: PESSOAS.carla.id,
  criada_em: '2026-11-05T09:00:00+00:00',
  versao: 1,
  atualizado_em: '2026-11-05T09:00:00+00:00',
  excluida_em: null,
  excluida_por: null,
  ...extra,
})

const SAO_PAULO = { fuso: 'America/Sao_Paulo', deslocamentoMin: -180 }

let conta: ReturnType<typeof criarMundoDeTeste>['conta']

beforeEach(() => {
  conta = criarMundoDeTeste().conta
})

function montar(responder: (chamada: Chamada) => Resposta | Promise<Resposta>) {
  const falso = criarClienteFalso(responder)
  const rotina: DadosRotina = criarDadosRotinaSupabase(falso.cliente, conta, { aparelho: () => SAO_PAULO })
  return { ...falso, rotina }
}

const metodo = (chamada: Chamada, nome: string) => chamada.metodos.filter(([n]) => n === nome).map(([, argumentos]) => argumentos)

describe('as escritas chamam as funções do Anexo A', () => {
  it('gravarRegistro: o id do navegador, o fuso e o deslocamento do aparelho, e a origem', async () => {
    const id = uuidV7()
    const { rotina, chamadas } = montar(() => ({ data: linhaDeRegistro({ id }) }))
    const resultado = await rotina.gravarRegistro({
      id,
      bebeId: ID_BEBE,
      tipo: 'fralda',
      inicio: '2026-11-05T12:00:00.000Z',
      detalhes: { conteudo: 'xixi', ml: undefined },
      origem: 'retroativo',
    })
    expect(chamadas[0].rpc).toBe('gravar_registro')
    expect(chamadas[0].argumentos).toEqual({
      id_registro: id,
      id_bebe: ID_BEBE,
      tipo: 'fralda',
      inicio: '2026-11-05T12:00:00.000Z',
      fuso: 'America/Sao_Paulo',
      deslocamento_min: -180,
      fim: null,
      detalhes: { conteudo: 'xixi' },
      nota: null,
      origem: 'retroativo',
    })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor.id).toBe(id)
      expect(resultado.valor.inicio).toBe('2026-11-05T12:00:00.000Z')
      expect(resultado.valor.recebidoEm).toBe('2026-11-05T12:00:01.500Z')
      expect(resultado.valor.criadoPor).toBe(PESSOAS.juliana.id)
    }
  })

  it('a nova tentativa depois de um erro de rede repete o mesmo id e os mesmos dados', async () => {
    const id = uuidV7()
    let vez = 0
    const { rotina, chamadas } = montar(() => {
      vez += 1
      return vez === 1 ? { error: new TypeError('Failed to fetch') } : { data: linhaDeRegistro({ id }) }
    })
    const entrada = { id, bebeId: ID_BEBE, tipo: 'sono' as const, inicio: '2026-11-05T12:00:00.000Z' }
    const primeira = await rotina.gravarRegistro(entrada)
    expect(primeira.ok).toBe(false)
    if (!primeira.ok) expect(primeira.erro.classe).toBe('rede')
    expect((await rotina.gravarRegistro(entrada)).ok).toBe(true)
    expect(chamadas).toHaveLength(2)
    expect(chamadas[1].argumentos).toEqual(chamadas[0].argumentos)
  })

  it('editarRegistro manda o estado completo das 6 colunas editáveis', async () => {
    const id = uuidV7()
    const { rotina, chamadas } = montar(() => ({ data: linhaDeRegistro({ id }) }))
    await rotina.editarRegistro(id, { inicio: '2026-11-05T11:00:00.000Z', fim: null, detalhes: { alimento: 'banana' }, nota: 'x' })
    expect(chamadas[0].rpc).toBe('editar_registro')
    expect(chamadas[0].argumentos).toEqual({
      id_registro: id,
      inicio: '2026-11-05T11:00:00.000Z',
      fim: null,
      detalhes: { alimento: 'banana' },
      nota: 'x',
      fuso: 'America/Sao_Paulo',
      deslocamento_min: -180,
    })
  })

  it('encerrarSessao manda sempre o momento e devolve o fim gravado em ISO', async () => {
    const id = uuidV7()
    const { rotina, chamadas } = montar(() => ({ data: '2026-11-05T14:00:00+00:00' }))
    const resultado = await rotina.encerrarSessao(id, '2026-11-05T14:05:00.000Z')
    expect(chamadas[0].rpc).toBe('encerrar_sessao')
    expect(chamadas[0].argumentos).toEqual({ id_registro: id, momento: '2026-11-05T14:05:00.000Z' })
    // O banco devolveu o primeiro fim (outra pessoa já tinha encerrado).
    expect(resultado).toEqual({ ok: true, valor: '2026-11-05T14:00:00.000Z' })
  })

  it('excluir, restaurar e excluir nota chamam as funções com o id existente', async () => {
    const id = uuidV7()
    const { rotina, chamadas } = montar(() => ({ data: null }))
    expect(await rotina.excluirRegistro(id)).toEqual({ ok: true, valor: null })
    expect(await rotina.restaurarRegistro(id)).toEqual({ ok: true, valor: null })
    expect(await rotina.excluirNota(id)).toEqual({ ok: true, valor: null })
    expect(chamadas.map((c) => [c.rpc, c.argumentos])).toEqual([
      ['excluir_registro', { id_registro: id }],
      ['restaurar_registro', { id_registro: id }],
      ['excluir_nota', { id_nota: id }],
    ])
  })

  it('gravarNota e editarNota', async () => {
    const id = uuidV7()
    const { rotina, chamadas } = montar(() => ({ data: linhaDeNota({ id }) }))
    const gravada = await rotina.gravarNota({ id, familiaId: ID_FAMILIA, texto: 'Oi', bebeId: ID_BEBE, destaqueAte: '2026-11-06T10:00:00.000Z' })
    expect(gravada.ok).toBe(true)
    await rotina.editarNota(id, 'Outro', null)
    expect(chamadas.map((c) => [c.rpc, c.argumentos])).toEqual([
      ['gravar_nota', { id_nota: id, id_familia: ID_FAMILIA, texto: 'Oi', id_bebe: ID_BEBE, destaque_ate: '2026-11-06T10:00:00.000Z' }],
      ['editar_nota', { id_nota: id, texto: 'Outro', destaque_ate: null }],
    ])
  })
})

describe('as leituras e o limite de lista', () => {
  it('emAndamento: o filtro do Anexo A e o limit explícito do limite mais 1', async () => {
    const { rotina, chamadas } = montar(() => ({ data: [linhaDeRegistro({ tipo: 'sono' })] }))
    const resultado = await rotina.emAndamento(ID_BEBE)
    const chamada = chamadas[0]
    expect(chamada.tabela).toBe('registros')
    expect(metodo(chamada, 'eq')).toEqual([['bebe_id', ID_BEBE]])
    expect(metodo(chamada, 'in')).toEqual([['tipo', ['sono', 'mamada', 'tummy']]])
    expect(metodo(chamada, 'is')).toEqual([
      ['fim', null],
      ['excluido_em', null],
    ])
    expect(metodo(chamada, 'order')).toEqual([
      ['inicio', { ascending: false }],
      ['id', { ascending: false }],
    ])
    expect(metodo(chamada, 'limit')).toEqual([[LIMITES.emAndamento + 1]])
    expect(resultado.ok && resultado.valor).toEqual({ itens: expect.any(Array), incompleta: false })
  })

  it('a linha a mais marca incompleta e a lista devolve só as primeiras, na ordem do banco', async () => {
    const linhas = Array.from({ length: LIMITES.emAndamento + 1 }, (_, i) => linhaDeRegistro({ id: uuidV7(), tipo: 'sono', versao: i + 1 }))
    const { rotina } = montar(() => ({ data: linhas }))
    const resultado = await rotina.emAndamento(ID_BEBE)
    if (!resultado.ok) throw new Error('leitura falhou')
    expect(resultado.valor.incompleta).toBe(true)
    expect(resultado.valor.itens).toHaveLength(LIMITES.emAndamento)
    expect(resultado.valor.itens.map((r) => r.versao)).toEqual(linhas.slice(0, LIMITES.emAndamento).map((l) => l.versao))
  })

  it('doDia e lixeira chamam as funções com limit explícito', async () => {
    const { rotina, chamadas } = montar(() => ({ data: [] }))
    await rotina.doDia(ID_BEBE, '2026-11-05')
    await rotina.lixeira(ID_BEBE)
    expect(chamadas[0].rpc).toBe('registros_do_dia')
    expect(chamadas[0].argumentos).toEqual({ id_bebe: ID_BEBE, dia: '2026-11-05' })
    expect(metodo(chamadas[0], 'limit')).toEqual([[LIMITES.doDia + 1]])
    expect(chamadas[1].rpc).toBe('registros_na_lixeira')
    expect(metodo(chamadas[1], 'limit')).toEqual([[LIMITES.lixeira + 1]])
  })

  it('sessoesDaJanela filtra as sessões concluídas que cruzam a janela; sem sessão nos tipos, não consulta', async () => {
    const { rotina, chamadas } = montar(() => ({ data: [] }))
    await rotina.sessoesDaJanela(ID_BEBE, '2026-11-05T03:00:00.000Z', '2026-11-06T03:00:00.000Z')
    expect(metodo(chamadas[0], 'in')).toEqual([['tipo', ['sono', 'tummy']]])
    expect(metodo(chamadas[0], 'not')).toEqual([['fim', 'is', null]])
    expect(metodo(chamadas[0], 'lt')).toEqual([['inicio', '2026-11-06T03:00:00.000Z']])
    expect(metodo(chamadas[0], 'gt')).toEqual([['fim', '2026-11-05T03:00:00.000Z']])
    expect(metodo(chamadas[0], 'limit')).toEqual([[LIMITES.sessoesDaJanela + 1]])
    expect(await rotina.sessoesDaJanela(ID_BEBE, 'a', 'b', ['fralda'])).toEqual({ ok: true, valor: { itens: [], incompleta: false } })
    expect(chamadas).toHaveLength(1)
  })

  it('doIntervalo: início na janela, em ordem, com limit', async () => {
    const { rotina, chamadas } = montar(() => ({ data: [] }))
    await rotina.doIntervalo(ID_BEBE, 'de', 'ate')
    expect(metodo(chamadas[0], 'gte')).toEqual([['inicio', 'de']])
    expect(metodo(chamadas[0], 'lt')).toEqual([['inicio', 'ate']])
    expect(metodo(chamadas[0], 'limit')).toEqual([[LIMITES.doIntervalo + 1]])
  })

  it('registro: sem linha é null (Não encontrado), e a nota usa o filtro da família e do bebê', async () => {
    const { rotina, chamadas } = montar((chamada) => ({ data: chamada.tabela === 'registros' ? null : [linhaDeNota()] }))
    expect(await rotina.registro(uuidV7())).toEqual({ ok: true, valor: null })
    const notas = await rotina.notas(ID_FAMILIA, ID_BEBE)
    expect(notas.ok && notas.valor.itens).toHaveLength(1)
    expect(metodo(chamadas[1], 'or')).toEqual([[`bebe_id.is.null,bebe_id.eq.${ID_BEBE}`]])
    expect(metodo(chamadas[1], 'limit')).toEqual([[LIMITES.notas + 1]])
  })

  it('o id do bebê só entra no filtro de texto se for UUID', async () => {
    const { rotina, chamadas } = montar(() => ({ data: [] }))
    await rotina.notas(ID_FAMILIA, 'x,bebe_id.neq.1')
    expect(metodo(chamadas[0], 'or')).toEqual([['bebe_id.is.null']])
  })

  it('desdeMeuUltimo: o marco e depois os novos de outras pessoas, com o limit de 5 mais 1', async () => {
    const marco = linhaDeRegistro({ recebido_em: '2026-11-05T11:00:00+00:00' })
    let consultas = 0
    const { rotina, chamadas } = montar(() => ({ data: consultas++ === 0 ? [marco] : [] }))
    const resultado = await rotina.desdeMeuUltimo(ID_BEBE, PESSOAS.juliana.id)
    expect(resultado.ok && resultado.valor.marco?.recebidoEm).toBe('2026-11-05T11:00:00.000Z')
    expect(metodo(chamadas[0], 'eq')).toEqual([
      ['bebe_id', ID_BEBE],
      ['criado_por', PESSOAS.juliana.id],
    ])
    expect(metodo(chamadas[1], 'or')).toEqual([[`criado_por.is.null,criado_por.neq.${PESSOAS.juliana.id}`]])
    expect(metodo(chamadas[1], 'gt')).toEqual([['recebido_em', '2026-11-05T11:00:00.000Z']])
    expect(metodo(chamadas[1], 'limit')).toEqual([[6]])
  })

  it('desdeMeuUltimo sem marco não consulta os novos', async () => {
    const { rotina, chamadas } = montar(() => ({ data: [] }))
    expect(await rotina.desdeMeuUltimo(ID_BEBE, PESSOAS.juliana.id)).toEqual({ ok: true, valor: { marco: null, novos: [] } })
    expect(chamadas).toHaveLength(1)
  })

  it('ultimosConcluidos: sete consultas de uma linha, uma por tipo, e a lista sai do mais recente ao mais antigo', async () => {
    const porTipo: Record<string, Record<string, unknown>> = {
      fralda: linhaDeRegistro({ tipo: 'fralda', inicio: '2026-11-05T12:10:00+00:00' }),
      mamada: linhaDeRegistro({ tipo: 'mamada', inicio: '2026-11-05T10:00:00+00:00', fim: '2026-11-05T10:20:00+00:00', detalhes: {} }),
    }
    const { rotina, chamadas } = montar((chamada) => {
      const tipo = (metodo(chamada, 'eq').find(([coluna]) => coluna === 'tipo') ?? [])[1] as string
      return { data: porTipo[tipo] ? [porTipo[tipo]] : [] }
    })
    const resultado = await rotina.ultimosConcluidos(ID_BEBE)
    expect(chamadas).toHaveLength(7)
    for (const chamada of chamadas) expect(metodo(chamada, 'limit')).toEqual([[1]])
    const sessao = chamadas.find((c) => metodo(c, 'eq').some(([, v]) => v === 'mamada'))!
    expect(metodo(sessao, 'not')).toEqual([['fim', 'is', null]])
    expect(metodo(sessao, 'order')[0]).toEqual(['fim', { ascending: false }])
    const pontual = chamadas.find((c) => metodo(c, 'eq').some(([, v]) => v === 'fralda'))!
    expect(metodo(pontual, 'not')).toEqual([])
    expect(metodo(pontual, 'order')[0]).toEqual(['inicio', { ascending: false }])
    expect(resultado.ok && resultado.valor.map((r) => r.tipo)).toEqual(['fralda', 'mamada'])
  })

  it('alteracoes: do registro, em ordem, com limit', async () => {
    const { rotina, chamadas } = montar(() => ({
      data: [
        {
          id: uuidV7(),
          registro_id: uuidV7(),
          familia_id: ID_FAMILIA,
          operacao: 'edicao',
          autor: PESSOAS.juliana.id,
          antes: { fim: null },
          depois: { fim: '2026-11-05T14:00:00Z' },
          versao: 2,
          recebida_em: '2026-11-05T14:00:00Z',
        },
      ],
    }))
    const resultado = await rotina.alteracoes(uuidV7())
    expect(chamadas[0].tabela).toBe('registro_alteracoes')
    expect(metodo(chamadas[0], 'limit')).toEqual([[LIMITES.alteracoes + 1]])
    expect(resultado.ok && resultado.valor.itens[0].operacao).toBe('edicao')
  })
})

describe('erros, rede e resposta fora do formato', () => {
  it('o erro do banco vira o ErroDados do Anexo B, com código e mensagem originais', async () => {
    const { rotina } = montar(() => ({ error: { code: 'P0001', message: 'bebe arquivado' } }))
    const resultado = await rotina.gravarRegistro({ id: uuidV7(), bebeId: ID_BEBE, tipo: 'sono', inicio: '2026-11-05T12:00:00.000Z' })
    expect(resultado).toEqual({
      ok: false,
      erro: { chave: 'bebe_arquivado', classe: 'negocio', codigo: 'P0001', mensagemOriginal: 'bebe arquivado' },
    })
  })

  it('falha de rede numa leitura e numa escrita é a classe rede, e nada lança', async () => {
    const { rotina } = montar(() => {
      throw new TypeError('Failed to fetch')
    })
    const leitura = await rotina.emAndamento(ID_BEBE)
    const escrita = await rotina.excluirRegistro(uuidV7())
    for (const resultado of [leitura, escrita]) {
      expect(resultado.ok).toBe(false)
      if (!resultado.ok) expect(resultado.erro.classe).toBe('rede')
    }
  })

  it('resposta sem erro, mas fora do formato, é desconhecido e nunca sucesso', async () => {
    const entrada = { id: uuidV7(), bebeId: ID_BEBE, tipo: 'sono' as const, inicio: '2026-11-05T12:00:00.000Z' }
    const casos: Array<[string, (rotina: DadosRotina) => Promise<{ ok: boolean }>, unknown]> = [
      ['linha nula onde vem uma linha', (r) => r.gravarRegistro(entrada), null],
      ['lista onde vem um valor', (r) => r.gravarRegistro(entrada), [linhaDeRegistro()]],
      ['campo obrigatório faltando', (r) => r.gravarRegistro(entrada), { ...linhaDeRegistro(), familia_id: undefined }],
      ['tipo errado num campo', (r) => r.gravarRegistro(entrada), linhaDeRegistro({ versao: 'um' })],
      ['tipo de registro desconhecido', (r) => r.gravarRegistro(entrada), linhaDeRegistro({ tipo: 'banho' })],
      ['data impossível', (r) => r.gravarRegistro(entrada), linhaDeRegistro({ inicio: 'ontem' })],
      ['lista que não é lista', (r) => r.emAndamento(ID_BEBE), { itens: [] }],
      ['elemento da lista que não é linha', (r) => r.doDia(ID_BEBE, '2026-11-05'), [null]],
      ['fim que não é data', (r) => r.encerrarSessao(uuidV7(), '2026-11-05T12:00:00.000Z'), 'amanhã'],
      ['nota sem texto', (r) => r.gravarNota({ id: uuidV7(), familiaId: ID_FAMILIA, texto: 'x' }), linhaDeNota({ texto: '' })],
    ]
    for (const [descricao, operacao, corpo] of casos) {
      const { rotina } = montar(() => ({ data: corpo }))
      const resultado = await operacao(rotina)
      expect(resultado.ok, descricao).toBe(false)
      if (!resultado.ok) expect((resultado as unknown as { erro: { chave: string } }).erro.chave, descricao).toBe('desconhecido')
    }
  })

  it('o contexto vem da DadosConta, sem consulta própria ao banco', async () => {
    const { rotina, chamadas } = montar(() => ({ data: [] }))
    const resultado = await rotina.contexto()
    expect(resultado.ok).toBe(true)
    expect(chamadas).toHaveLength(0)
  })

  it('o aparelho é lido no momento da ação, a cada gravação', async () => {
    const leitura = vi.fn(() => SAO_PAULO)
    const falso = criarClienteFalso(() => ({ data: linhaDeRegistro() }))
    const rotina = criarDadosRotinaSupabase(falso.cliente, conta, { aparelho: leitura })
    await rotina.gravarRegistro({ id: uuidV7(), bebeId: ID_BEBE, tipo: 'sono', inicio: '2026-11-05T12:00:00.000Z' })
    await rotina.encerrarSessao(uuidV7(), '2026-11-05T12:30:00.000Z')
    expect(leitura).toHaveBeenCalledTimes(1)
  })
})
