import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { GuardaSessao } from '../../componentes/conta/guarda.tsx'
import { ProvedorDadosConta, ProvedorSessao } from '../../componentes/conta/sessao.tsx'
import { ProvedorDoConteudo } from '../../componentes/desenvolvimento/conteudo.tsx'
import { ABERTURA_DAS_IDEIAS, ITENS_DE_CONTEUDO, type ItemDeConteudo } from '../../componentes/desenvolvimento/itens.ts'
import { rodarAxe } from '../../teste/axe.ts'
import { relogioDoTeste } from '../../teste/relogio.ts'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste, ID_BEBE, type Mundo, type OpcoesMundo } from '../../teste/rotina.fixture.ts'
import { CorpoDaPagina } from './PaginaDesenvolvimento.tsx'
import { PaginaItemDaRota } from './PaginaItem.tsx'
import { ProvedorDaPendencia } from './pendencia.tsx'

// MAT-39a, DES-13 (testes 1 a 11 e 18): a página logada, os estados do contexto, a fase pela idade, a
// publicação e as rotas dos itens. Os valores esperados estão escritos aqui, não calculados do código.

// Uma falha de consulta diz o que não achou, sem despejar o DOM da página inteira.
configure({ getElementError: (mensagem) => new Error(mensagem ?? 'Elemento não encontrado.') })

const HOJE = new Date('2026-11-12T15:00:00-03:00')
const FUSO = 'America/Sao_Paulo'
const AVISO_DE_SAUDE = 'Este conteúdo é informativo e não substitui orientação médica. Em caso de dúvida, fale com o pediatra.'

// Os 9 itens: id, título e o que a rota e a aba mostram.
const ITENS: ReadonlyArray<readonly [string, string]> = [
  ['desenv-tummy-time-fontes', 'O que as fontes dizem sobre tummy time'],
  ['desenv-ideias-todas-as-fases', 'Valem para todas as fases'],
  ['desenv-ideias-0-2m', 'Do nascimento a uns 2 meses'],
  ['desenv-ideias-2-4m', 'De uns 2 a 4 meses'],
  ['desenv-ideias-4-6m', 'De uns 4 a 6 meses'],
  ['desenv-ideias-6-8m', 'De uns 6 a 8 meses'],
  ['desenv-ideias-8-10m', 'De uns 8 a 10 meses'],
  ['desenv-ideias-10-12m', 'De uns 10 a 12 meses'],
  ['desenv-marcos-sem-cobranca', 'Marcos, sem cobrança'],
]

function relogioEm(data: Date = HOJE) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(data)
  return relogioDoTeste()
}

/** O dia `AAAA-MM-DD` que fica `dias` antes de 12/11/2026. */
const nascidoHa = (dias: number) => new Date(Date.UTC(2026, 10, 12 - dias)).toISOString().slice(0, 10)

/**
 * O mundo de teste com Heloísa nascida `dias` antes de 12/11/2026. A data entra na leitura da família (o que a
 * página lê), e não por `atualizarBebe`, que recusa nascimento futuro, bebê arquivado e quem só observa.
 */
async function mundoComBebeDe(dias: number, opcoes: OpcoesMundo = {}): Promise<Mundo> {
  const mundo = criarMundoDeTeste({ fusoDaFamilia: FUSO, ...opcoes })
  const lerFamilia = mundo.conta.detalheFamilia.bind(mundo.conta)
  vi.spyOn(mundo.conta, 'detalheFamilia').mockImplementation(async (id) => {
    const lida = await lerFamilia(id)
    if (!lida.ok) return lida
    const bebes = lida.valor.bebes.map((bebe) => (bebe.id === ID_BEBE ? { ...bebe, nascimento: nascidoHa(dias) } : bebe))
    return { ok: true, valor: { ...lida.valor, bebes } }
  })
  return mundo
}

const faseDaTela = () => document.querySelector('[data-fase]')?.textContent ?? null

interface OpcoesCustom {
  mundo: Mundo
  caminho: string
  itens?: readonly ItemDeConteudo[]
  siteDeProducao?: boolean
  pendente?: boolean
}

/** A página num roteador próprio, para injetar o conteúdo, o site de produção e a pendência. */
function renderizarCustom({ mundo, caminho, itens, siteDeProducao, pendente }: OpcoesCustom) {
  vi.stubGlobal('scrollTo', vi.fn())
  const roteador = createMemoryRouter(
    [
      {
        element: <ProvedorSessao />,
        children: [
          {
            element: <GuardaSessao />,
            children: [
              {
                path: 'app/desenvolvimento',
                element: (
                  <ProvedorDoConteudo itens={itens} siteDeProducao={siteDeProducao}>
                    <ProvedorDaPendencia pendenteInicial={pendente}>
                      <CorpoDaPagina />
                    </ProvedorDaPendencia>
                  </ProvedorDoConteudo>
                ),
              },
              {
                path: 'app/desenvolvimento/conteudo/:id',
                element: (
                  <ProvedorDoConteudo itens={itens} siteDeProducao={siteDeProducao}>
                    <PaginaItemDaRota />
                  </ProvedorDoConteudo>
                ),
              },
            ],
          },
        ],
      },
    ],
    { initialEntries: [caminho] },
  )
  return render(
    <ProvedorDadosConta dados={mundo.conta}>
      <RouterProvider router={roteador} />
    </ProvedorDadosConta>,
  )
}

describe('/app/desenvolvimento: a página', () => {
  it('DES-13 1: abre com o h1 Desenvolvimento, o título da aba e a linha do bebê', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Desenvolvimento')
    await waitFor(() => expect(document.title).toBe('Desenvolvimento | AppMaternidade'))
    expect(document.querySelector('[data-titulo-tela]')?.textContent).toContain('Heloísa · 3 meses')
    expect(screen.queryByRole('combobox', { name: 'Bebê' })).toBeNull()
  })

  it('DES-13 1: mostra "Carregando…" com aria-busy enquanto lê o contexto', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarRota('/app/desenvolvimento', { mundo })
    const carregando = await screen.findByText('Carregando…')
    expect(carregando.closest('[aria-busy="true"]')).not.toBeNull()
    await aguardarCarga()
    expect(screen.queryByText('Carregando…')).toBeNull()
  })

  it('DES-13 2: o item Desenvolvimento do cabeçalho leva a /app/desenvolvimento', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const { container } = renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    const cabecalho = container.querySelector<HTMLElement>('header[data-cabecalho]')!
    const nav = within(cabecalho).getByRole('navigation', { name: 'Site' })
    expect(within(nav).getByRole('link', { name: 'Desenvolvimento' }).getAttribute('href')).toBe('/app/desenvolvimento')
  })
})

describe('a fase pela idade em dias (janelas com limites inclusivos)', () => {
  const CASOS: ReadonlyArray<readonly [number, string]> = [
    [0, 'Fase: Do nascimento a uns 2 meses'],
    [44, 'Fase: Do nascimento a uns 2 meses'],
    [45, 'Fases: Do nascimento a uns 2 meses e De uns 2 a 4 meses'],
    [75, 'Fases: Do nascimento a uns 2 meses e De uns 2 a 4 meses'],
    [76, 'Fase: De uns 2 a 4 meses'],
    [100, 'Fase: De uns 2 a 4 meses'],
    [105, 'Fases: De uns 2 a 4 meses e De uns 4 a 6 meses'],
    [135, 'Fases: De uns 2 a 4 meses e De uns 4 a 6 meses'],
    [136, 'Fase: De uns 4 a 6 meses'],
    [395, 'Fase: De uns 10 a 12 meses'],
    [396, 'As ideias deste site vão até os 12 meses.'],
  ]
  for (const [dias, esperado] of CASOS) {
    it(`com ${dias} dias de vida: ${esperado}`, async () => {
      relogioEm()
      const mundo = await mundoComBebeDe(dias)
      renderizarRota('/app/desenvolvimento', { mundo })
      await aguardarCarga()
      expect(faseDaTela()).toBe(esperado)
    })
  }

  it('um nascimento depois de hoje: T-66 no lugar dos itens por fase; a seção de ideias fica com o item 2, sem idade nem fase (R2)', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(-1)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(faseDaTela()).toBeNull()
    expect(screen.queryByText('As ideias deste site vão até os 12 meses.')).toBeNull()
    expect(document.querySelector('[data-titulo-tela]')?.textContent).toContain('Heloísa')
    expect(document.querySelector('[data-titulo-tela]')?.textContent).not.toMatch(/·|dias|-1/)

    const ideias = document.getElementById('ideias')!
    expect(ideias).not.toBeNull()
    expect(within(ideias).getByRole('heading', { level: 2, name: 'Ideias para brincar nesta fase' })).toBeTruthy()
    expect(within(ideias).getByText(ABERTURA_DAS_IDEIAS)).toBeTruthy()
    expect(within(ideias).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Valem para todas as fases'])
    // DES-02: T-66 duas vezes, uma logo abaixo da linha do bebê (cabeçalho) e uma na seção de ideias.
    const avisos = screen.getAllByText('A data de nascimento está depois de hoje. Confira em Família.')
    expect(avisos).toHaveLength(2)
    const dentro = avisos.filter((aviso) => ideias.contains(aviso))
    const fora = avisos.filter((aviso) => !ideias.contains(aviso))
    expect(dentro).toHaveLength(1)
    expect(fora).toHaveLength(1)
    const titulo = document.querySelector('[data-titulo-tela]')!
    expect(titulo.compareDocumentPosition(fora[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.querySelector('[data-grade-do-desenvolvimento]')!.contains(fora[0])).toBe(false)
    expect(fora[0].closest('[data-aviso-estado="nascimento-futuro"]')).not.toBeNull()
  })

  it('a idade só se renova ao voltar à aba (visibilitychange), sem temporizador', async () => {
    const mudarRelogio = relogioEm()
    const mundo = await mundoComBebeDe(75)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(faseDaTela()).toBe('Fases: Do nascimento a uns 2 meses e De uns 2 a 4 meses')

    mudarRelogio(new Date('2026-11-13T15:00:00-03:00'))
    expect(faseDaTela()).toBe('Fases: Do nascimento a uns 2 meses e De uns 2 a 4 meses')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(faseDaTela()).toBe('Fase: De uns 2 a 4 meses')
  })

  it('"Todas as fases" lista as 6 fases e marca só a de hoje com "nesta fase"', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    const bloco = document.querySelector<HTMLElement>('[data-todas-as-fases]')!
    expect(within(bloco).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Do nascimento a uns 2 meses',
      'De uns 2 a 4 meses',
      'De uns 4 a 6 meses',
      'De uns 6 a 8 meses',
      'De uns 8 a 10 meses',
      'De uns 10 a 12 meses',
    ])
    expect(within(bloco).getAllByText('nesta fase')).toHaveLength(1)
    expect(within(bloco).getByRole('link', { name: 'De uns 2 a 4 meses' }).getAttribute('aria-current')).toBe('true')
    expect(within(bloco).getByRole('link', { name: 'De uns 2 a 4 meses' }).getAttribute('href')).toBe(
      '/app/desenvolvimento/conteudo/desenv-ideias-2-4m',
    )
  })

  it('a ação principal leva às ideias e a seção de ideias existe', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(screen.getByRole('link', { name: 'Ver ideias para brincar' }).getAttribute('href')).toBe('#ideias')
    const ideias = document.getElementById('ideias')!
    expect(within(ideias).getByRole('heading', { level: 2, name: 'Ideias para brincar nesta fase' })).toBeTruthy()
    expect(within(ideias).getByRole('heading', { level: 3, name: 'De uns 2 a 4 meses' })).toBeTruthy()
    expect(within(ideias).getByRole('heading', { level: 3, name: 'Valem para todas as fases' })).toBeTruthy()
  })

  it('"Para ler" leva aos dois artigos', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    const bloco = document.querySelector<HTMLElement>('[data-para-ler]')!
    const links = within(bloco).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/app/desenvolvimento/conteudo/desenv-tummy-time-fontes',
      '/app/desenvolvimento/conteudo/desenv-marcos-sem-cobranca',
    ])
  })

  it('mantém o lugar do bloco de tummy time (MAT-39b), agora ocupado pelo bloco', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    const lugar = document.querySelector<HTMLElement>('[data-lugar-do-tummy]')!
    expect(lugar).toBeTruthy()
    expect(lugar.children.length).toBeGreaterThan(0)
  })
})

describe('DES-09: os estados do contexto', () => {
  it('a leitura falha: T-59 com "Tentar de novo", que lê de novo', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    // A primeira leitura falha; as seguintes seguem a leitura de `mundoComBebeDe`.
    vi.mocked(mundo.conta.detalheFamilia).mockResolvedValueOnce({
      ok: false,
      erro: { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: 'x' },
    })
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(screen.getByRole('alert').textContent).toContain('Não deu para carregar os dados. Confira a conexão.')
    expect(faseDaTela()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCarga()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(faseDaTela()).toBe('Fase: De uns 2 a 4 meses')
  })

  it('o fuso da família é inválido (2b): T-67 e o caminho para Família, sem fase', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const familias = await mundo.conta.minhasFamilias()
    if (!familias.ok) throw new Error('A fixture não leu as famílias.')
    vi.spyOn(mundo.conta, 'minhasFamilias').mockResolvedValue({
      ok: true,
      valor: familias.valor.map((familia) => ({ ...familia, fuso: 'Marte/Olimpo' })),
    })
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(screen.getByRole('alert').textContent).toBe('Não deu para calcular as datas desta família. Confira o fuso em Família.')
    expect(screen.getByRole('link', { name: 'Ir para Família' }).getAttribute('href')).toBe('/app/familia')
    expect(faseDaTela()).toBeNull()
  })

  it('sem família: T-56 e o link Começar', async () => {
    relogioEm()
    renderizarRota('/app/desenvolvimento', { sessao: 'davi' })
    await aguardarCarga()
    expect(screen.getByText('Você ainda não faz parte de uma família.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Começar' }).getAttribute('href')).toBe('/app/comecar')
  })

  it('a família sem bebê: T-39 e o link para Família', async () => {
    relogioEm()
    renderizarRota('/app/desenvolvimento', { semBebes: true })
    await aguardarCarga()
    expect(screen.getByText('Nenhum bebê cadastrado nesta família.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ir para Família' }).getAttribute('href')).toBe('/app/familia')
  })

  it('o bebê arquivado: T-40 com o nome, no lugar de T-23', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100, { bebeArquivado: true, papelDeDavi: 'observador', sessao: 'davi' })
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(screen.getByText('Heloísa está arquivado. Os registros continuam visíveis, mas não dá para registrar.')).toBeTruthy()
    expect(screen.queryByText('Seu papel nesta família permite só ver os registros.')).toBeNull()
  })

  it('o observador: T-23', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100, { papelDeDavi: 'observador', sessao: 'davi' })
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(screen.getByText('Seu papel nesta família permite só ver os registros.')).toBeTruthy()
    expect(faseDaTela()).toBe('Fase: De uns 2 a 4 meses')
  })

  it('o fuso do aparelho diferente do da família: T-06', async () => {
    relogioEm()
    const outro = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Tokyo' ? 'America/Sao_Paulo' : 'Asia/Tokyo'
    const mundo = await mundoComBebeDe(100, { fusoDaFamilia: outro })
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(document.querySelector('[data-fuso-diferente]')?.textContent).toContain(`O dia segue o fuso da família (${outro}).`)
  })
})

/** Os blocos estáticos (R1): presentes, sem nenhum dado do bebê (idade, fase, tummy, ideias por fase). */
function conferirBlocosEstaticos() {
  expect(screen.getByRole('heading', { level: 2, name: 'Todas as fases' })).toBeTruthy()
  expect(screen.getByRole('heading', { level: 2, name: 'Para ler' })).toBeTruthy()
  const bloco = document.querySelector<HTMLElement>('[data-todas-as-fases]')!
  expect(within(bloco).getAllByRole('link')).toHaveLength(6)
  expect(within(bloco).queryByText('nesta fase')).toBeNull()
  expect(bloco.querySelector('[aria-current]')).toBeNull()
  expect(within(document.querySelector<HTMLElement>('[data-para-ler]')!).getAllByRole('link')).toHaveLength(2)
  expect(faseDaTela()).toBeNull()
  expect(document.getElementById('ideias')).toBeNull()
  expect(document.querySelector('[data-lugar-do-tummy]')).toBeNull()
  expect(document.querySelector('[data-titulo-tela]')?.textContent).toBe('Desenvolvimento')
}

describe('DES-09 (R1): fora do estado pronto, os blocos estáticos continuam', () => {
  it('carregando', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    // A leitura fica pendente até as asserções terminarem: sem corrida com o estado de carga.
    const original = vi.mocked(mundo.conta.detalheFamilia).getMockImplementation()
    if (!original) throw new Error('A fixture não define detalheFamilia.')
    let liberar: () => void = () => {}
    const portao = new Promise<void>((resolver) => {
      liberar = resolver
    })
    vi.mocked(mundo.conta.detalheFamilia).mockImplementationOnce(async (familiaId: string) => {
      await portao
      return original(familiaId)
    })
    renderizarRota('/app/desenvolvimento', { mundo })
    // Espera a página montar (a casca pode mostrar outro "Carregando…" antes); a leitura segue pendente.
    await screen.findByRole('heading', { level: 2, name: 'Todas as fases' })
    expect(screen.getByText('Carregando…')).toBeTruthy()
    conferirBlocosEstaticos()
    liberar()
    await aguardarCarga()
  })

  it('erro de leitura, com "Tentar de novo"', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    vi.mocked(mundo.conta.detalheFamilia).mockResolvedValueOnce({
      ok: false,
      erro: { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: 'x' },
    })
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
    conferirBlocosEstaticos()
  })

  it('fuso inválido (2b)', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const familias = await mundo.conta.minhasFamilias()
    if (!familias.ok) throw new Error('A fixture não leu as famílias.')
    vi.spyOn(mundo.conta, 'minhasFamilias').mockResolvedValue({
      ok: true,
      valor: familias.valor.map((familia) => ({ ...familia, fuso: 'Marte/Olimpo' })),
    })
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(screen.getByRole('link', { name: 'Ir para Família' })).toBeTruthy()
    conferirBlocosEstaticos()
  })

  it('sem família', async () => {
    relogioEm()
    renderizarRota('/app/desenvolvimento', { sessao: 'davi' })
    await aguardarCarga()
    expect(screen.getByRole('link', { name: 'Começar' })).toBeTruthy()
    conferirBlocosEstaticos()
  })

  it('sem bebê', async () => {
    relogioEm()
    renderizarRota('/app/desenvolvimento', { semBebes: true })
    await aguardarCarga()
    expect(screen.getByText('Nenhum bebê cadastrado nesta família.')).toBeTruthy()
    conferirBlocosEstaticos()
  })
})

describe('DES-02 e DES-03: o seletor de bebê', () => {
  const TEO = { id: 'b7777777-7777-4777-8777-777777777777', nome: 'Teo', nascimento: '2026-10-01', estado: 'ativo' as const }

  it('com mais de um bebê mostra o rótulo "Bebê" e a lista em ordem; escolher troca a linha e a fase', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100, { bebesExtras: [TEO] })
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    const seletor = screen.getByRole('combobox', { name: 'Bebê' }) as HTMLSelectElement
    expect(within(seletor).getAllByRole('option').map((opcao) => opcao.textContent)).toEqual(['Heloísa', 'Teo'])
    expect(seletor.value).toBe(ID_BEBE)

    fireEvent.change(seletor, { target: { value: TEO.id } })
    await aguardarCarga()
    expect(document.querySelector('[data-titulo-tela]')?.textContent).toContain('Teo · 1 mês')
    expect(faseDaTela()).toBe('Fase: Do nascimento a uns 2 meses')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Desenvolvimento')
  })

  it('o bebê arquivado vem depois dos ativos, marcado na lista', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100, { bebesExtras: [{ ...TEO, nome: 'Abel', estado: 'arquivado' }] })
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    const seletor = screen.getByRole('combobox', { name: 'Bebê' })
    expect(within(seletor).getAllByRole('option').map((opcao) => opcao.textContent)).toEqual(['Heloísa', 'Abel (arquivado)'])
  })

  it('com uma operação pendente, o seletor fica desativado', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100, { bebesExtras: [TEO] })
    renderizarCustom({ mundo, caminho: '/app/desenvolvimento', pendente: true })
    await aguardarCarga()
    expect((screen.getByRole('combobox', { name: 'Bebê' }) as HTMLSelectElement).disabled).toBe(true)
  })
})

describe('DES-06: os itens de conteúdo', () => {
  for (const [id, titulo] of ITENS) {
    it(`a rota do item "${titulo}" mostra o h1, o aviso de saúde, as fontes e o canal de contato`, async () => {
      relogioEm()
      const mundo = await mundoComBebeDe(100)
      renderizarRota(`/app/desenvolvimento/conteudo/${id}`, { mundo })
      await aguardarCarga()

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(titulo)
      await waitFor(() => expect(document.title).toBe(`${titulo} | AppMaternidade`))
      expect(screen.getByRole('note').textContent).toBe(AVISO_DE_SAUDE)
      expect(screen.getByRole('heading', { level: 2, name: 'Fontes' })).toBeTruthy()
      const fontes = document.querySelector<HTMLElement>('[data-fontes]')!
      const links = within(fontes).getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) {
        expect(link.getAttribute('target')).toBe('_blank')
        expect(link.getAttribute('rel')).toBe('noopener noreferrer')
        expect(link.getAttribute('href')).toMatch(/^https:\/\//)
      }
      expect(screen.getAllByText('consultada em 05/11/2026').length).toBe(links.length)
      const artigo = document.querySelector<HTMLElement>('article[data-item]')!
      expect(within(artigo).getByRole('link', { name: 'Contato' }).getAttribute('href')).toBe('/contato')
      expect(document.body.textContent).toContain('Revisão profissional: pendente')
      expect(screen.getByRole('link', { name: 'Voltar para Desenvolvimento' }).getAttribute('href')).toBe('/app/desenvolvimento')
    })
  }

  it('o item do tummy time traz a tabela numa região rolável com nome', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarRota('/app/desenvolvimento/conteudo/desenv-tummy-time-fontes', { mundo })
    await aguardarCarga()
    const regiao = screen.getByRole('region', { name: 'Tabela: quanto tempo, segundo cada fonte' })
    expect(regiao.getAttribute('tabindex')).toBe('0')
    expect(within(regiao).getByRole('table')).toBeTruthy()
    expect(within(regiao).getAllByRole('columnheader').length).toBeGreaterThan(1)
  })

  it('um id que não existe: T-48 como h1 e o link de volta, sem aviso de saúde', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarRota('/app/desenvolvimento/conteudo/nao-existe', { mundo })
    await aguardarCarga()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Não encontramos este conteúdo.')
    expect(screen.getByRole('link', { name: 'Voltar para Desenvolvimento' }).getAttribute('href')).toBe('/app/desenvolvimento')
    expect(screen.queryByRole('note')).toBeNull()
    await waitFor(() => expect(document.title).toBe('Conteúdo não encontrado | AppMaternidade'))
  })

  // `\b` do JS é só ASCII: em "família" o `í` conta como borda e `\bLia\b` casaria. Por isso as bordas são letras Unicode.
  const proibido = /meta de|estrelas|sequência de dias|(?<!\p{L})(Ana|Lia)(?!\p{L})/iu

  it('o regex dos nomes proibidos casa palavras inteiras e não casa pedaços de outras palavras', () => {
    expect('a Lia chegou').toMatch(proibido)
    expect('Ana, vem').toMatch(proibido)
    expect('a lia chegou').toMatch(proibido)
    expect('O dia segue o fuso da família (UTC).').not.toMatch(proibido)
    expect('Mariana').not.toMatch(proibido)
    expect('Analia').not.toMatch(proibido)
    expect('Aníbal e Liana').not.toMatch(proibido)
  })

  it.each([
    { condicao: 'aparelho no fuso da família: aviso de fuso oculto', zonaDoAparelho: FUSO, avisoDeFuso: false },
    { condicao: 'aparelho em UTC: aviso de fuso exibido (texto com "família")', zonaDoAparelho: 'UTC', avisoDeFuso: true },
  ])(
    'o texto da página não usa meta, estrelas nem sequência de dias, e não usa os nomes Ana ou Lia ($condicao)',
    async ({ zonaDoAparelho, avisoDeFuso }) => {
      const original = Intl.DateTimeFormat.prototype.resolvedOptions
      const espiao = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
        return { ...original.call(this), timeZone: zonaDoAparelho }
      })
      try {
        relogioEm()
        const mundo = await mundoComBebeDe(100)
        const { unmount } = renderizarRota('/app/desenvolvimento', { mundo })
        await aguardarCarga()
        const aviso = document.querySelector('[data-fuso-diferente]')
        if (avisoDeFuso) {
          expect(aviso).not.toBeNull()
          expect(aviso!.textContent).toContain('família')
        } else {
          expect(aviso).toBeNull()
        }
        expect(document.querySelector('main')!.textContent).not.toMatch(proibido)
        unmount()
        for (const [id] of ITENS) {
          const { unmount: sair } = renderizarRota(`/app/desenvolvimento/conteudo/${id}`, { mundo })
          await aguardarCarga()
          expect(document.querySelector('main')!.textContent, id).not.toMatch(proibido)
          sair()
        }
      } finally {
        espiao.mockRestore()
      }
    },
  )
})

describe('DES-06 item 5: a publicação', () => {
  const RECOLHIDO = 'desenv-ideias-2-4m'
  const itens = ITENS_DE_CONTEUDO.map((item) => (item.id === RECOLHIDO ? { ...item, publicado: false } : item))

  it('no site de produção, o item recolhido mostra só o título, T-50 e o link de volta', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarCustom({ mundo, caminho: `/app/desenvolvimento/conteudo/${RECOLHIDO}`, itens, siteDeProducao: true })
    await aguardarCarga()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('De uns 2 a 4 meses')
    expect(screen.getByText('Este conteúdo está em revisão profissional e aparece aqui quando a revisão terminar.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Voltar para Desenvolvimento' })).toBeTruthy()
    expect(screen.queryByRole('note')).toBeNull()
    expect(document.querySelector('[data-corpo-conteudo]')).toBeNull()
    expect(document.querySelector('[data-fontes]')).toBeNull()
  })

  it('no site de produção, a página não lista o item recolhido; fora dele, lista', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const producao = renderizarCustom({ mundo, caminho: '/app/desenvolvimento', itens, siteDeProducao: true })
    await aguardarCarga()
    expect(document.querySelector('[data-todas-as-fases]')!.textContent).not.toContain('De uns 2 a 4 meses')
    expect(document.getElementById('ideias')?.textContent ?? '').not.toContain('De uns 2 a 4 meses')
    producao.unmount()

    renderizarCustom({ mundo, caminho: '/app/desenvolvimento', itens, siteDeProducao: false })
    await aguardarCarga()
    expect(document.querySelector('[data-todas-as-fases]')!.textContent).toContain('De uns 2 a 4 meses')
  })

  // R4: uma seção esvaziada pela publicação mantém o h2 e mostra T-50, uma vez só.
  const EM_REVISAO = 'Este conteúdo está em revisão profissional e aparece aqui quando a revisão terminar.'
  const recolher = (recolhido: (item: ItemDeConteudo) => boolean) =>
    ITENS_DE_CONTEUDO.map((item) => (recolhido(item) ? { ...item, publicado: false } : item))
  const secao = (seletor: string, titulo: string) => {
    const bloco = document.querySelector<HTMLElement>(seletor)!
    expect(bloco, seletor).not.toBeNull()
    expect(within(bloco).getByRole('heading', { level: 2, name: titulo })).toBeTruthy()
    return bloco
  }

  it('em produção, com tudo recolhido, as três seções mantêm o h2 e mostram T-50 uma vez; a abertura das ideias some', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarCustom({ mundo, caminho: '/app/desenvolvimento', itens: recolher(() => true), siteDeProducao: true })
    await aguardarCarga()
    for (const [seletor, titulo] of [
      ['#ideias', 'Ideias para brincar nesta fase'],
      ['[data-todas-as-fases]', 'Todas as fases'],
      ['[data-para-ler]', 'Para ler'],
    ] as const) {
      const bloco = secao(seletor, titulo)
      expect(within(bloco).getAllByText(EM_REVISAO), seletor).toHaveLength(1)
      expect(within(bloco).queryAllByRole('link'), seletor).toHaveLength(0)
    }
    expect(within(document.getElementById('ideias')!).queryByText(ABERTURA_DAS_IDEIAS)).toBeNull()
  })

  it('em produção, só "Para ler" recolhido: só ela mostra T-50', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const itens = recolher((item) => item.tipo === 'artigo')
    renderizarCustom({ mundo, caminho: '/app/desenvolvimento', itens, siteDeProducao: true })
    await aguardarCarga()
    expect(within(secao('[data-para-ler]', 'Para ler')).getAllByText(EM_REVISAO)).toHaveLength(1)
    expect(within(secao('[data-todas-as-fases]', 'Todas as fases')).queryByText(EM_REVISAO)).toBeNull()
    expect(within(secao('#ideias', 'Ideias para brincar nesta fase')).queryByText(EM_REVISAO)).toBeNull()
  })

  it('em produção, só o item 2 recolhido: as ideias da fase ficam, o título do item 2 e a abertura somem', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const itens = recolher((item) => item.id === 'desenv-ideias-todas-as-fases')
    renderizarCustom({ mundo, caminho: '/app/desenvolvimento', itens, siteDeProducao: true })
    await aguardarCarga()
    const ideias = secao('#ideias', 'Ideias para brincar nesta fase')
    expect(within(ideias).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['De uns 2 a 4 meses'])
    expect(within(ideias).queryByText('Valem para todas as fases')).toBeNull()
    expect(within(ideias).queryByText(ABERTURA_DAS_IDEIAS)).toBeNull()
    expect(within(ideias).queryByText(EM_REVISAO)).toBeNull()
  })

  it('fora de produção, o item 2 "recolhido" segue visível e a abertura fica', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const itens = recolher((item) => item.id === 'desenv-ideias-todas-as-fases')
    renderizarCustom({ mundo, caminho: '/app/desenvolvimento', itens, siteDeProducao: false })
    await aguardarCarga()
    const ideias = secao('#ideias', 'Ideias para brincar nesta fase')
    expect(within(ideias).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['De uns 2 a 4 meses', 'Valem para todas as fases'])
    expect(within(ideias).getByText(ABERTURA_DAS_IDEIAS)).toBeTruthy()
  })

  it('em produção, ideias esvaziadas (item 2 e a fase do bebê recolhidos): h2 e T-50, sem a abertura; as outras fases seguem na lista', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const itens = recolher((item) => item.id === 'desenv-ideias-todas-as-fases' || item.id === 'desenv-ideias-2-4m')
    renderizarCustom({ mundo, caminho: '/app/desenvolvimento', itens, siteDeProducao: true })
    await aguardarCarga()
    const ideias = secao('#ideias', 'Ideias para brincar nesta fase')
    expect(within(ideias).getAllByText(EM_REVISAO)).toHaveLength(1)
    expect(within(ideias).queryByText(ABERTURA_DAS_IDEIAS)).toBeNull()
    expect(within(secao('[data-todas-as-fases]', 'Todas as fases')).getAllByRole('link')).toHaveLength(5)
  })

  it('em produção, "Todas as fases" esvaziada (as 6 fases recolhidas): h2 e T-50; o item 2 mantém as ideias', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const itens = recolher((item) => item.fase)
    renderizarCustom({ mundo, caminho: '/app/desenvolvimento', itens, siteDeProducao: true })
    await aguardarCarga()
    const todas = secao('[data-todas-as-fases]', 'Todas as fases')
    expect(within(todas).getAllByText(EM_REVISAO)).toHaveLength(1)
    const ideias = secao('#ideias', 'Ideias para brincar nesta fase')
    expect(within(ideias).queryByText(EM_REVISAO)).toBeNull()
    expect(within(ideias).getByText(ABERTURA_DAS_IDEIAS)).toBeTruthy()
  })

  it('fora de produção, nenhuma seção mostra T-50: o conteúdo recolhido segue visível', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarCustom({ mundo, caminho: '/app/desenvolvimento', itens: recolher(() => true), siteDeProducao: false })
    await aguardarCarga()
    expect(screen.queryByText(EM_REVISAO)).toBeNull()
    expect(within(secao('[data-todas-as-fases]', 'Todas as fases')).getAllByRole('link')).toHaveLength(6)
    expect(within(secao('[data-para-ler]', 'Para ler')).getAllByRole('link')).toHaveLength(2)
    expect(within(secao('#ideias', 'Ideias para brincar nesta fase')).getByText(ABERTURA_DAS_IDEIAS)).toBeTruthy()
  })

  it('fora do site de produção, o item recolhido aparece inteiro', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarCustom({ mundo, caminho: `/app/desenvolvimento/conteudo/${RECOLHIDO}`, itens, siteDeProducao: false })
    await aguardarCarga()
    expect(screen.getByRole('note').textContent).toBe(AVISO_DE_SAUDE)
    expect(document.querySelector('[data-corpo-conteudo]')).not.toBeNull()
  })
})

describe('DES-13 11: a madrugada', () => {
  it('troca só os tokens: sem cor crua nem fundo branco fixo, e o tema vale em tempo de execução', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const { container } = renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    const html = container.innerHTML
    expect(html).not.toMatch(/bg-white|text-black|#fff|#000|rgb\(/i)
    expect(container.querySelector('[data-painel="mel"]')).not.toBeNull()

    document.documentElement.setAttribute('data-tema', 'madrugada')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Desenvolvimento')
    expect(container.querySelector('[data-painel="mel"]')).not.toBeNull()
  })

  // O jsdom não carrega o CSS: o efeito do tema se confere no que o `tema.css` declara e no que a página lê.
  const css = readFileSync(join(process.cwd(), 'src', 'styles', 'tema.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const declaracoes = (corpo: string) => new Map([...corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
  const claro = declaracoes(/:root\s*\{([^}]*)\}/.exec(css)![1])
  const madrugada = declaracoes(/:root\[data-tema='madrugada'\]\s*\{([^}]*)\}/.exec(css)![1])

  it('a página lê só tokens do tema e vários deles têm valor diferente na madrugada', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100, { bebesExtras: [{ id: 'b7777777-7777-4777-8777-777777777777', nome: 'Teo', nascimento: '2026-10-01', estado: 'ativo' }] })
    const { container } = renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    const lidos = new Set([...container.innerHTML.matchAll(/var\((--cor-[\w-]+)(,?)/g)].filter((m) => m[2] === '').map((m) => m[1]))
    expect(lidos.size).toBeGreaterThanOrEqual(5)
    // Todo token lido existe no tema claro (o tema da madrugada só sobrepõe).
    expect([...lidos].filter((nome) => !claro.has(nome))).toEqual([])
    const mudam = [...lidos].filter((nome) => madrugada.has(nome) && madrugada.get(nome) !== claro.get(nome))
    for (const essencial of ['--cor-cartao', '--cor-texto', '--cor-texto-2', '--cor-papel-fundo', '--cor-fio-suave']) {
      expect(mudam, essencial).toContain(essencial)
    }
    // Os valores da madrugada, escritos aqui: cartão da noite e texto de papel.
    expect(madrugada.get('--cor-cartao')).toBe('var(--color-noite-cartao)')
    expect(madrugada.get('--cor-texto')).toBe('var(--color-papel)')
    expect(claro.get('--cor-cartao')).toBe('var(--color-branco)')
  })
})

// DES-13 10: axe nos estados do DES-09, em cada tema, na rota do item e no item recolhido.
async function violacoes(container: HTMLElement): Promise<string[]> {
  // O jsdom não calcula cor nem layout: o contraste é conferido em estilo.test.ts. `region` não vale fora da casca.
  const resultado = await rodarAxe(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)
}

const CAMINHO = '/app/desenvolvimento'
const CENARIOS: ReadonlyArray<readonly [string, () => Promise<HTMLElement>]> = [
  [
    '1 carregando',
    async () => {
      const { container } = renderizarRota(CAMINHO, { mundo: await mundoComBebeDe(100) })
      await screen.findByText('Carregando…')
      return container
    },
  ],
  [
    '2 erro de leitura',
    async () => {
      const mundo = await mundoComBebeDe(100)
      vi.mocked(mundo.conta.detalheFamilia).mockResolvedValueOnce({
        ok: false,
        erro: { classe: 'rede', chave: 'rede', codigo: 'rede', mensagemOriginal: 'x' },
      })
      const { container } = renderizarRota(CAMINHO, { mundo })
      await aguardarCarga()
      return container
    },
  ],
  [
    '2b fuso inválido',
    async () => {
      const mundo = await mundoComBebeDe(100)
      const familias = await mundo.conta.minhasFamilias()
      if (!familias.ok) throw new Error('A fixture não leu as famílias.')
      vi.spyOn(mundo.conta, 'minhasFamilias').mockResolvedValue({
        ok: true,
        valor: familias.valor.map((familia) => ({ ...familia, fuso: 'Marte/Olimpo' })),
      })
      const { container } = renderizarRota(CAMINHO, { mundo })
      await aguardarCarga()
      return container
    },
  ],
  [
    '3 sem família',
    async () => {
      const { container } = renderizarRota(CAMINHO, { sessao: 'davi' })
      await aguardarCarga()
      return container
    },
  ],
  [
    '4 sem bebê',
    async () => {
      const { container } = renderizarRota(CAMINHO, { semBebes: true })
      await aguardarCarga()
      return container
    },
  ],
  [
    '5 bebê arquivado',
    async () => {
      const { container } = renderizarRota(CAMINHO, { mundo: await mundoComBebeDe(100, { bebeArquivado: true }) })
      await aguardarCarga()
      return container
    },
  ],
  [
    '6 observador',
    async () => {
      const { container } = renderizarRota(CAMINHO, { mundo: await mundoComBebeDe(100, { papelDeDavi: 'observador', sessao: 'davi' }) })
      await aguardarCarga()
      return container
    },
  ],
  [
    '7 pronto, com dois bebês (seletor)',
    async () => {
      const teo = { id: 'b7777777-7777-4777-8777-777777777777', nome: 'Teo', nascimento: '2026-10-01', estado: 'ativo' as const }
      const { container } = renderizarRota(CAMINHO, { mundo: await mundoComBebeDe(100, { bebesExtras: [teo] }) })
      await aguardarCarga()
      return container
    },
  ],
  [
    'nascimento depois de hoje',
    async () => {
      const { container } = renderizarRota(CAMINHO, { mundo: await mundoComBebeDe(-1) })
      await aguardarCarga()
      return container
    },
  ],
  [
    'item 1 (tummy time, com tabela)',
    async () => {
      const { container } = renderizarRota(`${CAMINHO}/conteudo/desenv-tummy-time-fontes`, { mundo: await mundoComBebeDe(100) })
      await aguardarCarga()
      return container
    },
  ],
  [
    'item que não existe',
    async () => {
      const { container } = renderizarRota(`${CAMINHO}/conteudo/nao-existe`, { mundo: await mundoComBebeDe(100) })
      await aguardarCarga()
      return container
    },
  ],
  [
    'item recolhido (produção)',
    async () => {
      const itens = ITENS_DE_CONTEUDO.map((item) => ({ ...item, publicado: false }))
      const { container } = renderizarCustom({
        mundo: await mundoComBebeDe(100),
        caminho: `${CAMINHO}/conteudo/desenv-ideias-2-4m`,
        itens,
        siteDeProducao: true,
      })
      await aguardarCarga()
      return container
    },
  ],
  [
    'página com todas as seções recolhidas (produção)',
    async () => {
      const itens = ITENS_DE_CONTEUDO.map((item) => ({ ...item, publicado: false }))
      const { container } = renderizarCustom({ mundo: await mundoComBebeDe(100), caminho: CAMINHO, itens, siteDeProducao: true })
      await aguardarCarga()
      return container
    },
  ],
]

describe('DES-13 10: sem violações do axe, nos dois temas', () => {
  for (const tema of ['claro', 'madrugada'] as const) {
    for (const [nome, preparar] of CENARIOS) {
      it(`${nome} (${tema})`, async () => {
        relogioEm()
        if (tema === 'madrugada') document.documentElement.setAttribute('data-tema', 'madrugada')
        const container = await preparar()
        expect(await violacoes(container)).toEqual([])
      })
    }
  }
})

describe('DES-13 18: a navegação interna', () => {
  it('ir a um item pela lista leva ao h1 do item, com o foco nele', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    fireEvent.click(within(document.querySelector<HTMLElement>('[data-todas-as-fases]')!).getByRole('link', { name: 'De uns 4 a 6 meses' }))
    await aguardarCarga()
    const titulo = await screen.findByRole('heading', { level: 1, name: 'De uns 4 a 6 meses' })
    await waitFor(() => expect(document.activeElement).toBe(titulo))
  })
})
