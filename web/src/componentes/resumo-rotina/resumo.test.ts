import { describe, expect, it } from 'vitest'
import { janelaDoDia } from '../../dados/rotina.dia.ts'
import type { DetalhesRegistro, Registro, TipoRegistro } from '../../dados/rotina.tipos.ts'
import { CHAVES_DO_FILTRO } from '../rotina/parametrosHistorico.ts'
import { seteDiasAte } from '../rotina/diasDoHistorico.ts'
import { totaisDoPeriodo } from '../rotina/totaisHistorico.ts'
import { montarBloco } from './bloco.ts'
import { CHAVES_DO_RESUMO, arredondarMeio, calcularResumo, type NumeroDoResumo, type ResumoCalculado } from './calculo.ts'

// RF12, RF-06 a RF-09: as contas do resumo (hoje e 7 dias, em aritmética inteira) e o texto do bloco. Só dados
// fictícios; os dias são de calendário no fuso `UTC` (os de fuso diferente têm o caso próprio).

const HOJE = '2026-11-05'
const DIAS = seteDiasAte(HOJE)
const MINUTO = 60_000

const em = (dia: string, hora: number, minuto = 0, segundo = 0) =>
  Date.UTC(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)), hora, minuto, segundo)
const iso = (instante: number) => new Date(instante).toISOString()

let sequencia = 0

function registro(tipo: TipoRegistro, inicio: number, fim: number | null = null, resto: { detalhes?: DetalhesRegistro; nota?: string | null } = {}): Registro {
  sequencia += 1
  return {
    id: `a0000000-0000-7000-8000-${String(sequencia).padStart(12, '0')}`,
    familiaId: 'f0000000-0000-7000-8000-000000000001',
    bebeId: 'b0000000-0000-7000-8000-000000000001',
    tipo,
    inicio: iso(inicio),
    fim: fim === null ? null : iso(fim),
    detalhes: resto.detalhes ?? {},
    nota: resto.nota ?? null,
    origem: 'ao_vivo',
    fuso: 'UTC',
    deslocamentoMin: 0,
    criadoPor: 'c0000000-0000-7000-8000-000000000001',
    encerradoPor: null,
    versao: 1,
    recebidoEm: iso(inicio),
    atualizadoEm: iso(inicio),
    excluidoEm: null,
    excluidoPor: null,
  }
}

/** Uma sessão de `minutos` minutos (e `segundos` a mais) que começa em `inicio`. */
const sessao = (tipo: 'sono' | 'tummy' | 'mamada', inicio: number, minutos: number, segundos = 0) =>
  registro(tipo, inicio, inicio + minutos * MINUTO + segundos * 1000)

interface Semana {
  registros: Registro[]
  sessoes: Registro[]
}

const novaSemana = (): Semana => ({ registros: [], sessoes: [] })

/** Põe um sono ou tummy time nas duas listas, como as leituras da Rotina fazem. */
function comSessao(semana: Semana, item: Registro) {
  semana.registros.push(item)
  semana.sessoes.push(item)
}

const calcularSemana = (semana: Semana) => calcularResumo({ periodo: 'semana', hoje: HOJE, fuso: 'UTC', ...semana })
const calcularHoje = (registros: Registro[], sessoes: Registro[] = []) =>
  calcularResumo({ periodo: 'hoje', hoje: HOJE, fuso: 'UTC', registros, sessoes })

const de = (resumo: ResumoCalculado, chave: NumeroDoResumo['chave']) => resumo.numeros.find((numero) => numero.chave === chave)
const valores = (resumo: ResumoCalculado) => Object.fromEntries(resumo.numeros.map((numero) => [numero.chave, numero.valor]))

describe('aritmética inteira do resumo', () => {
  it('resumo: o meio arredonda para cima sobre a fração exata, sem ponto flutuante', () => {
    expect(arredondarMeio(5, 2)).toBe(3)
    expect(arredondarMeio(243, 2)).toBe(122)
    expect(arredondarMeio(1211, 10)).toBe(121)
    expect(arredondarMeio(1215, 10)).toBe(122)
    expect(arredondarMeio(1, 7)).toBe(0)
    expect(arredondarMeio(4, 7)).toBe(1)
    expect(arredondarMeio(0, 5)).toBe(0)
    // Onde a divisão em ponto flutuante erra (1,005 * 100 = 100,49999...): a conta inteira não.
    expect(arredondarMeio(1005, 1000)).toBe(1)
    expect(arredondarMeio(2675, 1000)).toBe(3)
  })

  it('resumo: os 6 números, na ordem do bloco', () => {
    expect([...CHAVES_DO_RESUMO]).toEqual(['sono', 'tummy', 'mamadas', 'mamadeiras', 'fraldas', 'solidos'])
  })
})

describe('RF12:RF-06 hoje até agora', () => {
  it('resumo: hoje igual a totaisDoPeriodo para a fixture (meia-noite, andamento, excluído, fuso); mamadas e mamadeiras separadas', () => {
    // O dia da família é o de São Paulo (UTC-3): hoje vai de 03:00 UTC de 5/11 a 03:00 UTC de 6/11.
    const fuso = 'America/Sao_Paulo'
    const janela = janelaDoDia(HOJE, fuso)
    expect(janela.de).toBe('2026-11-05T03:00:00.000Z')

    const naMeiaNoite = sessao('sono', em('2026-11-05', 2), 150) // 23:00 de ontem às 01:30 de hoje: entram 90 min
    const sonecaDaTarde = sessao('sono', em(HOJE, 15), 30)
    const tummy = sessao('tummy', em(HOJE, 12), 0, 30) // 30 s: trunca para 0 min
    const emAndamento = registro('sono', em(HOJE, 18)) // sem fim: fica fora
    const mamadaEmAndamento = registro('mamada', em(HOJE, 19))
    const registros = [
      naMeiaNoite,
      sonecaDaTarde,
      tummy,
      emAndamento,
      mamadaEmAndamento,
      sessao('mamada', em(HOJE, 10), 20),
      sessao('mamada', em(HOJE, 13), 15),
      registro('mamadeira', em(HOJE, 16), null, { detalhes: { ml: 120, conteudo: 'formula' } }),
      registro('fralda', em(HOJE, 11), null, { detalhes: { conteudo: 'xixi' } }),
      registro('fralda', em(HOJE, 14), null, { detalhes: { conteudo: 'coco' } }),
      registro('fralda', em('2026-11-06', 2, 30), null, { detalhes: { conteudo: 'ambos' } }), // 23:30 em São Paulo: ainda hoje
      registro('solido', em(HOJE, 17), null, { detalhes: { alimento: 'banana' } }),
      registro('observacao', em(HOJE, 9), null, { nota: 'Dormiu bem.' }),
    ]
    const sessoes = [naMeiaNoite, sonecaDaTarde, tummy]

    const resumo = calcularResumo({ periodo: 'hoje', hoje: HOJE, fuso, registros, sessoes })
    const esperado = totaisDoPeriodo(registros, sessoes, Date.parse(janela.de), Date.parse(janela.ate), CHAVES_DO_FILTRO)

    expect(resumo.periodo).toBe('hoje')
    expect(resumo.diasComRegistro).toBeNull()
    expect(resumo.numeros).toEqual([
      { chave: 'sono', valor: esperado.sonoMin, ml: null, emDecimos: false },
      { chave: 'mamadas', valor: esperado.mamadas, ml: null, emDecimos: false },
      { chave: 'mamadeiras', valor: esperado.mamadeiras, ml: esperado.mlDasMamadeiras, emDecimos: false },
      { chave: 'fraldas', valor: esperado.fraldas, ml: null, emDecimos: false },
      { chave: 'solidos', valor: esperado.solidos, ml: null, emDecimos: false },
    ])
    expect(valores(resumo)).toEqual({ sono: 120, mamadas: 2, mamadeiras: 1, fraldas: 3, solidos: 1 })
    expect(de(resumo, 'mamadeiras')?.ml).toBe(120)
    // Tummy time de 30 s não tem minuto inteiro; a observação não é um dos 6 números.
    expect(de(resumo, 'tummy')).toBeUndefined()
  })

  it('resumo: só entram os números maiores que zero; mamadeira sem ml leva só a contagem', () => {
    expect(calcularHoje([]).numeros).toEqual([])
    const resumo = calcularHoje([registro('mamadeira', em(HOJE, 8)), registro('mamadeira', em(HOJE, 11), null, { detalhes: { ml: 0 } })])
    expect(resumo.numeros).toEqual([{ chave: 'mamadeiras', valor: 2, ml: null, emDecimos: false }])
  })
})

describe('RF12:RF-07 últimos 7 dias', () => {
  it('resumo: N = 0, 1, 5 e 7; 37 mamadas/605 min/900 ml com N = 5; empate 5 min ÷ 2 = 3; 1 min ÷ 7 fora; sessões de 1 min 40 s em 2 dias = 1 min; dias só com observações; semana do painel igual dia a dia à do Histórico', () => {
    // N = 0: nada na semana.
    const vazia = calcularSemana(novaSemana())
    expect(vazia).toEqual({ periodo: 'semana', diasComRegistro: 0, numeros: [] })

    // N = 1: 3 mamadas num dia só. A média é 3 por dia (30 décimos).
    const um = novaSemana()
    for (const hora of [8, 11, 14]) um.registros.push(sessao('mamada', em('2026-11-02', hora), 10))
    const resumoDeUm = calcularSemana(um)
    expect(resumoDeUm.diasComRegistro).toBe(1)
    expect(resumoDeUm.numeros).toEqual([{ chave: 'mamadas', valor: 30, ml: null, emDecimos: true }])

    // N = 5: 37 mamadas, 605 min de sono (soma dos totais diários) e 900 ml em 5 dos 7 dias.
    const cinco = novaSemana()
    const mamadasPorDia = [8, 8, 7, 7, 7]
    ;[DIAS[0], DIAS[2], DIAS[3], DIAS[5], DIAS[6]].forEach((dia, indice) => {
      for (let n = 0; n < mamadasPorDia[indice]; n++) cinco.registros.push(sessao('mamada', em(dia, 6 + n), 10))
      for (let n = 0; n < 2; n++) cinco.registros.push(registro('mamadeira', em(dia, 20 + n), null, { detalhes: { ml: 90 } }))
      comSessao(cinco, sessao('sono', em(dia, 0, 30), 121))
    })
    const resumoDeCinco = calcularSemana(cinco)
    expect(resumoDeCinco.diasComRegistro).toBe(5)
    expect(resumoDeCinco.numeros).toEqual([
      { chave: 'sono', valor: 121, ml: null, emDecimos: false }, // 605 ÷ 5 = 121 (2 h 01)
      { chave: 'mamadas', valor: 74, ml: null, emDecimos: true }, // 37 ÷ 5 = 7,4
      { chave: 'mamadeiras', valor: 20, ml: 180, emDecimos: true }, // 10 ÷ 5 = 2; 900 ÷ 5 = 180 ml
    ])

    // N = 7: uma mamada e uma hora de sono por dia.
    const sete = novaSemana()
    for (const dia of DIAS) {
      sete.registros.push(sessao('mamada', em(dia, 9), 10))
      comSessao(sete, sessao('sono', em(dia, 13), 60))
    }
    const resumoDeSete = calcularSemana(sete)
    expect(resumoDeSete.diasComRegistro).toBe(7)
    expect(valores(resumoDeSete)).toEqual({ sono: 60, mamadas: 10 })

    // Empate: 5 min de tummy time somados em 2 dias com registro dão 2,5 e entram como 3 min.
    const empate = novaSemana()
    comSessao(empate, sessao('tummy', em(DIAS[1], 10), 3))
    comSessao(empate, sessao('tummy', em(DIAS[4], 10), 2))
    const resumoDoEmpate = calcularSemana(empate)
    expect(resumoDoEmpate.diasComRegistro).toBe(2)
    expect(resumoDoEmpate.numeros).toEqual([{ chave: 'tummy', valor: 3, ml: null, emDecimos: false }])
    // E 121,5 sobe para 122.
    const meio = novaSemana()
    comSessao(meio, sessao('sono', em(DIAS[0], 1), 121))
    comSessao(meio, sessao('sono', em(DIAS[6], 1), 122))
    expect(valores(calcularSemana(meio))).toEqual({ sono: 122 })

    // 1 min de tummy time em 7 dias com registro dá 0,14 e fica fora; uma contagem de 1 em 7 dias dá 0,1 e entra.
    const pequeno = novaSemana()
    for (const dia of DIAS) pequeno.registros.push(registro('fralda', em(dia, 8), null, { detalhes: { conteudo: 'xixi' } }))
    comSessao(pequeno, sessao('tummy', em(DIAS[3], 10), 1))
    pequeno.registros.push(registro('solido', em(DIAS[3], 12)))
    const resumoPequeno = calcularSemana(pequeno)
    expect(resumoPequeno.diasComRegistro).toBe(7)
    expect(de(resumoPequeno, 'tummy')).toBeUndefined()
    expect(valores(resumoPequeno)).toEqual({ fraldas: 10, solidos: 1 })

    // Se o ml médio arredonda para 0 e há mamadeiras, a linha leva só a contagem.
    const mlPequeno = novaSemana()
    for (const dia of DIAS) mlPequeno.registros.push(registro('fralda', em(dia, 8), null, { detalhes: { conteudo: 'coco' } }))
    mlPequeno.registros.push(registro('mamadeira', em(DIAS[2], 9), null, { detalhes: { ml: 1 } }))
    expect(de(calcularSemana(mlPequeno), 'mamadeiras')).toEqual({ chave: 'mamadeiras', valor: 1, ml: null, emDecimos: true })

    // Duas sessões de sono de 1 min 40 s em dois dias diferentes: totais diários 1 e 1; total 2; N = 2; média 1 min.
    const curtas = novaSemana()
    comSessao(curtas, sessao('sono', em(DIAS[0], 3), 1, 40))
    comSessao(curtas, sessao('sono', em(DIAS[5], 3), 1, 40))
    const resumoDeCurtas = calcularSemana(curtas)
    expect(resumoDeCurtas.diasComRegistro).toBe(2)
    expect(resumoDeCurtas.numeros).toEqual([{ chave: 'sono', valor: 1, ml: null, emDecimos: false }])

    // Dias só com observações não contam para N, e a observação não é número do resumo.
    const observacoes = novaSemana()
    for (const dia of [DIAS[0], DIAS[1], DIAS[2]]) observacoes.registros.push(registro('observacao', em(dia, 9), null, { nota: 'Anotação.' }))
    expect(calcularSemana(observacoes)).toEqual({ periodo: 'semana', diasComRegistro: 0, numeros: [] })
    observacoes.registros.push(sessao('mamada', em(DIAS[4], 9), 10))
    const comUmaMamada = calcularSemana(observacoes)
    expect(comUmaMamada.diasComRegistro).toBe(1)
    expect(valores(comUmaMamada)).toEqual({ mamadas: 10 })

    // A semana do painel é igual, dia a dia, à do Histórico: a soma dos totais de cada dia, calculados como a vista
    // Semana os calcula (registros do dia, as sessões da semana, a janela do dia), dividida por N.
    const historico = novaSemana()
    comSessao(historico, sessao('sono', em(DIAS[0], 22), 300)) // atravessa a meia-noite: 120 min num dia e 180 no outro
    comSessao(historico, sessao('sono', em(DIAS[3], 1), 95))
    comSessao(historico, sessao('tummy', em(DIAS[4], 16), 12))
    for (const [indice, dia] of DIAS.entries()) {
      if (indice % 2 === 0) historico.registros.push(sessao('mamada', em(dia, 7), 15))
      if (indice % 3 === 0) historico.registros.push(registro('mamadeira', em(dia, 18), null, { detalhes: { ml: 80 + indice } }))
      if (indice !== 2) historico.registros.push(registro('fralda', em(dia, 12), null, { detalhes: { conteudo: 'xixi' } }))
    }
    historico.registros.push(registro('solido', em(DIAS[6], 11)))
    const diaADia = DIAS.map((dia) => {
      const janela = janelaDoDia(dia, 'UTC')
      const doDia = historico.registros.filter((item) => item.inicio.slice(0, 10) === dia)
      return totaisDoPeriodo(doDia, historico.sessoes, Date.parse(janela.de), Date.parse(janela.ate), CHAVES_DO_FILTRO)
    })
    const soma = (campo: keyof (typeof diaADia)[number]) => diaADia.reduce((total, dia) => total + dia[campo], 0)
    const comRegistro = diaADia.filter((dia) => dia.sonoMin + dia.tummyMin + dia.mamadas + dia.mamadeiras + dia.fraldas + dia.solidos > 0).length
    const painel = calcularSemana(historico)
    expect(painel.diasComRegistro).toBe(comRegistro)
    expect(comRegistro).toBe(7)
    expect(de(painel, 'sono')?.valor).toBe(arredondarMeio(soma('sonoMin'), comRegistro))
    expect(de(painel, 'tummy')?.valor).toBe(arredondarMeio(soma('tummyMin'), comRegistro))
    expect(de(painel, 'mamadas')?.valor).toBe(arredondarMeio(soma('mamadas') * 10, comRegistro))
    expect(de(painel, 'mamadeiras')?.valor).toBe(arredondarMeio(soma('mamadeiras') * 10, comRegistro))
    expect(de(painel, 'mamadeiras')?.ml).toBe(arredondarMeio(soma('mlDasMamadeiras'), comRegistro))
    expect(de(painel, 'fraldas')?.valor).toBe(arredondarMeio(soma('fraldas') * 10, comRegistro))
    expect(de(painel, 'solidos')?.valor).toBe(arredondarMeio(soma('solidos') * 10, comRegistro))
  })
})

const todos = [...CHAVES_DO_RESUMO]

/** Um resumo montado à mão, para conferir só o texto do bloco. */
const resumoFeito = (periodo: 'hoje' | 'semana', dias: number | null, numeros: NumeroDoResumo[]): ResumoCalculado => ({
  periodo,
  diasComRegistro: dias,
  numeros,
})
const n = (chave: NumeroDoResumo['chave'], valor: number, emDecimos = false, ml: number | null = null): NumeroDoResumo => ({ chave, valor, ml, emDecimos })

describe('RF12:RF-08 o bloco', () => {
  it('resumo: texto exato do bloco (hoje, semana, "1 dia", mamadeira sem ml, ml médio arredondado a 0)', () => {
    const hoje = resumoFeito('hoje', null, [
      n('sono', 560),
      n('tummy', 35),
      n('mamadas', 7),
      n('mamadeiras', 2, false, 240),
      n('fraldas', 6),
      n('solidos', 1),
    ])
    expect(montarBloco(hoje, todos)).toBe(
      [
        'Resumo da rotina de hoje até agora:',
        '- Sono: 9 h 20',
        '- Tummy time: 0 h 35',
        '- Mamadas: 7',
        '- Mamadeiras: 2, somando 240 ml',
        '- Fraldas: 6',
        '- Alimentação sólida: 1',
      ].join('\n'),
    )
    // Mamadeira sem ml: só a contagem.
    expect(montarBloco(resumoFeito('hoje', null, [n('mamadeiras', 2)]), ['mamadeiras'])).toBe('Resumo da rotina de hoje até agora:\n- Mamadeiras: 2')

    const semana = resumoFeito('semana', 5, [
      n('sono', 725),
      n('tummy', 20),
      n('mamadas', 74, true),
      n('mamadeiras', 13, true, 180),
      n('fraldas', 60, true),
      n('solidos', 5, true),
    ])
    expect(montarBloco(semana, todos)).toBe(
      [
        'Resumo da rotina dos últimos 7 dias (média por dia, em 5 dias com registro):',
        '- Sono: 12 h 05 por dia',
        '- Tummy time: 0 h 20 por dia',
        '- Mamadas: 7,4 por dia',
        '- Mamadeiras: 1,3 por dia, somando 180 ml por dia',
        '- Fraldas: 6 por dia',
        '- Alimentação sólida: 0,5 por dia',
      ].join('\n'),
    )
    // "1 dia" no singular; a casa decimal ",0" não aparece; ml médio arredondado a 0 leva só a contagem.
    const umDia = resumoFeito('semana', 1, [n('mamadas', 30, true), n('mamadeiras', 13, true)])
    expect(montarBloco(umDia, ['mamadas', 'mamadeiras'])).toBe(
      'Resumo da rotina dos últimos 7 dias (média por dia, em 1 dia com registro):\n- Mamadas: 3 por dia\n- Mamadeiras: 1,3 por dia',
    )

    // Só as marcadas, sempre na ordem fixa, sem linha em branco e sem `\n` final; nenhuma marcada, nenhum bloco.
    expect(montarBloco(hoje, ['fraldas', 'sono'])).toBe('Resumo da rotina de hoje até agora:\n- Sono: 9 h 20\n- Fraldas: 6')
    expect(montarBloco(hoje, [])).toBe('')
    const texto = montarBloco(semana, todos)
    expect(texto.endsWith('\n')).toBe(false)
    expect(texto).not.toContain('\n\n')
    // Uma chave marcada que o período não traz (valor exibido zero) não vira linha.
    expect(montarBloco(resumoFeito('hoje', null, [n('mamadas', 3)]), ['mamadas', 'sono'])).toBe('Resumo da rotina de hoje até agora:\n- Mamadas: 3')
  })

  it('resumo: o texto sai da conta ponta a ponta (30 min de tummy time em 7 dias com registro e 1 ml de mamadeira)', () => {
    const semana = novaSemana()
    for (const dia of DIAS) semana.registros.push(registro('fralda', em(dia, 8), null, { detalhes: { conteudo: 'xixi' } }))
    comSessao(semana, sessao('tummy', em(DIAS[3], 10), 30))
    semana.registros.push(registro('mamadeira', em(DIAS[2], 9), null, { detalhes: { ml: 1 } }))
    expect(montarBloco(calcularSemana(semana), todos)).toBe(
      [
        'Resumo da rotina dos últimos 7 dias (média por dia, em 7 dias com registro):',
        '- Tummy time: 0 h 04 por dia',
        '- Mamadeiras: 0,1 por dia',
        '- Fraldas: 1 por dia',
      ].join('\n'),
    )
  })
})

describe('RF12:RF-09 o que o bloco nunca tem', () => {
  it('resumo: fixture com nome, cuidador, nota e horários; o bloco não tem nenhum deles, nem HH:MM, data, uuid ou observação', () => {
    const nomeDoBebe = 'Bebê-exemplo'
    const cuidador = 'Cuidadora Fictícia'
    const familia = 'Família Fictícia'
    const nota = 'Nota privada de teste'
    const registros = [
      sessao('sono', em(HOJE, 1, 7), 135),
      sessao('tummy', em(HOJE, 9, 41), 12),
      sessao('mamada', em(HOJE, 10, 15), 20),
      registro('mamada', em(HOJE, 14, 52), em(HOJE, 15, 5), { detalhes: { lado: 'esquerdo' }, nota }),
      registro('mamadeira', em(HOJE, 16, 33), null, { detalhes: { ml: 90, conteudo: 'formula' }, nota }),
      registro('fralda', em(HOJE, 17, 20), null, { detalhes: { conteudo: 'coco' }, nota }),
      registro('solido', em(HOJE, 12, 10), null, { detalhes: { alimento: 'banana amassada' } }),
      registro('observacao', em(HOJE, 21, 45), null, { nota: `${nomeDoBebe} ${cuidador} ${familia} ${nota}` }),
    ]
    const bloco = montarBloco(calcularHoje(registros, registros.filter((item) => item.tipo === 'sono' || item.tipo === 'tummy')), todos)

    for (const proibido of [nomeDoBebe, cuidador, familia, nota, 'banana', 'esquerdo', 'formula', 'fórmula', 'xixi', 'cocô', 'Observações', 'observa', 'UTC', 'America']) {
      expect(bloco, proibido).not.toContain(proibido)
    }
    expect(bloco).not.toMatch(/\d{1,2}:\d{2}/) // horário HH:MM (o título tem dois pontos, mas sem dígitos antes)
    expect(bloco).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(\/\d{2,4})?/) // data de calendário
    expect(bloco).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) // uuid
    // Só há o título e linhas `- <rótulo fixo>: <número>`.
    const [titulo, ...linhas] = bloco.split('\n')
    expect(titulo).toBe('Resumo da rotina de hoje até agora:')
    expect(linhas).toEqual(['- Sono: 2 h 15', '- Tummy time: 0 h 12', '- Mamadas: 2', '- Mamadeiras: 1, somando 90 ml', '- Fraldas: 1', '- Alimentação sólida: 1'])
  })
})
