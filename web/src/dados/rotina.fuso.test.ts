import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { textoDoErro } from '../conteudo/rotina.ts'
import { simularAparelho } from './rotina.aparelho.simulado.ts'
import { ID_BEBE, criarMundoDeTeste, type Mundo } from '../teste/rotina.fixture.ts'
import { lerAparelho } from './rotina.dia.ts'
import { criarDadosRotinaMemoria } from './rotina.memoria.ts'
import { criarDadosRotinaSupabase } from './rotina.supabase.ts'
import type { NovoRegistro } from './rotina.tipos.ts'
import { uuidV7 } from './rotina.uuid.ts'

// R10 (R38-32, item 6), as duas implementações da camada de dados: o aparelho em Tóquio com a família em São
// Paulo (o fuso e o deslocamento de +540 minutos vão como o aparelho os leu), o fuso da família inválido (o
// `22023` vira `fuso_da_familia_invalido`, sem lançar exceção) e a virada da meia-noite no fuso da família.

const MIN = 60_000
const TOQUIO = { fuso: 'Asia/Tokyo', deslocamentoMin: 540 }

let mundo: Mundo

const chaveDe = (resultado: { ok: boolean; erro?: { chave: string } }) => (resultado.ok ? 'ok' : (resultado.erro?.chave ?? ''))
const iso = (deslocamentoMs: number) => new Date(Date.now() + deslocamentoMs).toISOString()
const fralda = (extra: Partial<NovoRegistro> = {}): NovoRegistro => ({
  id: uuidV7(),
  bebeId: ID_BEBE,
  tipo: 'fralda',
  inicio: iso(-MIN),
  detalhes: { conteudo: 'xixi' },
  ...extra,
})

afterEach(() => {
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T10:00:00'))
  mundo = criarMundoDeTeste({ semRegistros: true })
})

/** Um cliente do banco falso que responde `resposta` a toda chamada e guarda os argumentos das `rpc`. */
function bancoFalso(resposta: { data?: unknown; error?: unknown }) {
  const rpcs: Array<{ nome: string; argumentos: unknown }> = []
  const cadeia = (): unknown =>
    new Proxy(
      {},
      {
        get(_, nome) {
          if (nome === 'then') {
            return (cumprir: (valor: unknown) => unknown, falhar: (erro: unknown) => unknown) =>
              Promise.resolve({ data: resposta.data ?? null, error: resposta.error ?? null }).then(cumprir, falhar)
          }
          return () => cadeia()
        },
      },
    )
  const cliente = {
    from: () => cadeia(),
    rpc: (nome: string, argumentos?: unknown) => {
      rpcs.push({ nome, argumentos })
      return cadeia()
    },
  } as unknown as SupabaseClient
  return { cliente, rpcs }
}

describe('R10: o aparelho em Tóquio com a família em São Paulo', () => {
  it('R10: lerAparelho devolve +540 minutos (o oposto de getTimezoneOffset) e o fuso do Intl', () => {
    simularAparelho('Asia/Tokyo', 540)
    expect(lerAparelho()).toEqual(TOQUIO)
  })

  it('R10: a memória grava o fuso e o deslocamento do aparelho, não os da família, e a edição os regrava', async () => {
    const tokyo = criarDadosRotinaMemoria(mundo.conta, { registros: [], notas: [] }, { aparelho: () => TOQUIO })
    const gravada = await tokyo.gravarRegistro(fralda({ inicio: iso(-30 * MIN) }))
    expect(gravada.ok && gravada.valor).toMatchObject({ fuso: 'Asia/Tokyo', deslocamentoMin: 540 })
    if (!gravada.ok) return

    const emSaoPaulo = criarDadosRotinaMemoria(mundo.conta, { registros: [gravada.valor], notas: [] }, { aparelho: () => ({ fuso: 'America/Sao_Paulo', deslocamentoMin: -180 }) })
    const editada = await emSaoPaulo.editarRegistro(gravada.valor.id, { inicio: gravada.valor.inicio, fim: null, detalhes: { conteudo: 'coco' }, nota: null })
    expect(editada.ok && editada.valor).toMatchObject({ fuso: 'America/Sao_Paulo', deslocamentoMin: -180 })
  })

  it('R10: o deslocamento só vale de -720 a +840 minutos, nos dois extremos e fora deles', async () => {
    const com = (deslocamentoMin: number) => criarDadosRotinaMemoria(mundo.conta, { registros: [], notas: [] }, { aparelho: () => ({ fuso: 'Etc/GMT', deslocamentoMin }) })
    expect(chaveDe(await com(840).gravarRegistro(fralda()))).toBe('ok')
    expect(chaveDe(await com(-720).gravarRegistro(fralda()))).toBe('ok')
    expect(chaveDe(await com(841).gravarRegistro(fralda()))).toBe('valor_invalido')
    expect(chaveDe(await com(-721).gravarRegistro(fralda()))).toBe('valor_invalido')
    expect(chaveDe(await com(540.5).gravarRegistro(fralda()))).toBe('valor_invalido')
  })

  it('R10: o banco recebe fuso "Asia/Tokyo" e deslocamento_min 540 na gravação', async () => {
    const { cliente, rpcs } = bancoFalso({ data: null, error: { code: 'XX000', message: 'parada de teste' } })
    const banco = criarDadosRotinaSupabase(cliente, mundo.conta, { aparelho: () => TOQUIO })
    await banco.gravarRegistro(fralda())
    expect(rpcs[0].nome).toBe('gravar_registro')
    expect(rpcs[0].argumentos).toMatchObject({ fuso: 'Asia/Tokyo', deslocamento_min: 540 })
  })
})

describe('R10: fuso da família inválido', () => {
  const FUSO_RUIM = 'Marte/Olimpo'

  it('R10: a memória responde fuso_da_familia_invalido ao doDia, sem lançar, e as outras leituras seguem', async () => {
    mundo = criarMundoDeTeste({ fusoDaFamilia: FUSO_RUIM })
    const resultado = await mundo.rotina.doDia(ID_BEBE, '2026-11-05')
    expect(resultado.ok).toBe(false)
    expect(chaveDe(resultado)).toBe('fuso_da_familia_invalido')
    if (!resultado.ok) expect(resultado.erro.classe).toBe('desconhecido')
    expect((await mundo.rotina.emAndamento(ID_BEBE)).ok).toBe(true)
    expect((await mundo.rotina.ultimosConcluidos(ID_BEBE)).ok).toBe(true)
    expect((await mundo.rotina.sessoesDaJanela(ID_BEBE, iso(-24 * 60 * MIN), iso(MIN))).ok).toBe(true)
  })

  it.each(['', 'UTC+3', 'Mars/Olympus', 'america/sao paulo'])('R10: a memória trata o fuso %j da família como inválido', async (fuso) => {
    mundo = criarMundoDeTeste({ fusoDaFamilia: fuso })
    expect(chaveDe(await mundo.rotina.doDia(ID_BEBE, '2026-11-05'))).toBe('fuso_da_familia_invalido')
  })

  it('R10: o banco responde 22023 "invalid time zone": a implementação devolve fuso_da_familia_invalido, sem lançar', async () => {
    const { cliente } = bancoFalso({ error: { code: '22023', message: 'invalid time zone' } })
    const banco = criarDadosRotinaSupabase(cliente, mundo.conta, { aparelho: () => TOQUIO })
    const resultado = await banco.doDia(ID_BEBE, '2026-11-05')
    expect(resultado.ok).toBe(false)
    expect(chaveDe(resultado)).toBe('fuso_da_familia_invalido')
    if (!resultado.ok) {
      expect(resultado.erro.classe).toBe('desconhecido')
      expect(textoDoErro(resultado.erro, { escrita: false })).toBe('O fuso da família está inválido. Peça a um responsável para corrigir em Família.')
    }
  })
})

describe('R10: a virada da meia-noite no fuso da família', () => {
  it('R10: 23:59 e 00:00 em São Paulo caem em dias diferentes do doDia, e a releitura depois da virada muda o dia', async () => {
    const mundoSp = criarMundoDeTeste({ semRegistros: true, fusoDaFamilia: 'America/Sao_Paulo' })
    // 5/11 23:59 em São Paulo = 6/11 02:59 UTC; 6/11 00:00 em São Paulo = 6/11 03:00 UTC.
    const antes = fralda({ inicio: '2026-11-06T02:59:00.000Z' })
    const depois = fralda({ inicio: '2026-11-06T03:00:00.000Z' })
    vi.setSystemTime(new Date('2026-11-06T04:00:00.000Z'))
    expect((await mundoSp.rotina.gravarRegistro(antes)).ok).toBe(true)
    expect((await mundoSp.rotina.gravarRegistro(depois)).ok).toBe(true)

    const dia5 = await mundoSp.rotina.doDia(ID_BEBE, '2026-11-05')
    const dia6 = await mundoSp.rotina.doDia(ID_BEBE, '2026-11-06')
    expect(dia5.ok && dia5.valor.itens.map((r) => r.id)).toEqual([antes.id])
    expect(dia6.ok && dia6.valor.itens.map((r) => r.id)).toEqual([depois.id])
  })

  it('R10: o mesmo instante é de dias diferentes em famílias de fusos diferentes (o dia é o da família, não o do aparelho)', async () => {
    const saoPaulo = criarMundoDeTeste({ semRegistros: true, fusoDaFamilia: 'America/Sao_Paulo' })
    const toquio = criarMundoDeTeste({ semRegistros: true, fusoDaFamilia: 'Asia/Tokyo' })
    vi.setSystemTime(new Date('2026-11-06T04:00:00.000Z'))
    const entrada = fralda({ inicio: '2026-11-06T02:59:00.000Z' })
    await saoPaulo.rotina.gravarRegistro(entrada)
    await toquio.rotina.gravarRegistro(entrada)
    const emSaoPaulo = await saoPaulo.rotina.doDia(ID_BEBE, '2026-11-05')
    const emToquio = await toquio.rotina.doDia(ID_BEBE, '2026-11-06')
    expect(emSaoPaulo.ok && emSaoPaulo.valor.itens).toHaveLength(1)
    expect(emToquio.ok && emToquio.valor.itens).toHaveLength(1)
  })
})
