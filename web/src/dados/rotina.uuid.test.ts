import { describe, expect, it } from 'vitest'
import { ehUuid, ehUuidV7, uuidV7 } from './rotina.uuid.ts'

describe('UUID v7 da rotina', () => {
  it('o 15º caractere é 7 e o 20º é 8, 9, a ou b, em muitos ids', () => {
    for (let i = 0; i < 500; i++) {
      const id = uuidV7()
      expect(id[14], id).toBe('7')
      expect('89ab').toContain(id[19])
      expect(ehUuidV7(id)).toBe(true)
      expect(ehUuid(id)).toBe(true)
    }
  })

  it('os 48 primeiros bits são o instante em milissegundos, e ids de instantes diferentes seguem a ordem do tempo', () => {
    const antes = uuidV7(Date.parse('2026-11-05T10:00:00Z'))
    const depois = uuidV7(Date.parse('2026-11-05T10:00:01Z'))
    const hexa = (id: string) => id.replaceAll('-', '').slice(0, 12)
    expect(parseInt(hexa(antes), 16)).toBe(Date.parse('2026-11-05T10:00:00Z'))
    expect(antes < depois).toBe(true)
  })

  it('dois ids do mesmo instante não são iguais', () => {
    expect(uuidV7(1_000)).not.toBe(uuidV7(1_000))
  })

  it('ehUuid aceita qualquer versão e recusa o que não é UUID', () => {
    expect(ehUuid('c1111111-1111-4111-8111-111111111111')).toBe(true)
    expect(ehUuid('abc')).toBe(false)
    expect(ehUuid('')).toBe(false)
    expect(ehUuid(null)).toBe(false)
    expect(ehUuidV7('c1111111-1111-4111-8111-111111111111')).toBe(false)
  })
})
