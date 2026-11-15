import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { simularFalhaRotina, type FixtureRotina } from '../../dados/rotina.memoria.ts'
import type { DetalhesRegistro, TipoRegistro } from '../../dados/rotina.tipos.ts'
import { adiarRotina } from '../../teste/adiado.ts'
import { criarComunidadeDeTeste } from '../../teste/comunidade.fixture.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { criarMundoDeTeste, type OpcoesMundo } from '../../teste/rotina.fixture.ts'

// O botão e o painel do resumo da rotina nos dois compositores (RF12: RF-01, RF-11 a RF-13, RN-02, RN-03), com a
// Comunidade e a rotina em memória isoladas e o relógio de data fixo em 14/11/2026, 12:00. Os textos são os da spec.

const DIA = (dia: number, hora: number, minuto = 0) => new Date(2026, 10, dia, hora, minuto).getTime()
type Reg = [tipo: TipoRegistro, inicio: number, fim: number | null, detalhes?: DetalhesRegistro]

function comRegistros(lista: Reg[]) {
  return (fixture: FixtureRotina): FixtureRotina => {
    const modelo = fixture.registros[0]
    return {
      ...fixture,
      registros: lista.map(([tipo, inicio, fim, detalhes = {}], indice) => ({
        ...modelo,
        id: `a3000000-0000-7000-8000-${String(indice).padStart(12, '0')}`,
        tipo,
        inicio: new Date(inicio).toISOString(),
        fim: fim === null ? null : new Date(fim).toISOString(),
        detalhes,
        nota: null,
        recebidoEm: new Date(fim ?? inicio).toISOString(),
        atualizadoEm: new Date(fim ?? inicio).toISOString(),
        encerradoPor: fim === null ? null : modelo.criadoPor,
      })),
    }
  }
}

/** Hoje: 3 h 30 de sono, 2 mamadas e 3 fraldas. */
const HOJE: Reg[] = [
  ['sono', DIA(14, 2), DIA(14, 5)],
  ['sono', DIA(14, 7), DIA(14, 7, 30)],
  ['mamada', DIA(14, 8), DIA(14, 8, 15)],
  ['mamada', DIA(14, 9), DIA(14, 9, 20)],
  ['fralda', DIA(14, 6), null],
  ['fralda', DIA(14, 8, 30), null],
  ['fralda', DIA(14, 10), null],
]
const BLOCO_DO_SONO = 'Resumo da rotina de hoje até agora:\n- Sono: 3 h 30'
const FRASE_DA_PREVIA =
  'Este texto tem números da rotina do seu bebê. Todas as pessoas que entraram no site vão ver. É uma cópia: mudar a rotina depois não muda o texto publicado.'
const STATUS_DA_INSERCAO = 'Resumo inserido no fim do texto. Você pode mudar ou apagar antes de publicar.'

const ID_DO_ESPACO_SONO = '47000000-0000-4000-8000-0000000000e1'
const TOPICO_DA_JULIANA = '47000000-0000-4000-8000-000000000021'
const RESPOSTA_DA_JULIANA = '47000000-0000-4000-8000-000000000099'

async function cena(caminho: string, opcoes: OpcoesMundo & { registros?: Reg[]; strict?: boolean } = {}) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 14, 12, 0))
  const { registros, strict, ...doMundo } = opcoes
  const mundo = criarMundoDeTeste({ ...doMundo, ...(registros ? { ajustarRotina: comRegistros(registros) } : {}) })
  const adiada = adiarRotina(mundo.rotina)
  const comunidade = criarComunidadeDeTeste(PESSOAS.juliana.id)
  // Uma resposta da própria Juliana no tópico dela, para a edição de resposta.
  const dela = comunidade.estado.perfis.find((perfil) => perfil.contaId === PESSOAS.juliana.id)!
  comunidade.estado.respostas.push({ ...comunidade.estado.respostas[0], id: RESPOSTA_DA_JULIANA, topicoId: TOPICO_DA_JULIANA, autorId: dela.id, corpo: 'Minha resposta antiga', respostaA: null })
  const tela = renderizarRota(caminho, { mundo: { ...mundo, rotina: adiada.dados }, comunidade: comunidade.dados, strict })
  await screen.findByRole('heading', { level: 1 })
  await aguardarCarga()
  return { tela, mundo, adiada, comunidade }
}

const novoTopico = (strict = false) => cena('/app/comunidade/sono/novo', { registros: HOJE, strict })
const paginaDoTopico = (strict = false) => cena(`/app/comunidade/topico/${TOPICO_DA_JULIANA}`, { registros: HOJE, strict })

const botaoDoResumo = () => screen.getByRole('button', { name: 'Incluir resumo da rotina' })
const semBotao = () => screen.queryByRole('button', { name: 'Incluir resumo da rotina' })
const painel = () => screen.getByRole('group', { name: 'Resumo da rotina' })
const noPainel = () => within(painel())
const caixas = () => noPainel().queryAllByRole('checkbox')
const aguardarCaixas = () => waitFor(() => expect(caixas().length).toBeGreaterThan(0))
const campoDoTopico = () => screen.getByLabelText(/Texto do tópico/) as HTMLTextAreaElement
const campoDaResposta = () => screen.getByLabelText('Escreva sua resposta') as HTMLTextAreaElement
const digitar = (campo: HTMLTextAreaElement | HTMLInputElement, texto: string) => fireEvent.change(campo, { target: { value: texto } })
const statusDaPagina = () => document.querySelector('[data-status]')?.textContent
const verPrevia = () => screen.getByRole('button', { name: 'Ver prévia' })
const previaPronta = () => verPrevia().getAttribute('aria-disabled') !== 'true'

/** Abre o painel, marca o sono e insere (os atos 1 a 3 de RF-13). */
async function incluirOSono() {
  fireEvent.click(botaoDoResumo())
  await aguardarCaixas()
  fireEvent.click(noPainel().getByRole('checkbox', { name: 'Sono: 3 h 30' }))
  fireEvent.click(noPainel().getByRole('button', { name: 'Inserir no texto' }))
}

describe('compositor: o botão (RF-01)', () => {
  it('compositor: botão presente no tópico novo e na resposta nova, ausente nas edições e na Rotina; foco no título; segundo clique só foca', async () => {
    const novo = await novoTopico()
    expect(botaoDoResumo().getAttribute('aria-expanded')).toBe('false')
    expect(botaoDoResumo().hasAttribute('aria-controls')).toBe(false)
    fireEvent.click(botaoDoResumo())
    expect(botaoDoResumo().getAttribute('aria-expanded')).toBe('true')
    expect(botaoDoResumo().getAttribute('aria-controls')).toBe(painel().id)
    const titulo = screen.getByRole('heading', { name: 'Resumo da rotina' })
    expect(document.activeElement).toBe(titulo)
    campoDoTopico().focus()
    fireEvent.click(botaoDoResumo())
    expect(screen.getAllByRole('group', { name: 'Resumo da rotina' })).toHaveLength(1)
    expect(document.activeElement).toBe(titulo)
    expect(botaoDoResumo().getAttribute('aria-expanded')).toBe('true')
    novo.tela.unmount()

    const resposta = await paginaDoTopico()
    expect(botaoDoResumo()).toBeTruthy()
    fireEvent.click(botaoDoResumo())
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Resumo da rotina' }))
    // O botão fica logo abaixo do campo da resposta e antes do painel.
    expect(campoDaResposta().compareDocumentPosition(botaoDoResumo()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(botaoDoResumo().compareDocumentPosition(painel()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    resposta.tela.unmount()

    const edicaoDoTopico = await cena(`/app/comunidade/topico/${TOPICO_DA_JULIANA}/editar`, { registros: HOJE })
    expect(screen.getByRole('heading', { level: 1, name: 'Editar tópico' })).toBeTruthy()
    expect(semBotao()).toBeNull()
    edicaoDoTopico.tela.unmount()

    const edicaoDaResposta = await paginaDoTopico()
    fireEvent.click(document.getElementById(`acao-editar-resposta-${RESPOSTA_DA_JULIANA}`)!)
    await screen.findByRole('heading', { name: 'Editar resposta' })
    expect(semBotao()).toBeNull()
    edicaoDaResposta.tela.unmount()

    const rotina = await cena('/app/hoje', { registros: HOJE })
    expect(semBotao()).toBeNull()
    rotina.tela.unmount()
  })
})

describe('compositor: inserir no fim do corpo (RF-11)', () => {
  it('compositor: corpo vazio, cheio, só espaços e os 7 exemplos de fim de corpo do RF-11; foco, cursor no fim e status da página', async () => {
    await novoTopico()
    const exemplos: Array<[string, string]> = [
      ['', ''],
      ['abc', 'abc\n\n'],
      ['abc\n', 'abc\n\n'],
      ['abc\n\n', 'abc\n\n'],
      ['abc\n ', 'abc\n \n'],
      ['abc \n', 'abc \n\n'],
      ['abc\n \n', 'abc\n \n'],
      ['  ', '  \n\n'],
    ]
    for (const [corpo, esperado] of exemplos) {
      digitar(campoDoTopico(), corpo)
      await incluirOSono()
      expect(screen.queryByRole('group', { name: 'Resumo da rotina' })).toBeNull()
      expect(campoDoTopico().value).toBe(`${esperado}${BLOCO_DO_SONO}`)
      expect(document.activeElement).toBe(campoDoTopico())
      expect(campoDoTopico().selectionStart).toBe(campoDoTopico().value.length)
      expect(campoDoTopico().selectionEnd).toBe(campoDoTopico().value.length)
    }
    expect(statusDaPagina()).toBe(STATUS_DA_INSERCAO)
  })

  it('compositor: duas inserções dão dois blocos, e o status da página também aparece na resposta', async () => {
    await paginaDoTopico()
    digitar(campoDaResposta(), 'Oi')
    await incluirOSono()
    await incluirOSono()
    expect(campoDaResposta().value).toBe(`Oi\n\n${BLOCO_DO_SONO}\n\n${BLOCO_DO_SONO}`)
    expect(document.activeElement).toBe(campoDaResposta())
    expect(statusDaPagina()).toBe(STATUS_DA_INSERCAO)
  })
})

describe('compositor: o bloco é texto comum, com os limites de hoje (RF-12)', () => {
  it('compositor: resposta com 1990 + bloco passa de 2000, sem corte, com Ver prévia inativo; editável; 2000 exatos, +1 e emoji', async () => {
    await paginaDoTopico()
    digitar(campoDaResposta(), 'x'.repeat(1990))
    await incluirOSono()
    const completo = `${'x'.repeat(1990)}\n\n${BLOCO_DO_SONO}`
    expect(campoDaResposta().value).toBe(completo)
    expect(completo.length).toBeGreaterThan(2000)
    expect(screen.getByText('A resposta precisa ter de 1 a 2000 caracteres.')).toBeTruthy()
    expect(previaPronta()).toBe(false)
    // O bloco é texto da pessoa: apagar a linha do sono volta a caber.
    digitar(campoDaResposta(), `${'x'.repeat(1970)}\n\nResumo da rotina`)
    expect(previaPronta()).toBe(true)
    digitar(campoDaResposta(), 'x'.repeat(2000))
    expect(previaPronta()).toBe(true)
    digitar(campoDaResposta(), 'x'.repeat(2001))
    expect(previaPronta()).toBe(false)
    digitar(campoDaResposta(), '😀'.repeat(2000))
    expect(previaPronta()).toBe(true)
    digitar(campoDaResposta(), '😀'.repeat(2001))
    expect(previaPronta()).toBe(false)
  })

  it('compositor: tópico de 5000 pontos de código vale, 5001 não; a inserção nunca corta o texto', async () => {
    await novoTopico()
    digitar(screen.getByLabelText(/Título/) as HTMLInputElement, 'Um título bom')
    digitar(campoDoTopico(), 'y'.repeat(5000))
    expect(previaPronta()).toBe(true)
    await incluirOSono()
    expect(campoDoTopico().value).toBe(`${'y'.repeat(5000)}\n\n${BLOCO_DO_SONO}`)
    expect(previaPronta()).toBe(false)
    digitar(campoDoTopico(), 'y'.repeat(5001))
    expect(previaPronta()).toBe(false)
  })
})

describe('compositor: os 4 atos, a frase extra e o que vai ao servidor (RF-13, RN-02)', () => {
  it('compositor: nenhuma chamada de publicar antes do ato 4; frase só com inserção, em parágrafo próprio, mesmo após apagar; Voltar e editar mantém; argumentos = campos de hoje', async () => {
    const { comunidade } = await novoTopico()
    const criar = vi.spyOn(comunidade.dados, 'criarTopico')
    digitar(screen.getByLabelText(/Título/) as HTMLInputElement, 'Um título bom')
    digitar(campoDoTopico(), 'Meu texto')
    fireEvent.click(verPrevia())
    const semInsercao = document.querySelector('[data-previa="topico"]') as HTMLElement
    expect(within(semInsercao).queryByText(FRASE_DA_PREVIA)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar e editar' }))

    await incluirOSono()
    expect(criar).not.toHaveBeenCalled()
    fireEvent.click(verPrevia())
    const previa = document.querySelector('[data-previa="topico"]') as HTMLElement
    const paragrafos = [...previa.querySelectorAll('p')].map((p) => p.textContent)
    const aviso = paragrafos.findIndex((texto) => texto?.startsWith('É assim que o tópico vai aparecer'))
    expect(paragrafos[aviso + 1]).toBe(FRASE_DA_PREVIA)
    expect(previa.textContent).toContain('- Sono: 3 h 30')
    expect(criar).not.toHaveBeenCalled()

    // Voltar e editar mantém a marca, com o painel fechado, mesmo se a pessoa apagou o bloco do campo.
    fireEvent.click(screen.getByRole('button', { name: 'Voltar e editar' }))
    expect(screen.queryByRole('group', { name: 'Resumo da rotina' })).toBeNull()
    digitar(campoDoTopico(), 'Meu texto')
    fireEvent.click(verPrevia())
    expect(within(document.querySelector('[data-previa="topico"]') as HTMLElement).getByText(FRASE_DA_PREVIA)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1))
    expect(criar).toHaveBeenCalledWith(ID_DO_ESPACO_SONO, 'Um título bom', 'Meu texto', null)
    expect(comunidade.estado.topicos.at(-1)?.corpo).toBe('Meu texto')
  })

  it('compositor: a resposta seguinte, sem nova inserção, não tem a frase; a prévia da resposta não relê a rotina (RF-19 item 6)', async () => {
    const { comunidade, adiada } = await paginaDoTopico()
    const responder = vi.spyOn(comunidade.dados, 'responder')
    await incluirOSono()
    const leiturasAntes = [adiada.contagem('contexto'), adiada.contagem('doDia'), adiada.contagem('sessoesDaJanela')]
    fireEvent.click(verPrevia())
    const previa = document.querySelector('[data-previa="resposta"]') as HTMLElement
    const paragrafos = [...previa.querySelectorAll('p')].map((p) => p.textContent)
    const aviso = paragrafos.findIndex((texto) => texto?.startsWith('É assim que a resposta vai aparecer'))
    expect(paragrafos[aviso + 1]).toBe(FRASE_DA_PREVIA)
    expect(responder).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Publicar resposta' }))
    await waitFor(() => expect(responder).toHaveBeenCalledTimes(1))
    expect(responder).toHaveBeenCalledWith(TOPICO_DA_JULIANA, null, BLOCO_DO_SONO)
    await waitFor(() => expect(campoDaResposta().value).toBe(''))
    expect([adiada.contagem('contexto'), adiada.contagem('doDia'), adiada.contagem('sessoesDaJanela')]).toEqual(leiturasAntes)

    digitar(campoDaResposta(), 'Outra resposta')
    fireEvent.click(verPrevia())
    const seguinte = document.querySelector('[data-previa="resposta"]') as HTMLElement
    expect(within(seguinte).queryByText(FRASE_DA_PREVIA)).toBeNull()
  })

  it('compositor: a resposta que passa a edição zera o painel e a marca, como o texto', async () => {
    await paginaDoTopico()
    await incluirOSono()
    fireEvent.click(document.getElementById(`acao-editar-resposta-${RESPOSTA_DA_JULIANA}`)!)
    await screen.findByRole('heading', { name: 'Editar resposta' })
    expect(campoDaResposta().value).toBe('Minha resposta antiga')
    digitar(campoDaResposta(), 'Minha resposta nova')
    fireEvent.click(verPrevia())
    expect(within(document.querySelector('[data-previa="resposta"]') as HTMLElement).queryByText(FRASE_DA_PREVIA)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(botaoDoResumo()).toBeTruthy())
    digitar(campoDaResposta(), 'Resposta nova')
    fireEvent.click(verPrevia())
    expect(within(document.querySelector('[data-previa="resposta"]') as HTMLElement).queryByText(FRASE_DA_PREVIA)).toBeNull()
  })

  it('compositor: sair da página, ou cancelar, antes do ato 4 não envia nada e não guarda nada no navegador', async () => {
    const { comunidade, tela } = await novoTopico()
    const criar = vi.spyOn(comunidade.dados, 'criarTopico')
    const responder = vi.spyOn(comunidade.dados, 'responder')
    await incluirOSono()
    fireEvent.click(botaoDoResumo())
    fireEvent.click(noPainel().getByRole('button', { name: 'Cancelar' }))
    tela.unmount()
    expect(criar).not.toHaveBeenCalled()
    expect(responder).not.toHaveBeenCalled()
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })
})

describe('compositor: as leituras da rotina (RN-03)', () => {
  const contagens = (adiada: Awaited<ReturnType<typeof novoTopico>>['adiada']) => ({
    contexto: adiada.contagem('contexto'),
    doDia: adiada.contagem('doDia'),
    doIntervalo: adiada.contagem('doIntervalo'),
    sessoes: adiada.contagem('sessoesDaJanela'),
  })

  it('compositor: contexto e números = 0 ao abrir a página; 1 contexto e 1 conjunto de números depois do clique; trocas e Inserir contam o que a spec diz', async () => {
    for (const abrirPagina of [novoTopico, paginaDoTopico]) {
      const { adiada, tela } = await abrirPagina()
      expect(contagens(adiada)).toEqual({ contexto: 0, doDia: 0, doIntervalo: 0, sessoes: 0 })
      fireEvent.click(botaoDoResumo())
      await aguardarCaixas()
      expect(contagens(adiada)).toEqual({ contexto: 1, doDia: 1, doIntervalo: 0, sessoes: 1 })
      fireEvent.click(within(noPainel().getByRole('group', { name: 'Período' })).getAllByRole('radio')[1])
      await waitFor(() => expect(adiada.contagem('doIntervalo')).toBe(1))
      await aguardarCaixas()
      expect(contagens(adiada)).toEqual({ contexto: 1, doDia: 1, doIntervalo: 1, sessoes: 2 })
      fireEvent.click(noPainel().getAllByRole('checkbox')[0])
      fireEvent.click(noPainel().getByRole('button', { name: 'Inserir no texto' }))
      expect(contagens(adiada)).toEqual({ contexto: 1, doDia: 1, doIntervalo: 1, sessoes: 2 })
      tela.unmount()
    }
  })

  it('compositor: com 2 bebês os números só são lidos depois da escolha; "Tentar de novo" do contexto faz +1 contexto', async () => {
    const mundoOpcoes = { bebesExtras: [{ id: 'c1000000-0000-4000-8000-000000000001', nome: 'Amora', nascimento: '2026-08-01', estado: 'ativo' as const }] }
    const { adiada, mundo } = await cena('/app/comunidade/sono/novo', { ...mundoOpcoes, registros: HOJE })
    simularFalhaRotina(mundo.rotina, 'contexto', 'rede')
    fireEvent.click(botaoDoResumo())
    await noPainel().findByRole('button', { name: 'Tentar de novo' })
    expect(contagens(adiada)).toEqual({ contexto: 1, doDia: 0, doIntervalo: 0, sessoes: 0 })
    fireEvent.click(noPainel().getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(noPainel().getAllByRole('radio').length).toBeGreaterThan(2))
    expect(contagens(adiada)).toEqual({ contexto: 2, doDia: 0, doIntervalo: 0, sessoes: 0 })
    fireEvent.click(noPainel().getAllByRole('radio')[0])
    await aguardarCaixas().catch(() => undefined)
    await waitFor(() => expect(adiada.contagem('doDia')).toBe(1))
    expect(contagens(adiada)).toMatchObject({ contexto: 2, doDia: 1, sessoes: 1 })
  })

  // StrictMode é o que o `main.tsx` liga em desenvolvimento: o efeito do painel roda, limpa e roda de novo.
  it('compositor: em StrictMode, tópico novo e resposta nova, um clique faz 1 contexto e 1 conjunto de números, e o painel chega às escolhas', async () => {
    for (const abrirPagina of [() => novoTopico(true), () => paginaDoTopico(true)]) {
      const { adiada, tela } = await abrirPagina()
      expect(contagens(adiada)).toEqual({ contexto: 0, doDia: 0, doIntervalo: 0, sessoes: 0 })
      fireEvent.click(botaoDoResumo())
      await aguardarCaixas()
      await aguardarCarga()
      expect(noPainel().getAllByRole('radio').length).toBeGreaterThan(0)
      expect(noPainel().getByRole('button', { name: 'Inserir no texto' })).toBeTruthy()
      expect(contagens(adiada)).toEqual({ contexto: 1, doDia: 1, doIntervalo: 0, sessoes: 1 })
      tela.unmount()
    }
  })

  it('compositor: em StrictMode, fechar e reabrir de verdade faz +1 contexto e +1 conjunto de números, sem reaproveitar a abertura anterior', async () => {
    for (const abrirPagina of [() => novoTopico(true), () => paginaDoTopico(true)]) {
      const { adiada, tela } = await abrirPagina()
      fireEvent.click(botaoDoResumo())
      await aguardarCaixas()
      await aguardarCarga()
      expect(contagens(adiada)).toEqual({ contexto: 1, doDia: 1, doIntervalo: 0, sessoes: 1 })
      fireEvent.click(noPainel().getAllByRole('checkbox')[0])

      fireEvent.click(noPainel().getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('group', { name: 'Resumo da rotina' })).toBeNull()
      await aguardarCarga()
      expect(contagens(adiada)).toEqual({ contexto: 1, doDia: 1, doIntervalo: 0, sessoes: 1 })

      fireEvent.click(botaoDoResumo())
      await aguardarCaixas()
      await aguardarCarga()
      expect(noPainel().getAllByRole('checkbox').some((caixa) => (caixa as HTMLInputElement).checked)).toBe(false)
      expect(contagens(adiada)).toEqual({ contexto: 2, doDia: 2, doIntervalo: 0, sessoes: 2 })
      tela.unmount()
    }
  })

  it('compositor: em StrictMode, abrir e fechar no ato, sem esperar a leitura, não lê nada; a abertura seguinte lê 1 vez', async () => {
    for (const abrirPagina of [() => novoTopico(true), () => paginaDoTopico(true)]) {
      const { adiada, tela } = await abrirPagina()
      fireEvent.click(botaoDoResumo())
      fireEvent.click(noPainel().getByRole('button', { name: 'Cancelar' }))
      await aguardarCarga()
      expect(contagens(adiada)).toEqual({ contexto: 0, doDia: 0, doIntervalo: 0, sessoes: 0 })
      fireEvent.click(botaoDoResumo())
      await aguardarCaixas()
      await aguardarCarga()
      expect(contagens(adiada)).toEqual({ contexto: 1, doDia: 1, doIntervalo: 0, sessoes: 1 })
      tela.unmount()
    }
  })
})
