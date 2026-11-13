import { describe, expect, it } from 'vitest'
import type { Resultado } from './comum.ts'
import { criarDadosContaMemoria } from './conta.memoria.ts'
import { criarDadosContaSupabase } from './conta.supabase.ts'
import { FAMILIAS_DEMONSTRACAO } from './conta.demonstracao.ts'
import { criarClienteFalso, criarFixtureDeTeste, PESSOAS, USUARIO_FALSO, type RespostaFalsa } from '../teste/renderizarComDados.tsx'

// P-54: `detalheFamilia(id, 'membros')` lê só os membros. No banco, uma consulta de `vinculos` e uma de
// `contas`, nunca `bebes` nem `convites`; na memória, o mesmo resultado sem as duas listas.

const FAMILIA = 'f1111111-1111-4111-8111-111111111111'
const FUSO = 'America/Sao_Paulo'
const FAMILIA_LINHA = { id: FAMILIA, nome: 'Casa da Heloísa', fuso: FUSO, criada_em: '2026-10-01T10:00:00+00:00' }
const resposta = (data: unknown): RespostaFalsa => ({ data, error: null })

function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`era para dar certo: ${resultado.erro.chave}`)
  return resultado.valor
}

const membro = (id: string, contaId: string, papel: string, validoAte: string | null = null) => ({
  id,
  conta_id: contaId,
  papel,
  estado: 'ativo',
  valido_ate: validoAte,
  criado_em: '2026-10-01T10:00:00+00:00',
  familias: FAMILIA_LINHA,
})

function montar(vinculos: unknown[]) {
  const falso = criarClienteFalso({
    tabelas: {
      vinculos: [resposta(vinculos)],
      contas: [resposta([{ id: USUARIO_FALSO.id, nome_privado: 'Juliana' }, { id: 'outra', nome_privado: 'Bruno' }])],
    },
  })
  const tabelas = () => falso.from.mock.calls.map(([tabela]) => tabela)
  return { dados: criarDadosContaSupabase(falso.cliente), tabelas }
}

describe("detalheFamilia(id, 'membros') no banco", () => {
  it('pede vinculos uma vez e contas uma vez, sem bebes, convites nem a releitura dos vínculos da pessoa', async () => {
    const { dados, tabelas } = montar([membro('v1', USUARIO_FALSO.id, 'responsavel'), membro('v2', 'outra', 'cuidador')])

    const detalhe = valor(await dados.detalheFamilia(FAMILIA, 'membros'))

    expect(tabelas()).toEqual(['vinculos', 'contas'])
    expect(detalhe.familia).toMatchObject({ id: FAMILIA, nome: 'Casa da Heloísa', meuPapel: 'responsavel', meuVinculoId: 'v1' })
    expect(detalhe.membros.map((m) => [m.nome, m.papel, m.souEu])).toEqual([
      ['Juliana', 'responsavel', true],
      ['Bruno', 'cuidador', false],
    ])
    expect(detalhe.bebes).toEqual([])
    expect(detalhe.convites).toBeNull()
  })

  it('o vínculo vencido da própria pessoa é família inexistente (P0002), como no detalhe completo', async () => {
    const { dados } = montar([membro('v1', USUARIO_FALSO.id, 'responsavel', '2020-01-01T00:00:00+00:00'), membro('v2', 'outra', 'cuidador')])

    const resultado = await dados.detalheFamilia(FAMILIA, 'membros')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro.chave).toBe('nao_encontrado')
  })

  it('sem escopo, o detalhe segue completo: lê bebes e, para o responsável, convites', async () => {
    const falso = criarClienteFalso({
      tabelas: {
        vinculos: [
          resposta([{ id: 'v1', papel: 'responsavel', valido_ate: null, familias: FAMILIA_LINHA }]),
          resposta([membro('v1', USUARIO_FALSO.id, 'responsavel')]),
        ],
        bebes: [resposta([])],
        convites: [resposta([])],
        contas: [resposta([{ id: USUARIO_FALSO.id, nome_privado: 'Juliana' }])],
      },
    })
    const dados = criarDadosContaSupabase(falso.cliente)

    valor(await dados.detalheFamilia(FAMILIA))

    const tabelas = falso.from.mock.calls.map(([tabela]) => tabela)
    expect(tabelas.filter((tabela) => tabela === 'bebes')).toHaveLength(1)
    expect(tabelas.filter((tabela) => tabela === 'convites')).toHaveLength(1)
  })
})

/** As colunas do `select` da primeira consulta que o cliente falso recebeu. */
function colunasPedidas(falso: ReturnType<typeof criarClienteFalso>): string {
  const consulta = falso.from.mock.results[0].value as { select: { mock: { calls: string[][] } } }
  return consulta.select.mock.calls[0][0]
}

describe('minhasFamilias({ comMembros: true }) no banco', () => {
  const outraFamilia = { ...FAMILIA_LINHA, id: 'f2222222-2222-4222-8222-222222222222', nome: 'Casa do Teo', criada_em: '2026-10-02T10:00:00+00:00' }
  const comVinculos = (familia: typeof FAMILIA_LINHA, vinculos: unknown[] | undefined) => ({
    ...familia,
    ...(vinculos ? { vinculos } : {}),
  })
  const cru = (id: string, contaId: string, papel: string, validoAte: string | null = null) => ({
    id,
    conta_id: contaId,
    papel,
    estado: 'ativo',
    valido_ate: validoAte,
    criado_em: '2026-10-01T10:00:00+00:00',
  })
  const meu = (id: string, papel: string, familias: unknown) => ({ id, papel, valido_ate: null, familias })

  function montarComMembros(linhas: unknown[], contas: RespostaFalsa = resposta([{ id: USUARIO_FALSO.id, nome_privado: 'Juliana' }, { id: 'outra', nome_privado: 'Bruno' }])) {
    const falso = criarClienteFalso({ tabelas: { vinculos: [resposta(linhas)], contas: [contas] } })
    const tabelas = () => falso.from.mock.calls.map(([tabela]) => tabela)
    return { dados: criarDadosContaSupabase(falso.cliente), tabelas, falso }
  }

  it('uma só consulta de vinculos, com os vínculos da família embutidos, e uma de contas: nunca bebes nem convites', async () => {
    const { dados, tabelas, falso } = montarComMembros([
      meu('v1', 'responsavel', comVinculos(FAMILIA_LINHA, [cru('v1', USUARIO_FALSO.id, 'responsavel'), cru('v2', 'outra', 'cuidador')])),
      meu('v3', 'responsavel', comVinculos(outraFamilia, [cru('v3', USUARIO_FALSO.id, 'responsavel'), cru('v4', 'outra', 'responsavel')])),
      meu('v5', 'cuidador', comVinculos({ ...FAMILIA_LINHA, id: 'f3', criada_em: '2026-10-03T10:00:00+00:00' }, [cru('v5', USUARIO_FALSO.id, 'cuidador')])),
    ])

    const familias = valor(await dados.minhasFamilias({ comMembros: true }))

    expect(tabelas()).toEqual(['vinculos', 'contas'])
    const pedido = colunasPedidas(falso)
    expect(pedido).toContain('familias(')
    expect(pedido).toContain('vinculos(')
    expect(familias.map((f) => f.membros?.map((m) => [m.nome, m.papel, m.souEu]))).toEqual([
      [
        ['Juliana', 'responsavel', true],
        ['Bruno', 'cuidador', false],
      ],
      [
        ['Juliana', 'responsavel', true],
        ['Bruno', 'responsavel', false],
      ],
      undefined,
    ])
  })

  it('sem a opção, a consulta é a de sempre (sem embutir vínculos) e as famílias não trazem membros', async () => {
    const { dados, tabelas, falso } = montarComMembros([meu('v1', 'responsavel', FAMILIA_LINHA)])

    const familias = valor(await dados.minhasFamilias())

    expect(tabelas()).toEqual(['vinculos'])
    expect(colunasPedidas(falso)).not.toContain('vinculos(')
    expect('membros' in familias[0]).toBe(false)
  })

  it('o vínculo vencido de outro membro não entra, e sem responsável vigente a lista fica vazia, não ausente', async () => {
    const { dados } = montarComMembros([
      meu('v1', 'responsavel', comVinculos(FAMILIA_LINHA, [cru('v1', USUARIO_FALSO.id, 'responsavel'), cru('v2', 'outra', 'responsavel', '2020-01-01T00:00:00+00:00')])),
    ])

    const [familia] = valor(await dados.minhasFamilias({ comMembros: true }))

    expect(familia.membros?.map((m) => m.souEu)).toEqual([true])
  })

  it('família responsável sem os vínculos embutidos na resposta segue sem `membros` (quem pediu relê)', async () => {
    const { dados } = montarComMembros([meu('v1', 'responsavel', comVinculos(FAMILIA_LINHA, undefined))])

    const [familia] = valor(await dados.minhasFamilias({ comMembros: true }))

    expect(familia.membros).toBeUndefined()
  })

  it('erro ao ler os nomes dos membros devolve o erro, nunca uma lista parcial', async () => {
    const { dados } = montarComMembros(
      [meu('v1', 'responsavel', comVinculos(FAMILIA_LINHA, [cru('v1', USUARIO_FALSO.id, 'responsavel')]))],
      { data: null, error: { code: '57014', message: 'tempo esgotado' } },
    )

    expect((await dados.minhasFamilias({ comMembros: true })).ok).toBe(false)
  })
})

describe("minhasFamilias({ comMembros: true }) na memória", () => {
  function comoJuliana() {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    dados.sessaoParaTeste(PESSOAS.juliana.email)
    return dados
  }

  it('traz os mesmos membros do detalhe, só nas famílias em que a pessoa é responsável', async () => {
    const dados = comoJuliana()

    const [familia] = valor(await dados.minhasFamilias({ comMembros: true }))
    const detalhe = valor(await dados.detalheFamilia(familia.id))

    expect(familia.meuPapel).toBe('responsavel')
    expect(familia.membros).toEqual(detalhe.membros)
  })

  it('quem é cuidador não recebe membros, e sem a opção nenhuma família traz a chave', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    dados.sessaoParaTeste(PESSOAS.bruno.email)

    const [comoCuidador] = valor(await dados.minhasFamilias({ comMembros: true }))
    const [semOpcao] = valor(await dados.minhasFamilias())

    expect(comoCuidador.meuPapel).toBe('cuidador')
    expect('membros' in comoCuidador).toBe(false)
    expect('membros' in semOpcao).toBe(false)
  })
})

describe("detalheFamilia(id, 'membros') na memória", () => {
  it('traz os mesmos membros do detalhe completo, sem bebês e sem a lista de convites', async () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    dados.sessaoParaTeste(PESSOAS.juliana.email)

    const completo = valor(await dados.detalheFamilia(FAMILIAS_DEMONSTRACAO.exemplo))
    const membros = valor(await dados.detalheFamilia(FAMILIAS_DEMONSTRACAO.exemplo, 'membros'))

    expect(membros.membros).toEqual(completo.membros)
    expect(membros.familia).toEqual(completo.familia)
    expect(completo.bebes.length).toBeGreaterThan(0)
    expect(membros.bebes).toEqual([])
    expect(membros.convites).toBeNull()
  })
})
