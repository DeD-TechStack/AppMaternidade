import { DATA_E_HORA } from '../../conteudo/rotina.ts'
import { formatarHora } from '../../prototipo/formatar.ts'

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** `DD/MM`, no aparelho. */
export function diaEMesDoAparelho(instante: number): string {
  const data = new Date(instante)
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}`
}

/** `DD/MM às HH:MM`, na hora do aparelho: autoria, exclusão e prazo (R38-22, R38-23, R38-24). */
export const dataEHora = (instante: number): string => DATA_E_HORA.as(diaEMesDoAparelho(instante), formatarHora(instante))

const DIA_EM_MS = 24 * 60 * 60 * 1000

/** O prazo de restauração de um excluído (glossário): 30 dias depois da exclusão. */
const PRAZO_DA_LIXEIRA_MS = 30 * DIA_EM_MS

/** Ainda dá para restaurar: a exclusão foi há menos de 30 dias exatos. */
export const ehRestauravel = (excluidoEm: string | null, agora: number): boolean =>
  excluidoEm !== null && Date.parse(excluidoEm) + PRAZO_DA_LIXEIRA_MS > agora

/** O instante limite da restauração, em ms. */
export const prazoDaRestauracao = (excluidoEm: string): number => Date.parse(excluidoEm) + PRAZO_DA_LIXEIRA_MS
