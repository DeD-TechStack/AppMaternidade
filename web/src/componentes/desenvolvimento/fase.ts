import { formatarIdade } from '../../dados/rotina.dia.ts'
import type { ItemDeConteudo } from './itens.ts'

const DIA = 86_400_000

function separar(dia: string): number | null {
  const achado = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  if (!achado) return null
  const [ano, mes, numero] = [Number(achado[1]), Number(achado[2]), Number(achado[3])]
  const instante = Date.UTC(ano, mes - 1, numero)
  const conferido = new Date(instante)
  if (conferido.getUTCFullYear() !== ano || conferido.getUTCMonth() !== mes - 1 || conferido.getUTCDate() !== numero) return null
  return instante
}

/**
 * A idade em dias inteiros: o dia da família de hoje menos a data de nascimento (`AAAA-MM-DD`). Negativa
 * quando o nascimento é depois de hoje; `null` quando uma das datas não existe.
 */
export function idadeEmDias(nascimento: string, hoje: string): number | null {
  const n = separar(nascimento)
  const h = separar(hoje)
  if (n === null || h === null) return null
  return Math.round((h - n) / DIA)
}

/** A idade escrita ("<n> dias", "1 mês", "<m> meses"), a mesma que o Hoje mostra. */
export const idadeEscrita = formatarIdade

/** A fase: os itens 3 a 8 cuja janela contém a idade em dias, com limites inclusivos. */
export function fasesDaIdade(dias: number, itens: readonly ItemDeConteudo[]): ItemDeConteudo[] {
  return itens.filter((item) => item.fase && dias >= item.de && dias <= item.ate)
}
