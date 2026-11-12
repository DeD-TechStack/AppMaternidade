import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ErroDados, Resultado } from './comum.ts'
import {
  comPrazoDeResposta,
  comecoDaJanela,
  converterHorario,
  criarDadosDesenvolvimento,
  diasDaFila,
  traduzirErro,
} from './desenvolvimento.ts'
import { ehUuidV7, uuidV7 } from './rotina.uuid.ts'
import { OPERACOES_ROTINA, type DadosRotina, type OperacaoRotina, type Registro } from './rotina.tipos.ts'

// MAT-39b, DES-13 (testes 12, 15, 16 e 19, a parte da camada de dados): a conversão de dia e hora, a tradução do
// erro do DES-09, a janela de leitura e as chamadas à `DadosRotina`. Os valores esperados estão escritos aqui.

afterEach(() => {
  vi.useRealTimers()
})

const BEBE = 'b1111111-1111-4111-8111-111111111111'

describe('converterHorario (DES-03, conversão das horas do formulário)', () => {
  it('America/Sao_Paulo: 12/11/2026 08:00 é 11:00 UTC', () => {
    expect(converterHorario('2026-11-12', '08:00', 'America/Sao_Paulo')).toEqual({ ok: true, instante: Date.parse('2026-11-12T11:00:00Z') })
  })

  it('America/New_York: 08/03/2026 02:30 não existe (pulo do horário de verão)', () => {
    expect(converterHorario('2026-03-08', '02:30', 'America/New_York')).toEqual({ ok: false, motivo: 'inexistente' })
  })

  it('America/New_York: 01/11/2026 01:30 existe duas vezes e vale a primeira, 05:30 UTC', () => {
    expect(converterHorario('2026-11-01', '01:30', 'America/New_York')).toEqual({ ok: true, instante: Date.parse('2026-11-01T05:30:00Z') })
  })

  it('America/New_York: 08/03/2026 03:30 (logo depois do pulo) vale 07:30 UTC', () => {
    expect(converterHorario('2026-03-08', '03:30', 'America/New_York')).toEqual({ ok: true, instante: Date.parse('2026-03-08T07:30:00Z') })
  })

  it('dia ou hora fora do formato: inválido', () => {
    expect(converterHorario('2026-02-30', '08:00', 'UTC')).toEqual({ ok: false, motivo: 'invalido' })
    expect(converterHorario('2026-11-12', '25:00', 'UTC')).toEqual({ ok: false, motivo: 'invalido' })
    expect(converterHorario('2026-11-12', '', 'UTC')).toEqual({ ok: false, motivo: 'invalido' })
  })
})

describe('diasDaFila e comecoDaJanela', () => {
  const AGORA = Date.parse('2026-11-12T15:00:00-03:00')

  it('os 7 dias, do mais recente ao mais antigo, no fuso pedido', () => {
    expect(diasDaFila(AGORA, 'America/Sao_Paulo')).toEqual([
      '2026-11-12',
      '2026-11-11',
      '2026-11-10',
      '2026-11-09',
      '2026-11-08',
      '2026-11-07',
      '2026-11-06',
    ])
  })

  it('perto da meia-noite, o dia depende do fuso: 02:00 UTC de 12/11 ainda é 11/11 em São Paulo', () => {
    const instante = Date.parse('2026-11-12T02:00:00Z')
    expect(diasDaFila(instante, 'America/Sao_Paulo')[0]).toBe('2026-11-11')
    expect(diasDaFila(instante, 'UTC')[0]).toBe('2026-11-12')
  })

  it('o começo da janela é 00:00 de D-6 no fuso da família: 06/11/2026 03:00 UTC em São Paulo', () => {
    expect(new Date(comecoDaJanela(AGORA, 'America/Sao_Paulo')).toISOString()).toBe('2026-11-06T03:00:00.000Z')
  })
})

describe('traduzirErro (DES-09)', () => {
  const erro = (classe: ErroDados['classe'], chave: string, codigo: string, mensagemOriginal: string): ErroDados => ({
    classe,
    chave,
    codigo,
    mensagemOriginal,
  })

  const casos: ReadonlyArray<readonly [string, ErroDados, string, string]> = [
    ['rede', erro('rede', 'rede', 'rede', 'Failed to fetch'), 'semResposta', 'desconhecido'],
    ['resposta fora do formato, sem código', erro('desconhecido', 'desconhecido', '', 'x'), 'semResposta', 'desconhecido'],
    ['resposta fora do formato, com o código do cliente', erro('desconhecido', 'desconhecido', 'unexpected_failure', 'x'), 'semResposta', 'desconhecido'],
    ['40P01', erro('tente_de_novo', 'tente_de_novo', '40P01', 'tente de novo'), 'servidorOcupado', 'nao'],
    ['P0002', erro('nao_encontrado', 'nao_encontrado', 'P0002', 'registro inexistente'), 'naoEncontrado', 'nao'],
    ['42501', erro('sem_permissao', 'sem_permissao', '42501', 'sem permissao'), 'semPermissao', 'nao'],
    ['P0001 bebe arquivado', erro('negocio', 'bebe_arquivado', 'P0001', 'bebe arquivado'), 'arquivado', 'nao'],
    ['P0001 registro excluido', erro('negocio', 'registro_excluido', 'P0001', 'registro excluido'), 'descartadaPorOutra', 'nao'],
    ['P0001 prazo', erro('negocio', 'prazo_encerrado', 'P0001', 'prazo de restauracao encerrado'), 'prazoEncerrado', 'nao'],
    ['23514 horario no futuro', erro('negocio', 'horario_no_futuro', '23514', 'horario no futuro'), 'noFuturo', 'nao'],
    ['23514 de check', erro('negocio', 'valor_invalido', '23514', 'new row violates check constraint "registros_fim_check"'), 'fimAntesDoInicio', 'nao'],
    ['23502', erro('negocio', 'parametro_obrigatorio', '23502', 'parametro obrigatorio'), 'inesperado', 'nao'],
    ['P0001 nao e sessao', erro('negocio', 'nao_e_sessao', 'P0001', 'nao e sessao'), 'inesperado', 'nao'],
    ['código fora da tabela (XX000)', erro('desconhecido', 'desconhecido', 'XX000', 'erro qualquer'), 'inesperado', 'nao'],
  ]

  for (const [nome, entrada, chave, salvou] of casos) {
    it(`${nome}: ${chave}, salvou "${salvou}"`, () => {
      expect(traduzirErro(entrada)).toMatchObject({ chave, salvou })
    })
  }

  it('só o erro de "sem resposta" e o de servidor ocupado oferecem "Tentar de novo"', () => {
    expect(traduzirErro(erro('rede', 'rede', 'rede', '')).repetivel).toBe(true)
    expect(traduzirErro(erro('tente_de_novo', 'tente_de_novo', '40P01', '')).repetivel).toBe(true)
    expect(traduzirErro(erro('sem_permissao', 'sem_permissao', '42501', '')).repetivel).toBe(false)
    expect(traduzirErro(erro('desconhecido', 'desconhecido', 'XX000', '')).repetivel).toBe(false)
  })
})

describe('comPrazoDeResposta (P23)', () => {
  it('uma chamada sem resposta em 15 segundos vale como "rede"', async () => {
    vi.useFakeTimers()
    const nunca = new Promise<Resultado<null>>(() => undefined)
    const resposta = comPrazoDeResposta(nunca)
    await vi.advanceTimersByTimeAsync(14_999)
    let pronta = false
    void resposta.then(() => (pronta = true))
    await vi.advanceTimersByTimeAsync(0)
    expect(pronta).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    const final = await resposta
    expect(final.ok).toBe(false)
    expect(!final.ok && final.erro.chave).toBe('rede')
  })

  it('a resposta que chega a tempo passa como veio', async () => {
    vi.useFakeTimers()
    const resposta = await comPrazoDeResposta(Promise.resolve<Resultado<number>>({ ok: true, valor: 7 }))
    expect(resposta).toEqual({ ok: true, valor: 7 })
  })
})

// ---- a DadosRotina falsa que grava as chamadas (teste 16) ----------------------------------------------------

type Resposta = (...args: unknown[]) => Resultado<unknown> | Promise<Resultado<unknown>>

function criarFalsa(respostas: Partial<Record<OperacaoRotina, Resposta>> = {}) {
  const chamadas: Array<{ operacao: OperacaoRotina; args: unknown[] }> = []
  const dados = Object.fromEntries(
    OPERACOES_ROTINA.map((operacao) => [
      operacao,
      async (...args: unknown[]) => {
        chamadas.push({ operacao, args })
        const resposta = respostas[operacao]
        return resposta ? resposta(...args) : { ok: true, valor: null }
      },
    ]),
  ) as unknown as DadosRotina
  return { dados, chamadas }
}

const registro = (resto: Partial<Registro>): Registro => ({
  id: 'a0000000-0000-7000-8000-000000000001',
  familiaId: 'f1',
  bebeId: BEBE,
  tipo: 'tummy',
  inicio: '2026-11-12T17:00:00.000Z',
  fim: '2026-11-12T17:10:00.000Z',
  detalhes: {},
  nota: null,
  origem: 'ao_vivo',
  fuso: 'America/Sao_Paulo',
  deslocamentoMin: -180,
  criadoPor: null,
  encerradoPor: null,
  versao: 1,
  recebidoEm: '2026-11-12T17:10:00.000Z',
  atualizadoEm: '2026-11-12T17:10:00.000Z',
  excluidoEm: null,
  excluidoPor: null,
  ...resto,
})

describe('DES-13 16: cada ação chama a operação certa da DadosRotina', () => {
  const AGORA = Date.parse('2026-11-12T18:00:00Z')

  it('lerBloco: emAndamento do bebê e sessoesDaJanela com ["tummy"], de 00:00 de D-6 no fuso da família até agora', async () => {
    const { dados, chamadas } = criarFalsa({
      emAndamento: () => ({ ok: true, valor: { itens: [], incompleta: false } }),
      sessoesDaJanela: () => ({ ok: true, valor: { itens: [], incompleta: false } }),
    })
    await criarDadosDesenvolvimento(dados).lerBloco(BEBE, 'America/Sao_Paulo', AGORA)
    expect(chamadas).toEqual([
      { operacao: 'emAndamento', args: [BEBE] },
      { operacao: 'sessoesDaJanela', args: [BEBE, '2026-11-06T03:00:00.000Z', '2026-11-12T18:00:00.000Z', ['tummy']] },
    ])
  })

  it('lerBloco: das em andamento fica só o tummy, e uma lista incompleta de qualquer leitura marca incompleta', async () => {
    const { dados } = criarFalsa({
      emAndamento: () => ({
        ok: true,
        valor: {
          itens: [registro({ id: 'a0000000-0000-7000-8000-00000000000a', tipo: 'sono', fim: null }), registro({ fim: null })],
          incompleta: false,
        },
      }),
      sessoesDaJanela: () => ({ ok: true, valor: { itens: [], incompleta: true } }),
    })
    const lido = await criarDadosDesenvolvimento(dados).lerBloco(BEBE, 'America/Sao_Paulo', AGORA)
    expect(lido.ok && lido.valor.emAndamento.map((r) => r.tipo)).toEqual(['tummy'])
    expect(lido.ok && lido.valor.incompleta).toBe(true)
  })

  it('lerBloco: se uma das leituras falha, a leitura toda falha (nunca dado parcial)', async () => {
    const falha: ErroDados = { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: 'x' }
    const { dados } = criarFalsa({
      emAndamento: () => ({ ok: true, valor: { itens: [], incompleta: false } }),
      sessoesDaJanela: () => ({ ok: false, erro: falha }),
    })
    expect((await criarDadosDesenvolvimento(dados).lerBloco(BEBE, 'America/Sao_Paulo', AGORA)).ok).toBe(false)
  })

  it('iniciar: gravarRegistro com o id, tipo tummy, início agora, sem fim, sem detalhes nem nota, origem ao_vivo', async () => {
    const { dados, chamadas } = criarFalsa()
    const id = uuidV7()
    await criarDadosDesenvolvimento(dados).iniciar({ id, bebe: BEBE, inicio: AGORA })
    expect(chamadas).toEqual([
      {
        operacao: 'gravarRegistro',
        args: [{ id, bebeId: BEBE, tipo: 'tummy', inicio: '2026-11-12T18:00:00.000Z', fim: null, origem: 'ao_vivo' }],
      },
    ])
    expect(ehUuidV7(id)).toBe(true)
  })

  it('registrarDepois: gravarRegistro com início e fim e origem retroativo', async () => {
    const { dados, chamadas } = criarFalsa()
    const id = uuidV7()
    await criarDadosDesenvolvimento(dados).registrarDepois({ id, bebe: BEBE, inicio: AGORA - 600_000, fim: AGORA })
    expect(chamadas).toEqual([
      {
        operacao: 'gravarRegistro',
        args: [
          { id, bebeId: BEBE, tipo: 'tummy', inicio: '2026-11-12T17:50:00.000Z', fim: '2026-11-12T18:00:00.000Z', origem: 'retroativo' },
        ],
      },
    ])
  })

  it('encerrar: encerrarSessao(id, momento) e devolve o fim gravado em milissegundos', async () => {
    const { dados, chamadas } = criarFalsa({ encerrarSessao: () => ({ ok: true, valor: '2026-11-12T17:59:00.000Z' }) })
    const resposta = await criarDadosDesenvolvimento(dados).encerrar('a0000000-0000-7000-8000-000000000001', AGORA)
    expect(chamadas).toEqual([
      { operacao: 'encerrarSessao', args: ['a0000000-0000-7000-8000-000000000001', '2026-11-12T18:00:00.000Z'] },
    ])
    expect(resposta).toEqual({ ok: true, valor: Date.parse('2026-11-12T17:59:00Z') })
  })

  it('encerrar: um fim fora do formato é erro "desconhecido" sem código, nunca sucesso', async () => {
    const { dados } = criarFalsa({ encerrarSessao: () => ({ ok: true, valor: 'não é data' }) })
    const resposta = await criarDadosDesenvolvimento(dados).encerrar('a0000000-0000-7000-8000-000000000001', AGORA)
    expect(resposta.ok).toBe(false)
    expect(!resposta.ok && traduzirErro(resposta.erro).chave).toBe('semResposta')
  })

  it('descartar e restaurar: excluirRegistro(id) e restaurarRegistro(id)', async () => {
    const { dados, chamadas } = criarFalsa()
    const camada = criarDadosDesenvolvimento(dados)
    await camada.descartar('a0000000-0000-7000-8000-000000000002')
    await camada.restaurar('a0000000-0000-7000-8000-000000000002')
    expect(chamadas).toEqual([
      { operacao: 'excluirRegistro', args: ['a0000000-0000-7000-8000-000000000002'] },
      { operacao: 'restaurarRegistro', args: ['a0000000-0000-7000-8000-000000000002'] },
    ])
  })
})

describe('DES-13 16: a varredura dos arquivos do 39b', () => {
  const RAIZ = join(process.cwd(), 'src')
  const arquivos = (pasta: string): string[] =>
    readdirSync(pasta).flatMap((nome) => {
      const caminho = join(pasta, nome)
      return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
    })
  const doBloco = [
    join(RAIZ, 'dados', 'desenvolvimento.ts'),
    join(RAIZ, 'dados', 'desenvolvimento.contexto.tsx'),
    join(RAIZ, 'conteudo', 'desenvolvimento', 'textosTummy.ts'),
    ...arquivos(join(RAIZ, 'componentes', 'desenvolvimento', 'tummy')),
  ].filter((arquivo) => !/\.test\.tsx?$/.test(arquivo))

  it('há arquivos do bloco para varrer', () => {
    expect(doBloco.length).toBeGreaterThanOrEqual(6)
  })

  it('nenhum importa dados/cliente nem faz from("registros") ou rpc(', () => {
    for (const arquivo of doBloco) {
      const texto = readFileSync(arquivo, 'utf8')
      expect(texto, arquivo).not.toMatch(/dados\/cliente|from\(\s*['"]registros['"]\s*\)|\brpc\(/)
      expect(texto, arquivo).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie|\bfetch\(/)
    }
  })

  it('nenhum tem <svg>, lucide-react, cor literal nem os nomes de teste antigos', () => {
    for (const arquivo of doBloco) {
      const texto = readFileSync(arquivo, 'utf8')
      expect(texto, arquivo).not.toMatch(/<svg|lucide-react/)
      expect(texto, arquivo).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(/)
      expect(texto, arquivo).not.toMatch(/\b(Lia|Ana)\b/)
      expect(texto, arquivo).not.toContain('­')
    }
  })
})
