import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { GuardaSessao } from '../../componentes/conta/guarda.tsx'
import { ProvedorDadosConta, ProvedorSessao } from '../../componentes/conta/sessao.tsx'
import { ProvedorDoConteudo } from '../../componentes/desenvolvimento/conteudo.tsx'
import { ITENS_DE_CONTEUDO, type ItemDeConteudo } from '../../componentes/desenvolvimento/itens.ts'
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

  it('um nascimento depois de hoje mostra T-66 e nenhuma fase', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(-1)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(screen.getByText('A data de nascimento está depois de hoje. Confira em Família.')).toBeTruthy()
    expect(faseDaTela()).toBeNull()
    expect(screen.queryByText('As ideias deste site vão até os 12 meses.')).toBeNull()
  })

  it('a idade só se renova ao voltar à aba (visibilitychange), sem temporizador', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(75)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    expect(faseDaTela()).toBe('Fases: Do nascimento a uns 2 meses e De uns 2 a 4 meses')

    vi.setSystemTime(new Date('2026-11-13T15:00:00-03:00'))
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

  it('deixa o lugar do bloco de tummy time (MAT-39b) vazio, sem texto de tummy fora dos itens', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    const lugar = document.querySelector<HTMLElement>('[data-lugar-do-tummy]')!
    expect(lugar.textContent).toBe('')
    expect(lugar.children).toHaveLength(0)
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

  it('o texto da página não usa meta, estrelas nem sequência de dias, e não usa os nomes Ana ou Lia', async () => {
    relogioEm()
    const mundo = await mundoComBebeDe(100)
    const { unmount } = renderizarRota('/app/desenvolvimento', { mundo })
    await aguardarCarga()
    const proibido = /meta de|estrelas|sequência de dias|\b(Ana|Lia)\b/i
    expect(document.querySelector('main')!.textContent).not.toMatch(proibido)
    unmount()
    for (const [id] of ITENS) {
      const { unmount: sair } = renderizarRota(`/app/desenvolvimento/conteudo/${id}`, { mundo })
      await aguardarCarga()
      expect(document.querySelector('main')!.textContent, id).not.toMatch(proibido)
      sair()
    }
  })
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
