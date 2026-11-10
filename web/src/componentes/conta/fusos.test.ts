import { describe, expect, it, vi } from 'vitest'
import { listaDeFusos, nomeDoFuso } from './fusos.ts'

// O texto de cada opção do seletor de fuso é legível; o valor continua sendo o id IANA.

const DO_BRASIL: Array<[string, string]> = [
  ['America/Sao_Paulo', 'Horário de Brasília (São Paulo)'],
  ['America/Manaus', 'Horário do Amazonas (Manaus)'],
  ['America/Cuiaba', 'Horário do Amazonas (Cuiabá)'],
  ['America/Campo_Grande', 'Horário do Amazonas (Campo Grande)'],
  ['America/Porto_Velho', 'Horário do Amazonas (Porto Velho)'],
  ['America/Rio_Branco', 'Horário do Acre (Rio Branco)'],
  ['America/Boa_Vista', 'Horário do Amazonas (Boa Vista)'],
  ['America/Belem', 'Horário de Brasília (Belém)'],
  ['America/Fortaleza', 'Horário de Brasília (Fortaleza)'],
  ['America/Recife', 'Horário de Brasília (Recife)'],
  ['America/Maceio', 'Horário de Brasília (Maceió)'],
  ['America/Bahia', 'Horário de Brasília (Salvador)'],
  ['America/Araguaina', 'Horário de Brasília (Araguaína)'],
  ['America/Santarem', 'Horário de Brasília (Santarém)'],
  ['America/Noronha', 'Horário de Fernando de Noronha'],
  ['America/Eirunepe', 'Horário do Acre (Eirunepé)'],
]

describe('nomeDoFuso', () => {
  for (const [id, nome] of DO_BRASIL) {
    it(`${id} → ${nome}`, () => {
      expect(nomeDoFuso(id)).toBe(nome)
    })
  }

  it('os 16 fusos do Brasil têm nome próprio e não sobra id cru nem sublinhado', () => {
    expect(DO_BRASIL).toHaveLength(16)
    for (const [id] of DO_BRASIL) {
      const nome = nomeDoFuso(id)
      expect(nome).not.toContain('America/')
      expect(nome).not.toContain('_')
    }
  })

  it('UTC vira "Tempo universal (UTC)"', () => {
    expect(nomeDoFuso('UTC')).toBe('Tempo universal (UTC)')
  })

  it('um id fora da lista usa a cidade depois da última barra, com o sublinhado trocado por espaço', () => {
    const nome = nomeDoFuso('America/Argentina/Buenos_Aires')
    expect(nome === 'Buenos Aires' || nome.endsWith('(Buenos Aires)')).toBe(true)
    const paris = nomeDoFuso('Europe/Paris')
    expect(paris === 'Paris' || paris.endsWith('(Paris)')).toBe(true)
    expect(paris).not.toContain('Europe/')
  })

  it('um id inválido devolve o próprio id, sem lançar', () => {
    for (const invalido of ['Marte/Olympus_Mons', '', '   ', 'America/', '/']) {
      expect(() => nomeDoFuso(invalido)).not.toThrow()
      expect(nomeDoFuso(invalido)).toBe(invalido)
    }
  })

  it('sem Intl.DateTimeFormat (ou com ele lançando), devolve o próprio id sem lançar', () => {
    const original = Intl.DateTimeFormat
    vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: undefined })
    try {
      expect(() => nomeDoFuso('Pacific/Fiji')).not.toThrow()
      expect(nomeDoFuso('Pacific/Fiji')).toBeTruthy()
    } finally {
      vi.unstubAllGlobals()
      expect(Intl.DateTimeFormat).toBe(original)
    }
  })

  it('a ordem da lista de fusos não muda: os do Brasil primeiro', () => {
    expect(listaDeFusos().slice(0, 16)).toEqual(DO_BRASIL.map(([id]) => id))
  })
})
