import { HOJE, TOTAIS } from '../../conteudo/rotina.ts'
import { ehTipoDeSessao, type Registro, type TipoRegistro } from '../../dados/rotina.tipos.ts'

// Os totais do Histórico (R38-20, R38-21; D-9: só totais), dentro da janela do dia da família, sem sessões em
// andamento nem excluídos. Sono e tummy time somam a parte de cada sessão concluída que cai na janela (inclusive
// a que começou no dia anterior); as contagens vêm dos registros concluídos que começaram no dia.

const MINUTO = 60_000

export interface TotaisDoPeriodo {
  sonoMin: number
  tummyMin: number
  /** Sessões de mamada concluídas. */
  mamadas: number
  mamadeiras: number
  /** A soma de ml das mamadeiras que têm ml. */
  mlDasMamadeiras: number
  fraldas: number
  xixi: number
  coco: number
  ambos: number
  solidos: number
  observacoes: number
}

function minutosNaJanela(sessoes: readonly Registro[], tipo: 'sono' | 'tummy', de: number, ate: number): number {
  let total = 0
  for (const sessao of sessoes) {
    if (sessao.tipo !== tipo || sessao.fim === null) continue
    const inicio = Math.max(Date.parse(sessao.inicio), de)
    const fim = Math.min(Date.parse(sessao.fim), ate)
    if (fim > inicio) total += fim - inicio
  }
  return Math.floor(total / MINUTO)
}

/**
 * Os totais de `registros` (os do dia, para as contagens) e de `sessoes` (as que cruzam a janela, para o sono e o
 * tummy time) dentro de `[de, ate)`. Só entram os `tipos` ligados no filtro.
 */
export function totaisDoPeriodo(
  registros: readonly Registro[],
  sessoes: readonly Registro[],
  de: number,
  ate: number,
  tipos: readonly TipoRegistro[],
): TotaisDoPeriodo {
  const entram = (tipo: TipoRegistro) => tipos.includes(tipo)
  const concluidos = registros.filter((registro) => entram(registro.tipo) && (registro.fim !== null || !ehTipoDeSessao(registro.tipo)))
  const mamadeiras = concluidos.filter((registro) => registro.tipo === 'mamadeira')
  const fraldas = concluidos.filter((registro) => registro.tipo === 'fralda')
  return {
    sonoMin: entram('sono') ? minutosNaJanela(sessoes, 'sono', de, ate) : 0,
    tummyMin: entram('tummy') ? minutosNaJanela(sessoes, 'tummy', de, ate) : 0,
    mamadas: concluidos.filter((registro) => registro.tipo === 'mamada').length,
    mamadeiras: mamadeiras.length,
    mlDasMamadeiras: mamadeiras.reduce((soma, registro) => soma + (registro.detalhes.ml ?? 0), 0),
    fraldas: fraldas.length,
    xixi: fraldas.filter((registro) => registro.detalhes.conteudo === 'xixi').length,
    coco: fraldas.filter((registro) => registro.detalhes.conteudo === 'coco').length,
    ambos: fraldas.filter((registro) => registro.detalhes.conteudo === 'ambos').length,
    solidos: concluidos.filter((registro) => registro.tipo === 'solido').length,
    observacoes: concluidos.filter((registro) => registro.tipo === 'observacao').length,
  }
}

/** `2 h 05`: minutos inteiros no formato do sono do Hoje. */
export const formatarMinutos = (minutos: number): string => HOJE.umaHoraEMinutos(Math.floor(minutos / 60), minutos % 60)

/** Um dia da vista de semana, com os totais dele. */
export interface DiaDaSemana {
  dia: string
  totais: TotaisDoPeriodo
}

/** A largura (%) da barra do sono: proporcional ao maior sono da semana; sem sono, ou com o maior zero, nenhuma (0). */
export const larguraDaBarra = (sonoMin: number, maiorMin: number): number =>
  maiorMin > 0 && sonoMin > 0 ? Math.max(2, Math.round((sonoMin / maiorMin) * 100)) : 0

interface LinhaDoResumo {
  rotulo: string
  valor: string
}

/** As linhas do resumo do dia: só o que tem número (os tipos desligados no filtro já chegam zerados). */
export function linhasDoResumo(totais: TotaisDoPeriodo): LinhaDoResumo[] {
  const linhas: LinhaDoResumo[] = []
  if (totais.sonoMin > 0) linhas.push({ rotulo: TOTAIS.sono, valor: formatarMinutos(totais.sonoMin) })
  if (totais.tummyMin > 0) linhas.push({ rotulo: TOTAIS.tummy, valor: formatarMinutos(totais.tummyMin) })
  if (totais.mamadas > 0) linhas.push({ rotulo: TOTAIS.mamadas, valor: String(totais.mamadas) })
  if (totais.mamadeiras > 0) {
    linhas.push({
      rotulo: TOTAIS.mamadeiras,
      valor: totais.mlDasMamadeiras > 0 ? TOTAIS.mamadeirasComMl(totais.mamadeiras, totais.mlDasMamadeiras) : String(totais.mamadeiras),
    })
  }
  if (totais.fraldas > 0) {
    linhas.push({ rotulo: TOTAIS.fraldas, valor: TOTAIS.fraldasPorTipo(totais.fraldas, totais.xixi, totais.coco, totais.ambos) })
  }
  if (totais.solidos > 0) linhas.push({ rotulo: TOTAIS.solidos, valor: String(totais.solidos) })
  if (totais.observacoes > 0) linhas.push({ rotulo: TOTAIS.observacoes, valor: String(totais.observacoes) })
  return linhas
}

/** Sem nada para somar, o resumo não aparece. */
export const temAlgoParaSomar = (totais: TotaisDoPeriodo): boolean =>
  totais.sonoMin > 0 ||
  totais.tummyMin > 0 ||
  totais.mamadas > 0 ||
  totais.mamadeiras > 0 ||
  totais.fraldas > 0 ||
  totais.solidos > 0 ||
  totais.observacoes > 0
