import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AVISOS_TEXTOS } from '../../conteudo/avisos.ts'
import { textoDoErro } from '../../conteudo/conta.ts'
import { ContextoDadosAvisos, type Aviso, type DadosAvisos, type EstadoDosAvisos } from '../../dados/avisos.ts'
import type { Resultado } from '../../dados/comum.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { criarRotasProntas } from '../../teste/rotasProntas.ts'
import { criarMundoDeTeste } from '../../teste/rotina.fixture.ts'
import { ProvedorDadosConta } from '../conta/sessao.tsx'
import { ProvedorDadosRotina } from '../rotina/dadosRotina.tsx'

// RF14:RF-01..04 e RF-12 e RN-02 na área de conta: a seção "Avisos de outros cuidadores" (uma caixa nativa,
// desligada por padrão, gravada na hora). Os dados dos avisos são falsos: cada leitura e cada gravação ficam
// pendentes até o teste responder (ou a leitura responde na hora, se o teste fixar a resposta do servidor).

const ok = <T,>(valor: T): Resultado<T> => ({ ok: true, valor })
const rede = { ok: false, erro: erroDaChave('rede') } as const

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

const estado = (ligados: boolean, quantos = 0): EstadoDosAvisos => ({
  ligados,
  avisos: ligados ? Array.from({ length: quantos }, (_, i) => aviso(i + 1)) : [],
  maisDe50: false,
})

interface Pendente<T> {
  resolver(valor: Resultado<T>): void
}

function criarFalso(servidor: EstadoDosAvisos | null = estado(false)) {
  const leituras: Pendente<EstadoDosAvisos>[] = []
  const ligacoes: Array<Pendente<null> & { valor: boolean }> = []
  const falso = {
    leituras,
    ligacoes,
    /** O que o servidor responde, na hora, a cada leitura; `null` deixa a leitura pendente. */
    servidor: servidor as EstadoDosAvisos | null,
    dados: {
      lerEstado: vi.fn(
        (): Promise<Resultado<EstadoDosAvisos>> =>
          falso.servidor
            ? Promise.resolve(ok(falso.servidor))
            : new Promise((resolver) => leituras.push({ resolver })),
      ),
      definirLigados: vi.fn(
        (valor: boolean) => new Promise<Resultado<null>>((resolver) => ligacoes.push({ resolver, valor })),
      ),
      marcarVistos: vi.fn(async (): Promise<Resultado<null>> => ok(null)),
    } satisfies DadosAvisos,
  }
  return falso
}

type Falso = ReturnType<typeof criarFalso>

async function assentar() {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0))
  })
}

async function responder<T>(pendente: Pendente<T>, valor: Resultado<T>) {
  await act(async () => {
    pendente.resolver(valor)
  })
  await assentar()
}

/** Uma leitura que começa agora (a aba volta a ficar visível) e o servidor responde `servidor` na hora. */
async function lerAgora(falso: Falso, servidor: EstadoDosAvisos) {
  falso.servidor = servidor
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await assentar()
}

async function montar(caminho: string, falso: Falso, sessao: 'juliana' | 'davi' = 'juliana') {
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
  await screen.findByRole('heading', { level: 1, name: 'Conta' })
  await assentar()
  conferirTela(roteador)
  return { roteador, mundo }
}

/** Nunca se mede a tela errada: sem sessão, /app/conta termina em /entrar. */
function conferirTela(roteador: { state: { location: { pathname: string } } }) {
  expect(roteador.state.location.pathname).toBe('/app/conta')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Conta')
}

const titulo = () => document.getElementById('avisos') as HTMLElement
const secao = () => titulo().closest('section') as HTMLElement
const caixa = () => within(secao()).getByRole('checkbox', { name: AVISOS_TEXTOS.rotuloDaCaixa }) as HTMLInputElement
const semCaixa = () => within(secao()).queryByRole('checkbox')
const cabecalho = () => document.querySelector<HTMLElement>('header[data-cabecalho]')!
const linkDoCabecalho = () => within(cabecalho()).queryByRole('link', { name: /^Avisos/ })
const alerta = () => within(secao()).queryByRole('alert')
/** A região de status da tela: a única `role="status"` que não é um "carregando". */
const regioesDeStatus = () => [...document.querySelectorAll<HTMLElement>('[role="status"]')].filter((el) => el.getAttribute('aria-busy') !== 'true')
const statusDaTela = () => regioesDeStatus().map((el) => el.textContent).join('')

async function esperarCaixa() {
  await waitFor(() => expect(semCaixa()).not.toBeNull())
  return caixa()
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(document, 'visibilityState')
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('RF14:RF-01 o lugar e o texto da seção', () => {
  const COM_AVISOS = ['Perfil', 'Avisos de outros cuidadores', 'ID da sua conta', 'Seus dados', 'Excluir conta', 'Privacidade']

  function conferirOrdem(esperada: string[]) {
    const titulos = within(document.querySelector('main')!)
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
    expect(titulos).toEqual(esperada)
  }

  it('o h2 vem depois de "Perfil" e antes de "ID da sua conta", no DOM', async () => {
    await montar('/app/conta', criarFalso())
    await esperarCaixa()

    conferirOrdem(COM_AVISOS)
    const perfil = document.getElementById('perfil')!
    const idConta = document.getElementById('id-conta')!
    expect(perfil.compareDocumentPosition(titulo()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(titulo().compareDocumentPosition(idConta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('controle: uma ordem errada reprova a conferência (ela distingue)', async () => {
    await montar('/app/conta', criarFalso())
    await esperarCaixa()

    const errada = ['Perfil', 'ID da sua conta', 'Avisos de outros cuidadores', 'Seus dados', 'Excluir conta', 'Privacidade']
    expect(() => conferirOrdem(errada)).toThrow()
    expect(() => conferirOrdem(COM_AVISOS)).not.toThrow()
  })

  it('o índice tem a entrada "Avisos" na mesma posição, apontando a âncora #avisos', async () => {
    await montar('/app/conta', criarFalso())
    await esperarCaixa()

    const indice = within(screen.getByRole('navigation', { name: 'Nesta página' }))
    const links = indice.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Perfil',
      AVISOS_TEXTOS.indiceDaConta,
      'ID da conta',
      'Seus dados',
      'Excluir conta',
      'Privacidade',
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#perfil',
      '#avisos',
      '#id-conta',
      '#exportar',
      '#excluir-conta',
      '#privacidade',
    ])
  })

  it('o título, a frase e o rótulo são os textos exatos; o h2 recebe foco por programa', async () => {
    await montar('/app/conta', criarFalso())
    const marcada = await esperarCaixa()

    expect(titulo().tagName).toBe('H2')
    expect(titulo().textContent).toBe(AVISOS_TEXTOS.secaoTitulo)
    expect(titulo().getAttribute('tabindex')).toBe('-1')
    expect(titulo().classList.contains('cm-h4')).toBe(true)
    expect(titulo().classList.contains('alvo-foco')).toBe(true)
    expect(secao().getAttribute('aria-labelledby')).toBe('avisos')
    expect(within(secao()).getByText(AVISOS_TEXTOS.secaoFrase).classList.contains('cm-medida')).toBe(true)
    expect(marcada.labels).toHaveLength(1)
    expect(marcada.labels![0].textContent).toBe(AVISOS_TEXTOS.rotuloDaCaixa)
  })

  it('a caixa é nativa e vem desligada numa conta nova em memória (sem dados injetados)', async () => {
    renderizarComDados('/app/conta', { sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    const marcada = await esperarCaixa()
    expect(marcada.tagName).toBe('INPUT')
    expect(marcada.type).toBe('checkbox')
    expect(marcada.checked).toBe(false)
    expect(marcada.disabled).toBe(false)
  })

  it('a caixa mostra ligada quando o servidor diz que está ligada', async () => {
    await montar('/app/conta', criarFalso(estado(true, 1)))
    expect((await esperarCaixa()).checked).toBe(true)
  })
})

describe('RF14:RF-02 gravar na hora', () => {
  it('durante a gravação: o valor novo aparece, a caixa não é desativada, o foco fica e uma segunda mudança é ignorada', async () => {
    const falso = criarFalso(estado(false))
    await montar('/app/conta', falso)
    const marcada = await esperarCaixa()
    marcada.focus()

    fireEvent.click(marcada)
    expect(caixa().checked).toBe(true)
    expect(caixa().disabled).toBe(false)
    expect(document.activeElement).toBe(caixa())
    expect(falso.dados.definirLigados).toHaveBeenCalledTimes(1)
    expect(falso.dados.definirLigados).toHaveBeenCalledWith(true)
    expect(statusDaTela()).toBe('')

    fireEvent.click(caixa())
    await assentar()
    expect(caixa().checked).toBe(true)
    expect(falso.dados.definirLigados).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(caixa())

    falso.servidor = estado(true, 0)
    await responder(falso.ligacoes[0], ok(null))
    expect(falso.dados.definirLigados).toHaveBeenCalledTimes(1)
    expect(caixa().checked).toBe(true)
    expect(document.activeElement).toBe(caixa())
  })

  it('ligar: o status "Avisos ligados." é anunciado uma só vez, sem alerta, e o link do cabeçalho aparece', async () => {
    const falso = criarFalso(estado(false))
    await montar('/app/conta', falso)
    const marcada = await esperarCaixa()
    expect(linkDoCabecalho()).toBeNull()

    fireEvent.click(marcada)
    // Durante a gravação o link ainda não existe.
    expect(linkDoCabecalho()).toBeNull()

    falso.servidor = estado(true, 3)
    await responder(falso.ligacoes[0], ok(null))

    expect(statusDaTela()).toBe(AVISOS_TEXTOS.statusLigados)
    expect(screen.getAllByText(AVISOS_TEXTOS.statusLigados)).toHaveLength(1)
    expect(regioesDeStatus()).toHaveLength(1)
    expect(document.querySelector('[role="alert"]')).toBeNull()
    expect(await within(cabecalho()).findByRole('link', { name: AVISOS_TEXTOS.nomeDoLink(3, false) })).toBeTruthy()
  })

  it('desligar: o status "Avisos desligados." e o link do cabeçalho some; durante a gravação, e mesmo com uma leitura que volta, o link fica', async () => {
    const falso = criarFalso(estado(true, 2))
    await montar('/app/conta', falso)
    const marcada = await esperarCaixa()
    expect(linkDoCabecalho()?.getAttribute('aria-label')).toBe(AVISOS_TEXTOS.nomeDoLink(2, false))

    fireEvent.click(marcada)
    expect(caixa().checked).toBe(false)
    expect(linkDoCabecalho()?.getAttribute('aria-label')).toBe(AVISOS_TEXTOS.nomeDoLink(2, false))

    // Uma leitura começa durante a gravação (a aba volta a ficar visível) e volta antes da resposta: é descartada.
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    falso.servidor = null
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(falso.leituras).toHaveLength(1)
    await responder(falso.leituras[0], ok(estado(true, 2)))
    expect(linkDoCabecalho()?.getAttribute('aria-label')).toBe(AVISOS_TEXTOS.nomeDoLink(2, false))
    expect(caixa().checked).toBe(false)
    expect(statusDaTela()).toBe('')

    falso.servidor = estado(false)
    await responder(falso.ligacoes[0], ok(null))

    expect(statusDaTela()).toBe(AVISOS_TEXTOS.statusDesligados)
    await waitFor(() => expect(linkDoCabecalho()).toBeNull())
    expect(caixa().checked).toBe(false)
  })

  it('uma nova mudança depois da confirmação grava de novo, e o status troca de texto', async () => {
    const falso = criarFalso(estado(false))
    await montar('/app/conta', falso)
    fireEvent.click(await esperarCaixa())
    falso.servidor = estado(true, 0)
    await responder(falso.ligacoes[0], ok(null))
    expect(statusDaTela()).toBe(AVISOS_TEXTOS.statusLigados)

    fireEvent.click(caixa())
    expect(statusDaTela()).toBe('')
    expect(falso.dados.definirLigados).toHaveBeenLastCalledWith(false)
    falso.servidor = estado(false)
    await responder(falso.ligacoes[1], ok(null))
    expect(statusDaTela()).toBe(AVISOS_TEXTOS.statusDesligados)
  })

  describe('a gravação que falha', () => {
    async function comFalha(inicial: EstadoDosAvisos = estado(false)) {
      const falso = criarFalso(inicial)
      await montar('/app/conta', falso)
      const marcada = await esperarCaixa()
      marcada.focus()
      fireEvent.click(marcada)
      await responder(falso.ligacoes[0], rede)
      return falso
    }

    it('a caixa volta ao valor de antes, o resumo aparece com "Tentar de novo" e leva o foco', async () => {
      await comFalha()

      expect(caixa().checked).toBe(false)
      expect(caixa().disabled).toBe(false)
      const resumo = alerta()
      expect(resumo).not.toBeNull()
      expect(resumo!.textContent).toContain(textoDoErro(erroDaChave('rede')))
      expect(within(resumo!).getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
      expect(document.activeElement).toBe(resumo)
      expect(statusDaTela()).toBe('')
    })

    it('"Tentar de novo" manda o MESMO valor, tira o resumo e, no sucesso, anuncia uma vez', async () => {
      const falso = await comFalha()

      fireEvent.click(within(alerta()!).getByRole('button', { name: 'Tentar de novo' }))
      expect(falso.dados.definirLigados).toHaveBeenCalledTimes(2)
      expect(falso.ligacoes[1].valor).toBe(true)
      expect(caixa().checked).toBe(true)
      expect(alerta()).toBeNull()
      expect(document.activeElement).toBe(caixa())

      falso.servidor = estado(true, 0)
      await responder(falso.ligacoes[1], ok(null))
      expect(statusDaTela()).toBe(AVISOS_TEXTOS.statusLigados)
      expect(caixa().checked).toBe(true)
    })

    it('uma nova falha da repetição mostra o resumo de novo, com o foco nele', async () => {
      const falso = await comFalha()
      fireEvent.click(within(alerta()!).getByRole('button', { name: 'Tentar de novo' }))
      await responder(falso.ligacoes[1], rede)

      expect(caixa().checked).toBe(false)
      expect(alerta()).not.toBeNull()
      expect(document.activeElement).toBe(alerta())
    })

    it('uma nova mudança com o resumo à vista tira o resumo e começa essa gravação', async () => {
      const falso = await comFalha()
      expect(alerta()).not.toBeNull()

      fireEvent.click(caixa())
      expect(alerta()).toBeNull()
      expect(falso.dados.definirLigados).toHaveBeenCalledTimes(2)
      expect(caixa().checked).toBe(true)
    })

    it('uma leitura posterior que mostra o valor que se queria gravar tira o resumo', async () => {
      const falso = await comFalha()
      expect(alerta()).not.toBeNull()

      // A resposta se perdeu, mas o servidor gravou: a próxima leitura mostra ligado.
      falso.servidor = estado(true, 0)
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await assentar()

      await waitFor(() => expect(alerta()).toBeNull())
      expect(caixa().checked).toBe(true)
      expect(falso.dados.definirLigados).toHaveBeenCalledTimes(1)
    })

    it('controle: uma leitura que ainda mostra o valor de antes mantém o resumo', async () => {
      const falso = await comFalha()
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await assentar()

      expect(falso.dados.lerEstado).toHaveBeenCalledTimes(2)
      expect(alerta()).not.toBeNull()
    })

    // A gravação que falhou se aposenta de vez quando uma leitura a reconcilia: o erro velho não volta.
    it('gravar ligado falha, uma leitura mostra ligado (resumo some), outro aparelho desliga e a leitura seguinte mostra desligado: o resumo velho não volta, sem foco roubado nem gravação nova', async () => {
      const falso = await comFalha()
      expect(alerta()).not.toBeNull()

      await lerAgora(falso, estado(true, 0))
      await waitFor(() => expect(alerta()).toBeNull())
      expect(caixa().checked).toBe(true)

      caixa().focus()
      await lerAgora(falso, estado(false))

      expect(caixa().checked).toBe(false)
      expect(alerta()).toBeNull()
      expect(within(secao()).queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
      expect(document.activeElement).toBe(caixa())
      expect(falso.dados.definirLigados).toHaveBeenCalledTimes(1)
      expect(caixa().disabled).toBe(false)
      expect(statusDaTela()).toBe('')
    })

    it('no sentido inverso: ligado, gravar desligado falha, a leitura mostra desligado, outro aparelho liga e a leitura seguinte mostra ligado: o resumo velho não volta', async () => {
      const falso = await comFalha(estado(true, 1))
      expect(caixa().checked).toBe(true)
      expect(falso.ligacoes[0].valor).toBe(false)
      expect(alerta()).not.toBeNull()

      await lerAgora(falso, estado(false))
      await waitFor(() => expect(alerta()).toBeNull())
      expect(caixa().checked).toBe(false)

      caixa().focus()
      await lerAgora(falso, estado(true, 1))

      expect(caixa().checked).toBe(true)
      expect(alerta()).toBeNull()
      expect(within(secao()).queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
      expect(document.activeElement).toBe(caixa())
      expect(falso.dados.definirLigados).toHaveBeenCalledTimes(1)
      expect(caixa().disabled).toBe(false)
    })

    it('gravação falha, a leitura a reconcilia e uma gravação nova tem sucesso: nenhum erro volta e há uma só região de mensagem', async () => {
      const falso = await comFalha()
      await lerAgora(falso, estado(true, 0))
      await waitFor(() => expect(alerta()).toBeNull())

      fireEvent.click(caixa())
      expect(falso.ligacoes[1].valor).toBe(false)
      falso.servidor = estado(false)
      await responder(falso.ligacoes[1], ok(null))

      expect(alerta()).toBeNull()
      expect(document.querySelector('[role="alert"]')).toBeNull()
      expect(statusDaTela()).toBe(AVISOS_TEXTOS.statusDesligados)
      expect(regioesDeStatus()).toHaveLength(1)
      expect(caixa().checked).toBe(false)
      expect(caixa().disabled).toBe(false)

      // E uma leitura que ainda mostra o mesmo valor não traz o erro velho de volta.
      await lerAgora(falso, estado(false))
      expect(alerta()).toBeNull()
      expect(falso.dados.definirLigados).toHaveBeenCalledTimes(2)
    })

    it('duas gravações: a segunda mudança em voo é ignorada; depois que a primeira falha, uma gravação nova tem sucesso e nenhum erro velho sobra', async () => {
      const falso = criarFalso(estado(false))
      await montar('/app/conta', falso)
      const marcada = await esperarCaixa()
      marcada.focus()

      fireEvent.click(marcada)
      fireEvent.click(caixa())
      expect(falso.dados.definirLigados).toHaveBeenCalledTimes(1)
      expect(caixa().checked).toBe(true)
      expect(caixa().disabled).toBe(false)

      await responder(falso.ligacoes[0], rede)
      expect(alerta()).not.toBeNull()
      expect(caixa().checked).toBe(false)

      fireEvent.click(caixa())
      expect(alerta()).toBeNull()
      expect(falso.dados.definirLigados).toHaveBeenCalledTimes(2)
      falso.servidor = estado(true, 0)
      await responder(falso.ligacoes[1], ok(null))

      expect(alerta()).toBeNull()
      expect(document.querySelector('[role="alert"]')).toBeNull()
      expect(caixa().checked).toBe(true)
      expect(statusDaTela()).toBe(AVISOS_TEXTOS.statusLigados)
      expect(regioesDeStatus()).toHaveLength(1)

      await lerAgora(falso, estado(true, 0))
      expect(alerta()).toBeNull()
      expect(falso.dados.definirLigados).toHaveBeenCalledTimes(2)
    })

    it('a leitura que falhou e foi refeita com sucesso: gravar com sucesso depois e uma leitura que falha de novo não trazem o resumo de leitura de volta', async () => {
      const falso = criarFalso(null)
      await montar('/app/conta', falso)
      await responder(falso.leituras[0], rede)
      expect(alerta()).not.toBeNull()

      fireEvent.click(within(alerta()!).getByRole('button', { name: 'Tentar de novo' }))
      await assentar()
      await responder(falso.leituras[1], ok(estado(false)))
      expect(alerta()).toBeNull()
      expect(caixa().checked).toBe(false)

      fireEvent.click(caixa())
      await responder(falso.ligacoes[0], ok(null))
      // A leitura que a gravação dispara.
      await responder(falso.leituras[2], ok(estado(true, 0)))
      expect(statusDaTela()).toBe(AVISOS_TEXTOS.statusLigados)
      expect(alerta()).toBeNull()

      // Uma leitura posterior que falha não mostra erro nenhum: a caixa fica como está.
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await assentar()
      expect(falso.leituras).toHaveLength(4)
      const ultima = falso.leituras[falso.leituras.length - 1]
      await responder(ultima, rede)

      expect(alerta()).toBeNull()
      expect(document.querySelector('[role="alert"]')).toBeNull()
      expect(caixa().checked).toBe(true)
      expect(caixa().disabled).toBe(false)
      expect(regioesDeStatus()).toHaveLength(1)
    })
  })
})

describe('RF14:RF-03 a primeira leitura', () => {
  it('sem leitura ainda: "Lendo a sua preferência…" e nenhuma caixa; ao chegar, a caixa e sem o texto', async () => {
    const falso = criarFalso(null)
    await montar('/app/conta', falso)

    expect(within(secao()).getByText(AVISOS_TEXTOS.lendoPreferencia)).toBeTruthy()
    expect(semCaixa()).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()

    await responder(falso.leituras[0], ok(estado(false)))
    expect(caixa().checked).toBe(false)
    expect(screen.queryByText(AVISOS_TEXTOS.lendoPreferencia)).toBeNull()
  })

  it('a primeira leitura falha: o resumo com "Tentar de novo"; ele lê de novo e mostra a caixa', async () => {
    const falso = criarFalso(null)
    await montar('/app/conta', falso)
    await responder(falso.leituras[0], rede)

    expect(semCaixa()).toBeNull()
    const resumo = alerta()
    expect(resumo).not.toBeNull()
    expect(resumo!.textContent).toContain(textoDoErro(erroDaChave('rede')))
    expect(falso.dados.lerEstado).toHaveBeenCalledTimes(1)

    fireEvent.click(within(resumo!).getByRole('button', { name: 'Tentar de novo' }))
    await assentar()
    expect(falso.dados.lerEstado).toHaveBeenCalledTimes(2)
    expect(within(secao()).getByText(AVISOS_TEXTOS.lendoPreferencia)).toBeTruthy()
    expect(alerta()).toBeNull()

    await responder(falso.leituras[1], ok(estado(true, 1)))
    expect(caixa().checked).toBe(true)
    expect(screen.queryByText(AVISOS_TEXTOS.lendoPreferencia)).toBeNull()
  })

  it('depois do primeiro sucesso, voltar à Conta mostra a caixa na hora, sem o texto de leitura, com a leitura da navegação em curso', async () => {
    const falso = criarFalso(estado(true, 1))
    const { roteador } = await montar('/app/conta', falso)
    await esperarCaixa()

    falso.servidor = null
    await act(async () => {
      await roteador.navigate('/app/avisos')
    })
    await assentar()
    expect(roteador.state.location.pathname).toBe('/app/avisos')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(AVISOS_TEXTOS.h1)

    await act(async () => {
      await roteador.navigate('/app/conta')
    })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })
    conferirTela(roteador)
    expect(falso.leituras.length).toBeGreaterThan(0)
    expect(screen.queryByText(AVISOS_TEXTOS.lendoPreferencia)).toBeNull()
    expect(caixa().checked).toBe(true)
  })
})

describe('RF14:RF-04 a preferência não depende de família', () => {
  it('uma conta sem família liga os avisos', async () => {
    const falso = criarFalso(estado(false))
    await montar('/app/conta', falso, 'davi')
    const marcada = await esperarCaixa()

    fireEvent.click(marcada)
    expect(falso.dados.definirLigados).toHaveBeenCalledWith(true)
    falso.servidor = estado(true, 0)
    await responder(falso.ligacoes[0], ok(null))
    expect(statusDaTela()).toBe(AVISOS_TEXTOS.statusLigados)
    expect(caixa().checked).toBe(true)
  })
})

describe('RF14:RF-12 a âncora #avisos', () => {
  it('/app/conta#avisos rola até a seção e foca o título dela', async () => {
    const rolar = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: rolar })
    await montar('/app/conta#avisos', criarFalso())

    await waitFor(() => expect(document.activeElement).toBe(titulo()))
    expect(rolar).toHaveBeenCalled()
  })

  it('uma âncora que não existe não foca o título dos avisos', async () => {
    const rolar = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: rolar })
    await montar('/app/conta#inexistente', criarFalso())
    await esperarCaixa()
    await assentar()

    expect(document.activeElement).not.toBe(titulo())
    expect(rolar).not.toHaveBeenCalled()
  })

  it('o #exportar continua a focar o título de "Seus dados"', async () => {
    await montar('/app/conta#exportar', criarFalso())
    const exportar = document.getElementById('exportar')!
    await waitFor(() => expect(document.activeElement).toBe(exportar))
  })
})

describe('RF14:RN-02 teclado e leitor de tela', () => {
  const INDEX = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8').replace(/\r\n/g, '\n')

  it('o nome acessível da caixa é o rótulo visível', async () => {
    await montar('/app/conta', criarFalso())
    const marcada = await esperarCaixa()

    expect(screen.getByRole('checkbox', { name: AVISOS_TEXTOS.rotuloDaCaixa })).toBe(marcada)
    expect(marcada.getAttribute('aria-label')).toBeNull()
    expect(marcada.labels![0].textContent).toBe(AVISOS_TEXTOS.rotuloDaCaixa)
  })

  it('a barra de espaço marca e desmarca a caixa nativa (a tecla não é impedida e o clique do navegador grava)', async () => {
    const falso = criarFalso(estado(false))
    await montar('/app/conta', falso)
    const marcada = await esperarCaixa()
    marcada.focus()
    expect(document.activeElement).toBe(marcada)

    // O jsdom não sintetiza o clique da barra de espaço: o navegador o faz no `keyup`, se ninguém impediu a tecla.
    expect(fireEvent.keyDown(marcada, { key: ' ', code: 'Space' })).toBe(true)
    expect(fireEvent.keyUp(marcada, { key: ' ', code: 'Space' })).toBe(true)
    fireEvent.click(marcada)
    expect(caixa().checked).toBe(true)
    expect(falso.dados.definirLigados).toHaveBeenCalledWith(true)

    falso.servidor = estado(true, 0)
    await responder(falso.ligacoes[0], ok(null))
    expect(document.activeElement).toBe(caixa())
    fireEvent.click(caixa())
    expect(caixa().checked).toBe(false)
    expect(falso.dados.definirLigados).toHaveBeenLastCalledWith(false)
  })

  it('o foco do teclado usa --cor-foco: a regra global vale e a caixa não a desliga', async () => {
    await montar('/app/conta', criarFalso())
    const marcada = await esperarCaixa()

    expect(INDEX).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--cor-foco\)/)
    expect(marcada.className).not.toMatch(/outline-none|focus:outline/)
    expect(marcada.labels![0].className).not.toMatch(/outline-none|focus:outline/)
    marcada.focus()
    expect(document.activeElement).toBe(marcada)
  })
})
