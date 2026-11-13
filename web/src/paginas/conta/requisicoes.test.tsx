import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { CONTEUDO, ELENCO, criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaSupabase } from '../../dados/conta.supabase.ts'
import { criarClienteFalso } from '../../teste/renderizarComDados.tsx'
import { renderizarComunidade } from '../comunidade/apoio.tsx'

// P-54: a minimização de dados na casca logada. Uma caminhada de verdade, pelo adaptador do banco
// (com um cliente falso que responde por tabela e anota cada consulta): `/app/conta`, depois
// `/app/comunidade`, depois um tópico. A Conta lê o que mostra (as famílias e, de cada uma em que a
// pessoa é responsável, os membros): nenhum bebê e nenhum convite. A Comunidade não lê nenhuma das três.

const PESSOA = ELENCO.outro
const FAMILIA = 'f1111111-1111-4111-8111-111111111111'
const FUSO = 'America/Sao_Paulo'
const CRIADA_EM = '2026-10-01T10:00:00+00:00'

const LINHA_CONTA = { id: PESSOA.conta, nome_privado: 'Outra', fuso: FUSO, criada_em: CRIADA_EM }
const LINHA_FAMILIA = { id: FAMILIA, nome: 'Casa da Heloísa', fuso: FUSO, criada_em: CRIADA_EM }
const MEU_VINCULO = { id: 'v1', conta_id: PESSOA.conta, papel: 'responsavel', estado: 'ativo', valido_ate: null, criado_em: CRIADA_EM }
const OUTRO_VINCULO = { id: 'v2', conta_id: ELENCO.autor.conta, papel: 'cuidador', estado: 'ativo', valido_ate: null, criado_em: CRIADA_EM }
const LINHA_BEBE = { id: 'b1', familia_id: FAMILIA, nome: 'Heloísa', nascimento: '2026-08-05', estado: 'ativo', criado_em: CRIADA_EM }

type Filtros = Record<string, unknown>

/** O que o banco devolveria a cada consulta: só o que esta pessoa, com uma família em que é responsável, enxerga. */
function linhasDe(tabela: string, filtros: Filtros): unknown[] {
  switch (tabela) {
    case 'contas': {
      const quem = filtros.id
      return [LINHA_CONTA].filter((conta) => (Array.isArray(quem) ? quem.includes(conta.id) : conta.id === quem))
    }
    case 'vinculos':
      if ('familia_id' in filtros) {
        return [MEU_VINCULO, OUTRO_VINCULO].map((vinculo) => ({ ...vinculo, familias: LINHA_FAMILIA }))
      }
      return [{ id: MEU_VINCULO.id, papel: MEU_VINCULO.papel, valido_ate: null, familias: LINHA_FAMILIA }]
    case 'bebes':
      return [LINHA_BEBE]
    default:
      return []
  }
}

function montarCliente() {
  const usuario = { id: PESSOA.conta, email: PESSOA.email, user_metadata: { nome_privado: LINHA_CONTA.nome_privado } }
  const falso = criarClienteFalso({ usuario })
  const lidas: string[] = []
  falso.from.mockImplementation((tabela: string) => {
    lidas.push(tabela)
    const filtros: Filtros = {}
    const consulta: Record<string, unknown> = {}
    for (const metodo of ['select', 'order', 'insert', 'update']) consulta[metodo] = () => consulta
    for (const metodo of ['eq', 'in']) {
      consulta[metodo] = (coluna: string, valor: unknown) => {
        filtros[coluna] = valor
        return consulta
      }
    }
    const resolver = async () => ({ data: linhasDe(tabela, filtros), error: null })
    consulta.maybeSingle = async () => ({ data: (await resolver()).data[0] ?? null, error: null })
    consulta.single = consulta.maybeSingle
    consulta.then = (aoCumprir: (valor: unknown) => unknown, aoFalhar: (erro: unknown) => unknown) =>
      resolver().then(aoCumprir, aoFalhar)
    return consulta
  })
  return { ...falso, lidas }
}

const TABELAS = ['bebes', 'convites', 'vinculos'] as const
type Contagem = Record<(typeof TABELAS)[number], number>

const contar = (lidas: string[]): Contagem => ({
  bebes: lidas.filter((tabela) => tabela === 'bebes').length,
  convites: lidas.filter((tabela) => tabela === 'convites').length,
  vinculos: lidas.filter((tabela) => tabela === 'vinculos').length,
})

const assentar = () => act(() => new Promise<void>((resolver) => setTimeout(resolver, 60)))
const semCarregando = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('as requisições da casca logada, numa caminhada: Conta, Comunidade e um tópico', () => {
  it('a Conta pede famílias e membros uma vez, sem bebês nem convites; a Comunidade não pede nenhuma das três', async () => {
    const { cliente, lidas } = montarCliente()
    const comunidade = criarDadosComunidadeMemoria(criarElenco(), PESSOA.conta)
    const { roteador } = renderizarComunidade('/app/conta', { contas: criarDadosContaSupabase(cliente), comunidade })

    // Passo 1: /app/conta. A leitura dos impedimentos termina quando o aviso "Conferindo…" sai.
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    await waitFor(() => expect(screen.queryByText('Conferindo as suas famílias…')).toBeNull())
    await assentar()
    const aposConta = contar(lidas)

    // Passo 2: /app/comunidade, dentro do mesmo provedor de sessão.
    await act(async () => {
      await roteador.navigate('/app/comunidade')
    })
    await semCarregando()
    await assentar()
    const aposComunidade = contar(lidas)

    // Passo 3: um tópico.
    await act(async () => {
      await roteador.navigate(`/app/comunidade/topico/${CONTEUDO.topicoDoAutor}`)
    })
    await screen.findByText('Tópico do autor')
    await semCarregando()
    await assentar()
    const aposTopico = contar(lidas)

    const passos = {
      conta: aposConta,
      comunidade: Object.fromEntries(TABELAS.map((tabela) => [tabela, aposComunidade[tabela] - aposConta[tabela]])),
      topico: Object.fromEntries(TABELAS.map((tabela) => [tabela, aposTopico[tabela] - aposComunidade[tabela]])),
    }

    // `vinculos`: 1 da lista de famílias e 1 dos membros da única família em que a pessoa é responsável.
    expect(passos).toEqual({
      conta: { bebes: 0, convites: 0, vinculos: 2 },
      comunidade: { bebes: 0, convites: 0, vinculos: 0 },
      topico: { bebes: 0, convites: 0, vinculos: 0 },
    })
  })
})
