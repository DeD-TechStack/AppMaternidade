import { ehDiaValido } from '../../dados/rotina.dia.ts'

// As contas de calendário do Histórico (R38-20, R38-21). Um dia é o texto `AAAA-MM-DD`, o dia da família; as
// contas são de calendário (UTC), sem fuso: só o `diaDaFamilia` e a `janelaDoDia` falam de instantes.

const doisDigitos = (n: number) => String(n).padStart(2, '0')

function paraData(dia: string): Date {
  const [ano, mes, numero] = dia.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, numero))
}

function paraTexto(data: Date): string {
  return `${data.getUTCFullYear()}-${doisDigitos(data.getUTCMonth() + 1)}-${doisDigitos(data.getUTCDate())}`
}

/** O dia `quantidade` dias depois (ou antes, se negativa) de `dia`. */
export function somarDias(dia: string, quantidade: number): string {
  const data = paraData(dia)
  data.setUTCDate(data.getUTCDate() + quantidade)
  return paraTexto(data)
}

/** Os 7 dias que terminam em `dia`, do mais antigo ao mais novo. */
export function seteDiasAte(dia: string): string[] {
  return Array.from({ length: 7 }, (_, indice) => somarDias(dia, indice - 6))
}

/** `AAAA-MM-DD` com um dia que existe no calendário, antes ou no dia `hoje`. */
export const ehDiaDoHistorico = (valor: string | null, hoje: string): valor is string =>
  valor !== null && /^\d{4}-\d{2}-\d{2}$/.test(valor) && ehDiaValido(valor) && valor <= hoje

/** `quinta-feira, 5 de novembro`. */
export function diaPorExtenso(dia: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(paraData(dia))
}

/** `qui.` */
export function siglaDoDia(dia: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(paraData(dia))
}

/** O número do dia no mês, com dois dígitos: `05`. */
export const numeroDoDia = (dia: string): string => dia.slice(8, 10)

/** `qui., 05/11`: o dia por extenso curto das linhas da semana. */
export const diaCurto = (dia: string): string => `${siglaDoDia(dia)}, ${dia.slice(8, 10)}/${dia.slice(5, 7)}`
