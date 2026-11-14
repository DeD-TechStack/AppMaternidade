import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FAMILIAS_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { simularFalhaRotina, type FixtureRotina } from '../../dados/rotina.memoria.ts'
import type { DetalhesRegistro, TipoRegistro } from '../../dados/rotina.tipos.ts'
import { adiarRotina, type RotinaAdiada } from '../../teste/adiado.ts'
import { criarComunidadeDeTeste } from '../../teste/comunidade.fixture.ts'
import { PESSOAS } from '../../teste/renderizarComDados.tsx'
import { aguardarCarga, renderizarRota } from '../../teste/renderizarRota.tsx'
import { relogioDoTeste } from '../../teste/relogio.ts'
import { criarMundoDeTeste, type OpcoesMundo } from '../../teste/rotina.fixture.ts'
import { paradasDeTab, tabular } from '../../paginas/conta/tabular.ts'
import * as peca from './index.ts'
import { PainelDoResumo } from './PainelDoResumo.tsx'

// O painel "Resumo da rotina" (RF12: RF-02 a RF-05, RF-10, RF-15, RF-18, RF-19), pela página do tópico novo, com a
// Comunidade e a rotina em memória isoladas e o relógio fixo em 14/11/2026, 12:00. Os textos são os da spec (RN-08).

const DIA = (dia: number, hora: number, minuto = 0) => new Date(2026, 10, dia, hora, minuto).getTime()

type Reg = [tipo: TipoRegistro, inicio: number, fim: number | null, detalhes?: DetalhesRegistro, nota?: string]

/** A rotina de teste só com estes registros (sem os da fixture), copiados do primeiro registro dela. */
function comRegistros(lista: Reg[]) {
  return (fixture: FixtureRotina): FixtureRotina => {
    const modelo = fixture.registros[0]
    return {
      ...fixture,
      registros: lista.map(([tipo, inicio, fim, detalhes = {}, nota = null], indice) => ({
        ...modelo,
        id: `a3000000-0000-7000-8000-${String(indice).padStart(12, '0')}`,
        tipo,
        inicio: new Date(inicio).toISOString(),
        fim: fim === null ? null : new Date(fim).toISOString(),
        detalhes,
        nota,
        recebidoEm: new Date(fim ?? inicio).toISOString(),
        atualizadoEm: new Date(fim ?? inicio).toISOString(),
        encerradoPor: fim === null ? null : modelo.criadoPor,
      })),
    }
  }
}

const HOJE_CHEIO: Reg[] = [
  ['sono', DIA(14, 2), DIA(14, 5), {}, 'nota que não pode aparecer'],
  ['sono', DIA(14, 7), DIA(14, 7, 30)],
  ['mamada', DIA(14, 8), DIA(14, 8, 15), { lado: 'esquerdo' }],
  ['mamada', DIA(14, 9), DIA(14, 9, 20), { lado: 'direito' }],
  ['tummy', DIA(14, 10, 30), DIA(14, 10, 45)],
  ['mamadeira', DIA(14, 11), null, { ml: 120 }],
  ['fralda', DIA(14, 6), null, { conteudo: 'xixi' }],
  ['fralda', DIA(14, 8, 30), null, { conteudo: 'coco' }],
  ['fralda', DIA(14, 10), null, { conteudo: 'ambos' }],
  ['solido', DIA(14, 11, 30), null],
]

/** Hoje cheio e mais ontem (13/11): 3 mamadas e 2 h de sono; a semana tem 2 dias com registro. */
const SEMANA_DE_2_DIAS: Reg[] = [
  ...HOJE_CHEIO,
  ['mamada', DIA(13, 8), DIA(13, 8, 15)],
  ['mamada', DIA(13, 9), DIA(13, 9, 15)],
  ['mamada', DIA(13, 10), DIA(13, 10, 15)],
  ['sono', DIA(13, 20), DIA(13, 22)],
]

function iniciarRelogio(dia = 14, hora = 12, minuto = 0) {
  vi.useFakeTimers({ toFake: ['Date'] })
  const definir = relogioDoTeste()
  definir(new Date(2026, 10, dia, hora, minuto))
  return definir
}

/** O nascimento de Heloísa na fixture: 3 meses e 10 dias antes de hoje (14/11/2026). */
const NASCIMENTO_DA_HELOISA = '2026-08-04'

async function cena(opcoes: OpcoesMundo & { registros?: Reg[]; strict?: boolean } = {}) {
  const { registros, strict, ...doMundo } = opcoes
  const mundo = criarMundoDeTeste({ ...doMundo, ...(registros ? { ajustarRotina: comRegistros(registros) } : {}) })
  const adiada = adiarRotina(mundo.rotina)
  const conta = doMundo.sessao === undefined || doMundo.sessao === null ? PESSOAS.juliana : PESSOAS[doMundo.sessao]
  const comunidade = criarComunidadeDeTeste(conta.id)
  const tela = renderizarRota('/app/comunidade/sono/novo', { mundo: { ...mundo, rotina: adiada.dados }, comunidade: comunidade.dados, strict })
  await screen.findByRole('heading', { level: 1, name: 'Novo tópico' })
  await aguardarCarga()
  return { tela, mundo, adiada, comunidade }
}

const botaoDoResumo = () => screen.getByRole('button', { name: 'Incluir resumo da rotina' })
const abrir = () => fireEvent.click(botaoDoResumo())
const painel = () => screen.getByRole('group', { name: 'Resumo da rotina' })
const noPainel = () => within(painel())
const caixas = () => noPainel().queryAllByRole('checkbox') as HTMLInputElement[]
const nomesDasCaixas = () => caixas().map((caixa) => caixa.labels?.[0]?.textContent)
const marcar = (nome: string) => fireEvent.click(noPainel().getByRole('checkbox', { name: nome }))
const bloco = () => document.querySelector('[data-bloco]')?.textContent ?? null
const inserir = () => noPainel().getByRole('button', { name: 'Inserir no texto' }) as HTMLButtonElement
const aguardarCaixas = () => waitFor(() => expect(caixas().length).toBeGreaterThan(0))
const aguardarTexto = (texto: string) => waitFor(() => expect(noPainel().getByRole('status').textContent).toBe(texto))
const radios = (grupo: string) => within(noPainel().getByRole('group', { name: grupo })).getAllByRole('radio') as HTMLInputElement[]
const rotuloDe = (radio: HTMLInputElement) => radio.labels?.[0]?.textContent

const leituras = (adiada: RotinaAdiada) => ({ contexto: adiada.contagem('contexto'), doDia: adiada.contagem('doDia'), sessoes: adiada.contagem('sessoesDaJanela') })
const cancelar = () => fireEvent.click(noPainel().getByRole('button', { name: 'Cancelar' }))

const sessaoVencida: ErroDados = { classe: 'sessao_encerrada', chave: 'sessao_encerrada', codigo: '', mensagemOriginal: '' }

describe('painel: o ponto de entrada', () => {
  it('painel: o index.ts da peça entrega o mesmo painel (A2: a Comunidade importa só dele)', () => {
    expect(peca.PainelDoResumo).toBe(PainelDoResumo)
  })
})

describe('painel: o que o painel mostra', () => {
  it('painel: sem família, sem bebê, cuidador, observador e só arquivado (RF-02, estado 3)', async () => {
    iniciarRelogio()
    const casos: Array<[OpcoesMundo, string]> = [
      [{ sessao: 'davi' }, 'Você ainda não faz parte de uma família.'],
      [{ semBebes: true }, 'Esta família ainda não tem bebê cadastrado.'],
      [{ sessao: 'bruno' }, 'Só quem é responsável pelo bebê pode compartilhar números da rotina.'],
      [{ sessao: 'davi', papelDeDavi: 'observador' }, 'Só quem é responsável pelo bebê pode compartilhar números da rotina.'],
      [{ bebeArquivado: true }, 'Não há bebê ativo para resumir.'],
    ]
    for (const [opcoes, texto] of casos) {
      const { tela } = await cena(opcoes)
      abrir()
      await waitFor(() => expect(painel().textContent).toContain(texto))
      expect(noPainel().queryAllByRole('radio')).toEqual([])
      expect(caixas()).toEqual([])
      expect(noPainel().queryByRole('button', { name: 'Inserir no texto' })).toBeNull()
      expect(noPainel().getByRole('button', { name: 'Cancelar' })).toBeTruthy()
      tela.unmount()
    }
  })

  it('painel: com 1 bebê elegível ele já vem escolhido, com idade e sem família; com 2 ou mais nenhum vem escolhido (RF-03, estado 4)', async () => {
    iniciarRelogio()
    const um = await cena()
    abrir()
    await aguardarCaixas()
    const [unico] = radios('Bebê')
    expect(unico.checked).toBe(true)
    expect(rotuloDe(unico)).toMatch(/^Heloísa, \d+ \w+/)
    expect(rotuloDe(unico)).not.toContain('·')
    expect(noPainel().getByText('O nome aparece só aqui, para você escolher.')).toBeTruthy()
    um.tela.unmount()

    await cena({ bebesExtras: [{ id: 'c1000000-0000-4000-8000-000000000001', nome: 'Amora', nascimento: '2026-08-01', estado: 'ativo' }] })
    abrir()
    await waitFor(() => expect(radios('Bebê')).toHaveLength(2))
    expect(radios('Bebê').map((radio) => radio.checked)).toEqual([false, false])
    expect(noPainel().getByRole('status').textContent).toBe('')
    expect(painel().textContent).toContain('Escolha um bebê para ver os números.')
    expect(caixas()).toEqual([])
    expect(noPainel().queryByRole('button', { name: 'Inserir no texto' })?.hasAttribute('disabled')).toBe(true)
  })

  it('painel: ordem do seletor da Rotina (nome sem diferença de maiúscula, depois id), só os elegíveis (RF-03)', async () => {
    iniciarRelogio()
    const extra = (id: string, nome: string, estado: 'ativo' | 'arquivado' = 'ativo') => ({ id, nome, nascimento: '2026-08-01', estado })
    await cena({
      bebesExtras: [
        extra('c1000000-0000-4000-8000-000000000003', 'Zeca'),
        extra('c1000000-0000-4000-8000-000000000002', 'abel'),
        extra('c1000000-0000-4000-8000-000000000004', 'Arquivada', 'arquivado'),
      ],
    })
    abrir()
    await waitFor(() => expect(radios('Bebê')).toHaveLength(3))
    expect(radios('Bebê').map((radio) => rotuloDe(radio)?.split(',')[0])).toEqual(['abel', 'Heloísa', 'Zeca'])
  })

  it('painel: homônimos em 2 famílias ganham a família; na mesma família, o segundo ganha (2) e o terceiro (3) (RF-03)', async () => {
    iniciarRelogio()
    const duas = await cena({
      papelNaFamiliaTeste: 'responsavel',
      bebesExtras: [{ id: 'c1000000-0000-4000-8000-000000000005', nome: 'Heloísa', nascimento: NASCIMENTO_DA_HELOISA, estado: 'ativo', familiaId: FAMILIAS_DEMONSTRACAO.teste }],
    })
    abrir()
    await waitFor(() => expect(radios('Bebê')).toHaveLength(2))
    const rotulos = radios('Bebê').map((radio) => rotuloDe(radio))
    expect(rotulos[0]).toMatch(/^Heloísa, .+ · Família Exemplo$/)
    expect(rotulos[1]).toMatch(/^Heloísa, .+ · Família Teste$/)
    expect(radios('Bebê').some((radio) => radio.checked)).toBe(false)
    duas.tela.unmount()

    const gemeas = [2, 3].map((n) => ({ id: `c1000000-0000-4000-8000-00000000000${n + 5}`, nome: 'Heloísa', nascimento: NASCIMENTO_DA_HELOISA, estado: 'ativo' as const }))
    await cena({ bebesExtras: gemeas })
    abrir()
    await waitFor(() => expect(radios('Bebê')).toHaveLength(3))
    const [primeiro, segundo, terceiro] = radios('Bebê').map((radio) => rotuloDe(radio))
    expect(primeiro).toMatch(/^Heloísa, [^()]+$/)
    expect(segundo).toBe(`${primeiro} (2)`)
    expect(terceiro).toBe(`${primeiro} (3)`)
  })

  it('painel: períodos e padrão (RF-04)', async () => {
    iniciarRelogio()
    await cena({ registros: SEMANA_DE_2_DIAS })
    abrir()
    await aguardarCaixas()
    const [hoje, semana] = radios('Período')
    expect(rotuloDe(hoje)).toBe('Hoje até agora')
    expect(rotuloDe(semana)).toBe('Últimos 7 dias (média por dia)')
    expect([hoje.checked, semana.checked]).toEqual([true, false])
    fireEvent.click(semana)
    await waitFor(() => expect(radios('Período')[1].checked).toBe(true))
    await aguardarCaixas()
    expect(radios('Período')[0].checked).toBe(false)
  })

  it('painel: nada marcado ao abrir, zeros e arredondados a zero fora, troca desmarca (RF-05)', async () => {
    iniciarRelogio()
    await cena({ registros: HOJE_CHEIO })
    abrir()
    await aguardarCaixas()
    expect(nomesDasCaixas()).toEqual(['Sono: 3 h 30', 'Tummy time: 0 h 15', 'Mamadas: 2', 'Mamadeiras: 1, somando 120 ml', 'Fraldas: 3', 'Alimentação sólida: 1'])
    expect(caixas().some((caixa) => caixa.checked)).toBe(false)
    expect(painel().textContent).not.toContain('Observaç')
    marcar('Sono: 3 h 30')
    marcar('Mamadas: 2')
    fireEvent.click(radios('Período')[1])
    await waitFor(() => expect(noPainel().getByRole('status').textContent).toBe('Lendo a rotina…'))
    await aguardarCaixas()
    expect(caixas().some((caixa) => caixa.checked)).toBe(false)
  })

  it('painel: zero não entra, e o que arredonda para zero na semana também não (RF-05, RF-07)', async () => {
    iniciarRelogio()
    // 3 dias com registro, 1 min de tummy time em 3: 1 ÷ 3 = 0,33 vira 0 e sai; mamadas 3 ÷ 3 = 1 entra.
    await cena({
      registros: [
        ['mamada', DIA(14, 8), DIA(14, 8, 15)],
        ['tummy', DIA(14, 9), DIA(14, 9, 1)],
        ['mamada', DIA(13, 8), DIA(13, 8, 15)],
        ['mamada', DIA(12, 8), DIA(12, 8, 15)],
      ],
    })
    abrir()
    await aguardarCaixas()
    expect(nomesDasCaixas()).toEqual(['Tummy time: 0 h 01', 'Mamadas: 1'])
    fireEvent.click(radios('Período')[1])
    await waitFor(() => expect(nomesDasCaixas()).toEqual(['Mamadas: 1 por dia']))
  })

  it('painel: a semana mostra a média por dia, com o valor da caixa igual ao da linha do bloco (RF-07, RF-08)', async () => {
    iniciarRelogio()
    await cena({ registros: SEMANA_DE_2_DIAS })
    abrir()
    await aguardarCaixas()
    fireEvent.click(radios('Período')[1])
    await waitFor(() => expect(nomesDasCaixas()[0]).toBe('Sono: 2 h 45 por dia'))
    expect(nomesDasCaixas()).toEqual([
      'Sono: 2 h 45 por dia',
      'Tummy time: 0 h 08 por dia',
      'Mamadas: 2,5 por dia',
      'Mamadeiras: 0,5 por dia, somando 60 ml por dia',
      'Fraldas: 1,5 por dia',
      'Alimentação sólida: 0,5 por dia',
    ])
    marcar('Mamadas: 2,5 por dia')
    expect(bloco()).toBe('Resumo da rotina dos últimos 7 dias (média por dia, em 2 dias com registro):\n- Mamadas: 2,5 por dia')
  })

  it('painel: a prévia muda a cada marca; sem marca, "Marque pelo menos um número." e Inserir inativo (RF-10)', async () => {
    iniciarRelogio()
    await cena({ registros: HOJE_CHEIO })
    abrir()
    await aguardarCaixas()
    expect(noPainel().getByText('Vai entrar no texto assim:')).toBeTruthy()
    expect(noPainel().getByText('Marque pelo menos um número.')).toBeTruthy()
    expect(bloco()).toBeNull()
    expect(inserir().disabled).toBe(true)

    marcar('Sono: 3 h 30')
    expect(bloco()).toBe('Resumo da rotina de hoje até agora:\n- Sono: 3 h 30')
    expect(inserir().disabled).toBe(false)
    marcar('Mamadeiras: 1, somando 120 ml')
    marcar('Alimentação sólida: 1')
    expect(bloco()).toBe('Resumo da rotina de hoje até agora:\n- Sono: 3 h 30\n- Mamadeiras: 1, somando 120 ml\n- Alimentação sólida: 1')
    marcar('Sono: 3 h 30')
    expect(bloco()).toBe('Resumo da rotina de hoje até agora:\n- Mamadeiras: 1, somando 120 ml\n- Alimentação sólida: 1')
    marcar('Mamadeiras: 1, somando 120 ml')
    marcar('Alimentação sólida: 1')
    expect(bloco()).toBeNull()
    expect(noPainel().getByText('Marque pelo menos um número.')).toBeTruthy()
    expect(inserir().disabled).toBe(true)
  })

  it('painel: o bloco não leva nome, nota, horário, data, lado nem tipo (RF-09)', async () => {
    iniciarRelogio()
    await cena({ registros: HOJE_CHEIO })
    abrir()
    await aguardarCaixas()
    for (const nome of nomesDasCaixas()) marcar(nome as string)
    const texto = bloco() as string
    expect(texto.split('\n')).toHaveLength(7)
    expect(texto).not.toMatch(/Heloísa|nota|esquerdo|direito|xixi|coco|\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}|\d{4}-\d{2}/i)
  })
})

describe('painel: os 9 estados de RF-15', () => {
  it('painel: estado 1, lendo o contexto; estado 9, pronto; uma só região de status que anuncia (RF-15)', async () => {
    iniciarRelogio()
    const { adiada } = await cena({ registros: HOJE_CHEIO })
    adiada.adiar('contexto')
    abrir()
    expect(noPainel().getAllByRole('status')).toHaveLength(1)
    expect(noPainel().getByRole('status').textContent).toBe('Lendo a rotina…')
    expect(noPainel().queryAllByRole('radio')).toEqual([])
    expect(noPainel().queryByRole('button', { name: 'Inserir no texto' })).toBeNull()
    // A leitura começa uma microtarefa depois da montagem: só há o que soltar quando ela estiver presa.
    await waitFor(() => expect(adiada.presas('contexto')).toBe(1))
    adiada.liberarTodas('contexto')
    await aguardarCaixas()
    expect(noPainel().getAllByRole('status')).toHaveLength(1)
    expect(noPainel().getByRole('status').textContent).toBe('')
    expect(noPainel().getByRole('button', { name: 'Inserir no texto' })).toBeTruthy()
  })

  it('painel: estado 2, falha do contexto, corpo intacto e "Tentar de novo" relê só o contexto (RF-15)', async () => {
    iniciarRelogio()
    const { mundo, adiada } = await cena({ registros: HOJE_CHEIO })
    fireEvent.change(screen.getByLabelText(/Texto do tópico/), { target: { value: 'meu texto' } })
    simularFalhaRotina(mundo.rotina, 'contexto', 'rede')
    abrir()
    await aguardarTexto('Não foi possível ler a rotina agora. O seu texto continua aqui.')
    expect(noPainel().queryAllByRole('radio')).toEqual([])
    expect((screen.getByLabelText(/Texto do tópico/) as HTMLTextAreaElement).value).toBe('meu texto')
    fireEvent.click(noPainel().getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCaixas()
    expect(adiada.contagem('contexto')).toBe(2)
    expect(noPainel().getByRole('status').textContent).toBe('')
  })

  it('painel: estado 5, lendo os números; as escolhas seguem ativas e não há caixas nem Inserir ativo (RF-15)', async () => {
    iniciarRelogio()
    const { adiada } = await cena({ registros: HOJE_CHEIO })
    adiada.adiar('doDia')
    abrir()
    await waitFor(() => expect(radios('Bebê')).toHaveLength(1))
    await aguardarTexto('Lendo a rotina…')
    expect(caixas()).toEqual([])
    expect(radios('Bebê')[0].disabled).toBe(false)
    expect(radios('Período').every((radio) => !radio.disabled)).toBe(true)
    expect(inserir().disabled).toBe(true)
    adiada.liberarTodas('doDia')
    await aguardarCaixas()
  })

  it('painel: estado 6, nenhum número maior que zero, sem caixas (RF-15)', async () => {
    iniciarRelogio()
    await cena({ semRegistros: true })
    abrir()
    await aguardarTexto('Nenhum registro concluído neste período.')
    expect(caixas()).toEqual([])
    expect(inserir().disabled).toBe(true)
    expect(radios('Período')).toHaveLength(2)
  })

  it('painel: estado 7, mais de 500 registros, sem caixas (RF-15)', async () => {
    iniciarRelogio()
    await cena({ registros: Array.from({ length: 501 }, (): Reg => ['fralda', DIA(14, 1), null]) })
    abrir()
    await aguardarTexto('Há registros demais para somar aqui.')
    expect(caixas()).toEqual([])
    expect(inserir().disabled).toBe(true)
  })

  it('painel: estado 8, falha dos números, e "Tentar de novo" relê o mesmo bebê e período sem reler o contexto (RF-15)', async () => {
    iniciarRelogio()
    const { mundo, adiada } = await cena({ registros: HOJE_CHEIO })
    simularFalhaRotina(mundo.rotina, 'doDia', 'rede')
    abrir()
    await aguardarTexto('Não foi possível ler a rotina agora. O seu texto continua aqui.')
    expect(caixas()).toEqual([])
    expect(radios('Bebê')[0].checked).toBe(true)
    fireEvent.click(noPainel().getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCaixas()
    expect(adiada.contagem('contexto')).toBe(1)
    expect(adiada.contagem('doDia')).toBe(2)
  })
})

describe('painel: não modal, teclado e foco (RF-18)', () => {
  it('painel: a página fora do painel segue interativa e não há diálogo (RF-18)', async () => {
    iniciarRelogio()
    await cena({ registros: HOJE_CHEIO })
    abrir()
    await aguardarCaixas()
    expect(document.querySelector('dialog')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(painel().closest('[aria-modal], [inert]')).toBeNull()
    fireEvent.change(screen.getByLabelText(/Texto do tópico/), { target: { value: 'continuo escrevendo' } })
    expect((screen.getByLabelText(/Texto do tópico/) as HTMLTextAreaElement).value).toBe('continuo escrevendo')
    expect(painel()).toBeTruthy()
  })

  it('painel: Tab na ordem visual, sem prisão de foco; a prévia e o título não são paradas (RF-18)', async () => {
    iniciarRelogio()
    await cena({ registros: HOJE_CHEIO })
    abrir()
    await aguardarCaixas()
    marcar('Sono: 3 h 30')
    botaoDoResumo().focus()
    const nomes: string[] = []
    for (let passo = 0; passo < 12; passo++) {
      const parada = tabular()
      nomes.push(parada instanceof HTMLInputElement ? (parada.labels?.[0]?.textContent ?? '') : (parada.textContent ?? ''))
    }
    expect(nomes.slice(0, 11)).toEqual([
      expect.stringMatching(/^Heloísa, /),
      'Hoje até agora',
      'Sono: 3 h 30',
      'Tummy time: 0 h 15',
      'Mamadas: 2',
      'Mamadeiras: 1, somando 120 ml',
      'Fraldas: 3',
      'Alimentação sólida: 1',
      'Inserir no texto',
      'Cancelar',
      expect.stringMatching(/^Sem faixa/),
    ])
    expect(paradasDeTab(false).some((parada) => parada.tagName === 'H2' || parada.hasAttribute('data-bloco'))).toBe(false)
    // O Shift+Tab anda na ordem inversa: do "Cancelar" volta ao "Inserir no texto".
    noPainel().getByRole('button', { name: 'Cancelar' }).focus()
    expect(tabular(true).textContent).toBe('Inserir no texto')
  })

  it('painel: Esc com o foco no painel fecha e devolve o foco ao botão; Esc fora do painel não faz nada (RF-18)', async () => {
    iniciarRelogio()
    await cena({ registros: HOJE_CHEIO })
    const campo = screen.getByLabelText(/Texto do tópico/) as HTMLTextAreaElement
    fireEvent.change(campo, { target: { value: 'texto antes' } })
    abrir()
    await aguardarCaixas()
    fireEvent.keyDown(campo, { key: 'Escape' })
    expect(painel()).toBeTruthy()
    const hoje = radios('Período')[0]
    hoje.focus()
    fireEvent.keyDown(hoje, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Resumo da rotina' })).toBeNull()
    expect(document.activeElement).toBe(botaoDoResumo())
    expect(botaoDoResumo().getAttribute('aria-expanded')).toBe('false')
    expect(campo.value).toBe('texto antes')
  })

  it('painel: Cancelar fecha sem mudar o corpo e devolve o foco ao botão (RF-11, RF-18)', async () => {
    iniciarRelogio()
    await cena({ registros: HOJE_CHEIO })
    const campo = screen.getByLabelText(/Texto do tópico/) as HTMLTextAreaElement
    fireEvent.change(campo, { target: { value: 'abc\n' } })
    abrir()
    await aguardarCaixas()
    marcar('Sono: 3 h 30')
    fireEvent.click(noPainel().getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('group', { name: 'Resumo da rotina' })).toBeNull()
    expect(document.activeElement).toBe(botaoDoResumo())
    expect(campo.value).toBe('abc\n')
    expect(screen.queryByRole('heading', { name: 'Prévia' })).toBeNull()
  })

  it('painel: nenhum botão do painel envia o formulário e Enter dentro do painel não abre a prévia (RF-18)', async () => {
    iniciarRelogio()
    await cena({ registros: HOJE_CHEIO })
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Um título bom' } })
    fireEvent.change(screen.getByLabelText(/Texto do tópico/), { target: { value: 'Um texto' } })
    abrir()
    await aguardarCaixas()
    for (const controle of [radios('Bebê')[0], radios('Período')[0], caixas()[0]]) {
      // `fireEvent` devolve `false` quando a tecla foi cancelada (`preventDefault`), que é o que impede o envio implícito.
      expect(fireEvent.keyDown(controle, { key: 'Enter' })).toBe(false)
    }
    expect(noPainel().getAllByRole('button').every((botao) => botao.getAttribute('type') === 'button')).toBe(true)
    expect(botaoDoResumo().getAttribute('type')).toBe('button')
    fireEvent.click(noPainel().getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('heading', { name: 'Prévia' })).toBeNull()
  })

  it('painel: Ver prévia fecha o painel, descarta a leitura em andamento, e Voltar e editar volta com o painel fechado (RF-18)', async () => {
    iniciarRelogio()
    const { adiada } = await cena({ registros: HOJE_CHEIO })
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Um título bom' } })
    fireEvent.change(screen.getByLabelText(/Texto do tópico/), { target: { value: 'Um texto' } })
    adiada.adiar('doDia')
    abrir()
    await waitFor(() => expect(adiada.presas('doDia')).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: 'Ver prévia' }))
    expect(screen.getByRole('heading', { name: 'Prévia' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Resumo da rotina' })).toBeNull()
    adiada.liberarTodas('doDia')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar e editar' }))
    expect(screen.queryByRole('group', { name: 'Resumo da rotina' })).toBeNull()
    expect(botaoDoResumo().getAttribute('aria-expanded')).toBe('false')
  })
})

describe('painel: acesso, leituras e validade dos números (RF-19)', () => {
  it('painel: reabrir relê; nada da abertura anterior (contexto, números ou marcas) é reaproveitado (RF-19)', async () => {
    iniciarRelogio()
    const { adiada } = await cena({ registros: HOJE_CHEIO })
    abrir()
    await aguardarCaixas()
    marcar('Sono: 3 h 30')
    fireEvent.click(noPainel().getByRole('button', { name: 'Cancelar' }))
    adiada.adiar('contexto')
    abrir()
    expect(noPainel().getByRole('status').textContent).toBe('Lendo a rotina…')
    expect(caixas()).toEqual([])
    await waitFor(() => expect(adiada.presas('contexto')).toBe(1))
    adiada.liberarTodas('contexto')
    await aguardarCaixas()
    expect(adiada.contagem('contexto')).toBe(2)
    expect(caixas().some((caixa) => caixa.checked)).toBe(false)
  })

  it('painel: o contexto é lido 1 vez; trocar período ou bebê e Inserir não o releem (RF-19)', async () => {
    iniciarRelogio()
    const { adiada } = await cena({
      registros: SEMANA_DE_2_DIAS,
      bebesExtras: [{ id: 'c1000000-0000-4000-8000-000000000001', nome: 'Amora', nascimento: '2026-08-01', estado: 'ativo' }],
    })
    abrir()
    await waitFor(() => expect(radios('Bebê')).toHaveLength(2))
    fireEvent.click(radios('Bebê')[1])
    await aguardarCaixas()
    fireEvent.click(radios('Período')[1])
    await waitFor(() => expect(adiada.contagem('doIntervalo')).toBe(1))
    fireEvent.click(radios('Bebê')[0])
    await waitFor(() => expect(adiada.contagem('doIntervalo')).toBe(2))
    expect(adiada.contagem('contexto')).toBe(1)
  })

  it('painel: a falha de uma leitura apaga os números que valiam antes (RF-19)', async () => {
    iniciarRelogio()
    const { mundo } = await cena({ registros: SEMANA_DE_2_DIAS })
    abrir()
    await aguardarCaixas()
    marcar('Sono: 3 h 30')
    simularFalhaRotina(mundo.rotina, 'doIntervalo', 'rede')
    fireEvent.click(radios('Período')[1])
    await aguardarTexto('Não foi possível ler a rotina agora. O seu texto continua aqui.')
    expect(caixas()).toEqual([])
    expect(noPainel().getByRole('button', { name: 'Inserir no texto' }).hasAttribute('disabled')).toBe(true)
  })

  it('painel: o resultado atrasado de uma leitura antiga é ignorado (RF-19)', async () => {
    iniciarRelogio()
    const { adiada } = await cena({ registros: SEMANA_DE_2_DIAS })
    adiada.adiar('doDia')
    abrir()
    await waitFor(() => expect(adiada.presas('doDia')).toBe(1))
    fireEvent.click(radios('Período')[1])
    await waitFor(() => expect(nomesDasCaixas()[0]).toBe('Sono: 2 h 45 por dia'))
    adiada.liberarTodas('doDia')
    await aguardarCarga()
    expect(radios('Período')[1].checked).toBe(true)
    expect(nomesDasCaixas()[0]).toBe('Sono: 2 h 45 por dia')
  })

  it('painel: depois da meia-noite o painel não relê sozinho, e a troca de período relê com o instante novo (RF-19)', async () => {
    const definir = iniciarRelogio(14, 23, 50)
    await cena({ registros: HOJE_CHEIO })
    abrir()
    await aguardarCaixas()
    definir(new Date(2026, 10, 15, 0, 10))
    await aguardarCarga()
    expect(nomesDasCaixas()[0]).toBe('Sono: 3 h 30')
    fireEvent.click(radios('Período')[1])
    await aguardarCaixas()
    fireEvent.click(radios('Período')[0])
    await aguardarTexto('Nenhum registro concluído neste período.')
    expect(caixas()).toEqual([])
  })

  it('painel: sessão vencida na leitura do contexto, e na dos números, leva a /entrar com volta para a mesma página (RF-19)', async () => {
    iniciarRelogio()
    for (const operacao of ['contexto', 'doDia'] as const) {
      const { mundo, tela, adiada } = await cena({ registros: HOJE_CHEIO })
      if (operacao === 'contexto') {
        simularFalhaRotina(mundo.rotina, 'contexto', sessaoVencida)
        mundo.conta.encerrarSessaoPorFora()
        abrir()
      } else {
        // O contexto é lido com a sessão viva (fica preso); a sessão acaba sem evento, e quem a encontra vencida é a
        // leitura dos números (`doDia`), não o contexto nem o evento de saída.
        adiada.adiar('contexto')
        abrir()
        await waitFor(() => expect(adiada.presas('contexto')).toBe(1))
        await aguardarCarga()
        mundo.conta.sessaoParaTeste(null)
        adiada.liberarTodas('contexto')
      }
      await waitFor(() => expect(tela.roteador.state.location.pathname).toBe('/entrar'))
      expect(tela.roteador.state.location.search).toBe(`?volta=${encodeURIComponent('/app/comunidade/sono/novo')}`)
      if (operacao === 'doDia') expect(adiada.contagem('doDia')).toBeGreaterThan(0)
      tela.unmount()
    }
  })

  it('painel: leitura pendente e família excluída por fora: ao soltar vale o que já foi lido, nada é relido e o corpo fica (RF-19)', async () => {
    iniciarRelogio()
    const { mundo, adiada } = await cena({ registros: HOJE_CHEIO })
    fireEvent.change(screen.getByLabelText(/Texto do tópico/), { target: { value: 'meu texto' } })
    adiada.adiar('doDia')
    abrir()
    await waitFor(() => expect(adiada.presas('doDia')).toBe(1))
    await aguardarCarga()
    expect((await mundo.conta.excluirFamilia(FAMILIAS_DEMONSTRACAO.exemplo)).ok).toBe(true)
    adiada.liberarTodas('doDia')
    // A leitura já tinha acontecido antes da exclusão: o painel não percebe a mudança (spec, "vínculo perdido com o
    // painel já aberto"), mostra o resultado dela e não relê nada.
    await aguardarCaixas()
    expect(nomesDasCaixas()).toContain('Sono: 3 h 30')
    expect(leituras(adiada)).toEqual({ contexto: 1, doDia: 1, sessoes: 1 })
    expect((screen.getByLabelText(/Texto do tópico/) as HTMLTextAreaElement).value).toBe('meu texto')
  })

  it('painel: contexto pendente e família excluída por fora: os números lidos depois não vêm da família excluída, e o corpo fica (RF-19)', async () => {
    iniciarRelogio()
    const { mundo, adiada } = await cena({ registros: HOJE_CHEIO })
    fireEvent.change(screen.getByLabelText(/Texto do tópico/), { target: { value: 'meu texto' } })
    adiada.adiar('contexto')
    abrir()
    await waitFor(() => expect(adiada.presas('contexto')).toBe(1))
    await aguardarCarga()
    expect((await mundo.conta.excluirFamilia(FAMILIAS_DEMONSTRACAO.exemplo)).ok).toBe(true)
    adiada.liberarTodas('contexto')
    // O contexto lido antes da exclusão ainda traz o bebê; a leitura dos números, feita depois, já não acha a família.
    await aguardarTexto('Nenhum registro concluído neste período.')
    expect(caixas()).toEqual([])
    expect(inserir().disabled).toBe(true)
    expect(painel().textContent).not.toContain('Sono: 3 h 30')
    expect((screen.getByLabelText(/Texto do tópico/) as HTMLTextAreaElement).value).toBe('meu texto')
  })
})

describe('painel: o ciclo de abertura é seguro a repetições do efeito e a fechar no meio (RN-03, RF-19)', () => {
  it('painel: em StrictMode, como fora dele, um clique faz 1 leitura de contexto e 1 conjunto de números, e o painel chega às escolhas', async () => {
    for (const strict of [false, true]) {
      iniciarRelogio()
      const { adiada, tela } = await cena({ registros: HOJE_CHEIO, strict })
      abrir()
      await aguardarCaixas()
      expect(nomesDasCaixas()).toContain('Sono: 3 h 30')
      expect(radios('Bebê')).toHaveLength(1)
      await aguardarCarga()
      expect(leituras(adiada), `strict=${strict}`).toEqual({ contexto: 1, doDia: 1, sessoes: 1 })
      tela.unmount()
    }
  })

  it('painel: fechar e reabrir de verdade faz +1 contexto e +1 conjunto a cada abertura, nunca reaproveita, em StrictMode ou não', async () => {
    for (const strict of [false, true]) {
      iniciarRelogio()
      const { adiada, tela } = await cena({ registros: HOJE_CHEIO, strict })
      for (const abertura of [1, 2, 3]) {
        abrir()
        await aguardarCaixas()
        await aguardarCarga()
        expect(leituras(adiada), `strict=${strict} abertura=${abertura}`).toEqual({ contexto: abertura, doDia: abertura, sessoes: abertura })
        cancelar()
        expect(screen.queryByRole('group', { name: 'Resumo da rotina' })).toBeNull()
      }
      tela.unmount()
    }
  })

  it('painel: montar e desmontar antes de qualquer leitura = 0 leituras; reabrir depois lê exatamente 1 vez', async () => {
    for (const strict of [false, true]) {
      iniciarRelogio()
      const { adiada, tela } = await cena({ registros: HOJE_CHEIO, strict })
      abrir()
      cancelar()
      await aguardarCarga()
      expect(leituras(adiada), `fechado no ato, strict=${strict}`).toEqual({ contexto: 0, doDia: 0, sessoes: 0 })

      abrir()
      tela.unmount()
      await aguardarCarga()
      expect(leituras(adiada), `página desmontada no ato, strict=${strict}`).toEqual({ contexto: 0, doDia: 0, sessoes: 0 })
    }
    iniciarRelogio()
    const { adiada } = await cena({ registros: HOJE_CHEIO, strict: true })
    abrir()
    cancelar()
    await aguardarCarga()
    abrir()
    await aguardarCaixas()
    await aguardarCarga()
    expect(leituras(adiada)).toEqual({ contexto: 1, doDia: 1, sessoes: 1 })
  })

  it('painel: todos os estados do ciclo, em StrictMode, contam 1 leitura de contexto: carregando, vazio, erro do contexto, erro dos números, preenchido', async () => {
    iniciarRelogio()

    // Carregando: o contexto preso é lido 1 vez só e o painel diz que está lendo.
    const carregando = await cena({ registros: HOJE_CHEIO, strict: true })
    carregando.adiada.adiar('contexto')
    abrir()
    await aguardarCarga()
    expect(noPainel().getByRole('status').textContent).toBe('Lendo a rotina…')
    expect(carregando.adiada.presas('contexto')).toBe(1)
    expect(carregando.adiada.contagem('contexto')).toBe(1)
    carregando.adiada.liberarTodas('contexto')
    await aguardarCaixas()
    expect(leituras(carregando.adiada)).toEqual({ contexto: 1, doDia: 1, sessoes: 1 })
    carregando.tela.unmount()

    // Vazio.
    const vazio = await cena({ semRegistros: true, strict: true })
    abrir()
    await aguardarTexto('Nenhum registro concluído neste período.')
    expect(leituras(vazio.adiada)).toEqual({ contexto: 1, doDia: 1, sessoes: 1 })
    vazio.tela.unmount()

    // Erro do contexto: a falha simulada vale para a única leitura; "Tentar de novo" faz +1 contexto.
    const erroDoContexto = await cena({ registros: HOJE_CHEIO, strict: true })
    simularFalhaRotina(erroDoContexto.mundo.rotina, 'contexto', 'rede')
    abrir()
    await aguardarTexto('Não foi possível ler a rotina agora. O seu texto continua aqui.')
    expect(erroDoContexto.adiada.contagem('contexto')).toBe(1)
    fireEvent.click(noPainel().getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCaixas()
    expect(erroDoContexto.adiada.contagem('contexto')).toBe(2)
    erroDoContexto.tela.unmount()

    // Erro dos números: o contexto fica em 1; "Tentar de novo" faz +1 conjunto de números.
    const erroDosNumeros = await cena({ registros: HOJE_CHEIO, strict: true })
    simularFalhaRotina(erroDosNumeros.mundo.rotina, 'doDia', 'rede')
    abrir()
    await aguardarTexto('Não foi possível ler a rotina agora. O seu texto continua aqui.')
    expect(leituras(erroDosNumeros.adiada)).toEqual({ contexto: 1, doDia: 1, sessoes: 1 })
    fireEvent.click(noPainel().getByRole('button', { name: 'Tentar de novo' }))
    await aguardarCaixas()
    expect(leituras(erroDosNumeros.adiada)).toEqual({ contexto: 1, doDia: 2, sessoes: 2 })
    erroDosNumeros.tela.unmount()

    // Preenchido, com marca, e depois a reabertura: +1 e nada da abertura anterior.
    const cheio = await cena({ registros: HOJE_CHEIO, strict: true })
    abrir()
    await aguardarCaixas()
    marcar('Sono: 3 h 30')
    expect(bloco()).toBe('Resumo da rotina de hoje até agora:\n- Sono: 3 h 30')
    cancelar()
    abrir()
    await aguardarCaixas()
    expect(caixas().some((caixa) => caixa.checked)).toBe(false)
    expect(leituras(cheio.adiada)).toEqual({ contexto: 2, doDia: 2, sessoes: 2 })
  })

  it('painel: fechar com a leitura pendente (de contexto ou de números) não muda estado nem avisa depois, e reabrir funciona', async () => {
    const aviso = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      for (const strict of [false, true]) {
        for (const operacao of ['contexto', 'doDia'] as const) {
          iniciarRelogio()
          const { adiada, tela } = await cena({ registros: HOJE_CHEIO, strict })
          adiada.adiar(operacao)
          abrir()
          await waitFor(() => expect(adiada.presas(operacao)).toBeGreaterThan(0))
          cancelar()
          adiada.liberarTodas(operacao)
          await aguardarCarga()
          expect(screen.queryByRole('group', { name: 'Resumo da rotina' }), `${operacao} strict=${strict}`).toBeNull()
          expect(aviso, `${operacao} strict=${strict}`).not.toHaveBeenCalled()
          // A leitura de contexto solta depois de fechar não começa os números: nada vai a `doDia`.
          if (operacao === 'contexto') expect(adiada.contagem('doDia')).toBe(0)

          adiada.deixarDeAdiar(operacao)
          abrir()
          await aguardarCaixas()
          expect(nomesDasCaixas()).toContain('Sono: 3 h 30')
          tela.unmount()
        }
      }
    } finally {
      aviso.mockRestore()
    }
  })
})
