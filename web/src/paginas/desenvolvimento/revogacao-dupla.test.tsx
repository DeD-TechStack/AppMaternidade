import { act, configure, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '../../dados/comum.ts'
import { OPERACOES_ROTINA, type ContextoRotina, type DadosRotina, type OperacaoRotina } from '../../dados/rotina.tipos.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { ID_FAMILIA, criarMundoDeTeste, type Mundo } from '../../teste/rotina.fixture.ts'

// MAT-39b, devolução 2: a proteção contra laço da página vale por IDENTIDADE do contexto (`familia.id:bebe.id`), não
// uma vez por abertura. Bruno está em duas famílias (Exemplo, com Heloísa, e Teste, com Teo); cada revogação de
// vínculo com a página aberta invalida o contexto atual, e a mesma identidade já invalidada não vira laço.

configure({ getElementError: (mensagem) => new Error(mensagem ?? 'Elemento não encontrado.') })

const HOJE = new Date(2026, 10, 12, 15, 0, 0)
const ID_FAMILIA_TESTE = 'f2222222-2222-4222-8222-222222222222'
const SEM_FAMILIA = 'Você ainda não faz parte de uma família.'

/** Só o `Date` é falso: os temporizadores reais seguem. */
function relogioEm(data: Date = HOJE) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(data)
}

afterEach(() => {
  vi.useRealTimers()
})

const mudarDeSessao = (m: Mundo, quem: keyof typeof PESSOAS) => m.conta.sessaoParaTeste(PESSOAS[quem].email)

const bloco = () => document.querySelector<HTMLElement>('[data-tummy]')
const botao = (nome: string | RegExp) => within(bloco()!).getByRole('button', { name: nome })
const h1 = () => screen.getByRole('heading', { level: 1 })

async function clicar(elemento: HTMLElement) {
  await act(async () => {
    fireEvent.click(elemento)
  })
  await aguardarCarga()
}

/** Bruno em Família Exemplo (Heloísa) e em Família Teste (Teo, criada por Carla). Devolve os vínculos dele. */
async function mundoDeBrunoEmDuasFamilias() {
  const m = criarMundoDeTeste({ sessao: 'bruno' })
  mudarDeSessao(m, 'carla')
  expect((await m.conta.cadastrarBebe(ID_FAMILIA_TESTE, 'Teo', '2026-08-05')).ok).toBe(true)
  const convite = await m.conta.criarConvite(ID_FAMILIA_TESTE, 'cuidador', null)
  if (!convite.ok) throw new Error('convite: ' + convite.erro.chave)
  mudarDeSessao(m, 'bruno')
  expect((await m.conta.aceitarConvite(convite.valor.codigo)).ok).toBe(true)
  const vinculoEm = async (familiaId: string) => {
    const detalhe = await m.conta.detalheFamilia(familiaId)
    if (!detalhe.ok) throw new Error('detalhe: ' + detalhe.erro.chave)
    return detalhe.valor.membros.find((membro) => membro.contaId === PESSOAS.bruno.id)!.vinculoId
  }
  return { m, vinculoExemplo: await vinculoEm(ID_FAMILIA), vinculoTeste: await vinculoEm(ID_FAMILIA_TESTE) }
}

/** Quem tem poder (responsável da família) revoga o vínculo de Bruno; depois a sessão volta a ser a dele. */
async function revogar(m: Mundo, quem: 'juliana' | 'carla', vinculo: string) {
  mudarDeSessao(m, quem)
  expect((await m.conta.revogarVinculo(vinculo)).ok).toBe(true)
  mudarDeSessao(m, 'bruno')
}

async function abrir(m: Mundo, rotina: DadosRotina = m.rotina) {
  renderizarRota('/app/desenvolvimento', { mundo: { ...m, rotina } })
  await aguardarCarga()
}

describe('revogações de vínculo seguidas com a página aberta (MAT-39b, R1)', () => {
  it('duas revogações em sequência: terminam em "Sem família", sem bloco nem grade da fase, com o foco no h1', async () => {
    relogioEm()
    const { m, vinculoExemplo, vinculoTeste } = await mundoDeBrunoEmDuasFamilias()
    await abrir(m)
    expect(h1().textContent).toBe('Desenvolvimento')

    await revogar(m, 'juliana', vinculoExemplo)
    await clicar(botao('Iniciar tummy time de Heloísa'))
    await waitFor(() => expect(within(bloco()!).getByRole('button', { name: 'Iniciar tummy time de Teo' })).toBeTruthy())

    await revogar(m, 'carla', vinculoTeste)
    await clicar(botao('Iniciar tummy time de Teo'))

    const familias = await m.conta.minhasFamilias()
    expect(familias.ok && familias.valor.length).toBe(0)
    await waitFor(() => expect(screen.getByText(SEM_FAMILIA)).toBeTruthy())
    expect(bloco()).toBeNull()
    expect(document.querySelector('[data-grade-do-desenvolvimento]')).toBeNull()
    expect(document.querySelector('[data-fase]')).toBeNull()
    expect(screen.queryByRole('button', { name: /Iniciar tummy time/ })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(h1()))
  })

  it('após cada invalidação: o bloco do contexto antigo sai da tela e o foco vai ao h1', async () => {
    relogioEm()
    const { m, vinculoExemplo, vinculoTeste } = await mundoDeBrunoEmDuasFamilias()
    await abrir(m)
    expect(within(bloco()!).getByRole('button', { name: 'Iniciar tummy time de Heloísa' })).toBeTruthy()

    // 1ª invalidação: some o bloco de Heloísa, a página segue em Teo e o foco está no título.
    await revogar(m, 'juliana', vinculoExemplo)
    await clicar(botao('Iniciar tummy time de Heloísa'))
    await waitFor(() => expect(within(bloco()!).getByRole('button', { name: 'Iniciar tummy time de Teo' })).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Iniciar tummy time de Heloísa' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(h1()))

    // 2ª invalidação: some o bloco de Teo e o foco está no título outra vez.
    await revogar(m, 'carla', vinculoTeste)
    await clicar(botao('Iniciar tummy time de Teo'))
    await waitFor(() => expect(bloco()).toBeNull())
    expect(screen.queryByRole('button', { name: 'Iniciar tummy time de Teo' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(h1()))
  })

  it('a primeira revogação sozinha continua passando: a página segue na outra família, com o foco no h1', async () => {
    relogioEm()
    const { m, vinculoExemplo } = await mundoDeBrunoEmDuasFamilias()
    await abrir(m)

    await revogar(m, 'juliana', vinculoExemplo)
    await clicar(botao('Iniciar tummy time de Heloísa'))

    await waitFor(() => expect(within(bloco()!).getByRole('button', { name: 'Iniciar tummy time de Teo' })).toBeTruthy())
    expect(screen.queryByText(SEM_FAMILIA)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Iniciar tummy time de Heloísa' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(h1()))
  })

  it('a mesma identidade não vira laço: o contexto que segue na tela sem acesso é relido uma vez só', async () => {
    relogioEm()
    const m = criarMundoDeTeste({ sessao: 'bruno' })
    // A resposta é a da própria memória, sem a família de Heloísa: o bloco acha que perdeu o acesso, mas a conta
    // ainda lista a família e a página continua com o mesmo bebê (mesma identidade `familia.id:bebe.id`).
    let chamadas = 0
    type Funcao = (...args: unknown[]) => Promise<Resultado<unknown>>
    const rotina = Object.fromEntries(
      OPERACOES_ROTINA.map((operacao: OperacaoRotina) => [
        operacao,
        async (...args: unknown[]) => {
          const resposta = await (m.rotina[operacao] as Funcao)(...args)
          if (operacao !== 'contexto') return resposta
          chamadas += 1
          if (!resposta.ok) return resposta
          const valor = resposta.valor as ContextoRotina
          return { ok: true, valor: { ...valor, familias: valor.familias.filter((familia) => familia.id !== ID_FAMILIA) } }
        },
      ]),
    ) as unknown as DadosRotina

    await abrir(m, rotina)
    // Leitura inicial do bloco (1) e a releitura da página, que remonta o bloco (2).
    await waitFor(() => expect(chamadas).toBe(2))
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 80))
    })
    await aguardarCarga()
    expect(chamadas).toBe(2)
    expect(await m.conta.minhasFamilias()).toMatchObject({ ok: true })
    await waitFor(() => expect(document.activeElement).toBe(h1()))

    // O bloco lê de novo ao voltar para a aba: de novo sem acesso, a mesma identidade já foi invalidada.
    const montado = bloco()
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await aguardarCarga()
    await waitFor(() => expect(chamadas).toBe(3))
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 80))
    })
    expect(chamadas).toBe(3)
    expect(bloco()).toBe(montado)
  })
})
