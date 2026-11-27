import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ID_BEBE, ID_FAMILIA, criarMundoDeTeste, type Mundo } from '../teste/rotina.fixture.ts'
import { PESSOAS } from '../teste/renderizarComDados.tsx'
import type { DadosRotina, NovoRegistro } from './rotina.tipos.ts'
import { uuidV7 } from './rotina.uuid.ts'

// R5: a memória reproduz as constraints de id do banco (`registros_id_uuidv7_check` e
// `notas_cuidado_id_uuidv7_check`: o 15º caractere é `7` e o 20º é `8`, `9`, `a` ou `b`) nas criações de
// registro e de nota. A ordem é a do Anexo A: parâmetro obrigatório, existência e visibilidade, papel,
// bebê arquivado, horário no futuro e só então as regras de valor, entre elas a do id. Um id que já existe
// continua devolvendo a linha gravada (idempotência), e a recusa não grava nada.

const MIN = 60_000
const HORA = 60 * MIN

let mundo: Mundo
let rotina: DadosRotina

const iso = (deslocamentoMs: number) => new Date(Date.now() + deslocamentoMs).toISOString()
const chaveDe = (resultado: { ok: boolean; erro?: { chave: string } }) => (resultado.ok ? 'ok' : (resultado.erro?.chave ?? ''))

const registro = (extra: Partial<NovoRegistro> = {}): NovoRegistro => ({
  id: uuidV7(),
  bebeId: ID_BEBE,
  tipo: 'fralda',
  inicio: iso(-MIN),
  detalhes: { conteudo: 'xixi' },
  ...extra,
})

const nota = (extra: Partial<{ id: string; texto: string }> = {}) => ({ id: uuidV7(), familiaId: ID_FAMILIA, texto: 'Pomada só à noite.', ...extra })

// Ids que o banco recusa: sem formato de UUID, de outra versão (v4), com a variante errada e com o 15º ou o
// 20º caractere fora do permitido.
const IDS_RECUSADOS = [
  ['texto qualquer', 'abc'],
  ['UUID v4', 'c1111111-1111-4111-8111-111111111111'],
  ['versão 7 com a variante errada (20º caractere c)', '01931111-1111-7111-c111-111111111111'],
  ['versão 7 com a variante errada (20º caractere 0)', '01931111-1111-7111-0111-111111111111'],
  ['versão 6', '01931111-1111-6111-8111-111111111111'],
  ['sem os hifens', '019311111111711181111111111111111'],
] as const

const registrosDoBebe = async () => {
  const lista = await rotina.doIntervalo(ID_BEBE, iso(-24 * HORA), iso(24 * HORA))
  return lista.ok ? lista.valor.itens : []
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
  mundo = criarMundoDeTeste({ semRegistros: true })
  rotina = mundo.rotina
})

describe('R5: o id de um registro novo é um UUID v7', () => {
  it.each(IDS_RECUSADOS)('R5: gravarRegistro recusa %s com valor_invalido e não grava nada', async (_nome, id) => {
    expect(chaveDe(await rotina.gravarRegistro(registro({ id })))).toBe('valor_invalido')
    expect(await registrosDoBebe()).toEqual([])
  })

  it.each(['fralda', 'sono', 'mamada', 'tummy', 'mamadeira', 'solido', 'observacao'] as const)(
    'R5: o tipo %s também recusa um id que não é v7',
    async (tipo) => {
      const base: NovoRegistro = {
        id: 'c1111111-1111-4111-8111-111111111111',
        bebeId: ID_BEBE,
        tipo,
        inicio: iso(-30 * MIN),
        detalhes: tipo === 'fralda' ? { conteudo: 'xixi' } : tipo === 'solido' ? { alimento: 'banana' } : {},
        nota: tipo === 'observacao' ? 'Dormiu bem' : null,
      }
      expect(chaveDe(await rotina.gravarRegistro(base))).toBe('valor_invalido')
      expect(chaveDe(await rotina.gravarRegistro({ ...base, id: uuidV7() }))).toBe('ok')
    },
  )

  it('R5: as letras maiúsculas de um v7 passam, como no banco (o tipo uuid guarda minúsculas)', async () => {
    expect(chaveDe(await rotina.gravarRegistro(registro({ id: uuidV7().toUpperCase() })))).toBe('ok')
  })

  it('R5: a ordem do Anexo A: o id ruim só aparece depois de papel, bebê arquivado e horário no futuro', async () => {
    const ruim = 'c1111111-1111-4111-8111-111111111111'
    // Parâmetro obrigatório vem antes de tudo.
    expect(chaveDe(await rotina.gravarRegistro(registro({ id: ruim, bebeId: '' })))).toBe('parametro_obrigatorio')
    // O horário no futuro vem antes da regra de valor do id.
    expect(chaveDe(await rotina.gravarRegistro(registro({ id: ruim, inicio: iso(HORA) })))).toBe('horario_no_futuro')
    // Observador: sem_permissao antes do id.
    mundo.conta.sessaoParaTeste(PESSOAS.juliana.email)
    const comDavi = criarMundoDeTeste({ semRegistros: true, papelDeDavi: 'observador' })
    comDavi.conta.sessaoParaTeste(PESSOAS.davi.email)
    expect(chaveDe(await comDavi.rotina.gravarRegistro(registro({ id: ruim })))).toBe('sem_permissao')
    // Bebê arquivado: bebe_arquivado antes do id.
    const arquivado = criarMundoDeTeste({ semRegistros: true, bebeArquivado: true })
    expect(chaveDe(await arquivado.rotina.gravarRegistro(registro({ id: ruim })))).toBe('bebe_arquivado')
    // Sem vínculo: nao_encontrado antes do id.
    const semVinculo = criarMundoDeTeste({ semRegistros: true })
    semVinculo.conta.sessaoParaTeste(PESSOAS.davi.email)
    expect(chaveDe(await semVinculo.rotina.gravarRegistro(registro({ id: ruim })))).toBe('nao_encontrado')
  })

  it('R5: um id que já existe continua idempotente, e o id ruim não vira registro numa repetição', async () => {
    const entrada = registro()
    const primeiro = await rotina.gravarRegistro(entrada)
    const repetido = await rotina.gravarRegistro({ ...entrada, detalhes: { conteudo: 'coco' } })
    expect(primeiro.ok && repetido.ok && repetido.valor).toEqual(primeiro.ok && primeiro.valor)
    expect(await registrosDoBebe()).toHaveLength(1)
  })

  it('R5: a recusa não altera nada do que a leitura devolve (releitura sem mudança)', async () => {
    await rotina.gravarRegistro(registro())
    const antes = await rotina.doIntervalo(ID_BEBE, iso(-24 * HORA), iso(24 * HORA))
    await rotina.gravarRegistro(registro({ id: 'abc' }))
    const depois = await rotina.doIntervalo(ID_BEBE, iso(-24 * HORA), iso(24 * HORA))
    expect(depois).toEqual(antes)
    const emAndamento = await rotina.emAndamento(ID_BEBE)
    expect(emAndamento).toEqual({ ok: true, valor: { itens: [], incompleta: false } })
  })
})

describe('R5: o id de uma nota nova é um UUID v7', () => {
  it.each(IDS_RECUSADOS)('R5: gravarNota recusa %s com valor_invalido e não grava nada', async (_nome, id) => {
    expect(chaveDe(await rotina.gravarNota(nota({ id })))).toBe('valor_invalido')
    const lidas = await rotina.notas(ID_FAMILIA, ID_BEBE)
    expect(lidas).toEqual({ ok: true, valor: { itens: [], incompleta: false } })
  })

  it('R5: a ordem do Anexo A: papel e bebê arquivado vêm antes do id ruim; o texto longo e o id ruim dão o mesmo valor_invalido', async () => {
    const ruim = 'c1111111-1111-4111-8111-111111111111'
    expect(chaveDe(await rotina.gravarNota(nota({ id: ruim, texto: '' })))).toBe('parametro_obrigatorio')
    const comDavi = criarMundoDeTeste({ semRegistros: true, papelDeDavi: 'observador' })
    comDavi.conta.sessaoParaTeste(PESSOAS.davi.email)
    expect(chaveDe(await comDavi.rotina.gravarNota(nota({ id: ruim })))).toBe('sem_permissao')
    const arquivado = criarMundoDeTeste({ semRegistros: true, bebeArquivado: true })
    expect(chaveDe(await arquivado.rotina.gravarNota({ ...nota({ id: ruim }), bebeId: ID_BEBE }))).toBe('bebe_arquivado')
    expect(chaveDe(await rotina.gravarNota(nota({ id: ruim, texto: 'a'.repeat(501) })))).toBe('valor_invalido')
  })

  it('R5: um id de nota que já existe continua idempotente', async () => {
    const entrada = nota()
    const primeira = await rotina.gravarNota(entrada)
    const repetida = await rotina.gravarNota({ ...entrada, texto: 'Outro texto' })
    expect(primeira.ok && repetida.ok && repetida.valor).toEqual(primeira.ok && primeira.valor)
    const lidas = await rotina.notas(ID_FAMILIA, ID_BEBE)
    expect(lidas.ok && lidas.valor.itens).toHaveLength(1)
  })
})
