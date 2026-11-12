import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMUM_COMUNIDADE, ROTULO_MOTIVO, TEXTOS_ERRO_COMUNIDADE, TX as TX_COMUNIDADE } from '../../conteudo/comunidade.ts'
import {
  ACAO_NO_CONTEUDO,
  AUDITORIA,
  COMUM_MODERACAO,
  DECISAO,
  FILA,
  NAO_ENCONTRADO,
  NOMES_DAS_TELAS,
  PAPEIS,
  TEXTOS_ERRO_MODERACAO,
  TITULO_DA_ABA_MODERACAO,
  TX,
} from '../../conteudo/moderacao.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria, type EstadoComunidade } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarDadosModeracaoMemoria, simularFalhaModeracao, simularRespostaPerdidaModeracao } from '../../dados/moderacao.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarModeracao } from './apoio.tsx'

// Uma falha mostra só o começo do HTML (o padrão despeja milhares de linhas).
process.env.DEBUG_PRINT_LIMIT = '300'

// MAT-40b: as telas M1 a M5 sobre a memória, com o elenco da MAT-47: selo, título e `noindex`, a guarda de
// acesso, os estados, as ações com motivo, o envio com resultado incerto e as regras que falham fechadas.
// O `fetch` abaixo falha o teste se alguma tela chamar a rede (teste 7).

const fetchProibido = vi.fn()

beforeEach(() => {
  fetchProibido.mockClear()
  vi.stubGlobal('fetch', (...argumentos: unknown[]) => {
    fetchProibido(...argumentos)
    throw new Error('o teste chamou a rede')
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  expect(fetchProibido).not.toHaveBeenCalled()
})

type Denuncia = EstadoComunidade['denuncias'][number]

const idDaDenuncia = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let contador = 0

/** Uma denúncia aberta do `outro` contra o tópico do autor, com os campos que o teste mudar. */
function novaDenuncia(estado: EstadoComunidade, extras: Partial<Denuncia> = {}): Denuncia {
  contador += 1
  const linha: Denuncia = {
    id: idDaDenuncia(contador),
    denuncianteId: ELENCO.outro.conta,
    topicoId: CONTEUDO.topicoDoAutor,
    respostaId: null,
    perfilId: null,
    motivo: 'outro',
    texto: null,
    estado: 'aberta',
    decididaPor: null,
    decididaEm: null,
    criadaEm: new Date(Date.now() - 60_000 * (1000 - contador)).toISOString(),
    ...extras,
  }
  estado.denuncias.push(linha)
  return linha
}

function cena(
  pessoa: PessoaDoElenco,
  caminho: string,
  ajustar?: (estado: EstadoComunidade) => void,
  opcoes: { basename?: string; madrugada?: boolean } = {},
) {
  const estado = criarElenco()
  ajustar?.(estado)
  const comunidade = criarDadosComunidadeMemoria(estado, ELENCO[pessoa].conta)
  const moderacao = criarDadosModeracaoMemoria(estado, ELENCO[pessoa].conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO[pessoa].email)
  const tela = renderizarModeracao(caminho, { contas, comunidade, moderacao, ...opcoes })
  return { ...tela, estado, comunidade, moderacao }
}

const painel = '/moderacao'
const denuncia = (id: string) => `/moderacao/denuncia/${id}`
const conteudo = (tipo: string, id: string) => `/moderacao/conteudo/${tipo}/${id}`

const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const semCarregando = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())

async function aguardarH1(nome?: string | RegExp) {
  const titulo = await screen.findByRole('heading', { level: 1, ...(nome ? { name: nome } : {}) })
  await semCarregando()
  return titulo
}

/** Uma das confirmações de ação (role `status`) diz exatamente o texto. */
const statusDiz = (texto: string) =>
  waitFor(() => expect(screen.getAllByRole('status').some((s) => s.textContent === texto)).toBe(true))

const hrefsDaFila = () =>
  within(screen.getByRole('region', { name: FILA.lista }))
    .queryAllByRole('link')
    .map((a) => a.getAttribute('href'))

/** Abre a caixa de uma ação e devolve a caixa. */
async function abrirCaixa(rotuloDoBotao: string, titulo: string) {
  fireEvent.click(botao(rotuloDoBotao))
  return await screen.findByRole('dialog', { name: titulo })
}

function confirmarNaCaixa(caixa: HTMLElement, motivo: string, rotuloDoBotao: string) {
  fireEvent.change(within(caixa).getByLabelText(/^Motivo/), { target: { value: motivo } })
  fireEvent.click(within(caixa).getByRole('button', { name: rotuloDoBotao }))
}

describe('selo, título da aba e noindex (MAT-40:RF-02, teste 10)', () => {
  const ID_FIXO = idDaDenuncia(777)
  const rotas: Array<[string, PessoaDoElenco, string]> = [
    [painel, 'moderador', NOMES_DAS_TELAS.fila],
    [denuncia(ID_FIXO), 'moderador', NOMES_DAS_TELAS.denuncia],
    [conteudo('topico', CONTEUDO.topicoDoAutor), 'moderador', NOMES_DAS_TELAS.conteudo],
    [conteudo('resposta', CONTEUDO.respostaDoOutro), 'moderador', NOMES_DAS_TELAS.conteudo],
    ['/moderacao/auditoria', 'moderador', NOMES_DAS_TELAS.auditoria],
    ['/moderacao/papeis', 'admin', NOMES_DAS_TELAS.papeis],
  ]

  for (const [caminho, pessoa, h1] of rotas) {
    it(`${caminho} (${pessoa}): um main e um h1 fixo, o selo, o título da aba e a meta robots só enquanto está montada`, async () => {
      const { container, roteador } = cena(pessoa, caminho, (estado) => {
        novaDenuncia(estado, { id: ID_FIXO })
      })
      await aguardarH1(h1)
      expect(container.querySelectorAll('main')).toHaveLength(1)
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      expect(screen.getByText(TX.selo)).toBeTruthy()
      expect(document.title).toBe(TITULO_DA_ABA_MODERACAO)
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')

      await act(async () => {
        await roteador.navigate('/app/hoje')
      })
      await screen.findByRole('heading', { level: 1, name: 'Hoje' })
      expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
    })
  }

  it('sem sessão, qualquer rota do painel vai a /entrar?volta=... (a MAT-40 não cria tela de login)', async () => {
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.moderador.conta)
    const moderacao = criarDadosModeracaoMemoria(estado, ELENCO.moderador.conta)
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    const { roteador } = renderizarModeracao(painel, { contas, comunidade, moderacao })
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'))
    expect(roteador.state.location.search).toBe(`?volta=${encodeURIComponent(painel)}`)
  })
})

describe('a guarda de acesso falha fechada (MAT-40:RF-10, teste 15)', () => {
  const caminhos = [painel, '/moderacao/auditoria', '/moderacao/papeis', conteudo('topico', CONTEUDO.topicoDoAutor)]

  for (const pessoa of ['outro', 'vencido', 'autor', 'semAceite'] as const) {
    it(`${pessoa} não vê nada do painel: só TX-12, sem a navegação e sem nenhuma leitura do painel`, async () => {
      for (const caminho of caminhos) {
        const { moderacao, unmount } = cena(pessoa, caminho)
        const fila = vi.spyOn(moderacao, 'filaDeDenuncias')
        const auditoria = vi.spyOn(moderacao, 'auditoria')
        const papeis = vi.spyOn(moderacao, 'papeis')
        const lerConteudo = vi.spyOn(moderacao, 'lerConteudo')
        expect(await screen.findByText(TX.tx12)).toBeTruthy()
        await semCarregando()
        expect(screen.queryByRole('navigation', { name: COMUM_MODERACAO.painel }), caminho).toBeNull()
        expect(screen.getByRole('link', { name: COMUM_MODERACAO.irParaComunidade }).getAttribute('href')).toBe('/app/comunidade')
        for (const espiao of [fila, auditoria, papeis, lerConteudo]) expect(espiao, caminho).not.toHaveBeenCalled()
        unmount()
      }
    })
  }

  it('o moderador abre a M1 a M4, mas a M5 é só do admin: TX-12, e o link "Papéis" não existe para ele', async () => {
    const { unmount } = cena('moderador', painel)
    await aguardarH1()
    const nav = screen.getByRole('navigation', { name: COMUM_MODERACAO.painel })
    expect(within(nav).queryByRole('link', { name: COMUM_MODERACAO.papeis })).toBeNull()
    unmount()

    const { moderacao } = cena('moderador', '/moderacao/papeis')
    const papeis = vi.spyOn(moderacao, 'papeis')
    expect(await screen.findByText(TX.tx12)).toBeTruthy()
    expect(papeis).not.toHaveBeenCalled()
  })

  it('o admin vê o link "Papéis" e a lista; o admin com a validade vencida perde a M5 e o painel', async () => {
    const { unmount } = cena('admin', painel)
    await aguardarH1()
    expect(within(screen.getByRole('navigation', { name: COMUM_MODERACAO.painel })).getByRole('link', { name: COMUM_MODERACAO.papeis }).getAttribute('href')).toBe('/moderacao/papeis')
    unmount()

    cena('admin', '/moderacao/papeis', (estado) => {
      estado.papeis.find((p) => p.contaId === ELENCO.admin.conta)!.validoAte = new Date(Date.now() - 1000).toISOString()
    })
    expect(await screen.findByText(TX.tx12)).toBeTruthy()
  })

  it('uma leitura que o banco recusa (sem_permissao) leva a TX-12 e a nenhuma outra leitura', async () => {
    const { moderacao } = cena('moderador', painel, (e) => {
      novaDenuncia(e)
    })
    simularFalhaModeracao(moderacao, 'filaDeDenuncias', 'sem_permissao')
    expect(await screen.findByText(TX.tx12)).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: COMUM_MODERACAO.painel })).toBeNull()
  })
})

describe('M1: a fila (MAT-40:RF-03)', () => {
  it('ordena por grupo de prioridade e depois pela data; cada linha traz prioridade, motivo, alvo, texto, estado e data', async () => {
    let ids: string[] = []
    cena('moderador', painel, (estado) => {
      const a = novaDenuncia(estado, { motivo: 'outro', criadaEm: '2026-11-01T10:00:00.000Z' })
      const b = novaDenuncia(estado, { motivo: 'ataque_assedio', criadaEm: '2026-11-02T10:00:00.000Z', texto: 'Texto da denúncia' })
      const c = novaDenuncia(estado, { motivo: 'risco_autolesao', criadaEm: '2026-11-03T10:00:00.000Z' })
      ids = [c.id, b.id, a.id]
    })
    await aguardarH1(NOMES_DAS_TELAS.fila)
    await waitFor(() => expect(hrefsDaFila()).toEqual(ids.map(denuncia)))

    const linhas = within(screen.getByRole('region', { name: FILA.lista })).getAllByRole('link')
    expect(linhas[0].textContent).toContain(FILA.prioridade(1))
    expect(linhas[0].textContent).toContain(ROTULO_MOTIVO.risco_autolesao)
    expect(linhas[0].textContent).toContain(COMUM_MODERACAO.tipoDoAlvo.topico)
    expect(linhas[0].textContent).toContain(COMUM_MODERACAO.semTexto)
    expect(linhas[1].textContent).toContain('Texto da denúncia')
    expect(linhas[0].textContent).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
  })

  it('o texto passa de 120 caracteres: a linha mostra só os 120 primeiros e as reticências', async () => {
    cena('moderador', painel, (estado) => {
      novaDenuncia(estado, { texto: 'x'.repeat(200) })
    })
    await aguardarH1()
    const linha = within(screen.getByRole('region', { name: FILA.lista })).getAllByRole('link')[0]
    expect(linha.textContent).toContain(`${'x'.repeat(120)}…`)
    expect(linha.textContent).not.toContain('x'.repeat(121))
  })

  it('o filtro padrão são os estados abertos; marcar um estado o inclui; o motivo filtra; sem resultado, TX-13', async () => {
    let procedente = ''
    cena('moderador', painel, (estado) => {
      novaDenuncia(estado, { motivo: 'outro' })
      novaDenuncia(estado, { motivo: 'spam_venda', estado: 'em_analise' })
      procedente = novaDenuncia(estado, { motivo: 'outro', estado: 'procedente', decididaEm: '2026-11-04T10:00:00.000Z' }).id
    })
    await aguardarH1()
    await waitFor(() => expect(hrefsDaFila()).toHaveLength(2))
    expect(hrefsDaFila()).not.toContain(denuncia(procedente))

    fireEvent.click(screen.getByLabelText(FILA.estados.procedente))
    await waitFor(() => expect(hrefsDaFila()).toHaveLength(3))
    expect(hrefsDaFila()).toContain(denuncia(procedente))

    fireEvent.change(screen.getByLabelText(FILA.filtroMotivo), { target: { value: 'spam_venda' } })
    await waitFor(() => expect(hrefsDaFila()).toHaveLength(1))

    fireEvent.change(screen.getByLabelText(FILA.filtroMotivo), { target: { value: 'risco_autolesao' } })
    expect(await screen.findByText(TX.tx13)).toBeTruthy()
  })

  it('55 denúncias: 50 por página, "Carregar mais" traz o resto sem repetir', async () => {
    cena('moderador', painel, (estado) => {
      for (let n = 0; n < 55; n++) novaDenuncia(estado)
    })
    await aguardarH1()
    await waitFor(() => expect(hrefsDaFila()).toHaveLength(50))
    fireEvent.click(botao(FILA.carregarMais))
    await waitFor(() => expect(hrefsDaFila()).toHaveLength(55))
    expect(new Set(hrefsDaFila()).size).toBe(55)
    expect(screen.queryByRole('button', { name: FILA.carregarMais })).toBeNull()
  })

  it('a leitura que devolve rede mostra a frase `rede`; "Tentar de novo" repete só a leitura da fila', async () => {
    const { moderacao } = cena('moderador', painel, (estado) => {
      novaDenuncia(estado)
    })
    simularFalhaModeracao(moderacao, 'filaDeDenuncias', 'rede')
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO_COMUNIDADE.rede)
    expect(screen.queryByText(TX.tx13)).toBeNull()
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    await waitFor(() => expect(hrefsDaFila()).toHaveLength(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('um erro que não é rede mostra a frase `desconhecido` com o código, nunca a fila vazia', async () => {
    const { moderacao } = cena('moderador', painel, (estado) => {
      novaDenuncia(estado)
    })
    simularFalhaModeracao(moderacao, 'filaDeDenuncias', {
      classe: 'desconhecido',
      chave: 'desconhecido',
      codigo: '22P02',
      mensagemOriginal: 'invalid input',
    })
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('(22P02)')
    expect(screen.queryByText(TX.tx13)).toBeNull()
  })

  it('o esqueleto só aparece depois de 300 ms; antes disso, nada novo na tela', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const estado = criarElenco()
    novaDenuncia(estado)
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.moderador.conta)
    const moderacao = criarDadosModeracaoMemoria(estado, ELENCO.moderador.conta)
    const original = moderacao.filaDeDenuncias.bind(moderacao)
    let liberar: () => void = () => undefined
    const travada = new Promise<void>((resolver) => {
      liberar = resolver
    })
    moderacao.filaDeDenuncias = async (...argumentos) => {
      await travada
      return original(...argumentos)
    }
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.moderador.email)
    renderizarModeracao(painel, { contas, comunidade, moderacao })

    // A lista só monta depois da sessão e da guarda (promessas); o relógio da leitura conta daí.
    for (let volta = 0; volta < 200 && !screen.queryByRole('region', { name: FILA.lista }); volta++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
    }
    const lista = screen.getByRole('region', { name: FILA.lista })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(290)
    })
    expect(lista.querySelector('[data-esqueleto]')).toBeNull()
    expect(lista.getAttribute('aria-busy')).toBe('true')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })
    expect(lista.querySelector('[data-esqueleto]')).not.toBeNull()
    await act(async () => {
      liberar()
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(lista.querySelector('[data-esqueleto]')).toBeNull()
    expect(hrefsDaFila()).toHaveLength(1)
  })
})

describe('M2: a denúncia e as ações (MAT-40:RF-04 e RF-05)', () => {
  it('mostra a denúncia, o conteúdo, o autor e as ações: ocultar e remover (o conteúdo é visível) e as três decisões', async () => {
    let id = ''
    cena('moderador', painel, (estado) => {
      id = novaDenuncia(estado, { texto: 'Isto me incomodou', motivo: 'ataque_assedio' }).id
    })
    await aguardarH1(NOMES_DAS_TELAS.fila)
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.ataque_assedio) }))
    await aguardarH1(NOMES_DAS_TELAS.denuncia)
    expect(id).not.toBe('')
    expect(await screen.findByText('Isto me incomodou')).toBeTruthy()
    expect(screen.getByText(FILA.prioridade(2))).toBeTruthy()
    for (const nome of [ACAO_NO_CONTEUDO.oculto.botao, ACAO_NO_CONTEUDO.removido.botao, DECISAO.em_analise.botao, DECISAO.procedente.botao, DECISAO.improcedente.botao]) {
      expect(botao(nome), nome).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: ACAO_NO_CONTEUDO.visivel.botao })).toBeNull()
    // O apelido aparece na linha do conteúdo e no cartão "Perfil do autor".
    expect(screen.getAllByText('autor_do_forum')).toHaveLength(2)
  })

  it('ocultar: a caixa pede o motivo (1 a 300), nada vai ao banco sem ele; com ele, TX-14, a auditoria e o conteúdo oculto', async () => {
    let id = ''
    const { moderacao } = cena('moderador', painel, (e) => {
      id = novaDenuncia(e).id
    })
    await aguardarH1()
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.outro) }))
    await aguardarH1(NOMES_DAS_TELAS.denuncia)
    const moderar = vi.spyOn(moderacao, 'moderarConteudo')
    await screen.findByRole('button', { name: ACAO_NO_CONTEUDO.oculto.botao })

    const caixa = await abrirCaixa(ACAO_NO_CONTEUDO.oculto.botao, ACAO_NO_CONTEUDO.oculto.titulo)
    fireEvent.click(within(caixa).getByRole('button', { name: ACAO_NO_CONTEUDO.oculto.confirmar }))
    expect(within(caixa).getByText(COMUM_MODERACAO.erroMotivo)).toBeTruthy()
    expect(moderar).not.toHaveBeenCalled()

    confirmarNaCaixa(caixa, 'Motivo da ocultação', ACAO_NO_CONTEUDO.oculto.confirmar)
    await statusDiz(TX.tx14)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(moderar).toHaveBeenCalledTimes(1)
    expect(moderar).toHaveBeenCalledWith({ tipo: 'topico', id: CONTEUDO.topicoDoAutor }, 'oculto', 'Motivo da ocultação', id)
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
  })

  it('o estado do conteúdo muda na memória, a auditoria tem a linha, e o botão "Ocultar" dá lugar a "Restaurar"', async () => {
    const { estado } = cena('moderador', painel, (e) => {
      novaDenuncia(e)
    })
    await aguardarH1()
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.outro) }))
    await screen.findByRole('button', { name: ACAO_NO_CONTEUDO.oculto.botao })
    const caixa = await abrirCaixa(ACAO_NO_CONTEUDO.oculto.botao, ACAO_NO_CONTEUDO.oculto.titulo)
    confirmarNaCaixa(caixa, 'Ocultar por segurança', ACAO_NO_CONTEUDO.oculto.confirmar)
    await statusDiz(TX.tx14)

    expect(estado.topicos.find((t) => t.id === CONTEUDO.topicoDoAutor)!.estado).toBe('oculto')
    expect(estado.auditoria).toHaveLength(1)
    expect(estado.auditoria[0]).toMatchObject({ acao: 'ocultar', alvoTipo: 'topico', alvoId: CONTEUDO.topicoDoAutor, motivo: 'Ocultar por segurança', estadoAnterior: 'visivel', estadoNovo: 'oculto' })
    expect(await screen.findByRole('button', { name: ACAO_NO_CONTEUDO.visivel.botao })).toBeTruthy()
    expect(screen.queryByRole('button', { name: ACAO_NO_CONTEUDO.oculto.botao })).toBeNull()
  })

  it('"Em análise" só aparece com a denúncia aberta, e some depois de usada', async () => {
    cena('moderador', painel, (e) => {
      novaDenuncia(e)
    })
    await aguardarH1()
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.outro) }))
    await screen.findByRole('button', { name: DECISAO.em_analise.botao })
    const caixa = await abrirCaixa(DECISAO.em_analise.botao, DECISAO.em_analise.titulo)
    confirmarNaCaixa(caixa, 'Vou ler com calma', DECISAO.em_analise.confirmar)
    await statusDiz(TX.tx14)
    expect(screen.queryByRole('button', { name: DECISAO.em_analise.botao })).toBeNull()
    expect(botao(DECISAO.procedente.botao)).toBeTruthy()
  })

  it('a decisão final (procedente): TX-14, a data da decisão no lugar dos botões e a linha de auditoria com a denúncia', async () => {
    let id = ''
    const { estado } = cena('moderador', painel, (e) => {
      id = novaDenuncia(e).id
    })
    await aguardarH1()
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.outro) }))
    await screen.findByRole('button', { name: DECISAO.procedente.botao })
    const caixa = await abrirCaixa(DECISAO.procedente.botao, DECISAO.procedente.titulo)
    confirmarNaCaixa(caixa, 'A denúncia procede', DECISAO.procedente.confirmar)
    await statusDiz(TX.tx14)

    expect(estado.denuncias.find((d) => d.id === id)!.estado).toBe('procedente')
    expect(await screen.findByText(/^Decidida em \d{2}\/\d{2}\/\d{4}/)).toBeTruthy()
    for (const nome of [DECISAO.procedente.botao, DECISAO.improcedente.botao, DECISAO.em_analise.botao]) {
      expect(screen.queryByRole('button', { name: nome }), nome).toBeNull()
    }
    expect(estado.auditoria.at(-1)).toMatchObject({ acao: 'decidir_denuncia', alvoTipo: 'denuncia', alvoId: id, estadoNovo: 'procedente' })
  })

  it('uma denúncia contra um perfil mostra o perfil e só as decisões; um alvo excluído mostra TX-28', async () => {
    let perfil = ''
    let excluido = ''
    cena('moderador', painel, (e) => {
      perfil = novaDenuncia(e, { topicoId: null, perfilId: ELENCO.autor.perfil, motivo: 'dados_pessoais' }).id
      excluido = novaDenuncia(e, { topicoId: null, motivo: 'spam_venda' }).id
    })
    await aguardarH1()
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.dados_pessoais) }))
    await aguardarH1(NOMES_DAS_TELAS.denuncia)
    await screen.findByRole('button', { name: DECISAO.procedente.botao })
    expect(screen.getAllByText('autor_do_forum').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: ACAO_NO_CONTEUDO.oculto.botao })).toBeNull()
    expect(perfil).not.toBe('')

    fireEvent.click(within(document.querySelector('main')!).getByRole('link', { name: COMUM_COMUNIDADE.voltar }))
    await aguardarH1(NOMES_DAS_TELAS.fila)
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.spam_venda) }))
    expect(await screen.findByText(TX.tx28)).toBeTruthy()
    expect(excluido).not.toBe('')
  })

  it('conteúdo do próprio moderador: no lugar das ações, a frase do conflito de interesse (M2 e M3)', async () => {
    const { unmount } = cena('moderador', conteudo('topico', CONTEUDO.topicoDoModerador))
    await aguardarH1(NOMES_DAS_TELAS.conteudo)
    expect(await screen.findByText(TEXTOS_ERRO_MODERACAO.conflito_de_interesse)).toBeTruthy()
    expect(screen.queryByRole('button', { name: ACAO_NO_CONTEUDO.oculto.botao })).toBeNull()
    unmount()

    let id = ''
    cena('moderador', painel, (e) => {
      id = novaDenuncia(e, { topicoId: CONTEUDO.topicoDoModerador }).id
    })
    await aguardarH1()
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.outro) }))
    expect(await screen.findByText(TEXTOS_ERRO_MODERACAO.conflito_de_interesse)).toBeTruthy()
    expect(id).not.toBe('')
  })

  it('denúncia que a própria pessoa abriu: o banco recusa a decisão, e a tela mostra a frase do conflito', async () => {
    cena('moderador', painel, (e) => {
      novaDenuncia(e, { denuncianteId: ELENCO.moderador.conta })
    })
    await aguardarH1()
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.outro) }))
    await screen.findByRole('button', { name: DECISAO.procedente.botao })
    const caixa = await abrirCaixa(DECISAO.procedente.botao, DECISAO.procedente.titulo)
    confirmarNaCaixa(caixa, 'Tentativa', DECISAO.procedente.confirmar)
    const alerta = await within(screen.getByRole('dialog')).findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO_MODERACAO.conflito_de_interesse)
  })

  it('perder o papel no meio da ação (sem_papel): a tela passa a TX-12 com a frase do acesso encerrado', async () => {
    const { moderacao } = cena('moderador', painel, (e) => {
      novaDenuncia(e)
    })
    await aguardarH1()
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.outro) }))
    await screen.findByRole('button', { name: ACAO_NO_CONTEUDO.oculto.botao })
    simularFalhaModeracao(moderacao, 'moderarConteudo', 'sem_papel')
    const caixa = await abrirCaixa(ACAO_NO_CONTEUDO.oculto.botao, ACAO_NO_CONTEUDO.oculto.titulo)
    confirmarNaCaixa(caixa, 'Motivo', ACAO_NO_CONTEUDO.oculto.confirmar)
    expect(await screen.findByText(TX.tx12)).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe(TEXTOS_ERRO_MODERACAO.sem_papel)
    expect(screen.queryByRole('navigation', { name: COMUM_MODERACAO.painel })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('um id que não é UUID (ou um tipo que não existe) é "não encontrado", sem chamar o banco', async () => {
    for (const caminho of [denuncia('abc'), conteudo('topico', 'abc'), conteudo('perfil', CONTEUDO.topicoDoAutor)]) {
      const { moderacao, unmount } = cena('moderador', caminho)
      const lerD = vi.spyOn(moderacao, 'lerDenuncia')
      const lerC = vi.spyOn(moderacao, 'lerConteudo')
      expect(await screen.findByText(NAO_ENCONTRADO.frase), caminho).toBeTruthy()
      expect(screen.getByRole('link', { name: NAO_ENCONTRADO.link }).getAttribute('href')).toBe(painel)
      expect(lerD).not.toHaveBeenCalled()
      expect(lerC).not.toHaveBeenCalled()
      unmount()
    }
  })

  it('um UUID que o banco não devolve é "não encontrado"', async () => {
    cena('moderador', denuncia(idDaDenuncia(999_999)))
    expect(await screen.findByText(NAO_ENCONTRADO.frase)).toBeTruthy()
    expect(TX_COMUNIDADE.tx11).toBe(NAO_ENCONTRADO.frase)
  })
})

describe('envio com resultado incerto (MAT-40:RF-19, teste 6)', () => {
  async function ateACaixa() {
    await aguardarH1()
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.outro) }))
    await screen.findByRole('button', { name: ACAO_NO_CONTEUDO.oculto.botao })
    return await abrirCaixa(ACAO_NO_CONTEUDO.oculto.botao, ACAO_NO_CONTEUDO.oculto.titulo)
  }

  it('achou: a resposta se perdeu depois de gravar, e a tela segue como feita, com TX-32 (sem duplicar a auditoria)', async () => {
    const { estado, moderacao } = cena('moderador', painel, (e) => {
      novaDenuncia(e)
    })
    const caixa = await ateACaixa()
    simularRespostaPerdidaModeracao(moderacao, 'moderarConteudo')
    const moderar = vi.spyOn(moderacao, 'moderarConteudo')
    confirmarNaCaixa(caixa, 'Ocultar mesmo', ACAO_NO_CONTEUDO.oculto.confirmar)
    await statusDiz(TX.tx32)
    expect(moderar).toHaveBeenCalledTimes(1)
    expect(estado.auditoria).toHaveLength(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('não achou: TX-23 e "Tentar de novo", que reenvia; o motivo continua na caixa', async () => {
    const { estado, moderacao } = cena('moderador', painel, (e) => {
      novaDenuncia(e)
    })
    const caixa = await ateACaixa()
    simularFalhaModeracao(moderacao, 'moderarConteudo', 'rede')
    confirmarNaCaixa(caixa, 'Segunda tentativa', ACAO_NO_CONTEUDO.oculto.confirmar)
    const alerta = await within(caixa).findByRole('alert')
    expect(alerta.textContent).toContain(TX_COMUNIDADE.tx23)
    expect(estado.auditoria).toHaveLength(0)
    expect((within(caixa).getByLabelText(/^Motivo/) as HTMLTextAreaElement).value).toBe('Segunda tentativa')
    await waitFor(() => expect(document.activeElement).toBe(alerta))

    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    await statusDiz(TX.tx14)
    expect(estado.auditoria).toHaveLength(1)
  })

  it('a conferência também dá rede: TX-24 e "Conferir", que repete só a conferência (a escrita não se repete)', async () => {
    const { estado, moderacao } = cena('moderador', painel, (e) => {
      novaDenuncia(e)
    })
    const caixa = await ateACaixa()
    const moderar = vi.spyOn(moderacao, 'moderarConteudo')
    simularRespostaPerdidaModeracao(moderacao, 'moderarConteudo')
    simularFalhaModeracao(moderacao, 'lerConteudo', 'rede')
    confirmarNaCaixa(caixa, 'Conferir depois', ACAO_NO_CONTEUDO.oculto.confirmar)
    const alerta = await within(caixa).findByRole('alert')
    expect(alerta.textContent).toContain(TX_COMUNIDADE.tx24)

    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.conferir }))
    await statusDiz(TX.tx32)
    expect(moderar).toHaveBeenCalledTimes(1)
    expect(estado.auditoria).toHaveLength(1)
  })

  it('o segundo clique em "Ocultar" enquanto envia não chama o banco de novo', async () => {
    const { moderacao } = cena('moderador', painel, (e) => {
      novaDenuncia(e)
    })
    const caixa = await ateACaixa()
    const moderar = vi.spyOn(moderacao, 'moderarConteudo')
    fireEvent.change(within(caixa).getByLabelText(/^Motivo/), { target: { value: 'Duas vezes' } })
    const confirmar = within(caixa).getByRole('button', { name: ACAO_NO_CONTEUDO.oculto.confirmar })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)
    await statusDiz(TX.tx14)
    expect(moderar).toHaveBeenCalledTimes(1)
  })

  it('a decisão com envio incerto também confere: a denúncia já está decidida, TX-32', async () => {
    const { estado, moderacao } = cena('moderador', painel, (e) => {
      novaDenuncia(e)
    })
    await aguardarH1()
    fireEvent.click(await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.outro) }))
    await screen.findByRole('button', { name: DECISAO.improcedente.botao })
    const caixa = await abrirCaixa(DECISAO.improcedente.botao, DECISAO.improcedente.titulo)
    simularRespostaPerdidaModeracao(moderacao, 'decidirDenuncia')
    confirmarNaCaixa(caixa, 'Sem fundamento', DECISAO.improcedente.confirmar)
    await statusDiz(TX.tx32)
    expect(estado.denuncias[0].estado).toBe('improcedente')
  })
})

describe('M3: um conteúdo (MAT-40:RF-06)', () => {
  it('mostra um tópico oculto e um removido (a moderação lê tudo), com o motivo da moderação e as ações que mudam o estado', async () => {
    const { unmount } = cena('moderador', conteudo('topico', CONTEUDO.topicoOculto))
    await aguardarH1(NOMES_DAS_TELAS.conteudo)
    expect(await screen.findByRole('button', { name: ACAO_NO_CONTEUDO.visivel.botao })).toBeTruthy()
    expect(botao(ACAO_NO_CONTEUDO.removido.botao)).toBeTruthy()
    expect(screen.queryByRole('button', { name: ACAO_NO_CONTEUDO.oculto.botao })).toBeNull()
    unmount()

    cena('moderador', conteudo('topico', CONTEUDO.topicoRemovido))
    expect(await screen.findByRole('button', { name: ACAO_NO_CONTEUDO.visivel.botao })).toBeTruthy()
    expect(botao(ACAO_NO_CONTEUDO.oculto.botao)).toBeTruthy()
  })

  it('restaurar: a caixa pede o motivo, o conteúdo volta a ser visível e a Comunidade passa a mostrá-lo', async () => {
    const { estado } = cena('moderador', conteudo('topico', CONTEUDO.topicoOculto))
    await aguardarH1()
    const caixa = await abrirCaixa(ACAO_NO_CONTEUDO.visivel.botao, ACAO_NO_CONTEUDO.visivel.titulo)
    confirmarNaCaixa(caixa, 'Foi um engano', ACAO_NO_CONTEUDO.visivel.confirmar)
    await statusDiz(TX.tx14)
    expect(estado.topicos.find((t) => t.id === CONTEUDO.topicoOculto)!.estado).toBe('visivel')
    expect(estado.auditoria.at(-1)).toMatchObject({ acao: 'restaurar', denunciaId: null })
  })

  it('uma resposta: mostra o tópico dela, o autor e as ações', async () => {
    cena('moderador', conteudo('resposta', CONTEUDO.respostaDoOutro))
    await aguardarH1(NOMES_DAS_TELAS.conteudo)
    expect((await screen.findAllByText('Resposta do outro')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('outra_pessoa').length).toBeGreaterThan(0)
    expect(botao(ACAO_NO_CONTEUDO.oculto.botao)).toBeTruthy()
  })

  it('o histórico do perfil: sem outros conteúdos, TX-29; com eles, a lista (sem repetir o conteúdo aberto)', async () => {
    // O moderador só publicou um tópico: o admin (sem perfil, sem conflito) não vê nada a mais no histórico dele.
    const { unmount } = cena('admin', conteudo('topico', CONTEUDO.topicoDoModerador))
    await aguardarH1()
    expect(await screen.findByText(TX.tx29)).toBeTruthy()
    unmount()

    cena('moderador', conteudo('topico', CONTEUDO.topicoDoOutro))
    await aguardarH1()
    const links = (await screen.findAllByRole('link')).map((a) => a.getAttribute('href'))
    expect(links).toContain(conteudo('resposta', CONTEUDO.respostaDoOutro))
    expect(links).not.toContain(conteudo('topico', CONTEUDO.topicoDoOutro))
    expect(screen.queryByText(TX.tx29)).toBeNull()
  })
})

describe('M4: a auditoria (MAT-40:RF-07)', () => {
  async function aplicarOcultar(estado: EstadoComunidade, quem: PessoaDoElenco) {
    const dados = criarDadosModeracaoMemoria(estado, ELENCO[quem].conta)
    const feito = await dados.moderarConteudo({ tipo: 'topico', id: CONTEUDO.topicoDoAutor }, 'oculto', 'Motivo da linha', null)
    expect(feito.ok).toBe(true)
  }

  it('sem ações registradas, TX-20', async () => {
    cena('moderador', '/moderacao/auditoria')
    await aguardarH1(NOMES_DAS_TELAS.auditoria)
    expect(await screen.findByText(TX.tx20)).toBeTruthy()
  })

  it('cada linha: a ação, quem agiu ("Equipe · " e 8 caracteres, ou "Você"), o link ao alvo, os estados, o motivo e a data', async () => {
    const estado = criarElenco()
    await aplicarOcultar(estado, 'moderador')
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.admin.conta)
    const moderacao = criarDadosModeracaoMemoria(estado, ELENCO.admin.conta)
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.admin.email)
    const { unmount } = renderizarModeracao('/moderacao/auditoria', { contas, comunidade, moderacao })

    await aguardarH1(NOMES_DAS_TELAS.auditoria)
    const linha = (await screen.findByText(AUDITORIA.acao.ocultar)).closest('li')!
    expect(within(linha).getByText(COMUM_MODERACAO.equipe(ELENCO.moderador.conta.slice(0, 8)))).toBeTruthy()
    expect(within(linha).getByText(AUDITORIA.mudanca('Visível', TX_COMUNIDADE.tx07))).toBeTruthy()
    expect(within(linha).getByText(COMUM_COMUNIDADE.motivoDaModeracao('Motivo da linha'))).toBeTruthy()
    expect(within(linha).getByRole('link', { name: AUDITORIA.abrirConteudo(AUDITORIA.alvoConteudo.topico) }).getAttribute('href')).toBe(
      conteudo('topico', CONTEUDO.topicoDoAutor),
    )
    expect(within(linha).getByText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)).toBeTruthy()
    unmount()

    // A mesma linha, vista por quem agiu: "Você".
    const comunidade2 = criarDadosComunidadeMemoria(estado, ELENCO.moderador.conta)
    const moderacao2 = criarDadosModeracaoMemoria(estado, ELENCO.moderador.conta)
    const contas2 = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas2.sessaoParaTeste(ELENCO.moderador.email)
    renderizarModeracao('/moderacao/auditoria', { contas: contas2, comunidade: comunidade2, moderacao: moderacao2 })
    const linha2 = (await screen.findByText(AUDITORIA.acao.ocultar)).closest('li')!
    expect(within(linha2).getByText(COMUM_MODERACAO.voce)).toBeTruthy()
  })
})

describe('M5: os papéis (MAT-40:RF-08, só o admin)', () => {
  const linhaDe = async (conta: string) => (await screen.findByText(conta)).closest('li')!
  // A navegação do painel também é uma lista: a dos papéis é a que está na seção "Papéis da plataforma".
  const listaDePapeis = async () => within(await screen.findByRole('region', { name: PAPEIS.lista })).findByRole('list')

  it('lista os papéis com a situação e a validade; a própria linha diz "Você"; TX-15 está na tela', async () => {
    cena('admin', '/moderacao/papeis')
    await aguardarH1(NOMES_DAS_TELAS.papeis)
    const lista = await listaDePapeis()
    expect(within(lista).getAllByRole('listitem')).toHaveLength(3)
    const doModerador = await linhaDe(ELENCO.moderador.conta)
    expect(within(doModerador).getByText(PAPEIS.vigente)).toBeTruthy()
    expect(within(doModerador).getByText(COMUM_MODERACAO.semValidade)).toBeTruthy()
    const doVencido = await linhaDe(ELENCO.vencido.conta)
    expect(within(doVencido).getByText(PAPEIS.vencido)).toBeTruthy()
    expect(screen.getAllByText(COMUM_MODERACAO.voce).length).toBeGreaterThan(0)
    expect(screen.getAllByText(TX.tx15)).toHaveLength(1)
  })

  it('copiar o id: com a área de transferência, copia o id inteiro e confirma; sem ela, pede para copiar à mão', async () => {
    const escrever = vi.fn(() => Promise.resolve())
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: escrever }, configurable: true })
    cena('admin', '/moderacao/papeis')
    await aguardarH1()
    const doModerador = await linhaDe(ELENCO.moderador.conta)
    fireEvent.click(within(doModerador).getByRole('button', { name: PAPEIS.copiarId }))
    await waitFor(() => expect(escrever).toHaveBeenCalledWith(ELENCO.moderador.conta))
    expect(await within(doModerador).findByText(PAPEIS.copiado)).toBeTruthy()

    Object.defineProperty(window.navigator, 'clipboard', { value: undefined, configurable: true })
    const doVencido = await linhaDe(ELENCO.vencido.conta)
    fireEvent.click(within(doVencido).getByRole('button', { name: PAPEIS.copiarId }))
    expect(await within(doVencido).findByText(PAPEIS.copieManualmente)).toBeTruthy()
  })

  it('conceder com um id que não é UUID: a mensagem no campo, sem chamar o banco', async () => {
    const { moderacao } = cena('admin', '/moderacao/papeis')
    const conceder = vi.spyOn(moderacao, 'concederPapel')
    await aguardarH1()
    await listaDePapeis()
    fireEvent.change(screen.getByLabelText(PAPEIS.campoConta), { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: 'Motivo' } })
    fireEvent.click(botao(PAPEIS.conceder))
    expect(await screen.findByText(PAPEIS.erroConta)).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText(PAPEIS.campoConta))
    expect(conceder).not.toHaveBeenCalled()
  })

  it('conceder a uma conta que existe: TX-14, a nova linha na lista, o campo limpo e a auditoria', async () => {
    const { estado, moderacao } = cena('admin', '/moderacao/papeis')
    const conceder = vi.spyOn(moderacao, 'concederPapel')
    await aguardarH1()
    await listaDePapeis()
    fireEvent.change(screen.getByLabelText(PAPEIS.campoConta), { target: { value: ELENCO.outro.conta } })
    fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: 'Entra na equipe' } })
    fireEvent.click(botao(PAPEIS.conceder))
    await statusDiz(TX.tx14)
    expect(conceder).toHaveBeenCalledWith(ELENCO.outro.conta, 'moderador', 'Entra na equipe', null)
    expect(estado.papeis.some((p) => p.contaId === ELENCO.outro.conta && p.papel === 'moderador')).toBe(true)
    expect(await linhaDe(ELENCO.outro.conta)).toBeTruthy()
    expect((screen.getByLabelText(PAPEIS.campoConta) as HTMLInputElement).value).toBe('')
    expect(estado.auditoria.at(-1)).toMatchObject({ acao: 'conceder_papel', alvoId: ELENCO.outro.conta })
  })

  it('conta que não existe: a frase do catálogo; validade no passado: a mensagem no campo, sem chamar o banco', async () => {
    const { moderacao } = cena('admin', '/moderacao/papeis')
    const conceder = vi.spyOn(moderacao, 'concederPapel')
    await aguardarH1()
    await listaDePapeis()
    fireEvent.change(screen.getByLabelText(PAPEIS.campoConta), { target: { value: 'c0000000-0000-4000-8000-000000009999' } })
    fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: 'Motivo' } })
    fireEvent.click(botao(PAPEIS.conceder))
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO_MODERACAO.conta_inexistente)
    expect(conceder).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByLabelText(PAPEIS.campoConta), { target: { value: ELENCO.outro.conta } })
    fireEvent.change(screen.getByLabelText(PAPEIS.campoValidade), { target: { value: '2020-01-01T10:00' } })
    fireEvent.click(botao(PAPEIS.conceder))
    expect(await screen.findByText(PAPEIS.erroValidadePassada)).toBeTruthy()
    expect(conceder).toHaveBeenCalledTimes(1)
  })

  it('renovar: preenche o id e o papel e leva o foco ao motivo; conceder de novo deixa o papel vigente e sem validade', async () => {
    const { estado } = cena('admin', '/moderacao/papeis')
    await aguardarH1()
    const doVencido = await linhaDe(ELENCO.vencido.conta)
    fireEvent.click(within(doVencido).getByRole('button', { name: PAPEIS.renovar }))
    expect((screen.getByLabelText(PAPEIS.campoConta) as HTMLInputElement).value).toBe(ELENCO.vencido.conta)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/^Motivo/)))
    fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: 'Volta à equipe' } })
    fireEvent.click(botao(PAPEIS.conceder))
    await statusDiz(TX.tx14)
    expect(estado.papeis.find((p) => p.contaId === ELENCO.vencido.conta)!.validoAte).toBeNull()
    const renovada = await linhaDe(ELENCO.vencido.conta)
    expect(within(renovada).getByText(PAPEIS.vigente)).toBeTruthy()
  })

  it('revogar: a caixa traz TX-15 e o motivo; o papel some da lista, TX-14 e a auditoria', async () => {
    const { estado } = cena('admin', '/moderacao/papeis')
    await aguardarH1()
    const doVencido = await linhaDe(ELENCO.vencido.conta)
    fireEvent.click(within(doVencido).getByRole('button', { name: PAPEIS.revogar }))
    const caixa = await screen.findByRole('dialog', { name: PAPEIS.revogarTitulo })
    expect(within(caixa).getByText(TX.tx15)).toBeTruthy()
    confirmarNaCaixa(caixa, 'Saiu da equipe', PAPEIS.revogarConfirmar)
    await statusDiz(TX.tx14)
    expect(estado.papeis.some((p) => p.contaId === ELENCO.vencido.conta)).toBe(false)
    await waitFor(() => expect(screen.queryByText(ELENCO.vencido.conta)).toBeNull())
    expect(estado.auditoria.at(-1)).toMatchObject({ acao: 'revogar_papel', alvoId: ELENCO.vencido.conta })
  })

  it('revogar o último admin: a frase `ultimo_admin`, e o papel continua', async () => {
    const { estado } = cena('admin', '/moderacao/papeis')
    await aguardarH1()
    await listaDePapeis()
    const minha = (await screen.findAllByText(COMUM_MODERACAO.voce))[0].closest('li')!
    fireEvent.click(within(minha).getByRole('button', { name: PAPEIS.revogar }))
    const caixa = await screen.findByRole('dialog', { name: PAPEIS.revogarTitulo })
    confirmarNaCaixa(caixa, 'Tentativa', PAPEIS.revogarConfirmar)
    const alerta = await within(caixa).findByRole('alert')
    expect(alerta.textContent).toContain(TEXTOS_ERRO_MODERACAO.ultimo_admin)
    expect(estado.papeis.some((p) => p.contaId === ELENCO.admin.conta && p.papel === 'admin')).toBe(true)
  })

  it('revogar com resposta perdida: a conferência acha o papel já removido, TX-32', async () => {
    const { estado, moderacao } = cena('admin', '/moderacao/papeis')
    await aguardarH1()
    const doVencido = await linhaDe(ELENCO.vencido.conta)
    fireEvent.click(within(doVencido).getByRole('button', { name: PAPEIS.revogar }))
    const caixa = await screen.findByRole('dialog', { name: PAPEIS.revogarTitulo })
    simularRespostaPerdidaModeracao(moderacao, 'revogarPapel')
    confirmarNaCaixa(caixa, 'Resposta perdida', PAPEIS.revogarConfirmar)
    await statusDiz(TX.tx32)
    expect(estado.auditoria.filter((a) => a.acao === 'revogar_papel')).toHaveLength(1)
  })
})

describe('subcaminho e "Voltar" (MAT-40:RF-18, teste 11)', () => {
  it('com o basename /AppMaternidade, todo link interno do painel começa por /AppMaternidade/ (nada escrito à mão)', async () => {
    const todas: Array<[string, PessoaDoElenco]> = [
      [painel, 'moderador'],
      [conteudo('topico', CONTEUDO.topicoDoAutor), 'moderador'],
      ['/moderacao/auditoria', 'moderador'],
      ['/moderacao/papeis', 'admin'],
    ]
    for (const [caminho, pessoa] of todas) {
      const { unmount } = cena(
        pessoa,
        caminho,
        (estado) => {
          novaDenuncia(estado)
        },
        { basename: '/AppMaternidade' },
      )
      await aguardarH1()
      await semCarregando()
      const internos = [...document.querySelectorAll<HTMLAnchorElement>('main a[href]')].map((a) => a.getAttribute('href')!).filter((href) => href.startsWith('/'))
      expect(internos.length, caminho).toBeGreaterThan(0)
      for (const href of internos) expect(href, `${caminho}: ${href}`).toMatch(/^\/AppMaternidade\//)
      unmount()
    }
  })

  it('os links "Voltar" levam à fila; a M1 não tem', async () => {
    const voltar = async (pessoa: PessoaDoElenco, caminho: string, ajustar?: (e: EstadoComunidade) => void) => {
      const { unmount } = cena(pessoa, caminho, ajustar)
      await aguardarH1()
      const link = within(document.querySelector('main')!).queryByRole('link', { name: COMUM_COMUNIDADE.voltar })
      const href = link?.getAttribute('href') ?? null
      unmount()
      return href
    }
    const fixo = idDaDenuncia(555)
    const comDenuncia = (e: EstadoComunidade) => {
      novaDenuncia(e, { id: fixo })
    }
    expect(await voltar('moderador', painel)).toBeNull()
    expect(await voltar('moderador', denuncia(fixo), comDenuncia)).toBe(painel)
    expect(await voltar('moderador', conteudo('topico', CONTEUDO.topicoDoAutor))).toBe(painel)
    expect(await voltar('moderador', '/moderacao/auditoria')).toBe(painel)
    expect(await voltar('admin', '/moderacao/papeis')).toBe(painel)
    expect(await voltar('moderador', denuncia('abc'))).toBe(painel)
  })

  it('o painel não grava nada no navegador: nenhuma tela escreve em localStorage, sessionStorage nem cookie', async () => {
    const antes = { local: window.localStorage.length, sessao: window.sessionStorage.length, cookie: document.cookie }
    const { unmount } = cena('admin', '/moderacao/papeis')
    await aguardarH1()
    unmount()
    expect(window.localStorage.length).toBe(antes.local)
    expect(window.sessionStorage.length).toBe(antes.sessao)
    expect(document.cookie).toBe(antes.cookie)
  })
})

describe('o tema da madrugada e a rede (teste 7)', () => {
  it('as cinco telas abrem na madrugada e nenhuma chama a rede (o `fetch` do teste lança se for chamado)', async () => {
    for (const [caminho, pessoa] of [
      [painel, 'moderador'],
      [conteudo('topico', CONTEUDO.topicoDoAutor), 'moderador'],
      ['/moderacao/auditoria', 'moderador'],
      ['/moderacao/papeis', 'admin'],
    ] as Array<[string, PessoaDoElenco]>) {
      const { unmount } = cena(pessoa, caminho, undefined, { madrugada: true })
      await aguardarH1()
      await semCarregando()
      expect(document.documentElement.getAttribute('data-tema'), caminho).toBe('madrugada')
      unmount()
    }
    expect(fetchProibido).not.toHaveBeenCalled()
  })
})
