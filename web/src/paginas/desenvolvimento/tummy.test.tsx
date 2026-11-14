import { act, configure, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { proximoPasso } from '../../componentes/desenvolvimento/tummy/regras.ts'
import { TT } from '../../conteudo/desenvolvimento/textosTummy.ts'
import { T } from '../../conteudo/desenvolvimento/textosLogada.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { ProvedorDadosDesenvolvimento, useDadosDesenvolvimento } from '../../dados/desenvolvimento.contexto.tsx'
import { simularAparelho } from '../../dados/rotina.aparelho.simulado.ts'
import type { FixtureRotina } from '../../dados/rotina.memoria.ts'
import { simularFalhaRotina, simularRespostaPerdidaRotina } from '../../dados/rotina.memoria.ts'
import { OPERACOES_ROTINA, type DadosRotina, type OperacaoRotina, type Registro } from '../../dados/rotina.tipos.ts'
import { ehUuidV7 } from '../../dados/rotina.uuid.ts'
import { rodarAxe } from '../../teste/axe.ts'
import { relogioDoTeste } from '../../teste/relogio.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import {
  FUSO_DO_APARELHO,
  ID_BEBE,
  ID_FAMILIA,
  criarMundoDeTeste,
  semSessaoEmAndamento,
  type Mundo,
  type OpcoesMundo,
} from '../../teste/rotina.fixture.ts'

// MAT-39b, DES-13 (testes 12 a 15, 17 e 19): o bloco "Tummy time" da página logada, na rota real, com a `DadosRotina`
// em memória e a fixture de teste (Juliana, Heloísa). Os valores esperados estão escritos aqui, não calculados do
// código. O dia da família é o do aparelho que roda os testes, e as horas são as do relógio local.

configure({ getElementError: (mensagem) => new Error(mensagem ?? 'Elemento não encontrado.') })

const HOJE = new Date(2026, 10, 12, 15, 0, 0)
const MINUTO = 60_000
const HORA = 60 * MINUTO
const TEO = { id: 'b7777777-7777-4777-8777-777777777777', nome: 'Teo', nascimento: '2026-10-01', estado: 'ativo' as const }

/** Só o `Date` é falso: os temporizadores reais seguem, e o cronômetro redesenha sozinho a cada segundo. */
function relogioEm(data: Date = HOJE) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(data)
  return relogioDoTeste()
}

/** `hora:minuto` do dia de hoje mais `dias`, no relógio local. */
function em(dias: number, hora: number, minuto: number): number {
  const data = new Date(HOJE)
  data.setDate(data.getDate() + dias)
  data.setHours(hora, minuto, 0, 0)
  return data.getTime()
}

let sequencia = 100
interface Sessao {
  inicio: number
  fim: number | null
  autor?: string | null
  origem?: 'ao_vivo' | 'retroativo'
}

function sessao({ inicio, fim, autor, origem }: Sessao): Registro {
  sequencia += 1
  const iso = (instante: number) => new Date(instante).toISOString()
  const criador = autor === undefined ? PESSOAS.juliana.id : autor
  return {
    id: `a0000000-0000-7000-8000-${String(sequencia).padStart(12, '0')}`,
    familiaId: ID_FAMILIA,
    bebeId: ID_BEBE,
    tipo: 'tummy',
    inicio: iso(inicio),
    fim: fim === null ? null : iso(fim),
    detalhes: {},
    nota: null,
    origem: origem ?? 'ao_vivo',
    fuso: FUSO_DO_APARELHO,
    deslocamentoMin: 0 - new Date(inicio).getTimezoneOffset(),
    criadoPor: criador,
    encerradoPor: fim === null ? null : criador,
    versao: 1,
    recebidoEm: iso(fim ?? inicio),
    atualizadoEm: iso(fim ?? inicio),
    excluidoEm: null,
    excluidoPor: null,
  }
}

/** A rotina de teste sem o tummy time de Carla de ontem, com só estes. */
const comTummy =
  (...registros: Registro[]) =>
  (fixture: FixtureRotina): FixtureRotina => ({
    ...fixture,
    registros: [...fixture.registros.filter((registro) => registro.tipo !== 'tummy'), ...registros],
  })

function mundo(opcoes: OpcoesMundo = {}, ...registros: Registro[]): Mundo {
  return criarMundoDeTeste({ ajustarRotina: comTummy(...registros), ...opcoes })
}

type Funcao = (...args: unknown[]) => Promise<Resultado<unknown>>
type Interceptador = (operacao: OperacaoRotina, args: unknown[], seguir: () => Promise<Resultado<unknown>>) => Promise<Resultado<unknown>>

/** Um invólucro só de teste: cada operação passa pelo interceptador, que decide quando e o que devolver. */
function interceptar(base: DadosRotina, interceptador: Interceptador): DadosRotina {
  return Object.fromEntries(
    OPERACOES_ROTINA.map((operacao) => [
      operacao,
      (...args: unknown[]) => interceptador(operacao, args, () => (base[operacao] as Funcao)(...args)),
    ]),
  ) as unknown as DadosRotina
}

/** Segura a resposta da operação até `liberar()`; as chamadas seguem a base e só então respondem. */
function segurando(base: DadosRotina, operacao: OperacaoRotina, quais: 'todas' | 'primeira' = 'todas') {
  let liberar: () => void = () => undefined
  const porta = new Promise<void>((resolver) => (liberar = resolver))
  const chamadas: unknown[][] = []
  const dados = interceptar(base, async (nome, args, seguir) => {
    if (nome !== operacao) return seguir()
    chamadas.push(args)
    if (quais === 'primeira' && chamadas.length > 1) return seguir()
    await porta
    return seguir()
  })
  return { dados, liberar: () => liberar(), chamadas }
}

/** Grava as chamadas e as passa à base. */
function gravando(base: DadosRotina) {
  const chamadas: Array<{ operacao: OperacaoRotina; args: unknown[] }> = []
  const dados = interceptar(base, (operacao, args, seguir) => {
    chamadas.push({ operacao, args })
    return seguir()
  })
  return { dados, chamadas }
}

async function abrir(m: Mundo, rotina: DadosRotina = m.rotina): Promise<void> {
  renderizarRota('/app/desenvolvimento', { mundo: { ...m, rotina } })
  await aguardarCarga()
}

const bloco = () => document.querySelector<HTMLElement>('[data-tummy]')!
const botao = (nome: string | RegExp) => within(bloco()).getByRole('button', { name: nome })
const talvezBotao = (nome: string | RegExp) => within(bloco()).queryByRole('button', { name: nome })
const textoDoBloco = () => bloco().textContent ?? ''

async function clicar(elemento: HTMLElement) {
  await act(async () => {
    fireEvent.click(elemento)
  })
  await aguardarCarga()
}

const digitar = (campo: HTMLElement, valor: string) => fireEvent.change(campo, { target: { value: valor } })

/** O que a tela mostra de uma ação de escrita: o registro lido de volta da própria rotina. */
async function tummyGravado(m: Mundo): Promise<Registro[]> {
  const lido = await m.rotina.sessoesDaJanela(ID_BEBE, new Date(em(-30, 0, 0)).toISOString(), new Date(em(1, 0, 0)).toISOString(), ['tummy'])
  const abertas = await m.rotina.emAndamento(ID_BEBE)
  if (!lido.ok || !abertas.ok) throw new Error('A leitura de conferência falhou.')
  return [...lido.valor.itens, ...abertas.valor.itens.filter((registro) => registro.tipo === 'tummy')]
}

async function abrirAgora() {
  await clicar(botao(TT.fizemosAgora))
  return within(bloco()).getByLabelText(TT.duracao) as HTMLInputElement
}

async function abrirHorario() {
  await clicar(botao(TT.outroHorario))
  const painel = bloco().querySelector<HTMLElement>('[data-painel-tummy="horario"]')!
  return {
    dia: within(painel).getByLabelText(TT.dia) as HTMLSelectElement,
    inicio: within(painel).getByLabelText(TT.inicio) as HTMLInputElement,
    fim: within(painel).getByLabelText(TT.fim) as HTMLInputElement,
  }
}

const salvar = () => clicar(botao(TT.salvar))

const mudarDeSessao = (m: Mundo, quem: keyof typeof PESSOAS) => m.conta.sessaoParaTeste(PESSOAS[quem].email)

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------------------------------------------
describe('DES-13 12: as ações', () => {
  it('Iniciar e, depois, Encerrar aos 4 min 35 s: cronômetro 04:35, T-17, resumo de hoje com 1 sessão e o foco no Iniciar', async () => {
    const mudarRelogio = relogioEm()
    const m = mundo()
    await abrir(m)
    expect(textoDoBloco()).toContain('Nenhum tummy time nos últimos 7 dias.')

    await clicar(botao('Iniciar tummy time de Heloísa'))
    expect(within(bloco()).getByRole('timer').textContent).toBe('00:00')
    expect(talvezBotao(/^Iniciar tummy time/)).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(botao('Encerrar tummy time de Heloísa')))

    mudarRelogio(new Date(HOJE.getTime() + 4 * MINUTO + 35_000))
    await waitFor(() => expect(within(bloco()).getByRole('timer').textContent).toBe('04:35'), { timeout: 3000 })

    await clicar(botao('Encerrar tummy time de Heloísa'))
    expect(within(bloco()).getByText('Tummy time encerrado: 4 min.')).toBeTruthy()
    expect(within(bloco()).getByText('Hoje: 1 sessão, 4 min no total')).toBeTruthy()
    expect(within(bloco()).queryByRole('timer')).toBeNull()
    expect(talvezBotao('Desfazer')).toBeNull()
    expect(document.activeElement).toBe(botao('Iniciar tummy time de Heloísa'))
    expect(await tummyGravado(m)).toHaveLength(1)
  })

  it('o cronômetro de uma sessão aberta há 1 h 2 min 3 s mostra 1:02:03', async () => {
    relogioEm()
    await abrir(mundo({}, sessao({ inicio: HOJE.getTime() - (HORA + 2 * MINUTO + 3000), fim: null })))
    expect(within(bloco()).getByRole('timer').textContent).toBe('1:02:03')
  })

  it('"Fizemos agora" com 10 minutos grava 14:50 – 15:00, retroativo, com T-16', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    digitar(await abrirAgora(), '10')
    await salvar()
    expect(within(bloco()).getByText('Tummy time registrado.')).toBeTruthy()
    expect(bloco().querySelector('[data-painel-tummy]')).toBeNull()
    expect(within(bloco()).getByText('14:50 – 15:00 · 10 min · por Juliana · registrado depois')).toBeTruthy()
    expect(within(bloco()).getByText('Hoje: 1 sessão, 10 min no total')).toBeTruthy()
    const [gravado] = await tummyGravado(m)
    expect(gravado.origem).toBe('retroativo')
    expect(gravado.inicio).toBe(new Date(em(0, 14, 50)).toISOString())
    expect(gravado.fim).toBe(new Date(em(0, 15, 0)).toISOString())
    // O foco volta ao botão que abriu o painel.
    expect(document.activeElement).toBe(botao(TT.fizemosAgora))
  })

  it('"Fizemos agora" sem duração grava só o instante: sem duração', async () => {
    const mudarRelogio = relogioEm()
    await abrir(mundo())
    await abrirAgora()
    await salvar()
    expect(within(bloco()).getByText('Tummy time registrado.')).toBeTruthy()
    // Com o relógio parado, a sessão de zero minutos começa no próprio instante `ate` da leitura, que fica de fora
    // da janela `[de, ate)`. Alguns segundos depois a leitura a traz.
    mudarRelogio(new Date(HOJE.getTime() + 5000))
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await aguardarCarga()
    expect(within(bloco()).getByText('15:00 – 15:00 · sem duração · por Juliana · registrado depois')).toBeTruthy()
  })

  it.each(['0', '1000', '2,5', 'abc'])('"Fizemos agora" com "%s": T-29 e nada gravado', async (valor) => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    digitar(await abrirAgora(), valor)
    await salvar()
    expect(within(bloco()).getByText('Use um número inteiro de 1 a 999.')).toBeTruthy()
    expect(bloco().querySelector('[data-painel-tummy="agora"]')).not.toBeNull()
    expect(await tummyGravado(m)).toHaveLength(0)
  })

  it('"Fizemos agora" com 60 grava sem T-26; com 61 pede T-26 e só grava em "Salvar assim"', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    digitar(await abrirAgora(), '60')
    await salvar()
    expect(textoDoBloco()).not.toContain('Mais de 1 hora de tummy time.')
    expect(await tummyGravado(m)).toHaveLength(1)

    digitar(await abrirAgora(), '61')
    await salvar()
    expect(within(bloco()).getByText('Mais de 1 hora de tummy time. Está certo?')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)
    // Os 61 minutos terminam no mesmo instante em que os 60 do primeiro terminam: também se sobrepõem (T-27).
    await clicar(botao('Salvar assim'))
    expect(within(bloco()).getByText('Já há tummy time registrado nesse horário. Salvar mesmo assim?')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)
    await clicar(botao('Salvar mesmo assim'))
    expect(await tummyGravado(m)).toHaveLength(2)
  })

  it('outro horário: início vazio dá T-54, fim antes do início dá T-24, e no futuro dá T-25 (nada gravado)', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    const campos = await abrirHorario()
    digitar(campos.fim, '14:30')
    await salvar()
    expect(within(bloco()).getByText('Preencha o início e o fim.')).toBeTruthy()

    digitar(campos.inicio, '14:30')
    digitar(campos.fim, '14:00')
    await salvar()
    expect(within(bloco()).getByText('O fim não pode ser antes do início.')).toBeTruthy()

    digitar(campos.inicio, '14:00')
    digitar(campos.fim, '16:00')
    await salvar()
    expect(within(bloco()).getByText('O horário não pode ficar no futuro.')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(0)
  })

  it('outro horário: fim igual ao início grava, sem duração', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    const campos = await abrirHorario()
    digitar(campos.inicio, '14:00')
    digitar(campos.fim, '14:00')
    await salvar()
    expect(within(bloco()).getByText('14:00 – 14:00 · sem duração · por Juliana · registrado depois')).toBeTruthy()
    expect(within(bloco()).getByText('Tummy time registrado.')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)
  })

  it('mais de 60 minutos: T-26 antes de gravar; "Corrigir" volta ao campo sem gravar; "Salvar assim" grava', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    const campos = await abrirHorario()
    digitar(campos.inicio, '12:00')
    digitar(campos.fim, '13:30')
    await salvar()
    expect(within(bloco()).getByText('Mais de 1 hora de tummy time. Está certo?')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(0)

    await clicar(botao('Corrigir'))
    expect(await tummyGravado(m)).toHaveLength(0)
    expect(textoDoBloco()).not.toContain('Mais de 1 hora')
    expect(bloco().querySelector('[data-painel-tummy="horario"]')).not.toBeNull()

    await salvar()
    await clicar(botao('Salvar assim'))
    expect(within(bloco()).getByText('12:00 – 13:30 · 1 h 30 min · por Juliana · registrado depois')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)
  })

  it('sobreposição: T-27 antes de gravar; "Voltar" não grava; "Salvar mesmo assim" grava', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: em(0, 12, 0), fim: em(0, 12, 30) }))
    await abrir(m)
    const campos = await abrirHorario()
    digitar(campos.inicio, '12:15')
    digitar(campos.fim, '12:45')
    await salvar()
    expect(within(bloco()).getByText('Já há tummy time registrado nesse horário. Salvar mesmo assim?')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)

    await clicar(botao('Voltar'))
    expect(await tummyGravado(m)).toHaveLength(1)
    await salvar()
    await clicar(botao('Salvar mesmo assim'))
    expect(await tummyGravado(m)).toHaveLength(2)
  })

  it('com as duas confirmações, T-26 vem antes de T-27', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: em(0, 12, 0), fim: em(0, 12, 30) }))
    await abrir(m)
    const campos = await abrirHorario()
    digitar(campos.inicio, '11:00')
    digitar(campos.fim, '13:00')
    await salvar()
    expect(within(bloco()).getByText('Mais de 1 hora de tummy time. Está certo?')).toBeTruthy()
    expect(textoDoBloco()).not.toContain('Já há tummy time registrado nesse horário.')
    await clicar(botao('Salvar assim'))
    expect(within(bloco()).getByText('Já há tummy time registrado nesse horário. Salvar mesmo assim?')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)
    await clicar(botao('Salvar mesmo assim'))
    expect(await tummyGravado(m)).toHaveLength(2)
  })

  it('intervalos que só encostam não pedem T-27', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: em(0, 12, 0), fim: em(0, 12, 30) }))
    await abrir(m)
    const campos = await abrirHorario()
    digitar(campos.inicio, '12:30')
    digitar(campos.fim, '13:00')
    await salvar()
    expect(textoDoBloco()).not.toContain('Já há tummy time registrado nesse horário.')
    expect(await tummyGravado(m)).toHaveLength(2)

    const outros = await abrirHorario()
    digitar(outros.inicio, '11:30')
    digitar(outros.fim, '12:00')
    await salvar()
    expect(textoDoBloco()).not.toContain('Já há tummy time registrado nesse horário.')
    expect(await tummyGravado(m)).toHaveLength(3)
  })

  it('"Fizemos agora" durante uma sessão em andamento pede T-27', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: HOJE.getTime() - 5 * MINUTO, fim: null }))
    await abrir(m)
    digitar(await abrirAgora(), '2')
    await salvar()
    expect(within(bloco()).getByText('Já há tummy time registrado nesse horário. Salvar mesmo assim?')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)
  })

  it('conversão no fuso do aparelho America/New_York: 08/03/2026 02:30 dá T-58 e nada grava', async () => {
    relogioEm(new Date('2026-03-09T20:00:00Z'))
    simularAparelho('America/New_York', -240)
    const m = mundo()
    await abrir(m)
    const campos = await abrirHorario()
    digitar(campos.dia, '2026-03-08')
    digitar(campos.inicio, '02:30')
    digitar(campos.fim, '02:45')
    await salvar()
    expect(within(bloco()).getByText('Esse horário não existe neste dia, por causa da mudança de horário. Escolha outro.')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(0)
  })

  it('conversão no fuso do aparelho America/New_York: 01/11/2026 01:30 grava o instante 05:30 UTC (a primeira ocorrência)', async () => {
    relogioEm(new Date('2026-11-02T20:00:00Z'))
    simularAparelho('America/New_York', -300)
    const m = mundo()
    await abrir(m)
    const campos = await abrirHorario()
    digitar(campos.dia, '2026-11-01')
    digitar(campos.inicio, '01:30')
    digitar(campos.fim, '01:45')
    await salvar()
    const [gravado] = await tummyGravado(m)
    expect(gravado.inicio).toBe('2026-11-01T05:30:00.000Z')
    expect(gravado.fim).toBe('2026-11-01T05:45:00.000Z')
  })

  it('"Desfazer" do "Fizemos agora" volta à lista anterior e mostra T-65', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    digitar(await abrirAgora(), '10')
    await salvar()
    await clicar(botao('Desfazer'))
    expect(within(bloco()).getByText('Desfeito.')).toBeTruthy()
    expect(textoDoBloco()).toContain('Nenhum tummy time nos últimos 7 dias.')
    expect(await tummyGravado(m)).toHaveLength(0)
  })

  it('Descartar e "Desfazer": a sessão some, T-18, e volta com T-65', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null }))
    await abrir(m)
    await clicar(botao('Descartar'))
    expect(within(bloco()).getByText('Sessão descartada.')).toBeTruthy()
    expect(within(bloco()).queryByRole('timer')).toBeNull()
    expect(talvezBotao('Iniciar tummy time de Heloísa')).not.toBeNull()

    await clicar(botao('Desfazer'))
    expect(within(bloco()).getByText('Desfeito.')).toBeTruthy()
    expect(within(bloco()).getByRole('timer').textContent).toBe('10:00')
  })

  it('encerrar uma sessão já encerrada por outra pessoa: T-19, com o fim da outra', async () => {
    relogioEm()
    const aberta = sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null })
    const m = mundo({}, aberta)
    await abrir(m)
    // Outra pessoa encerrou às 14:59 com a tela aberta.
    await m.rotina.encerrarSessao(aberta.id, new Date(HOJE.getTime() - MINUTO).toISOString())
    await clicar(botao('Encerrar tummy time de Heloísa'))
    expect(within(bloco()).getByText('Esta sessão já tinha sido encerrada às 14:59.')).toBeTruthy()
    expect(textoDoBloco()).not.toContain('Tummy time encerrado:')
  })

  it('duas sessões em andamento: as duas aparecem, a mais recente primeiro, e encerrar a primeira leva o foco ao Encerrar da segunda', async () => {
    relogioEm()
    const m = mundo(
      {},
      sessao({ inicio: HOJE.getTime() - 30 * MINUTO, fim: null }),
      sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null }),
    )
    await abrir(m)
    expect(within(bloco()).getAllByRole('timer').map((t) => t.textContent)).toEqual(['10:00', '30:00'])
    expect(talvezBotao(/^Iniciar tummy time/)).toBeNull()
    const encerrar = within(bloco()).getAllByRole('button', { name: 'Encerrar tummy time de Heloísa' })
    expect(encerrar).toHaveLength(2)
    await clicar(encerrar[0])
    const restante = within(bloco()).getAllByRole('button', { name: 'Encerrar tummy time de Heloísa' })
    expect(restante).toHaveLength(1)
    expect(document.activeElement).toBe(restante[0])
  })

  it('o painel abre com o foco no primeiro campo e fecha com Cancelar e com Esc, devolvendo o foco ao botão', async () => {
    relogioEm()
    await abrir(mundo())
    const duracao = await abrirAgora()
    await waitFor(() => expect(document.activeElement).toBe(duracao))
    await clicar(botao(TT.cancelar))
    expect(bloco().querySelector('[data-painel-tummy]')).toBeNull()
    expect(document.activeElement).toBe(botao(TT.fizemosAgora))

    const campos = await abrirHorario()
    await waitFor(() => expect(document.activeElement).toBe(campos.dia))
    await act(async () => {
      fireEvent.keyDown(campos.inicio, { key: 'Escape' })
    })
    expect(bloco().querySelector('[data-painel-tummy]')).toBeNull()
    expect(document.activeElement).toBe(botao(TT.outroHorario))
  })

  it('o título "Tummy time" é um h2 que recebe o foco por programa, e o texto de segurança e o aviso ficam sempre à vista', async () => {
    relogioEm()
    await abrir(mundo())
    const titulo = within(bloco()).getByRole('heading', { level: 2, name: 'Tummy time' })
    expect(titulo.getAttribute('tabindex')).toBe('-1')
    expect(within(bloco()).getByText('Só com o bebê acordado e um adulto olhando. Se ele ficar com sono, coloque de barriga para cima no berço.')).toBeTruthy()
    expect(textoDoBloco()).toContain(T.avisoDeSaude)
    const link = within(bloco()).getByRole('link', { name: 'O que as fontes dizem sobre tummy time' })
    expect(link.getAttribute('href')).toBe('/app/desenvolvimento/conteudo/desenv-tummy-time-fontes')
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('DES-13 13: o envio', () => {
  it('com a resposta segurada: o 2º Salvar não faz 2ª chamada, os campos ficam readonly, Esc não fecha, T-53 aparece uma vez e o seletor de bebê fica desabilitado', async () => {
    relogioEm()
    const m = mundo({ bebesExtras: [TEO] })
    const preso = segurando(m.rotina, 'gravarRegistro')
    await abrir(m, preso.dados)
    const duracao = await abrirAgora()
    digitar(duracao, '10')
    await act(async () => {
      fireEvent.click(botao(TT.salvar))
    })
    await act(async () => {
      fireEvent.click(botao(TT.salvar))
    })
    expect(preso.chamadas).toHaveLength(1)
    expect(botao(TT.salvar).getAttribute('aria-disabled')).toBe('true')
    expect(duracao.readOnly).toBe(true)
    expect(document.activeElement).toBe(botao(TT.salvar))
    await act(async () => {
      fireEvent.keyDown(duracao, { key: 'Escape' })
    })
    await act(async () => {
      fireEvent.click(botao(TT.cancelar))
    })
    expect(bloco().querySelector('[data-painel-tummy="agora"]')).not.toBeNull()
    expect(screen.getAllByText('Salvando…')).toHaveLength(1)
    expect((screen.getByRole('combobox', { name: 'Bebê' }) as HTMLSelectElement).disabled).toBe(true)
    expect(botao(TT.fizemosAgora).getAttribute('aria-disabled')).toBe('true')
    expect(botao(TT.outroHorario).getAttribute('aria-disabled')).toBe('true')

    await act(async () => {
      preso.liberar()
    })
    await aguardarCarga()
    expect(screen.queryByText('Salvando…')).toBeNull()
    expect((screen.getByRole('combobox', { name: 'Bebê' }) as HTMLSelectElement).disabled).toBe(false)
    expect(within(bloco()).getByText('Tummy time registrado.')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)
  })

  it('durante o envio de Iniciar, os outros controles de escrita ficam aria-disabled e o foco não sai do botão', async () => {
    relogioEm()
    const m = mundo()
    const preso = segurando(m.rotina, 'gravarRegistro')
    await abrir(m, preso.dados)
    const iniciar = botao('Iniciar tummy time de Heloísa')
    iniciar.focus()
    await act(async () => {
      fireEvent.click(iniciar)
    })
    expect(iniciar.getAttribute('aria-disabled')).toBe('true')
    expect(botao(TT.fizemosAgora).getAttribute('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(iniciar)
    await act(async () => {
      fireEvent.click(botao(TT.fizemosAgora))
    })
    expect(bloco().querySelector('[data-painel-tummy]')).toBeNull()
    await act(async () => {
      preso.liberar()
    })
    await aguardarCarga()
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('DES-13 14: o histórico de 7 dias', () => {
  it('a fila tem 7 botões: Hoje, Ontem e dd/mm, do mais recente ao mais antigo, com Hoje selecionado', async () => {
    relogioEm()
    await abrir(mundo({}, sessao({ inicio: em(-2, 15, 0), fim: em(-2, 15, 8) })))
    const fila = bloco().querySelector<HTMLElement>('[data-fila-de-dias]')!
    const botoes = within(fila).getAllByRole('button')
    expect(botoes.map((b) => b.textContent)).toEqual(['Hoje', 'Ontem', '10/11', '09/11', '08/11', '07/11', '06/11'])
    expect(botoes.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false', 'false', 'false', 'false'])
  })

  it('Ontem, com a sessão das 15:00 às 15:08 de Juliana, registrada depois; Hoje, nenhuma sessão', async () => {
    relogioEm()
    await abrir(mundo({}, sessao({ inicio: em(-1, 15, 0), fim: em(-1, 15, 8), origem: 'retroativo' })))
    expect(within(bloco()).getByText('Hoje: nenhuma sessão registrada.')).toBeTruthy()
    await clicar(within(bloco()).getByRole('button', { name: 'Ontem' }))
    expect(within(bloco()).getByRole('button', { name: 'Ontem' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(bloco()).getByText('Ontem: 1 sessão, 8 min no total')).toBeTruthy()
    expect(within(bloco()).getByText('15:00 – 15:08 · 8 min · por Juliana · registrado depois')).toBeTruthy()
  })

  it('23:50 de ontem a 00:10 de hoje: Ontem tem 10 min e a linha de 20 min "termina no dia seguinte"; Hoje tem 10 min da sessão que começou antes', async () => {
    relogioEm()
    await abrir(mundo({}, sessao({ inicio: em(-1, 23, 50), fim: em(0, 0, 10) })))
    expect(within(bloco()).getByText('Hoje: 10 min no total, de sessão que começou antes deste dia.')).toBeTruthy()
    expect(bloco().querySelector('[data-lista-do-dia]')).toBeNull()
    await clicar(within(bloco()).getByRole('button', { name: 'Ontem' }))
    expect(within(bloco()).getByText('Ontem: 1 sessão, 10 min no total')).toBeTruthy()
    expect(within(bloco()).getByText('23:50 – 00:10 · 20 min · por Juliana · termina no dia seguinte')).toBeTruthy()
  })

  it('de D-3 às 23:00 a D-1 às 01:00: a linha de D-3 diz "termina em 11/11"', async () => {
    relogioEm()
    await abrir(mundo({}, sessao({ inicio: em(-3, 23, 0), fim: em(-1, 1, 0) })))
    await clicar(within(bloco()).getByRole('button', { name: '09/11' }))
    expect(within(bloco()).getByText('23:00 – 01:00 · 26 h 0 min · por Juliana · termina em 11/11')).toBeTruthy()
    expect(within(bloco()).getByText('09/11: 1 sessão, 1 h 0 min no total')).toBeTruthy()
    await clicar(within(bloco()).getByRole('button', { name: 'Ontem' }))
    expect(within(bloco()).getByText('Ontem: 1 h 0 min no total, de sessão que começou antes deste dia.')).toBeTruthy()
  })

  it('iniciada em D-8 e encerrada em D-6: entra só no total de D-6, sem linha', async () => {
    relogioEm()
    await abrir(mundo({}, sessao({ inicio: em(-8, 10, 0), fim: em(-6, 8, 0) })))
    await clicar(within(bloco()).getByRole('button', { name: '06/11' }))
    expect(within(bloco()).getByText('06/11: 8 h 0 min no total, de sessão que começou antes deste dia.')).toBeTruthy()
    expect(bloco().querySelector('[data-lista-do-dia]')).toBeNull()
  })

  it('uma sessão aberta há 9 dias aparece em "Em andamento", e o Iniciar não aparece', async () => {
    relogioEm()
    await abrir(mundo({}, sessao({ inicio: HOJE.getTime() - 9 * 24 * HORA, fim: null })))
    expect(within(bloco()).getByText('Em andamento')).toBeTruthy()
    expect(within(bloco()).getByRole('timer').textContent).toBe('216:00:00')
    expect(talvezBotao(/^Iniciar tummy time/)).toBeNull()
  })

  it('autor nulo dá "por conta removida"; autor fora dos membros dá "por outra conta"', async () => {
    relogioEm()
    await abrir(
      mundo(
        {},
        sessao({ inicio: em(0, 9, 0), fim: em(0, 9, 5), autor: null }),
        sessao({ inicio: em(0, 10, 0), fim: em(0, 10, 5), autor: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }),
      ),
    )
    expect(within(bloco()).getByText('09:00 – 09:05 · 5 min · por conta removida')).toBeTruthy()
    expect(within(bloco()).getByText('10:00 – 10:05 · 5 min · por outra conta')).toBeTruthy()
  })

  it('sem sessões: T-22 e a ilustração do tapete, decorativa e escondida do leitor de tela', async () => {
    relogioEm()
    await abrir(mundo())
    expect(within(bloco()).getByText('Nenhum tummy time nos últimos 7 dias.')).toBeTruthy()
    expect(bloco().querySelector('[data-fila-de-dias]')).toBeNull()
    const desenho = bloco().querySelector<HTMLElement>('img[data-ilustracao]')!
    expect(desenho.getAttribute('alt')).toBe('')
    expect(desenho.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('a leitura relê quando a aba volta a ficar visível: a sessão de outra pessoa aparece sem recarregar', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    expect(textoDoBloco()).toContain('Nenhum tummy time nos últimos 7 dias.')
    const gravada = sessao({ inicio: em(0, 9, 0), fim: em(0, 9, 12), autor: PESSOAS.bruno.id })
    await m.rotina.gravarRegistro({ id: gravada.id, bebeId: ID_BEBE, tipo: 'tummy', inicio: gravada.inicio, fim: gravada.fim, origem: 'ao_vivo' })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await aguardarCarga()
    expect(within(bloco()).getByText('Hoje: 1 sessão, 12 min no total')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('DES-13 15: papéis e erros', () => {
  const ESCRITA = [/^Iniciar tummy time/, TT.fizemosAgora, TT.outroHorario, /^Encerrar tummy time/, TT.descartar]

  it('observador: sem controles de escrita no DOM e com T-23', async () => {
    relogioEm()
    await abrir(mundo({ papelDeDavi: 'observador', sessao: 'davi' }, sessao({ inicio: HOJE.getTime() - 5 * MINUTO, fim: null })))
    for (const nome of ESCRITA) expect(talvezBotao(nome), String(nome)).toBeNull()
    expect(within(bloco()).getByRole('timer').textContent).toBe('05:00')
    expect(screen.getAllByText('Seu papel nesta família permite só ver os registros.')).toHaveLength(1)
  })

  it('cuidador: encerra a sessão de outra pessoa, não vê Descartar nela e vê Descartar na própria', async () => {
    relogioEm()
    const dela = sessao({ inicio: HOJE.getTime() - 20 * MINUTO, fim: null, autor: PESSOAS.juliana.id })
    const dele = sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null, autor: PESSOAS.bruno.id })
    await abrir(mundo({ sessao: 'bruno' }, dela, dele))
    const cartaoDela = bloco().querySelector<HTMLElement>(`[data-sessao-tummy="${dela.id}"]`)!
    const cartaoDele = bloco().querySelector<HTMLElement>(`[data-sessao-tummy="${dele.id}"]`)!
    expect(within(cartaoDela).getByRole('button', { name: 'Encerrar tummy time de Heloísa' })).toBeTruthy()
    expect(within(cartaoDela).queryByRole('button', { name: 'Descartar' })).toBeNull()
    expect(within(cartaoDele).getByRole('button', { name: 'Descartar' })).toBeTruthy()
    await clicar(within(cartaoDela).getByRole('button', { name: 'Encerrar tummy time de Heloísa' }))
    expect(within(bloco()).getByText('Tummy time encerrado: 20 min.')).toBeTruthy()
  })

  it('cuidador rebaixado a observador com a página aberta: Encerrar dá T-44, os controles somem, T-23 aparece e o foco vai à mensagem', async () => {
    relogioEm()
    const m = mundo({ sessao: 'bruno' }, sessao({ inicio: HOJE.getTime() - 20 * MINUTO, fim: null }))
    await abrir(m)
    const familia = await m.conta.detalheFamilia(ID_FAMILIA)
    const vinculo = familia.ok ? familia.valor.membros.find((membro) => membro.contaId === PESSOAS.bruno.id)!.vinculoId : ''
    mudarDeSessao(m, 'juliana')
    await m.conta.mudarPapel(vinculo, 'observador')
    mudarDeSessao(m, 'bruno')

    await clicar(botao('Encerrar tummy time de Heloísa'))
    const alerta = within(bloco()).getByRole('alert')
    expect(alerta.textContent).toContain('Sem permissão. Seu papel nesta família não permite esta ação.')
    for (const nome of ESCRITA) expect(talvezBotao(nome), String(nome)).toBeNull()
    expect(screen.getAllByText('Seu papel nesta família permite só ver os registros.')).toHaveLength(1)
    expect(document.activeElement).toBe(alerta)
  })

  // DES-09 estado 3 e DES-13 item 15: com o vínculo revogado, a escrita volta P0002; a página relê o contexto do
  // bebê (que agora não tem família), o bloco some e o foco vai ao título da página.
  const ACOES_COM_VINCULO_REVOGADO: ReadonlyArray<{ nome: string; sessoes: () => Registro[]; agir: () => Promise<void> }> = [
    {
      nome: 'Encerrar',
      sessoes: () => [sessao({ inicio: HOJE.getTime() - 20 * MINUTO, fim: null }), sessao({ inicio: em(0, 9, 0), fim: em(0, 9, 10) })],
      agir: () => clicar(botao('Encerrar tummy time de Heloísa')),
    },
    {
      nome: 'Iniciar',
      sessoes: () => [sessao({ inicio: em(0, 9, 0), fim: em(0, 9, 10) })],
      agir: () => clicar(botao('Iniciar tummy time de Heloísa')),
    },
    {
      nome: 'Descartar',
      sessoes: () => [sessao({ inicio: HOJE.getTime() - 20 * MINUTO, fim: null, autor: PESSOAS.bruno.id })],
      agir: () => clicar(botao('Descartar')),
    },
    {
      nome: 'Fizemos agora',
      sessoes: () => [],
      agir: async () => {
        digitar(await abrirAgora(), '10')
        await salvar()
      },
    },
  ]

  for (const caso of ACOES_COM_VINCULO_REVOGADO) {
    it(`vínculo revogado com a página aberta (${caso.nome}): a página relê o contexto (T-56), o bloco some e o foco vai ao h1`, async () => {
      relogioEm()
      const m = mundo({ sessao: 'bruno' }, ...caso.sessoes())
      await abrir(m)
      const familia = await m.conta.detalheFamilia(ID_FAMILIA)
      const vinculo = familia.ok ? familia.valor.membros.find((membro) => membro.contaId === PESSOAS.bruno.id)!.vinculoId : ''
      mudarDeSessao(m, 'juliana')
      await m.conta.revogarVinculo(vinculo)
      mudarDeSessao(m, 'bruno')

      await caso.agir()
      await waitFor(() => expect(screen.getByText('Você ainda não faz parte de uma família.')).toBeTruthy())
      expect(document.querySelector('[data-tummy]')).toBeNull()
      expect(document.querySelector('[data-grade-do-desenvolvimento]')).toBeNull()
      expect(screen.getByRole('link', { name: 'Começar' }).getAttribute('href')).toBe('/app/comecar')
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 })))
    })
  }

  it('bebê arquivado: T-40 uma vez e sem controles de escrita', async () => {
    relogioEm()
    await abrir(mundo({ bebeArquivado: true }, sessao({ inicio: em(-1, 15, 0), fim: em(-1, 15, 8) })))
    expect(screen.getAllByText('Heloísa está arquivado. Os registros continuam visíveis, mas não dá para registrar.')).toHaveLength(1)
    for (const nome of ESCRITA) expect(talvezBotao(nome), String(nome)).toBeNull()
    expect(within(bloco()).getByRole('button', { name: 'Ontem' })).toBeTruthy()
  })

  it('bebê arquivado com a página aberta: Iniciar dá T-40 e os controles somem', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    await m.conta.arquivarBebe(ID_BEBE, true)
    await clicar(botao('Iniciar tummy time de Heloísa'))
    expect(within(bloco()).getByRole('alert').textContent).toContain(
      'Heloísa está arquivado. Os registros continuam visíveis, mas não dá para registrar.',
    )
    for (const nome of ESCRITA) expect(talvezBotao(nome), String(nome)).toBeNull()
    expect(await tummyGravado(m)).toHaveLength(0)
  })

  // Cada linha do DES-09 com a memória configurada para responder aquele código.
  const LINHAS: ReadonlyArray<{
    nome: string
    erro: ErroDados
    texto: string
    repetir: boolean
    fechar: boolean
  }> = [
    { nome: 'rede', erro: erro('rede', 'rede', 'rede', 'Failed to fetch'), texto: TT.semResposta, repetir: true, fechar: true },
    {
      nome: 'fora do formato',
      erro: erro('desconhecido', 'desconhecido', '', 'Resposta fora do formato'),
      texto: TT.semResposta,
      repetir: true,
      fechar: true,
    },
    { nome: '40P01', erro: erro('tente_de_novo', 'tente_de_novo', '40P01', 'tente de novo'), texto: TT.servidorOcupado, repetir: true, fechar: false },
    { nome: 'P0002', erro: erro('nao_encontrado', 'nao_encontrado', 'P0002', 'bebe inexistente'), texto: TT.naoEncontrado, repetir: false, fechar: false },
    { nome: '42501', erro: erro('sem_permissao', 'sem_permissao', '42501', 'sem permissao'), texto: TT.semPermissao, repetir: false, fechar: false },
    {
      nome: '23514 no futuro',
      erro: erro('negocio', 'horario_no_futuro', '23514', 'horario no futuro'),
      texto: TT.noFuturo,
      repetir: false,
      fechar: false,
    },
    {
      nome: '23514 de check',
      erro: erro('negocio', 'valor_invalido', '23514', 'new row violates check constraint "registros_fim_check"'),
      texto: TT.fimAntesDoInicio,
      repetir: false,
      fechar: false,
    },
    { nome: '23502', erro: erro('negocio', 'parametro_obrigatorio', '23502', 'parametro obrigatorio'), texto: TT.inesperado, repetir: false, fechar: false },
    { nome: 'XX000', erro: erro('desconhecido', 'desconhecido', 'XX000', 'erro qualquer'), texto: TT.inesperado, repetir: false, fechar: false },
  ]

  function erro(classe: ErroDados['classe'], chave: string, codigo: string, mensagemOriginal: string): ErroDados {
    return { classe, chave, codigo, mensagemOriginal }
  }

  for (const linha of LINHAS) {
    it(`erro ${linha.nome} ao iniciar: a frase do DES-09, sem afirmar que salvou`, async () => {
      relogioEm()
      const m = mundo()
      await abrir(m)
      simularFalhaRotina(m.rotina, 'gravarRegistro', linha.erro)
      await clicar(botao('Iniciar tummy time de Heloísa'))
      const alerta = within(bloco()).getByRole('alert')
      expect(alerta.textContent).toContain(linha.texto)
      expect(within(alerta.closest('[data-erro-de-escrita]') as HTMLElement).queryByRole('button', { name: 'Tentar de novo' }) !== null).toBe(linha.repetir)
      expect(within(alerta.closest('[data-erro-de-escrita]') as HTMLElement).queryByRole('button', { name: 'Fechar' }) !== null).toBe(linha.fechar)
      expect(textoDoBloco()).not.toContain('Tummy time registrado.')
      expect(textoDoBloco()).not.toContain('Salvo.')
      expect(within(bloco()).queryByRole('timer')).toBeNull()
    })
  }

  it('erro bebê arquivado ao registrar: T-40 e os controles somem', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    simularFalhaRotina(m.rotina, 'gravarRegistro', 'bebe_arquivado')
    await clicar(botao('Iniciar tummy time de Heloísa'))
    expect(within(bloco()).getByRole('alert').textContent).toContain('Heloísa está arquivado.')
    expect(talvezBotao(/^Iniciar tummy time/)).toBeNull()
  })

  it('P0001 registro excluído ao encerrar: T-45 e a lista se atualiza', async () => {
    relogioEm()
    const aberta = sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null })
    const m = mundo({}, aberta)
    await abrir(m)
    // Outra pessoa descartou a sessão com a tela aberta.
    await m.rotina.excluirRegistro(aberta.id)
    await clicar(botao('Encerrar tummy time de Heloísa'))
    expect(within(bloco()).getByRole('alert').textContent).toContain('Esta sessão foi descartada por outra pessoa.')
    expect(within(bloco()).queryByRole('timer')).toBeNull()
    expect(talvezBotao('Iniciar tummy time de Heloísa')).not.toBeNull()
  })

  it('P0001 prazo encerrado ao desfazer: T-46', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null }))
    await abrir(m)
    await clicar(botao('Descartar'))
    simularFalhaRotina(m.rotina, 'restaurarRegistro', 'prazo_encerrado')
    await clicar(botao('Desfazer'))
    expect(within(bloco()).getByRole('alert').textContent).toContain('Passou o prazo para desfazer.')
  })

  it('P0001 não é sessão ao encerrar: T-47', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null }))
    await abrir(m)
    simularFalhaRotina(m.rotina, 'encerrarSessao', 'nao_e_sessao')
    await clicar(botao('Encerrar tummy time de Heloísa'))
    expect(within(bloco()).getByRole('alert').textContent).toContain('Algo deu errado e nada foi alterado. Tente de novo.')
  })

  it('sem resposta antes de gravar e "Tentar de novo": no fim, 1 só registro, com a mesma id', async () => {
    relogioEm()
    const m = mundo()
    const gravado = gravando(m.rotina)
    await abrir(m, gravado.dados)
    simularFalhaRotina(m.rotina, 'gravarRegistro', 'rede')
    digitar(await abrirAgora(), '10')
    await salvar()
    expect(within(bloco()).getByText(TT.semResposta)).toBeTruthy()
    // Com o painel aberto, os campos seguem readonly e só há "Tentar de novo" e "Fechar".
    expect((within(bloco()).getByLabelText(TT.duracao) as HTMLInputElement).readOnly).toBe(true)
    await clicar(botao('Tentar de novo'))
    expect(within(bloco()).getByText('Tummy time registrado.')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)
    const gravacoes = gravado.chamadas.filter((chamada) => chamada.operacao === 'gravarRegistro')
    expect(gravacoes).toHaveLength(2)
    expect(gravacoes[1].args).toEqual(gravacoes[0].args)
    expect(ehUuidV7((gravacoes[0].args[0] as { id: string }).id)).toBe(true)
  })

  it('sem resposta depois de gravar e "Tentar de novo" com a mesma id: 1 só registro e T-16', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    simularRespostaPerdidaRotina(m.rotina, 'gravarRegistro')
    digitar(await abrirAgora(), '10')
    await salvar()
    expect(within(bloco()).getByText(TT.semResposta)).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)
    await clicar(botao('Tentar de novo'))
    expect(within(bloco()).getByText('Tummy time registrado.')).toBeTruthy()
    expect(await tummyGravado(m)).toHaveLength(1)
  })

  it('sem resposta e "Fechar": o painel fecha e o registro salvo aparece na lista', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    simularRespostaPerdidaRotina(m.rotina, 'gravarRegistro')
    digitar(await abrirAgora(), '10')
    await salvar()
    await clicar(botao('Fechar'))
    expect(bloco().querySelector('[data-painel-tummy]')).toBeNull()
    expect(within(bloco()).getByText('14:50 – 15:00 · 10 min · por Juliana · registrado depois')).toBeTruthy()
    expect(textoDoBloco()).not.toContain(TT.semResposta)
  })

  it('Encerrar sem resposta (sem painel): T-41 perto do botão, que segue aria-disabled; "Fechar" tira a mensagem e a releitura mostra a sessão encerrada', async () => {
    relogioEm()
    const aberta = sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null })
    const m = mundo({}, aberta)
    await abrir(m)
    simularRespostaPerdidaRotina(m.rotina, 'encerrarSessao')
    await clicar(botao('Encerrar tummy time de Heloísa'))
    const cartao = bloco().querySelector<HTMLElement>(`[data-sessao-tummy="${aberta.id}"]`)!
    expect(within(cartao).getByRole('alert').textContent).toContain(TT.semResposta)
    expect(within(cartao).getByRole('button', { name: 'Encerrar tummy time de Heloísa' }).getAttribute('aria-disabled')).toBe('true')
    await clicar(within(cartao).getByRole('button', { name: 'Fechar' }))
    expect(textoDoBloco()).not.toContain(TT.semResposta)
    expect(within(bloco()).queryByRole('timer')).toBeNull()
    expect(within(bloco()).getByText('Hoje: 1 sessão, 10 min no total')).toBeTruthy()
  })

  it('escrita com sucesso e releitura com falha: a confirmação e, abaixo, T-52 com "Atualizar", que lê de novo', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    digitar(await abrirAgora(), '10')
    simularFalhaRotina(m.rotina, 'sessoesDaJanela', 'rede')
    await salvar()
    expect(within(bloco()).getByText('Tummy time registrado.')).toBeTruthy()
    expect(within(bloco()).getByText('Salvo. Não deu para atualizar a lista.')).toBeTruthy()
    await clicar(botao('Atualizar'))
    expect(textoDoBloco()).not.toContain('Salvo. Não deu para atualizar a lista.')
    expect(within(bloco()).getByText('Hoje: 1 sessão, 10 min no total')).toBeTruthy()
  })

  it('troca de bebê com o painel aberto e sem operação pendente: o painel fecha, nada é gravado, e voltar ao 1º bebê abre sem painel', async () => {
    relogioEm()
    const m = mundo({ bebesExtras: [TEO] })
    await abrir(m)
    digitar(await abrirAgora(), '10')
    const seletor = screen.getByRole('combobox', { name: 'Bebê' })
    await act(async () => {
      fireEvent.change(seletor, { target: { value: TEO.id } })
    })
    await aguardarCarga()
    expect(bloco().querySelector('[data-painel-tummy]')).toBeNull()
    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Bebê' }), { target: { value: ID_BEBE } })
    })
    await aguardarCarga()
    expect(bloco().querySelector('[data-painel-tummy]')).toBeNull()
    expect(await tummyGravado(m)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('DES-10: o provedor da área', () => {
  it('o provedor injeta a DadosRotina em memória: o gancho lê pela rotina dada, sem rede', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: em(-1, 15, 0), fim: em(-1, 15, 8) }))
    const { result } = renderHook(() => useDadosDesenvolvimento(), {
      wrapper: ({ children }: { children: ReactNode }) => <ProvedorDadosDesenvolvimento dados={m.rotina}>{children}</ProvedorDadosDesenvolvimento>,
    })
    const lido = await result.current.lerBloco(ID_BEBE, FUSO_DO_APARELHO, HOJE.getTime())
    expect(lido.ok && lido.valor.sessoes.map((registro) => registro.inicio)).toEqual([new Date(em(-1, 15, 0)).toISOString()])
    expect(lido.ok && lido.valor.emAndamento).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('DES-13 16: a integração com a DadosRotina (na tela)', () => {
  it('a leitura usa emAndamento e sessoesDaJanela(["tummy"]) desde 00:00 de D-6; Iniciar e "Fizemos agora" gravam o tipo, a origem e o id certos', async () => {
    relogioEm()
    const m = mundo()
    const gravado = gravando(m.rotina)
    await abrir(m, gravado.dados)
    const leituras = gravado.chamadas.filter((chamada) => chamada.operacao === 'sessoesDaJanela')
    expect(leituras[0].args).toEqual([ID_BEBE, new Date(2026, 10, 6, 0, 0, 0, 0).toISOString(), HOJE.toISOString(), ['tummy']])
    expect(gravado.chamadas.some((chamada) => chamada.operacao === 'emAndamento' && chamada.args[0] === ID_BEBE)).toBe(true)

    await clicar(botao('Iniciar tummy time de Heloísa'))
    const gravacoes = () => gravado.chamadas.filter((chamada) => chamada.operacao === 'gravarRegistro')
    const iniciar = gravacoes()[0].args[0] as { id: string; tipo: string; origem: string; fim: unknown; inicio: string }
    expect(iniciar).toMatchObject({ tipo: 'tummy', origem: 'ao_vivo', fim: null, inicio: HOJE.toISOString() })
    expect(ehUuidV7(iniciar.id)).toBe(true)

    await clicar(botao('Encerrar tummy time de Heloísa'))
    expect(gravado.chamadas.some((chamada) => chamada.operacao === 'encerrarSessao' && chamada.args[0] === iniciar.id)).toBe(true)

    digitar(await abrirAgora(), '5')
    await salvar()
    const depois = gravacoes()[1].args[0] as { id: string; tipo: string; origem: string }
    expect(depois).toMatchObject({ tipo: 'tummy', origem: 'retroativo' })
    expect(ehUuidV7(depois.id)).toBe(true)
    expect(depois.id).not.toBe(iniciar.id)

    await clicar(botao('Desfazer'))
    expect(gravado.chamadas.some((chamada) => chamada.operacao === 'excluirRegistro' && chamada.args[0] === depois.id)).toBe(true)
  })

  it('Descartar chama excluirRegistro e "Desfazer", restaurarRegistro, com a id da sessão', async () => {
    relogioEm()
    const aberta = sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null })
    const m = mundo({}, aberta)
    const gravado = gravando(m.rotina)
    await abrir(m, gravado.dados)
    await clicar(botao('Descartar'))
    await clicar(botao('Desfazer'))
    const chamadas = gravado.chamadas.filter((c) => c.operacao === 'excluirRegistro' || c.operacao === 'restaurarRegistro')
    expect(chamadas).toEqual([
      { operacao: 'excluirRegistro', args: [aberta.id] },
      { operacao: 'restaurarRegistro', args: [aberta.id] },
    ])
  })
})

// ---------------------------------------------------------------------------------------------------------------
async function violacoes(container: HTMLElement): Promise<string[]> {
  // O jsdom não calcula cor nem layout: o contraste é conferido nas capturas. `region` não vale fora da casca.
  const resultado = await rodarAxe(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`)
}

describe('DES-13 17: sem cobrança e acessibilidade do bloco', () => {
  it('nenhum estado cobra: sem meta, anel, barra de progresso, sequência, selo, comparação nem "você não cumpriu"', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: em(-1, 15, 0), fim: em(-1, 15, 8) }), sessao({ inicio: HOJE.getTime() - 5 * MINUTO, fim: null }))
    await abrir(m)
    const estados: string[] = [textoDoBloco()]
    await clicar(within(bloco()).getByRole('button', { name: 'Ontem' }))
    estados.push(textoDoBloco())
    await abrirAgora()
    estados.push(textoDoBloco())
    await clicar(botao(TT.cancelar))
    for (const texto of estados) {
      expect(texto).not.toMatch(/meta|sequência|seguidos|você não cumpriu|parabéns|comparad|ranking|recorde|atras|pontos|medalha|conquista/i)
    }
    expect(bloco().querySelector('[role="progressbar"], [role="meter"], progress, meter, svg, canvas')).toBeNull()
  })

  const CENARIOS: ReadonlyArray<readonly [string, () => Promise<void>]> = [
    [
      'carregando',
      async () => {
        const m = mundo()
        const preso = segurando(m.rotina, 'sessoesDaJanela')
        renderizarRota('/app/desenvolvimento', { mundo: { ...m, rotina: preso.dados } })
        await waitFor(() => expect(document.querySelector('[data-tummy][aria-busy="true"]')).not.toBeNull())
      },
    ],
    ['vazio', async () => abrir(mundo())],
    ['em andamento', async () => abrir(mundo({}, sessao({ inicio: HOJE.getTime() - 5 * MINUTO, fim: null })))],
    [
      'painel aberto',
      async () => {
        await abrir(mundo({}, sessao({ inicio: em(-1, 15, 0), fim: em(-1, 15, 8) })))
        await abrirAgora()
      },
    ],
    [
      'formulário com erro',
      async () => {
        await abrir(mundo())
        const campos = await abrirHorario()
        digitar(campos.fim, '14:00')
        await salvar()
        expect(within(bloco()).getByText('Preencha o início e o fim.')).toBeTruthy()
      },
    ],
    [
      'T-27',
      async () => {
        await abrir(mundo({}, sessao({ inicio: HOJE.getTime() - 5 * MINUTO, fim: null })))
        digitar(await abrirAgora(), '2')
        await salvar()
        expect(within(bloco()).getByText(TT.sobreposicao)).toBeTruthy()
      },
    ],
    [
      'T-41',
      async () => {
        const m = mundo()
        await abrir(m)
        simularFalhaRotina(m.rotina, 'gravarRegistro', 'rede')
        digitar(await abrirAgora(), '10')
        await salvar()
        expect(within(bloco()).getByText(TT.semResposta)).toBeTruthy()
      },
    ],
    [
      'T-52',
      async () => {
        const m = mundo()
        await abrir(m)
        digitar(await abrirAgora(), '10')
        simularFalhaRotina(m.rotina, 'sessoesDaJanela', 'rede')
        await salvar()
        expect(within(bloco()).getByText(TT.salvoSemAtualizar)).toBeTruthy()
      },
    ],
    [
      'T-58',
      async () => {
        relogioEm(new Date('2026-03-09T20:00:00Z'))
        simularAparelho('America/New_York', -240)
        await abrir(mundo())
        const campos = await abrirHorario()
        digitar(campos.dia, '2026-03-08')
        digitar(campos.inicio, '02:30')
        digitar(campos.fim, '02:45')
        await salvar()
        expect(within(bloco()).getByText(TT.horarioInexistente)).toBeTruthy()
      },
    ],
    [
      'T-59 no bloco',
      async () => {
        const m = mundo()
        simularFalhaRotina(m.rotina, 'emAndamento', 'rede')
        await abrir(m)
        expect(within(bloco()).getByText(T.falhaDeLeitura)).toBeTruthy()
      },
    ],
    [
      'T-63',
      async () => {
        const m = mundo({}, sessao({ inicio: em(-1, 15, 0), fim: em(-1, 15, 8) }))
        await abrir(
          m,
          interceptar(m.rotina, async (operacao, _args, seguir) => {
            const resposta = await seguir()
            return operacao === 'sessoesDaJanela' && resposta.ok ? { ok: true, valor: { ...(resposta.valor as object), incompleta: true } } : resposta
          }),
        )
        expect(within(bloco()).getByText(TT.listaIncompleta)).toBeTruthy()
      },
    ],
  ]

  for (const tema of ['claro', 'madrugada'] as const) {
    for (const [nome, preparar] of CENARIOS) {
      it(`axe sem violação: ${nome} (${tema})`, async () => {
        if (nome !== 'T-58') relogioEm()
        if (tema === 'madrugada') document.documentElement.setAttribute('data-tema', 'madrugada')
        await preparar()
        expect(await violacoes(document.body)).toEqual([])
      })
    }
  }

  it('com data-tema="madrugada", o campo de cor do bloco em andamento é o da noite, e a página acompanha a mudança sem recarregar', async () => {
    relogioEm()
    await abrir(mundo({}, sessao({ inicio: HOJE.getTime() - 5 * MINUTO, fim: null })))
    const campo = () => bloco().querySelector<HTMLElement>('[data-campo-cor]')!
    expect(campo().getAttribute('data-campo-cor')).toBe('mel')
    expect(campo().getAttribute('data-painel')).toBe('mel')
    act(() => document.documentElement.setAttribute('data-tema', 'madrugada'))
    await waitFor(() => expect(campo().getAttribute('data-campo-cor')).toBe('noite'))
    expect(campo().getAttribute('data-painel')).toBe('cacau')
    act(() => document.documentElement.removeAttribute('data-tema'))
    await waitFor(() => expect(campo().getAttribute('data-campo-cor')).toBe('mel'))
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('DES-13 19: o fail-closed do 39b', () => {
  it('sessão aberta por Bruno, vista por um cuidador: Encerrar existe e Descartar não; Descartar direto na memória dá 42501, e a tela mostra T-44', async () => {
    relogioEm()
    const dela = sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null, autor: PESSOAS.bruno.id })
    const m = mundo({ papelDeBruno: 'cuidador', sessao: 'bruno' }, dela)
    await abrir(m)
    expect(talvezBotao('Encerrar tummy time de Heloísa')).not.toBeNull()
    // Bruno é o autor: Descartar existe para ele; a de outra pessoa não.
    const alheia = sessao({ inicio: HOJE.getTime() - 20 * MINUTO, fim: null, autor: PESSOAS.juliana.id })
    const direto = await mundo({ sessao: 'bruno' }, alheia).rotina.excluirRegistro(alheia.id)
    expect(!direto.ok && direto.erro.codigo).toBe('42501')

    simularFalhaRotina(m.rotina, 'excluirRegistro', 'sem_permissao')
    await clicar(botao('Descartar'))
    expect(within(bloco()).getByRole('alert').textContent).toContain('Sem permissão. Seu papel nesta família não permite esta ação.')
  })

  it('o relógio do aparelho 2 minutos antes do início gravado: cronômetro 00:00, e Encerrar mostra T-68 sem chamar a DadosRotina', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: HOJE.getTime() + 2 * MINUTO, fim: null }))
    const gravado = gravando(m.rotina)
    await abrir(m, gravado.dados)
    expect(within(bloco()).getByRole('timer').textContent).toBe('00:00')
    await clicar(botao('Encerrar tummy time de Heloísa'))
    expect(within(bloco()).getByRole('alert').textContent).toContain(
      'O relógio deste aparelho está antes do início da sessão. Confira a hora do aparelho.',
    )
    expect(gravado.chamadas.some((chamada) => chamada.operacao === 'encerrarSessao')).toBe(false)
  })

  it('fuso do aparelho America/New_York e da família America/Sao_Paulo: T-06 no formulário, e o instante gravado é o do fuso do aparelho', async () => {
    relogioEm(new Date('2026-11-12T18:00:00Z'))
    simularAparelho('America/New_York', -300)
    const m = mundo({ fusoDaFamilia: 'America/Sao_Paulo' })
    await abrir(m)
    const campos = await abrirHorario()
    const painel = bloco().querySelector<HTMLElement>('[data-painel-tummy="horario"]')!
    expect(within(painel).getByText('Horários no fuso deste aparelho (America/New_York). O dia segue o fuso da família (America/Sao_Paulo).')).toBeTruthy()
    digitar(campos.dia, '2026-11-12')
    digitar(campos.inicio, '08:00')
    digitar(campos.fim, '08:20')
    await salvar()
    const [gravado] = await tummyGravado(m)
    // 08:00 em Nova York (UTC-5 em 12/11/2026) é 13:00 UTC.
    expect(gravado.inicio).toBe('2026-11-12T13:00:00.000Z')
    expect(gravado.fim).toBe('2026-11-12T13:20:00.000Z')
  })

  it('erro do banco fora da tabela (XX000): T-47 e nada mostrado como salvo; resposta fora do formato: T-41, nunca T-16', async () => {
    relogioEm()
    const m = mundo()
    await abrir(m)
    simularFalhaRotina(m.rotina, 'gravarRegistro', erroBanco('desconhecido', 'XX000'))
    digitar(await abrirAgora(), '10')
    await salvar()
    expect(within(bloco()).getByText('Algo deu errado e nada foi alterado. Tente de novo.')).toBeTruthy()
    expect(textoDoBloco()).not.toContain('Tummy time registrado.')
    expect(await tummyGravado(m)).toHaveLength(0)

    simularFalhaRotina(m.rotina, 'gravarRegistro', erroBanco('desconhecido', ''))
    await salvar()
    expect(within(bloco()).getByText(TT.semResposta)).toBeTruthy()
    expect(textoDoBloco()).not.toContain('Tummy time registrado.')
  })

  function erroBanco(chave: string, codigo: string): ErroDados {
    return { classe: 'desconhecido', chave, codigo, mensagemOriginal: 'x' }
  }

  it('a 1ª leitura do bloco falha: T-59, controles aria-disabled, e um toque em "Fizemos agora" não grava nada; "Tentar de novo" carrega', async () => {
    relogioEm()
    const m = mundo()
    simularFalhaRotina(m.rotina, 'emAndamento', 'rede')
    await abrir(m)
    expect(within(bloco()).getByText('Não deu para carregar os dados. Confira a conexão.')).toBeTruthy()
    for (const nome of [/^Iniciar tummy time/, TT.fizemosAgora, TT.outroHorario]) {
      expect(botao(nome).getAttribute('aria-disabled'), String(nome)).toBe('true')
    }
    await clicar(botao(TT.fizemosAgora))
    expect(bloco().querySelector('[data-painel-tummy]')).toBeNull()
    expect(await tummyGravado(m)).toHaveLength(0)

    await clicar(botao('Tentar de novo'))
    expect(textoDoBloco()).not.toContain('Não deu para carregar os dados.')
    expect(botao(TT.fizemosAgora).getAttribute('aria-disabled')).toBeNull()
  })

  it('lista incompleta: T-63 e sem resumo do dia', async () => {
    relogioEm()
    const m = mundo({}, sessao({ inicio: em(-1, 15, 0), fim: em(-1, 15, 8) }))
    await abrir(
      m,
      interceptar(m.rotina, async (operacao, _args, seguir) => {
        const resposta = await seguir()
        return operacao === 'sessoesDaJanela' && resposta.ok ? { ok: true, valor: { ...(resposta.valor as object), incompleta: true } } : resposta
      }),
    )
    expect(within(bloco()).getByText('A lista ficou incompleta. Os totais do dia não aparecem.')).toBeTruthy()
    expect(textoDoBloco()).not.toMatch(/no total|nenhuma sessão registrada/)
    await clicar(within(bloco()).getByRole('button', { name: 'Ontem' }))
    expect(textoDoBloco()).not.toMatch(/no total|nenhuma sessão registrada/)
    expect(within(bloco()).getByText('15:00 – 15:08 · 8 min · por Juliana')).toBeTruthy()
  })

  it('a resposta que chega depois de 15 segundos (relógio falso): T-41 já na tela, a resposta tardia não muda nada, e a releitura manda', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(HOJE)
    const m = mundo()
    const preso = segurando(m.rotina, 'gravarRegistro')
    await abrir(m, preso.dados)
    await act(async () => {
      fireEvent.click(botao('Iniciar tummy time de Heloísa'))
    })
    expect(screen.getAllByText('Salvando…')).toHaveLength(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })
    expect(within(bloco()).getByText(TT.semResposta)).toBeTruthy()
    expect(screen.queryByText('Salvando…')).toBeNull()

    // A resposta tardia chega: a tela não muda (nada de "Em andamento" nem de confirmação).
    await act(async () => {
      preso.liberar()
    })
    await aguardarCarga()
    expect(within(bloco()).getByText(TT.semResposta)).toBeTruthy()
    expect(within(bloco()).queryByRole('timer')).toBeNull()

    // "Fechar" relê: a sessão gravada aparece, com os 15 segundos que o relógio falso andou.
    await act(async () => {
      fireEvent.click(botao('Fechar'))
    })
    await aguardarCarga()
    expect(within(bloco()).getByRole('timer').textContent).toBe('00:15')
  })

  it('a resposta da leitura do 1º bebê, chegando depois da troca para o 2º, é descartada', async () => {
    relogioEm()
    const dela = sessao({ inicio: HOJE.getTime() - 10 * MINUTO, fim: null })
    const m = mundo({ bebesExtras: [TEO] }, dela)
    const preso = segurando(m.rotina, 'emAndamento', 'primeira')
    renderizarRota('/app/desenvolvimento', { mundo: { ...m, rotina: preso.dados } })
    const seletor = await screen.findByRole('combobox', { name: 'Bebê' })
    await waitFor(() => expect(preso.chamadas).toHaveLength(1))
    await act(async () => {
      fireEvent.change(seletor, { target: { value: TEO.id } })
    })
    await aguardarCarga()
    expect(textoDoBloco()).toContain('Nenhum tummy time nos últimos 7 dias.')

    await act(async () => {
      preso.liberar()
    })
    await aguardarCarga()
    expect(within(bloco()).queryByRole('timer')).toBeNull()
    expect(textoDoBloco()).toContain('Nenhum tummy time nos últimos 7 dias.')
  })
})

// ---------------------------------------------------------------------------------------------------------------
// R2: uma sessão em andamento termina, para a conta da sobreposição, no instante da validação (nunca no infinito).
describe('R2: a sobreposição com a sessão em andamento', () => {
  const AGORA = HOJE.getTime()
  const aberta = (inicio: number) => sessao({ inicio, fim: null })
  const fechada = (inicio: number, fim: number) => sessao({ inicio, fim })
  const passo = (inicio: number, fim: number, lidas: Registro[]) => proximoPasso({ inicio, fim }, lidas, [], AGORA)

  it('sem duração (início = fim = agora) com uma sessão aberta há 10 min: nenhuma confirmação', () => {
    expect(passo(AGORA, AGORA, [aberta(AGORA - 10 * MINUTO)])).toBeNull()
  })

  it('2 min de duração dentro de uma sessão aberta há 10 min: T-27 (sobreposição real)', () => {
    expect(passo(AGORA - 2 * MINUTO, AGORA, [aberta(AGORA - 10 * MINUTO)])).toBe('sobreposicao')
  })

  it('bordas: a sessão aberta que começa exatamente no fim do intervalo apenas encosta; em ponto no meio dela, é contenção estrita', () => {
    expect(passo(AGORA - 2 * MINUTO, AGORA, [aberta(AGORA)])).toBeNull()
    expect(passo(AGORA - 5 * MINUTO, AGORA - 5 * MINUTO, [aberta(AGORA - 10 * MINUTO)])).toBe('sobreposicao')
    expect(passo(AGORA - 10 * MINUTO, AGORA - 10 * MINUTO, [aberta(AGORA - 10 * MINUTO)])).toBeNull()
  })

  it('a mesma regra vale para a sessão encerrada: ponto no meio avisa, ponto nas pontas não', () => {
    const lida = [fechada(AGORA - 10 * MINUTO, AGORA - 5 * MINUTO)]
    expect(passo(AGORA - 7 * MINUTO, AGORA - 7 * MINUTO, lida)).toBe('sobreposicao')
    expect(passo(AGORA - 5 * MINUTO, AGORA - 5 * MINUTO, lida)).toBeNull()
    expect(passo(AGORA - 10 * MINUTO, AGORA - 10 * MINUTO, lida)).toBeNull()
    expect(passo(AGORA - 5 * MINUTO, AGORA, lida)).toBeNull()
    expect(passo(AGORA - 6 * MINUTO, AGORA, lida)).toBe('sobreposicao')
  })

  it('na tela, com a memória real: "Fizemos agora" sem duração ao lado de uma sessão aberta há 10 min grava direto, sem T-27', async () => {
    relogioEm()
    const m = mundo({}, aberta(AGORA - 10 * MINUTO))
    await abrir(m)
    await abrirAgora()
    await salvar()
    expect(within(bloco()).queryByText(TT.sobreposicao)).toBeNull()
    expect(within(bloco()).getByText(TT.registrado)).toBeTruthy()
    const gravados = await tummyGravado(m)
    expect(gravados.filter((registro) => registro.origem === 'retroativo')).toHaveLength(1)
  })

  it('na tela, com a memória real: 2 min de duração ao lado da sessão aberta mantém T-27 e só grava depois de "Salvar mesmo assim"', async () => {
    relogioEm()
    const m = mundo({}, aberta(AGORA - 10 * MINUTO))
    await abrir(m)
    digitar(await abrirAgora(), '2')
    await salvar()
    expect(within(bloco()).getByText(TT.sobreposicao)).toBeTruthy()
    expect((await tummyGravado(m)).filter((registro) => registro.origem === 'retroativo')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------------------------------------------
// R3: leitura incompleta nunca vira "vazio".
describe('R3: a leitura incompleta sem nenhum tummy time', () => {
  const sono = (inicio: number): Registro => ({ ...sessao({ inicio, fim: null }), tipo: 'sono' })
  // Só estas sessões abertas (a de sono de Bruno, da fixture, sai): o limite de `emAndamento` é 20.
  const comAbertasDeSono = (quantas: number) =>
    criarMundoDeTeste({
      ajustarRotina: (fixture) => {
        const base = semSessaoEmAndamento(comTummy()(fixture))
        const abertas = Array.from({ length: quantas }, (_, indice) => sono(HOJE.getTime() - (indice + 1) * MINUTO))
        return { ...base, registros: [...base.registros, ...abertas] }
      },
    })

  it('21 sessões abertas de sono e nenhuma de tummy (a leitura passou do limite): T-63, sem T-22 e sem resumo', async () => {
    relogioEm()
    await abrir(comAbertasDeSono(21))
    expect(within(bloco()).getByText(TT.listaIncompleta)).toBeTruthy()
    expect(bloco().querySelector('[data-historico-vazio]')).toBeNull()
    expect(textoDoBloco()).not.toContain(TT.vazio)
    expect(bloco().querySelector('[data-resumo-do-dia]')).toBeNull()
    expect(textoDoBloco()).not.toMatch(/no total|nenhuma sessão registrada/)
  })

  it('no limite exato (20 abertas): a leitura é completa e vale o estado vazio T-22', async () => {
    relogioEm()
    await abrir(comAbertasDeSono(20))
    expect(within(bloco()).getByText(TT.vazio)).toBeTruthy()
    expect(within(bloco()).queryByText(TT.listaIncompleta)).toBeNull()
  })

  it('a leitura da janela incompleta (sem tummy nenhum): também T-63, nunca T-22', async () => {
    relogioEm()
    const m = mundo()
    await abrir(
      m,
      interceptar(m.rotina, async (operacao, _args, seguir) => {
        const resposta = await seguir()
        return operacao === 'sessoesDaJanela' && resposta.ok ? { ok: true, valor: { ...(resposta.valor as object), incompleta: true } } : resposta
      }),
    )
    expect(within(bloco()).getByText(TT.listaIncompleta)).toBeTruthy()
    expect(textoDoBloco()).not.toContain(TT.vazio)
    expect(bloco().querySelector('[data-resumo-do-dia]')).toBeNull()
  })

  it('a fila de 7 dias continua escolhível com T-63, e o dia escolhido também não afirma "nenhuma sessão"', async () => {
    relogioEm()
    await abrir(comAbertasDeSono(21))
    await clicar(within(bloco()).getByRole('button', { name: 'Ontem' }))
    expect(within(bloco()).getByText(TT.listaIncompleta)).toBeTruthy()
    expect(textoDoBloco()).not.toMatch(/no total|nenhuma sessão registrada/)
  })
})
