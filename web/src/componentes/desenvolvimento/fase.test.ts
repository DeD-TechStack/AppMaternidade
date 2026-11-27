import { describe, expect, it } from 'vitest'
import { idadeEmDias, idadeEscrita } from './fase.ts'

// DES-13 4: as bordas da idade escrita. Só dias antes do primeiro mês completo e, depois, meses completos de
// calendário, nunca anos. Os valores esperados estão escritos aqui.

const BORDAS: ReadonlyArray<readonly [string, string, string, string | null]> = [
  // [descrição, nascimento, hoje, esperado]
  ['nasceu hoje', '2026-11-12', '2026-11-12', '0 dias'],
  ['1 dia', '2026-11-11', '2026-11-12', '1 dia'],
  ['2 dias', '2026-11-10', '2026-11-12', '2 dias'],
  ['29 dias antes do mês completar (janeiro)', '2026-01-01', '2026-01-30', '29 dias'],
  ['30 dias (janeiro)', '2026-01-01', '2026-01-31', '30 dias'],
  ['31 dias: o mês completa em 1º de fevereiro', '2026-01-01', '2026-02-01', '1 mês'],
  ['30 dias em novembro: ainda não é 1 mês', '2026-10-13', '2026-11-12', '30 dias'],
  ['exatamente 1 mês', '2026-10-13', '2026-11-13', '1 mês'],
  ['nascida no dia 31: 27 dias em fevereiro', '2026-01-31', '2026-02-27', '27 dias'],
  ['nascida no dia 31: o mês completa no último dia de fevereiro', '2026-01-31', '2026-02-28', '1 mês'],
  ['nascida no dia 31: ainda 1 mês em 30/03', '2026-01-31', '2026-03-30', '1 mês'],
  ['nascida no dia 31: 2 meses em 31/03', '2026-01-31', '2026-03-31', '2 meses'],
  ['último dia do mês (30/04) completa o mês em 30/05', '2026-04-30', '2026-05-30', '1 mês'],
  ['último dia do mês (31/05) completa o mês em 30/06', '2026-05-31', '2026-06-30', '1 mês'],
  ['11 meses', '2025-11-12', '2026-10-12', '11 meses'],
  ['11 meses e 30 dias ainda são 11 meses', '2025-11-12', '2026-11-11', '11 meses'],
  ['12 meses (nunca "1 ano")', '2025-11-12', '2026-11-12', '12 meses'],
  ['23 meses', '2024-11-12', '2026-10-12', '23 meses'],
  ['exatamente 24 meses (nunca "2 anos")', '2024-11-12', '2026-11-12', '24 meses'],
  ['25 meses', '2024-10-12', '2026-11-12', '25 meses'],
  ['nascida em 29/02: 27 dias antes de março', '2024-02-29', '2024-03-27', '27 dias'],
  ['nascida em 29/02: 1 mês em 29/03', '2024-02-29', '2024-03-29', '1 mês'],
  ['nascida em 29/02 (bissexto): em 28/03 ainda são 28 dias', '2024-02-29', '2024-03-28', '28 dias'],
  ['nascida em 29/02: ainda 10 meses em 28/01 do ano seguinte (o mês completa em 29/01)', '2024-02-29', '2025-01-28', '10 meses'],
  ['nascida em 29/02: 12 meses em 28/02 do ano comum', '2024-02-29', '2025-02-28', '12 meses'],
  ['nascida em 29/02: 11 meses em 27/02 do ano comum', '2024-02-29', '2025-02-27', '11 meses'],
  ['nascida em 29/02: 13 meses em 29/03', '2024-02-29', '2025-03-29', '13 meses'],
  ['nascida em 29/02: 48 meses no próximo 29/02', '2024-02-29', '2028-02-29', '48 meses'],
  ['nascimento depois de hoje', '2026-11-13', '2026-11-12', null],
  ['nascimento muito depois de hoje', '2027-01-01', '2026-11-12', null],
  ['nascimento que não existe', '2026-02-30', '2026-11-12', null],
  ['hoje que não existe', '2026-11-12', '2026-13-01', null],
  ['texto que não é data', 'ontem', '2026-11-12', null],
]

describe('idadeEscrita: dias antes de 1 mês, meses completos depois, nunca anos', () => {
  for (const [descricao, nascimento, hoje, esperado] of BORDAS) {
    it(`${descricao}: ${nascimento} → ${hoje} = ${esperado ?? 'sem idade'}`, () => {
      expect(idadeEscrita(nascimento, hoje)).toBe(esperado)
    })
  }

  it('não devolve a palavra "ano" em nenhuma idade de 0 a 8 anos', () => {
    for (let meses = 0; meses <= 96; meses += 1) {
      const nascimento = new Date(Date.UTC(2018, 10, 12))
      nascimento.setUTCMonth(nascimento.getUTCMonth() + meses)
      const escrita = idadeEscrita(nascimento.toISOString().slice(0, 10), '2026-11-12')
      expect(escrita === null || !/ano/.test(escrita), `${meses}`).toBe(true)
    }
  })
})

describe('idadeEmDias', () => {
  it('conta dias inteiros, negativos no futuro, e nulo para data impossível', () => {
    expect(idadeEmDias('2026-11-12', '2026-11-12')).toBe(0)
    expect(idadeEmDias('2026-08-04', '2026-11-12')).toBe(100)
    expect(idadeEmDias('2026-11-13', '2026-11-12')).toBe(-1)
    expect(idadeEmDias('2026-02-30', '2026-11-12')).toBeNull()
  })
})
