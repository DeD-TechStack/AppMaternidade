import { describe, expect, it, vi } from 'vitest'
import { FAMILIAS_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { diaDaFamilia, janelaDoDia } from '../../dados/rotina.dia.ts'
import { simularFalhaRotina } from '../../dados/rotina.memoria.ts'
import type { Registro } from '../../dados/rotina.tipos.ts'
import { adiarRotina } from '../../teste/adiado.ts'
import { FUSO_DO_APARELHO, ID_BEBE, criarMundoDeTeste, type OpcoesMundo } from '../../teste/rotina.fixture.ts'
import { ESTADOS_DO_RESUMO } from '../../conteudo/resumoRotina.ts'
import { seteDiasAte } from '../rotina/diasDoHistorico.ts'
import {
  NUMERO_DO_ESTADO,
  criarControladorDoResumo,
  type CaixaDoNumero,
  type ControladorDoResumo,
  type EstadoDoResumo,
  type OpcoesDoControlador,
  type SituacaoDoResumo,
} from './controlador.ts'

// RF-15 (os 9 estados) e RF-19 (as leituras do painel): o controlador sobre a rotina em memória, com leituras
// presas (`adiarRotina`) e falhas simuladas (`simularFalhaRotina`).

const DIA = 86_400_000

const sessaoVencida: ErroDados = { classe: 'sessao_encerrada', chave: 'sessao_encerrada', codigo: '', mensagemOriginal: '' }

function montar(opcoes: OpcoesMundo = {}, relogio?: () => number) {
  const mundo = criarMundoDeTeste(opcoes)
  const adiada = adiarRotina(mundo.rotina)
  const aviso = vi.fn()
  const opcoesDoControlador: OpcoesDoControlador = { dados: adiada.dados, aoSessaoEncerrada: aviso, agora: relogio ?? (() => mundo.agora) }
  const controlador = criarControladorDoResumo(opcoesDoControlador)
  return { mundo, adiada, aviso, controlador }
}

const aguardar = (controlador: ControladorDoResumo, estado: EstadoDoResumo) => vi.waitFor(() => expect(controlador.situacao().estado).toBe(estado))

/** A primeira caixa do estado 9, que o teste marca. */
function primeiraCaixa(situacao: SituacaoDoResumo): CaixaDoNumero {
  const [caixa] = situacao.caixas
  if (caixa === undefined) throw new Error('O estado 9 não tem caixa nenhuma.')
  return caixa
}

/** Dá tempo às leituras em andamento, para conferir que nada mudou. */
const deixarPassar = () => new Promise<void>((seguir) => setTimeout(seguir, 20))

const bebeExtra = (id: string, nomeDoBebe: string, nascimento: string, familiaId?: string) => ({
  id,
  nome: nomeDoBebe,
  nascimento,
  estado: 'ativo' as const,
  ...(familiaId ? { familiaId } : {}),
})

describe('RF15: os estados de dados do painel', () => {
  it('RF15:1: abrir mostra "Lendo a rotina…" (estado 1) e sai dele com o contexto e os números lidos', async () => {
    const { controlador, adiada } = montar()
    adiada.adiar('contexto')
    controlador.abrir()
    expect(controlador.situacao().estado).toBe('lendo_contexto')
    expect(NUMERO_DO_ESTADO[controlador.situacao().estado as Exclude<EstadoDoResumo, 'fechado'>]).toBe(1)
    expect(controlador.situacao().texto).toBe(ESTADOS_DO_RESUMO.lendo)
    adiada.liberarTodas('contexto')
    await aguardar(controlador, 'pronto')
    expect(controlador.situacao().texto).toBeNull()
  })

  it('RF15:9: com 1 bebê elegível ele já vem escolhido e a leitura de hoje começa (estados 5 e 9)', async () => {
    const { controlador, adiada } = montar()
    adiada.adiar('doDia')
    controlador.abrir()
    await aguardar(controlador, 'lendo_numeros')
    expect(controlador.situacao().bebeId).toBe(ID_BEBE)
    expect(controlador.situacao().periodo).toBe('hoje')
    adiada.liberarTodas('doDia')
    await aguardar(controlador, 'pronto')
    expect(controlador.situacao().caixas.length).toBeGreaterThan(0)
    expect(controlador.situacao().bloco).toBe('')
    expect(controlador.situacao().podeInserir).toBe(false)
  })

  it('RF15:6: sem registro concluído no período vem a frase do estado 6', async () => {
    const { controlador } = montar({ semRegistros: true })
    controlador.abrir()
    await aguardar(controlador, 'sem_numeros')
    expect(controlador.situacao().texto).toBe(ESTADOS_DO_RESUMO.nenhumNumero)
    expect(controlador.situacao().caixas).toEqual([])
  })

  it('RF15:7: acima de 500 registros no período vem o estado 7, e nenhum número', async () => {
    const { controlador } = montar({
      ajustarRotina: (fixture) => {
        const modelo = fixture.registros.find((registro) => registro.tipo === 'fralda') as Registro
        const muitos = Array.from({ length: 501 }, (_, indice) => ({ ...modelo, id: `a1000000-0000-7000-8000-${String(indice).padStart(12, '0')}` }))
        return { ...fixture, registros: [...fixture.registros, ...muitos] }
      },
    })
    controlador.abrir()
    await aguardar(controlador, 'registros_demais')
    expect(controlador.situacao().texto).toBe(ESTADOS_DO_RESUMO.registrosDemais)
    expect(controlador.situacao().caixas).toEqual([])
    expect(controlador.situacao().podeInserir).toBe(false)
  })

  it('RF15:2: a falha do contexto vai ao estado 2, e "Tentar de novo" relê só o contexto', async () => {
    const { controlador, mundo, adiada } = montar()
    simularFalhaRotina(mundo.rotina, 'contexto', 'rede')
    controlador.abrir()
    await aguardar(controlador, 'falha_contexto')
    expect(controlador.situacao().texto).toBe(ESTADOS_DO_RESUMO.falhaNaLeitura)
    expect(adiada.contagem('doDia')).toBe(0)
    controlador.tentarDeNovo()
    await aguardar(controlador, 'pronto')
    expect(adiada.contagem('contexto')).toBe(2)
  })

  it('RF15:8: a falha de doDia, ou de sessoesDaJanela, vai ao estado 8 e limpa os números; "Tentar de novo" relê o mesmo bebê e período', async () => {
    for (const operacao of ['doDia', 'sessoesDaJanela'] as const) {
      const { controlador, mundo, adiada } = montar()
      simularFalhaRotina(mundo.rotina, operacao, 'rede')
      controlador.abrir()
      await aguardar(controlador, 'falha_numeros')
      expect(controlador.situacao().texto).toBe(ESTADOS_DO_RESUMO.falhaNaLeitura)
      expect(controlador.situacao().caixas).toEqual([])
      expect(controlador.situacao().bebeId).toBe(ID_BEBE)
      const contextosAntes = adiada.contagem('contexto')
      controlador.tentarDeNovo()
      await aguardar(controlador, 'pronto')
      expect(adiada.contagem('contexto')).toBe(contextosAntes)
    }
  })

  it('RF15:8: na semana, a falha de doIntervalo também vai ao estado 8', async () => {
    const { controlador, mundo } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    simularFalhaRotina(mundo.rotina, 'doIntervalo', 'rede')
    controlador.escolherPeriodo('semana')
    await aguardar(controlador, 'falha_numeros')
    expect(controlador.situacao().periodo).toBe('semana')
    controlador.tentarDeNovo()
    await aguardar(controlador, 'pronto')
  })

  it('RF15:7: acima de 500 só em sessoesDaJanela também vai ao estado 7 (doDia segue completo)', async () => {
    const { controlador, adiada } = montar({
      ajustarRotina: (fixture) => {
        const modelo = fixture.registros.find((registro) => registro.tipo === 'mamada') as Registro
        // Tummy time que começou antes de hoje e terminou hoje: cruza a janela, mas não entra em `doDia` (que conta pelo início).
        const abreHoje = Date.parse(janelaDoDia(diaDaFamilia(Date.now(), FUSO_DO_APARELHO), FUSO_DO_APARELHO).de)
        const muitos = Array.from({ length: 501 }, (_, indice) => ({
          ...modelo,
          tipo: 'tummy' as const,
          inicio: new Date(abreHoje - 30 * 60_000).toISOString(),
          fim: new Date(abreHoje + 10 * 60_000).toISOString(),
          id: `a2000000-0000-7000-8000-${String(indice).padStart(12, '0')}`,
        }))
        return { ...fixture, registros: [...fixture.registros, ...muitos] }
      },
    })
    controlador.abrir()
    await aguardar(controlador, 'registros_demais')
    const doDia = await adiada.dados.doDia(ID_BEBE, diaDaFamilia(Date.now(), FUSO_DO_APARELHO))
    expect(doDia.ok && doDia.valor.incompleta).toBe(false)
  })

  it('RF15:tentarDeNovo: fora dos estados 2 e 8 não faz nada', async () => {
    const { controlador, adiada } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    const leituras = adiada.contagem('doDia')
    controlador.tentarDeNovo()
    await deixarPassar()
    expect(adiada.contagem('doDia')).toBe(leituras)
    expect(controlador.situacao().estado).toBe('pronto')
  })

  it('RF15:fechar: volta a "fechado" e a leitura em andamento não reabre nada', async () => {
    const { controlador, adiada } = montar()
    adiada.adiar('doDia')
    controlador.abrir()
    await aguardar(controlador, 'lendo_numeros')
    controlador.fechar()
    expect(controlador.situacao().estado).toBe('fechado')
    adiada.liberarTodas('doDia')
    await deixarPassar()
    expect(controlador.situacao().estado).toBe('fechado')
    expect(controlador.situacao().caixas).toEqual([])
  })

  it('RF15:abrir de novo volta ao período padrão e descarta as marcas', async () => {
    const { controlador } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    controlador.escolherPeriodo('semana')
    await aguardar(controlador, 'pronto')
    controlador.fechar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    expect(controlador.situacao().periodo).toBe('hoje')
    expect(controlador.situacao().podeInserir).toBe(false)
  })
})

describe('RF15: os impedimentos (estado 3, RF-02)', () => {
  const casos: Array<[string, OpcoesMundo, string]> = [
    ['sem família', { sessao: 'davi' }, ESTADOS_DO_RESUMO.semFamilia],
    ['família sem bebê', { semBebes: true }, ESTADOS_DO_RESUMO.familiaSemBebe],
    ['bebê só de quem não é responsável', { sessao: 'bruno' }, ESTADOS_DO_RESUMO.soResponsavel],
    ['só bebês arquivados', { bebeArquivado: true }, ESTADOS_DO_RESUMO.semBebeAtivo],
  ]
  it.each(casos)('RF15:3: %s dá o texto do estado 3 e nenhuma leitura de números', async (_nome, opcoes, texto) => {
    const { controlador, adiada } = montar(opcoes)
    controlador.abrir()
    await aguardar(controlador, 'impedido')
    expect(controlador.situacao().texto).toBe(texto)
    expect(controlador.situacao().opcoes).toEqual([])
    expect(adiada.contagem('doDia')).toBe(0)
    expect(adiada.contagem('sessoesDaJanela')).toBe(0)
  })

  it('RF15:3: a ordem de prioridade é sem família, sem bebê, só responsável e sem bebê ativo (RF-02)', async () => {
    const semBebeEFamilia = montar({ sessao: 'davi', semBebes: true })
    semBebeEFamilia.controlador.abrir()
    await aguardar(semBebeEFamilia.controlador, 'impedido')
    expect(semBebeEFamilia.controlador.situacao().motivo).toBe('sem_familia')

    const cuidadorEArquivado = montar({ sessao: 'bruno', bebeArquivado: true })
    cuidadorEArquivado.controlador.abrir()
    await aguardar(cuidadorEArquivado.controlador, 'impedido')
    expect(cuidadorEArquivado.controlador.situacao().motivo).toBe('so_responsavel')
  })
})

describe('RF15: a escolha de bebê (estado 4, RF-03)', () => {
  const ZELIA = 'c2222222-2222-4222-8222-222222222222'

  it('RF15:4: com 2 bebês elegíveis nada é escolhido sozinho e não há leitura de números', async () => {
    const { controlador, adiada } = montar({ bebesExtras: [bebeExtra(ZELIA, 'Zélia', '2026-10-05')] })
    controlador.abrir()
    await aguardar(controlador, 'sem_bebe_escolhido')
    expect(controlador.situacao().texto).toBe(ESTADOS_DO_RESUMO.escolhaUmBebe)
    expect(controlador.situacao().bebeId).toBeNull()
    expect(controlador.situacao().opcoes.map((opcao) => opcao.id)).toEqual([ID_BEBE, ZELIA])
    expect(adiada.contagem('doDia')).toBe(0)
  })

  it('RF15:4: o período escolhido antes do bebê fica definido, sem leitura', async () => {
    const { controlador, adiada } = montar({ bebesExtras: [bebeExtra(ZELIA, 'Zélia', '2026-10-05')] })
    controlador.abrir()
    await aguardar(controlador, 'sem_bebe_escolhido')
    controlador.escolherPeriodo('semana')
    expect(controlador.situacao().periodo).toBe('semana')
    expect(controlador.situacao().estado).toBe('sem_bebe_escolhido')
    controlador.escolherBebe(ZELIA)
    await aguardar(controlador, 'sem_numeros')
    expect(adiada.contagem('doIntervalo')).toBe(1)
    expect(adiada.contagem('doDia')).toBe(0)
  })

  it('RF15:4: trocar de bebê lê os números do novo, sem reler o contexto', async () => {
    const { controlador, adiada } = montar({ bebesExtras: [bebeExtra(ZELIA, 'Zélia', '2026-10-05')] })
    controlador.abrir()
    await aguardar(controlador, 'sem_bebe_escolhido')
    controlador.escolherBebe(ID_BEBE)
    await aguardar(controlador, 'pronto')
    controlador.escolherBebe(ZELIA)
    await aguardar(controlador, 'sem_numeros')
    expect(controlador.situacao().bebeId).toBe(ZELIA)
    expect(adiada.contagem('contexto')).toBe(1)
    expect(adiada.chamadas('doDia').map((chamada) => chamada[0])).toEqual([ID_BEBE, ZELIA])
  })

  it('RF15:4: um bebê que não é das opções é ignorado', async () => {
    const { controlador } = montar({ bebesExtras: [bebeExtra(ZELIA, 'Zélia', '2026-10-05')] })
    controlador.abrir()
    await aguardar(controlador, 'sem_bebe_escolhido')
    controlador.escolherBebe('c9999999-9999-4999-8999-999999999999')
    expect(controlador.situacao().estado).toBe('sem_bebe_escolhido')
  })

  it('RF15:rótulos: o mesmo nome com idade diferente já se distingue pela idade, sem o desempate numerado', async () => {
    const { controlador } = montar({ bebesExtras: [bebeExtra(ZELIA, 'Heloísa', '2000-01-01')] })
    controlador.abrir()
    await aguardar(controlador, 'sem_bebe_escolhido')
    const rotulos = controlador.situacao().opcoes.map((opcao) => opcao.rotulo)
    expect(new Set(rotulos).size).toBe(2)
    expect(rotulos.some((rotulo) => rotulo.endsWith(' (2)'))).toBe(false)
  })

  it('RF15:rótulos: elegíveis de 2 famílias levam o nome da família; o igual leva (2)', async () => {
    const { controlador } = montar({
      papelNaFamiliaTeste: 'responsavel',
      bebesExtras: [bebeExtra(ZELIA, 'Heloísa', '2026-10-05', FAMILIAS_DEMONSTRACAO.teste)],
    })
    controlador.abrir()
    await aguardar(controlador, 'sem_bebe_escolhido')
    const rotulos = controlador.situacao().opcoes.map((opcao) => opcao.rotulo)
    expect(rotulos).toHaveLength(2)
    for (const rotulo of rotulos) expect(rotulo).toContain(' · ')
    expect(new Set(rotulos).size).toBe(2)
  })

  it('RF15:rótulos: o mesmo nome e a mesma idade na mesma família leva o desempate numerado', async () => {
    const mundoBase = criarMundoDeTeste()
    const contexto = await mundoBase.rotina.contexto()
    expect(contexto.ok).toBe(true)
    if (!contexto.ok) return
    const heloisa = contexto.valor.familias.flatMap((familia) => familia.bebes).find((bebe) => bebe.id === ID_BEBE)
    if (heloisa === undefined) throw new Error('A bebê de teste não está no contexto.')
    const { controlador } = montar({ bebesExtras: [bebeExtra(ZELIA, 'Heloísa', heloisa.nascimento)] })
    controlador.abrir()
    await aguardar(controlador, 'sem_bebe_escolhido')
    const rotulos = controlador.situacao().opcoes.map((opcao) => opcao.rotulo)
    expect(new Set(rotulos).size).toBe(2)
    expect(rotulos.filter((rotulo) => rotulo.endsWith(' (2)'))).toHaveLength(1)
  })
})

describe('RF19: as leituras do painel', () => {
  it('RF19:2: o contexto é lido uma vez por abertura; período e troca de bebê não o releem', async () => {
    const { controlador, adiada } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    controlador.escolherPeriodo('semana')
    await aguardar(controlador, 'pronto')
    controlador.escolherPeriodo('hoje')
    await aguardar(controlador, 'pronto')
    expect(adiada.contagem('contexto')).toBe(1)
    controlador.fechar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    expect(adiada.contagem('contexto')).toBe(2)
  })

  it('RF19:3: hoje lê doDia e sessoesDaJanela; a semana lê doIntervalo e sessoesDaJanela', async () => {
    const { controlador, adiada } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    expect(adiada.contagem('doDia')).toBe(1)
    expect(adiada.contagem('doIntervalo')).toBe(0)
    expect(adiada.contagem('sessoesDaJanela')).toBe(1)
    controlador.escolherPeriodo('semana')
    await aguardar(controlador, 'pronto')
    expect(adiada.contagem('doDia')).toBe(1)
    expect(adiada.contagem('doIntervalo')).toBe(1)
    expect(adiada.contagem('sessoesDaJanela')).toBe(2)
  })

  it('RF19:4: a leitura atrasada de um período é ignorada depois que a pessoa troca', async () => {
    const { controlador, adiada } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    adiada.adiar('doDia', 'doIntervalo')
    controlador.escolherPeriodo('semana')
    controlador.escolherPeriodo('hoje')
    expect(adiada.presas('doIntervalo')).toBe(1)
    expect(adiada.presas('doDia')).toBe(1)
    // A mais nova primeiro, e depois a antiga, que chega atrasada.
    adiada.liberarTodas('doDia')
    await aguardar(controlador, 'pronto')
    expect(controlador.situacao().periodo).toBe('hoje')
    const doHoje = controlador.situacao().caixas.map((caixa) => caixa.valor)
    adiada.liberarTodas('doIntervalo')
    await deixarPassar()
    expect(controlador.situacao().periodo).toBe('hoje')
    expect(controlador.situacao().caixas.map((caixa) => caixa.valor)).toEqual(doHoje)
    expect(controlador.situacao().diasComRegistro).toBeNull()
  })

  it('RF19:4: a leitura atrasada do contexto, de uma abertura anterior, é ignorada', async () => {
    const { controlador, adiada } = montar({ sessao: 'bruno' })
    adiada.adiar('contexto')
    controlador.abrir()
    controlador.fechar()
    controlador.abrir()
    expect(adiada.presas('contexto')).toBe(2)
    adiada.liberar('contexto', 1)
    await aguardar(controlador, 'impedido')
    adiada.liberar('contexto', 0)
    await deixarPassar()
    expect(controlador.situacao().estado).toBe('impedido')
    expect(adiada.contagem('contexto')).toBe(2)
  })

  it('RF19:4: trocar de bebê descarta as caixas e as marcas do anterior na hora', async () => {
    const { controlador, adiada } = montar({ bebesExtras: [bebeExtra('c2222222-2222-4222-8222-222222222222', 'Zélia', '2026-10-05')] })
    controlador.abrir()
    await aguardar(controlador, 'sem_bebe_escolhido')
    controlador.escolherBebe(ID_BEBE)
    await aguardar(controlador, 'pronto')
    const primeira = primeiraCaixa(controlador.situacao())
    controlador.marcar(primeira.chave, true)
    expect(controlador.situacao().podeInserir).toBe(true)
    adiada.adiar('doDia')
    controlador.escolherBebe('c2222222-2222-4222-8222-222222222222')
    expect(controlador.situacao().estado).toBe('lendo_numeros')
    expect(controlador.situacao().caixas).toEqual([])
    expect(controlador.situacao().bloco).toBe('')
    expect(controlador.situacao().podeInserir).toBe(false)
    adiada.liberarTodas('doDia')
    await aguardar(controlador, 'sem_numeros')
  })

  it('RF19:4: a falha limpa os números que já estavam na tela', async () => {
    const { controlador, mundo } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    controlador.marcar(primeiraCaixa(controlador.situacao()).chave, true)
    simularFalhaRotina(mundo.rotina, 'doIntervalo', 'rede')
    controlador.escolherPeriodo('semana')
    await aguardar(controlador, 'falha_numeros')
    expect(controlador.situacao().caixas).toEqual([])
    expect(controlador.situacao().bloco).toBe('')
    expect(controlador.situacao().podeInserir).toBe(false)
    expect(controlador.situacao().diasComRegistro).toBeNull()
  })

  it('RF19:5: o dia de hoje e a janela ficam fixados na leitura; a leitura seguinte, depois da meia-noite, usa o dia novo', async () => {
    let relogio = criarMundoDeTeste().agora
    const { controlador, adiada } = montar({}, () => relogio)
    const inicial = relogio
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    expect(adiada.chamadas('doDia')[0][1]).toBe(diaDaFamilia(inicial, FUSO_DO_APARELHO))
    relogio = inicial + DIA
    // Sem nova leitura, nada muda sozinho.
    await deixarPassar()
    expect(adiada.contagem('doDia')).toBe(1)
    controlador.escolherPeriodo('semana')
    await aguardar(controlador, 'pronto')
    controlador.escolherPeriodo('hoje')
    // Os registros da fixture são do dia anterior ao novo "hoje": o dia novo está vazio (estado 6), e a semana ainda os alcança.
    await aguardar(controlador, 'sem_numeros')
    expect(adiada.chamadas('doDia')[1][1]).toBe(diaDaFamilia(relogio, FUSO_DO_APARELHO))
    expect(adiada.chamadas('doDia')[1][1]).not.toBe(adiada.chamadas('doDia')[0][1])
    const [, de, ate] = adiada.chamadas('doIntervalo')[0]
    const novoHoje = diaDaFamilia(relogio, FUSO_DO_APARELHO)
    // A janela de 7 dias é a dos 7 dias que terminam no "hoje" do instante da leitura.
    expect(ate).toBe(janelaDoDia(novoHoje, FUSO_DO_APARELHO).ate)
    expect(de).toBe(janelaDoDia(seteDiasAte(novoHoje)[0], FUSO_DO_APARELHO).de)
  })

  it('RF19:7: sessão vencida no contexto chama o aviso e não vai ao estado 2', async () => {
    const { controlador, mundo, aviso } = montar()
    simularFalhaRotina(mundo.rotina, 'contexto', sessaoVencida)
    controlador.abrir()
    await vi.waitFor(() => expect(aviso).toHaveBeenCalledTimes(1))
    await deixarPassar()
    expect(controlador.situacao().estado).toBe('lendo_contexto')
    expect(controlador.situacao().estado).not.toBe('falha_contexto')
  })

  it.each(['doDia', 'sessoesDaJanela'] as const)('RF19:7: sessão vencida em %s chama o aviso e não vai ao estado 8', async (operacao) => {
    const { controlador, mundo, aviso } = montar()
    simularFalhaRotina(mundo.rotina, operacao, sessaoVencida)
    controlador.abrir()
    await vi.waitFor(() => expect(aviso).toHaveBeenCalledTimes(1))
    await deixarPassar()
    expect(controlador.situacao().estado).toBe('lendo_numeros')
    expect(controlador.situacao().estado).not.toBe('falha_numeros')
  })

  it('RF19:7: sessão vencida na semana (doIntervalo) também chama o aviso', async () => {
    const { controlador, mundo, aviso } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    simularFalhaRotina(mundo.rotina, 'doIntervalo', sessaoVencida)
    controlador.escolherPeriodo('semana')
    await vi.waitFor(() => expect(aviso).toHaveBeenCalledTimes(1))
  })

  it('RF19:7: uma falha comum não chama o aviso de sessão vencida', async () => {
    const { controlador, mundo, aviso } = montar()
    simularFalhaRotina(mundo.rotina, 'doDia', 'rede')
    controlador.abrir()
    await aguardar(controlador, 'falha_numeros')
    expect(aviso).not.toHaveBeenCalled()
  })

  it('RF19:inscrição: o ouvinte é chamado a cada mudança e deixa de ser depois de cancelado', async () => {
    const { controlador } = montar()
    const ouvinte = vi.fn()
    const cancelar = controlador.inscrever(ouvinte)
    controlador.abrir()
    expect(ouvinte).toHaveBeenCalled()
    await aguardar(controlador, 'pronto')
    cancelar()
    const chamadas = ouvinte.mock.calls.length
    controlador.fechar()
    expect(ouvinte.mock.calls.length).toBe(chamadas)
  })

  it('RF19:situação: a mesma referência enquanto nada muda', async () => {
    const { controlador } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    expect(controlador.situacao()).toBe(controlador.situacao())
  })
})

describe('RF05: as caixas e o bloco no controlador', () => {
  it('RF05:marcar: marcar uma caixa põe a linha no bloco e liga "Inserir no texto"; desmarcar desfaz', async () => {
    const { controlador } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    const caixa = primeiraCaixa(controlador.situacao())
    expect(caixa.marcado).toBe(false)
    controlador.marcar(caixa.chave, true)
    const marcada = controlador.situacao()
    expect(marcada.podeInserir).toBe(true)
    expect(marcada.bloco).toContain(caixa.valor)
    expect(marcada.caixas[0].marcado).toBe(true)
    controlador.marcar(caixa.chave, false)
    expect(controlador.situacao().podeInserir).toBe(false)
    expect(controlador.situacao().bloco).toBe('')
  })

  it('RF05:marcar: trocar de período descarta as marcas', async () => {
    const { controlador } = montar()
    controlador.abrir()
    await aguardar(controlador, 'pronto')
    controlador.marcar(primeiraCaixa(controlador.situacao()).chave, true)
    controlador.escolherPeriodo('semana')
    await aguardar(controlador, 'pronto')
    expect(controlador.situacao().podeInserir).toBe(false)
    expect(controlador.situacao().caixas.every((caixa) => !caixa.marcado)).toBe(true)
  })

  it('RF05:marcar: uma chave que não está nas caixas é ignorada', async () => {
    const { controlador } = montar({ semRegistros: true })
    controlador.abrir()
    await aguardar(controlador, 'sem_numeros')
    controlador.marcar('sono', true)
    expect(controlador.situacao().podeInserir).toBe(false)
  })
})
