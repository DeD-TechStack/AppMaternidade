import type { TipoRegistro } from '../../dados/rotina.tipos.ts'
import { ehDiaDoHistorico } from './diasDoHistorico.ts'

// Os parâmetros da URL do Histórico (R38-20): `?dia=AAAA-MM-DD`, `?tipos=` e `?vista=`. Qualquer valor que não
// vale vira o padrão, e a tela troca a URL (substituindo a entrada) pela forma canônica, na ordem dia, tipos, vista.

/** As chaves do filtro, na ordem em que a URL as escreve (R38-20). */
export const CHAVES_DO_FILTRO: readonly TipoRegistro[] = ['sono', 'mamada', 'mamadeira', 'fralda', 'tummy', 'solido', 'observacao']

export type Vista = 'dia' | 'semana'

interface ParametrosDoHistorico {
  /** O dia que vale: o da URL, se ele existe e não é futuro; senão, hoje. */
  dia: string
  /** Os tipos ligados, na ordem de `CHAVES_DO_FILTRO`. Nunca vazio. */
  tipos: TipoRegistro[]
  vista: Vista
  /** A URL canônica (`''` ou `?dia=...`): a que a tela escreve quando a da barra é outra. */
  canonica: string
}

interface EscolhaDoHistorico {
  dia: string
  tipos: readonly TipoRegistro[]
  vista: Vista
}

/** Os tipos de uma lista bruta: os conhecidos, sem repetição, na ordem canônica; sem nenhum, todos. */
function tiposDoParametro(bruto: string | null): TipoRegistro[] {
  const pedidos = new Set((bruto ?? '').split(',').map((parte) => parte.trim()))
  const conhecidos = CHAVES_DO_FILTRO.filter((chave) => pedidos.has(chave))
  return conhecidos.length === 0 ? [...CHAVES_DO_FILTRO] : conhecidos
}

/** A busca de uma escolha. O `dia` só entra se `comDia`; os tipos só se não são todos; a vista só se é a semana. */
function montarBusca(escolha: EscolhaDoHistorico, comDia: boolean): string {
  const partes: string[] = []
  if (comDia) partes.push(`dia=${escolha.dia}`)
  const ordenados = CHAVES_DO_FILTRO.filter((chave) => escolha.tipos.includes(chave))
  if (ordenados.length > 0 && ordenados.length < CHAVES_DO_FILTRO.length) partes.push(`tipos=${ordenados.join(',')}`)
  if (escolha.vista === 'semana') partes.push('vista=semana')
  return partes.length === 0 ? '' : `?${partes.join('&')}`
}

export function lerParametros(busca: string, hoje: string): ParametrosDoHistorico {
  const parametros = new URLSearchParams(busca)
  const bruto = parametros.get('dia')
  const diaValido = ehDiaDoHistorico(bruto, hoje)
  const dia = diaValido ? bruto : hoje
  const tipos = tiposDoParametro(parametros.get('tipos'))
  const vista: Vista = parametros.get('vista') === 'semana' ? 'semana' : 'dia'
  return { dia, tipos, vista, canonica: montarBusca({ dia, tipos, vista }, diaValido) }
}

/** A rota do Histórico com a busca de uma escolha; o dia vai sempre explícito. */
export const urlDoHistorico = (escolha: EscolhaDoHistorico): string => `/app/historico${montarBusca(escolha, true)}`

/** A rota do Histórico de um dia, com todos os tipos na vista do dia. */
export const urlDoHistoricoDoDia = (dia: string): string => `/app/historico?dia=${dia}`
