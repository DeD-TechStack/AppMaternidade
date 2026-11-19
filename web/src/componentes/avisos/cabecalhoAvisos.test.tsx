import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Cabecalho } from '../casca/Cabecalho.tsx'
import { ProvedorDadosConta, ProvedorSessao } from '../conta/sessao.tsx'
import { ProvedorDadosRotina } from '../rotina/dadosRotina.tsx'
import { AVISOS_TEXTOS } from '../../conteudo/avisos.ts'
import { ContextoDadosAvisos, type Aviso, type DadosAvisos, type EstadoDosAvisos } from '../../dados/avisos.ts'
import type { Resultado } from '../../dados/comum.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { criarRotasProntas } from '../../teste/rotasProntas.ts'
import { aguardarCarga } from '../../teste/renderizarRota.tsx'
import { ID_FAMILIA, criarMundoDeTeste } from '../../teste/rotina.fixture.ts'
import { useAvisos } from './useAvisos.ts'

// RF14:RF-01 (a entrada do cabeçalho): o link "Avisos" com a contagem só existe com sessão e com os avisos
// ligados; a pílula é só visual (`aria-hidden`) e o nome do link diz o número uma vez. Os dados dos avisos são
// falsos: cada teste usa um falso novo (a central do estado é uma por instância de dados).

const ok = <T,>(valor: T): Resultado<T> => ({ ok: true, valor })

const LARGURA_ORIGINAL = window.innerWidth

function fixarLargura(largura: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: largura })
}

function aviso(numero: number): Aviso {
  return {
    id: `a2000000-0000-7000-8000-${String(numero).padStart(12, '0')}`,
    texto: `Nota ${numero}`,
    criadaEm: new Date(Date.parse('2026-11-15T10:00:00.000Z') + numero * 1000).toISOString(),
    destaqueAte: null,
    autor: { tipo: 'nome', nome: 'Ícaro' },
    familiaNome: 'Família Exemplo',
    familiaFuso: 'America/Sao_Paulo',
  }
}

/** A leitura do servidor: `quantos` avisos (no máximo 50) e `maisDe50` quando há mais que isso. */
const estado = (ligados: boolean, quantos: number): EstadoDosAvisos => ({
  ligados,
  avisos: ligados ? Array.from({ length: Math.min(quantos, 50) }, (_, i) => aviso(i + 1)) : [],
  maisDe50: ligados && quantos > 50,
})

function criarFalso(inicial: EstadoDosAvisos | null) {
  const pendentes: Array<(resultado: Resultado<EstadoDosAvisos>) => void> = []
  const falso = {
    resposta: (inicial ? ok(inicial) : null) as Resultado<EstadoDosAvisos> | null,
    pendentes,
    dados: {
      lerEstado: vi.fn((): Promise<Resultado<EstadoDosAvisos>> => {
        if (falso.resposta) return Promise.resolve(falso.resposta)
        return new Promise((resolver) => pendentes.push(resolver))
      }),
      definirLigados: vi.fn(async (): Promise<Resultado<null>> => ok(null)),
      marcarVistos: vi.fn(async (): Promise<Resultado<null>> => ok(null)),
    } satisfies DadosAvisos,
  }
  return falso
}

type Falso = ReturnType<typeof criarFalso>

function renderizar(caminho: string, falso: Falso, sessao: 'juliana' | null = 'juliana') {
  const mundo = criarMundoDeTeste({ sessao })
  vi.stubGlobal('scrollTo', vi.fn())
  const roteador = createMemoryRouter(criarRotasProntas(), { initialEntries: [caminho] })
  render(
    <ProvedorDadosConta dados={mundo.conta}>
      <ProvedorDadosRotina dados={mundo.rotina}>
        <ContextoDadosAvisos value={falso.dados}>
          <RouterProvider router={roteador} />
        </ContextoDadosAvisos>
      </ProvedorDadosRotina>
    </ProvedorDadosConta>,
  )
  return { roteador }
}

async function montar(caminho: string, falso: Falso, largura = 1440, sessao: 'juliana' | null = 'juliana') {
  fixarLargura(largura)
  const resultado = renderizar(caminho, falso, sessao)
  await aguardarCarga()
  return resultado
}

const cabecalho = () => document.querySelector<HTMLElement>('header[data-cabecalho]')!
const painel = () => document.querySelector<HTMLElement>('[data-menu-celular]')!
const NOME_QUALQUER = /^Avisos/

/** O link de avisos dentro de um escopo (ou `null`). */
const entradaEm = (escopo: HTMLElement) => within(escopo).queryByRole('link', { name: NOME_QUALQUER })
const pilulaDe = (link: HTMLElement) => link.querySelector<HTMLElement>('[data-pilula-avisos]')

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  fixarLargura(LARGURA_ORIGINAL)
  vi.unstubAllGlobals()
})

describe('quando a entrada não existe', () => {
  it('com os avisos desligados, não há link nem na linha nem no menu', async () => {
    await montar('/', criarFalso(estado(false, 0)))
    expect(entradaEm(cabecalho())).toBeNull()

    fixarLargura(390)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(entradaEm(painel())).toBeNull()
  })

  it('sem sessão, não há link e nenhuma leitura é feita', async () => {
    const falso = criarFalso(estado(true, 3))
    await montar('/', falso, 1440, null)

    expect(entradaEm(cabecalho())).toBeNull()
    expect(falso.dados.lerEstado).not.toHaveBeenCalled()
  })

  it('antes da primeira leitura, não há link; ao chegar, o link aparece', async () => {
    const falso = criarFalso(null)
    await montar('/', falso)
    expect(falso.dados.lerEstado).toHaveBeenCalled()
    expect(entradaEm(cabecalho())).toBeNull()

    await act(async () => {
      falso.pendentes.forEach((resolver) => resolver(ok(estado(true, 2))))
    })

    expect(await within(cabecalho()).findByRole('link', { name: AVISOS_TEXTOS.nomeDoLink(2, false) })).toBeTruthy()
  })

  it('controle: com os avisos ligados a mesma consulta acha o link (a ausência acima não é consulta errada)', async () => {
    await montar('/', criarFalso(estado(true, 1)))
    expect(entradaEm(cabecalho())).not.toBeNull()
  })
})

describe('a pílula e o nome do link', () => {
  const CASOS: Array<[number, string | null, string]> = [
    [0, null, 'Avisos'],
    [1, '1', 'Avisos, 1 aviso novo'],
    [2, '2', 'Avisos, 2 avisos novos'],
    [50, '50', 'Avisos, 50 avisos novos'],
    [51, '50+', 'Avisos, mais de 50 avisos novos'],
  ]

  it.each(CASOS)('com %i aviso(s): pílula %j e nome "%s"', async (quantos, pilula, nome) => {
    await montar('/', criarFalso(estado(true, quantos)))

    const link = within(cabecalho()).getByRole('link', { name: nome })
    expect(link.getAttribute('href')).toBe('/app/avisos')
    const marca = pilulaDe(link)
    if (pilula === null) {
      expect(marca).toBeNull()
    } else {
      expect(marca?.textContent).toBe(pilula)
      expect(marca?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('controle: o nome de 2 avisos não serve para 1 (o teste distingue os nomes)', async () => {
    await montar('/', criarFalso(estado(true, 1)))
    expect(within(cabecalho()).queryByRole('link', { name: 'Avisos, 2 avisos novos' })).toBeNull()
  })

  it('uma leitura que falha depois de um sucesso mantém a última pílula', async () => {
    const falso = criarFalso(estado(true, 3))
    const { roteador } = await montar('/', falso)
    expect(pilulaDe(within(cabecalho()).getByRole('link', { name: NOME_QUALQUER }))?.textContent).toBe('3')

    falso.resposta = { ok: false, erro: erroDaChave('rede') }
    await act(async () => {
      await roteador.navigate('/sobre')
    })
    await aguardarCarga()

    expect(falso.dados.lerEstado).toHaveBeenCalledTimes(2)
    expect(pilulaDe(within(cabecalho()).getByRole('link', { name: NOME_QUALQUER }))?.textContent).toBe('3')
  })

  it('aparece também em uma página pública, desde que haja sessão', async () => {
    await montar('/sobre', criarFalso(estado(true, 1)))
    expect(entradaEm(cabecalho())).not.toBeNull()
  })
})

describe('onde a entrada fica', () => {
  it('na linha (1440): logo antes de "Conta", com as mesmas classes dela', async () => {
    await montar('/', criarFalso(estado(true, 1)))

    const link = within(cabecalho()).getByRole('link', { name: NOME_QUALQUER })
    const conta = within(cabecalho()).getByRole('link', { name: 'Conta' })
    expect(link.nextElementSibling).toBe(conta)
    const classes = (elemento: HTMLElement) => [...elemento.classList].filter((classe) => classe !== 'active')
    expect(classes(link)).toEqual(classes(conta))
    expect(classes(link)).toContain('cm-cab-link')
    expect(classes(link)).toContain('cm-cab-entrar')
  })

  it('no menu (390): é o primeiro item de cm-menu-acoes, com as classes de "Conta", e o clique fecha o menu', async () => {
    const { roteador } = await montar('/', criarFalso(estado(true, 4)), 390)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    const acoes = painel().querySelector<HTMLElement>('.cm-menu-acoes')!
    const primeiro = acoes.firstElementChild as HTMLElement
    const conta = within(acoes).getByRole('link', { name: 'Conta' })
    expect(primeiro.getAttribute('href')).toBe('/app/avisos')
    expect(primeiro.getAttribute('aria-label')).toBe('Avisos, 4 avisos novos')
    expect(pilulaDe(primeiro)?.textContent).toBe('4')
    expect([...primeiro.classList]).toEqual([...conta.classList])
    expect(primeiro.getAttribute('data-botao')).toBe('contorno')
    expect(primeiro.getAttribute('data-tamanho')).toBe('site')

    fireEvent.click(primeiro)
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/app/avisos'))
    expect(painel().hidden).toBe(true)
  })
})

describe('a rotina já registrada na conta (RF14-R1-01)', () => {
  const idDaNota = 'a3000000-0000-7000-8000-000000000001'

  async function notasExportadas(conta: ReturnType<typeof criarMundoDeTeste>['conta']) {
    const exportado = await conta.exportarDados()
    if (!exportado.ok) throw new Error('a exportação falhou')
    const valor = exportado.valor as { familias: Array<{ notas: Array<{ id: string }> }> }
    return valor.familias.flatMap((familia) => familia.notas.map((nota) => nota.id))
  }

  it('montar a entrada (sem dados de avisos injetados) mantém a fonte de exportação da rotina da conta', async () => {
    const mundo = criarMundoDeTeste({ semRegistros: true })
    const gravada = await mundo.rotina.gravarNota({ id: idDaNota, familiaId: ID_FAMILIA, texto: 'Nota que o chamador registrou' })
    expect(gravada.ok).toBe(true)
    expect(await notasExportadas(mundo.conta)).toEqual([idDaNota])

    fixarLargura(1440)
    const roteador = createMemoryRouter(
      [
        {
          element: <ProvedorSessao />,
          children: [
            {
              path: '*',
              element: <Cabecalho contexto="publico" comLua={false} madrugada={false} aoAlternarMadrugada={() => undefined} />,
            },
          ],
        },
      ],
      { initialEntries: ['/'] },
    )
    render(
      <ProvedorDadosConta dados={mundo.conta}>
        <RouterProvider router={roteador} />
      </ProvedorDadosConta>,
    )
    await aguardarCarga()
    expect(cabecalho()).toBeTruthy()

    expect(await notasExportadas(mundo.conta)).toEqual([idDaNota])
  })
})

describe('desligar a preferência (RF-13)', () => {
  function Desligar() {
    const { definirLigados } = useAvisos()
    return (
      <button type="button" onClick={() => void definirLigados(false)}>
        Desligar agora
      </button>
    )
  }

  it('a entrada some sem recarregar a página', async () => {
    const falso = criarFalso(estado(true, 2))
    const mundo = criarMundoDeTeste()
    fixarLargura(1440)
    const roteador = createMemoryRouter(
      [
        {
          element: <ProvedorSessao />,
          children: [
            {
              path: '*',
              element: (
                <>
                  <Cabecalho contexto="publico" comLua={false} madrugada={false} aoAlternarMadrugada={() => undefined} />
                  <Desligar />
                </>
              ),
            },
          ],
        },
      ],
      { initialEntries: ['/'] },
    )
    render(
      <ProvedorDadosConta dados={mundo.conta}>
        <ContextoDadosAvisos value={falso.dados}>
          <RouterProvider router={roteador} />
        </ContextoDadosAvisos>
      </ProvedorDadosConta>,
    )
    expect(await within(cabecalho()).findByRole('link', { name: NOME_QUALQUER })).toBeTruthy()

    // O servidor passa a dizer "desligado" (a leitura que a gravação dispara não pode religar nada).
    falso.resposta = ok(estado(false, 0))
    fireEvent.click(screen.getByRole('button', { name: 'Desligar agora' }))

    await waitFor(() => expect(entradaEm(cabecalho())).toBeNull())
    expect(falso.dados.definirLigados).toHaveBeenCalledWith(false)
  })
})
