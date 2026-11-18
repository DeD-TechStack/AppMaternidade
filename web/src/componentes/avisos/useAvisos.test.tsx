import { act, cleanup, render } from '@testing-library/react'
import { useLayoutEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ContextoDadosAvisos, type Aviso, type DadosAvisos, type EstadoDosAvisos } from '../../dados/avisos.ts'
import type { Resultado } from '../../dados/comum.ts'
import { SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { criarFixtureDeTeste, PESSOAS } from '../../teste/renderizarComDados.tsx'
import { ProvedorDadosConta, ProvedorSessao } from '../conta/sessao.tsx'
import { useAvisos, type UsoDosAvisos } from './useAvisos.ts'

// RF14:RF-07 (as quatro regras do estado compartilhado) e RF14:RF-18 (troca de conta). Os dados dos avisos
// são falsos e atrasados: cada chamada fica pendente até o teste responder, e o relógio é falso.

type Pendente<T> = { resolver(valor: Resultado<T>): void }

const ok = <T,>(valor: T): Resultado<T> => ({ ok: true, valor })
const rede = { ok: false, erro: erroDaChave('rede') } as const

function aviso(numero: number): Aviso {
  return {
    id: `a2000000-0000-7000-8000-${String(numero).padStart(12, '0')}`,
    texto: `Nota ${numero}`,
    criadaEm: new Date(Date.parse('2026-11-15T10:00:00.000Z') + numero * 1000).toISOString(),
    destaqueAte: null,
    autor: { tipo: 'nome', nome: 'Bruno' },
    familiaNome: 'Família Exemplo',
    familiaFuso: 'America/Sao_Paulo',
  }
}

const estado = (ligados: boolean, quantos: number, maisDe50 = false): EstadoDosAvisos => ({
  ligados,
  avisos: Array.from({ length: quantos }, (_, i) => aviso(i + 1)),
  maisDe50,
})

function criarFalso() {
  const leituras: Pendente<EstadoDosAvisos>[] = []
  const ligacoes: Array<Pendente<null> & { valor: boolean }> = []
  const marcas: Array<Pendente<null> & { ate: string }> = []
  const dados: DadosAvisos = {
    lerEstado: vi.fn(() => new Promise<Resultado<EstadoDosAvisos>>((resolver) => leituras.push({ resolver }))),
    definirLigados: vi.fn((valor: boolean) => new Promise<Resultado<null>>((resolver) => ligacoes.push({ resolver, valor }))),
    marcarVistos: vi.fn((ate: string) => new Promise<Resultado<null>>((resolver) => marcas.push({ resolver, ate }))),
  }
  return { dados, leituras, ligacoes, marcas }
}

// O que o gancho devolveu na última renderização confirmada, e o `mostrado` de cada uma delas.
const sonda: { atual: UsoDosAvisos | null } = { atual: null }
const uso = new Proxy({} as UsoDosAvisos, {
  get: (_alvo, chave) => (sonda.atual as unknown as Record<PropertyKey, unknown>)[chave],
})
const quadros: Array<{ mostrado: EstadoDosAvisos | null }> = []

function Sonda() {
  const atual = useAvisos()
  useLayoutEffect(() => {
    sonda.atual = atual
    quadros.push({ mostrado: atual.mostrado })
  })
  return <p data-testid="fase">{atual.fase}</p>
}

function definirVisibilidade(valor: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => valor })
  document.dispatchEvent(new Event('visibilitychange'))
}

async function assentar() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

async function avancar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function montar(opcoes: { sessao?: 'juliana' | 'bruno' | null; caminho?: string; dados?: DadosAvisos } = {}) {
  const conta = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
  const sessao = opcoes.sessao === undefined ? 'juliana' : opcoes.sessao
  conta.sessaoParaTeste(sessao ? PESSOAS[sessao].email : null)
  const falso = criarFalso()
  const roteador = createMemoryRouter([{ element: <ProvedorSessao />, children: [{ path: '*', element: <Sonda /> }] }], {
    initialEntries: [opcoes.caminho ?? '/app/conta'],
  })
  render(
    <ProvedorDadosConta dados={conta}>
      <ContextoDadosAvisos value={opcoes.dados ?? falso.dados}>
        <RouterProvider router={roteador} />
      </ContextoDadosAvisos>
    </ProvedorDadosConta>,
  )
  await assentar()
  const ir = async (caminho: string) => {
    await act(async () => {
      await roteador.navigate(caminho)
    })
    await assentar()
  }
  const responder = async <T,>(pendente: Pendente<T>, valor: Resultado<T>) => {
    await act(async () => {
      pendente.resolver(valor)
    })
    await assentar()
  }
  return { conta, ...falso, ir, responder }
}

beforeEach(() => {
  vi.useFakeTimers()
  quadros.length = 0
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(document, 'visibilityState')
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('RF14:RF-07 regra 1: os gatilhos da leitura', () => {
  it('começar a sessão lê uma vez; sem sessão não lê', async () => {
    const sem = await montar({ sessao: null })
    expect(sem.dados.lerEstado).not.toHaveBeenCalled()
    cleanup()
    const com = await montar()
    expect(com.dados.lerEstado).toHaveBeenCalledTimes(1)
  })

  it('cada troca de rota dentro do site lê', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 1)))
    await m.ir('/app/avisos')
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(2)
    await m.responder(m.leituras[1], ok(estado(true, 1)))
    await m.ir('/app/familia')
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(3)
  })

  it('a aba que volta a ficar visível lê; a que fica escondida não', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 0)))
    await act(async () => definirVisibilidade('hidden'))
    await assentar()
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(1)
    await act(async () => definirVisibilidade('visible'))
    await assentar()
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(2)
  })

  it('a cada 120 s, numa cadência fixa desde o começo da sessão que uma troca de rota não reinicia', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 0)))
    await avancar(119_999)
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(1)
    await avancar(1)
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(2)
    await m.responder(m.leituras[1], ok(estado(true, 0)))
    await avancar(10_000)
    await m.ir('/app/avisos')
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(3)
    await m.responder(m.leituras[2], ok(estado(true, 0)))
    await avancar(109_999)
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(3)
    await avancar(1)
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(4)
  })

  it('depois de cada gravação confirmada lê de novo', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 1)))
    const gravacao = act(async () => void uso.definirLigados(false))
    await gravacao
    await m.responder(m.ligacoes[0], ok(null))
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(2)
    await m.responder(m.leituras[1], ok(estado(false, 0)))
    await act(async () => void uso.marcarVistos('2026-11-15T10:00:01.000000Z'))
    await m.responder(m.marcas[0], ok(null))
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(3)
  })
})

describe('RF14:RF-07 regra 2: uma leitura por vez', () => {
  it('três gatilhos durante uma leitura viram exatamente uma leitura a mais, ao fim dela', async () => {
    const m = await montar()
    expect(m.leituras).toHaveLength(1)
    await m.ir('/app/avisos')
    await act(async () => definirVisibilidade('visible'))
    await m.ir('/app/familia')
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(1)
    await m.responder(m.leituras[0], ok(estado(true, 1)))
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(2)
    await m.responder(m.leituras[1], ok(estado(true, 2)))
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(2)
  })

  it('a leitura pendente é descartada se a aba estiver escondida quando ela começaria; a próxima visível lê', async () => {
    const m = await montar()
    await m.ir('/app/avisos')
    await act(async () => definirVisibilidade('hidden'))
    await m.responder(m.leituras[0], ok(estado(true, 1)))
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(1)
    await act(async () => definirVisibilidade('visible'))
    await assentar()
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(2)
  })

  it('com a aba escondida nenhuma leitura começa (rota, 120 s); a que já corria termina e vale', async () => {
    const m = await montar()
    await act(async () => definirVisibilidade('hidden'))
    await m.responder(m.leituras[0], ok(estado(true, 3)))
    expect(uso.mostrado).toEqual(estado(true, 3))
    await m.ir('/app/avisos')
    await avancar(360_000)
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(1)
  })

  it('uma sessão que começa com a aba escondida só lê quando ela fica visível', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    const m = await montar()
    expect(m.dados.lerEstado).not.toHaveBeenCalled()
    await act(async () => definirVisibilidade('visible'))
    await assentar()
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(1)
  })
})

describe('RF14:RF-07 regra 3: o que se grava vence a leitura mais velha', () => {
  it('a preferência confirmada vira o valor mostrado na hora, antes de qualquer leitura nova', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 3, true)))
    await act(async () => void uso.definirLigados(false))
    expect(uso.mostrado).toEqual(estado(true, 3, true))
    await m.responder(m.ligacoes[0], ok(null))
    expect(uso.mostrado).toEqual({ ligados: false, avisos: [], maisDe50: false })
    await act(async () => void uso.definirLigados(true))
    await m.responder(m.ligacoes[1], ok(null))
    expect(uso.mostrado?.ligados).toBe(true)
  })

  it('o "marcar como visto" confirmado zera os avisos e a marca de mais de 50 na hora', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 3, true)))
    await act(async () => void uso.marcarVistos('2026-11-15T10:00:03.000000Z'))
    expect(uso.mostrado).toEqual(estado(true, 3, true))
    expect(m.marcas[0].ate).toBe('2026-11-15T10:00:03.000000Z')
    await m.responder(m.marcas[0], ok(null))
    expect(uso.mostrado).toEqual({ ligados: true, avisos: [], maisDe50: false })
  })

  type Gravacao = 'preferencia' | 'marca'
  const COMECAR: Record<Gravacao, () => void> = {
    preferencia: () => void uso.definirLigados(false),
    marca: () => void uso.marcarVistos('2026-11-15T10:00:03.000000Z'),
  }
  const DEPOIS: Record<Gravacao, EstadoDosAvisos> = {
    preferencia: { ligados: false, avisos: [], maisDe50: false },
    marca: { ligados: true, avisos: [], maisDe50: false },
  }
  const pendenteDe = (m: Awaited<ReturnType<typeof montar>>, g: Gravacao) => (g === 'preferencia' ? m.ligacoes[0] : m.marcas[0])
  // A leitura que, se fosse aplicada, mudaria o que se mostra.
  const SOBREPOSTA = estado(true, 5, true)
  const DEPOIS_DA_GRAVACAO = estado(true, 1)

  for (const gravacao of ['preferencia', 'marca'] as const) {
    describe(`a gravação de ${gravacao === 'preferencia' ? 'preferência' : 'visto'} e a leitura que a atravessa`, () => {
      it('(1) a leitura começou antes e volta antes da resposta: é descartada', async () => {
        const m = await montar()
        await m.responder(m.leituras[0], ok(estado(true, 2)))
        await m.ir('/app/avisos')
        await act(async () => COMECAR[gravacao]())
        await m.responder(m.leituras[1], ok(SOBREPOSTA))
        expect(uso.mostrado).toEqual(estado(true, 2))
        await m.responder(pendenteDe(m, gravacao), ok(null))
        expect(uso.mostrado).toEqual(DEPOIS[gravacao])
        expect(m.dados.lerEstado).toHaveBeenCalledTimes(3)
        await m.responder(m.leituras[2], ok(DEPOIS_DA_GRAVACAO))
        expect(uso.mostrado).toEqual(DEPOIS_DA_GRAVACAO)
      })

      it('(2) a leitura começou antes e volta depois da resposta: é descartada, e a seguinte vale', async () => {
        const m = await montar()
        await m.responder(m.leituras[0], ok(estado(true, 2)))
        await m.ir('/app/avisos')
        await act(async () => COMECAR[gravacao]())
        await m.responder(pendenteDe(m, gravacao), ok(null))
        expect(uso.mostrado).toEqual(DEPOIS[gravacao])
        await m.responder(m.leituras[1], ok(SOBREPOSTA))
        expect(uso.mostrado).toEqual(DEPOIS[gravacao])
        expect(m.dados.lerEstado).toHaveBeenCalledTimes(3)
        await m.responder(m.leituras[2], ok(DEPOIS_DA_GRAVACAO))
        expect(uso.mostrado).toEqual(DEPOIS_DA_GRAVACAO)
      })

      it('(3) a leitura começou durante a gravação e volta antes da resposta: é descartada', async () => {
        const m = await montar()
        await m.responder(m.leituras[0], ok(estado(true, 2)))
        await act(async () => COMECAR[gravacao]())
        await m.ir('/app/avisos')
        expect(m.dados.lerEstado).toHaveBeenCalledTimes(2)
        await m.responder(m.leituras[1], ok(SOBREPOSTA))
        expect(uso.mostrado).toEqual(estado(true, 2))
        await m.responder(pendenteDe(m, gravacao), ok(null))
        expect(uso.mostrado).toEqual(DEPOIS[gravacao])
        await m.responder(m.leituras[2], ok(DEPOIS_DA_GRAVACAO))
        expect(uso.mostrado).toEqual(DEPOIS_DA_GRAVACAO)
      })

      it('(4) a leitura começou durante a gravação e volta depois da resposta: é descartada, e a seguinte vale', async () => {
        const m = await montar()
        await m.responder(m.leituras[0], ok(estado(true, 2)))
        await act(async () => COMECAR[gravacao]())
        await m.ir('/app/avisos')
        await m.responder(pendenteDe(m, gravacao), ok(null))
        await m.responder(m.leituras[1], ok(SOBREPOSTA))
        expect(uso.mostrado).toEqual(DEPOIS[gravacao])
        expect(m.dados.lerEstado).toHaveBeenCalledTimes(3)
        await m.responder(m.leituras[2], ok(DEPOIS_DA_GRAVACAO))
        expect(uso.mostrado).toEqual(DEPOIS_DA_GRAVACAO)
      })

      it('uma leitura que começa depois da resposta da gravação é aplicada', async () => {
        const m = await montar()
        await m.responder(m.leituras[0], ok(estado(true, 2)))
        await act(async () => COMECAR[gravacao]())
        await m.responder(pendenteDe(m, gravacao), ok(null))
        expect(m.dados.lerEstado).toHaveBeenCalledTimes(2)
        await m.responder(m.leituras[1], ok(SOBREPOSTA))
        expect(uso.mostrado).toEqual(SOBREPOSTA)
      })

      it('uma gravação que falha não muda nada do mostrado, e o próximo gatilho lê como sempre', async () => {
        const m = await montar()
        await m.responder(m.leituras[0], ok(estado(true, 2)))
        await act(async () => COMECAR[gravacao]())
        await m.responder(pendenteDe(m, gravacao), rede)
        expect(uso.mostrado).toEqual(estado(true, 2))
        expect(m.dados.lerEstado).toHaveBeenCalledTimes(1)
        await m.ir('/app/avisos')
        expect(m.dados.lerEstado).toHaveBeenCalledTimes(2)
        await m.responder(m.leituras[1], ok(estado(true, 4)))
        expect(uso.mostrado).toEqual(estado(true, 4))
      })
    })
  }

  // Controle negativo: um gancho que aplicasse a leitura sobreposta mostraria a leitura, e o que cada caso
  // espera é outra coisa; então a conferência de "a leitura sobreposta foi mostrada" tem de lançar.
  it('controle negativo: a conferência de que a leitura sobreposta foi aplicada falha nos casos acima', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 2)))
    await m.ir('/app/avisos')
    await act(async () => void uso.marcarVistos('2026-11-15T10:00:03.000000Z'))
    await m.responder(m.leituras[1], ok(estado(true, 5, true)))
    expect(() => expect(uso.mostrado).toEqual(estado(true, 5, true))).toThrow()
  })

  it('uma gravação que sobrepõe uma leitura com falha: a leitura falha em silêncio, sem erro', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 2)))
    await m.ir('/app/avisos')
    await act(async () => void uso.marcarVistos('2026-11-15T10:00:03.000000Z'))
    await m.responder(m.leituras[1], rede)
    expect(uso.mostrado).toEqual(estado(true, 2))
    expect(uso.erro).toBeNull()
  })
})

describe('RF14:RF-07 regra 4: as falhas', () => {
  it('antes do primeiro sucesso: sem estado mostrado e com o erro da leitura', async () => {
    const m = await montar()
    expect(uso.fase).toBe('lendo')
    expect(uso.lendo).toBe(true)
    await m.responder(m.leituras[0], rede)
    expect(uso.mostrado).toBeNull()
    expect(uso.fase).toBe('erro')
    expect(uso.erro?.classe).toBe('rede')
    expect(uso.lendo).toBe(false)
  })

  it('"ler" tenta de novo, e um sucesso tira o erro e mostra o estado', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], rede)
    await act(async () => uso.ler())
    await assentar()
    expect(uso.fase).toBe('lendo')
    await m.responder(m.leituras[1], ok(estado(true, 2)))
    expect(uso.fase).toBe('pronto')
    expect(uso.erro).toBeNull()
    expect(uso.mostrado).toEqual(estado(true, 2))
  })

  it('depois de um sucesso: uma leitura com falha não muda nada nem mostra erro, e a seguinte lê', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 2)))
    await m.ir('/app/avisos')
    await m.responder(m.leituras[1], rede)
    expect(uso.mostrado).toEqual(estado(true, 2))
    expect(uso.erro).toBeNull()
    expect(uso.fase).toBe('pronto')
    await avancar(120_000)
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(3)
  })

  it('uma leitura que volta com sessão encerrada manda reler a sessão', async () => {
    const m = await montar()
    const espiao = vi.spyOn(m.conta, 'sessaoAtual')
    await m.responder(m.leituras[0], { ok: false, erro: erroDaChave('sessao_encerrada') })
    expect(espiao).toHaveBeenCalled()
  })
})

describe('RF14:RN-06 nenhum erro que o gancho devolve carrega a mensagem de origem', () => {
  const MARCADOR = 'MARCADOR-NOTA-E-NOME'
  const serializar = (valor: unknown) =>
    JSON.stringify(valor, (_chave, item) => (item instanceof Error ? { nome: item.name, mensagem: item.message } : item))

  type Modo = 'resultado com falha' | 'rejeição'

  function criarQueFalha(modo: Modo): DadosAvisos {
    const falhar = <T,>(): Promise<Resultado<T>> =>
      modo === 'resultado com falha'
        ? Promise.resolve({
            ok: false,
            erro: { classe: 'sem_permissao', chave: 'sem_permissao', codigo: '42501', mensagemOriginal: MARCADOR },
          })
        : Promise.reject(new Error(MARCADOR))
    return { lerEstado: () => falhar(), definirLigados: () => falhar(), marcarVistos: () => falhar() }
  }

  for (const modo of ['resultado com falha', 'rejeição'] as const) {
    it(`lerEstado com ${modo}: o erro do gancho vem sem o marcador, com a classe mantida, e não vira lista vazia de sucesso`, async () => {
      await montar({ dados: criarQueFalha(modo) })
      expect(uso.mostrado).toBeNull()
      expect(uso.fase).toBe('erro')
      expect(uso.erro).not.toBeNull()
      expect(serializar(uso.erro)).not.toContain(MARCADOR)
      expect(serializar(uso)).not.toContain(MARCADOR)
      if (modo === 'resultado com falha') expect(uso.erro).toMatchObject({ classe: 'sem_permissao', chave: 'sem_permissao', codigo: '42501' })
      else expect(typeof uso.erro?.classe).toBe('string')
    })

    for (const operacao of ['definirLigados', 'marcarVistos'] as const) {
      it(`${operacao} com ${modo}: o Resultado devolvido vem sem o marcador e com a classe mantida`, async () => {
        await montar({ dados: criarQueFalha(modo) })
        let resultado: Resultado<null> | undefined
        await act(async () => {
          resultado = await (operacao === 'definirLigados' ? uso.definirLigados(true) : uso.marcarVistos('2026-11-15T10:00:01.000000Z'))
        })
        expect(resultado?.ok).toBe(false)
        expect(serializar(resultado)).not.toContain(MARCADOR)
        expect(serializar(uso)).not.toContain(MARCADOR)
        if (modo === 'resultado com falha') expect(resultado).toMatchObject({ ok: false, erro: { classe: 'sem_permissao', codigo: '42501' } })
        else expect(typeof (resultado as { erro?: { classe?: unknown } } | undefined)?.erro?.classe).toBe('string')
      })
    }
  }
})

describe('RF14:RF-18 a troca de conta', () => {
  const pessoaDaSessao = async (m: Awaited<ReturnType<typeof montar>>) => {
    await act(async () => {
      await m.conta.sair()
    })
    await assentar()
  }

  it('sair apaga o estado mostrado da conta que saiu', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 2)))
    expect(uso.mostrado).toEqual(estado(true, 2))
    await pessoaDaSessao(m)
    expect(uso.mostrado).toBeNull()
    expect(uso.fase).toBe('lendo')
    expect(m.dados.lerEstado).toHaveBeenCalledTimes(1)
  })

  it('entrar como outra pessoa: nada da anterior aparece em nenhuma renderização, e a leitura da anterior é descartada', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 2)))
    await m.ir('/app/avisos')
    expect(m.leituras).toHaveLength(2)
    const antes = quadros.length
    await pessoaDaSessao(m)
    await act(async () => {
      await m.conta.entrar(PESSOAS.bruno.email, SENHA_DEMONSTRACAO)
    })
    await assentar()
    // Toda renderização depois da troca vem sem o estado de quem saiu.
    expect(quadros.slice(antes).every((q) => q.mostrado === null)).toBe(true)
    expect(m.leituras).toHaveLength(3)
    // A leitura que corria para a primeira conta volta agora: é descartada.
    await m.responder(m.leituras[1], ok(estado(true, 7)))
    expect(uso.mostrado).toBeNull()
    expect(uso.fase).toBe('lendo')
    await m.responder(m.leituras[2], ok(estado(false, 0)))
    expect(uso.mostrado).toEqual(estado(false, 0))
  })

  it('controle negativo: a conferência de que o resultado da conta anterior foi mostrado falha', async () => {
    const m = await montar()
    await pessoaDaSessao(m)
    await act(async () => {
      await m.conta.entrar(PESSOAS.bruno.email, SENHA_DEMONSTRACAO)
    })
    await assentar()
    // A leitura 0 é a da primeira conta, ainda em andamento quando a segunda entrou.
    await m.responder(m.leituras[0], ok(estado(true, 7)))
    expect(() => expect(uso.mostrado).toEqual(estado(true, 7))).toThrow()
  })

  it('uma gravação da conta anterior que volta depois da troca não mexe no estado da nova', async () => {
    const m = await montar()
    await m.responder(m.leituras[0], ok(estado(true, 2)))
    await act(async () => void uso.definirLigados(false))
    await pessoaDaSessao(m)
    await act(async () => {
      await m.conta.entrar(PESSOAS.bruno.email, SENHA_DEMONSTRACAO)
    })
    await assentar()
    await m.responder(m.leituras[1], ok(estado(true, 1)))
    await m.responder(m.ligacoes[0], ok(null))
    expect(uso.mostrado).toEqual(estado(true, 1))
  })
})
