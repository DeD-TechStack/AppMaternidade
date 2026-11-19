import { readFileSync } from 'node:fs'
import { act, cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '../dados/comum.ts'
import { erroDaChave } from '../dados/conta.erros.ts'
import { criarDadosContaMemoria } from '../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../teste/renderizarComDados.tsx'
import { ProvedorDadosConta, ProvedorSessao } from './conta/sessao.tsx'
import { envolverOperacoes } from './envolverOperacoes.ts'

interface Dados {
  ler(id: string): Promise<Resultado<string>>
  gravar(id: string): Promise<Resultado<null>>
}

const encerrada = { ok: false, erro: erroDaChave('sessao_encerrada') } as const

const gravarOk = async (): Promise<Resultado<null>> => ({ ok: true, valor: null })

afterEach(() => cleanup())

describe('envolverOperacoes: o comportamento', () => {
  it('um resultado ok passa sem mudança e não chama aoEncerrar', async () => {
    const resultado: Resultado<string> = { ok: true, valor: 'a' }
    const dados: Dados = { ler: vi.fn(async () => resultado), gravar: vi.fn(gravarOk) }
    const aoEncerrar = vi.fn()

    const copia = envolverOperacoes(dados, ['ler', 'gravar'], aoEncerrar)

    expect(await copia.ler('x')).toBe(resultado)
    expect(dados.ler).toHaveBeenCalledWith('x')
    expect(aoEncerrar).not.toHaveBeenCalled()
  })

  it('um erro que não é sessao_encerrada passa sem mudança e não chama aoEncerrar', async () => {
    const resultado = { ok: false, erro: erroDaChave('rede') } as const
    const dados: Dados = { ler: vi.fn(async () => resultado), gravar: vi.fn(async () => resultado) }
    const aoEncerrar = vi.fn()

    const copia = envolverOperacoes(dados, ['ler', 'gravar'], aoEncerrar)

    expect(await copia.gravar('x')).toBe(resultado)
    expect(aoEncerrar).not.toHaveBeenCalled()
  })

  it('sessao_encerrada chama aoEncerrar uma vez e devolve o resultado igual', async () => {
    const dados: Dados = { ler: vi.fn(async () => encerrada), gravar: vi.fn(gravarOk) }
    const aoEncerrar = vi.fn()

    const copia = envolverOperacoes(dados, ['ler', 'gravar'], aoEncerrar)

    expect(await copia.ler('x')).toBe(encerrada)
    expect(aoEncerrar).toHaveBeenCalledTimes(1)
  })

  it('a operação é procurada na hora da chamada: trocar depois de envolver vale a nova', async () => {
    const dados: Dados = {
      ler: vi.fn(async (): Promise<Resultado<string>> => ({ ok: true, valor: 'velha' })),
      gravar: vi.fn(gravarOk),
    }
    const copia = envolverOperacoes(dados, ['ler', 'gravar'], vi.fn())
    const nova = vi.fn(async (): Promise<Resultado<string>> => ({ ok: true, valor: 'nova' }))
    dados.ler = nova

    expect(await copia.ler('x')).toEqual({ ok: true, valor: 'nova' })
    expect(nova).toHaveBeenCalledTimes(1)
  })

  it('só as operações nomeadas existem na cópia, e as propriedades extras são copiadas', async () => {
    const dados = { ler: vi.fn(async (): Promise<Resultado<string>> => ({ ok: true, valor: 'a' })), outra: 1 }
    const extra = vi.fn()

    const copia = envolverOperacoes(dados, ['ler'], vi.fn(), { extra })

    expect(Object.keys(copia).sort()).toEqual(['extra', 'ler'])
    expect((copia as unknown as { extra: unknown }).extra).toBe(extra)
  })
})

describe('envolverOperacoes: uma cópia só', () => {
  const fonte = (caminho: string) => readFileSync(new URL(caminho, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  const modulos = ['./conta/sessao.tsx', './comunidade/dados.ts', './moderacao/dados.ts', './rotina/ProvedorRotina.tsx']

  for (const caminho of modulos) {
    it(`${caminho} usa envolverOperacoes e não tem função envolver própria`, () => {
      const texto = fonte(caminho)
      expect(texto).not.toContain('function envolver(')
      expect(texto).toContain('envolverOperacoes')
    })
  }
})

describe('sessao.tsx: visibilitychange', () => {
  it('o ouvinte registrado no documento é síncrono e devolve undefined', async () => {
    const espiao = vi.spyOn(document, 'addEventListener')
    const conta = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    const roteador = createMemoryRouter([{ element: createElement(ProvedorSessao), children: [{ path: '*', element: null }] }], {
      initialEntries: ['/app/conta'],
    })
    await act(async () => {
      render(createElement(ProvedorDadosConta, { dados: conta, children: createElement(RouterProvider, { router: roteador }) }))
    })

    const ouvintes = espiao.mock.calls.filter(([tipo]) => tipo === 'visibilitychange').map(([, ouvinte]) => ouvinte as () => unknown)
    espiao.mockRestore()

    expect(ouvintes.length).toBeGreaterThan(0)
    for (const ouvinte of ouvintes) expect(ouvinte()).toBeUndefined()
  })
})
