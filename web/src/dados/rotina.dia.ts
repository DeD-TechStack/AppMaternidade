import { dataNoFuso, fusoValido } from './comum.ts'

// O dia da família: a data do `inicio` no fuso da família (`familias.fuso`), a mesma regra de
// `registros_do_dia`. A janela do dia vai de 00:00 a 24:00 desse dia no fuso da família, em instantes
// UTC calculados no navegador com `Intl` (sem biblioteca). Os horários aparecem no fuso do aparelho.

const MINUTO = 60_000
const HORA = 60 * MINUTO
const DIA = 24 * HORA

/** A data `AAAA-MM-DD` do instante no fuso da família. */
export const diaDaFamilia = (instante: number, fuso: string): string => dataNoFuso(instante, fuso)

function partesNoFuso(instante: number, fuso: string) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fusoValido(fuso) ? fuso : 'UTC',
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(instante))
  const pega = (tipo: string) => Number(partes.find((parte) => parte.type === tipo)?.value ?? 0)
  return { ano: pega('year'), mes: pega('month'), dia: pega('day'), hora: pega('hour') % 24, minuto: pega('minute'), segundo: pega('second') }
}

/** O deslocamento do fuso naquele instante, em milissegundos a leste de UTC. */
function deslocamentoDoFuso(instante: number, fuso: string): number {
  const p = partesNoFuso(instante, fuso)
  const instanteSemMs = Math.floor(instante / 1000) * 1000
  return Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo) - instanteSemMs
}

function separarDia(dia: string): [number, number, number] | null {
  const achado = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  if (!achado) return null
  const [ano, mes, numero] = [Number(achado[1]), Number(achado[2]), Number(achado[3])]
  const conferido = new Date(Date.UTC(ano, mes - 1, numero))
  if (conferido.getUTCFullYear() !== ano || conferido.getUTCMonth() !== mes - 1 || conferido.getUTCDate() !== numero) return null
  return [ano, mes, numero]
}

/** `AAAA-MM-DD` existe no calendário (`2026-02-30` não). */
export const ehDiaValido = (dia: string): boolean => separarDia(dia) !== null

/** O instante UTC (ms) de 00:00 do dia no fuso. `NaN` para dia impossível. */
export function inicioDoDia(dia: string, fuso: string): number {
  const partes = separarDia(dia)
  if (!partes) return Number.NaN
  const base = Date.UTC(partes[0], partes[1] - 1, partes[2])
  // Duas passadas: o deslocamento do fuso na meia-noite pode diferir do de UTC (horário de verão).
  const primeiro = base - deslocamentoDoFuso(base, fuso)
  return base - deslocamentoDoFuso(primeiro, fuso)
}

/** A janela do dia no fuso da família: `[de, ate)` em ISO UTC. */
export function janelaDoDia(dia: string, fuso: string): { de: string; ate: string } {
  const partes = separarDia(dia)
  if (!partes) throw new RangeError(`Dia inválido: ${dia}`)
  const seguinte = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2] + 1)).toISOString().slice(0, 10)
  return {
    de: new Date(inicioDoDia(dia, fuso)).toISOString(),
    ate: new Date(inicioDoDia(seguinte, fuso)).toISOString(),
  }
}

/** O fuso IANA do aparelho e o deslocamento em minutos a leste de UTC (São Paulo = `-180`). */
export interface Aparelho {
  fuso: string
  deslocamentoMin: number
}

export function lerAparelho(agora: number = Date.now()): Aparelho {
  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  // O oposto de `getTimezoneOffset()`. `0 - x` evita o `-0` de UTC.
  return { fuso, deslocamentoMin: 0 - new Date(agora).getTimezoneOffset() }
}

const diasDoMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate()

/**
 * A idade só com unidades completas de calendário (N1). Um mês se completa no mesmo dia do mês
 * seguinte, ou no último dia dele quando não há esse dia; um ano, no mesmo dia e mês (29/02 vale 28/02
 * nos anos comuns). Antes de 1 mês: `N dias`; de 1 a 23 meses: `N meses`; depois, `N anos`.
 */
export function formatarIdade(nascimento: string, hoje: string): string {
  const n = separarDia(nascimento)
  const h = separarDia(hoje)
  if (!n || !h) return ''
  let meses = (h[0] - n[0]) * 12 + (h[1] - n[1])
  // O dia em que o mês se completa: o mesmo dia, limitado ao último dia do mês alvo.
  const completaEm = Math.min(n[2], diasDoMes(h[0], h[1]))
  if (h[2] < completaEm) meses -= 1
  if (meses < 0) return '0 dias'
  if (meses === 0) {
    const dias = Math.round((Date.UTC(h[0], h[1] - 1, h[2]) - Date.UTC(n[0], n[1] - 1, n[2])) / DIA)
    return dias === 1 ? '1 dia' : `${dias} dias`
  }
  if (meses < 24) return meses === 1 ? '1 mês' : `${meses} meses`
  const anos = Math.floor(meses / 12)
  return anos === 1 ? '1 ano' : `${anos} anos`
}
