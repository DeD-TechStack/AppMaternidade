import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvedorDadosConta } from '../../componentes/conta/sessao.tsx'
import { ProvedorDadosRotina } from '../../componentes/rotina/dadosRotina.tsx'
import { CABECALHO, NOMES_DO_H1, TEXTOS_ERRO, tituloDaAba } from '../../conteudo/conta.ts'
import { AVISOS_TEXTOS } from '../../conteudo/avisos.ts'
import { NOTAS } from '../../conteudo/rotina.ts'
import { ContextoDadosAvisos, type Aviso, type DadosAvisos, type EstadoDosAvisos } from '../../dados/avisos.ts'
import type { Resultado } from '../../dados/comum.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { criarRotasProntas } from '../../teste/rotasProntas.ts'
import { aguardarCarga } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste, type OpcoesMundo } from '../../teste/rotina.fixture.ts'

// RF14: a página /app/avisos. Os dados dos avisos são falsos (um novo por teste: a central do estado é uma por
// instância de dados) e a conta e a rotina são as de memória do teste. O fuso do aparelho vem de `process.env.TZ`.

const ok = <T,>(valor: T): Resultado<T> => ({ ok: true, valor })
const falha = { ok: false, erro: erroDaChave('rede') } as const

const FUSO_PADRAO = 'America/Sao_Paulo'
const TZ_ORIGINAL = process.env.TZ
const BASE = Date.parse('2026-11-15T13:00:00.000Z')
const UMA_HORA = 3_600_000

beforeAll(() => {
  process.env.TZ = FUSO_PADRAO
})

afterAll(() => {
  if (TZ_ORIGINAL === undefined) delete process.env.TZ
  else process.env.TZ = TZ_ORIGINAL
})

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})

afterEach(() => {
  delete (document as unknown as Record<string, unknown>).visibilityState
  vi.unstubAllGlobals()
})

async function comFuso<T>(fuso: string, corpo: () => Promise<T>): Promise<T> {
  const anterior = process.env.TZ
  process.env.TZ = fuso
  try {
    return await corpo()
  } finally {
    process.env.TZ = anterior
  }
}

function aviso(numero: number, extra: Partial<Aviso> = {}): Aviso {
  return {
    id: `a2000000-0000-7000-8000-${String(numero).padStart(12, '0')}`,
    texto: `Nota ${numero}`,
    criadaEm: new Date(BASE + numero * 60_000).toISOString(),
    destaqueAte: null,
    autor: { tipo: 'nome', nome: 'Ícaro' },
    familiaNome: 'Família Exemplo',
    familiaFuso: FUSO_PADRAO,
    ...extra,
  }
}

const estado = (avisos: Aviso[], opcoes: { ligados?: boolean; maisDe50?: boolean } = {}): EstadoDosAvisos => ({
  ligados: opcoes.ligados ?? true,
  avisos,
  maisDe50: opcoes.maisDe50 ?? false,
})

const VAZIO = estado([])

function criarFalso(inicial: EstadoDosAvisos, opcoes: { segurar?: boolean } = {}) {
  const falso = {
    resposta: ok(inicial) as Resultado<EstadoDosAvisos>,
    segurar: opcoes.segurar ?? false,
    leituras: [] as Array<(resultado: Resultado<EstadoDosAvisos>) => void>,
    marcas: [] as Array<{ ate: string; resolver: (resultado: Resultado<null>) => void }>,
    dados: {
      lerEstado: vi.fn((): Promise<Resultado<EstadoDosAvisos>> => {
        if (falso.segurar) return new Promise((resolver) => falso.leituras.push(resolver))
        return Promise.resolve(falso.resposta)
      }),
      definirLigados: vi.fn(async (): Promise<Resultado<null>> => ok(null)),
      marcarVistos: vi.fn(
        (ate: string) => new Promise<Resultado<null>>((resolver) => falso.marcas.push({ ate, resolver })),
      ),
    } satisfies DadosAvisos,
  }
  return falso
}

type Falso = ReturnType<typeof criarFalso>

function renderizar(falso: Falso, opcoes: OpcoesMundo & { caminho?: string } = {}) {
  const { caminho = '/app/avisos', ...mundoOpcoes } = opcoes
  const mundo = criarMundoDeTeste(mundoOpcoes)
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

async function montar(falso: Falso, opcoes: OpcoesMundo & { caminho?: string } = {}) {
  const resultado = renderizar(falso, opcoes)
  await aguardarCarga()
  return resultado
}

/** Deixa as promessas já resolvidas andarem, sem esperar a página sair de `aria-busy`. */
async function assentar() {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

/** Um gatilho de leitura do estado compartilhado: a janela voltou a ficar visível. */
async function dispararLeitura() {
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await assentar()
}

const principal = () => screen.getByRole('main')
const h1 = () => screen.getByRole('heading', { level: 1 })
const botaoMarcar = () => within(principal()).queryByRole('button', { name: AVISOS_TEXTOS.botao })
const linhas = () => within(principal()).queryAllByRole('listitem')
const antes = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

/** Os três parágrafos de um aviso, em texto. */
const trio = (item: HTMLElement) => [...item.querySelectorAll('p')].map((p) => p.textContent)
const textosDaLista = () => linhas().map((item) => item.querySelectorAll('p')[1]?.textContent)

describe('a rota', () => {
  it('sem sessão, vai a /entrar?volta=/app/avisos', async () => {
    const { roteador } = renderizar(criarFalso(VAZIO), { sessao: null })
    await screen.findByRole('heading', { level: 1, name: NOMES_DO_H1.entrar })

    expect(roteador.state.location.pathname).toBe('/entrar')
    expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent('/app/avisos')}`)
  })

  it('com sessão, tem um main, um h1 "Avisos" e o título da aba fixo', async () => {
    const { roteador } = await montar(criarFalso(estado([aviso(1)])))

    expect(roteador.state.location.pathname).toBe('/app/avisos')
    expect(h1().textContent).toBe(AVISOS_TEXTOS.h1)
    expect(document.title).toBe(tituloDaAba('Avisos'))
    expect(document.title).toBe(AVISOS_TEXTOS.abaDaPagina)
    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(within(principal()).getByText(AVISOS_TEXTOS.lead)).toBeTruthy()
  })
})

describe('os estados', () => {
  it('lendo: antes do primeiro sucesso há "Lendo os avisos…" e o main fica ocupado; ao chegar, o texto some', async () => {
    const falso = criarFalso(estado([aviso(1)]), { segurar: true })
    renderizar(falso)
    await assentar()

    expect(principal().getAttribute('aria-busy')).toBe('true')
    expect(within(principal()).getByRole('status').textContent).toBe(AVISOS_TEXTOS.lendoAvisos)
    expect(botaoMarcar()).toBeNull()

    await act(async () => {
      falso.leituras.forEach((resolver) => resolver(falso.resposta))
    })
    await aguardarCarga()

    expect(principal().getAttribute('aria-busy')).toBeNull()
    expect(within(principal()).queryByText(AVISOS_TEXTOS.lendoAvisos)).toBeNull()
    expect(linhas()).toHaveLength(1)
  })

  it('controle: depois do primeiro sucesso, uma leitura em andamento não volta a mostrar "Lendo os avisos…"', async () => {
    const falso = criarFalso(estado([aviso(1), aviso(2)]))
    await montar(falso)
    expect(linhas()).toHaveLength(2)

    falso.segurar = true
    await dispararLeitura()
    expect(falso.leituras).toHaveLength(1)

    expect(within(principal()).queryByText(AVISOS_TEXTOS.lendoAvisos)).toBeNull()
    expect(principal().getAttribute('aria-busy')).toBeNull()
    expect(linhas()).toHaveLength(2)
  })

  it('desligado: a frase e o link "Ligar os avisos na Conta" (/app/conta#avisos), sem botão nem lista', async () => {
    await montar(criarFalso(estado([], { ligados: false })))

    expect(within(principal()).getByText(AVISOS_TEXTOS.desligado)).toBeTruthy()
    const ligar = within(principal()).getByRole('link', { name: AVISOS_TEXTOS.ligarNaConta })
    expect(ligar.getAttribute('href')).toBe('/app/conta#avisos')
    expect(botaoMarcar()).toBeNull()
    expect(linhas()).toHaveLength(0)
  })

  it('vazio, quem escreve na família atual: a frase e "Nova nota" (/app/notas/nova)', async () => {
    await montar(criarFalso(VAZIO))

    expect(within(principal()).getByText(AVISOS_TEXTOS.vazio)).toBeTruthy()
    const nova = await within(principal()).findByRole('link', { name: NOTAS.nova })
    expect(nova.getAttribute('href')).toBe('/app/notas/nova')
    expect(within(principal()).queryByRole('link', { name: CABECALHO.irParaHoje })).toBeNull()
    expect(botaoMarcar()).toBeNull()
  })

  it('vazio, observador na família: a frase e "Ir para o Hoje" (/app/hoje), sem "Nova nota"', async () => {
    await montar(criarFalso(VAZIO), { sessao: 'icaro', papelDeIcaro: 'observador' })

    expect(within(principal()).getByText(AVISOS_TEXTOS.vazio)).toBeTruthy()
    const hoje = await within(principal()).findByRole('link', { name: CABECALHO.irParaHoje })
    expect(hoje.getAttribute('href')).toBe('/app/hoje')
    expect(within(principal()).queryByRole('link', { name: NOTAS.nova })).toBeNull()
  })

  it('vazio, conta sem família: a frase e "Ir para o Hoje"', async () => {
    await montar(criarFalso(VAZIO), { sessao: 'davi' })

    expect(within(principal()).getByText(AVISOS_TEXTOS.vazio)).toBeTruthy()
    expect((await within(principal()).findByRole('link', { name: CABECALHO.irParaHoje })).getAttribute('href')).toBe('/app/hoje')
    expect(within(principal()).queryByRole('link', { name: NOTAS.nova })).toBeNull()
  })

  it('erro de leitura antes de qualquer sucesso: o resumo com "Tentar de novo"; a nova tentativa lê e mostra a lista', async () => {
    const falso = criarFalso(estado([aviso(1)]))
    falso.resposta = falha
    await montar(falso)

    const alerta = within(principal()).getByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    expect(linhas()).toHaveLength(0)
    expect(botaoMarcar()).toBeNull()

    falso.resposta = ok(estado([aviso(1)]))
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()

    expect(falso.dados.lerEstado).toHaveBeenCalledTimes(2)
    expect(within(principal()).queryByRole('alert')).toBeNull()
    expect(linhas()).toHaveLength(1)
  })

  const ESTADOS: Array<[string, EstadoDosAvisos]> = [
    ['preenchido', estado([aviso(1)])],
    ['vazio', VAZIO],
    ['desligado', estado([], { ligados: false })],
  ]

  it.each(ESTADOS)('há uma região de status só, no estado %s', async (_nome, inicial) => {
    await montar(criarFalso(inicial))

    expect(within(principal()).getAllByRole('status')).toHaveLength(1)
  })

  it('preenchido: h1, a linha de fuso (se houver), o botão, a lista e a linha dos 50 mais recentes, nesta ordem', async () => {
    const lista = [aviso(1), aviso(2, { familiaFuso: 'America/New_York' }), aviso(3)]
    await montar(criarFalso(estado(lista, { maisDe50: true })))

    const fuso = within(principal()).getByText(AVISOS_TEXTOS.avisoDeFuso)
    const botao = botaoMarcar()!
    const ul = principal().querySelector('ul')!
    const mais = within(principal()).getByText(AVISOS_TEXTOS.maisDe50)
    expect(antes(h1(), fuso)).toBe(true)
    expect(antes(fuso, botao)).toBe(true)
    expect(antes(botao, ul)).toBe(true)
    expect(antes(ul, mais)).toBe(true)
    expect(principal().querySelectorAll('ul')).toHaveLength(1)
  })
})

describe('a lista', () => {
  it('do mais novo ao mais velho, com o id decidindo o empate (maior primeiro)', async () => {
    const empate = new Date(BASE + 10 * 60_000).toISOString()
    const lista = [
      aviso(1),
      aviso(3),
      aviso(5, { criadaEm: empate, texto: 'Empate 5' }),
      aviso(2),
      aviso(6, { criadaEm: empate, texto: 'Empate 6' }),
    ]
    await montar(criarFalso(estado(lista)))

    const esperado = ['Empate 6', 'Empate 5', 'Nota 3', 'Nota 2', 'Nota 1']
    expect(textosDaLista()).toEqual(esperado)
    // Controle: a ordem de chegada e a invertida não passam por esta conferência.
    expect(textosDaLista()).not.toEqual(['Nota 1', 'Nota 3', 'Empate 5', 'Nota 2', 'Empate 6'])
    expect(textosDaLista()).not.toEqual([...esperado].reverse())
  })

  it('mantém a ordem do servidor abaixo do milissegundo e marca o instante mais novo sem mudar (RF14-R1-02)', async () => {
    // O mais novo (.123999Z) tem o id menor; o mais velho (.123456Z), o maior: só o texto inteiro do instante decide.
    const maisNovo = aviso(1, { criadaEm: '2026-11-15T13:03:00.123999Z', texto: 'Mais novo' })
    const maisVelho = aviso(2, { criadaEm: '2026-11-15T13:03:00.123456Z', texto: 'Mais velho' })
    const falso = criarFalso(estado([maisNovo, maisVelho]))
    await montar(falso)

    expect(textosDaLista()).toEqual(['Mais novo', 'Mais velho'])
    fireEvent.click(botaoMarcar()!)
    expect(falso.dados.marcarVistos).toHaveBeenCalledTimes(1)
    expect(falso.dados.marcarVistos).toHaveBeenCalledWith('2026-11-15T13:03:00.123999Z')
    expect(falso.dados.marcarVistos).not.toHaveBeenCalledWith('2026-11-15T13:03:00.123456Z')
  })

  it('instantes sem fração e com frações de tamanhos diferentes se comparam como o mesmo relógio', async () => {
    const lista = [
      aviso(1, { criadaEm: '2026-11-15T13:03:00Z', texto: 'Sem fração' }),
      aviso(2, { criadaEm: '2026-11-15T13:03:00.5Z', texto: 'Meio segundo' }),
      aviso(3, { criadaEm: '2026-11-15T13:03:00.05Z', texto: 'Cinco centésimos' }),
    ]
    await montar(criarFalso(estado(lista)))

    expect(textosDaLista()).toEqual(['Meio segundo', 'Cinco centésimos', 'Sem fração'])
  })

  it('51 avisos: 50 linhas (as mais novas) e a linha "Mostrando os 50 avisos mais recentes."', async () => {
    const lista = Array.from({ length: 51 }, (_, i) => aviso(i + 1))
    await montar(criarFalso(estado(lista, { maisDe50: true })))

    expect(linhas()).toHaveLength(50)
    expect(textosDaLista()).not.toContain('Nota 1')
    expect(textosDaLista()[0]).toBe('Nota 51')
    expect(within(principal()).getAllByText(AVISOS_TEXTOS.maisDe50)).toHaveLength(1)
  })

  it('50 avisos sem "mais que isso": nenhuma linha dos 50 mais recentes', async () => {
    const lista = Array.from({ length: 50 }, (_, i) => aviso(i + 1))
    await montar(criarFalso(estado(lista)))

    expect(linhas()).toHaveLength(50)
    expect(within(principal()).queryByText(AVISOS_TEXTOS.maisDe50)).toBeNull()
  })

  it('cada aviso tem três linhas: autor, texto e família com dia e hora', async () => {
    await montar(criarFalso(estado([aviso(2), aviso(1)])))

    for (const item of linhas()) expect(item.querySelectorAll('p')).toHaveLength(3)
    expect(trio(linhas()[0])).toEqual(['Ícaro escreveu uma nota', 'Nota 2', 'Família Exemplo · 15/11 às 10:02'])
    expect(trio(linhas()[1])).toEqual(['Ícaro escreveu uma nota', 'Nota 1', 'Família Exemplo · 15/11 às 10:01'])
  })

  it('as três variantes de autor, com e sem " em destaque" (o destaque só vale enquanto não venceu)', async () => {
    const vigente = new Date(Date.now() + UMA_HORA).toISOString()
    const vencido = new Date(Date.now() - UMA_HORA).toISOString()
    const lista = [
      aviso(6, { autor: { tipo: 'saiu' }, destaqueAte: vigente }),
      aviso(5, { autor: { tipo: 'removido' }, destaqueAte: vigente }),
      aviso(4, { destaqueAte: vigente }),
      aviso(3, { autor: { tipo: 'saiu' } }),
      aviso(2, { autor: { tipo: 'removido' }, destaqueAte: vencido }),
      aviso(1),
    ]
    await montar(criarFalso(estado(lista)))

    expect(linhas().map((item) => trio(item)[0])).toEqual([
      'Alguém que saiu da família escreveu uma nota em destaque',
      'Uma pessoa removida escreveu uma nota em destaque',
      'Ícaro escreveu uma nota em destaque',
      'Alguém que saiu da família escreveu uma nota',
      'Uma pessoa removida escreveu uma nota',
      'Ícaro escreveu uma nota',
    ])
    // A nota em destaque fora do painel de mel leva o fundo de mel; as outras, o branco.
    expect(linhas()[2].classList.contains('bg-mel')).toBe(true)
    expect(linhas()[3].classList.contains('bg-branco')).toBe(true)
    expect(linhas()[4].classList.contains('bg-branco')).toBe(true)
  })

  it('o primeiro aviso é o painel de mel e os outros são papéis brancos', async () => {
    await montar(criarFalso(estado([aviso(3), aviso(2), aviso(1)])))

    expect(linhas()[0].classList.contains('cm-painel-mel')).toBe(true)
    expect(linhas()[1].classList.contains('cm-painel-mel')).toBe(false)
    expect(linhas()[1].classList.contains('bg-branco')).toBe(true)
    expect(linhas()[2].classList.contains('bg-branco')).toBe(true)
  })

  it('o texto de 500 caracteres vem inteiro, com as quebras de linha, e a linha preserva as quebras', async () => {
    const texto = `${'a'.repeat(240)}\n${'b'.repeat(120)}\n\n${'c'.repeat(137)}`
    expect(texto).toHaveLength(500)
    await montar(criarFalso(estado([aviso(1, { texto })])))

    const linhaDoTexto = linhas()[0].querySelectorAll('p')[1]
    expect(linhaDoTexto.textContent).toBe(texto)
    expect(linhaDoTexto.classList.contains('whitespace-pre-line')).toBe(true)
    expect(linhaDoTexto.classList.contains('wrap-anywhere')).toBe(true)
  })

  const MOMENTOS: Array<[string, string, string, string]> = [
    ['America/Sao_Paulo', '2026-11-15T13:30:00.000Z', '15/11', '10:30'],
    ['America/Fortaleza', '2026-11-15T13:30:00.000Z', '15/11', '10:30'],
    ['Asia/Tokyo', '2026-11-15T13:30:00.000Z', '15/11', '22:30'],
    ['Asia/Tokyo', '2026-11-15T20:30:00.000Z', '16/11', '05:30'],
    ['America/Sao_Paulo', '2026-03-05T13:05:00.000Z', '05/03', '10:05'],
  ]

  it.each(MOMENTOS)('dia e hora no fuso do aparelho (%s): %s vira %s às %s, com dois dígitos e sem ano', async (fuso, instante, dia, hora) => {
    await comFuso(fuso, async () => {
      // O fuso da família é outro de propósito: o horário não pode sair dele.
      await montar(criarFalso(estado([aviso(1, { criadaEm: instante, familiaFuso: 'Pacific/Auckland' })])))

      const linha = trio(linhas()[0])[2]
      expect(linha).toBe(AVISOS_TEXTOS.linhaDoMomento('Família Exemplo', dia, hora))
      // Controle: o horário que a família (Auckland) veria é outro e não passa.
      const partes = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'Pacific/Auckland',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date(instante))
      const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)!.value
      expect(`${valor('day')}/${valor('month')} ${valor('hour')}:${valor('minute')}`).not.toBe(`${dia} ${hora}`)
    })
  })
})

describe('a linha de fuso (RF-19)', () => {
  it('um fuso de família com outro deslocamento naquele instante: a linha aparece uma vez', async () => {
    await montar(criarFalso(estado([aviso(2), aviso(1, { familiaFuso: 'America/New_York' })])))

    expect(within(principal()).getAllByText(AVISOS_TEXTOS.avisoDeFuso)).toHaveLength(1)
  })

  it('o aviso que difere pode ser o mais velho da lista (não só o primeiro)', async () => {
    await montar(
      criarFalso(estado([aviso(3), aviso(2), aviso(1, { familiaFuso: 'Asia/Tokyo' })])),
    )

    expect(within(principal()).getAllByText(AVISOS_TEXTOS.avisoDeFuso)).toHaveLength(1)
  })

  it('o mesmo deslocamento com outro nome (America/Fortaleza e America/Sao_Paulo): nenhuma linha', async () => {
    await montar(criarFalso(estado([aviso(2, { familiaFuso: 'America/Fortaleza' }), aviso(1)])))

    expect(within(principal()).queryByText(AVISOS_TEXTOS.avisoDeFuso)).toBeNull()
  })

  it('controle: trocando só o fuso da família para um de outro deslocamento, a mesma consulta acha a linha', async () => {
    await montar(criarFalso(estado([aviso(2, { familiaFuso: 'Asia/Tokyo' }), aviso(1)])))

    expect(within(principal()).queryByText(AVISOS_TEXTOS.avisoDeFuso)).not.toBeNull()
  })

  it('o aparelho em outro fuso: a mesma família de São Paulo passa a diferir e a linha aparece', async () => {
    await comFuso('Asia/Tokyo', async () => {
      await montar(criarFalso(estado([aviso(1)])))
      expect(within(principal()).queryByText(AVISOS_TEXTOS.avisoDeFuso)).not.toBeNull()
    })
  })
})

describe('Marcar todos como vistos', () => {
  const tres = () => estado([aviso(1), aviso(3, { criadaEm: '2026-11-15T13:03:00.123456Z' }), aviso(2)])

  it('manda o instante do aviso mais novo da lista, sem mudar; controle: não é o do mais velho', async () => {
    const falso = criarFalso(tres())
    await montar(falso)

    fireEvent.click(botaoMarcar()!)

    expect(falso.dados.marcarVistos).toHaveBeenCalledTimes(1)
    expect(falso.dados.marcarVistos).toHaveBeenCalledWith('2026-11-15T13:03:00.123456Z')
    expect(falso.dados.marcarVistos).not.toHaveBeenCalledWith(aviso(1).criadaEm)
  })

  it('enquanto grava mostra "Marcando…" e um segundo toque é ignorado', async () => {
    const falso = criarFalso(tres())
    await montar(falso)

    fireEvent.click(botaoMarcar()!)
    const botao = within(principal()).getByRole('button', { name: AVISOS_TEXTOS.botaoSalvando })
    fireEvent.click(botao)
    fireEvent.click(botao)

    expect(falso.dados.marcarVistos).toHaveBeenCalledTimes(1)
    expect(linhas()).toHaveLength(3)
  })

  it('uma leitura que atravessa a gravação não muda a lista na tela', async () => {
    const falso = criarFalso(tres())
    await montar(falso)

    fireEvent.click(botaoMarcar()!)
    falso.resposta = ok(estado([aviso(9), aviso(1), aviso(3), aviso(2)]))
    await dispararLeitura()

    expect(textosDaLista()).toEqual(['Nota 3', 'Nota 2', 'Nota 1'])
  })

  async function marcarComSucesso(falso: Falso) {
    falso.resposta = ok(VAZIO)
    fireEvent.click(botaoMarcar()!)
    await act(async () => {
      falso.marcas[0].resolver(ok(null))
    })
    await aguardarCarga()
  }

  it('com sucesso: "Nenhum aviso novo.", o status, o foco no h1 e a pílula some do cabeçalho', async () => {
    const falso = criarFalso(tres())
    await montar(falso)
    expect(within(document.querySelector('header[data-cabecalho]')!).getByRole('link', { name: 'Avisos, 3 avisos novos' })).toBeTruthy()

    await marcarComSucesso(falso)

    expect(linhas()).toHaveLength(0)
    expect(botaoMarcar()).toBeNull()
    expect(within(principal()).getByText(AVISOS_TEXTOS.vazio)).toBeTruthy()
    expect(within(principal()).getByRole('status').textContent).toContain(AVISOS_TEXTOS.statusMarcados)
    expect(document.activeElement).toBe(h1())
    const entrada = within(document.querySelector('header[data-cabecalho]')!).getByRole('link', { name: AVISOS_TEXTOS.nomeDoLink(0, false) })
    expect(entrada.querySelector('[data-pilula-avisos]')).toBeNull()
  })

  it('depois do sucesso, uma leitura nova com uma nota mais nova mostra só essa nota (não há cópia local)', async () => {
    const falso = criarFalso(tres())
    await montar(falso)
    await marcarComSucesso(falso)

    falso.resposta = ok(estado([aviso(7)]))
    await dispararLeitura()

    expect(textosDaLista()).toEqual(['Nota 7'])
  })

  it('depois do sucesso, uma leitura que falha deixa a página vazia, sem erro', async () => {
    const falso = criarFalso(tres())
    await montar(falso)
    await marcarComSucesso(falso)

    falso.resposta = falha
    await dispararLeitura()

    expect(within(principal()).queryByRole('alert')).toBeNull()
    expect(within(principal()).getByText(AVISOS_TEXTOS.vazio)).toBeTruthy()
    expect(linhas()).toHaveLength(0)
  })

  async function falharAMarca(falso: Falso, indice = 0) {
    await act(async () => {
      falso.marcas[indice].resolver(falha)
    })
    await assentar()
  }

  it('com falha: a lista fica, o resumo vem acima do botão e recebe o foco; tentar de novo manda o mesmo instante', async () => {
    const falso = criarFalso(tres())
    await montar(falso)

    fireEvent.click(botaoMarcar()!)
    await falharAMarca(falso)

    const alerta = within(principal()).getByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    expect(document.activeElement).toBe(alerta)
    expect(antes(alerta, botaoMarcar()!)).toBe(true)
    expect(linhas()).toHaveLength(3)

    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    expect(falso.dados.marcarVistos).toHaveBeenCalledTimes(2)
    expect(falso.marcas[1].ate).toBe(falso.marcas[0].ate)
    expect(falso.marcas[1].ate).toBe('2026-11-15T13:03:00.123456Z')
  })

  it('apertar o botão de novo tira o resumo e volta a "Marcando…"', async () => {
    const falso = criarFalso(tres())
    await montar(falso)
    fireEvent.click(botaoMarcar()!)
    await falharAMarca(falso)
    expect(within(principal()).queryByRole('alert')).not.toBeNull()

    fireEvent.click(botaoMarcar()!)

    expect(within(principal()).queryByRole('alert')).toBeNull()
    expect(within(principal()).getByRole('button', { name: AVISOS_TEXTOS.botaoSalvando })).toBeTruthy()
  })

  it('o resumo some quando uma leitura mostra zero avisos', async () => {
    const falso = criarFalso(tres())
    await montar(falso)
    fireEvent.click(botaoMarcar()!)
    await falharAMarca(falso)
    expect(within(principal()).queryByRole('alert')).not.toBeNull()

    falso.resposta = ok(VAZIO)
    await dispararLeitura()

    expect(within(principal()).queryByRole('alert')).toBeNull()
    expect(within(principal()).getByText(AVISOS_TEXTOS.vazio)).toBeTruthy()
  })
})
