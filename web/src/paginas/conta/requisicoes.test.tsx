import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { CONTEUDO, ELENCO, criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaSupabase } from '../../dados/conta.supabase.ts'
import { criarClienteFalso } from '../../teste/renderizarComDados.tsx'
import { renderizarComunidade } from '../comunidade/apoio.tsx'

// P-54: a minimização de dados na casca logada. Uma caminhada de verdade, pelo adaptador do banco
// (com um cliente falso que responde por tabela e anota cada consulta): `/app/conta`, depois
// `/app/comunidade`, depois um tópico. A Conta lê o que mostra, e nada além: no máximo uma requisição
// de `vinculos` (as famílias e os membros das que a pessoa é responsável, juntos), nenhuma de `bebes` e
// nenhuma de `convites`, seja uma família ou várias. A Comunidade não lê nenhuma das três.

const PESSOA = ELENCO.outro
const FUSO = 'America/Sao_Paulo'

interface FamiliaDoTeste {
  nome: string
  meuPapel: 'responsavel' | 'cuidador'
  /** As outras pessoas com vínculo ativo na família. */
  outros: Array<{ conta: string; papel: 'responsavel' | 'cuidador' }>
}

const LINHA_CONTA = { id: PESSOA.conta, nome_privado: 'Outra', fuso: FUSO, criada_em: '2026-10-01T10:00:00+00:00' }
const OUTRA_PESSOA = ELENCO.autor.conta

const sozinha = (nome: string): FamiliaDoTeste => ({ nome, meuPapel: 'responsavel', outros: [] })
const comOutroResponsavel = (nome: string): FamiliaDoTeste => ({
  nome,
  meuPapel: 'responsavel',
  outros: [{ conta: OUTRA_PESSOA, papel: 'responsavel' }],
})
const comoCuidadora = (nome: string): FamiliaDoTeste => ({
  nome,
  meuPapel: 'cuidador',
  outros: [{ conta: OUTRA_PESSOA, papel: 'responsavel' }],
})

type Filtros = Record<string, unknown>

interface OpcoesDoCliente {
  familias: FamiliaDoTeste[]
  /** Faz a consulta falhar com um erro do banco. */
  falhar?: (tabela: string, filtros: Filtros) => boolean
}

function montarCliente({ familias, falhar }: OpcoesDoCliente) {
  const usuario = { id: PESSOA.conta, email: PESSOA.email, user_metadata: { nome_privado: LINHA_CONTA.nome_privado } }
  const falso = criarClienteFalso({ usuario })
  const lidas: string[] = []
  const criadaEm = (posicao: number) => `2026-10-0${posicao + 1}T10:00:00+00:00`
  const vinculosDa = (familia: FamiliaDoTeste, posicao: number) => [
    { id: `meu-${posicao}`, conta_id: PESSOA.conta, papel: familia.meuPapel, estado: 'ativo', valido_ate: null, criado_em: criadaEm(posicao) },
    ...familia.outros.map((outro, i) => ({
      id: `outro-${posicao}-${i}`,
      conta_id: outro.conta,
      papel: outro.papel,
      estado: 'ativo',
      valido_ate: null,
      criado_em: criadaEm(posicao),
    })),
  ]
  const linhaDaFamilia = (familia: FamiliaDoTeste, posicao: number, colunas: string) => ({
    id: `familia-${posicao}`,
    nome: familia.nome,
    fuso: FUSO,
    criada_em: criadaEm(posicao),
    // Como o banco: só embute os vínculos se a consulta os pediu.
    ...(colunas.includes('vinculos(') ? { vinculos: vinculosDa(familia, posicao) } : {}),
  })

  function linhasDe(tabela: string, filtros: Filtros, colunas: string): unknown[] {
    switch (tabela) {
      case 'contas': {
        const quem = filtros.id
        const todas = [LINHA_CONTA, { ...LINHA_CONTA, id: OUTRA_PESSOA, nome_privado: 'Autora' }]
        return todas.filter((conta) => (Array.isArray(quem) ? quem.includes(conta.id) : conta.id === quem))
      }
      case 'vinculos':
        if ('familia_id' in filtros) {
          const posicao = Number(String(filtros.familia_id).replace('familia-', ''))
          return vinculosDa(familias[posicao], posicao).map((vinculo) => ({
            ...vinculo,
            familias: linhaDaFamilia(familias[posicao], posicao, ''),
          }))
        }
        return familias.map((familia, posicao) => ({
          id: `meu-${posicao}`,
          papel: familia.meuPapel,
          valido_ate: null,
          familias: linhaDaFamilia(familia, posicao, colunas),
        }))
      case 'bebes':
        return [{ id: 'b1', familia_id: 'familia-0', nome: 'Heloísa', nascimento: '2026-08-05', estado: 'ativo', criado_em: criadaEm(0) }]
      default:
        return []
    }
  }

  falso.from.mockImplementation((tabela: string) => {
    lidas.push(tabela)
    const filtros: Filtros = {}
    let colunas = ''
    const consulta: Record<string, unknown> = {}
    for (const metodo of ['order', 'insert', 'update']) consulta[metodo] = () => consulta
    consulta.select = (pedidas: string) => {
      colunas = pedidas
      return consulta
    }
    for (const metodo of ['eq', 'in']) {
      consulta[metodo] = (coluna: string, valor: unknown) => {
        filtros[coluna] = valor
        return consulta
      }
    }
    const resolver = async () =>
      falhar?.(tabela, filtros)
        ? { data: null, error: { code: '57014', message: 'tempo esgotado' } }
        : { data: linhasDe(tabela, filtros, colunas), error: null }
    consulta.maybeSingle = async () => {
      const lida = await resolver()
      return { data: lida.data?.[0] ?? null, error: lida.error }
    }
    consulta.single = consulta.maybeSingle
    consulta.then = (aoCumprir: (valor: unknown) => unknown, aoFalhar: (erro: unknown) => unknown) =>
      resolver().then(aoCumprir, aoFalhar)
    return consulta
  })
  return { ...falso, lidas }
}

type Contagem = Record<'bebes' | 'convites' | 'vinculos', number>

const contar = (lidas: string[]): Contagem => ({
  bebes: lidas.filter((tabela) => tabela === 'bebes').length,
  convites: lidas.filter((tabela) => tabela === 'convites').length,
  vinculos: lidas.filter((tabela) => tabela === 'vinculos').length,
})
const diferenca = (depois: Contagem, antes: Contagem): Contagem => ({
  bebes: depois.bebes - antes.bebes,
  convites: depois.convites - antes.convites,
  vinculos: depois.vinculos - antes.vinculos,
})

const assentar = () => act(() => new Promise<void>((resolver) => setTimeout(resolver, 60)))
const semCarregando = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
const botaoExcluir = () => screen.getByRole('button', { name: 'Excluir minha conta' }) as HTMLButtonElement

function abrirConta(opcoes: OpcoesDoCliente) {
  const cliente = montarCliente(opcoes)
  const comunidade = criarDadosComunidadeMemoria(criarElenco(), PESSOA.conta)
  const tela = renderizarComunidade('/app/conta', { contas: criarDadosContaSupabase(cliente.cliente), comunidade })
  return { ...tela, lidas: cliente.lidas }
}

async function esperarALeitura() {
  await screen.findByRole('heading', { level: 1, name: 'Conta' })
  await waitFor(() => expect(screen.queryByText('Conferindo as suas famílias…')).toBeNull())
  await assentar()
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('as requisições da casca logada, numa caminhada: Conta, Comunidade e um tópico', () => {
  it('a Conta pede vínculos no máximo uma vez, sem bebês nem convites; a Comunidade e o tópico não pedem nenhuma das três', async () => {
    const { roteador, lidas } = abrirConta({ familias: [sozinha('Casa da Heloísa')] })

    await esperarALeitura()
    const aposConta = contar(lidas)

    await act(async () => {
      await roteador.navigate('/app/comunidade')
    })
    await semCarregando()
    await assentar()
    const aposComunidade = contar(lidas)

    await act(async () => {
      await roteador.navigate(`/app/comunidade/topico/${CONTEUDO.topicoDoAutor}`)
    })
    await screen.findByText('Tópico do autor')
    await semCarregando()
    await assentar()
    const aposTopico = contar(lidas)

    expect({
      conta: aposConta.bebes === 0 && aposConta.convites === 0 && aposConta.vinculos <= 1 ? 'dentro do limite' : aposConta,
      comunidade: diferenca(aposComunidade, aposConta),
      topico: diferenca(aposTopico, aposComunidade),
    }).toEqual({
      conta: 'dentro do limite',
      comunidade: { bebes: 0, convites: 0, vinculos: 0 },
      topico: { bebes: 0, convites: 0, vinculos: 0 },
    })
  })

  it('com várias famílias em que a pessoa é responsável, continua uma só requisição de vínculos, e nenhuma de bebês e convites', async () => {
    const { lidas } = abrirConta({
      familias: [sozinha('Casa A'), comOutroResponsavel('Casa B'), sozinha('Casa C'), comoCuidadora('Casa D'), comOutroResponsavel('Casa E')],
    })

    await esperarALeitura()

    const contagem = contar(lidas)
    expect(contagem.vinculos, 'vinculos').toBeLessThanOrEqual(1)
    expect(contagem.bebes, 'bebes').toBe(0)
    expect(contagem.convites, 'convites').toBe(0)
  })
})

describe('os impedimentos da exclusão com a leitura única', () => {
  it('só bloqueiam as famílias em que todo responsável sou eu: com várias, só algumas bloqueiam', async () => {
    abrirConta({
      familias: [sozinha('Casa A'), comOutroResponsavel('Casa B'), sozinha('Casa C'), comoCuidadora('Casa D'), comOutroResponsavel('Casa E')],
    })

    await esperarALeitura()

    const itens = [...document.querySelectorAll('#impedimento-exclusao li')].map((item) => item.textContent)
    expect(itens).toEqual(['Casa A', 'Casa C'])
    expect(botaoExcluir().disabled).toBe(true)
  })

  it('uma família com outro responsável não bloqueia', async () => {
    abrirConta({ familias: [comOutroResponsavel('Casa B'), comoCuidadora('Casa D')] })

    await esperarALeitura()

    expect(document.getElementById('impedimento-exclusao')).toBeNull()
    expect(botaoExcluir().disabled).toBe(false)
  })

  it('um erro na leitura dos vínculos mostra o erro e deixa o botão desativado (nunca "sem impedimento")', async () => {
    abrirConta({ familias: [sozinha('Casa A')], falhar: (tabela, filtros) => tabela === 'vinculos' && 'conta_id' in filtros })

    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(botaoExcluir().disabled).toBe(true)
    expect(document.getElementById('impedimento-exclusao')).toBeNull()
  })

  it('um erro ao ler os nomes dos membros também fecha a leitura em erro', async () => {
    abrirConta({ familias: [sozinha('Casa A')], falhar: (tabela, filtros) => tabela === 'contas' && Array.isArray(filtros.id) })

    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(botaoExcluir().disabled).toBe(true)
    expect(document.getElementById('impedimento-exclusao')).toBeNull()
  })
})
