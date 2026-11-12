import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMUM_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { FILA, MFA, NOMES_DAS_TELAS, TEXTOS_ERRO_MODERACAO, TX } from '../../conteudo/moderacao.ts'
import { ELENCO, criarElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria, type EstadoComunidade } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import {
  CODIGO_DE_TESTE_MFA,
  criarDadosModeracaoMemoria,
  fatoresDaMemoria,
  prepararMfa,
  simularFalhaModeracao,
} from '../../dados/moderacao.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarModeracao } from './apoio.tsx'

// MAT-40b, teste 14: a verificação em duas etapas do painel, atrás do interruptor `VITE_MODERACAO_MFA`.
// Desligado (o padrão), o painel abre direto e a tela nunca fala com o Auth. Ligado, o painel só abre com a
// sessão em `aal2`: cadastra o app autenticador (QR e chave), confere o código de 6 dígitos e carrega.

process.env.DEBUG_PRINT_LIMIT = '300'

const fetchProibido = vi.fn()

beforeEach(() => {
  fetchProibido.mockClear()
  vi.stubGlobal('fetch', (...argumentos: unknown[]) => {
    fetchProibido(...argumentos)
    throw new Error('o teste chamou a rede')
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  expect(fetchProibido).not.toHaveBeenCalled()
})

function cena(ajustar?: (estado: EstadoComunidade) => void) {
  const estado = criarElenco()
  ajustar?.(estado)
  const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.moderador.conta)
  const moderacao = criarDadosModeracaoMemoria(estado, ELENCO.moderador.conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO.moderador.email)
  const espioes = {
    nivel: vi.spyOn(moderacao, 'nivelDaSessao'),
    fatores: vi.spyOn(moderacao, 'fatores'),
    cadastrar: vi.spyOn(moderacao, 'cadastrarFator'),
    confirmar: vi.spyOn(moderacao, 'confirmarCodigo'),
    fila: vi.spyOn(moderacao, 'filaDeDenuncias'),
  }
  const tela = renderizarModeracao('/moderacao', { contas, comunidade, moderacao })
  return { ...tela, estado, moderacao, espioes }
}

const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const campoDoCodigo = () => screen.getByLabelText(MFA.campoCodigo) as HTMLInputElement
const digitarCodigo = (codigo: string) => fireEvent.change(campoDoCodigo(), { target: { value: codigo } })
const painelAberto = () => screen.findByRole('region', { name: FILA.lista })

describe('o interruptor desligado (o padrão)', () => {
  for (const valor of ['', null] as const) {
    it(`com o valor ${valor === null ? 'ausente' : 'vazio'}, o painel abre direto e a tela não fala com o Auth`, async () => {
      if (valor !== null) vi.stubEnv('VITE_MODERACAO_MFA', valor)
      const { espioes } = cena()
      await painelAberto()
      expect(screen.queryByText(MFA.titulo)).toBeNull()
      for (const espiao of [espioes.nivel, espioes.fatores, espioes.cadastrar, espioes.confirmar]) expect(espiao).not.toHaveBeenCalled()
      await waitFor(() => expect(espioes.fila).toHaveBeenCalled())
    })
  }
})

describe('o interruptor ligado', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_MODERACAO_MFA', 'ligado')
  })

  it('a sessão já em aal2 vai direto ao painel, sem ler os fatores', async () => {
    const { espioes } = cena((estado) => prepararMfa(estado, ELENCO.moderador.conta, { nivel: 'aal2' }))
    await painelAberto()
    expect(espioes.nivel).toHaveBeenCalledTimes(1)
    expect(espioes.fatores).not.toHaveBeenCalled()
    expect(screen.queryByText(MFA.titulo)).toBeNull()
  })

  it('sem fator: pede o cadastro do app autenticador e nenhuma leitura do painel acontece antes do código', async () => {
    const { espioes } = cena()
    expect(await screen.findByRole('heading', { name: MFA.titulo })).toBeTruthy()
    expect(screen.getByText(MFA.frase)).toBeTruthy()
    expect(await screen.findByRole('button', { name: MFA.cadastrar })).toBeTruthy()
    expect(screen.queryByLabelText(MFA.campoCodigo)).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: NOMES_DAS_TELAS.fila })).toBeTruthy()
    expect(espioes.fila).not.toHaveBeenCalled()
  })

  it('cadastrar: mostra o QR (com texto alternativo), a chave com o botão de copiar e o campo do código', async () => {
    const escrever = vi.fn(() => Promise.resolve())
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: escrever }, configurable: true })
    const { estado } = cena()
    fireEvent.click(await screen.findByRole('button', { name: MFA.cadastrar }))
    const qr = (await screen.findByAltText(MFA.altDoQr)) as HTMLImageElement
    expect(qr.getAttribute('src')).toMatch(/^data:image\/png;base64,/)
    expect(screen.getByText(MFA.ouDigite)).toBeTruthy()
    expect(campoDoCodigo()).toBeTruthy()
    expect(fatoresDaMemoria(estado, ELENCO.moderador.conta)).toEqual([expect.objectContaining({ verificado: false })])

    fireEvent.click(botao(MFA.copiarChave))
    await waitFor(() => expect(escrever).toHaveBeenCalledTimes(1))
    expect(await screen.findByText(MFA.chaveCopiada)).toBeTruthy()
  })

  it('um código que não tem 6 dígitos mostra a mensagem do campo e não chama o Auth', async () => {
    const { espioes } = cena()
    fireEvent.click(await screen.findByRole('button', { name: MFA.cadastrar }))
    await screen.findByAltText(MFA.altDoQr)
    for (const invalido of ['', '12345', '1234567', 'abcdef']) {
      digitarCodigo(invalido)
      fireEvent.click(botao(MFA.confirmar))
      expect(await screen.findByText(MFA.erroFormato)).toBeTruthy()
      expect(document.activeElement).toBe(campoDoCodigo())
    }
    expect(espioes.confirmar).not.toHaveBeenCalled()
  })

  it('um código recusado limpa o campo, leva o foco a ele e mostra a frase; o painel continua fechado', async () => {
    const { espioes } = cena()
    fireEvent.click(await screen.findByRole('button', { name: MFA.cadastrar }))
    await screen.findByAltText(MFA.altDoQr)
    digitarCodigo('000000')
    fireEvent.click(botao(MFA.confirmar))
    expect(await screen.findByText(TEXTOS_ERRO_MODERACAO.codigo_invalido)).toBeTruthy()
    expect(campoDoCodigo().value).toBe('')
    await waitFor(() => expect(document.activeElement).toBe(campoDoCodigo()))
    expect(espioes.confirmar).toHaveBeenCalledTimes(1)
    expect(espioes.fila).not.toHaveBeenCalled()
  })

  it('o código certo confirma o fator, a sessão passa a aal2 e o painel carrega', async () => {
    const { estado, espioes } = cena()
    fireEvent.click(await screen.findByRole('button', { name: MFA.cadastrar }))
    await screen.findByAltText(MFA.altDoQr)
    digitarCodigo(CODIGO_DE_TESTE_MFA)
    fireEvent.click(botao(MFA.confirmar))
    await painelAberto()
    expect(espioes.confirmar).toHaveBeenCalledTimes(1)
    expect(fatoresDaMemoria(estado, ELENCO.moderador.conta)).toEqual([expect.objectContaining({ verificado: true })])
    expect(screen.queryByText(MFA.titulo)).toBeNull()
    await waitFor(() => expect(espioes.fila).toHaveBeenCalled())
  })

  it('com um fator já verificado, mostra só o campo do código (sem cadastrar de novo)', async () => {
    const { espioes } = cena((estado) =>
      prepararMfa(estado, ELENCO.moderador.conta, { fatores: [{ id: 'f0000000-0000-4000-8000-000000000001', verificado: true }], nivel: 'aal1' }),
    )
    expect(await screen.findByLabelText(MFA.campoCodigo)).toBeTruthy()
    expect(screen.queryByRole('button', { name: MFA.cadastrar })).toBeNull()
    expect(screen.queryByAltText(MFA.altDoQr)).toBeNull()
    digitarCodigo(CODIGO_DE_TESTE_MFA)
    fireEvent.click(botao(MFA.confirmar))
    await painelAberto()
    expect(espioes.cadastrar).not.toHaveBeenCalled()
  })

  it('mfa_indisponivel na leitura do nível: a frase, sem botão, e o painel fechado', async () => {
    const { moderacao, espioes } = cena()
    simularFalhaModeracao(moderacao, 'nivelDaSessao', 'mfa_indisponivel')
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toBe(TEXTOS_ERRO_MODERACAO.mfa_indisponivel)
    expect(within(alerta).queryByRole('button')).toBeNull()
    expect(espioes.fila).not.toHaveBeenCalled()
  })

  it('rede na leitura do nível: "Tentar de novo" repete só a leitura e segue para o cadastro', async () => {
    const { moderacao } = cena()
    simularFalhaModeracao(moderacao, 'nivelDaSessao', 'rede')
    const alerta = await screen.findByRole('alert')
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    expect(await screen.findByRole('button', { name: MFA.cadastrar })).toBeTruthy()
  })

  it('mfa_indisponivel ao cadastrar: a frase, sem "Tentar de novo"; rede ao cadastrar: com ele, e funciona', async () => {
    const { moderacao, unmount } = cena()
    simularFalhaModeracao(moderacao, 'cadastrarFator', 'mfa_indisponivel')
    fireEvent.click(await screen.findByRole('button', { name: MFA.cadastrar }))
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toBe(TEXTOS_ERRO_MODERACAO.mfa_indisponivel)
    expect(within(alerta).queryByRole('button')).toBeNull()
    unmount()

    const segunda = cena()
    simularFalhaModeracao(segunda.moderacao, 'cadastrarFator', 'rede')
    fireEvent.click(await screen.findByRole('button', { name: MFA.cadastrar }))
    const comRede = await screen.findByRole('alert')
    fireEvent.click(within(comRede).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    expect(await screen.findByAltText(MFA.altDoQr)).toBeTruthy()
  })

  it('rede ao confirmar: o código continua no campo, e "Tentar de novo" confirma de novo', async () => {
    const { moderacao, espioes } = cena()
    fireEvent.click(await screen.findByRole('button', { name: MFA.cadastrar }))
    await screen.findByAltText(MFA.altDoQr)
    simularFalhaModeracao(moderacao, 'confirmarCodigo', 'rede')
    digitarCodigo(CODIGO_DE_TESTE_MFA)
    fireEvent.click(botao(MFA.confirmar))
    const alerta = await screen.findByRole('alert')
    expect(campoDoCodigo().value).toBe(CODIGO_DE_TESTE_MFA)
    fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
    await painelAberto()
    expect(espioes.confirmar).toHaveBeenCalledTimes(2)
  })

  it('quem não tem papel não chega à verificação: TX-12 e nenhuma chamada ao Auth', async () => {
    const estado = criarElenco()
    const comunidade = criarDadosComunidadeMemoria(estado, ELENCO.outro.conta)
    const moderacao = criarDadosModeracaoMemoria(estado, ELENCO.outro.conta)
    const nivel = vi.spyOn(moderacao, 'nivelDaSessao')
    const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
    contas.sessaoParaTeste(ELENCO.outro.email)
    renderizarModeracao('/moderacao', { contas, comunidade, moderacao })
    expect(await screen.findByText(TX.tx12)).toBeTruthy()
    expect(screen.queryByText(MFA.titulo)).toBeNull()
    expect(nivel).not.toHaveBeenCalled()
  })
})
