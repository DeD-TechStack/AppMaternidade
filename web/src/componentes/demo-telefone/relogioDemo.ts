import { fusoValido } from '../../dados/comum.puro.ts'
import type { Aparelho } from '../../dados/rotina.dia.ts'

// Relógio determinístico da demo: ancorado na data fixa 18/11/2026 no horário local do aparelho,
// para que 16:00, 17:30 e 20:30 apareçam exatamente como na história da página em qualquer fuso
// e em qualquer hora da visita, sem saltos automáticos de relógio.

const ANO = 2026
const MES_ZERO = 10 // novembro (0-indexado)
const DIA = 18
const MINUTO_MS = 60_000
const FUSO_PADRAO = 'America/Sao_Paulo'

export interface RelogioDemo {
  agora: () => number
  avancarMinutos: (minutos: number) => number
  aparelho: () => Aparelho
  fuso: string
}

/** Instante local em 18/11/2026 no horário pedido (HH:MM:SS). */
export function instanteDoDiaDemo(hora: number, minuto: number, segundo = 0, deslocarDias = 0): number {
  return new Date(ANO, MES_ZERO, DIA + deslocarDias, hora, minuto, segundo, 0).getTime()
}

/** Fuso IANA do navegador quando válido; senão, America/Sao_Paulo. */
function fusoDaDemo(): string {
  try {
    const detectado = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (detectado && fusoValido(detectado)) return detectado
  } catch {
    // Segue com o padrão.
  }
  return FUSO_PADRAO
}

export function criarRelogioDemo(hora: number, minuto: number, segundo = 0): RelogioDemo {
  const fuso = fusoDaDemo()
  let atual = instanteDoDiaDemo(hora, minuto, segundo)

  return {
    fuso,
    agora: () => atual,
    avancarMinutos: (minutos: number) => {
      atual += Math.max(0, minutos) * MINUTO_MS
      return atual
    },
    aparelho: () => ({
      fuso,
      deslocamentoMin: -new Date(atual).getTimezoneOffset(),
    }),
  }
}
