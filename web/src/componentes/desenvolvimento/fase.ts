import type { ItemDeConteudo } from './itens.ts'

const DIA = 86_400_000

interface Dia {
  ano: number
  mes: number
  dia: number
  instante: number
}

function separar(texto: string): Dia | null {
  const achado = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  if (!achado) return null
  const [ano, mes, dia] = [Number(achado[1]), Number(achado[2]), Number(achado[3])]
  const instante = Date.UTC(ano, mes - 1, dia)
  const conferido = new Date(instante)
  if (conferido.getUTCFullYear() !== ano || conferido.getUTCMonth() !== mes - 1 || conferido.getUTCDate() !== dia) return null
  return { ano, mes, dia, instante }
}

/**
 * A idade em dias inteiros: o dia da família de hoje menos a data de nascimento (`AAAA-MM-DD`). Negativa
 * quando o nascimento é depois de hoje; `null` quando uma das datas não existe.
 */
export function idadeEmDias(nascimento: string, hoje: string): number | null {
  const n = separar(nascimento)
  const h = separar(hoje)
  if (n === null || h === null) return null
  return Math.round((h.instante - n.instante) / DIA)
}

const diasDoMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate()

/**
 * A idade escrita desta página (DES-02): `<n> dias` (`1 dia`) antes de completar um mês e, daí em diante,
 * `1 mês` ou `<m> meses` em meses completos de calendário, nunca em anos (24 meses continuam "24 meses").
 * Um mês se completa no mesmo dia do mês seguinte, ou no último dia dele quando não há esse dia (31/01 →
 * 28/02; 29/02 → 28/02 nos anos comuns). `null` quando o nascimento é depois de hoje ou uma data não existe.
 */
export function idadeEscrita(nascimento: string, hoje: string): string | null {
  const n = separar(nascimento)
  const h = separar(hoje)
  if (n === null || h === null || h.instante < n.instante) return null
  let meses = (h.ano - n.ano) * 12 + (h.mes - n.mes)
  if (h.dia < Math.min(n.dia, diasDoMes(h.ano, h.mes))) meses -= 1
  if (meses <= 0) {
    const dias = Math.round((h.instante - n.instante) / DIA)
    return dias === 1 ? '1 dia' : `${dias} dias`
  }
  return meses === 1 ? '1 mês' : `${meses} meses`
}

/** A fase: os itens 3 a 8 cuja janela contém a idade em dias, com limites inclusivos. */
export function fasesDaIdade(dias: number, itens: readonly ItemDeConteudo[]): ItemDeConteudo[] {
  return itens.filter((item) => item.fase && dias >= item.de && dias <= item.ate)
}
