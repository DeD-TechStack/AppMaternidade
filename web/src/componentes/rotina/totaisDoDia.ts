import type { Registro } from '../../dados/rotina.tipos.ts'

// Os totais do dia (D-9: só totais), dentro da janela do dia da família, sem sessões em andamento nem
// excluídos. Mamadas são só as sessões de mamada concluídas e mamadeiras são contadas à parte (QA-09), o mesmo
// critério do resumo do dia do Histórico (`totaisHistorico.ts`); o sono soma a parte de cada sessão de sono
// concluída que cai na janela, inclusive a que começou no dia anterior.

interface TotaisDoDia {
  mamadas: number
  mamadeiras: number
  fraldas: number
  sonoMin: number
}

const MINUTO = 60_000

export function totaisDoDia(registros: readonly Registro[], sessoes: readonly Registro[], de: number, ate: number): TotaisDoDia {
  const mamadas = registros.filter((r) => r.tipo === 'mamada' && r.fim !== null).length
  const mamadeiras = registros.filter((r) => r.tipo === 'mamadeira').length
  const fraldas = registros.filter((r) => r.tipo === 'fralda').length
  let sonoMs = 0
  for (const sessao of sessoes) {
    if (sessao.tipo !== 'sono' || sessao.fim === null) continue
    const inicio = Math.max(Date.parse(sessao.inicio), de)
    const fim = Math.min(Date.parse(sessao.fim), ate)
    if (fim > inicio) sonoMs += fim - inicio
  }
  return { mamadas, mamadeiras, fraldas, sonoMin: Math.floor(sonoMs / MINUTO) }
}
