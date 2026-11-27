import { janelaDoDia } from '../../dados/rotina.dia.ts'
import type { Registro } from '../../dados/rotina.tipos.ts'
import { seteDiasAte } from '../rotina/diasDoHistorico.ts'
import { CHAVES_DO_FILTRO } from '../rotina/parametrosHistorico.ts'
import { totaisDoPeriodo, totaisPorDiaDaSemana, type TotaisDoPeriodo } from '../rotina/totaisHistorico.ts'

// As contas do resumo da rotina (RF12, RF-06 e RF-07): "Hoje até agora" e "Últimos 7 dias (média por dia)". Os
// totais são os do Histórico (`totaisDoPeriodo` e o total diário da semana), com todos os tipos ligados. A média
// e o arredondamento são feitos sobre a fração exata, em aritmética inteira (sem ponto flutuante).

export type PeriodoDoResumo = 'hoje' | 'semana'

/** Os 6 números do resumo, na ordem em que entram no bloco (RF-08). */
export const CHAVES_DO_RESUMO = ['sono', 'tummy', 'mamadas', 'mamadeiras', 'fraldas', 'solidos'] as const
export type ChaveDoNumero = (typeof CHAVES_DO_RESUMO)[number]

/** Um número que entra na lista: só os de valor exibido maior que zero. */
export interface NumeroDoResumo {
  chave: ChaveDoNumero
  /**
   * O valor exibido, já arredondado: minutos (sono e tummy time) ou a contagem. Na semana a contagem vem em
   * décimos (`74` é 7,4), por isso `emDecimos`.
   */
  valor: number
  /** Só nas mamadeiras: os ml exibidos (soma de hoje, ou a média por dia da semana); `null` quando não há ml ou ele arredonda a zero. */
  ml: number | null
  emDecimos: boolean
}

export interface ResumoCalculado {
  periodo: PeriodoDoResumo
  /** N, o número de dias com registro (de 0 a 7); só na semana (`null` em "Hoje até agora"). */
  diasComRegistro: number | null
  /** Os números de valor exibido maior que zero, na ordem do bloco. */
  numeros: NumeroDoResumo[]
}

interface EntradaDoResumo {
  periodo: PeriodoDoResumo
  /** O dia de hoje da família, fixado no instante da leitura (`AAAA-MM-DD`). */
  hoje: string
  fuso: string
  /** Os registros lidos: os do dia (hoje) ou os do intervalo (semana). */
  registros: readonly Registro[]
  /** As sessões que cruzam a janela lida (sono e tummy time). */
  sessoes: readonly Registro[]
}

/** `numerador ÷ denominador`, arredondado ao inteiro mais próximo; o meio sobe (2,5 vira 3). Só inteiros positivos. */
export function arredondarMeio(numerador: number, denominador: number): number {
  const dobro = 2 * numerador + denominador
  const passo = 2 * denominador
  return (dobro - (dobro % passo)) / passo
}

interface Somas {
  sono: number
  tummy: number
  mamadas: number
  mamadeiras: number
  ml: number
  fraldas: number
  solidos: number
}

const somasDe = (totais: TotaisDoPeriodo): Somas => ({
  sono: totais.sonoMin,
  tummy: totais.tummyMin,
  mamadas: totais.mamadas,
  mamadeiras: totais.mamadeiras,
  ml: totais.mlDasMamadeiras,
  fraldas: totais.fraldas,
  solidos: totais.solidos,
})

/** Um dia com registro tem pelo menos um dos 6 números maior que zero (as observações não contam). */
const temRegistro = (totais: TotaisDoPeriodo): boolean =>
  totais.sonoMin > 0 || totais.tummyMin > 0 || totais.mamadas > 0 || totais.mamadeiras > 0 || totais.fraldas > 0 || totais.solidos > 0

function somar(dias: readonly TotaisDoPeriodo[]): Somas {
  const soma: Somas = { sono: 0, tummy: 0, mamadas: 0, mamadeiras: 0, ml: 0, fraldas: 0, solidos: 0 }
  for (const dia of dias) {
    const parcela = somasDe(dia)
    for (const chave of Object.keys(soma) as Array<keyof Somas>) soma[chave] += parcela[chave]
  }
  return soma
}

/** Os números de valor exibido positivo. Na semana, `divisor` é N: minutos e ml em inteiros, contagens em décimos. */
function numerosDe(soma: Somas, divisor: number, semana: boolean): NumeroDoResumo[] {
  // Minutos e ml: o inteiro mais próximo. Contagens: 1 casa decimal, ou seja, a média vezes 10 no inteiro mais próximo.
  const inteiro = (total: number) => (semana ? arredondarMeio(total, divisor) : total)
  const contagem = (total: number) => (semana ? arredondarMeio(total * 10, divisor) : total)
  const ml = inteiro(soma.ml)
  const numeros: NumeroDoResumo[] = [
    { chave: 'sono', valor: inteiro(soma.sono), ml: null, emDecimos: false },
    { chave: 'tummy', valor: inteiro(soma.tummy), ml: null, emDecimos: false },
    { chave: 'mamadas', valor: contagem(soma.mamadas), ml: null, emDecimos: semana },
    { chave: 'mamadeiras', valor: contagem(soma.mamadeiras), ml: ml > 0 ? ml : null, emDecimos: semana },
    { chave: 'fraldas', valor: contagem(soma.fraldas), ml: null, emDecimos: semana },
    { chave: 'solidos', valor: contagem(soma.solidos), ml: null, emDecimos: semana },
  ]
  return numeros.filter((numero) => numero.valor > 0)
}

/** A janela `[de, ate)` (ISO) que a leitura do período cobre: o dia de hoje, ou os 7 dias que terminam nele. */
export function janelaDaLeitura(periodo: PeriodoDoResumo, hoje: string, fuso: string): { de: string; ate: string } {
  if (periodo === 'hoje') return janelaDoDia(hoje, fuso)
  const dias = seteDiasAte(hoje)
  return { de: janelaDoDia(dias[0], fuso).de, ate: janelaDoDia(dias[6], fuso).ate }
}

export function calcularResumo(entrada: EntradaDoResumo): ResumoCalculado {
  const { periodo, hoje, fuso, registros, sessoes } = entrada
  if (periodo === 'hoje') {
    const janela = janelaDoDia(hoje, fuso)
    const totais = totaisDoPeriodo(registros, sessoes, Date.parse(janela.de), Date.parse(janela.ate), CHAVES_DO_FILTRO)
    return { periodo, diasComRegistro: null, numeros: numerosDe(somasDe(totais), 1, false) }
  }
  const dias = totaisPorDiaDaSemana(registros, sessoes, seteDiasAte(hoje), fuso).map((dia) => dia.totais)
  const diasComRegistro = dias.filter(temRegistro).length
  if (diasComRegistro === 0) return { periodo, diasComRegistro, numeros: [] }
  return { periodo, diasComRegistro, numeros: numerosDe(somar(dias), diasComRegistro, true) }
}
