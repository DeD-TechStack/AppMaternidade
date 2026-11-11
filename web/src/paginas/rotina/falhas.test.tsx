import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { CHAVES_ERRO_ROTINA, type ChaveErroRotina } from '../../dados/rotina.erros.ts'
import { simularFalhaRotina, simularRespostaPerdidaRotina } from '../../dados/rotina.memoria.ts'
import { aguardarCarga, renderizarRotaPronta } from '../../teste/renderizarRota.tsx'
import { FUSO_DO_APARELHO, ID_BEBE, ID_FAMILIA } from '../../teste/rotina.fixture.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'

// Os caminhos que falham fechados (R38-32, item 6), com o relógio falso às 10:00 de 5/11/2026 (hora do
// aparelho): a sessão que outra pessoa já encerrou, o relógio atrás do início, o fuso e o deslocamento
// gravados, cada chave do catálogo de erros na tela e a nota que falha depois de encerrar. Nenhum erro
// mostra código nem mensagem do banco, e nada acontece sem rede de verdade.

const INSTANTE = new Date('2026-11-05T10:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(INSTANTE)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const campo = (rotulo: string) => screen.getByLabelText(rotulo) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
const digitar = (rotulo: string, valor: string) => fireEvent.change(campo(rotulo), { target: { value: valor } })
const botao = (nome: string) => screen.getByRole('button', { name: nome })
const status = () => screen.getByRole('status')
const CODIGOS = /P0001|P0002|42501|40P01|23502|23514|22023|PGRST301|XX000|bebe arquivado|registro excluido|JWT/

type Mundo = Awaited<ReturnType<typeof renderizarRotaPronta>>
const idDoSonoEmAndamento = (mundo: Mundo) => mundo.fixture.registros.find((r) => r.tipo === 'sono' && r.fim === null)!.id

describe('a sessão que outra pessoa já encerrou', () => {
  it('"Encerrar" mostra quem encerrou e a hora que valeu, sem trocar o fim gravado', async () => {
    const mundo = await renderizarRotaPronta('/app/sessao')
    const id = idDoSonoEmAndamento(mundo)
    const fimDeBruno = new Date('2026-11-05T09:55:00').toISOString()
    // Bruno encerra por outro aparelho enquanto a tela de Juliana ainda mostra a sessão em andamento.
    mundo.conta.sessaoParaTeste(PESSOAS.bruno.email)
    const dele = await mundo.rotina.encerrarSessao(id, fimDeBruno)
    expect(dele).toEqual({ ok: true, valor: fimDeBruno })
    mundo.conta.sessaoParaTeste(PESSOAS.juliana.email)

    fireEvent.click(botao('Encerrar'))
    await aguardarCarga()

    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    expect(status().querySelector('p')!.textContent).toBe('Esta sessão já tinha sido encerrada por Bruno às 09:55.')
    expect(within(status()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Fechar'])
    const lido = await mundo.rotina.registro(id)
    expect(lido.ok && lido.valor).toMatchObject({ fim: fimDeBruno, encerradoPor: PESSOAS.bruno.id })
  })
})

describe('o relógio do aparelho atrás do início da sessão', () => {
  it('"Encerrar" não envia nada: mostra a frase e "Encerrar em outro horário", e o horário escolhido é o enviado', async () => {
    const mundo = await renderizarRotaPronta('/app/sessao')
    const id = idDoSonoEmAndamento(mundo)
    const encerrar = vi.spyOn(mundo.rotina, 'encerrarSessao')
    // O aparelho marca 08:45; a sessão começou às 08:48.
    vi.setSystemTime(new Date('2026-11-05T08:45:00'))

    fireEvent.click(botao('Encerrar'))
    await aguardarCarga()

    expect(encerrar).not.toHaveBeenCalled()
    expect(screen.getByText('O relógio deste aparelho está antes do início desta sessão. Confira a hora do aparelho.')).toBeTruthy()
    expect(mundo.roteador.state.location.pathname).toBe('/app/sessao')

    fireEvent.click(botao('Encerrar em outro horário, sono'))
    const painel = screen.getByRole('group', { name: 'Encerrar em outro horário' })
    // Antes do início: não envia, e a mensagem fica no campo.
    digitar('Fim: hora', '08:40')
    fireEvent.click(within(painel).getByRole('button', { name: 'Encerrar' }))
    await aguardarCarga()
    expect(encerrar).not.toHaveBeenCalled()
    expect(screen.getByText('O fim não pode ser antes do início.')).toBeTruthy()

    // Dentro da tolerância de 5 minutos do relógio do aparelho.
    digitar('Fim: hora', '08:49')
    fireEvent.click(within(painel).getByRole('button', { name: 'Encerrar' }))
    await aguardarCarga()

    const escolhido = new Date('2026-11-05T08:49:00').toISOString()
    expect(encerrar).toHaveBeenCalledTimes(1)
    expect(encerrar).toHaveBeenCalledWith(id, escolhido)
    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    const lido = await mundo.rotina.registro(id)
    expect(lido.ok && lido.valor && lido.valor.fim).toBe(escolhido)
  })

  it('o fim mais de 5 minutos adiante do relógio do aparelho não é enviado', async () => {
    const mundo = await renderizarRotaPronta('/app/sessao')
    const encerrar = vi.spyOn(mundo.rotina, 'encerrarSessao')
    vi.setSystemTime(new Date('2026-11-05T08:45:00'))
    fireEvent.click(botao('Encerrar'))
    await aguardarCarga()
    fireEvent.click(botao('Encerrar em outro horário, sono'))

    digitar('Fim: hora', '08:51')
    fireEvent.click(within(screen.getByRole('group', { name: 'Encerrar em outro horário' })).getByRole('button', { name: 'Encerrar' }))
    await aguardarCarga()

    expect(encerrar).not.toHaveBeenCalled()
    expect(screen.getByText('O fim está mais de 5 minutos no futuro.')).toBeTruthy()
  })
})

describe('o fuso e o deslocamento do aparelho', () => {
  it('um registro novo grava o fuso do aparelho e o deslocamento em minutos a leste de UTC (o oposto de getTimezoneOffset)', async () => {
    const mundo = await renderizarRotaPronta('/app/registro/novo?tipo=fralda')
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(180)
    digitar('Conteúdo', 'xixi')

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()

    const lista = await mundo.rotina.doIntervalo(ID_BEBE, new Date(Date.now() - 60 * 60_000).toISOString(), new Date(Date.now() + 60 * 60_000).toISOString())
    const novo = lista.ok ? lista.valor.itens.find((r) => r.origem === 'retroativo') : undefined
    expect(novo).toMatchObject({ deslocamentoMin: -180, fuso: FUSO_DO_APARELHO })
  })

  it('a edição regrava o deslocamento do aparelho de agora', async () => {
    const mundo = await renderizarRotaPronta('/app/hoje')
    const alvo = mundo.fixture.registros.find((r) => r.tipo === 'fralda' && r.criadoPor === PESSOAS.bruno.id)!
    mundo.unmount()
    await renderizarRotaPronta(`/app/registro/${alvo.id}/editar`, { mundo })
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(240)
    digitar('Nota', 'Muito')

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()

    const lido = await mundo.rotina.registro(alvo.id)
    expect(lido.ok && lido.valor).toMatchObject({ deslocamentoMin: -240, nota: 'Muito' })
  })
})

describe('cada chave do catálogo de erros, ao desfazer um registro', () => {
  // Sem resposta, ocupado e desconhecido: a mudança pode ter sido salva, então a tela oferece repetir.
  const REPETIVEIS: readonly ChaveErroRotina[] = ['rede', 'tente_de_novo', 'desconhecido', 'autor_desconhecido', 'fuso_da_familia_invalido']

  const FRASES: Partial<Record<ChaveErroRotina, string>> = {
    rede: 'Não deu para confirmar com o servidor. Tente de novo: se já tiver sido salvo, não duplica.',
    nao_encontrado: 'Não encontramos este registro. Ele pode ter sido removido, ou você não tem mais acesso.',
    bebe_arquivado: 'Este bebê está arquivado. Os registros ficam só para leitura.',
    registro_excluido: 'Este registro foi excluído e não pode ser mudado.',
    tente_de_novo: 'O servidor estava ocupado. Tente de novo.',
    sessao_encerrada: 'Sua sessão terminou. Entre de novo.',
    desconhecido: 'Algo deu errado e não sabemos se a mudança foi salva. Toque em Tentar de novo ou atualize para conferir.',
  }

  it.each(CHAVES_ERRO_ROTINA)('"%s": a frase do catálogo, sem código, e "Tentar de novo" só quando repetir é seguro', async (chave) => {
    const mundo = await renderizarRotaPronta('/app/registro/novo?tipo=fralda')
    digitar('Conteúdo', 'coco')
    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    simularFalhaRotina(mundo.rotina, 'excluirRegistro', chave)

    fireEvent.click(botao('Desfazer'))
    await aguardarCarga()

    const texto = status().textContent ?? ''
    expect(texto.length, chave).toBeGreaterThan(0)
    expect(texto, chave).not.toMatch(CODIGOS)
    const frase = FRASES[chave]
    if (frase) expect(status().querySelector('p')!.textContent, chave).toBe(frase)
    expect(screen.queryByRole('button', { name: 'Tentar de novo' }) !== null, chave).toBe(REPETIVEIS.includes(chave))
    // O Desfazer não apagou nada: a falha não muda o registro.
    const lixeira = await mundo.rotina.lixeira(ID_BEBE)
    expect(lixeira.ok && lixeira.valor.itens, chave).toEqual([])
  })

  it('"Tentar de novo" repete o Desfazer com o mesmo id, e a exclusão acontece uma vez', async () => {
    const mundo = await renderizarRotaPronta('/app/registro/novo?tipo=fralda')
    digitar('Conteúdo', 'coco')
    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    const excluir = vi.spyOn(mundo.rotina, 'excluirRegistro')
    simularRespostaPerdidaRotina(mundo.rotina, 'excluirRegistro')

    fireEvent.click(botao('Desfazer'))
    await aguardarCarga()
    expect(status().querySelector('p')!.textContent).toBe(FRASES_REDE)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    expect(excluir).toHaveBeenCalledTimes(2)
    expect(excluir.mock.calls[1][0]).toBe(excluir.mock.calls[0][0])
    const lixeira = await mundo.rotina.lixeira(ID_BEBE)
    expect(lixeira.ok && lixeira.valor.itens).toHaveLength(1)
    expect(status().textContent).toBe('')
  })
})

const FRASES_REDE = 'Não deu para confirmar com o servidor. Tente de novo: se já tiver sido salvo, não duplica.'

describe('a nota que falha depois de encerrar', () => {
  async function encerrarComNota(texto: string) {
    const mundo = await renderizarRotaPronta('/app/sessao')
    const id = idDoSonoEmAndamento(mundo)
    fireEvent.click(botao('Encerrar e anotar'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nota' }), { target: { value: texto } })
    return { mundo, id }
  }

  it('recusa do banco: a sessão fica encerrada e a tela mostra a frase e o texto da nota, sem "Tentar de novo"', async () => {
    const { mundo, id } = await encerrarComNota('Dormiu bem')
    simularFalhaRotina(mundo.rotina, 'gravarNota', 'valor_invalido')

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()

    expect(mundo.roteador.state.location.pathname).toBe('/app/hoje')
    expect(status().querySelector('p')!.textContent).toBe('Algum valor está fora do permitido. Confira o formulário.')
    expect(status().querySelector('[data-texto-da-nota]')!.textContent).toBe('Dormiu bem')
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
    expect(status().textContent).not.toMatch(CODIGOS)
    const lido = await mundo.rotina.registro(id)
    expect(lido.ok && lido.valor && lido.valor.fim).not.toBeNull()
    const notas = await mundo.rotina.notas(ID_FAMILIA, ID_BEBE)
    expect(notas.ok && notas.valor.itens.some((n) => n.texto === 'Dormiu bem')).toBe(false)
  })

  it('resposta perdida: "Tentar de novo" repete com o mesmo id e o mesmo texto, e a nota não duplica', async () => {
    const { mundo } = await encerrarComNota('Dormiu bem')
    const gravar = vi.spyOn(mundo.rotina, 'gravarNota')
    simularRespostaPerdidaRotina(mundo.rotina, 'gravarNota')

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()
    expect(status().querySelector('p')!.textContent).toBe(FRASES_REDE)
    fireEvent.click(botao('Tentar de novo'))
    await aguardarCarga()

    expect(gravar).toHaveBeenCalledTimes(2)
    expect(gravar.mock.calls[1][0]).toEqual(gravar.mock.calls[0][0])
    const notas = await mundo.rotina.notas(ID_FAMILIA, ID_BEBE)
    expect(notas.ok && notas.valor.itens.filter((n) => n.texto === 'Dormiu bem')).toHaveLength(1)
    expect(status().querySelector('p')!.textContent).toMatch(/^Sessão encerrada: .*, com nota$/)
  })

  it('a nota de mais de 500 caracteres não envia nada e a sessão continua em andamento', async () => {
    const { mundo, id } = await encerrarComNota('a'.repeat(501))
    const encerrar = vi.spyOn(mundo.rotina, 'encerrarSessao')

    fireEvent.click(botao('Salvar'))
    await aguardarCarga()

    expect(encerrar).not.toHaveBeenCalled()
    expect(screen.getByText('A nota passa de 500 caracteres. Encurte o texto.')).toBeTruthy()
    const lido = await mundo.rotina.registro(id)
    expect(lido.ok && lido.valor && lido.valor.fim).toBeNull()
  })
})

describe('o encerramento em si falha', () => {
  it.each([
    ['rede', 'Não deu para confirmar com o servidor. Tente de novo: se já tiver sido salvo, não duplica.', true],
    ['bebe_arquivado', 'Este bebê está arquivado. Os registros ficam só para leitura.', false],
  ] as const)('"%s": a frase fica no cartão, sem código, e a sessão continua em andamento', async (chave, frase, repete) => {
    const mundo = await renderizarRotaPronta('/app/sessao')
    const id = idDoSonoEmAndamento(mundo)
    simularFalhaRotina(mundo.rotina, 'encerrarSessao', chave)

    fireEvent.click(botao('Encerrar'))
    await aguardarCarga()

    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain(frase)
    expect(alerta.textContent).not.toMatch(CODIGOS)
    expect(within(alerta).queryByRole('button', { name: 'Tentar de novo' }) !== null).toBe(repete)
    const lido = await mundo.rotina.registro(id)
    expect(lido.ok && lido.valor && lido.valor.fim).toBeNull()
  })
})
